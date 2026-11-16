// GET /api/files/<key...> — R2 বাকেট থেকে ফাইল সার্ভ (ডাউনলোড হেডারসহ)
export async function onRequestGet({ env, params }) {
  if (!env.BUCKET) return new Response('ফাইল স্টোরেজ সেটআপ হয়নি', { status: 503 });
  const key = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  if (!key || key.includes('..')) return new Response('Not found', { status: 404 });
  const obj = await env.BUCKET.get(key);
  if (!obj) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  const filename = key.split('/').pop();
  headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  if (!headers.get('Content-Type')) headers.set('Content-Type', 'application/octet-stream');
  return new Response(obj.body, { headers });
}
