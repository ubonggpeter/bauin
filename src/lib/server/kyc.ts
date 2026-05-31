/**
 * KYC — NIN hashing, private R2 doc upload, auto-approval, doc URL generation.
 *
 * Rules:
 *  - Raw NIN is NEVER stored or logged. Only SHA-256(NIN.trim().toUpperCase()).
 *  - Documents go to a private R2 bucket (R2_KYC_BUCKET). Access is via
 *    presigned URLs (1-hour TTL) generated server-side for admin review only.
 *  - Auto-approve when: account age > 90 days AND user has no active FraudFlag.
 */
import crypto from "crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/db";

// ── R2 client (private KYC bucket) ───────────────────────────────────────────

function getKycS3(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const keyId     = process.env.R2_ACCESS_KEY_ID;
  const secret    = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !keyId || !secret) return null;
  return new S3Client({
    region:      "auto",
    endpoint:    `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: keyId, secretAccessKey: secret },
  });
}

const KYC_BUCKET = () => process.env.R2_KYC_BUCKET ?? "bauin-kyc-private";

// ── NIN hashing ───────────────────────────────────────────────────────────────

export function hashNin(rawNin: string): string {
  return crypto
    .createHash("sha256")
    .update(rawNin.trim().toUpperCase())
    .digest("hex");
}

// ── R2 doc upload ─────────────────────────────────────────────────────────────

export async function uploadKycDoc(
  userId: string,
  buffer: Buffer,
  mimeType: string,
  ext: string,
): Promise<string> {
  const s3 = getKycS3();
  if (!s3) throw new Error("R2 not configured (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY missing)");

  const key = `kyc/${userId}/${Date.now()}.${ext}`;
  await s3.send(
    new PutObjectCommand({
      Bucket:      KYC_BUCKET(),
      Key:         key,
      Body:        buffer,
      ContentType: mimeType,
      // No public access — bucket is private
      Metadata:    { userId },
    }),
  );
  return key;
}

// ── Presigned URL for admin review (1 h TTL) ─────────────────────────────────

export async function getKycDocUrl(docKey: string): Promise<string> {
  const s3 = getKycS3();
  if (!s3) throw new Error("R2 not configured");
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: KYC_BUCKET(), Key: docKey }),
    { expiresIn: 3600 },
  );
}

// ── Auto-approval check ───────────────────────────────────────────────────────

const NINETY_DAYS_MS = 90 * 24 * 3600 * 1000;

export async function checkAutoApproval(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { createdAt: true },
  });
  if (!user) return false;

  const accountAge = Date.now() - user.createdAt.getTime();
  if (accountAge < NINETY_DAYS_MS) return false;

  const activeFraud = await prisma.fraudFlag.count({
    where: { userId, resolved: false },
  });
  return activeFraud === 0;
}

// ── Submit KYC ────────────────────────────────────────────────────────────────

export type DocType = "NIN_SLIP" | "INTL_PASSPORT" | "DRIVERS_LICENSE";

export async function submitKyc(opts: {
  userId:  string;
  rawNin:  string;
  buffer:  Buffer;
  mimeType: string;
  ext:     string;
  docType: DocType;
}): Promise<{ autoApproved: boolean }> {
  const ninHash = hashNin(opts.rawNin);

  // Reject if this NIN is already used by another account
  const existing = await prisma.kycDocument.findUnique({ where: { ninHash } });
  if (existing && existing.userId !== opts.userId) {
    throw new Error("NIN already registered on another account");
  }

  const docKey      = await uploadKycDoc(opts.userId, opts.buffer, opts.mimeType, opts.ext);
  const autoApprove = await checkAutoApproval(opts.userId);

  await prisma.$transaction(async (tx) => {
    await tx.kycDocument.upsert({
      where:  { userId: opts.userId },
      create: {
        userId:      opts.userId,
        ninHash,
        docType:     opts.docType,
        docKey,
        autoApproved: autoApprove,
      },
      update: {
        ninHash,
        docType:     opts.docType,
        docKey,
        autoApproved: autoApprove,
        reviewNote:  null,
        reviewedAt:  null,
        reviewedById: null,
      },
    });

    // Also store ninHash on User for dedup lookups
    await tx.user.update({
      where: { id: opts.userId },
      data:  {
        ninHash,
        kycStatus: autoApprove ? "APPROVED" : "SUBMITTED",
      },
    });
  });

  return { autoApproved: autoApprove };
}

// ── Admin review ─────────────────────────────────────────────────────────────

export async function reviewKyc(opts: {
  userId:      string;
  decision:    "APPROVED" | "REJECTED";
  reviewNote?: string;
  adminId:     string;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.kycDocument.update({
      where: { userId: opts.userId },
      data:  {
        reviewNote:  opts.reviewNote ?? null,
        reviewedAt:  new Date(),
        reviewedById: opts.adminId,
      },
    });
    await tx.user.update({
      where: { id: opts.userId },
      data:  { kycStatus: opts.decision },
    });
  });
}
