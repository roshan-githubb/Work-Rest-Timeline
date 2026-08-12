import { rangeEndingAt } from './dates';

export const DRIVER_ID = 'driver-42';
export const DRIVER_NAME = 'M. Sullivan';
export const LICENCE_NUMBER = 'VIC 4821 9930';

export const UTC_OFFSET = '+10:00';
export const TIMEZONE_LABEL = 'VIC (UTC +10:00)';

export const RULESETS = ['Standard Solo'];

// The demo data is anchored to a fixed day so the seeded shifts stay visible.
export const TODAY = '2025-08-12';

export const QUICK_FILTERS = [7, 14, 28];
export const MAX_RANGE_DAYS = 28;

export const DEFAULT_RANGE = rangeEndingAt(TODAY, QUICK_FILTERS[0]);

export function dayFor(date) {
  return { date, utcOffset: UTC_OFFSET };
}
