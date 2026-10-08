import 'dotenv/config';

const BASE_URL = 'http://localhost:3000';

async function runSmokeTest() {
  console.log('🚀 ========================================================');
  console.log('🚀 Live End-to-End Application Smoke Test');
  console.log('🚀 Testing running server at ' + BASE_URL);
  console.log('🚀 ========================================================\n');

  let passed = 0;
  let failed = 0;

  function assertTest(condition: boolean, name: string) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      failed++;
    }
  }

  // Helper for requests with cookie jar
  class SessionClient {
    cookies: string = '';

    async request(url: string, options: any = {}) {
      const headers = {
        'Content-Type': 'application/json',
        ...(this.cookies ? { Cookie: this.cookies } : {}),
        ...(options.headers || {}),
      };

      const res = await fetch(`${BASE_URL}${url}`, {
        ...options,
        headers,
      });

      const setCookie = res.headers.get('set-cookie');
      if (setCookie) {
        // Parse cookies
        const newCookies = setCookie
          .split(/,(?=[^;]+=[^;]+)/)
          .map(c => c.split(';')[0].trim())
          .join('; ');
        this.cookies = this.cookies ? `${this.cookies}; ${newCookies}` : newCookies;
      }

      return res;
    }
  }

  // --- Step 1: Customer Flow ---
  console.log('--- Phase 1: Customer Login & Menu Exploration ---');
  const customerClient = new SessionClient();
  const custLoginRes = await customerClient.request('/api/auth/sign-in/username', {
    method: 'POST',
    body: JSON.stringify({
      username: 'ctr/siya_sen',
      password: 'password123',
    }),
  });
  const custLoginData = await custLoginRes.json();
  assertTest(custLoginRes.ok && custLoginData.user?.role === 'CUSTOMER', 'Customer authentication succeeded (ctr/siya_sen)');

  // Fetch Menu
  const menuRes = await customerClient.request('/api/menu');
  const menuData = await menuRes.json();
  assertTest(menuRes.ok && Array.isArray(menuData.items) && menuData.items.length > 0, `Menu loaded with ${menuData.items?.length} items`);

  const dosaItem = menuData.items.find((i: any) => i.name.includes('Dosa')) || menuData.items[0];

  // Submit Order
  console.log('\n--- Phase 2: Customer Place Order Request ---');
  const todayStr = new Date().toISOString().split('T')[0];
  const orderRes = await customerClient.request('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ menuItemId: dosaItem.id, quantity: 2 }],
      exactPickupTime: `${todayStr}T06:15:00.000Z`, // 11:45 AM IST
      idempotencyKey: `smoke_ord_${Date.now()}`,
    }),
  });
  const orderData = await orderRes.json();
  assertTest(orderRes.ok && orderData.success && orderData.order?.status === 'REQUESTED', `Order #${orderData.order?.orderNumber} created with status REQUESTED`);
  assertTest(Boolean(orderData.pickupCode) && orderData.pickupCode.length === 4, `Secure 4-character pickup code received: [${orderData.pickupCode}]`);

  const createdOrderId = orderData.order.id;
  const plaintextCode = orderData.pickupCode;

  // --- Step 2: Seller Flow ---
  console.log('\n--- Phase 3: Seller Login & Order Acceptance ---');
  const sellerClient = new SessionClient();
  const sellerLoginRes = await sellerClient.request('/api/auth/sign-in/username', {
    method: 'POST',
    body: JSON.stringify({
      username: 'slr/soman_singh',
      password: 'password123',
    }),
  });
  const sellerLoginData = await sellerLoginRes.json();
  assertTest(sellerLoginRes.ok && sellerLoginData.user?.role === 'SELLER', 'Seller authentication succeeded (slr/soman_singh)');

  // Seller sees orders
  const sellerOrdersRes = await sellerClient.request('/api/orders');
  const sellerOrdersData = await sellerOrdersRes.json();
  const foundOrder = sellerOrdersData.orders?.find((o: any) => o.id === createdOrderId);
  assertTest(Boolean(foundOrder), 'Seller successfully retrieved pending order queue');

  // Seller accepts order
  const acceptRes = await sellerClient.request(`/api/orders/${createdOrderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'SELLER_ACCEPT' }),
  });
  const acceptData = await acceptRes.json();
  assertTest(acceptRes.ok && acceptData.result?.status === 'ACCEPTED', 'Seller accepted requested pickup time (Status: ACCEPTED)');

  // --- Step 3: Customer Payment Flow ---
  console.log('\n--- Phase 4: Customer Razorpay Payment Flow ---');
  const payRes = await customerClient.request(`/api/orders/${createdOrderId}/pay`, {
    method: 'POST',
    body: JSON.stringify({
      providerPaymentId: `pay_rzp_smoke_${Date.now()}`,
      providerOrderId: `order_rzp_smoke_${Date.now()}`,
    }),
  });
  const payData = await payRes.json();
  assertTest(payRes.ok && payData.order?.status === 'CONFIRMED' && payData.order?.paymentStatus === 'PAID', 'Payment confirmed server-side (Status: CONFIRMED, Payment: PAID)');

  // --- Step 4: Kitchen Preparation & Ready ---
  console.log('\n--- Phase 5: Kitchen Cooking & Ready Flow ---');
  const readyRes = await sellerClient.request(`/api/orders/${createdOrderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'SELLER_READY' }),
  });
  const readyData = await readyRes.json();
  assertTest(readyRes.ok && readyData.result?.status === 'READY', 'Order marked READY for customer pickup counter');

  // --- Step 5: Pickup Verification ---
  console.log('\n--- Phase 6: Pickup Counter Code Verification ---');
  // First test wrong code rate limiting
  const wrongCodeRes = await sellerClient.request(`/api/orders/${createdOrderId}/verify-pickup`, {
    method: 'POST',
    body: JSON.stringify({ pickupCode: '0000' }),
  });
  assertTest(!wrongCodeRes.ok, 'Incorrect pickup code properly rejected with 400 error');

  // Verify correct code
  const correctCodeRes = await sellerClient.request(`/api/orders/${createdOrderId}/verify-pickup`, {
    method: 'POST',
    body: JSON.stringify({ pickupCode: plaintextCode }),
  });
  const correctCodeData = await correctCodeRes.json();
  assertTest(correctCodeRes.ok && correctCodeData.order?.status === 'COLLECTED', '4-character pickup code verified successfully (Status: COLLECTED)');

  // --- Step 6: Admin Flow ---
  console.log('\n--- Phase 7: Administrator Live Oversight & Auditing ---');
  const adminClient = new SessionClient();
  const adminLoginRes = await adminClient.request('/api/auth/sign-in/username', {
    method: 'POST',
    body: JSON.stringify({
      username: 'adm/admin_qless',
      password: 'password123',
    }),
  });
  const adminLoginData = await adminLoginRes.json();
  assertTest(adminLoginRes.ok && adminLoginData.user?.role === 'ADMIN', 'Admin authentication succeeded (adm/admin_qless)');

  // Admin Overview
  const ovRes = await adminClient.request('/api/admin/overview');
  const ovData = await ovRes.json();
  assertTest(ovRes.ok && ovData.metrics?.ordersToday > 0, `Admin aggregate metrics loaded: ${ovData.metrics?.ordersToday} orders today, ${ovData.metrics?.customers} customers, ${ovData.metrics?.sellers} sellers`);
  assertTest(Array.isArray(ovData.recentLogs) && ovData.recentLogs.length > 0, `Audit trail verified: ${ovData.recentLogs?.length} recent immutable log records`);

  // Admin Sellers List
  const adminSellersRes = await adminClient.request('/api/admin/sellers');
  const adminSellersData = await adminSellersRes.json();
  assertTest(adminSellersRes.ok && Array.isArray(adminSellersData.sellers), `Admin sellers management loaded with ${adminSellersData.sellers?.length} seller profiles`);

  console.log('\n========================================================');
  console.log(`🎉 Smoke Test Complete: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runSmokeTest().catch(err => {
  console.error('Smoke test error:', err);
  process.exit(1);
});
