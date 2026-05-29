import { Router } from "express";
import multer from "multer";
import { authenticate } from "../middleware/authenticate";
import { requireAdmin } from "../middleware/requireAdmin";
import { uploadFile, type UploadResult } from "../services/storage.service";
import { generatePreview } from "../services/ffmpeg.service";
import { prisma } from "../utils/prisma";
import type { AuthRequest } from "../middleware/authenticate";

const router = Router();

// Store files in memory; for very large videos we stream to disk via limits
const upload = multer({
  storage: multer.memoryStorage(),
});

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
});

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function requireRole(...roles: string[]) {
  return async (req: AuthRequest, res: any, next: any) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true, isActive: true },
    });
    if (!user || !user.isActive || !roles.includes(user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}

// ── POST /api/upload/pdf — admin only ─────────────────────────────────────────

router.post(
  "/pdf",
  authenticate,
  requireAdmin,
  upload.single("file"),
  async (req: AuthRequest, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }
    if (file.mimetype !== "application/pdf") {
      res.status(400).json({ error: "Only PDF files are accepted" });
      return;
    }

    const ext = "pdf";
    const key = `documents/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const result: UploadResult = await uploadFile({
      key,
      body: file.buffer,
      contentType: file.mimetype,
      size: file.size,
    });

    res.status(201).json({ file: result });
  }
);

// ── POST /api/upload/image — any authenticated user, 5 MB max ────────────────

router.post(
  "/image",
  authenticate,
  imageUpload.single("file"),
  async (req: AuthRequest, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }
    if (!file.mimetype.startsWith("image/")) {
      res.status(400).json({ error: "Only image files are accepted" });
      return;
    }

    const ext = file.originalname.split(".").pop() ?? "jpg";
    const key = `images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const result: UploadResult = await uploadFile({
      key,
      body: file.buffer,
      contentType: file.mimetype,
      size: file.size,
    });

    res.status(201).json({ file: result });
  }
);

// ── POST /api/upload/video — sellers (DISTRIBUTOR+), 500 MB max ───────────────
// Optional body params: storyId, episodeNumber (for story video path structure)

router.post(
  "/video",
  authenticate,
  requireRole("ADMIN", "MODERATOR", "DISTRIBUTOR"),
  videoUpload.single("file"),
  async (req: AuthRequest, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }
    if (!file.mimetype.startsWith("video/")) {
      res.status(400).json({ error: "Only video files are accepted" });
      return;
    }

    const { storyId, episodeNumber } = req.body as {
      storyId?: string;
      episodeNumber?: string;
    };

    // Determine storage key
    let fullKey: string;
    let previewKey: string | undefined;

    if (storyId && episodeNumber) {
      const epNum = parseInt(episodeNumber, 10);
      if (isNaN(epNum) || epNum < 1) {
        res.status(400).json({ error: "episodeNumber must be a positive integer" });
        return;
      }
      fullKey = `stories/${storyId}/ep${epNum}/full.mp4`;
      previewKey = `stories/${storyId}/ep${epNum}/preview.mp4`;
    } else {
      const ts = Date.now();
      const rand = Math.random().toString(36).slice(2);
      fullKey = `videos/${ts}-${rand}.mp4`;
    }

    // Upload full video
    const [fullResult] = await Promise.all([
      uploadFile({
        key: fullKey,
        body: file.buffer,
        contentType: file.mimetype,
        size: file.size,
        multipart: file.size > 100 * 1024 * 1024,
      }),
    ]);

    // Generate and upload 30-second preview in the background
    let previewResult: UploadResult | null = null;
    if (previewKey) {
      try {
        const previewBuffer = await generatePreview(file.buffer);
        previewResult = await uploadFile({
          key: previewKey,
          body: previewBuffer,
          contentType: "video/mp4",
          size: previewBuffer.byteLength,
        });
      } catch (err) {
        console.error("[upload/video] Preview generation failed:", err);
        // Non-fatal — full video still uploaded successfully
      }
    }

    res.status(201).json({
      file: fullResult,
      ...(previewResult && { preview: previewResult }),
    });
  }
);

export default router;
