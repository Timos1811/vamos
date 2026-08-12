#!/usr/bin/env node
/* ==========================================================================
   VAMOS — סקריפט בנייה
   מריצים מתוך תיקיית האתר:   node build.js
   מה הוא עושה:
     • מייצר מחדש את כל עמודי המדינות ב-countries/ (HTML סטטי מלא — טוב ל-SEO)
     • מזריק את התפריט/הפוטר/רשימות הכתבות לכל דף בין הסימונים
       <!-- BUILD:xxx --> ... <!-- /BUILD:xxx -->
     • מייצר sitemap.xml ו-robots.txt
   אין תלויות חיצוניות. Node 18+.
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

/* ------------------------------------------------- הגדרות אתר (ערכו כאן) -- */
const SITE = {
  url: 'https://www.vamos.co.il',           // ← הכתובת הסופית של האתר (בלי / בסוף)
  name: 'VAMOS',
  tagline: 'קהילת המטיילים של דרום אמריקה',
  description: 'מדריכים, מסלולים וטיפים לטיול בדרום ובמרכז אמריקה — ארגנטינה, צ׳ילה, פרו, בוליביה, קולומביה, אקוודור, ברזיל, אורוגוואי, פנמה, קוסטה ריקה, ניקרגואה, גואטמלה ומקסיקו.',
  whatsapp: 'https://chat.whatsapp.com/',   // ← לינק לקבוצת/ערוץ הוואטסאפ
  lang: 'he',
};

const ROOT = __dirname;
const COUNTRIES = require('./assets/js/countries.js');
const ARTICLES = require('./assets/js/articles.js');

/* ------------------------------------------------------------- helpers --- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const byCountry = (slug) => ARTICLES.filter((a) => a.country === slug)
  .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
const fmtDate = (iso) => {
  if (!iso) return '';
  const p = String(iso).split('-');
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : iso;
};

function inject(html, key, content) {
  const re = new RegExp(`(<!--\\s*BUILD:${key}\\s*-->)([\\s\\S]*?)(<!--\\s*/BUILD:${key}\\s*-->)`, 'g');
  if (!re.test(html)) return html;
  return html.replace(re, (_m, a, _b, c) => `${a}\n${content}\n${c}`);
}

/* --------------------------------------------------------------- header -- */
function header(base, active) {
  const menu = COUNTRIES.map((c) =>
    `        <li><a href="${base}countries/${c.slug}.html"><span class="flag">${c.flag}</span>${c.he}</a></li>`
  ).join('\n');

  return `<a class="skip-link" href="#main">דילוג לתוכן</a>
<header class="site-header">
  <div class="wrap header-bar">
    <a class="brand" href="${base}index.html" aria-label="${SITE.name} — דף הבית">
      <img class="brand-logo" src="${base}assets/img/logo.png" alt="${SITE.name}"
           onerror="this.remove();document.getElementById('brand-fb').hidden=false">
      <span class="brand-fallback" id="brand-fb" hidden>
        <svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="29" fill="none" stroke="#14201C" stroke-width="3"/>
          <circle cx="32" cy="27" r="13" fill="#F59A23"/>
          <path d="M8 44 L24 26 L34 38 L44 28 L58 44 Z" fill="#17635A"/>
          <rect x="6" y="44" width="52" height="14" fill="#2E8B7A"/>
        </svg>
        <span>
          <span class="brand-name">VAMOS</span>
        </span>
      </span>
    </a>

    <nav class="nav" aria-label="ניווט ראשי">
      <ul class="nav-list">
        <li><a class="nav-link" href="${base}index.html#map">מפה</a></li>
        <li class="has-menu">
          <button class="menu-btn" type="button" aria-expanded="false" aria-haspopup="true" aria-controls="countries-menu">
            מדינות
            <svg class="chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <ul class="menu-panel" id="countries-menu">
${menu}
          </ul>
        </li>
        <li><a class="nav-link" href="${base}index.html#latest">מידע</a></li>
        <li><a class="nav-link" href="${base}about.html">עלינו</a></li>
        <li><a class="btn btn-wa" style="padding:.5rem 1rem;font-size:.9rem" href="${SITE.whatsapp}" target="_blank" rel="noopener">קבוצת הוואטסאפ</a></li>
      </ul>

      <button class="burger" type="button" aria-expanded="false" aria-controls="mobile-drawer" aria-label="תפריט">
        <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true"><path d="M0 1h20M0 7h20M0 13h20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    </nav>
  </div>
</header>
<div class="drawer" id="mobile-drawer">
  <ul class="drawer-main">
    <li><a href="${base}index.html#map">🗺️ המפה האינטראקטיבית</a></li>
    <li><a href="${base}index.html#latest">📰 כל המידע</a></li>
    <li><a href="${base}about.html">🎒 עלינו</a></li>
    <li><a href="${SITE.whatsapp}" target="_blank" rel="noopener">💬 קבוצת הוואטסאפ</a></li>
  </ul>
  <h4>מדינות</h4>
  <ul class="drawer-grid">
${menu}
  </ul>
</div>
`;
}

/* --------------------------------------------------------------- footer -- */
function footer(base) {
  const half = Math.ceil(COUNTRIES.length / 2);
  const col = (arr) => arr.map((c) => `        <li><a href="${base}countries/${c.slug}.html">${c.flag} ${c.he}</a></li>`).join('\n');
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <a class="footer-brand" href="${base}index.html" aria-label="${SITE.name} — דף הבית">
          <img src="${base}assets/img/logo.png" alt="${SITE.name}" class="footer-logo">
        </a>
        <p style="font-size:.92rem;max-width:38ch">${SITE.tagline}. מדריכים, מסלולים וטיפים מהשטח לטיול הגדול בדרום ובמרכז אמריקה.</p>
        <a class="btn btn-wa" href="${SITE.whatsapp}" target="_blank" rel="noopener">הצטרפו לקבוצה</a>
      </div>
      <div>
        <h4>יעדים</h4>
        <ul>
${col(COUNTRIES.slice(0, half))}
        </ul>
      </div>
      <div>
        <h4>עוד יעדים</h4>
        <ul>
${col(COUNTRIES.slice(half))}
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} ${SITE.name}. כל הזכויות שמורות.</span>
      <span><a href="${base}index.html">דף הבית</a> · <a href="${base}about.html">עלינו</a></span>
    </div>
  </div>
</footer>`;
}

/* ---------------------------------------------------------- article card -- */
function card(a, base) {
  const c = COUNTRIES.find((x) => x.slug === a.country);
  const media = a.image
    ? `<img src="${base}${esc(a.image)}" alt="${esc(a.title)}" loading="lazy" width="640" height="400">`
    : `<span class="placeholder" aria-hidden="true">${c ? c.flag : '🧭'}</span>`;
  return `      <li class="card reveal">
        <a class="card-link" href="${base}articles/${esc(a.slug)}.html">
          <div class="card-media">${media}</div>
          <div class="card-body">
            <div class="card-meta">
              ${c ? `<span class="badge">${c.flag} ${c.he}</span>` : ''}
              <span>${fmtDate(a.date)}</span>${a.readTime ? `<span>· ${a.readTime} דק׳ קריאה</span>` : ''}
            </div>
            <h3>${esc(a.title)}</h3>
            <p>${esc(a.excerpt || '')}</p>
            <span class="card-more">לקריאה ←</span>
          </div>
        </a>
      </li>`;
}

function cardGrid(list, base, emptyText) {
  if (!list.length) {
    return `    <div class="empty-state">
      <div class="big">🧭</div>
      <p style="margin:0">${emptyText}</p>
    </div>`;
  }
  return `    <ul class="card-grid">\n${list.map((a) => card(a, base)).join('\n')}\n    </ul>`;
}

/* ------------------------------------------------------- country pages --- */
function countryPage(c) {
  const base = '../';
  const list = byCountry(c.slug);
  const title = `טיול ב${c.he} — מדריכים, מסלולים וטיפים | ${SITE.name}`;
  const desc = `כל מה שצריך לדעת על טיול ב${c.he}: ${c.tagline}. מסלולים, מחירים, עונות ומדריכים מהשטח.`;
  const canonical = `${SITE.url}/countries/${c.slug}.html`;

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'דף הבית', item: SITE.url + '/' },
          { '@type': 'ListItem', position: 2, name: c.he, item: canonical },
        ],
      },
      {
        '@type': 'CollectionPage',
        name: title,
        description: desc,
        url: canonical,
        inLanguage: 'he',
        about: { '@type': 'Country', name: c.he, alternateName: c.en },
      },
    ],
  };

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="noindex, nofollow">
<meta property="og:type" content="website">
<meta property="og:locale" content="he_IL">
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE.url}/assets/img/og-default.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${base}assets/img/favicon.png">
<link rel="preload" as="font" type="font/woff2" crossorigin href="${base}assets/fonts/heebo-v28-NGS6v5_NC0k9P9H0TbFhsqMA6aw.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="${base}assets/fonts/secularone-v14-8QINdiTajsj_87rMuMdKyqDgOOhZL4pL06U.woff2">
<link rel="stylesheet" href="${base}assets/css/style.css">
<noscript><style>.reveal{opacity:1;transform:none}</style></noscript>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body data-base="${base}">

<!-- BUILD:header -->
<!-- /BUILD:header -->

<main id="main">

  <section class="country-hero${c.heroImage ? ' has-photo' : ''}"${c.heroImage ? ` style="background-image:linear-gradient(180deg, rgba(10,10,15,.55), rgba(10,10,15,.75)), url('${base}${c.heroImage}')"` : ''}>
    <div class="wrap">
      <nav class="breadcrumb" aria-label="מיקום">
        <a href="${base}index.html">דף הבית</a><span class="sep">›</span>
        <span>${c.he}</span>
      </nav>
      <div class="flag-big" aria-hidden="true">${c.flag}</div>
      <h1>טיול ב${c.he}</h1>
      <p class="hero-lead">${esc(c.tagline)}</p>
      <ul class="facts">
        <li class="fact"><span class="k">בירה</span><span class="v">${esc(c.capital)}</span></li>
        <li class="fact"><span class="k">שפה</span><span class="v">${esc(c.language)}</span></li>
        <li class="fact"><span class="k">מטבע</span><span class="v">${esc(c.currency)}</span></li>
        <li class="fact"><span class="k">עונה מומלצת</span><span class="v">${esc(c.season)}</span></li>
      </ul>
    </div>
  </section>

  <section class="section" id="articles" style="padding-top:1.5rem">
    <div class="wrap">
      <div class="section-head">
        <div class="kicker">כל המידע</div>
        <h2>כל מה שצריך לדעת ב${c.he}</h2>
        <p>${list.length ? `${list.length === 1 ? 'פריט מידע אחד באתר' : list.length + ' פריטי מידע באתר'}` : 'המידע הראשון בדרך — בינתיים אפשר לעבור למפה ולראות יעדים אחרים.'}</p>
      </div>
<!-- BUILD:list -->
<!-- /BUILD:list -->
    </div>
  </section>

  <section class="section" style="padding-top:0">
    <div class="wrap">
      <div class="cta-band">
        <div>
          <h2>מטיילים ל${c.he}?</h2>
          <p>הצטרפו לקבוצת הוואטסאפ ותקבלו מסלולים, טיפים ועדכונים מהשטח.</p>
        </div>
        <a class="btn btn-primary" href="${SITE.whatsapp}" target="_blank" rel="noopener">לקבוצה →</a>
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:0">
    <div class="wrap">
      <div class="section-head"><h2>יעדים נוספים</h2></div>
      <ul class="chips">
${COUNTRIES.filter((x) => x.slug !== c.slug).map((x) => `        <li><a class="chip" href="${base}countries/${x.slug}.html">${x.flag} ${x.he} <span class="n">${byCountry(x.slug).length}</span></a></li>`).join('\n')}
      </ul>
    </div>
  </section>

</main>

<!-- BUILD:footer -->
<!-- /BUILD:footer -->

<script src="${base}assets/js/countries.js"></script>
<script src="${base}assets/js/articles.js"></script>
<script src="${base}assets/js/site.js"></script>
</body>
</html>
`;
}

/* --------------------------------------------------------------- sitemap -- */
function sitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${SITE.url}/`, pri: '1.0', lastmod: today },
    { loc: `${SITE.url}/about.html`, pri: '0.5', lastmod: today },
    ...COUNTRIES.map((c) => ({ loc: `${SITE.url}/countries/${c.slug}.html`, pri: '0.8', lastmod: today })),
    ...ARTICLES.map((a) => ({ loc: `${SITE.url}/articles/${a.slug}.html`, pri: '0.7', lastmod: a.date || today })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <priority>${u.pri}</priority>\n  </url>`).join('\n')}
</urlset>
`;
}

/* ------------------------------------------------------------------ run -- */
function walkHtml(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.html')).map((f) => path.join(dir, f));
}

function run() {
  let n = 0;

  // 1. country pages
  const dir = path.join(ROOT, 'countries');
  fs.mkdirSync(dir, { recursive: true });
  for (const c of COUNTRIES) {
    let html = countryPage(c);
    html = inject(html, 'header', header('../', c.slug));
    html = inject(html, 'footer', footer('../'));
    html = inject(html, 'list', cardGrid(byCountry(c.slug), '../', `עוד לא פרסמנו מידע על ${c.he}. חוזרים לכאן בקרוב — או שנפגשים בקבוצת הוואטסאפ.`));
    fs.writeFileSync(path.join(dir, c.slug + '.html'), html, 'utf8');
    n++;
  }

  // 2. root pages + article pages: refresh shared blocks
  const roots = walkHtml(ROOT).filter((f) => !path.basename(f).startsWith('_'));
  for (const file of roots) {
    let html = fs.readFileSync(file, 'utf8');
    const before = html;
    html = inject(html, 'header', header('', null));
    html = inject(html, 'footer', footer(''));
    const latest = ARTICLES.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    html = inject(html, 'latest', cardGrid(latest.slice(0, 9), '', 'עוד אין מידע באתר — הראשון יעלה בקרוב. בינתיים אפשר לשוטט במפה ולבחור יעד.'));
    html = inject(html, 'chips', COUNTRIES.map((c) =>
      `        <li><a class="chip" href="countries/${c.slug}.html">${c.flag} ${c.he} <span class="n">${byCountry(c.slug).length}</span></a></li>`).join('\n'));
    if (html !== before) { fs.writeFileSync(file, html, 'utf8'); n++; }
  }

  for (const file of walkHtml(path.join(ROOT, 'articles')).filter((f) => !path.basename(f).startsWith('_'))) {
    let html = fs.readFileSync(file, 'utf8');
    const before = html;
    const slug = path.basename(file, '.html');
    const meta = ARTICLES.find((a) => a.slug === slug);
    html = inject(html, 'header', header('../', meta ? meta.country : null));
    html = inject(html, 'footer', footer('../'));
    if (meta) {
      const related = byCountry(meta.country).filter((a) => a.slug !== slug).slice(0, 3);
      html = inject(html, 'related', cardGrid(related, '../', 'עוד מידע בדרך.'));
    }
    if (html !== before) { fs.writeFileSync(file, html, 'utf8'); n++; }
    if (!meta) console.warn(`  ⚠  ${path.basename(file)} — לא רשום ב-assets/js/articles.js`);
  }

  // 3. sitemap + robots
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap(), 'utf8');
  // ⚠️ שלב סטייג'ינג: האתר לא מיועד לאינדוקס עדיין — לפני עלייה לאוויר באמת,
  // מחליפים בחזרה ל: `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`
  fs.writeFileSync(path.join(ROOT, 'robots.txt'),
    `User-agent: *\nDisallow: /\n`, 'utf8');

  console.log(`✓ VAMOS build — ${COUNTRIES.length} מדינות, ${ARTICLES.length} פריטי מידע, ${n} קבצים עודכנו`);
}

run();
