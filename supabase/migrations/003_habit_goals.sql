-- Per-habit daily/weekly goal targets
create table habit_goals (
  key        text primary key,
  value      numeric not null,
  updated_at timestamptz not null default now()
);

insert into habit_goals (key, value) values
  ('produce_servings_per_day', 5),
  ('cardio_minutes_per_day',   30);
