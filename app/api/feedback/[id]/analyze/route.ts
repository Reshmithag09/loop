import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type AIAnalysis = {
  sentiment: "POS" | "NEU" | "NEG";
  sentimentScore: number;
  themes: {
    name: string;
    description: string;
    confidence: number;
  }[];
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // --------------------------------------------------
    // 1. Check authentication
    // --------------------------------------------------

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // --------------------------------------------------
    // 2. Get user's workspace
    // --------------------------------------------------

    const workspaceId = session.user.workspaceId;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 3. Get feedback ID
    // --------------------------------------------------

    const { id } = await params;

    console.log("ANALYZE ID:", id);

    // --------------------------------------------------
    // 4. Find feedback
    // --------------------------------------------------

    const feedback = await prisma.feedback.findUnique({
      where: {
        id,
      },
    });

    console.log("FEEDBACK FOUND:", feedback);

    if (!feedback) {
      return NextResponse.json(
        { error: "Feedback ID does not exist" },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // 5. Check workspace ownership
    // --------------------------------------------------

    if (feedback.workspaceId !== workspaceId) {
      console.error("WORKSPACE MISMATCH:", {
        feedbackId: feedback.id,
        feedbackWorkspace: feedback.workspaceId,
        currentWorkspace: workspaceId,
      });

      return NextResponse.json(
        {
          error: "This feedback belongs to another workspace",
        },
        { status: 403 }
      );
    }

    // --------------------------------------------------
    // 6. Check feedback content
    // --------------------------------------------------

    const content = feedback.content.trim();

    if (!content) {
      return NextResponse.json(
        {
          error: "Feedback has no content to analyze",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 7. Check Gemini API key
    // --------------------------------------------------

    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      return NextResponse.json(
        {
          error: "GEMINI_API_KEY is not configured",
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // 8. Ask Gemini to analyze feedback
    // --------------------------------------------------

    const prompt = `
You are the feedback intelligence engine for LOOP.

Analyze the following customer feedback.

Return ONLY valid JSON with exactly this structure:

{
  "sentiment": "POS",
  "sentimentScore": 0.0,
  "themes": [
    {
      "name": "Theme name",
      "description": "Short description",
      "confidence": 0.0
    }
  ]
}

Rules:

1. sentiment MUST be exactly one of:
   POS
   NEU
   NEG

2. sentimentScore MUST be a number between 0 and 1.

3. confidence MUST be a number between 0 and 1.

4. Detect only themes clearly supported by the feedback.

5. Return between 0 and 5 themes.

6. Keep theme names short and reusable.

7. Do not invent information.

8. Do not include markdown.

9. Do not include explanations outside the JSON.

Customer feedback:
"${content}"
`;

    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiApiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        }),
      }
    );

    // --------------------------------------------------
    // 9. Handle Gemini API errors
    // --------------------------------------------------

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();

      console.error("========== GEMINI ERROR ==========");
      console.error("Status:", geminiResponse.status);
      console.error("Status Text:", geminiResponse.statusText);
      console.error("Error Body:", errorText);
      console.error("==================================");

      return NextResponse.json(
        {
          error: "Gemini API request failed",
          status: geminiResponse.status,
          details: errorText,
        },
        { status: 502 }
      );
    }

    const geminiData = await geminiResponse.json();

    // --------------------------------------------------
    // 10. Extract Gemini response
    // --------------------------------------------------

    const rawText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!rawText) {
      console.error("Gemini returned no text:", geminiData);

      return NextResponse.json(
        { error: "AI returned no analysis" },
        { status: 502 }
      );
    }

    console.log("GEMINI RAW RESPONSE:", rawText);

    // --------------------------------------------------
    // 11. Parse AI JSON
    // --------------------------------------------------

    let analysis: AIAnalysis;

    try {
      analysis = JSON.parse(rawText);
    } catch {
      console.error("Invalid Gemini JSON:", rawText);

      return NextResponse.json(
        {
          error: "AI returned invalid analysis",
        },
        { status: 502 }
      );
    }

    // --------------------------------------------------
    // 12. Validate sentiment
    // --------------------------------------------------

    if (!["POS", "NEU", "NEG"].includes(analysis.sentiment)) {
      return NextResponse.json(
        {
          error: "AI returned invalid sentiment",
        },
        { status: 502 }
      );
    }

    // --------------------------------------------------
    // 13. Validate sentiment score
    // --------------------------------------------------

    if (
      typeof analysis.sentimentScore !== "number" ||
      analysis.sentimentScore < 0 ||
      analysis.sentimentScore > 1
    ) {
      return NextResponse.json(
        {
          error: "AI returned invalid sentiment score",
        },
        { status: 502 }
      );
    }

    // --------------------------------------------------
    // 14. Clean themes
    // --------------------------------------------------

    const cleanedThemes = Array.isArray(analysis.themes)
      ? analysis.themes
          .filter(
            (theme) =>
              theme &&
              typeof theme.name === "string" &&
              theme.name.trim().length > 0 &&
              typeof theme.confidence === "number"
          )
          .map((theme) => ({
            name: theme.name.trim().slice(0, 100),

            description:
              typeof theme.description === "string"
                ? theme.description.trim().slice(0, 500)
                : null,

            confidence: Math.max(
              0,
              Math.min(1, theme.confidence)
            ),
          }))
      : [];

    // --------------------------------------------------
    // 15. Remove duplicate themes
    // --------------------------------------------------

    const uniqueThemes = Array.from(
      new Map(
        cleanedThemes.map((theme) => [
          theme.name.toLowerCase(),
          theme,
        ])
      ).values()
    ).slice(0, 5);

    // --------------------------------------------------
    // 16. Save AI results to database
    // --------------------------------------------------

    const result = await prisma.$transaction(async (tx) => {
      // Update sentiment
      const updatedFeedback = await tx.feedback.update({
        where: {
          id: feedback.id,
        },
        data: {
          sentiment: analysis.sentiment,
          sentimentScore: analysis.sentimentScore,
        },
      });

      // Remove previous theme relationships
      await tx.feedbackTheme.deleteMany({
        where: {
          feedbackId: feedback.id,
        },
      });

      const savedThemes = [];

      // Save detected themes
      for (const themeData of uniqueThemes) {
        let theme = await tx.theme.findFirst({
          where: {
            workspaceId,
            name: {
              equals: themeData.name,
              mode: "insensitive",
            },
          },
        });

        // Create theme if it doesn't exist
        if (!theme) {
          theme = await tx.theme.create({
            data: {
              workspaceId,
              name: themeData.name,
              description: themeData.description,
            },
          });
        }

        // Connect feedback to theme
        await tx.feedbackTheme.create({
          data: {
            feedbackId: feedback.id,
            themeId: theme.id,
            confidence: themeData.confidence,
          },
        });

        savedThemes.push({
          id: theme.id,
          name: theme.name,
          description: theme.description,
          confidence: themeData.confidence,
        });
      }

      return {
        feedback: updatedFeedback,
        themes: savedThemes,
      };
    });

    // --------------------------------------------------
    // 17. Return final result
    // --------------------------------------------------

    return NextResponse.json({
      message: "Feedback analyzed successfully",

      analysis: {
        sentiment: result.feedback.sentiment,
        sentimentScore: result.feedback.sentimentScore,
        themes: result.themes,
      },

      feedback: result.feedback,
    });
  } catch (error) {
    console.error("Feedback analysis error:", error);

    return NextResponse.json(
      {
        error: "Failed to analyze feedback",
      },
      { status: 500 }
    );
  }
}