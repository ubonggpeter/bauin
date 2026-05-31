/**
 * GET  /api/jobs?view=worker|buyer&page=1
 *   worker → open jobs in categories the user holds a certificate for
 *   buyer  → jobs posted by the authenticated user
 *
 * POST /api/jobs
 *   Create a job and debit budget from poster's wallet to escrow.
 *   Body: { categoryId, title, description, budget, deadline }
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { debitWallet } from "@/lib/server/wallet";
import { getAllSettings } from "@/lib/server/platform-settings";

export const dynamic = "force-dynamic";

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const view  = searchParams.get("view") ?? "worker";
  const page  = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "20")));
  const skip  = (page - 1) * limit;

  if (view === "buyer") {
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where:   { posterId: userId },
        include: {
          category:     { select: { id: true, name: true, slug: true } },
          _count:       { select: { applications: true } },
          assignedWorker: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take:    limit,
      }),
      prisma.job.count({ where: { posterId: userId } }),
    ]);

    return NextResponse.json({
      jobs: jobs.map(serializeJob),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  }

  // Worker view — open jobs in user's certified categories only
  const certs = await prisma.userCertificate.findMany({
    where:  { userId },
    select: { categoryId: true },
  });
  const certCatIds = certs.map((c) => c.categoryId);

  if (certCatIds.length === 0) {
    return NextResponse.json({ jobs: [], total: 0, page: 1, pages: 0, noCerts: true });
  }

  const appliedJobIds = (
    await prisma.jobApplication.findMany({
      where:  { workerId: userId },
      select: { jobId: true },
    })
  ).map((a) => a.jobId);

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where: {
        categoryId: { in: certCatIds },
        status:     "OPEN",
        posterId:   { not: userId }, // can't apply to own jobs
      },
      include: {
        category:  { select: { id: true, name: true, slug: true } },
        _count:    { select: { applications: true } },
        poster:    { select: { id: true, name: true } },
      },
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
      skip,
      take:    limit,
    }),
    prisma.job.count({
      where: {
        categoryId: { in: certCatIds },
        status:     "OPEN",
        posterId:   { not: userId },
      },
    }),
  ]);

  return NextResponse.json({
    jobs: jobs.map((j) => ({
      ...serializeJob(j),
      applied: appliedJobIds.includes(j.id),
    })),
    total,
    page,
    pages:     Math.ceil(total / limit),
    certCatIds,
  });
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: { categoryId?: string; title?: string; description?: string; budget?: number; deadline?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { categoryId, title, description, budget, deadline } = body;

  if (!categoryId || !title?.trim() || !description?.trim() || !budget || !deadline) {
    return NextResponse.json({ error: "categoryId, title, description, budget and deadline are required" }, { status: 422 });
  }
  if (budget < 500) {
    return NextResponse.json({ error: "Minimum budget is ₦500" }, { status: 422 });
  }
  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
    return NextResponse.json({ error: "Deadline must be a future date" }, { status: 422 });
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category?.isActive) {
    return NextResponse.json({ error: "Category not found or inactive" }, { status: 404 });
  }

  const settings = await getAllSettings();
  const feePct   = Math.max(0, Math.min(50, Number(settings["JOB_PLATFORM_FEE_PCT"] ?? "10")));

  // Debit escrow
  const escrowRef = `JOB-ESCROW-${userId.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  try {
    await debitWallet(
      userId,
      budget,
      "JOB_ESCROW",
      `Job escrow: "${title.trim().slice(0, 60)}"`,
      escrowRef,
      { categoryId, feePct },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Debit failed";
    return NextResponse.json({ error: msg.includes("Insufficient") ? "Insufficient wallet balance" : msg }, { status: 402 });
  }

  const job = await prisma.job.create({
    data: {
      posterId:    userId,
      categoryId,
      title:       title.trim(),
      description: description.trim(),
      budget,
      deadline:    deadlineDate,
      escrowRef,
    },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });

  return NextResponse.json({ job: serializeJob(job) }, { status: 201 });
}

// ── Serialiser ────────────────────────────────────────────────────────────────

function serializeJob(j: Record<string, unknown>) {
  return {
    ...j,
    budget: Number((j.budget as { toNumber?: () => number })?.toNumber?.() ?? j.budget),
  };
}
