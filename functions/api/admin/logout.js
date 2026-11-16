// POST /api/admin/logout — সেশন মুছে কুকি পরিষ্কার
import { json } from '../../_lib/utils.js';
import { destroySession, clearCookieHeader } from '../../_lib/auth.js';

export async function onRequestPost({ env, request }) {
  await destroySession(request, env.DB);
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookieHeader() });
}
