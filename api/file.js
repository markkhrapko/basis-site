import crypto from 'node:crypto';
import { presignedGet } from './_lib/core.js';
import { ENV } from './_lib/env.js';

// Reviewer-only access to private files. No file is ever public; reviewers reach
// them through this proxy, which hands back a short-lived (10 min) signed URL.
// The token lives only in the Airtable base, which is access-controlled to the founders.
export default async function handler(req, res) {
  const token = req.query.t || '';
  const key = req.query.key || '';
  if (!token || !safeEqual(token, ENV.REVIEWER_TOKEN)) return res.status(403).send('forbidden');
  if (!key || !String(key).startsWith('uploads/')) return res.status(400).send('bad key');
  try {
    const url = await presignedGet(String(key));
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, url);
  } catch {
    res.status(404).send('not found');
  }
}

function safeEqual(a, b) {
  const ab = Buffer.from(String(a)); const bb = Buffer.from(String(b || ''));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
