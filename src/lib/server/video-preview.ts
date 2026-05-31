import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { tmpdir } from "os";
import { join } from "path";
import { writeFile, readFile, unlink } from "fs/promises";
import { randomBytes } from "crypto";

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

const PREVIEW_SECONDS = 30;

export async function generate30sPreview(videoBuffer: Buffer, ext = "mp4"): Promise<Buffer> {
  const id = randomBytes(8).toString("hex");
  const inputPath  = join(tmpdir(), `bauin-in-${id}.${ext}`);
  const outputPath = join(tmpdir(), `bauin-out-${id}.mp4`);

  await writeFile(inputPath, videoBuffer);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(0)
      .setDuration(PREVIEW_SECONDS)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions(["-movflags", "faststart", "-preset", "fast", "-crf", "28"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });

  const preview = await readFile(outputPath);
  await Promise.all([unlink(inputPath), unlink(outputPath)]).catch(() => {});
  return preview;
}
