/* মুক্তপাঠ — অ্যাডমিন প্যানেলের কমন স্ক্রিপ্ট */
'use strict';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function bnNum(n) { return Number(n || 0).toLocaleString('bn-BD'); }
function taka(n) { return '৳' + bnNum(n); }
function fmtDate(s) {
  if (!s) return '';
  const d = new Date(String(s).replace(' ', 'T'));
  return isNaN(d) ? esc(s) : d.toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' });
}
async function api(path, options) {
  const res = await fetch(path, options);
  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }
  if (res.status === 401) { location.href = '/admin/login.html'; throw new Error('লগইন করা নেই'); }
  if (!res.ok || (data && data.ok === false)) throw new Error((data && data.error) || 'সমস্যা হয়েছে');
  return data;
}
const apiGet = (p) => api(p);
const apiSend = (p, method, body) => api(p, {
  method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
});

const ADMIN_NAV = [
  ['dashboard', '/admin/', '📊 ড্যাশবোর্ড'],
  ['resources', '/admin/resources.html', '📚 রিসোর্স'],
  ['categories', '/admin/categories.html', '🗂 ক্যাটাগরি'],
  ['payments', '/admin/payments.html', '✅ যাচাই (সাপোর্ট/অনুদান)'],
  ['expenses', '/admin/expenses.html', '💚 ফান্ডের খরচ'],
  ['messages', '/admin/messages.html', '✉️ মেসেজ'],
  ['comments', '/admin/comments.html', '💬 মন্তব্য'],
  ['settings', '/admin/settings.html', '⚙️ সেটিংস'],
];

async function adminShell(active) {
  // লগইন যাচাই — না থাকলে login পেজে
  const me = await api('/api/admin/me').catch(() => null);
  if (!me || !me.admin) { location.href = '/admin/login.html'; throw new Error('redirect'); }
  const side = document.getElementById('admin-side');
  if (side) {
    side.innerHTML = `<h2>মুক্তপাঠ — অ্যাডমিন</h2>
      ${ADMIN_NAV.map(([k, href, lbl]) => `<a href="${href}" class="${active === k ? 'active' : ''}">${lbl}</a>`).join('')}
      <a href="/" target="_blank">🌐 সাইট দেখুন</a>
      <a href="#" id="logout-link">🚪 লগআউট (${esc(me.admin.email)})</a>`;
    document.getElementById('logout-link').addEventListener('click', async (e) => {
      e.preventDefault();
      await apiSend('/api/admin/logout', 'POST').catch(() => {});
      location.href = '/admin/login.html';
    });
  }
  return me.admin;
}
function statusBn(s) {
  return { pending: 'অপেক্ষমাণ', verified: 'যাচাই হয়েছে', rejected: 'বাতিল', approved: 'অনুমোদিত', unread: 'অপঠিত', read: 'পঠিত', replied: 'উত্তর হয়েছে' }[s] || s;
}
