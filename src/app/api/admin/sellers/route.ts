import { NextRequest, NextResponse } from 'next/server';
import { db, sellerProfiles, user, canteens, auditLogs, session } from '@/lib/db';
import { eq, desc, and, ne } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth/server';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const sellers = await db
      .select({
        profileId: sellerProfiles.id,
        userId: user.id,
        name: user.name,
        username: user.username,
        phoneNumber: user.phoneNumber,
        email: user.email,
        isActive: user.isActive,
        approvalStatus: sellerProfiles.approvalStatus,
        canteenId: sellerProfiles.canteenId,
        canteenName: canteens.name,
        approvedAt: sellerProfiles.approvedAt,
        rejectionReason: sellerProfiles.rejectionReason,
        createdAt: sellerProfiles.createdAt,
      })
      .from(sellerProfiles)
      .innerJoin(user, eq(sellerProfiles.userId, user.id))
      .leftJoin(canteens, eq(sellerProfiles.canteenId, canteens.id))
      .orderBy(desc(sellerProfiles.createdAt));

    const activeCanteens = await db.query.canteens.findMany({
      where: eq(canteens.isActive, true),
      orderBy: [desc(canteens.name)],
    });

    return NextResponse.json({ sellers, canteens: activeCanteens });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const { sellerProfileId, status, rejectionReason, targetCanteenId: explicitCanteenId } = body;

    if (!sellerProfileId || !['APPROVED', 'REJECTED', 'DEACTIVATED'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid sellerProfileId and status (APPROVED/REJECTED/DEACTIVATED) required' },
        { status: 400 }
      );
    }

    const currentProfile = await db.query.sellerProfiles.findFirst({
      where: eq(sellerProfiles.id, sellerProfileId),
    });

    if (!currentProfile) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
    }

    const sellerUser = await db.query.user.findFirst({
      where: eq(user.id, currentProfile.userId),
    });

    let assignedCanteenId = explicitCanteenId || currentProfile.canteenId;

    if (status === 'APPROVED') {
      // If approving a non-Soman seller that has no assigned canteen or is improperly tied to IP Canteen
      if (sellerUser && sellerUser.username !== 'slr/soman_singh') {
        const ipCanteen = await db.query.canteens.findFirst({ where: eq(canteens.name, 'IP Canteen') });
        if (!assignedCanteenId || (ipCanteen && assignedCanteenId === ipCanteen.id)) {
          const defaultCollege = await db.query.colleges.findFirst();
          const cleanName = (sellerUser.name || 'Seller').trim();
          const canteenName = cleanName.toLowerCase().endsWith('canteen')
            ? cleanName
            : `${cleanName}'s Canteen`;
          const [isolatedCanteen] = await db
            .insert(canteens)
            .values({
              collegeId: defaultCollege?.id!,
              name: canteenName,
              location: 'Campus Food Court',
              operatingStatus: 'OPEN',
              openingTime: '08:00:00',
              closingTime: '17:00:00',
              defaultBatchCapacity: 10,
              isActive: true,
            })
            .returning();
          assignedCanteenId = isolatedCanteen.id;
        }
      }

      // Concurrency check: Ensure no other seller is approved for this canteen
      const duplicateApproved = await db.query.sellerProfiles.findFirst({
        where: and(
          eq(sellerProfiles.canteenId, assignedCanteenId),
          eq(sellerProfiles.approvalStatus, 'APPROVED'),
          ne(sellerProfiles.id, sellerProfileId)
        ),
      });

      if (duplicateApproved) {
        return NextResponse.json(
          { error: 'This canteen already has an active approved seller. Only one active seller per canteen is allowed.' },
          { status: 409 }
        );
      }
    }

    const effectiveDbStatus = status === 'DEACTIVATED' ? 'REJECTED' : status;

    const [updated] = await db
      .update(sellerProfiles)
      .set({
        approvalStatus: effectiveDbStatus,
        canteenId: assignedCanteenId,
        approvedByAdminId: admin.id,
        approvedAt: status === 'APPROVED' ? new Date() : null,
        rejectionReason: status === 'REJECTED' || status === 'DEACTIVATED' ? rejectionReason || 'Deactivated by administrator' : null,
        updatedAt: new Date(),
      })
      .where(eq(sellerProfiles.id, sellerProfileId))
      .returning();

    // If deactivating/rejecting, revoke active sessions
    if (status === 'REJECTED' || status === 'DEACTIVATED') {
      await db.delete(session).where(eq(session.userId, currentProfile.userId));
    }

    await db.insert(auditLogs).values({
      actorId: admin.id,
      actorRole: 'ADMIN',
      action: status === 'APPROVED' ? 'SELLER_APPROVED' : status === 'DEACTIVATED' ? 'SELLER_DEACTIVATED' : 'SELLER_REJECTED',
      entityType: 'SELLER_PROFILE',
      entityId: sellerProfileId,
      afterState: { status, rejectionReason, canteenId: assignedCanteenId },
    });

    return NextResponse.json({ success: true, seller: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
