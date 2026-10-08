import 'dotenv/config';
import { db, user, canteens, orders, pickupBatches, menuItems, pickupCodes } from '../src/lib/db';
import { eq } from 'drizzle-orm';
import {
  createOrder,
  sellerAcceptOrder,
  sellerMarkOrderReady,
  sellerVerifyPickup,
} from '../src/lib/services/order-service';
import assert from 'assert';

async function runSecurityTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 QLess IDOR, BOLA & Permission Boundary Security Tests');
  console.log('🧪 ========================================================');

  let passed = 0;
  let failed = 0;

  function testAssert(condition: boolean, name: string) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      failed++;
    }
  }

  const canteen = await db.query.canteens.findFirst({ where: eq(canteens.name, 'IP Canteen') });
  const customer = await db.query.user.findFirst({ where: eq(user.username, 'ctr/siya_sen') });
  const seller = await db.query.user.findFirst({ where: eq(user.username, 'slr/soman_singh') });
  const chai = await db.query.menuItems.findFirst({ where: eq(menuItems.name, 'Special Masala Chai') });

  if (!canteen || !customer || !seller || !chai) {
    throw new Error('Required test fixtures not found');
  }

  // Test 1: Quantity validation (decimal, negative, overflow)
  console.log('\n--- Security Test 1: Input Validation & Quantity Limits ---');
  let rejectedZero = false;
  try {
    await createOrder({
      customerId: customer.id,
      canteenId: canteen.id,
      items: [{ menuItemId: chai.id, quantity: 0 }],
      exactPickupTime: '2026-10-08T06:00:00.000Z', // 11:30 AM IST
      idempotencyKey: `sec_q0_${Date.now()}`,
    });
  } catch (err: any) {
    rejectedZero = err.message.includes('Invalid quantity');
  }
  testAssert(rejectedZero, 'Order with quantity <= 0 rejected');

  let rejectedDecimal = false;
  try {
    await createOrder({
      customerId: customer.id,
      canteenId: canteen.id,
      items: [{ menuItemId: chai.id, quantity: 1.5 }],
      exactPickupTime: '2026-10-08T06:00:00.000Z', // 11:30 AM IST
      idempotencyKey: `sec_qdec_${Date.now()}`,
    });
  } catch (err: any) {
    rejectedDecimal = err.message.includes('Invalid quantity');
  }
  testAssert(rejectedDecimal, 'Order with non-integer quantity rejected');

  let rejectedExcessive = false;
  try {
    await createOrder({
      customerId: customer.id,
      canteenId: canteen.id,
      items: [{ menuItemId: chai.id, quantity: 100 }],
      exactPickupTime: '2026-10-08T06:00:00.000Z', // 11:30 AM IST
      idempotencyKey: `sec_q100_${Date.now()}`,
    });
  } catch (err: any) {
    rejectedExcessive = err.message.includes('Invalid quantity');
  }
  testAssert(rejectedExcessive, 'Order exceeding max quantity limit (50) rejected');

  // Create legitimate order for authorization boundary tests
  const orderRes = await createOrder({
    customerId: customer.id,
    canteenId: canteen.id,
    items: [{ menuItemId: chai.id, quantity: 1 }],
    exactPickupTime: '2026-10-08T06:30:00.000Z', // 12:00 PM IST
    idempotencyKey: `sec_order_${Date.now()}`,
  });
  const order = orderRes.order;

  // Test 2: Cross-canteen BOLA / IDOR protection
  console.log('\n--- Security Test 2: Cross-Canteen Seller Scoping (BOLA/IDOR) ---');
  let rejectedCrossCanteen = false;
  try {
    // Seller from a fake foreign canteen tries to accept
    await sellerAcceptOrder(order.id, seller.id, 'foreign-canteen-uuid-999');
  } catch (err: any) {
    rejectedCrossCanteen = err.message.includes('Forbidden: Cannot accept orders for another canteen');
  }
  testAssert(rejectedCrossCanteen, 'Foreign canteen seller blocked from accepting order (BOLA protection)');

  let rejectedCrossCanteenVerify = false;
  try {
    // Seller from foreign canteen tries to verify pickup
    await sellerVerifyPickup(order.id, seller.id, 'CODE', 'foreign-canteen-uuid-999');
  } catch (err: any) {
    rejectedCrossCanteenVerify = err.message.includes('Forbidden: Cannot verify pickup for another canteen');
  }
  testAssert(rejectedCrossCanteenVerify, 'Foreign canteen seller blocked from verifying pickup (BOLA protection)');

  console.log('\n========================================================');
  console.log(`📊 Security Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runSecurityTests().catch(err => {
  console.error('Security test failure:', err);
  process.exit(1);
});
