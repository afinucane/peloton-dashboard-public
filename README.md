# Peloton Dashboard

A self-hosted analytics dashboard for exploring your Peloton workout history.

Peloton Dashboard imports the workout history CSV available from Peloton and turns it into a richer, long-term view of your training: trends, personal records, power analysis, instructor statistics, streaks, studio rides, milestones, training history and more.

The application is designed to run entirely on your own server. Your workout history is stored locally in SQLite, and the dashboard does not require ongoing access to your Peloton account.

## Features

### Training dashboard

The main dashboard provides a high-level view of your Peloton activity, including:

- Total workouts
- Total training minutes
- Calories burned
- Cycling-specific statistics
- Training trends over time
- Weekly activity
- Discipline breakdown
- Training streaks
- Personal records
- Estimated FTP and power analysis
- Milestone progress
- Training History
- Studio ride information

Most training analytics can be filtered using the dashboard's date-range selector.

### Cycling analytics

Additional analysis is available for cycling workouts, including:

- Estimated FTP
- Power curve
- Power distribution
- Average and peak output analysis
- Weekly cycling trends
- Instructor statistics:
  - Most ridden
  - Most time spent with
  - Hardest instructors by average power
  - Longest average rides

Less frequently used instructor statistics are grouped into an expandable **Cycling · Instructor Stats** section to keep the main dashboard focused.

### Ride milestones

Every cycling workout is assigned its lifetime ride number.

For example:

```text
Ride #2,000
Ride #2,400
Ride #2,500
```

Ride numbering is derived from your complete chronological cycling history rather than Peloton's official milestone system. This means arbitrary milestones such as Ride #2,400 can be tracked even if Peloton does not officially recognise them as milestones.

Ride numbers are recalculated automatically whenever a new CSV is imported.

The dashboard tracks progress towards the next 100-ride milestone and displays:

- Current lifetime ride number
- Next milestone
- Number of rides remaining
- Progress through the current 100-ride block

### Training History

Training History provides a manually curated timeline of significant moments in your Peloton history.

Events can include:

- Ride milestones
- Equipment changes
- Studio visits
- Personal training events
- Other significant moments

Events can optionally be linked to a workout in the workout database.

The Quick Milestone tool allows a ride to be found directly from its lifetime ride number. Entering `2000`, for example, finds Ride #2,000 and automatically populates the corresponding date and linked workout.

### Studio Manager

Peloton's CSV export does not identify whether a workout was taken in a Peloton studio.

The built-in Studio Manager provides an interface for manually marking workouts as in-studio rides.

Studio information is stored alongside the workout in the local database and can then be used throughout the dashboard.

Studio Manager includes filtering for:

- All rides
- Studio rides
- Unmarked rides
- Date ranges
- Lifetime workout history

### Weekly Summary

Peloton Dashboard can generate a weekly training summary containing analysis of recent activity and progress.

Weekly summaries include training volume, cycling performance and comparisons with previous training periods.

A token-protected HTML version of the summary can also be generated for viewing without logging into the main dashboard.

### Responsive interface

The interface is designed to work across desktop, tablet and mobile layouts.

---

## Technology

Peloton Dashboard is built with:

- **Next.js**
- **React**
- **TypeScript**
- **Node.js**
- **SQLite**
- **better-sqlite3**
- **Recharts**

The application uses the Next.js App Router and server-side API routes.

Workout data and locally managed metadata are stored in SQLite. By default, the database is:

```text
data/rides.db
```

No external database server is required.

---

## Data source

Peloton Dashboard uses the workout history CSV that can be downloaded from your Peloton account.

The CSV contains workout information including:

- Workout timestamp
- Instructor
- Workout title
- Fitness discipline
- Workout duration
- Calories
- Output
- Average power
- Heart rate information
- Cadence
- Resistance
- Distance
- Speed
- Other workout metrics provided by Peloton

Not every piece of information available on Peloton is included in the CSV.

For this reason, some additional information — such as studio rides and Training History events — is maintained locally by Peloton Dashboard.

Peloton Dashboard does not require your Peloton username or password and does not log into your Peloton account.

---

# Installation

## Requirements

You will need:

- **Node.js 20 or later**
- **npm**
- **Git**

A recent Linux or macOS environment should work.

For a permanent production deployment, a Linux server is recommended.

## 1. Clone the repository

```bash
git clone <repository-url>
cd peloton-dashboard
```

## 2. Install dependencies

```bash
npm install
```

## 3. Create your configuration

Copy the supplied example environment file:

```bash
cp .env.example .env.local
```

Open `.env.local` and configure the application.

At minimum, set a dashboard password and authentication secret:

```dotenv
AUTH_PASSWORD=choose-a-password
AUTH_SECRET=replace-this-with-a-random-secret
```

You can generate a suitable authentication secret with:

```bash
openssl rand -base64 32
```

Paste the generated value into `AUTH_SECRET`.

### Optional Peloton username

If you want your Peloton username displayed in the dashboard header, set:

```dotenv
NEXT_PUBLIC_PELOTON_USERNAME=your_username
```

Do not include the `@`.

If this value is omitted, the dashboard works normally without displaying a username.

### Weekly Summary

The Weekly Summary feature uses two additional tokens:

```dotenv
WEEKLY_SUMMARY_TOKEN=replace-with-a-secret-token
WEEKLY_SUMMARY_HTML_TOKEN=replace-with-a-secret-token
```

Use suitably long, random values for a production installation.

### Database location

By default, Peloton Dashboard uses:

```text
data/rides.db
```

An alternative database location can be configured with:

```dotenv
RIDES_DB_PATH=/absolute/path/to/rides.db
```

Most installations do not need to set this.

---

## 4. Initialise the database

Run:

```bash
npm run db:init
```

This creates the SQLite database and all tables and indexes required by the application.

A new installation will create:

```text
data/rides.db
```

The initial database is empty until you import your Peloton workout history.

The initialisation command is safe to run again: the schema uses `IF NOT EXISTS` when creating tables and indexes.

---

## 5. Start the development server

Run:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

You should be redirected to the login page.

Log in using the `AUTH_PASSWORD` configured in `.env.local`.

You will initially see an empty dashboard.

---

# Importing your Peloton workout history

Download your workout history CSV from Peloton.

Once logged into Peloton Dashboard, use the CSV import functionality to upload the file.

The importer will:

1. Parse the Peloton workout export.
2. Add workouts that are not already present.
3. Preserve locally managed information for existing workouts.
4. Recalculate lifetime cycling ride numbers.
5. Make the imported data immediately available to the dashboard.

After the import completes, refresh the dashboard to view your training history.

## Subsequent imports

Peloton exports contain your historical workout data, so you can periodically download a new CSV and import it to add your latest workouts.

Previously imported workouts are not duplicated.

You do not need to edit the CSV or remove old workouts before importing it.

### Lifetime cycling ride numbers

After every import, Peloton Dashboard recalculates the lifetime ride number of every cycling workout.

For example:

```text
Cycling workout → Ride #2,398
Cycling workout → Ride #2,399
Cycling workout → Ride #2,400
Walk
Stretch
Cycling workout → Ride #2,401
```

Only workouts whose fitness discipline is **Cycling** contribute to the lifetime cycling ride count.

Recalculating the complete sequence rather than simply numbering newly imported rides also means the numbering remains correct if an older workout unexpectedly appears in a later export.

---

# Verifying an import

After importing, check that the dashboard shows the expected workout totals.

If you have the SQLite command-line utility installed, you can also inspect the database directly:

```bash
sqlite3 data/rides.db
```

For example:

```sql
SELECT COUNT(*) FROM workouts;
```

To view your latest cycling rides and their lifetime ride numbers:

```sql
SELECT
  cycling_ride_number,
  workout_timestamp,
  instructor_name,
  title
FROM workouts
WHERE cycling_ride_number IS NOT NULL
ORDER BY cycling_ride_number DESC
LIMIT 10;
```

Exit SQLite with:

```text
.quit
```

---

# Authentication

Peloton Dashboard is password protected.

The password is configured using:

```dotenv
AUTH_PASSWORD=
```

Sessions are signed using:

```dotenv
AUTH_SECRET=
```

Unauthenticated browser requests to protected pages are redirected to `/login`.

Unauthenticated requests to protected API endpoints return:

```text
HTTP 401 Unauthorized
```

Authentication sessions are stored in a signed HTTP-only cookie.

In production, the session cookie is marked `Secure` and should therefore be used with HTTPS.

The token-protected Weekly Summary route is deliberately accessible without a dashboard login when the correct summary token is supplied.

---

# Running in production

Build the production application:

```bash
npm run build
```

Start it with:

```bash
npm start
```

By default, Next.js listens on port `3000`.

For a permanent deployment, it is recommended to:

- Run the application using a service manager such as systemd.
- Bind Next.js to localhost.
- Place nginx or another reverse proxy in front of it.
- Use HTTPS.
- Keep `.env.local` and `data/rides.db` private.

A typical deployment looks like:

```text
Internet
   │
   ▼
HTTPS / reverse proxy
   │
   ▼
Next.js
127.0.0.1:3000
   │
   ▼
SQLite
data/rides.db
```

## Example systemd service

Create:

```text
/etc/systemd/system/peloton-dashboard.service
```

For example:

```ini
[Unit]
Description=Peloton Dashboard
After=network.target

[Service]
Type=simple
User=peloton
WorkingDirectory=/path/to/peloton-dashboard
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Adjust the user, working directory and npm path for your installation.

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable peloton-dashboard
sudo systemctl start peloton-dashboard
```

Check its status:

```bash
sudo systemctl status peloton-dashboard
```

If Node is managed using `nvm`, the `ExecStart` path will normally need to point to the npm executable inside the appropriate nvm Node installation rather than `/usr/bin/npm`.

---

# Reverse proxy

A production installation should normally expose the application through a reverse proxy rather than exposing port `3000` directly to the internet.

A minimal nginx configuration might look similar to:

```nginx
server {
    listen 443 ssl;
    server_name rides.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

TLS certificate configuration will depend on your hosting environment.

Do not expose an unprotected development server directly to the internet.

---

# Updating

Pull the latest version:

```bash
git pull
```

Install any new or changed dependencies:

```bash
npm install
```

Ensure the database schema is present:

```bash
npm run db:init
```

Build the updated application:

```bash
npm run build
```

Then restart it.

For example, with systemd:

```bash
sudo systemctl restart peloton-dashboard
```

---

# Backups

The most important application file to back up is:

```text
data/rides.db
```

Although the original Peloton workouts can be reconstructed by importing the CSV again, the SQLite database also contains information maintained locally by Peloton Dashboard.

This includes data such as:

- Studio ride markings
- Training History events
- Linked event/workout information
- Lifetime cycling ride numbers
- Body metrics
- Other locally maintained metadata

The SQLite database should therefore be included in your normal backup strategy.

When manually copying an active SQLite database, stop the application first or use SQLite's backup functionality to ensure a consistent backup.

Your `.env.local` configuration should also be backed up securely.

---

# Privacy and security

Peloton Dashboard is designed to be self-hosted.

Your imported workout history and locally maintained training information remain in your own SQLite database.

The following files should never be committed to a public Git repository:

```text
.env.local
data/rides.db
data/rides.db-wal
data/rides.db-shm
```

These files are excluded by the supplied `.gitignore`.

Peloton CSV exports may also contain personal workout information and should be handled accordingly.

If you expose Peloton Dashboard over the internet, use HTTPS and a strong `AUTH_PASSWORD` and `AUTH_SECRET`.

---

# Project structure

The application is organised roughly as follows:

```text
src/
├── app/
│   ├── api/                 API routes
│   ├── events/              Training History
│   ├── studio/              Studio Manager
│   └── page.tsx             Main dashboard
│
├── lib/
│   ├── auth.ts              Authentication
│   ├── db.ts                Database access
│   ├── events.ts            Event definitions
│   ├── events-server.ts     Server-side event helpers
│   ├── format.ts            Display formatting
│   ├── rides.ts             Cycling ride-number maintenance
│   └── ...                  Analytics and supporting logic
│
└── proxy.ts                 Application authentication gate

scripts/
├── init-db.mjs              Database initialisation
└── schema.sql               Canonical SQLite schema

data/
└── rides.db                 Local SQLite database
```

---

# Database

Peloton Dashboard uses a deliberately simple SQLite database.

The current schema contains three main tables:

### `workouts`

Imported Peloton workout history plus locally maintained workout metadata such as:

- `is_in_studio`
- `cycling_ride_number`

### `events`

Manually curated Training History events, optionally linked to a workout.

### `body_metrics`

Locally stored body metrics used by relevant dashboard analysis.

The canonical schema is stored in:

```text
scripts/schema.sql
```

A fresh database can always be created with:

```bash
npm run db:init
```

---

# Troubleshooting

## Dashboard is empty

A new database contains no workout history.

Import your Peloton workout CSV and refresh the dashboard.

## Login continually returns to the login page

Check that both of these are configured in `.env.local`:

```dotenv
AUTH_PASSWORD=
AUTH_SECRET=
```

Restart the development server after changing environment variables.

For production deployments, rebuild and restart the application.

## Peloton username does not appear

Set:

```dotenv
NEXT_PUBLIC_PELOTON_USERNAME=your_username
```

Because `NEXT_PUBLIC_` variables are embedded into the client application at build time, run:

```bash
npm run build
```

and restart the application after changing this value in production.

## Database cannot be found

Unless `RIDES_DB_PATH` is configured, the application expects:

```text
data/rides.db
```

Run:

```bash
npm run db:init
```

to create a new database.

---

# Disclaimer

Peloton Dashboard is an independent project and is not affiliated with, endorsed by, or sponsored by Peloton Interactive, Inc.

Peloton and related trademarks are the property of their respective owners.

# License

Peloton Dashboard is open-source software licensed under the [MIT License](LICENSE).
