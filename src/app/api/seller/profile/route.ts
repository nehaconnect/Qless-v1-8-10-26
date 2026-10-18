import { NextRequest, NextResponse } from 'next/server';
import { db, sellerProfiles, user, canteens, colleges } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/server';

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth();
    if (authUser.role !== 'SELLER' && authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Seller account required.' }, { status: 403 });
    }

    const targetUserId = (authUser.role === 'ADMIN' && req.nextUrl.searchParams.get('userId'))
      ? req.nextUrl.searchParams.get('userId')!
      : authUser.id;

    const [profile] = await db
      .select({
        profileId: sellerProfiles.id,
        userId: sellerProfiles.userId,
        name: user.name,
        username: user.username,
        phoneNumber: user.phoneNumber,
        email: user.email,
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
        emailVerificationStatus: sellerProfiles.emailVerificationStatus,
        phoneVerificationStatus: sellerProfiles.phoneVerificationStatus,
        rejectionReason: sellerProfiles.rejectionReason,
        createdAt: sellerProfiles.createdAt,
        approvedAt: sellerProfiles.approvedAt,
      })
      .from(sellerProfiles)
      .innerJoin(user, eq(sellerProfiles.userId, user.id))
      .leftJoin(canteens, eq(sellerProfiles.canteenId, canteens.id))
      .leftJoin(colleges, eq(sql`COALESCE(${sellerProfiles.collegeId}, ${canteens.collegeId})`, colleges.id))
      .where(eq(sellerProfiles.userId, targetUserId));

    if (!profile) {
      return NextResponse.json({ error: 'Seller profile not found.' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
