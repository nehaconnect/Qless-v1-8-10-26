import 'dotenv/config';
import { db, pool, menuItems, menuCategories, canteens } from '../src/lib/db';
import { eq } from 'drizzle-orm';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function resetZumiCanteen() {
  const [zumiCanteen] = await db.select().from(canteens).where(eq(canteens.name, 'Zumi Canteen'));
  if (zumiCanteen) {
    await db.delete(menuItems).where(eq(menuItems.canteenId, zumiCanteen.id));
    await db.delete(menuCategories).where(eq(menuCategories.canteenId, zumiCanteen.id));
  }
}

class SessionClient {
  private cookies: string[] = [];

  async request(path: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers || {});
    if (this.cookies.length > 0) {
      headers.set('Cookie', this.cookies.join('; '));
    }
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const parts = setCookie.split(/,\s*(?=[a-zA-Z0-9_]+=)/);
      for (const p of parts) {
        const cookie = p.split(';')[0].trim();
        if (cookie) {
          const name = cookie.split('=')[0];
          this.cookies = this.cookies.filter(c => !c.startsWith(`${name}=`));
          this.cookies.push(cookie);
        }
      }
    }

    return res;
  }
}

async function runSellerIsolationTests() {
  console.log('🚀 ========================================================');
  console.log('🚀 QLess Multi-Seller Isolation & BOLA/IDOR Security Test');
  console.log('🚀 Target Base URL:', BASE_URL);
  console.log('🚀 ========================================================\n');

  // Reset Zumi workspace so each test run starts with a pristine empty state
  await resetZumiCanteen();

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

  // -------------------------------------------------------------
  // Test 1: Soman Singh Login & Seeded Workspace Verification
  // -------------------------------------------------------------
  console.log('--- Test 1: Soman Singh (slr/soman_singh) Seeded Workspace ---');
  const somanClient = new SessionClient();
  const somanLoginRes = await somanClient.request('/api/auth/sign-in/username', {
    method: 'POST',
    body: JSON.stringify({
      username: 'slr/soman_singh',
      password: 'password123',
    }),
  });
  const somanLoginText = await somanLoginRes.text();
  let somanLoginData: any = {};
  try { somanLoginData = JSON.parse(somanLoginText); } catch {
    console.error('Soman login parse error:', somanLoginRes.status, somanLoginText);
  }
  assertTest(somanLoginRes.ok && somanLoginData.user?.username === 'slr/soman_singh', 'Soman Singh authentication succeeded');

  // Fetch Soman's menu
  const somanMenuRes = await somanClient.request('/api/menu');
  const somanMenuData = await somanMenuRes.json();
  assertTest(
    somanMenuRes.ok && Array.isArray(somanMenuData.items) && somanMenuData.items.length >= 8,
    `Soman Singh sees seeded IP Canteen menu (${somanMenuData.items?.length} items)`
  );

  const somanItem = somanMenuData.items[0];

  // Fetch Soman's orders
  const somanOrdersRes = await somanClient.request('/api/orders');
  const somanOrdersData = await somanOrdersRes.json();
  assertTest(
    somanOrdersRes.ok && Array.isArray(somanOrdersData.orders) && somanOrdersData.orders.length > 0,
    `Soman Singh sees IP Canteen order queue (${somanOrdersData.orders?.length} orders)`
  );
  const somanOrder = somanOrdersData.orders[0];

  // Fetch Soman's batches
  const somanBatchesRes = await somanClient.request('/api/batches');
  const somanBatchesData = await somanBatchesRes.json();
  assertTest(
    somanBatchesRes.ok && Array.isArray(somanBatchesData.batches) && somanBatchesData.batches.length > 0,
    `Soman Singh sees IP Canteen batches (${somanBatchesData.batches?.length} batches)`
  );
  const somanBatch = somanBatchesData.batches[0];

  // -------------------------------------------------------------
  // Test 2: Zumi Nil Login & Fresh Empty Workspace Verification
  // -------------------------------------------------------------
  console.log('\n--- Test 2: Zumi Nil (slr/zumi_nil) Fresh Empty Workspace ---');
  const zumiClient = new SessionClient();
  const zumiLoginRes = await zumiClient.request('/api/auth/sign-in/username', {
    method: 'POST',
    body: JSON.stringify({
      username: 'slr/zumi_nil',
      password: 'password123',
    }),
  });
  const zumiLoginText = await zumiLoginRes.text();
  let zumiLoginData: any = {};
  try { zumiLoginData = JSON.parse(zumiLoginText); } catch {
    console.error('Zumi login parse error:', zumiLoginRes.status, zumiLoginText);
  }
  assertTest(zumiLoginRes.ok && zumiLoginData.user?.username === 'slr/zumi_nil', 'Zumi Nil authentication succeeded');

  // Verify Zumi starts with empty menu (NOT Soman's menu!)
  const zumiMenuRes = await zumiClient.request('/api/menu');
  const zumiMenuData = await zumiMenuRes.json();
  assertTest(
    zumiMenuRes.ok && Array.isArray(zumiMenuData.items) && zumiMenuData.items.length === 0,
    `Zumi Nil starts with completely empty menu (0 items - does NOT inherit Soman's data)`
  );

  // Verify Zumi starts with empty orders (NOT Soman's orders!)
  const zumiOrdersRes = await zumiClient.request('/api/orders');
  const zumiOrdersData = await zumiOrdersRes.json();
  assertTest(
    zumiOrdersRes.ok && Array.isArray(zumiOrdersData.orders) && zumiOrdersData.orders.length === 0,
    `Zumi Nil starts with completely empty order queue (0 orders - does NOT inherit Soman's orders)`
  );

  // Verify Zumi starts with empty batches
  const zumiBatchesRes = await zumiClient.request('/api/batches');
  const zumiBatchesData = await zumiBatchesRes.json();
  assertTest(
    zumiBatchesRes.ok && Array.isArray(zumiBatchesData.batches) && zumiBatchesData.batches.length === 0,
    `Zumi Nil starts with completely empty batches (0 batches)`
  );

  // -------------------------------------------------------------
  // Test 3: Zumi Nil Adds Menu Category & Custom Item
  // -------------------------------------------------------------
  console.log('\n--- Test 3: Zumi Nil Creates Menu Category & Item ---');
  const catCreateRes = await zumiClient.request('/api/menu/categories', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Zumi Specials',
      sortOrder: 1,
    }),
  });
  const catCreateData = await catCreateRes.json();
  assertTest(catCreateRes.ok && catCreateData.success, `Zumi created custom category: "${catCreateData.category?.name}"`);

  const zumiCatId = catCreateData.category?.id;

  const itemCreateRes = await zumiClient.request('/api/menu', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Zumi Cold Coffee',
      price: '60.00',
      categoryId: zumiCatId,
      description: 'Chilled rich coffee with chocolate drizzle',
      isVegetarian: true,
      isTodaysMenu: true,
      dailyCapacity: 40,
    }),
  });
  const itemCreateData = await itemCreateRes.json();
  assertTest(itemCreateRes.ok && itemCreateData.success, `Zumi created custom menu item: "${itemCreateData.item?.name}" (₹60.00)`);
  const zumiItem = itemCreateData.item;

  // -------------------------------------------------------------
  // Test 4: Mutual Isolation Verification (Soman vs Zumi)
  // -------------------------------------------------------------
  console.log('\n--- Test 4: Mutual Isolation (Soman cannot see Zumi, Zumi cannot see Soman) ---');
  // Soman checks menu
  const somanCheckMenuRes = await somanClient.request('/api/menu');
  const somanCheckMenuData = await somanCheckMenuRes.json();
  const somanSeesZumiItem = somanCheckMenuData.items.some((i: any) => i.id === zumiItem?.id);
  assertTest(!somanSeesZumiItem, 'Soman Singh CANNOT see Zumi\'s menu item in their workspace');

  // Zumi checks menu
  const zumiCheckMenuRes = await zumiClient.request('/api/menu');
  const zumiCheckMenuData = await zumiCheckMenuRes.json();
  const zumiSeesSomanItem = zumiCheckMenuData.items.some((i: any) => i.id === somanItem?.id);
  assertTest(!zumiSeesSomanItem, 'Zumi Nil CANNOT see Soman\'s menu item in their workspace');
  assertTest(zumiCheckMenuData.items.length === 1, 'Zumi Nil sees only their own 1 item');

  // -------------------------------------------------------------
  // Test 5: IDOR / BOLA Cross-Canteen Attack Prevention
  // -------------------------------------------------------------
  console.log('\n--- Test 5: IDOR / BOLA Cross-Canteen Mutation Prevention ---');

  // Attack 1: Zumi attempts to modify Soman's menu item price
  const attackItemRes = await zumiClient.request('/api/menu', {
    method: 'PATCH',
    body: JSON.stringify({
      itemId: somanItem?.id,
      price: '1.00',
    }),
  });
  assertTest(
    attackItemRes.status === 403,
    `IDOR Blocked: Zumi cannot edit Soman's menu item (HTTP ${attackItemRes.status})`
  );

  // Attack 2: Zumi attempts to accept/reject Soman's order
  if (somanOrder) {
    const attackOrderRes = await zumiClient.request(`/api/orders/${somanOrder.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'SELLER_ACCEPT' }),
    });
    assertTest(
      attackOrderRes.status === 403,
      `BOLA Blocked: Zumi cannot accept Soman's order (HTTP ${attackOrderRes.status})`
    );

    // Attack 3: Zumi attempts to view Soman's order details
    const attackGetOrderRes = await zumiClient.request(`/api/orders/${somanOrder.id}`);
    assertTest(
      attackGetOrderRes.status === 403,
      `BOLA Blocked: Zumi cannot view Soman's order details (HTTP ${attackGetOrderRes.status})`
    );

    // Attack 4: Zumi attempts to verify pickup code on Soman's order
    const attackVerifyRes = await zumiClient.request(`/api/orders/${somanOrder.id}/verify-pickup`, {
      method: 'POST',
      body: JSON.stringify({ pickupCode: 'ABCD' }),
    });
    assertTest(
      attackVerifyRes.status === 403,
      `BOLA Blocked: Zumi cannot verify pickup code on Soman's order (HTTP ${attackVerifyRes.status})`
    );
  }

  // Attack 5: Zumi attempts to modify Soman's batch capacity
  if (somanBatch) {
    const attackBatchRes = await zumiClient.request('/api/batches', {
      method: 'PATCH',
      body: JSON.stringify({
        batchId: somanBatch.id,
        newCapacity: 100,
      }),
    });
    assertTest(
      attackBatchRes.status === 403 || !attackBatchRes.ok,
      `BOLA Blocked: Zumi cannot modify Soman's batch capacity (HTTP ${attackBatchRes.status})`
    );
  }

  // -------------------------------------------------------------
  // Test 6: Admin Live Oversight Across Multiple Canteens
  // -------------------------------------------------------------
  console.log('\n--- Test 6: Administrator Global Oversight ---');
  const adminClient = new SessionClient();
  const adminLoginRes = await adminClient.request('/api/auth/sign-in/username', {
    method: 'POST',
    body: JSON.stringify({
      username: 'adm/admin_qless',
      password: 'password123',
    }),
  });
  const adminLoginData = await adminLoginRes.json();
  assertTest(adminLoginRes.ok && adminLoginData.user?.role === 'ADMIN', 'Admin authentication succeeded');

  const adminSellersRes = await adminClient.request('/api/admin/sellers');
  const adminSellersData = await adminSellersRes.json();
  const sellerUsernames = adminSellersData.sellers?.map((s: any) => s.username) || [];
  assertTest(
    sellerUsernames.includes('slr/soman_singh') && sellerUsernames.includes('slr/zumi_nil'),
    `Admin sees both independent sellers: ${sellerUsernames.join(', ')}`
  );

  // Leave Zumi workspace completely clean and fresh for manual testing
  await resetZumiCanteen();
  await pool.end();

  console.log('\n========================================================');
  console.log(`🎉 Seller Isolation Tests: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSellerIsolationTests().catch(async (err) => {
  console.error('Test execution error:', err);
  try { await pool.end(); } catch {}
  process.exit(1);
});
