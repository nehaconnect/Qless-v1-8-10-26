import { betterAuth } from "better-auth";
import { username, phoneNumber } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "qless-secure-production-secret-auth-key-2026",
  baseURL: process.env.BETTER_AUTH_URL || (process.env.VERCEL_URL ? (process.env.VERCEL_URL.startsWith('http') ? process.env.VERCEL_URL : `https://${process.env.VERCEL_URL}`) : "http://localhost:3000"),
  trustedOrigins: async (request?: Request) => {
    const list: string[] = [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:3002",
      "http://localhost:*",
      "http://127.0.0.1:*",
      "https://*.vercel.app",
    ];
    if (process.env.BETTER_AUTH_URL) list.push(process.env.BETTER_AUTH_URL);
    if (process.env.VERCEL_URL) {
      list.push(process.env.VERCEL_URL.startsWith('http') ? process.env.VERCEL_URL : `https://${process.env.VERCEL_URL}`);
    }
    if (process.env.NEXT_PUBLIC_APP_URL) list.push(process.env.NEXT_PUBLIC_APP_URL);
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      list.push(process.env.VERCEL_PROJECT_PRODUCTION_URL.startsWith('http') ? process.env.VERCEL_PROJECT_PRODUCTION_URL : `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
    }

    if (request) {
      const origin = request.headers.get("origin");
      if (origin) list.push(origin);
      const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
      const proto = request.headers.get("x-forwarded-proto") || "http";
      if (host) list.push(`${proto}://${host}`);
    }
    return list;
  },
  advanced: {
    cookiePrefix: "better-auth",
    defaultCookieAttributes: {
      sameSite: "lax",
      path: "/",
      httpOnly: true,
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification
    }
  }),
  plugins: [
    username({
      minUsernameLength: 5,
      maxUsernameLength: 35,
      usernameValidator: (val: string) => {
        // Must strictly match QLess username rules:
        // ctr/<3-30 chars> for customer
        // slr/<3-30 chars> for seller
        // adm/<3-30 chars> for admin
        return /^(ctr|slr|adm)\/[a-z0-9_]{3,30}$/i.test(val);
      },
      usernameNormalization: (val: string) => {
        return val.toLowerCase();
      },
    }),
    phoneNumber()
  ],
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "CUSTOMER",
        required: true,
        input: true
      },
      isActive: {
        type: "boolean",
        defaultValue: true,
        required: true,
        input: false
      }
    }
  },
  databaseHooks: {
    user: {
      create: {
        before: async (userData: any) => {
          const rawUsername = (userData.username as string | undefined)?.toLowerCase();
          if (!rawUsername) {
            throw new Error("Username is required");
          }

          let determinedRole = "CUSTOMER";
          if (rawUsername.startsWith("ctr/")) {
            determinedRole = "CUSTOMER";
          } else if (rawUsername.startsWith("slr/")) {
            determinedRole = "SELLER";
          } else if (rawUsername.startsWith("adm/")) {
            throw new Error("Admin registration is not publicly permitted.");
          } else {
            throw new Error("Username must begin with ctr/ or slr/");
          }

          return {
            data: {
              ...userData,
              username: rawUsername,
              role: determinedRole,
              isActive: true,
            }
          };
        },
        after: async (createdUser: any) => {
          try {
            const defaultCanteen = await db.query.canteens.findFirst();
            const defaultCollege = await db.query.colleges.findFirst();

            if (createdUser.role === 'CUSTOMER' && defaultCollege) {
              await db.insert(schema.customerProfiles).values({
                userId: createdUser.id,
                collegeId: defaultCollege.id,
                defaultCanteenId: defaultCanteen?.id,
              }).onConflictDoNothing();
            } else if (createdUser.role === 'SELLER' && defaultCollege) {
              // Ensure complete seller data isolation: create a dedicated, empty canteen workspace
              const cleanName = (createdUser.name || 'Seller').trim();
              const canteenName = cleanName.toLowerCase().endsWith('canteen')
                ? cleanName
                : `${cleanName}'s Canteen`;
              const [newCanteen] = await db.insert(schema.canteens).values({
                collegeId: defaultCollege.id,
                name: canteenName,
                location: 'Campus Food Court',
                operatingStatus: 'OPEN',
                openingTime: '08:00:00',
                closingTime: '17:00:00',
                defaultBatchCapacity: 10,
                isActive: true,
              }).returning();

              await db.insert(schema.sellerProfiles).values({
                userId: createdUser.id,
                canteenId: newCanteen.id,
                approvalStatus: 'PENDING_APPROVAL',
              }).onConflictDoNothing();
            }
          } catch (err) {
            console.error("Failed to insert profile in databaseHook:", err);
          }
        }
      }
    }
  }
});
