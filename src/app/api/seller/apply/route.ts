import { NextRequest, NextResponse } from 'next/server';
import { db, user, account, sellerProfiles, colleges, auditLogs } from '@/lib/db';
import { eq, or } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import crypto from 'crypto';

const ALLOWED_BUSINESS_TYPES = [
  'individual canteen operator',
  'college canteen',
  'corporate cafeteria',
  'food vendor',
  'other',
];

export async function GET() {
  try {
    const collegeList = await db
      .select({
        id: colleges.id,
        code: colleges.code,
        name: colleges.name,
        address: colleges.address,
      })
      .from(colleges)
      .where(eq(colleges.isActive, true));

    return NextResponse.json({
      colleges: collegeList,
      businessTypes: ALLOWED_BUSINESS_TYPES,
      contactVerificationConfigured: false,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      fullName,
      mobile,
      email,
      usernameRaw,
      password,
      confirmPassword,
      businessName,
      legalName,
      businessType,
      collegeId,
      outletName,
      outletLocation,
      outletCity,
      openingTime = '08:00:00',
      closingTime = '17:00:00',
      upiId,
      gstNumber,
      declarationConfirmed,
    } = body;

    // 1. Validate mandatory fields
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return NextResponse.json({ error: 'Owner/contact full name is required.' }, { status: 400 });
    }

    const cleanMobile = (mobile || '').toString().trim().replace(/\D/g, '');
    if (!/^\d{10}$/.test(cleanMobile)) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit mobile number.' }, { status: 400 });
    }

    const cleanEmail = (email || '').toString().trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    // 2. Validate username with slr/ prefix
    const rawClean = (usernameRaw || '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/^(ctr|slr|adm)\//i, '')
      .replace(/[^a-z0-9_]/g, '');

    const fullUsername = `slr/${rawClean}`;
    if (!/^slr\/[a-z0-9_]{3,30}$/.test(fullUsername)) {
      return NextResponse.json(
        { error: 'Desired seller username must be 3–30 lowercase letters, numbers, or underscores.' },
        { status: 400 }
      );
    }

    // 3. Password validation
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Password and confirmation do not match.' }, { status: 400 });
    }

    // 4. Organisation & Outlet Details
    if (!businessName || typeof businessName !== 'string' || businessName.trim().length < 2) {
      return NextResponse.json({ error: 'Business/organisation name is required.' }, { status: 400 });
    }

    const cleanBusinessType = (businessType || '').toString().trim().toLowerCase();
    if (!ALLOWED_BUSINESS_TYPES.includes(cleanBusinessType)) {
      return NextResponse.json(
        { error: `Business type must be one of: ${ALLOWED_BUSINESS_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!collegeId || typeof collegeId !== 'string') {
      return NextResponse.json({ error: 'Please select an institution/campus.' }, { status: 400 });
    }

    // Verify selected college exists
    const collegeExists = await db.query.colleges.findFirst({
      where: eq(colleges.id, collegeId),
    });
    if (!collegeExists) {
      return NextResponse.json({ error: 'Invalid institution selected.' }, { status: 400 });
    }

    if (!outletName || typeof outletName !== 'string' || outletName.trim().length < 2) {
      return NextResponse.json({ error: 'First outlet name is required.' }, { status: 400 });
    }

    if (!outletLocation || typeof outletLocation !== 'string' || outletLocation.trim().length < 2) {
      return NextResponse.json({ error: 'First outlet location within campus is required.' }, { status: 400 });
    }

    if (!outletCity || typeof outletCity !== 'string' || outletCity.trim().length < 2) {
      return NextResponse.json({ error: 'Outlet city is required.' }, { status: 400 });
    }

    // 5. Declaration
    if (declarationConfirmed !== true) {
      return NextResponse.json(
        { error: 'You must confirm the authorisation declaration to operate this outlet.' },
        { status: 400 }
      );
    }

    // 6. Enforce unique username, mobile, and email without account enumeration
    const existing = await db.query.user.findFirst({
      where: or(
        eq(user.username, fullUsername),
        eq(user.email, cleanEmail),
        eq(user.phoneNumber, cleanMobile)
      ),
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An account or application with these details already exists. Please sign in or use different credentials.' },
        { status: 400 }
      );
    }

    // 7. Contact verification determination
    // Only real delivery channel credentials can trigger real OTP/verification.
    // In pilot without configured external SMS/Email providers, strictly mark PENDING_ADMIN_VERIFICATION.
    const hasDeliveryProvider = Boolean(
      (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) ||
      process.env.MSG91_AUTH_KEY ||
      process.env.RESEND_API_KEY
    );

    const contactStatus = hasDeliveryProvider ? 'PENDING_OTP' : 'PENDING_ADMIN_VERIFICATION';

    // 8. Create User & Account
    const userId = `usr_slr_${crypto.randomBytes(6).toString('hex')}`;
    const hashedPassword = await hashPassword(password);

    await db.insert(user).values({
      id: userId,
      name: fullName.trim(),
      email: cleanEmail,
      username: fullUsername,
      phoneNumber: cleanMobile,
      phoneNumberVerified: false,
      emailVerified: false,
      role: 'SELLER',
      isActive: true,
    });

    await db.insert(account).values({
      id: `acc_${crypto.randomBytes(6).toString('hex')}`,
      accountId: userId,
      providerId: 'credential',
      userId,
      password: hashedPassword,
    });

    // 9. Format proposed hours
    const normalizeTime = (t: string, defaultVal: string) => {
      if (!t) return defaultVal;
      const parts = t.split(':');
      if (parts.length === 2) return `${parts[0]}:${parts[1]}:00`;
      if (parts.length === 3) return t;
      return defaultVal;
    };

    const cleanOpeningTime = normalizeTime(openingTime, '08:00:00');
    const cleanClosingTime = normalizeTime(closingTime, '17:00:00');

    // 10. Create Seller Application / Profile
    // NOTE: Canteen is NOT created or activated at registration.
    // Status is set to PENDING_REVIEW.
    const [createdProfile] = await db
      .insert(sellerProfiles)
      .values({
        userId,
        canteenId: null,
        approvalStatus: 'PENDING_REVIEW',
        businessName: businessName.trim(),
        legalName: legalName ? legalName.trim() : null,
        businessType: cleanBusinessType,
        collegeId,
        outletName: outletName.trim(),
        outletLocation: outletLocation.trim(),
        outletCity: outletCity.trim(),
        openingTime: cleanOpeningTime,
        closingTime: cleanClosingTime,
        upiId: upiId ? upiId.trim() : null,
        gstNumber: gstNumber ? gstNumber.trim() : null,
        declarationConfirmed: true,
        emailVerificationStatus: contactStatus,
        phoneVerificationStatus: contactStatus,
      })
      .returning();

    // 11. Audit Application Submission
    await db.insert(auditLogs).values({
      actorId: userId,
      actorRole: 'SELLER',
      action: 'SELLER_APPLICATION_SUBMITTED',
      entityType: 'SELLER_PROFILE',
      entityId: createdProfile.id,
      afterState: {
        username: fullUsername,
        businessName: businessName.trim(),
        outletName: outletName.trim(),
        collegeId,
        contactVerificationStatus: contactStatus,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          'Seller application submitted successfully! Your account and first outlet will remain inactive until contact details and outlet details are reviewed and approved by QLess administration.',
        status: 'PENDING_REVIEW',
        contactVerificationStatus: contactStatus,
        username: fullUsername,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Error submitting seller application:', err);
    return NextResponse.json({ error: err.message || 'Application submission failed.' }, { status: 500 });
  }
}
