import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // ============================================
    // AUTHENTICATION
    // ============================================

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

    // ============================================
    // WORKSPACE
    // ============================================

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

    // ============================================
    // BASIC COUNTS
    // ============================================

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

    // ============================================
    // CURRENT FEEDBACK
    // ============================================

    const analyzedFeedback =
      await prisma.feedback.findMany({
        where: {
          workspaceId,
          sentimentScore: {
            not: null,
          },
        },
        select: {
          sentimentScore: true,
          status: true,
        },
      });

    // ============================================
    // SENTIMENT SCORE
    // ============================================

    const sentimentScore =
      analyzedFeedback.length > 0
        ? Math.round(
            (analyzedFeedback.reduce(
              (sum, item) =>
                sum + (item.sentimentScore ?? 0),
              0
            ) /
              analyzedFeedback.length) *
              100
          )
        : 0;

    // ============================================
    // DATE RANGES
    // ============================================

    const now = new Date();

    const currentPeriodStart = new Date(now);

    currentPeriodStart.setDate(
      currentPeriodStart.getDate() - 7
    );

    const previousPeriodStart = new Date(now);

    previousPeriodStart.setDate(
      previousPeriodStart.getDate() - 14
    );

    // ============================================
    // PREVIOUS 7-DAY SENTIMENT
    // ============================================

    const previousFeedback =
      await prisma.feedback.findMany({
        where: {
          workspaceId,
          createdAt: {
            gte: previousPeriodStart,
            lt: currentPeriodStart,
          },
          sentimentScore: {
            not: null,
          },
        },
        select: {
          sentimentScore: true,
          status: true,
        },
      });

    const previousSentimentScore =
      previousFeedback.length > 0
        ? Math.round(
            (previousFeedback.reduce(
              (sum, item) =>
                sum + (item.sentimentScore ?? 0),
              0
            ) /
              previousFeedback.length) *
              100
          )
        : 0;

    // ============================================
    // ENGAGEMENT SCORE
    // ============================================

    const engagedCount =
      await prisma.feedback.count({
        where: {
          workspaceId,
          status: {
            in: ["REVIEWED", "ACTIONED"],
          },
        },
      });

    const engagementScore =
      feedbackCount > 0
        ? Math.round(
            (engagedCount / feedbackCount) * 100
          )
        : 0;

    // ============================================
    // PREVIOUS 7-DAY ENGAGEMENT
    // ============================================

    const previousFeedbackCount =
      await prisma.feedback.count({
        where: {
          workspaceId,
          createdAt: {
            gte: previousPeriodStart,
            lt: currentPeriodStart,
          },
        },
      });
      const currentPeriodFeedbackCount =
  await prisma.feedback.count({
    where: {
      workspaceId,
      createdAt: {
        gte: currentPeriodStart,
        lte: now,
      },
    },
  });

const feedbackChange =
  previousFeedbackCount > 0
    ? currentPeriodFeedbackCount -
      previousFeedbackCount
    : null;

    const previousEngagedCount =
      await prisma.feedback.count({
        where: {
          workspaceId,
          createdAt: {
            gte: previousPeriodStart,
            lt: currentPeriodStart,
          },
          status: {
            in: ["REVIEWED", "ACTIONED"],
          },
        },
      });

    const previousEngagementScore =
      previousFeedbackCount > 0
        ? Math.round(
            (previousEngagedCount /
              previousFeedbackCount) *
              100
          )
        : 0;

    // ============================================
    // RESOLUTION SCORE
    // ============================================

    const resolutionScore =
      feedbackCount > 0
        ? Math.round(
            (resolvedCount / feedbackCount) * 100
          )
        : 0;

    // ============================================
    // PREVIOUS 7-DAY RESOLUTION
    // ============================================

    const previousResolvedCount =
      await prisma.feedback.count({
        where: {
          workspaceId,
          createdAt: {
            gte: previousPeriodStart,
            lt: currentPeriodStart,
          },
          status: "ACTIONED",
        },
      });

    const previousResolutionScore =
      previousFeedbackCount > 0
        ? Math.round(
            (previousResolvedCount /
              previousFeedbackCount) *
              100
          )
        : 0;

    // ============================================
    // HEALTH SCORE
    // ============================================

    const healthScore = Math.round(
      (
        sentimentScore +
        engagementScore +
        resolutionScore
      ) / 3
    );

    const previousHealthScore =
      previousFeedbackCount > 0
        ? Math.round(
            (
              previousSentimentScore +
              previousEngagementScore +
              previousResolutionScore
            ) / 3
          )
        : 0;

    // ============================================
    // METRIC CHANGES
    // ============================================

    const sentimentChange =
      previousFeedback.length > 0
        ? sentimentScore -
          previousSentimentScore
        : null;

    const engagementChange =
      previousFeedbackCount > 0
        ? engagementScore -
          previousEngagementScore
        : null;

    const resolutionChange =
      previousFeedbackCount > 0
        ? resolutionScore -
          previousResolutionScore
        : null;

    const healthChange =
      previousFeedbackCount > 0
        ? healthScore -
          previousHealthScore
        : null;

    // ============================================
    // RECENT FEEDBACK
    // ============================================

    const recentFeedback =
      await prisma.feedback.findMany({
        where: {
          workspaceId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
        select: {
          id: true,
          content: true,
          createdAt: true,
          status: true,
          channel: true,
        },
      });

    // ============================================
    // HISTORICAL SIGNAL DATA
    // ============================================
    //
    // Get feedback from the last 7 days.
    // This will allow the frontend to draw
    // data-driven signal graphs instead of
    // decorative curves.
    //

    const historicalFeedback =
      await prisma.feedback.findMany({
        where: {
          workspaceId,
          createdAt: {
            gte: currentPeriodStart,
            lte: now,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          createdAt: true,
          sentimentScore: true,
          status: true,
        },
      });

    const signalHistory = Array.from(
      { length: 7 },
      (_, index) => {
        const date = new Date(
          currentPeriodStart
        );

        date.setDate(
          date.getDate() + index
        );

        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);

        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const dayFeedback =
          historicalFeedback.filter(
            (item) =>
              item.createdAt >= dayStart &&
              item.createdAt <= dayEnd
          );

        const analyzedDayFeedback =
          dayFeedback.filter(
            (item) =>
              item.sentimentScore !== null
          );

        const daySentiment =
          analyzedDayFeedback.length > 0
            ? Math.round(
                (analyzedDayFeedback.reduce(
                  (sum, item) =>
                    sum +
                    (item.sentimentScore ?? 0),
                  0
                ) /
                  analyzedDayFeedback.length) *
                  100
              )
            : 0;

        const dayEngaged =
          dayFeedback.filter(
            (item) =>
              item.status === "REVIEWED" ||
              item.status === "ACTIONED"
          ).length;

        const dayEngagement =
          dayFeedback.length > 0
            ? Math.round(
                (dayEngaged /
                  dayFeedback.length) *
                  100
              )
            : 0;

        const dayFeedbackCount =
          dayFeedback.length;

        return {
          date:
            dayStart.toISOString(),
          feedback:
            dayFeedbackCount,
          sentiment:
            daySentiment,
          engagement:
            dayEngagement,
        };
      }
    );

    // ============================================
    // RESPONSE
    // ============================================

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

        sentimentScore,
        engagementScore,
        resolutionScore,
        healthScore,

        sentimentChange,
        engagementChange,
        resolutionChange,
        healthChange,

        recentFeedback,
        signalHistory,
      },
    });
  } catch (error) {
    console.error(
      "Dashboard API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load dashboard data",
      },
      { status: 500 }
    );
  }
}