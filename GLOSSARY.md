# BroArr

A local events aggregator for Brønnøysund, Norway. The collector gathers events from local sources
once a day, and the site presents them to residents.

## Language

### Collection

**Collector**:
The scheduled pipeline that gathers events, categorizes them, and writes the events file.
_Avoid_: importer, job

**Source**:
One local website the collector draws events from, such as Brønnøy kommune or Brønnøy kirke.
_Avoid_: site, target, feed

**Puppeteer event**:
An event the collector gathered from a Source directly. Its identity is derived from the Source and
the start time, so it changes whenever a Source revises either.
_Avoid_: source event, site event

**Apify event**:
An event the collector gathered from its Apify dataset. It keeps the upstream listing's own
identity, which stays stable no matter how that listing is edited.
_Avoid_: dataset event, actor event

**Events file**:
The committed snapshot of every known event. It is the collector's only output and the site's only
input.
_Avoid_: database, store, feed

### Extraction

**Block**:
The card, row or item on a Source page holding one event, or one day of them. The collector finds
it as the outermost ancestor of a Piece standing among look-alike siblings, so the page's own
markup decides where one event ends and the next begins.
_Avoid_: candidate group, event container, cluster, card, item, node

**Piece**:
An element on a Source page holding text and nothing but text — a title, a date, a venue. The
collector reads every visible one straight off the live page, and the Decision model labels each,
which decides the field it fills.
_Avoid_: fragment, chunk, token

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

**Decision model**:
The model that answers closed questions about Events — reading one out of a Source page, picking a
Category, or judging whether a Candidate pair is a Duplicate. It answers with a probability or a
labelled choice, never prose, so every word of an Event is copied from its Source.
_Avoid_: classifier, judge, LLM
