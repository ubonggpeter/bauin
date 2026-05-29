import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { tmpdir } from "os";
import { join } from "path";
import { promises as fs } from "fs";
import { randomBytes } from "crypto";

// Use bundled static ffmpeg binary when system ffmpeg is not available
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

const PREVIEW_DURATION = 30; // seconds

/**
 * Generate a 30-second preview clip from a video buffer.
 * Returns a Buffer of the preview MP4.
 */
export async function generatePreview(videoBuffer: Buffer): Promise<Buffer> {
  const id = randomBytes(8).toString("hex");
  const inputPath = join(tmpdir(), `bauin-in-${id}.mp4`);
  const outputPath = join(tmpdir(), `bauin-preview-${id}.mp4`);

  await fs.writeFile(inputPath, videoBuffer);

  try {
    await runFfmpeg(inputPath, outputPath);
    const preview = await fs.readFile(outputPath);
    return preview;
  } finally {
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
}

function runFfmpeg(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(0)
      .setDuration(PREVIEW_DURATION)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([
        "-preset fast",
        "-crf 28",
        "-movflags +faststart",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
}
