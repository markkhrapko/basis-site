// Central env access. Every secret lives in Vercel env vars, never in the repo.
export const ENV = {
  // Cloudflare R2 (private object store — source of truth)
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET: process.env.R2_BUCKET,
  // Cloudflare Turnstile
  TURNSTILE_SECRET: process.env.TURNSTILE_SECRET,
  // Signed-session HMAC secret (generate: openssl rand -hex 32)
  SESSION_SECRET: process.env.SESSION_SECRET,
  // Reviewer proxy access (a long random token the founders paste; guards /api/file)
  REVIEWER_TOKEN: process.env.REVIEWER_TOKEN,
  // Upstash Redis (idempotency, rate limits, counters)
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  // Airtable (review view)
  AIRTABLE_TOKEN: process.env.AIRTABLE_TOKEN,
  AIRTABLE_BASE: process.env.AIRTABLE_BASE,
  // Resend (confirmations)
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  MAIL_FROM: process.env.MAIL_FROM || 'The Basis Fellowship <applications@basisfellowship.org>',
  OWNER_EMAIL: process.env.OWNER_EMAIL || 'mark@orbit.engineering',
  // Ops
  HEALTHCHECK_URL: process.env.HEALTHCHECK_URL, // optional dead-man ping
  CRON_SECRET: process.env.CRON_SECRET,          // guards cron endpoints
};

export const REQUIRED = [
  'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET',
  'TURNSTILE_SECRET', 'SESSION_SECRET', 'REVIEWER_TOKEN',
  'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN',
  'AIRTABLE_TOKEN', 'AIRTABLE_BASE', 'RESEND_API_KEY',
];

export function missingEnv() {
  return REQUIRED.filter((k) => !ENV[k]);
}

// Limits — tune here, single source of truth.
export const LIMITS = {
  MAX_FILES: 10,
  MAX_FILE_BYTES: 100 * 1024 * 1024,      // 100MB per file
  MAX_APPLICATION_BYTES: 500 * 1024 * 1024, // 500MB total per application
  MAX_TEXTAREA_BYTES: 50 * 1024,
  SESSION_TTL_SEC: 30 * 60,
  IDEM_TTL_SEC: 24 * 60 * 60,
  GLOBAL_UPLOAD_BYTES_PER_DAY: 200 * 1024 * 1024 * 1024, // 200GB/day circuit breaker
};
