"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
} from "recharts";

import { ReferenceLine } from "recharts";

type Summary = {
  ok: boolean;
  totals: { workouts: number; cycling_workouts: number; minutes: number; calories: number };
  ftp: number | null;
  ftpWkg: number | null;
  weightKg?: number | null;
};

type Weekly = {
  ok: boolean;
  series: Array<{ week: string; minutes: number; calories: number; ftp: number | null }>;
};

type WeeklyZones = {
  ok: boolean;
  ftp: number | null;
  bucketMode?: "week" | "month";
  series: Array<{ label: string; z1: number; z2: number; z3: number; z4: number; z5: number }>;
};

type TopInstructors = {
  ok: boolean;
  rows: Array<{ instructor: string; workouts: number; minutes: number }>;
};

type PowerCurve = {
  ok: boolean;
  series: Array<{ minutes: number; best_avg_watts: number | null }>;
};

type Distribution = {
  ok: boolean;
  ftp: number | null;
  model: "polarized" | "pyramidal" | "threshold-heavy" | "mixed" | "unknown";
  zones_minutes: { z1: number; z2: number; z3: number; z4: number; z5: number; total: number } | null;
  zones_percent: { z1: number; z2: number; z3: number; z4: number; z5: number } | null;
};

type Disciplines = {
  ok: boolean;
  rows: Array<{ discipline: string; workouts: number; minutes: number }>;
};

type Streaks = {
  ok: boolean;
  current_streak: number;
  longest_streak: number;
  active_days: number;
};

type BodyMetrics = {
  ok: boolean;
  latest: { metric_date: string; weight_kg: number } | null;
  rows: Array<{ metric_date: string; weight_kg: number }>;
};

type LoadData = {
  ok: boolean;
  ftp: number | null;
  series: Array<{ date: string; load: number; ctl: number; atl: number; tsb: number }>;
};

type CyclingInstructorInsights = {
  ok: boolean;
  mostRidden: Array<{
    instructor: string;
    workouts: number;
    minutes: number;
    avg_watts: number | null;
    avg_length: number | null;
  }>;
  mostTime: Array<{
    instructor: string;
    workouts: number;
    minutes: number;
    avg_watts: number | null;
    avg_length: number | null;
  }>;
  hardest: Array<{
    instructor: string;
    workouts: number;
    minutes: number;
    avg_watts: number | null;
    avg_length: number | null;
  }>;
  longest: Array<{
    instructor: string;
    workouts: number;
    minutes: number;
    avg_watts: number | null;
    avg_length: number | null;
  }>;
};

type HREfficiency = {
  ok: boolean;
  series: Array<{
    week: string;
    watts_per_bpm: number;
    avg_watts: number;
    avg_hr: number;
  }>;
};

type HRScatter = {
  ok: boolean;
  series: Array<{
    x: number;
    y: number;
    title: string;
    instructor: string;
    minutes: number;
    date: string;
  }>;
};

type PRs = {
  ok: boolean;
  range_prs: Array<{
    label: string;
    value: number | null;
    unit: string;
    date: string | null;
    title: string | null;
    instructor: string | null;
  }>;
  all_time_prs: Array<{
    label: string;
    value: number | null;
    unit: string;
    date: string | null;
    title: string | null;
    instructor: string | null;
  }>;
};

type MonthlySummary = {
  ok: boolean;
  latest: {
    month: string;
    workouts: number;
    minutes: number;
    calories: number;
    active_days: number;
    avg_weekly_minutes: number;
  } | null;
  series: Array<{
    month: string;
    workouts: number;
    minutes: number;
    calories: number;
    active_days: number;
    avg_weekly_minutes: number;
  }>;
};

type RangeKey = "30d" | "12w" | "1y" | "ytd" | "all" | "custom";

const pelotonUsername = process.env.NEXT_PUBLIC_PELOTON_USERNAME;

const tooltipStyle: React.CSSProperties = {
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(15,23,42,0.92)",
  color: "#E5E7EB",
  fontSize: 12,
  padding: "10px 12px",
};

type SinceNewBike = {
  ok: boolean;
  since_date: string;
  workouts: number;
  minutes: number;
  active_days: number;
  avg_weekly_minutes: number;
  ftp: number | null;
  best20: number | null;
};

type InStudioRides = {
  ok: boolean;
  total: number;
  rows: Array<{
    date: string;
    title: string;
    instructor: string | null;
    minutes: number;
    discipline: string;
    type: string | null;
    output: number | null;
    avg_watts: number | null;
    calories: number;
  }>;
};

type DashboardEvent = {
  id: number;
  event_date: string;
  event_type: string;
  title: string;
  description: string | null;
  workout_id: number | null;
  workout_title: string | null;
  workout_instructor: string | null;
  workout_minutes: number | null;
  workout_timestamp: string | null;
  icon: string;
  label: string;
};

type DashboardEventsResponse = {
  ok: boolean;
  total: number;
  rows: DashboardEvent[];
};

type CalibrationData = {
  ok: boolean;
  new_bike: {
    id: number;
    date: string;
    title: string;
  } | null;
};

type MilestoneStatus = {
  ok: boolean;
  current_ride_number: number;
  next_milestone: number;
  rides_remaining: number;
  milestone_completed: boolean;
  milestone_recorded: boolean;
  milestone_event_id: number | null;
  milestone_ride: {
    id: number;
    cycling_ride_number: number;
    workout_timestamp: string;
    instructor: string | null;
    title: string;
    minutes: number;
  } | null;
  display: {
    current: string;
    next: string;
  };
};

const chartYAxisProps: React.ComponentProps<typeof YAxis> = {
  tick: { fill: "rgba(229,231,235,0.6)", fontSize: 11 },
  axisLine: false,
  tickLine: false,
};

const chartXAxisProps: React.ComponentProps<typeof XAxis> = {
  tick: { fill: "rgba(229,231,235,0.6)", fontSize: 11 },
  axisLine: false,
  tickLine: false,
};

const pieColors = ["#6366F1", "#22D3EE", "#10B981", "#A78BFA", "#F59E0B", "#F472B6"];
const zoneColors = {
  z1: "rgba(99,102,241,0.70)",
  z2: "rgba(34,211,238,0.70)",
  z3: "rgba(16,185,129,0.70)",
  z4: "rgba(245,158,11,0.75)",
  z5: "rgba(244,114,182,0.75)",
};

function startOfYearUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1, 0, 0, 0));
}

function toISO(d: Date) {
  return d.toISOString();
}

function rangeToFromTo(
  range: RangeKey,
  customFrom?: string,
  customTo?: string
) {
  const now = new Date();
  const to = new Date(now.getTime());

  if (range === "all") {
    return { from: null as string | null, to: null as string | null };
  }

  if (range === "custom") {
    return {
      from: customFrom
        ? new Date(`${customFrom}T00:00:00Z`).toISOString()
        : null,
      to: customTo
        ? new Date(
            new Date(`${customTo}T00:00:00Z`).getTime() + 86400000
          ).toISOString()
        : null,
    };
  }

  if (range === "ytd") {
    return { from: toISO(startOfYearUTC(now)), to: toISO(to) };
  }

  const from = new Date(now.getTime());

  if (range === "30d") from.setUTCDate(from.getUTCDate() - 30);
  if (range === "12w") from.setUTCDate(from.getUTCDate() - 84);
  if (range === "1y") from.setUTCDate(from.getUTCDate() - 365);

  return { from: toISO(from), to: toISO(to) };
}

function withRange(
  pathWithQuery: string,
  range: RangeKey,
  customFrom?: string,
  customTo?: string
) {
  const { from, to } = rangeToFromTo(range, customFrom, customTo);

  const u = new URL(pathWithQuery, "http://local");

  u.searchParams.set("range", range);

  if (from) u.searchParams.set("from", from);
  if (to) u.searchParams.set("to", to);

  return u.pathname + u.search;
}

function rangeLabel(range: RangeKey) {
  if (range === "30d") return "Last 30 days";
  if (range === "12w") return "Last 12 weeks";
  if (range === "1y") return "Last year";
  if (range === "ytd") return "YTD";
  if (range === "custom") return "Custom range";
  return "All-time";
}

function getInitialRange(): RangeKey {
  if (typeof window === "undefined") return "1y";

  const urlValue = new URLSearchParams(window.location.search).get("range");
  if (urlValue === "30d" || urlValue === "12w" || urlValue === "1y" || urlValue === "ytd" || urlValue === "all" || urlValue === "custom") {
    localStorage.setItem("rides_range", urlValue);
    return urlValue;
  }

  const stored = localStorage.getItem("rides_range");
  if (
    stored === "30d" ||
    stored === "12w" ||
    stored === "1y" ||
    stored === "ytd" ||
    stored === "all" ||
    stored === "custom"
  ) {
    return stored;
  }

  return "1y";
}

function useViewport() {
  const [width, setWidth] = useState<number>(1200);

  useEffect(() => {
    function onResize() {
      setWidth(window.innerWidth);
    }

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return {
    isMobile: width < 640,
    isTablet: width >= 640 && width < 1024,
  };
}

function monthLabel(dateStr: string) {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-GB", { month: "short" });
}

function getLoadCellColor(load: number) {
  if (load <= 0) return "rgba(255,255,255,0.04)";
  if (load < 10) return "rgba(99,102,241,0.20)";
  if (load < 25) return "rgba(99,102,241,0.35)";
  if (load < 45) return "rgba(99,102,241,0.50)";
  if (load < 70) return "rgba(99,102,241,0.68)";
  return "rgba(99,102,241,0.88)";
}

function getScrollableChartWidth(range: RangeKey) {
  if (range === "30d") return 700;
  if (range === "12w") return 800;
  return 1100;
}

function getHeatmapWidth(range: RangeKey) {
  if (range === "30d") return 700;
  if (range === "12w") return 800;
  return 1100;
}

function aggregateHeatmapSeriesWeekly(series: Array<{ date: string; load: number }>) {
  if (!series.length) return [];

  const buckets = new Map<string, number>();

  for (const item of series) {
    const d = new Date(item.date + "T00:00:00Z");
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const key = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;

    buckets.set(key, (buckets.get(key) || 0) + item.load);
  }

  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, load]) => {
      const [year, week] = key.split("-W");
      const jan4 = new Date(Date.UTC(Number(year), 0, 4));
      const jan4Day = jan4.getUTCDay() || 7;
      const weekStart = new Date(jan4);
      weekStart.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (Number(week) - 1) * 7);
      return {
        date: weekStart.toISOString().slice(0, 10),
        load: Number(load.toFixed(1)),
      };
    });
}

function buildHeatmapColumns(series: Array<{ date: string; load: number }>) {
  if (!series.length) {
    return {
      columns: [] as Array<Array<{ date: string; load: number }>>,
      monthLabels: [] as Array<{ index: number; label: string }>,
    };
  }

  const sorted = [...series].sort((a, b) => (a.date < b.date ? -1 : 1));
  const start = new Date(sorted[0].date + "T00:00:00Z");
  const end = new Date(sorted[sorted.length - 1].date + "T00:00:00Z");

  const map = new Map(sorted.map((d) => [d.date, d.load]));
  const columns: Array<Array<{ date: string; load: number }>> = [];
  const monthLabels: Array<{ index: number; label: string }> = [];

  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));

  let col: Array<{ date: string; load: number }> = [];
  let colIndex = 0;
  let lastMonth = "";

  while (d <= end || col.length % 7 !== 0) {
    const date = d.toISOString().slice(0, 10);
    const currentMonth = date.slice(0, 7);

    if (d <= end && date.endsWith("-01") && currentMonth !== lastMonth) {
      monthLabels.push({ index: colIndex, label: monthLabel(date) });
      lastMonth = currentMonth;
    }

    col.push({ date, load: map.get(date) || 0 });

    if (col.length === 7) {
      columns.push(col);
      col = [];
      colIndex += 1;
    }

    d.setUTCDate(d.getUTCDate() + 1);
  }

  return { columns, monthLabels };
}

function shouldShowCalibrationLine(
  series: Array<{ [key: string]: any }>,
  key: string,
  markerDate: string | null
) {
  if (!series.length || !markerDate) return false;

  const markerTime = new Date(markerDate + "T00:00:00Z").getTime();

  const values = series
    .map((d) => d[key])
    .filter(Boolean)
    .map((v) => {
      if (typeof v !== "string") return NaN;

      // Handle ISO week keys like 2026-W14
      if (/^\d{4}-W\d{2}$/.test(v)) {
        const [yearStr, weekStr] = v.split("-W");
        const year = Number(yearStr);
        const week = Number(weekStr);

        const jan4 = new Date(Date.UTC(year, 0, 4));
        const jan4Day = jan4.getUTCDay() || 7;
        const weekStart = new Date(jan4);
        weekStart.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7);

        return weekStart.getTime();
      }

      // Handle normal YYYY-MM-DD dates
      return new Date(v + "T00:00:00Z").getTime();
    })
    .filter((t) => Number.isFinite(t));

  if (!values.length) return false;

  const min = Math.min(...values);
  const max = Math.max(...values);

  return markerTime >= min && markerTime <= max;
}

function isoWeekKeyFromDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00Z");
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function getLatestLoadPoint(series: Array<{ date: string; load: number; ctl: number; atl: number; tsb: number }>) {
  if (!series.length) return null;
  return series[series.length - 1];
}

function getFitnessTrend(series: Array<{ ctl: number }>) {
  if (series.length < 8) return { label: "Not enough data", tone: "neutral" as const };

  const latest = series[series.length - 1].ctl;
  const weekAgo = series[Math.max(0, series.length - 8)].ctl;
  const diff = latest - weekAgo;

  if (diff >= 3) return { label: "Rising", tone: "positive" as const };
  if (diff <= -3) return { label: "Falling", tone: "negative" as const };
  return { label: "Stable", tone: "neutral" as const };
}

function getFatigueStatus(atl: number | null) {
  if (atl === null) return { label: "Unknown", tone: "neutral" as const };
  if (atl >= 45) return { label: "High", tone: "negative" as const };
  if (atl >= 25) return { label: "Moderate", tone: "neutral" as const };
  return { label: "Low", tone: "positive" as const };
}

function getFormStatus(tsb: number | null) {
  if (tsb === null) return { label: "Unknown", tone: "neutral" as const };
  if (tsb >= 5) return { label: "Fresh", tone: "positive" as const };
  if (tsb <= -10) return { label: "Loaded", tone: "negative" as const };
  return { label: "Balanced", tone: "neutral" as const };
}

function toneColor(tone: "positive" | "negative" | "neutral") {
  if (tone === "positive") return "#10B981";
  if (tone === "negative") return "#F59E0B";
  return "rgba(229,231,235,0.75)";
}

function Heatmap({
  series,
  compact = false,
  dense = false,
  forcedWidth,
}: {
  series: Array<{ date: string; load: number }>;
  compact?: boolean;
  dense?: boolean;
  forcedWidth?: number;
}) {
  const { columns, monthLabels } = useMemo(() => buildHeatmapColumns(series), [series]);

  const cellSize = dense ? 7 : compact ? 9 : 12;
  const gap = dense ? 2 : compact ? 2 : 3;

  if (!columns.length) {
    return <div style={{ color: "rgba(229,231,235,0.65)", fontSize: 13 }}>No load data yet.</div>;
  }

  const naturalWidth = columns.length * (cellSize + gap) + 60;
  const contentWidth = Math.max(forcedWidth ?? 700, naturalWidth);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "auto",
        overflowY: "hidden",
        paddingBottom: 4,
        minWidth: 0,
      }}
    >
      <div style={{ width: contentWidth }}>
        <div style={{ display: "flex", gap, marginBottom: 6, paddingLeft: 24 }}>
          {columns.map((_, index) => {
            const label = monthLabels.find((m) => m.index === index);
            return (
              <div
                key={`month-${index}`}
                style={{
                  width: cellSize,
                  height: 14,
                  fontSize: 10,
                  color: "rgba(229,231,235,0.55)",
                  whiteSpace: "nowrap",
                }}
              >
                {label ? label.label : ""}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap }}>
          <div
            style={{
              display: "grid",
              gridTemplateRows: `repeat(7, ${cellSize}px)`,
              gap,
              width: 20,
              fontSize: 10,
              color: "rgba(229,231,235,0.45)",
              alignItems: "center",
            }}
          >
            <div>Mon</div>
            <div />
            <div>Wed</div>
            <div />
            <div>Fri</div>
            <div />
            <div>Sun</div>
          </div>

          <div style={{ display: "flex", gap }}>
            {columns.map((col, colIndex) => (
              <div
                key={`col-${colIndex}`}
                style={{
                  display: "grid",
                  gridTemplateRows: `repeat(7, ${cellSize}px)`,
                  gap,
                }}
              >
                {col.map((cell) => (
                  <div
                    key={cell.date}
                    title={`${cell.date} · load ${cell.load.toFixed(1)}`}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      borderRadius: 3,
                      background: getLoadCellColor(cell.load),
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { isMobile, isTablet } = useViewport();

  const [range, setRange] = useState<RangeKey>(getInitialRange);
  const [customFrom, setCustomFrom] = useState(() => {
    if (typeof window === "undefined") return "";
    return (
      new URLSearchParams(window.location.search).get("fromDate") ||
      localStorage.getItem("rides_custom_from") ||
      ""
    );
  });

  const [customTo, setCustomTo] = useState(() => {
    if (typeof window === "undefined") return "";
    return (
      new URLSearchParams(window.location.search).get("toDate") ||
      localStorage.getItem("rides_custom_to") ||
      ""
    );
  });
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [weekly, setWeekly] = useState<Weekly | null>(null);
  const [weeklyZones, setWeeklyZones] = useState<WeeklyZones | null>(null);
  const [top, setTop] = useState<TopInstructors | null>(null);
  const [curve, setCurve] = useState<PowerCurve | null>(null);
  const [dist, setDist] = useState<Distribution | null>(null);
  const [disciplines, setDisciplines] = useState<Disciplines | null>(null);
  const [streaks, setStreaks] = useState<Streaks | null>(null);
  const [body, setBody] = useState<BodyMetrics | null>(null);
  const [loadData, setLoadData] = useState<LoadData | null>(null);
  const [cyclingInsights, setCyclingInsights] = useState<CyclingInstructorInsights | null>(null);
  const [hrEfficiency, setHrEfficiency] = useState<HREfficiency | null>(null);
  const [hrScatter, setHrScatter] = useState<HRScatter | null>(null);
  const [status, setStatus] = useState("");
  const [weightDate, setWeightDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [weightKgInput, setWeightKgInput] = useState("");
  const [prs, setPrs] = useState<PRs | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [sinceNewBike, setSinceNewBike] = useState<SinceNewBike | null>(null);
  const [inStudioRides, setInStudioRides] = useState<InStudioRides | null>(null);
  const [dashboardEvents, setDashboardEvents] = useState<DashboardEventsResponse | null>(null);
  const [calibrationData, setCalibrationData] = useState<CalibrationData | null>(null);
  const newBikeDate = calibrationData?.new_bike?.date ?? null;
  const newBikeWeekKey = useMemo(
    () => (newBikeDate ? isoWeekKeyFromDate(newBikeDate) : null),
    [newBikeDate]
  );
  const [milestoneStatus, setMilestoneStatus] =
  useState<MilestoneStatus | null>(null);
  const isLongRange = range === "ytd" || range === "1y" || range === "all";
  const useSingleColumnForZonesHeatmap = isMobile || isTablet || isLongRange;
  const denseHeatmap = range === "all";

async function loadAll() {
  setLoading(true);

const [s, w, wz, t, c, d, di, st, bm, ld, ci, hr, hs, pr, ms, snb, studio, events, calibration, milestones] = await Promise.all([
  fetch(withRange("/api/summary?weightKg=83", range, customFrom, customTo), { cache: "no-store" }).then((r) => r.json()),
  fetch(withRange("/api/trends/weekly", range, customFrom, customTo), { cache: "no-store" }).then((r) => r.json()),
  fetch(withRange("/api/zones/weekly", range, customFrom, customTo), { cache: "no-store" }).then((r) => r.json()),
  fetch(withRange("/api/instructors/top?limit=5", range, customFrom, customTo), { cache: "no-store" }).then((r) => r.json()),
  fetch(withRange("/api/powercurve", range, customFrom, customTo), { cache: "no-store" }).then((r) => r.json()),
  fetch(withRange("/api/distribution", range, customFrom, customTo), { cache: "no-store" }).then((r) => r.json()),
  fetch(withRange("/api/disciplines", range, customFrom, customTo), { cache: "no-store" }).then((r) => r.json()),
  fetch(withRange("/api/streaks", range, customFrom, customTo), { cache: "no-store" }).then((r) => r.json()),
  fetch(withRange("/api/body-metrics", range, customFrom, customTo), { cache: "no-store" }).then((r) => r.json()),
  fetch(withRange("/api/load", range, customFrom, customTo), { cache: "no-store" }).then((r) => r.json()),
  fetch(withRange("/api/instructors/cycling", range, customFrom, customTo), { cache: "no-store" }).then((r) => r.json()),
  fetch(withRange("/api/hr/efficiency", range, customFrom, customTo), { cache: "no-store" }).then((r) => r.json()),
  fetch(withRange("/api/hr/scatter", range, customFrom, customTo), { cache: "no-store" }).then((r) => r.json()),
  fetch(withRange("/api/prs", range, customFrom, customTo), { cache: "no-store" }).then((r) => r.json()),
  fetch(withRange("/api/summary/monthly", range, customFrom, customTo), { cache: "no-store" }).then((r) => r.json()),
  fetch("/api/summary/since-new-bike", { cache: "no-store" }).then((r) => r.json()),
  fetch(withRange("/api/rides/in-studio", range, customFrom, customTo), { cache: "no-store" }).then((r) => r.json()),
  fetch("/api/events?limit=5", { cache: "no-store" }).then((r) => r.json()),
  fetch("/api/events/calibration", { cache: "no-store" }).then((r) => r.json()),
  fetch("/api/rides/milestones", { cache: "no-store" }).then((r) => r.json()),
]);

  setSummary(s);
  setWeekly(w);
  setWeeklyZones(wz);
  setTop(t);
  setCurve(c);
  setDist(d);
  setDisciplines(di);
  setStreaks(st);
  setBody(bm);
  setLoadData(ld);
  setCyclingInsights(ci);
  setHrEfficiency(hr);
  setHrScatter(hs);
  setPrs(pr);
  setMonthlySummary(ms);
  setSinceNewBike(snb);
  setInStudioRides(studio);
  setDashboardEvents(events);
  setCalibrationData(calibration);
  setMilestoneStatus(milestones);

  if (bm?.latest?.weight_kg && !weightKgInput) {
    setWeightKgInput(String(bm.latest.weight_kg));
  }

  setLoading(false);
}

useEffect(() => {
  const params = new URLSearchParams(window.location.search);

  params.set("range", range);
  localStorage.setItem("rides_range", range);

  if (range === "custom") {
    if (customFrom) {
      params.set("fromDate", customFrom);
      localStorage.setItem("rides_custom_from", customFrom);
    }

    if (customTo) {
      params.set("toDate", customTo);
      localStorage.setItem("rides_custom_to", customTo);
    }
  } else {
    params.delete("fromDate");
    params.delete("toDate");
  }

  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);

  if (range !== "custom" || (customFrom && customTo)) {
    loadAll();
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [range, customFrom, customTo]);

  async function upload(file: File) {
    setStatus("Uploading CSV…");

    const fd = new FormData();
    fd.append("file", file);

    const r = await fetch("/api/import", { method: "POST", body: fd });
    const result = await r.json();

    if (!result.ok) {
      setStatus("Import failed");
      return;
    }

    setStatus(`Parsed ${result.parsed}, inserted ${result.inserted}`);
    await loadAll();
  }

  async function saveWeight() {
    const weight = Number(weightKgInput);
    if (!weightDate || !Number.isFinite(weight) || weight <= 0) {
      setStatus("Enter a valid weight and date");
      return;
    }

    setStatus("Saving weight…");

    const r = await fetch("/api/body-metrics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        metric_date: weightDate,
        weight_kg: weight,
      }),
    });

    const result = await r.json();

    if (!result.ok) {
      setStatus("Failed to save weight");
      return;
    }

    setStatus("Weight saved");
    await loadAll();
  }

  const minutesSeries = useMemo(() => weekly?.series ?? [], [weekly]);
  const zonesWeeklySeries = useMemo(() => weeklyZones?.series ?? [], [weeklyZones]);
  const powerSeries = useMemo(() => curve?.series ?? [], [curve]);
  const weightSeries = useMemo(() => body?.rows ?? [], [body]);
  const fitnessSeries = useMemo(() => loadData?.series ?? [], [loadData]);
  const hrEfficiencySeries = useMemo(() => hrEfficiency?.series ?? [], [hrEfficiency]);
  const hrScatterSeries = useMemo(() => hrScatter?.series ?? [], [hrScatter]);

  const heatmapSeries = useMemo(() => {
    const base = fitnessSeries.map((d) => ({ date: d.date, load: d.load }));
    return range === "all" ? aggregateHeatmapSeriesWeekly(base) : base;
  }, [fitnessSeries, range]);

  const ftpWkgSeries = useMemo(() => {
    const latestWeight = body?.latest?.weight_kg ?? summary?.weightKg ?? null;
    if (!latestWeight) return [];
    return minutesSeries.map((p) => ({
      week: p.week,
      ftpWkg: p.ftp ? Number((p.ftp / latestWeight).toFixed(2)) : null,
    }));
  }, [minutesSeries, body, summary]);

  const zoneBars = useMemo(() => {
    const z = dist?.zones_percent;
    if (!z) return [];
    return [
      { zone: "Z1", pct: z.z1 },
      { zone: "Z2", pct: z.z2 },
      { zone: "Z3", pct: z.z3 },
      { zone: "Z4", pct: z.z4 },
      { zone: "Z5", pct: z.z5 },
    ];
  }, [dist]);

  const latestLoadPoint = useMemo(() => getLatestLoadPoint(fitnessSeries), [fitnessSeries]);
  const fitnessTrend = useMemo(() => getFitnessTrend(fitnessSeries), [fitnessSeries]);
  const fatigueStatus = useMemo(() => getFatigueStatus(latestLoadPoint?.atl ?? null), [latestLoadPoint]);
  const formStatus = useMemo(() => getFormStatus(latestLoadPoint?.tsb ?? null), [latestLoadPoint]);
  const milestoneProgress = useMemo(() => {
  if (!milestoneStatus || milestoneStatus.current_ride_number <= 0) {
    return 0;
  }

  if (milestoneStatus.milestone_completed) {
    return 100;
  }

  const previousMilestone = milestoneStatus.next_milestone - 100;
  const progress =
    ((milestoneStatus.current_ride_number - previousMilestone) / 100) * 100;

  return Math.max(0, Math.min(100, progress));
}, [milestoneStatus]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0B1220",
        color: "#E5E7EB",
        fontFamily: "system-ui",
      }}
    >
      {loading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: "#6366F1",
            opacity: 0.9,
            zIndex: 50,
          }}
        />
      )}

      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: isMobile ? "20px 14px 32px" : "40px 20px",
        }}
      >
        <header
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            gap: 16,
            alignItems: isMobile ? "stretch" : "flex-end",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 24 : 28, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              Peloton Dashboard
            </h1>
            <div style={{ marginTop: 6, color: "rgba(229,231,235,0.65)", fontSize: 13, lineHeight: 1.4 }}>
              {pelotonUsername ? `@${pelotonUsername} · ` : ""}
              {rangeLabel(range)} · {dist?.model ? `Training model: ${dist.model}` : "Training model: —"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ color: "rgba(229,231,235,0.65)", fontSize: 13, minWidth: isMobile ? "100%" : 0 }}>
              {loading ? "Updating…" : status}
            </span>

            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload(file);
              }}
              style={{ minWidth: isMobile ? "100%" : 0 }}
            />

            <select
              value={range}
              onChange={(e) => setRange(e.target.value as RangeKey)}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#E5E7EB",
                colorScheme: "dark",
                borderRadius: 10,
                padding: "8px 10px",
                outline: "none",
                minWidth: isMobile ? "100%" : 0,
              }}
            >
              <option value="30d">Last 30 days</option>
              <option value="12w">Last 12 weeks</option>
              <option value="1y">Last year</option>
              <option value="ytd">YTD</option>
              <option value="all">All-time</option>
              <option value="custom">Custom range</option>
            </select>
            {range === "custom" && (
              <>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  style={{
                    padding: "8px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "#E5E7EB",
                  }}
                />

                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  style={{
                    padding: "8px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "#E5E7EB",
                  }}
                />
              </>
            )}

            <a
              href="/studio"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#E5E7EB",
                borderRadius: 10,
                padding: "8px 10px",
                textDecoration: "none",
                fontSize: 11,
              }}
            >
              Studio Manager
            </a>

            <button
              onClick={async () => {
                await fetch("/api/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#E5E7EB",
                borderRadius: 10,
                padding: "8px 10px",
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        </header>

        <section
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(5, 1fr)",
            gap: 12,
          }}
        >
          <Card title="Workouts" value={summary ? String(summary.totals.workouts) : "—"} />
          <Card title="Cycling workouts" value={summary ? String(summary.totals.cycling_workouts) : "—"} />
          <Card title="FTP (est.)" value={summary?.ftp ? `${summary.ftp} W` : "—"} />
          <Card title="FTP W/kg" value={summary?.ftpWkg ? String(summary.ftpWkg) : "—"} />
          <Card title="Weight" value={summary?.weightKg ? `${summary.weightKg} kg` : "—"} />
        </section>

        <section
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          <Card title="Month workouts" value={monthlySummary?.latest ? String(monthlySummary.latest.workouts) : "—"} />
          <Card title="Month minutes" value={monthlySummary?.latest ? String(monthlySummary.latest.minutes) : "—"} />
          <Card title="Active days" value={monthlySummary?.latest ? String(monthlySummary.latest.active_days) : "—"} />
          <Card
            title="Avg weekly volume"
            value={monthlySummary?.latest ? `${monthlySummary.latest.avg_weekly_minutes} min` : "—"}
          />
        </section>

        <section
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          <Card
            title="Since new bike · FTP"
            value={sinceNewBike?.ftp ? `${sinceNewBike.ftp} W` : "—"}
          />
          <Card
            title="Since new bike · Best 20m"
            value={sinceNewBike?.best20 ? `${sinceNewBike.best20} W` : "—"}
          />
          <Card
            title="Since new bike · Workouts"
            value={sinceNewBike ? String(sinceNewBike.workouts) : "—"}
          />
          <Card
            title="Since new bike · Avg weekly"
            value={sinceNewBike ? `${sinceNewBike.avg_weekly_minutes} min` : "—"}
          />
        </section>

        <section style={{ marginTop: 12 }}>
          <Panel title="Ride Milestone">
            {milestoneStatus ? (
              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                    gap: 16,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(229,231,235,0.55)",
                      }}
                    >
                      Current ride
                    </div>

                    <div
                      style={{
                        fontSize: 22,
                        marginTop: 5,
                        lineHeight: 1.2,
                      }}
                    >
                      {milestoneStatus.display.current}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(229,231,235,0.55)",
                      }}
                    >
                      Next milestone
                    </div>

                    <div
                      style={{
                        fontSize: 22,
                        marginTop: 5,
                        lineHeight: 1.2,
                      }}
                    >
                      {milestoneStatus.display.next}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(229,231,235,0.55)",
                      }}
                    >
                      Remaining
                    </div>

                    <div
                      style={{
                        fontSize: 22,
                        marginTop: 5,
                        lineHeight: 1.2,
                      }}
                    >
                      {milestoneStatus.rides_remaining}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    height: 7,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${milestoneProgress}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: "rgba(99,102,241,0.85)",
                    }}
                  />
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: milestoneStatus.milestone_completed
                        ? "#34D399"
                        : "rgba(229,231,235,0.6)",
                    }}
                  >
                    {milestoneStatus.milestone_completed
                      ? milestoneStatus.milestone_recorded
                        ? "🎉 Milestone reached and recorded in Training History."
                        : "🎉 Milestone reached!"
                      : milestoneStatus.rides_remaining === 1
                        ? "1 ride to go."
                        : `${milestoneStatus.rides_remaining} rides to go.`}
                  </div>

                  <a
                    href="/events"
                    style={{
                      fontSize: 12,
                      color: "#A5B4FC",
                      textDecoration: "none",
                    }}
                  >
                    Manage milestones →
                  </a>
                </div>
              </div>
            ) : (
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(229,231,235,0.65)",
                }}
              >
                No milestone data yet.
              </div>
            )}
          </Panel>
        </section>

        <section
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          <Card title="Current streak" value={streaks ? `${streaks.current_streak} days` : "—"} />
          <Card title="Longest streak" value={streaks ? `${streaks.longest_streak} days` : "—"} />
          <Card title="Active days" value={streaks ? String(streaks.active_days) : "—"} />
          <LoadCard latestLoadPoint={latestLoadPoint} />
        </section>

        <section
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          <InsightCard
            title="Fitness trend"
            value={fitnessTrend.label}
            subvalue={latestLoadPoint ? `CTL ${latestLoadPoint.ctl}` : "No data"}
            tone={fitnessTrend.tone}
          />
          <InsightCard
            title="Fatigue"
            value={fatigueStatus.label}
            subvalue={latestLoadPoint ? `ATL ${latestLoadPoint.atl}` : "No data"}
            tone={fatigueStatus.tone}
          />
          <InsightCard
            title="Form"
            value={formStatus.label}
            subvalue={latestLoadPoint ? `TSB ${latestLoadPoint.tsb}` : "No data"}
            tone={formStatus.tone}
          />
        </section>

        <section
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          {(prs?.range_prs || []).map((rangePr) => {
            const allTimePr = prs?.all_time_prs?.find((p) => p.label === rangePr.label) || null;

            return (
              <PRComparisonCard
                key={rangePr.label}
                label={rangePr.label}
                rangeName={rangeLabel(range)}
                rangeValue={rangePr.value}
                rangeUnit={rangePr.unit}
                rangeDate={rangePr.date}
                allTimeValue={allTimePr?.value ?? null}
                allTimeUnit={allTimePr?.unit ?? rangePr.unit}
                allTimeDate={allTimePr?.date ?? null}
              />
            );
          })}
        </section>

        <section
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: isMobile || isTablet ? "1fr" : "1.6fr 1fr",
            gap: 14,
          }}
        >
          <Panel title="Weekly training minutes">
            <div style={{ height: isMobile ? 240 : 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={minutesSeries}>
                {shouldShowCalibrationLine(minutesSeries, "week", newBikeDate) && (
                  <ReferenceLine
                    x={newBikeWeekKey ?? undefined}
                    stroke="rgba(244,114,182,0.6)"
                    strokeDasharray="4 4"
                    label={{
                      value: "New bike",
                      position: "top",
                      fill: "#F472B6",
                      fontSize: 11,
                    }}
                  />
                )}
                  <XAxis dataKey="week" hide />
                  <YAxis {...chartYAxisProps} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area dataKey="minutes" type="monotone" stroke="#6366F1" fill="rgba(99,102,241,0.16)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Top instructors">
            <div style={{ display: "grid", gap: 10 }}>
              {(top?.rows || []).map((r, idx) => (
                <div
                  key={r.instructor}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 10px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                      {idx + 1}. {r.instructor}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(229,231,235,0.65)", marginTop: 4 }}>
                      {r.workouts} workouts • {r.minutes} min
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section style={{ marginTop: 18 }}>
          <details
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              borderRadius: 14,
              boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
              backdropFilter: "blur(8px)",
              overflow: "hidden",
            }}
          >
            <summary
              style={{
                padding: 14,
                cursor: "pointer",
                fontSize: 14,
                color: "rgba(229,231,235,0.85)",
                userSelect: "none",
              }}
            >
              Cycling · Instructor Stats
            </summary>

            <div
              style={{
                padding: "0 14px 14px",
                display: "grid",
                gridTemplateColumns:
                  isMobile ? "1fr" : isTablet ? "1fr 1fr" : "1fr 1fr",
                gap: 14,
              }}
            >
              <MiniInstructorList
                title="Most ridden"
                rows={cyclingInsights?.mostRidden || []}
                metric="workouts"
              />

              <MiniInstructorList
                title="Most time with"
                rows={cyclingInsights?.mostTime || []}
                metric="minutes"
              />

              <MiniInstructorList
                title="Hardest"
                rows={cyclingInsights?.hardest || []}
                metric="avg_watts"
              />

              <MiniInstructorList
                title="Longest average ride"
                rows={cyclingInsights?.longest || []}
                metric="avg_length"
              />
            </div>
          </details>
        </section>

        <section style={{ marginTop: 18 }}>
          <Panel title={`In Studio${inStudioRides ? ` · ${inStudioRides.total}` : ""}`}>
            <div style={{ display: "grid", gap: 10 }}>
              {(inStudioRides?.rows || []).length ? (
                (inStudioRides?.rows || []).map((ride) => (
                  <div
                    key={`${ride.date}-${ride.title}`}
                    style={{
                      padding: "10px 10px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div style={{ fontSize: 13, lineHeight: 1.4 }}>{ride.date}</div>

                    <div style={{ fontSize: 13, marginTop: 4 }}>{ride.title}</div>

                    <div style={{ fontSize: 12, color: "rgba(229,231,235,0.65)", marginTop: 4 }}>
                      {ride.minutes} min
                      {ride.instructor ? ` · ${ride.instructor}` : ""}
                    </div>

                    <div style={{ fontSize: 12, color: "rgba(229,231,235,0.55)", marginTop: 4 }}>
                      {ride.output !== null ? `${ride.output} kJ` : "—"}
                      {ride.avg_watts !== null ? ` · ${ride.avg_watts} W avg` : ""}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: "rgba(229,231,235,0.65)", fontSize: 13 }}>
                  No studio rides in this range.
                </div>
              )}
            </div>
          </Panel>
        </section>

        <section style={{ marginTop: 18 }}>
          <Panel title="Training History">
            {(dashboardEvents?.rows || []).length ? (
              <div style={{ display: "grid", gap: 12 }}>
                {(dashboardEvents?.rows || []).map((event) => (
                  <div
                    key={event.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      paddingBottom: 10,
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        lineHeight: 1,
                        marginTop: 2,
                        flexShrink: 0,
                      }}
                    >
                      {event.icon}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          lineHeight: 1.4,
                          color: "#E5E7EB",
                        }}
                      >
                        {event.title}
                      </div>

                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 12,
                          color: "rgba(229,231,235,0.55)",
                        }}
                      >
                        {event.event_date} · {event.label}
                      </div>

                      {event.workout_title && (
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 12,
                            color: "rgba(229,231,235,0.5)",
                          }}
                        >
                          {event.workout_minutes ?? "—"} min · {event.workout_title}
                          {event.workout_instructor
                            ? ` · ${event.workout_instructor}`
                            : ""}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <a
                  href="/events"
                  style={{
                    marginTop: 2,
                    fontSize: 12,
                    color: "#A5B4FC",
                    textDecoration: "none",
                  }}
                >
                  View all →
                </a>
              </div>
            ) : (
              <div
                style={{
                  color: "rgba(229,231,235,0.65)",
                  fontSize: 13,
                }}
              >
                No training history yet.
              </div>
            )}
          </Panel>
        </section>

        <section
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: useSingleColumnForZonesHeatmap ? "1fr" : "1fr 1fr",
            gap: 14,
            minWidth: 0,
          }}
        >
          <Panel title={weeklyZones?.bucketMode === "month" ? "Monthly zone structure" : "Weekly zone structure"}>
            <div
              style={{
                width: "100%",
                maxWidth: "100%",
                overflowX: "auto",
                overflowY: "hidden",
                paddingBottom: 4,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: getScrollableChartWidth(range),
                  height: isMobile ? 240 : isLongRange ? 360 : 320,
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={zonesWeeklySeries}>
                    <XAxis dataKey="label" hide />
                    <YAxis {...chartYAxisProps} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="z1" stackId="a" fill={zoneColors.z1} />
                    <Bar dataKey="z2" stackId="a" fill={zoneColors.z2} />
                    <Bar dataKey="z3" stackId="a" fill={zoneColors.z3} />
                    <Bar dataKey="z4" stackId="a" fill={zoneColors.z4} />
                    <Bar dataKey="z5" stackId="a" fill={zoneColors.z5} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 8,
                fontSize: 11,
                color: "rgba(229,231,235,0.7)",
              }}
            >
              <LegendSwatch color={zoneColors.z1} label="Z1" />
              <LegendSwatch color={zoneColors.z2} label="Z2" />
              <LegendSwatch color={zoneColors.z3} label="Z3" />
              <LegendSwatch color={zoneColors.z4} label="Z4" />
              <LegendSwatch color={zoneColors.z5} label="Z5" />
            </div>
          </Panel>

          <Panel title="Training load heatmap">
            <Heatmap
              series={heatmapSeries}
              compact={isMobile}
              dense={denseHeatmap}
              forcedWidth={getHeatmapWidth(range)}
            />
          </Panel>
        </section>

        <section
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: isMobile || isTablet ? "1fr" : "1fr 1fr",
            gap: 14,
          }}
        >
          <Panel title="FTP trend (estimated)">
            <div style={{ height: isMobile ? 220 : 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={minutesSeries}>
                  {shouldShowCalibrationLine(minutesSeries, "week", newBikeDate) && (
                    <ReferenceLine
                      x={newBikeWeekKey ?? undefined}
                      stroke="rgba(244,114,182,0.6)"
                      strokeDasharray="4 4"
                      label={{
                        value: "New bike",
                        position: "top",
                        fill: "#F472B6",
                        fontSize: 11,
                      }}
                    />
                  )}
                  <XAxis dataKey="week" hide />
                  <YAxis {...chartYAxisProps} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="ftp" stroke="#10B981" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="FTP W/kg trend">
            <div style={{ height: isMobile ? 220 : 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ftpWkgSeries}>
                  {shouldShowCalibrationLine(minutesSeries, "week", newBikeDate) && (
                  <ReferenceLine
                    x={newBikeWeekKey ?? undefined}
                    stroke="rgba(244,114,182,0.6)"
                    strokeDasharray="4 4"
                    label={{
                      value: "New bike",
                      position: "top",
                      fill: "#F472B6",
                      fontSize: 11,
                    }}
                  />
                )}
                  <XAxis dataKey="week" hide />
                  <YAxis {...chartYAxisProps} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="ftpWkg" stroke="#F59E0B" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </section>

        <section
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: isMobile || isTablet ? "1fr" : "1fr 1fr",
            gap: 14,
          }}
        >
          <Panel title="Aerobic efficiency (Watts per BPM)">
            <div style={{ height: isMobile ? 220 : 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hrEfficiencySeries}>
                  {shouldShowCalibrationLine(minutesSeries, "week", newBikeDate) && (
                  <ReferenceLine
                    x={newBikeWeekKey ?? undefined}
                    stroke="rgba(244,114,182,0.6)"
                    strokeDasharray="4 4"
                    label={{
                      value: "New bike",
                      position: "top",
                      fill: "#F472B6",
                      fontSize: 11,
                    }}
                  />
                )}
                  <XAxis dataKey="week" hide />
                  <YAxis {...chartYAxisProps} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number | string | undefined) =>
                      typeof v === "number" ? v.toFixed(3) : String(v ?? "")
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="watts_per_bpm"
                    stroke="#22D3EE"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div
              style={{
                marginTop: 10,
                color: "rgba(229,231,235,0.65)",
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              Higher values suggest better aerobic efficiency — producing more power for the same heart rate.
            </div>
          </Panel>

          <Panel title="Power vs heart rate">
            <div style={{ height: isMobile ? 220 : 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Avg HR"
                    unit=" bpm"
                    {...chartXAxisProps}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Avg Watts"
                    unit=" W"
                    {...chartYAxisProps}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;

                      const point = payload[0]?.payload as
                        | {
                            x: number;
                            y: number;
                            title: string;
                            instructor: string;
                            minutes: number;
                            date: string;
                          }
                        | undefined;

                      if (!point) return null;

                      return (
                        <div style={tooltipStyle}>
                          <div style={{ fontSize: 12, color: "#E5E7EB", marginBottom: 6 }}>
                            {point.title}
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(229,231,235,0.75)" }}>
                            {point.instructor}
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(229,231,235,0.75)", marginTop: 6 }}>
                            Avg HR: {point.x} bpm
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(229,231,235,0.75)" }}>
                            Avg Watts: {point.y} W
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(229,231,235,0.6)" }}>
                            {point.minutes} min
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={hrScatterSeries} fill="#22D3EE" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div
              style={{
                marginTop: 10,
                color: "rgba(229,231,235,0.65)",
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              Each point is a workout. Over time, the relationship should drift upward if you’re producing more watts at a similar heart rate.
            </div>
          </Panel>
        </section>

        <section
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: isMobile || isTablet ? "1fr" : "1fr 1fr",
            gap: 14,
          }}
        >
          <Panel title="Weight trend">
            <div style={{ height: isMobile ? 220 : 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightSeries}>
                  <XAxis dataKey="metric_date" hide />
                  <YAxis {...chartYAxisProps} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="weight_kg" stroke="#F472B6" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Weight entry">
            <div style={{ display: "grid", gap: 10 }}>
              <input type="date" value={weightDate} onChange={(e) => setWeightDate(e.target.value)} style={inputStyle} />
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                placeholder="Weight in kg"
                value={weightKgInput}
                onChange={(e) => setWeightKgInput(e.target.value)}
                style={inputStyle}
              />
              <button onClick={saveWeight} style={buttonStyle}>
                Save weight
              </button>
              <div style={{ fontSize: 12, color: "rgba(229,231,235,0.65)" }}>
                Latest: {body?.latest ? `${body.latest.weight_kg} kg on ${body.latest.metric_date}` : "No weight logged yet"}
              </div>
            </div>
          </Panel>
        </section>

        <section
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: isMobile || isTablet ? "1fr" : "1fr 1fr",
            gap: 14,
          }}
        >
          <Panel title="Training distribution (cycling, %FTP)">
            <div style={{ height: isMobile ? 220 : 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zoneBars}>
                  <XAxis dataKey="zone" {...chartXAxisProps} />
                  <YAxis {...chartYAxisProps} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="pct" fill="rgba(34,211,238,0.75)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: 10, color: "rgba(229,231,235,0.65)", fontSize: 12, lineHeight: 1.4 }}>
              Based on average watts per workout vs estimated FTP.
            </div>
          </Panel>

          <Panel title="Power curve (best sustained avg watts)">
            <div style={{ height: isMobile ? 240 : 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={powerSeries}>
                  <XAxis dataKey="minutes" {...chartXAxisProps} />
                  <YAxis {...chartYAxisProps} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="best_avg_watts" fill="rgba(167,139,250,0.75)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </section>

        <section
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: isMobile || isTablet ? "1fr" : "1fr 1fr",
            gap: 14,
          }}
        >
          <Panel title="Workout discipline mix">
            <div style={{ height: isMobile ? 240 : 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={disciplines?.rows || []}
                    dataKey="minutes"
                    nameKey="discipline"
                    cx="50%"
                    cy="50%"
                    outerRadius={isMobile ? 70 : 100}
                  >
                    {(disciplines?.rows || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: "#E5E7EB" }}
                    labelStyle={{ color: "#E5E7EB" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
              {(disciplines?.rows || []).slice(0, 6).map((row, index) => (
                <div
                  key={row.discipline}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    fontSize: 12,
                    color: "rgba(229,231,235,0.75)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: pieColors[index % pieColors.length],
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.discipline}</span>
                  </div>
                  <span style={{ color: "rgba(229,231,235,0.6)", flexShrink: 0 }}>{row.minutes} min</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Fitness / fatigue">
            <div style={{ height: isMobile ? 240 : 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fitnessSeries}>
                    {shouldShowCalibrationLine(fitnessSeries, "date", newBikeDate) && (
                    <ReferenceLine
                      x={newBikeDate ?? undefined}
                      stroke="rgba(244,114,182,0.6)"
                      strokeDasharray="4 4"
                    />
                  )}
                  <XAxis dataKey="date" hide />
                  <YAxis {...chartYAxisProps} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="ctl" stroke="#10B981" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="atl" stroke="#F59E0B" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="tsb" stroke="#6366F1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: 10, color: "rgba(229,231,235,0.65)", fontSize: 12, lineHeight: 1.4 }}>
              Approximate load model from duration, average watts, and heart rate. Green = fitness, amber = fatigue, indigo = form.
            </div>
          </Panel>
        </section>

        <section style={{ marginTop: 18 }}>
          <Panel title="Yearly training heatmap">
            <Heatmap
              series={heatmapSeries}
              dense={denseHeatmap}
              forcedWidth={getHeatmapWidth(range)}
            />
          </Panel>
        </section>
      </div>
    </main>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 999, background: color }} />
      <span>{label}</span>
    </div>
  );
}

function InsightCard({
  title,
  value,
  subvalue,
  tone,
}: {
  title: string;
  value: string;
  subvalue: string;
  tone: "positive" | "negative" | "neutral";
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 14,
        padding: 14,
        boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
        backdropFilter: "blur(8px)",
        minWidth: 0,
      }}
    >
      <div style={{ color: "rgba(229,231,235,0.75)", fontSize: 12 }}>{title}</div>
      <div
        style={{
          fontSize: 22,
          marginTop: 8,
          letterSpacing: "-0.01em",
          lineHeight: 1.2,
          color: toneColor(tone),
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, marginTop: 6, color: "rgba(229,231,235,0.6)" }}>{subvalue}</div>
    </div>
  );
}

function PRComparisonCard({
  label,
  rangeName,
  rangeValue,
  rangeUnit,
  rangeDate,
  allTimeValue,
  allTimeUnit,
  allTimeDate,
}: {
  label: string;
  rangeName: string;
  rangeValue: number | null;
  rangeUnit: string;
  rangeDate: string | null;
  allTimeValue: number | null;
  allTimeUnit: string;
  allTimeDate: string | null;
}) {
  const matched =
    rangeValue !== null &&
    allTimeValue !== null &&
    rangeUnit === allTimeUnit &&
    rangeValue === allTimeValue;

  const progressPct =
    rangeValue !== null &&
    allTimeValue !== null &&
    allTimeValue > 0 &&
    rangeUnit === allTimeUnit
      ? Math.round((rangeValue / allTimeValue) * 100)
      : null;

  return (
    <div
      style={{
        border: matched ? "1px solid rgba(16,185,129,0.35)" : "1px solid rgba(255,255,255,0.08)",
        background: matched ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.03)",
        borderRadius: 14,
        padding: 14,
        boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
        backdropFilter: "blur(8px)",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ color: "rgba(229,231,235,0.75)", fontSize: 12, minWidth: 0 }}>{label}</div>

        {matched ? (
          <span
            style={{
              fontSize: 11,
              lineHeight: 1,
              padding: "6px 8px",
              borderRadius: 999,
              background: "rgba(16,185,129,0.16)",
              color: "#34D399",
              border: "1px solid rgba(16,185,129,0.28)",
              flexShrink: 0,
            }}
          >
            New PR
          </span>
        ) : null}
      </div>

      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: "rgba(229,231,235,0.55)" }}>{rangeName}</div>
          <div style={{ fontSize: 20, lineHeight: 1.2, marginTop: 4 }}>
            {rangeValue !== null ? `${rangeValue} ${rangeUnit}` : "—"}
          </div>
          <div style={{ fontSize: 12, marginTop: 4, color: "rgba(229,231,235,0.6)" }}>
            {rangeDate || "No record"}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, color: "rgba(229,231,235,0.55)" }}>All-time</div>
          <div style={{ fontSize: 20, lineHeight: 1.2, marginTop: 4 }}>
            {allTimeValue !== null ? `${allTimeValue} ${allTimeUnit}` : "—"}
          </div>
          <div style={{ fontSize: 12, marginTop: 4, color: "rgba(229,231,235,0.6)" }}>
            {allTimeDate || "No record"}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        {matched ? (
          <div style={{ fontSize: 12, color: "#34D399" }}>Matches all-time best</div>
        ) : progressPct !== null ? (
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "rgba(229,231,235,0.65)" }}>
              Progress: {progressPct}% of all-time
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.max(0, Math.min(100, progressPct))}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: "rgba(99,102,241,0.85)",
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "rgba(229,231,235,0.6)" }}>Current range vs all-time</div>
        )}
      </div>
    </div>
  );
}

function LoadCard({
  latestLoadPoint,
}: {
  latestLoadPoint: { ctl: number; atl: number; tsb: number } | null;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 14,
        padding: 14,
        boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
        backdropFilter: "blur(8px)",
        minWidth: 0,
      }}
    >
      <div style={{ color: "rgba(229,231,235,0.75)", fontSize: 12 }}>Current training load</div>
      {latestLoadPoint ? (
        <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
          <div style={{ fontSize: 18, lineHeight: 1.2 }}>CTL {latestLoadPoint.ctl}</div>
          <div style={{ fontSize: 14, color: "rgba(229,231,235,0.7)" }}>ATL {latestLoadPoint.atl}</div>
          <div style={{ fontSize: 14, color: "rgba(229,231,235,0.7)" }}>TSB {latestLoadPoint.tsb}</div>
        </div>
      ) : (
        <div style={{ fontSize: 22, marginTop: 8, letterSpacing: "-0.01em", lineHeight: 1.2 }}>—</div>
      )}
    </div>
  );
}

function MiniInstructorList({
  title,
  rows,
  metric,
}: {
  title: string;
  rows: Array<{
    instructor: string;
    workouts: number;
    minutes: number;
    avg_watts: number | null;
    avg_length: number | null;
  }>;
  metric: "workouts" | "minutes" | "avg_watts" | "avg_length";
}) {
  return (
    <Panel title={title}>
      <div style={{ display: "grid", gap: 10 }}>
        {rows.length ? (
          rows.map((r, idx) => (
            <div
              key={`${title}-${r.instructor}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 10px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.4,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {idx + 1}. {r.instructor}
                </div>
                <div style={{ fontSize: 12, color: "rgba(229,231,235,0.65)", marginTop: 4 }}>
                  {r.workouts} rides • {r.minutes} min
                </div>
              </div>

              <div style={{ fontSize: 12, color: "rgba(229,231,235,0.8)", flexShrink: 0, alignSelf: "center" }}>
                {metric === "workouts" && `${r.workouts}`}
                {metric === "minutes" && `${r.minutes}m`}
                {metric === "avg_watts" && (r.avg_watts ? `${r.avg_watts}W` : "—")}
                {metric === "avg_length" && (r.avg_length ? `${r.avg_length}m` : "—")}
              </div>
            </div>
          ))
        ) : (
          <div style={{ color: "rgba(229,231,235,0.65)", fontSize: 13 }}>No cycling instructor data yet.</div>
        )}
      </div>
    </Panel>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#E5E7EB",
  borderRadius: 10,
  padding: "10px 12px",
  outline: "none",
};

const buttonStyle: React.CSSProperties = {
  background: "#6366F1",
  border: "none",
  color: "white",
  borderRadius: 10,
  padding: "10px 12px",
  cursor: "pointer",
};

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 14,
        padding: 14,
        boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
        backdropFilter: "blur(8px)",
        minWidth: 0,
      }}
    >
      <div style={{ color: "rgba(229,231,235,0.75)", fontSize: 12 }}>{title}</div>
      <div style={{ fontSize: 22, marginTop: 8, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 14,
        padding: 14,
        boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
        backdropFilter: "blur(8px)",
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <div style={{ fontSize: 14, marginBottom: 10, color: "rgba(229,231,235,0.85)" }}>{title}</div>
      {children}
    </div>
  );
}