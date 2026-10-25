"use client";

import { useEffect, useState } from "react";
import { getEventType, EVENT_TYPES } from "@/lib/events";
import { formatNumber } from "@/lib/format";
import Link from "next/link";

type EventRow = {
  id: number;
  event_date: string;
  event_type: string;
  title: string;
  description: string | null;
  workout_id: number | null;
  created_at: string;

  workout_title: string | null;
  workout_instructor: string | null;
  workout_minutes: number | null;
  workout_timestamp: string | null;
};

type EventsResponse = {
  ok: boolean;
  total: number;
  rows: EventRow[];
};

type Ride = {
  id: number;
  workout_timestamp: string;
  instructor: string | null;
  title: string;
  minutes: number;
  discipline: string;
  live_on_demand: string | null;
  is_in_studio: boolean;
  cycling_ride_number: number | null;
};

type RidesResponse = {
  ok: boolean;
  rows: Ride[];
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

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const [eventDate, setEventDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const [eventType, setEventType] = useState("milestone");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workoutId, setWorkoutId] = useState("");
  const [milestoneNumber, setMilestoneNumber] = useState("");
  const [milestoneStatus, setMilestoneStatus] = useState("");
  const [findingMilestone, setFindingMilestone] = useState(false);
  const [pendingWorkoutId, setPendingWorkoutId] = useState<number | null>(null);
  const [milestoneStatusData, setMilestoneStatusData] =
  useState<MilestoneStatus | null>(null);

  async function loadEvents() {
    setLoading(true);

    const res = await fetch("/api/events", {
      cache: "no-store",
    });

    const data = (await res.json()) as EventsResponse;

    setEvents(data.rows || []);
    setLoading(false);
  }

  async function loadMilestoneStatus() {
    const res = await fetch("/api/rides/milestones", {
      cache: "no-store",
    });

    const data = (await res.json()) as MilestoneStatus;

    setMilestoneStatusData(data);
  }

async function loadRidesForDate(date: string) {
  if (!date) {
    setRides([]);
    return;
  }

  const from = addDays(date, -1);
  const to = addDays(date, 2);

  const params = new URLSearchParams({
    from,
    to,
  });

  const res = await fetch(`/api/rides?${params.toString()}`, {
    cache: "no-store",
  });

  const data = (await res.json()) as RidesResponse;

  const selectedDate = new Date(`${date}T00:00:00Z`).getTime();

  const sorted = [...(data.rows || [])].sort((a, b) => {
    const aDate = new Date(
      `${a.workout_timestamp.slice(0, 10)}T00:00:00Z`
    ).getTime();

    const bDate = new Date(
      `${b.workout_timestamp.slice(0, 10)}T00:00:00Z`
    ).getTime();

    const aDistance = Math.abs(aDate - selectedDate);
    const bDistance = Math.abs(bDate - selectedDate);

    if (aDistance !== bDistance) {
      return aDistance - bDistance;
    }

    return b.workout_timestamp.localeCompare(a.workout_timestamp);
  });

  setRides(sorted);
}

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadEvents();
      void loadMilestoneStatus();
    }, 0);

    return () => window.clearTimeout(timer);

  }, []);

  useEffect(() => {
    async function updateRides() {
      await loadRidesForDate(eventDate);

      if (!pendingWorkoutId) {
        setWorkoutId("");
      }
    }

    updateRides();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventDate]);

  useEffect(() => {
    if (
      pendingWorkoutId !== null &&
      rides.some((ride) => ride.id === pendingWorkoutId)
    ) {
      const timer = window.setTimeout(() => {
        setWorkoutId(String(pendingWorkoutId));
        setPendingWorkoutId(null);
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [rides, pendingWorkoutId]);

  async function createEvent() {
    if (!eventDate || !eventType || !title.trim()) {
      setStatus("Date, type and title are required");
      return;
    }

    setSaving(true);
    setStatus("Saving…");

    const res = await fetch("/api/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        event_date: eventDate,
        event_type: eventType,
        title: title.trim(),
        description: description.trim() || null,
        workout_id: workoutId ? Number(workoutId) : null,
      }),
    });

    const result = await res.json();

    if (!result.ok) {
      setStatus(result.error || "Failed to save event");
      setSaving(false);
      return;
    }

    setTitle("");
    setDescription("");
    setWorkoutId("");
    setStatus("Event saved");
    setSaving(false);

    await loadEvents();
    await loadMilestoneStatus();
  }

  async function findMilestoneRide(overrideNumber?: number) {
    const rideNumber = overrideNumber ?? Number(milestoneNumber);

    if (!Number.isInteger(rideNumber) || rideNumber <= 0) {
      setMilestoneStatus("Enter a valid ride number");
      return;
    }

    setMilestoneNumber(String(rideNumber));

    setFindingMilestone(true);
    setMilestoneStatus("Finding ride…");

    try {
      const res = await fetch(`/api/rides/by-number/${rideNumber}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data.ok || !data.ride) {
        setMilestoneStatus(
          data.error || `Ride #${formatNumber(rideNumber)} not found`
        );
        return;
      }

      const ride = data.ride as Ride;
      const rideDate = ride.workout_timestamp.slice(0, 10);

      setEventType("milestone");
      setTitle(`Ride #${formatNumber(rideNumber)}`);
      setEventDate(rideDate);

      /*
       * Changing eventDate causes the nearby-workout list to reload.
       * workoutId is set once that list contains the milestone ride.
       */
      setPendingWorkoutId(ride.id);

      setMilestoneStatus(
        `Found Ride #${formatNumber(rideNumber)} · ${ride.title}${
          ride.instructor ? ` · ${ride.instructor}` : ""
        }`
      );
    } catch {
      setMilestoneStatus("Unable to look up ride");
    } finally {
      setFindingMilestone(false);
    }
  }

  async function deleteEvent(id: number) {
    if (!window.confirm("Delete this event?")) return;

    setStatus("Deleting…");

    const res = await fetch(`/api/events?id=${id}`, {
      method: "DELETE",
    });

    const result = await res.json();

    if (!result.ok) {
      setStatus(result.error || "Failed to delete event");
      return;
    }

    setEvents((current) => current.filter((event) => event.id !== id));
    setStatus("Event deleted");

    await loadMilestoneStatus();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0B1220",
        color: "#E5E7EB",
        fontFamily: "system-ui",
      }}
    >
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          padding: "40px 20px",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "flex-end",
            marginBottom: 18,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              Training History
            </h1>

            <div
              style={{
                marginTop: 6,
                color: "rgba(229,231,235,0.65)",
                fontSize: 13,
              }}
            >
              Add milestones and other events to your training history.
            </div>
          </div>

          <Link
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
          </Link>
        </header>

        {milestoneStatusData && (
          <section
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              borderRadius: 14,
              padding: 16,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: "rgba(229,231,235,0.85)",
                marginBottom: 14,
              }}
            >
              Milestone Progress
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(229,231,235,0.5)",
                  }}
                >
                  Current
                </div>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 20,
                  }}
                >
                  {milestoneStatusData.display.current}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(229,231,235,0.5)",
                  }}
                >
                  Next milestone
                </div>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 20,
                  }}
                >
                  {milestoneStatusData.display.next}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(229,231,235,0.5)",
                  }}
                >
                  Remaining
                </div>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 20,
                  }}
                >
                  {milestoneStatusData.rides_remaining}
                </div>
              </div>
            </div>

            {!milestoneStatusData.milestone_completed && (
              <div
                style={{
                  marginTop: 14,
                  fontSize: 12,
                  color: "rgba(229,231,235,0.6)",
                }}
              >
                {milestoneStatusData.rides_remaining === 1
                  ? "1 ride to go."
                  : `${milestoneStatusData.rides_remaining} rides to go.`}
              </div>
            )}

            {milestoneStatusData.milestone_completed &&
              !milestoneStatusData.milestone_recorded && (
                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: "#34D399",
                    }}
                  >
                    🎉 Milestone reached!
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      findMilestoneRide(
                        milestoneStatusData.current_ride_number
                      )
                    }
                    style={{
                      background: "#6366F1",
                      border: "none",
                      color: "white",
                      borderRadius: 10,
                      padding: "8px 12px",
                      cursor: "pointer",
                    }}
                  >
                    Create milestone
                  </button>
                </div>
              )}

            {milestoneStatusData.milestone_completed &&
              milestoneStatusData.milestone_recorded && (
                <div
                  style={{
                    marginTop: 14,
                    fontSize: 12,
                    color: "#34D399",
                  }}
                >
                  ✓ This milestone is already in Training History.
                </div>
              )}
          </section>
        )}

        <section
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            borderRadius: 14,
            padding: 16,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: "rgba(229,231,235,0.85)",
              marginBottom: 6,
            }}
          >
            Quick Milestone
          </div>

          <div
            style={{
              fontSize: 12,
              color: "rgba(229,231,235,0.55)",
              marginBottom: 14,
            }}
          >
            Find a cycling workout by its lifetime ride number.
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <label
              style={{
                ...labelStyle,
                minWidth: 180,
              }}
            >
              Ride number

              <input
                type="number"
                min="1"
                step="1"
                value={milestoneNumber}
                onChange={(e) => {
                  setMilestoneNumber(e.target.value);
                  setMilestoneStatus("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    findMilestoneRide();
                  }
                }}
                placeholder="e.g. 2500"
                style={inputStyle}
              />
            </label>

            <button
              type="button"
              onClick={() => findMilestoneRide()}
              disabled={findingMilestone}
              style={{
                background: "#6366F1",
                border: "none",
                color: "white",
                borderRadius: 10,
                padding: "10px 14px",
                cursor: findingMilestone ? "default" : "pointer",
                opacity: findingMilestone ? 0.6 : 1,
              }}
            >
              {findingMilestone ? "Finding…" : "Find ride"}
            </button>
          </div>

          {milestoneStatus && (
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: "rgba(229,231,235,0.65)",
              }}
            >
              {milestoneStatus}
            </div>
          )}
        </section>

        <section
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            borderRadius: 14,
            padding: 16,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: "rgba(229,231,235,0.85)",
              marginBottom: 14,
            }}
          >
            Add event
          </div>

          <div
            style={{
              display: "grid",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <label style={labelStyle}>
                Date
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                Type
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  style={inputStyle}
                >
                  {Object.entries(EVENT_TYPES).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label style={labelStyle}>
              Title
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 2,500th Ride"
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes"
                rows={3}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </label>

            <label style={labelStyle}>
              Linked workout
              <select
                value={workoutId}
                onChange={(e) => setWorkoutId(e.target.value)}
                style={inputStyle}
              >
                <option value="">None</option>

                {rides.map((ride) => (
                  <option key={ride.id} value={ride.id}>
                    {ride.cycling_ride_number
                      ? `#${formatNumber(ride.cycling_ride_number)} · `
                      : ""}
                    {ride.workout_timestamp.slice(0, 10)} · {ride.minutes} min · {ride.title}
                    {ride.instructor ? ` · ${ride.instructor}` : ""}
                  </option>
                ))}
              </select>
            </label>

            {eventDate && rides.length === 0 && (
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(229,231,235,0.55)",
                }}
              >
                No workouts found around this date.
              </div>
            )}

            <div
              style={{
                fontSize: 11,
                color: "rgba(229,231,235,0.45)",
              }}
            >
              Showing workouts from the day before through the day after the event.
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}
            >
              <button
                type="button"
                onClick={createEvent}
                disabled={saving}
                style={{
                  background: "#6366F1",
                  border: "none",
                  color: "white",
                  borderRadius: 10,
                  padding: "10px 14px",
                  cursor: saving ? "default" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Saving…" : "Add event"}
              </button>

              <span
                style={{
                  fontSize: 12,
                  color: "rgba(229,231,235,0.65)",
                }}
              >
                {status}
              </span>
            </div>
          </div>
        </section>

        <section
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            borderRadius: 14,
            padding: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: "rgba(229,231,235,0.85)",
              }}
            >
              Training history
            </div>

            <div
              style={{
                fontSize: 12,
                color: "rgba(229,231,235,0.55)",
              }}
            >
              {events.length} events
            </div>
          </div>

          {loading ? (
            <div style={emptyStyle}>Loading…</div>
          ) : events.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {events.map((event) => {
                return (
                  <div
                    key={event.id}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 16,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <span>
                            {getEventType(event.event_type).icon}
                          </span>

                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 500,
                            }}
                          >
                            {event.title}
                          </span>

                          <span
                            style={{
                              fontSize: 11,
                              color: "rgba(229,231,235,0.5)",
                            }}
                          >
                            {getEventType(event.event_type).label}
                          </span>
                        </div>

                        <div
                          style={{
                            marginTop: 5,
                            fontSize: 12,
                            color: "rgba(229,231,235,0.6)",
                          }}
                        >
                          {event.event_date}
                        </div>

                        {event.description && (
                          <div
                            style={{
                              marginTop: 8,
                              fontSize: 13,
                              color: "rgba(229,231,235,0.75)",
                              lineHeight: 1.5,
                            }}
                          >
                            {event.description}
                          </div>
                        )}

                        {event.workout_id !== null && (
                          <div
                            style={{
                              marginTop: 8,
                              fontSize: 12,
                              color: "rgba(229,231,235,0.55)",
                            }}
                          >
                            {event.workout_title
                              ? `${event.workout_minutes ?? "—"} min · ${event.workout_title}${
                                  event.workout_instructor
                                    ? ` · ${event.workout_instructor}`
                                    : ""
                                }`
                              : `Linked workout #${event.workout_id}`}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteEvent(event.id)}
                        style={{
                          alignSelf: "flex-start",
                          background: "transparent",
                          border: "1px solid rgba(255,255,255,0.10)",
                          color: "rgba(229,231,235,0.65)",
                          borderRadius: 8,
                          padding: "6px 8px",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={emptyStyle}>No events yet.</div>
          )}
        </section>
      </div>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 12,
  color: "rgba(229,231,235,0.7)",
};

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#E5E7EB",
  borderRadius: 10,
  padding: "10px 12px",
  outline: "none",
};

const emptyStyle: React.CSSProperties = {
  padding: 12,
  fontSize: 13,
  color: "rgba(229,231,235,0.6)",
};