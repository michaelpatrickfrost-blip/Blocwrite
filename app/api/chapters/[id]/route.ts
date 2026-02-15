/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = (await getServerSession(authOptions)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, wordCount, title } = await request.json();

    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: { project: { select: { ownerId: true } } },
    });

    if (!chapter) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!chapter.project || chapter.project.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    const data: Record<string, unknown> = {};
    if (typeof content === "string") data.content = content;
    if (typeof wordCount === "number") data.wordCount = wordCount;
    if (typeof title === "string" && title.trim()) data.title = title.trim();

    const updated = await prisma.chapter.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update chapter error:", error);
    return NextResponse.json({ error: "Failed to update chapter." }, { status: 500 });
  }
}
