import { listKeys, getJSON, putJSON, redis, redisSafe } from './_lib/core.js';
import { ENV, LIMITS } from './_lib/env.js';

const TABLE = { apply: 'Applications', update: 'Updates', nominate: 'Nominations' };

// Cron-driven drain: submissions in R2 (source of truth) -> Airtable + confirmation email.
// Airtable and email never block an applicant; this is where they actually happen.
export default async function handler(req, res) {
  if (!cronAuthed(req)) return res.status(403).json({ error: 'forbidden' });

  const started = Date.now();
  let synced = 0, mailed = 0, errors = 0;

  try {
    for (const type of Object.keys(TABLE)) {
      const keys = await listKeys(`submissions/${type}/`, 500);
      // Airtable: ≤4 req/s, batches of 10. Respect the wall clock (maxDuration 300s).
      for (let i = 0; i < keys.length; i += 10) {
        if (Date.now() - started > 280000) break;
        const batch = [];
        for (const k of keys.slice(i, i + 10)) {
          const rec = await getJSON(k.key);
          if (rec && !rec.synced) batch.push(rec);
        }
        if (!batch.length) continue;
        try {
          await airtableCreate(TABLE[type], batch);
          for (const rec of batch) { rec.synced = true; await putJSON(`submissions/${type}/${rec.idem}.json`, rec); synced++; }
        } catch (e) { errors++; console.error('airtable-batch', e?.message); }
        await sleep(260); // ~4 req/s
      }
    }

    // Confirmations: only applications/updates, only the applicant's first email, capped per recipient.
    for (const type of ['apply', 'update']) {
      const keys = await listKeys(`submissions/${type}/`, 500);
      for (const k of keys) {
        if (Date.now() - started > 295000) break;
        const rec = await getJSON(k.key);
        if (!rec || rec.emailSent || !rec.emails?.[0]) continue;
        const to = rec.emails[0];
        const capped = await redisSafe(() => redis.set(`mailed:${to}`, 1, { nx: true, ex: 86400 }), 'OK');
        if (capped !== 'OK') { rec.emailSent = true; await putJSON(k.key, rec); continue; }
        try {
          await sendConfirmation(to, rec);
          rec.emailSent = true; await putJSON(k.key, rec); mailed++;
          await sleep(120);
        } catch (e) { errors++; console.error('resend', e?.message); }
      }
    }

    // Dead-man heartbeat + backlog alert.
    if (ENV.HEALTHCHECK_URL) fetch(ENV.HEALTHCHECK_URL).catch(() => {});
  } catch (e) {
    console.error('worker-fatal', e?.message);
  }

  return res.status(200).json({ synced, mailed, errors, ms: Date.now() - started });
}

async function airtableCreate(table, records) {
  const r = await fetch(`https://api.airtable.com/v0/${ENV.AIRTABLE_BASE}/${encodeURIComponent(table)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ENV.AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      typecast: true,
      performUpsert: { fieldsToMergeOn: ['Reference'] },
      records: records.map((rec) => ({ fields: toAirtable(rec) })),
    }),
  });
  if (!r.ok) throw new Error(`airtable ${r.status} ${await r.text()}`);
}

function toAirtable(rec) {
  const f = rec.fields || {};
  return {
    Reference: rec.referenceId,
    Type: rec.type,
    Submitted: rec.ts,
    Name: [f.firstName, f.lastName].filter(Boolean).join(' ') || f.name || '',
    Emails: (rec.emails || []).join(', '),
    Age: f.age || '', City: f.city || '', Country: f.country || '',
    Orgs: (f.orgs || []).join(', ') || f.org || '',
    Phone: f.phone || '', Links: f.link || f.portfolio || '',
    Categories: (f.categories || []).join(', '),
    Q1: f.q1 || '', Q2: f.q2 || '', Q3: f.q3 || '', Q4: f.q4 || '',
    Nominee: [f.theirFirstName, f.theirLastName].filter(Boolean).join(' '),
    NomineeContacts: (f.theirContacts || []).join(', '),
    Why: f.why || '',
    Files: (rec.fileKeys || []).map((k) => `https://api.basisfellowship.org/api/file?t=${ENV.REVIEWER_TOKEN}&key=${encodeURIComponent(k)}`).join('\n'),
    Suspected: !!rec.suspected,
    Status: 'New',
  };
}

async function sendConfirmation(to, rec) {
  const isNom = rec.type === 'nominate';
  const subject = isNom ? 'We got your nomination' : `We got your application — ${rec.referenceId}`;
  const text = [
    isNom ? 'Thanks for the nomination. We\'ll reach out to them.' :
      `We got it. Your reference is ${rec.referenceId} — keep it.`,
    '',
    'If this landed in spam, mark it not-spam so our replies reach you.',
    'Nothing else to do. We read every application.',
    '',
    'Questions? mark@orbit.engineering',
    '',
    'The Basis Fellowship',
  ].join('\n');
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ENV.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: ENV.MAIL_FROM, to, subject, text, reply_to: ENV.OWNER_EMAIL }),
  });
  if (!r.ok) throw new Error(`resend ${r.status} ${await r.text()}`);
}

function cronAuthed(req) {
  if (!ENV.CRON_SECRET) return true; // allow if unset (dev)
  return req.headers.authorization === `Bearer ${ENV.CRON_SECRET}`;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
