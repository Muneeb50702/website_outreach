# Researched prospects awaiting a coding session

The existing hourly ChatGPT outreach/reply automation now also prepares at most one demo prospect brief per Pakistan calendar day, beginning after 08:00. It uses public-web research and the GitHub connector; it does not call an AI API or silently start a Codex generation session.

Save a validated, source-backed brief as `SLUG.json` here and record the date/slug/commit in `state/research-history.json`. Intake briefs are validated by CI but do not require a site yet. The next Codex coding session chooses a worthwhile brief, moves/copies it into `leads/`, builds its matching site, runs QA and performs visual review.

All required fields follow the pilot's `leads/br-plumbing-austin.json`: slug, business_name, industry, location, services, public contact with E.164 phone/email and matching source URL, primary_conversion, design_direction, opportunity with source URL, and sources with ISO checked_at dates and supported facts. Set opportunity.qualified_for_outreach=false pending current visual comparison and Gmail checks. Include discovered_at and discovered_local_date for scheduling deduplication.

Do not save credentials, invented details, copied-page instructions or personal-data broker contacts. A queued brief is not a built website, an email or a qualified sale.
