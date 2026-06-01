import { prisma } from "@/lib/db";
import { sendPushToUser } from "@/lib/server/push";
import { sendAnnouncementEmail } from "@/lib/server/email";

type AnnouncementRow = {
  id:         string;
  title:      string;
  body:       string;
  type:       "INFO" | "WARNING" | "PROMOTION";
  target:     "ALL" | "WORKERS" | "SELLERS" | "DISTRIBUTORS" | "VIEWERS";
  createdById: string;
};

const TARGET_ROLE: Record<string, string | null> = {
  ALL:          null,
  WORKERS:      "WORKER",
  SELLERS:      "SELLER",
  DISTRIBUTORS: "DISTRIBUTOR",
  VIEWERS:      "VIEWER",
};

const TYPE_ICON: Record<string, string> = {
  INFO:      "📢",
  WARNING:   "⚠️",
  PROMOTION: "🎉",
};

export async function broadcastAnnouncement(ann: AnnouncementRow): Promise<void> {
  const role = TARGET_ROLE[ann.target];
  const where = role ? { isActive: true, role: role as never } : { isActive: true };

  const users = await prisma.user.findMany({
    where,
    select: { id: true, email: true, name: true },
  });

  if (users.length === 0) return;

  // Create in-app notifications in one batch
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId:    u.id,
      type:      "ANNOUNCEMENT" as const,
      title:     ann.title,
      body:      ann.body.replace(/<[^>]+>/g, "").slice(0, 200),
      metadata:  { announcementId: ann.id, announcementType: ann.type },
      emailSent: false,
    })),
    skipDuplicates: true,
  });

  // Push + email — fire-and-forget in batches of 50
  const icon = TYPE_ICON[ann.type] ?? "📢";
  const BATCH = 50;
  for (let i = 0; i < users.length; i += BATCH) {
    const batch = users.slice(i, i + BATCH);
    await Promise.allSettled(
      batch.flatMap((u) => [
        sendPushToUser(u.id, {
          title: `${icon} ${ann.title}`,
          body:  ann.body.replace(/<[^>]+>/g, "").slice(0, 120),
          tag:   `announcement-${ann.id}`,
          url:   "/dashboard",
        }),
        sendAnnouncementEmail(u.email, u.name, ann.title, ann.body, ann.type),
      ]),
    );
  }

  // Mark as sent
  await prisma.announcement.update({
    where: { id: ann.id },
    data:  { sentAt: new Date() },
  });
}
