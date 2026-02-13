import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

async function createChapter(projectId: string, formData: FormData) {
  "use server";
  const session = await getAuthSession();
  if (!session?.user?.id) redirect("/login");

  const title = String(formData.get("title") ?? "").trim() || "Untitled chapter";

  const last = await prisma.chapter.findFirst({
    where: { projectId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await prisma.chapter.create({
    data: {
      projectId,
      title,
      order: (last?.order ?? 0) + 1,
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id, ownerId: session.user.id },
    include: { chapters: { orderBy: { order: "asc" } } },
  });

  if (!project) {
    notFound();
  }

  const totalWords = project.chapters.reduce((sum, c) => sum + (c.wordCount ?? 0), 0);
  const goalPercent = project.goalWords
    ? Math.min(100, Math.round((totalWords / project.goalWords) * 100))
    : null;

  return (
    <div className="pw-wallpaper">
      <div className="pw-window" style={{ minHeight: "680px" }}>
        {/* Sidebar */}
        <aside className="pw-sidebar">
          <div className="pw-logo">
            <img src="/blocwrite-main-dark.png" alt="Blocwrite" className="pw-logo-full" />
          </div>

          <Link href="/dashboard" className="pw-back-link">
            ← Dashboard
          </Link>

          <div className="pw-section-title">Chapters</div>
          <div className="pw-list" style={{ flex: 1, overflow: "auto" }}>
            {project.chapters.map((chapter) => (
              <Link
                key={chapter.id}
                href={`/projects/${project.id}/chapter/${chapter.id}`}
                className="pw-item"
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {chapter.title}
                </span>
                <span style={{ fontSize: "11px", color: "var(--pw-text-muted)", flexShrink: 0 }}>
                  {chapter.wordCount.toLocaleString()}w
                </span>
              </Link>
            ))}
            {project.chapters.length === 0 && (
              <p style={{ padding: "8px 10px", fontSize: "13px", color: "var(--pw-text-muted)" }}>
                No chapters yet
              </p>
            )}
          </div>

          {/* New chapter */}
          <div style={{ borderTop: "1px solid var(--pw-border)", paddingTop: "10px" }}>
            <form
              action={createChapter.bind(null, project.id)}
              style={{ display: "flex", gap: "6px" }}
            >
              <input
                name="title"
                placeholder="New chapter..."
                className="pw-create-input"
                style={{ flex: 1, fontSize: "12px", padding: "7px 9px" }}
              />
              <button type="submit" className="btn btn-primary" style={{ fontSize: "12px", padding: "7px 10px" }}>
                Add
              </button>
            </form>
          </div>
        </aside>

        {/* Topbar */}
        <div className="pw-topbar">
          <span className="pw-project-title">{project.title}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="pw-pill">{totalWords.toLocaleString()} words</span>
            <span className="pw-pill">
              {project.chapters.length} chapter{project.chapters.length !== 1 ? "s" : ""}
            </span>
            {goalPercent !== null && (
              <span className="pw-pill" style={{ color: "var(--accent-text)", fontWeight: 600 }}>
                {goalPercent}%
              </span>
            )}
          </div>
        </div>

        {/* Main */}
        <section className="pw-home-main">
          <div className="pw-home-header">
            <h1 className="pw-home-title">{project.title}</h1>
            <p className="pw-home-subtitle">
              {totalWords.toLocaleString()} words &middot; {project.chapters.length} chapter
              {project.chapters.length !== 1 ? "s" : ""}
              {project.goalWords
                ? ` · ${goalPercent}% of ${project.goalWords.toLocaleString()} word goal`
                : ""}
            </p>
          </div>

          {/* Progress */}
          {project.goalWords && (
            <div style={{ maxWidth: "500px" }}>
              <div className="pw-progress">
                <span style={{ width: `${goalPercent}%`, transition: "width 500ms ease" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                <span style={{ fontSize: "12px", color: "var(--pw-text-muted)" }}>
                  {totalWords.toLocaleString()}
                </span>
                <span style={{ fontSize: "12px", color: "var(--pw-text-muted)" }}>
                  {project.goalWords.toLocaleString()} goal
                </span>
              </div>
            </div>
          )}

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", maxWidth: "500px" }}>
            {[
              { label: "Total Words", value: totalWords.toLocaleString() },
              { label: "Chapters", value: String(project.chapters.length) },
              { label: "Reading Time", value: `${Math.max(1, Math.round(totalWords / 250))} min` },
            ].map((stat) => (
              <div key={stat.label} className="card" style={{ padding: "14px" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--pw-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {stat.label}
                </p>
                <p style={{ fontSize: "26px", fontWeight: 700, color: "var(--pw-text)", lineHeight: 1.15, marginTop: "4px" }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Chapter list */}
          <div>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--pw-text)", marginBottom: "10px" }}>
              Chapters
            </h2>
            {project.chapters.length === 0 ? (
              <div className="pw-empty">
                <p className="pw-empty-title">No chapters yet</p>
                <p className="pw-empty-subtitle">
                  Use the sidebar to add your first chapter.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {project.chapters.map((chapter, i) => (
                  <Link
                    key={chapter.id}
                    href={`/projects/${project.id}/chapter/${chapter.id}`}
                    className="pw-novel-card"
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      gap: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-text)", minWidth: "22px", textAlign: "right" }}>
                        {i + 1}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--pw-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {chapter.title}
                        </p>
                        <p style={{ fontSize: "12px", color: "var(--pw-text-muted)", marginTop: "1px" }}>
                          {chapter.wordCount.toLocaleString()} words
                        </p>
                      </div>
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--pw-text-muted)", flexShrink: 0 }}>Open →</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
