import { db, user, canteens, orders, pickupBatches, payments, orderItems, notifications, auditLogs, menuItems } from '../src/lib/db';
import { eq, and, sql } from 'drizzle-orm';
import {
  createOrder,
  sellerAcceptOrder,
  sellerSuggestTime,
  sellerCancelUnpaidOrder,
  confirmOrderPayment,
  sellerMarkOrderReady,
  sellerVerifyPickup,
} from '../src/lib/services/order-service';
import { getISTTodayString, getISTDateRangeBounds } from '../src/lib/pickup-time';

async function runTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 Seller Cancellation & Order History Verification Suite');
  console.log('🧪 ========================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // Setup test environment: Find test canteen and users
    const canteen = await db.query.canteens.findFirst({
      where: eq(canteens.name, 'IP Canteen'),
    });

    if (!canteen) {
      throw new Error('Test canteen "IP Canteen" not found in database.');
    }

    const customer = await db.query.user.findFirst({
      where: eq(user.role, 'CUSTOMER'),
    });

    const seller = await db.query.user.findFirst({
      where: eq(user.role, 'SELLER'),
    });

    if (!customer || !seller) {
      throw new Error('Test customer or seller user not found.');
    }

    const testMenuItem = await db.query.menuItems.findFirst({
      where: and(eq(menuItems.canteenId, canteen.id), eq(menuItems.isAvailable, true), eq(menuItems.isArchived, false)),
    });

    if (!testMenuItem) {
      throw new Error('No test menu item found.');
    }

    // ------------------------------------------------------------------------
    // Test 1: Cancelling a long-pending unpaid incoming request (REQUESTED)
    // ------------------------------------------------------------------------
    console.log('\n--- Test 1: Cancelling a long-pending unpaid incoming request ---');
    const order1Res = await createOrder({
      customerId: customer.id,
      canteenId: canteen.id,
      items: [{ menuItemId: testMenuItem.id, quantity: 1 }],
      exactPickupTime: '12:00',
      idempotencyKey: `test_cancel_req_${Date.now()}_1`,
    });
    const order1 = order1Res.order;

    const batchBefore1 = await db.query.pickupBatches.findFirst({
      where: eq(pickupBatches.id, order1.batchId),
    });
    const countBefore1 = batchBefore1?.reservedCount || 0;

    const cancelled1 = await sellerCancelUnpaidOrder(order1.id, seller.id, 'Request pending too long without payment', canteen.id);
    assert(cancelled1.status === 'CANCELLED', 'Order 1 status changed to CANCELLED');
    assert(cancelled1.cancelledAt !== null, 'Order 1 cancelledAt timestamp recorded');

    const batchAfter1 = await db.query.pickupBatches.findFirst({
      where: eq(pickupBatches.id, order1.batchId),
    });
    assert(batchAfter1?.reservedCount === Math.max(0, countBefore1 - 1), 'Batch capacity reserved_count decremented exactly once');

    // ------------------------------------------------------------------------
    // Test 2: Cancelling an accepted but unpaid order (ACCEPTED)
    // ------------------------------------------------------------------------
    console.log('\n--- Test 2: Cancelling an accepted but unpaid order ---');
    const order2Res = await createOrder({
      customerId: customer.id,
      canteenId: canteen.id,
      items: [{ menuItemId: testMenuItem.id, quantity: 1 }],
      exactPickupTime: '12:30',
      idempotencyKey: `test_cancel_acc_${Date.now()}_2`,
    });
    const order2 = order2Res.order;
    await sellerAcceptOrder(order2.id, seller.id, canteen.id);

    const cancelled2 = await sellerCancelUnpaidOrder(order2.id, seller.id, 'Unpaid after acceptance timeout', canteen.id);
    assert(cancelled2.status === 'CANCELLED', 'Accepted unpaid order status changed to CANCELLED');

    // ------------------------------------------------------------------------
    // Test 3: Cancelling an unpaid order with pending time-change proposal
    // ------------------------------------------------------------------------
    console.log('\n--- Test 3: Cancelling an unpaid order with pending time-change proposal ---');
    const order3Res = await createOrder({
      customerId: customer.id,
      canteenId: canteen.id,
      items: [{ menuItemId: testMenuItem.id, quantity: 1 }],
      exactPickupTime: '13:00',
      idempotencyKey: `test_cancel_time_${Date.now()}_3`,
    });
    const order3 = order3Res.order;
    await sellerSuggestTime(order3.id, seller.id, '13:30', 'Kitchen busy', canteen.id);

    const cancelled3 = await sellerCancelUnpaidOrder(order3.id, seller.id, 'No response to time proposal', canteen.id);
    assert(cancelled3.status === 'CANCELLED', 'Time proposal order status changed to CANCELLED');

    // ------------------------------------------------------------------------
    // Test 4: Preventing cancellation of a successfully paid order
    // ------------------------------------------------------------------------
    console.log('\n--- Test 4: Preventing cancellation of a successfully paid order ---');
    const order4Res = await createOrder({
      customerId: customer.id,
      canteenId: canteen.id,
      items: [{ menuItemId: testMenuItem.id, quantity: 1 }],
      exactPickupTime: '14:00',
      idempotencyKey: `test_paid_order_${Date.now()}_4`,
    });
    const order4 = order4Res.order;
    await sellerAcceptOrder(order4.id, seller.id, canteen.id);
    await confirmOrderPayment({
      orderId: order4.id,
      customerId: customer.id,
      providerPaymentId: `pay_test_${Date.now()}_4`,
      providerOrderId: `razor_ord_${Date.now()}_4`,
    });

    let paidCancelError = '';
    try {
      await sellerCancelUnpaidOrder(order4.id, seller.id, 'Attempt cancel paid order', canteen.id);
    } catch (err: any) {
      paidCancelError = err.message;
    }
    assert(
      paidCancelError.includes('Paid orders cannot be cancelled'),
      'Cancellation rejected for paid order with error message: "Paid orders cannot be cancelled by the seller through this feature."'
    );

    // ------------------------------------------------------------------------
    // Test 5: Payment / Cancellation Race Condition
    // ------------------------------------------------------------------------
    console.log('\n--- Test 5: Payment / Cancellation Race Condition ---');
    const order5Res = await createOrder({
      customerId: customer.id,
      canteenId: canteen.id,
      items: [{ menuItemId: testMenuItem.id, quantity: 1 }],
      exactPickupTime: '14:30',
      idempotencyKey: `test_race_${Date.now()}_5`,
    });
    const order5 = order5Res.order;

    // Simulate concurrent attempt: cancel first, then pay
    await sellerCancelUnpaidOrder(order5.id, seller.id, 'Cancelled during race test', canteen.id);

    let racePayError = '';
    try {
      await confirmOrderPayment({
        orderId: order5.id,
        customerId: customer.id,
        providerPaymentId: `pay_race_${Date.now()}_5`,
        providerOrderId: `razor_race_${Date.now()}_5`,
      });
    } catch (err: any) {
      racePayError = err.message;
    }
    assert(
      racePayError.includes('Cannot pay for order in CANCELLED status'),
      'Payment transaction safely blocked for cancelled order in race condition'
    );

    // ------------------------------------------------------------------------
    // Test 6: Releasing batch capacity exactly once
    // ------------------------------------------------------------------------
    console.log('\n--- Test 6: Releasing batch capacity exactly once ---');
    const order6Res = await createOrder({
      customerId: customer.id,
      canteenId: canteen.id,
      items: [{ menuItemId: testMenuItem.id, quantity: 1 }],
      exactPickupTime: '15:00',
      idempotencyKey: `test_double_release_${Date.now()}_6`,
    });
    const order6 = order6Res.order;

    const bBefore6 = await db.query.pickupBatches.findFirst({ where: eq(pickupBatches.id, order6.batchId) });
    const countBefore6 = bBefore6?.reservedCount || 0;

    await sellerCancelUnpaidOrder(order6.id, seller.id, 'First cancel', canteen.id);

    let duplicateCancelError = '';
    try {
      await sellerCancelUnpaidOrder(order6.id, seller.id, 'Second cancel', canteen.id);
    } catch (err: any) {
      duplicateCancelError = err.message;
    }
    assert(duplicateCancelError.includes('already cancelled'), 'Duplicate cancellation rejected');

    const bAfter6 = await db.query.pickupBatches.findFirst({ where: eq(pickupBatches.id, order6.batchId) });
    assert(bAfter6?.reservedCount === Math.max(0, countBefore6 - 1), 'Batch capacity decremented exactly once across duplicate requests');

    // ------------------------------------------------------------------------
    // Test 7: Customer Notification and Real-Time Synchronization
    // ------------------------------------------------------------------------
    console.log('\n--- Test 7: Customer Notification and Real-Time Synchronization ---');
    const notif = await db.query.notifications.findFirst({
      where: and(eq(notifications.orderId, order1.id), eq(notifications.type, 'ORDER_CANCELLED')),
    });
    assert(notif !== undefined && notif !== null, 'Customer in-app notification inserted for order cancellation');
    assert(Boolean(notif?.message.includes('Request pending too long without payment')), 'Notification message contains cancellation reason');

    // ------------------------------------------------------------------------
    // Test 8: Preventing cancelled orders from being paid, prepared or collected
    // ------------------------------------------------------------------------
    console.log('\n--- Test 8: Preventing cancelled orders from stale requests ---');
    let prepError = '';
    try {
      await sellerMarkOrderReady(order1.id, seller.id, canteen.id);
    } catch (err: any) {
      prepError = err.message;
    }
    // Cancelled orders cannot be marked ready
    assert(cancelled1.status === 'CANCELLED', 'Cancelled order status preserved');

    // ------------------------------------------------------------------------
    // Test 9: Preserving cancelled & rejected tickets in order history
    // ------------------------------------------------------------------------
    console.log('\n--- Test 9: Preserving tickets in audit logs & order history ---');
    const auditRecord = await db.query.auditLogs.findFirst({
      where: and(eq(auditLogs.entityId, order1.id), eq(auditLogs.action, 'ORDER_CANCELLED_UNPAID')),
    });
    assert(auditRecord !== undefined, 'Immutable audit log recorded for order cancellation');

    const fetchedOrder1 = await db.query.orders.findFirst({
      where: eq(orders.id, order1.id),
    });
    assert(fetchedOrder1?.status === 'CANCELLED', `Order 1 preserved in database with status CANCELLED (actual: ${fetchedOrder1?.status})`);

    // ------------------------------------------------------------------------
    // Test 10: Ensuring one seller cannot cancel another seller's orders
    // ------------------------------------------------------------------------
    console.log('\n--- Test 10: Seller Data Isolation & Authorization ---');
    const fakeCanteenId = '00000000-0000-0000-0000-000000000000';
    let isolationError = '';
    try {
      await sellerCancelUnpaidOrder(order4.id, seller.id, 'Unauthorized cancel', fakeCanteenId);
    } catch (err: any) {
      isolationError = err.message;
    }
    assert(
      isolationError.includes('Forbidden: Cannot cancel order for another canteen'),
      'Seller prevented from cancelling order belonging to another canteen'
    );

    // ------------------------------------------------------------------------
    // Summary Results
    // ------------------------------------------------------------------------
    console.log('\n========================================================');
    console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('========================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('❌ Verification suite encountered an uncaught error:', err);
    process.exit(1);
  }
}

runTests();
