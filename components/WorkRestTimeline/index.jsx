'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_RANGE,
  DRIVER_ID,
  MAX_RANGE_DAYS,
  QUICK_FILTERS,
  RULESETS,
  dayFor,
} from '@/lib/config';
import {
  countDays,
  datesInRange,
  isISODate,
  normaliseRange,
  rangeEndingAt,
} from '@/lib/dates';
import {
  applyStroke,
  beginStroke,
  blocksToChanges,
  changesToBlocks,
  createEmptyDay,
  sameBlocks,
} from '@/lib/timeline';
import TimelineDay from './TimelineDay';

// One shared instance, never written to, so a day that is missing does not hand
// out a fresh array on every render and defeat TimelineDay's memoisation.
const EMPTY_DAY = createEmptyDay();

export default function WorkRestTimeline() {
  const [range, setRange] = useState(DEFAULT_RANGE);
  const [days, setDays] = useState({});
  const [saved, setSaved] = useState({});
  const [rulesets, setRulesets] = useState({});
  const [stroke, setStroke] = useState(null);
  const [loadedRange, setLoadedRange] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const daysRef = useRef(days);
  const strokeRef = useRef(stroke);
  useEffect(() => {
    daysRef.current = days;
    strokeRef.current = stroke;
  });

  const dates = useMemo(() => datesInRange(range.from, range.to), [range]);

  // Loading is what the range being on screen looks like before its days have
  // arrived, so it is read off the two rather than tracked on its own.
  const loading =
    loadedRange?.from !== range.from || loadedRange?.to !== range.to;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          `/api/timeline?driverId=${DRIVER_ID}&from=${range.from}&to=${range.to}`,
        );
        if (!response.ok) throw new Error('Load failed');

        const data = await response.json();
        if (cancelled) return;

        const loaded = {};
        for (const day of data.days) {
          loaded[day.date] = changesToBlocks(day.changes, dayFor(day.date));
        }

        setSaved((previous) => ({ ...previous, ...loaded }));
        setDays((previous) => {
          const next = { ...previous };
          for (const [date, blocks] of Object.entries(loaded)) {
            // Widening the range reloads days already on screen; anything the
            // reader has edited but not saved stays as they left it.
            const edited = previous[date] && !sameBlocks(previous[date], blocks);
            if (!edited) next[date] = blocks;
          }
          return next;
        });
      } catch {
        if (!cancelled) setMessage('Could not load these days');
      } finally {
        // Marked as loaded either way: a range that failed should show the
        // problem, not sit on "Loading…" for ever.
        if (!cancelled) setLoadedRange(range);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const blocksFor = useCallback((date) => days[date] ?? EMPTY_DAY, [days]);

  const handleStrokeStart = useCallback((date, index) => {
    const blocks = daysRef.current[date] ?? EMPTY_DAY;
    setStroke({ date, ...beginStroke(blocks, index) });
    setMessage('');
  }, []);

  const handleStrokeMove = useCallback((index) => {
    setStroke((current) =>
      !current || current.head === index ? current : { ...current, head: index },
    );
  }, []);

  const handleStrokeEnd = useCallback(() => {
    const current = strokeRef.current;
    if (!current) return;

    setStroke(null);
    setDays((previous) => ({
      ...previous,
      [current.date]: applyStroke(previous[current.date] ?? EMPTY_DAY, current),
    }));
  }, []);

  const handleStrokeCancel = useCallback(() => setStroke(null), []);

  const handleRulesetChange = useCallback((date, value) => {
    setRulesets((previous) => ({ ...previous, [date]: value }));
  }, []);

  const dirtyDates = useMemo(
    () => dates.filter((date) => saved[date] && !sameBlocks(blocksFor(date), saved[date])),
    [dates, saved, blocksFor],
  );

  function moveRange(edge, value) {
    if (!isISODate(value)) return;

    const next = normaliseRange(
      { ...range, [edge]: value },
      { maxDays: MAX_RANGE_DAYS, moved: edge },
    );
    if (!next) return;

    setRange(next);
    setMessage('');
  }

  // The last day stays where it is and the range grows backwards from it.
  function applyQuickFilter(length) {
    setRange(rangeEndingAt(range.to, length));
    setMessage('');
  }

  async function handleSave() {
    const pending = dirtyDates.map((date) => ({ date, blocks: blocksFor(date) }));
    if (pending.length === 0) return;

    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: DRIVER_ID,
          days: pending.map(({ date, blocks }) => ({
            date,
            changes: blocksToChanges(blocks, dayFor(date)),
          })),
        }),
      });
      if (!response.ok) throw new Error('Save failed');

      setSaved((previous) => {
        const next = { ...previous };
        for (const { date, blocks } of pending) next[date] = blocks;
        return next;
      });
      setMessage(pending.length === 1 ? 'Saved 1 day' : `Saved ${pending.length} days`);
    } catch {
      setMessage('Could not save');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setDays((previous) => {
      const next = { ...previous };
      for (const date of dirtyDates) next[date] = saved[date];
      return next;
    });
    setMessage('');
  }

  const isDirty = dirtyDates.length > 0;
  const spanLength = countDays(range.from, range.to);

  return (
    <section>
      <div className="sticky top-0 z-10 -mx-4 mb-5 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border sm:border-slate-300 sm:px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label className="min-w-0 flex-1 sm:flex-none">
                <span className="sr-only">From date</span>
                <input
                  type="date"
                  value={range.from}
                  onChange={(event) => moveRange('from', event.target.value)}
                  className="w-full rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-sm sm:w-40"
                />
              </label>

              <span aria-hidden="true" className="text-slate-400">
                –
              </span>

              <label className="min-w-0 flex-1 sm:flex-none">
                <span className="sr-only">To date</span>
                <input
                  type="date"
                  value={range.to}
                  onChange={(event) => moveRange('to', event.target.value)}
                  className="w-full rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-sm sm:w-40"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-slate-500">
              <span className="mr-1">Quick Filter:</span>
              {QUICK_FILTERS.map((length, index) => (
                <span key={length} className="flex items-center gap-1">
                  {index > 0 ? <span className="text-slate-300">|</span> : null}
                  <button
                    type="button"
                    onClick={() => applyQuickFilter(length)}
                    aria-pressed={spanLength === length}
                    className={`rounded-sm px-1.5 py-0.5 hover:bg-slate-100 ${
                      spanLength === length
                        ? 'bg-slate-100 font-semibold text-slate-900'
                        : 'text-sky-700'
                    }`}
                  >
                    {length} days
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="min-w-0 flex-1 truncate text-xs text-slate-600 sm:text-sm">
              {message ||
                (isDirty
                  ? `${dirtyDates.length} unsaved ${dirtyDates.length === 1 ? 'day' : 'days'}`
                  : '')}
            </span>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="rounded-sm bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={saving || !isDirty}
              className="rounded-sm border border-slate-300 px-4 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {loading && dates.every((date) => !days[date]) ? (
        <p className="p-6 text-sm text-slate-500">Loading…</p>
      ) : (
        dates.map((date) => (
          <TimelineDay
            key={date}
            date={date}
            blocks={blocksFor(date)}
            stroke={stroke?.date === date ? stroke : null}
            ruleset={rulesets[date] ?? RULESETS[0]}
            isDirty={dirtyDates.includes(date)}
            onRulesetChange={handleRulesetChange}
            onStrokeStart={handleStrokeStart}
            onStrokeMove={handleStrokeMove}
            onStrokeEnd={handleStrokeEnd}
            onStrokeCancel={handleStrokeCancel}
          />
        ))
      )}

      <p className="mt-4 text-xs text-slate-500">
        Drag across a graph to fill in work and rest. A drag does the opposite of whatever
        you started on. Press Escape mid-drag to cancel.
      </p>
    </section>
  );
}
