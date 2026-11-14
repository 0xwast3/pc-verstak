// APP · the showroom and the wiring: state, the orbit camera, the parts on the mat, hotspots with tooltips, part
// cards, numbered labels, the find-the-part game, the tray of plates by category, thumbnails, pages, music.
import * as THREE from 'three';
import {PI, clamp, lerp, easeOutBack, easeInOut, easeOut} from '../lib.js';
import {CATS, ITEMS, BY_ID, itemsOf, buildItem, hotspotsFor, fitCheck} from '../catalog.js';
import {buildUI, ico} from './ui.js';
import {createThumbs} from './thumbs.js';
import {DK} from '../stage.js';
import {initAudio, setMusic, musicOn, sfx} from '../audio.js';
import {createBench} from './workbench.js';
import {renderPage} from './pages.js';

/* ------------------------------------------------------------ tiny tween engine */
export function createTweens() {
  const list = [];
  const T = (dur, fn, done, delay = 0) => { const tw = {t0: performance.now() + delay * 1000, dur: dur * 1000, fn, done, dead: false}; list.push(tw); return tw; };
  T.update = (now) => {
    for (let i = list.length - 1; i >= 0; i--) {
      const tw = list[i]; if (tw.dead) { list.splice(i, 1); continue; }
      if (now < tw.t0) continue;
      const k = Math.min(1, (now - tw.t0) / tw.dur); tw.fn(k);
      if (k >= 1) { list.splice(i, 1); tw.done && tw.done(); }
    }
  };
  T.busy = () => list.length > 0;
  T.kill = (tw) => tw && (tw.dead = true);
  T.wait = (sec) => new Promise((res) => T(sec, () => {}, res));
  return T;
}

/* ------------------------------------------------------------ the orbit camera */
function createOrbit(cam) {
  const o = {t: new THREE.Vector3(), az: 0.55, el: 0.62, dist: 700, off: 0, offY: 0, g: {t: new THREE.Vector3(), az: 0.55, el: 0.62, dist: 700, off: 0, offY: 0}, minEl: 0.1, maxEl: 1.5, minD: 120, maxD: 2600, auto: false, rate: 6};
  o.set = (p, snap) => {
    if (p.t) o.g.t.copy(p.t); for (const k of ['az', 'el', 'dist', 'off', 'offY']) if (p[k] !== undefined) o.g[k] = p[k];
    if (snap) { o.t.copy(o.g.t); o.az = o.g.az; o.el = o.g.el; o.dist = o.g.dist; o.off = o.g.off; o.offY = o.g.offY; }
  };
  o.rotate = (dx, dy) => { o.g.az -= dx * 0.0058; o.g.el = clamp(o.g.el + dy * 0.0042, o.minEl, o.maxEl); };
  o.zoom = (f) => { o.g.dist = clamp(o.g.dist * f, o.minD, o.maxD); };
  o.update = (dt, W, H) => {
    if (o.auto) o.g.az += dt * 0.16;
    const k = 1 - Math.exp(-dt * o.rate);
    // keep azimuth continuous: move along the shortest way
    o.t.lerp(o.g.t, k); o.az = lerp(o.az, o.g.az, k); o.el = lerp(o.el, o.g.el, k); o.dist = lerp(o.dist, o.g.dist, k); o.off = lerp(o.off, o.g.off, k); o.offY = lerp(o.offY, o.g.offY, k);
    const dd = o.dist * DK;
    cam.position.set(o.t.x + dd * Math.cos(o.el) * Math.sin(o.az), o.t.y + dd * Math.sin(o.el), o.t.z + dd * Math.cos(o.el) * Math.cos(o.az));
    cam.lookAt(o.t);
    cam.near = Math.max(8, dd - o.dist * 2.2); cam.far = dd + o.dist * 4 + 3000;
    if (Math.abs(o.off) > 1e-4 || Math.abs(o.offY) > 1e-4) cam.setViewOffset(W, H, -o.off * W, o.offY * H, W, H); else { cam.clearViewOffset(); cam.updateProjectionMatrix(); }
  };
  return o;
}

/* ------------------------------------------------------------ the showroom poses: how each kind lies on the mat */
export function poseStand(it, model) {
  const stand = new THREE.Group(), flip = new THREE.Group(), inner = new THREE.Group();
  inner.add(model.root); flip.add(inner); stand.add(flip);
  switch (it.cat) {
    case 'ram': inner.rotation.set(0, 0, -PI / 2); inner.rotation.y = 0; break;
    case 'gpu': inner.rotation.x = it.id === 'fe3090' ? PI / 2 : -PI / 2; break;
    default: break;
  }
  if (it.cat === 'ram') { const w = new THREE.Group(); w.rotation.y = PI / 2 - 0.0; flip.remove(inner); w.add(inner); flip.add(w); }
  stand.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(stand), c = box.getCenter(new THREE.Vector3());
  const lift = it.cat === 'board' ? 4 : it.cat === 'cpu' && it.id === 'r7_5800x' ? 0.3 : 0;
  flip.position.set(-c.x, -box.min.y + lift, -c.z);
  stand.updateMatrixWorld(true);
  const size = box.getSize(new THREE.Vector3());
  stand.userData = {flip, model, size, radius: Math.hypot(size.x, size.y, size.z) / 2, h: size.y};
  return stand;
}

export function startApp(st, desk) {
  const {scene, camera: cam, renderer} = st;
  const T = createTweens();
  const orb = createOrbit(cam);
  const S = {mode: 'show', cat: 'board', sel: {board: 'b660m', cpu: 'i5_12600k', ram: 'fury', gpu: 'fe3090', cooler: 'tower', ssd: 'pulse', psu: 't850'},
    stand: null, hot: [], hover: -1, part: -1, labels: false, rotate: false, flipped: false, find: null, page: null, musicWanted: true, logs: []};
  const models = {}, stands = {}, thumbs = {};
  const getStand = (id) => { if (!stands[id]) { const m = buildItem(id); stands[id] = poseStand(BY_ID[id], m); } return stands[id]; };
  let shot = null;

  /* ---------------- log (the journal) */
  const t0 = performance.now();
  const stamp = () => { const s = (performance.now() - t0) / 1000; const m = Math.floor(s / 60), r = s - m * 60; return `${String(m).padStart(2, '0')}:${r.toFixed(2).padStart(5, '0')}`; };
  const log = (lv, text, live = false) => { const ln = {t: stamp(), lv, text}; S.logs.push(ln); if (S.logs.length > 400) S.logs.shift(); if (live) U.addLog(ln); return ln; };

  /* ---------------- the UI */
  const cb = {
    nav: (id) => { sfx.click(); go(id); },
    music: () => { S.musicWanted = !musicOn(); setMusic(S.musicWanted); U.music.classList.toggle('on', S.musicWanted); sfx.click(); },
    openBench: () => { sfx.click(); go('bench'); },
    tool: (k) => tool(k),
    tab: (c) => { sfx.click(); setCat(c); },
    tileDown: (e, id) => tileDown(e, id),
    closePart: () => selectPart(-1),
    stepPart: (d) => { if (S.hot.length) selectPart((S.part + d + S.hot.length) % S.hot.length); },
    findSkip: () => findNext(true), findStop: () => findStop(),
    exitBench: () => { sfx.click(); go('show'); },
    hint: () => bench.hint(), autoNext: () => bench.autoNext(), resetBench: () => bench.reset(), challenge: () => bench.toggleChallenge(),
    rowClick: (cat) => bench.rowClick(cat),
  };
  const U = buildUI(document.getElementById('app'), cb);
  const W = () => innerWidth, H = () => innerHeight;
  const ctx = {st, scene, cam, orb, T, U, S, log, sfx, desk, getStand, thumbs, say: (...a) => U.say(...a)};
  const bench = createBench(ctx); ctx.bench = bench;

  /* ---------------- category tray */
  const counts = Object.fromEntries(CATS.map((c) => [c.id, itemsOf(c.id).length]));
  function badMap(cat) {
    // on the bench, plates that cannot go into the current board carry a red mark
    if (S.mode !== 'bench' || cat === 'board') return {};
    const out = {}; for (const it of itemsOf(cat)) { const f = fitCheck(bench.boardId(), it.id); if (!f.ok) out[it.id] = f.why; } return out;
  }
  function renderTray() {
    U.setTabs(CATS, S.cat, counts);
    const sel = S.mode === 'bench' ? (S.cat === 'board' ? bench.boardId() : bench.kitId(S.cat)) : S.sel[S.cat];
    U.setTiles(itemsOf(S.cat), sel, thumbs, badMap(S.cat));
  }
  function setCat(c) {
    S.cat = c; renderTray();
    if (S.mode === 'show') showItem(S.sel[c]);
  }

  /* ---------------- showing an item on the mat */
  let showTok = 0;
  function showItem(id, instant = false) {
    const it = BY_ID[id]; S.sel[it.cat] = id;
    const tok = ++showTok;
    selectPart(-1, true); findStop(true); S.flipped = false;
    const old = S.stand;
    if (old && old.parent) {
      // the old part slides away and sinks
      const p0 = old.position.clone();
      T(0.42, (k) => { const e = easeInOut(k); old.position.set(p0.x - e * 120, p0.y - e * 60, p0.z + e * 40); old.scale.setScalar(1 - e * 0.35); }, () => { if (old !== S.stand) scene.remove(old); old.scale.setScalar(1); });
    }
    const stand = getStand(id);
    S.stand = stand; S.hot = hotspotsFor(id, stand.userData.model);
    stand.userData.flip.rotation.set(0, 0, 0);
    scene.add(stand);
    stand.position.set(0, -80, 0); stand.scale.setScalar(0.82);
    T(0.75, (k) => { if (tok !== showTok) return; const e = easeOutBack(k, 1.15); stand.position.y = -80 * (1 - easeOut(k)); stand.scale.setScalar(0.82 + 0.18 * e); }, null, instant ? 0 : 0.18);
    // the card
    const list = itemsOf(it.cat), idx = list.findIndex((x) => x.id === id);
    U.setCard(it, idx, list.length, specRows(it));
    U.setLabelsList(S.labels ? S.hot : null, (i) => selectPart(i));
    rebuildMarks();
    frameItem(instant);
    renderTray();
    sfx.whoosh();
  }
  function specRows(it) {
    const b = it.board, c = it.cpu, r = it.ram, g = it.gpu, k = it.cooler, s = it.ssd, p = it.psu;
    if (b) return [['Socket', b.socket], ['Chipset', b.chipset], ['Form factor', `${b.form} · ${b.size}`], ['Memory', `${b.ram} × ${b.slots}`]];
    if (c) return [['Socket', c.socket], ['Cores', c.cores], ['Clock', c.clock], ['TDP', c.tdp + ' W']];
    if (r) return [['Type', r.type], ['Size', r.size], ['Clock', `${r.freq} · ${r.timings}`], ['Height', r.h]];
    if (g) return [['Memory', g.vram], ['Power', g.tbp + ' W'], ['Length', `${g.len} · ${g.slots} slots`], ['Power', `${g.power} · PSU from ${g.psu} W`]];
    if (k) return [['Type', k.type], ['Handles', 'up to ' + k.tdp + ' W'], ['Fan', k.fan], ['Height', k.h]];
    if (s) return [['Interface', s.iface], ['Size', s.size], ['Read', s.read], ['Form factor', 'M.2 ' + s.form]];
    if (p) return [['Power', p.watts + ' W'], ['Certificate', p.cert], ['Modular', p.modular], ['12 V rail', p.amps]];
    return [];
  }
  function frameItem(instant) {
    const sd = S.stand.userData;
    const dist = clamp(sd.radius / Math.sin((30 * PI) / 360) * 1.08, 170, 1100);
    orb.minD = Math.max(60, sd.radius * 0.7); orb.maxD = Math.max(900, dist * 2.6);
    orb.set({t: new THREE.Vector3(0, sd.h * 0.32, 0), az: S.view === 'top' ? 0.0001 : 0.55, el: S.view === 'top' ? 1.48 : S.view === 'front' ? 0.2 : 0.62, dist, off: 0.12, offY: 0}, instant);
    st.aimLight(0, 0, Math.max(300, sd.radius * 1.6));
  }

  /* ---------------- hotspots: hover, click, labels, find */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), inv = new THREE.Matrix4(), lray = new THREE.Ray(), hitP = new THREE.Vector3();
  const box3 = new THREE.Box3();
  function setRay(x, y) { ndc.set((x / W()) * 2 - 1, -(y / H()) * 2 + 1); ray.setFromCamera(ndc, cam); }
  function pickHot(x, y) {
    if (!S.stand || !S.hot.length) return -1;
    setRay(x, y);
    const root = S.stand.userData.model.root; root.updateMatrixWorld(true);
    inv.copy(root.matrixWorld).invert(); lray.copy(ray.ray).applyMatrix4(inv);
    const meshHits = ray.intersectObject(S.stand, true); const meshD = meshHits.length ? meshHits[0].distance : Infinity;
    let best = -1, bestV = Infinity, nearest = Infinity; const cand = [];
    S.hot.forEach((h, i) => {
      const b = h.box; box3.min.set(b[0], b[1], b[2]); box3.max.set(b[3], b[4], b[5]);
      if (!lray.intersectBox(box3, hitP)) return;
      hitP.applyMatrix4(root.matrixWorld); const d = hitP.distanceTo(ray.ray.origin);
      nearest = Math.min(nearest, d); cand.push({i, d, v: (b[3] - b[0]) * (b[4] - b[1]) * (b[5] - b[2])});
    });
    for (const c of cand) if (c.d <= Math.min(nearest, meshD) + 18 && c.v < bestV) { best = c.i; bestV = c.v; }
    return best;
  }
  let outline = null;
  function showOutline(i) {
    if (outline) { outline.parent && outline.parent.remove(outline); outline.geometry.dispose(); outline = null; }
    if (i < 0 || !S.stand) return;
    const b = S.hot[i].box, sx = b[3] - b[0], sy = b[4] - b[1], sz = b[5] - b[2];
    const g = new THREE.EdgesGeometry(new THREE.BoxGeometry(sx + 1.2, sy + 1.2, sz + 1.2));
    outline = new THREE.LineSegments(g, new THREE.LineBasicMaterial({color: '#fff6e0', transparent: true, opacity: 0.95, depthTest: false}));
    outline.renderOrder = 10; outline.position.set((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2);
    S.stand.userData.model.root.add(outline);
  }
  function hotCenter(i, top = false) {
    const b = S.hot[i].box, v = new THREE.Vector3((b[0] + b[3]) / 2, top ? b[4] : (b[1] + b[4]) / 2, (b[2] + b[5]) / 2);
    return S.stand.userData.model.root.localToWorld(v);
  }
  function selectPart(i, quiet) {
    S.part = i;
    if (i < 0) { U.setPart(null); if (!quiet && S.stand) frameItem(); showOutline(S.hover); markOn(-1); return; }
    U.setPart(S.hot[i], i, S.hot.length); showOutline(i); markOn(i);
    const c = hotCenter(i), b = S.hot[i].box, r = Math.hypot(b[3] - b[0], b[4] - b[1], b[5] - b[2]) / 2;
    orb.set({t: c, dist: clamp(r * 3.4, orb.minD * 1.4, S.stand.userData.radius * 2.6)});
    sfx.click();
  }
  // numbered markers
  let marks = [];
  function rebuildMarks() {
    marks.forEach((m) => m.remove()); marks = [];
    if (!S.labels || S.mode !== 'show') return;
    S.hot.forEach((h, i) => { const m = document.createElement('div'); m.className = 'v-mark'; m.textContent = String(i + 1); m.onclick = () => selectPart(i); m.onmouseenter = () => sfx.hover(); U.layer.append(m); marks.push(m); });
  }
  const markOn = (i) => marks.forEach((m, k) => m.classList.toggle('on', k === i));
  function placeMarks() {
    if (!marks.length) return;
    marks.forEach((m, i) => { const p = st.project(hotCenter(i, true)); m.style.left = p.x + 'px'; m.style.top = p.y + 'px'; m.style.opacity = p.ok ? 1 : 0; });
  }

  // find the part
  function findStart() {
    if (!S.hot.length) return;
    selectPart(-1, true);
    const pool = S.hot.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, Math.min(5, S.hot.length));
    S.find = {pool, i: 0, hits: 0, miss: 0, t0: performance.now()};
    U.tb.find.classList.add('on'); findShow(); sfx.click();
  }
  function findShow() {
    const F = S.find; if (!F) return;
    if (F.i >= F.pool.length) {
      const s = ((performance.now() - F.t0) / 1000).toFixed(0);
      U.setFind({eb: `DONE · ${F.hits} OF ${F.pool.length} · ${s} S`, q: F.miss ? `Misses: ${F.miss}. Try again!` : 'Not a single miss!', done: true});
      log('ok', `Find the part (${BY_ID[S.sel[S.cat]].title}): ${F.hits}/${F.pool.length}, misses ${F.miss}, ${s} s`);
      sfx.ok(); S.find.done = true; return;
    }
    U.setFind({eb: `FIND THE PART · ${F.i + 1} / ${F.pool.length}`, q: S.hot[F.pool[F.i]].name});
  }
  function findNext(skip) { if (!S.find || S.find.done) return; S.find.i++; if (skip) S.find.miss++; findShow(); }
  function findStop(quiet) { S.find = null; U.setFind(null); U.tb.find.classList.remove('on'); if (!quiet) sfx.click(); }
  function findClick(i) {
    const F = S.find; if (!F || F.done) return false;
    if (i === F.pool[F.i]) { F.hits++; sfx.ok(); U.say(`Correct: ${S.hot[i].name}`, 'good', 1600); showOutline(i); F.i++; setTimeout(findShow, 350); }
    else { F.miss++; sfx.error(); U.shakeFind(); if (i >= 0) U.say(`That is the ${S.hot[i].name}. Keep looking.`, 'bad', 1800); }
    return true;
  }

  /* ---------------- toolbar */
  function tool(k) {
    sfx.click();
    if (k === 'v34' || k === 'top' || k === 'front') { S.view = k === 'v34' ? null : k; if (S.flipped) flipStand(false); selectPart(-1, true); frameItem(); setViewBtn(k); return; }
    if (k === 'bottom') { flipStand(!S.flipped); setViewBtn(S.flipped ? 'bottom' : 'v34'); return; }
    if (k === 'rotate') { S.rotate = !S.rotate; orb.auto = S.rotate; U.tb.rotate.classList.toggle('on', S.rotate); return; }
    if (k === 'labels') { S.labels = !S.labels; U.tb.labels.classList.toggle('on', S.labels); U.setLabelsList(S.labels ? S.hot : null, (i) => selectPart(i)); rebuildMarks(); return; }
    if (k === 'find') { if (S.find) findStop(); else findStart(); return; }
    if (k === 'build') { go('bench'); }
  }
  function setViewBtn(k) { for (const n of ['v34', 'top', 'bottom', 'front']) U.tb[n].classList.toggle('on', n === k); }
  function flipStand(on) {
    S.flipped = on; const f = S.stand.userData.flip, h = S.stand.userData.h;
    const r0 = f.rotation.x, r1 = on ? PI : 0, y0 = f.position.y, base = y0 - (S.flipped ? 0 : 0);
    const sd = S.stand.userData; const lift0 = sd.lift0 ?? (sd.lift0 = f.position.y);
    T(0.8, (k) => { const e = easeInOut(k); f.rotation.x = lerp(r0, r1, e); f.position.y = lift0 + Math.sin(e * PI) * h * 1.2 + (on ? e : 1 - e) * 0; });
    // flipping about the stand's own centre: offset the pivot so the part lands where it was
    f.position.z = f.position.z; sfx.whoosh();
    orb.set({el: on ? 0.75 : 0.62});
    setTimeout(() => { // after the flip the bottom face is up: re-seat it on the mat
      S.stand.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(S.stand); S.stand.position.y += -b.min.y;
    }, 820);
  }

  /* ---------------- pointer: orbit, hover, click; parts on the bench */
  const cv = renderer.domElement;
  let down = null;
  cv.addEventListener('pointerdown', (e) => {
    wake();
    if (S.mode === 'page') return;
    cv.setPointerCapture(e.pointerId);
    down = {x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, part: false, id: e.pointerId};
    if (S.mode === 'bench' && bench.pointerDown(e.clientX, e.clientY)) { down.part = true; cv.className = 'grabbing'; return; }
    cv.className = 'grabbing';
  });
  cv.addEventListener('pointermove', (e) => {
    if (down && down.id === e.pointerId) {
      const dx = e.clientX - down.lx, dy = e.clientY - down.ly; down.lx = e.clientX; down.ly = e.clientY;
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) down.moved = true;
      if (down.part) bench.pointerMove(e.clientX, e.clientY);
      else if (down.moved) { orb.rotate(dx, dy); if (S.rotate) { S.rotate = false; orb.auto = false; U.tb.rotate.classList.remove('on'); } }
      return;
    }
    hover(e.clientX, e.clientY);
  });
  const up = (e) => {
    if (!down || down.id !== e.pointerId) return;
    if (down.part) bench.pointerUp(e.clientX, e.clientY);
    else if (!down.moved) click(e.clientX, e.clientY);
    down = null; cv.className = 'grab';
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', (e) => { e.preventDefault(); orb.zoom(Math.exp(e.deltaY * 0.0012)); wake(); }, {passive: false});
  // pinch
  const touches = new Map(); let pinch0 = 0;
  cv.addEventListener('touchstart', (e) => { if (e.touches.length === 2) { pinch0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); } }, {passive: true});
  cv.addEventListener('touchmove', (e) => { if (e.touches.length === 2 && pinch0) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); orb.zoom(pinch0 / d); pinch0 = d; } }, {passive: true});

  function hover(x, y) {
    if (S.mode === 'bench') { const c = bench.hover(x, y); cv.className = c ? 'point' : 'grab'; return; }
    if (S.mode !== 'show') return;
    const i = pickHot(x, y);
    if (i !== S.hover) { S.hover = i; if (S.part < 0) showOutline(i); if (i >= 0) sfx.hover(); }
    if (i >= 0) {
      U.tip.innerHTML = `${S.hot[i].name}<small>${S.find ? 'is this it?' : 'click for details'}</small>`;
      U.tip.style.left = x / 1 + 'px'; U.tip.style.top = y + 'px'; U.tip.classList.remove('v-hide'); cv.className = 'point';
    } else { U.tip.classList.add('v-hide'); cv.className = 'grab'; }
  }
  function click(x, y) {
    if (S.mode === 'bench') { bench.click(x, y); return; }
    if (S.mode !== 'show') return;
    const i = pickHot(x, y);
    if (S.find) { findClick(i); return; }
    if (i >= 0) selectPart(i); else if (S.part >= 0) selectPart(-1);
  }

  /* ---------------- plates: click to show, drag into the workbench */
  function tileDown(e, id) {
    e.preventDefault(); wake();
    const it = BY_ID[id];
    if (S.mode === 'show') {
      const sx = e.clientX, sy = e.clientY;
      const mv = (ev) => { if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 14) { cleanup(); go('bench'); } };
      const upf = () => { cleanup(); if (S.sel[it.cat] !== id || !S.stand) { sfx.click(); showItem(id); } };
      const cleanup = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', upf); };
      addEventListener('pointermove', mv); addEventListener('pointerup', upf);
      return;
    }
    if (S.mode === 'bench') bench.tileDown(e, id);
  }

  /* ---------------- modes and pages */
  function go(id) {
    if (id === 'show' || id === 'bench') {
      if (S.page) { U.page.classList.add('off'); S.page = null; }
      if (id === 'bench' && S.mode !== 'bench') enterBench();
      else if (id === 'show' && S.mode !== 'show') enterShow();
      U.setNav(id);
      return;
    }
    // a page: journal, quiz, compare
    S.page = id; U.setNav(id);
    renderPage(id, U.page, {S, thumbs, log, sfx, go, say: U.say, clearLogs: () => { S.logs.length = 0; U.log.innerHTML = ''; },
      open: (iid) => { const it = BY_ID[iid]; S.sel[it.cat] = iid; S.cat = it.cat; go('show'); renderTray(); showItem(iid); }});
    U.page.classList.remove('off'); U.page.scrollTop = 0;
  }
  function enterShow() {
    const from = S.mode; S.mode = 'show';
    bench.exit();
    U.kit.classList.add('off'); U.exit.classList.add('off'); U.log.classList.add('off');
    U.card.classList.remove('off'); U.tool.classList.remove('v-hide'); U.nav.classList.remove('v-hide');
    U.tray.style.left = ''; U.haze.style.opacity = 1;
    if (S.stand) scene.add(S.stand);
    showItem(S.sel[S.cat], from !== 'show');
    st.tilt({amount: 4.5});
  }
  function enterBench() {
    S.mode = 'bench';
    selectPart(-1, true); findStop(true); S.labels = false; U.tb.labels.classList.remove('on'); rebuildMarks(); U.setLabelsList(null);
    S.rotate = false; orb.auto = false; U.tb.rotate.classList.remove('on');
    if (S.stand) scene.remove(S.stand);
    U.card.classList.add('off'); U.pcard.classList.add('off'); U.tool.classList.add('v-hide'); U.nav.classList.add('v-hide'); U.tip.classList.add('v-hide');
    U.kit.classList.remove('off'); U.exit.classList.remove('off');
    U.tray.style.left = 'calc(50% - 12rem)'; U.haze.style.opacity = 0.6;
    bench.enter(S.sel.board, {...S.sel});
    renderTray();
    st.tilt({amount: 3});
  }
  ctx.renderTray = renderTray;
  ctx.go = go;

  /* ---------------- thumbnails, built progressively */
  function thumbFor(id) {
    if (thumbs[id]) return;
    const s = getStand(id); const wasIn = s.parent;
    if (wasIn) wasIn.remove(s);
    const p = s.position.clone(), sc = s.scale.x;
    s.position.set(0, 0, 0); s.scale.setScalar(1);
    thumbs[id] = shot(s, BY_ID[id].cat === 'board' ? 0.5 : 0.62, BY_ID[id].cat === 'board' ? 0.72 : 0.62);
    s.position.copy(p); s.scale.setScalar(sc);
    if (wasIn) wasIn.add(s);
    U.setThumb(id, thumbs[id]);
  }
  ctx.thumbFor = thumbFor;

  /* ---------------- the loop */
  let last = performance.now(), sleepAt = performance.now() + 4000;
  function wake() { sleepAt = performance.now() + 4000; }
  ctx.wake = wake;
  const fogBase = {near: 900, far: 2600};
  let frames = 0, slowAcc = 0, slowN = 0, quality = 2;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    T.update(now);
    const busy = T.busy() || orb.auto || bench.busy() || down || now < sleepAt || Math.abs(orb.dist - orb.g.dist) > 0.5 || Math.abs(orb.az - orb.g.az) > 1e-3 || orb.t.distanceToSquared(orb.g.t) > 0.01;
    if (!busy && frames > 3) return;
    orb.update(dt, W(), H());
    if (scene.fog) { scene.fog.near = orb.dist * 1.05; scene.fog.far = orb.dist * 3.4; }
    bench.update(dt * (window.PCV_DEMO ? 1.35 : 1), now);
    st.render();
    placeMarks();
    frames++;
    // adapt quality once: if the first seconds are slow, drop AO, then the pixel ratio
    if (frames > 20 && frames < 200) { slowAcc += dt; slowN++; if (slowN === 60) { const avg = slowAcc / slowN; if (avg > 0.034 && quality === 2) { quality = 1; st.setQuality({ao: false}); } else if (avg > 0.045 && quality === 1) { quality = 0; st.resize(W(), H(), 1); } slowAcc = 0; slowN = 0; } }
  }

  function onResize() { U.fit(); st.resize(W(), H(), Math.min(devicePixelRatio || 1, quality === 0 ? 1 : 1.5)); wake(); }
  addEventListener('resize', onResize);

  /* ---------------- boot */
  async function boot(progress) {
    shot = createThumbs(st.env);
    onResize();
    const order = itemsOf('board').map((i) => i.id);
    for (let i = 0; i < order.length; i++) {
      progress(0.25 + (i / order.length) * 0.6, 'Building the boards');
      await new Promise((r) => setTimeout(r, 10));
      thumbFor(order[i]);
    }
    progress(0.9, 'Setting the lights');
    await new Promise((r) => setTimeout(r, 10));
    renderTray();
    S.cat = 'board';
    showItem(S.sel.board, true);
    orb.set({dist: orb.g.dist * 1.9, el: 0.95, az: 0.2}, true); frameItem();
    st.setQuality({ao: true, samples: 4, bloom: false});
    st.tilt({amount: 4.5});
    U.setNav('show'); U.tb.v34.classList.add('on');
    requestAnimationFrame(frame);
    progress(1, 'Ready');
    // the rest of the plates, in the background
    const rest = ITEMS.filter((i) => i.cat !== 'board').map((i) => i.id);
    const step = () => { const id = rest.shift(); if (!id) return; thumbFor(id); setTimeout(step, 30); };
    setTimeout(step, 600);
    // music starts with the first touch
    const first = () => { initAudio(); if (S.musicWanted) { setMusic(true); U.music.classList.add('on'); } removeEventListener('pointerdown', first, true); removeEventListener('keydown', first, true); };
    addEventListener('pointerdown', first, true); addEventListener('keydown', first, true);
    log('dim', 'PC Verstak is running. Pick a part in the showroom or open the bench.');
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { if (S.page) go(S.mode === 'bench' ? 'bench' : 'show'); else if (S.part >= 0) selectPart(-1); else if (S.find) findStop(); else if (S.mode === 'bench') go('show'); }
      if (S.mode === 'show' && !S.page && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        const list = itemsOf(S.cat), i = list.findIndex((x) => x.id === S.sel[S.cat]); const n = list[(i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length]; showItem(n.id);
      }
    });
  }
  return {boot, U, S, ctx};
}
