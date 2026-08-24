import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ---------------------------------------------
    // 1. Check authentication
    // ---------------------------------------------

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ---------------------------------------------
    // 2. Get workspace
    // ---------------------------------------------

    const workspaceId = session.user.workspaceId;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 400 }
      );
    }

    // ---------------------------------------------
    // 3. Get theme ID
    // ---------------------------------------------

    const { id } = await params;

    // ---------------------------------------------
    // 4. Make sure theme belongs to this workspace
    // ---------------------------------------------

    const theme = await prisma.theme.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!theme) {
      return NextResponse.json(
        { error: "Theme not found" },
        { status: 404 }
      );
    }

    // ---------------------------------------------
    // 5. Get feedback connected to this theme
    // ---------------------------------------------

    const feedbackThemes =
      await prisma.feedbackTheme.findMany({
        where: {
          themeId: theme.id,
          feedback: {
            workspaceId,
          },
        },
        include: {
          feedback: true,
        },
        orderBy: {
          feedback: {
            createdAt: "desc",
          },
        },
      });

    // ---------------------------------------------
    // 6. Return theme + feedback
    // ---------------------------------------------

    return NextResponse.json({
      theme: {
        id: theme.id,
        name: theme.name,
        description: theme.description,
        color: theme.color,
      },

      feedback: feedbackThemes.map((item) => ({
        id: item.feedback.id,
        content: item.feedback.content,
        channel: item.feedback.channel,
        customerLabel: item.feedback.customerLabel,
        sentiment: item.feedback.sentiment,
        sentimentScore: item.feedback.sentimentScore,
        status: item.feedback.status,
        createdAt: item.feedback.createdAt,
        confidence: item.confidence,
      })),

      total: feedbackThemes.length,
    });
  } catch (error) {
    console.error(
      "Theme feedback error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to fetch theme feedback" },
      { status: 500 }
    );
  }
}