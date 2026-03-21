import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authConfig } from "@/auth.config";
import { seedUserDefaults } from "@/lib/seed-user-defaults";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export const { handlers, auth, signIn, signOut } = NextAuth({
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

        // Clear failed attempt counter on success
        resetRateLimit(ip);

        // Seed defaults for new users (idempotent — no-op if already seeded)
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
