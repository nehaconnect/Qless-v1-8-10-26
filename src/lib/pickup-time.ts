/**
 * QLess Canonical Pickup Time & Batch Calculation Library
 *
 * Single authoritative source of truth for:
 * 1. Canonical time representation: 'HH:mm' (24-hour zero-padded, Asia/Kolkata).
 * 2. Canteen Operating Hours: 8:00 AM ('08:00', 480 mins) to 5:00 PM ('17:00', 1020 mins) inclusive.
 * 3. 15-Minute Continuous Batch Windows.
 * 4. Display formatting: 'h:mm A' (e.g. '1:00 PM', '8:00 AM').
 * 5. Lossless Date <-> Canonical conversions in Asia/Kolkata timezone.
 */

export const CANONICAL_HOURS = {
  OPENING_MINUTES: 8 * 60,   // 480 (8:00 AM)
  CLOSING_MINUTES: 17 * 60,  // 1020 (5:00 PM)
  OPENING_TIME: '08:00',
  CLOSING_TIME: '17:00',
  TIMEZONE: 'Asia/Kolkata',
  TIMEZONE_OFFSET: '+05:30',
};

const pad2 = (n: number) => n.toString().padStart(2, '0');

/**
 * Extracts India Standard Time (Asia/Kolkata, UTC+05:30) date parts reliably
 */
export function getISTDateParts(d: Date): {
  year: string;
  month: string;
  day: string;
  hours: number;
  minutes: number;
  seconds: number;
  dateStr: string;
} {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: CANONICAL_HOURS.TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  let year = '', month = '', day = '', hours = 0, minutes = 0, seconds = 0;

  for (const p of parts) {
    if (p.type === 'year') year = p.value;
    else if (p.type === 'month') month = p.value;
    else if (p.type === 'day') day = p.value;
    else if (p.type === 'hour') hours = parseInt(p.value, 10);
    else if (p.type === 'minute') minutes = parseInt(p.value, 10);
    else if (p.type === 'second') seconds = parseInt(p.value, 10);
  }

  // Handle midnight 24h edge cases in some formatters
  if (hours === 24) hours = 0;

  return {
    year,
    month,
    day,
    hours,
    minutes,
    seconds,
    dateStr: `${year}-${month}-${day}`,
  };
}

/**
 * Returns today's date string in Asia/Kolkata: 'YYYY-MM-DD'
 */
export function getISTTodayString(now: Date = new Date()): string {
  return getISTDateParts(now).dateStr;
}

/**
 * Converts Hour (1-12), Minute (0-59), and AM/PM into canonical 'HH:mm'
 */
export function hourMinuteAmpmToCanonical(
  hour12: number,
  minute: number,
  ampm: 'AM' | 'PM' | string
): string {
  let h = hour12;
  const isPM = ampm.toUpperCase().trim() === 'PM';
  const isAM = ampm.toUpperCase().trim() === 'AM';

  if (isPM) {
    if (h < 12) h += 12;
  } else if (isAM) {
    if (h === 12) h = 0;
  }

  const safeH = Math.max(0, Math.min(23, h));
  const safeM = Math.max(0, Math.min(59, minute));
  return `${pad2(safeH)}:${pad2(safeM)}`;
}

/**
 * Parses any incoming pickup time (canonical 'HH:mm', 12h 'h:mm AM/PM', ISO string, or Date)
 * into its exact hours, minutes, total minutes since midnight, and canonical 'HH:mm' representation.
 */
export function parseTimeToMinutes(input: string | Date | null | undefined): {
  hours: number;
  minutes: number;
  totalMinutes: number;
  canonical: string;
} | null {
  if (input === null || input === undefined) return null;

  // Case 1: Date object
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    const { hours, minutes } = getISTDateParts(input);
    return {
      hours,
      minutes,
      totalMinutes: hours * 60 + minutes,
      canonical: `${pad2(hours)}:${pad2(minutes)}`,
    };
  }

  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Case 2: 12-hour format e.g. "1:00 PM", "12:30 AM", "01:15pm"
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])$/i);
  if (match12) {
    const rawH = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const ampm = match12[3].toUpperCase();
    if (rawH < 1 || rawH > 12 || m < 0 || m > 59) return null;
    const canonical = hourMinuteAmpmToCanonical(rawH, m, ampm as 'AM' | 'PM');
    const [ch, cm] = canonical.split(':').map(n => parseInt(n, 10));
    return {
      hours: ch,
      minutes: cm,
      totalMinutes: ch * 60 + cm,
      canonical,
    };
  }

  // Case 3: Canonical 24-hour time "HH:mm" or "HH:mm:ss" e.g. "13:00", "08:15", "8:00"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    const canonical = `${pad2(h)}:${pad2(m)}`;
    return {
      hours: h,
      minutes: m,
      totalMinutes: h * 60 + m,
      canonical,
    };
  }

  // Case 4: ISO-8601 string or Date parseable timestamp
  if (trimmed.includes('T') || trimmed.includes('-') || trimmed.includes('/')) {
    const parsedDate = new Date(trimmed);
    if (!isNaN(parsedDate.getTime())) {
      const { hours, minutes } = getISTDateParts(parsedDate);
      return {
        hours,
        minutes,
        totalMinutes: hours * 60 + minutes,
        canonical: `${pad2(hours)}:${pad2(minutes)}`,
      };
    }
  }

  return null;
}

/**
 * Converts any valid input to canonical 'HH:mm'. Throws if invalid.
 */
export function toCanonicalPickupTime(input: string | Date): string {
  const parsed = parseTimeToMinutes(input);
  if (!parsed) {
    throw new Error(`Invalid pickup time format: "${input}". Expected HH:mm or h:mm A.`);
  }
  return parsed.canonical;
}

/**
 * Validates pickup time against canonical canteen hours (8:00 AM to 5:00 PM IST inclusive).
 */
export function validatePickupTimeCanonical(input: string | Date | null | undefined): {
  valid: boolean;
  canonical?: string;
  error?: string;
  totalMinutes?: number;
  displayTime?: string;
} {
  if (!input) {
    return { valid: false, error: 'Pickup time is required' };
  }

  const parsed = parseTimeToMinutes(input);
  if (!parsed) {
    return {
      valid: false,
      error: 'Invalid pickup time format. Expected canonical HH:mm (e.g. 13:00) or h:mm A (e.g. 1:00 PM).',
    };
  }

  const { hours, minutes, totalMinutes, canonical } = parsed;
  const displayTime = formatCanonicalTo12Hour(canonical);

  // 8:00 AM (480) to 5:00 PM (1020), inclusive
  if (totalMinutes < CANONICAL_HOURS.OPENING_MINUTES || totalMinutes > CANONICAL_HOURS.CLOSING_MINUTES) {
    return {
      valid: false,
      canonical,
      totalMinutes,
      displayTime,
      error: `Requested pickup time (${displayTime}) must be between 8:00 AM and 5:00 PM IST.`,
    };
  }

  return {
    valid: true,
    canonical,
    totalMinutes,
    displayTime,
  };
}

/**
 * Formats canonical 'HH:mm' into standard user-facing 'h:mm AM/PM'
 * e.g. '08:00' -> '8:00 AM', '13:00' -> '1:00 PM', '12:00' -> '12:00 PM'
 */
export function formatCanonicalTo12Hour(canonical: string): string {
  if (!canonical || !canonical.includes(':')) return '--:--';
  const [hStr, mStr] = canonical.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return '--:--';

  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${pad2(m)} ${ampm}`;
}

/**
 * Universal display formatter for any pickup time representation
 */
export function formatPickupTimeDisplay(input: string | Date | null | undefined): string {
  const parsed = parseTimeToMinutes(input);
  if (!parsed) return '--:--';
  return formatCanonicalTo12Hour(parsed.canonical);
}

/**
 * Compares two pickup times chronologically by time of day
 */
export function comparePickupTimes(a: string | Date, b: string | Date): number {
  const pA = parseTimeToMinutes(a);
  const pB = parseTimeToMinutes(b);
  if (!pA && !pB) return 0;
  if (!pA) return -1;
  if (!pB) return 1;
  return pA.totalMinutes - pB.totalMinutes;
}

/**
 * Calculates continuous 15-minute batch window from canonical pickup time.
 * Handles the 5:00 PM closing boundary policy (maps 17:00 to 4:45 PM–5:00 PM).
 */
export function calculate15MinBatch(input: string | Date): {
  startTime: string;       // 'HH:mm:ss'
  endTime: string;         // 'HH:mm:ss'
  displayLabel: string;    // 'h:mm AM/PM–h:mm AM/PM'
  canonicalStart: string;  // 'HH:mm'
  canonicalEnd: string;    // 'HH:mm'
} {
  const parsed = parseTimeToMinutes(input);
  if (!parsed) {
    throw new Error('Cannot calculate batch: invalid pickup time');
  }

  const { hours, minutes } = parsed;

  let batchStartMin = Math.floor(minutes / 15) * 15;
  let batchEndMin = batchStartMin === 45 ? 0 : batchStartMin + 15;
  let batchEndHour = batchStartMin === 45 ? hours + 1 : hours;
  let effectiveHours = hours;

  // Closing boundary rule: 5:00 PM (17:00) belongs to the final 4:45 PM–5:00 PM batch.
  // It must never create a nonexistent 5:00 PM–5:15 PM batch.
  if (hours === 17 && minutes === 0) {
    effectiveHours = 16;
    batchStartMin = 45;
    batchEndHour = 17;
    batchEndMin = 0;
  }

  const startTime = `${pad2(effectiveHours)}:${pad2(batchStartMin)}:00`;
  const endTime = `${pad2(batchEndHour)}:${pad2(batchEndMin)}:00`;
  const canonicalStart = `${pad2(effectiveHours)}:${pad2(batchStartMin)}`;
  const canonicalEnd = `${pad2(batchEndHour)}:${pad2(batchEndMin)}`;

  const labelStart = formatCanonicalTo12Hour(canonicalStart);
  const labelEnd = formatCanonicalTo12Hour(canonicalEnd);
  const displayLabel = `${labelStart}–${labelEnd}`;

  return {
    startTime,
    endTime,
    displayLabel,
    canonicalStart,
    canonicalEnd,
  };
}

/**
 * Converts a canonical 'HH:mm' string and optional date into a JavaScript Date
 * specifically localized to Asia/Kolkata (+05:30) with zero timezone distortion.
 */
export function canonicalTimeToISTDate(canonicalTime: string, dateStr?: string): Date {
  const parsed = parseTimeToMinutes(canonicalTime);
  if (!parsed) {
    throw new Error(`Invalid canonical time: "${canonicalTime}"`);
  }

  const effectiveDate = dateStr || getISTTodayString();
  const isoWithISTOffset = `${effectiveDate}T${parsed.canonical}:00+05:30`;
  const d = new Date(isoWithISTOffset);
  if (isNaN(d.getTime())) {
    throw new Error(`Failed to construct IST date from "${isoWithISTOffset}"`);
  }
  return d;
}
