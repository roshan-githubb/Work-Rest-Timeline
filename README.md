# Work / Rest Timeline

A driver's Work and Rest periods across a 24-hour day, in 15-minute blocks.

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # 26 tests over lib/timeline.js
```

Built with Next.js (App Router), React and Tailwind. Plain JavaScript.

---

## The idea

A day is **96 blocks** of 15 minutes. Every block is either Work or Rest, and the day
starts as Rest.

The screen needs all 96 blocks, because that is what you drag across. The API does not —
it only stores the **moments the state changes**:

```json
[
  { "startTime": "2025-08-12T07:00:00+10:00", "eventType": "Work" },
  { "startTime": "2025-08-12T14:15:00+10:00", "eventType": "Rest" }
]
```

Two entries instead of ninety-six, and the full day can be rebuilt from them. Converting
between those two forms — in both directions, losing nothing — is what this project is.

Both conversions live in [`lib/timeline.js`](lib/timeline.js) as plain functions with no
React in them, so they can be tested on their own.

- `blocksToChanges` — walk the blocks, record only where the value changes.
- `changesToBlocks` — start all Rest, sort by time, paint each change from its position
  to the end of the day. Later changes simply cover earlier ones, so there is never any
  need to look ahead.

An all-Rest day produces an empty list, because Rest is what the day already is.

## Times and timezones

Timestamps are built by joining strings, never with `new Date(...)`. A `Date` is
interpreted in whatever timezone the machine happens to be set to — developing from Nepal
(UTC+5:45) against a Melbourne day (UTC+10:00) would shift every timestamp by 4h15m, and
the result would still look like a valid time.

Reading goes the other way: `Date.parse` turns a timestamp that carries its own offset
into an absolute moment, which is the same number anywhere in the world. `getHours()` is
never used.

## Rounding

Incoming times need not sit on a 15-minute boundary — the brief's example shows one at
07:10. Confirmed with the client: **round up**, applied the same way to every event. So
07:10 becomes 07:15 and 14:20 becomes 14:30. A time already on a boundary stays put.

## Dragging

The value a drag paints is decided **once**, when the pointer goes down: the opposite of
the block it started on. Start on Rest and the whole drag fills Work; start on Work and it
clears.

That is what stops it flickering. If each block flipped as the pointer entered it, dragging
back over blocks you had already crossed would flip them a second time.

- The drag is held separately and only written into the blocks on pointer-up, so **Escape**
  can abandon it with nothing to undo.
- The range is sorted, so **dragging right-to-left works exactly like left-to-right**, and
  dragging back toward the start shrinks it.
- A click with no movement is just a one-block range — no special case.
- The column under the pointer is worked out from the strip's geometry, not from a handler
  on each of the 96 columns.
- The pointer-up listener is on `window`, so releasing outside the graph still ends the drag.

## Midnight boundaries

- A change from **before midnight** (an overnight shift) is clamped to block 0 rather than
  dropped — that work is still in effect at midnight.
- A change **at or after 24:00** belongs to the next day and is ignored, so it cannot cut
  today's work short.

## API

A small local endpoint, as the brief allows. The data lives in a module-level object in
[`app/api/timeline/route.js`](app/api/timeline/route.js), seeded with one day so the graph
has something to load.

```
GET  /api/timeline?driverId=driver-42&date=2025-08-12
POST /api/timeline   { driverId, date, changes }
```

Because the store is in memory, saved data lasts as long as the dev server is running and
resets when it restarts.

## Files

```
app/
  page.js                     the page
  api/timeline/route.js       GET and POST
components/WorkRestTimeline/
  index.jsx                   holds the data, loads and saves
  TimelineGrid.jsx            the graph and all the mouse handling
  TimelineLane.jsx            one row of 96 columns
lib/
  timeline.js                 the conversion logic
  timeline.test.js            26 tests
  config.js                   the fixed driver, day and timezone
```

## Not included

Out of scope for this task: breach detection, multiple days, and a date range picker.
