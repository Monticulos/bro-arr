# Apify Integration

The collector uses Apify to discover events from Facebook's location-based event discovery.

## How it works

1. The collector builds a Facebook events search URL (`/events/search?q=Brønnøysund&filters=...`) with base64-encoded filters for location (ID `103758419663407`) and date range (today to 6 months ahead).
2. It starts an Apify actor run via `POST /v2/acts/:actorId/runs`.
3. While the actor runs, manual event collection happens in parallel.
4. After manual collection, the collector polls `GET /v2/actor-runs/:runId` until the actor finishes.
5. Events are fetched from the actor's dataset and merged with manually collected events.

## Schedule

Apify runs every other day (on even UTC dates) to stay within the ~$5/month budget. On skip days, Facebook events from the previous run are preserved.

Manual collection (cinema, etc.) runs daily regardless.

## What counts as a successful run

- **SUCCEEDED** — the actor finished all its work. Full dataset.
- **TIMED-OUT** — the actor hit the server-side timeout before finishing. We accept partial results since the timeout exists as a cost ceiling, not a correctness guarantee. Events collected before the cutoff are still valid.