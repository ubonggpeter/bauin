import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";
        let res: Response;
        try {
          res = await fetch(`${backendUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });
        } catch {
          return null;
        }

        if (!res.ok) return null;
        const data = await res.json();
        if (!data.token || !data.user) return null;

        return {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          rank: data.user.rank,
          referralCode: data.user.referralCode,
          emailVerifiedAt: data.user.emailVerifiedAt,
          backendToken: data.token,
        };
      },
    }),
  ],

  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as Record<string, unknown>;
        token.id = u.id;
        token.role = u.role;
        token.rank = u.rank;
        token.referralCode = u.referralCode;
        token.emailVerifiedAt = u.emailVerifiedAt;
        token.backendToken = u.backendToken;
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.rank = token.rank as string;
      session.user.referralCode = token.referralCode as string;
      session.user.emailVerifiedAt = (token.emailVerifiedAt as string) ?? null;
      session.user.backendToken = token.backendToken as string;
      return session;
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
