/**
 * GET /api/seller/stories
 * Returns stories the authenticated user authored OR collaborates on.
 * Used by the bundle picker and the seller dashboard.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role;
  if (role !== "SELLER" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const uid = session.user.id;

  const stories = await prisma.story.findMany({
    where: {
      isPublished: true,
      OR: [
        { authorId: uid },
        { collaborators: { some: { collaboratorId: uid } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id:       true,
      title:    true,
      coverUrl: true,
      price:    true,
      authorId: true,
      collaborators: {
        where:  { collaboratorId: uid },
        select: { revenueSharePct: true, role: true },
      },
    },
  });

  return NextResponse.json({
    stories: stories.map((s) => ({
      id:            s.id,
      title:         s.title,
      coverUrl:      s.coverUrl,
      price:         Number(s.price),
      isAuthor:      s.authorId === uid,
      mySharePct:    s.authorId === uid
        ? null // author's share is the remainder — computed at payout time
        : Number(s.collaborators[0]?.revenueSharePct ?? 0),
      myRole:        s.authorId === uid ? "AUTHOR" : (s.collaborators[0]?.role ?? "CO-WRITER"),
    })),
  });
}
