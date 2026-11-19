/* The live bathymetric chart from the previous XTOM site, made reusable: simplex-noise seabed
   drawn as contour lines (marching squares), the pointer probes it, a click sends a sonar
   ping, and an optional XTOM seamount rises out of the chart in the shape of the mark. */
(function () {
'use strict';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const root = document.documentElement;
const isGold = () => root.classList.contains('gold');
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function fit(cv, cap = 1.25) {
  const dpr = Math.min(cap, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  const W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [ctx, w, h];
}

/* XTOM maker's mark: the same geometry as the apps */
const PAL = { chrome: ['#FFFFFF', '#D5DAE2', '#7D8696', '#EEF1F5', '#8E97A6'], gold: ['#FFF6CF', '#F2C55C', '#B07A1E', '#FFE39A', '#9C6A14'] };
const XTOM = {
  boxes: [[-1.38, 0.5, 0.085, 0.58, 31], [-1.38, 0.5, 0.085, 0.58, -31], [-0.45, 0.93, 0.36, 0.085, 0], [-0.45, 0.45, 0.085, 0.45, 0]],
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
  drawAt(ctx, ox, oy, s, cols, shine) {
    const X = x => ox + x * s, Y = y => oy - y * s, top = Y(this.maxY), bot = Y(this.minY);
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
    if (shine > -0.4 && shine < 1.4) {
      const x0 = X(this.minX) + (X(this.maxX) - X(this.minX)) * shine;
      const sg = ctx.createLinearGradient(x0 - s * 0.35, top, x0 + s * 0.35, bot);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,.85)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save(); ctx.fillStyle = sg; ctx.fill(path); ctx.strokeStyle = sg; ctx.lineWidth = 0.19 * s; ctx.beginPath(); ctx.arc(X(0.46), Y(0.5), 0.38 * s, 0, 7); ctx.stroke(); ctx.restore();
    }
  }
};

/* simplex noise (3D) */
const noise3 = (() => {
  const G = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
  const perm = [...Array(256).keys()]; let sd = 20261118;
  for (let i = 255; i > 0; i--) { sd = (sd * 16807) % 2147483647; const j = sd % (i + 1); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  const p = new Uint8Array(512); for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const F3 = 1 / 3, G3 = 1 / 6;
  const c = (gi, x, y, z) => { let t = 0.6 - x * x - y * y - z * z; if (t < 0) return 0; t *= t; const g = G[gi]; return t * t * (g[0] * x + g[1] * y + g[2] * z); };
  return (x, y, z) => {
    const s = (x + y + z) * F3, i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s), t = (i + j + k) * G3;
    const x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) { if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; } else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; } }
    else { if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; } else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; } else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } }
    const ii = i & 255, jj = j & 255, kk = k & 255;
    return 32 * (c(p[ii + p[jj + p[kk]]] % 12, x0, y0, z0)
      + c(p[ii + i1 + p[jj + j1 + p[kk + k1]]] % 12, x0 - i1 + G3, y0 - j1 + G3, z0 - k1 + G3)
      + c(p[ii + i2 + p[jj + j2 + p[kk + k2]]] % 12, x0 - i2 + 2 * G3, y0 - j2 + 2 * G3, z0 - k2 + 2 * G3)
      + c(p[ii + 1 + p[jj + 1 + p[kk + 1]]] % 12, x0 - 1 + 3 * G3, y0 - 1 + 3 * G3, z0 - 1 + 3 * G3));
  };
})();

/* place(w, h) returns { cx, cy, width } for the seamount, or null for an open seabed */
function createSeabed(cv, host, { place = null, seed = 0 } = {}) {
  const L0 = -0.62, STEP = 0.12, NL = 15;
  let ctx, w = 0, h = 0, cell = 14, cols = 0, rows = 0, bump, val, isl = null, styles = [], hiRGB = '79,227,160';
  const ptr = { x: -999, y: -999, tx: -999, ty: -999, a: 0, ta: 0 };
  const pings = []; let lastUser = -1e9, lastAmbient = 0, shineT = -1;
  let born = 0, visible = false, raf = 0, last = 0, interval = 1000 / 30, slow = 0, scrolling = 0;

  function restyle() {
    styles = [];
    for (let l = 0; l < NL; l++) {
      const q = l / (NL - 1), idx = l % 4 === 2;
      const r = lerp(95, 79, q), g = lerp(208, 227, q), b = lerp(255, 160, q), a = lerp(0.07, 0.42, q * q) + (idx ? 0.08 : 0);
      styles.push({ c: `rgba(${r | 0},${g | 0},${b | 0},${a.toFixed(3)})`, w: idx ? 1.25 : 0.8 });
    }
    hiRGB = isGold() ? '255,200,107' : '79,227,160';
  }
  function layout() {
    [ctx, w, h] = fit(cv);
    cell = w < 600 ? 12 : 15;
    cols = Math.ceil(w / cell) + 2; rows = Math.ceil(h / cell) + 2;
    bump = new Float32Array(cols * rows); val = new Float32Array(cols * rows);
    isl = null;
    const pl = place && place(w, h);
    if (pl) {
      const MW = XTOM.maxX - XTOM.minX, s = pl.width / MW;
      isl = { s, cx: pl.cx, cy: pl.cy, ox: pl.cx - (XTOM.minX + XTOM.maxX) / 2 * s, oy: pl.cy + (XTOM.minY + XTOM.maxY) / 2 * s, dim: pl.dim || 1 };
      const fall = s * 0.46;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const d = XTOM.sdf((i * cell - isl.ox) / s, (isl.oy - j * cell) / s) * s;
        bump[j * cols + i] = d <= 0 ? 1 : Math.exp(-d / fall);
      }
    }
    restyle();
  }
  function ping(x, y, user) { pings.push({ x, y, t: performance.now() }); if (pings.length > 4) pings.shift(); if (user) lastUser = performance.now(); shineT = performance.now(); kick(); }

  function render(now) {
    if (!born) born = now;
    const t = (now - born) / 1000, anim = !reduced();
    const rise = anim ? easeOut((t - 0.1) / 1.9) : 1;
    ptr.x += (ptr.tx - ptr.x) * 0.14; ptr.y += (ptr.ty - ptr.y) * 0.14; ptr.a += (ptr.ta - ptr.a) * 0.07;
    const f = 1 / 330, tt = anim ? t * 0.045 + seed : 3.2 + seed, pa = anim ? ptr.a * 0.5 : 0, ps2 = 2 * 105 * 105;
    for (let j = 0, k = 0; j < rows; j++) {
      const py = j * cell;
      for (let i = 0; i < cols; i++, k++) {
        const px = i * cell, b = bump[k] * rise;
        const n = noise3(px * f, py * f, tt) * 0.62 + noise3(px * f * 2.3 + 17, py * f * 2.3 - 9, tt * 1.6) * 0.2;
        let v = n * (1 - 0.72 * b) + b * 1.12;
        if (pa > 0.01) { const dx = px - ptr.x, dy = py - ptr.y; v += pa * Math.exp(-(dx * dx + dy * dy) / ps2); }
        val[k] = v;
      }
    }
    const paths = []; for (let l = 0; l < NL; l++) paths.push(new Path2D());
    const needAll = anim && (ptr.a > 0.02 || pings.length > 0), all = needAll ? new Path2D() : null;
    for (let j = 0; j < rows - 1; j++) {
      const y = j * cell;
      for (let i = 0; i < cols - 1; i++) {
        const k = j * cols + i, a = val[k], b = val[k + 1], c = val[k + cols + 1], d = val[k + cols];
        const mn = Math.min(a, b, c, d), mx = Math.max(a, b, c, d);
        let l0 = Math.ceil((mn - L0) / STEP), l1 = Math.floor((mx - L0) / STEP);
        if (l0 < 0) l0 = 0; if (l1 > NL - 1) l1 = NL - 1;
        if (l0 > l1) continue;
        const x = i * cell;
        for (let l = l0; l <= l1; l++) {
          const Lv = L0 + l * STEP, code = (a > Lv ? 8 : 0) | (b > Lv ? 4 : 0) | (c > Lv ? 2 : 0) | (d > Lv ? 1 : 0);
          if (code === 0 || code === 15) continue;
          const tX = x + cell * (Lv - a) / (b - a), rY = y + cell * (Lv - b) / (c - b), bX = x + cell * (Lv - d) / (c - d), lY = y + cell * (Lv - a) / (d - a);
          const p = paths[l];
          const seg = (x1, y1, x2, y2) => { p.moveTo(x1, y1); p.lineTo(x2, y2); if (all) { all.moveTo(x1, y1); all.lineTo(x2, y2); } };
          switch (code) {
            case 1: case 14: seg(x, lY, bX, y + cell); break;
            case 2: case 13: seg(bX, y + cell, x + cell, rY); break;
            case 3: case 12: seg(x, lY, x + cell, rY); break;
            case 4: case 11: seg(tX, y, x + cell, rY); break;
            case 6: case 9: seg(tX, y, bX, y + cell); break;
            case 7: case 8: seg(tX, y, x, lY); break;
            case 5: seg(tX, y, x, lY); seg(bX, y + cell, x + cell, rY); break;
            case 10: seg(tX, y, x + cell, rY); seg(x, lY, bX, y + cell); break;
          }
        }
      }
    }
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = anim ? clamp(t / 0.9) : 1; ctx.lineCap = 'round';
    for (let l = 0; l < NL; l++) { ctx.strokeStyle = styles[l].c; ctx.lineWidth = styles[l].w; ctx.stroke(paths[l]); }
    if (all && ptr.a > 0.02) {
      const g = ctx.createRadialGradient(ptr.x, ptr.y, 0, ptr.x, ptr.y, 200);
      g.addColorStop(0, `rgba(${hiRGB},${(0.9 * ptr.a).toFixed(3)})`); g.addColorStop(1, `rgba(${hiRGB},0)`);
      ctx.strokeStyle = g; ctx.lineWidth = 1.3; ctx.stroke(all);
    }
    const maxR = Math.hypot(w, h) * 0.75;
    for (let i = pings.length - 1; i >= 0; i--) {
      const p = pings[i], r = (now - p.t) / 1000 * 480;
      if (r > maxR || !anim || !all) { pings.splice(i, 1); continue; }
      const fade = Math.pow(1 - r / maxR, 1.4), R = r + 4;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
      g.addColorStop(0, `rgba(${hiRGB},0)`); g.addColorStop(clamp((r - 80) / R), `rgba(${hiRGB},0)`);
      g.addColorStop(clamp((r - 4) / R), `rgba(${hiRGB},${(0.95 * fade).toFixed(3)})`); g.addColorStop(1, `rgba(${hiRGB},0)`);
      ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.stroke(all);
      ctx.strokeStyle = `rgba(${hiRGB},${(0.22 * fade).toFixed(3)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0, r), 0, 7); ctx.stroke();
    }
    if (isl) {
      const markA = anim ? easeOut((t - 1.2) / 0.9) : 1;
      if (markA > 0) {
        let sh = -1;
        if (anim) { const s2 = shineT > 0 ? (now - shineT) / 1300 : (t - 1.5) / 1.3; if (s2 >= 0 && s2 < 1) sh = s2 * 1.8 - 0.4; }
        ctx.globalAlpha = markA * isl.dim;
        XTOM.drawAt(ctx, isl.ox, isl.oy, isl.s, isGold() ? PAL.gold : PAL.chrome, sh);
      }
    }
    ctx.globalAlpha = 1;
    const ac = isl ? [isl.cx, isl.cy] : [w * 0.62, h * 0.5];
    if (anim && t > 2.6 && now - lastUser > 9000 && now - lastAmbient > 7000) { lastAmbient = now; ping(ac[0], ac[1], false); }
  }
  addEventListener('scroll', () => { scrolling = performance.now(); }, { passive: true });
  function loop(now) {
    raf = 0; if (!visible || document.hidden) return;
    if (now - scrolling > 140 && now - last >= interval - 1) {
      const t0 = performance.now(); render(now); last = now;
      const dt = performance.now() - t0; slow = slow * 0.9 + dt * 0.1; interval = slow > 8 ? 1000 / 20 : 1000 / 30;
    }
    if (!reduced()) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop); }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !w) layout(); kick(); if (visible && reduced()) render(performance.now()); }).observe(host);
  document.addEventListener('visibilitychange', kick);
  host.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const r = cv.getBoundingClientRect(); ptr.tx = e.clientX - r.left; ptr.ty = e.clientY - r.top;
    if (ptr.a < 0.02) { ptr.x = ptr.tx; ptr.y = ptr.ty; } ptr.ta = 1; kick();
  });
  host.addEventListener('pointerleave', () => { ptr.ta = 0; });
  host.addEventListener('click', e => {
    if (e.target.closest('a,button,input,label') || reduced()) return;
    const r = cv.getBoundingClientRect(); ping(e.clientX - r.left, e.clientY - r.top, true);
  });
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { layout(); kick(); if (reduced()) render(performance.now()); }, 150); });
  document.addEventListener('xtom:gold', () => { restyle(); kick(); });
  return { layout, ping };
}

window.XTOM3D = Object.assign(window.XTOM3D || {}, { createSeabed });
})();
