import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authConfig } from "@/auth.config";
import { isAuthDisabled } from "@/lib/auth-disabled";
import { seedUserDefaults } from "@/lib/seed-user-defaults";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

const nextAuth = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const headersList = await headers();
        const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim()
          ?? headersList.get("x-real-ip")
          ?? "unknown";

        const { allowed, retryAfterMs } = checkRateLimit(ip);
        if (!allowed) {
          const seconds = Math.ceil(retryAfterMs / 1000);
          throw new Error(`Too many login attempts. Try again in ${seconds}s.`);
        }

        const user = await db
          .select()
          .from(users)
          .where(eq(users.username, credentials.username as string))
          .get();

        if (!user || !user.isActive) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!passwordMatch) return null;

        resetRateLimit(ip);
        await seedUserDefaults(user.id);

        return {
          id: user.id,
          name: user.username,
          role: user.role,
        };
      },
    }),
  ],
});

export const handlers = nextAuth.handlers;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;

let cachedDevUser: { id: string; name: string; role: string } | null = null;

async function devSession() {
  if (!cachedDevUser) {
    const username = process.env.DEV_AUTH_USERNAME ?? process.env.ADMIN_USERNAME ?? "admin";
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (!user) {
      throw new Error(`DISABLE_AUTH is on but user "${username}" was not found`);
    }

    await seedUserDefaults(user.id);
    cachedDevUser = { id: user.id, name: user.username, role: user.role };
  }

  return {
    user: {
      id: cachedDevUser.id,
      name: cachedDevUser.name,
      role: cachedDevUser.role,
      email: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export async function auth() {
  if (isAuthDisabled()) {
    return devSession();
  }
  return nextAuth.auth();
}
