import { FastifyRequest, FastifyReply } from 'fastify'
import { pool } from '@/db'

/** Monthly price in USD for estimated MRR when env not set (display only). */
function monthlyPriceUsd(): number {
  const n = Number(process.env.STRIPE_MRR_MONTHLY_USD)
  return Number.isFinite(n) && n > 0 ? n : 9.99
}

const MAX_ANALYTICS_ROLLING_DAYS = 3660

type ParsedAnalyticsWindow =
  | { mode: 'rolling'; days: number }
  | { mode: 'all_time' }

/** `days=1|7|30|365` or `days=all` for unbounded history (charts + counts). */
function parseAnalyticsWindow(request: FastifyRequest, fallback: number): ParsedAnalyticsWindow {
  const q = request.query as { days?: string }
  const raw = q.days?.trim()
  if (!raw) return { mode: 'rolling', days: fallback }
  const low = raw.toLowerCase()
  if (low === 'all' || low === 'alltime' || low === 'all_time') {
    return { mode: 'all_time' }
  }
  const d = Number(raw)
  if (!Number.isFinite(d) || d < 1 || d > MAX_ANALYTICS_ROLLING_DAYS) {
    return { mode: 'rolling', days: fallback }
  }
  return { mode: 'rolling', days: Math.floor(d) }
}

function analyticsWindowPayload(w: ParsedAnalyticsWindow) {
  if (w.mode === 'all_time') {
    return { type: 'all' as const }
  }
  return { type: 'rolling' as const, days: w.days }
}

/**
 * Percent change vs the prior window. When the prior window count is 0, a ratio is undefined:
 * we return `null` (not a fake "+100%") so the UI can show a neutral label instead.
 */
function percentChangeVsPrior(current: number, previous: number): number | null {
  if (previous > 0) {
    return Math.round(((current - previous) / previous) * 10000) / 100
  }
  if (current === 0) return 0
  return null
}

export async function getAnalyticsOverview(request: FastifyRequest, reply: FastifyReply) {
  const w = parseAnalyticsWindow(request, 30)
  const price = monthlyPriceUsd()

  const baseQueries = [
    pool.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM users WHERE is_active = TRUE`),
    pool.query<{ c: string }>(
      `SELECT COUNT(DISTINCT user_id)::text AS c FROM refresh_tokens
       WHERE created_at::date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date`
    ),
    pool.query<{ c: string }>(
      `SELECT COUNT(DISTINCT user_id)::text AS c FROM refresh_tokens
       WHERE created_at >= NOW() - INTERVAL '30 days'`
    ),
    pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM documents WHERE deleted_at IS NULL`
    ),
    pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM documents
       WHERE deleted_at IS NULL
         AND created_at::date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date`
    ),
    pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM subscriptions
       WHERE plan = 'pro' AND status = 'active'`
    ),
    pool.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM users WHERE plan = 'pro' AND is_active = TRUE`),
    pool.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM users WHERE is_active = TRUE`),
    pool.query<{ plan: string; c: string }>(
      `SELECT plan::text, COUNT(*)::text AS c FROM users WHERE is_active = TRUE GROUP BY plan`
    ),
  ] as const

  let comparisonQueries: Promise<{ rows: { c: string }[] }>[] = []
  if (w.mode === 'rolling') {
    const d = w.days
    comparisonQueries = [
      pool.query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM users
         WHERE is_active = TRUE AND created_at >= NOW() - CAST($1 AS int) * INTERVAL '1 day'`,
        [d]
      ),
      pool.query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM users
         WHERE is_active = TRUE
           AND created_at >= NOW() - CAST($1 AS int) * INTERVAL '1 day' * 2
           AND created_at < NOW() - CAST($1 AS int) * INTERVAL '1 day'`,
        [d]
      ),
      pool.query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM documents
         WHERE deleted_at IS NULL AND created_at >= NOW() - CAST($1 AS int) * INTERVAL '1 day'`,
        [d]
      ),
      pool.query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM documents
         WHERE deleted_at IS NULL
           AND created_at >= NOW() - CAST($1 AS int) * INTERVAL '1 day' * 2
           AND created_at < NOW() - CAST($1 AS int) * INTERVAL '1 day'`,
        [d]
      ),
      pool.query<{ c: string }>(
        `SELECT COUNT(DISTINCT user_id)::text AS c FROM refresh_tokens
         WHERE created_at >= NOW() - CAST($1 AS int) * INTERVAL '1 day'`,
        [d]
      ),
      pool.query<{ c: string }>(
        `SELECT COUNT(DISTINCT user_id)::text AS c FROM refresh_tokens
         WHERE created_at >= NOW() - CAST($1 AS int) * INTERVAL '1 day' * 2
           AND created_at < NOW() - CAST($1 AS int) * INTERVAL '1 day'`,
        [d]
      ),
      pool.query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM ai_queries
         WHERE created_at >= NOW() - CAST($1 AS int) * INTERVAL '1 day'`,
        [d]
      ),
      pool.query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM ai_queries
         WHERE created_at >= NOW() - CAST($1 AS int) * INTERVAL '1 day' * 2
           AND created_at < NOW() - CAST($1 AS int) * INTERVAL '1 day'`,
        [d]
      ),
    ]
  }

  const allResults = await Promise.all([...baseQueries, ...comparisonQueries])
  const [
    totalUsers,
    dau,
    mau,
    totalDocuments,
    docsToday,
    proSubActive,
    proUsers,
    totalUsersAll,
    planDist,
  ] = allResults

  const totalU = Number(totalUsers.rows[0]?.c ?? 0)
  const proU = Number(proUsers.rows[0]?.c ?? 0)
  const totalAll = Number(totalUsersAll.rows[0]?.c ?? 0)
  const activeProSubs = Number(proSubActive.rows[0]?.c ?? 0)
  const mrrEstimate = Math.round(activeProSubs * price * 100) / 100
  const conversionPct =
    totalAll > 0 ? Math.round((proU / totalAll) * 10000) / 100 : 0

  let periodComparison: {
    windowDays: number
    periodLabel: string
    newSignups: { current: number; previous: number; changePercent: number | null }
    documentsCreated: { current: number; previous: number; changePercent: number | null }
    distinctLoginUsers: { current: number; previous: number; changePercent: number | null }
    aiChatMessages: { current: number; previous: number; changePercent: number | null }
  } | null = null

  if (w.mode === 'rolling') {
    const comp = allResults.slice(baseQueries.length) as {
      rows: { c: string }[]
    }[]
    const [
      curSignups,
      prevSignups,
      curDocs,
      prevDocs,
      curLoginUsers,
      prevLoginUsers,
      curAi,
      prevAi,
    ] = comp

    const nsCur = Number(curSignups.rows[0]?.c ?? 0)
    const nsPrev = Number(prevSignups.rows[0]?.c ?? 0)
    const dcCur = Number(curDocs.rows[0]?.c ?? 0)
    const dcPrev = Number(prevDocs.rows[0]?.c ?? 0)
    const luCur = Number(curLoginUsers.rows[0]?.c ?? 0)
    const luPrev = Number(prevLoginUsers.rows[0]?.c ?? 0)
    const aiCur = Number(curAi.rows[0]?.c ?? 0)
    const aiPrev = Number(prevAi.rows[0]?.c ?? 0)
    const wd = w.days
    periodComparison = {
      windowDays: wd,
      periodLabel: `Last ${wd} day${wd === 1 ? '' : 's'} vs previous ${wd} day${wd === 1 ? '' : 's'}`,
      newSignups: {
        current: nsCur,
        previous: nsPrev,
        changePercent: percentChangeVsPrior(nsCur, nsPrev),
      },
      documentsCreated: {
        current: dcCur,
        previous: dcPrev,
        changePercent: percentChangeVsPrior(dcCur, dcPrev),
      },
      distinctLoginUsers: {
        current: luCur,
        previous: luPrev,
        changePercent: percentChangeVsPrior(luCur, luPrev),
      },
      aiChatMessages: {
        current: aiCur,
        previous: aiPrev,
        changePercent: percentChangeVsPrior(aiCur, aiPrev),
      },
    }
  }

  return reply.send({
    data: {
      analyticsWindow: analyticsWindowPayload(w),
      totalUsers: totalU,
      dau: Number(dau.rows[0]?.c ?? 0),
      mau: Number(mau.rows[0]?.c ?? 0),
      totalDocuments: Number(totalDocuments.rows[0]?.c ?? 0),
      documentsCreatedToday: Number(docsToday.rows[0]?.c ?? 0),
      activeProSubscriptions: activeProSubs,
      mrrMonthlyUsdEstimate: mrrEstimate,
      mrrPriceAssumptionUsd: price,
      proUsers: proU,
      conversionRatePercent: conversionPct,
      periodComparison,
      planDistribution: planDist.rows.map((r) => ({
        plan: r.plan,
        count: Number(r.c),
      })),
    },
  })
}

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export async function getAnalyticsVisualizations(request: FastifyRequest, reply: FastifyReply) {
  const w = parseAnalyticsWindow(request, 30)
  const intervalDays = w.mode === 'rolling' ? w.days : 0

  const artifactDate = (table: string) =>
    w.mode === 'all_time'
      ? pool.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM ${table}`)
      : pool.query<{ c: string }>(
          `SELECT COUNT(*)::text AS c FROM ${table} WHERE created_at >= NOW() - $1::interval`,
          [`${intervalDays} days`]
        )

  const [dowRows, sumQ, quizQ, fcQ, kgQ, aiQ, learnQ] = await Promise.all([
    w.mode === 'all_time'
      ? pool.query<{ dow: string; c: string }>(
          `SELECT EXTRACT(ISODOW FROM created_at AT TIME ZONE 'UTC')::int AS dow,
                  COUNT(*)::text AS c
           FROM documents
           WHERE deleted_at IS NULL
           GROUP BY 1
           ORDER BY 1`
        )
      : pool.query<{ dow: string; c: string }>(
          `SELECT EXTRACT(ISODOW FROM created_at AT TIME ZONE 'UTC')::int AS dow,
                  COUNT(*)::text AS c
           FROM documents
           WHERE deleted_at IS NULL
             AND created_at >= NOW() - CAST($1 AS int) * INTERVAL '1 day'
           GROUP BY 1
           ORDER BY 1`,
          [intervalDays]
        ),
    artifactDate('summaries'),
    artifactDate('quizzes'),
    artifactDate('flashcards'),
    artifactDate('knowledge_graphs'),
    artifactDate('ai_queries'),
    artifactDate('learning_paths'),
  ])

  const byDow = new Map<number, number>()
  for (const r of dowRows.rows) {
    byDow.set(Number(r.dow), Number(r.c))
  }
  const documentsByWeekday = WEEKDAY_SHORT.map((label, i) => ({
    dayShort: label,
    dayIndex: i + 1,
    count: byDow.get(i + 1) ?? 0,
  }))

  const contentArtifactsTotal = [
    { name: 'Summaries', value: Number(sumQ.rows[0]?.c ?? 0) },
    { name: 'Learn paths', value: Number(learnQ.rows[0]?.c ?? 0) },
    { name: 'Quizzes', value: Number(quizQ.rows[0]?.c ?? 0) },
    { name: 'Flashcards', value: Number(fcQ.rows[0]?.c ?? 0) },
    { name: 'Knowledge graphs', value: Number(kgQ.rows[0]?.c ?? 0) },
    { name: 'AI messages', value: Number(aiQ.rows[0]?.c ?? 0) },
  ].filter((x) => x.value > 0)

  const weekdayNote =
    w.mode === 'all_time'
      ? 'Document uploads by weekday of created_at (UTC), all time.'
      : `Document uploads by weekday (UTC), last ${intervalDays} day${intervalDays === 1 ? '' : 's'}.`

  return reply.send({
    data: {
      analyticsWindow: analyticsWindowPayload(w),
      documentsByWeekday,
      contentArtifactsTotal,
      weekdayNote,
    },
  })
}

export async function getAnalyticsTrends(request: FastifyRequest, reply: FastifyReply) {
  const w = parseAnalyticsWindow(request, 30)

  if (w.mode === 'all_time') {
    const [newUsers, activeUsers, documentsCreated] = await Promise.all([
      pool.query<{ day: string; count: string }>(
        `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
                COUNT(*)::text AS count
         FROM users
         GROUP BY 1
         ORDER BY 1`
      ),
      pool.query<{ day: string; count: string }>(
        `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
                COUNT(DISTINCT user_id)::text AS count
         FROM refresh_tokens
         GROUP BY 1
         ORDER BY 1`
      ),
      pool.query<{ day: string; count: string }>(
        `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
                COUNT(*)::text AS count
         FROM documents
         WHERE deleted_at IS NULL
         GROUP BY 1
         ORDER BY 1`
      ),
    ])

    return reply.send({
      data: {
        analyticsWindow: analyticsWindowPayload(w),
        days: null,
        newUsersByDay: newUsers.rows.map((r) => ({ day: r.day, count: Number(r.count) })),
        activeUsersByDay: activeUsers.rows.map((r) => ({ day: r.day, count: Number(r.count) })),
        documentsCreatedByDay: documentsCreated.rows.map((r) => ({
          day: r.day,
          count: Number(r.count),
        })),
        changeVsPreviousWindow: null,
      },
    })
  }

  const days = w.days
  const interval = `${days} days`

  const [newUsers, activeUsers, documentsCreated, prevNewUsers, prevActiveUsers, prevDocs] =
    await Promise.all([
      pool.query<{ day: string; count: string }>(
        `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
                COUNT(*)::text AS count
         FROM users
         WHERE created_at >= NOW() - $1::interval
         GROUP BY 1
         ORDER BY 1`,
        [interval]
      ),
      pool.query<{ day: string; count: string }>(
        `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
                COUNT(DISTINCT user_id)::text AS count
         FROM refresh_tokens
         WHERE created_at >= NOW() - $1::interval
         GROUP BY 1
         ORDER BY 1`,
        [interval]
      ),
      pool.query<{ day: string; count: string }>(
        `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
                COUNT(*)::text AS count
         FROM documents
         WHERE deleted_at IS NULL AND created_at >= NOW() - $1::interval
         GROUP BY 1
         ORDER BY 1`,
        [interval]
      ),
      pool.query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM users
         WHERE created_at >= NOW() - CAST($1 AS int) * INTERVAL '1 day' * 2
           AND created_at < NOW() - CAST($1 AS int) * INTERVAL '1 day'`,
        [days]
      ),
      pool.query<{ c: string }>(
        `SELECT COUNT(DISTINCT user_id)::text AS c FROM refresh_tokens
         WHERE created_at >= NOW() - CAST($1 AS int) * INTERVAL '1 day' * 2
           AND created_at < NOW() - CAST($1 AS int) * INTERVAL '1 day'`,
        [days]
      ),
      pool.query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM documents
         WHERE deleted_at IS NULL
           AND created_at >= NOW() - CAST($1 AS int) * INTERVAL '1 day' * 2
           AND created_at < NOW() - CAST($1 AS int) * INTERVAL '1 day'`,
        [days]
      ),
    ])

  const sumWindow = (rows: { count: string }[]) =>
    rows.reduce((s, r) => s + Number(r.count ?? 0), 0)

  const nuCur = sumWindow(newUsers.rows)
  const nuPrev = Number(prevNewUsers.rows[0]?.c ?? 0)
  const auCur = sumWindow(activeUsers.rows)
  const auPrev = Number(prevActiveUsers.rows[0]?.c ?? 0)
  const dcCur = sumWindow(documentsCreated.rows)
  const dcPrev = Number(prevDocs.rows[0]?.c ?? 0)

  return reply.send({
    data: {
      analyticsWindow: analyticsWindowPayload(w),
      days,
      newUsersByDay: newUsers.rows.map((r) => ({ day: r.day, count: Number(r.count) })),
      activeUsersByDay: activeUsers.rows.map((r) => ({ day: r.day, count: Number(r.count) })),
      documentsCreatedByDay: documentsCreated.rows.map((r) => ({
        day: r.day,
        count: Number(r.count),
      })),
      changeVsPreviousWindow: {
        newUsersPercent: percentChangeVsPrior(nuCur, nuPrev),
        activeUsersPercent: percentChangeVsPrior(auCur, auPrev),
        documentsCreatedPercent: percentChangeVsPrior(dcCur, dcPrev),
      },
    },
  })
}

export async function getAnalyticsUsers(_request: FastifyRequest, reply: FastifyReply) {
  const [avgDocs, avgLogins, topUsers] = await Promise.all([
    pool.query<{ n: string; d: string }>(
      `SELECT COUNT(DISTINCT u.id)::text AS n,
              COUNT(d.id)::text AS d
       FROM users u
       LEFT JOIN documents d ON d.user_id = u.id AND d.deleted_at IS NULL
       WHERE u.is_active = TRUE`
    ),
    pool.query<{ n: string; t: string }>(
      `SELECT COUNT(DISTINCT u.id)::text AS n,
              COUNT(rt.id)::text AS t
       FROM users u
       LEFT JOIN refresh_tokens rt ON rt.user_id = u.id
       WHERE u.is_active = TRUE`
    ),
    pool.query<{
      id: string
      email: string
      name: string | null
      doc_count: string
      ai_count: string
      xp_total: string
      score: string
    }>(
      `SELECT u.id, u.email, u.name,
              (SELECT COUNT(*)::text FROM documents d WHERE d.user_id = u.id AND d.deleted_at IS NULL) AS doc_count,
              (SELECT COUNT(*)::text FROM ai_queries aq WHERE aq.user_id = u.id) AS ai_count,
              COALESCE((SELECT SUM(lp.xp_earned)::text FROM learning_progress lp WHERE lp.user_id = u.id), '0') AS xp_total,
              (
                (SELECT COUNT(*) FROM documents d WHERE d.user_id = u.id AND d.deleted_at IS NULL)
                + (SELECT COUNT(*) FROM ai_queries aq WHERE aq.user_id = u.id)
                + COALESCE((SELECT SUM(lp.xp_earned) FROM learning_progress lp WHERE lp.user_id = u.id), 0) / 10
              )::text AS score
       FROM users u
       WHERE u.is_active = TRUE
       ORDER BY
         (SELECT COUNT(*) FROM documents d2 WHERE d2.user_id = u.id AND d2.deleted_at IS NULL)
         + (SELECT COUNT(*) FROM ai_queries aq2 WHERE aq2.user_id = u.id)
         + COALESCE((SELECT SUM(lp2.xp_earned) FROM learning_progress lp2 WHERE lp2.user_id = u.id), 0) / 10
         DESC NULLS LAST
       LIMIT 10`
    ),
  ])

  const nUsers = Number(avgDocs.rows[0]?.n ?? 1)
  const totalDocs = Number(avgDocs.rows[0]?.d ?? 0)
  const totalLogins = Number(avgLogins.rows[0]?.t ?? 0)
  const nForLogins = Number(avgLogins.rows[0]?.n ?? 1)

  return reply.send({
    data: {
      avgDocumentsPerUser: nUsers > 0 ? Math.round((totalDocs / nUsers) * 100) / 100 : 0,
      avgLoginsPerUser: nForLogins > 0 ? Math.round((totalLogins / nForLogins) * 100) / 100 : 0,
      topActiveUsers: topUsers.rows.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        documentsCount: Number(r.doc_count),
        aiQueriesCount: Number(r.ai_count),
        learningXpTotal: Number(r.xp_total),
        activityScore: Number(r.score),
      })),
    },
  })
}

export async function getAnalyticsDocuments(_request: FastifyRequest, reply: FastifyReply) {
  const [
    topByAi,
    topByWords,
    totals,
    zeroActivity,
    avgWords,
  ] = await Promise.all([
    pool.query<{
      document_id: string
      title: string
      user_id: string
      email: string
      ai_queries: string
    }>(
      `SELECT d.id AS document_id, d.title, d.user_id, u.email,
              COUNT(aq.id)::text AS ai_queries
       FROM documents d
       INNER JOIN users u ON u.id = d.user_id
       LEFT JOIN ai_queries aq ON aq.document_id = d.id
       WHERE d.deleted_at IS NULL
       GROUP BY d.id, d.title, d.user_id, u.email
       ORDER BY COUNT(aq.id) DESC
       LIMIT 10`
    ),
    pool.query<{
      document_id: string
      title: string
      user_id: string
      email: string
      word_count: string
    }>(
      `SELECT d.id AS document_id, d.title, d.user_id, u.email, d.word_count::text
       FROM documents d
       INNER JOIN users u ON u.id = d.user_id
       WHERE d.deleted_at IS NULL
       ORDER BY d.word_count DESC
       LIMIT 10`
    ),
    pool.query<{
      ai: string
      summaries: string
      quizzes: string
      flashcards: string
    }>(
      `SELECT
         (SELECT COUNT(*)::text FROM ai_queries) AS ai,
         (SELECT COUNT(*)::text FROM summaries) AS summaries,
         (SELECT COUNT(*)::text FROM quizzes) AS quizzes,
         (SELECT COUNT(*)::text FROM flashcards) AS flashcards`
    ),
    pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c
       FROM documents d
       WHERE d.deleted_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM ai_queries aq WHERE aq.document_id = d.id)
         AND NOT EXISTS (SELECT 1 FROM summaries s WHERE s.document_id = d.id)
         AND NOT EXISTS (SELECT 1 FROM quizzes q WHERE q.document_id = d.id)
         AND NOT EXISTS (SELECT 1 FROM flashcards f WHERE f.document_id = d.id)`
    ),
    pool.query<{ a: string }>(
      `SELECT COALESCE(AVG(word_count), 0)::text AS a
       FROM documents WHERE deleted_at IS NULL`
    ),
  ])

  const t = totals.rows[0]

  return reply.send({
    data: {
      topByAiQueries: topByAi.rows.map((r) => ({
        documentId: r.document_id,
        title: r.title,
        userId: r.user_id,
        ownerEmail: r.email,
        aiQueriesCount: Number(r.ai_queries),
      })),
      topByWordCount: topByWords.rows.map((r) => ({
        documentId: r.document_id,
        title: r.title,
        userId: r.user_id,
        ownerEmail: r.email,
        wordCount: Number(r.word_count),
      })),
      totals: {
        aiQueries: Number(t?.ai ?? 0),
        summaries: Number(t?.summaries ?? 0),
        quizzes: Number(t?.quizzes ?? 0),
        flashcards: Number(t?.flashcards ?? 0),
      },
      documentsWithZeroActivity: Number(zeroActivity.rows[0]?.c ?? 0),
      avgWordCount: Math.round(Number(avgWords.rows[0]?.a ?? 0) * 100) / 100,
    },
  })
}

export async function getAnalyticsBusiness(_request: FastifyRequest, reply: FastifyReply) {
  const price = monthlyPriceUsd()
  const [
    activeProSubs,
    canceledSubs,
    activeAny,
    upgrades30d,
    planUsage,
  ] = await Promise.all([
    pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM subscriptions WHERE plan = 'pro' AND status = 'active'`
    ),
    pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM subscriptions WHERE status = 'canceled'`
    ),
    pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM subscriptions WHERE status = 'active'`
    ),
    pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM subscriptions
       WHERE plan = 'pro' AND created_at >= NOW() - INTERVAL '30 days'`
    ),
    pool.query<{
      plan: string
      user_count: string
      avg_docs: string
      avg_ai_total: string
    }>(
      `SELECT u.plan::text,
              COUNT(*)::text AS user_count,
              COALESCE(AVG(dc.c), 0)::text AS avg_docs,
              COALESCE(AVG(aq.c), 0)::text AS avg_ai_total
       FROM users u
       LEFT JOIN (
         SELECT user_id, COUNT(*)::numeric AS c FROM documents WHERE deleted_at IS NULL GROUP BY user_id
       ) dc ON dc.user_id = u.id
       LEFT JOIN (
         SELECT user_id, COUNT(*)::numeric AS c FROM ai_queries GROUP BY user_id
       ) aq ON aq.user_id = u.id
       WHERE u.is_active = TRUE
       GROUP BY u.plan`
    ),
  ])

  const active = Number(activeAny.rows[0]?.c ?? 0)
  const canceled = Number(canceledSubs.rows[0]?.c ?? 0)
  const churnDen = active + canceled
  const churnPct = churnDen > 0 ? Math.round((canceled / churnDen) * 10000) / 100 : 0
  const ap = Number(activeProSubs.rows[0]?.c ?? 0)

  return reply.send({
    data: {
      activeProSubscriptions: ap,
      mrrMonthlyUsdEstimate: Math.round(ap * price * 100) / 100,
      mrrPriceAssumptionUsd: price,
      subscriptionsCanceledCount: canceled,
      churnRatePercent: churnPct,
      proSubscriptionsCreatedLast30Days: Number(upgrades30d.rows[0]?.c ?? 0),
      usageByPlan: planUsage.rows.map((r) => ({
        plan: r.plan,
        userCount: Number(r.user_count),
        avgDocumentsPerUser: Math.round(Number(r.avg_docs) * 100) / 100,
        avgAiQueriesLifetimePerUser: Math.round(Number(r.avg_ai_total) * 100) / 100,
      })),
    },
  })
}

export async function getAnalyticsFeatures(request: FastifyRequest, reply: FastifyReply) {
  const w = parseAnalyticsWindow(request, 30)
  const interval = w.mode === 'rolling' ? `${w.days} days` : null

  const [totalUsers, aiUsers, sumUsers, quizUsers, fcUsers, kgUsers, lpUsers] = await Promise.all([
    pool.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM users WHERE is_active = TRUE`),
    w.mode === 'all_time'
      ? pool.query<{ c: string }>(`SELECT COUNT(DISTINCT user_id)::text AS c FROM ai_queries`)
      : pool.query<{ c: string }>(
          `SELECT COUNT(DISTINCT user_id)::text AS c FROM ai_queries
           WHERE created_at >= NOW() - $1::interval`,
          [interval!]
        ),
    w.mode === 'all_time'
      ? pool.query<{ c: string }>(
          `SELECT COUNT(DISTINCT d.user_id)::text AS c FROM summaries s
           INNER JOIN documents d ON d.id = s.document_id AND d.deleted_at IS NULL`
        )
      : pool.query<{ c: string }>(
          `SELECT COUNT(DISTINCT d.user_id)::text AS c FROM summaries s
           INNER JOIN documents d ON d.id = s.document_id AND d.deleted_at IS NULL
           WHERE s.created_at >= NOW() - $1::interval`,
          [interval!]
        ),
    w.mode === 'all_time'
      ? pool.query<{ c: string }>(
          `SELECT COUNT(DISTINCT d.user_id)::text AS c FROM quizzes q
           INNER JOIN documents d ON d.id = q.document_id AND d.deleted_at IS NULL`
        )
      : pool.query<{ c: string }>(
          `SELECT COUNT(DISTINCT d.user_id)::text AS c FROM quizzes q
           INNER JOIN documents d ON d.id = q.document_id AND d.deleted_at IS NULL
           WHERE q.created_at >= NOW() - $1::interval`,
          [interval!]
        ),
    w.mode === 'all_time'
      ? pool.query<{ c: string }>(
          `SELECT COUNT(DISTINCT d.user_id)::text AS c FROM flashcards f
           INNER JOIN documents d ON d.id = f.document_id AND d.deleted_at IS NULL`
        )
      : pool.query<{ c: string }>(
          `SELECT COUNT(DISTINCT d.user_id)::text AS c FROM flashcards f
           INNER JOIN documents d ON d.id = f.document_id AND d.deleted_at IS NULL
           WHERE f.created_at >= NOW() - $1::interval`,
          [interval!]
        ),
    w.mode === 'all_time'
      ? pool.query<{ c: string }>(
          `SELECT COUNT(DISTINCT d.user_id)::text AS c FROM knowledge_graphs kg
           INNER JOIN documents d ON d.id = kg.document_id AND d.deleted_at IS NULL`
        )
      : pool.query<{ c: string }>(
          `SELECT COUNT(DISTINCT d.user_id)::text AS c FROM knowledge_graphs kg
           INNER JOIN documents d ON d.id = kg.document_id AND d.deleted_at IS NULL
           WHERE kg.created_at >= NOW() - $1::interval`,
          [interval!]
        ),
    w.mode === 'all_time'
      ? pool.query<{ c: string }>(`SELECT COUNT(DISTINCT user_id)::text AS c FROM learning_paths`)
      : pool.query<{ c: string }>(
          `SELECT COUNT(DISTINCT user_id)::text AS c FROM learning_paths
           WHERE created_at >= NOW() - $1::interval`,
          [interval!]
        ),
  ])

  const [aiCount, sumCount, quizCount, fcCount, kgCount, lpCount, trendAi, trendSum, trendQuiz, trendFc, trendKg, trendLp] =
    await Promise.all([
      w.mode === 'all_time'
        ? pool.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM ai_queries`)
        : pool.query<{ c: string }>(
            `SELECT COUNT(*)::text AS c FROM ai_queries WHERE created_at >= NOW() - $1::interval`,
            [interval!]
          ),
      w.mode === 'all_time'
        ? pool.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM summaries`)
        : pool.query<{ c: string }>(
            `SELECT COUNT(*)::text AS c FROM summaries WHERE created_at >= NOW() - $1::interval`,
            [interval!]
          ),
      w.mode === 'all_time'
        ? pool.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM quizzes`)
        : pool.query<{ c: string }>(
            `SELECT COUNT(*)::text AS c FROM quizzes WHERE created_at >= NOW() - $1::interval`,
            [interval!]
          ),
      w.mode === 'all_time'
        ? pool.query<{ c: string }>(
            `SELECT COUNT(DISTINCT f.document_id)::text AS c FROM flashcards f
             INNER JOIN documents d ON d.id = f.document_id AND d.deleted_at IS NULL`
          )
        : pool.query<{ c: string }>(
            `SELECT COUNT(DISTINCT f.document_id)::text AS c FROM flashcards f
             INNER JOIN documents d ON d.id = f.document_id AND d.deleted_at IS NULL
             WHERE f.created_at >= NOW() - $1::interval`,
            [interval!]
          ),
      w.mode === 'all_time'
        ? pool.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM knowledge_graphs`)
        : pool.query<{ c: string }>(
            `SELECT COUNT(*)::text AS c FROM knowledge_graphs WHERE created_at >= NOW() - $1::interval`,
            [interval!]
          ),
      w.mode === 'all_time'
        ? pool.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM learning_paths`)
        : pool.query<{ c: string }>(
            `SELECT COUNT(*)::text AS c FROM learning_paths WHERE created_at >= NOW() - $1::interval`,
            [interval!]
          ),
      w.mode === 'all_time'
        ? pool.query<{ day: string; count: string }>(
            `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
                    COUNT(*)::text AS count
             FROM ai_queries GROUP BY 1 ORDER BY 1`
          )
        : pool.query<{ day: string; count: string }>(
            `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
                    COUNT(*)::text AS count
             FROM ai_queries WHERE created_at >= NOW() - $1::interval GROUP BY 1 ORDER BY 1`,
            [interval!]
          ),
      w.mode === 'all_time'
        ? pool.query<{ day: string; count: string }>(
            `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
                    COUNT(*)::text AS count
             FROM summaries GROUP BY 1 ORDER BY 1`
          )
        : pool.query<{ day: string; count: string }>(
            `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
                    COUNT(*)::text AS count
             FROM summaries WHERE created_at >= NOW() - $1::interval GROUP BY 1 ORDER BY 1`,
            [interval!]
          ),
      w.mode === 'all_time'
        ? pool.query<{ day: string; count: string }>(
            `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
                    COUNT(*)::text AS count
             FROM quizzes GROUP BY 1 ORDER BY 1`
          )
        : pool.query<{ day: string; count: string }>(
            `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
                    COUNT(*)::text AS count
             FROM quizzes WHERE created_at >= NOW() - $1::interval GROUP BY 1 ORDER BY 1`,
            [interval!]
          ),
      w.mode === 'all_time'
        ? pool.query<{ day: string; count: string }>(
            `SELECT to_char(date_trunc('day', f.created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
                    COUNT(DISTINCT f.document_id)::text AS count
             FROM flashcards f
             INNER JOIN documents d ON d.id = f.document_id AND d.deleted_at IS NULL
             GROUP BY 1 ORDER BY 1`
          )
        : pool.query<{ day: string; count: string }>(
            `SELECT to_char(date_trunc('day', f.created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
                    COUNT(DISTINCT f.document_id)::text AS count
             FROM flashcards f
             INNER JOIN documents d ON d.id = f.document_id AND d.deleted_at IS NULL
             WHERE f.created_at >= NOW() - $1::interval
             GROUP BY 1 ORDER BY 1`,
            [interval!]
          ),
      w.mode === 'all_time'
        ? pool.query<{ day: string; count: string }>(
            `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
                    COUNT(*)::text AS count
             FROM knowledge_graphs GROUP BY 1 ORDER BY 1`
          )
        : pool.query<{ day: string; count: string }>(
            `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
                    COUNT(*)::text AS count
             FROM knowledge_graphs WHERE created_at >= NOW() - $1::interval GROUP BY 1 ORDER BY 1`,
            [interval!]
          ),
      w.mode === 'all_time'
        ? pool.query<{ day: string; count: string }>(
            `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
                    COUNT(*)::text AS count
             FROM learning_paths GROUP BY 1 ORDER BY 1`
          )
        : pool.query<{ day: string; count: string }>(
            `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
                    COUNT(*)::text AS count
             FROM learning_paths WHERE created_at >= NOW() - $1::interval GROUP BY 1 ORDER BY 1`,
            [interval!]
          ),
    ])

  const tu = Number(totalUsers.rows[0]?.c ?? 1)
  const adoption = (distinct: number) => (tu > 0 ? Math.round((distinct / tu) * 10000) / 100 : 0)

  const feature = (
    key: string,
    label: string,
    total: number,
    distinctUsers: number,
    trend: { day: string; count: string }[]
  ) => ({
    key,
    label,
    totalUses: total,
    distinctUsers,
    adoptionRatePercent: adoption(distinctUsers),
    usesByDay: trend.map((r) => ({ day: r.day, count: Number(r.count) })),
  })

  return reply.send({
    data: {
      analyticsWindow: analyticsWindowPayload(w),
      days: w.mode === 'rolling' ? w.days : null,
      totalActiveUsers: tu,
      features: [
        feature(
          'ai_chat',
          'AI chat',
          Number(aiCount.rows[0]?.c ?? 0),
          Number(aiUsers.rows[0]?.c ?? 0),
          trendAi.rows
        ),
        feature(
          'summary',
          'Summaries',
          Number(sumCount.rows[0]?.c ?? 0),
          Number(sumUsers.rows[0]?.c ?? 0),
          trendSum.rows
        ),
        feature(
          'quiz',
          'Quizzes',
          Number(quizCount.rows[0]?.c ?? 0),
          Number(quizUsers.rows[0]?.c ?? 0),
          trendQuiz.rows
        ),
        feature(
          'flashcards',
          'Flashcards (documents)',
          Number(fcCount.rows[0]?.c ?? 0),
          Number(fcUsers.rows[0]?.c ?? 0),
          trendFc.rows
        ),
        feature(
          'knowledge_graph',
          'Knowledge graphs',
          Number(kgCount.rows[0]?.c ?? 0),
          Number(kgUsers.rows[0]?.c ?? 0),
          trendKg.rows
        ),
        feature(
          'learning_path',
          'Learning paths',
          Number(lpCount.rows[0]?.c ?? 0),
          Number(lpUsers.rows[0]?.c ?? 0),
          trendLp.rows
        ),
      ],
    },
  })
}
