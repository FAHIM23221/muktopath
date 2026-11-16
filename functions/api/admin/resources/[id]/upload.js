// POST /api/admin/resources/:id/upload — multipart ফাইল আপলোড → R2, file_key সেট হয়
import { json, error, toInt } from '../../../../_lib/utils.js';
import { requireAdmin } from '../../../../_lib/admin.js';

const MAX_BYTES = 95 * 1024 * 1024; // R2 ফ্রি ব্যবহারের জন্য নিরাপদ সীমা

export async function onRequestPost({ env, request, params }) {
  const { response } = await requireAdmin(request, env);
  if (response) return response;
  if (!env.BUCKET) return error('R2 বাকেট (BUCKET) বাইন্ডিং সেট করা হয়নি', 503);
  const id = toInt(params.id);
  const row = await env.DB.prepare('SELECT id FROM resources WHERE id = ?1').bind(id).first();
  if (!row) return error('রিসোর্স পাওয়া যায়নি', 404);

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return error('ফাইল পাঠানো হয়নি');
  if (file.size > MAX_BYTES) return error('ফাইল খুব বড় (সর্বোচ্চ ৯৫ MB)');

  const safeName = (file.name || 'file').replace(/[^\w.\-]+/g, '_').slice(0, 100);
  const key = `resources/${id}/${Date.now()}-${safeName}`;
  await env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });
  const sizeMb = file.size >= 1048576
    ? `${(file.size / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(file.size / 1024))} KB`;
  await env.DB.prepare("UPDATE resources SET file_key=?1, file_size=?2, updated_at=datetime('now') WHERE id=?3")
    .bind(key, sizeMb, id).run();
  return json({ ok: true, file_key: key, file_size: sizeMb });
}
