// GET /api/settings — পাবলিক সেটিংস (নাম, ট্যাগলাইন, পেমেন্ট নম্বর, সোশ্যাল)
import { json, getSettings, publicSettings } from '../_lib/utils.js';

export async function onRequestGet({ env }) {
  const s = await getSettings(env.DB);
  return json({ ok: true, settings: publicSettings(s) });
}
