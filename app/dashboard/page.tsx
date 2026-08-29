"use client";

import { useEffect, useMemo, useState } from "react";

type Signal = "Sentiment" | "Engagement" | "Feedback";

type DashboardData = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  };

  workspace: {
    id: string;
    name: string;
    createdAt: string;
  };

  metrics: {
    feedback: number;
    themes: number;
    reports: number;
    resolved: number;

    sentimentScore: number;
    engagementScore: number;
    resolutionScore: number;

    sentimentChange: number | null;
    engagementChange: number | null;
    resolutionChange: number | null;

    healthScore?: number;
    healthChange?: number | null;
    feedbackChange: number | null;
    signalHistory: {
  date: string;
  feedback: number;
  sentiment: number;
  engagement: number;
}[];
  };
};

type Feedback = {
  id: string;
  content: string;
  channel: string;
  status: string;
  createdAt: string;
  sentiment: string | null;
  sentimentScore: number | null;
};

type Theme = {
  id: string;
  name: string;
  description?: string | null;
};

type ThemeFeedback = {
  id: string;
  content: string;
  channel: string;
  customerLabel?: string | null;
  sentiment?: "POS" | "NEU" | "NEG" | null;
  sentimentScore?: number | null;
  status: "NEW" | "REVIEWED" | "ACTIONED";
  createdAt: string;
  confidence?: number;
};

type SignalData = {
  value: string;
  change: string;
  path: string;
};

type Insight = {
  title: string;
  description: string;
  confidence: string;
  signals: number;
  color: "violet" | "cyan" | "emerald";
};

const EMPTY_SIGNAL_PATH =
  "M0 160 C80 155 120 150 180 155 S300 150 360 145 S480 150 540 140 S660 145 720 135 S780 140 800 130";

const signalNames: Signal[] = [
  "Sentiment",
  "Engagement",
  "Feedback",
];

function formatChange(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  if (value > 0) {
    return `+${value}%`;
  }

  if (value < 0) {
    return `${value}%`;
  }

  return "0%";
}

function getChangeClass(value: number | null): string {
  if (value === null) {
    return "text-white/30";
  }

  if (value > 0) {
    return "text-emerald-300";
  }

  if (value < 0) {
    return "text-rose-300";
  }

  return "text-white/40";
}

function getHealthMessage(score: number | null) {
  if (score === null) {
    return {
      title: "Workspace is",
      highlight: "waiting for signals.",
      color: "text-cyan-300",
      description:
        "LOOP will calculate your health score once workspace activity begins.",
    };
  }

  if (score >= 80) {
    return {
      title: "Workspace is",
      highlight: "operating strongly.",
      color: "text-emerald-300",
      description:
        "Your health score is calculated from real workspace activity.",
    };
  }

  if (score >= 60) {
    return {
      title: "Workspace is",
      highlight: "showing room for improvement.",
      color: "text-amber-300",
      description:
        "Your health score is calculated from real workspace activity.",
    };
  }

  return {
    title: "Workspace needs",
    highlight: "attention.",
    color: "text-rose-300",
    description:
      "Your health score is calculated from real workspace activity.",
  };
}

export default function DashboardPage() {
  const [signal, setSignal] = useState<Signal>("Sentiment");
  const [insight, setInsight] = useState(0);

  const [dashboardData, setDashboardData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);

  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [feedbackLoading, setFeedbackLoading] =
    useState(false);

  const [themes, setThemes] = useState<Theme[]>([]);

  const [selectedTheme, setSelectedTheme] =
    useState<string | null>(null);

  const [themeFeedback, setThemeFeedback] =
    useState<ThemeFeedback[]>([]);

  const [themeFeedbackLoading, setThemeFeedbackLoading] =
    useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");

  const [feedbackPage, setFeedbackPage] = useState(1);

  const [feedbackPagination, setFeedbackPagination] =
    useState({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
    });

  const [newFeedback, setNewFeedback] = useState("");
  const [newFeedbackChannel, setNewFeedbackChannel] =
    useState("WEB");

  const [submittingFeedback, setSubmittingFeedback] =
    useState(false);

  const [submitMessage, setSubmitMessage] =
    useState("");

  /*
   * ==================================================
   * LOAD DASHBOARD
   * ==================================================
   */

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);

        const response = await fetch("/api/dashboard", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            "Failed to load dashboard data."
          );
        }

        const data: DashboardData =
          await response.json();

        if (!cancelled) {
          setDashboardData(data);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Dashboard loading error:",
            error
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * ==================================================
   * LOAD FEEDBACK + THEMES
   * ==================================================
   */

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setFeedbackLoading(true);

        const params = new URLSearchParams();

        params.set(
          "page",
          String(feedbackPage)
        );

        params.set("limit", "10");

        if (search.trim()) {
          params.set(
            "search",
            search.trim()
          );
        }

        if (statusFilter) {
          params.set(
            "status",
            statusFilter
          );
        }

        if (channelFilter) {
          params.set(
            "channel",
            channelFilter
          );
        }

        const [
          feedbackResponse,
          themesResponse,
        ] = await Promise.all([
          fetch(
            `/api/feedback?${params.toString()}`,
            {
              cache: "no-store",
            }
          ),
          fetch("/api/themes", {
            cache: "no-store",
          }),
        ]);

        if (!feedbackResponse.ok) {
          throw new Error(
            "Failed to load feedback."
          );
        }

        if (!themesResponse.ok) {
          throw new Error(
            "Failed to load themes."
          );
        }

        const feedbackData =
          await feedbackResponse.json();

        const themesData =
          await themesResponse.json();

        if (cancelled) {
          return;
        }

        setFeedback(
          Array.isArray(
            feedbackData.feedback
          )
            ? feedbackData.feedback
            : []
        );

        if (feedbackData.pagination) {
          setFeedbackPagination(
            feedbackData.pagination
          );
        }

        setThemes(
          Array.isArray(
            themesData.themes
          )
            ? themesData.themes
            : []
        );
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Dashboard data loading error:",
            error
          );
        }
      } finally {
        if (!cancelled) {
          setFeedbackLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [
    feedbackPage,
    search,
    statusFilter,
    channelFilter,
  ]);

  /*
   * ==================================================
   * HEALTH SCORE
   * ==================================================
   */

  const healthScore = useMemo(() => {
    if (!dashboardData) {
      return null;
    }

    const {
      sentimentScore,
      engagementScore,
      resolutionScore,
    } = dashboardData.metrics;

    return Math.round(
      (
        sentimentScore +
        engagementScore +
        resolutionScore
      ) / 3
    );
  }, [dashboardData]);

  /*
   * ==================================================
   * SIGNALS
   * ==================================================
   */

  const signals = useMemo<
  Record<Signal, SignalData>
>(() => {
  const sentiment =
    dashboardData?.metrics.sentimentScore ?? 0;

  const engagement =
    dashboardData?.metrics.engagementScore ?? 0;

  const feedbackCount =
    dashboardData?.metrics.feedback ?? 0;

  const history =
    dashboardData?.metrics.signalHistory ?? [];

  const createPath = (
    values: number[]
  ): string => {
    if (values.length === 0) {
      return EMPTY_SIGNAL_PATH;
    }

    const maxValue = Math.max(
      ...values,
      1
    );

    const minValue = Math.min(
      ...values
    );

    const range = Math.max(
      maxValue - minValue,
      1
    );

    const width = 800;
    const height = 150;
    const padding = 10;

    return values
      .map((value, index) => {
        const x =
          values.length === 1
            ? width / 2
            : (index /
                (values.length - 1)) *
              width;

        const normalized =
          (value - minValue) / range;

        const y =
          height -
          padding -
          normalized *
            (height - padding * 2);

        if (index === 0) {
          return `M${x} ${y}`;
        }

        const previousValue =
          values[index - 1];

        const previousNormalized =
          (previousValue - minValue) /
          range;

        const previousX =
          values.length === 1
            ? width / 2
            : ((index - 1) /
                (values.length - 1)) *
              width;

        const previousY =
          height -
          padding -
          previousNormalized *
            (height - padding * 2);

        const controlX =
          (previousX + x) / 2;

        return `C${controlX} ${previousY} ${controlX} ${y} ${x} ${y}`;
      })
      .join(" ");
  };

  const sentimentValues =
    history.map(
      (item) => item.sentiment
    );

  const engagementValues =
    history.map(
      (item) => item.engagement
    );

  const feedbackValues =
    history.map(
      (item) => item.feedback
    );

  return {
    Sentiment: {
      value: `${sentiment}%`,
      change: formatChange(
        dashboardData?.metrics
          .sentimentChange ?? null
      ),
      path: createPath(
        sentimentValues
      ),
    },

    Engagement: {
      value: `${engagement}%`,
      change: formatChange(
        dashboardData?.metrics
          .engagementChange ?? null
      ),
      path: createPath(
        engagementValues
      ),
    },

    Feedback: {
      value: String(feedbackCount),
      change: formatChange(
        dashboardData?.metrics
  .feedbackChange ?? null
      ),
      path: createPath(
        feedbackValues
      ),
    },
  };
}, [dashboardData]);

const currentSignal =
  signals[signal];

  /*
   * ==================================================
   * DYNAMIC INSIGHTS
   * ==================================================
   */

  const insights = useMemo<Insight[]>(() => {
    if (!dashboardData) {
      return [];
    }

    const {
      feedback,
      themes,
      sentimentScore,
      engagementScore,
      sentimentChange,
      engagementChange,
    } = dashboardData.metrics;

    const sentimentDescription =
      sentimentChange === null
        ? "Not enough previous feedback is available for comparison."
        : sentimentChange > 0
        ? `Sentiment increased by ${sentimentChange}% compared with the previous 7-day period.`
        : sentimentChange < 0
        ? `Sentiment decreased by ${Math.abs(
            sentimentChange
          )}% compared with the previous 7-day period.`
        : "Sentiment remained stable compared with the previous 7-day period.";

    const engagementDescription =
      engagementChange === null
        ? "Not enough previous feedback is available for comparison."
        : engagementChange > 0
        ? `Engagement increased by ${engagementChange}% compared with the previous 7-day period.`
        : engagementChange < 0
        ? `Engagement decreased by ${Math.abs(
            engagementChange
          )}% compared with the previous 7-day period.`
        : "Engagement remained stable compared with the previous 7-day period.";

    return [
      {
        title:
          sentimentScore >= 50
            ? "Positive sentiment is strong"
            : "Sentiment needs attention",

        description:
          sentimentDescription,

        confidence: `${sentimentScore}%`,
        signals: feedback,
        color: "violet",
      },

      {
        title:
          themes > 0
            ? `${themes} recurring ${
                themes === 1
                  ? "theme"
                  : "themes"
              } detected`
            : "No recurring themes detected",

        description:
          themes > 0
            ? "Themes are being identified from feedback collected in this workspace."
            : "More analyzed feedback is needed to identify recurring themes.",

        confidence:
          themes > 0
            ? "100%"
            : "0%",

        signals: feedback,
        color: "cyan",
      },

      {
        title:
          engagementScore >= 50
            ? "Workspace engagement is strong"
            : "Workspace engagement needs attention",

        description:
          engagementDescription,

        confidence: `${engagementScore}%`,
        signals: feedback,
        color: "emerald",
      },
    ];
  }, [dashboardData]);

  

  const currentInsight =
    insights.length > 0
      ? insights[insight]
      : null;

  /*
   * ==================================================
   * UPDATE FEEDBACK STATUS
   * ==================================================
   */

  async function updateFeedbackStatus(
    feedbackId: string,
    newStatus: string
  ) {
    try {
      const response = await fetch(
        `/api/feedback/${feedbackId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to update feedback status."
        );
      }

      setFeedback(
        (currentFeedback) =>
          currentFeedback.map(
            (item) =>
              item.id === feedbackId
                ? {
                    ...item,
                    status: newStatus,
                  }
                : item
          )
      );
    } catch (error) {
      console.error(
        "Feedback status update error:",
        error
      );
    }
  }

  /*
   * ==================================================
   * LOAD THEME FEEDBACK
   * ==================================================
   */

  async function loadThemeFeedback(
    themeId: string
  ) {
    try {
      setSelectedTheme(themeId);
      setThemeFeedbackLoading(true);

      const response = await fetch(
        `/api/themes/${themeId}/feedback`,
        {
          cache: "no-store",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to load theme feedback."
        );
      }

      setThemeFeedback(
        Array.isArray(data.feedback)
          ? data.feedback
          : []
      );
    } catch (error) {
      console.error(
        "Theme feedback error:",
        error
      );

      setThemeFeedback([]);
    } finally {
      setThemeFeedbackLoading(false);
    }
  }

  /*
   * ==================================================
   * SUBMIT FEEDBACK
   * ==================================================
   */

  async function submitFeedback() {
    if (!newFeedback.trim()) {
      setSubmitMessage(
        "Please enter feedback."
      );
      return;
    }

    try {
      setSubmittingFeedback(true);
      setSubmitMessage("");

      const response = await fetch(
        "/api/feedback",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            content:
              newFeedback.trim(),
            channel:
              newFeedbackChannel,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to submit feedback."
        );
      }

      setNewFeedback("");
      setNewFeedbackChannel("WEB");

      setSubmitMessage(
        "Feedback submitted successfully."
      );

      setFeedbackPage(1);

      const refreshResponse =
        await fetch(
          "/api/feedback?page=1&limit=10",
          {
            cache: "no-store",
          }
        );

      if (refreshResponse.ok) {
        const refreshData =
          await refreshResponse.json();

        setFeedback(
          Array.isArray(
            refreshData.feedback
          )
            ? refreshData.feedback
            : []
        );

        if (
          refreshData.pagination
        ) {
          setFeedbackPagination(
            refreshData.pagination
          );
        }
      }

      const dashboardResponse =
        await fetch(
          "/api/dashboard",
          {
            cache: "no-store",
          }
        );

      if (dashboardResponse.ok) {
        const dashboard =
          await dashboardResponse.json();

        setDashboardData(dashboard);
      }
    } catch (error) {
      console.error(
        "Feedback submission error:",
        error
      );

      setSubmitMessage(
        error instanceof Error
          ? error.message
          : "Failed to submit feedback."
      );
    } finally {
      setSubmittingFeedback(false);
    }
  }

  /*
   * ==================================================
   * AI ANALYSIS
   * ==================================================
   */

  async function analyzeFeedback(
    feedbackId: string
  ) {
    try {
      const response = await fetch(
        `/api/feedback/${feedbackId}/analyze`,
        {
          method: "POST",
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "AI analysis failed."
        );
      }

      const refreshResponse =
        await fetch(
          `/api/feedback?page=${feedbackPage}&limit=10`,
          {
            cache: "no-store",
          }
        );

      if (refreshResponse.ok) {
        const refreshData =
          await refreshResponse.json();

        setFeedback(
          Array.isArray(
            refreshData.feedback
          )
            ? refreshData.feedback
            : []
        );

        if (
          refreshData.pagination
        ) {
          setFeedbackPagination(
            refreshData.pagination
          );
        }
      }

      const dashboardResponse =
        await fetch(
          "/api/dashboard",
          {
            cache: "no-store",
          }
        );

      if (dashboardResponse.ok) {
        const dashboard =
          await dashboardResponse.json();

        setDashboardData(dashboard);
      }
    } catch (error) {
      console.error(
        "AI analysis error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong while analyzing feedback."
      );
    }
  }

  /*
   * ==================================================
   * HEALTH MESSAGE
   * ==================================================
   */

  const healthMessage =
    getHealthMessage(healthScore);

  /*
   * ==================================================
   * LOADING STATE
   * ==================================================
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#06070b] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-violet-400" />

            <p className="mt-4 text-sm text-white/40">
              Loading workspace intelligence...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ==================================================
   * MAIN DASHBOARD
   * ==================================================
   */

  return (
    <main className="min-h-screen overflow-hidden bg-[#06070b] text-white">

      {/* ================= AMBIENT BACKGROUND ================= */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">

        <div className="absolute left-[-180px] top-[-180px] h-[520px] w-[520px] animate-pulse rounded-full bg-fuchsia-600/[0.12] blur-[150px]" />

        <div
          className="absolute right-[-180px] top-[10%] h-[520px] w-[520px] animate-pulse rounded-full bg-cyan-500/[0.10] blur-[150px]"
          style={{
            animationDelay: "1.5s",
          }}
        />

        <div
          className="absolute bottom-[-250px] left-[30%] h-[600px] w-[600px] animate-pulse rounded-full bg-violet-600/[0.09] blur-[160px]"
          style={{
            animationDelay: "3s",
          }}
        />

        <div className="absolute left-[42%] top-[18%] h-1 w-1 animate-ping rounded-full bg-cyan-300/40" />

        <div className="absolute left-[70%] top-[32%] h-1 w-1 animate-ping rounded-full bg-violet-300/40" />

        <div className="absolute left-[22%] top-[65%] h-1 w-1 animate-ping rounded-full bg-fuchsia-300/40" />

      </div>

      <div className="relative flex min-h-screen">

        {/* ================= SIDEBAR ================= */}

        <aside className="hidden w-[245px] shrink-0 border-r border-white/[0.06] bg-black/10 lg:block">

          <div className="sticky top-0 flex min-h-screen flex-col p-5">

            <div className="mb-8">

              <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-300/70">
                LOOP / Workspace
              </div>

              <div className="mt-2 text-xs text-white/35">
                Intelligence canvas
              </div>

            </div>

            <nav className="space-y-2">

              <NavItem
                icon="◈"
                label="Dashboard"
                active
              />

              <NavItem
                icon="◇"
                label="Feedback"
              />

              <NavItem
                icon="◎"
                label="Themes"
              />

              <NavItem
                icon="▱"
                label="Reports"
              />

              <NavItem
                icon="✦"
                label="Ask LOOP"
              />

            </nav>

            <div className="mt-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">

              <div className="text-[9px] uppercase tracking-[0.2em] text-white/25">
                Workspace
              </div>

              <div className="mt-2 truncate text-sm text-white/70">
                {dashboardData?.workspace.name ||
                  "Workspace"}
              </div>

              <div className="mt-1 text-[10px] text-white/30">
                {dashboardData?.user.role ||
                  "Member"}
              </div>

            </div>

          </div>

        </aside>

        {/* ================= MAIN CONTENT ================= */}

        <section className="min-w-0 flex-1">

          <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-10">

            {/* ================= TOP BAR ================= */}

            <header className="mb-8 flex items-center justify-between">

              <div>

                <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-300/60">
                  LOOP / Workspace
                </div>

                <div className="mt-1 text-xs text-white/35">
                  {dashboardData?.workspace.name ||
                    "Workspace intelligence"}
                </div>

              </div>

              <div className="flex items-center gap-3">

                <div className="hidden rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-2 text-xs text-white/30 sm:block">
                  Search
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-400 to-violet-500 text-xs font-semibold">
                  {(
                    dashboardData?.user.name ||
                    "U"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>

              </div>

            </header>

            {/* ================= HERO ================= */}

            <section className="relative mb-5 overflow-hidden rounded-[32px] border border-white/[0.07] bg-gradient-to-br from-violet-500/[0.08] via-transparent to-cyan-400/[0.05] p-6 sm:p-8 lg:p-10">

              <div className="absolute right-[-80px] top-[-120px] h-[350px] w-[350px] rounded-full bg-fuchsia-500/[0.10] blur-[100px]" />

              <div className="relative">

                <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-300/70">

                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />

                  Workspace intelligence

                </div>

                <div className="max-w-3xl">

                  <h1 className="text-4xl font-semibold tracking-[-0.055em] sm:text-5xl lg:text-6xl">

                    Your workspace,
                    <br />

                    <span className="bg-gradient-to-r from-fuchsia-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
                      decoded.
                    </span>

                  </h1>

                  <p className="mt-5 max-w-2xl text-sm leading-6 text-white/40 sm:text-base">
                    LOOP continuously turns feedback into signals,
                    signals into patterns, and patterns into decisions.
                  </p>

                </div>

                <div className="mt-7 flex flex-wrap gap-2">

                  <HeroPill
                    text={`${dashboardData?.metrics.feedback ?? 0} feedback signals`}
                    color="violet"
                  />

                  <HeroPill
                    text={`${dashboardData?.metrics.themes ?? 0} emerging patterns`}
                    color="cyan"
                  />

                  <HeroPill
                    text={`${dashboardData?.metrics.resolutionScore ?? 0}% resolution`}
                    color="emerald"
                  />

                </div>

              </div>

            </section>

            {/* ================= PULSE + INSIGHT ================= */}

            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">

              {/* PULSE */}

              <div className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8">

                <div className="absolute right-[-100px] top-[-100px] h-[350px] w-[350px] rounded-full bg-violet-500/[0.08] blur-[100px]" />

                <div className="relative">

                  <div className="flex items-start justify-between">

                    <div>

                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
                        Workspace pulse
                      </div>

                      <div className="mt-2 text-sm text-white/40">
                        Live health intelligence
                      </div>

                    </div>

                    <div
                      className={`rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] ${getChangeClass(
                        dashboardData?.metrics.healthChange ??
                          null
                      )}`}
                    >
                      {formatChange(
                        dashboardData?.metrics.healthChange ??
                          null
                      )}
                    </div>

                  </div>

                  <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-center">

                    <div className="flex shrink-0 justify-center">

                      <div className="relative flex h-44 w-44 items-center justify-center rounded-full border border-violet-400/20 bg-black/30">

                        <div className="absolute inset-3 rounded-full border border-violet-400/10" />

                        <div className="absolute inset-6 rounded-full border border-fuchsia-400/10" />

                        <div className="text-center">

                          <div className="text-5xl font-semibold tracking-[-0.07em]">

                            <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                              {healthScore ?? "—"}
                            </span>

                          </div>

                          <div className="mt-1 text-[8px] uppercase tracking-[0.25em] text-white/30">
                            health score
                          </div>

                        </div>

                      </div>

                    </div>

                    <div className="flex-1">

                      <div className="text-xl font-medium tracking-tight">

                        {healthMessage.title}{" "}

                        <span
                          className={
                            healthMessage.color
                          }
                        >
                          {healthMessage.highlight}
                        </span>

                      </div>

                      <p className="mt-2 text-xs leading-5 text-white/30">
                        {healthMessage.description}
                      </p>

                      <div className="mt-6 space-y-4">

                        <MetricBar
                          label="Sentiment"
                          value={`${dashboardData?.metrics.sentimentScore ?? 0}%`}
                          width={`${dashboardData?.metrics.sentimentScore ?? 0}%`}
                          color="violet"
                        />

                        <MetricBar
                          label="Engagement"
                          value={`${dashboardData?.metrics.engagementScore ?? 0}%`}
                          width={`${dashboardData?.metrics.engagementScore ?? 0}%`}
                          color="cyan"
                        />

                        <MetricBar
                          label="Resolution"
                          value={`${dashboardData?.metrics.resolutionScore ?? 0}%`}
                          width={`${dashboardData?.metrics.resolutionScore ?? 0}%`}
                          color="emerald"
                        />

                      </div>

                    </div>

                  </div>

                </div>

              </div>

              {/* AI PANEL */}

              <div className="relative overflow-hidden rounded-[30px] border border-violet-400/15 bg-gradient-to-br from-violet-500/[0.13] via-fuchsia-500/[0.05] to-cyan-500/[0.07] p-6 sm:p-8">

                <div className="absolute right-[-80px] top-[-80px] h-64 w-64 rounded-full bg-fuchsia-500/10 blur-[90px]" />

                <div className="relative flex h-full flex-col">

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-400">
                        ✦
                      </div>

                      <div>

                        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                          LOOP intelligence
                        </div>

                        <div className="mt-1 text-[9px] text-white/25">
                          Pattern engine
                        </div>

                      </div>

                    </div>

                    <div className="text-[9px] uppercase tracking-[0.15em] text-emerald-300">
                      ● analyzing
                    </div>

                  </div>

                  {currentInsight ? (
                    <div className="mt-10 flex flex-1 flex-col">

                      <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25">
                        Emerging pattern
                      </div>

                      <div className="mt-4 text-2xl font-medium tracking-tight sm:text-3xl">
                        {currentInsight.title}
                      </div>

                      <p className="mt-4 text-sm leading-6 text-white/40">
                        {currentInsight.description}
                      </p>

                      <div className="mt-8 grid grid-cols-2 gap-3">

                        <div className="rounded-2xl border border-white/[0.07] bg-black/10 p-4">

                          <div className="text-[9px] uppercase tracking-[0.18em] text-white/25">
                            Confidence
                          </div>

                          <div className="mt-2 text-2xl font-semibold">
                            {currentInsight.confidence}
                          </div>

                        </div>

                        <div className="rounded-2xl border border-white/[0.07] bg-black/10 p-4">

                          <div className="text-[9px] uppercase tracking-[0.18em] text-white/25">
                            Signals
                          </div>

                          <div className="mt-2 text-2xl font-semibold">
                            {currentInsight.signals}
                          </div>

                        </div>

                      </div>

                      {insights.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setInsight(
                              (value) =>
                                (value + 1) %
                                insights.length
                            )
                          }
                          className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-left text-xs text-white/50 transition hover:bg-white/[0.05] hover:text-white"
                        >
                          Explore next insight →
                        </button>
                      )}

                    </div>
                  ) : (
                    <div className="mt-10 flex flex-1 items-center justify-center text-sm text-white/30">
                      Waiting for enough workspace data to generate insights.
                    </div>
                  )}

                </div>

              </div>

            </div>

            {/* ================= SIGNAL FIELD ================= */}

            <section className="mt-5 rounded-[30px] border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8">

              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

                <div>

                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/50">
                    Live signal field
                  </div>

                  <div className="mt-2 text-sm text-white/40">
                    Watch the workspace move in real time.
                  </div>

                </div>

                <div className="flex flex-wrap gap-1 rounded-xl border border-white/[0.06] bg-black/10 p-1">

                  {signalNames.map(
                    (item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() =>
                          setSignal(item)
                        }
                        className={`rounded-lg px-3 py-2 text-[10px] transition ${
                          signal === item
                            ? "bg-white/[0.08] text-white"
                            : "text-white/30 hover:text-white/60"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                </div>

              </div>

              <div className="mt-7 flex items-end justify-between">

                <div>

                  <span className="text-3xl font-semibold tracking-[-0.05em]">
                    {currentSignal.value}
                  </span>

                  <span
                    className={`ml-3 text-xs ${getChangeClass(
                      signal === "Sentiment"
                        ? dashboardData?.metrics.sentimentChange ??
                            null
                        : signal === "Engagement"
                        ? dashboardData?.metrics.engagementChange ??
                            null
                        : null
                    )}`}
                  >
                    {currentSignal.change}
                  </span>

                </div>

                <div className="text-[9px] uppercase tracking-[0.18em] text-white/20">
                  Last 7 days
                </div>

              </div>

              <div className="relative mt-5 h-48 overflow-hidden rounded-2xl bg-black/15">

                <div className="absolute inset-x-0 top-1/4 border-t border-dashed border-white/[0.04]" />

                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-white/[0.05]" />

                <div className="absolute inset-x-0 top-3/4 border-t border-dashed border-white/[0.04]" />

                <svg
                  viewBox="0 0 800 220"
                  preserveAspectRatio="none"
                  className="absolute inset-0 h-full w-full"
                >

                  <defs>

                    <linearGradient
                      id="signalGradient"
                      x1="0"
                      x2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#a78bfa"
                      />

                      <stop
                        offset="45%"
                        stopColor="#e879f9"
                      />

                      <stop
                        offset="100%"
                        stopColor="#67e8f9"
                      />
                    </linearGradient>

                  </defs>

                  <path
                    d={currentSignal.path}
                    fill="none"
                    stroke="url(#signalGradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />

                  <path
                    d={`${currentSignal.path} V220 H0 Z`}
                    fill="url(#signalGradient)"
                    opacity="0.06"
                  />

                </svg>

              </div>

              <div className="mt-4 flex justify-between text-[9px] uppercase tracking-[0.15em] text-white/20">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>

            </section>

            {/* ================= STATS ================= */}

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">

              <SignalCard
                icon="◈"
                label="Feedback"
                value={String(
                  dashboardData?.metrics.feedback ??
                    0
                )}
                trend="Live"
                color="violet"
              />

              <SignalCard
                icon="▱"
                label="Reports"
                value={String(
                  dashboardData?.metrics.reports ??
                    0
                )}
                trend="Live"
                color="cyan"
              />

              <SignalCard
                icon="◇"
                label="Themes"
                value={String(
                  dashboardData?.metrics.themes ??
                    0
                )}
                trend="Live"
                color="fuchsia"
              />

              <SignalCard
                icon="✓"
                label="Resolved"
                value={String(
                  dashboardData?.metrics.resolved ??
                    0
                )}
                trend="Live"
                color="emerald"
              />

            </div>

            {/* ================= ATTENTION ================= */}

            <section className="mt-5 rounded-[30px] border border-amber-300/10 bg-gradient-to-br from-amber-500/[0.05] via-transparent to-cyan-500/[0.03] p-6 sm:p-8">

              <div className="flex items-start gap-4">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/[0.08] text-amber-300">
                  ⚡
                </div>

                <div className="flex-1">

                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/50">
                    What needs attention
                  </div>

                  <div className="mt-1 text-sm text-white/40">
                    LOOP found workspace signals worth looking at.
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-3">

                   {!dashboardData ? (
  <AttentionItem
    number="01"
    title="Loading workspace signals..."
  />
) : (
  <>
    {dashboardData.metrics.feedback === 0 ? (
      <AttentionItem
        number="01"
        title="Add feedback to start generating workspace signals"
      />
    ) : dashboardData.metrics.sentimentScore < 50 ? (
      <AttentionItem
        number="01"
        title={`Sentiment is at ${dashboardData.metrics.sentimentScore}%`}
      />
    ) : dashboardData.metrics.engagementScore < 50 ? (
      <AttentionItem
        number="01"
        title={`Engagement is at ${dashboardData.metrics.engagementScore}%`}
      />
    ) : (
      <AttentionItem
        number="01"
        title="Workspace signals are currently healthy"
      />
    )}
  </>
)}

                    <AttentionItem
                      number="02"
                      title={
                        dashboardData?.metrics.resolutionChange !==
                        null &&
                        dashboardData?.metrics.resolutionChange !==
                          undefined
                          ? `Resolution changed by ${formatChange(
                              dashboardData.metrics
                                .resolutionChange
                            )}`
                          : "Resolution trend is not available yet"
                      }
                    />

                    <AttentionItem
                      number="03"
                      title={
                        dashboardData?.metrics.themes
                          ? `${dashboardData.metrics.themes} theme${
                              dashboardData.metrics.themes ===
                              1
                                ? ""
                                : "s"
                            } detected from workspace feedback`
                          : "No recurring themes detected yet"
                      }
                    />

                  </div>

                </div>

              </div>

            </section>

            {/* ================= ACTIVITY ================= */}

            <section className="mt-5 rounded-[30px] border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8">

              <div className="mb-6">

                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
                  Activity stream
                </div>

                <div className="mt-2 text-sm text-white/40">
                  The latest things happening in your workspace
                </div>

              </div>

              {feedback.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-6 text-center">

                  <p className="text-sm text-white/40">
                    No workspace activity yet.
                  </p>

                  <p className="mt-2 text-xs text-white/25">
                    Submit feedback below to start building your activity stream.
                  </p>

                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">

                  {feedback
                    .slice(0, 3)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-white/[0.06] bg-black/10 p-5"
                      >

                        <div className="flex items-start justify-between">

                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 to-cyan-400/10 text-violet-300">
                            ✦
                          </div>

                          <span className="text-[9px] text-white/20">
                            {new Date(
                              item.createdAt
                            ).toLocaleString()}
                          </span>

                        </div>

                        <div className="mt-6 text-sm font-medium">
                          Feedback received
                        </div>

                        <div className="mt-2 line-clamp-3 text-xs leading-5 text-white/30">
                          {item.content ||
                            "No feedback text available."}
                        </div>

                        <div className="mt-5 text-[9px] uppercase tracking-[0.18em] text-white/20">
                          {item.channel}
                        </div>

                      </div>
                    ))}

                </div>
              )}

            </section>

            {/* ================= SUBMIT FEEDBACK ================= */}

            <section className="mt-8">

              <div className="mb-5">

                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
                  Feedback Collection
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Submit Feedback
                </h2>

                <p className="mt-1 text-sm text-white/50">
                  Add customer feedback and analyze it with AI.
                </p>

              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">

                <textarea
                  value={newFeedback}
                  onChange={(event) =>
                    setNewFeedback(
                      event.target.value
                    )
                  }
                  placeholder="Enter customer feedback..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-violet-400/30"
                />

                <div className="mt-4 flex flex-wrap items-center gap-3">

                  <select
                    value={newFeedbackChannel}
                    onChange={(event) =>
                      setNewFeedbackChannel(
                        event.target.value
                      )
                    }
                    className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none"
                  >
                    <option value="WEB">
                      WEB
                    </option>

                    <option value="EMAIL">
                      EMAIL
                    </option>

                    <option value="SURVEY">
                      SURVEY
                    </option>

                    <option value="SOCIAL">
                      SOCIAL
                    </option>
                  </select>

                  <button
                    type="button"
                    onClick={submitFeedback}
                    disabled={
                      submittingFeedback ||
                      !newFeedback.trim()
                    }
                    className="rounded-xl bg-purple-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submittingFeedback
                      ? "Submitting..."
                      : "Submit Feedback"}
                  </button>

                </div>

                {submitMessage && (
                  <p className="mt-4 text-xs text-white/50">
                    {submitMessage}
                  </p>
                )}

              </div>

            </section>

            {/* ================= FEEDBACK INBOX ================= */}

            <section className="mt-8 rounded-[30px] border border-white/10 bg-white/[0.025] p-5 sm:p-6">

              <div className="mb-6">

                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-300">
                  Feedback Inbox
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Recent Feedback
                </h2>

                <p className="mt-1 text-sm text-white/40">
                  Feedback collected from your workspace.
                </p>

              </div>

              {/* FILTERS */}

              <div className="grid gap-3 md:grid-cols-3">

                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(
                      event.target.value
                    );
                    setFeedbackPage(1);
                  }}
                  placeholder="Search feedback..."
                  className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-purple-400/30"
                />

                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(
                      event.target.value
                    );
                    setFeedbackPage(1);
                  }}
                  className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="">
                    All Statuses
                  </option>

                  <option value="NEW">
                    NEW
                  </option>

                  <option value="REVIEWED">
                    REVIEWED
                  </option>

                  <option value="ACTIONED">
                    ACTIONED
                  </option>
                </select>

                <select
                  value={channelFilter}
                  onChange={(event) => {
                    setChannelFilter(
                      event.target.value
                    );
                    setFeedbackPage(1);
                  }}
                  className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="">
                    All Channels
                  </option>

                  <option value="WEB">
                    WEB
                  </option>

                  <option value="EMAIL">
                    EMAIL
                  </option>

                  <option value="SURVEY">
                    SURVEY
                  </option>

                  <option value="SOCIAL">
                    SOCIAL
                  </option>
                </select>

              </div>

              {/* FEEDBACK */}

              <div className="mt-6">

                {feedbackLoading ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center">

                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-violet-400" />

                    <p className="mt-3 text-sm text-white/40">
                      Loading feedback...
                    </p>

                  </div>
                ) : feedback.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center">

                    <p className="text-sm text-white/40">
                      No feedback found.
                    </p>

                  </div>
                ) : (
                  <div className="space-y-3">

                    {feedback.map(
                      (item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-purple-400/30"
                        >

                          <p className="text-sm leading-6 text-white/85">
                            {item.content ||
                              "No feedback text available."}
                          </p>

                          <div className="mt-4 flex flex-wrap items-center gap-3">

                            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                              {item.channel}
                            </span>

                            <select
                              value={
                                item.status
                              }
                              onChange={(
                                event
                              ) =>
                                updateFeedbackStatus(
                                  item.id,
                                  event.target
                                    .value
                                )
                              }
                              className="rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1 text-xs text-purple-300 outline-none"
                            >
                              <option value="NEW">
                                NEW
                              </option>

                              <option value="REVIEWED">
                                REVIEWED
                              </option>

                              <option value="ACTIONED">
                                ACTIONED
                              </option>
                            </select>

                            {item.sentiment && (
                              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                                {item.sentiment}
                              </span>
                            )}

                            {item.sentimentScore !==
                              null && (
                              <span className="text-xs text-white/30">
                                Score:{" "}
                                {Math.round(
                                  item.sentimentScore *
                                    100
                                )}
                              </span>
                            )}

                            <span className="text-xs text-white/30">
                              {new Date(
                                item.createdAt
                              ).toLocaleString()}
                            </span>

                          </div>

                          <div className="mt-4">

                            <button
                              type="button"
                              onClick={() =>
                                analyzeFeedback(
                                  item.id
                                )
                              }
                              className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs font-medium text-violet-200 transition hover:border-violet-400/50 hover:bg-violet-500/20"
                            >
                              ✨ Analyze with AI
                            </button>

                          </div>

                        </div>
                      )
                    )}

                  </div>
                )}

              </div>

              {/* PAGINATION */}

              {!feedbackLoading &&
                feedbackPagination.totalPages >
                  1 && (
                  <div className="mt-6 flex items-center justify-between">

                    <p className="text-xs text-white/40">
                      Page{" "}
                      {
                        feedbackPagination.page
                      }{" "}
                      of{" "}
                      {
                        feedbackPagination.totalPages
                      }
                    </p>

                    <div className="flex gap-2">

                      <button
                        type="button"
                        disabled={
                          feedbackPage <=
                          1
                        }
                        onClick={() =>
                          setFeedbackPage(
                            (page) =>
                              page - 1
                          )
                        }
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white transition hover:border-purple-400/40 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ← Previous
                      </button>

                      <button
                        type="button"
                        disabled={
                          feedbackPage >=
                          feedbackPagination.totalPages
                        }
                        onClick={() =>
                          setFeedbackPage(
                            (page) =>
                              page + 1
                          )
                        }
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white transition hover:border-purple-400/40 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        Next →
                      </button>

                    </div>

                  </div>
                )}

            </section>

            {/* ================= THEMES ================= */}

            <section className="mt-8">

              <div className="mb-5">

                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-300">
                  Feedback Intelligence
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Themes
                </h2>

                <p className="mt-1 text-sm text-white/50">
                  Common themes identified from customer feedback.
                </p>

              </div>

              {themes.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center">

                  <p className="text-sm text-white/50">
                    No themes identified yet.
                  </p>

                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                  {themes.map(
                    (theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() =>
                          loadThemeFeedback(
                            theme.id
                          )
                        }
                        className="w-full rounded-2xl border border-white/10 bg-black/20 p-5 text-left transition hover:border-purple-400/30 hover:bg-white/[0.03]"
                      >

                        <div className="flex items-start justify-between gap-4">

                          <div>

                            <h3 className="text-lg font-semibold text-white">
                              {theme.name}
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-white/50">
                              {theme.description ||
                                "No description available."}
                            </p>

                          </div>

                          <span className="shrink-0 rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1 text-xs text-purple-300">
                            Theme
                          </span>

                        </div>

                      </button>
                    )
                  )}

                </div>
              )}

              {/* THEME FEEDBACK */}

              {selectedTheme && (
                <div className="mt-6 rounded-2xl border border-purple-400/20 bg-black/20 p-5">

                  <div className="mb-4 flex items-center justify-between">

                    <div>

                      <p className="text-xs uppercase tracking-[0.25em] text-purple-300">
                        Theme Feedback
                      </p>

                      <h3 className="mt-1 text-lg font-semibold text-white">
                        {
                          themes.find(
                            (theme) =>
                              theme.id ===
                              selectedTheme
                          )?.name
                        }
                      </h3>

                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTheme(
                          null
                        );
                        setThemeFeedback(
                          []
                        );
                      }}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 hover:bg-white/5"
                    >
                      Close
                    </button>

                  </div>

                  {themeFeedbackLoading ? (
                    <p className="text-sm text-white/50">
                      Loading feedback...
                    </p>
                  ) : themeFeedback.length ===
                    0 ? (
                    <p className="text-sm text-white/50">
                      No feedback found for this theme.
                    </p>
                  ) : (
                    <div className="space-y-3">

                      {themeFeedback.map(
                        (item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
                          >

                            <p className="text-sm leading-6 text-white/80">
                              {item.content ||
                                "No feedback text available."}
                            </p>

                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">

                              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-cyan-300">
                                {item.channel}
                              </span>

                              {item.sentiment && (
                                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-300">
                                  {item.sentiment}
                                </span>
                              )}

                              <span className="text-white/30">
                                {new Date(
                                  item.createdAt
                                ).toLocaleString()}
                              </span>

                            </div>

                          </div>
                        )
                      )}

                    </div>
                  )}

                </div>
              )}

            </section>

            {/* ================= FOOTER ================= */}

            <footer className="flex flex-col gap-2 py-8 text-[10px] text-white/20 sm:flex-row sm:justify-between">

              <span>
                LOOP Intelligence Workspace
              </span>

              <span>
                Feedback → Signals → Patterns → Decisions
              </span>

            </footer>

          </div>

        </section>

      </div>

    </main>
  );
}

/* ==================================================
   COMPONENTS
   ================================================== */

function NavItem({
  icon,
  label,
  active = false,
}: {
  icon: string;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition duration-300 ${
        active
          ? "bg-white/[0.07] text-white"
          : "text-white/35 hover:bg-white/[0.04] hover:text-white/70"
      }`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-lg ${
          active
            ? "bg-gradient-to-br from-violet-500/30 to-cyan-400/20 text-violet-200"
            : "bg-white/[0.025] text-white/30"
        }`}
      >
        {icon}
      </span>

      <span>{label}</span>

      {active && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400" />
      )}
    </button>
  );
}

function HeroPill({
  text,
  color,
}: {
  text: string;
  color: "violet" | "cyan" | "emerald";
}) {
  const styles = {
    violet:
      "border-violet-400/15 bg-violet-400/[0.06] text-violet-200/70",

    cyan:
      "border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-200/70",

    emerald:
      "border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-200/70",
  };

  return (
    <div
      className={`rounded-full border px-3 py-1.5 text-[10px] ${styles[color]}`}
    >
      {text}
    </div>
  );
}

function MetricBar({
  label,
  value,
  width,
  color,
}: {
  label: string;
  value: string;
  width: string;
  color: "violet" | "cyan" | "emerald";
}) {
  const gradients = {
    violet:
      "from-violet-500 to-fuchsia-400",

    cyan:
      "from-violet-500 to-cyan-300",

    emerald:
      "from-cyan-400 to-emerald-300",
  };

  return (
    <div>

      <div className="mb-2 flex justify-between text-[10px]">

        <span className="text-white/35">
          {label}
        </span>

        <span className="text-white/55">
          {value}
        </span>

      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">

        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradients[color]}`}
          style={{
            width,
          }}
        />

      </div>

    </div>
  );
}

function SignalCard({
  icon,
  label,
  value,
  trend,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  trend: string;
  color:
    | "violet"
    | "cyan"
    | "fuchsia"
    | "emerald";
}) {
  const colors = {
    violet:
      "text-violet-300 bg-violet-400/[0.08]",

    cyan:
      "text-cyan-300 bg-cyan-400/[0.08]",

    fuchsia:
      "text-fuchsia-300 bg-fuchsia-400/[0.08]",

    emerald:
      "text-emerald-300 bg-emerald-400/[0.08]",
  };

  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-5 transition duration-300 hover:-translate-y-1 hover:border-white/[0.15]">

      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors[color]}`}
      >
        {icon}
      </div>

      <div className="mt-6 text-[9px] uppercase tracking-[0.18em] text-white/25">
        {label}
      </div>

      <div className="mt-1 text-3xl font-semibold tracking-[-0.05em]">
        {value}
      </div>

      <div className="mt-2 text-[10px] text-emerald-300">
        {trend}
      </div>

    </div>
  );
}

function AttentionItem({
  number,
  title,
}: {
  number: string;
  title: string;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-black/10 p-4">

      <span className="text-[9px] text-amber-300/50">
        {number}
      </span>

      <span className="flex-1 text-xs text-white/45 group-hover:text-white/70">
        {title}
      </span>

      <span className="text-white/20">
        →
      </span>

    </div>
  );
}