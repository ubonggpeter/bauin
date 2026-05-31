import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import QRCode from "qrcode";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ── Colors ────────────────────────────────────────────────────────────────────

const C = {
  teal:      rgb(0.102, 0.400, 0.349),   // #1A6659
  tealDark:  rgb(0.055, 0.290, 0.239),   // #0E4A3D
  tealLight: rgb(0.133, 0.478, 0.416),   // #226B6A approx
  gold:      rgb(0.941, 0.706, 0.161),   // #F0B429
  white:     rgb(1,     1,     1    ),
  dark:      rgb(0.102, 0.102, 0.173),   // #1A1A2C
  gray:      rgb(0.42,  0.42,  0.46 ),
  lightGray: rgb(0.70,  0.70,  0.72 ),
};

// ── R2 client ─────────────────────────────────────────────────────────────────

function getS3(): S3Client | null {
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

// ── Cert ID ───────────────────────────────────────────────────────────────────

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1

export function generateCertId(): string {
  let id = "";
  for (let i = 0; i < 12; i++) {
    id += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return id;
}

// ── PDF builder ───────────────────────────────────────────────────────────────

export async function buildCertificatePdf(opts: {
  userName:     string;
  categoryName: string;
  score:        number;
  issuedAt:     Date;
  certId:       string;
}): Promise<Uint8Array> {
  const { userName, categoryName, score, issuedAt, certId } = opts;

  // ── Document & page (landscape letter: 792 × 612 pts) ────────────────────
  const doc  = await PDFDocument.create();
  const page = doc.addPage([792, 612]);
  const W    = 792;
  const H    = 612;

  // ── Fonts ─────────────────────────────────────────────────────────────────
  const fontBold    = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg     = await doc.embedFont(StandardFonts.Helvetica);
  const fontItalic  = await doc.embedFont(StandardFonts.HelveticaOblique);
  const fontTimes   = await doc.embedFont(StandardFonts.TimesRomanItalic);

  // ── White background ──────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.white });

  // ── Teal header band (top 155 pts) ────────────────────────────────────────
  const HEADER_H = 155;
  page.drawRectangle({ x: 0, y: H - HEADER_H, width: W, height: HEADER_H, color: C.teal });

  // ── Gold accent stripe below header ──────────────────────────────────────
  page.drawRectangle({ x: 0, y: H - HEADER_H - 5, width: W, height: 5, color: C.gold });

  // ── Teal border frame ─────────────────────────────────────────────────────
  const INSET = 14;
  page.drawRectangle({
    x:           INSET,
    y:           INSET,
    width:       W - INSET * 2,
    height:      H - INSET * 2,
    borderColor: C.teal,
    borderWidth: 2.5,
    color:       rgb(0, 0, 0), // transparent trick — use opacity 0
    opacity:     0,
  });

  // ── Corner ornaments (small gold squares) ────────────────────────────────
  for (const [cx, cy] of [[INSET, INSET], [W - INSET, INSET], [INSET, H - INSET], [W - INSET, H - INSET]]) {
    page.drawRectangle({ x: cx - 4, y: cy - 4, width: 8, height: 8, color: C.gold });
  }

  // ── Logo circle ──────────────────────────────────────────────────────────
  page.drawCircle({ x: 72, y: H - 77, size: 34, color: C.gold });
  page.drawText("B", {
    x:    72 - fontBold.widthOfTextAtSize("B", 28) / 2,
    y:    H - 77 - 10,
    size: 28,
    font: fontBold,
    color: C.teal,
  });

  // ── BAUIN heading ─────────────────────────────────────────────────────────
  page.drawText("BAUIN", {
    x: 120, y: H - 60,
    size: 36, font: fontBold, color: C.white,
  });
  page.drawText("BILLIONAIRES AI USERS INCOME NETWORK", {
    x: 120, y: H - 82,
    size: 9, font: fontReg, color: rgb(0.85, 0.95, 0.92),
  });

  // ── "CERTIFICATE OF ACHIEVEMENT" (right side of header) ──────────────────
  const coaText  = "CERTIFICATE OF ACHIEVEMENT";
  const coaSize  = 11;
  const coaWidth = fontBold.widthOfTextAtSize(coaText, coaSize);
  page.drawText(coaText, {
    x: W - coaWidth - 24, y: H - 60,
    size: coaSize, font: fontBold, color: C.gold,
  });

  // Thin white line under COA label
  page.drawLine({
    start: { x: W - coaWidth - 24, y: H - 66 },
    end:   { x: W - 24,            y: H - 66 },
    thickness: 0.7,
    color: rgb(1, 1, 1, ),
    opacity: 0.4,
  });

  // ── Verification ID (top-right, small) ────────────────────────────────────
  page.drawText(`ID: ${certId}`, {
    x: W - fontReg.widthOfTextAtSize(`ID: ${certId}`, 8) - 24, y: H - 80,
    size: 8, font: fontReg, color: rgb(0.85, 0.95, 0.92),
    opacity: 0.7,
  });

  // ── Body content ──────────────────────────────────────────────────────────
  function cx(text: string, size: number, font = fontReg) {
    return (W - font.widthOfTextAtSize(text, size)) / 2;
  }

  // "This certifies that"
  page.drawText("This certifies that", {
    x: cx("This certifies that", 13, fontItalic), y: H - 210,
    size: 13, font: fontItalic, color: C.gray,
  });

  // NAME
  const nameSize = userName.length > 30 ? 26 : 30;
  page.drawText(userName, {
    x: cx(userName, nameSize, fontTimes), y: H - 252,
    size: nameSize, font: fontTimes, color: C.dark,
  });

  // Gold underline under name
  const nameWidth = fontTimes.widthOfTextAtSize(userName, nameSize);
  const nameX     = cx(userName, nameSize, fontTimes);
  page.drawLine({
    start: { x: nameX, y: H - 256 }, end: { x: nameX + nameWidth, y: H - 256 },
    thickness: 1, color: C.gold,
  });

  // Body paragraph (two lines)
  const line1 = "has successfully completed the BAUIN certification examination for";
  page.drawText(line1, {
    x: cx(line1, 11, fontReg), y: H - 284,
    size: 11, font: fontReg, color: C.gray,
  });

  // CATEGORY
  const catSize = categoryName.length > 28 ? 18 : 22;
  page.drawText(categoryName, {
    x: cx(categoryName, catSize, fontBold), y: H - 318,
    size: catSize, font: fontBold, color: C.teal,
  });

  // "and is hereby designated as a"
  const line2 = "and is hereby designated as a";
  page.drawText(line2, {
    x: cx(line2, 11, fontReg), y: H - 348,
    size: 11, font: fontReg, color: C.gray,
  });

  // "Certified [Category]"
  const certTitle     = `Certified ${categoryName}`;
  const certTitleSize = certTitle.length > 30 ? 18 : 22;
  page.drawText(certTitle, {
    x: cx(certTitle, certTitleSize, fontBold), y: H - 380,
    size: certTitleSize, font: fontBold, color: C.gold,
  });

  // ── Gold divider ──────────────────────────────────────────────────────────
  page.drawLine({
    start: { x: 180, y: H - 402 }, end: { x: W - 180, y: H - 402 },
    thickness: 0.8, color: C.gold, opacity: 0.5,
  });

  // ── Date + Score ──────────────────────────────────────────────────────────
  const dateStr = issuedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const dateText = `Issued: ${dateStr}   ·   Score: ${score}%`;
  page.drawText(dateText, {
    x: cx(dateText, 10, fontReg), y: H - 422,
    size: 10, font: fontReg, color: C.lightGray,
  });

  // Verification URL hint
  const verifyText = `Verify at: bauin.com/verify/${certId}`;
  page.drawText(verifyText, {
    x: cx(verifyText, 9, fontReg), y: H - 438,
    size: 9, font: fontReg, color: C.lightGray,
  });

  // ── QR code ───────────────────────────────────────────────────────────────
  const qrBuffer = await QRCode.toBuffer(`https://bauin.com/verify/${certId}`, {
    type:  "png",
    width: 96,
    margin: 1,
    color: { dark: "#1A6659", light: "#FFFFFF" },
  });
  const qrImage  = await doc.embedPng(qrBuffer);
  const QR_SIZE  = 80;
  const QR_X     = W - QR_SIZE - 28;
  const QR_Y     = 30;

  // White background for QR
  page.drawRectangle({ x: QR_X - 4, y: QR_Y - 4, width: QR_SIZE + 8, height: QR_SIZE + 8, color: C.white });
  page.drawImage(qrImage, { x: QR_X, y: QR_Y, width: QR_SIZE, height: QR_SIZE });

  // "Scan to verify" label
  const scanLabel = "Scan to verify";
  page.drawText(scanLabel, {
    x: QR_X + (QR_SIZE - fontReg.widthOfTextAtSize(scanLabel, 7)) / 2,
    y: QR_Y - 12,
    size: 7, font: fontReg, color: C.lightGray,
  });

  // ── Bottom signature line (left side) ────────────────────────────────────
  page.drawLine({
    start: { x: 36, y: 75 }, end: { x: 200, y: 75 },
    thickness: 1, color: C.lightGray,
  });
  page.drawText("Authorised Signature", {
    x: 36, y: 60,
    size: 8, font: fontReg, color: C.lightGray,
  });

  // BAUIN footer text (center bottom)
  const footer = "BAUIN · Billionaires AI Users Income Network · bauin.com";
  page.drawText(footer, {
    x: cx(footer, 8, fontReg), y: 30,
    size: 8, font: fontReg, color: C.lightGray,
  });

  return doc.save();
}

// ── R2 upload ─────────────────────────────────────────────────────────────────

export async function uploadCertificatePdf(
  userId:     string,
  categoryId: string,
  certId:     string,
  pdfBytes:   Uint8Array,
): Promise<string | null> {
  const s3     = getS3();
  const bucket = process.env.R2_BUCKET;
  if (!s3 || !bucket) return null;

  const key       = `certificates/${userId}/${categoryId}/${certId}.pdf`;
  const publicBase = process.env.R2_PUBLIC_URL ?? "";

  try {
    await s3.send(new PutObjectCommand({
      Bucket:       bucket,
      Key:          key,
      Body:         pdfBytes,
      ContentType:  "application/pdf",
      CacheControl: "public, max-age=31536000",
      Metadata:     { certId, userId, categoryId },
    }));
    return publicBase ? `${publicBase}/${key}` : null;
  } catch {
    return null;
  }
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function generateAndUploadCertificate(opts: {
  userId:       string;
  categoryId:   string;
  userName:     string;
  categoryName: string;
  score:        number;
  issuedAt:     Date;
}): Promise<{ url: string | null; certId: string }> {
  const certId   = generateCertId();
  const pdfBytes = await buildCertificatePdf({ ...opts, certId });
  const url      = await uploadCertificatePdf(opts.userId, opts.categoryId, certId, pdfBytes);
  return { url, certId };
}

// ── Legacy SVG (kept so old stored SVG URLs still render) ─────────────────────
// @deprecated — use generateAndUploadCertificate instead
export function generateCertificateSvg(
  userName: string,
  categoryName: string,
  score: number,
  issuedAt: Date,
): string {
  const dateStr = issuedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="640" viewBox="0 0 900 640">
  <rect width="900" height="640" fill="#1A6659"/>
  <rect x="40" y="40" width="820" height="560" rx="12" fill="white"/>
  <text x="450" y="120" font-family="Georgia,serif" font-size="36" fill="#1A6659" text-anchor="middle" font-weight="bold">BAUIN</text>
  <text x="450" y="160" font-family="Georgia,serif" font-size="18" fill="#F0B429" text-anchor="middle">${userName}</text>
  <text x="450" y="200" font-family="Georgia,serif" font-size="13" fill="#666" text-anchor="middle">${categoryName} · ${score}%</text>
  <text x="450" y="560" font-family="Arial,sans-serif" font-size="11" fill="#999" text-anchor="middle">${dateStr}</text>
</svg>`;
}

// Legacy upload kept for callers that still pass SVG strings
export async function uploadCertificate(
  userId:      string,
  categoryId:  string,
  attemptId:   string,
  svgContent:  string,
): Promise<string | null> {
  const s3     = getS3();
  const bucket = process.env.R2_BUCKET;
  if (!s3 || !bucket) return null;
  const key        = `certificates/${userId}/${categoryId}/${attemptId}.svg`;
  const publicBase = process.env.R2_PUBLIC_URL ?? "";
  try {
    await s3.send(new PutObjectCommand({
      Bucket: bucket, Key: key, Body: svgContent,
      ContentType: "image/svg+xml", CacheControl: "public, max-age=31536000",
    }));
    return publicBase ? `${publicBase}/${key}` : null;
  } catch {
    return null;
  }
}
