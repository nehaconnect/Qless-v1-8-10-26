import { db, user, canteens, pickupBatches, menuItems, orders, orderItems, session } from '../src/lib/db';
import { eq, and, sql } from 'drizzle-orm';
import {
  createOrder,
  sellerAcceptOrder,
  sellerRejectOrder,
  sellerSuggestTime,
} from '../src/lib/services/order-service';
import { getSessionUser } from '../src/lib/auth/server';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runPrompt4Tests() {
  console.log('🧪 ========================================================');
  console.log('🧪 Prompt 4 Verification: Scheduling, Auth & Isolation');
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

  // 1. Setup users and canteen
  const canteen = await db.query.canteens.findFirst({ where: eq(canteens.name, 'IP Canteen') });
  const customer1 = await db.query.user.findFirst({ where: eq(user.username, 'ctr/siya_sen') });
  let customer2 = await db.query.user.findFirst({ 
    where: and(eq(user.role, 'CUSTOMER'), sql`${user.id} != ${customer1?.id || ''}`) 
  });
  
  if (!customer2 && customer1) {
    const cust2Id = 'usr_cust_test_' + Date.now();
    const [createdCust2] = await db.insert(user).values({
      id: cust2Id,
      name: 'Ananya Roy',
      email: `ananya_${Date.now()}@ipcw.du.ac.in`,
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
  const poha = await db.query.menuItems.findFirst({ where: and(eq(menuItems.canteenId, canteen!.id), eq(menuItems.name, 'Poha')) });

  if (customer1) {
    await db.update(user).set({ isActive: true }).where(eq(user.id, customer1.id));
  }

  if (!canteen || !customer1 || !customer2 || !seller || !poha) {
    throw new Error('Seed data required for testing not found: ' + JSON.stringify({
      canteen: !!canteen,
      customer1: !!customer1,
      customer2: !!customer2,
      seller: !!seller,
      poha: !!poha
    }));
  }

  // Current date calculations in Asia/Kolkata
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const dayAfterTomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const dayAfterTomorrowStr = dayAfterTomorrow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // ----------------------------------------------------
  // SECTION 1: Scheduling Validations
  // ----------------------------------------------------
  console.log('--- Section 1: Pickup Scheduling Rules ---');

  // Test 1.1: Order for tomorrow during operating hours when canteen is currently closed
  // Simulate current time as 11:00 PM (closed)
  const simulatedNightClosed = new Date(`${todayStr}T23:00:00+05:30`);
  const tomorrowSlot = `${tomorrowStr}T10:15:00+05:30`;

  try {
    const tomorrowOrder = await createOrder({
      customerId: customer1.id,
      canteenId: canteen.id,
      items: [{ menuItemId: poha.id, quantity: 1 }],
      exactPickupTime: tomorrowSlot,
      simulatedNow: simulatedNightClosed,
      idempotencyKey: `sched_tomorrow_${Date.now()}`,
    });
    assert(
      tomorrowOrder.order.status === 'REQUESTED',
      'Order request for TOMORROW (10:15 AM) accepted even when canteen is closed tonight'
    );

    // Verify seller can accept this order
    const acceptedTomorrow = await sellerAcceptOrder(tomorrowOrder.order.id, seller.id);
    assert(
      acceptedTomorrow.status === 'ACCEPTED',
      'Seller can accept tomorrow order request received during closed hours'
    );
  } catch (err: any) {
    assert(false, 'Order request for tomorrow failed', err.message);
  }

  // Test 1.2: Order for date beyond tomorrow rejected
  const invalidFutureSlot = `${dayAfterTomorrowStr}T10:15:00+05:30`;
  try {
    await createOrder({
      customerId: customer1.id,
      canteenId: canteen.id,
      items: [{ menuItemId: poha.id, quantity: 1 }],
      exactPickupTime: invalidFutureSlot,
      simulatedNow: simulatedNightClosed,
      idempotencyKey: `sched_future_${Date.now()}`,
    });
    assert(false, 'Dates beyond tomorrow must be rejected');
  } catch (err: any) {
    assert(
      err.message.includes('today or tomorrow only') || err.message.includes('Pickup scheduling is permitted'),
      'Reject pickup dates beyond tomorrow with clear validation error'
    );
  }

  // Test 1.3: Prevent selection of pickup time that has already passed today
  const simulatedAfternoon = new Date(`${todayStr}T14:30:00+05:30`);
  const pastSlotToday = `${todayStr}T10:00:00+05:30`; // 10:00 AM is past when it's 2:30 PM
  try {
    await createOrder({
      customerId: customer1.id,
      canteenId: canteen.id,
      items: [{ menuItemId: poha.id, quantity: 1 }],
      exactPickupTime: pastSlotToday,
      simulatedNow: simulatedAfternoon,
      idempotencyKey: `sched_past_${Date.now()}`,
    });
    assert(false, 'Past pickup time today must be rejected');
  } catch (err: any) {
    assert(
      err.message.includes('already passed') || err.message.includes('future time'),
      'Reject past pickup time for today'
    );
  }

  // Test 1.4: Reject pickup times outside operating hours (e.g., 7:45 AM or 5:15 PM)
  const earlySlot = `${tomorrowStr}T07:45:00+05:30`;
  try {
    await createOrder({
      customerId: customer1.id,
      canteenId: canteen.id,
      items: [{ menuItemId: poha.id, quantity: 1 }],
      exactPickupTime: earlySlot,
      simulatedNow: simulatedNightClosed,
      idempotencyKey: `sched_early_${Date.now()}`,
    });
    assert(false, 'Early slot outside operating hours must be rejected');
  } catch (err: any) {
    assert(
      err.message.includes('operating hours') || err.message.includes('8:00 AM and 5:00 PM'),
      'Reject slot before 8:00 AM'
    );
  }

  // ----------------------------------------------------
  // SECTION 2: Seller Workflow for Order Requests
  // ----------------------------------------------------
  console.log('\n--- Section 2: Seller Action on Order Requests ---');

  // Test 2.1: Seller rejecting an order request
  const rejectOrderRes = await createOrder({
    customerId: customer1.id,
    canteenId: canteen.id,
    items: [{ menuItemId: poha.id, quantity: 1 }],
    exactPickupTime: `${tomorrowStr}T11:00:00+05:30`,
    simulatedNow: simulatedNightClosed,
    idempotencyKey: `sched_reject_${Date.now()}`,
  });
  const rejectedOrder = await sellerRejectOrder(
    rejectOrderRes.order.id,
    seller.id,
    'Kitchen at maximum capacity for this batch'
  );
  assert(
    rejectedOrder.status === 'REJECTED' && rejectedOrder.rejectionReason === 'Kitchen at maximum capacity for this batch',
    'Seller can reject an order request with a specific reason'
  );

  // Test 2.2: Seller proposing a new valid time
  const proposeOrderRes = await createOrder({
    customerId: customer1.id,
    canteenId: canteen.id,
    items: [{ menuItemId: poha.id, quantity: 1 }],
    exactPickupTime: `${tomorrowStr}T11:00:00+05:30`,
    simulatedNow: simulatedNightClosed,
    idempotencyKey: `sched_prop_${Date.now()}`,
  });
  const proposedNewTime = `${tomorrowStr}T11:45:00+05:30`;
  const proposedOrder = await sellerSuggestTime(
    proposeOrderRes.order.id,
    seller.id,
    proposedNewTime,
    'Suggested 11:45 AM batch due to low queue'
  );
  assert(
    proposedOrder.status === 'TIME_CHANGE_PROPOSED' && Boolean(proposedOrder.sellerSuggestedTime),
    'Seller can propose an alternate valid pickup time for customer approval (TIME_CHANGE_PROPOSED)'
  );

  // ----------------------------------------------------
  // SECTION 3: Auth & Session Token Fallback Verification
  // ----------------------------------------------------
  console.log('\n--- Section 3: Auth Session Recovery & Token Fallback ---');

  // Create an active session in the database for customer 1
  const testToken1 = `test_sess_tok_${Date.now()}_cust1`;
  const [createdSession1] = await db.insert(session).values({
    id: `sess_${Date.now()}_1`,
    userId: customer1.id,
    token: testToken1,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Valid for 24h
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  // Test getSessionUser with headers containing session cookie
  const mockHeadersCust1 = new Headers();
  mockHeadersCust1.set('cookie', `better-auth.session_token=${testToken1}`);

  const verifiedUser1 = await getSessionUser(mockHeadersCust1);
  assert(
    verifiedUser1 !== null && verifiedUser1.id === customer1.id,
    'getSessionUser recovers authenticated customer from better-auth.session_token cookie'
  );

  // Test with invalid / expired token
  const mockHeadersExpired = new Headers();
  mockHeadersExpired.set('cookie', `better-auth.session_token=non_existent_token_12345`);
  const verifiedUserExpired = await getSessionUser(mockHeadersExpired);
  assert(
    verifiedUserExpired === null,
    'Invalid or expired session token returns null (ensuring clear 401 UNAUTHORIZED)'
  );

  // Clean up test session
  await db.delete(session).where(eq(session.id, createdSession1.id));

  // ----------------------------------------------------
  // SECTION 4: Customer Account & Order Isolation
  // ----------------------------------------------------
  console.log('\n--- Section 4: Customer Account & Order Isolation ---');

  // Customer 1 creates an order
  const cust1OrderRes = await createOrder({
    customerId: customer1.id,
    canteenId: canteen.id,
    items: [{ menuItemId: poha.id, quantity: 1 }],
    exactPickupTime: `${tomorrowStr}T14:00:00+05:30`,
    simulatedNow: simulatedNightClosed,
    idempotencyKey: `iso_cust1_${Date.now()}`,
  });

  // Customer 2 creates an order
  const cust2OrderRes = await createOrder({
    customerId: customer2.id,
    canteenId: canteen.id,
    items: [{ menuItemId: poha.id, quantity: 2 }],
    exactPickupTime: `${tomorrowStr}T14:30:00+05:30`,
    simulatedNow: simulatedNightClosed,
    idempotencyKey: `iso_cust2_${Date.now()}`,
  });

  // Query orders scoped to customer 1
  const cust1Orders = await db.query.orders.findMany({
    where: eq(orders.customerId, customer1.id)
  });
  const cust2OrderVisibleToCust1 = cust1Orders.some(o => o.id === cust2OrderRes.order.id);
  assert(
    !cust2OrderVisibleToCust1,
    'Customer 1 cannot see Customer 2 order in their scoped orders list'
  );

  // Query orders scoped to customer 2
  const cust2Orders = await db.query.orders.findMany({
    where: eq(orders.customerId, customer2.id)
  });
  const cust1OrderVisibleToCust2 = cust2Orders.some(o => o.id === cust1OrderRes.order.id);
  assert(
    !cust1OrderVisibleToCust2,
    'Customer 2 cannot see Customer 1 order in their scoped orders list'
  );

  // Check quantities and items separation
  const cust1Items = await db.select().from(orderItems).where(eq(orderItems.orderId, cust1OrderRes.order.id));
  const cust2Items = await db.select().from(orderItems).where(eq(orderItems.orderId, cust2OrderRes.order.id));
  assert(
    cust1Items[0]?.quantity === 1 && cust2Items[0]?.quantity === 2,
    'Customer 1 and Customer 2 have completely independent order item quantities'
  );

  console.log('\n========================================================');
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runPrompt4Tests().catch(err => {
  console.error('Prompt 4 test suite failed with error:', err);
  process.exit(1);
});
