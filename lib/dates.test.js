import { describe, expect, it } from 'vitest';
import {
  addDays,
  countDays,
  datesInRange,
  formatDayHeading,
  formatFullDate,
  isISODate,
  normaliseRange,
  rangeEndingAt,
} from './dates';

describe('reading dates', () => {
  it('accepts a plain calendar date', () => {
    expect(isISODate('2025-08-06')).toBe(true);
  });

  it('rejects anything that is not one', () => {
    for (const value of ['', '6 August', '2025-8-6', '2025-02-31', null, undefined]) {
      expect(isISODate(value)).toBe(false);
    }
  });

  it('steps across a month end without drifting', () => {
    expect(addDays('2025-08-31', 1)).toBe('2025-09-01');
    expect(addDays('2025-09-01', -1)).toBe('2025-08-31');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
  });
});

describe('a range of days', () => {
  it('counts both ends', () => {
    expect(countDays('2025-08-06', '2025-08-06')).toBe(1);
    expect(countDays('2025-08-06', '2025-08-12')).toBe(7);
  });

  it('lists every day in order', () => {
    expect(datesInRange('2025-08-30', '2025-09-02')).toEqual([
      '2025-08-30',
      '2025-08-31',
      '2025-09-01',
      '2025-09-02',
    ]);
  });

  it('lists nothing for a range it cannot read', () => {
    expect(datesInRange('', '2025-09-02')).toEqual([]);
  });

  it('builds a quick filter backwards from the last day', () => {
    expect(rangeEndingAt('2025-08-12', 7)).toEqual({
      from: '2025-08-06',
      to: '2025-08-12',
    });
  });
});

describe('keeping a range sensible', () => {
  it('leaves a good range alone', () => {
    const range = { from: '2025-08-06', to: '2025-08-12' };
    expect(normaliseRange(range, { maxDays: 28 })).toEqual(range);
  });

  it('drags the other end along when the two cross over', () => {
    expect(
      normaliseRange({ from: '2025-08-20', to: '2025-08-12' }, { moved: 'from' }),
    ).toEqual({ from: '2025-08-20', to: '2025-08-20' });

    expect(
      normaliseRange({ from: '2025-08-20', to: '2025-08-12' }, { moved: 'to' }),
    ).toEqual({ from: '2025-08-12', to: '2025-08-12' });
  });

  it('trims the end the reader did not touch when the range is too long', () => {
    expect(
      normaliseRange(
        { from: '2025-08-01', to: '2025-12-01' },
        { maxDays: 28, moved: 'from' },
      ),
    ).toEqual({ from: '2025-08-01', to: '2025-08-28' });

    expect(
      normaliseRange(
        { from: '2025-08-01', to: '2025-12-01' },
        { maxDays: 28, moved: 'to' },
      ),
    ).toEqual({ from: '2025-11-04', to: '2025-12-01' });
  });

  it('gives nothing back for a date it cannot read', () => {
    expect(normaliseRange({ from: '', to: '2025-08-12' })).toBe(null);
  });
});

describe('naming a day', () => {
  it('heads each day the way the planner does', () => {
    expect(formatDayHeading('2025-08-06')).toBe('6 August');
    expect(formatDayHeading('2025-12-25')).toBe('25 December');
  });

  it('spells the day out in full for screen readers', () => {
    expect(formatFullDate('2025-08-12')).toBe('Tuesday 12 August 2025');
  });
});
