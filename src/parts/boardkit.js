// BOARD KIT · the pieces every motherboard is made of: the PCB with its printed top and bottom, sockets with a lever
// and load plate that really open, DIMM slots with latches, PCIe slots (plain and steel-armoured), M.2 sockets,
// power connectors, SATA, headers, chokes and solid capacitors, the rear I/O, and heatsinks cut from outlines.
// Board space: origin in the middle of the board, x to the right (I/O edge on the left), z toward the near edge
// (PCIe slots), the top of the PCB at y = T. Specs are written in "photo" coordinates u (from the I/O edge) and
// v (from the top edge) and turned into x, z by P().
import {THREE, V3, PI, TAU, MAT, std, topTex, ctex, mapCap, slab, slabGeo, box, rbox, cylY, cylX, cylZ, lathe, tube, grp, at, put, silk, rrect, poly,
  softShadow, prism, prismGeo, profile, Scatter, smd, live, rng, FM, FS, decal, faceTex, plate} from '../lib.js';

export const T = 1.6;

/* ------------------------------------------------------------ connectors and slots */
export function dimmSlot(len, body, latch, latchBoth = true) {
  // a DIMM slot along z, its middle at the origin; latches are live and open outward
  const g = new THREE.Group(), H = 7.6, Wd = 6.4;
  g.add(rbox(Wd, H, len - 14, 0.5, std(body, 0.55), 0, T, 0));
  g.add(box(1.4, 0.6, len - 18, std('#0b0b0c', 0.9), 0, T + H - 0.55, 0));
  const lat = [];
  const mk = (s) => {
    const L = new THREE.Group(); L.position.set(0, T + 1.2, s * (len / 2 - 7));
    const arm = rbox(5.6, 9.8, 6.6, 0.6, std(latch, 0.5), 0, 0, s * 3.1); L.add(arm);
    L.add(box(4.2, 2.2, 1.6, std(latch, 0.5), 0, 8.6, s * 6.2));
    live(L); g.add(L); lat.push({obj: L, s});
  };
  mk(1); if (latchBoth) mk(-1); else g.add(rbox(5.6, 9.2, 6, 0.6, std(body, 0.55), 0, T + 1.2, -(len / 2 - 4)));
  g.userData.latches = lat;
  g.userData.top = T + H;
  return g;
}
export function setLatch(slotGroup, open) {
  for (const {obj, s} of slotGroup.userData.latches || []) obj.rotation.x = s * open * 0.45;
}
export function pcieSlot(kind, body, armor, latchCol) {
  // a PCIe slot along x starting at x = 0 (the rear end): x16 is 89 mm with its key at 11.65 mm, x1 is 25 mm
  const g = new THREE.Group(), len = kind === 'x16' ? 89 : kind === 'x4' ? 39 : 25, H = 11.2, Wd = 7.4;
  const bodyM = std(body, 0.5);
  g.add(rbox(11.6, H, Wd, 0.5, bodyM, 5.8, T, 0));
  g.add(rbox(len - 13.1, H, Wd, 0.5, bodyM, 13.1 + (len - 13.1) / 2, T, 0));
  g.add(box(len - 3, 0.5, 1.6, std('#0a0a0b', 0.9), len / 2, T + H - 0.45, 0));
  if (kind === 'x16') {
    const lt = rbox(7, 9, 9, 0.8, std(latchCol || body, 0.5), len + 2.5, T + 1, 0); g.add(lt);
  }
  if (armor) {
    const sm = std('#cdd2d8', 0.24, 1);
    g.add(box(len + 1.4, 1.2, Wd + 1.6, sm, len / 2, T + H - 0.9, 0));
    [-1, 1].forEach((s) => g.add(box(len + 1.4, H - 1.4, 0.5, sm, len / 2, T + 0.8, s * (Wd / 2 + 0.55))));
    g.add(box(1.2, H, Wd + 1.6, sm, -0.6, T, 0));
  }
  g.userData.len = len; g.userData.top = T + H;
  return g;
}
export function m2Socket() {
  const g = new THREE.Group();
  g.add(rbox(4.6, 3.6, 22, 0.4, std('#16171a', 0.5), 0, T, 0));
  g.add(box(1.2, 1.2, 19, MAT.goldPin, 2.6, T + 1.1, 0));
  return g;
}
export function standoff(r = 2.6) { return grp(cylY(r, 2.6, MAT.brass, 0, T, 0, 6), cylY(1.2, 1.4, MAT.steel, 0, T + 2.6, 0, 10)); }
export function powerConn(cols, rows, col) {
  // a Molex Mini-Fit Jr header (24-pin ATX, 8-pin EPS), pins on a 4.2 mm pitch
  const g = new THREE.Group(), P = 4.2, w = cols * P + 1.6, d = rows * P + 2.6;
  const m = std(col || '#1a1b1e', 0.55);
  g.add(rbox(w, 9.4, d, 0.5, m, 0, T, 0));
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const x = -((cols - 1) * P) / 2 + c * P, z = -((rows - 1) * P) / 2 + r * P;
    g.add(box(3.2, 0.6, 3.2, std('#060607', 0.9), x, T + 9.0, z));
    g.add(box(1.0, 4, 1.0, MAT.tin, x, T + 5.2, z));
  }
  g.add(box(4.2, 2.6, 1.6, m, 0, T + 6, d / 2 + 0.7));
  g.userData.top = T + 9.4;
  return g;
}
export function sataPort(col, angled = true) {
  const g = new THREE.Group(), m = std(col || '#1a1b1e', 0.5);
  if (angled) { g.add(rbox(10, 6.6, 14, 0.5, m, 0, T, 0)); g.add(box(1.2, 4.4, 9, std('#060607', 0.9), 5.1, T + 1.2, 0)); }
  else { g.add(rbox(14, 10, 6.6, 0.5, m, 0, T, 0)); }
  return g;
}
export function pinHeader(n, rows = 2, shroud = false, col = '#141518') {
  const g = new THREE.Group(), P = 2.54;
  const body = rows * P;
  g.add(box(n * P, 2.5, body, std(col, 0.55), 0, T, 0));
  for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) g.add(box(0.64, 8.4, 0.64, MAT.goldPin, -((n - 1) * P) / 2 + i * P, T, -((rows - 1) * P) / 2 + r * P));
  if (shroud) {
    const sm = std(col, 0.55);
    g.add(box(n * P + 2.4, 9, 0.8, sm, 0, T, body / 2 + 0.8)); g.add(box(n * P + 2.4, 9, 0.8, sm, 0, T, -body / 2 - 0.8));
    g.add(box(0.8, 9, body + 2.4, sm, n * P / 2 + 0.8, T, 0)); g.add(box(0.8, 9, body + 2.4, sm, -n * P / 2 - 0.8, T, 0));
  }
  return g;
}
export function fanHeader() { const g = new THREE.Group(); g.add(rbox(10.2, 6.8, 5, 0.4, std('#f1efe8', 0.5), 0, T, 0)); for (let i = 0; i < 4; i++) g.add(box(0.64, 6.4, 0.64, MAT.goldPin, -3.8 + i * 2.54, T, 0.6)); return g; }
export function battery() {
  const g = new THREE.Group();
  g.add(cylY(12.2, 2.4, std('#1b1c20', 0.55), 0, T, 0, 40));
  const cell = lathe([[0, 0], [9.8, 0], [10, 0.4], [10, 2.8], [9.6, 3.2], [0, 3.2]], std('#d9dde2', 0.2, 1), 48); cell.position.y = T + 1.6; g.add(cell);
  const lab = decal(13, 13, ctex(128, 128, (c, W, H) => { c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, W, H); silk(c, 'CR2032', W / 2, H / 2 - 12, 20, 'rgba(60,64,70,.85)', 'center', 800, FS); silk(c, '3V  LITHIUM', W / 2, H / 2 + 16, 13, 'rgba(60,64,70,.7)', 'center', 700, FS); }), T + 4.82, {transparent: true, mat: {metalness: 0.6, roughness: 0.3}});
  g.add(lab);
  g.add(box(6, 4.6, 3, MAT.steel, 0, T, -11.8));
  return g;
}
export function choke(s = 10, h = 6, col) { const g = new THREE.Group(); g.add(rbox(s, h, s, 0.8, std(col || '#3d4045', 0.55, 0.15), 0, T, 0)); g.add(box(s * 0.5, 0.2, s * 0.3, std('#9ba1a8', 0.4, 0.8), 0, T + h, 0)); return g; }
export function solidCap(r, h, sleeve) {
  const g = new THREE.Group();
  g.add(cylY(r, h, std(sleeve || '#2b2d33', 0.32, 0.65), 0, T, 0, 20));
  g.add(cylY(r * 0.92, 0.3, std('#aeb4bb', 0.3, 1), 0, T + h, 0, 20));
  return g;
}
export function qfp(w, d, h, label, sub, col = '#1a1b1f') {
  const g = new THREE.Group();
  g.add(rbox(w, h, d, 0.3, std(col, 0.42), 0, T, 0));
  const pinM = MAT.tin, n = Math.round(w / 0.8);
  for (let i = 0; i < n; i++) { const x = -w / 2 + 0.6 + i * ((w - 1.2) / (n - 1)); g.add(box(0.25, 0.25, 1.2, pinM, x, T, -d / 2 - 0.4)); g.add(box(0.25, 0.25, 1.2, pinM, x, T, d / 2 + 0.4)); }
  if (label) g.add(decal(w * 0.86, d * 0.6, ctex(256, 180, (c, W, H) => { c.fillStyle = col; c.fillRect(0, 0, W, H); silk(c, label, W / 2, H * 0.38, 40, '#b9bcc2', 'center', 700, FM); if (sub) silk(c, sub, W / 2, H * 0.72, 24, '#868a92', 'center', 600, FM); }), T + h + 0.02));
  return g;
}

/* ------------------------------------------------------------ CPU sockets (live lever + load plate) */
export const SOCKETS = {
  LGA1700: {pkg: [37.5, 45], frame: [55, 66], kind: 'lga'},
  LGA1200: {pkg: [37.5, 37.5], frame: [50, 60], kind: 'lga'},
  LGA1151: {pkg: [37.5, 37.5], frame: [50, 60], kind: 'lga'},
  'LGA2011-3': {pkg: [52.5, 45], frame: [74, 66], kind: 'lga2011'},
  AM4: {pkg: [40, 40], frame: [44, 52], kind: 'pga'},
};
export function cpuSocket(type, opts = {}) {
  const S = SOCKETS[type], g = new THREE.Group(), [pw, pd] = S.pkg;
  const steel = std(opts.plate || '#c3c8ce', 0.32, 1), black = std('#1b1c1f', 0.6), dark = std('#2a2b2f', 0.5, 0.4);
  const info = {type, pkg: S.pkg, seatY: T + 3.2, live: {}};
  if (S.kind === 'pga') {
    // AM4: a white socket body with a field of holes, a lever on the right, a retention frame top and bottom
    const holes = topTex(pw + 4, pd + 4, 8, (c, w, d) => {
      c.fillStyle = '#ecebe4'; c.fillRect(-w / 2, -d / 2, w, d);
      c.fillStyle = '#4a4a48';
      for (let x = -pw / 2 + 2; x <= pw / 2 - 2; x += 1.27) for (let z = -pd / 2 + 2; z <= pd / 2 - 2; z += 1.27) { if (Math.abs(x) < 5 && Math.abs(z) < 5) continue; c.beginPath(); c.arc(x, z, 0.32, 0, TAU); c.fill(); }
      c.strokeStyle = '#a7a59d'; c.lineWidth = 0.4; c.strokeRect(-pw / 2 + 1, -pd / 2 + 1, pw - 2, pd - 2);
      poly(c, [[-pw / 2 + 1, pd / 2 - 1], [-pw / 2 + 5, pd / 2 - 1], [-pw / 2 + 1, pd / 2 - 5]]); c.fillStyle = '#a7a59d'; c.fill();
    });
    const body = slab(pw + 4, pd + 8, 3.2, 0.8, std('#ffffff', 0.6, 0, {map: mapCap(holes, pw + 4, pd + 8)}), std('#e9e7df', 0.6));
    body.position.y = T; g.add(body);
    g.add(box(6, 4.2, pd + 8, std('#e9e7df', 0.6), pw / 2 + 5, T, 0));
    const lever = new THREE.Group(); lever.position.set(pw / 2 + 8.2, T + 2.4, -pd / 2 - 2);
    lever.add(cylZ(0.8, pd + 6, MAT.steel, 0, 0, (pd + 6) / 2, 10)); lever.add(box(1.6, 1.6, 6, MAT.steel, 0, -0.8, pd + 4)); lever.add(box(2, 7, 1.6, MAT.steel, 0, -1, pd + 6.8));
    live(lever, 'lever'); g.add(lever); info.live.lever = lever; info.leverAxis = 'z';
    // the black retention frame (top and bottom clips) the stock cooler hooks onto
    [-1, 1].forEach((s) => { g.add(rbox(52, 8, 9, 1.2, black, 0, T, s * 46)); g.add(rbox(10, 11, 7, 1, black, 0, T, s * 50)); g.add(cylY(2.6, 1.2, MAT.steel, -21, T + 8, s * 46, 12)); g.add(cylY(2.6, 1.2, MAT.steel, 21, T + 8, s * 46, 12)); });
    info.seatY = T + 3.2;
    return {g, info};
  }
  // LGA: the socket body under a steel load plate hinged on the far edge, a lever along the right side
  const [fw, fd] = S.frame;
  g.add(rbox(fw - 6, 2.6, fd - 10, 0.6, black, 0, T, 0));
  const field = topTex(pw, pd, 10, (c, w, d) => {
    c.fillStyle = '#2b2a28'; c.fillRect(-w / 2, -d / 2, w, d);
    c.fillStyle = '#c8a24d';
    for (let x = -w / 2 + 1; x < w / 2 - 0.5; x += 0.9) for (let z = -d / 2 + 1; z < d / 2 - 0.5; z += 0.9) { if (Math.abs(x) < w * 0.18 && Math.abs(z) < d * 0.2) continue; c.fillRect(x - 0.18, z - 0.18, 0.36, 0.36); }
  });
  g.add(decal(pw, pd, field, T + 2.62));
  const ilm = new THREE.Group();
  if (S.kind === 'lga2011') {
    // two levers, a heavier ILM, four corner bolts
    g.add(rbox(fw, 3.2, fd, 1.4, dark, 0, T, 0));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(cylY(2.2, 6, MAT.steel, sx * (fw / 2 - 3), T + 3.2, sz * (fd / 2 - 3), 12)));
  } else {
    g.add(rbox(fw, 1.4, fd, 1.2, dark, 0, T, 0));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(cylY(2.0, 3.4, MAT.steel, sx * (fw / 2 - 3), T + 1.4, sz * (fd / 2 - 3), 12)));
  }
  // the load plate: a steel frame with a window, hinged at the far edge (z = -fd/2)
  const plateG = new THREE.Group(); plateG.position.set(0, T + 3.0, -fd / 2 + 4);
  const pts = [], hw = (pw + 6) / 2, hd = (pd + 10) / 2;
  const ring = new THREE.Shape(); ring.moveTo(-hw - 3, -hd - 1); ring.lineTo(hw + 3, -hd - 1); ring.lineTo(hw + 3, hd + 2); ring.lineTo(-hw - 3, hd + 2); ring.lineTo(-hw - 3, -hd - 1);
  const win = new THREE.Path(); win.moveTo(-pw / 2 + 2.5, -pd / 2 + 3); win.lineTo(-pw / 2 + 2.5, pd / 2 - 3); win.lineTo(pw / 2 - 2.5, pd / 2 - 3); win.lineTo(pw / 2 - 2.5, -pd / 2 + 3); win.lineTo(-pw / 2 + 2.5, -pd / 2 + 3); ring.holes.push(win);
  const pg = new THREE.ExtrudeGeometry(ring, {depth: 0.8, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.2, bevelSegments: 1}); pg.rotateX(-PI / 2); pg.translate(0, 0, fd / 2 - 4);
  const pm = new THREE.Mesh(pg, steel); plateG.add(pm);
  plateG.add(box(pw - 4, 1.2, 2.4, steel, 0, 0.2, fd - 8 + 1.6));
  live(plateG, 'plate'); g.add(plateG); info.live.plate = plateG;
  // the PnP cap the board ships with (removed when a CPU goes in)
  if (opts.cap !== false) {
    const capTex = topTex(pw + 3, pd + 6, 8, (c, w, d) => {
      c.fillStyle = opts.capCol || '#1d1e21'; c.fillRect(-w / 2, -d / 2, w, d);
      c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 0.4; c.strokeRect(-w / 2 + 2, -d / 2 + 2, w - 4, d - 4);
      const ink = opts.capCol && opts.capCol !== '#1d1e21' ? 'rgba(60,64,70,.65)' : 'rgba(225,228,232,.7)';
      silk(c, 'CAUTION', 0, -d * 0.22, 3.2, ink, 'center', 800, FS);
      [[-9, 0], [0, 0], [9, 0]].forEach(([x, z], i) => { c.strokeStyle = ink; c.lineWidth = 0.6; c.beginPath(); c.arc(x, z, 3.4, 0, TAU); c.stroke(); if (i === 1) { poly(c, [[x, z - 2.4], [x + 2.2, z + 1.6], [x - 2.2, z + 1.6]]); c.stroke(); } else { c.beginPath(); c.moveTo(x - 2, z - 2); c.lineTo(x + 2, z + 2); c.stroke(); } });
      silk(c, 'REMOVE BEFORE INSTALLING CPU', 0, d * 0.2, 1.7, ink, 'center', 700, FS);
      silk(c, 'KEEP CAP AFTER REMOVAL', 0, d * 0.28, 1.5, ink, 'center', 600, FS);
    });
    const cap = slab(pw + 3, pd + 6, 2.4, 1.6, std('#ffffff', 0.45, 0, {map: mapCap(capTex, pw + 3, pd + 6)}), std(opts.capCol || '#1d1e21', 0.5));
    cap.position.y = T + 4.0; live(cap, 'pnpcap'); g.add(cap); info.live.cap = cap;
  }
  const lever = new THREE.Group(); lever.position.set(fw / 2 + 2.6, T + 2.2, -fd / 2 + 2);
  lever.add(cylZ(0.9, fd - 2, MAT.steel, 0, 0, (fd - 2) / 2, 10)); lever.add(box(2.4, 1.8, 7, MAT.steel, 0, -0.9, fd - 1)); lever.add(box(4, 1.8, 1.8, MAT.steel, -2, -0.9, 0));
  live(lever, 'lever'); g.add(lever); info.live.lever = lever; info.leverAxis = 'z';
  if (S.kind === 'lga2011') {
    const l2 = new THREE.Group(); l2.position.set(-fw / 2 - 2.6, T + 2.2, fd / 2 - 2);
    l2.add(cylZ(0.9, fd - 2, MAT.steel, 0, 0, -(fd - 2) / 2, 10)); l2.add(box(2.4, 1.8, 7, MAT.steel, 0, -0.9, -fd + 1)); l2.add(box(4, 1.8, 1.8, MAT.steel, 2, -0.9, 0));
    live(l2, 'lever2'); g.add(l2); info.live.lever2 = l2;
  }
  info.seatY = T + 2.6;
  info.frame = S.frame;
  return {g, info};
}
/** pose a socket: k = 0 closed, 1 fully open (lever up, plate up) */
export function poseSocket(info, k, hasCpu) {
  const L = info.live;
  const kl = Math.min(1, k * 1.6), kp = Math.max(0, k * 1.6 - 0.6);
  if (L.lever) L.lever.rotation.x = -kl * 2.0;
  if (L.lever2) L.lever2.rotation.x = kl * 2.0;
  if (L.plate) L.plate.rotation.x = -kp * 1.95;
  if (L.cap) L.cap.visible = !hasCpu && k < 0.02;
}

/* ------------------------------------------------------------ the rear I/O */
export function ioStack(list, opts = {}) {
  // a column of ports along the board's left edge: [{t: 'usb2'|'usb3'|'usbc'|'lan'|'hdmi'|'dp'|'audio'|'ant'|'ps2'|'dvi'|'bios'|'vga', v: centre v, n}] ; x from -6 (outside) inwards
  const g = new THREE.Group(), tin = std('#cfd3d8', 0.3, 1);
  const blk = std('#0e0f11', 0.8), blue = std('#1f63d6', 0.45), red = std('#cf2b2b', 0.45), white = std('#ececec', 0.5);
  const tongue = (c) => std(c, 0.45);
  for (const p of list) {
    const z = p.v;
    switch (p.t) {
      case 'usb2': case 'usb3': {
        const n = p.n || 2;
        for (let i = 0; i < n; i++) {
          const zz = z - ((n - 1) * 7.4) / 2 + i * 7.4;
          const sh = box(17, 14, 6.4, tin, 2.5, T, zz); g.add(sh);
          [3.4, 10.4].forEach((y) => { g.add(box(0.6, 5.2, 5.4, blk, -6.1, T + y - 2.2, zz)); g.add(box(0.6, 1.6, 4.2, tongue(p.t === 'usb3' ? (p.col || '#2163d6') : '#1a1b1d'), -5.9, T + y - 0.4, zz)); });
        }
        break;
      }
      case 'usbc': g.add(rbox(8, 3.4, 9.2, 1.3, tin, -1, T + 6, z)); g.add(box(0.5, 1.8, 6.8, blk, -5.1, T + 6.8, z)); break;
      case 'lan': g.add(box(21, 13.8, 16, tin, 4.5, T, z)); g.add(box(0.5, 9, 12, blk, -6.1, T + 1.6, z)); [-4.6, 4.6].forEach((dz, i) => g.add(box(0.6, 2, 3, std(i ? '#ffb400' : '#22c55e', 0.3, 0, {emissive: i ? '#ffb400' : '#22c55e', emissiveIntensity: 0.25}), -6.2, T + 11, z + dz))); if (p.usb) { g.add(box(17, 14, 15, tin, 2.5, T + 14, z)); [17.4, 24.4].forEach((y) => { g.add(box(0.6, 5.2, 12, blk, -6.1, T + y - 2.2, z)); g.add(box(0.6, 1.6, 10, tongue(p.col || '#2163d6'), -5.9, T + y - 0.4, z)); }); } break;
      case 'hdmi': g.add(box(12, 6.4, 15.4, tin, 0.5, T + (p.y || 0), z)); g.add(box(0.5, 4.4, 13.4, blk, -5.6, T + 1 + (p.y || 0), z)); break;
      case 'dp': g.add(box(12, 6.4, 16.4, tin, 0.5, T + (p.y || 0), z)); g.add(box(0.5, 4.4, 14.4, blk, -5.6, T + 1 + (p.y || 0), z)); break;
      case 'dvi': g.add(box(12, 12, 40, std(p.col || '#eceae4', 0.5), 1, T, z)); g.add(box(1, 7.6, 30, blk, -5.4, T + 2.2, z)); [-1, 1].forEach((s) => g.add(cylX(2.2, 4, MAT.tin, -5.6, T + 6, z + s * 17, 10))); break;
      case 'vga': g.add(box(12, 12, 31, std(p.col || '#2a5bd0', 0.5), 1, T, z)); g.add(box(1, 7, 18, blk, -5.4, T + 2.6, z)); break;
      case 'ps2': g.add(box(14, 13, 13, tin, 1, T, z)); g.add(cylX(4.2, 1, std(p.col || '#7a4fd0', 0.45), -6, T + 6.5, z, 20)); break;
      case 'audio': {
        const cols = p.cols || ['#5ac8fa', '#7ed957', '#f472b6', '#f6a23c', '#111111', '#9aa0a8'];
        const n = p.n || 3;
        g.add(box(16, n > 3 ? 26 : 13, 30, std('#141518', 0.6), 3, T, z));
        for (let i = 0; i < n; i++) { const row = i % 3, col = Math.floor(i / 3); const y = T + 4.3 + col * 13, zz = z - 9.6 + row * 9.6; g.add(cylX(3.8, 1.2, std(cols[i], 0.4, p.gold ? 0.4 : 0), -5.6, y, zz, 20)); g.add(cylX(1.8, 1.4, blk, -6.1, y, zz, 14)); }
        if (p.optical) g.add(box(1.2, 6, 6, std('#0a0a0a', 0.3), -5.6, T + 17, z + 9.6));
        break;
      }
      case 'ant': [-1, 1].forEach((s) => { g.add(cylX(3.2, 9, MAT.gold, -9, T + 9, z + s * 6, 6)); g.add(cylX(2.6, 4, MAT.gold, -15, T + 9, z + s * 6, 20)); }); break;
      case 'bios': g.add(box(10, 6, 8, std('#141518', 0.6), 2, T, z)); g.add(rbox(1.6, 4.6, 5.6, 0.8, std(p.col || '#d4d6da', 0.5), -5.6, T + 0.7, z)); break;
      case 'shield': break;
    }
  }
  return g;
}

/* ------------------------------------------------------------ heatsinks */
/** a heatsink cut from a top-view outline, the top optionally sloped by fn(x, z) -> height, the cap printed by `cap` */
export function sink(pts, h, capMat, sideMat, bevel = 0.8, fn) {
  const geo = prismGeo(pts, h, bevel);
  if (fn) {
    const P = geo.attributes.position;
    for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y > h * 0.5) P.setY(i, fn(P.getX(i), P.getZ(i)) + (y - h)); }
    geo.computeVertexNormals();
  }
  return new THREE.Mesh(geo, [capMat, sideMat]);
}
/** a block of fins along x: n plates of thickness t from x0 to x1 (pitch spread), depth along z, height h */
export function finBlock(x0, x1, n, t, zc, d, y, h, mat) {
  const g = new THREE.Group(), pitch = (x1 - x0 - t) / (n - 1);
  for (let i = 0; i < n; i++) g.add(box(t, h, d, mat, x0 + t / 2 + i * pitch, y, zc));
  return g;
}

/* ------------------------------------------------------------ the PCB itself */
export function boardPCB(W, D, mask, edge, drawTop, drawBottom, holes) {
  const g = new THREE.Group();
  const top = topTex(W, D, 5, drawTop);
  const pcb = slab(W, D, T, 1.2, std(edge, 0.6), std(edge, 0.6), 0, holes);
  g.add(pcb);
  const tm = decal(W, D, top, T + 0.01, {mat: {roughness: 0.48, metalness: 0.05}});
  tm.material.polygonOffset = true; tm.material.polygonOffsetFactor = -1; tm.material.polygonOffsetUnits = -1;
  g.add(tm);
  // the underside: the same mapping as the top (x, z in board space), seen from below as a back face
  const bt = topTex(W, D, 2, drawBottom);
  const bg = new THREE.PlaneGeometry(W, D); bg.rotateX(-PI / 2);
  const bm = new THREE.Mesh(bg, new THREE.MeshStandardMaterial({map: bt, roughness: 0.5, side: THREE.BackSide}));
  bm.position.y = -0.03; g.add(bm);
  return {g, top, bottom: bt};
}

/** standard traces under the mask: bundles of parallel lines that turn at 45 degrees */
export function traceBundle(g, pts, n, gap, col, lw) {
  g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round';
  for (let k = 0; k < n; k++) {
    const off = (k - (n - 1) / 2) * gap;
    g.beginPath();
    pts.forEach((p, i) => {
      const a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)];
      let nx = -(c[1] - a[1]), ny = c[0] - a[0]; const l = Math.hypot(nx, ny) || 1;
      const X = p[0] + (nx / l) * off, Y = p[1] + (ny / l) * off;
      i ? g.lineTo(X, Y) : g.moveTo(X, Y);
    });
    g.stroke();
  }
}
export function randomTraces(g, r, W, D, n, col, avoid) {
  g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
  const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  for (let i = 0; i < n; i++) {
    let x = -W / 2 + r() * W, z = -D / 2 + r() * D, d = Math.floor(r() * 8);
    g.lineWidth = r() < 0.15 ? 0.6 : 0.22; g.beginPath(); g.moveTo(x, z);
    const segs = 2 + Math.floor(r() * 4);
    for (let s = 0; s < segs; s++) { const v = DIRS[d], len = 4 + r() * 26, k = v[0] && v[1] ? Math.SQRT1_2 : 1; x += v[0] * len * k; z += v[1] * len * k; g.lineTo(x, z); d = (d + (r() < 0.5 ? 1 : 7)) % 8; }
    g.stroke();
    if (r() < 0.5) { g.fillStyle = col; g.beginPath(); g.arc(x, z, 0.45, 0, TAU); g.fill(); }
  }
}
export function mountHole(g, x, z, ring = '#c9a85a') {
  g.fillStyle = ring; g.beginPath(); g.arc(x, z, 4.2, 0, TAU); g.fill();
  g.fillStyle = '#0d0d0e'; g.beginPath(); g.arc(x, z, 1.8, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 0.3; for (let a = 0; a < 8; a++) { const t = (a * TAU) / 8; g.beginPath(); g.arc(x + Math.cos(t) * 3.2, z + Math.sin(t) * 3.2, 0.35, 0, TAU); g.stroke(); }
}
/** the underside: pins of every through-hole part as bright dots, the socket backplate outline, traces */
export function drawUnderside(g, W, D, mask, feats, r) {
  g.fillStyle = mask; g.fillRect(-W / 2, -D / 2, W, D);
  randomTraces(g, r, W, D, 260, 'rgba(255,255,255,.07)');
  const dot = (x, z, rr = 0.6) => { g.fillStyle = '#c9ccd0'; g.beginPath(); g.arc(x, z, rr, 0, TAU); g.fill(); };
  for (const f of feats) {
    if (f.t === 'row') for (let i = 0; i < f.n; i++) dot(f.x + i * (f.dx || 0), f.z + i * (f.dz || 0), f.r || 0.6);
    if (f.t === 'rect') { g.fillStyle = f.col || '#3a3c40'; g.fillRect(f.x - f.w / 2, f.z - f.d / 2, f.w, f.d); if (f.edge) { g.strokeStyle = f.edge; g.lineWidth = 0.6; g.strokeRect(f.x - f.w / 2, f.z - f.d / 2, f.w, f.d); } }
    if (f.t === 'text') silk(g, f.s, f.x, f.z, f.size || 4, f.col || 'rgba(255,255,255,.6)', 'center', 700, FM);
  }
}

/* ------------------------------------------------------------ dense SMD dressing */
export function smdField(sc, r, x0, z0, x1, z1, n, keep) {
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0);
    if (keep && !keep(x, z)) continue;
    const big = r() < 0.18, rot = r() < 0.5 ? 0 : PI / 2;
    const cer = r() < 0.45;
    smd(sc, x, T, z, big ? 3.2 : 1.6, big ? 1.6 : 0.8, big ? 0.8 : 0.5, rot, cer ? MAT.smdCer : MAT.smdBody);
  }
}
export function capBank(sc, list, r = 3.2, h = 8, mat) {
  for (const [x, z] of list) { sc.add('cyl', mat || MAT.solid, x, T, z, r * 2, h, r * 2); sc.add('cyl', std('#b9bec5', 0.3, 1), x, T + h, z, r * 1.84, 0.3, r * 1.84); }
}
export function chokeRow(sc, list, s = 10, h = 7, col) {
  for (const [x, z] of list) { sc.add('box', std(col || '#3d4045', 0.55, 0.15), x, T, z, s, h, s); sc.add('box', std('#a3a8ae', 0.4, 0.8), x, T + h, z, s * 0.5, 0.2, s * 0.32); }
}
export function mosfetRow(sc, list) { for (const [x, z] of list) { sc.add('box', MAT.chip, x, T, z, 5, 1, 6); sc.add('box', MAT.tin, x, T, z + 3.4, 4, 0.3, 1.2); } }
