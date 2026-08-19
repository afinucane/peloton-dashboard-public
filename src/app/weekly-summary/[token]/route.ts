import { timingSafeEqual } from "crypto";
import { getWeeklySummary } from "@/lib/weekly-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isValidToken(
  suppliedToken: string,
  expectedToken: string | undefined
): boolean {
  if (!expectedToken) {
    return false;
  }

  const supplied = Buffer.from(suppliedToken);
  const expected = Buffer.from(expectedToken);

  if (supplied.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(supplied, expected);
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayValue(
  value: number | null,
  suffix = ""
): string {
  return value === null
    ? "Not available"
    : `${value}${suffix}`;
}

export async function GET(
  _req: Request,
  context: {
    params: Promise<{ token: string }>;
  }
) {
  const { token } = await context.params;

  if (
    !isValidToken(
      token,
      process.env.WEEKLY_SUMMARY_HTML_TOKEN
    )
  ) {
    return new Response("Not found", {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Robots-Tag":
          "noindex, nofollow, noarchive",
        "Referrer-Policy": "no-referrer",
      },
    });
  }

  const summary = getWeeklySummary();

  const sessionsHtml =
    summary.sessions.last_week.length === 0
      ? "<p>No training sessions were recorded.</p>"
      : summary.sessions.last_week
          .map((session, index) => {
            const classesHtml = session.classes
              .map(
                (ride) => `
                  <tr>
                    <td>
                      ${escapeHtml(ride.title)}
                      ${
                        ride.instructor
                          ? `<br><small>${escapeHtml(
                              ride.instructor
                            )}</small>`
                          : ""
                      }
                    </td>

                    <td>
                      ${escapeHtml(
                        ride.classification
                      )}
                    </td>

                    <td>
                      ${ride.minutes}
                    </td>

                    <td>
                      ${displayValue(
                        ride.avg_watts,
                        " W"
                      )}
                    </td>

                    <td>
                      ${displayValue(
                        ride.avg_heartrate,
                        " bpm"
                      )}
                    </td>
                  </tr>
                `
              )
              .join("");

            return `
              <section class="session">
                <h3>
                  Session ${index + 1}
                  <small>
                    ${escapeHtml(
                      session.started_at
                    )}
                  </small>
                </h3>

                <div class="session-metrics">
                  <div>
                    <span>Total duration</span>
                    <strong>
                      ${session.total_minutes} min
                    </strong>
                  </div>

                  <div>
                    <span>Training minutes</span>
                    <strong>
                      ${session.substantive_minutes} min
                    </strong>
                  </div>

                  <div>
                    <span>Classes</span>
                    <strong>
                      ${session.class_count}
                    </strong>
                  </div>

                  <div>
                    <span>Average power</span>
                    <strong>
                      ${displayValue(
                        session.avg_watts,
                        " W"
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Best class power</span>
                    <strong>
                      ${displayValue(
                        session.best_avg_watts,
                        " W"
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Average HR</span>
                    <strong>
                      ${displayValue(
                        session.avg_heartrate,
                        " bpm"
                      )}
                    </strong>
                  </div>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Type</th>
                      <th>Minutes</th>
                      <th>Average watts</th>
                      <th>Heart rate</th>
                    </tr>
                  </thead>

                  <tbody>
                    ${classesHtml}
                  </tbody>
                </table>
              </section>
            `;
          })
          .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >

  <meta
    name="robots"
    content="noindex,nofollow,noarchive"
  >

  <meta
    name="referrer"
    content="no-referrer"
  >

  <title>Peloton Weekly Summary</title>

  <style>
    body {
      max-width: 900px;
      margin: 40px auto;
      padding: 0 20px;
      font-family: system-ui, sans-serif;
      line-height: 1.5;
      color: #1f2937;
    }

    h1,
    h2,
    h3 {
      line-height: 1.2;
    }

    .generated {
      color: #6b7280;
    }

    .metrics {
      display: grid;
      grid-template-columns:
        repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin: 24px 0;
    }

    .metric {
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 16px;
    }

    .metric span {
      display: block;
      color: #6b7280;
    }

    .metric strong {
      display: block;
      margin-top: 4px;
      font-size: 1.5rem;
    }

    .session {
      margin: 32px 0;
      padding: 20px;
      border: 1px solid #d1d5db;
      border-radius: 10px;
    }

    .session h3 {
      margin-top: 0;
    }

    .session h3 small {
      display: block;
      margin-top: 4px;
      font-size: 0.8rem;
      font-weight: normal;
      color: #6b7280;
    }

    .session-metrics {
      display: grid;
      grid-template-columns:
        repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin: 16px 0;
    }

    .session-metrics div {
      padding: 10px;
      background: #f9fafb;
      border-radius: 6px;
    }

    .session-metrics span {
      display: block;
      font-size: 0.85rem;
      color: #6b7280;
    }

    .session-metrics strong {
      display: block;
      margin-top: 2px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }

    th,
    td {
      padding: 10px;
      border-bottom: 1px solid #d1d5db;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: #f3f4f6;
    }

    small {
      color: #6b7280;
    }

    pre {
      overflow-x: auto;
      padding: 16px;
      background: #f3f4f6;
      border-radius: 8px;
      font-size: 0.85rem;
    }
  </style>
</head>

<body>
  <main>
    <h1>Peloton Weekly Summary</h1>

    <p class="generated">
      Generated:
      <time
        datetime="${escapeHtml(
          summary.generated_at
        )}"
      >
        ${escapeHtml(summary.generated_at)}
      </time>
    </p>

    <p>
      Reporting period:
      <strong>
        ${escapeHtml(
          summary.periods.last_week.from
        )}
        to
        ${escapeHtml(
          summary.periods.last_week.to
        )}
      </strong>
    </p>

    <p>
      Target:
      approximately
      <strong>
        ${
          summary
            .target_training_sessions_per_week
        }
        training sessions
      </strong>
      per week.
    </p>

    <h2>Last completed week</h2>

    <div class="metrics">
      <div class="metric">
        <span>Training sessions</span>
        <strong>
          ${summary.training_sessions.last_week}
        </strong>
      </div>

      <div class="metric">
        <span>Substantive classes</span>
        <strong>
          ${summary.last_week.substantive_rides}
        </strong>
      </div>

      <div class="metric">
        <span>Cooldown classes</span>
        <strong>
          ${summary.last_week.cooldown_rides}
        </strong>
      </div>

      <div class="metric">
        <span>Training minutes</span>
        <strong>
          ${
            summary.last_week
              .substantive_minutes
          }
        </strong>
      </div>

      <div class="metric">
        <span>Average power</span>
        <strong>
          ${displayValue(
            summary.last_week.avg_watts,
            " W"
          )}
        </strong>
      </div>

      <div class="metric">
        <span>Best average power</span>
        <strong>
          ${displayValue(
            summary.last_week.best_avg_watts,
            " W"
          )}
        </strong>
      </div>

      <div class="metric">
        <span>Estimated FTP</span>
        <strong>
          ${displayValue(
            summary.last_week.ftp_estimate,
            " W"
          )}
        </strong>
      </div>
    </div>

    <h2>Previous completed week</h2>

    <div class="metrics">
      <div class="metric">
        <span>Training sessions</span>
        <strong>
          ${
            summary.training_sessions
              .previous_week
          }
        </strong>
      </div>

      <div class="metric">
        <span>Substantive classes</span>
        <strong>
          ${
            summary.previous_week
              .substantive_rides
          }
        </strong>
      </div>

      <div class="metric">
        <span>Cooldown classes</span>
        <strong>
          ${
            summary.previous_week
              .cooldown_rides
          }
        </strong>
      </div>

      <div class="metric">
        <span>Training minutes</span>
        <strong>
          ${
            summary.previous_week
              .substantive_minutes
          }
        </strong>
      </div>

      <div class="metric">
        <span>Average power</span>
        <strong>
          ${displayValue(
            summary.previous_week.avg_watts,
            " W"
          )}
        </strong>
      </div>

      <div class="metric">
        <span>Best average power</span>
        <strong>
          ${displayValue(
            summary.previous_week
              .best_avg_watts,
            " W"
          )}
        </strong>
      </div>

      <div class="metric">
        <span>Estimated FTP</span>
        <strong>
          ${displayValue(
            summary.previous_week
              .ftp_estimate,
            " W"
          )}
        </strong>
      </div>
    </div>

    <h2>Training sessions from last week</h2>

    ${sessionsHtml}

    <h2>Machine-readable summary</h2>

    <pre>${escapeHtml(
      JSON.stringify(summary, null, 2)
    )}</pre>
  </main>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type":
        "text/html; charset=utf-8",

      "Cache-Control":
        "private, no-store, no-cache, must-revalidate",

      "X-Robots-Tag":
        "noindex, nofollow, noarchive",

      "Referrer-Policy":
        "no-referrer",

      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",

      "X-Content-Type-Options":
        "nosniff",
    },
  });
}