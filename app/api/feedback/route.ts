import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);

    const page = Math.max(
      Number(searchParams.get("page")) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number(searchParams.get("limit")) || 10,
        1
      ),
      100
    );

    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "";
    const channel = searchParams.get("channel") || "";

    const where = {
      workspaceId,

      ...(search
        ? {
            content: {
              contains: search,
              mode: "insensitive" as const,
            },
          }
        : {}),

      ...(status
        ? {
            status: status as
              | "NEW"
              | "REVIEWED"
              | "ACTIONED",
          }
        : {}),

      ...(channel
        ? {
            channel,
          }
        : {}),
    };

    const [feedback, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.feedback.count({
        where,
      }),
    ]);

    return NextResponse.json({
      feedback,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Feedback loading error:", error);

    return NextResponse.json(
      { error: "Failed to load feedback" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();

    const content =
      typeof body.content === "string"
        ? body.content.trim()
        : "";

    if (!content) {
      return NextResponse.json(
        { error: "Feedback content is required" },
        { status: 400 }
      );
    }

    const channel =
      typeof body.channel === "string"
        ? body.channel.trim().toUpperCase()
        : "WEB";

    const feedback = await prisma.feedback.create({
      data: {
        workspaceId,
        content,
        channel,
      },
    });

    return NextResponse.json(
      {
        message: "Feedback created successfully",
        feedback,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Feedback creation error:", error);

    return NextResponse.json(
      { error: "Failed to create feedback" },
      { status: 500 }
    );
  }
}