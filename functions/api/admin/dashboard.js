// GET /api/admin/dashboard — ড্যাশবোর্ডের সব সংখ্যা ও সাম্প্রতিক কার্যকলাপ
import { json, fundSummary } from '../../_lib/utils.js';
import { requireAdmin } from '../../_lib/admin.js';

export async function onRequestGet({ env, request }) {
  const { response } = await requireAdmin(request, env);
  if (response) return response;
  const db = env.DB;

  const res = await db.prepare('SELECT COUNT(*) AS total, COALESCE(SUM(download_count),0) AS downloads FROM resources').first();
  const pub = await db.prepare("SELECT COUNT(*) AS cnt FROM resources WHERE status='published'").first();
  const today = await db.prepare("SELECT COUNT(*) AS cnt FROM downloads WHERE date(created_at)=date('now')").first();
  const pendingSupport = await db.prepare("SELECT COUNT(*) AS cnt FROM support_payments WHERE status='pending'").first();
  const pendingDonations = await db.prepare("SELECT COUNT(*) AS cnt FROM donations WHERE status='pending'").first();
  const pendingComments = await db.prepare("SELECT COUNT(*) AS cnt FROM comments WHERE status='pending'").first();
  const unreadMessages = await db.prepare("SELECT COUNT(*) AS cnt FROM messages WHERE status='unread'").first();
  const fund = await fundSummary(db);

  const { results: recentDownloads } = await db.prepare(
    `SELECT r.title, d.created_at FROM downloads d JOIN resources r ON r.id=d.resource_id ORDER BY d.id DESC LIMIT 8`
  ).all();
  const { results: recentPayments } = await db.prepare(
    `SELECT name, amount, method, status, created_at, 'support' AS kind FROM support_payments
     UNION ALL SELECT name, amount, method, status, created_at, 'donation' AS kind FROM donations
     ORDER BY created_at DESC LIMIT 8`
  ).all();

  return json({
    ok: true,
    totals: {
      resources: res?.total || 0,
      resources_published: pub?.cnt || 0,
      downloads: res?.downloads || 0,
      downloads_today: today?.cnt || 0,
    },
    pending: {
      support: pendingSupport?.cnt || 0,
      donations: pendingDonations?.cnt || 0,
      comments: pendingComments?.cnt || 0,
      messages_unread: unreadMessages?.cnt || 0,
    },
    fund,
    recent_downloads: recentDownloads || [],
    recent_payments: recentPayments || [],
  });
}
