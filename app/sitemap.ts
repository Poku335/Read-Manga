import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://read-manboh.vercel.app";

  const mangas = await prisma.manga.findMany({
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const mangaUrls: MetadataRoute.Sitemap = mangas.map((m) => ({
    url: `${baseUrl}/manga/${m.id}`,
    lastModified: m.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/news`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    ...mangaUrls,
  ];
}
