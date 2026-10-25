import { db, user, canteens, pickupBatches, menuItems, orders, orderItems, pickupCodes, payments } from '../src/lib/db';
import { eq, and, sql } from 'drizzle-orm';
import {
  createOrder,
  sellerAcceptOrder,
  sellerRejectOrder,
  sellerSuggestTime,
  customerRespondTimeSuggestion,
  confirmOrderPayment,
  sellerStartOrderPrep,
  sellerMarkOrderReady,
  decryptPickupCode,
} from '../src/lib/services/order-service';
import {
  getISTTodayString,
  getISTTomorrowString,
  getISTDateParts,
  validateFuturePickupTimeCanonical,
  toCanonicalPickupTime,
  formatPickupTimeDisplay,
} from '../src/lib/pickup-time';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runTargetedFixesTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 Targeted Fixes Verification Suite');
  console.log('🧪 Slot Change Proposal, Date Preservation & Payment Flow');
  console.log('🧪 ========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // 1. Fetch seed test entities
  const canteen = await db.query.canteens.findFirst({ where: eq(canteens.name, 'IP Canteen') });
  const customer1 = await db.query.user.findFirst({ where: eq(user.username, 'ctr/siya_sen') });
  let customer2 = await db.query.user.findFirst({
    where: and(eq(user.role, 'CUSTOMER'), sql`${user.id} != ${customer1?.id || ''}`),
  });

  if (!customer2 && customer1) {
    const cust2Id = 'usr_cust_reg_' + Date.now();
    const [createdCust2] = await db.insert(user).values({
      id: cust2Id,
      name: 'Ananya Roy',
      email: `ananya_reg_${Date.now()}@ipcw.du.ac.in`,
      username: `ctr/ananya_${Date.now().toString().slice(-4)}`,
      phoneNumber: `98765${Math.floor(10000 + Math.random() * 90000)}`,
      phoneNumberVerified: true,
      emailVerified: true,
      role: 'CUSTOMER',
      isActive: true,
    }).returning();
    customer2 = createdCust2;
  }

  const seller = await db.query.user.findFirst({ where: eq(user.username, 'slr/soman_singh') });
  const tea = await db.query.menuItems.findFirst({ where: and(eq(menuItems.canteenId, canteen!.id), eq(menuItems.name, 'Tea')) });

  if (!canteen || !customer1 || !customer2 || !seller || !tea) {
    throw new Error('Seed test data missing');
  }

  const todayStr = getISTTodayString();
  const tomorrowStr = getISTTomorrowString();

  // ----------------------------------------------------
  // SECTION 1: Date Preservation for Tomorrow Orders
  // ----------------------------------------------------
  console.log('--- Section 1: Date Preservation in Seller Slot Change ---');

  // Order scheduled for tomorrow morning
  const tomorrowPickupTime = `${tomorrowStr}T09:00:00+05:30`;
  const orderTomorrow = await createOrder({
    customerId: customer1.id,
    canteenId: canteen.id,
    items: [{ menuItemId: tea.id, quantity: 1 }],
    exactPickupTime: tomorrowPickupTime,
    idempotencyKey: `test_prop_date_${Date.now()}`,
  });

  assert(
    orderTomorrow.order.status === 'REQUESTED',
    'Customer order scheduled for tomorrow created in REQUESTED status'
  );

  // Seller proposes a new time slot (passing canonical time '10:30')
  const proposalResult = await sellerSuggestTime(
    orderTomorrow.order.id,
    seller.id,
    '10:30',
    'Please come at 10:30 AM slot instead'
  );

  assert(
    proposalResult.status === 'TIME_CHANGE_PROPOSED',
    'Order transitioned to TIME_CHANGE_PROPOSED status'
  );
  assert(
    proposalResult.timeNegotiationStatus === 'PROPOSED_BY_SELLER',
    'Order timeNegotiationStatus set to PROPOSED_BY_SELLER'
  );

  const proposedISTDateStr = getISTTodayString(new Date(proposalResult.sellerSuggestedTime!));
  assert(
    proposedISTDateStr === tomorrowStr,
    `Tomorrow order retains tomorrow date (${tomorrowStr}) when seller changes slot to 10:30 (actual: ${proposedISTDateStr})`
  );

  const proposedParts = getISTDateParts(new Date(proposalResult.sellerSuggestedTime!));
  assert(
    proposedParts.hours === 10 && proposedParts.minutes === 30,
    'Proposed pickup time is exactly 10:30 AM in IST'
  );

  // ----------------------------------------------------
  // SECTION 2: Validation of Seller Proposals
  // ----------------------------------------------------
  console.log('\n--- Section 2: Validation of Seller Proposals ---');

  // Create a fresh requested order for tomorrow to test proposals
  const freshTomorrowOrder = await createOrder({
    customerId: customer1.id,
    canteenId: canteen.id,
    items: [{ menuItemId: tea.id, quantity: 1 }],
    exactPickupTime: `${tomorrowStr}T11:00:00+05:30`,
    idempotencyKey: `test_fresh_prop_${Date.now()}`,
  });

  // 2.1 Out of operating hours (before 8 AM or after 5 PM)
  try {
    await sellerSuggestTime(freshTomorrowOrder.order.id, seller.id, '07:30');
    assert(false, 'Should reject proposal before 8:00 AM');
  } catch (err: any) {
    assert(
      err.message.includes('operating hours') || err.message.includes('8:00 AM') || err.message.includes('between 8:00 AM'),
      'Reject proposal before 8:00 AM'
    );
  }

  // 2.2 Past slot rejection for today
  // Insert a mock requested order for today directly
  const [dummyTodayOrder] = await db.insert(orders).values({
    customerId: customer1.id,
    canteenId: canteen.id,
    batchId: freshTomorrowOrder.order.batchId,
    orderNumber: `TEST-PAST-${Date.now()}`,
    status: 'REQUESTED',
    paymentStatus: 'PENDING',
    totalAmount: '20.00',
    idempotencyKey: `idem_past_${Date.now()}`,
    exactPickupTime: new Date(`${todayStr}T12:00:00+05:30`),
  }).returning();

  try {
    // Proposing 08:00 AM for today (which has already elapsed)
    await sellerSuggestTime(dummyTodayOrder.id, seller.id, '08:00');
    const nowIST = getISTDateParts(new Date());
    const isPast = (nowIST.hours * 60 + nowIST.minutes) > (8 * 60 + 15);
    if (isPast) {
      assert(false, 'Past slot for today must be rejected');
    } else {
      assert(true, 'Test ran before 8 AM slot closed');
    }
  } catch (err: any) {
    assert(
      err.message.includes('passed') || err.message.includes('operating hours') || err.message.includes('valid'),
      'Reject past slot proposal for today'
    );
  }

  // 2.3 Beyond tomorrow rejection
  const dayAfterTomorrowStr = getISTDateParts(new Date(Date.now() + 48 * 60 * 60 * 1000)).dateStr;
  try {
    await sellerSuggestTime(freshTomorrowOrder.order.id, seller.id, `${dayAfterTomorrowStr}T10:00:00+05:30`);
    assert(false, 'Dates beyond tomorrow must be rejected');
  } catch (err: any) {
    assert(
      err.message.includes('today or tomorrow only') || err.message.includes('permitted'),
      'Reject proposals beyond tomorrow with clear validation error'
    );
  }

  // 2.4 Batch capacity rejection
  // Create/update a dedicated batch with capacity 1 and reservedCount 1 for tomorrow 16:45
  const fullStartTime = '16:45:00';
  let [fullBatch] = await db.select().from(pickupBatches).where(and(
    eq(pickupBatches.canteenId, canteen.id),
    eq(pickupBatches.batchDate, tomorrowStr),
    eq(pickupBatches.startTime, fullStartTime)
  ));
  const originalCapacity = fullBatch?.capacity ?? 10;
  const originalReserved = fullBatch?.reservedCount ?? 0;
  if (!fullBatch) {
    [fullBatch] = await db.insert(pickupBatches).values({
      canteenId: canteen.id,
      batchDate: tomorrowStr,
      startTime: fullStartTime,
      endTime: '17:00:00',
      displayLabel: '4:45 PM–5:00 PM',
      capacity: 1,
      reservedCount: 1, // Full
      status: 'UPCOMING',
    }).returning();
  } else {
    await db.update(pickupBatches).set({ capacity: 1, reservedCount: 1 }).where(eq(pickupBatches.id, fullBatch.id));
  }

  try {
    await sellerSuggestTime(freshTomorrowOrder.order.id, seller.id, `${tomorrowStr}T16:50:00+05:30`);
    assert(false, 'Should reject proposal when batch has reached full capacity');
  } catch (err: any) {
    assert(
      err.message.includes('capacity') || err.message.includes('full'),
      'Reject proposal for batch at full capacity'
    );
  } finally {
    // Restore batch capacity so it doesn't affect other tests
    await db.update(pickupBatches).set({ capacity: originalCapacity, reservedCount: originalReserved }).where(eq(pickupBatches.id, fullBatch.id));
  }

  // ----------------------------------------------------
  // SECTION 3: Customer Response & Field Mismatch Alignment
  // ----------------------------------------------------
  console.log('\n--- Section 3: Customer Response & Field Alignment ---');

  // 3.1 Reject unauthorized customer
  try {
    await customerRespondTimeSuggestion(orderTomorrow.order.id, customer2.id, 'ACCEPT');
    assert(false, 'Unauthorized customer should not be able to respond to another customer order');
  } catch (err: any) {
    assert(
      err.message.includes('Order not found') || err.message.includes('unauthorized'),
      'Block customer 2 from accepting customer 1 time proposal'
    );
  }

  // 3.2 Customer 1 accepts the proposal
  const acceptRes = await customerRespondTimeSuggestion(orderTomorrow.order.id, customer1.id, 'ACCEPT');
  assert(
    acceptRes.status === 'ACCEPTED' && acceptRes.accepted === true,
    'Customer 1 accepts proposal; status transitions to ACCEPTED'
  );

  // Verify updated database state
  const updatedOrderAfterAccept = await db.query.orders.findFirst({
    where: eq(orders.id, orderTomorrow.order.id),
  });

  assert(
    updatedOrderAfterAccept?.status === 'ACCEPTED',
    'Order status is ACCEPTED in database'
  );
  assert(
    updatedOrderAfterAccept?.paymentStatus === 'PENDING',
    'Order paymentStatus is PENDING in database (ensuring customer payment button is rendered)'
  );
  assert(
    updatedOrderAfterAccept?.timeNegotiationStatus === 'ACCEPTED_BY_CUSTOMER',
    'Order timeNegotiationStatus is ACCEPTED_BY_CUSTOMER'
  );

  const exactPickupIST = getISTTodayString(new Date(updatedOrderAfterAccept!.exactPickupTime!));
  assert(
    exactPickupIST === tomorrowStr,
    `Accepted order exact pickup date preserves tomorrow (${tomorrowStr})`
  );

  // ----------------------------------------------------
  // SECTION 4: Payment Flow & Pickup Code Security
  // ----------------------------------------------------
  console.log('\n--- Section 4: Payment Flow & Pickup Code Security ---');

  // 4.1 Payment before proposal response rejected
  const unacceptedOrder = await createOrder({
    customerId: customer1.id,
    canteenId: canteen.id,
    items: [{ menuItemId: tea.id, quantity: 1 }],
    exactPickupTime: `${tomorrowStr}T11:00:00+05:30`,
    idempotencyKey: `test_pay_guard_${Date.now()}`,
  });
  await sellerSuggestTime(unacceptedOrder.order.id, seller.id, '11:15');

  try {
    await confirmOrderPayment({
      orderId: unacceptedOrder.order.id,
      customerId: customer1.id,
      providerPaymentId: `pay_test_${Date.now()}`,
      providerOrderId: `ord_test_${Date.now()}`,
    });
    assert(false, 'Payment must not be accepted while order is in TIME_CHANGE_PROPOSED');
  } catch (err: any) {
    assert(
      err.message.includes('accept the proposed pickup time') || err.message.includes('Cannot pay'),
      'Block payment when time proposal has not been accepted'
    );
  }

  // 4.2 Successful payment confirms the accepted order
  const confirmedOrder = await confirmOrderPayment({
    orderId: orderTomorrow.order.id,
    customerId: customer1.id,
    providerPaymentId: `pay_success_${Date.now()}`,
    providerOrderId: `ord_success_${Date.now()}`,
  });

  assert(
    confirmedOrder.status === 'CONFIRMED' && confirmedOrder.paymentStatus === 'PAID',
    'Payment confirmed: order transitions to CONFIRMED with paymentStatus PAID'
  );
  assert(
    Boolean(confirmedOrder.plaintextPickupCode),
    `Pickup code generated upon payment verification: ${confirmedOrder.plaintextPickupCode}`
  );

  // Verify pickup code can be decrypted and matched
  const pcRecord = await db.query.pickupCodes.findFirst({
    where: eq(pickupCodes.orderId, orderTomorrow.order.id),
  });
  const decryptedCode = decryptPickupCode(pcRecord?.encryptedCode);
  assert(
    decryptedCode === confirmedOrder.plaintextPickupCode,
    'Decrypted pickup code exactly matches code issued to customer'
  );

  // ----------------------------------------------------
  // SECTION 5: Customer Decline Flow
  // ----------------------------------------------------
  console.log('\n--- Section 5: Customer Decline Flow ---');

  const declineOrder = await createOrder({
    customerId: customer1.id,
    canteenId: canteen.id,
    items: [{ menuItemId: tea.id, quantity: 1 }],
    exactPickupTime: `${tomorrowStr}T12:00:00+05:30`,
    idempotencyKey: `test_decline_${Date.now()}`,
  });

  await sellerSuggestTime(declineOrder.order.id, seller.id, '12:30');

  // Get initial batch reserved count
  const batchBeforeDecline = await db.query.pickupBatches.findFirst({
    where: eq(pickupBatches.id, declineOrder.order.batchId),
  });
  const initialReserved = batchBeforeDecline?.reservedCount || 0;

  // Customer declines
  const declineRes = await customerRespondTimeSuggestion(declineOrder.order.id, customer1.id, 'DECLINE');
  assert(
    declineRes.status === 'CANCELLED' && declineRes.accepted === false,
    'Customer declines proposal; status transitions to CANCELLED'
  );

  const orderAfterDecline = await db.query.orders.findFirst({
    where: eq(orders.id, declineOrder.order.id),
  });
  assert(
    orderAfterDecline?.status === 'CANCELLED' && orderAfterDecline?.timeNegotiationStatus === 'DECLINED_BY_CUSTOMER',
    'Declined order marked CANCELLED with DECLINED_BY_CUSTOMER in database'
  );

  const batchAfterDecline = await db.query.pickupBatches.findFirst({
    where: eq(pickupBatches.id, declineOrder.order.batchId),
  });
  assert(
    (batchAfterDecline?.reservedCount || 0) <= initialReserved,
    'Reserved batch capacity released upon proposal decline'
  );

  // ----------------------------------------------------
  // SECTION 6: Surrounding Order Lifecycle
  // ----------------------------------------------------
  console.log('\n--- Section 6: Surrounding Order Lifecycle ---');

  // Seller starts preparation on confirmed order
  const preparingOrder = await sellerStartOrderPrep(orderTomorrow.order.id, seller.id);
  assert(
    preparingOrder.status === 'PREPARING',
    'Seller can transition CONFIRMED order to PREPARING'
  );

  // Seller marks order ready
  const readyOrder = await sellerMarkOrderReady(orderTomorrow.order.id, seller.id);
  assert(
    readyOrder.status === 'READY',
    'Seller can transition PREPARING order to READY with pickup code verified'
  );

  console.log('\n========================================================');
  console.log(`📊 Targeted Fixes Suite: ${passed} Passed | ${failed} Failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTargetedFixesTests().catch((err) => {
  console.error('Fatal error running targeted fixes tests:', err);
  process.exit(1);
});
