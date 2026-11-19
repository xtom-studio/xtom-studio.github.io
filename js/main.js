/* XTOM site choreography: smooth scroll, sheet index, keyboard addressing, the gearbox,
   the XTOM M.2 sea scene, the live seabeds, line-draw reveals, the archive pin and the
   small working parts (copy, menu, gold). Classic script so the site also runs from file://. */
(function () {
'use strict';
const { createGearbox, createHull, createSeabed } = window.XTOM3D || {};

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const gsap = window.gsap, ST = window.ScrollTrigger;
const hasGsap = !!(gsap && ST);
if (hasGsap) gsap.registerPlugin(ST);

/* ---------- smooth scroll ---------- */
let lenis = null;
if (hasGsap && !reduced && window.Lenis) {
  lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 });
  lenis.on('scroll', ST.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const scrollToY = (y, immediate = false) => {
  if (lenis) lenis.scrollTo(y, { duration: immediate ? 0 : 1.5, immediate, easing: t => 1 - Math.pow(1 - t, 4) });
  else window.scrollTo({ top: y, behavior: reduced || immediate ? 'auto' : 'smooth' });
};
const topOf = el => el.getBoundingClientRect().top + window.scrollY;

/* ---------- sheets: index, keyboard, ruler, film ---------- */
const sheets = $$('[data-sheet]');
const navLinks = $$('.sheets a');
const nowN = $('.now-n'), nowT = $('.now-t');
function goTo(el, fromKeyboard) {
  if (!el) return;
  scrollToY(el.id === 'top' ? 0 : topOf(el));
  if (fromKeyboard) { const h = $('h1, h2', el); if (h) { h.setAttribute('tabindex', '-1'); setTimeout(() => h.focus({ preventScroll: true }), lenis ? 900 : 50); } }
  history.replaceState(null, '', el.id === 'top' ? location.pathname : '#' + el.id);
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const id = a.getAttribute('href').slice(1), el = id ? document.getElementById(id) : null;
  if (!el || id === 'main') return;
  e.preventDefault(); closeMenu(); goTo(el, e.detail === 0);
});
addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest('input, textarea, select, [contenteditable]')) return;
  if (/^[1-9]$/.test(e.key)) { const el = sheets[+e.key - 1]; if (el) { e.preventDefault(); goTo(el, true); } }
  if (e.key === 'Escape') closeMenu();
});
function setSheet(el) {
  const id = el.id;
  navLinks.forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + id ? 'true' : 'false'));
  if (nowN) { nowN.textContent = el.dataset.sheet; nowT.textContent = el.dataset.title; }
  root.dataset.sheetNow = el.dataset.sheet;          // the ambient light changes colour per sheet
}

const ruler = $('.ruler'), rulerLbl = $('.ruler-mark span');
function onScroll() {
  const y = window.scrollY, max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  root.style.setProperty('--film-y', (-((y * 0.12) % 40)).toFixed(2) + 'px');
  if (ruler && ruler.offsetParent !== null) {
    const p = clamp(y / max), h = ruler.clientHeight - 30;
    root.style.setProperty('--ruler-y', (p * h).toFixed(1) + 'px');
    const zone = 'Zone ' + 'ABCDEFGH'[Math.min(7, Math.floor(p * 8))]; if (rulerLbl.textContent !== zone) rulerLbl.textContent = zone;
  }
  if (!hasGsap) {                                    // fallback sheet tracking without ScrollTrigger
    const mid = innerHeight * 0.45; let cur = sheets[0];
    for (const s of sheets) if (s.getBoundingClientRect().top <= mid) cur = s;
    setSheet(cur);
  }
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- menu ---------- */
const menu = $('#menu'), menuBtn = $('.menu-btn');
$$('#menu li').forEach((li, i) => li.style.setProperty('--i', i));
function openMenu() { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('open')); menuBtn.setAttribute('aria-expanded', 'true'); lenis && lenis.stop(); const a = $('a', menu); a && a.focus(); }
function closeMenu() { if (menu.hidden) return; menu.classList.remove('open'); menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); lenis && lenis.start(); }
menuBtn.addEventListener('click', () => menu.hidden ? openMenu() : closeMenu());
document.addEventListener('pointerdown', e => { if (!menu.hidden && !menu.contains(e.target) && !menuBtn.contains(e.target)) closeMenu(); });

/* ---------- copy address ---------- */
$$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
  const v = b.dataset.copy, toast = window.XTOM && window.XTOM.toast;
  try { await navigator.clipboard.writeText(v); toast && toast('Address copied: ' + v); }
  catch (e) { toast && toast('Copy failed. The address is ' + v); }
}));

/* ---------- SHEET 01: the gearbox, from drawing to running ---------- */
const hero = $('#top'), stage = $('.stage'), canvas = $('#scene');
const STATES = [['drawing', 0, 0.02], ['mesh', 0.2, 0.3], ['machined', 0.42, 0.55], ['running', 0.66, 0.92]];
const chips = $$('.loft [data-go]');
const ro = { in: $('[data-ro="in"]'), out: $('[data-ro="out"]') };
const fmt = n => Math.round(Math.abs(n)).toLocaleString('en-US');
let gear = null;                                   // the gearbox scene
try { gear = createGearbox ? createGearbox(canvas, { reduced, dragEl: stage }) : null; } catch (e) { gear = null; }
if (!gear) { root.classList.add('no-webgl'); canvas.remove(); }
else {
  root.classList.add('webgl');
  let state = '';
  gear.onFrame(f => {
    let s = 'drawing'; for (const [n, a] of STATES) if (f.p >= a) s = n;
    if (s !== state) {
      state = s; stage.dataset.state = s;
      chips.forEach(c => c.setAttribute('aria-pressed', c.dataset.go === s ? 'true' : 'false'));
    }
    if (s === 'running') { ro.in.textContent = fmt(f.rpmIn); ro.out.textContent = fmt(f.rpmOut); }
  });
  const heroRange = () => Math.max(1, hero.offsetHeight - innerHeight);
  chips.forEach(c => c.addEventListener('click', () => {
    const target = STATES.find(s => s[0] === c.dataset.go)[2];
    if (reduced || hero.offsetHeight <= innerHeight + 2) gear.setProgress(target);
    else scrollToY(topOf(hero) + target * heroRange());
  }));
  if (reduced) gear.setProgress(0.55);
  if (hasGsap && !reduced) {
    ST.create({ trigger: hero, start: 'top top', end: 'bottom bottom', onUpdate: s => gear.setProgress(s.progress) });
    ST.create({                                      // hand the scene off as the drawing scrolls away
      trigger: hero, start: 'bottom bottom', end: 'bottom top',
      onUpdate: s => { canvas.style.transform = `translate3d(0,${(-s.progress * innerHeight).toFixed(1)}px,0)`; }
    });
    ST.create({ trigger: hero, start: 'top bottom', end: 'bottom top', onToggle: s => { gear.setActive(s.isActive); canvas.classList.toggle('off', !s.isActive); } });
  } else if (!reduced) {
    addEventListener('scroll', () => { const p = clamp(-hero.getBoundingClientRect().top / heroRange()); gear.setProgress(p); }, { passive: true });
  }
  document.addEventListener('xtom:gold', e => gear.setGold(e.detail));
  if (root.classList.contains('gold')) gear.setGold(true);
}
const tb = $('.tblock');
if (tb && 'ResizeObserver' in window) new ResizeObserver(() => stage.style.setProperty('--tb-h', tb.offsetHeight + 'px')).observe(tb);

/* ---------- pause looping diagrams off screen ---------- */
const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('paused', !e.isIntersecting)), { rootMargin: '120px' });
$$('[data-anim]').forEach(s => io.observe(s));

/* ---------- motion: lines draw first, then ink fills ---------- */
function splitWords(el) {
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(tok => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(tok)); return; }
          const w = document.createElement('span'); w.className = 'w';
          const i = document.createElement('span'); i.textContent = tok; w.appendChild(i); frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
  };
  el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  walk(el);
  $$('.w', el).forEach(w => w.setAttribute('aria-hidden', 'true'));
}

if (hasGsap && !reduced) {
  // section cut lines draw across before anything else on the sheet
  $$('.sheet-sec').forEach(sec => {
    const cut = $('.cut', sec);
    if (cut) gsap.from(cut, { scaleX: 0, duration: 1.5, ease: 'expo.inOut', scrollTrigger: { trigger: sec, start: 'top 92%', once: true } });
  });
  // headings rise word by word out of their own line slot
  $$('[data-split]').forEach(h => {
    splitWords(h);
    gsap.from($$('.w > span', h), { yPercent: 112, duration: 1.15, ease: 'expo.out', stagger: 0.045, delay: 0.15, scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
  });
  // the statement fills in at reading pace
  const stm = $('[data-fill]');
  if (stm) {
    const words = [];
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(tok => { if (!tok) return; if (/^\s+$/.test(tok)) frag.appendChild(document.createTextNode(tok)); else { const s = document.createElement('span'); s.className = 'fw'; s.textContent = tok; words.push(s); frag.appendChild(s); } });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(stm);
    const paint = p => words.forEach((w, i) => w.style.setProperty('--o', (0.16 + 0.84 * clamp(p * words.length * 1.15 - i)).toFixed(3)));
    paint(0);
    ST.create({ trigger: stm, start: 'top 82%', end: 'bottom 48%', scrub: true, onUpdate: s => paint(s.progress) });
  }
  // blocks surface in order
  const reveal = '.sec-head p, .vm > div, .bom caption, .bom tbody tr, .revs tbody tr, .open-note, .pledges li, .founder-copy p, .inspector, .contact-lede, .addr, .contact .actions, .topics li, .foot-tb';
  gsap.set(reveal, { opacity: 0, y: 26 });
  ST.batch(reveal, { start: 'top 90%', once: true, onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07, overwrite: true }) });
  // detail views: frame first, then their linework draws, then it runs
  const drawIn = el => {
    const svgEls = $$('.dg .ln', el).filter(n => !n.classList.contains('profile'));
    svgEls.forEach(n => n.setAttribute('pathLength', '1'));
    el.classList.add('drawing');
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('drawn')));
    setTimeout(() => { el.classList.remove('drawing', 'drawn'); svgEls.forEach(n => n.removeAttribute('pathLength')); }, 2000);
  };
  gsap.set('.detail', { opacity: 0, y: 30 });
  ST.batch('.detail', { start: 'top 88%', once: true, onEnter: b => { gsap.to(b, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.09, overwrite: true }); b.forEach((el, i) => setTimeout(() => drawIn(el), 120 + i * 90)); } });
  // the price is revised to zero
  const price = $('.price');
  if (price) {
    const strike = $('.strike path', price), nw = $('.new', price), note = $('.rev-note', price);
    gsap.set(strike, { '--strike': 1 }); gsap.set(nw, { opacity: 0, yPercent: 18 }); gsap.set(note, { opacity: 0 });
    gsap.timeline({ scrollTrigger: { trigger: price, start: 'top 78%', once: true } })
      .to(strike, { '--strike': 0, duration: 0.9, ease: 'power2.inOut' }, 0.2)
      .to(nw, { opacity: 1, yPercent: 0, duration: 1.2, ease: 'expo.out' }, 0.75)
      .to(note, { opacity: 1, duration: 0.6 }, 1.25);
  }
}

/* ---------- SHEET 04: XTOM M.2 in motion, a hull from lines to a seaway ---------- */
const m2 = $('#m2-scene');
if (m2) {
  const m2Stage = $('.m2-stage', m2), m2Canvas = $('.m2-canvas', m2);
  const M2S = [['lines', 0, 0.03], ['mesh', 0.2, 0.3], ['hull', 0.42, 0.55], ['afloat', 0.66, 0.92]];
  const m2Chips = $$('.m2-ctl [data-go]', m2);
  const m2ro = { heave: $('[data-m2="heave"]', m2), pitch: $('[data-m2="pitch"]', m2), roll: $('[data-m2="roll"]', m2) };
  const sign = (v, d) => (v >= 0 ? '+' : '') + v.toFixed(d);
  let hull = null;
  try { hull = createHull ? createHull(m2Canvas, { reduced, dragEl: m2Stage }) : null; } catch (e) { hull = null; }
  if (!hull) m2.classList.add('no-scene');
  else {
    let st2 = '';
    hull.onFrame(f => {
      let s = 'lines'; for (const [n, a] of M2S) if (f.p >= a) s = n;
      if (s !== st2) { st2 = s; m2Stage.dataset.state = s; m2Chips.forEach(c => c.setAttribute('aria-pressed', c.dataset.go === s ? 'true' : 'false')); }
      if (s === 'afloat') { m2ro.heave.textContent = sign(f.heave, 2); m2ro.pitch.textContent = sign(f.pitch, 1); m2ro.roll.textContent = sign(f.roll, 1); }
    });
    const range = () => Math.max(1, m2.offsetHeight - innerHeight);
    m2Chips.forEach(c => c.addEventListener('click', () => {
      const t = M2S.find(s => s[0] === c.dataset.go)[2];
      if (reduced || m2.offsetHeight <= innerHeight + 2) hull.setProgress(t); else scrollToY(topOf(m2) + t * range());
    }));
    document.addEventListener('xtom:gold', e => hull.setGold(e.detail));
    if (root.classList.contains('gold')) hull.setGold(true);
    if (reduced) { hull.setProgress(0.92); new IntersectionObserver(es => { if (es[0].isIntersecting) hull.setActive(true); }).observe(m2); }
    else if (hasGsap) {
      ST.create({ trigger: m2, start: 'top top', end: 'bottom bottom', onUpdate: s => hull.setProgress(s.progress) });
      ST.create({ trigger: m2, start: 'top bottom', end: 'bottom top', onToggle: s => hull.setActive(s.isActive) });
    } else {
      new IntersectionObserver(es => hull.setActive(es[0].isIntersecting)).observe(m2);
      addEventListener('scroll', () => hull.setProgress(clamp(-m2.getBoundingClientRect().top / range())), { passive: true });
    }
  }
}

/* ---------- the live seabeds: open knowledge and the closing contact sheet ---------- */
if (createSeabed) {
  const openSec = $('#open'), contactSec = $('#contact');
  const c1 = openSec && $('canvas.seabed', openSec), c2 = contactSec && $('canvas.seabed', contactSec);
  if (c1) createSeabed(c1, openSec, { seed: 7 });
  if (c2) createSeabed(c2, contactSec, {
    seed: 2,
    place: (w, h) => w >= 1024 ? { cx: w * 0.75, cy: h * 0.44, width: Math.min(w * 0.3, 480) }
                               : { cx: w / 2, cy: h - Math.min(150, h * 0.16), width: Math.min(w * 0.62, 360), dim: 0.85 }
  });
}

/* ---------- projects: each assembly opens like a film frame ---------- */
if (hasGsap && !reduced) {
  $$('.app').forEach(app => {
    const vis = $('.app-visual', app), body = $('.app-body', app);
    gsap.fromTo(vis, { clipPath: 'inset(14% 10% 14% 10% round 18px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: app, start: 'top 92%', end: 'top 38%', scrub: 0.6 } });
    gsap.fromTo($$(':scope > canvas, :scope > .tour', vis), { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: app, start: 'top 92%', end: 'top 30%', scrub: 0.6 } });
    gsap.from($$(':scope > *', body), { y: 24, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: app, start: 'top 70%', once: true } });
  });
}

/* ---------- SHEET 06: the archive slides past like a plan chest drawer ---------- */
const workSec = $('#work'), pin = $('.work-pin', workSec), archive = $('.archive', workSec), track = $('.track', workSec), arcBar = $('.arc-progress', workSec);
function setupArchive() {
  const navBottom = $('.nav').getBoundingClientRect().bottom;
  const canPin = hasGsap && !reduced && innerWidth >= 1024 && pin.offsetHeight + navBottom + 24 <= innerHeight;
  if (!canPin) {
    workSec.classList.add('no-pin');
    archive.addEventListener('scroll', () => arcBar.style.setProperty('--arc', (archive.scrollLeft / Math.max(1, archive.scrollWidth - archive.clientWidth)).toFixed(3)), { passive: true });
    if (hasGsap && !reduced) { gsap.set('.arc', { opacity: 0, y: 26 }); ST.batch('.arc', { start: 'top 92%', once: true, onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }) }); }
    return;
  }
  const dist = () => Math.max(0, track.scrollWidth - archive.clientWidth);
  gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: {
      trigger: pin, start: () => `top ${navBottom + 8}px`, end: () => '+=' + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
      onUpdate: s => arcBar.style.setProperty('--arc', s.progress.toFixed(3))
    }
  });
}
setupArchive();

/* ---------- active sheet ---------- */
if (hasGsap) {
  sheets.forEach(s => ST.create({ trigger: s, start: 'top 45%', end: 'bottom 45%', onToggle: t => { if (t.isActive) setSheet(s); } }));
  setSheet(sheets[0]);
  addEventListener('load', () => ST.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ST.refresh());
}
if (location.hash && location.hash.length > 1) { const el = document.getElementById(location.hash.slice(1)); if (el) setTimeout(() => goTo(el), 60); }
root.classList.add('ready');
})();
