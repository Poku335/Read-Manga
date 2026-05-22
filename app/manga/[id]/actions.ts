"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function incrementView(mangaId: number) {
  const cookieStore = await cookies();
  const key = `mv_${mangaId}`;
  if (cookieStore.has(key)) return;

  cookieStore.set(key, "1", { maxAge: 60 * 60, httpOnly: true, path: "/" });

  await prisma.manga.update({
    where: { id: mangaId },
    data: { viewCount: { increment: 1 } },
  });
}
