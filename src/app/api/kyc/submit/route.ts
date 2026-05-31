/**
 * POST /api/kyc/submit
 * Multipart form: { nin: string, docType: DocType, doc: File }
 *
 * - Hashes NIN before any storage (raw NIN never persisted)
 * - Uploads document to private R2 KYC bucket
 * - Auto-approves if account > 90 days and no active fraud flags
 * - Checks for shared phone number on submission
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { submitKyc, type DocType } from "@/lib/server/kyc";
import { checkSharedPhone } from "@/lib/server/fraud";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg":       "jpg",
  "image/png":        "png",
  "image/webp":       "webp",
  "application/pdf":  "pdf",
};

const VALID_DOC_TYPES: DocType[] = ["NIN_SLIP", "INTL_PASSPORT", "DRIVERS_LICENSE"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 }); }

  const rawNin  = (form.get("nin") as string | null)?.trim();
  const docType = form.get("docType") as DocType | null;
  const doc     = form.get("doc") as File | null;

  if (!rawNin || rawNin.length < 8) {
    return NextResponse.json({ error: "NIN must be at least 8 characters" }, { status: 422 });
  }
  if (!docType || !VALID_DOC_TYPES.includes(docType)) {
    return NextResponse.json({ error: "Invalid docType" }, { status: 422 });
  }
  if (!doc) {
    return NextResponse.json({ error: "Document file required" }, { status: 422 });
  }
  const mimeType = doc.type;
  const ext      = ALLOWED_TYPES[mimeType];
  if (!ext) {
    return NextResponse.json({ error: "File must be JPEG, PNG, WEBP, or PDF" }, { status: 422 });
  }
  if (doc.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 422 });
  }

  // Check KYC not already approved
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { kycStatus: true, phoneNumber: true },
  });
  if (user?.kycStatus === "APPROVED") {
    return NextResponse.json({ error: "KYC already approved" }, { status: 409 });
  }

  const buffer = Buffer.from(await doc.arrayBuffer());

  try {
    const { autoApproved } = await submitKyc({ userId, rawNin, buffer, mimeType, ext, docType });

    // Run phone fraud check in background (non-blocking)
    if (user?.phoneNumber) {
      checkSharedPhone(userId, user.phoneNumber).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      autoApproved,
      message: autoApproved
        ? "KYC approved automatically — your account is now verified."
        : "Documents received. Our team will review within 24–48 hours.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Submission failed";
    const status = msg.includes("already registered") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
