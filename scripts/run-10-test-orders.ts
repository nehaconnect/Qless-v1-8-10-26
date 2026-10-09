import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db, user, canteens, pickupBatches, menuItems, orders, pickupCodes, payments, auditLogs } from '../src/lib/db';
import { eq, and, sql } from 'drizzle-orm';
import {
  createOrder,
  sellerAcceptOrder,
  sellerRejectOrder,
  sellerSuggestTime,
  customerRespondTimeSuggestion,
  confirmOrderPayment,
  sellerStartPreparingBatch,
  sellerMarkOrderReady,
  sellerVerifyPickup,
} from '../src/lib/services/order-service';

async function run10ControlledOrders() {
  console.log('🧪 ========================================================');
  console.log('🧪 QLess 10 Controlled Test Orders (4 15-Minute Batches)');
  console.log('🧪 ========================================================\n');

  // 1. Locate Canteen, Seller, and Menu Items
  const canteen = await db.query.canteens.findFirst({ where: eq(canteens.name, 'IP Canteen') });
  const seller = await db.query.user.findFirst({ where: eq(user.username, 'slr/soman_singh') });

  if (!canteen || !seller) {
    throw new Error('IP Canteen or Soman Singh seller not found in DB');
  }

  // Find existing customers or create if needed
  let registeredCustomers = await db.query.user.findMany({
    where: and(eq(user.role, 'CUSTOMER'), eq(user.isActive, true)),
    limit: 10,
  });

  while (registeredCustomers.length < 4) {
    const idx = registeredCustomers.length + 1;
    const randomPhone = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
    const [newCust] = await db.insert(user).values({
      id: 'usr_cust_' + Math.random().toString(36).substring(2, 10),
      name: `Test Student ${idx}`,
      username: `ctr/test_student_${idx}`,
      email: `student${idx}_${Date.now()}@ipcw.du.ac.in`,
      phoneNumber: randomPhone,
      role: 'CUSTOMER',
      isActive: true,
    }).returning();
    registeredCustomers.push(newCust);
  }

  const cust1 = registeredCustomers[0];
  const cust2 = registeredCustomers[1];
  const cust3 = registeredCustomers[2];
  const cust4 = registeredCustomers[3];
  console.log(`✓ Test Customers: ${cust1.name} (${cust1.username}), ${cust2.name} (${cust2.username}), ${cust3.name} (${cust3.username}), ${cust4.name} (${cust4.username})`);

  // Menu items for ordering
  const tea = await db.query.menuItems.findFirst({ where: and(eq(menuItems.canteenId, canteen.id), eq(menuItems.name, 'Tea')) });
  const poha = await db.query.menuItems.findFirst({ where: and(eq(menuItems.canteenId, canteen.id), eq(menuItems.name, 'Poha')) });
  const samosa = await db.query.menuItems.findFirst({ where: and(eq(menuItems.canteenId, canteen.id), eq(menuItems.name, 'Samosa')) });
  const coffee = await db.query.menuItems.findFirst({ where: and(eq(menuItems.canteenId, canteen.id), eq(menuItems.name, 'Coffee')) });

  if (!tea || !poha || !samosa || !coffee) {
    throw new Error('Required menu items (Tea, Poha, Samosa, Coffee) not found in IP Canteen');
  }

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  console.log(`✓ Operating Date (Asia/Kolkata): ${todayStr}`);

  let passedSteps = 0;
  function assert(cond: boolean, desc: string) {
    if (cond) {
      console.log(`  ✅ [PASS] ${desc}`);
      passedSteps++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      throw new Error(`Step failed: ${desc}`);
    }
  }

  const testCreateOrder = (params: any) => createOrder({
    ...params,
    simulatedNow: new Date(`${todayStr}T10:00:00+05:30`),
  });

  // =========================================================================
  // BATCH 1: 10:00–10:15 (2 Orders)
  // =========================================================================
  console.log('\n--- Batch 1: 10:00–10:15 (2 Orders) ---');

  // Order 1: Full Lifecycle -> COLLECTED
  console.log('Order 1: Exact 10:07 AM -> Accepted -> Paid -> Prepared -> Ready -> Verified -> COLLECTED');
  const o1Res = await testCreateOrder({
    customerId: cust1.id,
    canteenId: canteen.id,
    items: [{ menuItemId: poha.id, quantity: 1 }, { menuItemId: tea.id, quantity: 1 }],
    exactPickupTime: `${todayStr}T10:07:00+05:30`,
    idempotencyKey: `test_ctrl_o1_${Date.now()}`,
  });
  assert(o1Res.order.status === 'REQUESTED', 'Order 1 created with status REQUESTED');

  const o1Accepted = await sellerAcceptOrder(o1Res.order.id, seller.id);
  assert(o1Accepted.status === 'ACCEPTED', 'Order 1 seller accepted');

  const o1Paid = await confirmOrderPayment({
    orderId: o1Res.order.id,
    customerId: cust1.id,
    providerPaymentId: `pay_ctrl_1_${Date.now()}`,
    providerOrderId: `ord_ctrl_1_${Date.now()}`,
  });
  assert(o1Paid.status === 'CONFIRMED' && o1Paid.paymentStatus === 'PAID', 'Order 1 payment confirmed');
  assert(Boolean(o1Paid.plaintextPickupCode), 'Order 1 pickup code generated upon payment verification');

  await sellerStartPreparingBatch(o1Res.order.batchId, seller.id);
  const o1Prep = await db.query.orders.findFirst({ where: eq(orders.id, o1Res.order.id) });
  assert(o1Prep?.status === 'PREPARING', 'Order 1 status transitioned to PREPARING');

  const o1Ready = await sellerMarkOrderReady(o1Res.order.id, seller.id);
  assert(o1Ready.status === 'READY', 'Order 1 food marked READY');

  const o1Verified = await sellerVerifyPickup(o1Res.order.id, seller.id, o1Paid.plaintextPickupCode!);
  assert(o1Verified.order.status === 'COLLECTED', 'Order 1 successfully verified with pickup code -> COLLECTED');

  // Security test: Replay attack fails
  let replayBlocked = false;
  try {
    await sellerVerifyPickup(o1Res.order.id, seller.id, o1Paid.plaintextPickupCode!);
  } catch (err: any) {
    replayBlocked = err.message.toLowerCase().includes('collected') || err.message.toLowerCase().includes('already');
  }
  assert(replayBlocked, 'Order 1: Pickup code cannot be reused once collected');

  // Order 2: Rejection Flow -> REJECTED
  console.log('\nOrder 2: Exact 10:12 AM -> Rejected by seller -> REJECTED');
  const o2Res = await testCreateOrder({
    customerId: cust2.id,
    canteenId: canteen.id,
    items: [{ menuItemId: samosa.id, quantity: 2 }],
    exactPickupTime: `${todayStr}T10:12:00+05:30`,
    idempotencyKey: `test_ctrl_o2_${Date.now()}`,
  });
  assert(o2Res.order.status === 'REQUESTED', 'Order 2 created with status REQUESTED');

  const o2Rejected = await sellerRejectOrder(o2Res.order.id, seller.id, 'Kitchen at maximum capacity');
  assert(o2Rejected.status === 'REJECTED', 'Order 2 seller rejected');

  // Verify rejected order cannot proceed to payment
  let paymentRejected = false;
  try {
    await confirmOrderPayment({
      orderId: o2Res.order.id,
      customerId: cust2.id,
      providerPaymentId: `pay_ctrl_2_${Date.now()}`,
      providerOrderId: `ord_ctrl_2_${Date.now()}`,
    });
  } catch (err: any) {
    paymentRejected = true;
  }
  assert(paymentRejected, 'Order 2: Rejected order cannot proceed to payment');

  // =========================================================================
  // BATCH 2: 10:15–10:30 (1 Order)
  // =========================================================================
  console.log('\n--- Batch 2: 10:15–10:30 (1 Order) ---');

  // Order 3: Time Suggestion & Customer Acceptance -> CONFIRMED
  console.log('Order 3: Exact 10:20 AM -> Seller suggests 10:25 AM -> Customer accepts -> Paid -> CONFIRMED');
  const o3Res = await testCreateOrder({
    customerId: cust3.id,
    canteenId: canteen.id,
    items: [{ menuItemId: coffee.id, quantity: 2 }],
    exactPickupTime: `${todayStr}T10:20:00+05:30`,
    idempotencyKey: `test_ctrl_o3_${Date.now()}`,
  });
  assert(o3Res.order.status === 'REQUESTED', 'Order 3 created');

  const o3Suggested = await sellerSuggestTime(
    o3Res.order.id,
    seller.id,
    new Date(`${todayStr}T10:25:00+05:30`),
    'Ready faster at 10:25 AM'
  );
  assert(o3Suggested.timeNegotiationStatus === 'SUGGESTED_BY_SELLER', 'Order 3 seller proposed 10:25 AM');

  const o3CustAccepted = await customerRespondTimeSuggestion(o3Res.order.id, cust3.id, true);
  assert(o3CustAccepted.accepted === true, 'Order 3 customer accepted suggested time');

  const o3Paid = await confirmOrderPayment({
    orderId: o3Res.order.id,
    customerId: cust3.id,
    providerPaymentId: `pay_ctrl_3_${Date.now()}`,
    providerOrderId: `ord_ctrl_3_${Date.now()}`,
  });
  assert(o3Paid.status === 'CONFIRMED' && Boolean(o3Paid.plaintextPickupCode), 'Order 3 paid and pickup code generated');

  // =========================================================================
  // BATCH 3: 10:30–10:45 (3 Orders)
  // =========================================================================
  console.log('\n--- Batch 3: 10:30–10:45 (3 Orders) ---');

  // Order 4: Payment Failure Path -> ACCEPTED (Payment Pending)
  console.log('Order 4: Exact 10:33 AM -> Accepted -> Customer payment pending');
  const o4Res = await testCreateOrder({
    customerId: cust4.id,
    canteenId: canteen.id,
    items: [{ menuItemId: poha.id, quantity: 2 }],
    exactPickupTime: `${todayStr}T10:33:00+05:30`,
    idempotencyKey: `test_ctrl_o4_${Date.now()}`,
  });
  await sellerAcceptOrder(o4Res.order.id, seller.id);
  const o4Fetched = await db.query.orders.findFirst({ where: eq(orders.id, o4Res.order.id) });
  assert(o4Fetched?.status === 'ACCEPTED' && o4Fetched?.paymentStatus === 'PENDING', 'Order 4 accepted awaiting payment');

  // Order 5: Time Negotiation Declination -> CANCELLED
  console.log('\nOrder 5: Exact 10:38 AM -> Seller suggests time -> Customer declines -> CANCELLED');
  const o5Res = await testCreateOrder({
    customerId: cust1.id,
    canteenId: canteen.id,
    items: [{ menuItemId: tea.id, quantity: 2 }],
    exactPickupTime: `${todayStr}T10:38:00+05:30`,
    idempotencyKey: `test_ctrl_o5_${Date.now()}`,
  });
  await sellerSuggestTime(
    o5Res.order.id,
    seller.id,
    new Date(`${todayStr}T10:43:00+05:30`),
    'Busy at 10:38 AM'
  );
  const o5Declined = await customerRespondTimeSuggestion(o5Res.order.id, cust1.id, false);
  const o5Check = await db.query.orders.findFirst({ where: eq(orders.id, o5Res.order.id) });
  assert(o5Check?.status === 'CANCELLED', 'Order 5 declined and marked CANCELLED');

  // Order 6: Full Prep -> READY with code visible
  console.log('\nOrder 6: Exact 10:44 AM -> Accepted -> Paid -> Prepared -> READY');
  const o6Res = await testCreateOrder({
    customerId: cust2.id,
    canteenId: canteen.id,
    items: [{ menuItemId: samosa.id, quantity: 1 }, { menuItemId: coffee.id, quantity: 1 }],
    exactPickupTime: `${todayStr}T10:44:00+05:30`,
    idempotencyKey: `test_ctrl_o6_${Date.now()}`,
  });
  await sellerAcceptOrder(o6Res.order.id, seller.id);
  const o6Paid = await confirmOrderPayment({
    orderId: o6Res.order.id,
    customerId: cust2.id,
    providerPaymentId: `pay_ctrl_6_${Date.now()}`,
    providerOrderId: `ord_ctrl_6_${Date.now()}`,
  });
  await sellerStartPreparingBatch(o6Res.order.batchId, seller.id);
  const o6Ready = await sellerMarkOrderReady(o6Res.order.id, seller.id);
  assert(o6Ready.status === 'READY' && Boolean(o6Paid.plaintextPickupCode), 'Order 6 in READY state with active pickup code');

  // =========================================================================
  // BATCH 4: 10:45–11:00 (4 Orders)
  // =========================================================================
  console.log('\n--- Batch 4: 10:45–11:00 (4 Orders) ---');

  // Order 7: Pending Incoming Request
  console.log('Order 7: Exact 10:48 AM -> Remains in REQUESTED pending review');
  const o7Res = await testCreateOrder({
    customerId: cust3.id,
    canteenId: canteen.id,
    items: [{ menuItemId: tea.id, quantity: 1 }],
    exactPickupTime: `${todayStr}T10:48:00+05:30`,
    idempotencyKey: `test_ctrl_o7_${Date.now()}`,
  });
  assert(o7Res.order.status === 'REQUESTED', 'Order 7 incoming request waiting for seller');

  // Order 8: Accepted -> Awaiting Payment
  console.log('\nOrder 8: Exact 10:52 AM -> Accepted by seller -> Awaiting payment');
  const o8Res = await testCreateOrder({
    customerId: cust4.id,
    canteenId: canteen.id,
    items: [{ menuItemId: poha.id, quantity: 1 }],
    exactPickupTime: `${todayStr}T10:52:00+05:30`,
    idempotencyKey: `test_ctrl_o8_${Date.now()}`,
  });
  const o8Accepted = await sellerAcceptOrder(o8Res.order.id, seller.id);
  assert(o8Accepted.status === 'ACCEPTED', 'Order 8 accepted');

  // Order 9: Paid -> In Active Kitchen Prep
  console.log('\nOrder 9: Exact 10:55 AM -> Accepted -> Paid -> PREPARING');
  const o9Res = await testCreateOrder({
    customerId: cust1.id,
    canteenId: canteen.id,
    items: [{ menuItemId: coffee.id, quantity: 1 }, { menuItemId: samosa.id, quantity: 1 }],
    exactPickupTime: `${todayStr}T10:55:00+05:30`,
    idempotencyKey: `test_ctrl_o9_${Date.now()}`,
  });
  await sellerAcceptOrder(o9Res.order.id, seller.id);
  await confirmOrderPayment({
    orderId: o9Res.order.id,
    customerId: cust1.id,
    providerPaymentId: `pay_ctrl_9_${Date.now()}`,
    providerOrderId: `ord_ctrl_9_${Date.now()}`,
  });
  await sellerStartPreparingBatch(o9Res.order.batchId, seller.id);
  const o9Prep = await db.query.orders.findFirst({ where: eq(orders.id, o9Res.order.id) });
  assert(o9Prep?.status === 'PREPARING', 'Order 9 currently PREPARING in kitchen');

  // Order 10: Complete Lifecycle -> COLLECTED
  console.log('\nOrder 10: Exact 10:58 AM -> Accepted -> Paid -> Prepared -> Ready -> COLLECTED');
  const o10Res = await testCreateOrder({
    customerId: cust2.id,
    canteenId: canteen.id,
    items: [{ menuItemId: poha.id, quantity: 1 }, { menuItemId: coffee.id, quantity: 1 }],
    exactPickupTime: `${todayStr}T10:58:00+05:30`,
    idempotencyKey: `test_ctrl_o10_${Date.now()}`,
  });
  await sellerAcceptOrder(o10Res.order.id, seller.id);
  const o10Paid = await confirmOrderPayment({
    orderId: o10Res.order.id,
    customerId: cust2.id,
    providerPaymentId: `pay_ctrl_10_${Date.now()}`,
    providerOrderId: `ord_ctrl_10_${Date.now()}`,
  });
  await sellerStartPreparingBatch(o10Res.order.batchId, seller.id);
  await sellerMarkOrderReady(o10Res.order.id, seller.id);
  const o10Verified = await sellerVerifyPickup(o10Res.order.id, seller.id, o10Paid.plaintextPickupCode!);
  assert(o10Verified.order.status === 'COLLECTED', 'Order 10 marked COLLECTED');

  // Final Summary Table
  console.log('\n========================================================');
  console.log(`📊 All 10 Controlled Orders Successfully Executed (${passedSteps} test steps verified)`);
  console.log('========================================================');

  const all10Orders = await db.query.orders.findMany({
    where: and(
      eq(orders.canteenId, canteen.id),
      sql`${orders.idempotencyKey} LIKE 'test_ctrl_o%'`
    ),
    orderBy: [sql`${orders.exactPickupTime} ASC`],
  });

  console.table(
    all10Orders.map((o, idx) => ({
      Order: `Order ${idx + 1}`,
      ID: o.orderNumber,
      ExactPickup: new Date(o.exactPickupTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }),
      Status: o.status,
      Payment: o.paymentStatus,
      Total: `₹${parseFloat(o.totalAmount).toFixed(2)}`,
    }))
  );

  process.exit(0);
}

run10ControlledOrders().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
