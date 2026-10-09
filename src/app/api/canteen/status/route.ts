import { NextRequest, NextResponse } from 'next/server';
import { db, canteens, auditLogs } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getSessionUser, requireSeller } from '@/lib/auth/server';
import { getEffectiveCanteenStatus, getISTDateParts } from '@/lib/services/order-service';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getSessionUser();
    const { searchParams } = new URL(req.url);
    const canteenId = searchParams.get('canteenId');
    let targetCanteenId: string | null = canteenId;
    if (!targetCanteenId) {
      if (authUser?.role === 'SELLER' && authUser.canteenId) {
        targetCanteenId = authUser.canteenId;
      } else {
        const defaultCanteen = await db.query.canteens.findFirst({ where: eq(canteens.name, 'IP Canteen') });
        targetCanteenId = defaultCanteen?.id ?? null;
      }
    }

    if (!targetCanteenId) {
      return NextResponse.json({ error: 'Canteen not found' }, { status: 404 });
    }

    const canteen = await db.query.canteens.findFirst({
      where: eq(canteens.id, targetCanteenId)
    });

    if (!canteen) {
      return NextResponse.json({ error: 'Canteen not found' }, { status: 404 });
    }

    const statusInfo = getEffectiveCanteenStatus(canteen, new Date());

    return NextResponse.json({
      canteen: {
        ...canteen,
        operatingStatus: statusInfo.effectiveStatus,
        effectiveStatus: statusInfo.effectiveStatus,
        isOperatingHours: statusInfo.isOperatingHours,
        isManualOverride: statusInfo.isManualOverride,
        scheduledHours: statusInfo.scheduledHours,
        currentTimeIST: statusInfo.currentTimeIST,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSeller();
    const body = await req.json();
    const { canteenId, openingTime, closingTime, defaultBatchCapacity, resetOverride } = body;
    const operatingStatus = body.operatingStatus || body.manualOverrideStatus;

    const targetCanteenId = user.effectiveRole === 'ADMIN' ? (canteenId || user.canteenId) : user.canteenId;
    if (!targetCanteenId) {
      return NextResponse.json({ error: 'Canteen ID required' }, { status: 400 });
    }

    const currentCanteen = await db.query.canteens.findFirst({
      where: eq(canteens.id, targetCanteenId)
    });

    if (!currentCanteen) {
      return NextResponse.json({ error: 'Canteen not found' }, { status: 404 });
    }

    const { dateStr } = getISTDateParts(new Date());

    const updateData: any = { updatedAt: new Date() };
    if (resetOverride) {
      updateData.manualOverrideStatus = null;
      updateData.manualOverrideDate = null;
    } else if (operatingStatus && ['OPEN', 'TOO_BUSY', 'CLOSED'].includes(operatingStatus)) {
      updateData.operatingStatus = operatingStatus;
      updateData.manualOverrideStatus = operatingStatus;
      updateData.manualOverrideDate = dateStr;
    }

    if (openingTime) updateData.openingTime = openingTime;
    if (closingTime) updateData.closingTime = closingTime;
    if (defaultBatchCapacity && defaultBatchCapacity > 0) {
      updateData.defaultBatchCapacity = defaultBatchCapacity;
    }

    const [updated] = await db.update(canteens)
      .set(updateData)
      .where(eq(canteens.id, targetCanteenId))
      .returning();

    // Immutable audit record
    await db.insert(auditLogs).values({
      canteenId: targetCanteenId,
      actorId: user.id,
      actorRole: user.role,
      action: 'CANTEEN_STATUS_UPDATE',
      entityType: 'CANTEEN',
      entityId: targetCanteenId,
      beforeState: { operatingStatus: currentCanteen.operatingStatus },
      afterState: { operatingStatus: updated.operatingStatus, manualOverrideStatus: updated.manualOverrideStatus },
    });

    const statusInfo = getEffectiveCanteenStatus(updated, new Date());

    return NextResponse.json({
      success: true,
      effectiveStatus: statusInfo.effectiveStatus,
      canteen: {
        ...updated,
        operatingStatus: statusInfo.effectiveStatus,
        effectiveStatus: statusInfo.effectiveStatus,
        isOperatingHours: statusInfo.isOperatingHours,
        isManualOverride: statusInfo.isManualOverride,
        scheduledHours: statusInfo.scheduledHours,
        currentTimeIST: statusInfo.currentTimeIST,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
