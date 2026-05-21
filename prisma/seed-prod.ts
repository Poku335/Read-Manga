/**
 * Production seed — uses SVG color-card placeholders (no real images, no copyright issues).
 * Requires env: DATABASE_URL / DIRECT_URL  +  BLOB_READ_WRITE_TOKEN
 *
 * Run:  npx tsx prisma/seed-prod.ts
 */

import { PrismaClient, MangaType } from "@prisma/client";
import { put } from "@vercel/blob";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CHAPTERS_PER_MANGA = 3;
const PAGES_PER_CHAPTER = 5;

// ── Genre → brand color ──────────────────────────────────────────────────────
const GENRE_COLORS: Record<string, string> = {
  Action: "#DC2626",
  Fantasy: "#7C3AED",
  "Sci-Fi": "#2563EB",
  Historical: "#D97706",
  Mystery: "#475569",
  Romance: "#DB2777",
  Comedy: "#16A34A",
  Horror: "#18181B",
  Drama: "#9333EA",
  "Slice of Life": "#0891B2",
  Adventure: "#EA580C",
  Thriller: "#1E3A5F",
};

// ── SVG builders ─────────────────────────────────────────────────────────────

function coverSvg(title: string, genre: string, color: string): Buffer {
  const words = title.split(" ");
  const mid = Math.ceil(words.length / 2);
  const line1 = words.slice(0, mid).join(" ");
  const line2 = words.slice(mid).join(" ");
  const hasLine2 = line2.length > 0;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="40%" stop-color="${color}" stop-opacity="1"/>
      <stop offset="100%" stop-color="#000" stop-opacity="1"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="400" height="600" fill="url(#g)"/>
  <rect width="400" height="600" fill="url(#grid)"/>
  <rect width="400" height="600" fill="url(#shine)"/>
  <rect x="140" y="48" width="120" height="28" rx="14" fill="rgba(255,255,255,0.15)"/>
  <text x="200" y="67" text-anchor="middle" fill="rgba(255,255,255,0.85)"
        font-family="'Helvetica Neue',Arial,sans-serif" font-size="13" font-weight="600"
        letter-spacing="1">${genre.toUpperCase()}</text>
  <text x="200" y="${hasLine2 ? 510 : 528}" text-anchor="middle" fill="white"
        font-family="'Helvetica Neue',Arial,sans-serif" font-size="28" font-weight="700">${line1}</text>
  ${hasLine2
    ? `<text x="200" y="548" text-anchor="middle" fill="white"
        font-family="'Helvetica Neue',Arial,sans-serif" font-size="28" font-weight="700">${line2}</text>`
    : ""}
  <rect x="170" y="570" width="60" height="3" rx="1.5" fill="rgba(255,255,255,0.4)"/>
</svg>`;
  return Buffer.from(svg, "utf-8");
}

function pageSvg(title: string, chapter: number, page: number, color: string): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.85"/>
    </linearGradient>
    <pattern id="dots" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1.5" fill="rgba(255,255,255,0.07)"/>
    </pattern>
  </defs>
  <rect width="800" height="1200" fill="${color}"/>
  <rect width="800" height="1200" fill="url(#g)"/>
  <rect width="800" height="1200" fill="url(#dots)"/>
  <text x="400" y="565" text-anchor="middle" fill="rgba(255,255,255,0.5)"
        font-family="'Helvetica Neue',Arial,sans-serif" font-size="40" font-weight="700">${title}</text>
  <text x="400" y="622" text-anchor="middle" fill="rgba(255,255,255,0.35)"
        font-family="'Helvetica Neue',Arial,sans-serif" font-size="26">Chapter ${chapter}  ·  Page ${page}</text>
  <text x="760" y="1170" text-anchor="end" fill="rgba(255,255,255,0.25)"
        font-family="'Helvetica Neue',Arial,sans-serif" font-size="20">${page}</text>
</svg>`;
  return Buffer.from(svg, "utf-8");
}

async function uploadSvg(buf: Buffer, pathname: string): Promise<string> {
  const { url } = await put(pathname, buf, {
    access: "public",
    contentType: "image/svg+xml",
    addRandomSuffix: false,
  });
  return url;
}

// ── Manga catalogue ──────────────────────────────────────────────────────────

const MANGA_DATA = [
  {
    title: "Shadow Blade Chronicles",
    genre: "Action",
    status: "Ongoing",
    type: MangaType.MANHWA,
    description:
      "A young warrior discovers an ancient blade that grants him the power of shadows. As he unravels the mysteries of the blade's origin, he must confront dark forces that threaten his world.",
  },
  {
    title: "Celestial Academy",
    genre: "Fantasy",
    status: "Ongoing",
    type: MangaType.MANHWA,
    description:
      "In a world where magic is real, students at the prestigious Celestial Academy compete for glory. Follow Mia as she discovers her rare dual-element abilities and navigates friendship, rivalry, and ancient conspiracies.",
  },
  {
    title: "Steel Heart",
    genre: "Sci-Fi",
    status: "Completed",
    type: MangaType.MANGA,
    description:
      "A mechanical engineer in a dystopian future creates an android with a human heart. Together they fight against the oppressive regime that controls the city's energy grid.",
  },
  {
    title: "Dragon's Oath",
    genre: "Fantasy",
    status: "Ongoing",
    type: MangaType.MANHWA,
    description:
      "A disgraced knight forges an unbreakable pact with the last living dragon. Together they must prevent an ancient evil from awakening beneath the ruins of a forgotten kingdom.",
  },
  {
    title: "Neon Ghost",
    genre: "Sci-Fi",
    status: "Ongoing",
    type: MangaType.MANHWA,
    description:
      "In the rain-soaked megacity of Neo Osaka, a hacker who can project her consciousness into the city's neural net hunts a serial killer who exists only inside the grid.",
  },
  {
    title: "Sakura Samurai",
    genre: "Historical",
    status: "Completed",
    type: MangaType.MANGA,
    description:
      "During the twilight of the Edo period, a wandering female swordswoman seeks the man who destroyed her clan. Each town she passes through hides a piece of the truth.",
  },
  {
    title: "The Last Alchemist",
    genre: "Fantasy",
    status: "Ongoing",
    type: MangaType.MANHWA,
    description:
      "When the art of alchemy is banned across the empire, its last practitioner must disguise herself as a court herbalist while secretly working to restore balance to a world poisoned by forbidden science.",
  },
  {
    title: "Midnight Detective",
    genre: "Mystery",
    status: "Ongoing",
    type: MangaType.MANGA,
    description:
      "A detective who can read the final memories of the dead takes on cases the living refuse to touch. But each vision costs him a piece of his own past.",
  },
  {
    title: "Ocean of Stars",
    genre: "Romance",
    status: "Ongoing",
    type: MangaType.MANHWA,
    description:
      "Two rival navigators on a floating sky-archipelago discover their star charts are half of the same map. Their journey to the world's edge becomes something neither expected.",
  },
  {
    title: "Iron Fist Academy",
    genre: "Action",
    status: "Ongoing",
    type: MangaType.MANHWA,
    description:
      "At a martial arts school hidden inside an ordinary high school, students train in secret combat arts inherited from ancient clans. A transfer student with no technique somehow defeats the top fighter on his first day.",
  },
  {
    title: "Phantom Protocol",
    genre: "Action",
    status: "Ongoing",
    type: MangaType.MANHWA,
    description:
      "An elite ghost operative erases people from existence — memories, records, identities — until the next target is herself. Now she must stay invisible to an agency that trained her to find anyone.",
  },
  {
    title: "Witch's Garden",
    genre: "Fantasy",
    status: "Ongoing",
    type: MangaType.MANHWA,
    description:
      "A young witch inherits her grandmother's floating botanical garden and discovers every plant is a sealed memory. Tending them means living someone else's forgotten life for a day.",
  },
  {
    title: "Crimson Empire",
    genre: "Historical",
    status: "Ongoing",
    type: MangaType.MANHWA,
    description:
      "Beneath the golden surface of a prosperous empire lie rivers of blood. A palace servant of low birth uncovers a conspiracy that reaches the throne itself and must decide how far she will go for justice.",
  },
] as const;

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Starting production seed...\n");

  const adminPassword = await bcrypt.hash("admin1234", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@manga.com" },
    update: {},
    create: {
      email: "admin@manga.com",
      password: adminPassword,
      name: "Admin User",
      role: "ADMIN",
      coins: 9999,
    },
  });
  const user1 = await prisma.user.upsert({
    where: { email: "user1@example.com" },
    update: {},
    create: { email: "user1@example.com", name: "Test User 1", role: "USER", coins: 50 },
  });
  console.log("✓ Users ready\n");

  const seededChapters: Array<{ id: number; chapterNumber: number }> = [];

  for (let m = 0; m < MANGA_DATA.length; m++) {
    const md = MANGA_DATA[m];
    const color = GENRE_COLORS[md.genre] ?? "#374151";
    const slug = `seed-m${String(m + 1).padStart(2, "0")}`;

    const coverUrl = await uploadSvg(
      coverSvg(md.title, md.genre, color),
      `seed/covers/${slug}.svg`
    );

    let manga = await prisma.manga.findFirst({ where: { title: md.title } });
    if (!manga) {
      manga = await prisma.manga.create({
        data: {
          title: md.title,
          description: md.description,
          genre: md.genre,
          status: md.status,
          type: md.type,
          coverImage: coverUrl,
          viewCount: Math.floor(Math.random() * 8000) + 500,
          authorId: admin.id,
        },
      });
    } else {
      manga = await prisma.manga.update({
        where: { id: manga.id },
        data: { coverImage: coverUrl },
      });
    }

    process.stdout.write(`[${m + 1}/${MANGA_DATA.length}] ${md.title}\n`);

    for (let c = 0; c < CHAPTERS_PER_MANGA; c++) {
      const chapter = await prisma.chapter.upsert({
        where: { mangaId_chapterNumber: { mangaId: manga.id, chapterNumber: c + 1 } },
        update: {},
        create: {
          mangaId: manga.id,
          chapterNumber: c + 1,
          title: `Chapter ${c + 1}`,
          isPaid: false,
          price: 0,
        },
      });
      seededChapters.push({ id: chapter.id, chapterNumber: c + 1 });

      for (let p = 0; p < PAGES_PER_CHAPTER; p++) {
        const pageUrl = await uploadSvg(
          pageSvg(md.title, c + 1, p + 1, color),
          `seed/pages/${slug}-ch${c + 1}-p${p + 1}.svg`
        );
        await prisma.page.upsert({
          where: { chapterId_pageNumber: { chapterId: chapter.id, pageNumber: p + 1 } },
          update: { imagePath: pageUrl },
          create: { chapterId: chapter.id, pageNumber: p + 1, imagePath: pageUrl },
        });
      }
      process.stdout.write(`   Ch.${c + 1} ✓\n`);
    }
  }

  // Mark last chapter of final 5 manga as PAID (demo paywall)
  const paidChaps = seededChapters
    .filter((ch) => ch.chapterNumber === CHAPTERS_PER_MANGA)
    .slice(-5);
  for (const ch of paidChaps) {
    await prisma.chapter.update({ where: { id: ch.id }, data: { isPaid: true, price: 10 } });
  }
  if (paidChaps[0]) {
    await prisma.purchase.upsert({
      where: { userId_chapterId: { userId: user1.id, chapterId: paidChaps[0].id } },
      update: {},
      create: { userId: user1.id, chapterId: paidChaps[0].id, paidAmount: 10 },
    });
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Seed complete!
  ${MANGA_DATA.length} manga  ·  ${MANGA_DATA.length * CHAPTERS_PER_MANGA} chapters  ·  ${MANGA_DATA.length * CHAPTERS_PER_MANGA * PAGES_PER_CHAPTER} pages
  Last 5 manga — Chapter 3 is PAID (10 coins)

  Admin   admin@manga.com  /  admin1234  (9999 coins)
  User 1  user1@example.com             (50 coins)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
