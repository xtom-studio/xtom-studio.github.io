/* XTOM M.2 in motion: a parametric hull lofts from its lines plan to a panel mesh, is swept
   into chrome and then rides an irregular contour-line sea with live heave, pitch and roll.
   Lives inside the Projects sheet, driven by scroll progress 0..1. */
(function () {
'use strict';
const THREE = window.THREE;

const L = 6, B = 1.0, D = 0.66, T = 0.38;          // model hull: length, beam, depth, draft
const SCALE = 25;                                  // model unit to metres for the readouts (150 m ship)
const VW = 0.64;                                    // girth parameter of the design waterline
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

function freeboard(s) { return (D - T) * (1 + 0.45 * s * s + 0.25 * Math.max(0, s)); }
function hullPoint(u, v, side, out) {
  const s = 2 * u - 1, bow = Math.max(0, s), aft = Math.max(0, -s);
  const hb = s >= 0 ? (B / 2) * Math.pow(Math.max(0, 1 - Math.pow(s, 2.3)), 0.62) : (B / 2) * (1 - 0.32 * Math.pow(aft, 3));
  const d = s >= 0 ? T * Math.pow(Math.max(0, 1 - Math.pow(s, 7)), 0.5) : T * (1 - 0.72 * Math.pow(clamp((aft - 0.55) / 0.45), 1.5));
  const fb = freeboard(s), n = 2.2 + 3.2 * (1 - s * s), hbW = hb * 0.97;
  let y, z;
  if (v <= VW) { const th = (v / VW) * Math.PI / 2, e = 2 / n; y = hbW * Math.pow(Math.sin(th), e); z = -d * Math.pow(Math.cos(th), e); }
  else { const t = (v - VW) / (1 - VW); z = t * fb; y = hbW + (hb - hbW) * t + hb * 0.06 * t * t * bow; }
  let x = s * L / 2;
  if (s > 0.6) x += 0.32 * ((s - 0.6) / 0.4) * ((z + d) / (fb + d) - 0.35);
  return out.set(x, z, side * y);
}

function hullGeometry(NU, NV) {
  const pos = [], idx = [], p = new THREE.Vector3();
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) { hullPoint(i / NU, j / NV, side, p); pos.push(p.x, p.y, p.z); }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
      const a = base + i * (NV + 1) + j, b = a + NV + 1, c = b + 1, d = a + 1;
      if (side > 0) idx.push(a, b, d, b, c, d); else idx.push(a, d, b, b, d, c);
    }
  }
  let base = pos.length / 3;
  for (let i = 0; i <= NU; i++) { hullPoint(i / NU, 1, 1, p); pos.push(p.x, p.y, p.z); hullPoint(i / NU, 1, -1, p); pos.push(p.x, p.y, p.z); }
  for (let i = 0; i < NU; i++) { const a = base + i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  base = pos.length / 3;
  const ring = [];
  for (let j = 0; j <= NV; j++) ring.push(hullPoint(0, j / NV, 1, new THREE.Vector3()));
  for (let j = NV; j >= 0; j--) ring.push(hullPoint(0, j / NV, -1, new THREE.Vector3()));
  const c = ring.reduce((a, q) => a.add(q), new THREE.Vector3()).multiplyScalar(1 / ring.length);
  pos.push(c.x, c.y, c.z); ring.forEach(q => pos.push(q.x, q.y, q.z));
  for (let k = 0; k < ring.length - 1; k++) idx.push(base, base + 1 + k, base + 2 + k);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function lineSet() {
  const pos = [], t = [], col = [];
  return {
    add(fn, N, t0, t1, color) {
      const a = new THREE.Vector3(), b = new THREE.Vector3(), cc = new THREE.Color(color);
      fn(0, a);
      for (let k = 1; k <= N; k++) {
        fn(k / N, b);
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
        t.push(lerp(t0, t1, (k - 1) / N), lerp(t0, t1, k / N));
        col.push(cc.r, cc.g, cc.b, cc.r, cc.g, cc.b);
        a.copy(b);
      }
    },
    build() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('aT', new THREE.Float32BufferAttribute(t, 1));
      g.setAttribute('aColor', new THREE.Float32BufferAttribute(col, 3));
      return g;
    }
  };
}
const lineMaterial = () => new THREE.ShaderMaterial({
  uniforms: { uDraw: { value: 0 }, uAlpha: { value: 1 } },
  vertexShader: `attribute float aT; attribute vec3 aColor; varying float vT; varying vec3 vC;
    void main(){ vT = aT; vC = aColor; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uDraw; uniform float uAlpha; varying float vT; varying vec3 vC;
    void main(){ if (vT > uDraw) discard; float head = smoothstep(uDraw - 0.035, uDraw, vT);
      gl_FragColor = vec4(mix(vC, vec3(1.0), head * 0.7), uAlpha * (0.72 + 0.28 * head)); }`,
  transparent: true, depthWrite: false
});

function linesPlan() {
  const ls = lineSet(), SKY = '#5FD0FF', MINT = '#4FE3A0', NS = 20;
  for (let i = 0; i <= NS; i++) {
    const u = i / NS, d0 = 0.05 + 0.4 * (i / NS);
    for (const side of [1, -1]) ls.add((v, o) => hullPoint(u, v, side, o), 28, d0, d0 + 0.32, SKY);
  }
  const longs = [[0, SKY], [0.22, SKY], [0.44, SKY], [VW, MINT], [0.82, SKY], [1, SKY]];
  longs.forEach(([v, c], k) => { for (const side of [1, -1]) ls.add((u, o) => hullPoint(u, v, side, o), 110, 0.02 + k * 0.05, 0.5 + k * 0.05, c); });
  const yb = -T - 0.42;
  ls.add((u, o) => o.set(lerp(-L / 2, L / 2 + 0.07, u), yb, 0), 2, 0.55, 0.8, MINT);
  ls.add((u, o) => o.set(-L / 2, lerp(yb - 0.08, yb + 0.08, u), 0), 1, 0.55, 0.6, MINT);
  ls.add((u, o) => o.set(L / 2 + 0.07, lerp(yb - 0.08, yb + 0.08, u), 0), 1, 0.75, 0.8, MINT);
  ls.add((u, o) => o.set(lerp(-L / 2 - 0.5, L / 2 + 0.6, u), 0, 0), 2, 0.6, 0.95, MINT);
  return ls.build();
}
function panelMesh() {
  const ls = lineSet(), NU = 44, NV = 9, MINT = '#4FE3A0';
  const at = (u, v, side, o) => { hullPoint(u, v * VW, side, o); o.x *= 1.002; o.z *= 1.01; o.y -= 0.002; return o; };
  for (const side of [1, -1]) {
    for (let i = 0; i <= NU; i++) { const u = i / NU; ls.add((v, o) => at(u, v, side, o), NV, u * 0.85, u * 0.85 + 0.12, MINT); }
    for (let j = 0; j <= NV; j++) { const v = j / NV; ls.add((u, o) => at(u, v, side, o), NU * 2, 0, 0.97, MINT); }
  }
  return ls.build();
}

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
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.025).texture;
  pm.dispose();
  return tex;
}

function seaMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAmp: { value: 0.14 }, uOpacity: { value: 0 } },
    vertexShader: `uniform float uTime; uniform float uAmp; varying float vH; varying vec3 vW;
      float wave(vec2 p, float t){ float h = 0.0;
        h += sin(dot(p, vec2(0.92, 0.36)) * 1.15 + t * 1.10) * 0.50;
        h += sin(dot(p, vec2(-0.42, 0.95)) * 1.85 + t * 1.45) * 0.28;
        h += sin(dot(p, vec2(0.71, -0.62)) * 3.10 + t * 2.05) * 0.14;
        h += sin(dot(p, vec2(0.21, 0.83)) * 5.30 + t * 2.85) * 0.07;
        return h; }
      void main(){ vec3 p = position; float h = wave(p.xz, uTime); p.y += h * uAmp; vH = h;
        vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uOpacity; varying float vH; varying vec3 vW;
      void main(){ float k = vH * 7.0 + 0.5; float d = abs(fract(k) - 0.5) / fwidth(k); float line = 1.0 - min(d, 1.0);
        vec3 c = mix(vec3(0.373, 0.816, 1.0), vec3(0.31, 0.89, 0.627), smoothstep(-0.6, 0.8, vH));
        float r = length(vW.xz) / 15.0; float fade = 1.0 - smoothstep(0.35, 1.0, r);
        vec3 base = vec3(0.039, 0.043, 0.07);
        gl_FragColor = vec4(mix(base, c, line * 0.9), (0.78 * fade + line * 0.2 * fade) * uOpacity); }`,
    transparent: true, depthWrite: true, side: THREE.DoubleSide
  });
}

function createHull(canvas, { reduced = false, dragEl = canvas } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { return null; }
  if (!renderer.getContext()) return null;
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.environment = studioEnv(renderer);
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 200);
  const target = new THREE.Vector3(0, -0.05, 0);

  const hull = new THREE.Group(); scene.add(hull);
  const lines = new THREE.LineSegments(linesPlan(), lineMaterial()); lines.renderOrder = 3; hull.add(lines);
  const mesh = new THREE.LineSegments(panelMesh(), lineMaterial()); mesh.renderOrder = 2; hull.add(mesh);

  const cutLocal = new THREE.Plane(new THREE.Vector3(-1, 0, 0), -L);
  const cut = new THREE.Plane();
  const chromeMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 1, roughness: 0.18, envMapIntensity: 1.35, clearcoat: 0.8, clearcoatRoughness: 0.12,
    side: THREE.DoubleSide, clippingPlanes: [cut], polygonOffset: true, polygonOffsetFactor: 1.5, polygonOffsetUnits: 2
  });
  const solid = new THREE.Group(); hull.add(solid);
  solid.add(new THREE.Mesh(hullGeometry(140, 40), chromeMat));
  const deckMat = new THREE.MeshPhysicalMaterial({ color: 0xd3d9e2, metalness: 0.4, roughness: 0.38, envMapIntensity: 1.1, side: THREE.DoubleSide, clippingPlanes: [cut] });
  const house = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.3, 0.62), deckMat); house.position.set(-L / 2 + 0.6, freeboard(-0.8) + 0.15, 0); solid.add(house);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.86), deckMat); bridge.position.set(-L / 2 + 0.66, freeboard(-0.8) + 0.38, 0); solid.add(bridge);

  const ringGeo = new THREE.BufferGeometry();
  const RN = 64; ringGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((RN * 2 + 3) * 3), 3));
  const ring = new THREE.Line(ringGeo, new THREE.LineBasicMaterial({ color: 0xFFC86B, transparent: true, opacity: 0.95, depthTest: false }));
  ring.renderOrder = 5; hull.add(ring);
  const tmp = new THREE.Vector3();
  function updateRing(x) {
    const u = clamp((x / (L / 2) + 1) / 2), a = ringGeo.attributes.position; let k = 0;
    for (let j = 0; j <= RN; j++) { hullPoint(u, j / RN, 1, tmp); a.setXYZ(k++, tmp.x, tmp.y, tmp.z); }
    for (let j = RN; j >= 0; j--) { hullPoint(u, j / RN, -1, tmp); a.setXYZ(k++, tmp.x, tmp.y, tmp.z); }
    hullPoint(u, 0, 1, tmp); a.setXYZ(k++, tmp.x, tmp.y, tmp.z);
    a.needsUpdate = true; ringGeo.setDrawRange(0, k);
  }

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(34, 34, 240, 240).rotateX(-Math.PI / 2), seaMaterial());
  sea.renderOrder = 1; scene.add(sea);

  const KEYS = [
    { p: 0.00, dir: [0.0, 0.05, 1], m: 1.0 },
    { p: 0.30, dir: [0.5, -0.32, 1], m: 0.92 },
    { p: 0.56, dir: [0.82, 0.46, 1], m: 0.86 },
    { p: 0.84, dir: [1.0, 0.16, 0.82], m: 0.8 },
    { p: 1.00, dir: [1.05, 0.2, 0.74], m: 0.78 }
  ].map(k => ({ ...k, v: new THREE.Vector3(...k.dir).normalize() }));

  const st = { p: 0, pt: 0, draw: 0, yaw: 0, yawT: 0, mx: 0, my: 0, mxT: 0, myT: 0, active: false, time: 0, born: 0, lastUser: 0, fit: 16, wide: true };
  let W = 1, H = 1, raf = 0, frameCb = null;
  const camPos = new THREE.Vector3(), dirTmp = new THREE.Vector3();

  function resize() {
    const r = canvas.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, W < 720 ? 1.5 : 1.75));
    renderer.setSize(W, H, false);
    const aspect = W / H; st.wide = aspect > 1.05;
    camera.fov = st.wide ? 24 : 30; camera.aspect = aspect;
    const frac = st.wide ? (aspect > 1.5 ? 0.56 : 0.66) : 0.92;
    st.fit = (L * 0.56) / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect * frac);
    placeView(st.p);
  }
  function placeView(p) {
    const k = sstep(0.14, 0.6, p);
    if (st.wide) camera.setViewOffset(W, H, lerp(-0.12, -0.08, k) * W, lerp(-0.06, 0.0, k) * H, W, H);
    else camera.setViewOffset(W, H, 0, lerp(-0.04, 0.02, k) * H, W, H);
  }
  function camAt(p) {
    let i = 0; while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
    const a = KEYS[i], b = KEYS[i + 1], t = sstep(a.p, b.p, p);
    dirTmp.copy(a.v).lerp(b.v, t).normalize();
    return camPos.copy(dirTmp).multiplyScalar(st.fit * lerp(a.m, b.m, t));
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - (st.last || now)) / 1000); st.last = now; st.time += dt;
    if (!st.born) st.born = now;
    st.draw = reduced ? 1 : 1 - Math.pow(1 - clamp((now - st.born - 150) / 2400), 3);
    st.p += (st.pt - st.p) * (reduced ? 1 : 1 - Math.exp(-dt * 5));
    const p = st.p;
    if (now - st.lastUser > 3500) st.yawT *= Math.exp(-dt * 0.8);
    st.yaw += (st.yawT - st.yaw) * (1 - Math.exp(-dt * 6));
    st.mx += (st.mxT - st.mx) * (1 - Math.exp(-dt * 3)); st.my += (st.myT - st.my) * (1 - Math.exp(-dt * 3));

    const meshK = sstep(0.12, 0.34, p), sweep = sstep(0.38, 0.6, p), seaK = sstep(0.64, 0.84, p), floatK = sstep(0.7, 0.92, p);
    lines.material.uniforms.uDraw.value = st.draw * 1.02;
    lines.material.uniforms.uAlpha.value = lerp(1, 0.22, sstep(0.42, 0.62, p)) * lerp(1, 0.5, seaK);
    mesh.material.uniforms.uDraw.value = meshK * 1.02;
    mesh.material.uniforms.uAlpha.value = (1 - sstep(0.5, 0.64, p)) * 0.95;
    mesh.visible = meshK > 0.001 && p < 0.66;

    const cx = lerp(-L / 2 - 0.6, L / 2 + 0.8, sweep);
    cutLocal.constant = cx;
    solid.visible = sweep > 0.001;
    ring.visible = sweep > 0.01 && sweep < 0.99;
    if (ring.visible) updateRing(Math.min(cx, L / 2));

    const t = st.time, heave = 0.07 * Math.sin(t * 1.1) + 0.025 * Math.sin(t * 1.9 + 1.3);
    const pitch = 0.028 * Math.sin(t * 1.1 + 0.8) + 0.01 * Math.sin(t * 2.0), roll = 0.045 * Math.sin(t * 0.75 + 0.3);
    hull.position.y = heave * floatK + Math.sin(t * 0.6) * 0.02 * (1 - floatK);
    hull.rotation.set(roll * floatK, st.yaw, pitch * floatK, 'YXZ');
    hull.updateMatrixWorld();
    cut.copy(cutLocal).applyMatrix4(hull.matrixWorld);

    sea.visible = seaK > 0.001;
    sea.position.y = lerp(-1.4, 0, seaK);
    sea.material.uniforms.uTime.value = t;
    sea.material.uniforms.uOpacity.value = seaK;

    placeView(p);
    camAt(p); camera.position.copy(camPos).add(target); camera.position.x += st.mx * 0.5; camera.position.y += st.my * 0.3;
    camera.lookAt(target);
    renderer.render(scene, camera);

    if (frameCb) frameCb({ p, heave: heave * SCALE * floatK, pitch: THREE.MathUtils.radToDeg(pitch) * floatK, roll: THREE.MathUtils.radToDeg(roll) * floatK });
    if (st.active && !document.hidden && !reduced) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  let drag = null;
  dragEl.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('a,button,input,label,.m2-cap')) return;
    drag = { x: e.clientX, y: e.clientY, yaw: st.yawT, id: e.pointerId, moved: false };
  });
  addEventListener('pointermove', e => {
    if (st.active && W > 0 && e.pointerType === 'mouse') { const r = canvas.getBoundingClientRect(); st.mxT = ((e.clientX - r.left) / W - 0.5) * 2; st.myT = -((e.clientY - r.top) / H - 0.5) * 2; }
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) { drag.moved = true; dragEl.classList.add('dragging'); try { dragEl.setPointerCapture(e.pointerId); } catch (_) {} }
    if (drag.moved) { st.yawT = drag.yaw + dx * 0.0065; st.lastUser = performance.now(); kick(); }
  });
  const end = () => { if (drag) dragEl.classList.remove('dragging'); drag = null; };
  addEventListener('pointerup', end); addEventListener('pointercancel', end);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && st.active) kick(); });
  addEventListener('resize', () => { resize(); kick(); });
  resize();
  if (reduced) kick();

  return {
    setProgress(p) { st.pt = clamp(p); if (reduced) st.p = st.pt; kick(); },
    setActive(on) { if (on && !st.active) { resize(); } st.active = on; if (on) kick(); },
    setGold(on) { chromeMat.color.set(on ? 0xF6CB63 : 0xffffff); chromeMat.roughness = on ? 0.2 : 0.14; kick(); },
    onFrame(cb) { frameCb = cb; }
  };
}

window.XTOM3D = Object.assign(window.XTOM3D || {}, { createHull });
})();
