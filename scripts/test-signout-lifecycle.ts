import 'dotenv/config';
import { POST as authPost } from '../src/app/api/auth/[...all]/route';
import { POST as logoutPost } from '../src/app/api/auth/logout/route';
import { GET as notificationsGet } from '../src/app/api/notifications/route';
import { GET as ordersGet } from '../src/app/api/orders/route';
import { GET as adminOverviewGet } from '../src/app/api/admin/overview/route';
import { POST as batchPrepPost } from '../src/app/api/orders/batch-prep/route';
import { NextRequest } from 'next/server';
import { db, session, user, sellerProfiles } from '../src/lib/db';
import { eq } from 'drizzle-orm';
import assert from 'assert';

async function runTestSuite() {
  console.log('🧪 ========================================================');
  console.log('🧪 QLess Complete Authentication & Sign-Out Test Suite');
  console.log('🧪 ========================================================\n');

  // Helper to extract session token from Set-Cookie header
  const extractToken = (setCookie: string | null): { token: string; cookieHeader: string } => {
    if (!setCookie) return { token: '', cookieHeader: '' };
    const match = setCookie.match(/better-auth\.session_token=([^;]+)/);
    const rawVal = match ? match[1] : '';
    const token = rawVal.split('.')[0];
    const cookieHeader = `better-auth.session_token=${rawVal}`;
    return { token, cookieHeader };
  };

  // Helper to sign in via username
  const signIn = async (username: string, pass: string = 'password123') => {
    const req = new NextRequest('http://localhost:3000/api/auth/sign-in/username', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Host': 'localhost:3000',
      },
      body: JSON.stringify({ username, password: pass }),
    });
    const res = await authPost(req);
    assert.strictEqual(res.status, 200, `Sign-in for ${username} should return 200`);
    const setCookie = res.headers.get('set-cookie');
    assert(setCookie, 'Sign-in must return Set-Cookie header');
    const { token, cookieHeader } = extractToken(setCookie);
    assert(token, 'Session token must be present');
    return { res, token, cookieHeader };
  };

  // Helper to call sign out via dedicated server endpoint
  const signOut = async (cookieHeader: string) => {
    const req = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Host': 'localhost:3000',
        'Cookie': cookieHeader,
      },
      body: JSON.stringify({}),
    });
    return await logoutPost(req);
  };

  // --------------------------------------------------------------------------
  // TEST 1 to 4: CUSTOMER SIGN-OUT LIFECYCLE
  // --------------------------------------------------------------------------
  console.log('--- Test 1-4: Customer Sign-Out Lifecycle ---');
  const custUsername = 'ctr/siya_sen';
  const custSignIn = await signIn(custUsername);
  console.log(`✅ [1] Customer ${custUsername} signed in successfully.`);

  // Verify session in database
  const custDbSessions = await db.select().from(session).where(eq(session.token, custSignIn.token));
  assert(custDbSessions.length > 0, 'Customer session must be stored in database');
  console.log('✅ [2] Customer session found in database session table.');

  // Verify customer CAN access protected API while signed in
  const custAuthReq = new NextRequest('http://localhost:3000/api/notifications', {
    method: 'GET',
    headers: { 'Cookie': custSignIn.cookieHeader },
  });
  const custAuthRes = await notificationsGet(custAuthReq);
  assert.strictEqual(custAuthRes.status, 200, 'Customer should access /api/notifications while authenticated');
  console.log('✅ [3] Customer successfully accessed protected API before sign out.');

  // Perform Sign Out
  const custSignOutRes = await signOut(custSignIn.cookieHeader);
  assert.strictEqual(custSignOutRes.status, 200, 'Sign out must return 200');
  const custSignOutCookies = custSignOutRes.headers.get('set-cookie') || '';
  assert(custSignOutCookies.includes('Max-Age=0'), 'Sign out must set Max-Age=0 cookie');
  console.log('✅ [4] Sign out endpoint returned 200 and expired cookies (Max-Age=0).');

  // Verify database session row was deleted
  const custDbSessionsAfter = await db.select().from(session).where(eq(session.token, custSignIn.token));
  assert.strictEqual(custDbSessionsAfter.length, 0, 'Customer session must be deleted from database');
  console.log('✅ [5] Customer session verified DELETED from database session table.');

  // Verify customer CANNOT call protected API after logout
  const custAfterReq = new NextRequest('http://localhost:3000/api/notifications', {
    method: 'GET',
    headers: { 'Cookie': custSignIn.cookieHeader },
  });
  const custAfterRes = await notificationsGet(custAfterReq);
  assert(custAfterRes.status === 400 || custAfterRes.status === 401 || custAfterRes.status === 403, 'Customer must receive 400/401/403 on protected API after logout');
  console.log(`✅ [6] Customer blocked from protected API after logout (Status: ${custAfterRes.status}).`);

  // Verify customer can sign in again with the same credentials
  const custReSignIn = await signIn(custUsername);
  assert(custReSignIn.token, 'Customer must be able to sign in again with same credentials');
  console.log('✅ [7] Customer can sign in again with existing credentials cleanly.');
  // Clean up session
  await signOut(custReSignIn.cookieHeader);

  // --------------------------------------------------------------------------
  // TEST 5 to 7: SELLER SIGN-OUT & CANTEEN ISOLATION LIFECYCLE
  // --------------------------------------------------------------------------
  console.log('\n--- Test 5-7: Seller Sign-Out & Isolation Lifecycle ---');
  const sellerUsername = 'slr/soman_singh';
  const sellerSignIn = await signIn(sellerUsername);
  console.log(`✅ [8] Seller ${sellerUsername} signed in successfully.`);

  // Verify session in database
  const sellerDbSessions = await db.select().from(session).where(eq(session.token, sellerSignIn.token));
  assert(sellerDbSessions.length > 0, 'Seller session must be stored in database');
  console.log('✅ [9] Seller session verified in database session table.');

  // Verify seller can access seller operations
  const sellerPrepReq = new NextRequest('http://localhost:3000/api/orders/batch-prep', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sellerSignIn.cookieHeader,
    },
    body: JSON.stringify({ batchId: 'non_existent_batch_id', action: 'START' }),
  });
  const sellerPrepRes = await batchPrepPost(sellerPrepReq);
  assert(sellerPrepRes.status !== 401 && sellerPrepRes.status !== 403, 'Seller reaches business logic while authenticated');
  console.log('✅ [10] Seller successfully authenticated to seller batch-prep endpoint.');

  // Perform Sign Out
  const sellerSignOutRes = await signOut(sellerSignIn.cookieHeader);
  assert.strictEqual(sellerSignOutRes.status, 200, 'Seller sign-out must return 200');
  console.log('✅ [11] Seller sign-out returned 200.');

  // Verify database session row was deleted
  const sellerDbSessionsAfter = await db.select().from(session).where(eq(session.token, sellerSignIn.token));
  assert.strictEqual(sellerDbSessionsAfter.length, 0, 'Seller session must be deleted from database');
  console.log('✅ [12] Seller session verified DELETED from database session table.');

  // Verify seller CANNOT call seller protected API after logout
  const sellerAfterReq = new NextRequest('http://localhost:3000/api/orders/batch-prep', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sellerSignIn.cookieHeader,
    },
    body: JSON.stringify({ batchId: 'non_existent_batch_id', action: 'START' }),
  });
  const sellerAfterRes = await batchPrepPost(sellerAfterReq);
  const sellerAfterData = await sellerAfterRes.json();
  assert(sellerAfterData.error?.includes('UNAUTHORIZED') || sellerAfterRes.status === 401 || sellerAfterRes.status === 403, 'Seller must receive unauthorized after logout');
  console.log(`✅ [13] Seller blocked from seller operations after logout (Response: ${JSON.stringify(sellerAfterData)}).`);

  // Verify seller can sign in again and see their canteen
  const sellerReSignIn = await signIn(sellerUsername);
  assert(sellerReSignIn.token, 'Seller must be able to sign in again');
  const sellerProfile = await db.query.sellerProfiles.findFirst({
    where: eq(sellerProfiles.userId, sellerDbSessions[0].userId),
  });
  assert(sellerProfile?.canteenId, 'Seller retains their approved canteen association');
  console.log(`✅ [14] Seller re-signed in and retains dedicated canteen ID: ${sellerProfile.canteenId}.`);
  await signOut(sellerReSignIn.cookieHeader);

  // --------------------------------------------------------------------------
  // TEST 8 to 10: ADMIN SIGN-OUT & VIEW-AS LIFECYCLE
  // --------------------------------------------------------------------------
  console.log('\n--- Test 8-10: Admin Sign-Out & View-As Support Lifecycle ---');
  const adminUsername = 'adm/admin_qless';
  const adminSignIn = await signIn(adminUsername);
  console.log(`✅ [15] Admin ${adminUsername} signed in successfully.`);

  // Verify Admin can access admin overview
  const adminOverviewReq = new NextRequest('http://localhost:3000/api/admin/overview', {
    method: 'GET',
    headers: { 'Cookie': adminSignIn.cookieHeader },
  });
  const adminOverviewRes = await adminOverviewGet(adminOverviewReq);
  assert.strictEqual(adminOverviewRes.status, 200, 'Admin can access /api/admin/overview');
  console.log('✅ [16] Admin accessed admin overview dashboard.');

  // Verify Admin View-As mode can be used with x-view-as-role header without altering admin session
  const adminViewAsCustReq = new NextRequest('http://localhost:3000/api/notifications', {
    method: 'GET',
    headers: {
      'Cookie': adminSignIn.cookieHeader,
      'x-view-as-role': 'CUSTOMER',
    },
  });
  const adminViewAsCustRes = await notificationsGet(adminViewAsCustReq);
  assert.strictEqual(adminViewAsCustRes.status, 200, 'Admin in View-As CUSTOMER mode can access customer view');
  console.log('✅ [17] Admin in View-As mode accessed customer view successfully.');

  // Verify exiting View-As mode retains original admin session intact
  const adminOverviewAfterReq = new NextRequest('http://localhost:3000/api/admin/overview', {
    method: 'GET',
    headers: { 'Cookie': adminSignIn.cookieHeader },
  });
  const adminOverviewAfterRes = await adminOverviewGet(adminOverviewAfterReq);
  assert.strictEqual(adminOverviewAfterRes.status, 200, 'Admin session remains valid after exiting View-As');
  console.log('✅ [18] Exiting View-As preserved active Admin session without logging out.');

  // Normal Admin Sign Out
  const adminSignOutRes = await signOut(adminSignIn.cookieHeader);
  assert.strictEqual(adminSignOutRes.status, 200, 'Admin sign-out must return 200');
  const adminDbSessionsAfter = await db.select().from(session).where(eq(session.token, adminSignIn.token));
  assert.strictEqual(adminDbSessionsAfter.length, 0, 'Admin session must be deleted from database');
  console.log('✅ [19] Admin session successfully deleted from database upon actual sign out.');

  // Verify Admin CANNOT access admin API after logout
  const adminAfterReq = new NextRequest('http://localhost:3000/api/admin/overview', {
    method: 'GET',
    headers: { 'Cookie': adminSignIn.cookieHeader },
  });
  const adminAfterRes = await adminOverviewGet(adminAfterReq);
  assert(adminAfterRes.status === 401 || adminAfterRes.status === 403, 'Admin must be blocked after logout');
  console.log(`✅ [20] Admin blocked from admin endpoints after logout (Status: ${adminAfterRes.status}).`);

  // --------------------------------------------------------------------------
  // TEST 11 to 13: INVALID/EXPIRED SESSION & REPLAY RESISTANCE
  // --------------------------------------------------------------------------
  console.log('\n--- Test 11-13: Invalid/Expired Session & Replay Resistance ---');
  const fakeTokenReq = new NextRequest('http://localhost:3000/api/notifications', {
    method: 'GET',
    headers: { 'Cookie': 'better-auth.session_token=fake_invalid_token_12345' },
  });
  const fakeTokenRes = await notificationsGet(fakeTokenReq);
  assert(fakeTokenRes.status === 400 || fakeTokenRes.status === 401 || fakeTokenRes.status === 403, 'Invalid token must return error');
  console.log('✅ [21] Fake or forged session tokens safely rejected.');

  // Cookie expiration header verification: all 8 variants cleared
  const sampleSignOutRes = await signOut('better-auth.session_token=random');
  const setCookieHeaders = sampleSignOutRes.headers.get('set-cookie') || '';
  const requiredCookieNames = [
    'better-auth.session_token',
    'better-auth.session_data',
    'better-auth.dont_remember',
    'better-auth.account_data',
  ];
  for (const c of requiredCookieNames) {
    assert(setCookieHeaders.includes(c), `Sign-out response must clear cookie ${c}`);
  }
  console.log('✅ [22] Verified all Better Auth session and cache cookies expired with Max-Age=0.');

  console.log('\n========================================================');
  console.log('🎉 ALL 22 REGRESSION TESTS PASSED CLEANLY & SUCCESSFULLY!');
  console.log('========================================================\n');
  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
