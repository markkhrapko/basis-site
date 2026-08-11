# Setup checklist (owner-only)

The code is written. These are the account steps only you can do. When they're
done, paste the values into Vercel env vars and we deploy. ~45 min total.

Generate the three secrets first (run locally, keep them):
```
openssl rand -hex 32   # SESSION_SECRET
openssl rand -hex 32   # REVIEWER_TOKEN
openssl rand -hex 32   # CRON_SECRET
```

## 1. Vercel (the host for /api)
1. vercel.com → Add New → Project → import `markkhrapko/basis-site`.
2. Framework preset: **Other**. Root dir: `/`. Build command: none. Output: none.
   (It only deploys `/api`; the site itself stays on GitHub Pages.)
3. Upgrade the project's team to **Pro** (required for 1-min cron + 300s functions + commercial use).
4. Settings → Domains → add `api.basisfellowship.org`. Vercel shows a CNAME target
   (e.g. `cname.vercel-dns.com`). In GoDaddy DNS for basisfellowship.org add:
   `CNAME  api  →  cname.vercel-dns.com`.
5. Leave env vars for last (step 7).

## 2. Cloudflare — R2 (private file store) + Turnstile (bot wall)
R2:
1. Cloudflare dashboard → R2 → Create bucket, name `basis-uploads`. Keep it **private** (default).
2. R2 → Manage API Tokens → Create (Object Read & Write, this bucket). Copy:
   Access Key ID → `R2_ACCESS_KEY_ID`, Secret → `R2_SECRET_ACCESS_KEY`.
3. Your Cloudflare **Account ID** (R2 overview page) → `R2_ACCOUNT_ID`. Bucket name → `R2_BUCKET`.
Turnstile:
4. Cloudflare → Turnstile → Add site. Domain: `basisfellowship.org`. Widget mode: **Managed** (or Invisible).
5. Copy **Site Key** (public — goes in the HTML) and **Secret Key** → `TURNSTILE_SECRET`.

## 3. Airtable (the review view)
1. Create a base "Basis Fellowship". Three tables: **Applications**, **Updates**, **Nominations**.
2. In each, add these fields (all Single line text / Long text is fine; the code typecasts):
   `Reference, Type, Submitted, Name, Emails, Age, City, Country, Orgs, Phone, Links,
   Categories, Q1, Q2, Q3, Q4, Nominee, NomineeContacts, Why, Files (long text),
   Suspected (checkbox), Status (single select: New/Reviewing/Yes/Not yet)`.
   `Reference` must be the **primary field** (upsert dedupes on it).
3. Upgrade to **Team** (free caps at 1,000 records; you want 50k).
4. airtable.com/create/tokens → Personal Access Token, scopes `data.records:read/write`
   + `schema.bases:read`, access to this base. Copy → `AIRTABLE_TOKEN`.
5. Base ID: open the base, URL is `airtable.com/appXXXXXXXX/...` → `appXXXXXXXX` → `AIRTABLE_BASE`.

## 4. Resend (confirmation emails)
1. resend.com → add domain `basisfellowship.org` (or subdomain `mail.`). It shows 3 DNS
   records (SPF TXT, DKIM CNAME/TXT, and a DMARC TXT). Add all in GoDaddy DNS. Wait for "Verified".
2. Upgrade to **Pro** ($20/mo, 50k emails — free is 100/day and dies on launch day).
3. API Keys → create → `RESEND_API_KEY`.
4. Send a dozen test emails from applications@ the week before launch (warms reputation).

## 5. Upstash (Redis: idempotency, rate limits, counters)
1. upstash.com → Create Database (Redis), region near your users, **pay-as-you-go**.
2. Copy REST URL → `UPSTASH_REDIS_REST_URL`, REST Token → `UPSTASH_REDIS_REST_TOKEN`.

## 6. (optional) healthchecks.io
Create a check, 1-hour period. Copy its ping URL → `HEALTHCHECK_URL`. You get alerted if the worker stops.

## 7. Paste env vars into Vercel (Settings → Environment Variables, Production)
```
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
TURNSTILE_SECRET
SESSION_SECRET, REVIEWER_TOKEN, CRON_SECRET          (the three you generated)
UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
AIRTABLE_TOKEN, AIRTABLE_BASE
RESEND_API_KEY
MAIL_FROM        = The Basis Fellowship <applications@basisfellowship.org>
OWNER_EMAIL      = mark@orbit.engineering
HEALTHCHECK_URL  (optional)
```

## 8. Two PUBLIC values you give me (they go in the HTML, not secret)
- Turnstile **Site Key**
- Confirm API base = `https://api.basisfellowship.org`

Then tell me "accounts ready" — I finish the frontend wiring with your site key, we deploy,
run the load test and an end-to-end real submission, and flip the live forms on.
