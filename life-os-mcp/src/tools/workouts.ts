import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getSupabase } from '../supabase'
import type { Env } from '../config'

export function registerWorkoutTools(server: McpServer, env: Env) {
  const db = getSupabase(env)

  // ── get_workout_sessions ───────────────────────────────────
  server.tool(
    'get_workout_sessions',
    'Get workout sessions with full exercise and set detail for a date range.',
    {
      start_date: z.string().date().describe('Start date (YYYY-MM-DD, inclusive)'),
      end_date: z.string().date().describe('End date (YYYY-MM-DD, inclusive)'),
    },
    async ({ start_date, end_date }) => {
      const { data: sessions } = await db
        .from('workout_sessions')
        .select('id, date, name, notes')
        .gte('date', start_date)
        .lte('date', end_date)
        .order('date')

      if (!sessions?.length) {
        return { content: [{ type: 'text', text: JSON.stringify({ message: 'No workout sessions found for this date range.', data: [] }) }] }
      }

      const sessionIds = sessions.map((s) => s.id)

      const [{ data: workoutExercises }, { data: sets }] = await Promise.all([
        db.from('workout_exercises')
          .select('id, session_id, order, exercise_library(id, name, category)')
          .in('session_id', sessionIds)
          .order('order'),
        db.from('exercise_sets')
          .select('workout_exercise_id, set_number, reps, weight_lbs'),
      ])

      const setsByWeId: Record<string, { set_number: number; reps: number | null; weight_lbs: number | null }[]> = {}
      for (const set of sets ?? []) {
        if (!setsByWeId[set.workout_exercise_id]) setsByWeId[set.workout_exercise_id] = []
        setsByWeId[set.workout_exercise_id].push({ set_number: set.set_number, reps: set.reps, weight_lbs: set.weight_lbs })
      }

      const result = sessions.map((session) => {
        const exercises = (workoutExercises ?? [])
          .filter((we) => we.session_id === session.id)
          .map((we) => {
            const lib = Array.isArray(we.exercise_library) ? we.exercise_library[0] : we.exercise_library
            return {
              name: lib?.name ?? 'Unknown',
              category: lib?.category ?? null,
              sets: (setsByWeId[we.id] ?? []).sort((a, b) => a.set_number - b.set_number),
            }
          })
        return { id: session.id, date: session.date, name: session.name, notes: session.notes, exercises }
      })

      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    }
  )

  // ── get_exercise_history ───────────────────────────────────
  server.tool(
    'get_exercise_history',
    'Get all sets for a specific exercise over time, showing progression.',
    {
      exercise_name: z.string().describe('Exercise name to look up (case-insensitive)'),
      start_date: z.string().date().describe('Start date (YYYY-MM-DD, inclusive)'),
      end_date: z.string().date().describe('End date (YYYY-MM-DD, inclusive)'),
    },
    async ({ exercise_name, start_date, end_date }) => {
      const { data: library } = await db
        .from('exercise_library')
        .select('id, name')
        .ilike('name', `%${exercise_name}%`)

      if (!library?.length) {
        return { content: [{ type: 'text', text: JSON.stringify({ message: `No exercise found matching "${exercise_name}".`, data: [] }) }] }
      }

      const exerciseId = library[0].id

      const { data: sessions } = await db
        .from('workout_sessions')
        .select('id, date')
        .gte('date', start_date)
        .lte('date', end_date)

      const sessionIds = (sessions ?? []).map((s) => s.id)
      if (!sessionIds.length) {
        return { content: [{ type: 'text', text: JSON.stringify({ message: 'No sessions in this date range.', data: [] }) }] }
      }

      const { data: workoutExercises } = await db
        .from('workout_exercises')
        .select('id, session_id')
        .in('session_id', sessionIds)
        .eq('exercise_id', exerciseId)

      if (!workoutExercises?.length) {
        return { content: [{ type: 'text', text: JSON.stringify({ message: `No ${library[0].name} sessions in this date range.`, data: [] }) }] }
      }

      const weIds = workoutExercises.map((we) => we.id)
      const { data: sets } = await db
        .from('exercise_sets')
        .select('workout_exercise_id, set_number, reps, weight_lbs')
        .in('workout_exercise_id', weIds)

      const result = workoutExercises.map((we) => {
        const session = (sessions ?? []).find((s) => s.id === we.session_id)
        const weSets = (sets ?? []).filter((s) => s.workout_exercise_id === we.id)
        const weights = weSets.map((s) => s.weight_lbs ?? 0).filter((w) => w > 0)
        const totalVolume = weSets.reduce((sum, s) => sum + (s.reps ?? 0) * (s.weight_lbs ?? 0), 0)
        return {
          date: session?.date ?? 'unknown',
          session_id: we.session_id,
          sets: weSets.sort((a, b) => a.set_number - b.set_number),
          max_weight_lbs: weights.length ? Math.max(...weights) : null,
          total_volume_lbs: Math.round(totalVolume),
        }
      }).sort((a, b) => a.date.localeCompare(b.date))

      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    }
  )

  // ── get_workout_frequency ──────────────────────────────────
  server.tool(
    'get_workout_frequency',
    'Get workout session count and average frequency over a period.',
    {
      start_date: z.string().date().describe('Start date (YYYY-MM-DD, inclusive)'),
      end_date: z.string().date().describe('End date (YYYY-MM-DD, inclusive)'),
    },
    async ({ start_date, end_date }) => {
      const { data: sessions } = await db
        .from('workout_sessions')
        .select('date')
        .gte('date', start_date)
        .lte('date', end_date)

      const dates = [...new Set((sessions ?? []).map((s) => s.date))].sort()
      const totalDays = Math.max(1, Math.ceil((new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1)
      const weeks = totalDays / 7

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            total_sessions: dates.length,
            days_per_week_avg: Math.round((dates.length / weeks) * 10) / 10,
            dates,
          }),
        }],
      }
    }
  )

  // ── get_cardio_log ─────────────────────────────────────────
  server.tool(
    'get_cardio_log',
    'Get cardio entries from both standalone logs and workout sessions for a date range.',
    {
      start_date: z.string().date().describe('Start date (YYYY-MM-DD, inclusive)'),
      end_date: z.string().date().describe('End date (YYYY-MM-DD, inclusive)'),
    },
    async ({ start_date, end_date }) => {
      const [{ data: standalone }, { data: sessions }] = await Promise.all([
        db.from('cardio_logs')
          .select('date, type, duration_minutes')
          .gte('date', start_date)
          .lte('date', end_date)
          .order('date'),
        db.from('workout_sessions')
          .select('id, date')
          .gte('date', start_date)
          .lte('date', end_date),
      ])

      const sessionIds = (sessions ?? []).map((s) => s.id)
      const { data: sessionCardio } = sessionIds.length
        ? await db.from('cardio_entries').select('session_id, type, duration_minutes, distance_miles').in('session_id', sessionIds)
        : { data: [] }

      const result = [
        ...(standalone ?? []).map((c) => ({ date: c.date, type: c.type, duration_minutes: c.duration_minutes, distance_miles: null, source: 'standalone' })),
        ...(sessionCardio ?? []).map((c) => {
          const session = (sessions ?? []).find((s) => s.id === c.session_id)
          return { date: session?.date ?? 'unknown', type: c.type, duration_minutes: c.duration_minutes, distance_miles: c.distance_miles, source: 'session' }
        }),
      ].sort((a, b) => a.date.localeCompare(b.date))

      if (!result.length) {
        return { content: [{ type: 'text', text: JSON.stringify({ message: 'No cardio logged in this date range.', data: [] }) }] }
      }

      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    }
  )

  // ── log_workout_session ────────────────────────────────────
  server.tool(
    'log_workout_session',
    'Log a complete workout session with exercises and sets. Creates new exercise library entries if the exercise name is not found.',
    {
      date: z.string().date().optional().describe('Date of the workout (YYYY-MM-DD, defaults to today)'),
      name: z.string().optional().describe('Optional session name (e.g. "Push Day")'),
      notes: z.string().optional().describe('Optional session notes'),
      exercises: z.array(z.object({
        name: z.string().describe('Exercise name'),
        sets: z.array(z.object({
          reps: z.number().int().positive().optional(),
          weight_lbs: z.number().nonnegative().optional(),
        })).describe('Sets performed'),
      })).describe('List of exercises with sets'),
    },
    async ({ date, name, notes, exercises }) => {
      const target_date = date ?? new Date().toISOString().split('T')[0]

      // Create session
      const { data: session, error: sessionError } = await db
        .from('workout_sessions')
        .insert({ date: target_date, name: name ?? null, notes: notes ?? null })
        .select('id')
        .single()

      if (sessionError || !session) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: sessionError?.message ?? 'Failed to create session' }) }] }
      }

      let set_count = 0

      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i]

        // Find or create exercise in library
        let { data: libEntry } = await db
          .from('exercise_library')
          .select('id')
          .ilike('name', ex.name)
          .maybeSingle()

        if (!libEntry) {
          const { data: newEntry } = await db
            .from('exercise_library')
            .insert({ name: ex.name })
            .select('id')
            .single()
          libEntry = newEntry
        }

        if (!libEntry) continue

        const { data: workoutExercise } = await db
          .from('workout_exercises')
          .insert({ session_id: session.id, exercise_id: libEntry.id, order: i })
          .select('id')
          .single()

        if (!workoutExercise) continue

        const setsToInsert = ex.sets.map((s, idx) => ({
          workout_exercise_id: workoutExercise.id,
          set_number: idx + 1,
          reps: s.reps ?? null,
          weight_lbs: s.weight_lbs ?? null,
        }))

        await db.from('exercise_sets').insert(setsToInsert)
        set_count += setsToInsert.length
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Logged workout session for ${target_date} with ${exercises.length} exercise(s) and ${set_count} set(s).`,
            data: { session_id: session.id, date: target_date, exercise_count: exercises.length, set_count },
          }),
        }],
      }
    }
  )

  // ── log_cardio ─────────────────────────────────────────────
  server.tool(
    'log_cardio',
    'Log a standalone cardio entry (not linked to a workout session). Defaults to today.',
    {
      type: z.string().describe('Type of cardio (e.g. "walking", "treadmill", "Peloton")'),
      duration_minutes: z.number().int().positive().describe('Duration in minutes'),
      distance_miles: z.number().nonnegative().optional().describe('Distance in miles (optional)'),
      date: z.string().date().optional().describe('Date (YYYY-MM-DD, defaults to today)'),
    },
    async ({ type, duration_minutes, distance_miles, date }) => {
      const target_date = date ?? new Date().toISOString().split('T')[0]

      await db.from('cardio_logs').insert({
        date: target_date,
        type,
        duration_minutes,
        ...(distance_miles !== undefined ? { distance_miles } : {}),
      })

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Logged ${duration_minutes} min of ${type} for ${target_date}.`,
            data: { date: target_date, type, duration_minutes },
          }),
        }],
      }
    }
  )
}
