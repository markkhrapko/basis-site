import { putJSON, getJSON, deleteKey } from './_lib/core.js';
import { missingEnv } from './_lib/env.js';

// Asserts every required env var is present and a store round-trip works.
// The deploy smoke test hits this; a 500 should fail the deploy.
export default async function handler(req, res) {
  const missing = missingEnv();
  if (missing.length) return res.status(500).json({ ok: false, missing });
  const key = `health/${Date.now()}.json`;
  try {
    await putJSON(key, { t: Date.now() });
    const back = await getJSON(key);
    await deleteKey(key);
    if (!back) throw new Error('round-trip');
  } catch (e) {
    return res.status(500).json({ ok: false, store: e?.message });
  }
  return res.status(200).json({ ok: true });
}
