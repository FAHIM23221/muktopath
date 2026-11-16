// GET /api/stats — হোমপেজের লাইভ পরিসংখ্যান
import { json, fundSummary, getSettings } from '../_lib/utils.js';

export async function onRequestGet({ env }) {
  const db = env.DB;
  const res = await db.prepare(
    "SELECT COUNT(*) AS total, COALESCE(SUM(download_count),0) AS downloads FROM resources WHERE status='published'"
  ).first();
  const fund = await fundSummary(db);
  const settings = await getSettings(db);
  const manualBeneficiaries = parseInt(settings.beneficiaries_count || '0', 10) || 0;
  return json({
    ok: true,
    resources: res?.total || 0,
    downloads: res?.downloads || 0,
    beneficiaries: manualBeneficiaries + fund.expense_beneficiaries,
    fund_balance: fund.balance,
    fund_total_in: fund.total_in,
    fund_total_out: fund.total_out,
  });
}
