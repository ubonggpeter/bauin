/**
 * POST /api/stories/upload-video
 * Accepts multipart/form-data with a "video" field.
 * Generates a 30-second preview clip via ffmpeg, saves both files,
 * and returns { videoUrl, previewUrl }.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { generate30sPreview } from "@/lib/server/video-preview";

export const dynamic = "force-dynamic";

const ALLOWED = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"];
const MAX_BYTES = 200 * 1024 * 1024; // 200 MB

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "SELLER" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("video") as File | null;
  if (!file) return NextResponse.json({ error: "No video file provided" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported video type (mp4, webm, mov, mkv)" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 200 MB)" }, { status: 400 });
  }

  const bytes  = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext    = extname(file.name).replace(".", "").toLowerCase() || "mp4";
  const stem   = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const uploadDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const videoFilename   = `${stem}.${ext}`;
  const previewFilename = `${stem}-preview.mp4`;

  await writeFile(join(uploadDir, videoFilename), buffer);

  let previewUrl: string | null = null;
  try {
    const previewBuffer = await generate30sPreview(buffer, ext);
    await writeFile(join(uploadDir, previewFilename), previewBuffer);
    previewUrl = `/uploads/${previewFilename}`;
  } catch {
    // Preview generation is best-effort; proceed without it
  }

  return NextResponse.json({
    videoUrl:   `/uploads/${videoFilename}`,
    previewUrl,
  });
}
