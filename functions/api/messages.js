// POST /api/messages — যোগাযোগ ফর্মের মেসেজ জমা
import { json, error, readJson, clean } from '../_lib/utils.js';

const CHANNELS = ['email', 'whatsapp', 'facebook'];
const TOPICS = ['general', 'download', 'support', 'request', 'other'];

export async function onRequestPost({ env, request }) {
  const body = await readJson(request);
  if (!body) return error('সঠিক তথ্য পাঠানো হয়নি');
  const name = clean(body.name, 100);
  const contact = clean(body.contact, 150);
  const channel = CHANNELS.includes(body.channel) ? body.channel : 'email';
  const topic = TOPICS.includes(body.topic) ? body.topic : 'general';
  const text = clean(body.body, 2000);
  if (!name) return error('আপনার নাম লিখুন');
  if (!contact) return error('উত্তর পাওয়ার মাধ্যম (ইমেইল/নম্বর/আইডি) লিখুন');
  if (!text) return error('মেসেজ লিখুন');
  await env.DB.prepare(
    'INSERT INTO messages (name, contact, channel, topic, body) VALUES (?1,?2,?3,?4,?5)'
  ).bind(name, contact, channel, topic, text).run();
  return json({ ok: true, message: 'মেসেজ পাঠানো হয়েছে! যত দ্রুত সম্ভব উত্তর দেওয়া হবে।' });
}
