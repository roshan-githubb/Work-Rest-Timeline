'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DAY,
  DRIVER_ID,
  DRIVER_NAME,
  LICENCE_NUMBER,
  RULESETS,
  TIMEZONE_LABEL,
} from '@/lib/config';
import {
  applyStroke,
  beginStroke,
  blocksToChanges,
  changesToBlocks,
  createEmptyDay,
  formatDuration,
  summarise,
} from '@/lib/timeline';
import TimelineGrid from './TimelineGrid';

export default function WorkRestTimeline() {
  const [blocks, setBlocks] = useState(createEmptyDay);
  const [savedBlocks, setSavedBlocks] = useState(createEmptyDay);
  const [stroke, setStroke] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [ruleset, setRuleset] = useState(RULESETS[0]);

  const blocksRef = useRef(blocks);
  const strokeRef = useRef(stroke);
  useEffect(() => {
    blocksRef.current = blocks;
    strokeRef.current = stroke;
  });

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(
          `/api/timeline?driverId=${DRIVER_ID}&date=${DAY.date}`,
        );
        const data = await response.json();
        const loaded = changesToBlocks(data.changes, DAY);
        setBlocks(loaded);
        setSavedBlocks(loaded);
      } catch {
        setMessage('Could not load this day');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleStrokeStart = useCallback((index) => {
    setStroke(beginStroke(blocksRef.current, index));
    setMessage('');
  }, []);

  const handleStrokeMove = useCallback((index) => {
    setStroke((current) => (current ? { ...current, head: index } : current));
  }, []);

  const handleStrokeEnd = useCallback(() => {
    const current = strokeRef.current;
    if (!current) return;
    setStroke(null);
    setBlocks((blocks) => applyStroke(blocks, current));
  }, []);

  const handleStrokeCancel = useCallback(() => setStroke(null), []);

  const isDirty = useMemo(
    () => blocks.some((block, index) => block !== savedBlocks[index]),
    [blocks, savedBlocks],
  );

  async function handleSave() {
    const pending = blocks;
    setSaving(true);
    setMessage('');

    try {
      const changes = blocksToChanges(pending, DAY);
      const response = await fetch('/api/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: DRIVER_ID, date: DAY.date, changes }),
      });
      if (!response.ok) throw new Error('Save failed');
      setSavedBlocks(pending);
      setMessage('Saved');
    } catch {
      setMessage('Could not save');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setBlocks(savedBlocks);
    setMessage('');
  }

  const shown = useMemo(() => applyStroke(blocks, stroke), [blocks, stroke]);
  const totals = useMemo(() => summarise(shown), [shown]);

  if (loading) {
    return <p className="p-6 text-sm text-slate-500">Loading…</p>;
  }

  return (
    <section className="overflow-hidden rounded-lg border border-slate-300 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-[#eef1f8] px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-3 text-sm">
          <Field label="Driver" value={DRIVER_NAME} />

          <label className="flex flex-col gap-1">
            <span className="sr-only">Ruleset</span>
            <select
              value={ruleset}
              onChange={(event) => setRuleset(event.target.value)}
              className="w-56 rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-sm"
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

        <div className="flex items-center gap-3">
          {message ? (
            <span className="text-sm text-slate-600">{message}</span>
          ) : isDirty ? (
            <span className="text-sm text-amber-700">Unsaved changes</span>
          ) : null}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="rounded-sm bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
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
      </header>

      <div className="overflow-x-auto p-4">
        <div className="flex items-start">
          <div className="min-w-0 flex-1">
            <TimelineGrid
              blocks={shown}
              stroke={stroke}
              onStrokeStart={handleStrokeStart}
              onStrokeMove={handleStrokeMove}
              onStrokeEnd={handleStrokeEnd}
              onStrokeCancel={handleStrokeCancel}
            />
          </div>

          <div className="mt-9 w-28 shrink-0 border-y border-r border-slate-300">
            <Total label="Total Work" value={formatDuration(totals.workMinutes)} />
            <Total label="Total Rest" value={formatDuration(totals.restMinutes)} />
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Drag across the graph to fill in work and rest. A drag does the opposite of
          whatever you started on. Press Escape mid-drag to cancel.
        </p>
      </div>
    </section>
  );
}

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] leading-none text-slate-500">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function Total({ label, value }) {
  return (
    <div className="flex h-[30px] flex-col justify-center border-b border-slate-300 px-2 last:border-b-0">
      <span className="text-[9px] leading-none text-slate-500">{label}</span>
      <span className="mt-0.5 text-xs leading-none font-semibold tabular-nums">{value}</span>
    </div>
  );
}
