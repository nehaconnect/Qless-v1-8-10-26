import { NextRequest, NextResponse } from 'next/server';
import { db, sellerProfiles, user, canteens, colleges, auditLogs, session } from '@/lib/db';
import { eq, desc, and, ne, sql } from 'drizzle-orm';
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
        canteenLocation: canteens.location,
        businessName: sellerProfiles.businessName,
        legalName: sellerProfiles.legalName,
        businessType: sellerProfiles.businessType,
        collegeId: sellerProfiles.collegeId,
        collegeName: sql<string>`case when ${colleges.code} is not null then concat(${colleges.name}, ' (', ${colleges.code}, ')') else ${colleges.name} end`.as('college_name'),
        outletName: sellerProfiles.outletName,
        outletLocation: sellerProfiles.outletLocation,
        outletCity: sellerProfiles.outletCity,
        openingTime: sellerProfiles.openingTime,
        closingTime: sellerProfiles.closingTime,
        upiId: sellerProfiles.upiId,
        gstNumber: sellerProfiles.gstNumber,
        declarationConfirmed: sellerProfiles.declarationConfirmed,
        emailVerificationStatus: sellerProfiles.emailVerificationStatus,
        phoneVerificationStatus: sellerProfiles.phoneVerificationStatus,
        approvedAt: sellerProfiles.approvedAt,
        rejectionReason: sellerProfiles.rejectionReason,
        createdAt: sellerProfiles.createdAt,
      })
      .from(sellerProfiles)
      .innerJoin(user, eq(sellerProfiles.userId, user.id))
      .leftJoin(canteens, eq(sellerProfiles.canteenId, canteens.id))
      .leftJoin(colleges, eq(sql`COALESCE(${sellerProfiles.collegeId}, ${canteens.collegeId})`, colleges.id))
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

    if ((status === 'REJECTED' || status === 'DEACTIVATED') && (!rejectionReason || !rejectionReason.trim())) {
      return NextResponse.json(
        { error: `A valid reason is required when ${status.toLowerCase()}ing a seller account.` },
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
      // Idempotency: If already approved with the same canteen, return success
      if (currentProfile.approvalStatus === 'APPROVED' && assignedCanteenId) {
        return NextResponse.json({ success: true, seller: currentProfile, message: 'Already approved.' });
      }

      // If approving a seller that has no assigned canteen or is improperly tied to IP Canteen
      if (sellerUser && sellerUser.username !== 'slr/soman_singh') {
        const ipCanteen = await db.query.canteens.findFirst({ where: eq(canteens.name, 'IP Canteen') });
        if (!assignedCanteenId || (ipCanteen && assignedCanteenId === ipCanteen.id)) {
          // Use submitted outlet details, not placeholder defaults
          const targetCollegeId = currentProfile.collegeId || (await db.query.colleges.findFirst())?.id!;
          const finalOutletName = currentProfile.outletName || `${(sellerUser.name || 'Seller').trim()}'s Canteen`;
          const finalLocation = currentProfile.outletLocation || 'Main Campus';
          const finalOpening = currentProfile.openingTime || '08:00:00';
          const finalClosing = currentProfile.closingTime || '17:00:00';
          const finalUpi = currentProfile.upiId || undefined;

          const [isolatedCanteen] = await db
            .insert(canteens)
            .values({
              collegeId: targetCollegeId,
              name: finalOutletName,
              location: finalLocation,
              operatingStatus: 'OPEN',
              openingTime: finalOpening,
              closingTime: finalClosing,
              defaultBatchCapacity: 10,
              upiId: finalUpi,
              isActive: true,
            })
            .returning();
          assignedCanteenId = isolatedCanteen.id;
        } else {
          // If assigned canteen exists, ensure it is activated and has the submitted details
          await db
            .update(canteens)
            .set({
              isActive: true,
              name: currentProfile.outletName || undefined,
              location: currentProfile.outletLocation || undefined,
              openingTime: currentProfile.openingTime || undefined,
              closingTime: currentProfile.closingTime || undefined,
              upiId: currentProfile.upiId || undefined,
            })
            .where(eq(canteens.id, assignedCanteenId));
        }
      }

      // Concurrency check: Ensure no other seller is already approved for this canteen
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

    const [updated] = await db
      .update(sellerProfiles)
      .set({
        approvalStatus: status,
        canteenId: assignedCanteenId,
        approvedByAdminId: admin.id,
        approvedAt: status === 'APPROVED' ? new Date() : currentProfile.approvedAt,
        rejectionReason: status === 'REJECTED' || status === 'DEACTIVATED' ? rejectionReason.trim() : null,
        emailVerificationStatus: status === 'APPROVED' ? 'VERIFIED_BY_ADMIN' : currentProfile.emailVerificationStatus,
        phoneVerificationStatus: status === 'APPROVED' ? 'VERIFIED_BY_ADMIN' : currentProfile.phoneVerificationStatus,
        updatedAt: new Date(),
      })
      .where(eq(sellerProfiles.id, sellerProfileId))
      .returning();

    // If deactivating/rejecting, revoke active sessions and deactivate the outlet if not IP Canteen
    if (status === 'REJECTED' || status === 'DEACTIVATED') {
      await db.delete(session).where(eq(session.userId, currentProfile.userId));
      if (assignedCanteenId) {
        const ipCanteen = await db.query.canteens.findFirst({ where: eq(canteens.name, 'IP Canteen') });
        if (!ipCanteen || assignedCanteenId !== ipCanteen.id) {
          await db.update(canteens).set({ isActive: false }).where(eq(canteens.id, assignedCanteenId));
        }
      }
    }

    await db.insert(auditLogs).values({
      actorId: admin.id,
      actorRole: 'ADMIN',
      action: status === 'APPROVED' ? 'SELLER_APPROVED' : status === 'DEACTIVATED' ? 'SELLER_DEACTIVATED' : 'SELLER_REJECTED',
      entityType: 'SELLER_PROFILE',
      entityId: sellerProfileId,
      afterState: {
        status,
        rejectionReason: status !== 'APPROVED' ? rejectionReason.trim() : null,
        canteenId: assignedCanteenId,
        verifiedByAdmin: status === 'APPROVED',
      },
    });

    return NextResponse.json({ success: true, seller: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
