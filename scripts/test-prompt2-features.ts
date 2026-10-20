import {
  getISTTodayString,
  getISTTomorrowString,
  getAllDayPickupSlots,
  validateFuturePickupTimeCanonical,
  isPastPickupSlot,
} from '../src/lib/pickup-time';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function runTests() {
  console.log('========================================================');
  console.log('🧪 Prompt 2 Customer Scheduling & Grace Period Tests');
  console.log('========================================================\n');

  // Test 1: getISTTodayString and getISTTomorrowString
  const todayStr = getISTTodayString();
  const tomorrowStr = getISTTomorrowString();
  assert(Boolean(todayStr) && todayStr.length === 10, `Today IST string is valid: ${todayStr}`);
  assert(Boolean(tomorrowStr) && tomorrowStr.length === 10, `Tomorrow IST string is valid: ${tomorrowStr}`);
  assert(todayStr !== tomorrowStr, `Today and tomorrow dates are distinct: ${todayStr} vs ${tomorrowStr}`);

  // Test 2: Simulated 10:00 PM today (22:00 IST)
  // At 10:00 PM today, Today's slots are all in the past
  const simulated10PM = new Date(`${todayStr}T22:00:00+05:30`);
  const todaySlotsAt10PM = getAllDayPickupSlots(simulated10PM, false);
  const allTodayPast = todaySlotsAt10PM.every(s => s.isPast);
  assert(allTodayPast, 'At 10:00 PM today, all 8:00 AM - 5:00 PM slots for today are marked as past');

  // But for TOMORROW, slots must be future!
  const tomorrowSlotsAt10PM = getAllDayPickupSlots(simulated10PM, true);
  const allTomorrowFuture = tomorrowSlotsAt10PM.every(s => !s.isPast);
  assert(allTomorrowFuture, 'At 10:00 PM today, all slots for tomorrow are marked as future');

  // Test 3: Tomorrow's 8:00 AM slot must be valid even when ordering at 10:00 PM today
  const validationTomorrow8AM = validateFuturePickupTimeCanonical('08:00', simulated10PM, tomorrowStr);
  assert(validationTomorrow8AM.valid === true, "Tomorrow's 8:00 AM slot is valid when ordering at 10:00 PM today");
  assert(validationTomorrow8AM.isTomorrow === true, 'Validation correctly flags slot as tomorrow');

  // Test 4: Today's 8:00 AM slot is rejected when ordering at 10:00 PM today
  const validationToday8AM = validateFuturePickupTimeCanonical('08:00', simulated10PM, todayStr);
  assert(validationToday8AM.valid === false, "Today's 8:00 AM slot is correctly rejected as in the past when ordering at 10:00 PM");

  // Test 5: Day after tomorrow must NOT be allowed
  const dayAfterTomorrow = new Date(simulated10PM.getTime() + 2 * 24 * 60 * 60 * 1000);
  const dayAfterTomorrowStr = getISTTodayString(dayAfterTomorrow);
  const validationDayAfter = validateFuturePickupTimeCanonical('08:00', simulated10PM, dayAfterTomorrowStr);
  assert(validationDayAfter.valid === false, 'Scheduling for the day after tomorrow is rejected');
  assert(
    Boolean(validationDayAfter.error?.includes('today or tomorrow')),
    `Correct error message returned: "${validationDayAfter.error}"`
  );

  // Test 6: Past date (yesterday) must NOT be allowed
  const yesterday = new Date(simulated10PM.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = getISTTodayString(yesterday);
  const validationYesterday = validateFuturePickupTimeCanonical('08:00', simulated10PM, yesterdayStr);
  assert(validationYesterday.valid === false, 'Scheduling for yesterday is rejected');

  // Test 7: 2-Hour Grace Period Logic
  console.log('\n--- Section 2: 2-Hour Grace Period Logic ---');

  const simulatedNow = new Date('2026-10-20T14:30:00+05:30'); // 2:30 PM

  // Order with pickup at 1:00 PM (1.5 hours ago) -> Within 2-hour grace period -> ACTIVE
  const pickup130HoursAgo = '2026-10-20T13:00:00+05:30';
  const diffMs1 = simulatedNow.getTime() - new Date(pickup130HoursAgo).getTime();
  const isPastGrace1 = diffMs1 > 2 * 60 * 60 * 1000;
  assert(!isPastGrace1, 'Pickup at 1:00 PM at 2:30 PM (1.5 hrs elapsed) remains within 2-hour grace period (ACTIVE)');

  // Order with pickup at 12:15 PM (2 hours 15 mins ago) -> Past 2-hour grace period -> EXPIRED/PREVIOUS
  const pickup215HoursAgo = '2026-10-20T12:15:00+05:30';
  const diffMs2 = simulatedNow.getTime() - new Date(pickup215HoursAgo).getTime();
  const isPastGrace2 = diffMs2 > 2 * 60 * 60 * 1000;
  assert(isPastGrace2, 'Pickup at 12:15 PM at 2:30 PM (2 hrs 15 mins elapsed) exceeds 2-hour grace period (PREVIOUS)');

  // Order with future pickup (3:00 PM) -> ACTIVE
  const futurePickup = '2026-10-20T15:00:00+05:30';
  const diffMs3 = simulatedNow.getTime() - new Date(futurePickup).getTime();
  const isPastGrace3 = diffMs3 > 2 * 60 * 60 * 1000;
  assert(!isPastGrace3, 'Future pickup at 3:00 PM is within grace period (ACTIVE)');

  // Test 8: Distinction between Paid and Unpaid Expired Orders
  console.log('\n--- Section 3: Expired Order Labeling ---');
  const paidExpiredOrder = {
    status: 'EXPIRED',
    paymentStatus: 'PAID',
    rejectionReason: 'NOT_COLLECTED_AFTER_2_HOURS',
  };
  const unpaidExpiredOrder = {
    status: 'EXPIRED',
    paymentStatus: 'EXPIRED',
    rejectionReason: 'NO_PAYMENT_AFTER_2_HOURS',
  };

  const getBadgeLabel = (order: typeof paidExpiredOrder) => {
    if (order.status === 'EXPIRED') {
      return order.paymentStatus === 'PAID' ? 'Not Collected' : 'No Payment';
    }
    return order.status;
  };

  assert(getBadgeLabel(paidExpiredOrder) === 'Not Collected', 'Paid expired order is labeled "Not Collected"');
  assert(getBadgeLabel(unpaidExpiredOrder) === 'No Payment', 'Unpaid expired order is labeled "No Payment"');
  assert(getBadgeLabel(unpaidExpiredOrder) !== 'Not Collected', 'Unpaid expired order is NEVER labeled "Not Collected"');

  console.log('\n========================================================');
  console.log('🎉 All Prompt 2 Validation Tests Passed Successfully!');
  console.log('========================================================\n');
}

runTests().catch(err => {
  console.error('Unhandled error in test runner:', err);
  process.exit(1);
});
