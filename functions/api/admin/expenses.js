// /api/admin/expenses — GET তালিকা | POST নতুন খরচ | PUT/DELETE ?id= দিয়ে
import { json, error, readJson, clean, toInt } from '../../_lib/utils.js';
import { requireAdmin } from '../../_lib/admin.js';

export async function onRequestGet({ env, request }) {
  const { response } = await requireAdmin(request, env);
  if (response) return response;
  const { results } = await env.DB.prepare('SELECT * FROM fund_expenses ORDER BY spent_at DESC, id DESC').all();
  return json({ ok: true, expenses: results || [] });
}

function parseExpense(body) {
  const title = clean(body?.title, 200);
  const amount = toInt(body?.amount, 0);
  const spentAt = clean(body?.spent_at, 10);
  if (!title) return { err: 'খরচের শিরোনাম দরকার' };
  if (amount <= 0) return { err: 'সঠিক পরিমাণ দরকার' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spentAt)) return { err: 'তারিখ YYYY-MM-DD ফরম্যাটে দিন' };
  return {
    title, amount, spentAt,
    category: clean(body?.category, 80),
    proof_url: clean(body?.proof_url, 1000),
    note: clean(body?.note, 1000),
    beneficiaries: Math.max(0, toInt(body?.beneficiaries, 0)),
  };
}

export async function onRequestPost({ env, request }) {
  const { response } = await requireAdmin(request, env);
  if (response) return response;
  const v = parseExpense(await readJson(request));
  if (v.err) return error(v.err);
  const r = await env.DB.prepare(
    'INSERT INTO fund_expenses (title, category, amount, spent_at, proof_url, note, beneficiaries) VALUES (?1,?2,?3,?4,?5,?6,?7)'
  ).bind(v.title, v.category, v.amount, v.spentAt, v.proof_url, v.note, v.beneficiaries).run();
  return json({ ok: true, id: r.meta.last_row_id });
}

export async function onRequestPut({ env, request }) {
  const { response } = await requireAdmin(request, env);
  if (response) return response;
  const body = await readJson(request);
  const id = toInt(body?.id);
  const v = parseExpense(body);
  if (!id) return error('id দরকার');
  if (v.err) return error(v.err);
  await env.DB.prepare(
    'UPDATE fund_expenses SET title=?1, category=?2, amount=?3, spent_at=?4, proof_url=?5, note=?6, beneficiaries=?7 WHERE id=?8'
  ).bind(v.title, v.category, v.amount, v.spentAt, v.proof_url, v.note, v.beneficiaries, id).run();
  return json({ ok: true });
}

export async function onRequestDelete({ env, request }) {
  const { response } = await requireAdmin(request, env);
  if (response) return response;
  const id = toInt(new URL(request.url).searchParams.get('id'));
  if (!id) return error('id দরকার');
  await env.DB.prepare('DELETE FROM fund_expenses WHERE id = ?1').bind(id).run();
  return json({ ok: true });
}
