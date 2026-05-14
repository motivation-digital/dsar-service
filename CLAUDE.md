# dsar-service

Standalone DSAR (Data Subject Access Request) handler — extracted from trust-center v0.4.0. Handles the /trust-center/contact form (GET + POST) for all trust-center brands via the trust-center service binding.

Deploys to: dsar-service CF worker (workers.dev subdomain only — all traffic arrives via trust-center DSAR_SERVICE service binding)
Lifecycle repo: https://github.com/motivation-digital/lifecycle

## ⛔ Must not change

- Route path `/trust-center/contact` — trust-center worker routes to this exact path via the DSAR_SERVICE service binding; changing it breaks DSAR for all brands
- `TURNSTILE_SECRET` binding — plain `secret_text` (NOT Secrets Store); must be set manually in CF dashboard after any first deploy; do not convert to Secrets Store without also updating `resolveSecret()` logic
- `SEND_EMAIL` binding — CF Email Sending binding; removing or renaming breaks email notifications on DSAR submission
- `DB` binding name — used for brand fact lookup (`getFactsByHost`) and writing to `dsar_requests` table
- `dsar_requests` table schema in trust-center-db — written by this worker; coordinate any schema change with trust-center

## Current state

Extracted LCE-10000116. Live via trust-center service binding. v1.0.1. No zone routes — receives requests only via the DSAR_SERVICE service binding from trust-center. Validates Turnstile, writes to dsar_requests D1 table, sends email via SEND_EMAIL binding.

## Endpoints (via service binding only — not directly public)

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| GET | /trust-center/contact | DSAR request form (brand-resolved HTML) | None |
| POST | /trust-center/contact | DSAR submission — Turnstile validate, write D1, send email | None |
| GET | /health | { status: 'ok', worker: 'dsar-service' } | None |

## D1 bindings

| Binding | Database | Access |
| --- | --- | --- |
| DB | trust-center-db (b444ddfb-b745-4ad3-abfb-57e9088f34a1) | read/write (reads brand facts, writes dsar_requests) |

## Other bindings

| Binding | Type | Purpose |
| --- | --- | --- |
| SEND_EMAIL | CF Email Sending | DSAR notification + acknowledgement emails |
| TURNSTILE_SECRET | secret_text (set manually in CF dashboard) | Turnstile bot protection — NOT Secrets Store |

## Rules (inline — full rules in lifecycle)

- Rule 1: Confirm repo first. `pwd` and `git remote -v` before anything.
- Rule 2: Read before touching. Check CLAUDE.md and current main.
- Rule 9: Trace all consumers before removing any parameter, endpoint, or field.
- Rule 14: Every session is referenced by its ClickUp task ID (e.g. `LCE-10000040`).
