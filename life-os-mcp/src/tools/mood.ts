import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getSupabase } from '../supabase'
import type { Env } from '../config'

export function registerMoodTools(server: McpServer, env: Env) {
  const db = getSupabase(env)

  // ── get_mood_log ───────────────────────────────────────────
  server.tool(
    'get_mood_log',
    'Get mood check-in entries for a date range, optionally filtered by period (morning or evening).',
    {
      start_date: z.string().date().describe('Start date (YYYY-MM-DD, inclusive)'),
      end_date: z.string().date().describe('End date (YYYY-MM-DD, inclusive)'),
      period: z.enum(['morning', 'evening']).optional().describe('Filter by period (optional — omit for both)'),
    },
    async ({ start_date, end_date, period }) => {
      let query = db
        .from('mood_checkins')
        .select('date, period, energy_level, emotion, intention, reflection, gratitude')
        .gte('date', start_date)
        .lte('date', end_date)
        .order('date')
        .order('period')

      if (period) query = query.eq('period', period)

      const { data } = await query

      if (!data?.length) {
        return { content: [{ type: 'text', text: JSON.stringify({ message: 'No check-ins found for this date range.', data: [] }) }] }
      }

      return { content: [{ type: 'text', text: JSON.stringify(data) }] }
    }
  )

  // ── get_energy_trend ───────────────────────────────────────
  server.tool(
    'get_energy_trend',
    'Get average energy levels grouped by day or week over a date range.',
    {
      start_date: z.string().date().describe('Start date (YYYY-MM-DD, inclusive)'),
      end_date: z.string().date().describe('End date (YYYY-MM-DD, inclusive)'),
      group_by: z.enum(['day', 'week']).default('day').describe('Group results by day or week (default: day)'),
    },
    async ({ start_date, end_date, group_by }) => {
      const { data } = await db
        .from('mood_checkins')
        .select('date, energy_level')
        .gte('date', start_date)
        .lte('date', end_date)
        .order('date')

      if (!data?.length) {
        return { content: [{ type: 'text', text: JSON.stringify({ message: 'No check-ins in this date range.', data: [] }) }] }
      }

      const groups: Record<string, number[]> = {}

      for (const row of data) {
        let key: string
        if (group_by === 'week') {
          const d = new Date(row.date)
          const dow = d.getDay()
          const monday = new Date(d)
          monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
          key = `week of ${monday.toISOString().split('T')[0]}`
        } else {
          key = row.date
        }
        if (!groups[key]) groups[key] = []
        groups[key].push(row.energy_level)
      }

      const result = Object.entries(groups).map(([period, levels]) => ({
        period,
        avg_energy: Math.round((levels.reduce((a, b) => a + b, 0) / levels.length) * 10) / 10,
        check_in_count: levels.length,
      }))

      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    }
  )

  // ── get_emotion_patterns ───────────────────────────────────
  server.tool(
    'get_emotion_patterns',
    'Get the most frequently logged emotions over a period, sorted by frequency.',
    {
      start_date: z.string().date().describe('Start date (YYYY-MM-DD, inclusive)'),
      end_date: z.string().date().describe('End date (YYYY-MM-DD, inclusive)'),
    },
    async ({ start_date, end_date }) => {
      const { data } = await db
        .from('mood_checkins')
        .select('emotion')
        .gte('date', start_date)
        .lte('date', end_date)

      if (!data?.length) {
        return { content: [{ type: 'text', text: JSON.stringify({ message: 'No check-ins found in this date range.', data: [] }) }] }
      }

      const counts: Record<string, number> = {}
      for (const row of data) {
        counts[row.emotion] = (counts[row.emotion] ?? 0) + 1
      }

      const total = data.length
      const result = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([emotion, count]) => ({
          emotion,
          count,
          percentage: Math.round((count / total) * 1000) / 10,
        }))

      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    }
  )

  // ── log_mood_checkin ───────────────────────────────────────
  server.tool(
    'log_mood_checkin',
    'Log or update a mood check-in. Uses upsert so re-logging the same period on the same day overwrites the previous entry.',
    {
      period: z.enum(['morning', 'evening']).describe('Which check-in period'),
      energy_level: z.number().int().min(1).max(10).describe('Energy level from 1 (very low) to 10 (very high)'),
      emotion: z.enum(['joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation']).describe('Primary emotion (Plutchik wheel)'),
      intention: z.string().optional().describe('Intention for the day (morning only)'),
      reflection: z.string().optional().describe('Reflection on the day (evening only)'),
      gratitude: z.string().optional().describe('What you are grateful for (evening only)'),
      date: z.string().date().optional().describe('Date (YYYY-MM-DD, defaults to today)'),
    },
    async ({ period, energy_level, emotion, intention, reflection, gratitude, date }) => {
      const target_date = date ?? new Date().toISOString().split('T')[0]

      await db.from('mood_checkins').upsert(
        {
          date: target_date,
          period,
          energy_level,
          emotion,
          intention: intention ?? null,
          reflection: reflection ?? null,
          gratitude: gratitude ?? null,
        },
        { onConflict: 'date,period' }
      )

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Logged ${period} check-in for ${target_date}: energy ${energy_level}/10, feeling ${emotion}.`,
            data: { date: target_date, period, energy_level, emotion },
          }),
        }],
      }
    }
  )
}
