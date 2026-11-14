// POWER · two ATX power supplies drawn for the kit (fictional VERSTAK brand): "Volt 550 Bronze" (black, fixed
// cables leaving through a grommet) and "Volt 850 Gold" (graphite, fully modular sockets on the front). Both stand
// with the fan up, a wire grille over it, the rear with a honeycomb, the mains socket and the switch, a spec label.
// PSU space: base at y = 0, centred; the rear (mains) faces -x, the cable side faces +x.
import {THREE, PI, TAU, MAT, std, topTex, faceTex, ctex, silk, rrect, poly, slab, box, rbox, cylY, cylX, tube, grp, live, rng, FM, FS, mergeGroup, mapCap, plate, V3} from '../lib.js';
import {fanRotor} from './gpu.js';

const W = 150, H = 86;

function psu(o) {
  const g = new THREE.Group(), D = o.D;
  const body = std(o.col, 0.6, 0.35), dark = std('#0e0f11', 0.7);
  // the shell: a rounded box, the fan face on top printed with the grille's shadow ring
  const topMap = topTex(D, W, 5, (c, w, d) => {
    c.fillStyle = o.col; c.fillRect(-w / 2, -d / 2, w, d);
    c.fillStyle = '#060607'; c.beginPath(); c.arc(0, 0, 64, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.06)'; c.lineWidth = 0.4; c.strokeRect(-w / 2 + 3, -d / 2 + 3, w - 6, d - 6);
    silk(c, 'VERSTAK', w / 2 - 6, d / 2 - 6, 4, o.ink, 'right', 800, FS, 1.6);
  });
  const shell = slab(D, W, H, 3, std('#ffffff', 0.55, 0.35, {map: mapCap(topMap, D, W)}), body, 1.2, [{x: 0, z: 0, r: 64}]);
  g.add(shell);
  // the fan's bay: a dark floor under the opening
  g.add(cylY(64, 1, std('#070708', 0.8), 0, H - 16, 0, 48));
  // the fan under a wire grille
  const rotor = fanRotor({r: 62, n: 9, hub: 22, depth: 9, sweep: 0.9, width: 34, pitch: 0.45, bladeMat: std('#1c1d20', 0.55), hubMat: std('#18191c', 0.5), hubTex: ctex(256, 256, (c, w, h) => { c.fillStyle = o.hub; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, TAU); c.fill(); silk(c, 'TOK', w / 2, h / 2, 54, o.hubInk, 'center', 800, FS, 4); })});
  rotor.rotation.x = -PI / 2; rotor.position.y = H - 12; g.add(rotor);
  const wire = std(o.grille, 0.35, 0.85);
  [16, 30, 44, 58, 66].forEach((r) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.9, 6, 72), wire); t.rotation.x = PI / 2; t.position.y = H + 0.6; g.add(t); });
  for (let i = 0; i < 4; i++) { const b = box(132, 1.4, 1.6, wire, 0, H, 0); b.rotation.y = (i * PI) / 4; g.add(b); }
  g.add(cylY(14, 1.6, wire, 0, H, 0, 24));
  // rear: honeycomb, mains socket, rocker switch
  const rear = faceTex(W, H, 5, (c, w, h) => {
    c.fillStyle = o.col; c.fillRect(0, 0, w, h);
    for (let j = 0; j < 11; j++) for (let i = 0; i < 17; i++) {
      const x = 8 + i * 6.2 + (j % 2) * 3.1, y = 8 + j * 6.4; if (x > 100) continue;
      c.fillStyle = '#050506'; c.beginPath(); for (let k = 0; k < 6; k++) { const a = PI / 6 + (k * TAU) / 6; c.lineTo(x + Math.cos(a) * 2.7, y + Math.sin(a) * 2.7); } c.fill();
    }
    c.fillStyle = '#0a0a0b'; rrect(c, 112, 34, 30, 22, 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 0.5; rrect(c, 112, 34, 30, 22, 2); c.stroke();
    silk(c, 'I / O', 127, 64, 3, 'rgba(255,255,255,.6)', 'center', 700, FM, 1);
  });
  const rp = plate(W, H - 2, rear, {mat: {roughness: 0.6, metalness: 0.3}}); rp.rotation.y = -PI / 2; rp.position.set(-D / 2 - 0.05, 1, 0); g.add(rp);
  // the IEC socket and the switch in 3D
  g.add(box(4, 13, 20, std('#0a0a0b', 0.6), -D / 2 - 2, 27, -48));
  [-4, 0, 4].forEach((z, i) => g.add(box(1, 2.4, 1.2, MAT.tin, -D / 2 - 4.2, 32 + (i === 1 ? 3 : 0), -48 + z)));
  const sw = new THREE.Group(); sw.add(rbox(4, 10, 9, 1, std('#121214', 0.5), 0, 0, 0)); sw.add(box(0.6, 1, 6, std(o.accent, 0.5), -2.2, 7.5, 0)); sw.position.set(-D / 2 - 2.2, 25, -71 + 44); sw.rotation.z = 0.12; g.add(sw);
  // the label on the +z side
  const lab = faceTex(D - 24, H - 22, 6, (c, w, h) => {
    c.fillStyle = o.label; c.fillRect(0, 0, w, h);
    silk(c, 'VERSTAK', 6, 8, 6.4, o.labelInk, 'left', 800, FS, 2);
    silk(c, o.title, 6, 17, 4.6, o.accent, 'left', 800, FS, 0.6);
    const rows = [['AC IN', '100–240V ~ 10–5A 50/60Hz'], ['+3.3V', '22 A'], ['+5V', '22 A'], ['+12V', o.amps], ['−12V', '0.3 A'], ['+5Vsb', '3 A']];
    rows.forEach(([a, b], i) => { silk(c, a, 6, 27 + i * 5.2, 2.6, o.labelInk, 'left', 700, FM); silk(c, b, 30, 27 + i * 5.2, 2.6, o.labelInk, 'left', 500, FM); });
    c.strokeStyle = o.labelInk; c.lineWidth = 0.3; c.strokeRect(4, 23, w - 52, 33);
    // the 80 PLUS badge
    c.fillStyle = o.badge; c.beginPath(); c.arc(w - 22, h / 2 + 4, 14, 0, TAU); c.fill();
    c.fillStyle = '#111'; c.beginPath(); c.arc(w - 22, h / 2 + 4, 10.5, 0, TAU); c.fill();
    silk(c, '80', w - 22, h / 2, 6.6, o.badge, 'center', 900, FS);
    silk(c, 'PLUS', w - 22, h / 2 + 6, 3, o.badge, 'center', 800, FS, 0.5);
    silk(c, o.cert, w - 22, h / 2 + 22, 3.2, o.labelInk, 'center', 800, FS, 1);
  });
  const lp = plate(D - 24, H - 22, lab, {mat: {roughness: 0.6}}); lp.position.set(0, 11, W / 2 + 0.05); g.add(lp);
  // the front: modular sockets or a grommet with a fixed bundle
  if (o.modular) {
    const sock = std('#0a0a0b', 0.6);
    const front = faceTex(W, H, 5, (c, w, h) => {
      c.fillStyle = o.col; c.fillRect(0, 0, w, h);
      const lab2 = [['ATX 24', 10, 16, 34, 18], ['CPU 8', 52, 16, 22, 12], ['CPU 8', 78, 16, 22, 12], ['12VHPWR', 104, 16, 30, 12], ['PCIe 8', 52, 36, 22, 12], ['PCIe 8', 78, 36, 22, 12], ['SATA', 10, 44, 18, 10], ['SATA', 32, 44, 18, 10], ['SATA', 104, 36, 18, 10]];
      lab2.forEach(([s, x, y, ww, hh]) => { c.fillStyle = '#0a0a0b'; rrect(c, x, y, ww, hh, 1.2); c.fill(); silk(c, s, x + ww / 2, y + hh + 3.2, 2.2, o.ink, 'center', 700, FM); });
      silk(c, 'USE ONLY THE MODULAR CABLES SUPPLIED', w / 2, h - 8, 2.3, o.ink, 'center', 600, FM, 0.4);
    });
    const fp = plate(W, H - 2, front, {mat: {roughness: 0.6, metalness: 0.3}}); fp.rotation.y = PI / 2; fp.position.set(D / 2 + 0.05, 1, 0); g.add(fp);
  } else {
    g.add(cylX(10, 4, std('#0b0b0c', 0.6), D / 2 + 1.6, 44, 20, 24));
    // the fixed bundle in its sleeve, gathered and cut short (the app routes the live cables)
    const sleeve = std('#151517', 0.75);
    g.add(tube([V3(D / 2 + 2, 44, 20), V3(D / 2 + 22, 42, 22), V3(D / 2 + 36, 24, 34), V3(D / 2 + 40, 6, 52)], 7.5, sleeve, 40, 12));
    const front = faceTex(W, H, 5, (c, w, h) => { c.fillStyle = o.col; c.fillRect(0, 0, w, h); silk(c, o.title, 18, 12, 4, o.ink, 'left', 800, FS, 1); });
    const fp = plate(W, H - 2, front, {mat: {roughness: 0.6, metalness: 0.3}}); fp.rotation.y = PI / 2; fp.position.set(D / 2 + 0.05, 1, 0); g.add(fp);
  }
  // rubber feet
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(cylY(5, 1.6, MAT.rubber, a * (D / 2 - 12), -1.6, b * (W / 2 - 12), 16)));
  g.position.y = 1.6;
  return {g, rotor, D};
}

export const PSU_SPECS = {
  t550: {D: 140, watts: 550, o: {col: '#ef6a4c', ink: '#231e16', hub: '#efe8d6', hubInk: '#1d1e21', grille: '#2a2b2f', accent: '#c8402a', label: '#efe8d6', labelInk: '#1d1e21', title: 'VOLT 550 · 80 PLUS BRONZE', amps: '45 A', badge: '#b07a45', cert: 'BRONZE', modular: false}},
  t850: {D: 160, watts: 850, o: {col: '#f4b829', ink: '#231e16', hub: '#1b1c1f', hubInk: '#d9b25a', grille: '#3a3c40', accent: '#d9b25a', label: '#1b1c1f', labelInk: '#e8dfc8', title: 'VOLT 850 · 80 PLUS GOLD', amps: '70.8 A', badge: '#d9b25a', cert: 'GOLD', modular: true}},
};

export function buildPsu(id) {
  const s = PSU_SPECS[id];
  const r = psu(Object.assign({D: s.D}, s.o));
  const root = new THREE.Group(); root.add(r.g);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  mergeGroup(root);
  return {root, kind: 'psu', id, watts: s.watts, fans: [r.rotor], D: s.D, W, H: H + 1.6, modular: s.o.modular};
}
