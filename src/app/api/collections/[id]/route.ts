import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type PatchBody = {
  isInUse?:             boolean;
  scheduledActivateAt?: string | null; // ISO string or null to clear
};

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = params;

  const collection = await prisma.distributorCollection.findUnique({ where: { id } });
  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }
  if (collection.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data: {
    isInUse?: boolean;
    scheduledActivateAt?: Date | null;
  } = {};

  if (typeof body.isInUse === "boolean") {
    data.isInUse = body.isInUse;
  }
  if ("scheduledActivateAt" in body) {
    data.scheduledActivateAt = body.scheduledActivateAt
      ? new Date(body.scheduledActivateAt)
      : null;
  }

  const updated = await prisma.distributorCollection.update({
    where: { id },
    data,
  });

  return NextResponse.json({
    id:                  updated.id,
    isInUse:             updated.isInUse,
    scheduledActivateAt: updated.scheduledActivateAt?.toISOString() ?? null,
  });
}
