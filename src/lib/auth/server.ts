import { auth } from "./auth";
import { headers } from "next/headers";
import { db, sellerProfiles, customerProfiles } from "@/lib/db";
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
}

export async function getSessionUser(): Promise<AuthenticatedUser | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session || !session.user) {
      return null;
    }

    const u = session.user as any;
    let canteenId: string | undefined;
    let collegeId: string | undefined;

    if (u.role === 'SELLER') {
      const sp = await db.query.sellerProfiles.findFirst({
        where: eq(sellerProfiles.userId, u.id)
      });
      canteenId = sp?.canteenId;
    } else if (u.role === 'CUSTOMER') {
      const cp = await db.query.customerProfiles.findFirst({
        where: eq(customerProfiles.userId, u.id)
      });
      canteenId = cp?.defaultCanteenId ?? undefined;
      collegeId = cp?.collegeId;
    }

    // Check support View-As header/cookie if user is an ADMIN
    const headerList = await headers();
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
      collegeId
    };
  } catch (err) {
    return null;
  }
}

export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED: Sign in required");
  }
  return user;
}

export async function requireCustomer(): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (user.role !== 'CUSTOMER' && user.role !== 'ADMIN') {
    throw new Error("FORBIDDEN: Customer access required");
  }
  return user;
}

export async function requireSeller(): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
    throw new Error("FORBIDDEN: Seller access required");
  }
  return user;
}

export async function requireAdmin(): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (user.role !== 'ADMIN') {
    throw new Error("FORBIDDEN: Administrator access required");
  }
  return user;
}
