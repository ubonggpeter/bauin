/**
 * GET /api/categories
 * Public list of all active categories (id + name).
 * Used by PostJobForm and other category selectors.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ categories });
}
