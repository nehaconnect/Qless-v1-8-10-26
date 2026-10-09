import { createAuthClient } from "better-auth/react";
import { usernameClient, phoneNumberClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined"
    ? window.location.origin
    : (process.env.BETTER_AUTH_URL || (process.env.VERCEL_URL ? (process.env.VERCEL_URL.startsWith('http') ? process.env.VERCEL_URL : `https://${process.env.VERCEL_URL}`) : "http://localhost:3000")),
  plugins: [
    usernameClient(),
    phoneNumberClient()
  ]
});
