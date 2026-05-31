/**
 * GET /api/certificates/[certId]
 * Public certificate verification — no auth required.
 * Returns certificate metadata; used by the /verify/[certId] page.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { certId: string } },
) {
  const { certId } = params;

  if (!certId || certId.length !== 12) {
    return NextResponse.json({ error: "Invalid certificate ID" }, { status: 400 });
  }

  const cert = await prisma.userCertificate.findUnique({
    where:   { publicId: certId },
    include: {
      user:     { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  if (!cert) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }

  return NextResponse.json({
    valid:         true,
    certId,
    holderName:    cert.user.name,
    categoryName:  cert.category.name,
    score:         cert.score,
    issuedAt:      cert.issuedAt.toISOString(),
    certificateUrl: cert.certificateUrl,
  });
}
