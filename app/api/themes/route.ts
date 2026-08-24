import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Get user's workspace
    const workspaceId = session.user.workspaceId;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 400 }
      );
    }

    // 3. Get themes ONLY from this workspace
    const themes = await prisma.theme.findMany({
      where: {
        workspaceId,
      },

      include: {
        _count: {
          select: {
            feedbacks: true,
          },
        },

        feedbacks: {
          include: {
            feedback: {
              select: {
                id: true,
                content: true,
                sentiment: true,
                sentimentScore: true,
                status: true,
                channel: true,
                createdAt: true,
              },
            },
          },

          orderBy: {
            confidence: "desc",
          },

          take: 5,
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    // 4. Format response for the dashboard
    const result = themes.map((theme) => ({
      id: theme.id,
      name: theme.name,
      description: theme.description,
      color: theme.color,
      feedbackCount: theme._count.feedbacks,

      feedback: theme.feedbacks.map((item) => ({
        id: item.feedback.id,
        content: item.feedback.content,
        sentiment: item.feedback.sentiment,
        sentimentScore: item.feedback.sentimentScore,
        status: item.feedback.status,
        channel: item.feedback.channel,
        createdAt: item.feedback.createdAt,
        confidence: item.confidence,
      })),
    }));

    return NextResponse.json({
      themes: result,
      total: result.length,
    });
  } catch (error) {
    console.error("Themes API error:", error);

    return NextResponse.json(
      { error: "Failed to fetch themes" },
      { status: 500 }
    );
  }
}