import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getSupabase } from '../supabase'
import { localToday } from '../date'
import type { Env } from '../config'

export function registerHabitsTools(server: McpServer, env: Env) {
  const db = getSupabase(env)

  // ── get_habit_log ──────────────────────────────────────────
  server.tool(
    'get_habit_log',
    'Get a daily snapshot of all habit data (workout, cardio, french, fruits, vegetables, vitamins) for a date range.',
    {
      start_date: z.string().date().describe('Start date (YYYY-MM-DD, inclusive)'),
      end_date: z.string().date().describe('End date (YYYY-MM-DD, inclusive)'),
    },
    async ({ start_date, end_date }) => {
      const [
        { data: overrides },
        { data: fruits },
        { data: vegetables },
        { data: vitaminLogs },
        { data: vitamins },
        { data: workoutSessions },
        { data: cardioLogs },
      ] = await Promise.all([
        db.from('habit_overrides').select('date, habit_key, value').gte('date', start_date).lte('date', end_date),
        db.from('fruit_logs').select('date, item_name, servings').gte('date', start_date).lte('date', end_date),
        db.from('vegetable_logs').select('date, item_name, servings').gte('date', start_date).lte('date', end_date),
        db.from('vitamin_logs').select('date, vitamin_id, taken').gte('date', start_date).lte('date', end_date),
        db.from('vitamin_definitions').select('id, name').eq('active', true),
        db.from('workout_sessions').select('date').gte('date', start_date).lte('date', end_date),
        db.from('cardio_logs').select('date').gte('date', start_date).lte('date', end_date),
      ])

      const result = []
      const current = new Date(start_date)
      const end = new Date(end_date)

      while (current <= end) {
        const d = current.toISOString().split('T')[0]

        const dayOverrides: Record<string, boolean> = {}
        for (const o of overrides ?? []) {
          if (o.date === d) dayOverrides[o.habit_key] = o.value
        }

        const hasWorkoutSession = (workoutSessions ?? []).some((s) => s.date === d)
        const hasCardioLog = (cardioLogs ?? []).some((c) => c.date === d)

        const vitaminStatus = (vitamins ?? []).map((v) => {
          const log = (vitaminLogs ?? []).find((vl) => vl.date === d && vl.vitamin_id === v.id)
          return { name: v.name, taken: log?.taken ?? false }
        })

        result.push({
          date: d,
          habits: {
            workout: dayOverrides['workout'] ?? hasWorkoutSession,
            cardio: dayOverrides['cardio'] ?? hasCardioLog,
            french: dayOverrides['french'] ?? false,
          },
          fruits: (fruits ?? []).filter((f) => f.date === d).map((f) => ({ item_name: f.item_name, servings: f.servings })),
          vegetables: (vegetables ?? []).filter((v) => v.date === d).map((v) => ({ item_name: v.item_name, servings: v.servings })),
          vitamins: vitaminStatus,
        })

        current.setDate(current.getDate() + 1)
      }

      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    }
  )

  // ── get_habit_streaks ──────────────────────────────────────
  server.tool(
    'get_habit_streaks',
    'Get the current consecutive-day streak for each of the three tracked habits: workout, cardio, and french.',
    {},
    async () => {
      const today = localToday(env.TIMEZONE)
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      const since = ninetyDaysAgo.toISOString().split('T')[0]

      const [{ data: overrides }, { data: workoutSessions }, { data: cardioLogs }] = await Promise.all([
        db.from('habit_overrides').select('date, habit_key, value').gte('date', since).lte('date', today),
        db.from('workout_sessions').select('date').gte('date', since).lte('date', today),
        db.from('cardio_logs').select('date').gte('date', since).lte('date', today),
      ])

      const workoutDates = new Set((workoutSessions ?? []).map((s) => s.date))
      const cardioDates = new Set((cardioLogs ?? []).map((c) => c.date))

      function isDone(date: string, key: 'workout' | 'cardio' | 'french'): boolean {
        const override = (overrides ?? []).find((o) => o.date === date && o.habit_key === key)
        if (override !== undefined) return override.value
        if (key === 'workout') return workoutDates.has(date)
        if (key === 'cardio') return cardioDates.has(date)
        return false
      }

      function calcStreak(key: 'workout' | 'cardio' | 'french'): { habit_key: string; current_streak: number; last_completed: string | null } {
        let streak = 0
        let last_completed: string | null = null
        const check = new Date(today)
        while (true) {
          const d = check.toISOString().split('T')[0]
          if (isDone(d, key)) {
            streak++
            last_completed = last_completed ?? d
            check.setDate(check.getDate() - 1)
          } else {
            break
          }
        }
        return { habit_key: key, current_streak: streak, last_completed }
      }

      const result = [calcStreak('workout'), calcStreak('cardio'), calcStreak('french')]
      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    }
  )

  // ── get_nutrition_summary ──────────────────────────────────
  server.tool(
    'get_nutrition_summary',
    'Get aggregated fruit and vegetable data for a time period, including averages and most common items.',
    {
      start_date: z.string().date().describe('Start date (YYYY-MM-DD, inclusive)'),
      end_date: z.string().date().describe('End date (YYYY-MM-DD, inclusive)'),
    },
    async ({ start_date, end_date }) => {
      const [{ data: fruits }, { data: vegetables }] = await Promise.all([
        db.from('fruit_logs').select('date, item_name, servings').gte('date', start_date).lte('date', end_date),
        db.from('vegetable_logs').select('date, item_name, servings').gte('date', start_date).lte('date', end_date),
      ])

      const totalDays = Math.max(1, Math.ceil((new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1)

      function summarize(logs: { date: string; item_name: string; servings: number }[]) {
        const byDate: Record<string, number> = {}
        const byItem: Record<string, number> = {}
        for (const l of logs) {
          byDate[l.date] = (byDate[l.date] ?? 0) + Number(l.servings)
          byItem[l.item_name] = (byItem[l.item_name] ?? 0) + Number(l.servings)
        }
        const totalServings = Object.values(byDate).reduce((a, b) => a + b, 0)
        const avg = Math.round((totalServings / totalDays) * 10) / 10
        const top = Object.entries(byItem).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([item_name, servings]) => ({ item_name, servings }))
        return { avg_servings_per_day: avg, top }
      }

      const fruitSummary = summarize(fruits ?? [])
      const vegSummary = summarize(vegetables ?? [])

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            avg_fruit_servings_per_day: fruitSummary.avg_servings_per_day,
            avg_veggie_servings_per_day: vegSummary.avg_servings_per_day,
            top_fruits: fruitSummary.top,
            top_vegetables: vegSummary.top,
          }),
        }],
      }
    }
  )

  // ── log_habit ──────────────────────────────────────────────
  server.tool(
    'log_habit',
    'Mark a habit as done (or undone) for a given date. Upserts the habit_overrides record.',
    {
      habit_key: z.enum(['workout', 'cardio', 'french']).describe('Which habit to mark'),
      value: z.boolean().default(true).describe('True = done, false = not done (default true)'),
      date: z.string().date().optional().describe('Date (YYYY-MM-DD, defaults to today)'),
    },
    async ({ habit_key, value, date }) => {
      const target_date = date ?? localToday(env.TIMEZONE)
      await db.from('habit_overrides').upsert({ date: target_date, habit_key, value }, { onConflict: 'date,habit_key' })
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Marked ${habit_key} as ${value ? 'done' : 'not done'} for ${target_date}.`,
            data: { date: target_date, habit_key, value },
          }),
        }],
      }
    }
  )

  // ── log_fruit ──────────────────────────────────────────────
  server.tool(
    'log_fruit',
    'Log a fruit entry. Defaults to today and 1 serving if not specified.',
    {
      item_name: z.string().describe('Name of the fruit (e.g. "apple", "blueberries")'),
      servings: z.number().positive().default(1).describe('Number of servings (default 1)'),
      date: z.string().date().optional().describe('Date (YYYY-MM-DD, defaults to today)'),
    },
    async ({ item_name, servings, date }) => {
      const target_date = date ?? localToday(env.TIMEZONE)
      await db.from('fruit_logs').insert({ date: target_date, item_name: item_name.trim(), servings })
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Logged ${servings} serving(s) of ${item_name} for ${target_date}.`,
            data: { date: target_date, item_name, servings },
          }),
        }],
      }
    }
  )

  // ── log_vegetable ──────────────────────────────────────────
  server.tool(
    'log_vegetable',
    'Log a vegetable entry. Defaults to today and 1 serving if not specified.',
    {
      item_name: z.string().describe('Name of the vegetable (e.g. "broccoli", "spinach")'),
      servings: z.number().positive().default(1).describe('Number of servings (default 1)'),
      date: z.string().date().optional().describe('Date (YYYY-MM-DD, defaults to today)'),
    },
    async ({ item_name, servings, date }) => {
      const target_date = date ?? localToday(env.TIMEZONE)
      await db.from('vegetable_logs').insert({ date: target_date, item_name: item_name.trim(), servings })
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Logged ${servings} serving(s) of ${item_name} for ${target_date}.`,
            data: { date: target_date, item_name, servings },
          }),
        }],
      }
    }
  )

  // ── log_vitamins ───────────────────────────────────────────
  server.tool(
    'log_vitamins',
    'Mark one or more vitamins as taken. Resolves vitamin names against the active vitamin_definitions list.',
    {
      vitamin_names: z.array(z.string()).describe('List of vitamin names to mark as taken (e.g. ["Vitamin D3", "Magnesium"])'),
      date: z.string().date().optional().describe('Date (YYYY-MM-DD, defaults to today)'),
    },
    async ({ vitamin_names, date }) => {
      const target_date = date ?? localToday(env.TIMEZONE)

      const { data: definitions } = await db.from('vitamin_definitions').select('id, name').eq('active', true)
      if (!definitions?.length) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'No active vitamins found in definitions.' }) }] }
      }

      const logged: string[] = []
      const notFound: string[] = []

      for (const name of vitamin_names) {
        const match = definitions.find((d) => d.name.toLowerCase() === name.toLowerCase())
        if (!match) { notFound.push(name); continue }
        await db.from('vitamin_logs').upsert({ date: target_date, vitamin_id: match.id, taken: true }, { onConflict: 'date,vitamin_id' })
        logged.push(match.name)
      }

      const message = logged.length
        ? `Logged vitamins for ${target_date}: ${logged.join(', ')}.${notFound.length ? ` Not found: ${notFound.join(', ')}.` : ''}`
        : `No matching vitamins found. Not found: ${notFound.join(', ')}.`

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: logged.length > 0, message, data: { date: target_date, logged } }),
        }],
      }
    }
  )

  // ── get_vitamin_list ───────────────────────────────────────
  server.tool(
    'get_vitamin_list',
    'List all active vitamins in the user\'s supplement list. Useful for resolving names before logging.',
    {},
    async () => {
      const { data } = await db.from('vitamin_definitions').select('id, name').eq('active', true).order('name')
      return { content: [{ type: 'text', text: JSON.stringify(data ?? []) }] }
    }
  )
}
