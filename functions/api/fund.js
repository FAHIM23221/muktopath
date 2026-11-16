// GET /api/fund — ফান্ডের পূর্ণ স্বচ্ছ হিসাব: সারাংশ, খরচের তালিকা, অপেক্ষমাণ ও যাচাই হওয়া অনুদান
import { json, fundSummary, getSettings } from '../_lib/utils.js';

export async function onRequestGet({ env }) {
  const db = env.DB;
  const summary = await fundSummary(db);
  const settings = await getSettings(db);
  const manualBeneficiaries = parseInt(settings.beneficiaries_count || '0', 10) || 0;

  const { results: expenses } = await db.prepare(
    'SELECT id, title, category, amount, spent_at, proof_url, note, beneficiaries FROM fund_expenses ORDER BY spent_at DESC, id DESC LIMIT 100'
  ).all();
  const { results: pending } = await db.prepare(
    "SELECT name, amount, method, created_at FROM donations WHERE status='pending' ORDER BY created_at DESC LIMIT 50"
  ).all();
  const { results: verified } = await db.prepare(
    "SELECT name, amount, method, message, verified_at FROM donations WHERE status='verified' ORDER BY verified_at DESC LIMIT 50"
  ).all();

  return json({
    ok: true,
    summary: { ...summary, beneficiaries: manualBeneficiaries + summary.expense_beneficiaries },
    expenses: expenses || [],
    pending_donations: pending || [],
    verified_donations: verified || [],
  });
}
