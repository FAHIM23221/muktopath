// /api/donations — POST: ভালো কাজের ফান্ডে সরাসরি অনুদান জমা
import { json, error, readJson, clean, toInt, isValidTrx } from '../_lib/utils.js';

export async function onRequestPost({ env, request }) {
  const body = await readJson(request);
  if (!body) return error('সঠিক তথ্য পাঠানো হয়নি');
  const name = clean(body.name, 100);
  const phone = clean(body.phone, 30);
  const method = body.method === 'nagad' ? 'nagad' : 'bkash';
  const amount = toInt(body.amount, 0);
  const trxId = clean(body.trx_id, 20).toUpperCase();
  const message = clean(body.message, 300);

  if (!name) return error('আপনার নাম লিখুন');
  if (amount <= 0) return error('সঠিক পরিমাণ লিখুন');
  if (!isValidTrx(trxId)) return error('সঠিক Transaction ID লিখুন (৬–২০ অক্ষর)');

  try {
    await env.DB.prepare(
      'INSERT INTO donations (name, phone, method, amount, trx_id, message) VALUES (?1,?2,?3,?4,?5,?6)'
    ).bind(name, phone, method, amount, trxId, message).run();
  } catch (e) {
    if (String(e.message || e).includes('UNIQUE')) {
      return error('এই Transaction ID আগেই জমা দেওয়া হয়েছে', 409);
    }
    throw e;
  }
  return json({ ok: true, message: 'অনুদান জমা হয়েছে! যাচাইয়ের পর ফান্ডে যোগ হবে।' });
}
