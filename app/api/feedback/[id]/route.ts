import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const workspaceId = session.user.workspaceId;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 400 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const status = body.status;

    if (!["NEW", "REVIEWED", "ACTIONED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid feedback status" },
        { status: 400 }
      );
    }

    const feedback = await prisma.feedback.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!feedback) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 }
      );
    }

    const updatedFeedback = await prisma.feedback.update({
      where: {
        id: feedback.id,
      },
      data: {
        status,
      },
    });

    return NextResponse.json({
      message: "Feedback status updated successfully",
      feedback: updatedFeedback,
    });
  } catch (error) {
    console.error("Feedback status update error:", error);

    return NextResponse.json(
      { error: "Failed to update feedback status" },
      { status: 500 }
    );
  }
}