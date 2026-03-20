-- Habit-level cardio tracking (separate from workout session cardio)
create table cardio_logs (
  id               uuid primary key default gen_random_uuid(),
  date             date not null,
  type             text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  created_at       timestamptz not null default now()
);

create index cardio_logs_date_idx on cardio_logs (date);
