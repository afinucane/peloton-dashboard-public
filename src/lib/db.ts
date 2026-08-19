// src/lib/db.ts
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dbPath =
  process.env.RIDES_DB_PATH || path.join(process.cwd(), "data", "rides.db");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Peloton export: "Workout Timestamp" is unique per workout in your file
    workout_timestamp TEXT NOT NULL UNIQUE,

    live_on_demand TEXT,
    instructor_name TEXT,
    length_minutes REAL NOT NULL,
    fitness_discipline TEXT NOT NULL,
    type TEXT,
    title TEXT NOT NULL,
    class_timestamp TEXT,

    total_output REAL,
    avg_watts REAL,
    avg_resistance REAL,
    avg_cadence_rpm REAL,
    avg_speed_kph REAL,
    distance_km REAL,

    calories_burned REAL NOT NULL,
    avg_heartrate REAL
  );

  CREATE INDEX IF NOT EXISTS idx_workouts_workout_timestamp
    ON workouts(workout_timestamp);

  CREATE INDEX IF NOT EXISTS idx_workouts_avg_watts
    ON workouts(avg_watts);

  CREATE INDEX IF NOT EXISTS idx_workouts_avg_watts
	ON workouts(avg_watts);

  CREATE INDEX IF NOT EXISTS idx_workouts_fitness_discipline
    ON workouts(fitness_discipline);
  CREATE TABLE IF NOT EXISTS body_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_date TEXT NOT NULL UNIQUE,
    weight_kg REAL NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_body_metrics_date
   ON body_metrics(metric_date);
`);