import crypto from 'node:crypto';
import { cors, checkSession, ipKey, allow, presignedPut, redis, redisSafe, readBody } from './_lib/core.js';
import { LIMITS } from './_lib/env.js';

// Session-gated presigned PUT to the PRIVATE bucket. Files never get a public URL.
export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  const ip = ipKey(req);
  let body;
  try { body = await readBody(req, 16 * 1024); } catch { return res.status(400).json({ error: 'bad-request' }); }

  const sess = checkSession(body.session, ip);
  if (!sess) return res.status(403).json({ error: 'session' });
  if (!(await allow('upload', ip))) return res.status(429).json({ error: 'rate' });

  const size = Number(body.size) || 0;
  if (size <= 0 || size > LIMITS.MAX_FILE_BYTES) return res.status(413).json({ error: 'file-too-large' });

  // Global daily upload-byte circuit breaker.
  const day = new Date().toISOString().slice(0, 10);
  const used = await redisSafe(() => redis.incrby(`upbytes:${day}`, size), 0);
  await redisSafe(() => redis.expire(`upbytes:${day}`, 172800), null);
  if (used > LIMITS.GLOBAL_UPLOAD_BYTES_PER_DAY) {
    return res.status(503).json({ error: 'uploads-paused' });
  }

  const safeName = String(body.filename || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  const key = `uploads/${day.slice(0, 7)}/${crypto.randomUUID()}/${safeName}`;
  const url = await presignedPut(key, size, body.contentType);
  // Track uploaded keys for the orphan sweeper; short TTL until a submission claims them.
  await redisSafe(() => redis.setex(`orphan:${key}`, 172800, size), null);
  return res.status(200).json({ url, key });
}
