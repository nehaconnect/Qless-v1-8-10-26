import { NextRequest, NextResponse } from 'next/server';
import { db, menuCategories, menuItems, canteens, auditLogs } from '@/lib/db';
import { eq, and, asc, sql } from 'drizzle-orm';
import { requireSeller, getSessionUser } from '@/lib/auth/server';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getSessionUser();
    const { searchParams } = new URL(req.url);
    const canteenId = searchParams.get('canteenId');
    const todaysOnly = searchParams.get('todaysOnly') === 'true';

    let targetCanteenId: string | null = canteenId;

    if (authUser?.role === 'SELLER') {
      // Seller can only view their own canteen's menu
      if (canteenId && canteenId !== authUser.canteenId && authUser.effectiveRole !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden: Cannot access menu from another canteen' }, { status: 403 });
      }
      targetCanteenId = authUser.canteenId ?? null;
    } else if (!targetCanteenId) {
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
    const {
      name,
      description,
      price,
      categoryId,
      categoryName,
      isVegetarian,
      isAvailable,
      isTodaysMenu,
      imageUrl,
      dailyCapacity,
      canteenId
    } = body;

    const targetCanteenId = user.effectiveRole === 'ADMIN' ? (canteenId || user.canteenId) : user.canteenId;
    if (!targetCanteenId) {
      return NextResponse.json({ error: 'Canteen ID required' }, { status: 400 });
    }

    if (!name || (!categoryId && !categoryName)) {
      return NextResponse.json({ error: 'Name and category are required' }, { status: 400 });
    }

    let finalPrice: string | null = null;
    let finalAvailable = isAvailable ?? true;
    let finalTodaysMenu = isTodaysMenu ?? true;

    if (price === null || price === '' || price === undefined || body.priceNotFixed) {
      finalPrice = null;
      finalAvailable = false;
      finalTodaysMenu = false;
    } else {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum < 0) {
        return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
      }
      finalPrice = priceNum.toFixed(2);
    }

    let finalCategoryId = categoryId;
    if (!finalCategoryId && categoryName) {
      // Find or create category for this canteen
      const trimmedCat = categoryName.trim();
      let existingCat = await db.query.menuCategories.findFirst({
        where: and(eq(menuCategories.canteenId, targetCanteenId), eq(menuCategories.name, trimmedCat))
      });
      if (!existingCat) {
        const [createdCat] = await db.insert(menuCategories).values({
          canteenId: targetCanteenId,
          name: trimmedCat,
          sortOrder: 0,
          isActive: true,
        }).returning();
        existingCat = createdCat;
      }
      finalCategoryId = existingCat.id;
    }

    const capacityNum = dailyCapacity && !isNaN(parseInt(dailyCapacity, 10)) ? parseInt(dailyCapacity, 10) : 50;

    const [newItem] = await db.insert(menuItems).values({
      canteenId: targetCanteenId,
      categoryId: finalCategoryId,
      name: name.trim(),
      description: description?.trim() || null,
      price: finalPrice,
      isVegetarian: isVegetarian ?? true,
      imageUrl: imageUrl?.trim() || null,
      isAvailable: finalAvailable,
      isTodaysMenu: finalTodaysMenu,
      dailyCapacity: capacityNum,
      currentStock: capacityNum,
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
    const {
      itemId,
      isAvailable,
      isTodaysMenu,
      price,
      isArchived,
      name,
      description,
      categoryId,
      imageUrl,
      dailyCapacity
    } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    const existing = await db.query.menuItems.findFirst({
      where: eq(menuItems.id, itemId)
    });

    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (user.effectiveRole !== 'ADMIN' && existing.canteenId !== user.canteenId) {
      return NextResponse.json({ error: 'Forbidden: You can only edit menu items for your own canteen' }, { status: 403 });
    }

    const updates: any = { updatedAt: new Date() };
    if (typeof isAvailable === 'boolean') updates.isAvailable = isAvailable;
    if (typeof isTodaysMenu === 'boolean') updates.isTodaysMenu = isTodaysMenu;
    if (typeof isArchived === 'boolean') {
      updates.isArchived = isArchived;
      if (isArchived) updates.archivedAt = new Date();
    }
    if (price === null || price === '' || body.priceNotFixed) {
      updates.price = null;
      updates.isAvailable = false;
      updates.isTodaysMenu = false;
    } else if (price !== undefined) {
      const priceNum = parseFloat(price);
      if (!isNaN(priceNum) && priceNum >= 0) {
        updates.price = priceNum.toFixed(2);
      }
    }
    if (name) updates.name = name.trim();
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (categoryId) updates.categoryId = categoryId;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl ? imageUrl.trim() : null;
    if (dailyCapacity !== undefined) {
      const cap = parseInt(dailyCapacity, 10);
      if (!isNaN(cap) && cap >= 1) {
        updates.dailyCapacity = cap;
      }
    }

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

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireSeller();
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('id');

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    const existing = await db.query.menuItems.findFirst({
      where: eq(menuItems.id, itemId)
    });

    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (user.effectiveRole !== 'ADMIN' && existing.canteenId !== user.canteenId) {
      return NextResponse.json({ error: 'Forbidden: You can only delete menu items for your own canteen' }, { status: 403 });
    }

    // Soft delete to preserve order history
    const [archived] = await db.update(menuItems)
      .set({ isArchived: true, archivedAt: new Date(), isAvailable: false, updatedAt: new Date() })
      .where(eq(menuItems.id, itemId))
      .returning();

    await db.insert(auditLogs).values({
      canteenId: existing.canteenId,
      actorId: user.id,
      actorRole: user.role,
      action: 'MENU_ITEM_ARCHIVED',
      entityType: 'MENU_ITEM',
      entityId: itemId,
    });

    return NextResponse.json({ success: true, item: archived });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
