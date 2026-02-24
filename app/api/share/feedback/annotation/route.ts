import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/bw-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ReviewAction = "save_later" | "reject" | "applied_manual" | "applied_ai";

function toUpdatePatch(action: ReviewAction) {
  switch (action) {
    case "save_later":
      return {
        reviewStatus: "saved_for_later",
        reviewerAction: "save_later",
        reviewedAt: null,
      };
    case "reject":
      return {
        reviewStatus: "rejected",
        reviewerAction: "reject",
        reviewedAt: new Date(),
      };
    case "applied_manual":
      return {
        reviewStatus: "applied",
        reviewerAction: "manual",
        reviewedAt: new Date(),
      };
    case "applied_ai":
      return {
        reviewStatus: "applied",
        reviewerAction: "ai",
        reviewedAt: new Date(),
      };
    default:
      return {
        reviewStatus: "pending",
      };
  }
}

/**
 * PATCH /api/share/feedback/annotation
 * Body: { annotationId: string, action: "save_later" | "reject" | "applied_manual" | "applied_ai" }
 */
export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = verifySessionToken(token);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { annotationId?: string; action?: ReviewAction };
    const annotationId = typeof body.annotationId === "string" ? body.annotationId.trim() : "";
    const action = body.action;

    if (!annotationId) {
      return NextResponse.json({ error: "annotationId is required." }, { status: 400 });
    }

    if (!action || !["save_later", "reject", "applied_manual", "applied_ai"].includes(action)) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const annotation = await prisma.annotation.findUnique({
      where: { id: annotationId },
      include: {
        sharedChapter: {
          include: {
            shareLink: {
              select: { ownerEmail: true },
            },
          },
        },
      },
    });

    if (!annotation) {
      return NextResponse.json({ error: "Annotation not found." }, { status: 404 });
    }

    if (annotation.sharedChapter.shareLink.ownerEmail !== email.trim().toLowerCase()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const patch = toUpdatePatch(action);

    await prisma.annotation.update({
      where: { id: annotationId },
      data: patch as any,
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error("Annotation review update error:", error);
    return NextResponse.json({ error: "Failed to update annotation." }, { status: 500 });
  }
}
