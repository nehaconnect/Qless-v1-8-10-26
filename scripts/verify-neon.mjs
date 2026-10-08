import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name != '__drizzle_migrations'
    ORDER BY table_name;
  `);

  const tables = tablesRes.rows.map(r => r.table_name);
  console.log(`LIVE_TABLES_COUNT: ${tables.length}`);
  console.log('LIVE_TABLES:', JSON.stringify(tables));

  const fks = await client.query(`
    SELECT count(*) as count
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';
  `);
  console.log(`FOREIGN_KEYS_COUNT: ${fks.rows[0].count}`);

  const checks = await client.query(`
    SELECT count(*) as count
    FROM information_schema.table_constraints
    WHERE constraint_type = 'CHECK' AND table_schema = 'public';
  `);
  console.log(`CHECK_CONSTRAINTS_COUNT: ${checks.rows[0].count}`);

  await client.end();
}

main().catch(err => {
  console.error('Verification failed:', err.message);
  process.exit(1);
});
