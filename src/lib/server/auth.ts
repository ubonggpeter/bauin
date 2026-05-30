import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
};

export async function requireUser(): Promise<AuthUser | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return {
    id: session.user.id,
    email: session.user.email!,
    name: session.user.name,
  };
}

export function isAuthError(v: unknown): v is NextResponse {
  return v instanceof NextResponse;
}
