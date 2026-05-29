import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      rank: string;
      referralCode: string;
      emailVerifiedAt: string | null;
      backendToken: string;
    } & DefaultSession["user"];
  }
}
