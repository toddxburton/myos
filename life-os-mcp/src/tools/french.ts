import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getSupabase } from '../supabase'
import type { Env } from '../config'

export function registerFrenchTools(server: McpServer, env: Env) {
  const db = getSupabase(env)

  // ── get_french_daily_summary ───────────────────────────────
  server.tool(
    'get_french_daily_summary',
    'Get French flashcard review stats grouped by day for a date range.',
    {
      start_date: z.string().date().describe('Start date (YYYY-MM-DD, inclusive)'),
      end_date: z.string().date().describe('End date (YYYY-MM-DD, inclusive)'),
    },
    async ({ start_date, end_date }) => {
      const { data } = await db
        .from('review_logs')
        .select('reviewed_at, rating, ease_factor')
        .gte('reviewed_at', `${start_date}T00:00:00`)
        .lte('reviewed_at', `${end_date}T23:59:59`)
        .order('reviewed_at')

      if (!data?.length) {
        return { content: [{ type: 'text', text: JSON.stringify({ message: 'No reviews in this date range.', data: [] }) }] }
      }

      const byDate: Record<string, { ratings: Record<string, number>; ease_factors: number[] }> = {}

      for (const row of data) {
        const d = row.reviewed_at.split('T')[0]
        if (!byDate[d]) byDate[d] = { ratings: { again: 0, hard: 0, good: 0, easy: 0 }, ease_factors: [] }
        byDate[d].ratings[row.rating] = (byDate[d].ratings[row.rating] ?? 0) + 1
        byDate[d].ease_factors.push(Number(row.ease_factor))
      }

      const result = Object.entries(byDate).map(([date, { ratings, ease_factors }]) => ({
        date,
        cards_reviewed: Object.values(ratings).reduce((a, b) => a + b, 0),
        ratings,
        avg_ease_factor: Math.round((ease_factors.reduce((a, b) => a + b, 0) / ease_factors.length) * 100) / 100,
      }))

      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    }
  )

  // ── get_french_deck_stats ──────────────────────────────────
  server.tool(
    'get_french_deck_stats',
    'Get overall French flashcard deck health: total cards, how many are due, overdue, and overall retention rate.',
    {},
    async () => {
      const now = new Date().toISOString()
      const today = now.split('T')[0]

      const [{ data: cards }, { data: recentReviews }, { data: dueCards }] = await Promise.all([
        db.from('flashcards').select('id', { count: 'exact' }),
        db.from('review_logs').select('card_id, rating, ease_factor, next_review_at').order('reviewed_at', { ascending: false }),
        db.from('review_logs').select('card_id, next_review_at').lte('next_review_at', now).order('next_review_at'),
      ])

      const totalCards = cards?.length ?? 0

      // Latest review per card
      const latestByCard: Record<string, { rating: string; ease_factor: number; next_review_at: string }> = {}
      for (const r of recentReviews ?? []) {
        if (!latestByCard[r.card_id]) latestByCard[r.card_id] = r
      }

      const easeFactors = Object.values(latestByCard).map((r) => Number(r.ease_factor))
      const avg_ease_factor = easeFactors.length
        ? Math.round((easeFactors.reduce((a, b) => a + b, 0) / easeFactors.length) * 100) / 100
        : 2.5

      // Due now = unique cards with next_review_at <= now
      const dueCardIds = new Set((dueCards ?? []).map((r) => r.card_id))

      // Retention = % of last-30-day reviews that were 'good' or 'easy'
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const since = thirtyDaysAgo.toISOString()
      const { data: recentForRetention } = await db
        .from('review_logs')
        .select('rating')
        .gte('reviewed_at', since)

      const totalRecent = recentForRetention?.length ?? 0
      const goodOrEasy = (recentForRetention ?? []).filter((r) => r.rating === 'good' || r.rating === 'easy').length
      const retention_rate_pct = totalRecent > 0 ? Math.round((goodOrEasy / totalRecent) * 1000) / 10 : null

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            total_cards: totalCards,
            due_now: dueCardIds.size,
            overdue: (dueCards ?? []).filter((r) => r.next_review_at < `${today}T00:00:00`).length,
            retention_rate_pct,
            avg_ease_factor,
          }),
        }],
      }
    }
  )

  // ── get_french_streak ──────────────────────────────────────
  server.tool(
    'get_french_streak',
    'Get the current consecutive-day streak of French practice (at least one card reviewed per day).',
    {},
    async () => {
      const today = new Date().toISOString().split('T')[0]
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      const since = ninetyDaysAgo.toISOString()

      const { data } = await db
        .from('review_logs')
        .select('reviewed_at')
        .gte('reviewed_at', since)

      const reviewDates = new Set((data ?? []).map((r) => r.reviewed_at.split('T')[0]))

      let streak_days = 0
      let last_review_date: string | null = null
      const check = new Date(today)

      while (true) {
        const d = check.toISOString().split('T')[0]
        if (reviewDates.has(d)) {
          streak_days++
          last_review_date = last_review_date ?? d
          check.setDate(check.getDate() - 1)
        } else {
          break
        }
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({ streak_days, last_review_date }) }],
      }
    }
  )

  // ── get_french_card ────────────────────────────────────────
  server.tool(
    'get_french_card',
    'Look up a flashcard by French or English text. Returns matching cards with their review status.',
    {
      query: z.string().describe('Text to search for (partial match)'),
      direction: z.enum(['french', 'english']).optional().describe('Which field to search (optional — searches both if omitted)'),
    },
    async ({ query, direction }) => {
      let dbQuery = db
        .from('flashcards')
        .select('id, french, english, pronunciation_note')

      if (direction === 'french') {
        dbQuery = dbQuery.ilike('french', `%${query}%`)
      } else if (direction === 'english') {
        dbQuery = dbQuery.ilike('english', `%${query}%`)
      } else {
        dbQuery = dbQuery.or(`french.ilike.%${query}%,english.ilike.%${query}%`)
      }

      const { data: cards } = await dbQuery.limit(10)

      if (!cards?.length) {
        return { content: [{ type: 'text', text: JSON.stringify({ message: `No cards found matching "${query}".`, data: [] }) }] }
      }

      const cardIds = cards.map((c) => c.id)
      const { data: latestReviews } = await db
        .from('review_logs')
        .select('card_id, reviewed_at, next_review_at')
        .in('card_id', cardIds)
        .order('reviewed_at', { ascending: false })

      const latestByCard: Record<string, { reviewed_at: string; next_review_at: string | null }> = {}
      for (const r of latestReviews ?? []) {
        if (!latestByCard[r.card_id]) latestByCard[r.card_id] = { reviewed_at: r.reviewed_at, next_review_at: r.next_review_at }
      }

      const result = cards.map((c) => ({
        id: c.id,
        french: c.french,
        english: c.english,
        pronunciation_note: c.pronunciation_note,
        last_reviewed_at: latestByCard[c.id]?.reviewed_at ?? null,
        next_review_at: latestByCard[c.id]?.next_review_at ?? null,
      }))

      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    }
  )

  // ── log_card_review ────────────────────────────────────────
  server.tool(
    'log_card_review',
    'Insert a review log entry for a single flashcard. The caller should provide next_review_at and ease_factor computed via SM-2 spacing logic.',
    {
      card_id: z.string().uuid().describe('UUID of the flashcard being reviewed'),
      direction: z.enum(['fr_to_en', 'en_to_fr']).describe('Review direction'),
      rating: z.enum(['again', 'hard', 'good', 'easy']).describe('How well the card was recalled'),
      next_review_at: z.string().datetime().describe('When to next review this card (ISO 8601 datetime)'),
      ease_factor: z.number().min(1.3).describe('Updated SM-2 ease factor (typically 1.3–3.0, starting at 2.5)'),
    },
    async ({ card_id, direction, rating, next_review_at, ease_factor }) => {
      const { error } = await db.from('review_logs').insert({
        card_id,
        direction,
        rating,
        reviewed_at: new Date().toISOString(),
        next_review_at,
        ease_factor,
      })

      if (error) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: error.message }) }] }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Logged ${rating} review for card ${card_id}. Next review: ${next_review_at}.`,
            data: { card_id, rating, next_review_at },
          }),
        }],
      }
    }
  )
}
