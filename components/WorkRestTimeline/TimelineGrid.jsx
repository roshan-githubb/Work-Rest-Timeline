'use client';

import { useCallback, useEffect, useRef } from 'react';
import { BLOCKS_PER_DAY, blockWallClock, strokeRange } from '@/lib/timeline';
import TimelineLane from './TimelineLane';
import { LABEL_COLUMN } from './layout';

export default function TimelineGrid({
  blocks,
  stroke,
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
  onStrokeCancel,
}) {
  const columnsRef = useRef(null);
  const isDragging = stroke !== null;

  const columnAt = useCallback((clientX, { clamp }) => {
    const rect = columnsRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;

    // A press on the lane label, or off the end of the graph, is not a column —
    // but once a drag is under way we keep painting to whichever edge it left.
    if (!clamp && (clientX < rect.left || clientX > rect.right)) return null;

    const index = Math.floor(((clientX - rect.left) / rect.width) * BLOCKS_PER_DAY);
    return Math.min(BLOCKS_PER_DAY - 1, Math.max(0, index));
  }, []);

  function handlePointerDown(event) {
    // Mouse: left button only. Touch and pen report button 0 as well.
    if (event.button !== 0) return;

    const index = columnAt(event.clientX, { clamp: false });
    if (index === null) return;

    event.preventDefault();
    onStrokeStart(index);
  }

  useEffect(() => {
    if (!isDragging) return;

    // Tracked on the window so a drag survives leaving the graph, and so a
    // finger that slides onto another day's lanes still paints this one.
    const move = (event) => {
      const index = columnAt(event.clientX, { clamp: true });
      if (index !== null) onStrokeMove(index);
    };
    const end = () => onStrokeEnd();
    const cancel = () => onStrokeCancel();
    const key = (event) => {
      if (event.key === 'Escape') onStrokeCancel();
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', key);

    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', key);
    };
  }, [isDragging, columnAt, onStrokeMove, onStrokeEnd, onStrokeCancel]);

  return (
    <div
      onPointerDown={handlePointerDown}
      // pan-y, not none: a sideways drag paints, an up-and-down swipe still
      // scrolls the page past the other days.
      className={`touch-pan-y select-none ${isDragging ? 'cursor-col-resize' : ''}`}
    >
      <StrokeTimes stroke={stroke} />
      <HourRuler />

      <div className="overflow-hidden rounded-sm border border-slate-300">
        <TimelineLane lane="Work" blocks={blocks} columnsRef={columnsRef} />
        <TimelineLane lane="Rest" blocks={blocks} />
      </div>
    </div>
  );
}

function StrokeTimes({ stroke }) {
  const range = stroke ? strokeRange(stroke) : null;
  const ends = !range ? [] : range[0] === range[1] ? [range[0]] : [range[0], range[1]];

  return (
    <div className="flex h-5 items-end">
      <div className={LABEL_COLUMN} />
      <div className="relative flex-1">
        {ends.map((index) => (
          <span
            key={index}
            style={{ left: `${((index + 0.5) / BLOCKS_PER_DAY) * 100}%` }}
            className="absolute bottom-0 -translate-x-1/2 rounded-sm bg-[#dbe4f3] px-1.5 py-0.5 text-[10px] leading-none font-medium text-[#1e3a5f] tabular-nums"
          >
            {blockWallClock(index)}
          </span>
        ))}
      </div>
    </div>
  );
}

function Moon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3 fill-amber-400">
      <path d="M10.5 1.6a6.5 6.5 0 1 0 3.9 11.7A7 7 0 0 1 10.5 1.6Z" />
    </svg>
  );
}

function Sun() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3 fill-amber-400 stroke-amber-400">
      <circle cx="8" cy="8" r="3.4" />
      <path
        d="M8 0v2.2M8 13.8V16M0 8h2.2M13.8 8H16M2.3 2.3l1.6 1.6M12.1 12.1l1.6 1.6M13.7 2.3l-1.6 1.6M3.9 12.1l-1.6 1.6"
        strokeWidth="1.3"
      />
    </svg>
  );
}

function HourRuler() {
  const hours = Array.from({ length: 23 }, (_, i) => i + 1);

  return (
    <div className="flex items-end pb-1">
      <div className={LABEL_COLUMN} />
      <div className="relative h-4 flex-1">
        <span className="absolute bottom-0 left-0">
          <Moon />
        </span>

        {hours.map((hour) =>
          hour === 12 ? (
            <span key={hour} style={{ left: '50%' }} className="absolute bottom-0 -translate-x-1/2">
              <Sun />
            </span>
          ) : (
            <span
              key={hour}
              style={{ left: `${(hour / 24) * 100}%` }}
              // Every hour has room on a laptop; on a phone only every third
              // one does, so the rest step aside rather than overlap.
              className={`absolute bottom-0 -translate-x-1/2 text-[10px] leading-none text-slate-500 tabular-nums ${
                hour % 3 === 0 ? '' : 'hidden sm:inline'
              }`}
            >
              {String(hour).padStart(2, '0')}
            </span>
          ),
        )}

        <span className="absolute right-0 bottom-0">
          <Moon />
        </span>
      </div>
    </div>
  );
}
