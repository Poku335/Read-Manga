import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const CONFIG_KEY = "hero_manga_ids";

export async function GET() {
  const config = await prisma.siteConfig.findUnique({ where: { key: CONFIG_KEY } });
  const ids = config?.value ? config.value.split(",").map(Number).filter(Boolean) : [];

  if (ids.length === 0) return NextResponse.json({ ids: [], mangas: [] });

  const mangas = await prisma.manga.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true, coverImage: true },
  });
  const ordered = ids.map((id) => mangas.find((m) => m.id === id)).filter(Boolean);

  const imageKeys = ids.map((id) => `hero_image_${id}`);
  const imageConfigs = await prisma.siteConfig.findMany({ where: { key: { in: imageKeys } } });
  const heroImages: Record<number, string> = {};
  for (const c of imageConfigs) {
    const id = parseInt(c.key.replace("hero_image_", ""));
    if (!isNaN(id)) heroImages[id] = c.value;
  }

  return NextResponse.json({ ids, mangas: ordered, heroImages });
}

export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { ids } = await req.json() as { ids: number[] };
  if (!Array.isArray(ids)) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const value = ids.slice(0, 5).join(",");
  await prisma.siteConfig.upsert({
    where: { key: CONFIG_KEY },
    update: { value },
    create: { key: CONFIG_KEY, value },
  });
  return NextResponse.json({ ok: true });
}
