import { NextRequest, NextResponse } from 'next/server';
import { db, menuCategories } from '@/lib/db';
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

    return NextResponse.json({ success: true, category });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
