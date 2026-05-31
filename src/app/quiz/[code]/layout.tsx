import type { Metadata } from "next";
import { prisma } from "@/lib/db";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://bauin.com";

export async function generateMetadata({
  params,
}: {
  params: { code: string };
}): Promise<Metadata> {
  const { code } = params;

  const collection = await prisma.distributorCollection.findUnique({
    where: { publicLinkCode: code },
    include: {
      quizSessions: {
        where: { status: { in: ["PENDING", "ACTIVE"] } },
        include: {
          episode: {
            include: {
              story: {
                select: { title: true, description: true, coverUrl: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!collection) {
    return {
      title: "Live Quiz Session",
      description: "Join a live BAUIN quiz session — compete and win cash prizes.",
    };
  }

  const session   = collection.quizSessions[0];
  const episode   = session?.episode;
  const story     = episode?.story;

  const quizTitle   = story?.title ?? episode?.title ?? collection.name;
  const description =
    story?.description ??
    `Join the live BAUIN quiz for "${quizTitle}". Answer questions across 5 game phases, beat other players, and win cash prizes. Entry is open now.`;
  const coverUrl    = story?.coverUrl ?? null;
  const pageUrl     = `${APP_URL}/quiz/${code}`;
  const ogTitle     = `${quizTitle} — Live Quiz | BAUIN`;
  const ogDesc      = `🎯 Live quiz open now! Compete in "${quizTitle}", play 5 game phases, and win real cash prizes. Click to join before it fills up.`;

  return {
    title:   `${quizTitle} — Live Quiz`,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type:        "website",
      url:         pageUrl,
      siteName:    "BAUIN",
      title:       ogTitle,
      description: ogDesc,
      images: coverUrl
        ? [{ url: coverUrl, width: 1200, height: 630, alt: quizTitle }]
        : [{ url: `${APP_URL}/icons/icon-512.png`, width: 512, height: 512, alt: "BAUIN" }],
    },
    twitter: {
      card:        coverUrl ? "summary_large_image" : "summary",
      title:       ogTitle,
      description: ogDesc,
      images:      coverUrl ? [coverUrl] : [`${APP_URL}/icons/icon-512.png`],
    },
  };
}

export default function QuizCodeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
