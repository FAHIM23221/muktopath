/* মুক্তপাঠ — সব পাবলিক পেজের কমন স্ক্রিপ্ট: হেডার/ফুটার, সেটিংস, API হেল্পার */
'use strict';

// XSS ঠেকাতে সব ডায়নামিক লেখা escape করে বসানো হয়
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function bnNum(n) {
  return Number(n || 0).toLocaleString('bn-BD');
}
function taka(n) { return '৳' + bnNum(n); }
function fmtDate(s) {
  if (!s) return '';
  const d = new Date(String(s).replace(' ', 'T'));
  return isNaN(d) ? esc(s) : d.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
}
async function api(path, options) {
  const res = await fetch(path, options);
  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok || (data && data.ok === false)) {
    throw new Error((data && data.error) || 'কিছু একটা সমস্যা হয়েছে');
  }
  return data;
}
function apiPost(path, body) {
  return api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

let SITE = { site_name: 'মুক্তপাঠ', tagline: '' };
async function loadSite() {
  try {
    const d = await api('/api/settings');
    SITE = { ...SITE, ...d.settings };
  } catch { /* ডিফল্ট মানেই চলবে */ }
  renderChrome();
  document.title = document.title.replace('মুক্তপাঠ', SITE.site_name);
  return SITE;
}

function renderChrome() {
  const page = document.body.dataset.page || '';
  const nav = [
    ['index', '/', 'হোম'],
    ['resources', '/resources.html', 'সব রিসোর্স'],
    ['support', '/support.html', 'সাপোর্ট করুন'],
    ['good-cause', '/good-cause.html', 'ভালো কাজের ফান্ড'],
    ['contact', '/contact.html', 'যোগাযোগ'],
  ];
  const header = document.getElementById('site-header');
  if (header) {
    header.innerHTML = `<div class="container">
      <a class="logo" href="/"><span class="mark">মু</span><span>${esc(SITE.site_name)}</span></a>
      <nav class="main-nav">${nav.map(([k, href, lbl]) =>
        `<a href="${href}" class="${page === k ? 'active' : ''}">${lbl}</a>`).join('')}
      </nav></div>`;
  }
  const footer = document.getElementById('site-footer');
  if (footer) {
    const socials = [
      SITE.facebook_url ? `<a href="${esc(SITE.facebook_url)}" target="_blank" rel="noopener">Facebook</a>` : '',
      SITE.youtube_url ? `<a href="${esc(SITE.youtube_url)}" target="_blank" rel="noopener">YouTube</a>` : '',
      SITE.contact_email ? `<a href="mailto:${esc(SITE.contact_email)}">${esc(SITE.contact_email)}</a>` : '',
    ].filter(Boolean).join(' · ');
    footer.innerHTML = `<div class="container">
      <div class="footer-grid">
        <div><strong style="color:#fff;font-size:1.15rem">${esc(SITE.site_name)}</strong>
          <p>${esc(SITE.tagline)}</p></div>
        <div>${nav.map(([, href, lbl]) => `<div><a href="${href}">${lbl}</a></div>`).join('')}</div>
        <div>${socials}</div>
      </div>
      <div class="footer-bottom">© <span id="yr"></span> ${esc(SITE.site_name)} — সব রিসোর্স ফ্রি। সাপোর্টের ১০% যায় ভালো কাজে।</div>
    </div>`;
    const yr = document.getElementById('yr');
    if (yr) yr.textContent = new Date().getFullYear();
  }
}

function resourceCard(r) {
  const cover = r.cover_url
    ? `<img src="${esc(r.cover_url)}" alt="" style="border-radius:10px;width:100%;height:150px;object-fit:cover">` : '';
  return `<article class="card">${cover}
    <div class="meta-row"><span class="badge">${esc(r.category_name || 'সাধারণ')}</span>
    ${r.is_featured ? '<span class="badge badge-amber">বাছাই করা</span>' : ''}
    ${r.file_type ? `<span>${esc(r.file_type).toUpperCase()}</span>` : ''}</div>
    <h3><a href="/resource.html?slug=${encodeURIComponent(r.slug)}">${esc(r.title)}</a></h3>
    <p class="desc">${esc((r.description || '').slice(0, 140))}</p>
    <div class="meta-row"><span>⬇ ${bnNum(r.download_count)} বার ডাউনলোড</span>
    ${r.file_size ? `<span>${esc(r.file_size)}</span>` : ''}</div>
    <a class="btn btn-green btn-small" href="/resource.html?slug=${encodeURIComponent(r.slug)}">বিস্তারিত দেখুন</a>
  </article>`;
}

function showFormMsg(el, text, ok) {
  el.textContent = text;
  el.className = 'form-msg ' + (ok ? 'ok' : 'err');
}
function formHandler(formId, msgId, fn) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById(msgId);
    const btn = form.querySelector('button[type=submit]');
    if (btn) btn.disabled = true;
    try {
      const text = await fn(new FormData(form));
      showFormMsg(msg, text, true);
      form.reset();
    } catch (err) {
      showFormMsg(msg, err.message, false);
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}
function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const old = btn.textContent; btn.textContent = 'কপি হয়েছে ✓';
    setTimeout(() => { btn.textContent = old; }, 1600);
  });
}
