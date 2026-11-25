/**
 * time.js — date and offset helpers (UTC arithmetic only).
 *
 * All maths is done in UTC with Date.UTC so browser timezone does not matter.
 * India has no daylight saving, so this is safe.
 *
 * Offset convention (from TRD §3 and DATA_SPEC §2):
 *   stops[].arr / dep = minutes since 00:00 on the calendar day the train
 *   leaves its origin.  1440 = 00:00 next day.  2367 = 2nd day 15:27.
 */

/**
 * Parse a "YYYY-MM-DD" string and return the UTC midnight Date.
 * @param {string} dateStr
 * @returns {Date}
 */
export function parseDateUTC(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Format a UTC Date as "YYYY-MM-DD".
 * @param {Date} date
 * @returns {string}
 */
export function formatDateUTC(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Weekday index: Monday = 0, Sunday = 6 (matches days_of_run bitmask).
 * Uses getUTCDay() which returns 0 = Sunday, 1 = Monday, …, 6 = Saturday.
 * @param {Date} date  — UTC Date
 * @returns {number}   0–6
 */
export function weekdayIndex(date) {
  return (date.getUTCDay() + 6) % 7;
}

/**
 * Given a stop offset (minutes from origin's day-0 midnight) and the
 * journey date (the date the user wants to travel / board), try origin
 * start shifts of -1, 0, +1, +2 days and return all candidate real-time
 * Date objects.
 *
 * "Origin start" is the UTC midnight of the day the train left its first
 * station.  Real departure time = originStart + offset minutes.
 *
 * We try multiple shifts because a train that left its origin yesterday
 * (shift -1) can be passing through today, and trains with offsets > 1440
 * do the same for shift 0 or +1.
 *
 * @param {number} offsetMinutes   — dep or arr from corridor.json
 * @param {Date}   journeyDate     — UTC midnight of the date the user chose
 * @returns {Array<{ originStart: Date, realTime: Date }>}
 */
export function candidateOriginStarts(offsetMinutes, journeyDate) {
  const results = [];
  for (const shift of [-1, 0, 1, 2]) {
    const originStart = new Date(journeyDate.getTime() + shift * -1 * 86400000);
    // originStart = journeyDate - shift days  (shift -1 means origin was 1 day AFTER journeyDate, etc.)
    // Actually: shift = how many days BEFORE journeyDate the origin is.
    // We want real_time = originStart + offsetMinutes*60000 to land on journeyDate.
    // So originStart = journeyDate - floor(offsetMinutes/1440) days approximately.
    // We try all four shifts to cover edge cases exactly as reference/search.py does.
    const os = new Date(journeyDate.getTime() - shift * 86400000);
    const realTime = new Date(os.getTime() + offsetMinutes * 60000);
    results.push({ originStart: os, realTime });
  }
  return results;
}

/**
 * Given an offset (dep or arr) and a journey date, return every valid
 * (originStart, realTime) pair where realTime falls on or after journeyDate
 * midnight and the origin start day satisfies the days_of_run bitmask.
 *
 * "Valid origin start" means the train actually departs its first station
 * on that weekday (or days_of_run is null = always runs).
 *
 * @param {number}       offsetMinutes
 * @param {Date}         journeyDate    — UTC midnight
 * @param {string|null}  daysOfRun      — 7-char bitmask "1101101" Mon…Sun, or null
 * @returns {Array<{ originStart: Date, realTime: Date }>}
 */
export function validOriginStarts(offsetMinutes, journeyDate, daysOfRun) {
  const candidates = [];
  for (const shift of [-1, 0, 1, 2]) {
    const originStart = new Date(journeyDate.getTime() - shift * 86400000);
    const realTime = new Date(originStart.getTime() + offsetMinutes * 60000);
    // Check days_of_run on the origin start day
    if (daysOfRun !== null) {
      const idx = weekdayIndex(originStart);
      if (daysOfRun[idx] !== '1') continue;
    }
    candidates.push({ originStart, realTime });
  }
  return candidates;
}

/**
 * Convert a UTC Date to a human-readable string like "Thu 12 Nov 15:27".
 * @param {Date} date
 * @returns {string}
 */
export function formatDisplay(date) {
  const dayStr = formatDayDate(date);
  const timeStr = formatTime(date);
  return `${dayStr} ${timeStr}`;
}

/**
 * Format only the time portion as "HH:MM".
 * @param {Date} date
 * @returns {string}
 */
export function formatTime(date) {
  return date.toLocaleString('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format only the weekday-and-date part as "Thu 12 Nov".
 * @param {Date} date
 * @returns {string}
 */
export function formatDayDate(date) {
  return date.toLocaleString('en-GB', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Duration between two dates in minutes.
 * @param {Date} from
 * @param {Date} to
 * @returns {number}
 */
export function durationMinutes(from, to) {
  return Math.round((to.getTime() - from.getTime()) / 60000);
}

/**
 * Format a duration in minutes as "Xh Ym".
 * @param {number} minutes
 * @returns {string}
 */
export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Parse "HH:MM" to minutes since midnight.
 * @param {string} timeStr
 * @returns {number}
 */
export function parseTimeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

