/**
 * PATCH  /api/admin/courses/categories/[id]  — update category settings
 * DELETE /api/admin/courses/categories/[id]  — deactivate
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;

  const allowed = [
    "name", "description", "registrationFee", "monthlyFee",
    "retryFee", "retryPolicy", "passPercentage", "questionCount", "isActive",
  ];
  const data: Record<string, unknown> = {};
  for (const k of allowed) {
    if (body[k] !== undefined) data[k] = body[k];
  }

  if (data.name) {
    data.slug = String(data.name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  const category = await prisma.category.update({ where: { id: params.id }, data: data as never });
  return NextResponse.json({ category });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.category.update({ where: { id: params.id }, data: { isActive: false } });
  return NextResponse.json({ deactivated: true });
}
