import { NextResponse } from 'next/server';

const store = {
  'driver-42|2025-08-12': [
    { startTime: '2025-08-12T07:10:00+10:00', eventType: 'Work' },
    { startTime: '2025-08-12T14:20:00+10:00', eventType: 'Rest' },
    { startTime: '2025-08-12T15:30:00+10:00', eventType: 'Work' },
    { startTime: '2025-08-12T18:15:00+10:00', eventType: 'Rest' },
  ],
};

const key = (driverId, date) => `${driverId}|${date}`;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const driverId = searchParams.get('driverId');
  const date = searchParams.get('date');

  if (!driverId || !date) {
    return NextResponse.json({ error: 'driverId and date are required' }, { status: 400 });
  }

  return NextResponse.json({
    driverId,
    date,
    changes: store[key(driverId, date)] ?? [],
  });
}

export async function POST(request) {
  const body = await request.json();
  const { driverId, date, changes } = body;

  if (!driverId || !date || !Array.isArray(changes)) {
    return NextResponse.json(
      { error: 'driverId, date and changes are required' },
      { status: 400 },
    );
  }

  store[key(driverId, date)] = changes;

  return NextResponse.json({ driverId, date, changes });
}
