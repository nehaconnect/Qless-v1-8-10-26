import { auth } from "./auth";
import { headers } from "next/headers";
import { db, user, sellerProfiles, customerProfiles } from "@/lib/db";
import { eq } from "drizzle-orm";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  username: string;
  phoneNumber: string;
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN';
  effectiveRole: 'CUSTOMER' | 'SELLER' | 'ADMIN'; // When admin uses View-As support mode
  canteenId?: string; // For seller
  collegeId?: string;
  sellerApprovalStatus?: string;
}

export async function getSessionUser(customHeaders?: Headers): Promise<AuthenticatedUser | null> {
  try {
    let headerList: Headers;
    if (customHeaders) {
      headerList = customHeaders;
    } else {
      try {
        headerList = await headers();
      } catch {
        return null;
      }
    }

    const session = await auth.api.getSession({
      headers: headerList
    });

    if (!session || !session.user) {
      return null;
    }

    const u = session.user as any;

    // Reject inactive or deleted accounts
    const userInDb = await db.query.user.findFirst({
      where: eq(user.id, u.id),
    });
    if (!userInDb || !userInDb.isActive) {
      return null;
    }

    let canteenId: string | undefined;
    let collegeId: string | undefined;
    let sellerApprovalStatus: string | undefined;

    if (u.role === 'SELLER') {
      const sp = await db.query.sellerProfiles.findFirst({
        where: eq(sellerProfiles.userId, u.id)
      });
      canteenId = sp?.canteenId;
      sellerApprovalStatus = sp?.approvalStatus;
    } else if (u.role === 'CUSTOMER') {
      const cp = await db.query.customerProfiles.findFirst({
        where: eq(customerProfiles.userId, u.id)
      });
      canteenId = cp?.defaultCanteenId ?? undefined;
      collegeId = cp?.collegeId;
    }

    // Check support View-As header/cookie if user is an ADMIN
    const viewAs = headerList.get("x-view-as-role") as 'CUSTOMER' | 'SELLER' | null;
    const effectiveRole = (u.role === 'ADMIN' && viewAs) ? viewAs : (u.role as 'CUSTOMER' | 'SELLER' | 'ADMIN');

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      username: u.username || '',
      phoneNumber: u.phoneNumber || '',
      role: u.role as 'CUSTOMER' | 'SELLER' | 'ADMIN',
      effectiveRole,
      canteenId,
      collegeId,
      sellerApprovalStatus,
    };
  } catch (err) {
    return null;
  }
}

export async function requireAuth(customHeaders?: Headers): Promise<AuthenticatedUser> {
  const user = await getSessionUser(customHeaders);
  if (!user) {
    throw new Error("UNAUTHORIZED: Sign in required");
  }
  return user;
}

export async function requireCustomer(customHeaders?: Headers): Promise<AuthenticatedUser> {
  const user = await requireAuth(customHeaders);
  if (user.role !== 'CUSTOMER' && user.role !== 'ADMIN') {
    throw new Error("FORBIDDEN: Customer access required");
  }
  return user;
}

export async function requireSeller(customHeaders?: Headers): Promise<AuthenticatedUser> {
  const user = await requireAuth(customHeaders);
  if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
    throw new Error("FORBIDDEN: Seller access required");
  }
  if (user.role === 'SELLER' && (user.sellerApprovalStatus !== 'APPROVED' || !user.canteenId)) {
    throw new Error("FORBIDDEN: Seller account is unapproved or has no assigned canteen");
  }
  return user;
}

export async function requireAdmin(customHeaders?: Headers): Promise<AuthenticatedUser> {
  const user = await requireAuth(customHeaders);
  if (user.role !== 'ADMIN') {
    throw new Error("FORBIDDEN: Administrator access required");
  }
  return user;
}
