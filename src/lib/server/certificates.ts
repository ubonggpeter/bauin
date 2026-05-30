import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function getS3Client(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function generateCertificateSvg(
  userName: string,
  categoryName: string,
  score: number,
  issuedAt: Date
): string {
  const dateStr = issuedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="640" viewBox="0 0 900 640">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1A6659;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0E4A3D;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#F0B429;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#E09000;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="900" height="640" fill="url(#bg)" />
  <rect x="30" y="30" width="840" height="580" rx="16" fill="white" opacity="0.05" />
  <rect x="50" y="50" width="800" height="8" rx="4" fill="url(#gold)" />
  <text x="450" y="130" font-family="Georgia, serif" font-size="14" fill="#F0B429" text-anchor="middle" letter-spacing="6">CERTIFICATE OF ACHIEVEMENT</text>
  <text x="450" y="200" font-family="Georgia, serif" font-size="48" fill="white" text-anchor="middle" font-weight="bold">BAUIN</text>
  <text x="450" y="240" font-family="Georgia, serif" font-size="13" fill="rgba(255,255,255,0.7)" text-anchor="middle" letter-spacing="3">BILLIONAIRES AI USERS INCOME NETWORK</text>
  <line x1="250" y1="270" x2="650" y2="270" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
  <text x="450" y="310" font-family="Georgia, serif" font-size="16" fill="rgba(255,255,255,0.8)" text-anchor="middle">This certifies that</text>
  <text x="450" y="360" font-family="Georgia, serif" font-size="34" fill="white" text-anchor="middle" font-weight="bold">${userName}</text>
  <text x="450" y="400" font-family="Georgia, serif" font-size="16" fill="rgba(255,255,255,0.8)" text-anchor="middle">has successfully completed</text>
  <text x="450" y="438" font-family="Georgia, serif" font-size="22" fill="#F0B429" text-anchor="middle" font-weight="bold">${categoryName}</text>
  <text x="450" y="474" font-family="Georgia, serif" font-size="16" fill="rgba(255,255,255,0.8)" text-anchor="middle">with a score of ${score}%</text>
  <line x1="250" y1="508" x2="650" y2="508" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
  <text x="450" y="543" font-family="Georgia, serif" font-size="13" fill="rgba(255,255,255,0.6)" text-anchor="middle">Issued on ${dateStr}</text>
  <rect x="50" y="582" width="800" height="8" rx="4" fill="url(#gold)" />
</svg>`;
}

export async function uploadCertificate(
  userId: string,
  categoryId: string,
  attemptId: string,
  svgContent: string
): Promise<string | null> {
  const s3 = getS3Client();
  const bucket = process.env.R2_BUCKET;
  if (!s3 || !bucket) return null;

  const key = `certificates/${userId}/${categoryId}/${attemptId}.svg`;
  const publicBase = process.env.R2_PUBLIC_URL ?? "";

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: svgContent,
        ContentType: "image/svg+xml",
        CacheControl: "public, max-age=31536000",
      })
    );
    return publicBase ? `${publicBase}/${key}` : null;
  } catch {
    return null;
  }
}
