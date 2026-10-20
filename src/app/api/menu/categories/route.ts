import { NextRequest, NextResponse } from 'next/server';
import { db, menuCategories, menuItems, auditLogs } from '@/lib/db';
import { eq, and, asc } from 'drizzle-orm';
import { requireSeller, getSessionUser } from '@/lib/auth/server';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getSessionUser();
    const { searchParams } = new URL(req.url);
    const canteenId = searchParams.get('canteenId');

    let targetCanteenId: string | null = canteenId;
    if (authUser?.role === 'SELLER') {
      if (canteenId && canteenId !== authUser.canteenId && authUser.effectiveRole !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden: Cannot access categories from another canteen' }, { status: 403 });
      }
      targetCanteenId = authUser.canteenId ?? null;
    } else if (!targetCanteenId) {
      const defaultCanteen = await db.query.canteens.findFirst();
      targetCanteenId = defaultCanteen?.id ?? null;
    }

    if (!targetCanteenId) {
      return NextResponse.json({ categories: [] });
    }

    const categories = await db.select().from(menuCategories)
      .where(and(eq(menuCategories.canteenId, targetCanteenId), eq(menuCategories.isActive, true)))
      .orderBy(asc(menuCategories.sortOrder));

    return NextResponse.json({ categories });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSeller();
    const body = await req.json();
    const { name, sortOrder, canteenId } = body;

    const targetCanteenId = user.effectiveRole === 'ADMIN' ? (canteenId || user.canteenId) : user.canteenId;
    if (!targetCanteenId) {
      return NextResponse.json({ error: 'Canteen ID required' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();
    // Check if category already exists in this canteen
    const existing = await db.query.menuCategories.findFirst({
      where: and(eq(menuCategories.canteenId, targetCanteenId), eq(menuCategories.name, trimmedName))
    });

    if (existing) {
      return NextResponse.json({ success: true, category: existing });
    }

    const [category] = await db.insert(menuCategories).values({
      canteenId: targetCanteenId,
      name: trimmedName,
      sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
      isActive: true,
    }).returning();

    try {
      await db.insert(auditLogs).values({
        canteenId: targetCanteenId,
        actorId: user.id,
        actorRole: user.role,
        action: 'CATEGORY_CREATED',
        entityType: 'CATEGORY',
        entityId: category.id,
        afterState: { name: category.name },
      });
    } catch {}

    return NextResponse.json({ success: true, category });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireSeller();
    const { searchParams } = new URL(req.url);
    let categoryId = searchParams.get('id') || searchParams.get('categoryId');
    const canteenId = searchParams.get('canteenId');

    if (!categoryId) {
      try {
        const body = await req.json();
        categoryId = body.id || body.categoryId;
      } catch {}
    }

    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    const targetCanteenId = user.effectiveRole === 'ADMIN' ? (canteenId || user.canteenId) : user.canteenId;
    if (!targetCanteenId) {
      return NextResponse.json({ error: 'Canteen ID required' }, { status: 400 });
    }

    // Find category and verify it belongs to this canteen
    const category = await db.query.menuCategories.findFirst({
      where: and(eq(menuCategories.id, categoryId), eq(menuCategories.canteenId, targetCanteenId)),
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found or does not belong to your canteen' }, { status: 404 });
    }

    // Check if any menu items (active or archived) are currently assigned to this category
    const itemsUsingCategory = await db.select({ id: menuItems.id, name: menuItems.name })
      .from(menuItems)
      .where(and(eq(menuItems.canteenId, targetCanteenId), eq(menuItems.categoryId, categoryId)));

    if (itemsUsingCategory.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category "${category.name}" because it is currently assigned to ${itemsUsingCategory.length} menu item(s). Please reassign or delete these items before deleting this category.`,
          inUseCount: itemsUsingCategory.length,
          itemNames: itemsUsingCategory.slice(0, 5).map(i => i.name),
        },
        { status: 400 }
      );
    }

    // Safe to delete category since no menu items are assigned
    await db.delete(menuCategories).where(eq(menuCategories.id, categoryId));

    try {
      await db.insert(auditLogs).values({
        canteenId: targetCanteenId,
        actorId: user.id,
        actorRole: user.role,
        action: 'CATEGORY_DELETED',
        entityType: 'CATEGORY',
        entityId: categoryId,
        beforeState: { name: category.name, sortOrder: category.sortOrder },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Category "${category.name}" deleted successfully.`,
      deletedCategoryId: categoryId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

