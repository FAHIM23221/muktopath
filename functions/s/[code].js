// GET /s/<code> — শর্ট লিংক: রিসোর্স পেজে রিডাইরেক্ট
export async function onRequestGet({ env, params, request }) {
  const row = await env.DB.prepare(
    "SELECT slug FROM resources WHERE short_code = ?1 AND status='published'"
  ).bind(params.code).first();
  if (!row) return new Response('লিংকটি পাওয়া যায়নি', { status: 404 });
  const target = new URL(`/resource.html?slug=${encodeURIComponent(row.slug)}`, request.url);
  return Response.redirect(target.toString(), 302);
}
