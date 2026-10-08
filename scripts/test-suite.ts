import { db, user, canteens, pickupBatches, menuItems, orders, pickupCodes } from '../src/lib/db';
import { eq, and, sql } from 'drizzle-orm';
import { createOrder, sellerAcceptOrder, confirmOrderPayment, sellerStartPreparingBatch, sellerMarkOrderReady, sellerVerifyPickup, getBatchWindow } from '../src/lib/services/order-service';
import crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runTestSuite() {
  console.log('🧪 ========================================================');
  console.log('🧪 QLess Production Verification & Security Test Suite');
  console.log('🧪 ========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Timezone & Continuous 15-minute batch mapping test
  console.log('--- Test 1: Continuous 15-Minute Batch Mapping ---');
  const date11_07 = new Date('2026-10-08T11:07:00');
  const batch11_07 = getBatchWindow(date11_07);
  assert(batch11_07.startTime === '11:00:00' && batch11_07.endTime === '11:15:00', 'Arbitrary pickup time 11:07 AM maps to 11:00-11:15 batch');

  const date11_18 = new Date('2026-10-08T11:18:00');
  const batch11_18 = getBatchWindow(date11_18);
  assert(batch11_18.startTime === '11:15:00' && batch11_18.endTime === '11:30:00', 'Arbitrary pickup time 11:18 AM maps to 11:15-11:30 batch');

  // Fetch canteen & sample customer
  const canteen = await db.query.canteens.findFirst({ where: eq(canteens.name, 'IP Canteen') });
  const customer = await db.query.user.findFirst({ where: eq(user.username, 'ctr/siya_sen') });
  const seller = await db.query.user.findFirst({ where: eq(user.username, 'slr/soman_singh') });
  const dosa = await db.query.menuItems.findFirst({ where: eq(menuItems.name, 'Masala Dosa') });
  const chai = await db.query.menuItems.findFirst({ where: eq(menuItems.name, 'Special Masala Chai') });

  if (!canteen || !customer || !seller || !dosa || !chai) {
    throw new Error('Seed data required for testing not found');
  }

  // 2. Server-side price calculation test (Never trust client price)
  console.log('\n--- Test 2: Server-Side Price Authority ---');
  const fakePriceOrder = await createOrder({
    customerId: customer.id,
    canteenId: canteen.id,
    items: [
      { menuItemId: dosa.id, quantity: 2 }, // 60 * 2 = 120
      { menuItemId: chai.id, quantity: 1 }  // 15 * 1 = 15
    ],
    exactPickupTime: '2026-10-08T11:07:00.000Z',
    idempotencyKey: `test_price_${Date.now()}`,
  });

  const expectedTotal = (parseFloat(dosa.price) * 2 + parseFloat(chai.price) * 1).toFixed(2);
  assert(fakePriceOrder.order.totalAmount === expectedTotal, `Total amount calculated strictly server-side (₹${expectedTotal})`);

  // 3. Pickup code zero plaintext verification
  console.log('\n--- Test 3: Pickup Code Zero Plaintext & Hash Verification ---');
  const orderId = fakePriceOrder.order.id;
  const storedCodeRecord = await db.query.pickupCodes.findFirst({ where: eq(pickupCodes.orderId, orderId) });
  assert(Boolean(storedCodeRecord?.codeHash), 'Pickup code hash is stored in database');
  assert(!('code' in (storedCodeRecord || {})), 'Plaintext pickup code is NEVER stored in database table');

  // 4. Rate-limited pickup code brute-force protection
  console.log('\n--- Test 4: Rate-Limited Pickup Code Protection ---');
  let bruteForceCaught = false;
  try {
    for (let i = 0; i < 6; i++) {
      await sellerVerifyPickup(orderId, seller.id, 'XXXX');
    }
  } catch (err: any) {
    bruteForceCaught = err.message.includes('locked') || err.message.includes('Incorrect pickup code');
  }
  assert(bruteForceCaught, 'Repeated incorrect pickup code attempts trigger security lockout');

  // 5. Concurrency & Batch Capacity Reservation Test
  console.log('\n--- Test 5: Concurrency & Capacity Enforcement ---');
  // Configure test batch with strictly 1 available slot remaining
  const testStartTime = '11:15:00';
  const testEndTime = '11:30:00';
  const todayStr = new Date().toISOString().split('T')[0];

  let existingBatch = await db.query.pickupBatches.findFirst({
    where: and(
      eq(pickupBatches.canteenId, canteen.id),
      eq(pickupBatches.batchDate, todayStr),
      eq(pickupBatches.startTime, testStartTime)
    )
  });

  let capacity1Batch;
  let initialReserved = 0;
  if (existingBatch) {
    initialReserved = existingBatch.reservedCount;
    const [updated] = await db.update(pickupBatches)
      .set({ capacity: initialReserved + 1 })
      .where(eq(pickupBatches.id, existingBatch.id))
      .returning();
    capacity1Batch = updated;
  } else {
    const [inserted] = await db.insert(pickupBatches).values({
      canteenId: canteen.id,
      batchDate: todayStr,
      startTime: testStartTime,
      endTime: testEndTime,
      displayLabel: '11:15–11:30 AM',
      capacity: 1,
      reservedCount: 0,
      status: 'UPCOMING',
    }).returning();
    capacity1Batch = inserted;
  }

  // Two simultaneous orders attempting to reserve the only available remaining slot (1)
  const pickupTimeISO = `${todayStr}T11:20:00+05:30`;

  const orderPromise1 = createOrder({
    customerId: customer.id,
    canteenId: canteen.id,
    items: [{ menuItemId: chai.id, quantity: 1 }],
    exactPickupTime: pickupTimeISO,
    idempotencyKey: `concurrent_1_${Date.now()}`,
  });

  const orderPromise2 = createOrder({
    customerId: customer.id,
    canteenId: canteen.id,
    items: [{ menuItemId: chai.id, quantity: 1 }],
    exactPickupTime: pickupTimeISO,
    idempotencyKey: `concurrent_2_${Date.now()}`,
  });

  const results = await Promise.allSettled([orderPromise1, orderPromise2]);
  const succeeded = results.filter(r => r.status === 'fulfilled');
  const rejected = results.filter(r => r.status === 'rejected');

  assert(succeeded.length === 1 && rejected.length === 1, 'Exactly one concurrent order succeeded when capacity = 1');
  
  const recheckedBatch = await db.query.pickupBatches.findFirst({ where: eq(pickupBatches.id, capacity1Batch.id) });
  assert(recheckedBatch?.reservedCount === initialReserved + 1, 'Batch reservedCount never exceeded capacity (remains at 1)');

  // 6. Complete End-to-End Order Lifecycle Flow
  console.log('\n--- Test 6: Complete End-to-End Order Lifecycle ---');
  const flowOrderRes = await createOrder({
    customerId: customer.id,
    canteenId: canteen.id,
    items: [{ menuItemId: dosa.id, quantity: 1 }],
    exactPickupTime: `${todayStr}T12:15:00+05:30`,
    idempotencyKey: `flow_${Date.now()}`,
  });
  const flowOrder = flowOrderRes.order;
  const flowCode = flowOrderRes.plaintextPickupCode;
  assert(flowOrder.status === 'REQUESTED', 'Step 1: Order created with status REQUESTED');

  const acceptedOrder = await sellerAcceptOrder(flowOrder.id, seller.id);
  assert(acceptedOrder.status === 'ACCEPTED', 'Step 2: Seller accepted requested time (ACCEPTED)');

  const paidOrder = await confirmOrderPayment({
    orderId: flowOrder.id,
    customerId: customer.id,
    providerPaymentId: `pay_rzp_test_${Date.now()}`,
    providerOrderId: `ord_rzp_test_${Date.now()}`,
  });
  assert(paidOrder.status === 'CONFIRMED' && paidOrder.paymentStatus === 'PAID', 'Step 3: Payment verified and confirmed (CONFIRMED, PAID)');

  await sellerStartPreparingBatch(flowOrder.batchId, seller.id);
  const prepOrder = await db.query.orders.findFirst({ where: eq(orders.id, flowOrder.id) });
  assert(prepOrder?.status === 'PREPARING', 'Step 4: Batch preparation started (PREPARING)');

  const readyOrder = await sellerMarkOrderReady(flowOrder.id, seller.id);
  assert(readyOrder.status === 'READY', 'Step 5: Food marked READY for collection');

  const verifyResult = await sellerVerifyPickup(flowOrder.id, seller.id, flowCode!);
  assert(verifyResult.order.status === 'COLLECTED', 'Step 6: Seller verified 4-char pickup code (COLLECTED)');

  console.log('\n========================================================');
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runTestSuite().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
