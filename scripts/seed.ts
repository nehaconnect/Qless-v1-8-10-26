import { db, colleges, canteens, user, account, customerProfiles, sellerProfiles, menuCategories, menuItems, pickupBatches } from '../src/lib/db';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

import { hashPassword } from 'better-auth/crypto';

async function seed() {
  console.log('🌱 Starting QLess database seeding...');

  // 1. College: IPCW
  let [ipcw] = await db.select().from(colleges).where(eq(colleges.code, 'IPCW')).limit(1);
  if (!ipcw) {
    [ipcw] = await db.insert(colleges).values({
      code: 'IPCW',
      name: 'Indraprastha College for Women',
      address: '31, Sham Nath Marg, Civil Lines, Delhi, 110054',
      isActive: true,
    }).returning();
    console.log('✓ Created College: IPCW');
  }

  // 2. Canteen: IP Canteen
  let [ipCanteen] = await db.select().from(canteens).where(eq(canteens.name, 'IP Canteen')).limit(1);
  if (!ipCanteen) {
    [ipCanteen] = await db.insert(canteens).values({
      collegeId: ipcw.id,
      name: 'IP Canteen',
      location: 'Near Auditorium Ground, Main Campus',
      operatingStatus: 'OPEN',
      openingTime: '08:00:00',
      closingTime: '17:00:00',
      defaultBatchCapacity: 15,
      upiId: 'ipcanteen@upi',
      phone: '9876543210',
      isActive: true,
    }).returning();
    console.log('✓ Created Canteen: IP Canteen');
  }

  // 3. Admin Account: adm/admin_qless
  let [adminUser] = await db.select().from(user).where(eq(user.username, 'adm/admin_qless')).limit(1);
  if (!adminUser) {
    const adminId = 'usr_admin_' + crypto.randomBytes(4).toString('hex');
    [adminUser] = await db.insert(user).values({
      id: adminId,
      name: 'Campus Administrator',
      email: 'admin@ipcw.du.ac.in',
      username: 'adm/admin_qless',
      phoneNumber: '9999900001',
      phoneNumberVerified: true,
      emailVerified: true,
      role: 'ADMIN',
      isActive: true,
    }).returning();

    await db.insert(account).values({
      id: 'acc_' + crypto.randomBytes(6).toString('hex'),
      accountId: adminUser.id,
      providerId: 'credential',
      userId: adminUser.id,
      password: await hashPassword('password123'),
    });
    console.log('✓ Created Admin: adm/admin_qless');
  }

  // 4. Approved Seller: slr/soman_singh
  let [sellerUser] = await db.select().from(user).where(eq(user.username, 'slr/soman_singh')).limit(1);
  if (!sellerUser) {
    const sellerId = 'usr_seller_' + crypto.randomBytes(4).toString('hex');
    [sellerUser] = await db.insert(user).values({
      id: sellerId,
      name: 'Soman Singh',
      email: 'soman@canteen.du.ac.in',
      username: 'slr/soman_singh',
      phoneNumber: '9811122233',
      phoneNumberVerified: true,
      emailVerified: true,
      role: 'SELLER',
      isActive: true,
    }).returning();

    await db.insert(account).values({
      id: 'acc_' + crypto.randomBytes(6).toString('hex'),
      accountId: sellerUser.id,
      providerId: 'credential',
      userId: sellerUser.id,
      password: await hashPassword('password123'),
    });

    await db.insert(sellerProfiles).values({
      userId: sellerUser.id,
      canteenId: ipCanteen.id,
      approvalStatus: 'APPROVED',
      approvedByAdminId: adminUser.id,
      approvedAt: new Date(),
    });
    console.log('✓ Created Approved Seller: slr/soman_singh');
  }

  // 5. Test Customer: ctr/siya_sen
  let [customerUser] = await db.select().from(user).where(eq(user.username, 'ctr/siya_sen')).limit(1);
  if (!customerUser) {
    const custId = 'usr_cust_' + crypto.randomBytes(4).toString('hex');
    [customerUser] = await db.insert(user).values({
      id: custId,
      name: 'Siya Sen',
      email: 'siya@ipcw.du.ac.in',
      username: 'ctr/siya_sen',
      phoneNumber: '9876500001',
      phoneNumberVerified: true,
      emailVerified: true,
      role: 'CUSTOMER',
      isActive: true,
    }).returning();

    await db.insert(account).values({
      id: 'acc_' + crypto.randomBytes(6).toString('hex'),
      accountId: customerUser.id,
      providerId: 'credential',
      userId: customerUser.id,
      password: await hashPassword('password123'),
    });

    await db.insert(customerProfiles).values({
      userId: customerUser.id,
      collegeId: ipcw.id,
      defaultCanteenId: ipCanteen.id,
    });
    console.log('✓ Created Customer: ctr/siya_sen');
  }

  // 6. Menu Categories
  const categoriesList = [
    { name: 'South Indian', sort: 1 },
    { name: 'Snacks & Quick Bites', sort: 2 },
    { name: 'Beverages', sort: 3 },
    { name: 'Meals & Thali', sort: 4 }
  ];

  const catMap = new Map<string, string>();
  for (const c of categoriesList) {
    let [existingCat] = await db.select().from(menuCategories).where(eq(menuCategories.name, c.name)).limit(1);
    if (!existingCat) {
      [existingCat] = await db.insert(menuCategories).values({
        canteenId: ipCanteen.id,
        name: c.name,
        sortOrder: c.sort,
        isActive: true,
      }).returning();
    }
    catMap.set(c.name, existingCat.id);
  }
  console.log('✓ Created Menu Categories');

  // 7. Menu Items
  const itemsList = [
    { name: 'Masala Dosa', cat: 'South Indian', price: '60.00', desc: 'Crispy rice crepe filled with spiced potato masala, served with sambar and coconut chutney', veg: true, today: true },
    { name: 'Idli Sambar (2 pcs)', cat: 'South Indian', price: '45.00', desc: 'Steamed fluffy rice cakes served with hot lentil sambar and fresh chutney', veg: true, today: true },
    { name: 'Samosa (2 pcs)', cat: 'Snacks & Quick Bites', price: '25.00', desc: 'Golden crispy pastry stuffed with spicy potato and pea filling, with mint chutney', veg: true, today: true },
    { name: 'Grilled Veg Sandwich', cat: 'Snacks & Quick Bites', price: '40.00', desc: 'Toasted bread with fresh cucumber, tomato, potato, green chutney and cheese', veg: true, today: true },
    { name: 'Special Masala Chai', cat: 'Beverages', price: '15.00', desc: 'Freshly brewed aromatic milk tea infused with ginger, cardamom, and clove', veg: true, today: true },
    { name: 'Cold Coffee with Ice Cream', cat: 'Beverages', price: '45.00', desc: 'Rich blended iced coffee topped with a scoop of vanilla ice cream', veg: true, today: true },
    { name: 'Chole Bhature (2 pcs)', cat: 'Meals & Thali', price: '70.00', desc: 'Fluffy fried bhature served with spiced Punjabi chickpea curry and onion salad', veg: true, today: false },
    { name: 'Rajma Chawal Box', cat: 'Meals & Thali', price: '65.00', desc: 'Steaming basmati rice served with slow-cooked red kidney bean curry', veg: true, today: true },
  ];

  for (const item of itemsList) {
    const catId = catMap.get(item.cat)!;
    const [existingItem] = await db.select().from(menuItems).where(eq(menuItems.name, item.name)).limit(1);
    if (!existingItem) {
      await db.insert(menuItems).values({
        canteenId: ipCanteen.id,
        categoryId: catId,
        name: item.name,
        description: item.desc,
        price: item.price,
        isVegetarian: item.veg,
        isAvailable: true,
        isTodaysMenu: item.today,
        dailyCapacity: 50,
        currentStock: 50,
      });
    }
  }
  console.log('✓ Created Menu Items');

  // 8. 15-Minute Continuous Preparation Batches for Today
  const todayStr = new Date().toISOString().split('T')[0];
  console.log(`✓ Initializing 15-minute continuous batches for date: ${todayStr}...`);

  for (let hour = 8; hour < 17; hour++) {
    for (let min of [0, 15, 30, 45]) {
      const nextHour = min === 45 ? hour + 1 : hour;
      const nextMin = min === 45 ? 0 : min + 15;

      const pad = (n: number) => n.toString().padStart(2, '0');
      const startTime = `${pad(hour)}:${pad(min)}:00`;
      const endTime = `${pad(nextHour)}:${pad(nextMin)}:00`;
      
      const formatTimeLabel = (h: number, m: number) => {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 === 0 ? 12 : h % 12;
        return `${displayH}:${pad(m)}`;
      };
      const label = `${formatTimeLabel(hour, min)}–${formatTimeLabel(nextHour, nextMin)}`;

      const [existingBatch] = await db.select().from(pickupBatches)
        .where(and(
          eq(pickupBatches.canteenId, ipCanteen.id),
          eq(pickupBatches.batchDate, todayStr),
          eq(pickupBatches.startTime, startTime)
        ))
        .limit(1);

      if (!existingBatch) {
        await db.insert(pickupBatches).values({
          canteenId: ipCanteen.id,
          batchDate: todayStr,
          startTime,
          endTime,
          displayLabel: label,
          capacity: 15,
          reservedCount: 0,
          status: 'UPCOMING',
        });
      }
    }
  }
  console.log('✓ Successfully generated all 15-minute preparation batches for today!');
  console.log('✨ Seeding complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
