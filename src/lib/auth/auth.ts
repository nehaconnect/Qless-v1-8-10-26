import { betterAuth } from "better-auth";
import { username, phoneNumber } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "qless-secure-production-secret-auth-key-2026",
  baseURL: process.env.BETTER_AUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
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
            } else if (createdUser.role === 'SELLER' && defaultCanteen) {
              await db.insert(schema.sellerProfiles).values({
                userId: createdUser.id,
                canteenId: defaultCanteen.id,
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
