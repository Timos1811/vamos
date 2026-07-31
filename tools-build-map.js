// Build a simplified SVG map (Mercator) of Latin America from Natural Earth 50m data.
const fs = require('fs');

const gj = JSON.parse(fs.readFileSync(__dirname + '/ne50.geojson', 'utf8'));

// slug -> ISO_A3
const MAIN = {
  mexico: 'MEX', 'costa-rica': 'CRI', colombia: 'COL', ecuador: 'ECU', peru: 'PER',
  bolivia: 'BOL', brazil: 'BRA', chile: 'CHL', argentina: 'ARG', uruguay: 'URY',
  panama: 'PAN', nicaragua: 'NIC', guatemala: 'GTM',
};
const CONTEXT = ['VEN', 'PRY', 'GUY', 'SUR', 'HND', 'SLV', 'BLZ', 'CUB', 'DOM', 'HTI', 'JAM', 'TTO', 'PRI', 'BHS', 'FLK'];

// viewport bbox in degrees (drop far-flung islands: Easter I., Galapagos, S. Georgia…)
const LON_MIN = -120, LON_MAX = -33, LAT_MIN = -56.5, LAT_MAX = 33.5;

const R = 1;
const mercX = (lon) => (lon * Math.PI) / 180;
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (Math.max(-84, Math.min(84, lat)) * Math.PI) / 180 / 2));

// --- projection extent
const W = 1000;
const x0 = mercX(LON_MIN), x1 = mercX(LON_MAX);
const y0 = mercY(LAT_MAX), y1 = mercY(LAT_MIN);
const scale = W / (x1 - x0);
const H = Math.round((y0 - y1) * scale);
const px = (lon) => (mercX(lon) - x0) * scale;
const py = (lat) => (y0 - mercY(lat)) * scale;

// --- Douglas-Peucker
function simplify(pts, tol) {
  if (pts.length < 4) return pts;
  const sq = tol * tol;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let maxD = -1, idx = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay;
    const len = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      const [cx, cy] = pts[i];
      let t = len ? ((cx - ax) * dx + (cy - ay) * dy) / len : 0;
      t = Math.max(0, Math.min(1, t));
      const ex = ax + t * dx - cx, ey = ay + t * dy - cy;
      const d = ex * ex + ey * ey;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > sq) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

function ringArea(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  }
  return Math.abs(a / 2);
}

function toPath(geom, tol, minArea) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  let d = '';
  for (const poly of polys) {
    const outer = poly[0];
    // skip polygons entirely outside the viewport
    let inside = false;
    for (const [lon, lat] of outer) {
      if (lon >= LON_MIN && lon <= LON_MAX && lat >= LAT_MIN && lat <= LAT_MAX) { inside = true; break; }
    }
    if (!inside) continue;
    for (const ring of poly) {
      let pts = ring.map(([lon, lat]) => [px(lon), py(lat)]);
      pts = simplify(pts, tol);
      if (pts.length < 4) continue;
      if (ringArea(pts) < minArea) continue;
      d += 'M' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') + 'Z';
    }
  }
  return d;
}

const iso = (f) => f.properties.ISO_A3 !== '-99' ? f.properties.ISO_A3 : (f.properties.ISO_A3_EH || f.properties.ADM0_A3);

const out = { width: W, height: H, main: {}, context: '' };

for (const [slug, code] of Object.entries(MAIN)) {
  const f = gj.features.find((f) => iso(f) === code);
  if (!f) { console.error('MISSING', slug, code); continue; }
  out.main[slug] = toPath(f.geometry, 0.7, 1.2);
}

let ctx = '';
for (const code of CONTEXT) {
  const f = gj.features.find((f) => iso(f) === code || f.properties.ADM0_A3 === code);
  if (!f) { console.error('missing context', code); continue; }
  ctx += toPath(f.geometry, 1.1, 3);
}
out.context = ctx;

// label anchors (lon, lat) hand-tuned so they sit inside the country
const LABELS = {
  mexico: [-102.5, 24.2], 'costa-rica': [-93.5, 7.5], colombia: [-73.6, 4.4], ecuador: [-81.8, -1.6],
  peru: [-75.2, -10.5], bolivia: [-64.6, -17.2], brazil: [-51.5, -11.5], chile: [-73.6, -38.5],
  argentina: [-65.2, -35.5], uruguay: [-51.6, -34.6],
  panama: [-74.5, 7.2], nicaragua: [-90.0, 11.5], guatemala: [-93.8, 16.5],
};
// small countries get a leader line from the label to the country
const LEADERS = {
  'costa-rica': [-91.4, 7.9, -84.6, 9.6],
  ecuador: [-80.3, -1.6, -78.6, -1.4],
  uruguay: [-53.4, -34.4, -55.6, -33.2],
  chile: [-72.4, -38.2, -71.2, -37.6],
  panama: [-74.5, 7.2, -80.0, 8.9],
  nicaragua: [-90.0, 11.5, -85.3, 12.6],
  guatemala: [-93.8, 16.5, -90.4, 15.4],
};
out.labels = {};
for (const [slug, [lon, lat]] of Object.entries(LABELS)) {
  out.labels[slug] = [+px(lon).toFixed(1), +py(lat).toFixed(1)];
}
out.leaders = {};
for (const [slug, [a, b, c, d]] of Object.entries(LEADERS)) {
  out.leaders[slug] = [+px(a).toFixed(1), +py(b).toFixed(1), +px(c).toFixed(1), +py(d).toFixed(1)];
}
out.smallLabels = ['costa-rica', 'uruguay', 'ecuador', 'panama', 'nicaragua', 'guatemala'];

fs.writeFileSync(process.argv[2], 'window.VAMOS_MAP = ' + JSON.stringify(out) + ';\n');
console.log('size', W, 'x', H, '| bytes', fs.statSync(process.argv[2]).size);
