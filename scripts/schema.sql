PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

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
    avg_heartrate REAL,

    is_in_studio INTEGER NOT NULL DEFAULT 0,
    cycling_ride_number INTEGER
);

CREATE INDEX IF NOT EXISTS idx_workouts_timestamp
ON workouts(workout_timestamp);

CREATE INDEX IF NOT EXISTS idx_workouts_discipline
ON workouts(fitness_discipline);

CREATE INDEX IF NOT EXISTS idx_workouts_avg_watts
ON workouts(avg_watts);

CREATE INDEX IF NOT EXISTS idx_workouts_instructor
ON workouts(instructor_name);

CREATE INDEX IF NOT EXISTS idx_workouts_cycling_ride_number
ON workouts(cycling_ride_number);


CREATE TABLE IF NOT EXISTS body_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_date TEXT NOT NULL UNIQUE,
    weight_kg REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_body_metrics_date
ON body_metrics(metric_date);


CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_date TEXT NOT NULL,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    workout_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (workout_id) REFERENCES workouts(id)
);

CREATE INDEX IF NOT EXISTS idx_events_event_date
ON events(event_date);