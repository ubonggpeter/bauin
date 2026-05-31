/**
 * POST /api/auth/streak
 * Updates the login streak for the current user.
 * Called client-side once per browser session after sign-in.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateLoginStreak } from "@/lib/server/achievements";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await updateLoginStreak(session.user.id);
  return NextResponse.json(result);
}
