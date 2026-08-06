'use client';

import { useEffect, useRef } from 'react';
import { BLOCKS_PER_DAY, blockWallClock, strokeRange } from '@/lib/timeline';
import TimelineLane from './TimelineLane';

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

  function columnAt(clientX) {
    const rect = columnsRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const ratio = (clientX - rect.left) / rect.width;
    const index = Math.floor(ratio * BLOCKS_PER_DAY);
    return Math.min(BLOCKS_PER_DAY - 1, Math.max(0, index));
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return;

    const index = columnAt(event.clientX);
    if (index === null) return;

    event.preventDefault();
    onStrokeStart(index);
  }

  function handlePointerMove(event) {
    if (!isDragging) return;

    const index = columnAt(event.clientX);
    if (index !== null && index !== stroke.head) onStrokeMove(index);
  }

  useEffect(() => {
    if (!isDragging) return;

    const end = () => onStrokeEnd();
    const cancel = (event) => {
      if (event.key === 'Escape') onStrokeCancel();
    };

    window.addEventListener('pointerup', end);
    window.addEventListener('keydown', cancel);

    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('keydown', cancel);
    };
  }, [isDragging, onStrokeEnd, onStrokeCancel]);

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      className={`min-w-[720px] touch-none select-none ${isDragging ? 'cursor-col-resize' : ''}`}
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
      <div className="w-16 shrink-0" />
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
      <div className="w-16 shrink-0" />
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
              className="absolute bottom-0 -translate-x-1/2 text-[10px] leading-none text-slate-500 tabular-nums"
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
