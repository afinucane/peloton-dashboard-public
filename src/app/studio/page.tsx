"use client";

import { useEffect, useMemo, useState } from "react";

type Ride = {
  id: number;
  workout_timestamp: string;
  instructor: string | null;
  title: string;
  minutes: number;
  discipline: string;
  live_on_demand: string | null;
  is_in_studio: boolean;
};

type RidesResponse = {
  ok: boolean;
  total: number;
  rows: Ride[];
};

type RangeKey = "30d" | "12w" | "1y" | "ytd" | "all" | "custom";
type StudioFilter = "all" | "studio" | "unmarked";

function startOfYearUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1, 0, 0, 0));
}

function toISO(d: Date) {
  return d.toISOString();
}

function rangeToFromTo(range: RangeKey, customFrom?: string, customTo?: string) {
  const now = new Date();
  const to = new Date(now.getTime());

  if (range === "all") return { from: null as string | null, to: null as string | null };

  if (range === "custom") {
    return {
      from: customFrom ? new Date(`${customFrom}T00:00:00Z`).toISOString() : null,
      to: customTo
        ? new Date(new Date(`${customTo}T00:00:00Z`).getTime() + 86400000).toISOString()
        : null,
    };
  }

  if (range === "ytd") return { from: toISO(startOfYearUTC(now)), to: toISO(to) };

  const from = new Date(now.getTime());
  if (range === "30d") from.setUTCDate(from.getUTCDate() - 30);
  if (range === "12w") from.setUTCDate(from.getUTCDate() - 84);
  if (range === "1y") from.setUTCDate(from.getUTCDate() - 365);

  return { from: toISO(from), to: toISO(to) };
}

function withRange(path: string, range: RangeKey, customFrom?: string, customTo?: string) {
  const { from, to } = rangeToFromTo(range, customFrom, customTo);
  const u = new URL(path, "http://local");

  u.searchParams.set("range", range);

  if (from) u.searchParams.set("from", from);
  if (to) u.searchParams.set("to", to);

  return u.pathname + u.search;
}

function getInitialRange(): RangeKey {
  if (typeof window === "undefined") return "30d";

  const value = new URLSearchParams(window.location.search).get("range");
  if (value === "30d" || value === "12w" || value === "1y" || value === "ytd" || value === "all" || value === "custom") {
    return value;
  }

  return "30d";
}

export default function StudioPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [range, setRange] = useState<RangeKey>(getInitialRange);
  const [filter, setFilter] = useState<StudioFilter>("all");

  const [customFrom, setCustomFrom] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("fromDate") || "";
  });

  const [customTo, setCustomTo] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("toDate") || "";
  });

  const visibleRides = useMemo(() => {
    if (filter === "studio") return rides.filter((ride) => ride.is_in_studio);
    if (filter === "unmarked") return rides.filter((ride) => !ride.is_in_studio);
    return rides;
  }, [rides, filter]);
  
  const studioCount = rides.filter((r) => r.is_in_studio).length;
  const unmarkedCount = rides.length - studioCount;

  async function loadRides() {
    setLoading(true);
    setStatus("");

    const res = await fetch(withRange("/api/rides", range, customFrom, customTo), { cache: "no-store" });
    const data = (await res.json()) as RidesResponse;

    setRides(data.rows || []);
    setLoading(false);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("range", range);

    if (range === "custom") {
      if (customFrom) params.set("fromDate", customFrom);
      if (customTo) params.set("toDate", customTo);
    } else {
      params.delete("fromDate");
      params.delete("toDate");
    }

    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);

    if (range !== "custom" || (customFrom && customTo)) {
      loadRides();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, customFrom, customTo]);

  async function toggleStudioRide(id: number, isInStudio: boolean) {
    setStatus("Saving…");

    setRides((current) =>
      current.map((ride) => (ride.id === id ? { ...ride, is_in_studio: isInStudio } : ride))
    );

    const res = await fetch("/api/rides/studio", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, is_in_studio: isInStudio }),
    });

    const result = await res.json();

    if (!result.ok) {
      setStatus("Failed to save");
      await loadRides();
      return;
    }

    setStatus("Saved");
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0B1220", color: "#E5E7EB", fontFamily: "system-ui" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-end", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, letterSpacing: "-0.02em", lineHeight: 1.1 }}>Studio Manager</h1>
            <div style={{ marginTop: 6, color: "rgba(229,231,235,0.65)", fontSize: 13, lineHeight: 1.4 }}>
              Mark rides that were taken in person at the studio.
            </div>
          </div>

          <a
            href="/"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "#E5E7EB",
              borderRadius: 10,
              padding: "8px 10px",
              textDecoration: "none",
              fontSize: 13,
            }}
          >
            Back to dashboard
          </a>
        </header>

        <section
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <select value={range} onChange={(e) => setRange(e.target.value as RangeKey)} style={controlStyle}>
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
                style={dateInputStyle}
              />
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={dateInputStyle}
              />
            </>
          )}

          <select value={filter} onChange={(e) => setFilter(e.target.value as StudioFilter)} style={controlStyle}>
            <option value="all">All rides</option>
            <option value="studio">Studio rides only</option>
            <option value="unmarked">Unmarked only</option>
          </select>

          <span style={{ color: "rgba(229,231,235,0.65)", fontSize: 13 }}>
            {loading ? "Loading…" : status || `${visibleRides.length} shown`}
          </span>
        </section>
        
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 12,
            color: "rgba(229,231,235,0.7)",
            fontSize: 13,
          }}
        >
          <span>{rides.length} workouts</span>
          <span>{studioCount} studio</span>
          <span>{unmarkedCount} unmarked</span>
        </div>

        <section
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            borderRadius: 14,
            padding: 14,
            boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
            backdropFilter: "blur(8px)",
            overflowX: "auto",
          }}
        >
          <div style={{ minWidth: 820 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr 180px 100px 120px",
                gap: 12,
                padding: "8px 10px",
                color: "rgba(229,231,235,0.55)",
                fontSize: 12,
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div>Date</div>
              <div>Ride</div>
              <div>Instructor</div>
              <div>Duration</div>
              <div>In Studio</div>
            </div>

            {visibleRides.length ? (
              visibleRides.map((ride) => (
                <div
                  key={ride.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 1fr 180px 100px 120px",
                    gap: 12,
                    alignItems: "center",
                    padding: "12px 10px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div style={{ fontSize: 13, color: "rgba(229,231,235,0.75)" }}>{ride.workout_timestamp.slice(0, 10)}</div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ride.title}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(229,231,235,0.55)", marginTop: 4 }}>
                      {ride.discipline}
                      {ride.live_on_demand ? ` · ${ride.live_on_demand}` : ""}
                    </div>
                  </div>

                  <div style={{ fontSize: 13, color: "rgba(229,231,235,0.75)" }}>{ride.instructor || "—"}</div>
                  <div style={{ fontSize: 13, color: "rgba(229,231,235,0.75)" }}>{ride.minutes} min</div>

                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(229,231,235,0.75)" }}>
                    <input
                      type="checkbox"
                      checked={ride.is_in_studio}
                      onChange={(e) => toggleStudioRide(ride.id, e.target.checked)}
                    />
                    Studio
                  </label>
                </div>
              ))
            ) : (
              <div style={{ padding: 16, color: "rgba(229,231,235,0.65)", fontSize: 13 }}>
                No rides found.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

const controlStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#E5E7EB",
  borderRadius: 10,
  padding: "8px 10px",
  outline: "none",
};

const dateInputStyle: React.CSSProperties = {
  padding: "8px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#E5E7EB",
};