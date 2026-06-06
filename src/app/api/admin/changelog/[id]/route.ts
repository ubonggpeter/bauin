import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  const existing = await prisma.changelog.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Partial<{
    version: string; date: string; category: string;
    title: string; description: string;
  }>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const VALID_CATS = ["FEATURE", "IMPROVEMENT", "BUGFIX", "SECURITY", "BREAKING"];
  if (body.category && !VALID_CATS.includes(body.category)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }

  const updated = await prisma.changelog.update({
    where: { id },
    data: {
      ...(body.version     && { version:     body.version.trim() }),
      ...(body.date        && { date:         new Date(body.date) }),
      ...(body.category    && { category:     body.category as "FEATURE" | "IMPROVEMENT" | "BUGFIX" | "SECURITY" | "BREAKING" }),
      ...(body.title       && { title:        body.title.trim() }),
      ...(body.description && { description:  body.description.trim() }),
    },
  });

  return NextResponse.json({ entry: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  const existing = await prisma.changelog.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.changelog.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
