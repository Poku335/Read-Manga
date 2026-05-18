import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const mangaIdEntry = form.get("mangaId");
  const mangaId = typeof mangaIdEntry === "string" ? parseInt(mangaIdEntry) : NaN;
  if (isNaN(mangaId)) return NextResponse.json({ error: "Invalid mangaId" }, { status: 400 });

  const image = form.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.includes(image.type)) {
    return NextResponse.json({ error: "Unsupported file type. Must be JPEG, PNG, or WebP." }, { status: 400 });
  }
  if (image.size > MAX_SIZE) {
    return NextResponse.json({ error: "Image too large. Maximum size is 5 MB." }, { status: 400 });
  }

  const ext = image.name.split(".").pop() || "jpg";
  const blob = await put(`hero/${mangaId}_${Date.now()}.${ext}`, image, { access: "public" });

  const url = blob.url;
  const key = `hero_image_${mangaId}`;
  await prisma.siteConfig.upsert({
    where: { key },
    update: { value: url },
    create: { key, value: url },
  });

  return NextResponse.json({ ok: true, url });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { mangaId } = await req.json() as { mangaId: number };
  if (!mangaId || isNaN(Number(mangaId))) {
    return NextResponse.json({ error: "Invalid mangaId" }, { status: 400 });
  }

  const key = `hero_image_${mangaId}`;
  await prisma.siteConfig.deleteMany({ where: { key } });

  return NextResponse.json({ ok: true });
}
