import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, title } = await request.json();
    if (!projectId || !title) {
      return NextResponse.json({ error: "projectId and title are required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });

    if (!project || project.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    const lastOrder = await prisma.chapter.findFirst({
      where: { projectId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const chapter = await prisma.chapter.create({
      data: {
        projectId,
        title: title.trim(),
        order: (lastOrder?.order ?? 0) + 1,
      },
    });

    return NextResponse.json(chapter);
  } catch (error) {
    console.error("Create chapter error:", error);
    return NextResponse.json({ error: "Failed to create chapter." }, { status: 500 });
  }
}
