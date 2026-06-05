import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { getRateLimitStats } from "@/lib/server/rate-limit-tracker";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stats = await getRateLimitStats();
  return NextResponse.json(stats);
}
