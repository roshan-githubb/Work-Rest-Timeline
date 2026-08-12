'use client';

import { memo, useCallback, useMemo } from 'react';
import { DRIVER_NAME, LICENCE_NUMBER, RULESETS, TIMEZONE_LABEL } from '@/lib/config';
import { formatDayHeading, formatFullDate } from '@/lib/dates';
import { applyStroke, formatDuration, summarise } from '@/lib/timeline';
import TimelineGrid from './TimelineGrid';

// A month of days is a few thousand columns. Only the day under the pointer
// changes while a drag is running, so the rest are held still.
export default memo(TimelineDay);

function TimelineDay({
  date,
  blocks,
  stroke,
  ruleset,
  isDirty,
  onRulesetChange,
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
  onStrokeCancel,
}) {
  const handleStrokeStart = useCallback(
    (index) => onStrokeStart(date, index),
    [date, onStrokeStart],
  );

  const shown = useMemo(() => applyStroke(blocks, stroke), [blocks, stroke]);
  const totals = useMemo(() => summarise(shown), [shown]);

  return (
    <section className="mt-6 first:mt-0">
      <div className="mb-2 flex items-baseline gap-3">
        <h2 className="text-base font-semibold sm:text-lg">
          <span className="sr-only">{formatFullDate(date)}</span>
          <span aria-hidden="true">{formatDayHeading(date)}</span>
        </h2>
        {isDirty ? (
          <span className="rounded-sm bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
            Unsaved
          </span>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-slate-200 bg-[#eef1f8] px-3 py-3 text-sm sm:flex sm:flex-wrap sm:items-center sm:gap-x-10 sm:px-4">
          <Field label="Driver" value={DRIVER_NAME} />

          <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
            <span className="sr-only">Ruleset for {formatFullDate(date)}</span>
            <select
              value={ruleset}
              onChange={(event) => onRulesetChange(date, event.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-sm sm:w-56"
            >
              {RULESETS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <Field label="Time Zone" value={TIMEZONE_LABEL} />
          <Field label="Licence Number" value={LICENCE_NUMBER} />
        </div>

        <div className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <TimelineGrid
                blocks={shown}
                stroke={stroke}
                onStrokeStart={handleStrokeStart}
                onStrokeMove={onStrokeMove}
                onStrokeEnd={onStrokeEnd}
                onStrokeCancel={onStrokeCancel}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 border border-slate-300 sm:mt-9 sm:block sm:w-28 sm:border-y sm:border-r sm:border-l-0">
              <Total label="Total Work" value={formatDuration(totals.workMinutes)} />
              <Total label="Total Rest" value={formatDuration(totals.restMinutes)} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, value }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[11px] leading-none text-slate-500">{label}</span>
      <span className="truncate text-sm font-medium">{value}</span>
    </div>
  );
}

function Total({ label, value }) {
  return (
    <div className="flex h-[30px] flex-col justify-center border-r border-slate-300 px-2 last:border-r-0 sm:border-r-0 sm:border-b sm:last:border-b-0">
      <span className="text-[9px] leading-none text-slate-500">{label}</span>
      <span className="mt-0.5 text-xs leading-none font-semibold tabular-nums">{value}</span>
    </div>
  );
}
