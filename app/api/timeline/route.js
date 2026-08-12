import { NextResponse } from 'next/server';
import { countDays, datesInRange, isISODate } from '@/lib/dates';

const MAX_DAYS_PER_REQUEST = 31;

const store = {
  'driver-42|2025-08-08': [
    { startTime: '2025-08-08T05:45:00+10:00', eventType: 'Work' },
    { startTime: '2025-08-08T11:00:00+10:00', eventType: 'Rest' },
    { startTime: '2025-08-08T12:00:00+10:00', eventType: 'Work' },
    { startTime: '2025-08-08T16:30:00+10:00', eventType: 'Rest' },
  ],
  'driver-42|2025-08-09': [
    { startTime: '2025-08-09T22:00:00+10:00', eventType: 'Work' },
  ],
  'driver-42|2025-08-10': [
    { startTime: '2025-08-09T22:00:00+10:00', eventType: 'Work' },
    { startTime: '2025-08-10T04:30:00+10:00', eventType: 'Rest' },
  ],
  'driver-42|2025-08-11': [
    { startTime: '2025-08-11T06:00:00+10:00', eventType: 'Work' },
    { startTime: '2025-08-11T13:45:00+10:00', eventType: 'Rest' },
  ],
  'driver-42|2025-08-12': [
    { startTime: '2025-08-12T07:10:00+10:00', eventType: 'Work' },
    { startTime: '2025-08-12T14:20:00+10:00', eventType: 'Rest' },
    { startTime: '2025-08-12T15:30:00+10:00', eventType: 'Work' },
    { startTime: '2025-08-12T18:15:00+10:00', eventType: 'Rest' },
  ],
};

const key = (driverId, date) => `${driverId}|${date}`;

const readDay = (driverId, date) => ({
  date,
  changes: store[key(driverId, date)] ?? [],
});

const badRequest = (error) => NextResponse.json({ error }, { status: 400 });

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const driverId = searchParams.get('driverId');
  const date = searchParams.get('date');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!driverId) return badRequest('driverId is required');

  if (from || to) {
    if (!isISODate(from) || !isISODate(to)) {
      return badRequest('from and to must be YYYY-MM-DD dates');
    }
    if (countDays(from, to) < 1) {
      return badRequest('from must be on or before to');
    }
    if (countDays(from, to) > MAX_DAYS_PER_REQUEST) {
      return badRequest(`a range may not be longer than ${MAX_DAYS_PER_REQUEST} days`);
    }

    return NextResponse.json({
      driverId,
      from,
      to,
      days: datesInRange(from, to).map((day) => readDay(driverId, day)),
    });
  }

  if (!isISODate(date)) return badRequest('date must be a YYYY-MM-DD date');

  return NextResponse.json({ driverId, ...readDay(driverId, date) });
}

export async function POST(request) {
  const body = await request.json();
  const { driverId } = body;

  if (!driverId) return badRequest('driverId is required');

  // One day (`date` + `changes`) or several (`days`), saved the same way.
  const days = Array.isArray(body.days)
    ? body.days
    : [{ date: body.date, changes: body.changes }];

  if (days.length === 0) return badRequest('at least one day is required');
  if (days.length > MAX_DAYS_PER_REQUEST) {
    return badRequest(`at most ${MAX_DAYS_PER_REQUEST} days may be saved at once`);
  }

  for (const day of days) {
    if (!isISODate(day?.date) || !Array.isArray(day?.changes)) {
      return badRequest('each day needs a date and a list of changes');
    }
  }

  for (const day of days) {
    store[key(driverId, day.date)] = day.changes;
  }

  return NextResponse.json({
    driverId,
    days: days.map((day) => readDay(driverId, day.date)),
  });
}
