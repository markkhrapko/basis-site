import crypto from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { ENV, LIMITS } from './env.js';

// ---------- CORS ----------
const ORIGINS = ['https://basisfellowship.org', 'https://www.basisfellowship.org'];
export function cors(req, res) {
  const origin = req.headers.origin;
  if (ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}

// ---------- R2 (S3-compatible, private) ----------
export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${ENV.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ENV.R2_ACCESS_KEY_ID, secretAccessKey: ENV.R2_SECRET_ACCESS_KEY },
});

export async function putJSON(key, obj) {
  await r2.send(new PutObjectCommand({
    Bucket: ENV.R2_BUCKET, Key: key,
    Body: JSON.stringify(obj, null, 2), ContentType: 'application/json',
  }));
}
export async function getJSON(key) {
  try {
    const out = await r2.send(new GetObjectCommand({ Bucket: ENV.R2_BUCKET, Key: key }));
    return JSON.parse(await out.Body.transformToString());
  } catch { return null; }
}
export async function listKeys(prefix, max = 1000) {
  const out = await r2.send(new ListObjectsV2Command({ Bucket: ENV.R2_BUCKET, Prefix: prefix, MaxKeys: max }));
  return (out.Contents || []).map((o) => ({ key: o.Key, size: o.Size, modified: o.LastModified }));
}
export async function deleteKey(key) {
  await r2.send(new DeleteObjectCommand({ Bucket: ENV.R2_BUCKET, Key: key }));
}
export async function moveKey(from, to) {
  await r2.send(new CopyObjectCommand({ Bucket: ENV.R2_BUCKET, Key: to, CopySource: `${ENV.R2_BUCKET}/${encodeURIComponent(from)}` }));
  await deleteKey(from);
}
export async function presignedPut(key, contentLength, contentType) {
  const cmd = new PutObjectCommand({
    Bucket: ENV.R2_BUCKET, Key: key,
    ContentLength: contentLength, ContentType: contentType || 'application/octet-stream',
  });
  return getSignedUrl(r2, cmd, { expiresIn: 120 });
}
export async function presignedGet(key) {
  const cmd = new GetObjectCommand({
    Bucket: ENV.R2_BUCKET, Key: key,
    ResponseContentDisposition: 'attachment',
  });
  return getSignedUrl(r2, cmd, { expiresIn: 600 });
}

// ---------- Redis (fail-open wrapper) ----------
export const redis = new Redis({ url: ENV.UPSTASH_REDIS_REST_URL, token: ENV.UPSTASH_REDIS_REST_TOKEN });

export async function redisSafe(fn, fallback) {
  try { return await fn(); } catch (e) { console.error('redis-unavailable', e?.message); return fallback; }
}

const limiters = {
  session: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '10 m'), prefix: 'rl:session' }),
  upload: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '10 m'), prefix: 'rl:upload' }),
  submitIp: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 h'), prefix: 'rl:submit-ip' }),
  submitEmail: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '24 h'), prefix: 'rl:submit-email' }),
};

// IPv6 collapses to /64 so rotation within a prefix buys nothing;
// IPv4 stays per-address but is only ever a LOOSE backstop.
export function ipKey(req) {
  const raw = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (raw.includes(':')) return raw.split(':').slice(0, 4).join(':');
  return raw;
}

// fail-open: if Redis is down, allow (Turnstile session still gates)
export async function allow(kind, key) {
  return redisSafe(async () => (await limiters[kind].limit(key)).success, true);
}

// ---------- Turnstile ----------
export async function verifyTurnstile(token, action, ip) {
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: ENV.TURNSTILE_SECRET, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(4000),
    });
    const data = await r.json();
    if (data.success) {
      const hostOk = ['basisfellowship.org', 'www.basisfellowship.org', 'localhost'].includes(data.hostname);
      const actionOk = !data.action || data.action === action;
      return { ok: hostOk && actionOk, suspected: false };
    }
    const codes = data['error-codes'] || [];
    // Explicit invalid token -> closed. Infra trouble -> fail open, flag suspected.
    if (codes.includes('invalid-input-response') || codes.includes('timeout-or-duplicate')) {
      return { ok: false, suspected: false };
    }
    return { ok: true, suspected: true };
  } catch {
    return { ok: true, suspected: true }; // siteverify unreachable -> fail open, flagged
  }
}

// ---------- Signed session (one Turnstile solve per applicant) ----------
export function mintSession(ip, suspected) {
  const payload = { exp: Date.now() + LIMITS.SESSION_TTL_SEC * 1000, ip: hash(ip), s: suspected ? 1 : 0 };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', ENV.SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}
export function checkSession(token, ip) {
  try {
    const [body, sig] = String(token).split('.');
    const expect = crypto.createHmac('sha256', ENV.SESSION_SECRET).update(body).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    if (payload.ip !== hash(ip)) return null;
    return { suspected: payload.s === 1 };
  } catch { return null; }
}
export function hash(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 16);
}

// ---------- ids ----------
export function referenceId(idem) {
  return `BF-2026-${hash(idem).slice(0, 8)}`;
}

export function readBody(req, capBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > capBytes) { reject(new Error('body-too-large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}')); }
      catch { reject(new Error('bad-json')); }
    });
    req.on('error', reject);
  });
}
