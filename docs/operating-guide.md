# Operating the demo-first pipeline

## 1. Research and qualify

Start with one strong business. Use current public searches and pages owned by the business. Confirm its actual website rather than treating an absent directory link as proof it has none. Record supported services, location, hours and contact information. Inspect its current site on a phone and desktop. Identify a concrete improvement you can demonstrate, without invented performance statistics.

The BR Plumbing pilot has verified service/contact facts but is deliberately not marked sales-qualified until current visual comparison and Gmail checks are complete.

## 2. Build in this Codex session

Use `prompts/designer.md`. Create original static assets in `sites/SLUG/` and a matching `leads/SLUG.json`. This signed-in session uses the user's product access; the repo does not call an AI API. Keep every design specific to its business rather than bulk-replacing names in one template.

## 3. Quality checks and actual visual review

Run the core tests and build. The main-branch quality workflow saves four screenshots (320, 390, 768 and 1440 pixels) plus its browser report as **concept-quality-report**. Download and inspect all four.

Review visual hierarchy, mobile layout, business relevance, typography and conversion clarity. Record an honest score and limitations. A score cannot prove a sales outcome. These checks are not an accessibility audit or a measured Lighthouse score; add a dedicated audit before production handoff. Deployment refuses missing/failed/stale reviews.

Compute the source fingerprint:

```sh
node --input-type=module -e "import {fingerprint} from './scripts/lib/core.mjs'; console.log(await fingerprint('br-plumbing-austin'))"
```

Example review structure (set `approved` only after visual inspection):

```json
{
  "approved": false,
  "fingerprint": "CURRENT_SOURCE_HASH",
  "reviewer": "reviewer name",
  "reviewed_at": "ISO_TIMESTAMP",
  "scores": {"visual": 0, "mobile": 0, "business_relevance": 0, "typography": 0, "conversion": 0},
  "evidence": ["workflow run and inspected screenshot paths"],
  "limitations": ["No invented ratings; concept copy is grounded in public pages"]
}
```

## 4. Deploy

Open **Actions → Deploy reviewed concept → Run workflow → main → slug**. Alternatively commit a new `state/deploy-request.json` on main, with a validated slug and a unique timestamp. Cloudflare secrets are used only by deployment/lifecycle jobs, not pull-request quality checks.

If the preflight reports HTTP 403 on the zone or DNS endpoint, edit the Cloudflare token and add **Zone → Zone → Read** and **Zone → DNS → Read**, scoped to `muhammadmuneeb.tech`. The Workers token template already supplies the edit permissions for scripts, routes and R2; those two additional read scopes are for safe preflight. Update the GitHub secret only if Cloudflare issues a replacement token. Never paste a token in chat or code.

The workflow uploads a dependency-free Worker module through Cloudflare's multipart upload API, binds the private R2 bucket, uploads a new release and attaches only the selected first-level hostname as a Worker Custom Domain. It refuses occupied DNS/other-worker hostnames. Files become visible after a single metadata pointer switch; a partial upload leaves an existing live release intact.

R2 layout:

```text
metadata/SLUG.json
sites/SLUG/RELEASE/index.html
sites/SLUG/RELEASE/assets/...
```

Inspect **deployment-evidence**. `deployment.json` proves the deploy response; `outbox/SLUG.json` exists only after the exact HTML and its local assets have passed live HTTPS checks. A certificate may need time to issue. If the verification step fails, wait for actual DNS/certificate propagation and rerun; do not email an unverified link. Idempotent redeployment preserves expiry.

## 5. Email a verified concept

The outbox is a reviewable draft, not an automatic sender. Connect a sending/reconciliation step to the user's existing Gmail workflow next. Recipient provenance is recorded and the draft includes all three profile links. A local suppression list and sent ledger provide an additional check, but Gmail Sent, delivery notifications and replies remain authoritative.

Before sending: verify the prospect's need, public business address, no prior contact/opt-out/bounce, current HTTPS and expiry, and the shared remaining 20/day quota. Record actual Gmail message/thread IDs and timestamps after a successful send. Uncertain sends stay reserved until Gmail reconciliation resolves them. Follow-ups stop on any response or opt-out and must not point to an expired concept.

## 6. Preserve interested leads or expire

**Actions → Demo lifecycle → Run workflow → slug → interested** marks a current concept interested, preventing automatic expiry. Select **expire** for early removal. The nightly cleanup only removes sites and custom domains owned by this router and matching the configured zone; it never deletes portfolio assets or the bucket.

At the expiry instant the router returns 410 while the domain still exists. After cleanup detaches the custom domain, the hostname may stop resolving; a permanent expired-page URL is not promised after domain removal. Metadata tombstones stay private and make retries safe.

## Sources for the implementation

- [Cloudflare module upload metadata](https://developers.cloudflare.com/workers/configuration/multipart-upload-metadata/)
- [Cloudflare attach Worker domain](https://developers.cloudflare.com/api/resources/workers/subresources/domains/methods/update/)
- [Cloudflare R2 object API](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/objects/)
- [Cloudflare API token template permissions](https://developers.cloudflare.com/fundamentals/api/reference/template/)
- [Playwright library](https://playwright.dev/docs/api/class-playwright)

## Current boundaries

Deterministic CI/deployment/lifecycle can run unattended. Automated lead discovery, generation-session initiation, Gmail sending, reply-to-CRM synchronization and scheduled follow-ups are not wired up by this first implementation. Do not describe the repository as a fully autonomous end-to-end sales machine until those integrations have been exercised and their outcomes verified.
