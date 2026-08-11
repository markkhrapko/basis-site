import { listKeys, deleteKey, redis, redisSafe } from './_lib/core.js';
import { ENV } from './_lib/env.js';

// Nightly: delete uploads older than 48h that no submission ever claimed.
// A key is "claimed" when submit.js deletes its orphan:<key> marker; anything
// still carrying an orphan marker (or with no marker but old) is unreferenced junk.
export default async function handler(req, res) {
  if (ENV.CRON_SECRET && req.headers.authorization !== `Bearer ${ENV.CRON_SECRET}`) {
    return res.status(403).json({ error: 'forbidden' });
  }
  const cutoff = Date.now() - 48 * 3600 * 1000;
  let deleted = 0, scanned = 0;
  const files = await listKeys('uploads/', 1000);
  for (const f of files) {
    scanned++;
    if (new Date(f.modified).getTime() > cutoff) continue;
    const stillOrphan = await redisSafe(() => redis.get(`orphan:${f.key}`), null);
    if (stillOrphan == null) continue; // claimed by a submission -> keep
    await deleteKey(f.key);
    await redisSafe(() => redis.del(`orphan:${f.key}`), null);
    deleted++;
  }
  return res.status(200).json({ scanned, deleted });
}
