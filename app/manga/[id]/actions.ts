"use server";

import { prisma } from "@/lib/prisma";

export async function incrementView(mangaId: number) {
  await prisma.manga.update({
    where: { id: mangaId },
    data: { viewCount: { increment: 1 } },
  });
}
