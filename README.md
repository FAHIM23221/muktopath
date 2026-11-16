# মুক্তপাঠ (MuktoPath)

> **টার্গেট GitHub রিপো:** `FAHIM23221/muktopath` (তৈরি করা আছে — খালি, পাবলিক, default branch `main`)।
> এই কোডবেস আপাতত লোকালেই আছে; পুশের ধাপ নিচে দেওয়া হলো।

ফ্রি রিসোর্স লাইব্রেরি ওয়েবসাইট — বই, গাইড, টেমপ্লেট ও টুলস অ্যাকাউন্ট ছাড়াই ফ্রি ডাউনলোড,
ঐচ্ছিক bKash/Nagad সাপোর্ট (Transaction ID যাচাইসহ), আর যাচাই হওয়া সাপোর্টের ১০% +
সরাসরি অনুদান নিয়ে গঠিত স্বচ্ছ "ভালো কাজের ফান্ড" — প্রতিটি খরচ প্রমাণসহ পাবলিক।

সম্পূর্ণ অরিজিনাল কোড ও ডিজাইন। কোনো বিল্ড স্টেপ নেই — স্ট্যাটিক ফ্রন্টএন্ড +
Cloudflare Pages Functions + D1 + R2।

## গঠন

```
public/            স্ট্যাটিক ফ্রন্টএন্ড (বাংলা UI)
  index.html       হোম (লাইভ স্ট্যাট, বাছাই করা রিসোর্স, ক্যাটাগরি, ফান্ড ঝলক)
  resources.html   সার্চ/ফিল্টার/সর্টসহ লাইব্রেরি
  resource.html    রিসোর্স বিস্তারিত (?slug=)
  support.html     সাপোর্ট + Trx জমা + সাপোর্টার তালিকা + মন্তব্য
  good-cause.html  ফান্ডের পূর্ণ হিসাব, খরচ, অনুদান ফর্ম
  contact.html     যোগাযোগ ফর্ম
  admin/           অ্যাডমিন প্যানেল (লগইন, ড্যাশবোর্ড, রিসোর্স, যাচাই, খরচ, মেসেজ, মন্তব্য, সেটিংস)
functions/         Pages Functions (ব্যাকএন্ড API)
  api/             পাবলিক API + api/admin/ (সেশন-সুরক্ষিত)
  s/[code].js      শর্ট লিংক রিডাইরেক্ট (/s/xxxxxx)
  _lib/            auth (PBKDF2 + সেশন), utils, ফান্ড হিসাব
schema.sql         D1 স্কিমা + ডিফল্ট ক্যাটাগরি ও সেটিংস
wrangler.toml      Pages কনফিগ (placeholder ID বদলাতে হবে)
```

## ডিপ্লয় — ধাপে ধাপে

### ১. GitHub-এ পুশ
রিপো তৈরি আছে: **FAHIM23221/muktopath** (খালি, পাবলিক, `main` ব্রাঞ্চ)। এই ফোল্ডার থেকে:
   ```bash
   git init && git add . && git commit -m "MuktoPath initial"
   git branch -M main
   git remote add origin https://github.com/FAHIM23221/muktopath.git
   git push -u origin main
   ```

### ২. Cloudflare-এ রিসোর্স তৈরি
[Cloudflare Dashboard](https://dash.cloudflare.com) → 
1. **Storage & Databases → D1** → Create database: নাম `muktopath-db` → তৈরি হলে **database ID** কপি করুন।
2. **R2** → Create bucket: নাম `muktopath-files`।
3. **Workers & Pages → Create → Pages → Connect to Git** → রিপোটি বেছে নিন:
   - Framework preset: **None**
   - Build command: *(খালি)*
   - Build output directory: `public`
   - Deploy করুন।

### ৩. বাইন্ডিং ও স্কিমা
1. Pages প্রজেক্ট → **Settings → Bindings**:
   - D1: variable name `DB` → `muktopath-db`
   - R2: variable name `BUCKET` → `muktopath-files`
   (অথবা `wrangler.toml`-এ আসল D1 ID বসিয়ে রিপোতে রাখুন — দুটোর একটা হলেই চলবে।)
2. ডাটাবেসে টেবিল তৈরি (লোকাল থেকে):
   ```bash
   npx wrangler login
   npx wrangler d1 execute muktopath-db --remote --file=schema.sql
   ```
3. **Settings → Environment variables and secrets** → Secret যোগ করুন:
   - `SETUP_TOKEN` = লম্বা এলোমেলো গোপন লেখা (শুধু প্রথম অ্যাডমিন তৈরির জন্য)।
4. একবার **Retry deployment** / নতুন push দিয়ে রি-ডিপ্লয় করুন যাতে বাইন্ডিং কার্যকর হয়।

### ৪. প্রথম অ্যাডমিন
1. ব্রাউজারে যান: `https://<আপনার-সাইট>.pages.dev/admin/`
2. "প্রথম অ্যাডমিন তৈরি করুন" ফর্মে SETUP_TOKEN, ইমেইল ও পাসওয়ার্ড (কমপক্ষে ১০ অক্ষর) দিন।
3. লগইন করুন → অ্যাডমিন প্যানেল থেকে bKash/Nagad নম্বরসহ সব সেটিংস বসান।
4. কাজ শেষে Cloudflare থেকে `SETUP_TOKEN` সিক্রেটটি **মুছে ফেলুন**।

### ৫. নিজের ডোমেইন (ঐচ্ছিক)
Pages প্রজেক্ট → **Custom domains** → ডোমেইন যোগ করুন, DNS নির্দেশনা অনুসরণ করুন।

## লোকাল টেস্ট

```bash
npx wrangler@latest d1 execute DB --local --file=schema.sql --persist-to ./.wrangler/state
npx wrangler@latest pages dev public --d1 DB --r2 BUCKET --persist-to ./.wrangler/state --binding SETUP_TOKEN=test-token-123
# ব্রাউজার: http://localhost:8788
```

## নিরাপত্তা নোট
- পাসওয়ার্ড PBKDF2-SHA256 (100k iteration) দিয়ে হ্যাশ হয়; সেশন টোকেন DB-তে হ্যাশ আকারে থাকে, কুকি HttpOnly + Secure।
- লগইনে রেট-লিমিট: একই ইমেইল+IP থেকে ১৫ মিনিটে ৫ বার ব্যর্থ হলে সাময়িক ব্লক।
- ডুপ্লিকেট Transaction ID ডাটাবেসের UNIQUE নিয়মে আটকে যায়।
- ফাইলের আসল R2 ঠিকানা পাবলিক API-তে যায় না — ডাউনলোড হয় কাউন্টারসহ `/api/download` দিয়ে।
- Turnstile এই সংস্করণে নেই — লগইন রেট-লিমিটই প্রাথমিক সুরক্ষা। (দরকার হলে পরে যোগ করা যাবে।)

## সীমাবদ্ধতা
- ফ্রি টিয়ার: D1 5GB, R2 10GB, Pages Functions দৈনিক ১ লাখ রিকোয়েস্ট — শুরুর জন্য যথেষ্ট।
- আপলোড সীমা: এক ফাইলে সর্বোচ্চ ~৯৫ MB।
