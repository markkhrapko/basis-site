import { cors, checkSession, ipKey, allow, putJSON, redis, redisSafe, referenceId, hash, readBody } from './_lib/core.js';
import { LIMITS } from './_lib/env.js';

const TYPES = { apply: true, update: true, nominate: true };

// Durability-first: verify -> validate -> idempotency -> WRITE (source of truth)
// -> return {ok,id}. Airtable + email are the worker's job, never in this path.
export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  const ip = ipKey(req);
  let body;
  try { body = await readBody(req, 2 * 1024 * 1024); } catch { return res.status(400).json({ error: 'bad-request' }); }

  const sess = checkSession(body.session, ip);
  if (!sess) return res.status(403).json({ error: 'session' });

  const type = String(body.type || '');
  if (!TYPES[type]) return res.status(400).json({ error: 'type' });

  const fields = body.fields && typeof body.fields === 'object' ? body.fields : {};
  const emails = normEmails(fields.emails || fields.yourEmails);
  const files = Array.isArray(body.fileKeys) ? body.fileKeys.slice(0, LIMITS.MAX_FILES) : [];

  // Cheap validation. Oversized text is truncated, never rejected (don't lose answers).
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === 'string' && v.length > LIMITS.MAX_TEXTAREA_BYTES) fields[k] = v.slice(0, LIMITS.MAX_TEXTAREA_BYTES);
  }
  if (type !== 'nominate' && emails.length === 0) return res.status(400).json({ error: 'email-required' });

  // Rate limits: strong per-email, loose per-IP backstop (so campus NAT isn't starved).
  if (!(await allow('submitIp', ip))) return res.status(429).json({ error: 'rate-ip' });
  if (emails[0] && !(await allow('submitEmail', hash(emails[0])))) {
    return res.status(429).json({ error: 'rate-email' });
  }

  const idem = String(body.idempotencyKey || '').slice(0, 64) || hash(JSON.stringify(fields) + ip + Date.now());
  const id = referenceId(idem);

  // Idempotency: first writer wins; retries return the same id.
  const fresh = await redisSafe(() => redis.set(`idem:${idem}`, id, { nx: true, ex: LIMITS.IDEM_TTL_SEC }), 'PROCEED');
  if (fresh !== 'OK' && fresh !== 'PROCEED') {
    return res.status(200).json({ ok: true, id, duplicate: true });
  }

  const record = {
    id, idem, type, referenceId: id,
    fields, emails, fileKeys: files,
    suspected: sess.suspected,
    ip: hash(ip),
    ts: new Date().toISOString(),
    synced: false, emailSent: false,
  };

  // THE DURABILITY LINE. Path keyed on idem so retries overwrite, never duplicate.
  const key = `submissions/${type}/${idem}.json`;
  try {
    await putJSON(key, record);
  } catch (e) {
    // Last resort: hand the whole payload back so the client can save + retry.
    console.error('durability-write-failed', e?.message);
    return res.status(503).json({ error: 'store', payload: record });
  }

  // Claim referenced upload keys so the sweeper won't delete them.
  for (const k of files) await redisSafe(() => redis.del(`orphan:${k}`), null);

  return res.status(200).json({ ok: true, id });
}

function normEmails(v) {
  const arr = Array.isArray(v) ? v : String(v || '').split(/[,\s]+/);
  return arr.map((s) => String(s).trim().toLowerCase())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)).slice(0, 10);
}
