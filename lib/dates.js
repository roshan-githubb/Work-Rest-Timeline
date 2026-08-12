export const MS_PER_DAY = 24 * 60 * 60 * 1000;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseISODate(iso) {
  return new Date(`${iso}T00:00:00Z`);
}

export function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

export function isISODate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;

  // A date like 2025-02-31 parses but rolls over into March, so the only proof
  // it was a real day is that it comes back out the way it went in.
  const parsed = parseISODate(value);
  return !Number.isNaN(parsed.getTime()) && toISODate(parsed) === value;
}

export function addDays(iso, amount) {
  const date = parseISODate(iso);
  date.setUTCDate(date.getUTCDate() + amount);
  return toISODate(date);
}

export function daysBetween(fromISO, toISO) {
  return Math.round((parseISODate(toISO) - parseISODate(fromISO)) / MS_PER_DAY);
}

export function countDays(fromISO, toISO) {
  return daysBetween(fromISO, toISO) + 1;
}

export function datesInRange(fromISO, toISO) {
  if (!isISODate(fromISO) || !isISODate(toISO)) return [];

  const dates = [];
  for (let day = 0; day < countDays(fromISO, toISO); day++) {
    dates.push(addDays(fromISO, day));
  }
  return dates;
}

// Keeps `from` on or before `to`, and never lets the range grow past `maxDays`.
// The edge the reader just moved stays put; the other one gives way.
export function normaliseRange({ from, to }, { maxDays, moved = 'to' } = {}) {
  if (!isISODate(from) || !isISODate(to)) return null;

  let range = { from, to };

  if (daysBetween(range.from, range.to) < 0) {
    range = moved === 'from' ? { from, to: from } : { from: to, to };
  }

  if (maxDays && countDays(range.from, range.to) > maxDays) {
    range =
      moved === 'from'
        ? { from: range.from, to: addDays(range.from, maxDays - 1) }
        : { from: addDays(range.to, -(maxDays - 1)), to: range.to };
  }

  return range;
}

export function rangeEndingAt(toISO, days) {
  return { from: addDays(toISO, -(days - 1)), to: toISO };
}

export function formatDayHeading(iso) {
  const date = parseISODate(iso);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

export function formatFullDate(iso) {
  const date = parseISODate(iso);
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${
    MONTHS[date.getUTCMonth()]
  } ${date.getUTCFullYear()}`;
}
