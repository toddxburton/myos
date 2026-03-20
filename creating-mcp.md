# Life OS — MCP Server Plan

> A companion document to CLAUDE.md. This governs the build of a custom remote MCP server
> that connects Poke AI (or any MCP client) to the Life OS Supabase database via natural
> language queries.

---

## What This Is (And What It Isn't)

This is a **custom MCP server** built from scratch — not the Supabase MCP server (which is
a dev tool for managing Supabase itself). This server sits on top of the app's existing
Supabase database and exposes Todd's personal health/life data as callable tools.

```
Poke AI (MCP Client)
      ↕  HTTP (Streamable HTTP transport)
Custom MCP Server  ← this is what we're building
      ↕  Supabase JS Client (service role)
Supabase PostgreSQL  ← existing app database
```

The server supports both **reading** (querying trends, summaries, history) and **writing**
(logging data directly via natural language) and is for personal use only (no multi-user
auth complexity required).

---

## Tech Stack

| Concern | Choice | Reason |
|---|---|---|
| Language | TypeScript | Matches the Next.js app; MCP SDK is TypeScript-native |
| MCP SDK | `@modelcontextprotocol/sdk` | Official SDK |
| Validation | `zod` | Required peer dependency; standard for MCP tool schemas |
| Transport | **Streamable HTTP** | Modern standard (March 2025+); SSE is deprecated |
| Deployment | **Cloudflare Workers** | Todd already uses Cloudflare; near-zero cold starts; free tier generous; one-click deploy path available |
| Database | Supabase JS client (`@supabase/supabase-js`) | Same client already used in the app |
| Auth | Bearer token (API key) | Personal tool; no OAuth needed |
| Runtime | Node.js 22+ (or Cloudflare Workers runtime) | Type stripping support; no build step in dev |

---

## Repository Structure

This MCP server lives as a **separate repository** from the Next.js app — it's its own
deployable unit.

```
life-os-mcp/
├── src/
│   ├── index.ts          # Entry point — creates server, registers tools, starts transport
│   ├── config.ts         # Environment variable validation via Zod
│   ├── supabase.ts       # Supabase client singleton (service role)
│   └── tools/
│       ├── water.ts      # Water intake query tools
│       ├── workouts.ts   # Workout log query tools
│       ├── habits.ts     # Habits & nutrition query tools
│       ├── french.ts     # French practice / SRS stats tools
│       └── mood.ts       # Mood & energy query tools
├── .dev.vars             # Local secrets (git-ignored) — mirrors wrangler.toml secrets
├── wrangler.toml         # Cloudflare Workers config
├── package.json
├── tsconfig.json
└── MCP_SERVER.md         # This file (copy into repo)
```

---

## Environment Variables

```
SUPABASE_URL=             # e.g. https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY= # Service role key (never anon key — this is server-side only)
MCP_API_KEY=              # A secret token Poke AI sends as Bearer auth
```

> **Security note:** The service role key bypasses Row Level Security. This is fine because
> the MCP server is not user-facing — it's a personal backend tool. Never expose the service
> role key to the client-side Next.js app.

---

## Transport Configuration

Use **Streamable HTTP** — the current standard. On Cloudflare Workers this means the server
handles requests at a `/mcp` endpoint.

```
https://life-os-mcp.<account>.workers.dev/mcp
```

SSE (`/sse`) should be kept as a legacy fallback only if Poke AI requires it. Confirm
Poke AI's transport support before wiring up the endpoint.

---

## Tool Design Principles

Each tool follows this pattern:

1. **Narrow scope** — one tool, one action. Don't build a god tool that does everything.
2. **Natural language friendly names** — tool names and descriptions should read like instructions to a human ("log_water_intake", not "waterMutation")
3. **Prefix convention** — `get_` for reads, `log_` / `add_` / `update_` / `delete_` for writes
4. **Zod schemas for all inputs** — dates, filters, quantities — always validated
5. **Return structured JSON** — the LLM will summarize it; return data, not prose
6. **Write tools return confirmation** — on success return `{success: true, message: "...", data: {...}}` so the LLM can confirm back to the user what was recorded
7. **Always include units** — oz, lbs, reps, minutes — in the returned data keys or values
8. **Handle nulls gracefully** — if no data for a date range, return an empty array with a `message` field explaining why, don't throw

---

## Database Schema Reference

The MCP server maps directly to these Supabase tables. Column names and types here are ground truth for all tool implementations.

**Water:** `water_logs` (id, date, oz, logged_at) · `water_goals` (id, daily_goal_oz, effective_from)

**Workouts:** `workout_sessions` (id, date, name?, notes?) → `workout_exercises` (id, session_id, exercise_id, order) → `exercise_sets` (id, workout_exercise_id, set_number, reps?, weight_lbs?) · `exercise_library` (id, name, category?, notes?) · `cardio_entries` (id, session_id, type, duration_minutes, distance_miles?) · `cardio_logs` (id, date, type, duration_minutes) — standalone cardio without a workout session

**Habits:** `habit_overrides` (id, date, habit_key ['workout'|'cardio'|'french'], value bool) · `fruit_logs` (id, date, item_name, servings) · `vegetable_logs` (id, date, item_name, servings) · `vitamin_definitions` (id, name, active) · `vitamin_logs` (id, date, vitamin_id→vitamin_definitions, taken bool) · `habit_goals` (key PK, value, updated_at)

**French:** `flashcards` (id, french, english, pronunciation_note?) · `review_logs` (id, card_id→flashcards, direction ['fr_to_en'|'en_to_fr'], rating ['again'|'hard'|'good'|'easy'], reviewed_at, next_review_at, ease_factor)

**Mood:** `mood_checkins` (id, date, period ['morning'|'evening'], energy_level 1–10, emotion text, intention?, reflection?, gratitude?) · UNIQUE (date, period)

---

## Tools — Full Specification

> **Schema notes for Claude Code:**
> - Habits (workout/cardio/french) are stored in `habit_overrides`, not a habits table
> - `emotion` in `mood_checkins` is a single text field, not an array
> - French practice has no session table — individual card reviews are in `review_logs`
> - Cardio exists in two tables: `cardio_entries` (linked to a workout session) and `cardio_logs` (standalone)
> - Vitamins require a lookup from `vitamin_definitions` to resolve names to IDs for writes
> - `mood_checkins.period` is the field name (not `type` or `check_in_type`)

### Water Module (`tools/water.ts`)

| Tool | Description | Inputs | Returns |
|---|---|---|---|
| `get_water_log` | Daily water totals for a date range, joined with the active goal | `start_date`, `end_date` | Array of `{date, total_oz, goal_oz, entries_count, hit_goal}` |
| `get_water_streak` | Consecutive days the daily goal was hit | none | `{streak_days, last_hit_date, current_goal_oz}` |
| `log_water_intake` | Insert a water_logs entry for today or a given date | `oz`, optional `date` (defaults today) | `{success, message, data: {date, oz_logged, total_oz_today}}` |

> **Implementation note:** Goal for a given date = most recent `water_goals.daily_goal_oz` where `effective_from <= date`.

### Workouts Module (`tools/workouts.ts`)

| Tool | Description | Inputs | Returns |
|---|---|---|---|
| `get_workout_sessions` | Sessions with full exercise/set detail | `start_date`, `end_date` | Array of `{id, date, name, notes, exercises[{name, category, sets[{set_number, reps, weight_lbs}]}]}` |
| `get_exercise_history` | All sets for a named exercise over time | `exercise_name`, `start_date`, `end_date` | Array of `{date, session_id, sets[{set_number, reps, weight_lbs}], max_weight_lbs, total_volume_lbs}` |
| `get_workout_frequency` | Session count and cadence over a period | `start_date`, `end_date` | `{total_sessions, days_per_week_avg, dates[]}` |
| `get_cardio_log` | Cardio entries from both tables over a date range | `start_date`, `end_date` | Array of `{date, type, duration_minutes, distance_miles?, source}` where source is 'session' or 'standalone' |
| `log_workout_session` | Create a session + exercises + sets. Resolves exercise names against `exercise_library`, creates new library entries if not found. | `date`, `optional name`, `exercises[{name, sets[{reps, weight_lbs}]}]`, optional `notes` | `{success, message, data: {session_id, date, exercise_count, set_count}}` |
| `log_cardio` | Insert a standalone cardio_logs entry (no linked workout session) | `type`, `duration_minutes`, optional `distance_miles`, optional `date` (defaults today) | `{success, message, data: {date, type, duration_minutes}}` |

### Habits Module (`tools/habits.ts`)

| Tool | Description | Inputs | Returns |
|---|---|---|---|
| `get_habit_log` | Daily snapshot of all habit data for a date range | `start_date`, `end_date` | Array of `{date, habits{workout, cardio, french}, fruits[{item_name, servings}], vegetables[{item_name, servings}], vitamins[{name, taken}]}` |
| `get_habit_streaks` | Current consecutive-day streak for each of the three habits | none | Array of `{habit_key, current_streak, last_completed}` |
| `get_nutrition_summary` | Aggregated fruit/veggie data for a period | `start_date`, `end_date` | `{avg_fruit_servings_per_day, avg_veggie_servings_per_day, top_fruits[], top_vegetables[]}` |
| `log_habit` | Upsert a habit_overrides row (marks a habit done/undone) | `habit_key` ('workout'\|'cardio'\|'french'), optional `value` (default true), optional `date` | `{success, message, data: {date, habit_key, value}}` |
| `log_fruit` | Insert a fruit_logs entry | `item_name`, optional `servings` (default 1), optional `date` | `{success, message, data: {date, item_name, servings}}` |
| `log_vegetable` | Insert a vegetable_logs entry | `item_name`, optional `servings` (default 1), optional `date` | `{success, message, data: {date, item_name, servings}}` |
| `log_vitamins` | Mark one or more vitamins taken. Resolves names to IDs via vitamin_definitions. Upserts vitamin_logs rows. | `vitamin_names[]`, optional `date` | `{success, message, data: {date, logged[]}}` |
| `get_vitamin_list` | List all active vitamins from vitamin_definitions | none | Array of `{id, name}` — useful for resolving names before logging |

> **Implementation note:** Habits (workout/cardio/french) are derived — check `habit_overrides` for explicit overrides. The app infers workout=true from the presence of a `workout_sessions` row for that date, and cardio=true from `cardio_logs`. `habit_overrides` is used for manual toggles and the `french` habit. For the MCP server, write to `habit_overrides` for all three for simplicity.

### French Practice Module (`tools/french.ts`)

| Tool | Description | Inputs | Returns |
|---|---|---|---|
| `get_french_daily_summary` | Review stats grouped by day | `start_date`, `end_date` | Array of `{date, cards_reviewed, ratings{again, hard, good, easy}, avg_ease_factor}` |
| `get_french_deck_stats` | Overall deck health from flashcards + review_logs | none | `{total_cards, due_now, overdue, retention_rate_pct, avg_ease_factor}` |
| `get_french_streak` | Consecutive days with at least one review logged | none | `{streak_days, last_review_date}` |
| `get_french_card` | Look up a flashcard by French or English text | `query`, optional `direction` ('french'\|'english') | Array of `{id, french, english, pronunciation_note, last_reviewed_at, next_review_at}` |
| `log_card_review` | Insert a review_logs row for a single card review | `card_id`, `direction` ('fr_to_en'\|'en_to_fr'), `rating` ('again'\|'hard'\|'good'\|'easy'), `next_review_at`, `ease_factor` | `{success, message, data: {card_id, rating, next_review_at}}` |

> **Implementation note:** There is no session table for French. A "session" is inferred by grouping `review_logs.reviewed_at` by date. The `log_card_review` tool requires the caller (Poke AI) to compute `next_review_at` and `ease_factor` using SM-2 spacing logic, or the MCP server can implement a helper that calculates these from the current `ease_factor` and the new `rating`.

### Mood & Energy Module (`tools/mood.ts`)

| Tool | Description | Inputs | Returns |
|---|---|---|---|
| `get_mood_log` | Check-in entries for a date range | `start_date`, `end_date`, optional `period` ('morning'\|'evening') | Array of `{date, period, energy_level, emotion, intention, reflection, gratitude}` |
| `get_energy_trend` | Average energy level grouped by day or week | `start_date`, `end_date`, optional `group_by` ('day'\|'week', default 'day') | Array of `{period, avg_energy, check_in_count}` |
| `get_emotion_patterns` | Most frequently logged emotions over a period | `start_date`, `end_date` | Array of `{emotion, count, percentage}` sorted by count desc |
| `log_mood_checkin` | Upsert a mood_checkins row. Uses UNIQUE (date, period) so re-logging overwrites. | `period` ('morning'\|'evening'), `energy_level` (1–10), `emotion`, optional `intention`, optional `reflection`, optional `gratitude`, optional `date` (defaults today) | `{success, message, data: {date, period, energy_level, emotion}}` |

---

## Build Sequence (8 Steps)

Follow these steps in order. Commit after each step.

### Step 1 — Project Scaffold
- Initialize new repo: `life-os-mcp`
- `npm init -y`
- Install deps: `@modelcontextprotocol/sdk`, `zod`, `@supabase/supabase-js`, `@cloudflare/workers-types`
- Install dev deps: `typescript`, `wrangler`
- Create `tsconfig.json` (target ES2022, module Node16)
- Create `wrangler.toml` with Workers name and compatibility date
- Create `.dev.vars` template (git-ignored)
- **Commit:** `chore: project scaffold`

### Step 2 — Config & Supabase Client
- Build `src/config.ts`: Zod schema validating all three env vars at startup
- Build `src/supabase.ts`: Singleton Supabase client using service role key
- Write a quick smoke test query against the database to confirm connection
- **Commit:** `feat: config and supabase client`

### Step 3 — Server Entry Point (No Tools Yet)
- Build `src/index.ts`:
  - Create `McpServer` with name `"life-os"` and version `"1.0.0"`
  - Wire up Streamable HTTP transport on `/mcp`
  - Add bearer token auth middleware checking `MCP_API_KEY`
  - Return 401 for missing/wrong token
  - Start server on `0.0.0.0:8787` locally
- Test with MCP Inspector at `http://localhost:8787/mcp`
- **Commit:** `feat: server entry with auth middleware`

### Step 4 — Water Tools
- Build `src/tools/water.ts`
- Register both tools with the server
- Test via MCP Inspector: "How much water did I drink last week?"
- **Commit:** `feat: water tools`

### Step 5 — Workout Tools
- Build `src/tools/workouts.ts`
- Register tools
- Test: "What exercises did I do this month? What's my bench press history?"
- **Commit:** `feat: workout tools`

### Step 6 — Habits & Mood Tools
- Build `src/tools/habits.ts` and `src/tools/mood.ts`
- Register tools
- Test: "How's my French habit streak? What emotions have I logged most this month?"
- **Commit:** `feat: habits and mood tools`

### Step 7 — French Tools
- Build `src/tools/french.ts`
- Register tools
- Test: "How's my French deck looking? Am I keeping up with reviews?"
- **Commit:** `feat: french practice tools`

### Step 8 — Deploy to Cloudflare Workers
- Set production secrets via Wrangler CLI:
  ```
  npx wrangler secret put SUPABASE_URL
  npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
  npx wrangler secret put MCP_API_KEY
  ```
- Deploy: `npx wrangler deploy`
- Confirm endpoint is live: `curl https://life-os-mcp.<account>.workers.dev/mcp`
- Add server URL to Poke AI MCP config with Bearer token
- End-to-end test: send a natural language message via Poke AI / Apple Messages
- **Commit:** `feat: production deploy`

---

## Connecting Poke AI

Once deployed, Poke AI needs two things to connect:
1. **Server URL:** `https://life-os-mcp.<account>.workers.dev/mcp`
2. **Auth header:** `Authorization: Bearer <MCP_API_KEY>`

Confirm in Poke AI's MCP settings how to pass the auth header (most modern MCP clients
support this in their remote server config). If Poke AI only supports SSE transport, add
a `/sse` endpoint as well alongside `/mcp`.

---

## Testing Checklist

Before calling the build done, test each of the following in a real Poke AI session:

**Read tests**
- [ ] "How much water did I drink this week?"
- [ ] "What's my current workout frequency?"
- [ ] "Show me my bench press history for the last 30 days"
- [ ] "Am I hitting my daily habits consistently?"
- [ ] "How's my French practice streak?"
- [ ] "What's my French deck retention rate?"
- [ ] "How have my energy levels been this week?"
- [ ] "What emotions show up most in my evening check-ins?"
- [ ] "Give me an overview of my week" (multi-tool call)

**Write tests**
- [ ] "Log 20oz of water"
- [ ] "I just finished a workout — bench press 3x8 at 185, squats 3x5 at 225"
- [ ] "Mark my French practice done for today"
- [ ] "Log my morning check-in: energy 7, feeling motivated and calm"
- [ ] "I had an apple and some blueberries this morning"
- [ ] "Log my vitamins for today"

**Confirm the app reflects what Poke AI logged** — open the web app after each write test
to verify the data actually appears correctly.

---

## Future Additions (Post-V1)

- **Cross-module insights** — "Do I feel better on days I work out?" (mood + workout join)
- **Aggregation prompts** — pre-built summary prompt resources (MCP Resources type)
  for weekly and monthly reviews
- **Caching** — KV-backed caching for expensive aggregate queries
- **Smart defaults** — infer today's date automatically so "log 20oz of water" requires
  no date from the user

---

## Key Constraints to Preserve

- Service role key stays server-side only — never in the Next.js app
- One tool, one concern — resist the urge to bundle reads and writes
- Write tools must return confirmation data — so the LLM can tell the user exactly what was logged
- Tool descriptions must be plain English — the LLM reads them to decide which tool to call
- Default dates to today when not provided — reduces friction for quick logging via Poke AI