import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type PatchBody = {
  isInUse?:             boolean;
  scheduledActivateAt?: string | null;
  customAlias?:         string | null;
  ctaText?:             string | null;
  accentColor?:         string | null;
  logoUrl?:             string | null;
  welcomeMessage?:      string | null;
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

  // Validate custom alias format (alphanumeric + hyphens, 3-30 chars)
  if (body.customAlias !== undefined && body.customAlias !== null) {
    if (!/^[a-z0-9-]{3,30}$/.test(body.customAlias)) {
      return NextResponse.json(
        { error: "Custom alias must be 3–30 lowercase letters, numbers, or hyphens" },
        { status: 400 },
      );
    }
    const conflict = await prisma.distributorCollection.findFirst({
      where: { customAlias: body.customAlias, id: { not: id } },
    });
    if (conflict) {
      return NextResponse.json({ error: "This alias is already taken" }, { status: 409 });
    }
  }

  const data: {
    isInUse?:             boolean;
    scheduledActivateAt?: Date | null;
    customAlias?:         string | null;
    ctaText?:             string | null;
    accentColor?:         string | null;
    logoUrl?:             string | null;
    welcomeMessage?:      string | null;
  } = {};

  if (typeof body.isInUse === "boolean")      data.isInUse = body.isInUse;
  if ("scheduledActivateAt" in body)          data.scheduledActivateAt = body.scheduledActivateAt ? new Date(body.scheduledActivateAt) : null;
  if ("customAlias"     in body)              data.customAlias     = body.customAlias    ?? null;
  if ("ctaText"         in body)              data.ctaText         = body.ctaText        ?? null;
  if ("accentColor"     in body)              data.accentColor     = body.accentColor    ?? null;
  if ("logoUrl"         in body)              data.logoUrl         = body.logoUrl        ?? null;
  if ("welcomeMessage"  in body)              data.welcomeMessage  = body.welcomeMessage ?? null;

  const updated = await prisma.distributorCollection.update({
    where: { id },
    data,
  });

  return NextResponse.json({
    id:                  updated.id,
    isInUse:             updated.isInUse,
    scheduledActivateAt: updated.scheduledActivateAt?.toISOString() ?? null,
    customAlias:         updated.customAlias,
    ctaText:             updated.ctaText,
    accentColor:         updated.accentColor,
    logoUrl:             updated.logoUrl,
    welcomeMessage:      updated.welcomeMessage,
  });
}
