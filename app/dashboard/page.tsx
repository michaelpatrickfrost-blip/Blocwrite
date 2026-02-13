import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

async function createProject(formData: FormData) {
  "use server";
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const title = String(formData.get("title") ?? "").trim();
  const goal = formData.get("goalWords");

  if (title.length === 0) return;

  await prisma.project.create({
    data: {
      title,
      goalWords: goal ? Number(goal) : null,
      ownerId: session.user.id!,
    },
  });

  revalidatePath("/dashboard");
}

export default async function DashboardPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { chapters: { select: { wordCount: true } } },
  });

  const initials = (session.user?.name ?? session.user?.email ?? "P")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="pw-wallpaper">
      <div className="pw-window" style={{ minHeight: "680px" }}>
        {/* Sidebar */}
        <aside className="pw-sidebar">
          <div className="pw-logo">
            <img src="/blocwrite-main-dark.png" alt="Blocwrite" className="pw-logo-full" />
          </div>

          <div className="pw-section-title">Navigation</div>
          <div className="pw-list">
            <Link href="/dashboard" className="pw-item active">
              Projects
            </Link>
            <Link href="/studio" className="pw-item">
              Studio
            </Link>
          </div>

          {projects.length > 0 && (
            <>
              <div className="pw-section-title">Recent</div>
              <div className="pw-list">
                {projects.slice(0, 6).map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`} className="pw-item">
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.title}
                    </span>
                    <span className="pw-item-meta">
                      {p.chapters.length}ch
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}

          <div className="pw-sidebar-foot">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div className="pw-avatar">{initials}</div>
              <span className="pw-sidebar-user">
                {session.user?.name ?? session.user?.email}
              </span>
            </div>
          </div>
        </aside>

        {/* Topbar */}
        <div className="pw-topbar">
          <span className="pw-project-title">Projects</span>
          <span className="pw-pill">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Main */}
        <section className="pw-home-main">
          <div className="pw-home-header">
            <h1 className="pw-home-title">
              Welcome back, {session.user?.name ?? "pilot"}.
            </h1>
            <p className="pw-home-subtitle">
              Spin up a new project or jump into a chapter.
            </p>
          </div>

          <div className="pw-dashboard-grid">
            {/* Cards */}
            <div>
              {projects.length === 0 ? (
                <div className="pw-empty">
                  <p className="pw-empty-title">No projects yet</p>
                  <p className="pw-empty-subtitle">
                    Create your first project to get started.
                  </p>
                </div>
              ) : (
                <div className="pw-novel-grid">
                  {projects.map((project) => {
                    const totalWords = project.chapters.reduce(
                      (sum, c) => sum + (c.wordCount ?? 0),
                      0,
                    );
                    return (
                      <Link key={project.id} href={`/projects/${project.id}`} className="pw-novel-card">
                        <div className="pw-novel-card-top">
                          <h3 className="pw-novel-title">{project.title}</h3>
                          <span className="pw-pill pw-pill-sm">
                            {project.chapters.length} ch
                          </span>
                        </div>
                        <div className="pw-novel-meta">
                          {project.goalWords
                            ? `${totalWords.toLocaleString()} / ${project.goalWords.toLocaleString()} words`
                            : `${totalWords.toLocaleString()} words`}
                        </div>
                        {project.goalWords && (
                          <div className="pw-progress">
                            <span
                              style={{
                                width: `${Math.min(100, (totalWords / project.goalWords) * 100)}%`,
                              }}
                            />
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Create form */}
            <div className="card">
              <h2 className="pw-create-form-title">
                New Project
              </h2>
              <form action={createProject} className="pw-create-form">
                <div>
                  <label className="pw-create-form-label">
                    Title
                  </label>
                  <input name="title" required placeholder="My first novel" className="pw-create-input" />
                </div>
                <div>
                  <label className="pw-create-form-label">
                    Word Goal (optional)
                  </label>
                  <input name="goalWords" type="number" min={0} placeholder="60000" className="pw-create-input" />
                </div>
                <button type="submit" className="btn btn-primary pw-create-submit">
                  Create Project
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
