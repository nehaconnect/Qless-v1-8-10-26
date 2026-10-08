import { NextRequest, NextResponse } from 'next/server';
import { db, sellerProfiles, user, canteens, auditLogs } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth/server';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const sellers = await db.select({
      profileId: sellerProfiles.id,
      userId: user.id,
      name: user.name,
      username: user.username,
      phoneNumber: user.phoneNumber,
      email: user.email,
      approvalStatus: sellerProfiles.approvalStatus,
      canteenId: sellerProfiles.canteenId,
      approvedAt: sellerProfiles.approvedAt,
      rejectionReason: sellerProfiles.rejectionReason,
      createdAt: sellerProfiles.createdAt,
    })
      .from(sellerProfiles)
      .innerJoin(user, eq(sellerProfiles.userId, user.id))
      .orderBy(desc(sellerProfiles.createdAt));

    return NextResponse.json({ sellers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const { sellerProfileId, status, rejectionReason } = body;

    if (!sellerProfileId || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Valid sellerProfileId and status (APPROVED/REJECTED) required' }, { status: 400 });
    }

    const [updated] = await db.update(sellerProfiles)
      .set({
        approvalStatus: status,
        approvedByAdminId: admin.id,
        approvedAt: status === 'APPROVED' ? new Date() : null,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
        updatedAt: new Date(),
      })
      .where(eq(sellerProfiles.id, sellerProfileId))
      .returning();

    await db.insert(auditLogs).values({
      actorId: admin.id,
      actorRole: 'ADMIN',
      action: status === 'APPROVED' ? 'SELLER_APPROVED' : 'SELLER_REJECTED',
      entityType: 'SELLER_PROFILE',
      entityId: sellerProfileId,
      afterState: { status, rejectionReason },
    });

    return NextResponse.json({ success: true, seller: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
