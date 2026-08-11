import { cors, verifyTurnstile, mintSession, ipKey, allow, readBody } from './_lib/core.js';

// One Turnstile solve per applicant -> a short-lived signed session that
// authorizes the subsequent upload-token and submit calls.
export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  const ip = ipKey(req);
  if (!(await allow('session', ip))) return res.status(429).json({ error: 'rate' });

  let body;
  try { body = await readBody(req, 16 * 1024); } catch { return res.status(400).json({ error: 'bad-request' }); }

  const v = await verifyTurnstile(body.turnstileToken, 'session', ip);
  if (!v.ok) return res.status(403).json({ error: 'turnstile' });

  return res.status(200).json({ session: mintSession(ip, v.suspected) });
}
