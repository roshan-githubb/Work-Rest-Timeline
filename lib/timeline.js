export const MINUTES_PER_BLOCK = 15;
export const BLOCKS_PER_DAY = (24 * 60) / MINUTES_PER_BLOCK;
export const DEFAULT_STATE = 'Rest';

export function createEmptyDay() {
  return new Array(BLOCKS_PER_DAY).fill(DEFAULT_STATE);
}

const pad2 = (n) => String(n).padStart(2, '0');

export function blockWallClock(index) {
  const minutes = index * MINUTES_PER_BLOCK;
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
}

export function blockIndexToTimestamp(index, day) {
  return `${day.date}T${blockWallClock(index)}:00${day.utcOffset}`;
}

export function minutesFromDayStart(startTime, day) {
  const moment = Date.parse(startTime);
  const dayStart = Date.parse(`${day.date}T00:00:00${day.utcOffset}`);

  if (Number.isNaN(moment) || Number.isNaN(dayStart)) return Number.NaN;

  return (moment - dayStart) / 60000;
}

export function roundToBlockIndex(minutes) {
  return Math.ceil(minutes / MINUTES_PER_BLOCK);
}

export function blocksToChanges(blocks, day) {
  const changes = [];
  let previous = DEFAULT_STATE;

  for (let index = 0; index < blocks.length; index++) {
    const current = blocks[index];

    if (current !== previous) {
      changes.push({
        startTime: blockIndexToTimestamp(index, day),
        eventType: current,
      });
      previous = current;
    }
  }

  return changes;
}

export function changesToBlocks(changes, day) {
  const blocks = createEmptyDay();

  const ordered = changes
    .map((change) => ({
      change,
      minutes: minutesFromDayStart(change.startTime, day),
    }))
    .filter((entry) => !Number.isNaN(entry.minutes))
    .sort((a, b) => a.minutes - b.minutes);

  for (const { change, minutes } of ordered) {
    const rounded = roundToBlockIndex(minutes);

    if (rounded >= BLOCKS_PER_DAY) continue;

    const start = Math.max(0, rounded);

    for (let index = start; index < BLOCKS_PER_DAY; index++) {
      blocks[index] = change.eventType;
    }
  }

  return blocks;
}

export function sameBlocks(a, b) {
  return a.length === b.length && a.every((block, index) => block === b[index]);
}

export function strokeRange(stroke) {
  return stroke.anchor <= stroke.head
    ? [stroke.anchor, stroke.head]
    : [stroke.head, stroke.anchor];
}

export function beginStroke(blocks, index) {
  return {
    anchor: index,
    head: index,
    value: blocks[index] === 'Work' ? 'Rest' : 'Work',
  };
}

export function applyStroke(blocks, stroke) {
  if (!stroke) return blocks;

  const [from, to] = strokeRange(stroke);
  const next = blocks.slice();

  for (let i = Math.max(0, from); i <= Math.min(blocks.length - 1, to); i++) {
    next[i] = stroke.value;
  }

  return next;
}

export function summarise(blocks) {
  const workBlocks = blocks.filter((block) => block === 'Work').length;

  return {
    workMinutes: workBlocks * MINUTES_PER_BLOCK,
    restMinutes: (blocks.length - workBlocks) * MINUTES_PER_BLOCK,
  };
}

export function formatDuration(minutes) {
  return `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
}
