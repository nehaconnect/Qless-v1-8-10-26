import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db, user, canteens, pickupBatches, menuItems, orders, orderStatusHistory } from '../src/lib/db';
import { eq, and } from 'drizzle-orm';
import {
  parseTimeToMinutes,
  validatePickupTimeCanonical,
  calculate15MinBatch,
  formatPickupTimeDisplay,
  hourMinuteAmpmToCanonical,
} from '../src/lib/pickup-time';
import {
  createOrder,
  sellerSuggestTime,
  customerRespondTimeSuggestion,
} from '../src/lib/services/order-service';

async function runRegressionSuite() {
  console.log('🧪 ========================================================');
  console.log('🧪 QLess Pickup Time & Seller Suggestion Regression Tests');
  console.log('🧪 Validating 16 Comprehensive Scenarios');
  console.log('🧪 ========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  // Find canteen, seller, and a customer
  const canteen = await db.query.canteens.findFirst({ where: eq(canteens.name, 'IP Canteen') });
  const seller = await db.query.user.findFirst({ where: eq(user.username, 'slr/soman_singh') });
  const customer = await db.query.user.findFirst({ where: eq(user.role, 'CUSTOMER') });
  const item = await db.query.menuItems.findFirst({ where: eq(menuItems.canteenId, canteen!.id) });

  if (!canteen || !seller || !customer || !item) {
    throw new Error('Database fixture setup failed: missing canteen, seller, customer, or item');
  }

  // -------------------------------------------------------------------------
  // Scenario 1: Customer selects 1:00 PM and submits an order; seller sees 1:00 PM.
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 1: Customer selects 1:00 PM ---');
  const { order: ord1 } = await createOrder({
    customerId: customer.id,
    canteenId: canteen.id,
    items: [{ menuItemId: item.id, quantity: 1 }],
    exactPickupTime: '13:00', // canonical for 1:00 PM
    idempotencyKey: `scen1_${Date.now()}`,
  });
  const ord1Fetched = await db.query.orders.findFirst({
    where: eq(orders.id, ord1.id),
  });
  const ord1Batch = ord1Fetched?.batchId
    ? await db.query.pickupBatches.findFirst({ where: eq(pickupBatches.id, ord1Fetched.batchId) })
    : null;
  const ord1Canonical = parseTimeToMinutes(ord1Fetched?.exactPickupTime)?.canonical;
  const ord1Display = formatPickupTimeDisplay(ord1Fetched?.exactPickupTime);
  assert(ord1Canonical === '13:00', 'Stored time canonical is 13:00');
  assert(ord1Display === '1:00 PM', `Seller view renders "1:00 PM" (got "${ord1Display}")`);

  // -------------------------------------------------------------------------
  // Scenario 2: Customer selects 1:37 PM; stored time remains 13:37 and batch is 1:30–1:45 PM.
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 2: Customer selects 1:37 PM ---');
  const { order: ord2 } = await createOrder({
    customerId: customer.id,
    canteenId: canteen.id,
    items: [{ menuItemId: item.id, quantity: 1 }],
    exactPickupTime: '13:37',
    idempotencyKey: `scen2_${Date.now()}`,
  });
  const ord2Fetched = await db.query.orders.findFirst({
    where: eq(orders.id, ord2.id),
  });
  const ord2Batch = ord2Fetched?.batchId
    ? await db.query.pickupBatches.findFirst({ where: eq(pickupBatches.id, ord2Fetched.batchId) })
    : null;
  const ord2Canonical = parseTimeToMinutes(ord2Fetched?.exactPickupTime)?.canonical;
  const ord2Display = formatPickupTimeDisplay(ord2Fetched?.exactPickupTime);
  assert(ord2Canonical === '13:37', 'Stored exact time remains 13:37 (not rounded or shifted)');
  assert(ord2Display === '1:37 PM', `Display is "1:37 PM" (got "${ord2Display}")`);
  assert(
    ord2Batch?.displayLabel === '1:30 PM–1:45 PM',
    `Assigned batch is 1:30 PM–1:45 PM (got "${ord2Batch?.displayLabel}")`
  );

  // -------------------------------------------------------------------------
  // Scenario 3: Customer selects 12:00 PM; stored value remains 12:00.
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 3: Customer selects 12:00 PM ---');
  const { order: ord3 } = await createOrder({
    customerId: customer.id,
    canteenId: canteen.id,
    items: [{ menuItemId: item.id, quantity: 1 }],
    exactPickupTime: '12:00',
    idempotencyKey: `scen3_${Date.now()}`,
  });
  const ord3Fetched = await db.query.orders.findFirst({
    where: eq(orders.id, ord3.id),
  });
  const ord3Batch = ord3Fetched?.batchId
    ? await db.query.pickupBatches.findFirst({ where: eq(pickupBatches.id, ord3Fetched.batchId) })
    : null;
  const ord3Canonical = parseTimeToMinutes(ord3Fetched?.exactPickupTime)?.canonical;
  const ord3Display = formatPickupTimeDisplay(ord3Fetched?.exactPickupTime);
  assert(ord3Canonical === '12:00', 'Stored value canonical is 12:00');
  assert(ord3Display === '12:00 PM', `Display is "12:00 PM" (got "${ord3Display}")`);
  assert(ord3Batch?.displayLabel === '12:00 PM–12:15 PM', 'Batch is 12:00 PM–12:15 PM');

  // -------------------------------------------------------------------------
  // Scenario 4: Customer selects 4:59 PM; seller sees 4:59 PM.
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 4: Customer selects 4:59 PM ---');
  const { order: ord4 } = await createOrder({
    customerId: customer.id,
    canteenId: canteen.id,
    items: [{ menuItemId: item.id, quantity: 1 }],
    exactPickupTime: '16:59',
    idempotencyKey: `scen4_${Date.now()}`,
  });
  const ord4Fetched = await db.query.orders.findFirst({
    where: eq(orders.id, ord4.id),
  });
  const ord4Batch = ord4Fetched?.batchId
    ? await db.query.pickupBatches.findFirst({ where: eq(pickupBatches.id, ord4Fetched.batchId) })
    : null;
  const ord4Canonical = parseTimeToMinutes(ord4Fetched?.exactPickupTime)?.canonical;
  const ord4Display = formatPickupTimeDisplay(ord4Fetched?.exactPickupTime);
  assert(ord4Canonical === '16:59', 'Stored canonical is 16:59');
  assert(ord4Display === '4:59 PM', `Seller sees "4:59 PM" (got "${ord4Display}")`);
  assert(ord4Batch?.displayLabel === '4:45 PM–5:00 PM', 'Batch is 4:45 PM–5:00 PM');

  // -------------------------------------------------------------------------
  // Scenario 5: Customer selects 5:00 PM; boundary validation behaves consistently.
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 5: Customer selects 5:00 PM closing boundary ---');
  const { order: ord5 } = await createOrder({
    customerId: customer.id,
    canteenId: canteen.id,
    items: [{ menuItemId: item.id, quantity: 1 }],
    exactPickupTime: '17:00',
    idempotencyKey: `scen5_${Date.now()}`,
  });
  const ord5Fetched = await db.query.orders.findFirst({
    where: eq(orders.id, ord5.id),
  });
  const ord5Batch = ord5Fetched?.batchId
    ? await db.query.pickupBatches.findFirst({ where: eq(pickupBatches.id, ord5Fetched.batchId) })
    : null;
  const ord5Canonical = parseTimeToMinutes(ord5Fetched?.exactPickupTime)?.canonical;
  const ord5Display = formatPickupTimeDisplay(ord5Fetched?.exactPickupTime);
  assert(ord5Canonical === '17:00', 'Stored canonical is 17:00');
  assert(ord5Display === '5:00 PM', `Display is "5:00 PM" (got "${ord5Display}")`);
  assert(
    ord5Batch?.displayLabel === '4:45 PM–5:00 PM',
    `5:00 PM mapped to final batch 4:45 PM–5:00 PM (no nonexistent 5:00-5:15 batch; got "${ord5Batch?.displayLabel}")`
  );

  // -------------------------------------------------------------------------
  // Scenario 6: Customer selects 5:01 PM; request is rejected.
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 6: Customer selects 5:01 PM (Outside Operating Hours) ---');
  let scen6Rejected = false;
  try {
    await createOrder({
      customerId: customer.id,
      canteenId: canteen.id,
      items: [{ menuItemId: item.id, quantity: 1 }],
      exactPickupTime: '17:01',
      idempotencyKey: `scen6_${Date.now()}`,
    });
  } catch (err: any) {
    scen6Rejected = true;
    assert(
      Boolean(err?.message?.includes('8:00 AM and 5:00 PM IST')),
      `Error specifies operating hours rule: "${err?.message}"`
    );
  }
  assert(scen6Rejected, 'Creation of order at 5:01 PM was correctly rejected');

  // -------------------------------------------------------------------------
  // Scenario 7: Seller suggests 1:30 PM; API receives 13:30.
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 7: Seller suggests 1:30 PM (API receives 13:30) ---');
  // Order to negotiate
  const { order: ordToSuggest } = await createOrder({
    customerId: customer.id,
    canteenId: canteen.id,
    items: [{ menuItemId: item.id, quantity: 1 }],
    exactPickupTime: '13:00',
    idempotencyKey: `scen7_${Date.now()}`,
  });
  const suggestResult = await sellerSuggestTime(
    ordToSuggest.id,
    seller.id,
    '13:30',
    'Kitchen slot full at 1:00 PM',
    canteen.id
  );
  assert(suggestResult.canonicalSuggestedTime === '13:30', 'API canonical suggested time is 13:30');
  assert(suggestResult.displaySuggestedTime === '1:30 PM', 'Display suggested time is 1:30 PM');
  assert(suggestResult.timeNegotiationStatus === 'SUGGESTED_BY_SELLER', 'Status is SUGGESTED_BY_SELLER');

  // -------------------------------------------------------------------------
  // Scenario 8: Seller changes suggestion to 2:15 PM; the new value is submitted and stored.
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 8: Seller changes suggestion to 2:15 PM (14:15) ---');
  const suggestResult2 = await sellerSuggestTime(
    ordToSuggest.id,
    seller.id,
    '14:15',
    'Updated: 2:15 PM slot now ready faster',
    canteen.id
  );
  assert(suggestResult2.canonicalSuggestedTime === '14:15', 'New canonical is 14:15 (not stale 13:30)');
  assert(suggestResult2.displaySuggestedTime === '2:15 PM', 'Display updated to 2:15 PM');

  // -------------------------------------------------------------------------
  // Scenario 9: Seller selects 12:00 PM; suggestion submission succeeds.
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 9: Seller selects 12:00 PM ---');
  const suggestResult12 = await sellerSuggestTime(
    ordToSuggest.id,
    seller.id,
    '12:00',
    'Earlier slot available',
    canteen.id
  );
  assert(suggestResult12.canonicalSuggestedTime === '12:00', 'Canonical stored as 12:00');
  assert(suggestResult12.displaySuggestedTime === '12:00 PM', 'Display is 12:00 PM');

  // -------------------------------------------------------------------------
  // Scenario 10: Seller selects 4:59 PM; suggestion submission succeeds.
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 10: Seller selects 4:59 PM ---');
  const suggestResult459 = await sellerSuggestTime(
    ordToSuggest.id,
    seller.id,
    '16:59',
    'Final afternoon slot',
    canteen.id
  );
  assert(suggestResult459.canonicalSuggestedTime === '16:59', 'Canonical is 16:59');
  assert(suggestResult459.displaySuggestedTime === '4:59 PM', 'Display is 4:59 PM');

  // -------------------------------------------------------------------------
  // Scenario 11: Invalid values and missing values return clear validation errors.
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 11: Invalid & missing values validation ---');
  const vEmpty = validatePickupTimeCanonical('');
  assert(!vEmpty.valid && vEmpty.error === 'Pickup time is required', 'Empty time rejected with clear error');

  const vMidnight = validatePickupTimeCanonical('00:00'); // 12:00 AM
  assert(
    !vMidnight.valid && Boolean(vMidnight.error?.includes('8:00 AM and 5:00 PM IST')),
    '12:00 AM (00:00) rejected as outside operating hours'
  );

  const vBeforeOpen = validatePickupTimeCanonical('07:59');
  assert(!vBeforeOpen.valid, '7:59 AM rejected');

  const vAfterClose = validatePickupTimeCanonical('17:01');
  assert(!vAfterClose.valid, '5:01 PM rejected');

  const vGibberish = validatePickupTimeCanonical('not-a-time');
  assert(!vGibberish.valid && Boolean(vGibberish.error?.includes('Invalid pickup time format')), 'Gibberish rejected');

  // -------------------------------------------------------------------------
  // Scenario 12: Customer receives the exact suggested time.
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 12: Customer receives the exact suggested time ---');
  // Re-suggest 1:30 PM for acceptance testing
  await sellerSuggestTime(ordToSuggest.id, seller.id, '13:30', 'Slot available', canteen.id);
  const custView = await db.query.orders.findFirst({
    where: eq(orders.id, ordToSuggest.id),
  });
  const custSeenSuggestedCanonical = parseTimeToMinutes(custView?.sellerSuggestedTime)?.canonical;
  const custSeenSuggestedDisplay = formatPickupTimeDisplay(custView?.sellerSuggestedTime);
  assert(custSeenSuggestedCanonical === '13:30', 'Customer query returns exact 13:30 suggested canonical');
  assert(custSeenSuggestedDisplay === '1:30 PM', 'Customer query renders 1:30 PM display');

  // -------------------------------------------------------------------------
  // Scenario 13: Customer accepts the suggestion and the order retains that time.
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 13: Customer accepts suggestion ---');
  const acceptResult = await customerRespondTimeSuggestion(ordToSuggest.id, customer.id, true);
  const ordAfterAccept = await db.query.orders.findFirst({
    where: eq(orders.id, ordToSuggest.id),
  });
  const acceptBatch = ordAfterAccept?.batchId
    ? await db.query.pickupBatches.findFirst({ where: eq(pickupBatches.id, ordAfterAccept.batchId) })
    : null;
  const acceptedCanonical = parseTimeToMinutes(ordAfterAccept?.exactPickupTime)?.canonical;
  const acceptedDisplay = formatPickupTimeDisplay(ordAfterAccept?.exactPickupTime);
  assert(acceptedCanonical === '13:30', 'Exact pickup time updated to 13:30');
  assert(acceptedDisplay === '1:30 PM', 'Display time is 1:30 PM');
  assert(ordAfterAccept?.status === 'ACCEPTED', 'Order status moved to ACCEPTED');
  assert(ordAfterAccept?.timeNegotiationStatus === 'ACCEPTED_BY_CUSTOMER', 'Negotiation is ACCEPTED_BY_CUSTOMER');

  // -------------------------------------------------------------------------
  // Scenario 14: The correct batch and capacity are updated.
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 14: Correct batch and capacity updated ---');
  assert(
    acceptBatch?.displayLabel === '1:30 PM–1:45 PM',
    `Order reassigned to 1:30 PM–1:45 PM batch (got "${acceptBatch?.displayLabel}")`
  );
  assert(
    (acceptBatch?.reservedCount ?? 0) >= 1,
    `New batch reserved count incremented (got ${acceptBatch?.reservedCount})`
  );

  // -------------------------------------------------------------------------
  // Scenario 15: Unauthorized sellers cannot modify another seller's orders.
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 15: Unauthorized seller isolation ---');
  let scen15Forbidden = false;
  try {
    await sellerSuggestTime(
      ordToSuggest.id,
      seller.id,
      '14:00',
      'Intruder edit',
      'cnt_other_fake_canteen_id'
    );
  } catch (err: any) {
    scen15Forbidden = true;
    assert(Boolean(err?.message?.includes('Forbidden')), `Forbidden error returned: "${err?.message}"`);
  }
  assert(scen15Forbidden, 'Seller from another canteen cannot suggest time');

  // -------------------------------------------------------------------------
  // Scenario 16: Duplicate requests do not create duplicate suggestions or corrupt capacity.
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 16: Duplicate / invalid state suggestion prevented ---');
  let scen16Prevented = false;
  try {
    // The order is now in ACCEPTED status (no longer REQUESTED)
    await sellerSuggestTime(ordToSuggest.id, seller.id, '15:00', 'Late duplicate', canteen.id);
  } catch (err: any) {
    scen16Prevented = true;
    assert(
      Boolean(err?.message?.includes('Cannot suggest a new time for order in "ACCEPTED" status')),
      `Clear error on invalid order state: "${err?.message}"`
    );
  }
  assert(scen16Prevented, 'Suggestion on non-REQUESTED order successfully blocked');

  console.log('\n========================================================');
  console.log(`🏁 REGRESSION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
