"use client";

import { useEffect,useState } from "react";

type Signal = "Sentiment" | "Engagement" | "Feedback";

const signals: Record<
  Signal,
  { value: string; change: string; path: string }
> = {
  Sentiment: {
    value: "82%",
    change: "+18%",
    path: "M0 155 C55 145 70 160 115 115 S180 145 225 105 S285 75 330 115 S390 165 430 115 S490 55 540 95 S600 145 650 95 S710 70 760 110 S780 80 800 55",
  },
  Engagement: {
    value: "76%",
    change: "+11%",
    path: "M0 175 C60 165 80 130 125 145 S190 170 230 125 S290 100 330 135 S390 150 430 105 S500 75 545 115 S610 145 655 100 S720 85 760 95 S790 70 800 60",
  },
  Feedback: {
    value: "48",
    change: "+12%",
    path: "M0 165 C50 155 80 110 120 135 S185 160 220 115 S275 125 320 95 S385 55 430 105 S490 160 530 120 S590 70 635 110 S690 135 730 80 S770 100 800 45",
  },
};

const insights = [
  {
    title: "Positive sentiment is accelerating",
    description:
      "LOOP detected a strong upward movement across recent feedback.",
    confidence: "91%",
    color: "violet",
  },
  {
    title: "Onboarding is becoming a recurring theme",
    description:
      "Several recent responses mention friction during the first experience.",
    confidence: "87%",
    color: "cyan",
  },
  {
    title: "Workspace engagement is growing",
    description:
      "Activity has increased consistently across the last seven days.",
    confidence: "94%",
    color: "emerald",
  },
];

const activities = [
  {
    icon: "✦",
    title: "Feedback analyzed",
    description: "12 new responses processed",
    time: "8 min ago",
    type: "AI",
  },
  {
    icon: "◇",
    title: "Theme detected",
    description: "Onboarding appeared repeatedly",
    time: "24 min ago",
    type: "THEME",
  },
  {
    icon: "↗",
    title: "Pulse improved",
    description: "Workspace health increased by 6.4%",
    time: "1 hr ago",
    type: "PULSE",
  },
];
type DashboardData = {
  user: {
    id: string;
    name: string;
    email: string;
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

  export default function DashboardPage() {
  const [signal, setSignal] = useState<Signal>("Sentiment");
  const [insight, setInsight] = useState(0);

  const [themes, setThemes] = useState<
    {
      id: string;
      name: string;
      description?: string | null;
    }[]
  >([]);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

const [themeFeedback, setThemeFeedback] = useState<
  {
    id: string;
    content: string;
    channel: string;
    customerLabel?: string | null;
    sentiment?: "POS" | "NEU" | "NEG" | null;
    sentimentScore?: number | null;
    status: "NEW" | "REVIEWED" | "ACTIONED";
    createdAt: string;
    confidence: number;
  }[]
>([]);

const [themeFeedbackLoading, setThemeFeedbackLoading] =
  useState(false);

  const [dashboardData, setDashboardData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);

  const [feedback, setFeedback] = useState<Feedback[]>([]);

  const [feedbackLoading, setFeedbackLoading] =
    useState(false);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  const [channelFilter, setChannelFilter] =
    useState("");

  const [feedbackPage, setFeedbackPage] =
    useState(1);

  const [feedbackPagination, setFeedbackPagination] =
    useState({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
    });

  const currentSignal = signals[signal];
  const currentInsight = insights[insight];

  const healthScore =
    dashboardData &&
    dashboardData.metrics.feedback > 0
      ? Math.round(
          (dashboardData.metrics.resolved /
            dashboardData.metrics.feedback) *
            100
        )
      : null;

  // ==================================================
  // FETCH DASHBOARD DATA
  // ==================================================

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await fetch("/api/dashboard");

        if (!response.ok) {
          throw new Error("Failed to load dashboard");
        }

        const data = await response.json();

        setDashboardData(data);
      } catch (error) {
        console.error(
          "Dashboard loading error:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  // ==================================================
  // FETCH THEMES
  // ==================================================

  

  // ==================================================
  // FETCH FEEDBACK
  // ==================================================

  useEffect(() => {
  let cancelled = false;

  async function loadData() {
    try {
      setFeedbackLoading(true);

      const params = new URLSearchParams();

      params.set("page", String(feedbackPage));
      params.set("limit", "10");

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (statusFilter) {
        params.set("status", statusFilter);
      }

      if (channelFilter) {
        params.set("channel", channelFilter);
      }

      const [feedbackResponse, themesResponse] =
        await Promise.all([
          fetch(`/api/feedback?${params.toString()}`),
          fetch("/api/themes"),
        ]);

      if (!feedbackResponse.ok) {
        throw new Error("Failed to load feedback");
      }

      if (!themesResponse.ok) {
        throw new Error("Failed to load themes");
      }

      const feedbackData =
        await feedbackResponse.json();

      const themesData =
        await themesResponse.json();

      if (cancelled) {
        return;
      }

      setFeedback(
        Array.isArray(feedbackData.feedback)
          ? feedbackData.feedback
          : []
      );

      if (feedbackData.pagination) {
        setFeedbackPagination(
          feedbackData.pagination
        );
      }

      setThemes(
        Array.isArray(themesData.themes)
          ? themesData.themes
          : []
      );

      console.log("THEMES:", themesData);
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

  // ==================================================
  // UPDATE FEEDBACK STATUS
  // ==================================================

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

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to update feedback status"
        );
      }

      setFeedback(
        (currentFeedback) =>
          currentFeedback.map(
            (item) =>
              item.id === feedbackId
                ? {
                    ...item,
                    status:
                      newStatus,
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
  async function loadThemeFeedback(themeId: string) {
  try {
    setSelectedTheme(themeId);
    setThemeFeedbackLoading(true);

    const response = await fetch(
      `/api/themes/${themeId}/feedback`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Failed to load theme feedback"
      );
    }

    setThemeFeedback(data.feedback || []);
  } catch (error) {
    console.error("Theme feedback error:", error);
    setThemeFeedback([]);
  } finally {
    setThemeFeedbackLoading(false);
  }
}

  return (
    <main className="min-h-screen overflow-hidden bg-[#06070b] text-white">
      {/* ================= AMBIENT BACKGROUND ================= */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-180px] top-[-180px] h-[520px] w-[520px] animate-pulse rounded-full bg-fuchsia-600/[0.12] blur-[150px]" />

        <div
          className="absolute right-[-180px] top-[10%] h-[520px] w-[520px] animate-pulse rounded-full bg-cyan-500/[0.10] blur-[150px]"
          style={{ animationDelay: "1.5s" }}
        />

        <div
          className="absolute bottom-[-250px] left-[30%] h-[600px] w-[600px] animate-pulse rounded-full bg-violet-600/[0.09] blur-[160px]"
          style={{ animationDelay: "3s" }}
        />

        {/* Tiny atmospheric dots */}
        <div className="absolute left-[42%] top-[18%] h-1 w-1 animate-ping rounded-full bg-cyan-300/40" />
        <div className="absolute left-[70%] top-[32%] h-1 w-1 animate-ping rounded-full bg-violet-300/40" />
        <div className="absolute left-[22%] top-[65%] h-1 w-1 animate-ping rounded-full bg-fuchsia-300/40" />
      </div>

      <div className="relative flex min-h-screen">
        {/* ================= SIDEBAR ================= */}
        <aside className="hidden w-[245px] shrink-0 border-r border-white/[0.07] bg-black/20 px-5 py-6 backdrop-blur-xl lg:block">
          <div className="mb-12 flex items-center gap-3 px-2">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400 text-sm font-black shadow-[0_0_30px_rgba(168,85,247,0.3)]">
              L
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            </div>

            <div>
              <div className="text-lg font-bold tracking-tight">LOOP</div>
              <div className="text-[9px] uppercase tracking-[0.25em] text-white/30">
                Intelligence
              </div>
            </div>
          </div>

          <div className="mb-3 px-2 text-[10px] uppercase tracking-[0.2em] text-white/25">
            Workspace
          </div>

          <nav className="space-y-1">
            <NavItem icon="◉" label="Overview" active />
            <NavItem icon="✦" label="Intelligence" />
            <NavItem icon="◌" label="Feedback" />
            <NavItem icon="▱" label="Reports" />
            <NavItem icon="◇" label="Themes" />
          </nav>

          <div className="mb-3 mt-10 px-2 text-[10px] uppercase tracking-[0.2em] text-white/25">
            Manage
          </div>

          <nav className="space-y-1">
            <NavItem icon="⚙" label="Settings" />
            <NavItem icon="?" label="Help center" />
          </nav>

          <div className="mt-10 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-violet-500/[0.08] to-cyan-500/[0.04] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                Workspace
              </span>

              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
            </div>

            <div className="truncate text-sm font-medium">
              Reshmitha&apos;s workspace
            </div>

            <div className="mt-1 text-xs text-white/30">
              Admin workspace
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3 rounded-xl p-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold shadow-[0_0_20px_rgba(168,85,247,0.25)]">
              R
            </div>

            <div>
              <div className="text-xs font-semibold">Reshmitha</div>
              <div className="text-[10px] text-white/30">ADMIN</div>
            </div>
          </div>
        </aside>

        {/* ================= MAIN ================= */}
        <section className="min-w-0 flex-1">
          {/* TOP BAR */}
          <header className="flex h-[76px] items-center justify-between border-b border-white/[0.07] bg-black/10 px-5 backdrop-blur-xl sm:px-8 lg:px-10">
            <div>
              <div className="text-[9px] uppercase tracking-[0.25em] text-violet-300/60">
                LOOP / Workspace
              </div>

              <div className="mt-1 text-xs text-white/40">
                Intelligence canvas
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="hidden rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-2 text-xs text-white/45 transition hover:border-violet-400/30 hover:bg-violet-400/[0.05] sm:block">
                ⌘ Search
              </button>

              <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-white/50 hover:bg-white/[0.06]">
                ◌
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.8)]" />
              </button>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold">
                R
              </div>
            </div>
          </header>

           
            <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">

  

  {/* ================= HERO ================= */}           
            <section className="relative mb-8 overflow-hidden rounded-[32px] border border-white/[0.07] bg-gradient-to-br from-violet-500/[0.08] via-transparent to-cyan-400/[0.05] p-6 sm:p-8 lg:p-10">
              <div className="absolute right-[-80px] top-[-120px] h-[350px] w-[350px] rounded-full bg-fuchsia-500/[0.10] blur-[100px]" />

              <div className="relative">
                <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-300/70">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.8)]" />
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
                    LOOP continuously turns feedback into signals, signals
                    into patterns, and patterns into decisions.
                  </p>
                </div>

                <div className="mt-7 flex flex-wrap gap-2">
                  <HeroPill text="48 feedback signals" color="violet" />
                  <HeroPill text="3 emerging patterns" color="cyan" />
                  <HeroPill text="91% resolution" color="emerald" />
                </div>
              </div>
            </section>

            {/* ================= PULSE + AI ================= */}
            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              {/* PULSE */}
              <div className="group relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-white/[0.025] p-6 transition duration-500 hover:border-violet-400/20 sm:p-8">
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

                    <div className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-3 py-1.5 text-[10px] text-emerald-300">
                      ↑ 6.4%
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col items-center gap-8 md:flex-row">
                    {/* ORBITAL PULSE */}
                    <div className="relative flex h-56 w-56 shrink-0 items-center justify-center">
                      <div className="absolute inset-2 rounded-full border border-violet-400/10" />

                      <div className="absolute inset-5 rounded-full border border-cyan-400/10" />

                      <div className="absolute inset-9 rounded-full border border-fuchsia-400/10" />

                      <div className="absolute inset-4 animate-[spin_16s_linear_infinite] rounded-full border border-transparent border-t-violet-400/70 border-r-cyan-300/30" />

                      <div className="absolute inset-10 animate-[spin_11s_linear_infinite_reverse] rounded-full border border-transparent border-b-fuchsia-400/60" />

                      {/* orbit points */}
                      <span className="absolute right-[34px] top-[48px] h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_15px_rgba(103,232,249,0.9)]" />

                      <span className="absolute bottom-[38px] left-[48px] h-1.5 w-1.5 rounded-full bg-fuchsia-300 shadow-[0_0_12px_rgba(232,121,249,0.9)]" />

                      <div className="relative flex h-32 w-32 flex-col items-center justify-center rounded-full border border-white/[0.06] bg-[#090a10] shadow-[0_0_70px_rgba(139,92,246,0.20)]">
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

                    <div className="flex-1">
                      <div className="text-xl font-medium tracking-tight">
  {healthScore === null ? (
    <>
      Workspace is{" "}
      <span className="text-cyan-300">
        waiting for signals.
      </span>
    </>
  ) : healthScore >= 80 ? (
    <>
      Workspace is{" "}
      <span className="text-emerald-300">
        operating strongly.
      </span>
    </>
  ) : healthScore >= 60 ? (
    <>
      Workspace is{" "}
      <span className="text-amber-300">
        showing room for improvement.
      </span>
    </>
  ) : (
    <>
      Workspace needs{" "}
      <span className="text-rose-300">
        attention.
      </span>
    </>
  )}
</div>

<p className="mt-2 text-xs leading-5 text-white/30">
  {healthScore === null
    ? "LOOP will calculate your health score once workspace activity begins."
    : "Your health score is calculated from real workspace activity."}
</p>

                      <div className="mt-6 space-y-4">
                        <MetricBar
                          label="Sentiment"
                          value="82%"
                          width="82%"
                          color="violet"
                        />

                        <MetricBar
                          label="Engagement"
                          value="76%"
                          width="76%"
                          color="cyan"
                        />

                        <MetricBar
                          label="Resolution"
                          value="91%"
                          width="91%"
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
                      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-400 shadow-[0_0_25px_rgba(168,85,247,0.3)]">
                        ✦
                      </div>

                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200/80">
                          LOOP Intelligence
                        </div>

                        <div className="mt-0.5 text-[9px] text-white/25">
                          Pattern engine
                        </div>
                      </div>
                    </div>

                    <span className="flex items-center gap-1.5 text-[9px] text-emerald-300">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                      ANALYZING
                    </span>
                  </div>

                  <div className="mt-10">
                    <div className="text-[9px] uppercase tracking-[0.2em] text-white/25">
                      Emerging pattern
                    </div>

                    <h2 className="mt-3 text-2xl font-medium leading-tight tracking-[-0.035em] sm:text-3xl">
                      {currentInsight.title}
                    </h2>

                    <p className="mt-4 text-sm leading-6 text-white/40">
                      {currentInsight.description}
                    </p>

                    <div className="mt-7 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/[0.07] bg-black/10 p-4">
                        <div className="text-[9px] uppercase tracking-[0.15em] text-white/25">
                          Confidence
                        </div>

                        <div className="mt-2 text-xl font-semibold text-violet-200">
                          {currentInsight.confidence}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/[0.07] bg-black/10 p-4">
                        <div className="text-[9px] uppercase tracking-[0.15em] text-white/25">
                          Signals
                        </div>

                        <div className="mt-2 text-xl font-semibold text-cyan-200">
                          34
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-8">
                    <button className="group w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-left text-xs text-white/60 transition hover:border-violet-400/30 hover:bg-violet-400/[0.08]">
                      Explore why
                      <span className="float-right transition group-hover:translate-x-1">
                        →
                      </span>
                    </button>

                    <div className="mt-4 flex gap-2">
                      {insights.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setInsight(index)}
                          className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                            insight === index
                              ? "bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-300"
                              : "bg-white/10 hover:bg-white/20"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= SIGNAL FIELD ================= */}
            <section className="mt-5 rounded-[30px] border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(103,232,249,0.8)]" />
                    Live signal field
                  </div>

                  <div className="mt-2 text-sm text-white/40">
                    Watch the workspace move in real time.
                  </div>
                </div>

                <div className="flex rounded-xl border border-white/[0.07] bg-black/10 p-1">
                  {(Object.keys(signals) as Signal[]).map((item) => (
                    <button
                      key={item}
                      onClick={() => setSignal(item)}
                      className={`rounded-lg px-3 py-2 text-[10px] transition ${
                        signal === item
                          ? "bg-white/[0.08] text-white"
                          : "text-white/30 hover:text-white/60"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-7 flex items-end justify-between">
                <div>
                  <span className="text-3xl font-semibold tracking-[-0.05em]">
                    {currentSignal.value}
                  </span>

                  <span className="ml-3 text-xs text-emerald-300">
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
                    <linearGradient id="signalGradient" x1="0" x2="1">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="45%" stopColor="#e879f9" />
                      <stop offset="100%" stopColor="#67e8f9" />
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
             {/* ================= STATS ================= */}
<div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
  <SignalCard
    icon="◈"
    label="Feedback"
    value={dashboardData ? String(dashboardData.metrics.feedback) : "—"}
    trend="Live"
    color="violet"
  />

  <SignalCard
    icon="▱"
    label="Reports"
    value={dashboardData ? String(dashboardData.metrics.reports) : "—"}
    trend="Live"
    color="cyan"
  />

  <SignalCard
    icon="◇"
    label="Themes"
    value={dashboardData ? String(dashboardData.metrics.themes) : "—"}
    trend="Live"
    color="fuchsia"
  />

  <SignalCard
    icon="✓"
    label="Resolved"
    value={dashboardData ? String(dashboardData.metrics.resolved) : "—"}
    trend="Live"
    color="emerald"
  />
</div> 
            </div>

            {/* ================= ATTENTION ================= */}
            <section className="mt-5 rounded-[30px] border border-amber-300/10 bg-gradient-to-r from-amber-400/[0.06] via-transparent to-transparent p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-300/10 bg-amber-300/[0.08] text-amber-300">
                  ⚡
                </div>

                <div className="flex-1">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/60">
                    What needs attention
                  </div>

                  <div className="mt-1 text-sm text-white/45">
                    LOOP found three things worth looking at.
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    <AttentionItem
                      number="01"
                      title="Review 3 feedback clusters"
                    />

                    <AttentionItem
                      number="02"
                      title="Response time dropped 8%"
                    />

                    <AttentionItem
                      number="03"
                      title='New theme: "Onboarding"'
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ================= ACTIVITY ================= */}
            <section className="mt-5 rounded-[30px] border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
                    Activity stream
                  </div>

                  <div className="mt-2 text-sm text-white/40">
                    The latest things happening in your workspace
                  </div>
                </div>

                <button className="text-xs text-violet-300 hover:text-violet-200">
                  View all →
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {activities.map((item) => (
                  <div
                    key={item.title}
                    className="group rounded-2xl border border-white/[0.06] bg-black/10 p-5 transition duration-300 hover:-translate-y-1 hover:border-violet-400/20 hover:bg-white/[0.035]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 to-cyan-400/10 text-violet-300">
                        {item.icon}
                      </div>

                      <span className="text-[9px] text-white/20">
                        {item.time}
                      </span>
                    </div>

                    <div className="mt-6 text-sm font-medium">
                      {item.title}
                    </div>

                    <div className="mt-2 text-xs leading-5 text-white/30">
                      {item.description}
                    </div>

                    <div className="mt-5 text-[9px] uppercase tracking-[0.18em] text-white/20">
                      {item.type}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <footer className="flex flex-col gap-2 py-8 text-[10px] text-white/20 sm:flex-row sm:justify-between">
              <span>LOOP Intelligence Workspace</span>
              <span>Feedback → Signals → Patterns → Decisions</span>
            </footer>
          </div>
        </section>
      </div>
    {/* Feedback Inbox */}
<section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">

  {/* Header */}
  <div className="mb-6">
    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-300">
      Feedback Inbox
    </p>

    <h2 className="mt-2 text-2xl font-semibold text-white">
      Recent Feedback
    </h2>

    <p className="mt-1 text-sm text-white/50">
      Review and manage feedback from your workspace.
    </p>
  </div>

  {/* Search and Filters */}
  <div className="mb-6 grid gap-3 md:grid-cols-3">

    {/* Search */}
    <input
      type="text"
      placeholder="Search feedback..."
      value={search}
      onChange={(e) => {
        setSearch(e.target.value);
        setFeedbackPage(1);
      }}
      className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple-400"
    />

    {/* Status Filter */}
    <select
      value={statusFilter}
      onChange={(e) => {
        setStatusFilter(e.target.value);
        setFeedbackPage(1);
      }}
      className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-purple-400"
    >
      <option value="">All Statuses</option>
      <option value="NEW">New</option>
      <option value="REVIEWED">Reviewed</option>
      <option value="ACTIONED">Actioned</option>
    </select>

    {/* Channel Filter */}
    <select
      value={channelFilter}
      onChange={(e) => {
        setChannelFilter(e.target.value);
        setFeedbackPage(1);
      }}
      className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-purple-400"
    >
      <option value="">All Channels</option>
      <option value="WEB">Web</option>
      <option value="EMAIL">Email</option>
      <option value="CSV">CSV</option>
      <option value="API">API</option>
    </select>

  </div>

  {/* Loading */}
  {feedbackLoading ? (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center">
      <p className="text-sm text-white/50">
        Loading feedback...
      </p>
    </div>
  ) : feedback.length === 0 ? (
    /* Empty State */
    <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center">
      <p className="text-sm text-white/50">
        No feedback found.
      </p>
    </div>
  ) : (
    /* Feedback List */
    <div className="space-y-3">

      {feedback.map((item) => (
  <div
    key={item.id}
    className="rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-purple-400/30"
  >
    {/* Feedback Text */}
    <p className="text-sm leading-6 text-white/85">
      {item.content || "No feedback text available."}
    </p>

    {/* Metadata */}
    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">

      {/* Channel */}
      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-cyan-300">
        {item.channel}
      </span>

      {/* Status */}
      <select
        value={item.status}
        onChange={(e) =>
          updateFeedbackStatus(item.id, e.target.value)
        }
        className="cursor-pointer rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1 text-xs text-purple-300 outline-none"
      >
        <option value="NEW">NEW</option>
        <option value="REVIEWED">REVIEWED</option>
        <option value="ACTIONED">ACTIONED</option>
      </select>

      {/* Sentiment */}
      {item.sentiment && (
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-300">
          {item.sentiment}
        </span>
      )}

      {/* Date */}
      <span className="text-white/40">
        {new Date(item.createdAt).toLocaleString()}
      </span>
    </div>

    {/* AI Analyze Button */}
    <div className="mt-4">
      <button
        type="button"
        onClick={async () => {
          try {
            const response = await fetch(
              `/api/feedback/${item.id}/analyze`,
              {
                method: "POST",
              }
            );

            const result = await response.json();

            if (!response.ok) {
              console.error("AI analysis failed:", result);
              alert(result.error || "AI analysis failed");
              return;
            }

            console.log("AI ANALYSIS:", result);

            alert("Feedback analyzed successfully!");

            window.location.reload();
          } catch (error) {
            console.error("AI analysis error:", error);
            alert("Something went wrong while analyzing feedback.");
          }
        }}
        className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs font-medium text-violet-200 transition hover:border-violet-400/50 hover:bg-violet-500/20"
      >
        ✨ Analyze with AI
      </button>
    </div>
  </div>
))}

    </div>
  )}

  {/* Pagination */}
  {!feedbackLoading && feedbackPagination.totalPages > 1 && (
    <div className="mt-6 flex items-center justify-between">

      <p className="text-xs text-white/40">
        Page {feedbackPagination.page} of{" "}
        {feedbackPagination.totalPages}
      </p>

      <div className="flex gap-2">

        <button
          type="button"
          disabled={feedbackPage <= 1}
          onClick={() => setFeedbackPage((page) => page - 1)}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white transition hover:border-purple-400/40 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ← Previous
        </button>

        <button
          type="button"
          disabled={feedbackPage >= feedbackPagination.totalPages}
          onClick={() => setFeedbackPage((page) => page + 1)}
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
      {themes.map((theme) => (
  <button
    key={theme.id}
    type="button"
    onClick={() => loadThemeFeedback(theme.id)}
    className="w-full rounded-2xl border border-white/10 bg-black/20 p-5 text-left transition hover:border-purple-400/30 hover:bg-white/[0.03]"
  >
    <div className="flex items-center justify-between gap-4">
      <div>
        <h3 className="text-lg font-semibold text-white">
          {theme.name}
        </h3>

        <p className="mt-2 text-sm leading-6 text-white/50">
          {theme.description || "No description available."}
        </p>
      </div>

      <span className="shrink-0 rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1 text-xs text-purple-300">
        Theme
      </span>
    </div>
  </button>
))}
    </div>
  )} 
    
    { selectedTheme ? (
  <div className="mt-6 rounded-2xl border border-purple-400/20 bg-black/20 p-5">

    <div className="mb-4 flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-purple-300">
          Theme Feedback
        </p>

        <h3 className="mt-1 text-lg font-semibold text-white">
          {themes.find((theme) => theme.id === selectedTheme)?.name}
        </h3>
      </div>

      <button
        type="button"
        onClick={() => {
          setSelectedTheme(null);
          setThemeFeedback([]);
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
    ) : themeFeedback.length === 0 ? (
      <p className="text-sm text-white/50">
        No feedback found for this theme.
      </p>
    ) : (
      <div className="space-y-3">
        {themeFeedback.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
          >
            <p className="text-sm leading-6 text-white/80">
              {item.content || "No feedback text available."}
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

              <span className="text-white/40">
                {new Date(item.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
) : null }
  
</section>
    </main>
  );
}

/* ================= COMPONENTS ================= */

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
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition duration-300 ${
        active
          ? "bg-white/[0.07] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
          : "text-white/35 hover:bg-white/[0.04] hover:text-white/70"
      }`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-lg ${
          active
            ? "bg-gradient-to-br from-violet-500/30 to-cyan-400/20 text-violet-200"
            : "bg-white/[0.025] text-white/30 group-hover:text-white/60"
        }`}
      >
        {icon}
      </span>

      <span>{label}</span>

      {active && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.8)]" />
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
    cyan: "border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-200/70",
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
    violet: "from-violet-500 to-fuchsia-400",
    cyan: "from-violet-500 to-cyan-300",
    emerald: "from-cyan-400 to-emerald-300",
  };

  return (
    <div>
      <div className="mb-2 flex justify-between text-[10px]">
        <span className="text-white/35">{label}</span>
        <span className="text-white/55">{value}</span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradients[color]} shadow-[0_0_10px_rgba(139,92,246,0.25)]`}
          style={{ width }}
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
  color: "violet" | "cyan" | "fuchsia" | "emerald";
}) {
  const colors = {
    violet: "text-violet-300 bg-violet-400/[0.08]",
    cyan: "text-cyan-300 bg-cyan-400/[0.08]",
    fuchsia: "text-fuchsia-300 bg-fuchsia-400/[0.08]",
    emerald: "text-emerald-300 bg-emerald-400/[0.08]",
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

      <div className="mt-2 text-[10px] text-emerald-300">{trend}</div>
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
    <button className="group flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-black/10 p-4 text-left transition hover:border-amber-300/15 hover:bg-amber-300/[0.03]">
      <span className="text-[9px] text-amber-300/50">{number}</span>

      <span className="flex-1 text-xs text-white/45 group-hover:text-white/70">
        {title}
      </span>

      <span className="text-white/20 transition group-hover:translate-x-1 group-hover:text-amber-200">
        →
      </span>
    </button>
  );
}