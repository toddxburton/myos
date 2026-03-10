# CLAUDE.md — Life OS Dashboard

This is the persistent project context for Claude Code. Read this at the start of every session.

---

## What This App Is

A personal mobile-first dashboard — a "life OS" — for daily tracking across health, fitness, language learning, and wellbeing. The goal is a single place to log and reflect on daily patterns, with a longer-term vision of a custom MCP server on top of the database so the owner can ask Claude natural language questions about trends.

This is a personal app for one user. No auth flows, no multi-tenancy, no social features.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Styling | CSS Modules — no Tailwind, no inline styles |
| Database | Supabase (free tier) |
| Hosting | Cloudflare Pages |
| DNS | Cloudflare |
| Language | TypeScript |

**CSS Modules is a hard requirement.** The owner has a design background and needs full control over every visual decision. Do not introduce Tailwind, styled-components, or any other styling system.

---

## Target Device

**Primary:** iPhone Pro Max (430px viewport width), mobile-first  
**Secondary:** Desktop is acceptable but not the design target

The UI should feel like a native mobile app — bottom navigation, touch-friendly tap targets (minimum 44px), generous spacing, no hover-dependent interactions.

---

## Navigation

**Bottom tab bar — 6 tabs, fixed to bottom, above iOS home indicator:**

| Tab | Route | Icon idea |
|---|---|---|
| Today | `/` | Home / sun |
| Water | `/water` | Droplet |
| Workouts | `/workouts` | Dumbbell |
| Habits | `/habits` | Checkmark / list |
| French | `/french` | Flag / speech bubble |
| Mood | `/mood` | Face / wave |

The bottom nav is a shared layout component (`BottomNav.tsx`) rendered in the root layout. It must respect iOS safe area insets (`padding-bottom: env(safe-area-inset-bottom)`).

---

## Module Scope — V1

### 💧 Water
- Daily oz goal (user-configurable, stored in Supabase)
- Quick-add buttons: +8oz, +16oz, +20oz + custom entry
- Running daily total with progress indicator (arc or bar)
- Daily log resets at midnight
- Historical log stored for trend queries

### 💪 Workouts
- Session-based logging: each workout is a container with a date and optional name
- Personal exercise library — user creates/names exercises, reuses them across sessions
- Strength entries: exercise name, sets, reps, weight (lbs)
- Cardio entries: type (walking, treadmill, Peloton, etc.), duration, distance (optional)
- "Last performance" context shown when adding a lift (what weight/reps last time)
- Full session history stored for trend queries

### ✅ Habits
- **Fruits:** log by item name + serving count (e.g. "apple, 1 serving"). Running daily total + variety list.
- **Vegetables:** same as fruits — item + serving count
- **Vitamins:** fixed daily checklist (items defined by user in settings, not dynamic)
- **Workout done:** boolean, auto-derived from whether a workout was logged today. Manual override allowed.
- **Cardio done:** boolean, auto-derived from whether any cardio was logged in today's workout. Manual override allowed.
- **French done:** boolean, manual only (practice can happen outside the app)

### 🇫🇷 French Practice
- SRS (spaced repetition) flashcard engine
- Cards have: French term, English translation, pronunciation note
- Review flow: show front → reveal back → rate: Again / Hard / Good / Easy
- Cards reviewed in both directions (FR→EN and EN→FR)
- Vocabulary imported manually (sourced from Claude tutoring sessions)
- Full review history stored per card for SRS scheduling and trend queries

### 😊 Mood & Energy
- Two daily check-ins: morning and evening
- Each check-in: energy level (1–10 scale), primary emotion (Plutchik's wheel), optional free-text fields
- Morning fields: energy level, emotion, intention for the day
- Evening fields: energy level, emotion, reflection, gratitude
- Both check-ins stored as separate records with timestamps

### 🎯 Goals & Milestones
- **Deferred to V2.** Do not build this module in V1.

---

## What's Intentionally Out of Scope

- **Nutrition / calorie tracking** — handled by MyFitnessPal. Do not build this.
- **Food database integration** — not needed.
- **Authentication** — single user, no login required for V1.
- **Goals & Milestones** — V2.
- **Push notifications** — V2.
- **Apple Health / device sync** — V2.

---

## Folder Structure

```
/app
  /layout.tsx              ← Root layout with BottomNav
  /page.tsx                ← Today screen (index route)
  /water/page.tsx
  /workouts/page.tsx
  /habits/page.tsx
  /french/page.tsx
  /mood/page.tsx

/components
  /layout
    BottomNav.tsx
    BottomNav.module.css
    PageHeader.tsx
    PageHeader.module.css
  /today
    WaterCard.tsx
    WorkoutsCard.tsx
    HabitsCard.tsx
    FrenchCard.tsx
    MoodCard.tsx
    [each card has its own .module.css]
  /ui
    ProgressArc.tsx        ← Reusable arc/ring progress indicator
    QuickAddButton.tsx
    CheckItem.tsx
    EnergySlider.tsx
    FlashCard.tsx

/lib
  /supabase
    client.ts              ← Supabase browser client
    server.ts              ← Supabase server client (for Server Components)
  /hooks
    useToday.ts            ← Fetches all today's data in one pass
    useWater.ts
    useWorkouts.ts
    useHabits.ts
    useFrench.ts
    useMood.ts

/styles
  globals.css              ← Reset, CSS variables, typography scale
  tokens.css               ← Design tokens: colors, spacing, radii, shadows
```

---

## Supabase Schema Overview

All tables include `id`, `created_at`, and `date` (DATE type, local date of the entry — not a timestamp) to make daily aggregation straightforward.

```sql
-- Water
water_logs (id, date, oz, logged_at)
water_goals (id, daily_goal_oz, effective_from)

-- Workouts
workout_sessions (id, date, name, notes)
exercise_library (id, name, category, notes)
workout_exercises (id, session_id, exercise_id, order)
exercise_sets (id, workout_exercise_id, set_number, reps, weight_lbs)
cardio_entries (id, session_id, type, duration_minutes, distance_miles)

-- Habits
fruit_logs (id, date, item_name, servings)
vegetable_logs (id, date, item_name, servings)
vitamin_definitions (id, name, active)       ← user's supplement list
vitamin_logs (id, date, vitamin_id, taken)
habit_overrides (id, date, habit_key, value) ← for manual workout/cardio/french overrides

-- French
flashcards (id, french, english, pronunciation_note, created_at)
review_logs (id, card_id, direction, rating, reviewed_at, next_review_at, ease_factor)

-- Mood
mood_checkins (id, date, period [morning|evening], energy_level, emotion, 
               intention, reflection, gratitude, logged_at)
```

---

## Data Principles

- Every entry is **dated**, not just timestamped. This makes daily roll-ups and trend queries simple.
- **No data is ever deleted** — use soft deletes or archive flags if needed.
- Keep data **flat and queryable** — avoid JSON blobs. Every field the MCP server might need to query should be its own column.
- The schema is designed so future natural language queries like "how has my energy trended on days I worked out?" can be answered with straightforward SQL joins.

---

## Today Screen — Card Specs

The Today screen (`/`) shows a summary card for each module. Each card is tappable and navigates to that module's tab.

**WaterCard:** Progress arc + today's oz / goal. Quick-add buttons (+8, +16, +20oz).

**WorkoutsCard:**
- Empty state: "No workout logged today" + "Log Workout" button
- Active state: Session name, exercise count, cardio summary

**HabitsCard:** Compact list of all habits with status indicators. Overall completion count (e.g. "4 of 6").

**FrenchCard:**
- Empty state: "No practice today" + "Start Review" button
- Active state: Cards reviewed today, rating breakdown

**MoodCard:**
- Neither done: "Log morning check-in" CTA
- Morning done only: Energy level shown + "Log evening check-in" CTA
- Both done: Morning + evening energy levels + primary emotions

---

## Development Sequence

Build in this order. Complete each before starting the next.

1. **Project scaffold** — Next.js init, folder structure, `globals.css`, design tokens, `BottomNav`, routing, empty pages
2. **Supabase setup** — client/server clients, schema migration, seed data
3. **Water module** — full UI + read/write
4. **Workouts module** — full UI + read/write (exercise library first, then session logging)
5. **Habits module** — full UI + read/write
6. **French module** — flashcard engine + review flow
7. **Mood module** — check-in forms + history
8. **Today screen** — wire all summary cards to real data

---

## Code Conventions

- **TypeScript strict mode on.** All props and data shapes typed.
- **Server Components by default.** Use `"use client"` only when interactivity requires it.
- One component per file. Co-locate the `.module.css` with its component.
- CSS custom properties for all design tokens — no magic numbers in component stylesheets.
- Fetch data as close to the component that needs it as possible. Avoid prop-drilling data down multiple levels.
- Keep business logic out of components — put it in `/lib/hooks` or `/lib/utils`.
- No `any` types.

---

## Known Decisions & Why

- **CSS Modules over Tailwind:** Full design control. The owner is a designer and will have Figma specs to match precisely.
- **Supabase over Cloudflare D1:** Better DX, Row Level Security, and a richer query interface that will serve the future MCP server well.
- **No auth in V1:** Single-user personal app. Add auth before sharing with anyone else.
- **Goals module deferred:** Keeps V1 scope manageable. The data model can accommodate it in V2 without schema changes.
- **Nutrition deferred to MFP:** API costs for food databases are prohibitive. MFP handles it well already.