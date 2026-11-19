/* XTOM general arrangement: a planetary gearbox that goes from its drawing to an exploded,
   meshed model, is machined into metal, and finally runs with true planetary kinematics.
   Sun 18 teeth, three planets of 27, fixed ring of 72: ratio 1 + 72/18 = 5 : 1. */
(function () {
'use strict';
const THREE = window.THREE;

const M = 0.055, ZS = 18, ZP = 27, ZR = 72, NP = 3;
const RS = M * ZS / 2, RP = M * ZP / 2, A = RS + RP;       // pitch radii and carrier radius
const R_OUT = 2.35, R_BOLT = 2.2, W_G = 0.42, W_R = 0.5;
const RATIO = 1 + ZR / ZS;                                  // 5
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const frac = x => x - Math.floor(x);

/* ---------- tooth profiles ---------- */
function profile(Z, internal) {
  const r = M * Z / 2, P = TAU / Z;
  const tip = internal ? r - M : r + M, root = internal ? r + 1.25 * M : r - 1.25 * M;
  const up = internal ? r - 0.45 * M : r + 0.5 * M, low = internal ? r + 0.6 * M : r - 0.6 * M;
  const shape = [[root, -0.5], [root, -0.37], [low, -0.3], [r, -0.25], [up, -0.205], [tip, -0.15], [tip, -0.05], [tip, 0.05], [tip, 0.15], [up, 0.205], [r, 0.25], [low, 0.3], [root, 0.37]];
  const pts = [];
  for (let k = 0; k < Z; k++) for (const [rad, f] of shape) { const a = (k + f) * P; pts.push([rad * Math.cos(a), rad * Math.sin(a)]); }
  return pts;
}
const circle = (r, n = 128, cx = 0, cy = 0) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(i / n * TAU), cy + r * Math.sin(i / n * TAU)]);
const carrierOutline = alpha0 => Array.from({ length: 240 }, (_, i) => {
  const t = i / 240 * TAU, r = 0.78 + 0.74 * Math.pow(0.5 + 0.5 * Math.cos(NP * (t - alpha0)), 3);
  return [r * Math.cos(t), r * Math.sin(t)];
});
const toShape = pts => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath(); return s; };
const toPath = pts => { const s = new THREE.Path(); pts.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath(); return s; };
function extrude(shape, depth) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.008, bevelSegments: 2, curveSegments: 32 });
  g.translate(0, 0, -depth / 2); g.computeVertexNormals(); return g;
}
const cylZ = (r, len, z0, seg = 48) => { const g = new THREE.CylinderGeometry(r, r, len, seg); g.rotateX(Math.PI / 2); g.translate(0, 0, z0 + len / 2); return g; };

/* ---------- lines with reveal (aT), arc length (aS) and dash period (aD) ---------- */
function lineSet() {
  const pos = [], t = [], s = [], d = [], col = [];
  const api = {
    poly(points, t0, t1, color, dash = 0, closed = false) {
      const P = closed ? [...points, points[0]] : points, c = new THREE.Color(color); let acc = 0;
      for (let k = 1; k < P.length; k++) {
        const a = P[k - 1], b = P[k], len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        pos.push(...a, ...b);
        t.push(lerp(t0, t1, (k - 1) / (P.length - 1)), lerp(t0, t1, k / (P.length - 1)));
        s.push(acc, acc + len); acc += len; d.push(dash, dash);
        col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      }
      return api;
    },
    loop(pts2, z, t0, t1, color, dash = 0) { return api.poly(pts2.map(([x, y]) => [x, y, z]), t0, t1, color, dash, true); },
    seg(a, b, t0, t1, color, dash = 0) { return api.poly([a, b], t0, t1, color, dash); },
    build() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('aT', new THREE.Float32BufferAttribute(t, 1));
      g.setAttribute('aS', new THREE.Float32BufferAttribute(s, 1));
      g.setAttribute('aD', new THREE.Float32BufferAttribute(d, 1));
      g.setAttribute('aColor', new THREE.Float32BufferAttribute(col, 3));
      return g;
    }
  };
  return api;
}
const lineMaterial = () => new THREE.ShaderMaterial({
  uniforms: { uDraw: { value: 0 }, uAlpha: { value: 1 } },
  vertexShader: `attribute float aT; attribute float aS; attribute float aD; attribute vec3 aColor; varying float vT; varying float vS; varying float vD; varying vec3 vC;
    void main(){ vT = aT; vS = aS; vD = aD; vC = aColor; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uDraw; uniform float uAlpha; varying float vT; varying float vS; varying float vD; varying vec3 vC;
    void main(){ if (vT > uDraw) discard; if (vD > 0.0 && fract(vS / vD) > 0.58) discard;
      float head = smoothstep(uDraw - 0.03, uDraw, vT);
      gl_FragColor = vec4(mix(vC, vec3(1.0), head * 0.7), uAlpha * (0.74 + 0.26 * head)); }`,
  transparent: true, depthWrite: false
});

const SKY = '#5FD0FF', MINT = '#4FE3A0', DIM = '#7F93A8';

/* ---------- studio environment: chrome banding like the XTOM mark ---------- */
function studioEnv(renderer) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vP; void main(){ float y = vP.y;
      vec3 zen = vec3(0.34, 0.37, 0.44), sky = vec3(0.10, 0.115, 0.15), band = vec3(0.012, 0.014, 0.022), gl = vec3(0.16, 0.17, 0.20), deep = vec3(0.02, 0.022, 0.03);
      vec3 c;
      if (y > 0.18) c = mix(sky, zen, smoothstep(0.18, 0.95, y));
      else if (y > 0.02) c = mix(band, sky, smoothstep(0.07, 0.18, y));
      else if (y > -0.25) c = mix(gl, band, smoothstep(-0.12, 0.02, y));
      else c = mix(deep, gl, smoothstep(-0.9, -0.25, y));
      gl_FragColor = vec4(c, 1.0); }`
  })));
  const o = new THREE.Vector3();
  const panel = (w, h, color, k, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(o); env.add(m); };
  panel(16, 2.2, '#ffffff', 6.0, 0, 15, 4);           // key softbox overhead
  panel(2.2, 14, '#ffffff', 5.0, -15, 3, 9);          // tall strip, camera left
  panel(1.6, 12, '#ffffff', 3.2, 13, 4, 10);          // tall strip, camera right
  { const gp = new THREE.Mesh(new THREE.PlaneGeometry(26, 14), new THREE.ShaderMaterial({ side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec2 vU; void main(){ float b = smoothstep(0.3, 0.92, vU.y) * 3.4 + smoothstep(0.5, 0.0, abs(vU.x - 0.5)) * 0.35; gl_FragColor = vec4(vec3(b), 1.0); }' }));
    gp.position.set(0, 5, 18); gp.lookAt(o); env.add(gp); }
  panel(14, 1.0, '#5FD0FF', 2.2, 4, 2.5, -16);
  panel(8, 0.8, '#9D86FF', 1.8, 16, 1, 2);
  panel(6, 0.8, '#FFC86B', 1.2, 12, -2.5, -8);
  panel(5, 0.8, '#FF7EB6', 1.0, -14, 1.5, -9);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.025).texture;
  pm.dispose();
  return tex;
}

/* ---------- the scene ---------- */
function createGearbox(canvas, { reduced = false, dragEl = canvas } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { return null; }
  if (!renderer.getContext()) return null;
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.environment = studioEnv(renderer);
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 200);
  const drawMat = lineMaterial(), meshMat = lineMaterial();
  const cut = new THREE.Plane(new THREE.Vector3(-1, 0, 0), -10);
  const metal = (color, rough) => new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: rough, envMapIntensity: 1.35, clippingPlanes: [cut], polygonOffset: true, polygonOffsetFactor: 1.5, polygonOffsetUnits: 2 });
  const chrome = metal(0xffffff, 0.12), graphite = metal(0xa3abba, 0.3);

  const box = new THREE.Group(); scene.add(box);
  const zf = w => w / 2 + 0.014;                         // front face, just in front of the bevel

  // planet carrier angles: the first planet sits at the top of the drawing
  const alpha0 = Array.from({ length: NP }, (_, i) => Math.PI / 2 + i * TAU / NP);
  // mesh phases: sun tooth meets planet gap, ring tooth meets planet gap (see derivation in the comments of meshPhase)
  const planet0 = alpha0.map(a => a + Math.PI - (TAU / ZP) * (0.5 - frac(a * ZS / TAU)));
  const ringPhase = (() => { const a = alpha0[0], fp2 = (a - planet0[0]) * ZP / TAU; return a - (TAU / ZR) * (0.5 + fp2); })();

  /* ring gear: graphite housing ring with internal teeth and a bolted flange */
  const ringG = new THREE.Group(); box.add(ringG);
  {
    const sh = toShape(circle(R_OUT, 220));
    sh.holes.push(toPath(profile(ZR, true)));
    for (let i = 0; i < 8; i++) sh.holes.push(toPath(circle(0.055, 28, R_BOLT * Math.cos(i * TAU / 8 + TAU / 16), R_BOLT * Math.sin(i * TAU / 8 + TAU / 16))));
    const mesh = new THREE.Mesh(extrude(sh, W_R), graphite); ringG.add(mesh);
    ringG.rotation.z = ringPhase;
    const dl = lineSet(), ml = lineSet(), z = zf(W_R);
    dl.loop(circle(R_OUT, 220), z, 0.0, 0.32, SKY).loop(profile(ZR, true), z, 0.08, 0.55, SKY).loop(circle(M * ZR / 2, 200), z, 0.25, 0.6, MINT, 0.09);
    dl.loop(circle(R_BOLT, 200), z, 0.3, 0.62, DIM, 0.12);
    for (let i = 0; i < 8; i++) dl.loop(circle(0.055, 24, R_BOLT * Math.cos(i * TAU / 8 + TAU / 16), R_BOLT * Math.sin(i * TAU / 8 + TAU / 16)), z, 0.45 + i * 0.02, 0.5 + i * 0.02, SKY);
    for (let k = 0; k < ZR; k++) {                     // FEA-style mesh: radial lines through the rim and axial lines on the outside
      const a = (k + 0.5) * TAU / ZR, r0 = M * ZR / 2 + 1.25 * M, c = Math.cos(a), s = Math.sin(a), u = k / ZR;
      ml.seg([r0 * c, r0 * s, z], [R_OUT * c, R_OUT * s, z], u * 0.8, u * 0.8 + 0.12, MINT);
      if (k % 2 === 0) ml.seg([R_OUT * c * 1.002, R_OUT * s * 1.002, -W_R / 2], [R_OUT * c * 1.002, R_OUT * s * 1.002, W_R / 2], u * 0.8 + 0.05, u * 0.8 + 0.15, MINT);
    }
    [2.13, 2.27].forEach((r, i) => ml.loop(circle(r, 180), z, 0.1 + i * 0.1, 0.9, MINT));
    ml.loop(circle(R_OUT * 1.002, 180), -W_R / 2, 0.2, 0.95, MINT);
    ringG.add(new THREE.LineSegments(dl.build(), drawMat), new THREE.LineSegments(ml.build(), meshMat));
  }

  /* gears: the sun (input) and three planets */
  function gearPart(Z, w, hole, mat, t0) {
    const g = new THREE.Group();
    const sh = toShape(profile(Z, false)); sh.holes.push(toPath(circle(hole, 48)));
    g.add(new THREE.Mesh(extrude(sh, w), mat));
    const r = M * Z / 2, root = r - 1.25 * M, z = zf(w), dl = lineSet(), ml = lineSet();
    dl.loop(profile(Z, false), z, t0, t0 + 0.34, SKY).loop(circle(hole, 48), z, t0 + 0.2, t0 + 0.3, SKY).loop(circle(r, 140), z, t0 + 0.1, t0 + 0.4, MINT, 0.07);
    dl.seg([-r - 0.22, 0, z], [r + 0.22, 0, z], t0, t0 + 0.2, DIM, 0.16).seg([0, -r - 0.22, z], [0, r + 0.22, z], t0, t0 + 0.2, DIM, 0.16);
    for (let k = 0; k < Z; k++) {
      const a = k * TAU / Z, c = Math.cos(a), s = Math.sin(a), u = k / Z;
      ml.seg([hole * c, hole * s, z], [root * c, root * s, z], u * 0.85, u * 0.85 + 0.12, MINT);
      const tip = r + M; ml.seg([tip * c, tip * s, -w / 2], [tip * c, tip * s, w / 2], u * 0.85 + 0.04, u * 0.85 + 0.14, MINT);
    }
    [hole + (root - hole) * 0.4, hole + (root - hole) * 0.75].forEach((rr, i) => ml.loop(circle(rr, 90), z, 0.1 + i * 0.1, 0.95, MINT));
    ml.loop(profile(Z, false), -w / 2 - 0.014, 0.15, 0.98, MINT);
    g.add(new THREE.LineSegments(dl.build(), drawMat), new THREE.LineSegments(ml.build(), meshMat));
    return g;
  }
  const sunG = gearPart(ZS, W_G, 0.13, chrome, 0.32); box.add(sunG);
  sunG.add(new THREE.Mesh(cylZ(0.13, 1.75, -0.3), chrome));
  { const key = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.42), chrome); key.position.set(0, 0.145, 1.05); sunG.add(key); }
  const planets = alpha0.map((a, i) => { const g = gearPart(ZP, W_G, 0.16, chrome, 0.42 + i * 0.08); box.add(g); return g; });

  /* carrier: a three-lobed plate behind the planets with pins and the output shaft */
  const carrierG = new THREE.Group(); box.add(carrierG);
  const plateZ = -W_G / 2 - 0.13;
  {
    const outline = carrierOutline(Math.PI / 2), sh = toShape(outline);
    const plate = new THREE.Mesh(extrude(sh, 0.12), graphite); plate.position.z = plateZ; carrierG.add(plate);
    alpha0.forEach(a => { const pin = new THREE.Mesh(cylZ(0.15, W_G + 0.2, plateZ, 32), chrome); pin.position.set(A * Math.cos(a), A * Math.sin(a), 0); carrierG.add(pin); });
    carrierG.add(new THREE.Mesh(cylZ(0.24, 1.25, plateZ - 1.25), chrome));
    carrierG.add(new THREE.Mesh(cylZ(0.34, 0.1, plateZ - 0.16), graphite));
    const dl = lineSet(), ml = lineSet(), z = plateZ + 0.06 + 0.014;
    dl.loop(outline, z, 0.55, 0.92, DIM, 0.06);         // hidden behind the planets: drawn dashed, as on a drawing
    dl.loop(circle(A, 160), z, 0.5, 0.85, SKY, 0.11);
    for (let k = 0; k < 60; k++) { const a = k * TAU / 60, r1 = 0.24, r2 = Math.hypot(...outline[Math.round(k / 60 * 240) % 240]) * 0.98; ml.seg([r1 * Math.cos(a), r1 * Math.sin(a), z], [r2 * Math.cos(a), r2 * Math.sin(a), z], k / 60 * 0.85, k / 60 * 0.85 + 0.12, MINT); }
    carrierG.add(new THREE.LineSegments(dl.build(), drawMat), new THREE.LineSegments(ml.build(), meshMat));
  }

  /* the drawing sheet itself: centre lines, the ring's diameter dimension, the exploded-view axis */
  const sheet = new THREE.Group(); scene.add(sheet);
  {
    const dl = lineSet(), ml = lineSet(), z = 0.3;
    dl.seg([-R_OUT - 0.5, 0, z], [R_OUT + 0.5, 0, z], 0, 0.28, DIM, 0.22).seg([0, -R_OUT - 0.5, z], [0, R_OUT + 0.5, z], 0.02, 0.3, DIM, 0.22);
    // a diameter callout across the ring, leader and shelf out to the upper right
    const da = Math.PI / 6, ux = Math.cos(da), uy = Math.sin(da), P = s => [s * R_OUT * ux, s * R_OUT * uy, z];
    const arrow = (s, t0) => { const [x, y] = P(s), bx = -s * ux * 0.15, by = -s * uy * 0.15, nx = -uy * 0.055, ny = ux * 0.055; dl.poly([[x + bx + nx, y + by + ny, z], [x, y, z], [x + bx - nx, y + by - ny, z]], t0, t0 + 0.04, MINT); };
    dl.seg(P(-1), P(1), 0.66, 0.9, MINT);
    dl.poly([P(1), [(R_OUT + 0.55) * ux, (R_OUT + 0.55) * uy, z], [(R_OUT + 0.55) * ux + 0.7, (R_OUT + 0.55) * uy, z]], 0.88, 0.98, MINT);
    arrow(1, 0.9); arrow(-1, 0.92);
    ml.seg([0, 0, -2.6], [0, 0, 2.9], 0, 0.6, SKY, 0.2);
    alpha0.forEach(a => ml.seg([A * Math.cos(a), A * Math.sin(a), -0.8], [A * Math.cos(a), A * Math.sin(a), 1.4], 0.2, 0.7, SKY, 0.2));
    sheet.add(new THREE.LineSegments(dl.build(), drawMat));
    const axis = new THREE.LineSegments(ml.build(), meshMat); axis.name = 'axis'; sheet.add(axis);
  }

  /* the cutter: an amber line that passes across while the parts are machined */
  const toolGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -2.9, 1.2), new THREE.Vector3(0, 2.9, 1.2)]);
  const tool = new THREE.Line(toolGeo, new THREE.LineBasicMaterial({ color: 0xFFC86B, transparent: true, opacity: 0.95, depthTest: false }));
  tool.renderOrder = 6; scene.add(tool);

  /* camera keyframes: direction, where the box sits on screen (cx, cy) and its diameter as a share of the height */
  const KEYS = {
    wide: [
      { p: 0.00, dir: [0, 0, 1], cx: 0.69, cy: 0.5, d: 0.54 },
      { p: 0.30, dir: [0.95, 0.5, 1], cx: 0.66, cy: 0.48, d: 0.56 },
      { p: 0.56, dir: [0.6, 0.32, 1], cx: 0.64, cy: 0.47, d: 0.64 },
      { p: 0.84, dir: [0.42, 0.26, 1], cx: 0.62, cy: 0.47, d: 0.68 },
      { p: 1.00, dir: [0.36, 0.22, 1], cx: 0.62, cy: 0.47, d: 0.7 }
    ],
    tall: [
      { p: 0.00, dir: [0, 0, 1], cx: 0.5, cy: 0.565, d: 0.34 },
      { p: 0.30, dir: [0.95, 0.5, 1], cx: 0.5, cy: 0.44, d: 0.32 },
      { p: 0.56, dir: [0.6, 0.32, 1], cx: 0.5, cy: 0.43, d: 0.35 },
      { p: 0.84, dir: [0.42, 0.26, 1], cx: 0.5, cy: 0.42, d: 0.36 },
      { p: 1.00, dir: [0.36, 0.22, 1], cx: 0.5, cy: 0.42, d: 0.36 }
    ]
  };
  Object.values(KEYS).forEach(list => list.forEach(k => { k.v = new THREE.Vector3(...k.dir).normalize(); }));

  const st = { p: 0, pt: 0, draw: 0, theta: 0, wDrag: 0, mx: 0, my: 0, mxT: 0, myT: 0, active: true, time: 0, born: performance.now(), wide: true, rpm: 0 };
  let W = 1, H = 1, raf = 0, frameCb = null;
  const dir = new THREE.Vector3(), target = new THREE.Vector3();

  // adaptive resolution: keep frames inside the display's budget on 60 to 120 Hz screens
  const prMax = () => Math.min(window.devicePixelRatio || 1, W < 720 ? 1.25 : 1.5);
  let pr = 0, ema = 8, slowFor = 0, fastFor = 0;
  function adapt(dtMs) {
    ema += (dtMs - ema) * 0.08;
    if (ema > 19) { slowFor += dtMs; fastFor = 0; } else if (ema < 11) { fastFor += dtMs; slowFor = 0; } else { slowFor = fastFor = 0; }
    if (slowFor > 900 && pr > 0.75) { pr = Math.max(0.75, pr - 0.25); renderer.setPixelRatio(pr); renderer.setSize(W, H, false); slowFor = 0; }
    else if (fastFor > 4000 && pr < prMax()) { pr = Math.min(prMax(), pr + 0.25); renderer.setPixelRatio(pr); renderer.setSize(W, H, false); fastFor = 0; }
  }


  function resize() {
    const r = canvas.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    pr = pr ? Math.min(pr, prMax()) : prMax(); renderer.setPixelRatio(pr);
    renderer.setSize(W, H, false);
    st.wide = W / H > 1.05;
    camera.fov = st.wide ? 24 : 30; camera.aspect = W / H;
  }
  function placeCamera(p) {
    const list = st.wide ? KEYS.wide : KEYS.tall;
    let i = 0; while (i < list.length - 2 && p > list[i + 1].p) i++;
    const a = list[i], b = list[i + 1], t = sstep(a.p, b.p, p);
    const cx = lerp(a.cx, b.cx, t), cy = lerp(a.cy, b.cy, t);
    let dpx = lerp(a.d, b.d, t) * H; if (!st.wide) dpx = Math.min(dpx, 0.9 * W);
    const dist = (R_OUT * H) / (dpx * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    dir.copy(a.v).lerp(b.v, t).normalize();
    camera.position.copy(dir).multiplyScalar(dist);
    camera.position.x += st.mx * 0.35; camera.position.y += st.my * 0.25;
    camera.lookAt(target);
    camera.setViewOffset(W, H, -(cx - 0.5) * W, -(cy - 0.5) * H, W, H);
  }

  function frame(now) {
    raf = 0;
    const dtMs = now - (st.last || now), dt = Math.min(0.05, dtMs / 1000); st.last = now; st.time += dt; if (dtMs > 0 && dtMs < 200) adapt(dtMs);
    st.draw = reduced ? 1 : 1 - Math.pow(1 - clamp((now - st.born - 350) / 2800), 3);
    st.p += (st.pt - st.p) * (reduced ? 1 : 1 - Math.exp(-dt * 5));
    const p = st.p;
    st.mx += (st.mxT - st.mx) * (1 - Math.exp(-dt * 3)); st.my += (st.myT - st.my) * (1 - Math.exp(-dt * 3));

    const meshK = sstep(0.12, 0.34, p), explode = sstep(0.12, 0.3, p) * (1 - sstep(0.42, 0.6, p));
    const sweep = sstep(0.38, 0.62, p), runK = sstep(0.66, 0.86, p);

    // input shaft: idles when running, and the visitor can spin it by dragging
    st.wDrag *= Math.exp(-dt * 1.4);
    const w = (reduced ? 0 : 1.05 * runK + 0.06 * (1 - runK)) + st.wDrag;
    st.theta += w * dt;
    st.rpm += ((w / 1.05) * 1500 - st.rpm) * (1 - Math.exp(-dt * 4));
    const ts = st.theta, tc = ts * ZS / (ZS + ZR);
    sunG.rotation.z = ts; carrierG.rotation.z = tc;
    planets.forEach((g, i) => {
      const a = alpha0[i] + tc;
      g.position.set(A * Math.cos(a), A * Math.sin(a), 0.85 * explode);
      g.rotation.z = planet0[i] + tc - (ts - tc) * ZS / ZP;
    });
    sunG.position.z = 1.6 * explode; carrierG.position.z = -1.0 * explode; ringG.position.z = 0;

    drawMat.uniforms.uDraw.value = st.draw * 1.02;
    drawMat.uniforms.uAlpha.value = lerp(st.wide ? 1 : 0.55, 0.16, sstep(0.4, 0.62, p)) * lerp(1, 0.6, runK);
    meshMat.uniforms.uDraw.value = meshK * 1.02;
    meshMat.uniforms.uAlpha.value = (1 - sstep(0.5, 0.64, p)) * 0.9;

    const cx = lerp(-3.0, 3.2, sweep);
    cut.constant = cx;
    const solidOn = sweep > 0.001;
    [ringG, sunG, carrierG, ...planets].forEach(g => g.children.forEach(c => { if (c.isMesh) c.visible = solidOn; }));
    tool.visible = sweep > 0.01 && sweep < 0.99; tool.position.x = cx;

    placeCamera(p);
    renderer.render(scene, camera);
    if (frameCb) frameCb({ p, rpmIn: st.rpm, rpmOut: st.rpm / RATIO, ratio: RATIO });
    if (st.active && !document.hidden && !reduced) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  // drag sideways to turn the input shaft; the planets and carrier follow
  let drag = null;
  dragEl.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('a,button,input,label,.tblock,.hero-copy,.loft-cap')) return;
    drag = { x: e.clientX, y: e.clientY, last: e.clientX, id: e.pointerId, moved: false };
  });
  addEventListener('pointermove', e => {
    if (W > 0 && e.pointerType === 'mouse') { st.mxT = (e.clientX / W - 0.5) * 2; st.myT = -(e.clientY / H - 0.5) * 2; }
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) { drag.moved = true; dragEl.classList.add('dragging'); try { dragEl.setPointerCapture(e.pointerId); } catch (_) {} }
    if (drag.moved) { st.wDrag = clamp(st.wDrag + (e.clientX - drag.last) * 0.045, -9, 9); drag.last = e.clientX; kick(); }
  });
  const end = () => { if (drag) dragEl.classList.remove('dragging'); drag = null; };
  addEventListener('pointerup', end); addEventListener('pointercancel', end);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  addEventListener('resize', () => { resize(); kick(); });
  resize(); kick();

  return {
    setProgress(p) { st.pt = clamp(p); if (reduced) st.p = st.pt; kick(); },
    setActive(on) { st.active = on; if (on) kick(); },
    setGold(on) { chrome.color.set(on ? 0xF6CB63 : 0xffffff); chrome.roughness = on ? 0.2 : 0.13; kick(); },
    onFrame(cb) { frameCb = cb; }
  };
}

window.XTOM3D = Object.assign(window.XTOM3D || {}, { createGearbox });
})();
