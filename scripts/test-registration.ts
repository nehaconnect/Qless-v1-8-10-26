import 'dotenv/config';
import { auth } from '../src/lib/auth/auth';
import { db, user, customerProfiles, sellerProfiles } from '../src/lib/db';
import { eq, or } from 'drizzle-orm';
import assert from 'assert';

async function runRegistrationTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 QLess Registration & Username Validation Test Suite');
  console.log('🧪 ========================================================');

  const testCustomerUsername = 'ctr/aeonsom';
  const testCustomerEmail = 'aeonsom@ipcw.du.ac.in';
  const testSellerUsername = 'slr/test_seller_bakery';
  const testSellerEmail = 'seller_bakery@ipcw.du.ac.in';
  const testAdminUsername = 'adm/unauthorized_admin';

  // Cleanup any leftover test records from previous test runs
  await db.delete(user).where(
    or(
      eq(user.username, testCustomerUsername),
      eq(user.username, testSellerUsername),
      eq(user.email, testCustomerEmail),
      eq(user.email, testSellerEmail)
    )
  );

  console.log('\n--- Test 1: Register Customer with ctr/aeonsom ---');
  try {
    const customerSignUp = await auth.api.signUpEmail({
      body: {
        email: testCustomerEmail,
        password: 'password123',
        name: 'Aeon Som',
        username: testCustomerUsername,
        phoneNumber: '9876543210',
      }
    });

    assert(customerSignUp && customerSignUp.user, 'Customer signup returned user object');
    assert.strictEqual(customerSignUp.user.username, testCustomerUsername, 'Username matches ctr/aeonsom');
    console.log('✅ [PASS] Customer registration succeeded with username: ctr/aeonsom');

    // Verify DB user record
    const [dbCustomer] = await db.select().from(user).where(eq(user.username, testCustomerUsername));
    assert(dbCustomer, 'Database contains customer record');
    assert.strictEqual(dbCustomer.role, 'CUSTOMER', 'User role is CUSTOMER');
    console.log('✅ [PASS] Database persisted user with role=CUSTOMER and prefix ctr/');

    // Verify customer_profile auto-created
    const profile = await db.query.customerProfiles.findFirst({
      where: eq(customerProfiles.userId, dbCustomer.id)
    });
    assert(profile, 'Customer profile was created in customer_profiles table');
    console.log('✅ [PASS] customer_profiles row automatically created for new customer');

    // Test sign in with username
    const signInRes = await auth.api.signInUsername({
      body: {
        username: testCustomerUsername,
        password: 'password123',
      }
    });
    assert(signInRes && signInRes.user, 'Customer signed in successfully with ctr/aeonsom');
    console.log('✅ [PASS] Sign-in with ctr/aeonsom succeeded');
  } catch (err: any) {
    console.error('❌ [FAIL] Test 1 failed:', err);
    process.exit(1);
  }

  console.log('\n--- Test 2: Register Seller with slr/test_seller_bakery ---');
  try {
    const sellerSignUp = await auth.api.signUpEmail({
      body: {
        email: testSellerEmail,
        password: 'password123',
        name: 'Test Bakery Seller',
        username: testSellerUsername,
        phoneNumber: '9876543211',
      }
    });

    assert(sellerSignUp && sellerSignUp.user, 'Seller signup returned user object');
    assert.strictEqual(sellerSignUp.user.username, testSellerUsername, 'Username matches slr/test_seller_bakery');
    console.log('✅ [PASS] Seller registration succeeded with username: slr/test_seller_bakery');

    // Verify DB seller record
    const [dbSeller] = await db.select().from(user).where(eq(user.username, testSellerUsername));
    assert(dbSeller, 'Database contains seller record');
    assert.strictEqual(dbSeller.role, 'SELLER', 'User role is automatically assigned as SELLER');
    console.log('✅ [PASS] Database persisted user with role=SELLER and prefix slr/');

    // Verify seller_profile auto-created with PENDING status
    const sProfile = await db.query.sellerProfiles.findFirst({
      where: eq(sellerProfiles.userId, dbSeller.id)
    });
    assert(sProfile, 'Seller profile was created in seller_profiles table');
    assert.strictEqual(sProfile.approvalStatus, 'PENDING_APPROVAL', 'Seller approvalStatus is PENDING_APPROVAL awaiting admin approval');
    console.log('✅ [PASS] seller_profiles created with approvalStatus=PENDING_APPROVAL');
  } catch (err: any) {
    console.error('❌ [FAIL] Test 2 failed:', err);
    process.exit(1);
  }

  console.log('\n--- Test 3: Block Public Admin Registration (adm/...) ---');
  let adminBlocked = false;
  try {
    await auth.api.signUpEmail({
      body: {
        email: 'attacker@evil.com',
        password: 'password123',
        name: 'Fake Admin',
        username: testAdminUsername,
        phoneNumber: '9876543212',
      }
    });
  } catch (err: any) {
    adminBlocked = true;
    console.log('✅ [PASS] Public admin registration strictly blocked with error:', err.message || err);
  }
  assert(adminBlocked, 'Public registration with adm/ prefix must be blocked');

  console.log('\n--- Test 4: Verify Existing Seed Accounts Auth ---');
  try {
    const seedAdminSignIn = await auth.api.signInUsername({
      body: {
        username: 'adm/admin_qless',
        password: 'password123',
      }
    });
    assert(seedAdminSignIn && seedAdminSignIn.user, 'Existing admin sign-in succeeded');
    console.log('✅ [PASS] Existing admin adm/admin_qless authenticated cleanly');

    const seedSellerSignIn = await auth.api.signInUsername({
      body: {
        username: 'slr/soman_singh',
        password: 'password123',
      }
    });
    assert(seedSellerSignIn && seedSellerSignIn.user, 'Existing seller sign-in succeeded');
    console.log('✅ [PASS] Existing seller slr/soman_singh authenticated cleanly');

    const seedCustomerSignIn = await auth.api.signInUsername({
      body: {
        username: 'ctr/siya_sen',
        password: 'password123',
      }
    });
    assert(seedCustomerSignIn && seedCustomerSignIn.user, 'Existing customer sign-in succeeded');
    console.log('✅ [PASS] Existing customer ctr/siya_sen authenticated cleanly');
  } catch (err: any) {
    console.error('❌ [FAIL] Test 4 failed:', err);
    process.exit(1);
  }

  console.log('\n========================================================');
  console.log('🎉 All Registration & Authentication Tests Passed Successfully!');
  console.log('========================================================\n');
  process.exit(0);
}

runRegistrationTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
