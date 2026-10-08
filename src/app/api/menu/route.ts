import { NextRequest, NextResponse } from 'next/server';
import { db, menuCategories, menuItems, canteens, auditLogs } from '@/lib/db';
import { eq, and, asc, sql } from 'drizzle-orm';
import { requireSeller } from '@/lib/auth/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const canteenId = searchParams.get('canteenId');
    const todaysOnly = searchParams.get('todaysOnly') === 'true';

    // Default to IP Canteen if not specified
    let targetCanteenId: string | null = canteenId;
    if (!targetCanteenId) {
      const defaultCanteen = await db.query.canteens.findFirst({
        where: eq(canteens.name, 'IP Canteen')
      });
      targetCanteenId = defaultCanteen?.id ?? null;
    }

    if (!targetCanteenId) {
      return NextResponse.json({ categories: [], items: [] });
    }

    const categories = await db.select().from(menuCategories)
      .where(and(eq(menuCategories.canteenId, targetCanteenId), eq(menuCategories.isActive, true)))
      .orderBy(asc(menuCategories.sortOrder));

    let itemsQuery = db.select().from(menuItems)
      .where(and(
        eq(menuItems.canteenId, targetCanteenId),
        eq(menuItems.isArchived, false),
        todaysOnly ? eq(menuItems.isTodaysMenu, true) : sql`true`
      ));

    const items = await itemsQuery;

    return NextResponse.json({ categories, items });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSeller();
    const body = await req.json();
    const { name, description, price, categoryId, isVegetarian, isTodaysMenu, canteenId } = body;

    const targetCanteenId = user.canteenId || canteenId;
    if (!targetCanteenId) {
      return NextResponse.json({ error: 'Canteen ID required' }, { status: 400 });
    }

    if (!name || !price || !categoryId) {
      return NextResponse.json({ error: 'Name, price and category are required' }, { status: 400 });
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
    }

    const [newItem] = await db.insert(menuItems).values({
      canteenId: targetCanteenId,
      categoryId,
      name,
      description: description || null,
      price: priceNum.toFixed(2),
      isVegetarian: isVegetarian ?? true,
      isAvailable: true,
      isTodaysMenu: isTodaysMenu ?? true,
    }).returning();

    await db.insert(auditLogs).values({
      canteenId: targetCanteenId,
      actorId: user.id,
      actorRole: user.role,
      action: 'MENU_ITEM_CREATED',
      entityType: 'MENU_ITEM',
      entityId: newItem.id,
      afterState: { name: newItem.name, price: newItem.price },
    });

    return NextResponse.json({ success: true, item: newItem });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireSeller();
    const body = await req.json();
    const { itemId, isAvailable, isTodaysMenu, price, isArchived, name, description } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    const existing = await db.query.menuItems.findFirst({
      where: eq(menuItems.id, itemId)
    });

    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const updates: any = { updatedAt: new Date() };
    if (typeof isAvailable === 'boolean') updates.isAvailable = isAvailable;
    if (typeof isTodaysMenu === 'boolean') updates.isTodaysMenu = isTodaysMenu;
    if (typeof isArchived === 'boolean') {
      updates.isArchived = isArchived;
      if (isArchived) updates.archivedAt = new Date();
    }
    if (price !== undefined) {
      const priceNum = parseFloat(price);
      if (!isNaN(priceNum) && priceNum >= 0) {
        updates.price = priceNum.toFixed(2);
      }
    }
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;

    const [updated] = await db.update(menuItems)
      .set(updates)
      .where(eq(menuItems.id, itemId))
      .returning();

    await db.insert(auditLogs).values({
      canteenId: existing.canteenId,
      actorId: user.id,
      actorRole: user.role,
      action: 'MENU_ITEM_UPDATED',
      entityType: 'MENU_ITEM',
      entityId: itemId,
      beforeState: { isAvailable: existing.isAvailable, price: existing.price },
      afterState: { isAvailable: updated.isAvailable, price: updated.price },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
