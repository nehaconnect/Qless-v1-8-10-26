import { NextRequest, NextResponse } from 'next/server';
import { db, canteens } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const list = await db.select({
      id: canteens.id,
      name: canteens.name,
      location: canteens.location,
      operatingStatus: canteens.operatingStatus,
      openingTime: canteens.openingTime,
      closingTime: canteens.closingTime,
      defaultBatchCapacity: canteens.defaultBatchCapacity,
    })
      .from(canteens)
      .where(eq(canteens.isActive, true))
      .orderBy(asc(canteens.name));

    return NextResponse.json({ canteens: list });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
