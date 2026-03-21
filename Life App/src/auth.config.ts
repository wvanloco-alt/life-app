import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config — no Node.js imports (no DB, no bcrypt).
 * Used by middleware to verify sessions without hitting the database.
 * The full auth config (with Credentials provider + DB) lives in src/lib/auth.ts.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { id: string; name: string; role: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
  providers: [],
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
    };
  }
}
