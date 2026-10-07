# Website Outreach

Demo-first client acquisition for Muhammad Muneeb: research a real business, design a considered website concept in a ChatGPT/Codex session, review it visually, deploy to Cloudflare, and prepare an individual outreach email.

**No OpenAI API key and no API-based site-generation workflow.** Codex generation happens in the signed-in product session. GitHub Actions runs deterministic checks, deployment, HTTPS verification and expiry. An unattended GitHub cron does not launch or spend a ChatGPT Plus Codex session.

## First pilot

`sites/br-plumbing-austin/` is an original, responsive concept for a real Austin plumbing business. Its public contact details and services are documented in `leads/br-plumbing-austin.json`. This is an independent, uncommissioned concept. No customer forms, invented reviews, stock claims of business results, or fake booking flow.

The pilot remains in design review until `state/br-plumbing-austin.review.json` contains an approved review of the exact current source fingerprint. A deployment request cannot bypass this gate. Screenshots are saved as workflow artifacts.

## Run locally

Requires Node 22 or newer. The router, build, tests and Cloudflare scripts have no third-party runtime dependencies.

```sh
npm test
npm run build
npm run preview -- br-plumbing-austin
```

Open `http://127.0.0.1:4173`. For browser QA:

```sh
npm install --no-save --ignore-scripts playwright@1.62.1
npx playwright install chromium
npm run qa
```

QA uses the actual Worker handler in a local R2 adapter, including its CSP. It checks four viewports, browser errors, resource failures, local anchors, images, disclosure, mobile navigation and a usable phone CTA. A visual reviewer must inspect the saved screenshots; automated checks do not claim to judge design quality.

## GitHub configuration

| Kind | Name | Value |
|---|---|---|
| Secret | `CLOUDFLARE_API_TOKEN` | Scoped Cloudflare token |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | Account ID |
| Variable | `CLOUDFLARE_ZONE_ID` | Zone ID |
| Variable | `ROOT_DOMAIN` | `muhammadmuneeb.tech` |
| Variable | `R2_BUCKET_NAME` | `ai-client-demos` |
| Variable | `CLOUDFLARE_WORKER_NAME` | `ai-demo-router` |
| Variable | `DEMO_TTL_DAYS` | `7` |

Keep R2 private. The implementation uses the Cloudflare REST API with the one token, not S3 credentials. Scopes: Account → Workers Scripts Edit, Workers R2 Storage Edit; Zone → Workers Routes Edit, Zone Read, DNS Read. The last two read-only scopes allow preflight to confirm the domain/account and reject occupied hostnames before attaching a demo. A token created from the Workers template may need those two read permissions added. No DNS Edit permission is requested.

## Workflows

- **Quality checks** runs tests, builds concepts, verifies them in Chromium and saves screenshots on every main push and pull request.
- **Deploy reviewed concept** runs on manual dispatch, or a commit modifying `state/deploy-request.json` on main. It rechecks source fingerprint, review scores, browser QA, Cloudflare configuration, uploads immutable R2 releases, attaches one exact first-level hostname, then checks HTTPS before preparing a draft.
- **Expire demo websites** runs at 01:15 Pakistan time (20:15 UTC) and on manual dispatch. The router stops serving expired demos at the expiry instant even if Actions is delayed. Cleanup deletes demo assets and exact custom domains, retaining a private tombstone. Interested demos are preserved.
- **Demo lifecycle** marks a demo interested or expires it early.

The portfolio apex, `www` and reserved hostnames cannot be selected. No wildcard route, tunnel, portfolio configuration or existing DNS records are edited. Sites are served at `https://SLUG.muhammadmuneeb.tech/` using one router and a private R2 bucket.

## What is operational versus pending

Implemented: source-backed brief validation, original pilot site, static build, browser QA, manual visual-review gate, Cloudflare preflight/deployment, immutable release switching, live HTTPS check, seven-day expiry, interested-prospect preservation, draft generation and suppression/duplicate preparation checks.

Pending integrations: automated lead-source provider, Gmail sending/reconciliation adapter, reply-driven CRM updates and follow-up dispatch. No email is sent by these workflows. The existing project-outreach automation was separately reduced to at most 20 emails per Pakistan calendar day; this repository must not silently increase that volume.

Read [the operating guide](docs/operating-guide.md) and [Codex instructions](AGENTS.md) before adding prospects or approving outreach.
