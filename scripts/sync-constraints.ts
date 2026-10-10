import 'dotenv/config';
import { db } from '../src/lib/db';

async function main() {
  console.log('Updating database check constraints...');
  
  // 1. Drop existing constraints if present
  await db.execute(`ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_orders_status;`);
  await db.execute(`ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_orders_payment_status;`);
  
  // 2. Add updated status check constraint
  await db.execute(`
    ALTER TABLE orders ADD CONSTRAINT chk_orders_status 
    CHECK (status IN ('REQUESTED', 'TIME_CHANGE_PROPOSED', 'ACCEPTED', 'AWAITING_PAYMENT', 'PAYMENT_PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'READY_FOR_PICKUP', 'COLLECTED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'NO_SHOW', 'PAYMENT_FAILED'));
  `);

  // 3. Add updated payment status check constraint
  await db.execute(`
    ALTER TABLE orders ADD CONSTRAINT chk_orders_payment_status 
    CHECK (payment_status IN ('NOT_DUE', 'UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUND_PENDING', 'REFUNDED', 'EXPIRED'));
  `);

  // 4. Ensure daily_sequences table exists with sequence_date primary key
  await db.execute(`DROP TABLE IF EXISTS daily_sequences;`);
  await db.execute(`
    CREATE TABLE daily_sequences (
      sequence_date VARCHAR(20) PRIMARY KEY,
      current_val INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  `);

  console.log('✅ Check constraints and daily_sequences table synced successfully.');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
