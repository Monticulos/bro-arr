# BroArr

A local events aggregator for Brønnøysund, Norway. The collector gathers events from local sources
once a day, and the site presents them to residents.

## Language

### Collection

**Collector**:
The scheduled pipeline that gathers events, categorizes them, and writes the events file.
_Avoid_: scraper, crawler, importer

**Source**:
One local website the collector draws events from, such as Brønnøy kommune or Brønnøy kirke.
_Avoid_: site, target, feed

**Puppeteer event**:
An event the collector gathered from a Source directly. Its identity is derived from the Source and
the start time, so it changes whenever a Source revises either.
_Avoid_: scraped event, source event, site event

**Apify event**:
An event the collector gathered from its Apify dataset. It keeps the upstream listing's own
identity, which stays stable no matter how that listing is edited.
_Avoid_: dataset event, actor event

**Events file**:
The committed snapshot of every known event. It is the collector's only output and the site's only
input.
_Avoid_: database, store, feed

### Events

**Event**:
One happening in Brønnøysund at a known start time — a concert, a service, a quiz night.

**Category**:
The single Norwegian label an Event is filed under, such as `musikk` or `tro-og-livssyn`. An Event
may have none, in which case the site treats it as `annet`.
_Avoid_: tag, genre, type

**Upcoming event**:
An Event that has not yet finished, counting an event as still running for a grace period after it
starts. The opposite is an **expired event**, which the collector removes.
_Avoid_: active event, live event, current event

**Duplicate**:
Two Events that describe the same single occurrence, listed by two different sources. Two showings
of the same production at different times are *not* duplicates — they are separate occurrences.
_Avoid_: match, copy, repeat

**Candidate pair**:
One Apify event and one Puppeteer event, close enough in time to be worth asking whether they are a
Duplicate.

### Models

**Extraction model**:
The language model that turns a Source's raw text into structured Events.
_Avoid_: parser, formatter, LLM

**Decision model**:
The model that answers closed questions about Events — picking a Category, or judging whether a
Candidate pair is a Duplicate. It answers with a probability or a labelled choice, never prose.
_Avoid_: classifier, judge, LLM
