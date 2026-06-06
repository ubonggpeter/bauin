import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await prisma.changelog.findMany({
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    version: string;
    date: string;
    category: string;
    title: string;
    description: string;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { version, date, category, title, description } = body;

  if (!version?.trim())     return NextResponse.json({ error: "version is required" }, { status: 400 });
  if (!date)                return NextResponse.json({ error: "date is required" }, { status: 400 });
  if (!title?.trim())       return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!description?.trim()) return NextResponse.json({ error: "description is required" }, { status: 400 });

  const VALID_CATS = ["FEATURE", "IMPROVEMENT", "BUGFIX", "SECURITY", "BREAKING"];
  if (!VALID_CATS.includes(category)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }

  const entry = await prisma.changelog.create({
    data: {
      version:     version.trim(),
      date:        new Date(date),
      category:    category as "FEATURE" | "IMPROVEMENT" | "BUGFIX" | "SECURITY" | "BREAKING",
      title:       title.trim(),
      description: description.trim(),
      createdById: admin.userId,
    },
  });

  return NextResponse.json({ entryId: entry.id }, { status: 201 });
}
