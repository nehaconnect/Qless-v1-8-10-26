import { NextRequest, NextResponse } from 'next/server';
import { db, pickupBatches, canteens, auditLogs } from '@/lib/db';
import { eq, and, asc, sql } from 'drizzle-orm';
import { requireSeller } from '@/lib/auth/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const canteenId = searchParams.get('canteenId');

    let targetCanteenId: string | null = canteenId;
    if (!targetCanteenId) {
      const defaultCanteen = await db.query.canteens.findFirst({
        where: eq(canteens.name, 'IP Canteen')
      });
      targetCanteenId = defaultCanteen?.id ?? null;
    }

    if (!targetCanteenId) {
      return NextResponse.json({ batches: [] });
    }

    const batches = await db.select().from(pickupBatches)
      .where(and(
        eq(pickupBatches.canteenId, targetCanteenId),
        eq(pickupBatches.batchDate, dateStr)
      ))
      .orderBy(asc(pickupBatches.startTime));

    return NextResponse.json({ batches });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireSeller();
    const body = await req.json();
    const { batchId, newCapacity } = body;

    if (!batchId || typeof newCapacity !== 'number' || newCapacity < 1) {
      return NextResponse.json({ error: 'Valid batchId and positive newCapacity are required' }, { status: 400 });
    }

    // Transactional capacity update: check that newCapacity >= current reserved_count
    const updated = await db.transaction(async (tx) => {
      const batch = await tx.query.pickupBatches.findFirst({
        where: eq(pickupBatches.id, batchId)
      });

      if (!batch) {
        throw new Error('Preparation batch not found');
      }

      if (user.effectiveRole !== 'ADMIN' && batch.canteenId !== user.canteenId) {
        throw new Error('Forbidden: You can only adjust capacity for your own canteen.');
      }

      if (newCapacity < batch.reservedCount) {
        throw new Error(
          `Cannot reduce capacity to ${newCapacity} because ${batch.reservedCount} orders are already committed to this batch.`
        );
      }

      const [res] = await tx.update(pickupBatches)
        .set({ capacity: newCapacity })
        .where(eq(pickupBatches.id, batchId))
        .returning();

      await tx.insert(auditLogs).values({
        canteenId: batch.canteenId,
        actorId: user.id,
        actorRole: user.role,
        action: 'BATCH_CAPACITY_CHANGED',
        entityType: 'BATCH',
        entityId: batchId,
        beforeState: { capacity: batch.capacity, reservedCount: batch.reservedCount },
        afterState: { capacity: newCapacity, reservedCount: batch.reservedCount },
      });

      return res;
    });

    return NextResponse.json({ success: true, batch: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
