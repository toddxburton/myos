-- ============================================================
-- myOS Life Dashboard — Initial Schema
-- Run this in the Supabase SQL editor to create all tables.
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── Water ──────────────────────────────────────────────────

create table water_logs (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  oz          numeric(6,1) not null check (oz > 0),
  logged_at   timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index water_logs_date_idx on water_logs (date);

create table water_goals (
  id              uuid primary key default gen_random_uuid(),
  daily_goal_oz   numeric(6,1) not null check (daily_goal_oz > 0),
  effective_from  date not null default current_date,
  created_at      timestamptz not null default now()
);

-- Seed default water goal (64 oz)
insert into water_goals (daily_goal_oz, effective_from)
values (64, current_date);

-- ── Workouts ───────────────────────────────────────────────

create table workout_sessions (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  name        text,
  notes       text,
  created_at  timestamptz not null default now()
);

create index workout_sessions_date_idx on workout_sessions (date);

create table exercise_library (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  category    text,  -- e.g. 'chest', 'back', 'legs', 'cardio'
  notes       text,
  created_at  timestamptz not null default now()
);

create table workout_exercises (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references workout_sessions (id) on delete cascade,
  exercise_id  uuid not null references exercise_library (id) on delete restrict,
  "order"      integer not null default 0,
  created_at   timestamptz not null default now()
);

create index workout_exercises_session_idx on workout_exercises (session_id);

create table exercise_sets (
  id                    uuid primary key default gen_random_uuid(),
  workout_exercise_id   uuid not null references workout_exercises (id) on delete cascade,
  set_number            integer not null,
  reps                  integer,
  weight_lbs            numeric(6,2),
  created_at            timestamptz not null default now()
);

create index exercise_sets_workout_exercise_idx on exercise_sets (workout_exercise_id);

create table cardio_entries (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references workout_sessions (id) on delete cascade,
  type              text not null,  -- 'walking', 'treadmill', 'peloton', etc.
  duration_minutes  integer not null check (duration_minutes > 0),
  distance_miles    numeric(6,2),
  created_at        timestamptz not null default now()
);

create index cardio_entries_session_idx on cardio_entries (session_id);

-- ── Habits ─────────────────────────────────────────────────

create table fruit_logs (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  item_name   text not null,
  servings    numeric(4,1) not null default 1 check (servings > 0),
  created_at  timestamptz not null default now()
);

create index fruit_logs_date_idx on fruit_logs (date);

create table vegetable_logs (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  item_name   text not null,
  servings    numeric(4,1) not null default 1 check (servings > 0),
  created_at  timestamptz not null default now()
);

create index vegetable_logs_date_idx on vegetable_logs (date);

create table vitamin_definitions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Seed common vitamins (edit to match your actual supplements)
insert into vitamin_definitions (name) values
  ('Vitamin D3'),
  ('Magnesium'),
  ('Omega-3'),
  ('Vitamin C');

create table vitamin_logs (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  vitamin_id  uuid not null references vitamin_definitions (id) on delete cascade,
  taken       boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (date, vitamin_id)
);

create index vitamin_logs_date_idx on vitamin_logs (date);

create table habit_overrides (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  habit_key   text not null,  -- 'workout', 'cardio', 'french'
  value       boolean not null,
  created_at  timestamptz not null default now(),
  unique (date, habit_key)
);

create index habit_overrides_date_idx on habit_overrides (date);

-- ── French ─────────────────────────────────────────────────

create table flashcards (
  id                  uuid primary key default gen_random_uuid(),
  french              text not null,
  english             text not null,
  pronunciation_note  text,
  created_at          timestamptz not null default now()
);

create table review_logs (
  id              uuid primary key default gen_random_uuid(),
  card_id         uuid not null references flashcards (id) on delete cascade,
  direction       text not null check (direction in ('fr_to_en', 'en_to_fr')),
  rating          text not null check (rating in ('again', 'hard', 'good', 'easy')),
  reviewed_at     timestamptz not null default now(),
  next_review_at  timestamptz not null,
  ease_factor     numeric(4,2) not null default 2.5,
  created_at      timestamptz not null default now()
);

create index review_logs_card_idx on review_logs (card_id);
create index review_logs_next_review_idx on review_logs (next_review_at);

-- ── Mood ───────────────────────────────────────────────────

create table mood_checkins (
  id            uuid primary key default gen_random_uuid(),
  date          date not null,
  period        text not null check (period in ('morning', 'evening')),
  energy_level  integer not null check (energy_level between 1 and 10),
  emotion       text not null,
  intention     text,   -- morning only
  reflection    text,   -- evening only
  gratitude     text,   -- evening only
  logged_at     timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  unique (date, period)
);

create index mood_checkins_date_idx on mood_checkins (date);
