/**
 * GET /api/admin/kyc/[userId]/doc-url
 * Returns a 1-hour presigned R2 URL for the KYC document.
 * Admin only — raw NIN is never included.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { getKycDocUrl } from "@/lib/server/kyc";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } },
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await prisma.kycDocument.findUnique({
    where:  { userId: params.userId },
    select: { docKey: true, docType: true },
  });
  if (!doc) return NextResponse.json({ error: "No KYC document found" }, { status: 404 });

  try {
    const url = await getKycDocUrl(doc.docKey);
    return NextResponse.json({ url, docType: doc.docType, expiresInSeconds: 3600 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to generate URL";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
