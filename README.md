# VAMOS — אתר טיולים בדרום ומרכז אמריקה

אתר סטטי (HTML/CSS/JS בלבד, בלי פריימוורק) שבנוי ל-SEO: כל עמוד הוא HTML אמיתי
שגוגל קורא בלי JavaScript.

---

## מבנה התיקיות

```
vamos/
├── index.html            דף הבית — מפה אינטראקטיבית + כתבות אחרונות
├── about.html            עמוד "עלינו" (ערכו את הטקסט ידנית)
├── countries/            עמוד לכל מדינה — נוצר אוטומטית! (אל תערכו ידנית)
├── articles/
│   ├── _template.html    תבנית להעתקה לכל כתבה חדשה
│   └── *.html            הכתבות שלכם
├── assets/
│   ├── css/style.css     כל העיצוב
│   ├── js/countries.js   מאגר המדינות (טקסטים, בירה, עונה, הדגשים)
│   ├── js/articles.js    ← רשימת הכתבות. המקום היחיד לרשום כתבה חדשה
│   ├── js/map-data.js    צורות המפה (נוצר ע"י tools-build-map.js — לא לגעת)
│   ├── js/site.js        לוגיקה: מפה, תפריטים, אנימציות
│   └── img/              תמונות (logo.png, favicon.png, og-default.jpg, articles/…)
├── build.js              סקריפט הבנייה
├── sitemap.xml           נוצר אוטומטית
└── robots.txt            נוצר אוטומטית
```

---

## איך מוסיפים כתבה חדשה (3 צעדים)

**1.** מעתיקים את `articles/_template.html` לשם חדש באנגלית, למשל
`articles/machu-picchu-guide.html`, וממלאים את התוכן (כל מה שמסומן ב-`‹‹ ››`).

**2.** מוסיפים רשומה **בראש** הרשימה ב-`assets/js/articles.js`:

```js
{
  slug: 'machu-picchu-guide',            // בדיוק כמו שם הקובץ, בלי .html
  country: 'peru',                        // slug של מדינה מתוך countries.js
  title: 'המדריך המלא למאצ׳ו פיצ׳ו',
  excerpt: 'משפט־שניים שמופיעים בכרטיסיה ובגוגל.',
  date: '2026-07-24',
  image: 'assets/img/articles/machu-picchu.jpg',
  tags: ['טרקים', 'מדריך'],
  readTime: 9
},
```

**3.** מריצים בטרמינל מתוך תיקיית האתר:

```bash
cd ~/vamos && node build.js
```

זהו. הכתבה תופיע אוטומטית בדף הבית, בעמוד המדינה, במפה (הספירה מתעדכנת),
ב-`sitemap.xml` וב"עוד מאותו יעד" של כתבות אחרות מאותה מדינה.

> ⚠️ עמודי `countries/*.html` **נוצרים מחדש** בכל בנייה. כדי לשנות טקסט של מדינה —
> עורכים את `assets/js/countries.js` ומריצים `node build.js`.

---

## מה צריך למלא לפני העלייה לאוויר

| מה | איפה |
|---|---|
| כתובת האתר האמיתית | `build.js` → `SITE.url` (וגם ה-`canonical` ב-`index.html`, `about.html` ובכל כתבה) |
| לינק לקבוצת הוואטסאפ | `build.js` → `SITE.whatsapp` |
| הלוגו | `assets/img/logo.png` (עד שהוא קיים מוצג לוגו זמני) |
| פאביקון | `assets/img/favicon.png` |
| תמונת שיתוף | `assets/img/og-default.jpg` (1200×630) |
| טקסט "עלינו" | `about.html` |

אחרי כל שינוי ב-`build.js` צריך להריץ שוב `node build.js`.

---

## הרצה מקומית

```bash
cd ~/vamos && python3 -m http.server 8931
```

ואז לפתוח <http://localhost:8931>

---

## המפה

`assets/js/map-data.js` מכיל את צורות המדינות (Mercator, נתוני Natural Earth —
נחלת הכלל). כדי להוסיף מדינה למפה: מוסיפים אותה ל-`MAIN` וגם ל-`LABELS` בקובץ
`tools-build-map.js`, מורידים את `ne_50m_admin_0_countries.geojson` לאותה תיקייה
ומריצים:

```bash
node tools-build-map.js assets/js/map-data.js
```

---

## גופנים

Heebo ו-Secular One **מאוחסנים מקומית** ב-`assets/fonts/` (מקור: Google Fonts, רישיון OFL),
וה-`@font-face` נמצא בראש `style.css`. אין אף בקשה חיצונית בטעינת האתר — טוב ל-Core Web Vitals
ולפרטיות. שתי תת-הקבוצות של העברית נטענות מראש (`rel="preload"`) — 17KB בסך הכול.

---

## עמוד 404

`404.html` מוכן. צריך להגיד לשרת להשתמש בו:

- **Netlify / Cloudflare Pages / GitHub Pages** — אוטומטי, אין מה לעשות.
- **Nginx** — להוסיף ל-server block:
  ```nginx
  error_page 404 /404.html;
  ```

---

## העלאה לאוויר

האתר סטטי לגמרי — אפשר להעלות את התיקייה כמו שהיא לכל אחסון:
Netlify / Cloudflare Pages / GitHub Pages / Nginx רגיל. אין שלב בנייה בשרת.

**לפני ההעלאה הראשונה:** להחליף את `SITE.url` ב-`build.js` בדומיין האמיתי, ואת
ה-`canonical` ב-`index.html`, `about.html`, `404.html` ובתבנית הכתבה — אחרת גוגל
יקבל canonical לדומיין שגוי ולא יאנדקס את האתר.
