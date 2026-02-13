import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { tmpdir } from "os";
import { join } from "path";
import { readFile, unlink } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || "pilotwritter";

export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as any;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await request.json();
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: session.user.id },
    include: { chapters: { orderBy: { order: "asc" } } },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  type EpubGenerator = new (
    options: Record<string, unknown>,
    output: string,
  ) => { promise: Promise<void> };

  const epubModule = (await import("epub-gen")) as unknown as {
    default: EpubGenerator;
  };
  const Epub = epubModule.default;
  const output = join(tmpdir(), `${project.id}-${Date.now()}.epub`);

  const content = project.chapters.map((chapter) => ({
    title: chapter.title,
    data: chapter.content ?? "",
  }));

  const options = {
    title: project.title,
    author: session.user.name ?? session.user.email ?? "Pilotwritter",
    content,
  };

  await new Epub(options, output).promise;

  const buffer = await readFile(output);
  await unlink(output).catch(() => {});

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/epub+zip",
      "Content-Disposition": `attachment; filename=\"${slugify(project.title)}.epub\"`,
    },
  });
}
