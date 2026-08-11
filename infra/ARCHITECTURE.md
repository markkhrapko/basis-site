# Basis Fellowship — intake backend architecture

Hardened after a 3-adversary review (scale / abuse / failure). This doc is the
build spec. No secrets live here; all keys are Vercel env vars.

## Prime directives
1. **Never lose a submission.** Durable write happens before anything else and the
   applicant's success does not depend on Airtable or email.
2. **Never dead-end an applicant.** Every failure path keeps their answers and gives
   a real next step.

## What the panel killed in the naive design
- **Turnstile token reuse** — one widget solve can't authorize 3+ API calls; multi-file
  applicants would fail at N=1. → one challenge → our own signed session.
- **Files copied into Airtable** — free base holds ~1GB (~10 files) → dies in seconds.
  → store file URLs as links; Blob/R2 is the source of truth.
- **Resend free = 100/day**, Airtable **5 req/s + 30s penalty box**, **Hobby cron = once/day**.
  → async worker, batched, Pro tiers.
- **Email-bomb** — confirmations sent to attacker-typed addresses. → send only to the
  applicant's first email, recipient- and domain-keyed caps, global daily budget + breaker.
- **PII at public URLs** — submission JSON + CVs at public (if unguessable) URLs.
  → private store + authenticated reviewer proxy (pending owner decision).
- **Idempotency decorative** — no enforcement point. → Redis SETNX + key in localStorage
  + Blob path keyed on the idempotency key.
- **CORS treated as a control** — it isn't (curl ignores it). → real gate is Turnstile +
  edge limits + recipient/content caps.
- **mailto fallback truncates** at ~2KB. → autosave to localStorage + "download answers".

## Request path (fast, durable, async)
```
Browser
  ├─ on first interaction: solve invisible Turnstile once
  │    POST /api/session  → verify Turnstile (check hostname+action) → return signed
  │    HMAC session (30 min, bound to IP-prefix hash)
  ├─ per file: POST /api/upload-token (session-gated, byte-budgeted)
  │    → single-use, single-pathname, ~60s token → browser uploads direct to store
  └─ POST /api/submit {type, fields, fileUrls[], idempotencyKey, session}
       server (<2s, maxDuration set):
         1. verify session + edge rate limits (fail-open on Redis, Turnstile still gates)
         2. validate schema / sizes / counts
         3. Redis SET idem:{key} NX EX 86400  (retry → return original {ok,id})
         4. WRITE submissions/{type}/{idempotencyKey}.json   ← DURABILITY LINE
         5. respond {ok, id}                                  ← success returned here
         (Airtable + email happen AFTER response / in the worker, never blocking)
```

## Worker (Vercel cron, 1/min on Pro)
- Scans `submissions/*` where `synced != true` (source of truth = files, not a marker
  the crashed function had to write).
- **Airtable**: batch-create 10 records/req at ≤4 req/s (≈40 rec/s vs ~2.8/s arrival →
  10k backlog drains in ~5 min), honor 30s penalty, files as URL fields not attachments,
  upsert on idempotency key. Flip `synced=true` only on confirmed create.
- **Email**: Resend batch (100/req, ≤2 req/s), send only to first email, mark `emailSent`.
  Recipient cap 1/24h, domain cap/hr, global daily budget + circuit breaker.
- **Alerts**: heartbeat to healthchecks.io each run (external dead-man switch); alert owner
  if backlog > 1000 or heartbeat missed.
- **Orphan sweeper** (nightly): delete uploads older than 48h not referenced by any
  submission (referenced-URL set in Redis); global daily-upload-bytes cap → 503 "uploads
  paused, submit without files and email us" past threshold.

## Abuse controls (all hold against direct curl, not just browsers)
- Turnstile verified server-side with **hostname + per-endpoint action** checks; signed
  session so one solve ≠ thousands of calls; optional small proof-of-work.
- Rate limits keyed **per-normalized-email (strong)** + per-IP /64 (loose backstop, so
  campus NAT / iCloud Private Relay pools aren't starved); recipient- and content-scoped
  because damage tracks recipients and records, not IPs.
- Edge middleware rejects wrong method/content-type/oversize/bad-origin **before** the
  Node function runs (no per-junk-request function + siteverify bill).
- Payload caps: textareas 50KB, files capped per owner decision, per-application byte budget.

## Data model (Airtable = rolling review view; store = source of truth)
Tables: Applications / Updates / Nominations. Fields mirror the forms +
`fileUrls` (links) + `status` + `submissionId` (shown to applicant as BF-2026-xxxx) +
`rawUrl` + `emailSent` + `synced` + `suspected` (Turnstile fail-open flag).

## Degraded-mode policy (in code)
- Turnstile siteverify timeout/5xx → **fail OPEN**, accept with `suspected:true`, drop
  submit limit to 2/hr. Explicit `invalid-input-response` → fail CLOSED.
- Upstash unreachable → fail OPEN on limiting (Turnstile still gates).
- Store write fails → last resort inline Airtable create; if that fails, return the full
  payload to the client to download + retry. Never silently drop.

## Success-screen + email contract
- Show **reference ID** prominently ("Your reference: BF-2026-xxxx — save this").
- "Confirmation sent to {first email} — check spam. Nothing within the hour? Email us."
- Confirmation email echoes the ID + a copy of their answers (self-service "did you get it?").
- On failure: keep form, autosave to localStorage, offer Retry + Download-answers(.txt).

## Deploy hygiene
- `/api/health` asserts every env var present + a store round-trip; deploy smoke test
  (GitHub Action) posts a preflight + canary submit after each deploy.
- CORS allowlist BOTH apex and www; OPTIONS handled on every endpoint.
- Daily synthetic canary submission asserts the whole pipe end-to-end.

## Cost floor (managed stack)
Vercel Pro $20 · Resend Pro $20 · Airtable Team ~$24/seat · Upstash ~$1–10 · Turnstile free.
≈ **$65–115/mo** depending on Airtable seats. Blob/R2 storage+egress on top, bounded by caps.
