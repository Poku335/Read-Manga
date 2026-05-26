import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkOrigin } from "@/lib/csrf";

export async function POST(req: NextRequest) {
  try {
    if (!checkOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const body = await req.json();
    const { userId, amount } = body;

    if (!userId || typeof amount !== "number") {
      return NextResponse.json({ error: "userId and a numeric amount are required" }, { status: 400 });
    }
    if (!Number.isInteger(amount) || amount < -999999 || amount > 999999) {
      return NextResponse.json({ error: "amount must be an integer between -999999 and 999999" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { coins: true } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const newBalance = target.coins + amount;
    if (newBalance < 0) {
      return NextResponse.json({ error: "Cannot set balance below 0" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { coins: { increment: amount } },
      select: { id: true, coins: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
