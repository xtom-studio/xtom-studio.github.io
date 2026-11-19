/* XTOM demos, ported from the previous site (index_9.html): the maker's mark geometry,
   Muthair's signature, the gold easter egg, the field and archive diagrams, the Achso!,
   Canopy and XTOM M.2 opening animations and feature tours, the live turbofan and the
   Achso! early-access form. Logic is unchanged; only image sources now point at files. */
(() => {
'use strict';
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const rm = matchMedia('(prefers-reduced-motion: reduce)');
let motionOK = !rm.matches;
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const isDark = () => root.dataset.theme === 'dark';
const isGold = () => root.classList.contains('gold');
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
function fit(cv, cap = 1.5) {
  const dpr = Math.min(cap, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  const W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [ctx, w, h];
}


/* ---------- XTOM maker's mark (same geometry as the apps) ---------- */
const PAL = {
  chrome: ['#FFFFFF', '#D5DAE2', '#7D8696', '#EEF1F5', '#8E97A6'],
  graphite: ['#8C98AC', '#3A4558', '#0B1424', '#5A667C', '#1A2434'],
  gold: ['#FFF6CF', '#F2C55C', '#B07A1E', '#FFE39A', '#9C6A14']
};
const variant = () => isGold() ? 'gold' : isDark() ? 'chrome' : 'graphite';
const XTOM = {
  boxes: [[-1.38, 0.5, 0.085, 0.58, 31], [-1.38, 0.5, 0.085, 0.58, -31], [-0.45, 0.93, 0.36, 0.085, 0], [-0.45, 0.45, 0.085, 0.45, 0]],
  // M redrawn from the Outfit Medium glyph (straight stems, diagonals meeting in a flat vertex), stems kept at the mark's stroke width
  M: [[1.015, 0], [1.015, 1], [1.1293, 1], [1.4649, 0.3771], [1.8004, 1], [1.9147, 1], [1.9147, 0], [1.7505, 0], [1.7505, 0.64], [1.5145, 0.1943], [1.4152, 0.1943], [1.1793, 0.64], [1.1793, 0]],
  minX: -1.80, maxX: 1.96, minY: -0.12, maxY: 1.12,
  polySdf(x, y) {
    const P = this.M; let d = 1e9, inside = false;
    for (let i = 0, k = P.length - 1; i < P.length; k = i++) {
      const xi = P[i][0], yi = P[i][1], xk = P[k][0], yk = P[k][1], ex = xk - xi, ey = yk - yi, wx = x - xi, wy = y - yi;
      const t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey)), dx = wx - ex * t, dy = wy - ey * t; d = Math.min(d, dx * dx + dy * dy);
      if ((yi > y) !== (yk > y) && x < (xk - xi) * (y - yi) / (yk - yi) + xi) inside = !inside;
    }
    return (inside ? -1 : 1) * Math.sqrt(d);
  },
  sdf(x, y) {
    let d = 1e9;
    for (const b of this.boxes) {
      const th = b[4] * Math.PI / 180, c = Math.cos(th), s = Math.sin(th), dx = x - b[0], dy = y - b[1];
      const lx = dx * c + dy * s, ly = -dx * s + dy * c, qx = Math.abs(lx) - b[2], qy = Math.abs(ly) - b[3];
      const o = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0);
      if (o < d) d = o;
    }
    return Math.min(d, this.polySdf(x, y), Math.abs(Math.hypot(x - 0.46, y - 0.5) - 0.38) - 0.095);
  },
  drawAt(ctx, ox, oy, s, v, shine) {
    const X = x => ox + x * s, Y = y => oy - y * s, top = Y(this.maxY), bot = Y(this.minY), cols = PAL[v];
    const g = ctx.createLinearGradient(0, top, 0, bot); [0, 0.38, 0.52, 0.7, 1].forEach((p, i) => g.addColorStop(p, cols[i]));
    const path = new Path2D();
    for (const b of this.boxes) {
      const cx = X(b[0]), cy = Y(b[1]), hw = b[2] * s, hh = b[3] * s, a = -b[4] * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
      const pts = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => [cx + x * ca - y * sa, cy + x * sa + y * ca]);
      path.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => path.lineTo(p[0], p[1])); path.closePath();
    }
    this.M.forEach((p, i) => i ? path.lineTo(X(p[0]), Y(p[1])) : path.moveTo(X(p[0]), Y(p[1]))); path.closePath();
    ctx.fillStyle = g; ctx.fill(path);
    ctx.strokeStyle = g; ctx.lineWidth = 0.19 * s; ctx.beginPath(); ctx.arc(X(0.46), Y(0.5), 0.38 * s, 0, 7); ctx.stroke();
    ctx.strokeStyle = v === 'graphite' ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.beginPath(); ctx.arc(X(0.46), Y(0.5), 0.38 * s + 0.095 * s - 0.5, 0, 7); ctx.stroke();
    if (shine > -0.4 && shine < 1.4) {
      const x0 = X(this.minX) + (X(this.maxX) - X(this.minX)) * shine;
      const sg = ctx.createLinearGradient(x0 - s * 0.35, top, x0 + s * 0.35, bot);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, v === 'graphite' ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.85)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save(); ctx.fillStyle = sg; ctx.fill(path); ctx.strokeStyle = sg; ctx.lineWidth = 0.19 * s; ctx.beginPath(); ctx.arc(X(0.46), Y(0.5), 0.38 * s, 0, 7); ctx.stroke(); ctx.restore();
    }
  }
};
const ASPECT = (XTOM.maxX - XTOM.minX) / (XTOM.maxY - XTOM.minY);
const marks = $$('canvas.xmark').map(cv => { const h = +cv.dataset.h || 30; cv.style.height = h + 'px'; cv.style.width = Math.round(h * ASPECT) + 'px'; return { cv, shine: -1, busy: false }; });
function drawMark(m) {
  const [ctx, W, H] = fit(m.cv); ctx.clearRect(0, 0, W, H);
  const s = Math.min(W / (XTOM.maxX - XTOM.minX), H / (XTOM.maxY - XTOM.minY));
  const ox = (W - (XTOM.maxX - XTOM.minX) * s) / 2 - XTOM.minX * s, oy = (H - (XTOM.maxY - XTOM.minY) * s) / 2 + XTOM.maxY * s;
  XTOM.drawAt(ctx, ox, oy, s, variant(), m.shine);
}
function shineMark(m) {
  if (!motionOK || m.busy) return; m.busy = true; const t0 = performance.now();
  const step = now => { const e = (now - t0) / 1100; m.shine = e * 1.8 - 0.4; drawMark(m); if (e < 1) requestAnimationFrame(step); else { m.shine = -1; m.busy = false; drawMark(m); } };
  requestAnimationFrame(step);
}
const drawMarks = () => marks.forEach(drawMark);
marks.forEach(m => { const host = m.cv.closest('a, .logo, .foot > div') || m.cv; host.addEventListener('pointerenter', () => shineMark(m)); });


/* ---------- the exact "Muthair" signature from the apps ---------- */
const SIG = (() => {
  const STROKES = [[14, 92, 13, 87, 16, 80, 22, 56, 31, 28, 38, 13, 43, 16, 45, 40, 46, 66, 47, 88, 51, 64, 58, 32, 66, 15, 72, 14, 75, 30, 76, 58, 77, 88, 81, 64, 88, 32, 96, 15, 102, 14, 105, 30, 106, 58, 108, 84, 114, 91, 122, 88, 128, 74, 132, 58, 133, 74, 136, 87, 143, 91, 150, 84, 154, 68, 156, 58, 157, 74, 159, 87, 166, 91, 174, 84, 180, 66, 186, 40, 191, 22, 189, 44, 187, 68, 189, 86, 196, 91, 204, 86, 210, 70, 218, 42, 226, 18, 231, 10, 227, 20, 220, 44, 216, 68, 214, 90, 218, 74, 225, 60, 233, 57, 238, 66, 238, 80, 242, 89, 250, 86, 258, 70, 267, 57, 258, 53, 249, 58, 244, 70, 245, 84, 252, 90, 261, 86, 267, 72, 270, 57, 270, 74, 272, 88, 279, 91, 287, 84, 291, 70, 293, 58, 293, 74, 295, 88, 302, 91, 310, 84, 314, 70, 317, 58, 324, 61, 330, 57, 328, 72, 329, 88, 338, 95, 350, 100, 357, 106, 355, 111, 344, 114, 300, 115, 220, 115, 140, 117, 70, 120, 34, 124], [170, 40, 184, 37, 200, 35, 216, 36]];
  const SEG = 10, SLANT = 0.22, BASE = 3.2; let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, total = 0;
  const cat = (p0, p1, p2, p3, t) => 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  const strokes = STROKES.map(s => {
    const n = s.length / 2, px = [], py = [];
    for (let i = 0; i < n; i++) { px.push(s[i * 2] + (90 - s[i * 2 + 1]) * SLANT); py.push(s[i * 2 + 1]); }
    const x = [], y = [];
    for (let i = 0; i < n - 1; i++) { const i0 = Math.max(0, i - 1), i3 = Math.min(n - 1, i + 2); for (let j = 0; j < SEG; j++) { const t = j / SEG; x.push(cat(px[i0], px[i], px[i + 1], px[i3], t)); y.push(cat(py[i0], py[i], py[i + 1], py[i3], t)); } }
    x.push(px[n - 1]); y.push(py[n - 1]);
    const a = [0]; for (let i = 1; i < x.length; i++) a.push(a[i - 1] + Math.hypot(x[i] - x[i - 1], y[i] - y[i - 1]));
    const len = a[a.length - 1], w = [0];
    for (let i = 1; i < x.length; i++) { const ang = Math.atan2(y[i] - y[i - 1], x[i] - x[i - 1]) + 0.6981317; w.push(BASE * (0.3 + 0.7 * Math.abs(Math.sin(ang))) * Math.min(1, Math.min(0.35 + (a[i] / 14) * 0.65, 0.08 + (len - a[i]) / Math.min(80, 0.5 * len)))); }
    x.forEach((v, i) => { minX = Math.min(minX, v); maxX = Math.max(maxX, v); minY = Math.min(minY, y[i]); maxY = Math.max(maxY, y[i]); });
    total += len; return { x, y, a, w, len };
  });
  minY = Math.min(minY, 41 - 3);
  return { strokes, total, minX, maxX, minY, maxY, dotX: 308.78, dotY: 41 };
})();
const Signature = (() => {
  const cv = $('canvas.sig'); if (!cv) return { redraw() {} };
  let start = -1, done = false, taps = [];
  const ink = () => isGold() ? (isDark() ? '#FFC86B' : '#A8741A') : isDark() ? '#A9E4FF' : '#123C8C';
  function draw() {
    const [ctx, W, H] = fit(cv); ctx.clearRect(0, 0, W, H);
    if (start < 0 && !done) return false;
    const el = start < 0 ? 1e9 : performance.now() - start;
    const prog = Math.min(1, el / 1800), dot = el > 1800 ? Math.min(1, (el - 1800) / 320) : 0;
    const dotPop = dot > 0 ? 1 + 0.6 * Math.sin(dot * Math.PI) * (1 - dot) : 0;
    const gw = SIG.maxX - SIG.minX + 12, gh = SIG.maxY - SIG.minY + 12, s = Math.min(W / gw, H / gh);
    ctx.save(); ctx.translate(0, (H - gh * s) / 2); ctx.scale(s, s); ctx.translate(6 - SIG.minX, 6 - SIG.minY);
    ctx.strokeStyle = ctx.fillStyle = ink(); ctx.lineCap = 'round';
    let left = SIG.total * prog;
    for (const st of SIG.strokes) {
      for (let i = 1; i < st.x.length && st.a[i] <= left; i++) { ctx.lineWidth = st.w[i]; ctx.beginPath(); ctx.moveTo(st.x[i - 1], st.y[i - 1]); ctx.lineTo(st.x[i], st.y[i]); ctx.stroke(); }
      left -= st.len; if (left <= 0) break;
    }
    if (dotPop > 0) { ctx.beginPath(); ctx.arc(SIG.dotX, SIG.dotY, 2.6 * dotPop, 0, 7); ctx.fill(); }
    ctx.restore();
    return el < 2200;
  }
  function play() {
    if (!motionOK) { start = -1; done = true; draw(); return; }
    start = performance.now();
    const loop = () => { if (draw()) requestAnimationFrame(loop); else { start = -1; done = true; draw(); } };
    requestAnimationFrame(loop);
  }
  const tap = e => {
    const now = Date.now(); taps.push(now); taps = taps.filter(x => now - x <= 4000);
    if (taps.length >= 7) { taps = []; toggleGold(e.clientX || innerWidth / 2, e.clientY || innerHeight / 2); }
    play();
  };
  cv.addEventListener('click', tap);
  cv.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const r = cv.getBoundingClientRect(); tap({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }); } });
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); play(); } }, { threshold: 0.6 }).observe(cv);
  return { redraw() { if (done && start < 0) draw(); } };
})();

/* ---------- gold maker's mark (7 taps on the signature, like in the apps) ---------- */
const toast = (() => { const el = $('.toast'); let tm; return msg => { el.textContent = msg; el.classList.add('show'); clearTimeout(tm); tm = setTimeout(() => el.classList.remove('show'), 2600); }; })();
function confetti(ox, oy) {
  if (!motionOK) return;
  const cv = document.createElement('canvas'); cv.className = 'confetti'; document.body.appendChild(cv);
  const [ctx, W, H] = fit(cv), cols = ['#4FE3A0', '#5FD0FF', '#FFC86B', '#FF7EB6', '#F2C55C', '#FFF6CF'];
  const parts = Array.from({ length: 120 }, () => { const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 9; return { x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6, r: Math.random() * 360, vr: Math.random() * 14 - 7, c: cols[Math.random() * cols.length | 0], w: 5 + Math.random() * 5, h: 8 + Math.random() * 6 }; });
  let last = performance.now(), age = 0;
  (function f(now) {
    const dt = clamp((now - last) / 16.6, 0.2, 3); last = now; age += dt; ctx.clearRect(0, 0, W, H); let alive = 0;
    for (const q of parts) { q.vy = Math.min(9, q.vy + 0.22 * dt); q.vx *= 0.99; q.x += q.vx * dt; q.y += q.vy * dt; q.r += q.vr * dt; if (q.y < H + 30) alive++; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r * Math.PI / 180); ctx.fillStyle = q.c; const hh = q.h / 2 * Math.cos(q.r / 20); ctx.fillRect(-q.w / 2, -hh, q.w, hh * 2); ctx.restore(); }
    if (alive && age < 400) requestAnimationFrame(f); else cv.remove();
  })(last);
}
function toggleGold(x, y) {
  const on = root.classList.toggle('gold'); store.set('xtom-gold', on ? '1' : '0');
  drawMarks(); Signature.redraw(); document.dispatchEvent(new CustomEvent('xtom:gold', { detail: on }));
  marks.forEach(shineMark);
  if (on) { confetti(x, y); toast('Gold XTOM mark unlocked'); } else toast('Chrome XTOM mark is back');
}


/* ---------- field diagrams: gears and 3D printer layers ---------- */
const svgNS = 'http://www.w3.org/2000/svg';
$$('path.gear').forEach(p => {
  const T = +p.dataset.teeth, [r0, r1] = p.dataset.r.split(' ').map(Number), cx = +p.dataset.cx, cy = +p.dataset.cy, ph = +p.dataset.phase, pt = 2 * Math.PI / T;
  const P = (a, r) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  let d = '';
  for (let k = 0; k < T; k++) {
    const a = (k + ph) * pt;
    d += (k ? 'L' : 'M') + P(a - pt * 0.28, r0) + 'L' + P(a - pt * 0.15, r1) + `A${r1} ${r1} 0 0 1 ` + P(a + pt * 0.15, r1) + 'L' + P(a + pt * 0.28, r0) + `A${r0} ${r0} 0 0 1 ` + P(a + pt * 0.72, r0);
  }
  p.setAttribute('d', d + 'Z');
});
function printLayers(g, id, cx, baseY, widths, gantry, start) {
  if (!g) return;
  const cyc = 4.2, per = 0.5; let css = `@keyframes rise${id}{`;
  widths.forEach((wd, i) => { css += `${(i * per / cyc * 100).toFixed(2)}%{transform:translateY(${start - i * 6}px)}`; });
  css += `${(widths.length * per / cyc * 100).toFixed(2)}%{transform:translateY(${start - 52}px)}100%{transform:translateY(${start}px)}}`;
  widths.forEach((wd, i) => {
    const y = baseY - i * 6, x = cx - wd / 2, r = document.createElementNS(svgNS, 'rect');
    r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', wd); r.setAttribute('height', 5); r.setAttribute('rx', 2.5);
    r.setAttribute('class', 'layer ' + (i === widths.length - 1 ? 'f-acc' : 'f-a'));
    r.style.transformOrigin = `${i % 2 ? x + wd : x}px ${y + 2.5}px`; r.style.animation = `lay${id}_${i} ${cyc}s linear infinite`;
    const p0 = i * per / cyc * 100, p1 = (i + 1) * per / cyc * 100;
    css += `@keyframes lay${id}_${i}{0%,${p0.toFixed(2)}%{opacity:0;transform:scaleX(0)}${(p0 + 0.1).toFixed(2)}%{opacity:1;transform:scaleX(0)}${p1.toFixed(2)}%{opacity:1;transform:scaleX(1)}92%{opacity:1;transform:scaleX(1)}97%,100%{opacity:0;transform:scaleX(1)}}`;
    g.appendChild(r);
  });
  if (gantry) gantry.style.animation = `rise${id} ${cyc}s steps(1,end) infinite`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
}
printLayers($('.layers'), 'a', 120, 118, [66, 62, 58, 54, 54, 58, 64], $('.gantry'), 0);
printLayers($('.layers2'), 'b', 90, 118, [60, 60, 52, 46, 46, 52, 60], $('.gantry2'), 38);

/* ---------- project visuals: the apps' real opening animations ---------- */
const bez = (x1, y1, x2, y2) => t => {
  if (t <= 0) return 0; if (t >= 1) return 1;
  const X = u => 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u;
  const dX = u => 3 * (1 - u) * (1 - u) * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u * u * (1 - x2);
  let u = t; for (let i = 0; i < 8; i++) { const d = dX(u); if (Math.abs(d) < 1e-6) break; u = clamp(u - (X(u) - t) / d); }
  return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
};
const EMPH = bez(0.2, 0, 0, 1), DECEL = bez(0.05, 0.7, 0.1, 1), ACCEL = bez(0.3, 0, 0.8, 0.15);
const ACCDEC = t => Math.cos((clamp(t) + 1) * Math.PI) / 2 + 0.5;
const OVER = t => { t = clamp(t) - 1; return t * t * (2.6 * t + 1.6) + 1; };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgbaH = (h, a) => { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; };
const blendH = (a, b, t) => { const x = hexRgb(a), y = hexRgb(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const shadeH = (a, f) => '#' + hexRgb(a).map(v => Math.min(255, Math.round(v * f)).toString(16).padStart(2, '0')).join('');
const rrect = (ctx, x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, [r]); else ctx.rect(x, y, w, h); };
function markInBox(ctx, x, y, W, H, shine) {
  const s = Math.min(W / (XTOM.maxX - XTOM.minX), H / (XTOM.maxY - XTOM.minY));
  XTOM.drawAt(ctx, x + (W - (XTOM.maxX - XTOM.minX) * s) / 2 - XTOM.minX * s, y + (H - (XTOM.maxY - XTOM.minY) * s) / 2 + XTOM.maxY * s, s, variant(), shine);
}
/* Achso! – port of intro() and Blubb from the Achso web edition (default Sage mood) */
const ACHSO = {
  light: { dark: false, bg: '#f0f6f1', text: '#142017', text2: '#49574c', text3: '#78847a', accent: '#398351' },
  dark: { dark: true, bg: '#090e0a', text: '#f3f6f3', text2: '#afb7b0', text3: '#757d77', accent: '#89d19d' }
};
function blubb(ctx, x0, y0, w, hh, color, wow, eye, look) {
  const X = v => x0 + v / 100 * w, Y = v => y0 + v / 100 * hh;
  ctx.save();
  { const sg = ctx.createRadialGradient(X(50), Y(96), 0, X(50), Y(96), w * 0.34); sg.addColorStop(0, rgbaH(shadeH(color, 0.4), 0.28)); sg.addColorStop(1, rgbaH(shadeH(color, 0.4), 0)); ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(X(50), Y(96), w * 0.36, hh * 0.05, 0, 0, 7); ctx.fill(); }
  ctx.fillStyle = shadeH(color, 0.92); ctx.beginPath(); ctx.moveTo(X(26), Y(70)); ctx.lineTo(X(17), Y(92)); ctx.lineTo(X(46), Y(74)); ctx.closePath(); ctx.fill();
  const body = () => rrect(ctx, X(8), Y(8), X(92) - X(8), Y(80) - Y(8), w * 0.3);
  const g = ctx.createLinearGradient(0, Y(8), 0, Y(80)); g.addColorStop(0, blendH(color, '#ffffff', 0.30)); g.addColorStop(0.5, color); g.addColorStop(1, shadeH(color, 0.80));
  ctx.fillStyle = g; body(); ctx.fill();
  const rf = ctx.createRadialGradient(X(50), Y(86), 0, X(50), Y(86), w * 0.42); rf.addColorStop(0, rgbaH(blendH(color, '#ffffff', 0.6), 0.55)); rf.addColorStop(1, rgbaH(color, 0)); ctx.fillStyle = rf; body(); ctx.fill();
  const rim = ctx.createLinearGradient(0, Y(8), 0, Y(80)); rim.addColorStop(0, 'rgba(255,255,255,.75)'); rim.addColorStop(1, 'rgba(255,255,255,.05)');
  ctx.strokeStyle = rim; ctx.lineWidth = w * 0.018; rrect(ctx, X(8.9), Y(8.9), X(91.1) - X(8.9), Y(79.1) - Y(8.9), w * 0.29); ctx.stroke();
  const sp = ctx.createRadialGradient(X(30), Y(19), 0, X(30), Y(19), w * 0.2); sp.addColorStop(0, 'rgba(255,255,255,.75)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sp; ctx.beginPath(); ctx.ellipse(X(31), Y(19.5), w * 0.17, hh * 0.085, 0, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(X(76), Y(19), w * 0.022, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,111,145,0.35)'; ctx.beginPath(); ctx.ellipse(X(26), Y(53.5), w * 0.06, hh * 0.035, 0, 0, 7); ctx.ellipse(X(74), Y(53.5), w * 0.06, hh * 0.035, 0, 0, 7); ctx.fill();
  const ink = '#1E1A22', ey = Y(40), ex1 = X(37), ex2 = X(63), erx = w * 0.085, ery = hh * 0.105;
  ctx.lineCap = 'round';
  if (eye < 0.12) { ctx.strokeStyle = ink; ctx.lineWidth = w * 0.035; [ex1, ex2].forEach(ex => { ctx.beginPath(); ctx.ellipse(ex, ey + ery * 0.1, erx, ery * 0.5, 0, 0.17, Math.PI - 0.17, false); ctx.stroke(); }); }
  else {
    const ry = ery * eye;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex1, ey, erx, ry, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(ex2, ey, erx, ry, 0, 0, 7); ctx.fill();
    const pr = w * 0.045 * (wow ? 0.8 : 1), dx = look * erx * 0.45, pyy = ey + ry * 0.15, prr = Math.min(pr, ry * 0.8);
    ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(ex1 + dx, pyy, prr, 0, 7); ctx.arc(ex2 + dx, pyy, prr, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex1 + dx - pr * 0.35, pyy - pr * 0.4, pr * 0.32, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(ex2 + dx - pr * 0.35, pyy - pr * 0.4, pr * 0.32, 0, 7); ctx.fill();
  }
  ctx.fillStyle = ink;
  if (!wow) { ctx.beginPath(); ctx.moveTo(X(40), Y(56)); ctx.quadraticCurveTo(X(50), Y(72), X(60), Y(56)); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#FF7A8A'; ctx.beginPath(); ctx.ellipse(X(50), Y(63.5), w * 0.05, hh * 0.025, 0, 0, 7); ctx.fill(); }
  else { ctx.beginPath(); ctx.ellipse(X(50), Y(61), w * 0.05, hh * 0.06, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}
const drawAchsoIntro = (() => {
  const back = x => { const c = 1.9, t = clamp(x) - 1; return 1 + (c + 1) * t * t * t + c * t * t; }, ease = x => 1 - Math.pow(1 - clamp(x), 3);
  const HOLD_END = 1e9;
  return (ctx, w, hh, raw) => {
    const P = isDark() ? ACHSO.dark : ACHSO.light, still = raw < 0;
    const ms = still ? 2500 : raw, t = still ? 0 : raw / 1000;
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, w, hh);
    if (ms > HOLD_END + 350) return;
    const m = Math.min(w, hh), land = w > hh * 1.15, ex = still ? 0 : clamp((ms - HOLD_END) / 350);
    ctx.save(); const sc = 1 + ex * 0.08; ctx.translate(w / 2, hh / 2); ctx.scale(sc, sc); ctx.translate(-w / 2, -hh / 2); ctx.globalAlpha = 1 - ex;
    const bubble = m * (land ? 0.30 : 0.36), cx = land ? w * 0.30 : w / 2, by = land ? hh * 0.46 : hh * 0.36;
    const fs = m * (land ? 0.15 : 0.17); ctx.font = `600 ${fs}px Outfit, system-ui, sans-serif`; ctx.textBaseline = 'alphabetic';
    const word = 'Achso!', wordW = ctx.measureText(word).width;
    const tx0 = land ? w * 0.52 : (w - wordW) / 2, ty = land ? hh * 0.46 + fs * 0.1 : by + bubble * 0.62 + fs;
    const bp = back(seg(ms, 0, 520));
    if (bp > 0) {
      const s = bubble * bp;
      let eye = ease(seg(ms, 380, 620)); if (ms > 1650 && ms < 1800) eye = 1 - Math.sin((ms - 1650) / 150 * Math.PI);
      if (ms > 2600) { const b = (ms - 2600) % 2900; if (b < 150) eye = 1 - Math.sin(b / 150 * Math.PI); }
      blubb(ctx, cx - s / 2, by - s / 2 + Math.sin(t * 3) * m * 0.006, s, s, P.accent, ms <= 1300, clamp(eye), Math.sin(t * 1.6) * 0.5);
    }
    let x = tx0;
    for (let i = 0; i < word.length; i++) {
      const ch = word[i], cw = ctx.measureText(ch).width, st = 520 + i * 95, k = seg(ms, st, st + 420);
      if (k > 0) {
        const drop = (1 - back(k)) * -m * 0.12;
        ctx.save(); ctx.globalAlpha = Math.min(1, k * 3) * (1 - ex); ctx.fillStyle = ch === '!' ? P.accent : P.text;
        if (ch === '!') { const sw = seg(ms, st + 300, st + 1400), ang = Math.sin(sw * 12) * 22 * (1 - sw) * Math.PI / 180; ctx.translate(x + cw / 2, ty); ctx.rotate(ang); ctx.translate(-(x + cw / 2), -ty); }
        ctx.fillText(ch, x, ty + drop); ctx.restore();
      }
      x += cw;
    }
    const fk = ease(seg(ms, 1250, 1750));
    if (fk > 0) {
      const cols = [P.dark ? '#3A3A3A' : '#111111', '#DD1C1C', '#FFCE00'], sw = wordW * 0.9, sx = tx0 + (wordW - sw) / 2, sy = ty + fs * 0.28, h2 = Math.max(5, fs * 0.07), segW = sw / 3;
      for (let i = 0; i < 3; i++) { const a = clamp(fk * 3 - i); if (a <= 0) continue; ctx.fillStyle = cols[i]; rrect(ctx, sx + segW * i + 2, sy, Math.max(0, segW * a - 4), h2, h2 / 2); ctx.fill(); }
    }
    const tk = ease(seg(ms, 1500, 1950));
    if (tk > 0) { ctx.save(); ctx.globalAlpha = tk * (1 - ex); ctx.font = `500 ${Math.max(11, m * 0.042)}px Outfit, system-ui, sans-serif`; ctx.fillStyle = P.text2; const tag = 'German for real life', tw = ctx.measureText(tag).width; ctx.fillText(tag, land ? tx0 + (wordW - tw) / 2 : (w - tw) / 2, ty + m * 0.13 + (1 - tk) * 10); ctx.restore(); }
    const xk = ease(seg(ms, 1750, 2250));
    if (xk > 0) {
      ctx.save(); ctx.globalAlpha = xk * (1 - ex); ctx.font = `500 ${Math.max(9.5, m * 0.032)}px Outfit, system-ui, sans-serif`; ctx.fillStyle = P.text3;
      const label = 'a project of', lw = ctx.measureText(label).width, baseY = hh - m * 0.20;
      ctx.fillText(label, (w - lw) / 2, baseY);
      const mw = m * 0.30, mh = mw * 0.34, st = seg(ms, 2000, 2700);
      markInBox(ctx, (w - mw) / 2, baseY + m * 0.025, mw, mh, st > 0 && st < 1 ? st * 1.8 - 0.4 : -1); ctx.restore();
    }
    ctx.restore();
  };
})();

/* Canopy – port of IntroView + LogoView (Intro.kt), then the library of real 3D wallpapers the app renders */
const CANOPY = {
  light: { dark: false, bg: '#EEF6EC', text: '#0F2619', text2: '#46614F', text3: '#7A947F' },
  dark: { dark: true, bg: '#000000', text: '#F1F5F2', text2: '#A3AEA8', text3: '#66726B' }
};
const CANOPY_TILES = ["media/canopy/00.webp", "media/canopy/01.webp", "media/canopy/02.webp", "media/canopy/03.webp", "media/canopy/04.webp", "media/canopy/05.webp", "media/canopy/06.webp", "media/canopy/07.webp", "media/canopy/08.webp", "media/canopy/09.webp", "media/canopy/10.webp", "media/canopy/11.webp", "media/canopy/12.webp", "media/canopy/13.webp"].map(src => { const im = new Image(); im.src = src; return im; });
const BIRD = new Path2D('M23 11.5L19.95 10.37C19.69 9.22 19.04 8.56 19.04 8.56C17.4 6.92 14.75 6.92 13.11 8.56L11.63 10.04L5 3C4 7 5 11 7.45 14.22L2 19.5C2 19.5 10.89 21.5 16.07 17.45C18.83 15.29 19.45 14.03 19.84 12.7L23 11.5M17.71 11.72C17.32 12.11 16.68 12.11 16.29 11.72C15.9 11.33 15.9 10.7 16.29 10.31C16.68 9.92 17.32 9.92 17.71 10.31C18.1 10.7 18.1 11.33 17.71 11.72Z');
const LEAF_A = new Path2D('M37.5 70.5C35.3 49.6 49.6 35.3 70.5 37.5Z'), LEAF_B = new Path2D('M37.5 70.5L70.5 37.5C72.7 58.4 58.4 72.7 37.5 70.5Z');
const HEAD_A = new Path2D('M55.2 22.4L63.6 29.9L54.4 35.6Z'), HEAD_B = new Path2D('M52.8 85.6L44.4 78.1L53.6 72.4Z');
function canopyLogo(ctx, cx, cy, size, draw, leaf, spin, dark) {
  const s = size / 66, light = dark ? '#CFFCE4' : '#1F6B3F', deep = dark ? '#27C97F' : '#2E9E5E', R = Math.PI / 180;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-54, -54);
  ctx.save(); ctx.translate(54, 54); ctx.rotate(spin * R); ctx.translate(-54, -54);
  ctx.lineWidth = 4.2; ctx.lineCap = 'round';
  if (draw > 0) {
    ctx.strokeStyle = light; ctx.beginPath(); ctx.arc(54, 54, 25, 198 * R, (198 + 78 * draw) * R); ctx.stroke();
    ctx.strokeStyle = deep; ctx.beginPath(); ctx.arc(54, 54, 25, 18 * R, (18 + 78 * draw) * R); ctx.stroke();
  }
  if (draw > 0.92) {
    const a = clamp((draw - 0.92) / 0.08); ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
    ctx.globalAlpha = a; ctx.fillStyle = ctx.strokeStyle = light; ctx.fill(HEAD_A); ctx.stroke(HEAD_A);
    ctx.fillStyle = ctx.strokeStyle = deep; ctx.fill(HEAD_B); ctx.stroke(HEAD_B); ctx.globalAlpha = 1;
  }
  ctx.restore();
  if (leaf > 0) {
    const sc = 0.6 + 0.4 * leaf; ctx.translate(54, 54); ctx.scale(sc, sc); ctx.translate(-54, -54); ctx.globalAlpha = clamp(leaf);
    let g = ctx.createLinearGradient(40, 68, 66, 40); g.addColorStop(0, dark ? '#8CEDBE' : '#5CCB8E'); g.addColorStop(1, dark ? '#E3FFF0' : '#A8E9C3'); ctx.fillStyle = g; ctx.fill(LEAF_A);
    g = ctx.createLinearGradient(42, 70, 70, 42); g.addColorStop(0, dark ? '#1FB673' : '#1F7A47'); g.addColorStop(1, dark ? '#5EE6A8' : '#2E9E5E'); ctx.fillStyle = g; ctx.fill(LEAF_B);
  }
  ctx.restore();
}
function canopyLibrary(ctx, w, h, P, scroll, colsOverride) {

    const cols = colsOverride || (w >= 520 ? 5 : w >= 330 ? 4 : 3), pad = Math.max(10, w * 0.022), gap = Math.max(6, w * 0.012);
    const tw = (w - pad * 2 - gap * (cols - 1)) / cols, th = tw * 400 / 180, r = Math.max(8, tw * 0.09);
    for (let c = 0; c < cols; c++) {
      const off = (c % 2 ? th * 0.42 : 0) - scroll * (c % 2 ? 1.12 : 1);
      for (let k = -1; k < Math.ceil(h / (th + gap)) + 2; k++) {
        const y = pad + off + k * (th + gap); if (y > h || y + th < 0) continue;
        const idx = ((c * 5 + k * 3) % CANOPY_TILES.length + CANOPY_TILES.length) % CANOPY_TILES.length, im = CANOPY_TILES[idx], x = pad + c * (tw + gap);
        ctx.save(); rrect(ctx, x, y, tw, th, r); ctx.clip();
        ctx.fillStyle = '#0b0b0d'; ctx.fillRect(x, y, tw, th);
        if (im.complete && im.naturalWidth) ctx.drawImage(im, x, y, tw, th);
        ctx.restore();
        ctx.strokeStyle = P.dark ? 'rgba(255,255,255,.08)' : 'rgba(15,38,25,.10)'; ctx.lineWidth = 1; rrect(ctx, x + 0.5, y + 0.5, tw - 1, th - 1, r); ctx.stroke();
      }
    }
  }
const drawCanopyIntro = (() => {
  return (ctx, w, h, raw) => {
    const P = isDark() ? CANOPY.dark : CANOPY.light, still = raw < 0, ms = still ? 1600 : raw;
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, w, h);
    const fin = 0;
    const k = Math.min(w / 340, h / 400);
    ctx.save(); ctx.globalAlpha = 1 - fin; const sc = 1 + 0.06 * fin; ctx.translate(w / 2, h / 2); ctx.scale(sc, sc); ctx.translate(-w / 2, -h / 2);
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, w, h);
    const logo = 132 * k, fsW = 44 * k, fsT = Math.max(10.5, 15 * k), colH = logo + 18 * k + fsW * 1.2 + 10 * k + fsT * 1.3, top = h * 0.46 - colH / 2;
    canopyLogo(ctx, w / 2, top + logo / 2, logo, EMPH(seg(ms, 0, 620)), ms < 260 ? 0 : OVER(seg(ms, 260, 780)), -90 + 90 * DECEL(seg(ms, 0, 900)), P.dark);
    ctx.textBaseline = 'alphabetic'; ctx.font = `600 ${fsW}px Outfit, system-ui, sans-serif`;
    const word = 'Canopy', widths = [...word].map(c => ctx.measureText(c).width), total = widths.reduce((a, b) => a + b, 0), base = top + logo + 18 * k + fsW * 0.95;
    let x = w / 2 - total / 2;
    [...word].forEach((c, i) => { const p = DECEL(seg(ms, 380 + i * 55, 900 + i * 55)); ctx.globalAlpha = p * (1 - fin); ctx.fillStyle = P.text; ctx.fillText(c, x, base + 22 * k * (1 - p)); x += widths[i]; });
    ctx.globalAlpha = ACCDEC(seg(ms, 760, 1260)) * (1 - fin); ctx.font = `500 ${fsT}px Outfit, system-ui, sans-serif`; ctx.fillStyle = P.text2;
    const tag = 'wallpapers that keep growing'; ctx.fillText(tag, w / 2 - ctx.measureText(tag).width / 2, base + 10 * k + fsT * 1.25);
    const sp = DECEL(seg(ms, 620, 1180)), sy = h - 36 * k + 10 * k * (1 - sp);
    ctx.globalAlpha = sp * (1 - fin); ctx.font = `500 ${Math.max(9, 12 * k)}px Outfit, system-ui, sans-serif`; ctx.fillStyle = P.text3;
    ctx.fillText('from', w / 2 - ctx.measureText('from').width / 2, sy - Math.max(11, 16 * k) * 1.15 - 3 * k);
    ctx.font = `600 ${Math.max(11, 16 * k)}px Outfit, system-ui, sans-serif`; ctx.fillStyle = P.text2;
    const lett = 'X T O M', ls = 0.32 * Math.max(11, 16 * k), lw = [...lett].map(c => ctx.measureText(c).width + ls), tl = lw.reduce((a, b) => a + b, 0) - ls;
    let lx = w / 2 - tl / 2; [...lett].forEach((c, i) => { ctx.fillText(c, lx, sy); lx += lw[i]; });
    for (let i = 0; i < 3; i++) {
      const t = seg(ms, 200 + i * 140, 1700 + i * 140); if (t <= 0 || t >= 1) continue;
      const size = (18 - i * 3) * k, f = t < 0.15 ? t / 0.15 : t > 0.85 ? (1 - t) / 0.15 : 1;
      const bx = -30 * k + (w + 60 * k) * t, byy = h * (0.3 + i * 0.035) - Math.sin(t * Math.PI) * h * 0.08 + Math.sin(t * 18) * 2 * k;
      ctx.save(); ctx.globalAlpha = f * (1 - fin); ctx.translate(bx, byy); ctx.scale(size / 24, size / 24); ctx.fillStyle = rgbaH(P.text2, 0.55 - i * 0.12); ctx.fill(BIRD); ctx.restore();
    }
    ctx.restore();
  };
})();

/* ---------- app showcases: real opening animation, then a feature tour in the site's layout ---------- */
const ACHSO_STILLS = ["media/achso/00.jpg", "media/achso/01.jpg", "media/achso/02.jpg", "media/achso/03.jpg", "media/achso/04.jpg", "media/achso/05.jpg"];
const embedData = id => { const el = document.getElementById(id); return el ? el.textContent.trim() : ''; };
const TOUR_STEPS = {
  achso: { end: 51.4, steps: [
    [0, 'A path through Germany', 'Every unit visits a real region, from the Baltic coast to the Black Forest.'],
    [5.6, 'Lessons that feel like real life', 'New words with pictures, audio and examples, then whole sentences, XP and streaks.'],
    [20.3, 'Practice your way', 'Commute mode reads your words aloud, and Real-life German explains slang, texting shortcuts and idioms.'],
    [32.9, 'Your own notebook', 'Save any word or sentence with one tap, then review it as flashcards or audio.'],
    [37.5, 'Role-play real conversations', 'Talk with Lena and friends: choose your reply or say it out loud.'],
    [45.6, 'Animated scene themes', 'Tropical beach, rainforest and Christmas landscapes behind the whole app.']] },
  canopy: { end: 21.5, steps: [
    [0, 'Your wallpaper library', 'Everything you save or create, in one smooth grid.'],
    [3.4, 'Preview, then set in two taps', 'See it on your screen first, then choose home, lock or both.'],
    [7.6, 'Auto-change on a schedule', 'A fresh wallpaper every few minutes, hours or days.'],
    [11.0, '3D scenes made on the phone', '4K instruments and characters, rendered right on the device.'],
    [14.5, 'Live wallpapers', 'Fireflies, aurora, a slideshow or wandering visitors.'],
    [18.0, 'Trophies and hidden secrets', 'Collect every instrument and visitor to unlock trophies and the gold theme.']] },
  m2: { end: 30, steps: [
    [0, 'From hull to operability', 'A guided ten-step workflow: hull, hydrostatics, mass, mesh, hydrodynamics, damping, sea state, speed, points and analysis.'],
    [7.5, 'Hull Mesher', 'Any CAD or mesh model, cut at the waterline and paneled for WAMIT or Capytaine, with leak and quality checks.'],
    [12.5, 'Motion Viewer', 'The hull moving in irregular seas, exportable as MP4, GIF or CSV.'],
    [19.5, 'RAOs for every heading', 'Response curves and statistics for all six motions, accelerations and slamming.'],
    [24.5, 'Operability and forward speed', 'Encounter-frequency corrections for ship speed, wave data from ERA5 and Copernicus, and operability limits.']] }
};
const ICON = {
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 6l-6 6 6 6"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 6l6 6-6 6"/></svg>',
  play: '<svg class="i-pause" viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg><svg class="i-play" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.6v12.8a1 1 0 0 0 1.5.86l10.2-6.4a1 1 0 0 0 0-1.72L9.5 4.74A1 1 0 0 0 8 5.6z"/></svg>'
};
function tourUI(root, def, nav) {
  const n = $('.tour-n', root), ti = $('.tour-title', root), de = $('.tour-desc', root), bars = $('.tour-bars', root);
  bars.innerHTML = def.steps.map((s, i) => `<button type="button" aria-label="Step ${i + 1} of ${def.steps.length}: ${s[1]}"><i><b></b></i></button>`).join('');
  const fills = $$('b', bars), dots = $$('button', bars); let cur = -1;
  dots.forEach((d, i) => d.addEventListener('click', () => nav.go(i)));
  const ctl = document.createElement('div'); ctl.className = 'tour-ctl';
  ctl.innerHTML = `<button type="button" class="tc-prev" aria-label="Previous feature">${ICON.prev}</button><button type="button" class="tc-play" aria-label="Pause the tour">${ICON.play}</button><button type="button" class="tc-next" aria-label="Next feature">${ICON.next}</button>`;
  bars.after(ctl);
  $('.tc-prev', ctl).addEventListener('click', () => nav.step(-1));
  $('.tc-next', ctl).addEventListener('click', () => nav.step(1));
  const playBtn = $('.tc-play', ctl); playBtn.addEventListener('click', () => nav.toggle());
  root.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { if (e.target.closest('.tour-bars, .tour-ctl')) { e.preventDefault(); nav.step(e.key === 'ArrowLeft' ? -1 : 1); } } });
  return {
    update(t) {
      let k = 0; for (let i = 0; i < def.steps.length; i++) if (t >= def.steps[i][0]) k = i;
      if (k !== cur) {
        const set = () => { n.textContent = `${k + 1} of ${def.steps.length}`; ti.textContent = def.steps[k][1]; de.textContent = def.steps[k][2]; root.classList.remove('swap'); };
        if (cur < 0 || !motionOK) set(); else { root.classList.add('swap'); setTimeout(set, 260); }
        dots.forEach((d, i) => d.toggleAttribute('aria-current', i === k));
        cur = k;
      }
      fills.forEach((f, i) => { const a = def.steps[i][0], b = i + 1 < def.steps.length ? def.steps[i + 1][0] : def.end; f.style.setProperty('--p', clamp((t - a) / (b - a)).toFixed(3)); });
      return k;
    },
    paused(p) { root.classList.toggle('paused', p); playBtn.setAttribute('aria-label', p ? 'Play the tour' : 'Pause the tour'); }
  };
}
function showcase(visual, opts) {
  const intro = opts.intro ? $(':scope > canvas', visual) : null, tour = $('.tour', visual), def = opts.def;
  let state = 'off', t0 = 0, raf = 0, visible = false, paused = false, held = 0, curT = 0, curK = 0;
  const stepAt = t => { let k = 0; def.steps.forEach((s, i) => { if (t >= s[0]) k = i; }); return k; };
  const jump = t => {
    t = clamp(t, 0, def.end - 0.3);
    if (state !== 'tour') { state = 'tour'; visual.classList.add('touring'); }
    t0 = performance.now() - t * 1000; held = curT = t;
    opts.seek && opts.seek(t, paused);
    curK = ui.update(t); opts.drawTour && opts.drawTour(t);
    if (!raf && visible) raf = requestAnimationFrame(tick);
  };
  const ui = tourUI(tour, def, {
    go: k => jump(def.steps[k][0] + 0.02),
    step: d => { const n = def.steps.length; jump(def.steps[(stepAt(curT) + d + n) % n][0] + 0.02); },
    toggle: () => { paused = !paused; ui.paused(paused); if (paused) { held = curT; opts.pause && opts.pause(); } else jump(held); }
  });
  const reset = () => { paused = false; ui.paused(false); };
  const startIntro = () => { reset(); if (!intro) { startTour(); return; } state = 'intro'; t0 = performance.now(); visual.classList.remove('touring'); opts.stopTour && opts.stopTour(); };
  const startTour = () => { state = 'tour'; t0 = performance.now(); visual.classList.add('touring'); opts.startTour && opts.startTour(); };
  let lastDraw = 0;
  const tick = now => {
    raf = 0; if (!visible) return;
    if (root.classList.contains('is-scrolling') && now - lastDraw < 50) { raf = requestAnimationFrame(tick); return; }
    lastDraw = now;
    try {
      const el = Math.max(0, now - t0);
      if (state === 'intro') { const [ctx, w, h] = fit(intro); opts.intro(ctx, w, h, el); if (el > opts.introLen) startTour(); }
      else if (state === 'tour') {
        const t = paused ? held : Math.max(0, opts.time ? opts.time(el) : el / 1000); curT = t;
        curK = ui.update(t); opts.drawTour && opts.drawTour(t);
        if (!paused && t >= def.end - 0.05) startIntro();
      }
    } catch (e) { /* keep the loop alive */ }
    raf = requestAnimationFrame(tick);
  };
  new IntersectionObserver(es => {
    const v = es[0].isIntersecting;
    if (v && !visible) { visible = true; if (motionOK) { startIntro(); raf = requestAnimationFrame(tick); } else still(); }
    else if (!v && visible) { visible = false; opts.stopTour && opts.stopTour(); }
  }, { threshold: 0.3 }).observe(visual);
  function still() { if (intro) { const [ctx, w, h] = fit(intro); opts.intro(ctx, w, h, -1); } else { visual.classList.add('touring'); opts.drawTour && opts.drawTour(def.steps[0][0] + 0.5); } ui.update(0); if (!motionOK) { paused = true; held = 0.5; ui.paused(true); } }
  return { redraw() { if (intro && (!motionOK || state === 'intro')) { const [ctx, w, h] = fit(intro); opts.intro(ctx, w, h, motionOK ? performance.now() - t0 : -1); } }, startIntro, get paused() { return paused; } };
}
const AchsoCard = (() => {
  const vis = $('.achso-visual'); if (!vis) return { redraw() {} };
  const video = $('video', vis), still = $('img.still', vis); video.muted = true;
  // play the file; if it cannot load, switch to the copy built into the page; if autoplay is blocked, step through it
  let mode = 'play', embedded = false, whole = false, pending = false, target = 0, clock0 = 0, since = 0, lastSeek = 0, hadFrame = false;
  // reload the clip from memory and continue at the current tour time
  const reloadAt = src => {
    pending = true; video.innerHTML = ''; video.src = src; video.load();
    video.addEventListener('loadedmetadata', () => { pending = false; try { video.currentTime = sc.paused ? target : Math.max(0, (performance.now() - clock0) / 1000); } catch (e) {} if (sc.paused) video.pause(); else if (mode === 'play') tryPlay(); }, { once: true });
  };
  // a host without range requests cannot jump ahead in the file: fetch it whole (full quality), else use the copy built into the page
  const wholeFile = () => {
    if (whole || embedded) return false; whole = true; pending = true; video.pause();
    const toEmbed = () => { const d = embedData('achso-embed'); if (d) { embedded = true; reloadAt(d); } else pending = false; };
    try { fetch(video.currentSrc).then(r => { if (!r.ok) throw 0; return r.blob(); }).then(b => reloadAt(URL.createObjectURL(b))).catch(toEmbed); } catch (e) { toEmbed(); }
    return true;
  };
  const useEmbed = () => { const d = embedData('achso-embed'); if (embedded || !d) return false; embedded = true; video.innerHTML = ''; video.src = d; video.load(); return true; };
  const fail = () => { if (!useEmbed()) mode = 'none'; };
  video.addEventListener('error', () => { if (embedded) mode = 'none'; else fail(); }); const srcs = $$('source', video); if (srcs.length) srcs[srcs.length - 1].addEventListener('error', fail);
  const tryPlay = () => { try { const p = video.play(); p && p.catch(() => { if (mode === 'play') mode = 'seek'; }); } catch (e) { mode = 'seek'; } };
  const sc = showcase(vis, {
    def: TOUR_STEPS.achso, introLen: 4400, intro: drawAchsoIntro,
    startTour() { clock0 = since = performance.now(); if (mode === 'none') return; try { video.currentTime = 0; } catch (e) {} if (mode === 'play') tryPlay(); },
    stopTour() { video.pause(); },
    pause() { video.pause(); },
    seek(t, hold) {
      clock0 = since = performance.now(); clock0 -= t * 1000; target = t; if (mode === 'none' || pending) return;
      const r = video.seekable; let ok = false; for (let i = 0; i < r.length; i++) if (t >= r.start(i) - 0.05 && t <= r.end(i)) ok = true;
      if (video.readyState >= 1 && !ok && wholeFile()) return;
      try { video.currentTime = t; } catch (e) {}
      if (hold) video.pause(); else if (mode === 'play') tryPlay();
    },
    time() {
      const now = performance.now(), el = (now - clock0) / 1000;
      if (pending) return el;
      if (mode === 'play' && video.paused && now - since > 1500 && video.readyState >= 1) mode = 'seek';
      return mode === 'play' && !video.paused && video.readyState > 1 ? video.currentTime : el;
    },
    drawTour(t) {
      const now = performance.now();
      if (mode === 'seek' && !pending && video.readyState >= 1 && !video.seeking && now - lastSeek > 80 && Math.abs(video.currentTime - t) > 0.1) { try { video.currentTime = Math.min(t, (video.duration || t) - 0.05); lastSeek = now; } catch (e) {} }
      if (video.readyState >= 2) hadFrame = true;
      const novideo = mode === 'none' || (!hadFrame && now - since > 2500);
      vis.classList.toggle('novideo', novideo);
      if (!novideo) return;
      let k = 0; TOUR_STEPS.achso.steps.forEach((s, i) => { if (t >= s[0]) k = i; }); if (still.dataset.k !== String(k)) { still.dataset.k = String(k); still.src = ACHSO_STILLS[k]; }
    }
  });
  video.addEventListener('ended', () => { if (!sc.paused) sc.startIntro(); });
  // larger view
  $('button.phone', vis).addEventListener('click', () => {
    let lb = $('.lightbox');
    if (!lb) {
      lb = document.createElement('div'); lb.className = 'lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-label', 'Achso! feature tour');
      lb.innerHTML = '<video controls playsinline muted></video><button class="icon-btn" type="button" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
      document.body.appendChild(lb);
      const close = () => { lb.classList.remove('open'); $('video', lb).pause(); };
      $('button', lb).addEventListener('click', close); lb.addEventListener('click', e => { if (e.target === lb) close(); });
      addEventListener('keydown', e => { if (e.key === 'Escape' && lb.classList.contains('open')) close(); });
    }
    lb.classList.add('open'); const v = $('video', lb); if (v.src !== video.currentSrc) v.src = video.currentSrc || video.src; v.currentTime = video.currentTime || 0; v.play().catch(() => {}); $('button', lb).focus();
  });
  return sc;
})();

/* Canopy usage, drawn on the phone screen with the app's own colours, labels and wallpapers */
const CanopyScreen = (() => {
  const cv = $('canvas.canopy-screen'); if (!cv) return null;
  const T = CANOPY_TILES, IMG = { dj: 10, trophy: 12, violin: 6, drum: 0, xylo: 1, disco: 11, xtom: 13, guitar: 8, sax: 7 };
  const card = P => P.dark ? '#111513' : '#FFFFFF', line = P => P.dark ? 'rgba(255,255,255,.10)' : 'rgba(15,38,25,.10)';
  const font = (wgt, px) => `${wgt} ${px}px Outfit, system-ui, sans-serif`;
  const pill = (ctx, x, y, w, h, fill, text, color, px, bold = 600) => { ctx.fillStyle = fill; rrect(ctx, x, y, w, h, h / 2); ctx.fill(); if (text) { ctx.fillStyle = color; ctx.font = font(bold, px); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x + w / 2, y + h / 2 + 0.5); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; } };
  const cover = (ctx, im, x, y, w, h, alpha = 1) => { if (!im || !im.naturalWidth) return; const s = Math.max(w / im.naturalWidth, h / im.naturalHeight), iw = im.naturalWidth * s, ih = im.naturalHeight * s; ctx.save(); ctx.globalAlpha *= alpha; ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); ctx.restore(); };
  const ripple = (ctx, x, y, t, u) => { if (t < 0 || t > 0.6) return; const k = t / 0.6; ctx.save(); ctx.globalAlpha = 1 - k; ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, u * (7 + 10 * k), 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); };
  const status = (ctx, w, u, color) => { ctx.fillStyle = color; ctx.font = font(600, 6.2 * u); ctx.fillText('9:41', 12 * u, 13 * u); ctx.fillRect(w - 26 * u, 8.5 * u, 11 * u, 5 * u); ctx.fillRect(w - 14.5 * u, 9.8 * u, 1.2 * u, 2.4 * u); };
  const nav = (ctx, w, h, u, P, active = 0) => {
    const y = h - 30 * u; ctx.fillStyle = card(P); rrect(ctx, 8 * u, y, w - 16 * u, 22 * u, 11 * u); ctx.fill(); ctx.strokeStyle = line(P); ctx.lineWidth = 1; ctx.stroke();
    ['Library', 'Discover', 'Auto', 'Settings'].forEach((l, i) => { const cx = 8 * u + (w - 16 * u) * (i + 0.5) / 4; if (i === active) pill(ctx, cx - 17 * u, y + 3.5 * u, 34 * u, 15 * u, rgbaH(P.dark ? '#27C97F' : '#2E9E5E', 0.18), '', '', 0); ctx.fillStyle = i === active ? P.text : P.text3; ctx.font = font(600, 5.6 * u); ctx.textAlign = 'center'; ctx.fillText(l, cx, y + 13.6 * u); ctx.textAlign = 'left'; });
  };
  const fireflies = Array.from({ length: 26 }, (_, i) => ({ x: (i * 0.618) % 1, y: 0.25 + ((i * 0.377) % 0.7), p: i * 1.7, s: 0.5 + (i % 5) * 0.2 }));
  const conf = Array.from({ length: 40 }, (_, i) => ({ a: i / 40 * 6.283 + (i % 3), v: 0.6 + (i % 7) * 0.12, c: ['#4FE3A0', '#5FD0FF', '#FFC86B', '#FF7EB6', '#F2C55C'][i % 5] }));
  let pix = null;
  function draw(t) {
    const [ctx, w, h] = fit(cv), P = isDark() ? CANOPY.dark : CANOPY.light, u = w / 160, acc = P.dark ? '#27C97F' : '#2E9E5E';
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, w, h);
    const tileRect = () => { const pad = 8 * u, gap = 5 * u, tw = (w - pad * 2 - gap) / 2, th = tw * 400 / 180; return { x: pad, y: 52 * u + th * 0.42 + gap - Math.min(t, 3.4) * 9 * u, w: tw, h: th }; };
    if (t < 3.8) {
      // library
      const sc = Math.min(t, 3.4) * 9 * u;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 46 * u, w, h - 46 * u); ctx.clip(); ctx.translate(0, 46 * u);
      canopyLibrary(ctx, w, h, P, sc / 1, 2); ctx.restore();
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, w, 46 * u);
      status(ctx, w, u, P.text);
      ctx.fillStyle = P.text; ctx.font = font(600, 13 * u); ctx.fillText('Library', 9 * u, 33 * u);
      ctx.fillStyle = P.text3; ctx.font = font(500, 5.8 * u); ctx.fillText('14 wallpapers', 62 * u, 33 * u);
      pill(ctx, 108 * u, 25 * u, 22 * u, 11 * u, acc, 'All', '#fff', 5.6 * u); pill(ctx, 133 * u, 25 * u, 19 * u, 11 * u, card(P), '3D', P.text2, 5.6 * u);
      nav(ctx, w, h, u, P, 0);
      const r = tileRect(); ripple(ctx, r.x + r.w / 2, r.y + r.h / 2, t - 3.0, u);
      if (t > 3.4) { const k = EMPH(seg(t, 3.4, 3.8)); const x = lerp(r.x, 0, k), y = lerp(r.y, 0, k), ww = lerp(r.w, w, k), hh2 = lerp(r.h, h, k); ctx.save(); rrect(ctx, x, y, ww, hh2, lerp(8 * u, 0, k)); ctx.clip(); cover(ctx, T[IMG.dj], x, y, ww, hh2); ctx.restore(); }
      return;
    }
    if (t < 7.6) {
      // preview, set wallpaper sheet, toast
      cover(ctx, T[IMG.dj], 0, 0, w, h);
      const g = ctx.createLinearGradient(0, 0, 0, h * 0.3); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h * 0.3);
      status(ctx, w, u, '#fff');
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = font(500, 30 * u); ctx.fillText('9:41', w / 2, 62 * u); ctx.font = font(500, 6.4 * u); ctx.fillText('Wednesday, 18 November', w / 2, 74 * u); ctx.textAlign = 'left';
      const pb = EMPH(seg(t, 4.2, 4.6)), sy = h - 34 * u + (1 - pb) * 40 * u;
      pill(ctx, 26 * u, sy, w - 52 * u, 20 * u, acc, 'Set wallpaper', '#fff', 7 * u);
      ripple(ctx, w / 2, sy + 10 * u, t - 4.95, u);
      const sh = t < 6.1 ? EMPH(seg(t, 5.15, 5.5)) : 1 - EMPH(seg(t, 6.1, 6.45));
      if (sh > 0) {
        ctx.fillStyle = `rgba(0,0,0,${(0.35 * sh).toFixed(3)})`; ctx.fillRect(0, 0, w, h);
        const hh2 = 96 * u, y = h - hh2 * sh; ctx.fillStyle = card(P); rrect(ctx, 0, y, w, hh2 + 20 * u, 14 * u); ctx.fill();
        ctx.fillStyle = P.text; ctx.font = font(600, 8.6 * u); ctx.fillText('Set wallpaper', 12 * u, y + 20 * u);
        ['Home screen', 'Lock screen', 'Both'].forEach((l, i) => { const yy = y + 30 * u + i * 20 * u; ctx.fillStyle = i === 2 && t > 5.9 ? rgbaH(acc, 0.16) : (P.dark ? '#1a1f1c' : '#F1F6EF'); rrect(ctx, 10 * u, yy, w - 20 * u, 16 * u, 8 * u); ctx.fill(); ctx.fillStyle = P.text; ctx.font = font(500, 6.6 * u); ctx.fillText(l, 18 * u, yy + 10.6 * u); });
        ripple(ctx, w / 2, y + 30 * u + 2 * 20 * u + 8 * u, t - 5.85, u);
      }
      const tk = clamp(seg(t, 6.45, 6.7)) * (1 - seg(t, 7.3, 7.55));
      if (tk > 0) { ctx.save(); ctx.globalAlpha = tk; pill(ctx, w / 2 - 44 * u, h - 40 * u, 88 * u, 18 * u, P.dark ? '#F1F5F2' : '#0F2619', 'Wallpaper set ✓', P.dark ? '#0F2619' : '#fff', 6.6 * u); ctx.restore(); }
      return;
    }
    if (t < 11.0) {
      // auto-change: lock screen cycling through wallpapers
      const order = [IMG.dj, IMG.violin, IMG.xylo, IMG.disco], tt = t - 7.6, step = 0.85, i = Math.min(order.length - 1, Math.floor(tt / step)), f = clamp((tt - i * step) / 0.35);
      cover(ctx, T[order[Math.max(0, i - 1)]], 0, 0, w, h); cover(ctx, T[order[i]], 0, 0, w, h, i === 0 ? 1 : f);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, 0, w, h);
      status(ctx, w, u, '#fff');
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = font(500, 30 * u); ctx.fillText('9:41', w / 2, 62 * u); ctx.textAlign = 'left';
      ctx.save(); ctx.globalAlpha = EMPH(seg(t, 7.7, 8.1)); pill(ctx, w / 2 - 50 * u, h - 44 * u, 100 * u, 22 * u, 'rgba(10,14,12,.62)', '', '', 0);
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.arc(w / 2 - 38 * u, h - 33 * u, 6 * u, 0, 7); ctx.stroke();
      ctx.strokeStyle = '#4FE3A0'; ctx.beginPath(); ctx.arc(w / 2 - 38 * u, h - 33 * u, 6 * u, -1.571, -1.571 + 6.283 * ((tt % step) / step)); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = font(600, 6.4 * u); ctx.fillText('Auto-change', w / 2 - 28 * u, h - 35 * u); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = font(500, 5.4 * u); ctx.fillText('Every 1 hour', w / 2 - 28 * u, h - 27 * u); ctx.restore();
      return;
    }
    if (t < 14.5) {
      // 3D render reveal: low resolution first, then sharper, with a progress pill
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
      const k = seg(t, 11.2, 14.0), steps = [26, 13, 7, 3.5, 1], lvl = Math.min(steps.length - 1, Math.floor(k * steps.length)), px = steps[lvl] * u;
      const im = T[IMG.trophy];
      if (im && im.naturalWidth) {
        if (!pix) pix = document.createElement('canvas');
        if (px > 1.2) { const sw = Math.max(2, Math.round(w / px)), shh = Math.max(2, Math.round(h / px)); pix.width = sw; pix.height = shh; const pc = pix.getContext('2d'); pc.imageSmoothingEnabled = true; pc.drawImage(im, 0, 0, sw, shh); ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(pix, 0, 0, w, h); ctx.restore(); }
        else cover(ctx, im, 0, 0, w, h);
      }
      const pct = Math.round(k * 100), done = t > 14.05;
      pill(ctx, w / 2 - 46 * u, 24 * u, 92 * u, 18 * u, 'rgba(10,14,12,.7)', done ? '4K ready ✓' : `Rendering in 3D… ${pct}%`, '#fff', 6 * u);
      ctx.fillStyle = 'rgba(255,255,255,.15)'; rrect(ctx, w / 2 - 36 * u, 45 * u, 72 * u, 2.4 * u, 1.2 * u); ctx.fill();
      ctx.fillStyle = '#4FE3A0'; rrect(ctx, w / 2 - 36 * u, 45 * u, 72 * u * k, 2.4 * u, 1.2 * u); ctx.fill();
      return;
    }
    if (t < 18.0) {
      // live wallpaper: fireflies over a dark canopy
      const tt = t - 14.5, g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#04110c'); g.addColorStop(1, '#0b2a20'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#071a14'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(i * w / 5.5, h * 0.82 + Math.sin(i * 2) * 8 * u, 26 * u, 0, 7); ctx.fill(); } ctx.fillRect(0, h * 0.86, w, h);
      for (const f of fireflies) { const x = (f.x + Math.sin(tt * 0.4 * f.s + f.p) * 0.05) * w, y = (f.y + Math.cos(tt * 0.5 * f.s + f.p) * 0.03) * h, b = Math.pow((Math.sin(tt * 2.2 * f.s + f.p) + 1) / 2, 3), R = (3 + 7 * b) * u, gg = ctx.createRadialGradient(x, y, 0, x, y, R); gg.addColorStop(0, `rgba(255,236,160,${(0.3 + 0.7 * b).toFixed(3)})`); gg.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill(); }
      status(ctx, w, u, '#fff');
      ctx.save(); ctx.globalAlpha = EMPH(seg(t, 14.6, 15.0)); pill(ctx, w / 2 - 34 * u, 24 * u, 68 * u, 16 * u, 'rgba(255,255,255,.14)', 'Live wallpaper', '#fff', 6 * u); ctx.restore();
      return;
    }
    // trophies
    const tt = t - 18.0; cover(ctx, T[IMG.trophy], 0, 0, w, h); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, 0, w, h);
    for (const q of conf) { const r = tt * q.v * 70 * u, x = w / 2 + Math.cos(q.a) * r, y = h * 0.42 + Math.sin(q.a) * r + tt * tt * 30 * u; ctx.save(); ctx.globalAlpha = clamp(1.6 - tt * 0.6); ctx.translate(x, y); ctx.rotate(tt * 5 + q.a); ctx.fillStyle = q.c; ctx.fillRect(-2 * u, -3 * u, 4 * u, 6 * u); ctx.restore(); }
    const k = EMPH(seg(tt, 0.3, 0.8)); ctx.save(); ctx.globalAlpha = k; const cy = h - 58 * u + (1 - k) * 20 * u;
    ctx.fillStyle = card(P); rrect(ctx, 12 * u, cy, w - 24 * u, 38 * u, 12 * u); ctx.fill();
    ctx.fillStyle = '#F2C55C'; ctx.beginPath(); ctx.arc(30 * u, cy + 19 * u, 9 * u, 0, 7); ctx.fill(); ctx.fillStyle = '#9C6A14'; ctx.font = font(700, 9 * u); ctx.textAlign = 'center'; ctx.fillText('★', 30 * u, cy + 22.5 * u); ctx.textAlign = 'left';
    ctx.fillStyle = P.text; ctx.font = font(600, 7.6 * u); ctx.fillText('Maestro unlocked', 45 * u, cy + 17 * u); ctx.fillStyle = P.text3; ctx.font = font(500, 5.6 * u); ctx.fillText('You found every instrument', 45 * u, cy + 26 * u); ctx.restore();
    status(ctx, w, u, '#fff');
  }
  return draw;
})();
const CanopyCard = (() => {
  const vis = $('.canopy-visual'); if (!vis) return { redraw() {} };
  return showcase(vis, { def: TOUR_STEPS.canopy, introLen: 2900, intro: drawCanopyIntro, ready: () => true, drawTour: t => CanopyScreen && CanopyScreen(t) });
})();


/* XTOM M.2 – its real start screen (app.py _splash_pixmap), animated, then a tour inside a desktop window */
const M2 = { logo: new Image(), shot: new Image() };
M2.logo.src = 'media/m2-logo.webp'; M2.shot.src = 'media/m2-shot.webp';
function drawM2Intro(ctx, w, h, raw) {
  const ms = raw < 0 ? 4000 : raw, e = x => EMPH(x), sF = 'Segoe UI, Outfit, system-ui, sans-serif';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
  const s = Math.min(w * 0.94 / 640, h * 0.86 / 300), ox = (w - 640 * s) / 2, oy = (h - 300 * s) / 2;
  ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
  const bar = e(seg(ms, 0, 900)), g = ctx.createLinearGradient(0, 0, 640, 0); g.addColorStop(0, '#34d399'); g.addColorStop(0.5, '#22d3ee'); g.addColorStop(1, '#3b82f6');
  ctx.fillStyle = g; ctx.fillRect(0, 296, 640 * bar, 4);
  const lk = e(seg(ms, 150, 900)); if (lk > 0 && M2.logo.naturalWidth) { ctx.save(); ctx.globalAlpha = lk; const sz = 180 * (0.86 + 0.14 * OVER(seg(ms, 150, 900))); ctx.drawImage(M2.logo, 130 - sz / 2, 140 - sz / 2, sz, sz); ctx.restore(); }
  const tx = (a, b) => (1 - e(seg(ms, a, b))) * 18;
  ctx.textBaseline = 'middle'; ctx.font = `700 53px ${sF}`;
  ctx.globalAlpha = e(seg(ms, 450, 1000)); ctx.fillStyle = '#f1f4f8'; ctx.fillText('Xtom', 250 + tx(450, 1000), 105);
  const nw = ctx.measureText('Xtom ').width; ctx.globalAlpha = e(seg(ms, 650, 1200)); ctx.fillStyle = '#3d9bff'; ctx.fillText('M.2', 250 + nw + tx(650, 1200), 105);
  ctx.globalAlpha = e(seg(ms, 900, 1400)); ctx.fillStyle = '#a3abb8'; ctx.font = `400 16px ${sF}`; ctx.fillText('Monohull, catamaran & trimaran seakeeping', 252, 155);
  ctx.globalAlpha = e(seg(ms, 1100, 1600)); ctx.font = `400 12px ${sF}`; ctx.fillText('Mark 2  ·  version 2.10.0', 252, 180);
  ctx.globalAlpha = e(seg(ms, 1300, 1800)); ctx.fillStyle = '#7d8590'; ctx.font = `400 11px ${sF}`; ctx.textAlign = 'right'; ctx.fillText('LSB Universität Rostock', 624, 279); ctx.textAlign = 'left';
  const msgs = [[200, 'Loading numerical libraries ...'], [1000, 'Settings loaded'], [1500, 'Loading Hull Mesher ...'], [2000, 'Loading Motion Viewer ...'], [2600, 'Applying the theme ...'], [3100, 'Opening project ...']];
  let m = ''; msgs.forEach(([t, txt]) => { if (ms >= t) m = txt; });
  ctx.globalAlpha = raw < 0 ? 0 : 1; ctx.fillStyle = '#9aa1ab'; ctx.font = `400 11px ${sF}`; ctx.fillText('   ' + m, 4, 284);
  ctx.restore(); ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
}
const M2Screen = (() => {
  const cv = $('canvas.m2-screen'), video = $('video.m2-video'); if (!cv) return null;
  // a parametric trimaran: lofted centre hull and two slender amas, paneled below the waterline
  const hulls = [{ y: 0, L: 1.9, B: 0.24, T: 0.2 }, { y: 0.62, L: 1.15, B: 0.1, T: 0.12, x: -0.25 }, { y: -0.62, L: 1.15, B: 0.1, T: 0.12, x: -0.25 }];
  const NU = 22, NV = 7, meshes = hulls.map(H => { const pts = []; for (let i = 0; i <= NU; i++) { const u = i / NU, xs = (u - 0.5) * H.L + (H.x || 0), f = Math.pow(Math.max(0, 1 - Math.pow(2 * u - 1, 2)), 0.6); const row = []; for (let k = 0; k <= NV; k++) { const a = Math.PI * k / NV; row.push([xs, H.y + Math.cos(a) * H.B / 2 * f, -Math.sin(a) * H.T * Math.pow(f, 0.8)]); } pts.push(row); } return pts; });
  const proj = (p, yaw, W, Hh, sc) => { let [x, y, z] = p; const c = Math.cos(yaw), s = Math.sin(yaw); [x, y] = [x * c - y * s, x * s + y * c]; const pitch = 0.42, cp = Math.cos(pitch), sp = Math.sin(pitch); const depth = y * cp + z * sp, up = z * cp - y * sp; const f = 3.4 / (3.4 + depth * 0.8); return [W / 2 + x * sc * f, Hh * 0.5 - up * sc * f]; };
  let vStarted = false, vSeek = false, vEmbed = false, vLast = 0, held = false;
  if (video) { const toEmbed = () => { const d = embedData('m2-embed'); if (vEmbed || !d) return; vEmbed = true; video.innerHTML = ''; video.src = d; video.load(); }; video.addEventListener('error', toEmbed); const ss = $$('source', video); if (ss.length) ss[ss.length - 1].addEventListener('error', toEmbed);
    // without range requests the clip cannot be jumped through: load it whole once
    let whole = false; video.addEventListener('loadedmetadata', () => { if (vEmbed || whole) return; const r = video.seekable; if (r.length && r.end(r.length - 1) >= video.duration - 0.5) return; whole = true; try { fetch(video.currentSrc).then(x => { if (!x.ok) throw 0; return x.blob(); }).then(b => { video.innerHTML = ''; video.src = URL.createObjectURL(b); video.load(); vStarted = false; }).catch(() => {}); } catch (e) {} }); }
  const STEPS = [['Hull', 'Hull'], ['Hydrostatics', 'Hydrostat.'], ['Mass', 'Mass'], ['Panel mesh', 'Mesh'], ['Hydrodynamics', 'Hydrodyn.'], ['Damping', 'Damping'], ['Sea state', 'Sea'], ['Speed', 'Speed'], ['Points', 'Points'], ['Analysis', 'Analysis']];
  function hullProfile(ctx, x, y, w, h) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * 0.96, y); ctx.quadraticCurveTo(x + w, y + h * 0.1, x + w * 0.97, y + h * 0.45); ctx.quadraticCurveTo(x + w * 0.9, y + h, x + w * 0.7, y + h); ctx.lineTo(x + w * 0.08, y + h); ctx.quadraticCurveTo(x, y + h * 0.9, x, y + h * 0.4); ctx.closePath(); }
  function workflow(ctx, W, H, t) {
    const per = 0.62, cur = Math.max(0, Math.min(9, Math.floor(t / per))), done = t > per * 10 + 0.2, k = clamp((t - cur * per) / 0.45), pad = W * 0.06, y0 = H * 0.12, span = W - pad * 2;
    const f = s => `${s} ${Math.round(H * 0.034)}px Outfit, Segoe UI, sans-serif`;
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pad, y0); ctx.lineTo(pad + span, y0); ctx.stroke();
    ctx.strokeStyle = '#34d399'; ctx.beginPath(); ctx.moveTo(pad, y0); ctx.lineTo(pad + span * Math.min(1, (cur + (done ? 1 : k)) / 9), y0); ctx.stroke();
    STEPS.forEach((s, i) => { const x = pad + span * i / 9, st = done || i < cur ? 2 : i === cur ? 1 : 0, r = H * 0.032;
      ctx.fillStyle = st === 2 ? '#34d399' : st === 1 ? '#0B0D12' : '#1b2029'; ctx.strokeStyle = st === 1 ? '#3d9bff' : st === 2 ? '#34d399' : 'rgba(255,255,255,.2)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y0, r, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = st === 2 ? '#05261a' : st === 1 ? '#5FA8FF' : '#7d8590'; ctx.font = f(700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (st === 2) { ctx.strokeStyle = '#05261a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - r * 0.4, y0); ctx.lineTo(x - r * 0.1, y0 + r * 0.35); ctx.lineTo(x + r * 0.45, y0 - r * 0.35); ctx.stroke(); } else ctx.fillText(String(i + 1), x, y0 + 0.5);
      ctx.fillStyle = st === 1 ? '#f1f4f8' : '#7d8590'; ctx.font = f(500); ctx.fillText(s[1], x, y0 + r + H * 0.04); });
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const s = done ? 9 : cur, bx = W * 0.2, by = H * 0.33, bw = W * 0.6, bh = H * 0.42;
    ctx.fillStyle = '#f1f4f8'; ctx.font = `600 ${Math.round(H * 0.06)}px Outfit, Segoe UI, sans-serif`; ctx.fillText(done ? 'Analysis' : `${s + 1}  ${STEPS[s][0]}`, pad, by - H * 0.03);
    ctx.save(); ctx.globalAlpha = done ? 1 : 0.35 + 0.65 * k; ctx.lineWidth = 1.6; ctx.strokeStyle = '#5FA8FF'; ctx.fillStyle = 'rgba(95,168,255,.12)';
    const hx = bx + bw * 0.08, hy = by + bh * 0.42, hw = bw * 0.84, hh = bh * 0.22;
    if (s <= 3 || s === 7 || s === 8) { hullProfile(ctx, hx, hy, hw, hh); ctx.fill(); ctx.stroke(); ctx.strokeStyle = 'rgba(95,168,255,.6)'; ctx.strokeRect(hx + hw * 0.12, hy - hh * 0.9, hw * 0.3, hh * 0.9); }
    if (s === 1) { ctx.strokeStyle = '#22d3ee'; ctx.beginPath(); ctx.moveTo(bx, hy + hh * 0.55); ctx.lineTo(bx + bw, hy + hh * 0.55); ctx.stroke(); ctx.fillStyle = '#a3abb8'; ctx.font = f(500); ctx.fillText('draft 0.558 m', bx + bw * 0.7, hy + hh * 1.6); }
    if (s === 2) { const cx = hx + hw * 0.48, cy = hy + hh * 0.3, r = hh * 0.35; ctx.fillStyle = '#f1f4f8'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, 0, 1.571); ctx.closePath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, 3.1416, 4.712); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#f1f4f8'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); ctx.fillStyle = '#a3abb8'; ctx.font = f(500); ctx.fillText('CG', cx + r * 1.4, cy + 4); }
    if (s === 3) { ctx.strokeStyle = 'rgba(52,211,153,.7)'; ctx.lineWidth = 1; for (let i = 1; i < 16; i++) { const x = hx + hw * i / 16; ctx.beginPath(); ctx.moveTo(x, hy); ctx.lineTo(x, hy + hh); ctx.stroke(); } for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(hx, hy + hh * i / 4); ctx.lineTo(hx + hw, hy + hh * i / 4); ctx.stroke(); } }
    const plot = (fn, col, lw = 1.8) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); const n = 60, m = Math.max(2, Math.round(n * (done ? 1 : k))); for (let i = 0; i <= m; i++) { const u = i / n, x = bx + u * bw, y = by + bh * 0.9 - fn(u) * bh * 0.75; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); };
    const axes = () => { ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, by + bh * 0.1); ctx.lineTo(bx, by + bh * 0.9); ctx.lineTo(bx + bw, by + bh * 0.9); ctx.stroke(); };
    if (s === 4) { axes(); plot(u => 0.25 + 0.5 * Math.exp(-Math.pow((u - 0.3) * 4, 2)), '#5FA8FF'); plot(u => 0.6 * Math.exp(-Math.pow((u - 0.35) * 5, 2)), '#34d399'); }
    if (s === 5) { axes(); plot(u => 0.5 + 0.42 * Math.exp(-u * 3.2) * Math.cos(u * 30), '#febc2e'); }
    if (s === 6) { axes(); plot(u => { const w = 0.08 + u * 1.6, wp = 0.61, sg = w < wp ? 0.07 : 0.09, g = Math.pow(3.3, Math.exp(-Math.pow(w - wp, 2) / (2 * sg * sg * wp * wp))); return Math.min(1, 0.33 * Math.pow(wp / w, 5) * Math.exp(-1.25 * Math.pow(wp / w, 4)) * g * 1.2); }, '#22d3ee'); ctx.fillStyle = '#a3abb8'; ctx.font = f(500); ctx.fillText('Hs 5.50 m, Tp 10.32 s', bx + bw * 0.55, by + bh * 0.25); }
    if (s === 7) { ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(hx + hw * 0.3, hy + hh * 1.8); ctx.lineTo(hx + hw * 0.75, hy + hh * 1.8); ctx.stroke(); ctx.beginPath(); ctx.moveTo(hx + hw * 0.75, hy + hh * 1.8); ctx.lineTo(hx + hw * 0.71, hy + hh * 1.55); ctx.lineTo(hx + hw * 0.71, hy + hh * 2.05); ctx.closePath(); ctx.fillStyle = '#34d399'; ctx.fill(); ctx.fillStyle = '#a3abb8'; ctx.font = f(500); ctx.fillText('ωe = ω − kU cos β', hx + hw * 0.3, hy + hh * 2.7); }
    if (s === 8) { [[0.18, 0.2], [0.4, 0.5], [0.66, 0.3], [0.86, 0.45]].forEach(([u, v], i) => { ctx.fillStyle = ['#ff7eb6', '#febc2e', '#34d399', '#22d3ee'][i]; ctx.beginPath(); ctx.arc(hx + hw * u, hy + hh * v, H * 0.014, 0, 7); ctx.fill(); }); }
    if (s === 9) { axes(); plot(u => Math.min(1, 0.1 + 0.85 * Math.exp(-Math.pow((u - 0.2) * 6, 2)) + 0.15 * u), '#34d399'); plot(u => Math.min(1, 0.6 * Math.exp(-Math.pow((u - 0.25) * 5, 2)) + 0.05), '#febc2e'); plot(u => Math.min(1, 0.05 + 0.55 * u), '#ff5f57'); }
    ctx.restore();
    ctx.fillStyle = done ? '#34d399' : '#7d8590'; ctx.font = f(500); ctx.fillText(done ? '✓  All steps complete and up to date.' : `Next: ${Math.min(10, s + 2)} ${STEPS[Math.min(9, s + 1)][0]}`, pad, H * 0.93);
  }
  // drawn stand-in for the Motion Viewer (body plan, profile and traces) when the recording cannot play
  function viewerArt(ctx, W, H, t, plots) {
    ctx.fillStyle = '#0B0D12'; ctx.fillRect(0, 0, W, H);
    if (plots) { ctx.strokeStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 6; i++) { const x = W * (0.06 + (i % 3) * 0.31), y = H * (0.08 + Math.floor(i / 3) * 0.46); ctx.strokeRect(x, y, W * 0.28, H * 0.38); ctx.beginPath(); for (let k = 0; k <= 40; k++) { const u = k / 40, v = Math.exp(-Math.pow((u - 0.18 - i * 0.02) * 9, 2)) * 0.8 + 0.15 * u; k ? ctx.lineTo(x + u * W * 0.28, y + H * 0.36 - v * H * 0.3) : ctx.moveTo(x, y + H * 0.36); } ctx.strokeStyle = ['#34d399', '#22d3ee', '#3b82f6', '#febc2e', '#ff7eb6', '#9d86ff'][i]; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.08)'; } return; }
    const heave = Math.sin(t * 1.1) * 0.06, pitch = Math.sin(t * 0.9 + 1) * 0.07, waterY = H * 0.36;
    const g = ctx.createLinearGradient(0, waterY, 0, H * 0.66); g.addColorStop(0, '#1f4f86'); g.addColorStop(1, '#0d2440');
    for (const [x0, x1] of [[0, W * 0.4], [W * 0.41, W]]) { ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, H * 0.66); for (let x = x0; x <= x1; x += 6) ctx.lineTo(x, waterY + Math.sin(x * 0.03 + t * 2) * 4); ctx.lineTo(x1, H * 0.66); ctx.fill(); }
    ctx.fillStyle = 'rgba(220,228,240,.85)'; [-0.11, 0, 0.11].forEach((dx, i) => { ctx.beginPath(); ctx.ellipse(W * (0.2 + dx), waterY - heave * H, i === 1 ? 11 : 7, i === 1 ? 9 : 6, 0, 0, 7); ctx.fill(); });
    ctx.save(); ctx.translate(W * 0.7, waterY - heave * H); ctx.rotate(pitch); ctx.beginPath(); ctx.moveTo(-W * 0.2, -6); ctx.lineTo(W * 0.21, -8); ctx.lineTo(W * 0.19, 6); ctx.lineTo(-W * 0.19, 6); ctx.closePath(); ctx.fill(); ctx.restore();
    const tr = [['Heave', '#5FA8FF', 1.1, 0], ['Roll', '#febc2e', 4.2, 1], ['Pitch', '#34d399', 0.9, 2]];
    tr.forEach(([l, c, f, i]) => { const y = H * (0.75 + i * 0.08); ctx.fillStyle = '#7d8590'; ctx.font = `500 ${Math.round(H * 0.035)}px Outfit, sans-serif`; ctx.fillText(l, W * 0.02, y + 4); ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.beginPath(); for (let x = 0; x <= W * 0.82; x += 3) { const v = Math.sin((x / W) * 30 * f / 3 + t * f) * (i === 1 ? 0.3 : 1); x ? ctx.lineTo(W * 0.14 + x, y - v * H * 0.03) : ctx.moveTo(W * 0.14, y); } ctx.stroke(); });
  }
  function shot(ctx, W, H, sx, sy, sw, sh) { const im = M2.shot; if (!im.naturalWidth) { viewerArt(ctx, W, H, performance.now() / 1000, true); return; } const s = Math.max(W / sw, H / sh); ctx.drawImage(im, sx, sy, sw, sh, (W - sw * s) / 2, (H - sh * s) / 2, sw * s, sh * s); }
  /* Motion Viewer, drawn live: the trimaran in an irregular sea with heave, roll and pitch traces */
  const SPEC = ['#4FE3A0', '#5FD0FF', '#9D86FF', '#FF7EB6', '#FFC86B'];
  const specAt = u => { const x = clamp(u) * (SPEC.length - 1), i = Math.min(SPEC.length - 2, Math.floor(x)); return blendH(SPEC[i], SPEC[i + 1], x - i); };
  const seaH = (x, y, t) => 0.045 * Math.sin(x * 3.1 + t * 1.25 + y * 0.6) + 0.025 * Math.sin(x * 5.3 - y * 2.2 + t * 1.9) + 0.014 * Math.sin(x * 8.7 + y * 4.1 + t * 2.7);
  const motion = t => ({ heave: 0.05 * Math.sin(t * 1.25) + 0.018 * Math.sin(t * 1.9 + 1.1), roll: 0.09 * Math.sin(t * 0.82 + 0.4) + 0.025 * Math.sin(t * 1.7), pitch: 0.05 * Math.sin(t * 1.25 + 0.9) + 0.012 * Math.sin(t * 2.3) });
  const moved = (p, m) => { let [x, y, z] = p; z += 0.05; const cr = Math.cos(m.roll), sr = Math.sin(m.roll); [y, z] = [y * cr - z * sr, y * sr + z * cr]; const cp = Math.cos(m.pitch), sp = Math.sin(m.pitch); [x, z] = [x * cp - z * sp, x * sp + z * cp]; return [x, y, z + m.heave]; };
  function motionViewer(ctx, W, H, tt) {
    const t = 12.5 + tt, m = motion(t), f = (w, k) => `${w} ${Math.round(H * k)}px Outfit, Segoe UI, sans-serif`;
    ctx.fillStyle = '#0B0D12'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f1f4f8'; ctx.font = f(600, 0.045); ctx.textBaseline = 'middle'; ctx.fillText('Motion Viewer', W * 0.04, H * 0.065);
    ctx.fillStyle = '#7d8590'; ctx.font = f(500, 0.032); ctx.textAlign = 'right'; ctx.fillText('JONSWAP   Hs 5.50 m   Tp 10.32 s   head 150°', W * 0.96, H * 0.065); ctx.textAlign = 'left';
    // scene
    const yaw = -0.5 + Math.sin(tt * 0.25) * 0.08, sc = Math.min(W * 0.34, H * 0.5);
    ctx.save(); ctx.beginPath(); ctx.rect(0, H * 0.11, W, H * 0.5); ctx.clip(); ctx.translate(0, -H * 0.13);
    const rows = 15, line = (yy, alpha) => { ctx.beginPath(); for (let i = 0; i <= 64; i++) { const x = -1.6 + 3.2 * i / 64, q = proj([x, yy, seaH(x, yy, t)], yaw, W, H, sc); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); } ctx.strokeStyle = `rgba(95,208,255,${alpha.toFixed(3)})`; ctx.stroke(); };
    ctx.lineWidth = 1;
    for (let r = 0; r < rows; r++) { const yy = 1.3 - 2.6 * r / (rows - 1); if (yy > 0) line(yy, 0.12 + 0.2 * (1 - yy / 1.3)); }
    const hullCol = ['rgba(214,224,238,.92)', 'rgba(190,204,224,.9)'];
    meshes.forEach((mm, hi) => { for (let i = 0; i < NU; i++) for (let k = 0; k < NV; k++) {
      const q = [mm[i][k], mm[i + 1][k], mm[i + 1][k + 1], mm[i][k + 1]].map(pp => proj(moved(pp, m), yaw, W, H, sc));
      const shade = 0.55 + 0.45 * Math.abs(Math.cos(Math.PI * (k + 0.5) / NV));
      ctx.fillStyle = `rgba(${Math.round(150 + 70 * shade)},${Math.round(165 + 65 * shade)},${Math.round(185 + 55 * shade)},.95)`; ctx.beginPath(); q.forEach((pt, n) => n ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1])); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(11,13,18,.25)'; ctx.lineWidth = 0.6; ctx.stroke(); } });
    const deck = [[-0.62, -0.62], [0.32, -0.62], [0.32, 0.62], [-0.62, 0.62]].map(([x, y]) => proj(moved([x, y, 0.07], m), yaw, W, H, sc));
    ctx.fillStyle = 'rgba(95,168,255,.22)'; ctx.strokeStyle = 'rgba(95,168,255,.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); deck.forEach((pt, n) => n ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1])); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (let r = 0; r < rows; r++) { const yy = 1.3 - 2.6 * r / (rows - 1); if (yy <= 0) line(yy, 0.2 + 0.32 * (-yy / 1.3)); }
    ctx.restore();
    // traces: heave, roll, pitch over the last eight seconds, playhead at the right
    const tr = [['Heave', 'm', '#5FD0FF', u => motion(u).heave * 25], ['Roll', '°', '#FFC86B', u => motion(u).roll * 57.3], ['Pitch', '°', '#4FE3A0', u => motion(u).pitch * 57.3]];
    const x0 = W * 0.17, x1 = W * 0.8, span = 8, top = H * 0.66, rowH = H * 0.105;
    ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(W * 0.03, top - H * 0.035); ctx.lineTo(W * 0.97, top - H * 0.035); ctx.stroke();
    tr.forEach(([lbl, unit, col, fn], i) => {
      const yc = top + rowH * (i + 0.5), amp = rowH * 0.36, scale = i === 0 ? 1 / 1.8 : i === 1 ? 1 / 6.5 : 1 / 3.5;
      ctx.fillStyle = '#a3abb8'; ctx.font = f(500, 0.034); ctx.fillText(lbl, W * 0.04, yc);
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.moveTo(x0, yc); ctx.lineTo(x1, yc); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.beginPath();
      for (let k = 0; k <= 90; k++) { const u = k / 90, tu = t - span * (1 - u), v = fn(tu) * scale, x = x0 + u * (x1 - x0), y = yc - clamp(v, -1, 1) * amp; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      const vNow = fn(t), yN = yc - clamp(vNow * scale, -1, 1) * amp;
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x1, yN, H * 0.011, 0, 7); ctx.fill();
      ctx.fillStyle = '#f1f4f8'; ctx.font = f(600, 0.034); ctx.fillText(`${vNow >= 0 ? '+' : '−'}${Math.abs(vNow).toFixed(i ? 1 : 2)} ${unit}`, x1 + W * 0.025, yc);
    });
    ctx.textBaseline = 'alphabetic';
  }
  /* RAOs for every heading: six panels whose curves draw themselves, one colour per wave heading */
  const HEADS = [0, 30, 60, 90, 120, 150, 180];
  const resp = (T, Tn, z) => { const r = Tn / Math.max(T, 0.3); return 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * z * r, 2)); };
  const RAO = [
    ['Surge (x)', 'm/m', 1.6, (T, b) => Math.abs(Math.cos(b)) * 1.45 * (1 - Math.exp(-Math.pow(T / 7, 2.2)))],
    ['Sway (y)', 'm/m', 1.6, (T, b) => Math.abs(Math.sin(b)) * 1.42 * (1 - Math.exp(-Math.pow(T / 6.5, 2.2)))],
    ['Heave (z)', 'm/m', 1.6, (T, b) => Math.min(1.5, resp(T, 2.6, 0.32) * (1 - Math.exp(-Math.pow(T / 2.2, 3))) * (0.85 + 0.15 * Math.abs(Math.cos(b))))],
    ['Roll (φ)', '°/m', 9, (T, b) => Math.abs(Math.sin(b)) * 2.4 * resp(T, 3.3, 0.16) * Math.pow(Math.min(1, 3.3 / T), 1.2) * (1 - Math.exp(-Math.pow(T / 2.4, 4)))],
    ['Pitch (θ)', '°/m', 6, (T, b) => Math.abs(Math.cos(b)) * 1.9 * resp(T, 3.6, 0.3) * Math.pow(Math.min(1, 3.6 / T), 0.9) * (1 - Math.exp(-Math.pow(T / 2.6, 4)))],
    ['Yaw (ψ)', '°/m', 4, (T, b) => Math.abs(Math.sin(2 * b)) * 1.6 * resp(T, 3.2, 0.35) * Math.pow(Math.min(1, 3.2 / T), 1.3) * (1 - Math.exp(-Math.pow(T / 2.5, 4)))]
  ];
  function raoPlots(ctx, W, H, tt) {
    const k = clamp(tt / 3.2), f = (w, s2) => `${w} ${Math.round(H * s2)}px Outfit, Segoe UI, sans-serif`;
    ctx.fillStyle = '#0B0D12'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f1f4f8'; ctx.font = f(600, 0.045); ctx.textBaseline = 'middle'; ctx.fillText('RAO magnitudes, all wave headings', W * 0.04, H * 0.065);
    const gx = W * 0.05, gy = H * 0.13, gw = W * 0.8, gh = H * 0.8, cw = gw / 3, ch = gh / 2;
    RAO.forEach(([name, unit, ymax, fn], i) => {
      const px = gx + (i % 3) * cw, py = gy + Math.floor(i / 3) * ch, ax = px + cw * 0.16, ay = py + ch * 0.17, aw = cw * 0.78, ah = ch * 0.6;
      ctx.fillStyle = '#c9d1db'; ctx.font = f(600, 0.032); ctx.fillText(name, px + cw * 0.16, py + ch * 0.07);
      ctx.fillStyle = '#6b7380'; ctx.font = f(500, 0.026); ctx.textAlign = 'right'; ctx.fillText(unit, px + cw * 0.94, py + ch * 0.07); ctx.textAlign = 'left';
      ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1;
      for (let g = 0; g <= 4; g++) { const x = ax + aw * g / 4; ctx.beginPath(); ctx.moveTo(x, ay); ctx.lineTo(x, ay + ah); ctx.stroke(); }
      for (let g = 0; g <= 2; g++) { const y = ay + ah * g / 2; ctx.beginPath(); ctx.moveTo(ax, y); ctx.lineTo(ax + aw, y); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay + ah); ctx.lineTo(ax + aw, ay + ah); ctx.stroke();
      ctx.fillStyle = '#6b7380'; ctx.font = f(500, 0.024); ctx.textAlign = 'center';
      ['0', '5', '10', '15', '20'].forEach((l, g) => ctx.fillText(l, ax + aw * g / 4, ay + ah + H * 0.025));
      ctx.textAlign = 'left';
      HEADS.forEach((hd, j) => {
        const b = hd * Math.PI / 180, col = specAt(j / (HEADS.length - 1)), n = 70, mN = Math.max(1, Math.round(n * k));
        ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.95; ctx.beginPath();
        for (let q = 0; q <= mN; q++) { const T = 0.4 + 19.6 * q / n, v = Math.min(1, fn(T, b) / ymax), x = ax + aw * (T / 20), y = ay + ah * (1 - v); q ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke(); ctx.globalAlpha = 1;
      });
    });
    ctx.fillStyle = '#6b7380'; ctx.font = f(500, 0.026); ctx.textAlign = 'center'; ctx.fillText('Wave period T [s]', gx + gw / 2, H * 0.965); ctx.textAlign = 'left';
    const bx = W * 0.9, by = gy + H * 0.04, bh = gh * 0.82, grad = ctx.createLinearGradient(0, by + bh, 0, by);
    SPEC.forEach((c, i) => grad.addColorStop(i / (SPEC.length - 1), c));
    ctx.fillStyle = grad; rrect(ctx, bx, by, W * 0.018, bh, 3); ctx.fill();
    ctx.fillStyle = '#a3abb8'; ctx.font = f(500, 0.026); ['0°', '90°', '180°'].forEach((l, i) => ctx.fillText(l, bx + W * 0.028, by + bh * (1 - i / 2)));
    ctx.save(); ctx.translate(bx - W * 0.012, by + bh / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('Wave heading', 0, 0); ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }
  function draw(t) {
    const [ctx, W, H] = fit(cv); ctx.fillStyle = '#0B0D12'; ctx.fillRect(0, 0, W, H);
    if (t < 12.5 || t >= 19.5) { if (vStarted) { video.pause(); vStarted = false; } }
    if (t < 7.5) { workflow(ctx, W, H, t); return; }
    if (t < 12.5) {
      const tt = t - 7.5, yaw = -0.35 + tt * 0.16, sc = Math.min(W * 0.36, H * 0.62);
      ctx.strokeStyle = 'rgba(95,168,255,.18)'; ctx.lineWidth = 1; for (let i = -8; i <= 8; i++) { const a = proj([i * 0.16, -1.0, 0], yaw, W, H, sc), b = proj([i * 0.16, 1.0, 0], yaw, W, H, sc); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      const build = clamp(tt / 2.2);
      meshes.forEach((m, hi) => { const nu = Math.round(NU * build); for (let i = 0; i < nu; i++) for (let k = 0; k < NV; k++) { const q = [m[i][k], m[i + 1][k], m[i + 1][k + 1], m[i][k + 1]].map(p => proj(p, yaw, W, H, sc)); ctx.fillStyle = hi ? 'rgba(34,211,238,.10)' : 'rgba(61,155,255,.12)'; ctx.strokeStyle = hi ? 'rgba(34,211,238,.75)' : 'rgba(95,168,255,.85)'; ctx.lineWidth = 0.8; ctx.beginPath(); q.forEach((p, n) => n ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.stroke(); } const wl = m.map(r => proj(r[0], yaw, W, H, sc)).concat(m.slice().reverse().map(r => proj(r[NV], yaw, W, H, sc))); ctx.strokeStyle = '#34d399'; ctx.lineWidth = 1.6; ctx.beginPath(); wl.forEach((p, n) => n ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); });
      const tiles = [['3,947', 'panels'], ['0', 'leaks'], ['−0.88 %', 'volume error']], tw = W * 0.2;
      tiles.forEach(([v, l], i) => { const a = clamp((tt - 2.2 - i * 0.25) / 0.4); if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; const x = W * 0.05 + i * (tw + W * 0.02), y = H * 0.06; ctx.fillStyle = '#161A22'; rrect(ctx, x, y, tw, H * 0.15, 6); ctx.fill(); ctx.fillStyle = '#f1f4f8'; ctx.font = `600 ${Math.round(H * 0.06)}px Outfit, sans-serif`; ctx.fillText(v, x + 8, y + H * 0.08); ctx.fillStyle = '#7d8590'; ctx.font = `500 ${Math.round(H * 0.035)}px Outfit, sans-serif`; ctx.fillText(l, x + 8, y + H * 0.125); ctx.restore(); });
      return;
    }
    if (t < 19.5) { motionViewer(ctx, W, H, t - 12.5); return; }
    if (t < 24.5) { raoPlots(ctx, W, H, t - 19.5); return; }
    // operability polar: headings around, ship speeds as rings
    const tt = t - 24.5, cx = W * 0.42, cy = H * 0.52, R = Math.min(W, H) * 0.4, sectors = 24, rings = 4, shown = clamp(tt / 3.2) * sectors * rings;
    ctx.font = `500 ${Math.round(H * 0.035)}px Outfit, sans-serif`;
    let n = 0;
    for (let r = 0; r < rings; r++) for (let sct = 0; sct < sectors; sct++, n++) {
      if (n > shown) continue;
      const a0 = (sct / sectors) * 6.2832 - 1.5708, a1 = a0 + 6.2832 / sectors, r0 = R * (0.22 + r * 0.195), r1 = r0 + R * 0.18, hd = Math.abs(((sct + 0.5) / sectors * 360) % 360 - 180), v = (Math.cos(hd * Math.PI / 90) * 0.5 + 0.5) * 0.6 + r * 0.22;
      ctx.fillStyle = v < 0.55 ? 'rgba(52,211,153,.85)' : v < 0.8 ? 'rgba(254,188,46,.85)' : 'rgba(255,95,87,.8)';
      ctx.beginPath(); ctx.arc(cx, cy, r1, a0 + 0.01, a1 - 0.01); ctx.arc(cx, cy, r0, a1 - 0.01, a0 + 0.01, true); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; for (let r = 0; r <= rings; r++) { ctx.beginPath(); ctx.arc(cx, cy, R * (0.22 + r * 0.195) - (r ? R * 0.015 : 0), 0, 6.2832); ctx.stroke(); }
    ctx.fillStyle = '#a3abb8'; ['0 kn', '5', '10', '15 kn'].forEach((l, i) => ctx.fillText(l, cx + 4, cy - R * (0.22 + i * 0.195) - 4));
    ctx.fillStyle = '#f1f4f8'; ctx.beginPath(); ctx.moveTo(cx, cy - R * 0.16); ctx.lineTo(cx + R * 0.05, cy + R * 0.1); ctx.lineTo(cx - R * 0.05, cy + R * 0.1); ctx.closePath(); ctx.fill();
    const lx = W * 0.8; [['Operable', 'rgba(52,211,153,.85)'], ['Limited', 'rgba(254,188,46,.85)'], ['Not operable', 'rgba(255,95,87,.8)']].forEach(([l, c], i) => { const y = H * 0.36 + i * H * 0.1; ctx.fillStyle = c; rrect(ctx, lx - W * 0.06, y - H * 0.025, W * 0.03, H * 0.05, 3); ctx.fill(); ctx.fillStyle = '#c9d1db'; ctx.fillText(l, lx - W * 0.02, y + H * 0.012); });
    ctx.fillStyle = '#7d8590'; ctx.fillText('Heading 0° = head seas', W * 0.04, H * 0.94);
  }
  return { draw, stop() { if (video) video.pause(); vStarted = false; }, hold(b) { held = b; if (video) video.pause(); vStarted = false; } };
})();
const M2Card = (() => {
  const vis = $('.m2-visual'); if (!vis) return { redraw() {} };
  return showcase(vis, { def: TOUR_STEPS.m2, intro: null, drawTour: t => M2Screen && M2Screen.draw(t), stopTour: () => M2Screen && M2Screen.stop(), pause: () => M2Screen && M2Screen.hold(true), seek: (t, hold) => M2Screen && M2Screen.hold(hold) });
})();

/* ---------- founder: a live turbofan model (fan, compressor, combustor, turbine, airflow) in a CAD-style viewport ---------- */
const Part3D = (() => {
  const cv = $('canvas.part3d'), tri = $('canvas.triad'); if (!cv) return { redraw() {} };
  const RING = 40, TAU = 6.2832;
  const nac = [[-1.12, 0.6], [-1.02, 0.66], [-0.7, 0.68], [-0.2, 0.66], [0.25, 0.58]], core = [[-0.55, 0.3], [-0.2, 0.33], [0.3, 0.34], [0.75, 0.3], [1.0, 0.25]];
  const stages = [[-0.82, 0.16, 0.6, 18, 1, '#5FD0FF'], [-0.42, 0.14, 0.29, 22, 0.8, '#4FE3A0'], [-0.3, 0.14, 0.27, 24, 0.8, '#4FE3A0'], [-0.18, 0.14, 0.25, 26, 0.8, '#4FE3A0'], [0.5, 0.16, 0.3, 24, -0.9, '#FFB86B'], [0.64, 0.16, 0.31, 24, -0.9, '#FFB86B']];
  let sd = 3; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const parts = Array.from({ length: 150 }, () => { const by = rnd() < 0.62; return { by, x: -1.4 + rnd() * 2.9, a: rnd() * TAU, r: by ? 0.38 + rnd() * 0.24 : 0.16 + rnd() * 0.12, v: 0.5 + rnd() * 0.5 }; });
  let visible = false, raf = 0, t0 = performance.now(), last = 0;
  const view = t => ({ yaw: 0.95 + Math.sin(t * 0.22) * 0.38, pitch: -0.32 });
  function P(p, v, W, H, sc) {
    let [x, y, z] = p; const cy = Math.cos(v.yaw), sy = Math.sin(v.yaw); [x, z] = [x * cy + z * sy, -x * sy + z * cy];
    const cp = Math.cos(v.pitch), sp = Math.sin(v.pitch); [y, z] = [y * cp - z * sp, y * sp + z * cp];
    const f = 4 / (4 + z); return [W * 0.5 + x * sc * f, H * 0.55 - y * sc * f, z];
  }
  const line = (ctx, a, b) => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
  function ringPts(x, r, v, W, H, sc) { const out = []; for (let i = 0; i <= RING; i++) { const a = i / RING * TAU; out.push(P([x, Math.cos(a) * r, Math.sin(a) * r], v, W, H, sc)); } return out; }
  function poly(ctx, pts, near) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); }
  function draw(now) {
    const [ctx, W, H] = fit(cv), t = motionOK ? (now - t0) / 1000 : 3, v = view(t), sc = Math.min(W * 0.36, H * 0.62);
    ctx.clearRect(0, 0, W, H);
    // floor grid
    ctx.strokeStyle = 'rgba(120,170,230,.08)'; ctx.lineWidth = 1;
    for (let i = -6; i <= 6; i++) { line(ctx, P([i * 0.3, -0.95, -1.8], v, W, H, sc), P([i * 0.3, -0.95, 1.8], v, W, H, sc)); line(ctx, P([-1.8, -0.95, i * 0.3], v, W, H, sc), P([1.8, -0.95, i * 0.3], v, W, H, sc)); }
    // nacelle and core cowl as wire rings, with longitudinal lines on the far half only (a cutaway)
    ctx.lineWidth = 1;
    for (const [x, r] of nac) { ctx.strokeStyle = 'rgba(140,190,255,.28)'; poly(ctx, ringPts(x, r, v, W, H, sc)); }
    for (const [x, r] of core) { ctx.strokeStyle = 'rgba(140,190,255,.22)'; poly(ctx, ringPts(x, r, v, W, H, sc)); }
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, far = Math.sin(a) < 0.2; ctx.strokeStyle = far ? 'rgba(140,190,255,.22)' : 'rgba(140,190,255,.06)'; for (const prof of [nac, core]) { ctx.beginPath(); prof.forEach(([x, r], k) => { const p = P([x, Math.cos(a) * r, Math.sin(a) * r], v, W, H, sc); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.stroke(); } }
    // spinner and exhaust plug
    ctx.strokeStyle = 'rgba(200,225,255,.6)'; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; line(ctx, P([-1.04, 0, 0], v, W, H, sc), P([-0.82, Math.cos(a) * 0.16, Math.sin(a) * 0.16], v, W, H, sc)); line(ctx, P([1.32, 0, 0], v, W, H, sc), P([0.95, Math.cos(a) * 0.15, Math.sin(a) * 0.15], v, W, H, sc)); }
    // rotating stages
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, r0, r1, n, spd, col] of stages) {
      const rot = t * 2.4 * spd; ctx.strokeStyle = col; ctx.lineWidth = x < -0.8 ? 1.6 : 1.1;
      for (let i = 0; i < n; i++) { const a = rot + i / n * TAU; ctx.globalAlpha = 0.55 + 0.4 * (Math.sin(a) < 0 ? 1 : 0.4); const pts = []; for (let s = 0; s <= 5; s++) { const u = s / 5, rr = r0 + (r1 - r0) * u, aa = a + u * 0.35 * Math.sign(spd); pts.push(P([x + u * 0.04, Math.cos(aa) * rr, Math.sin(aa) * rr], v, W, H, sc)); } poly(ctx, pts); }
    }
    ctx.globalAlpha = 1;
    // combustor glow
    const glow = 0.75 + 0.25 * Math.sin(t * 7), cb = P([0.22, 0, 0], v, W, H, sc), gr = ctx.createRadialGradient(cb[0], cb[1], 0, cb[0], cb[1], sc * 0.42);
    gr.addColorStop(0, `rgba(255,200,107,${(0.55 * glow).toFixed(3)})`); gr.addColorStop(0.5, `rgba(255,126,90,${(0.18 * glow).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,126,90,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cb[0], cb[1], sc * 0.42, 0, TAU); ctx.fill();
    for (const x of [0.12, 0.22, 0.32]) { ctx.strokeStyle = `rgba(255,190,110,${(0.5 * glow).toFixed(3)})`; ctx.lineWidth = 1.4; poly(ctx, ringPts(x, 0.24, v, W, H, sc)); }
    // airflow: bypass (cool) and core (hot after the combustor)
    for (const q of parts) {
      const x = -1.4 + ((q.x + 1.4 + t * q.v * (q.by ? 0.9 : 0.7)) % 3.0), a = q.a + t * 0.6, r = q.by ? Math.min(q.r, x > 0.25 ? 0.62 : q.r) : q.r * (x > 0.75 ? 0.85 : 1);
      if (q.by && x > 0.9) continue;
      const hot = !q.by && x > 0.2, p1 = P([x, Math.cos(a) * r, Math.sin(a) * r], v, W, H, sc), p2 = P([x - 0.07, Math.cos(a) * r, Math.sin(a) * r], v, W, H, sc);
      ctx.strokeStyle = hot ? 'rgba(255,170,90,.75)' : 'rgba(95,208,255,.55)'; ctx.lineWidth = 1.3; line(ctx, p1, p2);
    }
    ctx.globalCompositeOperation = 'source-over';
    // labels with leader lines
    const lab = [['Fan', [-0.82, 0.6, 0]], ['Compressor', [-0.3, 0.27, 0]], ['Combustor', [0.22, 0.3, 0]], ['Turbine', [0.57, 0.3, 0]]];
    ctx.font = `500 ${Math.max(10, Math.round(H * 0.04))}px Outfit, sans-serif`;
    lab.forEach(([l, p], i) => { const a = P(p, v, W, H, sc), ty = H * 0.17 + (i % 2) * H * 0.075, tx = a[0] + (i < 2 ? -W * 0.02 : W * 0.02); ctx.strokeStyle = 'rgba(200,220,255,.35)'; ctx.lineWidth = 1; line(ctx, a, [tx, ty + 4]); ctx.fillStyle = 'rgba(232,238,246,.85)'; ctx.textAlign = i < 2 ? 'right' : 'left'; ctx.fillText(l, tx + (i < 2 ? -4 : 4), ty + 8); ctx.fillStyle = '#4FE3A0'; ctx.beginPath(); ctx.arc(a[0], a[1], 2.4, 0, TAU); ctx.fill(); });
    ctx.textAlign = 'left';
    if (tri) {
      const [tc, tw, th] = fit(tri), oo = [tw / 2, th / 2]; tc.clearRect(0, 0, tw, th);
      [['X', [1, 0, 0], '#E5484D'], ['Y', [0, 1, 0], '#30A46C'], ['Z', [0, 0, 1], '#3E63DD']].forEach(([l, d, c]) => { const p = P(d, v, 0, 0, 1), x = oo[0] + (p[0]) * 20, y = oo[1] + (p[1]) * 20; tc.strokeStyle = c; tc.lineWidth = 2; tc.lineCap = 'round'; tc.beginPath(); tc.moveTo(oo[0], oo[1]); tc.lineTo(x, y); tc.stroke(); tc.fillStyle = c; tc.font = '600 10px Outfit, sans-serif'; tc.textAlign = 'center'; tc.fillText(l, oo[0] + (x - oo[0]) * 1.35, oo[1] + (y - oo[1]) * 1.35 + 3.5); });
      tc.fillStyle = '#ECF1F7'; tc.beginPath(); tc.arc(oo[0], oo[1], 2.4, 0, 7); tc.fill();
    }
  }
  const loop = now => { raf = 0; if (!visible) return; if (now - last > 30 && !root.classList.contains('is-scrolling')) { draw(now); last = now; } if (motionOK) raf = requestAnimationFrame(loop); };
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); }).observe(cv);
  return { redraw() { draw(performance.now()); } };
})();


/* ---------- early access for the Achso! Play Store testing ---------- */
(() => {
  const form = $('form.early'); if (!form) return;
  const inp = $('input', form), msg = $('.early-msg', form);
  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = inp.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { inp.setAttribute('aria-invalid', 'true'); msg.textContent = 'Enter the email address of your Google Play account, like name@gmail.com.'; inp.focus(); return; }
    inp.removeAttribute('aria-invalid');
    const body = `Hi XTOM,\n\nPlease add me to the Achso! testing on Google Play.\n\nMy Google Play email: ${v}\n\nThank you!`;
    const href = `mailto:xtomsupport@gmail.com?subject=${encodeURIComponent('Achso! early access request')}&body=${encodeURIComponent(body)}`;
    const a = document.createElement('a'); a.href = href; a.target = '_top'; document.body.appendChild(a); a.click(); a.remove();
    msg.innerHTML = 'Your email app is opening with the request filled in. Press send to finish. No email app? Send your Google Play email to <a href="mailto:xtomsupport@gmail.com">xtomsupport@gmail.com</a>.';
  });
  inp.addEventListener('input', () => { if (inp.getAttribute('aria-invalid')) { inp.removeAttribute('aria-invalid'); msg.textContent = ''; } });
})();

/* ---------- glue for the new site ---------- */
if (store.get('xtom-gold') === '1') { root.classList.add('gold'); }
function layoutAll() { drawMarks(); Signature.redraw(); AchsoCard.redraw(); CanopyCard.redraw(); M2Card.redraw(); Part3D.redraw(); }
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layoutAll, 120); });
rm.addEventListener && rm.addEventListener('change', e => { motionOK = !e.matches; layoutAll(); });
window.XTOM = Object.assign(window.XTOM || {}, { toast, toggleGold, layoutAll });
const boot = () => layoutAll();
if (document.fonts && document.fonts.ready) { Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 600))]).then(boot); } else boot();
})();
