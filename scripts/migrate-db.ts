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

  console.log('🎉 Migrations successfully applied!');
}

migrate()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  });
