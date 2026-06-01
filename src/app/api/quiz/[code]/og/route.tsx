import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getNumericSetting } from "@/lib/server/platform-settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const W = 1200;
const H = 630;

// ── R2 ────────────────────────────────────────────────────────────────────────

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

async function uploadToR2(buf: ArrayBuffer, key: string): Promise<void> {
  const s3     = getS3();
  const bucket = process.env.R2_BUCKET;
  if (!s3 || !bucket) return;
  try {
    await s3.send(new PutObjectCommand({
      Bucket:       bucket,
      Key:          key,
      Body:         Buffer.from(buf),
      ContentType:  "image/png",
      CacheControl: "public, max-age=300",
      Metadata:     { type: "og-image" },
    }));
  } catch (err) {
    console.error("[og] R2 upload failed:", err);
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } },
) {
  const { code } = params;

  // ── Load session data ──────────────────────────────────────────────────────
  const collection = await prisma.distributorCollection.findUnique({
    where:   { publicLinkCode: code },
    include: {
      quizSessions: {
        where:   { status: { in: ["PENDING", "ACTIVE"] } },
        orderBy: { createdAt: "desc" },
        take:    1,
        include: {
          _count:  { select: { entries: true } },
          bets:    { select: { stake: true } },
          episode: {
            include: {
              story: { select: { title: true, coverUrl: true } },
            },
          },
        },
      },
    },
  });

  const session    = collection?.quizSessions[0];
  const episode    = session?.episode;
  const story      = episode?.story;
  const title      = story?.title ?? episode?.title ?? collection?.name ?? "Live Quiz";
  const coverUrl   = story?.coverUrl ?? collection?.logoUrl ?? null;

  const entryFee  = await getNumericSetting("QUIZ_ENTRY_FEE", 500);
  const betTotal  = session?.bets.reduce((s, b) => s + Number(b.stake), 0) ?? 0;
  const players   = session?._count.entries ?? 0;
  const prizePool = Math.round(betTotal + players * entryFee * 0.4);

  // ── Clamp title font size ─────────────────────────────────────────────────
  const titleSize = title.length > 38 ? 40 : title.length > 24 ? 50 : 60;
  const hasThumb  = Boolean(coverUrl);

  // ── Build JSX (satori-compatible) ─────────────────────────────────────────
  const jsx = (
    <div
      style={{
        display:   "flex",
        width:     `${W}px`,
        height:    `${H}px`,
        position:  "relative",
        fontFamily: "sans-serif",
        overflow:  "hidden",
      }}
    >
      {/* Background gradient */}
      <div style={{
        position:        "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: "linear-gradient(140deg, #0B3D33 0%, #1A6659 55%, #1E7868 100%)",
        display: "flex",
      }} />

      {/* Subtle decorative circles */}
      <div style={{
        position: "absolute",
        top: "-90px", right: hasThumb ? "500px" : "80px",
        width: "340px", height: "340px",
        borderRadius: "9999px",
        background: "rgba(255,255,255,0.035)",
        display: "flex",
      }} />
      <div style={{
        position: "absolute",
        bottom: "-70px", left: "-50px",
        width: "250px", height: "250px",
        borderRadius: "9999px",
        background: "rgba(255,255,255,0.025)",
        display: "flex",
      }} />

      {/* Story thumbnail — right panel */}
      {hasThumb && (
        <div style={{
          position: "absolute",
          top: 0, right: 0,
          width:  "460px",
          height: "630px",
          display: "flex",
        }}>
          {/* Cover image as background */}
          <div style={{
            width:  "460px",
            height: "630px",
            backgroundImage:    `url(${coverUrl})`,
            backgroundSize:     "cover",
            backgroundPosition: "center",
            display: "flex",
          }} />
          {/* Fade from the left so content reads cleanly */}
          <div style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: "linear-gradient(to right, #1A6659 0%, rgba(26,102,89,0.65) 45%, rgba(26,102,89,0.05) 100%)",
            display: "flex",
          }} />
        </div>
      )}

      {/* Main content column */}
      <div style={{
        position:       "relative",
        zIndex:         2,
        display:        "flex",
        flexDirection:  "column",
        justifyContent: "center",
        padding:        "56px 64px",
        width:          hasThumb ? "780px" : "1100px",
      }}>

        {/* BAUIN logo row */}
        <div style={{
          display:      "flex",
          alignItems:   "center",
          marginBottom: "28px",
        }}>
          {/* B badge */}
          <div style={{
            width:           "50px",
            height:          "50px",
            background:      "#F0B429",
            borderRadius:    "10px",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            fontSize:        "26px",
            fontWeight:      900,
            color:           "#1A6659",
            marginRight:     "12px",
          }}>B</div>
          <span style={{
            color:         "rgba(255,255,255,0.6)",
            fontSize:      "20px",
            fontWeight:    700,
            letterSpacing: "0.07em",
            marginRight:   "14px",
          }}>BAUIN</span>
          {/* Live pill */}
          <div style={{
            display:      "flex",
            background:   "rgba(255,255,255,0.12)",
            padding:      "5px 13px",
            borderRadius: "100px",
          }}>
            <span style={{
              color:         "#A8D8CE",
              fontSize:      "13px",
              fontWeight:    700,
              letterSpacing: "0.12em",
            }}>LIVE QUIZ</span>
          </div>
        </div>

        {/* Story title */}
        <div style={{
          display:      "flex",
          marginBottom: "18px",
          maxWidth:     "680px",
        }}>
          <span style={{
            color:         "white",
            fontSize:      `${titleSize}px`,
            fontWeight:    900,
            lineHeight:    1.1,
            letterSpacing: "-0.02em",
          }}>
            {title}
          </span>
        </div>

        {/* "Play Now on BAUIN" CTA */}
        <div style={{
          display:      "flex",
          marginBottom: "30px",
        }}>
          <span style={{
            color:      "#F0B429",
            fontSize:   "26px",
            fontWeight: 700,
          }}>
            Play Now on BAUIN →
          </span>
        </div>

        {/* Prize pool badge */}
        <div style={{
          display:         "flex",
          alignItems:      "center",
          background:      "rgba(240,180,41,0.14)",
          border:          "1.5px solid rgba(240,180,41,0.45)",
          borderRadius:    "14px",
          padding:         "14px 22px",
          gap:             "10px",
          width:           "fit-content",
        }}>
          <span style={{ fontSize: "22px" }}>🏆</span>
          <span style={{
            color:      "#F0B429",
            fontSize:   "22px",
            fontWeight: 900,
          }}>
            {prizePool > 0
              ? `₦${prizePool.toLocaleString()} Prize Pool`
              : "Live Prize Pool — Join Now!"}
          </span>
        </div>
      </div>

      {/* Bottom gold stripe */}
      <div style={{
        position:   "absolute",
        bottom: 0, left: 0, right: 0,
        height:     "5px",
        background: "#F0B429",
        display:    "flex",
      }} />
    </div>
  );

  // ── Generate PNG ──────────────────────────────────────────────────────────
  const imgRes = new ImageResponse(jsx, { width: W, height: H });
  const buf    = await imgRes.arrayBuffer();

  // Store in R2 asynchronously (don't block the response)
  void uploadToR2(buf, `og-images/quiz/${code}.png`);

  return new Response(buf, {
    headers: {
      "Content-Type":  "image/png",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
