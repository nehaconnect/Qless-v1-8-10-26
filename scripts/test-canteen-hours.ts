import 'dotenv/config';
import assert from 'assert';
import {
  validatePickupTime,
  getEffectiveCanteenStatus,
  getISTDateParts,
  format12HourTime,
  getBatchWindow,
} from '../src/lib/services/order-service';

function createISTDate(hours: number, minutes: number, year = 2026, month = 10, day = 9): Date {
  // IST is UTC+05:30, so UTC time is (hours - 5) hours and (minutes - 30) minutes
  const utcHours = hours - 5;
  const utcMinutes = minutes - 30;
  return new Date(Date.UTC(year, month - 1, day, utcHours, utcMinutes, 0, 0));
}

async function runCanteenHoursTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 QLess Canteen Hours, Batching & Status Validation Suite');
  console.log('🧪 ========================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // --- Section 1: Pickup Time Validation Edge Cases ---
  console.log('--- Section 1: Pickup Time Validation (8:00 AM to 5:00 PM IST) ---');

  test('Reject 7:59 AM (1 minute before opening)', () => {
    const d = createISTDate(7, 59);
    const res = validatePickupTime(d);
    assert.strictEqual(res.valid, false);
  });

  test('Accept 8:00 AM (Opening boundary)', () => {
    const d = createISTDate(8, 0);
    const res = validatePickupTime(d);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.istTimeFormatted, '8:00 AM');
  });

  test('Accept 9:00 AM', () => {
    const d = createISTDate(9, 0);
    const res = validatePickupTime(d);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.istTimeFormatted, '9:00 AM');
  });

  test('Accept 11:59 AM', () => {
    const d = createISTDate(11, 59);
    const res = validatePickupTime(d);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.istTimeFormatted, '11:59 AM');
  });

  test('Accept 12:00 PM (Noon)', () => {
    const d = createISTDate(12, 0);
    const res = validatePickupTime(d);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.istTimeFormatted, '12:00 PM');
  });

  test('Accept 12:01 PM', () => {
    const d = createISTDate(12, 1);
    const res = validatePickupTime(d);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.istTimeFormatted, '12:01 PM');
  });

  test('Accept 1:00 PM (13:00)', () => {
    const d = createISTDate(13, 0);
    const res = validatePickupTime(d);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.istTimeFormatted, '1:00 PM');
  });

  test('Accept 1:37 PM (13:37)', () => {
    const d = createISTDate(13, 37);
    const res = validatePickupTime(d);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.istTimeFormatted, '1:37 PM');
  });

  test('Accept 4:59 PM (16:59)', () => {
    const d = createISTDate(16, 45 + 14);
    const res = validatePickupTime(d);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.istTimeFormatted, '4:59 PM');
  });

  test('Accept 5:00 PM (17:00 closing boundary)', () => {
    const d = createISTDate(17, 0);
    const res = validatePickupTime(d);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.istTimeFormatted, '5:00 PM');
  });

  test('Reject 5:01 PM (1 minute after closing boundary)', () => {
    const d = createISTDate(17, 1);
    const res = validatePickupTime(d);
    assert.strictEqual(res.valid, false);
  });

  test('Reject 6:00 PM (Evening)', () => {
    const d = createISTDate(18, 0);
    const res = validatePickupTime(d);
    assert.strictEqual(res.valid, false);
  });

  test('Reject 8:00 PM (Night)', () => {
    const d = createISTDate(20, 0);
    const res = validatePickupTime(d);
    assert.strictEqual(res.valid, false);
  });

  test('Reject 12:00 AM (Midnight)', () => {
    const d = createISTDate(0, 0);
    const res = validatePickupTime(d);
    assert.strictEqual(res.valid, false);
  });

  // --- Section 2: 15-Minute Batch Calculations & Time Formatting ---
  console.log('\n--- Section 2: 15-Minute Continuous Batch Mapping ---');

  test('8:00 AM maps to batch 8:00 AM–8:15 AM', () => {
    const d = createISTDate(8, 0);
    const b = getBatchWindow(d);
    assert.strictEqual(b.displayLabel, '8:00 AM–8:15 AM');
    assert.strictEqual(b.startTime, '08:00:00');
    assert.strictEqual(b.endTime, '08:15:00');
  });

  test('8:15 AM maps to batch 8:15 AM–8:30 AM', () => {
    const d = createISTDate(8, 15);
    const b = getBatchWindow(d);
    assert.strictEqual(b.displayLabel, '8:15 AM–8:30 AM');
    assert.strictEqual(b.startTime, '08:15:00');
    assert.strictEqual(b.endTime, '08:30:00');
  });

  test('12:00 PM maps to batch 12:00 PM–12:15 PM', () => {
    const d = createISTDate(12, 0);
    const b = getBatchWindow(d);
    assert.strictEqual(b.displayLabel, '12:00 PM–12:15 PM');
    assert.strictEqual(b.startTime, '12:00:00');
    assert.strictEqual(b.endTime, '12:15:00');
  });

  test('12:45 PM maps to batch 12:45 PM–1:00 PM', () => {
    const d = createISTDate(12, 45);
    const b = getBatchWindow(d);
    assert.strictEqual(b.displayLabel, '12:45 PM–1:00 PM');
    assert.strictEqual(b.startTime, '12:45:00');
    assert.strictEqual(b.endTime, '13:00:00');
  });

  test('1:37 PM (13:37) maps to batch 1:30 PM–1:45 PM with exact time preserved', () => {
    const d = createISTDate(13, 37);
    const b = getBatchWindow(d);
    assert.strictEqual(b.displayLabel, '1:30 PM–1:45 PM');
    assert.strictEqual(b.startTime, '13:30:00');
    assert.strictEqual(b.endTime, '13:45:00');
    const parts = getISTDateParts(d);
    const exactFormatted = format12HourTime(parts.hours, parts.minutes);
    assert.strictEqual(exactFormatted, '1:37 PM');
  });

  test('5:00 PM boundary maps to final batch 4:45 PM–5:00 PM', () => {
    const d = createISTDate(17, 0);
    const b = getBatchWindow(d);
    assert.strictEqual(b.displayLabel, '4:45 PM–5:00 PM');
    assert.strictEqual(b.startTime, '16:45:00');
    assert.strictEqual(b.endTime, '17:00:00');
  });

  // --- Section 3: Effective Canteen Status & Operating Hours ---
  console.log('\n--- Section 3: Effective Canteen Status Rules ---');

  const baseCanteen = {
    operatingStatus: 'OPEN',
    isActive: true,
  };

  test('Before 8:00 AM (e.g. 7:30 AM): CLOSED by default', () => {
    const now = createISTDate(7, 30);
    const status = getEffectiveCanteenStatus(baseCanteen, now);
    assert.strictEqual(status.effectiveStatus, 'CLOSED');
    assert.strictEqual(status.isOperatingHours, false);
    assert.strictEqual(status.isManualOverride, false);
  });

  test('Before 8:00 AM (e.g. 7:30 AM): Seller explicitly opened manually -> OPEN', () => {
    const now = createISTDate(7, 30);
    const parts = getISTDateParts(now);
    const earlyOpenCanteen = {
      ...baseCanteen,
      manualOverrideStatus: 'OPEN',
      manualOverrideDate: parts.dateStr,
    };
    const status = getEffectiveCanteenStatus(earlyOpenCanteen, now);
    assert.strictEqual(status.effectiveStatus, 'OPEN');
    assert.strictEqual(status.isManualOverride, true);
  });

  test('At 8:00 AM sharp: Automatically becomes OPEN without manual intervention', () => {
    const now = createISTDate(8, 0);
    const status = getEffectiveCanteenStatus(baseCanteen, now);
    assert.strictEqual(status.effectiveStatus, 'OPEN');
    assert.strictEqual(status.isOperatingHours, true);
    assert.strictEqual(status.isManualOverride, false);
  });

  test('At 12:00 PM (Noon): Automatically OPEN during operating hours', () => {
    const now = createISTDate(12, 0);
    const status = getEffectiveCanteenStatus(baseCanteen, now);
    assert.strictEqual(status.effectiveStatus, 'OPEN');
    assert.strictEqual(status.isOperatingHours, true);
  });

  test('During operating hours (2:00 PM): Seller manually marked TOO_BUSY -> TOO_BUSY', () => {
    const now = createISTDate(14, 0);
    const parts = getISTDateParts(now);
    const busyCanteen = {
      ...baseCanteen,
      manualOverrideStatus: 'TOO_BUSY',
      manualOverrideDate: parts.dateStr,
    };
    const status = getEffectiveCanteenStatus(busyCanteen, now);
    assert.strictEqual(status.effectiveStatus, 'TOO_BUSY');
    assert.strictEqual(status.isManualOverride, true);
  });

  test('During operating hours (2:00 PM): Seller manually marked CLOSED -> CLOSED', () => {
    const now = createISTDate(14, 0);
    const parts = getISTDateParts(now);
    const closedCanteen = {
      ...baseCanteen,
      manualOverrideStatus: 'CLOSED',
      manualOverrideDate: parts.dateStr,
    };
    const status = getEffectiveCanteenStatus(closedCanteen, now);
    assert.strictEqual(status.effectiveStatus, 'CLOSED');
    assert.strictEqual(status.isManualOverride, true);
  });

  test('At 5:00 PM sharp: Operating period ends, automatically CLOSED for new orders', () => {
    const now = createISTDate(17, 0);
    const status = getEffectiveCanteenStatus(baseCanteen, now);
    assert.strictEqual(status.effectiveStatus, 'CLOSED');
    assert.strictEqual(status.isOperatingHours, false);
  });

  test('After 5:00 PM (e.g. 5:30 PM): Hard closed, seller manual OPEN CANNOT override 5:00 PM closing', () => {
    const now = createISTDate(17, 30);
    const parts = getISTDateParts(now);
    const overrideAfterHours = {
      ...baseCanteen,
      manualOverrideStatus: 'OPEN',
      manualOverrideDate: parts.dateStr,
    };
    const status = getEffectiveCanteenStatus(overrideAfterHours, now);
    assert.strictEqual(status.effectiveStatus, 'CLOSED');
    assert.strictEqual(status.isOperatingHours, false);
  });

  console.log('\n========================================================');
  console.log(`📊 Total Tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runCanteenHoursTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
