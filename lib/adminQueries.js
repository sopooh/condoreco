import { createClient } from '@/lib/supabase/client'
import { revalidatePublic } from '@/lib/revalidate'

// ── Overview stats ──────────────────────────────────────────────────────────

export async function getOverviewStats() {
  const supabase = createClient()
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  const [
    users, buildings, publishedReviews, pendingReviews, openReports,
    active7d, active30d,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('buildings').select('*', { count: 'exact', head: true }),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('login_events').select('user_id', { count: 'exact', head: true }).gte('created_at', weekAgo),
    supabase.from('login_events').select('user_id', { count: 'exact', head: true }).gte('created_at', monthAgo),
  ])

  return {
    totalUsers: users.count ?? 0,
    totalBuildings: buildings.count ?? 0,
    totalReviews: publishedReviews.count ?? 0,
    pendingReviews: pendingReviews.count ?? 0,
    openReports: openReports.count ?? 0,
    activeUsers7d: active7d.count ?? 0,
    activeUsers30d: active30d.count ?? 0,
  }
}

export async function getGrowthStats() {
  const supabase = createClient()
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const twoMonthsAgo = new Date(Date.now() - 60 * 86400000).toISOString()

  const [newUsersThisMonth, newUsersLastMonth, newReviewsThisMonth, newReviewsLastMonth] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', monthAgo),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', twoMonthsAgo).lt('created_at', monthAgo),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('is_published', true).gte('created_at', monthAgo),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('is_published', true).gte('created_at', twoMonthsAgo).lt('created_at', monthAgo),
  ])

  const userGrowth = newUsersLastMonth.count > 0
    ? Math.round(((newUsersThisMonth.count - newUsersLastMonth.count) / newUsersLastMonth.count) * 100)
    : null
  const reviewGrowth = newReviewsLastMonth.count > 0
    ? Math.round(((newReviewsThisMonth.count - newReviewsLastMonth.count) / newReviewsLastMonth.count) * 100)
    : null

  return {
    newUsersThisMonth: newUsersThisMonth.count ?? 0,
    newReviewsThisMonth: newReviewsThisMonth.count ?? 0,
    userGrowthMoM: userGrowth,
    reviewGrowthMoM: reviewGrowth,
  }
}

// ── Login events ────────────────────────────────────────────────────────────

export async function recordLoginEvent(userId, email, userAgent) {
  const supabase = createClient()
  return supabase.from('login_events').insert({
    user_id: userId,
    email,
    user_agent: userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
  })
}

export async function getLoginEvents({ page = 0, limit = 50 } = {}) {
  const supabase = createClient()
  return supabase
    .from('login_events')
    .select('id, user_id, email, user_agent, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)
}

export async function getLoginsByDay(days = 7) {
  const supabase = createClient()
  const from = new Date(Date.now() - days * 86400000).toISOString()
  const { data } = await supabase
    .from('login_events')
    .select('created_at')
    .gte('created_at', from)

  const buckets = {}
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const key = d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
    buckets[key] = 0
  }
  ;(data || []).forEach(r => {
    const key = new Date(r.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
    if (key in buckets) buckets[key]++
  })
  return Object.entries(buckets).map(([label, value]) => ({ label, value }))
}

// ── Page views ──────────────────────────────────────────────────────────────

export async function recordPageView({ page, pageType, entityId, userId }) {
  const supabase = createClient()
  return supabase.from('page_views').insert({
    user_id: userId || null,
    page,
    page_type: pageType || null,
    entity_id: entityId || null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  })
}

export async function getTopPages(days = 30) {
  const supabase = createClient()
  const from = new Date(Date.now() - days * 86400000).toISOString()
  const { data } = await supabase
    .from('page_views')
    .select('page, page_type')
    .gte('created_at', from)

  const counts = {}
  ;(data || []).forEach(r => {
    counts[r.page] = (counts[r.page] || 0) + 1
  })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([page, count]) => ({ page, count }))
}

// ── Users ───────────────────────────────────────────────────────────────────

export async function getAllUsers({ search = '', status = '', page = 0, limit = 50 } = {}) {
  const supabase = createClient()
  // email e admin_status non sono leggibili sulla tabella (grant di colonna,
  // vedi migration 20260717): passano dalla vista admin_profiles, che
  // restituisce righe solo agli admin.
  let query = supabase
    .from('admin_profiles')
    .select('id, display_name, email, avatar_url, role, admin_status, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)

  if (search) query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`)
  if (status) query = query.eq('admin_status', status)

  return query
}

export async function updateUserStatus(userId, adminStatus, adminId) {
  const supabase = createClient()
  const result = await supabase
    .from('profiles')
    .update({ admin_status: adminStatus })
    .eq('id', userId)

  if (!result.error && adminId) {
    await logAdminAction(adminId, `user_${adminStatus}`, 'user', userId)
  }
  return result
}

// ── Buildings ───────────────────────────────────────────────────────────────

export async function getAllBuildings({ city = '', status = '', page = 0, limit = 50 } = {}) {
  const supabase = createClient()
  let query = supabase
    .from('buildings')
    .select('id, address, street_number, city, neighborhood, status, view_count, created_at, created_by', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)

  if (city) query = query.ilike('city', `%${city}%`)
  if (status) query = query.eq('status', status)

  return query
}

export async function updateBuildingStatus(buildingId, status, adminId) {
  const supabase = createClient()
  const result = await supabase
    .from('buildings')
    .update({ status })
    .eq('id', buildingId)

  if (!result.error && adminId) {
    await logAdminAction(adminId, `building_${status}`, 'building', buildingId)
  }
  return result
}

export async function getBuildingReviewCounts(buildingIds) {
  if (!buildingIds.length) return {}
  const supabase = createClient()
  const { data } = await supabase
    .from('reviews')
    .select('building_id')
    .in('building_id', buildingIds)
  return (data || []).reduce((acc, r) => {
    acc[r.building_id] = (acc[r.building_id] || 0) + 1
    return acc
  }, {})
}

// ── Reviews (recensioni condomini) ──────────────────────────────────────────

export async function getAllReviews({ status = 'pending', page = 0, limit = 50 } = {}) {
  const supabase = createClient()
  let query = supabase
    .from('reviews')
    .select(
      'id, building_id, user_id, score, body, resident_type, is_published, moderation_status, moderation_note, created_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)

  if (status && status !== 'all') query = query.eq('moderation_status', status)

  return query
}

export async function moderateReview(reviewId, action, note, adminId) {
  const supabase = createClient()
  const updates = { moderation_note: note || null }

  switch (action) {
    case 'approve':
      updates.moderation_status = 'approved'
      updates.is_published = true
      break
    case 'reject':
      updates.moderation_status = 'rejected'
      updates.is_published = false
      break
    case 'hide':
      updates.moderation_status = 'hidden'
      updates.is_published = false
      break
    case 'pending':
      updates.moderation_status = 'pending'
      updates.is_published = false
      break
    default:
      break
  }

  const result = await supabase.from('reviews').update(updates).eq('id', reviewId).select('id, building_id')
  if (!result.error && result.data?.[0]) await revalidatePublic({ buildings: [result.data[0].building_id] })

  if (!result.error && adminId) {
    await logAdminAction(adminId, `review_${action}`, 'review', reviewId, note)
  }
  return result
}

export async function deleteReview(reviewId, adminId) {
  const supabase = createClient()
  const result = await supabase.from('reviews').delete().eq('id', reviewId).select('id, building_id')
  if (!result.error && result.data?.[0]) await revalidatePublic({ buildings: [result.data[0].building_id] })
  if (!result.error && adminId) {
    await logAdminAction(adminId, 'review_deleted', 'review', reviewId)
  }
  return result
}

// ── Admin reviews (recensioni amministratori) ───────────────────────────────
// Stessa forma delle query su reviews sopra: moderation_status/moderation_note
// sono state aggiunte ad admin_reviews in Phase 0; le policy admin per
// leggerle/aggiornarle (is_admin()) esistono già.

export async function getAllAdminReviews({ status = 'pending', page = 0, limit = 50 } = {}) {
  const supabase = createClient()
  let query = supabase
    .from('admin_reviews')
    .select(
      'id, admin_id, user_id, score, body, is_published, moderation_status, moderation_note, created_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)

  if (status && status !== 'all') query = query.eq('moderation_status', status)

  return query
}

export async function moderateAdminReview(reviewId, action, note, adminId) {
  const supabase = createClient()
  const updates = { moderation_note: note || null }

  switch (action) {
    case 'approve':
      updates.moderation_status = 'approved'
      updates.is_published = true
      break
    case 'reject':
      updates.moderation_status = 'rejected'
      updates.is_published = false
      break
    case 'hide':
      updates.moderation_status = 'hidden'
      updates.is_published = false
      break
    case 'pending':
      updates.moderation_status = 'pending'
      updates.is_published = false
      break
    default:
      break
  }

  const result = await supabase.from('admin_reviews').update(updates).eq('id', reviewId).select('id, administrator_id, building_id')
  if (!result.error && result.data?.[0]) await revalidatePublic({ administrators: [result.data[0].administrator_id], buildings: [result.data[0].building_id] })

  if (!result.error && adminId) {
    await logAdminAction(adminId, `admin_review_${action}`, 'admin_review', reviewId, note)
  }
  return result
}

export async function deleteAdminReview(reviewId, adminId) {
  const supabase = createClient()
  const result = await supabase.from('admin_reviews').delete().eq('id', reviewId)
  if (!result.error && adminId) {
    await logAdminAction(adminId, 'admin_review_deleted', 'admin_review', reviewId)
  }
  return result
}

// ── Reports ─────────────────────────────────────────────────────────────────

export async function getAllReports({ status = '', type = '', page = 0, limit = 50 } = {}) {
  const supabase = createClient()
  let query = supabase
    .from('reports')
    .select('id, reporter_id, content_type, content_id, reason, body, status, admin_note, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)

  if (status) query = query.eq('status', status)
  if (type) query = query.eq('content_type', type)

  return query
}

export async function updateReport(reportId, { status, admin_note }, adminId) {
  const supabase = createClient()
  const result = await supabase
    .from('reports')
    .update({ status, admin_note })
    .eq('id', reportId)

  if (!result.error && adminId) {
    await logAdminAction(adminId, `report_${status}`, 'report', reportId, admin_note)
  }
  return result
}

// ── Admin logs ──────────────────────────────────────────────────────────────

export async function logAdminAction(adminId, action, contentType, contentId, note) {
  const supabase = createClient()
  return supabase.from('admin_logs').insert({
    admin_id: adminId,
    action,
    content_type: contentType || null,
    content_id: contentId || null,
    note: note || null,
  })
}

export async function getAdminLogs({ page = 0, limit = 50 } = {}) {
  const supabase = createClient()
  return supabase
    .from('admin_logs')
    .select('id, admin_id, action, content_type, content_id, note, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)
}

// ── Funding / Analytics ─────────────────────────────────────────────────────

export async function getFundingMetrics() {
  const supabase = createClient()
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const twoMonthsAgo = new Date(Date.now() - 60 * 86400000).toISOString()

  const [
    totalUsers, totalReviews, totalBuildings,
    newUsersWeek, newUsersMonth, newUsersLastMonth,
    newReviewsWeek, newReviewsMonth, newReviewsLastMonth,
    newBuildingsWeek, newBuildingsMonth,
    cityRows,
    neighborhoodRows,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabase.from('buildings').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', monthAgo),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', twoMonthsAgo).lt('created_at', monthAgo),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('is_published', true).gte('created_at', weekAgo),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('is_published', true).gte('created_at', monthAgo),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('is_published', true).gte('created_at', twoMonthsAgo).lt('created_at', monthAgo),
    supabase.from('buildings').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    supabase.from('buildings').select('*', { count: 'exact', head: true }).gte('created_at', monthAgo),
    supabase.from('buildings').select('city'),
    supabase.from('buildings').select('neighborhood').not('neighborhood', 'is', null),
  ])

  const cityCount = {}
  ;(cityRows.data || []).forEach(b => { cityCount[b.city] = (cityCount[b.city] || 0) + 1 })
  const topCities = Object.entries(cityCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }))

  const neighCount = {}
  ;(neighborhoodRows.data || []).forEach(b => { neighCount[b.neighborhood] = (neighCount[b.neighborhood] || 0) + 1 })
  const topNeighborhoods = Object.entries(neighCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }))

  const mau = newUsersMonth.count ?? 0
  const wau = newUsersWeek.count ?? 0
  const userGrowthMoM = newUsersLastMonth.count > 0
    ? Math.round(((mau - newUsersLastMonth.count) / newUsersLastMonth.count) * 100)
    : null
  const reviewGrowthMoM = newReviewsLastMonth.count > 0
    ? Math.round((((newReviewsMonth.count ?? 0) - newReviewsLastMonth.count) / newReviewsLastMonth.count) * 100)
    : null
  const total = totalUsers.count ?? 0
  const reviewsPerUser = total > 0 ? ((totalReviews.count ?? 0) / total).toFixed(2) : '0.00'

  return {
    totalUsers: total,
    totalReviews: totalReviews.count ?? 0,
    totalBuildings: totalBuildings.count ?? 0,
    mau,
    wau,
    newUsersWeek: wau,
    newUsersMonth: mau,
    newReviewsWeek: newReviewsWeek.count ?? 0,
    newReviewsMonth: newReviewsMonth.count ?? 0,
    newBuildingsWeek: newBuildingsWeek.count ?? 0,
    newBuildingsMonth: newBuildingsMonth.count ?? 0,
    userGrowthMoM,
    reviewGrowthMoM,
    reviewsPerUser,
    topCities,
    topNeighborhoods,
  }
}

// ── CSV Export ──────────────────────────────────────────────────────────────

export async function exportUsers() {
  const supabase = createClient()
  const { data } = await supabase
    .from('admin_profiles')
    .select('id, display_name, email, role, admin_status, created_at')
    .order('created_at', { ascending: false })
  return data || []
}

export async function exportBuildings() {
  const supabase = createClient()
  const { data } = await supabase
    .from('buildings')
    .select('id, address, street_number, city, neighborhood, status, view_count, created_at')
    .order('created_at', { ascending: false })
  return data || []
}

export async function exportReviews() {
  const supabase = createClient()
  const { data } = await supabase
    .from('reviews')
    .select('id, building_id, user_id, score, body, resident_type, is_published, moderation_status, created_at')
    .order('created_at', { ascending: false })
  return data || []
}

export async function exportReports() {
  const supabase = createClient()
  const { data } = await supabase
    .from('reports')
    .select('id, reporter_id, content_type, content_id, reason, body, status, created_at')
    .order('created_at', { ascending: false })
  return data || []
}

export function downloadCSV(data, filename) {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h] ?? ''
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Dashboard (pagina principale admin) ─────────────────────────────────────

// Variazione % del totale nel periodo: nuovi nel periodo rispetto al totale
// che c'era all'inizio del periodo. null se non calcolabile.
function pctOfBase(total, added) {
  const base = total - added
  if (base <= 0) return added > 0 ? null : 0
  return Math.round((added / base) * 1000) / 10
}

// Variazione % tra periodo corrente e periodo precedente di pari durata.
function pctChange(curr, prev) {
  if (!prev) return curr > 0 ? null : 0
  return Math.round(((curr - prev) / prev) * 1000) / 10
}

export async function getDashboardData(days = 30) {
  const supabase = createClient()
  const now = Date.now()
  const from = new Date(now - days * 86400000).toISOString()
  const prevFrom = new Date(now - 2 * days * 86400000).toISOString()

  const count = (q) => q.then(r => r.count ?? 0)
  const head = { count: 'exact', head: true }

  const [
    buildingsTotal, buildingsNew,
    usersTotal, usersNewRows,
    reportsOpen, reportsNew, reportsPrev,
    viewsNow, viewsPrev,
    reportRows,
    recentReports, recentUsers, recentBuildings,
  ] = await Promise.all([
    count(supabase.from('buildings').select('id', head)),
    count(supabase.from('buildings').select('id', head).gte('created_at', from)),
    count(supabase.from('profiles').select('id', head)),
    supabase.from('profiles').select('created_at').gte('created_at', from).then(r => r.data || []),
    count(supabase.from('reports').select('id', head).eq('status', 'open')),
    count(supabase.from('reports').select('id', head).gte('created_at', from)),
    count(supabase.from('reports').select('id', head).gte('created_at', prevFrom).lt('created_at', from)),
    count(supabase.from('page_views').select('id', head).gte('created_at', from)),
    count(supabase.from('page_views').select('id', head).gte('created_at', prevFrom).lt('created_at', from)),
    supabase.from('reports').select('status').then(r => r.data || []),
    supabase.from('reports').select('id, reason, content_type, created_at').order('created_at', { ascending: false }).limit(4).then(r => r.data || []),
    supabase.from('profiles').select('id, display_name, email, created_at').order('created_at', { ascending: false }).limit(4).then(r => r.data || []),
    supabase.from('buildings').select('id, address, street_number, city, created_at').order('created_at', { ascending: false }).limit(4).then(r => r.data || []),
  ])

  // Andamento utenti: totale cumulato giorno per giorno nel periodo
  const startTotal = Math.max(0, usersTotal - usersNewRows.length)
  const perDay = new Array(days + 1).fill(0)
  const dayStart = new Date(now - days * 86400000); dayStart.setHours(0, 0, 0, 0)
  usersNewRows.forEach(r => {
    const i = Math.floor((new Date(r.created_at) - dayStart) / 86400000)
    if (i >= 0 && i <= days) perDay[i]++
  })
  let run = startTotal
  const userSeries = perDay.map((n, i) => {
    run += n
    const d = new Date(dayStart.getTime() + i * 86400000)
    return { date: d, value: run }
  })

  const byStatus = { open: 0, reviewing: 0, resolved: 0 }
  reportRows.forEach(r => { if (r.status in byStatus) byStatus[r.status]++ })

  const activity = [
    ...recentReports.map(r => ({ kind: 'report', id: `r-${r.id}`, title: 'Nuova segnalazione', sub: r.reason || r.content_type, at: r.created_at })),
    ...recentUsers.map(u => ({ kind: 'user', id: `u-${u.id}`, title: 'Nuovo utente registrato', sub: u.email || u.display_name, at: u.created_at })),
    ...recentBuildings.map(b => ({ kind: 'building', id: `b-${b.id}`, title: 'Nuova abitazione aggiunta', sub: [`${b.address}${b.street_number ? `, ${b.street_number}` : ''}`, b.city].filter(Boolean).join(' · '), at: b.created_at })),
  ].filter(a => a.at).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 5)

  return {
    kpi: {
      buildings: { value: buildingsTotal, delta: pctOfBase(buildingsTotal, buildingsNew) },
      users: { value: usersTotal, delta: pctOfBase(usersTotal, usersNewRows.length) },
      reports: { value: reportsOpen, delta: pctChange(reportsNew, reportsPrev) },
      events: { value: viewsNow, delta: pctChange(viewsNow, viewsPrev) },
    },
    userSeries,
    reportsByStatus: byStatus,
    activity,
  }
}
