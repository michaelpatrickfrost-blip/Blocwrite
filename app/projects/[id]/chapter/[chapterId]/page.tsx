import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import EditorClient from "./EditorClient";

export default async function ChapterPage({ params }: { params: Promise<{ id: string; chapterId: string }> }) {
  const { id, chapterId } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) redirect("/login");

  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, projectId: id },
    include: {
      project: { select: { id: true, title: true, ownerId: true } },
    },
  });

  if (!chapter || chapter.project.ownerId !== session.user.id) {
    notFound();
  }

  return (
    <main
      className="min-h-screen px-6 py-8"
      style={{ color: "var(--pw-text)" }}
    >
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-sm uppercase font-medium"
              style={{ letterSpacing: "0.2em", color: "rgba(255, 255, 255, 0.35)" }}
            >
              Chapter
            </p>
            <h1
              className="text-3xl font-semibold"
              style={{ color: "rgba(255, 255, 255, 0.9)" }}
            >
              {chapter.title}
            </h1>
            <p style={{ color: "rgba(255, 255, 255, 0.4)" }}>
              Project:{" "}
              <Link className="underline decoration-dotted" href={`/projects/${chapter.project.id}`}>
                {chapter.project.title}
              </Link>
            </p>
          </div>
          <Link href={`/projects/${chapter.project.id}`} className="btn btn-ghost">
            Back to project
          </Link>
        </div>

        <EditorClient
          projectId={chapter.projectId}
          chapterId={chapter.id}
          initialTitle={chapter.title}
          initialContent={chapter.content ?? "<p></p>"}
          initialWordCount={chapter.wordCount ?? 0}
        />
      </div>
    </main>
  );
}
