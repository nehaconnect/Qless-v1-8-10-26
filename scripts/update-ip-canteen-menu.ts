import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db, menuItems, menuCategories, canteens, user, pool } from '../src/lib/db';
import { eq, and, sql, notInArray } from 'drizzle-orm';

interface TargetItem {
  name: string;
  price: string | null;
  isAvailable: boolean;
  isTodaysMenu: boolean;
  categoryName: string;
}

const TARGET_25_ITEMS: TargetItem[] = [
  { name: 'Tea', price: '10.00', isAvailable: true, isTodaysMenu: true, categoryName: 'Beverages' },
  { name: 'Coffee', price: '20.00', isAvailable: true, isTodaysMenu: true, categoryName: 'Beverages' },
  { name: 'Black Coffee', price: '15.00', isAvailable: true, isTodaysMenu: true, categoryName: 'Beverages' },
  { name: 'Green Tea', price: '15.00', isAvailable: true, isTodaysMenu: true, categoryName: 'Beverages' },
  { name: 'Poha', price: '40.00', isAvailable: true, isTodaysMenu: true, categoryName: 'Snacks' },
  { name: 'Samosa', price: '15.00', isAvailable: true, isTodaysMenu: true, categoryName: 'Snacks' },
  { name: 'Chole Samosa', price: '25.00', isAvailable: true, isTodaysMenu: true, categoryName: 'Snacks' },
  { name: 'Idli Sambar', price: '50.00', isAvailable: true, isTodaysMenu: true, categoryName: 'South Indian' },
  { name: 'Veg Noodles', price: '50.00', isAvailable: true, isTodaysMenu: true, categoryName: 'Chinese' },
  { name: 'Red Sauce Pasta', price: '80.00', isAvailable: true, isTodaysMenu: true, categoryName: 'Continental' },
  { name: 'White Sauce Pasta', price: '80.00', isAvailable: true, isTodaysMenu: false, categoryName: 'Continental' },
  { name: 'Chole Rice', price: '40.00', isAvailable: true, isTodaysMenu: true, categoryName: 'Meals' },
  { name: 'Dal Rice', price: '40.00', isAvailable: true, isTodaysMenu: true, categoryName: 'Meals' },
  { name: 'Rajma Rice', price: '40.00', isAvailable: true, isTodaysMenu: true, categoryName: 'Meals' },
  { name: 'Veg Fried Rice', price: '50.00', isAvailable: true, isTodaysMenu: false, categoryName: 'Meals' },
  { name: 'Curd Rice', price: '50.00', isAvailable: false, isTodaysMenu: false, categoryName: 'Meals' },
  { name: 'Lemon Rice + Sambar', price: null, isAvailable: false, isTodaysMenu: false, categoryName: 'South Indian' },
  { name: 'Macaroni', price: '60.00', isAvailable: false, isTodaysMenu: false, categoryName: 'Continental' },
  { name: 'Veg Grilled Sandwich', price: '15.00', isAvailable: true, isTodaysMenu: true, categoryName: 'Snacks' },
  { name: 'Bread Pakora', price: '20.00', isAvailable: false, isTodaysMenu: false, categoryName: 'Snacks' },
  { name: 'Kachori + Sabji', price: '50.00', isAvailable: false, isTodaysMenu: false, categoryName: 'Snacks' },
  { name: 'Puri', price: '50.00', isAvailable: false, isTodaysMenu: false, categoryName: 'Meals' },
  { name: 'Cold Coffee', price: '60.00', isAvailable: true, isTodaysMenu: true, categoryName: 'Beverages' },
  { name: 'Juices and Shakes', price: '60.00', isAvailable: true, isTodaysMenu: true, categoryName: 'Beverages' },
  { name: 'Sweet Corn Salad', price: '60.00', isAvailable: true, isTodaysMenu: true, categoryName: 'Snacks' },
];

async function updateIpCanteenMenu() {
  console.log('🍽️ ========================================================');
  console.log('🍽️ Updating IP Canteen Menu via Authoritative Seller Specs');
  console.log('🍽️ ========================================================\n');

  const ipCanteen = await db.query.canteens.findFirst({
    where: eq(canteens.name, 'IP Canteen')
  });

  if (!ipCanteen) {
    throw new Error('IP Canteen not found');
  }

  console.log(`✓ Located IP Canteen (ID: ${ipCanteen.id})`);

  // 1. Ensure required categories exist for IP Canteen
  const categoryNames = ['Beverages', 'Snacks', 'South Indian', 'Chinese', 'Continental', 'Meals'];
  const categoryMap = new Map<string, string>();

  for (let i = 0; i < categoryNames.length; i++) {
    const name = categoryNames[i];
    let cat = await db.query.menuCategories.findFirst({
      where: and(
        eq(menuCategories.canteenId, ipCanteen.id),
        eq(menuCategories.name, name)
      )
    });

    if (!cat) {
      const [newCat] = await db.insert(menuCategories).values({
        canteenId: ipCanteen.id,
        name,
        sortOrder: i + 1,
      }).returning();
      cat = newCat;
      console.log(`+ Created Category: ${name}`);
    }

    categoryMap.set(name, cat.id);
  }

  // 2. Treat "Rajma Chawal" as "Rajma Rice" (unify existing duplicate)
  const rajmaChawal = await db.query.menuItems.findFirst({
    where: and(
      eq(menuItems.canteenId, ipCanteen.id),
      eq(menuItems.name, 'Rajma Chawal')
    )
  });
  if (rajmaChawal) {
    await db.update(menuItems)
      .set({ name: 'Rajma Rice' })
      .where(eq(menuItems.id, rajmaChawal.id));
    console.log('✓ Unified "Rajma Chawal" -> "Rajma Rice"');
  }

  // 3. Remove obsolete items that are not in the supplied 25-item list
  const allowedNames = TARGET_25_ITEMS.map(i => i.name);
  const existingItems = await db.query.menuItems.findMany({
    where: eq(menuItems.canteenId, ipCanteen.id)
  });

  for (const existing of existingItems) {
    if (!allowedNames.includes(existing.name)) {
      console.log(`- Removing obsolete menu item: "${existing.name}"`);
      await db.delete(menuItems).where(eq(menuItems.id, existing.id));
    }
  }

  // 4. Upsert/Update the exact 25 items
  for (const target of TARGET_25_ITEMS) {
    const catId = categoryMap.get(target.categoryName)!;
    const existing = await db.query.menuItems.findFirst({
      where: and(
        eq(menuItems.canteenId, ipCanteen.id),
        eq(menuItems.name, target.name)
      )
    });

    if (existing) {
      await db.update(menuItems)
        .set({
          price: target.price,
          isAvailable: target.isAvailable,
          isTodaysMenu: target.isTodaysMenu,
          categoryId: catId,
          isVegetarian: true,
          updatedAt: new Date(),
        })
        .where(eq(menuItems.id, existing.id));
      console.log(`✓ Updated: ${target.name} | Price: ${target.price ?? 'Not fixed'} | Avail: ${target.isAvailable} | Today: ${target.isTodaysMenu}`);
    } else {
      await db.insert(menuItems).values({
        canteenId: ipCanteen.id,
        categoryId: catId,
        name: target.name,
        price: target.price,
        isVegetarian: true,
        isAvailable: target.isAvailable,
        isTodaysMenu: target.isTodaysMenu,
        dailyCapacity: 50,
        currentStock: target.isAvailable ? 50 : 0,
      });
      console.log(`+ Inserted: ${target.name} | Price: ${target.price ?? 'Not fixed'} | Avail: ${target.isAvailable} | Today: ${target.isTodaysMenu}`);
    }
  }

  // 5. Verification
  console.log('\n--- Final IP Canteen Menu Verification ---');
  const finalItems = await db.query.menuItems.findMany({
    where: eq(menuItems.canteenId, ipCanteen.id)
  });

  console.log(`Total items in IP Canteen: ${finalItems.length} (Expected: 25)`);
  const todaysCount = finalItems.filter(i => i.isTodaysMenu).length;
  console.log(`Today's Menu count: ${todaysCount} items`);
  const availCount = finalItems.filter(i => i.isAvailable).length;
  console.log(`Available items: ${availCount} items`);

  console.table(
    finalItems.map(i => ({
      Item: i.name,
      Price: i.price ? `₹${i.price}` : 'Price not fixed',
      Available: i.isAvailable ? 'Yes' : 'No',
      "In Today's Menu?": i.isTodaysMenu ? 'Yes' : 'No',
    }))
  );

  if (finalItems.length !== 25) {
    throw new Error(`Expected 25 items, found ${finalItems.length}`);
  }

  console.log('\n✅ IP Canteen Menu Successfully Configured to the Exact 25 Items!');
  process.exit(0);
}

updateIpCanteenMenu().catch(err => {
  console.error('Failed to update menu:', err);
  process.exit(1);
});
