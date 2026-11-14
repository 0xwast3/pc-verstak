// COOLING · two coolers drawn for the kit (a fictional VERSTAK brand): the "Breeze 65" box cooler (a radial
// aluminium sink with a copper core, a black fan shroud, four push pins) and the "Tower 120" tower (a nickel base,
// four copper heat pipes, a fin stack with a black top cover and a 120 mm fan clipped to its side).
// Cooler space: the contact plate's bottom at y = 0, centred on the CPU; the tower's fan blows toward -x (the I/O).
import {THREE, PI, TAU, MAT, std, topTex, ctex, faceTex, silk, rrect, poly, slab, slabGeo, box, rbox, cylY, cylX, lathe, tube, grp, live, rng, FM, FS, FSERIF, mergeGroup, mapCap, V3, decal, plate} from '../lib.js';
import {fanRotor} from './gpu.js';

function hubSticker(text, sub, bg = '#efe8d6', ink = '#1d1e21', accent = '#c8402a') {
  return ctex(256, 256, (c, w, h) => {
    c.fillStyle = bg; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, TAU); c.fill();
    c.strokeStyle = accent; c.lineWidth = 8; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 14, -PI * 0.85, -PI * 0.15); c.stroke();
    silk(c, text, w / 2, h / 2 - 4, 40, ink, 'center', 800, FS, 3);
    silk(c, sub, w / 2, h / 2 + 40, 20, ink, 'center', 600, FM, 2);
  });
}

/* ------------------------------------------------------------ 1 · VERSTAK Breeze 65 (box cooler) */
function breeze() {
  const g = new THREE.Group();
  const alu = std('#c9cdd2', 0.42, 0.85), copper = std('#c27a45', 0.32, 1), black = std('#18191c', 0.55);
  // the copper core and its contact face
  g.add(cylY(14, 24, copper, 0, 0, 0, 32));
  // radial fins: thin plates fanning out of a ring, merged
  const fins = new THREE.Group();
  for (let i = 0; i < 48; i++) { const a = (i * TAU) / 48; const f = box(29, 22, 0.7, alu, 0, 1.5, 0); f.position.x = Math.cos(a) * 29; f.position.z = Math.sin(a) * 29; f.rotation.y = -a; fins.add(f); }
  g.add(fins);
  g.add(cylY(15.5, 23, alu, 0, 1.5, 0, 32));
  // the shroud: a black square frame with a round throat and four legs to the push pins
  const shroudTex = topTex(94, 94, 6, (c, w, d) => { c.fillStyle = '#93d3b0'; c.fillRect(-w / 2, -d / 2, w, d); silk(c, 'VERSTAK', w / 2 - 6, d / 2 - 4, 3.4, '#1f4034', 'right', 800, FS, 1.4); });
  const sh = slab(94, 94, 6, 14, std('#ffffff', 0.55, 0.05, {map: mapCap(shroudTex, 94, 94)}), std('#71b693', 0.55), 0.5, [{x: 0, z: 0, r: 42}]);
  sh.position.y = 24; g.add(sh);
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => {
    const x = sx * 37.5, z = sz * 37.5;
    g.add(box(8, 3, 8, black, x, 21, z));
    // push pin: black foot, cream cap with an arrow
    g.add(cylY(3.2, 22, black, x, 0, z, 16));
    g.add(cylY(4.4, 4.4, std('#efe8d6', 0.5), x, 26, z, 20));
    g.add(box(0.8, 0.3, 4, std('#c8402a', 0.5), x, 30.45, z));
  });
  const rotor = fanRotor({r: 40, n: 7, hub: 15, depth: 9, sweep: 1.0, width: 26, pitch: 0.48, bladeMat: std('#26272b', 0.5), hubMat: black, hubTex: hubSticker('BREEZE', '65 W')});
  rotor.rotation.x = -PI / 2; rotor.position.y = 22.6; g.add(rotor);
  // a short four-pin lead
  g.add(tube([V3(40, 26, -40), V3(52, 18, -48), V3(64, 4, -46), V3(76, 2, -36)], 1.1, std('#141518', 0.6), 40, 6));
  g.add(box(10, 6.8, 5, std('#f1efe8', 0.5), 80, 0, -33));
  return {g, top: 30.6, fans: [rotor], tdp: 65, h: 31};
}

/* ------------------------------------------------------------ 2 · VERSTAK Tower 120 (tower) */
function tower() {
  const g = new THREE.Group();
  const nickel = std('#d7d9dc', 0.26, 1), copper = std('#c9814e', 0.3, 1), fin = std('#cfd3d8', 0.38, 0.88), black = std('#17181b', 0.5, 0.3);
  // the base: a nickel-plated block with the clamp bar and two screw posts
  g.add(rbox(40, 7, 38, 1.2, nickel, 0, 0, 0));
  g.add(rbox(14, 6, 76, 1.5, black, 0, 7, 0));
  [-1, 1].forEach((s) => { g.add(cylY(3.4, 9, MAT.steel, 0, 7, s * 34, 14)); g.add(cylY(4.2, 2, MAT.steel, 0, 16, s * 34, 6)); });
  // four U-shaped heat pipes: up from the base on both sides and through the fin stack
  const yB = 4, yS = 50, yT = 160, pipes = new THREE.Group();
  [-10.5, -3.5, 3.5, 10.5].forEach((z, i) => {
    const xo = 12 + (i % 2) * 6;
    const pts = [V3(-xo, yT - 6, z), V3(-xo, yS + 6, z), V3(-xo, 22, z), V3(-14, 8, z), V3(-6, yB, z), V3(6, yB, z), V3(14, 8, z), V3(xo, 22, z), V3(xo, yS + 6, z), V3(xo, yT - 6, z)];
    pipes.add(tube(pts, 3, copper, 120, 12));
  });
  g.add(pipes);
  // the fin stack: 52 plates along y with a pressed edge, a top cover in black aluminium
  const stack = new THREE.Group();
  for (let i = 0; i < 52; i++) stack.add(box(52, 0.45, 124, fin, 0, yS + i * 2.05, 0));
  // pressed side edges (the folded fin ends) as two thin skins
  [-1, 1].forEach((s) => stack.add(box(52, yT - yS - 3, 0.6, std('#bfc3c8', 0.42, 0.85), 0, yS, s * 61.8)));
  g.add(stack);
  const coverTex = topTex(56, 128, 6, (c, w, d) => {
    c.fillStyle = '#1a1b1e'; c.fillRect(-w / 2, -d / 2, w, d);
    c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 0.4; for (let x = -w / 2 + 3; x < w / 2; x += 3) { c.beginPath(); c.moveTo(x, -d / 2); c.lineTo(x, d / 2); c.stroke(); }
    c.save(); c.rotate(-PI / 2); silk(c, 'VERSTAK', 0, -4, 9, '#efe8d6', 'center', 800, FS, 3); silk(c, 'TOWER 120', 0, 8, 4.4, '#c8402a', 'center', 700, FM, 2); c.restore();
    c.fillStyle = '#d7d9dc'; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { c.beginPath(); c.arc(a * (w / 2 - 6), b * 13, 2.6, 0, TAU); c.fill(); });
  });
  const cover = slab(56, 128, 4, 4, std('#ffffff', 0.4, 0.4, {map: mapCap(coverTex, 56, 128)}), black, 0.6);
  cover.position.y = yT - 2; g.add(cover);
  // pipe tips showing through the cover
  [-10.5, -3.5, 3.5, 10.5].forEach((z, i) => { const xo = 12 + (i % 2) * 6; [-xo, xo].forEach((x) => g.add(cylY(3.1, 1, nickel, x, yT + 2, z, 16))); });
  // the 120 mm fan on the +x face, blowing toward -x
  const fanG = new THREE.Group();
  const frameTex = faceTex(120, 120, 4, (c, w, h) => { c.fillStyle = '#1b1c1f'; c.fillRect(0, 0, w, h); });
  const frame = slab(120, 120, 25, 8, std('#76a0e2', 0.6), std('#76a0e2', 0.6), 0.6, [{x: 0, z: 0, r: 58}]);
  frame.rotation.z = PI / 2; frame.position.set(26 + 25, 0, 0); fanG.add(frame);
  // cream rubber corner pads
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => fanG.add(rbox(25.4, 12, 12, 2, std('#efe8d6', 0.75), 26 + 12.5, a * 54 - 6, b * 54)));
  const rotor = fanRotor({r: 56, n: 9, hub: 21, depth: 20, sweep: 0.95, width: 30, pitch: 0.55, bladeMat: std('#2a2b2f', 0.5), hubMat: std('#1b1c1f', 0.5), hubTex: hubSticker('VERSTAK', '120 mm')});
  rotor.rotation.y = PI / 2; rotor.position.set(28, 0, 0); fanG.add(rotor);
  // wire clips
  [-1, 1].forEach((s) => fanG.add(tube([V3(26, s * 60, -52), V3(14, s * 62, -52), V3(-26, s * 62, -52)], 0.6, MAT.steel, 20, 6)));
  fanG.position.y = (yS + yT) / 2 + 2;
  g.add(fanG);
  return {g, top: yT + 2, fans: [rotor], tdp: 180, h: yT + 2};
}

export const COOLER_SPECS = {breeze: {build: breeze}, tower: {build: tower}};

export function buildCooler(id) {
  const s = COOLER_SPECS[id].build();
  const root = new THREE.Group(); root.add(s.g);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  mergeGroup(root);
  return {root, kind: 'cooler', id, fans: s.fans, tdp: s.tdp, h: s.h};
}
