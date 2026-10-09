import 'dotenv/config';
import { db } from '../src/lib/db';

async function main() {
  const canteens = await db.execute('SELECT id, name, operating_status, is_active FROM canteens');
  console.log('Canteens in DB:', canteens.rows);

  const sellers = await db.execute(`
    SELECT sp.id, sp.canteen_id, sp.approval_status, u.username, u.name, c.name as canteen_name
    FROM seller_profiles sp
    JOIN "user" u ON sp.user_id = u.id
    LEFT JOIN canteens c ON sp.canteen_id = c.id
  `);
  console.log('Sellers in DB:', sellers.rows);

  const users = await db.execute(`SELECT id, name, username, email, role, is_active FROM "user"`);
  console.log('Users in DB:', users.rows);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
