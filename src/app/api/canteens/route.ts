import { NextRequest, NextResponse } from 'next/server';
import { db, canteens, sellerProfiles } from '@/lib/db';
import { eq, asc, and } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const list = await db
      .select({
        id: canteens.id,
        name: canteens.name,
        location: canteens.location,
        operatingStatus: canteens.operatingStatus,
        openingTime: canteens.openingTime,
        closingTime: canteens.closingTime,
        defaultBatchCapacity: canteens.defaultBatchCapacity,
      })
      .from(canteens)
      .innerJoin(
        sellerProfiles,
        and(
          eq(canteens.id, sellerProfiles.canteenId),
          eq(sellerProfiles.approvalStatus, 'APPROVED')
        )
      )
      .where(eq(canteens.isActive, true))
      .orderBy(asc(canteens.name));

    return NextResponse.json({ canteens: list });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
