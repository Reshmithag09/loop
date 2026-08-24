import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
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

    const workspace = await prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    const feedbackCount = await prisma.feedback.count({
      where: {
        workspaceId,
      },
    });

    const themeCount = await prisma.theme.count({
      where: {
        workspaceId,
      },
    });

    const reportCount = await prisma.report.count({
      where: {
        workspaceId,
      },
    });

    const resolvedCount = await prisma.feedback.count({
      where: {
        workspaceId,
        status: "ACTIONED",
      },
    });

    return NextResponse.json({
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      },
      workspace,
      metrics: {
        feedback: feedbackCount,
        themes: themeCount,
        reports: reportCount,
        resolved: resolvedCount,
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);

    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}