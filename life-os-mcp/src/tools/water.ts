import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getSupabase } from '../supabase'
import { localToday } from '../date'
import type { Env } from '../config'

export function registerWaterTools(server: McpServer, env: Env) {
  const db = getSupabase(env)

  // ── get_water_log ──────────────────────────────────────────
  server.tool(
    'get_water_log',
    'Get daily water intake totals for a date range, compared against the active goal for each day.',
    {
      start_date: z.string().date().describe('Start date (YYYY-MM-DD, inclusive)'),
      end_date: z.string().date().describe('End date (YYYY-MM-DD, inclusive)'),
    },
    async ({ start_date, end_date }) => {
      const [{ data: logs }, { data: goals }] = await Promise.all([
        db.from('water_logs').select('date, oz').gte('date', start_date).lte('date', end_date).order('date'),
        db.from('water_goals').select('daily_goal_oz, effective_from').lte('effective_from', end_date).order('effective_from', { ascending: false }),
      ])

      if (!logs) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to fetch logs' }) }] }

      // Aggregate oz by date
      const byDate: Record<string, number> = {}
      const countByDate: Record<string, number> = {}
      for (const log of logs) {
        byDate[log.date] = (byDate[log.date] ?? 0) + Number(log.oz)
        countByDate[log.date] = (countByDate[log.date] ?? 0) + 1
      }

      // Build date range
      const result = []
      const current = new Date(start_date)
      const end = new Date(end_date)
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0]
        const goalRow = (goals ?? []).find((g) => g.effective_from <= dateStr)
        const goal_oz = goalRow?.daily_goal_oz ?? 64
        const total_oz = Math.round((byDate[dateStr] ?? 0) * 10) / 10
        result.push({
          date: dateStr,
          total_oz,
          goal_oz,
          entries_count: countByDate[dateStr] ?? 0,
          hit_goal: total_oz >= goal_oz,
        })
        current.setDate(current.getDate() + 1)
      }

      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    }
  )

  // ── get_water_streak ───────────────────────────────────────
  server.tool(
    'get_water_streak',
    'Get the current consecutive-day streak of hitting the daily water goal.',
    {},
    async () => {
      const { data: goals } = await db
        .from('water_goals')
        .select('daily_goal_oz, effective_from')
        .order('effective_from', { ascending: false })
        .limit(1)

      const current_goal_oz = goals?.[0]?.daily_goal_oz ?? 64

      // Fetch last 90 days of logs
      const today = localToday(env.TIMEZONE)
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      const since = ninetyDaysAgo.toISOString().split('T')[0]

      const { data: logs } = await db
        .from('water_logs')
        .select('date, oz')
        .gte('date', since)
        .lte('date', today)

      const totals: Record<string, number> = {}
      for (const log of logs ?? []) {
        totals[log.date] = (totals[log.date] ?? 0) + Number(log.oz)
      }

      let streak_days = 0
      let last_hit_date: string | null = null
      const check = new Date(today)

      while (true) {
        const dateStr = check.toISOString().split('T')[0]
        const total = totals[dateStr] ?? 0
        if (total >= current_goal_oz) {
          streak_days++
          last_hit_date = last_hit_date ?? dateStr
          check.setDate(check.getDate() - 1)
        } else {
          break
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ streak_days, last_hit_date, current_goal_oz }),
        }],
      }
    }
  )

  // ── log_water_intake ───────────────────────────────────────
  server.tool(
    'log_water_intake',
    'Log a water intake entry. Defaults to today if no date is provided.',
    {
      oz: z.number().positive().describe('Amount of water in ounces'),
      date: z.string().date().optional().describe('Date to log for (YYYY-MM-DD, defaults to today)'),
    },
    async ({ oz, date }) => {
      const target_date = date ?? localToday(env.TIMEZONE)

      const { error: insertError } = await db.from('water_logs').insert({ date: target_date, oz })
      if (insertError) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: insertError.message }) }] }
      }

      // Get today's total
      const { data: todayLogs } = await db
        .from('water_logs')
        .select('oz')
        .eq('date', target_date)

      const total_oz_today = Math.round((todayLogs ?? []).reduce((sum, l) => sum + Number(l.oz), 0) * 10) / 10

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Logged ${oz}oz of water for ${target_date}. Total today: ${total_oz_today}oz.`,
            data: { date: target_date, oz_logged: oz, total_oz_today },
          }),
        }],
      }
    }
  )
}
