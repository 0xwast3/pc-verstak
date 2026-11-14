// WORKBENCH · the assembly mode, after the reference's kit bench: the board rests on a dark antistatic box, the parts
// lie in a cream tray, the power supply waits on the mat beside its printed footprint. Parts are carried with the
// cursor; near a seat they turn into their installed pose and the seat lights up (green when it fits, red when it
// does not); sockets, DIMM latches and the M.2 shield open by themselves, and on release the part goes in with its own
// motion. The kit panel keeps the order; the power button runs a POST with the board's debug LEDs, its POST display,
// fans and RGB, and a log that explains what is missing or wrong (no CPU, no memory, no video, no disk, a power
// supply too small, a cooler too weak).
import * as THREE from 'three';
import {PI, clamp, lerp, easeOut, easeInOut, std, topTex, ctex, rrect, rbox, FM} from '../lib.js';
import {BY_ID, buildItem, fitCheck, KIT_ORDER, DEFAULT_KIT} from '../catalog.js';
import {boardBox, partsTray, psuPad} from '../bench.js';
import {poseSocket, setLatch} from '../parts/boardkit.js';
import {setFans} from '../audio.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const AX = {x: V(1, 0, 0), y: V(0, 1, 0), z: V(0, 0, 1)};
const qAx = (ax, a) => new THREE.Quaternion().setFromAxisAngle(ax, a);
const Q0 = new THREE.Quaternion();

/* ------------------------------------------------------------ the layout of the bench on the mat (mm) */
const BOX = {x: -390, z: -40, w: 350, d: 330, h: 16};
const PAD = {x: -60, z: -150, w: 180, d: 170};
const SPARE = {x: 205, z: -160};
const TRAY = {x: 190, z: 245, w: 720, d: 250, floor: 3};
const SPOT = {cpu: [105, 32], cooler: [282, 12], ram0: [140, -78], ram1: [140, -36], gpu: [-140, 0], ssd: [150, 88]};
const BOARD_Y = BOX.h + 0.6;
const ROWS = ['cpu', 'cooler', 'ram', 'ram', 'gpu', 'ssd', 'psu'];
const TAG = {cpu: 'CPU', cooler: 'COOL', ram: 'DRAM', gpu: 'VGA', ssd: 'M.2', psu: 'PSU'};
export const BENCH_VIEW = {t: V(20, 0, 90), az: 0.04, el: 0.98, dist: 1700, off: -0.085, offY: 0.06};

function trayQuat(cat, id) {
  if (cat === 'ram') return qAx(AX.y, PI / 2).multiply(qAx(AX.z, -PI / 2));
  if (cat === 'gpu') return qAx(AX.x, id === 'fe3090' ? PI / 2 : -PI / 2);
  return Q0.clone();
}
const fmt = (s) => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const chanOf = (d) => { const m = /([A-D])\d$/.exec(d.name || ''); return m ? m[1] : 'AB'[d.index % 2]; };

/* a seat's glow: a dashed rounded frame with a faint fill, tinted green or red by the material colour */
function glowTex(w, d) {
  return topTex(w, d, 4, (c, W, D) => {
    c.clearRect(-W / 2, -D / 2, W, D);
    const r = Math.min(5, W / 3, D / 3);
    c.fillStyle = 'rgba(255,255,255,.2)'; rrect(c, -W / 2 + 1.2, -D / 2 + 1.2, W - 2.4, D - 2.4, r); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 1.3; c.setLineDash([4, 2.6]); rrect(c, -W / 2 + 1.2, -D / 2 + 1.2, W - 2.4, D - 2.4, r); c.stroke();
  });
}

export function createBench(ctx) {
  const {scene, cam, orb, T, U, S, log, sfx, st} = ctx;
  const say = (...a) => ctx.say(...a);
  const group = new THREE.Group(); group.name = 'bench';
  const props = {box: boardBox(BOX.w, BOX.d, BOX.h), tray: partsTray(TRAY.w, TRAY.d), pad: psuPad(PAD.w, PAD.d)};
  props.box.position.set(BOX.x, 0, BOX.z); props.tray.position.set(TRAY.x, 0, TRAY.z); props.pad.position.set(PAD.x, 0, PAD.z);
  [props.box, props.tray].forEach((o) => o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }));
  group.add(props.box, props.tray, props.pad);

  const B = {active: false, boardId: null, be: null, kit: {}, parts: [], pool: new Map(), boards: new Map(), drag: null, anim: 0, waits: [],
    hold: {}, sockK: 0, power: 'off', powTok: 0, result: null, fanK: 0, fanT: 0, rgbK: 0, rgbT: 0, cables: {}, t0: 0, tEnd: 0,
    challenge: false, hintSeat: null, hintUntil: 0, hover: null, unpacking: false, live: 0, override: null, warns: 0};
  const poke = (ms = 400) => { B.live = Math.max(B.live, performance.now() + ms); ctx.wake && ctx.wake(); };

  /* ---------------- promises over the tween engine */
  const tw = (dur, fn, delay = 0) => new Promise((res) => T(dur, fn, res, delay));
  const wait = (s) => tw(s, () => {});
  const until = (cond, max = 1.5) => new Promise((res) => { B.waits.push({cond, res, t0: performance.now(), max}); poke(); });
  function moveTo(p, pos, q, dur, ease = easeInOut, arc = 0) {
    const p0 = p.obj.position.clone(), q0 = p.obj.quaternion.clone(), p1 = pos.clone(), q1 = q.clone();
    B.anim++;
    return tw(dur, (k) => {
      const e = ease(k); p.obj.position.lerpVectors(p0, p1, e); if (arc) p.obj.position.y += Math.sin(e * PI) * arc;
      p.obj.quaternion.slerpQuaternions(q0, q1, e);
    }).then(() => { B.anim--; });
  }

  /* ---------------- the board on its box, its seats */
  function boardEntry(id) {
    if (B.boards.has(id)) return B.boards.get(id);
    const model = buildItem(id);
    const obj = new THREE.Group(); obj.add(model.root); obj.position.set(BOX.x, BOARD_Y, BOX.z);
    const hlg = new THREE.Group();
    const be = {id, model, obj, hlg, seats: []};
    makeSeats(be);
    B.boards.set(id, be);
    return be;
  }
  function makeSeats(be) {
    const m = be.model, bp = be.obj.position, Tt = m.T;
    const w = (v) => v.clone().add(bp);
    const seat = (o) => {
      const s = Object.assign({q: Q0, occupant: null, glow: 0, latchK: 0, shieldK: 0, hold: false}, o);
      if (o.hl) {
        const mat = new THREE.MeshBasicMaterial({map: glowTex(o.hl[0], o.hl[1]), color: '#36cf74', transparent: true, opacity: 0, depthWrite: false, toneMapped: false});
        const geo = new THREE.PlaneGeometry(o.hl[0], o.hl[1]); geo.rotateX(-PI / 2);
        s.mesh = new THREE.Mesh(geo, mat); s.mesh.position.set(s.c.x, s.hy, s.c.z); s.mesh.renderOrder = 4; s.mesh.visible = false;
        be.hlg.add(s.mesh);
      }
      if (s.shield) { s.sh0 = s.shield.position.clone(); }
      be.seats.push(s); return s;
    };
    const ci = m.seats.cpu, pkg = ci.info.pkg, fr = ci.info.frame || [pkg[0] + 10, pkg[1] + 14];
    be.cpuSeat = seat({cat: 'cpu', key: 'cpu', name: 'socket ' + ci.socket, pos: w(ci.pos), c: w(ci.pos), hl: [fr[0] + 8, fr[1] + 8], zone: [fr[0] / 2, fr[1] / 2], margin: 34, hy: bp.y + Tt + 4.8, hover: 34});
    be.coolSeat = seat({cat: 'cooler', key: 'cooler', name: 'CPU lid', pos: w(ci.pos), c: w(ci.pos), hl: [88, 88], zone: [40, 40], margin: 44, hy: bp.y + Tt + 10, hover: 64});
    const len = m.spec.dimm.v1 - m.spec.dimm.v0;
    be.dimms = m.seats.dimm.map((d) => seat({cat: 'ram', key: 'dimm' + d.index, name: d.name, pos: w(d.pos), c: w(d.pos), hl: [9, len + 2], zone: [0.5, len / 2], margin: 24, hy: bp.y + Tt + 8.3, hover: 48, slot: d.slot, index: d.index, ch: chanOf(d)}));
    be.dimmOrder = m.seats.dimmOrder;
    const g = m.seats.gpu;
    be.gpuSeat = seat({cat: 'gpu', key: 'gpu', name: 'PCIe x16', pos: w(g.pos), c: w(g.pos).add(V(44.5, 0, 0)), hl: [98, 13], zone: [46, 6], margin: 74, hy: bp.y + Tt + 11.9, hover: 64});
    be.m2 = m.seats.m2.map((s, i) => seat({cat: 'ssd', key: 'm2_' + i, name: s.name, pos: w(s.pos).add(V(0, -0.6, 0)), q: s.dir === -1 ? qAx(AX.y, PI) : Q0, c: w(s.pos).add(V(s.dir * 41, 0, 0)), hl: [90, 27], zone: [41, 11], margin: 34, hy: bp.y + Tt + (s.shield ? 9.2 : 4.4), hover: 30, shield: s.shield, dir: s.dir, index: i}));
    be.padSeat = seat({cat: 'psu', key: 'pad', name: 'mat', pos: V(PAD.x, 0, PAD.z), q: qAx(AX.y, PI), c: V(PAD.x, 0, PAD.z), hl: [PAD.w - 6, PAD.d - 6], zone: [PAD.w / 2, PAD.d / 2], margin: 80, hy: 0.7, hover: 46});
  }
  function resetBoard(be) {
    poseSocket(be.model.socket, 0, false); B.sockK = 0; be._hc = false;
    for (const s of be.seats) { s.occupant = null; s.glow = 0; s.hold = false; s.latchK = 0; s.shieldK = 0; if (s.slot) setLatch(s.slot, 0); if (s.shield) s.shield.position.copy(s.sh0); if (s.mesh) { s.mesh.visible = false; s.mesh.material.opacity = 0; } }
    const L = be.model.liveRefs;
    for (const m of L.rgb) { m.material.emissiveIntensity = 0.03; }
    for (const l of L.leds) setLedMesh(l.m, false);
    if (L.post) setPostMesh(L.post, null);
  }

  /* ---------------- the parts */
  function getPart(cat, id, idx) {
    const key = id + '#' + idx;
    let p = B.pool.get(key);
    if (!p) {
      const model = buildItem(id);
      const obj = new THREE.Group(), lift = new THREE.Group();
      lift.add(model.root); obj.add(lift);
      p = {key, cat, id, idx, it: BY_ID[id], model, obj, lift, state: 'tray', seat: null, hk: 0, bounceT: 0, qTray: trayQuat(cat, id)};
      obj.userData.part = p;
      // measure it lying in the tray: the centre offset and the footprint
      obj.quaternion.copy(p.qTray); obj.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(obj);
      p.cOff = bb.getCenter(V()); p.size = bb.getSize(V()); p.minY = bb.min.y;
      const sp = cat === 'psu' ? [SPARE.x, 0, SPARE.z] : (() => { const o = SPOT[cat === 'ram' ? 'ram' + idx : cat]; return [TRAY.x + o[0], TRAY.floor, TRAY.z + o[1]]; })();
      p.home = V(sp[0] - p.cOff.x, sp[1] - p.minY + 0.25, sp[2] - p.cOff.z);
      p.carry = Math.max(66, p.size.y / 2 + 36);
      B.pool.set(key, p);
    }
    return p;
  }
  function resetPart(p) {
    p.state = 'tray'; p.seat = null; p.hk = 0; p.bounceT = 0; p.lift.position.set(0, 0, 0);
    p.obj.position.copy(p.home); p.obj.quaternion.copy(p.qTray); p.obj.scale.setScalar(1); p.obj.visible = true;
    lightPart(p, 0, 0);
  }
  const partOf = (cat, idx = 0) => B.parts.find((p) => p.cat === cat && p.idx === idx);
  const inPart = (cat) => B.parts.find((p) => p.cat === cat && p.state === 'in');
  const psuIn = () => !!inPart('psu');
  const installed = () => B.parts.filter((p) => p.state === 'in').length;
  const nextPart = () => B.parts.find((p) => p.state !== 'in');
  const recSeats = () => B.be.dimmOrder.slice(0, 2).map((i) => B.be.dimms[i]);
  const recNames = () => recSeats().map((s) => s.name).join(' and ');

  function bestSeat(p) {
    const be = B.be;
    switch (p.cat) {
      case 'cpu': return be.cpuSeat;
      case 'cooler': return be.coolSeat;
      case 'gpu': return be.gpuSeat;
      case 'psu': return be.padSeat;
      case 'ram': return be.dimmOrder.map((i) => be.dimms[i]).find((s) => !s.occupant || s.occupant === p) || be.dimms[0];
      case 'ssd': return be.m2.find((s) => !s.occupant || s.occupant === p) || be.m2[0];
    }
  }
  function check(p) {
    if (p.cat === 'cpu' || p.cat === 'ram') { const f = fitCheck(B.boardId, p.id); if (!f.ok) return f; }
    if (p.cat === 'cooler') { const c = inPart('cpu'); if (!c) return {ok: false, why: 'CPU first: the cooler sits on its lid, not on an empty socket.'}; }
    return {ok: true};
  }
  function seatPose(p, s) {
    if (s.cat === 'cooler') { const c = inPart('cpu'); return {pos: s.pos.clone().add(V(0, c ? c.model.top : 6, 0)), q: Q0}; }
    return {pos: s.pos.clone(), q: s.q};
  }

  /* ---------------- picking and the cursor */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(V(0, 1, 0), 0);
  function setRay(x, y) { ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam); }
  function onPlane(y) { plane.constant = -y; return ray.ray.intersectPlane(plane, V()); }
  function pickPart(x, y) {
    setRay(x, y);
    const objs = B.parts.filter((p) => p.obj.visible && p.state !== 'anim').map((p) => p.obj);
    const hits = ray.intersectObjects(objs, true);
    for (const h of hits) { let o = h.object; while (o && !o.userData.part) o = o.parent; if (o) return o.userData.part; }
    return null;
  }
  function findSnap(p) {
    let best = null, bd = Infinity;
    for (const s of B.be.seats) {
      if (s.cat !== p.cat || (s.occupant && s.occupant !== p)) continue;
      const h = onPlane(s.hy); if (!h) continue;
      const dx = Math.abs(h.x - s.c.x), dz = Math.abs(h.z - s.c.z);
      const d = Math.hypot(Math.max(0, dx - s.zone[0]), Math.max(0, dz - s.zone[1]));
      if (d > s.margin) continue;
      const score = d + 0.04 * Math.hypot(dx, dz);
      if (score < bd) { bd = score; best = s; }
    }
    return best;
  }
  function freePose(p) {
    const fp = onPlane(p.carry);
    const pos = fp ? fp.sub(p.cOff) : p.obj.position.clone();
    pos.x = clamp(pos.x, -760, 760); pos.z = clamp(pos.z, -520, 520);
    return pos;
  }

  /* ---------------- install, remove, send home */
  async function install(p, s) {
    p.state = 'anim'; s.occupant = p; p.seat = s; poke(2000);
    const {pos, q} = seatPose(p, s);
    const up = (h) => pos.clone().add(V(0, h, 0));
    switch (p.cat) {
      case 'cpu':
        B.hold.cpu = true;
        await moveTo(p, up(16), q, 0.22);
        await until(() => B.sockK > 0.96, 1.2);
        await moveTo(p, pos, q, 0.3, easeOut); sfx.drop();
        await wait(0.12); B.hold.cpu = false;
        await until(() => B.sockK < 0.02, 1.4); sfx.latch();
        break;
      case 'ram':
        s.hold = true;
        await moveTo(p, up(18), q, 0.2);
        await until(() => s.latchK > 0.95, 0.8);
        await moveTo(p, pos, q, 0.2, (k) => k * k); sfx.snap();
        s.hold = false; await until(() => s.latchK < 0.04, 0.8); sfx.latch();
        break;
      case 'gpu':
        await moveTo(p, up(14), q, 0.22);
        await moveTo(p, pos, q, 0.28, easeOut); sfx.snap();
        break;
      case 'ssd': {
        s.hold = true;
        await until(() => !s.shield || s.shieldK > 0.95, 1);
        const qt = q.clone().multiply(qAx(AX.z, 0.35));
        await moveTo(p, up(5), qt, 0.28);
        await moveTo(p, pos, q, 0.32); sfx.snap();
        await wait(0.18); sfx.click(); s.hold = false;
        await until(() => s.shieldK < 0.04, 1);
        break;
      }
      case 'cooler':
        await moveTo(p, up(12), q, 0.25);
        await moveTo(p, pos, q, 0.34, easeOut); sfx.snap();
        if (p.id === 'breeze') [0.08, 0.2, 0.32, 0.44].forEach((d) => setTimeout(() => sfx.latch(), d * 1000));
        break;
      case 'psu':
        await moveTo(p, up(10), q, 0.25);
        await moveTo(p, pos, q, 0.28, easeOut); sfx.drop();
        break;
    }
    p.state = 'in';
    log('ok', installText(p), true);
    renderKit();
    if (p.cat === 'psu') { await grow('atx'); await grow('eps'); if (inPart('gpu')) await grow('gpu'); log('ok', `[PSU] Cables connected: 24-pin, CPU 8-pin${inPart('gpu') ? ', ' + inPart('gpu').it.gpu.power : ''}`, true); }
    else if (p.cat === 'gpu' && psuIn()) await grow('gpu');
    renderKit();
    if (!nextPart()) { sfx.ok(); say('All parts are in place. Power on?', 'good', 2600); }
  }
  function installText(p) {
    const t = p.it.title, s = p.seat;
    switch (p.cat) {
      case 'cpu': return `[CPU] ${t} in socket ${B.be.model.seats.cpu.socket}, frame closed`;
      case 'cooler': return `[COOL] ${t} pressed onto the CPU lid`;
      case 'ram': return `[DRAM] ${t} → ${s.name}, latches closed`;
      case 'gpu': return `[VGA] ${t} in the PCIe x16 slot`;
      case 'ssd': return `[M.2] ${t} in ${s.name}, screw tightened`;
      case 'psu': return `[PSU] ${t} on the mat`;
    }
  }
  function unseat(p) {
    const s = p.seat; if (!s) return;
    s.occupant = null; p.seat = null;
    if (p.cat === 'gpu') dropCable('gpu');
    if (p.cat === 'psu') { dropCable('atx'); dropCable('eps'); dropCable('gpu'); }
    log('dim', `[${TAG[p.cat]}] ${p.it.title} removed${p.cat === 'ram' || p.cat === 'psu' ? '' : ''} (${s.name})`, true);
  }
  async function sendHome(p, delay = 0) {
    p.state = 'anim'; poke(1200);
    if (delay) await wait(delay);
    await moveTo(p, p.home, p.qTray, 0.5, easeInOut, p.cat === 'psu' ? 30 : 46);
    p.state = 'tray'; sfx.drop(); renderKit();
  }
  function failDrop(p, why) {
    sfx.error(); say(why, 'bad', 4200);
    log('err', `[${TAG[p.cat]}] ${why}`, true);
    B.override = {cls: 'bad', eb: 'DOES NOT FIT', text: why, until: performance.now() + 5200};
    setTimeout(renderStatus, 5300); renderStatus();
  }

  /* ---------------- dragging */
  const startTimer = () => { if (!B.t0) B.t0 = performance.now(); };
  function beginDrag(D) {
    const p = D.p;
    if (p.state === 'in') {
      if (p.cat === 'cpu' && inPart('cooler')) { sfx.error(); say('Remove the cooler first: it holds the CPU down.', 'bad', 2800); return false; }
      unseat(p);
    }
    p.state = 'drag'; D.started = true; startTimer(); sfx.pick(); U.tip.classList.add('v-hide');
    renderKit(); poke(); return true;
  }
  function drop(D) {
    const p = D.p, s = D.snap;
    if (s) { const c = check(p); if (c.ok) { install(p, s); return; } failDrop(p, c.why); }
    sendHome(p);
  }
  function pointerDown(x, y) {
    if (!B.active || B.unpacking) return false;
    const p = pickPart(x, y);
    if (!p) return false;
    if (B.power !== 'off') { sfx.error(); say('Power off first: never touch parts on a live board.', 'bad', 2800); return true; }
    if (B.anim && p.state === 'anim') return true;
    B.drag = {p, x, y, sx: x, sy: y, started: false, snap: null};
    return true;
  }
  function pointerMove(x, y) {
    const D = B.drag; if (!D) return;
    D.x = x; D.y = y;
    if (!D.started && Math.hypot(x - D.sx, y - D.sy) > 5) { if (!beginDrag(D)) { B.drag = null; return; } }
    poke();
  }
  function pointerUp(x, y) {
    const D = B.drag; B.drag = null; if (!D) return;
    if (!D.started) { partClick(D.p); return; }
    // find the seat under the release point now, so a drop never waits on the next frame
    D.x = x; D.y = y; setRay(x, y); D.snap = findSnap(D.p);
    drop(D); poke(800);
  }
  function partClick(p) {
    p.bounceT = performance.now(); poke(900);
    if (p.state === 'in') { sfx.click(); say(`${p.it.title} · ${p.seat.name}. Drag to remove.`, '', 2600); return; }
    hintFor(p, true);
  }
  function hover(x, y) {
    if (!B.active || B.drag) return false;
    const p = B.power === 'off' && !B.unpacking ? pickPart(x, y) : null;
    if (p !== B.hover) { B.hover = p; poke(500); if (p) sfx.hover(); }
    if (p) {
      const f = (p.cat === 'cpu' || p.cat === 'ram') ? fitCheck(B.boardId, p.id) : {ok: true};
      U.tip.innerHTML = `${p.it.title}<small>${p.state === 'in' ? 'installed · drag to remove' : f.ok ? 'drag onto the board' : 'does not fit this board'}</small>`;
      U.tip.style.left = x + 'px'; U.tip.style.top = y + 'px'; U.tip.classList.remove('v-hide');
    } else U.tip.classList.add('v-hide');
    return !!p;
  }
  function click() {
    // an empty click brings the camera back to the whole bench after a close look
    if (orb.g.dist < BENCH_VIEW.dist * 0.7) { orb.set(BENCH_VIEW); sfx.click(); }
  }

  /* ---------------- plates dragged from the tray at the bottom */
  function tileDown(e, id) {
    e.preventDefault();
    const it = BY_ID[id], sx = e.clientX, sy = e.clientY;
    let started = false, D = null;
    const overTray = (x, y) => { const r = U.tray.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
    U.ghost.innerHTML = ctx.thumbs[id] ? `<img src="${ctx.thumbs[id]}" draggable="false">` : '';
    const ghost = (x, y, on) => { U.ghost.style.left = x + 'px'; U.ghost.style.top = y + 'px'; U.ghost.classList.toggle('v-gone', !on); };
    const cleanup = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); };
    const mv = (ev) => {
      const x = ev.clientX, y = ev.clientY;
      if (!started) {
        if (Math.hypot(x - sx, y - sy) < 10) return;
        started = true;
        if (it.cat !== 'board') {
          if (B.power !== 'off') { say('Power off first.', 'bad', 2200); cleanup(); return; }
          if (B.unpacking) { cleanup(); return; }
          const list = swapKit(id);
          const p = list.find((q) => q.state === 'tray');
          if (!p) { say(it.cat === 'ram' ? 'Both sticks are in already: remove one to fit another.' : `${it.title} is already on the board.`, '', 2600); cleanup(); return; }
          D = B.drag = {p, x, y, sx: x, sy: y, started: true, snap: null};
          p.state = 'drag'; startTimer(); sfx.pick(); renderKit();
          setRay(x, y); p.obj.position.copy(freePose(p)); p.obj.quaternion.copy(p.qTray);
        }
      }
      const ot = overTray(x, y);
      ghost(x, y, ot || it.cat === 'board');
      if (D) { D.x = x; D.y = y; D.p.obj.visible = !ot; if (ot) { setRay(x, y); D.p.obj.position.copy(freePose(D.p)); } }
      poke();
    };
    const up = (ev) => {
      cleanup(); U.ghost.classList.add('v-gone');
      if (!started) {
        sfx.click();
        if (it.cat === 'board') { switchBoard(id); return; }
        if (B.power !== 'off') { say('Power off first.', 'bad', 2200); return; }
        const was = B.kit[it.cat]; const list = swapKit(id);
        if (was === id) hintFor(list.find((q) => q.state !== 'in') || list[0], true);
        else { const f = fitCheck(B.boardId, id); if (f.ok) say(`${it.title} is in the tray. Drag it onto the board.`, '', 2400); }
        return;
      }
      if (it.cat === 'board') { if (!overTray(ev.clientX, ev.clientY)) switchBoard(id); return; }
      if (D) { D.p.obj.visible = true; B.drag = null; if (overTray(ev.clientX, ev.clientY)) sendHome(D.p); else { setRay(ev.clientX, ev.clientY); D.snap = findSnap(D.p); drop(D); } }
    };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }

  /* ---------------- the kit: swapping a part, switching the board */
  function swapKit(id) {
    const it = BY_ID[id], cat = it.cat;
    if (B.kit[cat] === id) return B.parts.filter((p) => p.cat === cat);
    if (B.power !== 'off') powerOff(true);
    const olds = B.parts.filter((p) => p.cat === cat);
    const oldTitle = olds[0] ? olds[0].it.title : '';
    for (const o of olds) {
      if (o.state === 'in') unseat(o);
      o.state = 'gone';
      const p0 = o.obj.position.clone();
      tw(0.32, (k) => { const e = easeInOut(k); o.obj.position.set(p0.x, p0.y - e * 50, p0.z); o.obj.scale.setScalar(1 - e * 0.4); }).then(() => { if (!B.parts.includes(o)) group.remove(o.obj); o.obj.scale.setScalar(1); });
    }
    B.kit[cat] = id; S.sel[cat] = id;
    const news = olds.map((o) => {
      const p = getPart(cat, id, o.idx); resetPart(p); group.add(p.obj);
      const y1 = p.home.y; p.obj.position.y = y1 + 90; p.obj.scale.setScalar(0.85);
      tw(0.5, (k) => { if (p.state !== 'tray') { p.obj.scale.setScalar(1); return; } const e = easeOut(k); p.obj.position.y = y1 + 90 * (1 - e); p.obj.scale.setScalar(0.85 + 0.15 * e); }, 0.18 + o.idx * 0.08);
      return p;
    });
    B.parts = B.parts.map((p) => (p.cat === cat ? news.find((n) => n.idx === p.idx) : p));
    log('dim', `[KIT] ${oldTitle} → ${it.title}`, true);
    const f = fitCheck(B.boardId, id); if (!f.ok) { say(f.why, 'bad', 4200); log('warn', `[${TAG[cat]}] ${f.why}`, true); }
    sfx.whoosh(); poke(900);
    renderKit(); ctx.renderTray && ctx.renderTray();
    return news;
  }
  function kitFor(boardId, sel) {
    const kit = {};
    for (const cat of KIT_ORDER) { const id = sel && sel[cat]; kit[cat] = id && fitCheck(boardId, id).ok ? id : DEFAULT_KIT[boardId][cat]; }
    return kit;
  }
  function switchBoard(id) {
    if (id === B.boardId) { say(`${BY_ID[id].title} is already on the bench.`, '', 2000); return; }
    const kit = kitFor(id, B.kit);
    const swapped = KIT_ORDER.filter((c) => kit[c] !== B.kit[c]);
    setup(id, kit);
    log('dim', `[BENCH] New board: ${BY_ID[id].title}${swapped.length ? ' · swapped: ' + swapped.map((c) => BY_ID[kit[c]].title).join(', ') : ''}`, true);
    say(`${BY_ID[id].title} is on the bench${swapped.length ? ', incompatible parts swapped' : ''}.`, '', 2600);
  }

  /* ---------------- setting the bench up */
  function setup(boardId, kit) {
    powerOff(true);
    for (const k of Object.keys(B.cables)) dropCable(k, true);
    if (B.be) group.remove(B.be.obj, B.be.hlg);
    for (const p of B.parts) group.remove(p.obj);
    B.drag = null; B.hold = {}; B.override = null;
    const be = boardEntry(boardId); B.be = be; B.boardId = boardId; resetBoard(be);
    group.add(be.obj, be.hlg);
    B.kit = {...kit}; S.sel.board = boardId; for (const c of KIT_ORDER) S.sel[c] = kit[c];
    B.parts = [];
    let ram = 0;
    for (const cat of ROWS) { const p = getPart(cat, kit[cat], cat === 'ram' ? ram++ : 0); resetPart(p); B.parts.push(p); group.add(p.obj); }
    B.t0 = 0; B.tEnd = 0; B.warns = 0;
    unpack(be);
    renderKit(); ctx.renderTray && ctx.renderTray();
  }
  async function unpack(be) {
    B.unpacking = true; renderStatus(); poke(2500);
    // the board settles on its box, then the parts drop into the tray one after another
    const y1 = BOARD_Y; be.obj.position.y = y1 + 40;
    tw(0.6, (k) => { be.obj.position.y = y1 + 40 * (1 - easeOut(k)); });
    const list = B.parts.slice();
    list.forEach((p) => { p.obj.visible = false; });
    sfx.whoosh();
    await Promise.all(list.map((p, i) => {
      const h = p.home.clone();
      return tw(0.55, (k) => {
        p.obj.visible = true; const e = easeOut(k);
        p.obj.position.set(h.x, h.y + 140 * (1 - e) + Math.sin(e * PI) * 6, h.z);
        p.obj.quaternion.copy(p.qTray).multiply(qAx(AX.y, (1 - e) * 0.5));
      }, 0.25 + i * 0.09);
    }));
    B.unpacking = false; renderStatus();
  }

  /* ---------------- cables from the power supply */
  const braid = ctex(64, 32, (g, w, h) => {
    g.fillStyle = '#202125'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 3;
    for (let i = -2; i < 6; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16 + 32, h); g.stroke(); g.beginPath(); g.moveTo(i * 16 + 32, 0); g.lineTo(i * 16, h); g.stroke(); }
  }, {repeat: true});
  const cableMat = std('#ffffff', 0.72, 0.04, {map: braid});
  const plugMat = std('#141517', 0.5);
  function psuSocket(psu, kind) {
    const D = psu.model.D;
    const l = psu.model.modular ? {atx: V(D / 2 + 3, 62, 48), eps: V(D / 2 + 3, 65, 12), gpu: V(D / 2 + 3, 65, -44)}[kind]
      : V(D / 2 + 40, 7.6, 52 + {atx: 0, eps: 7, gpu: -7}[kind]);
    return l.applyQuaternion(psu.obj.quaternion).add(psu.obj.position);
  }
  function cablePts(kind) {
    const psu = inPart('psu'); if (!psu) return null;
    const be = B.be, m = be.model, bp = be.obj.position;
    const S0 = psuSocket(psu, kind), r = kind === 'atx' ? 6 : 4.4;
    const P = [S0.clone(), V(S0.x - 26, Math.max(S0.y - 3, r + 0.6), S0.z)];
    let A;
    if (kind === 'atx') {
      A = m.anchors.atx24.clone().add(bp);
      P.push(V(lerp(S0.x, A.x, 0.42), r + 14, lerp(S0.z, A.z, 0.55)), V(A.x + 36, A.y + 24, A.z), V(A.x + 9, A.y + 17, A.z));
    } else if (kind === 'eps') {
      A = m.anchors.eps.clone().add(bp);
      const zTop = bp.z - m.D / 2 - 12;
      P.push(V(S0.x - 64, 30, lerp(S0.z, zTop, 0.6)), V(bp.x + m.W / 2 - 30, 30, zTop), V(A.x + 34, A.y + 22, zTop + 2), V(A.x + 8, A.y + 17, A.z - 4));
    } else {
      const g = inPart('gpu'); if (!g) return null;
      const pl = g.model.plug; A = V(pl.x, pl.y, pl.z).applyQuaternion(g.obj.quaternion).add(g.obj.position);
      P.push(V(S0.x - 60, Math.max(S0.y + 10, A.y * 0.55), lerp(S0.z, A.z, 0.45)), V(A.x + 42, A.y + 46, A.z), V(A.x + 9, A.y + 24, A.z));
    }
    P.push(V(A.x, A.y + 6, A.z));
    return {pts: P, A, S0, r};
  }
  function makeCable(kind) {
    const cp = cablePts(kind); if (!cp) return null;
    const curve = new THREE.CatmullRomCurve3(cp.pts, false, 'centripetal', 0.5);
    const len = curve.getLength(), segs = Math.max(24, Math.ceil(len / 5));
    const geo = new THREE.TubeGeometry(curve, segs, cp.r, 10, false);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) * len) / 9);
    const mesh = new THREE.Mesh(geo, cableMat); mesh.castShadow = true; mesh.receiveShadow = true;
    const g = new THREE.Group(); g.add(mesh);
    const dims = {atx: [11, 14, 54], eps: [19, 14, 10.5], gpu: [18, 13, 10]}[kind];
    const plug = rbox(dims[0], dims[1], dims[2], 1.2, plugMat, cp.A.x, cp.A.y + 6 - dims[1], cp.A.z);
    plug.castShadow = true; plug.visible = false; g.add(plug);
    const psu = inPart('psu');
    if (psu.model.modular) { const sp = rbox(7, 15, kind === 'atx' ? 30 : 20, 1, plugMat, cp.S0.x - 3.5, cp.S0.y - 7.5, cp.S0.z); sp.castShadow = true; g.add(sp); }
    geo.setDrawRange(0, 0);
    return {g, geo, segs, per: 10 * 6, plug, len, k: 0};
  }
  function setCableK(c, k) { c.k = k; c.geo.setDrawRange(0, Math.round(k * c.segs) * c.per); c.plug.visible = k > 0.985; }
  async function grow(kind) {
    if (B.cables[kind]) return;
    const c = makeCable(kind); if (!c) return;
    B.cables[kind] = c; group.add(c.g); poke(1500);
    await tw(0.3 + c.len / 1100, (k) => setCableK(c, easeInOut(k)));
    sfx.latch();
  }
  function dropCable(kind, instant) {
    const c = B.cables[kind]; if (!c) return;
    delete B.cables[kind];
    const fin = () => { group.remove(c.g); c.geo.dispose(); };
    if (instant) { fin(); return; }
    const k0 = c.k; c.plug.visible = false;
    tw(0.28, (k) => setCableK(c, k0 * (1 - k))).then(fin);
  }

  /* ---------------- lights: debug LEDs, the POST display, RGB, fans */
  function setLedMesh(m, on) { m.material.emissive.set('#ff2a12'); m.material.emissiveIntensity = on ? 5 : 0; m.material.color.set(on ? '#ff7a62' : '#3a1010'); }
  function setLed(name, on) { if (!B.be) return; const l = B.be.model.liveRefs.leds.find((q) => q.name === name); if (l) setLedMesh(l.m, on); poke(); }
  function setPostMesh(d, code) {
    const map = d.material.map; if (!map || !map.userData.g) return;
    const g = map.userData.g, cv = map.userData.cv;
    g.fillStyle = '#120808'; g.fillRect(0, 0, cv.width, cv.height);
    g.font = `700 ${Math.round(cv.height * 0.8)}px ${FM}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = code ? '#ff3b22' : 'rgba(255,59,34,.08)'; g.fillText(code || '88', cv.width / 2, cv.height * 0.56);
    map.needsUpdate = true;
    if (!d.material.emissiveMap) { d.material.emissiveMap = map; d.material.emissive.set('#ffffff'); d.material.needsUpdate = true; }
    d.material.emissiveIntensity = code ? 1.8 : 0;
  }
  function setPost(code) { if (B.be && B.be.model.liveRefs.post) setPostMesh(B.be.model.liveRefs.post, code); poke(); }
  const hsl = new THREE.Color();
  function lightPart(p, k, now) {
    // RGB on a module or a card: dark without power, cycling when the system runs
    const m = p.model;
    if (m.rgb && m.rgb.userData.mat) {
      const mat = m.rgb.userData.mat;
      if (p.cat === 'ram') { hsl.setHSL((now * 0.00006 + p.idx * 0.08) % 1, 0.95, 0.55); mat.emissive.copy(hsl); }
      mat.emissiveIntensity = k * 1.6;
    }
    if (m.led && m.led.material) m.led.material.emissiveIntensity = k * 1.1;
  }
  function allFans() {
    const list = [];
    for (const p of B.parts) if (p.state === 'in' && p.model.fans) list.push(...p.model.fans.map((f) => ({f, s: p.cat === 'psu' ? 0.7 : p.cat === 'gpu' ? 0.8 : 1})));
    if (B.be) for (const f of B.be.model.liveRefs.fans || []) list.push({f, s: 1.2});
    return list;
  }

  /* ---------------- power: the POST sequence */
  async function powerOn() {
    if (B.power !== 'off' || B.anim || B.drag) return;
    if (!psuIn()) { say('Without a power supply the board will not start.', 'bad', 2400); return; }
    const tok = ++B.powTok, alive = () => tok === B.powTok;
    const brd = BY_ID[B.boardId].board, gen = brd.pcie === 'PCIe 4.0' ? 4 : 3;
    const psu = inPart('psu'), cpu = inPart('cpu'), cool = inPart('cooler'), gpu = inPart('gpu'), ssd = inPart('ssd');
    const rams = B.parts.filter((p) => p.cat === 'ram' && p.state === 'in');
    B.power = 'post'; B.warns = 0; U.tip.classList.add('v-hide');
    U.setStatus('run', 'POST · SELF TEST', 'The board checks the CPU, memory, video and drive in turn…');
    log('dim', '— Power button pressed —', true);
    sfx.power(); poke(2000);
    await wait(0.55); if (!alive()) return;
    B.fanT = 0.5; B.rgbT = 1; setFans(0.35);
    log('ok', `[PSU] ${psu.it.title}: 5 V standby present, PS_ON → +12 / +5 / +3.3 V rails OK`, true);
    setLed('CPU', true); setPost('19');
    await wait(0.85); if (!alive()) return;
    if (!cpu) return stopAt('CPU', '00', 'CPU not found', `The fans spin but the board is stuck at the first step: the CPU LED is lit. Without a CPU there is nothing to run the test. Put one in the ${brd.socket} socket.`);
    log('ok', `[CPU] ${cpu.it.title} · ${cpu.it.cpu.cores} · ${cpu.it.cpu.clock}`, true);
    setLed('CPU', false); setLed('DRAM', true); setPost('b4');
    await wait(0.85); if (!alive()) return;
    if (!rams.length) { beeps([0.5, 0.5, 0.5]); return stopAt('DRAM', '55', 'Memory not found', `The DRAM LED is lit and the speaker gives long beeps. A PC will not start without RAM. Put the sticks in ${recNames()}.`); }
    const r = rams[0].it.ram, chans = new Set(rams.map((p) => p.seat.ch)), dual = chans.size >= 2;
    log(dual ? 'ok' : 'warn', `[DRAM] ${rams.length} × ${r.size} ${r.type}-${r.freq.replace(' MHz', '')} · ${dual ? 'dual channel' : 'single channel, half the bandwidth'}`, true);
    if (!dual) { B.warns++; log('warn', rams.length === 1 ? `[DRAM] One stick means one channel. Put the second in ${recNames()}` : `[DRAM] Both sticks are in the same channel. Move them to ${recNames()}`, true); }
    if (brd.slots === 8) log('dim', '[DRAM] The X99 controller is quad channel: full speed needs four sticks', true);
    if (parseInt(r.freq, 10) > 2400) log('dim', `[DRAM] Starting at 2133 MHz: the XMP profile in BIOS enables ${r.freq}`, true);
    setLed('DRAM', false); setLed('VGA', true); setPost('92');
    await wait(0.85); if (!alive()) return;
    if (gpu) {
      log('ok', `[VGA] ${gpu.it.title} · ${gpu.it.gpu.vram} · ${brd.pcie} ×16`, true);
      if (gen < 4) log('dim', '[VGA] PCIe 3.0 slot: a PCIe 4.0 card runs at its speed, 1–2 % in games', true);
    } else if (cpu.it.cpu.igpu !== 'none') {
      B.warns++; log('warn', `[VGA] No graphics card: the picture comes from the integrated ${cpu.it.cpu.igpu}. Plug the monitor into the board`, true);
    } else { beeps([0.5, 0.12, 0.12, 0.12]); return stopAt('VGA', 'd6', 'No display', `${cpu.it.title} has no integrated graphics and no graphics card is installed. The VGA LED is lit: one long and three short beeps.`); }
    setLed('VGA', false); setLed('BOOT', true); setPost('A2');
    await wait(0.85); if (!alive()) return;
    if (!ssd) return stopAt('BOOT', 'Ab', 'No boot drive', 'The hardware is fine but there is nothing to boot from: the board opened the BIOS screen. Put an NVMe drive in the M.2 slot.');
    log('ok', `[BOOT] ${ssd.it.title} · ${ssd.it.ssd.iface} · boot loader found`, true);
    if (ssd.model.gen > gen) { B.warns++; log('warn', `[M.2] Slot ${ssd.seat.name} is PCIe 3.0: ${ssd.it.title} is capped at 3500 MB/s instead of ${ssd.it.ssd.read}`, true); }
    setLed('BOOT', false); setPost('A0'); sfx.beep();
    log('ok', '[POST] Self test passed, one short beep. Booting the system…', true);
    U.setStatus('run', 'BOOTING', 'POST passed, the system is booting. Now for a real load.');
    await wait(1.2); if (!alive()) return;
    B.fanT = 1; setFans(0.7);
    log('dim', '[LOAD] Load: a 4K game with a render in the background…', true);
    const load = Math.round(cpu.it.cpu.tdp * 1.25 + (gpu ? gpu.it.gpu.tbp : 0) + 75), watts = psu.model.watts;
    await wait(1.3); if (!alive()) return;
    if (load > watts) {
      const need = gpu ? gpu.it.gpu.psu : 450;
      log('err', `[PSU] Peak draw ~${load} W against a ${watts} W limit: over current protection (OCP) tripped`, true);
      return crash('PSU OVERLOAD', `The PC shut down mid game: ${psu.it.title} cannot feed ${gpu ? gpu.it.title : 'this build'} and ${cpu.it.title}, peak around ${load} W. You need ${need} W or more, for example the Volt 850.`);
    }
    if (!cool) {
      for (const t of [71, 88, 99]) { setPost(String(t)); log('warn', `[TEMP] CPU ${t} °C`, true); await wait(0.5); if (!alive()) return; }
      log('err', '[TEMP] CPU 105 °C: emergency shutdown (THERMTRIP)', true);
      return crash('OVERHEAT', 'Without a cooler the CPU hit 100 °C in seconds and shut the PC down. Put a cooler on the CPU lid.');
    }
    const ct = cool.model.tdp, pt = cpu.it.cpu.tdp;
    if (ct < pt) { B.warns++; setPost('98'); log('warn', `[TEMP] CPU 98 °C, throttling: the clock drops. ${cool.it.title} handles ${ct} W but the CPU needs ${pt}`, true); }
    else { const t = Math.round(52 + (pt / ct) * 24); setPost(String(t)); log('ok', `[TEMP] CPU ${t} °C under load, ${cool.it.title} keeps up`, true); }
    const margin = Math.round((1 - load / watts) * 100);
    if (margin < 15) B.warns++;
    log(margin < 15 ? 'warn' : 'ok', `[PSU] Draw ~${load} W of ${watts}, ${margin} % headroom${margin < 15 ? ', cutting it close' : ''}`, true);
    B.power = 'on'; B.tEnd = performance.now();
    const took = B.t0 ? (B.tEnd - B.t0) / 1000 : 0;
    let rec = '';
    if (B.challenge && took) {
      const key = 'pcv-best-' + B.boardId; let best = 0;
      try { best = parseFloat(localStorage.getItem(key)) || 0; } catch (e) { /* storage may be off */ }
      if (!best || took < best) { try { localStorage.setItem(key, String(took)); } catch (e) { /* ignore */ } rec = best ? ` New record! It was ${fmt(best)}.` : ' First record for this board.'; }
      else rec = ` Record: ${fmt(best)}.`;
    }
    log('ok', `[OK] System running${took ? ' · built in ' + fmt(took) : ''}${B.warns ? ` · notes: ${B.warns}` : ''}`, true);
    B.result = {cls: 'ok', eb: 'PC IS RUNNING', text: `${took ? 'Built and started in ' + fmt(took) + '.' : 'Started.'}${rec} ${B.warns ? 'There are notes, see the log on the left.' : 'Not a single note!'}`};
    sfx.ok(); renderStatus(); renderKit();
  }
  function beeps(list) { let t = 0; for (const l of list) { setTimeout(() => sfx.beep(), t * 1000); if (l > 0.3) setTimeout(() => sfx.beep(), t * 1000 + 180); t += l + 0.25; } }
  function stopAt(led, code, title, text) {
    setPost(code); sfx.error();
    log('err', `[${led}] ${title}: the board stopped at code ${code}`, true);
    B.power = 'fail'; B.result = {cls: 'bad', eb: `HALT · ${led}`, text};
    renderStatus(); poke();
  }
  function crash(eb, text) {
    // the protection cuts everything at once: fans spin down, the lights go out
    B.fanT = 0; B.rgbT = 0; setFans(0); setPost(null);
    for (const n of ['CPU', 'DRAM', 'VGA', 'BOOT']) setLed(n, false);
    sfx.power();
    B.power = 'fail'; B.result = {cls: 'bad', eb, text};
    renderStatus(); poke(2000);
  }
  function powerOff(quiet) {
    const was = B.power;
    B.powTok++; B.power = 'off'; B.fanT = 0; B.rgbT = 0; B.result = null;
    setFans(0);
    if (B.be) { for (const n of ['CPU', 'DRAM', 'VGA', 'BOOT']) setLed(n, false); setPost(null); }
    if (!quiet && was !== 'off') { sfx.click(); log('dim', '— Power off —', true); }
    renderStatus(); poke(1500);
  }

  /* ---------------- the kit panel */
  function rowSub(p) {
    if (p.state === 'in') return 'installed · ' + p.seat.name;
    if ((p.cat === 'cpu' || p.cat === 'ram') && !fitCheck(B.boardId, p.id).ok) return 'does not fit this board';
    switch (p.cat) {
      case 'cpu': return 'into socket ' + B.be.model.seats.cpu.socket;
      case 'cooler': return 'onto the CPU lid';
      case 'ram': return 'into slot ' + recSeats()[p.idx].name;
      case 'gpu': return 'into the top PCIe x16 slot';
      case 'ssd': return 'into ' + B.be.m2[0].name;
      case 'psu': return 'onto the mat by the board';
    }
  }
  function stepText(p) {
    const t = p.it.title;
    switch (p.cat) {
      case 'cpu': return `Drag the ${t} into the ${B.be.model.seats.cpu.socket} socket. The frame opens by itself; the gold triangle goes to the mark on the socket.`;
      case 'cooler': return `${t} goes on the CPU lid. Thermal paste is already on the base.`;
      case 'ram': return p.idx === 0 ? `Memory goes in ${recNames()} for dual channel. The latches open and click by themselves.` : `Second stick goes in ${recSeats()[1].name}.`;
      case 'gpu': return `${t} goes in the top PCIe x16 slot, nearest the CPU. The fans face the lower edge of the board.`;
      case 'ssd': { const s = B.be.m2[0]; return `${t} goes in ${s.name} by the CPU${s.shield ? ': the heatsink over it lifts by itself' : ''}. The drive goes in at an angle and is held by a screw.`; }
      case 'psu': return `The power supply goes on the dashed pad. The 24-pin, CPU 8-pin${inPart('gpu') ? ' and graphics power' : ''} cables connect by themselves.`;
    }
  }
  function renderKit() {
    if (!B.be) return;
    const n = installed(), nx = nextPart();
    U.kq('title').textContent = BY_ID[B.boardId].title;
    U.kq('cnt').textContent = `${n} / ${B.parts.length} installed`;
    U.kq('bar').style.width = (n / B.parts.length) * 100 + '%';
    U.setKitRows(B.parts.map((p) => {
      const bad = (p.cat === 'cpu' || p.cat === 'ram') && p.state !== 'in' && !fitCheck(B.boardId, p.id).ok;
      const cls = p.state === 'in' ? 'done' : bad ? 'bad' : p === nx ? 'cur' : '';
      const tag = p.state === 'in' ? 'in' : bad ? 'wrong' : p === nx ? 'next' : p.state === 'drag' || p.state === 'anim' ? 'in hand' : p.cat === 'psu' ? 'table' : 'tray';
      return {cat: p.cat + ':' + p.idx, name: p.it.title + (p.cat === 'ram' ? ` · ${p.idx + 1}` : ''), sub: rowSub(p), tag, cls};
    }));
    renderStatus();
  }
  function renderStatus() {
    if (!B.be || !B.active && !B.be) return;
    if (B.power === 'post') return;
    const o = B.override;
    if (o && performance.now() < o.until) { U.setStatus(o.cls, o.eb, o.text); return; }
    if (B.power === 'on' || B.power === 'fail') { U.setStatus(B.result.cls, B.result.eb, B.result.text, {label: 'Power off', cls: 'dark', icon: 'power', on: () => powerOff()}); return; }
    if (B.unpacking) { U.setStatus('', 'UNPACKING', 'Laying out the parts in the tray, each in its place.'); return; }
    const nx = nextPart();
    if (!nx) { U.setStatus('ok', 'READY TO START', 'All parts in place, cables connected. Press the button and see what the board says.', {label: 'Power on', cls: 'green', icon: 'power', on: () => powerOn()}); return; }
    const f = (nx.cat === 'cpu' || nx.cat === 'ram') ? fitCheck(B.boardId, nx.id) : {ok: true};
    if (!f.ok) {
      const alt = DEFAULT_KIT[B.boardId][nx.cat];
      U.setStatus('bad', 'DOES NOT FIT', `${nx.it.title}: ${f.why}`, {label: `Take ${BY_ID[alt].title}`, cls: 'dark', on: () => { sfx.click(); swapKit(alt); }});
      return;
    }
    U.setStatus('', `STEP ${installed() + 1} OF ${B.parts.length}`, stepText(nx), psuIn() ? {label: 'Power on anyway', cls: 'out', icon: 'power', on: () => powerOn()} : null);
  }

  /* ---------------- hints, auto-place, reset, challenge */
  function hintFor(p, quiet) {
    if (!p) return;
    const s = p.state === 'in' ? p.seat : bestSeat(p);
    B.hintSeat = s; B.hintUntil = performance.now() + 3400; p.bounceT = performance.now(); poke(3500);
    const f = check(p);
    if (!f.ok && p.state !== 'in') say(f.why, 'bad', 3600); else say(p.state === 'in' ? `${p.it.title} · ${p.seat.name}` : stepText(p), '', 4200);
    if (!quiet) sfx.click();
  }
  function hint() {
    if (B.challenge) { say('No hints in the challenge: just you and the parts.', '', 2400); return; }
    const p = nextPart(); if (!p) { say('All built, press Power on.', 'good', 2200); return; }
    hintFor(p);
  }
  async function autoNext() {
    if (B.challenge) { say('No auto install in the challenge.', '', 2200); return; }
    if (B.power !== 'off') { say('Power off first.', 'bad', 2200); return; }
    if (B.anim || B.drag || B.unpacking) return;
    const p = nextPart(); if (!p) { say('Everything is in, press Power on.', 'good', 2200); return; }
    if (p.state !== 'tray') return;
    const s = bestSeat(p), c = check(p);
    if (!c.ok) { p.bounceT = performance.now(); failDrop(p, c.why); return; }
    startTimer(); sfx.pick(); p.state = 'anim'; renderKit();
    const {pos, q} = seatPose(p, s);
    await moveTo(p, pos.clone().add(V(0, s.hover, 0)), q, 0.75, easeInOut, 90);
    await install(p, s);
  }
  async function reset() {
    if (B.anim || B.unpacking) return;
    powerOff(true);
    const list = B.parts.filter((p) => p.state === 'in').reverse();
    list.forEach((p, i) => { unseat(p); sendHome(p, i * 0.09); });
    B.t0 = 0; B.tEnd = 0; B.override = null;
    log('dim', '[BENCH] Everything back in the tray, starting over', true);
    sfx.whoosh(); renderKit();
  }
  function toggleChallenge() {
    B.challenge = !B.challenge;
    U.kq('chal').classList.toggle('on', B.challenge); U.kq('chst').textContent = B.challenge ? 'ON' : 'OFF';
    U.kq('hint').disabled = B.challenge; U.kq('auto').disabled = B.challenge;
    sfx.click(); reset();
    if (B.challenge) {
      let best = 0; try { best = parseFloat(localStorage.getItem('pcv-best-' + B.boardId)) || 0; } catch (e) { /* ignore */ }
      say(`Challenge: build and start the PC against the clock, no hints. ${best ? 'Record: ' + fmt(best) + '.' : 'No record yet.'}`, '', 4200);
      log('dim', '[CHALLENGE] The timer starts with the first part you pick up', true);
    } else say('Challenge off.', '', 1800);
  }
  function rowClick(key) {
    const [cat, idx] = key.split(':'); const p = partOf(cat, +idx || 0); if (!p) return;
    if (p.state === 'in') { orb.set({t: p.seat.c.clone().setY(30), dist: 560}); say(`${p.it.title} · ${p.seat.name}. Click an empty spot to put it back.`, '', 2600); sfx.click(); B.hintSeat = p.seat; B.hintUntil = performance.now() + 2000; poke(2000); return; }
    hintFor(p);
  }

  /* ---------------- per frame */
  const tq = new THREE.Quaternion(), tp = V();
  function update(dt, now) {
    if (!B.active || !B.be) return;
    if (B.waits.length) B.waits = B.waits.filter((w) => { if (w.cond() || now - w.t0 > w.max * 1000) { w.res(); return false; } return true; });
    const be = B.be, D = B.drag;
    // the part in hand
    if (D && D.started) {
      const p = D.p;
      setRay(D.x, D.y);
      D.snap = findSnap(p);
      if (D.snap) { const sp = seatPose(p, D.snap); tp.copy(sp.pos).add(V(0, D.snap.hover, 0)); tq.copy(sp.q); }
      else { tp.copy(freePose(p)); tq.copy(p.qTray); }
      p.obj.position.lerp(tp, 1 - Math.exp(-dt * 17));
      p.obj.quaternion.slerp(tq, 1 - Math.exp(-dt * 11));
    }
    const snap = D && D.started ? D.snap : null;
    const ease = (v, t, r) => { const n = v + (t - v) * (1 - Math.exp(-dt * r)); return Math.abs(n - t) < 0.002 ? t : n; };
    // socket, latches, shields open for a part that is about to go in
    const sT = B.hold.cpu || snap === be.cpuSeat ? 1 : 0;
    const k0 = B.sockK; B.sockK = ease(B.sockK, sT, 6.5);
    const hc = !!be.cpuSeat.occupant || !!(D && D.started && D.p.cat === 'cpu' && snap === be.cpuSeat);
    if (B.sockK !== k0 || hc !== be._hc) { poseSocket(be.model.socket, B.sockK, hc); be._hc = hc; }
    for (const s of be.dimms) { const t = s.hold || snap === s ? 1 : 0; const v = s.latchK; s.latchK = ease(s.latchK, t, 10); if (v !== s.latchK) setLatch(s.slot, s.latchK); }
    for (const s of be.m2) if (s.shield) { const t = s.hold || snap === s ? 1 : 0; s.shieldK = ease(s.shieldK, t, 7); s.shield.position.set(s.sh0.x, s.sh0.y + s.shieldK * 34, s.sh0.z - s.shieldK * 6); }
    // seat glows
    const pulse = 0.78 + 0.22 * Math.sin(now * 0.008);
    for (const s of be.seats) {
      if (!s.mesh) continue;
      let t = 0, bad = false;
      if (D && D.started && s.cat === D.p.cat && (!s.occupant || s.occupant === D.p)) { t = snap === s ? 1 : 0.42; bad = !check(D.p).ok; }
      if (B.hintSeat === s && now < B.hintUntil) t = Math.max(t, 0.55 + 0.45 * Math.sin(now * 0.012));
      s.glow = ease(s.glow, t, 12);
      s.mesh.visible = s.glow > 0.01;
      if (s.mesh.visible) {
        s.mesh.material.color.set(bad ? '#ff5434' : '#35d07a'); s.mesh.material.opacity = s.glow * pulse;
        if (s.cat === 'cooler') { const c = inPart('cpu'); s.mesh.position.y = c ? s.pos.y + c.model.top + 0.6 : s.hy; }
      }
    }
    // hover lift and a little hop for a clicked part
    for (const p of B.parts) {
      const t = B.hover === p && p.state === 'tray' ? 1 : 0;
      p.hk = ease(p.hk, t, 14);
      const b = p.bounceT ? (now - p.bounceT) / 1000 : 9;
      const hop = b < 0.6 ? Math.sin((b / 0.6) * PI) * 18 * (1 - b / 0.6 * 0.4) : 0;
      if (b >= 0.6) p.bounceT = 0;
      p.lift.position.y = p.hk * 6 + hop;
    }
    // fans and RGB
    B.fanK = ease(B.fanK, B.fanT, B.fanT > B.fanK ? 1.4 : 0.9);
    if (B.fanK > 0) for (const {f, s} of allFans()) f.rotation.z += dt * B.fanK * 30 * s;
    B.rgbK = ease(B.rgbK, B.rgbT, 3);
    if (B.rgbK > 0 || B._rgbWas) {
      for (const m of be.model.liveRefs.rgb) { hsl.setHSL((now * 0.00005 + (m.position.x + 200) * 0.002) % 1, 0.9, 0.55); m.material.emissive.copy(hsl); m.material.emissiveIntensity = 0.03 + B.rgbK * (m.userData.rgb && m.userData.rgb.mirror ? 1.1 : 1.5); }
      for (const p of B.parts) lightPart(p, p.state === 'in' ? B.rgbK : 0, now);
      B._rgbWas = B.rgbK > 0;
    }
  }
  function busy() {
    if (!B.active) return false;
    const now = performance.now();
    return !!B.drag || B.anim > 0 || B.waits.length > 0 || B.power !== 'off' || B.fanK > 0 || B.rgbK > 0 || now < B.live || now < B.hintUntil || B.unpacking;
  }

  /* ---------------- the timer runs even while the scene sleeps */
  setInterval(() => {
    if (!B.active || !B.be) return;
    const s = B.t0 ? ((B.tEnd || performance.now()) - B.t0) / 1000 : 0;
    const txt = fmt(s); if (txt !== B.timerTxt) { B.timerTxt = txt; U.kq('time').textContent = txt; }
  }, 250);

  /* ---------------- entering and leaving */
  function enter(boardId, sel) {
    B.active = true; scene.add(group);
    U.log.classList.remove('off');
    if (B.boardId !== boardId) {
      setup(boardId, kitFor(boardId, sel));
      log('dim', `[BENCH] ${BY_ID[boardId].title} is on the antistatic box. Parts are in the tray, the power supply is on the table.`, true);
      log('dim', '[BENCH] Order: CPU → cooler → memory → graphics → drive → power', true);
    } else {
      for (const cat of KIT_ORDER) if (sel[cat] && sel[cat] !== B.kit[cat] && fitCheck(boardId, sel[cat]).ok) swapKit(sel[cat]);
      renderKit();
    }
    orb.minEl = 0.32; orb.maxEl = 1.45; orb.minD = 260; orb.maxD = 2600;
    orb.set(BENCH_VIEW);
    st.aimLight(-30, 40, 780);
    poke(1500);
  }
  function exit() {
    if (!B.active) return;
    if (B.drag) { const p = B.drag.p; B.drag = null; if (p.state === 'drag') resetPart(p); }
    powerOff(true);
    B.active = false; scene.remove(group);
    U.log.classList.add('off'); U.tip.classList.add('v-hide'); U.ghost.classList.add('v-gone');
    orb.minEl = 0.1; orb.maxEl = 1.5;
  }

  return {
    boardId: () => B.boardId || S.sel.board,
    kitId: (cat) => B.kit[cat] || S.sel[cat],
    enter, exit, update, busy, pointerDown, pointerMove, pointerUp, hover, click, tileDown, hint, autoNext, reset, toggleChallenge, rowClick,
    powerOn, powerOff, _B: B, _rec: () => recSeats(),
    // for the review scripts: where a part or a seat is on screen
    _screen: (key) => {
      const seat = key.startsWith('seat:');
      const p = seat ? null : B.parts.find((q) => q.key === key || q.cat === key);
      if (seat) key = key.slice(5);
      let v;
      if (p) { const bb = new THREE.Box3().setFromObject(p.obj); v = bb.getCenter(V()); }
      else { const s = B.be.seats.find((q) => q.key === key); if (!s) return null; v = s.c.clone().setY(s.hy); }
      const r = st.project(v); return [Math.round(r.x), Math.round(r.y)];
    },
  };
}
