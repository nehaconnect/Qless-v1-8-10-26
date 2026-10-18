import 'dotenv/config';
import { db } from '../src/lib/db';

async function migrate() {
  console.log('Running database migrations for QLess...');

  // 1. Add manual override columns to canteens
  await db.execute(`
    ALTER TABLE canteens 
    ADD COLUMN IF NOT EXISTS manual_override_status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS manual_override_date VARCHAR(20);
  `);
  console.log('✓ Added manual override columns to canteens table');

  // 2. Add encrypted_code column to pickup_codes
  await db.execute(`
    ALTER TABLE pickup_codes 
    ADD COLUMN IF NOT EXISTS encrypted_code TEXT;
  `);
  console.log('✓ Added encrypted_code column to pickup_codes table');

  // 3. Make menu_items price nullable for "Price not fixed" items
  await db.execute(`
    ALTER TABLE menu_items 
    ALTER COLUMN price DROP NOT NULL;
  `);
  console.log('✓ Made menu_items.price nullable');

  // 4. Ensure partial unique index on approved sellers per canteen
  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS uidx_canteen_approved_seller 
    ON seller_profiles (canteen_id) 
    WHERE approval_status = 'APPROVED';
  `);
  console.log('✓ Added unique constraint: uidx_canteen_approved_seller');

  // 5. Seller Application Additive Columns & Nullable canteen_id
  await db.execute(`
    ALTER TABLE seller_profiles 
    ALTER COLUMN canteen_id DROP NOT NULL;

    ALTER TABLE seller_profiles 
    ADD COLUMN IF NOT EXISTS business_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS business_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES colleges(id),
    ADD COLUMN IF NOT EXISTS outlet_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS outlet_location VARCHAR(255),
    ADD COLUMN IF NOT EXISTS outlet_city VARCHAR(100),
    ADD COLUMN IF NOT EXISTS opening_time TIME,
    ADD COLUMN IF NOT EXISTS closing_time TIME,
    ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS declaration_confirmed BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS email_verification_status VARCHAR(50) DEFAULT 'PENDING_ADMIN_VERIFICATION',
    ADD COLUMN IF NOT EXISTS phone_verification_status VARCHAR(50) DEFAULT 'PENDING_ADMIN_VERIFICATION';

    ALTER TABLE seller_profiles DROP CONSTRAINT IF EXISTS chk_seller_approval_status;
    ALTER TABLE seller_profiles ADD CONSTRAINT chk_seller_approval_status 
      CHECK (approval_status IN ('PENDING_APPROVAL', 'PENDING_CONTACT_VERIFICATION', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'DEACTIVATED'));

    UPDATE seller_profiles
    SET business_name = COALESCE(business_name, 'IP Canteen'),
        outlet_name = COALESCE(outlet_name, 'IP Canteen'),
        outlet_location = COALESCE(outlet_location, 'Near Auditorium Ground, Main Campus'),
        outlet_city = COALESCE(outlet_city, 'Delhi'),
        email_verification_status = COALESCE(email_verification_status, 'VERIFIED_BY_ADMIN'),
        phone_verification_status = COALESCE(phone_verification_status, 'VERIFIED_BY_ADMIN'),
        declaration_confirmed = true
    WHERE user_id = 'usr_seller_956ba98a';
  `);
  console.log('✓ Added seller application columns & updated status constraints');

  console.log('🎉 Migrations successfully applied!');
}

migrate()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  });
