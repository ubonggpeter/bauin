/**
 * /play/[alias] — short-link redirect to /quiz/[publicLinkCode]
 * Looks up DistributorCollection by customAlias, then redirects.
 */
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";

interface Props { params: { alias: string } }

export default async function PlayAliasPage({ params }: Props) {
  const collection = await prisma.distributorCollection.findUnique({
    where:  { customAlias: params.alias },
    select: { publicLinkCode: true },
  });

  if (!collection) notFound();
  redirect(`/quiz/${collection.publicLinkCode}`);
}
