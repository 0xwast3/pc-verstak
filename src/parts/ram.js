// RAM · three memory modules after the user's photos: Kingston HyperX Genesis DDR3 (blue, perforated spreader with
// the big X), Gloway GAME DDR4 8G 2400 (black stepped spreader, white sticker with QR), Kingston FURY Beast RGB DDR4
// (black angular spreader with a light bar on top). A module stands along z the way it sits in a DIMM slot; the
// edge connector's bottom is at y = 0, the key notch is where DDR3 or DDR4 has it.
import {THREE, PI, TAU, MAT, std, faceTex, ctex, silk, rrect, poly, profileGeo, box, rbox, grp, live, rng, FM, FS, FSERIF, mergeGroup, brushed} from '../lib.js';

const L = 133.35, PCB_H = 31.25, PCB_T = 1.27;

/* the module's side outline in (x along the stick, y up), x from -L/2 */
function pcbOutline(notchX) {
  const n0 = notchX - 0.8, n1 = notchX + 0.8, e = 3.0, ey = 6.2;
  return [[-L / 2, 0.6], [-L / 2 + 0.6, 0], [n0, 0], [n0, 3.9], [n1, 3.9], [n1, 0], [L / 2 - 0.6, 0], [L / 2, 0.6], [L / 2, ey - 1.6], [L / 2 - e, ey], [L / 2 - e, ey + 2.6], [L / 2, ey + 4.2],
    [L / 2, PCB_H], [-L / 2, PCB_H], [-L / 2, ey + 4.2], [-L / 2 + e, ey + 2.6], [-L / 2 + e, ey], [-L / 2, ey - 1.6]];
}
/** a face map for an outline in (x, y): canvas origin top-left is (-L/2, top) */
function faceMap(w, h, draw, ppm = 7) {
  const t = faceTex(w, h, ppm, draw);
  t.repeat.set(1 / w, 1 / h); t.offset.set(0.5, 0); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
/** a spreader face: `draw(g, w, h, F)` paints shapes through F.shapes(fn) (mirrored on the back) and text at F.x(x) */
function sideMap(H, back, draw) {
  return faceMap(L, H, (g, w, h) => {
    // the far face is seen from behind, so its whole canvas is drawn mirrored and reads the right way round
    const F = {back, x: (x) => x, shapes: (fn) => fn()};
    if (back) { g.translate(w, 0); g.scale(-1, 1); }
    draw(g, w, h, F);
  });
}
function pcbFace(mask, ddr, notchX, chips) {
  return faceMap(L, PCB_H, (g, w, h) => {
    g.fillStyle = mask; g.fillRect(0, 0, w, h);
    // the gold fingers along the bottom edge (y < 4 means canvas rows h-4..h)
    g.fillStyle = '#d6a64a';
    for (let x = 1.4; x < w - 1.2; x += 0.85) { const X = x; if (Math.abs(X - (notchX + L / 2)) < 1.4) continue; g.fillRect(X, h - 3.6, 0.6, 3.6); }
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, h - 4.2, w, 0.4);
    // traces to the chips and the chips' shadows
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 0.18;
    for (let x = 2; x < w - 2; x += 0.85) { g.beginPath(); g.moveTo(x, h - 4.2); g.lineTo(x + Math.sin(x) * 1.2, h - 9); g.stroke(); }
    if (chips) for (let i = 0; i < 8; i++) { const cx = 8 + i * 15.6 + (i > 3 ? 6 : 0); g.fillStyle = '#121214'; g.fillRect(cx, 9, 11, 9); g.fillStyle = 'rgba(255,255,255,.35)'; g.font = '700 1.5px ' + FM; g.fillText(ddr === 3 ? 'H5TQ4G83' : 'K4A8G085', cx + 1, 13); }
    silk(g, ddr === 3 ? 'PC3-12800' : 'PC4-2400', 12, h - 6.5, 1.8, 'rgba(255,255,255,.55)', 'left', 700, FM);
  });
}

/* the shared builder: a PCB, two spreaders cut from one outline, a face map for each side, an optional light bar */
function moduleBase(o) {
  const g = new THREE.Group();
  const notchX = o.ddr === 3 ? -L / 2 + 54.7 : -L / 2 + 71.85;
  // PCB
  const pg = profileGeo(pcbOutline(notchX), PCB_T);
  const face = pcbFace(o.mask, o.ddr, notchX, false);
  const pcb = new THREE.Mesh(pg, [std('#ffffff', 0.5, 0.05, {map: face}), std(o.mask, 0.6)]);
  g.add(pcb);
  // spreaders: one outline, extruded thin, on both faces; the far one is the near one turned round
  const sp = profileGeo(o.outline, o.t || 1.6, 0.25);
  const sideM = std(o.edgeCol, o.rough ?? 0.5, o.metal ?? 0.35);
  [1, -1].forEach((s) => {
    // the far spreader is the near one mirrored through the PCB (same silhouette), printed with its own map
    const map = sideMap(o.H, s > 0 ? false : true, o.draw);
    const m = new THREE.Mesh(sp, [std('#ffffff', o.rough ?? 0.5, o.metal ?? 0.35, {map}), sideM]);
    m.position.z = s * (PCB_T / 2 + (o.t || 1.6) / 2 + 0.2);
    if (s < 0) m.scale.z = -1;
    g.add(m);
  });
  // the clip that holds the two halves together, along the top
  if (o.topCap) g.add(o.topCap);
  return {g, notchX};
}

/* ------------------------------------------------------------ 1 · Kingston HyperX Genesis DDR3 */
function hyperx() {
  const H = 39.6;
  const outline = [[-L / 2 + 1.5, 9], [L / 2 - 1.5, 9], [L / 2 - 1.5, H - 3], [L / 2 - 4.5, H], [-L / 2 + 4.5, H], [-L / 2 + 1.5, H - 3]];
  const draw = (g, w, h, F) => {
    F.shapes(() => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3e5fc6'); gr.addColorStop(1, '#2a46a8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      brushed(g, 0, 0, w, h, rng(31), 0.06);
      // the big X swoosh at the right end, a lighter blue
      g.fillStyle = 'rgba(150,175,240,.55)';
      g.beginPath(); g.moveTo(w - 30, h - 9); g.quadraticCurveTo(w - 14, h - 22, w - 4, 4); g.lineTo(w, 4); g.lineTo(w, 12); g.quadraticCurveTo(w - 10, h - 20, w - 22, h - 9); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(w - 34, 4); g.quadraticCurveTo(w - 16, 10, w - 2, h - 10); g.lineTo(w - 2, h - 9); g.lineTo(w - 8, h - 9); g.quadraticCurveTo(w - 20, 14, w - 40, 4); g.closePath(); g.fill();
      // perforations: a staggered row near the top
      for (let i = 0; i < 22; i++) { const x = 12 + i * 5.2, y = 4.2 + (i % 2) * 3.2; g.fillStyle = '#0d1430'; g.beginPath(); g.arc(x, y, 0.95, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(x + 0.25, y + 0.35, 0.7, 0, PI); g.fill(); }
    });
    if (F.back) {
      // the back carries only the part-number sticker and the logo, smaller
      g.save(); g.translate(26, 18); g.transform(1, 0, -0.3, 1, 0, 0); silk(g, 'HYPER X', 0, 0, 6, '#f3f5fb', 'left', 800, FS, 1.2); g.restore();
      g.fillStyle = '#f4f3ee'; g.fillRect(70, 17, 30, 10); ['KHX1600C9D3/4GX', 'MADE IN TAIWAN', 'S/N 0000A1B2C3'].forEach((t, i) => silk(g, t, 72, 19.4 + i * 2.4, 1.4, '#222', 'left', 600, FM));
      return;
    }
    // HYPER X lettering, white italics
    g.save(); g.translate(20, 17.5); g.transform(1, 0, -0.3, 1, 0, 0); silk(g, 'HYPER', 0, 0, 8.4, '#f3f5fb', 'left', 800, FS, 1.5); g.restore();
    g.save(); g.translate(64, 17); g.rotate(0.12); silk(g, 'X', 0, 0, 10.5, '#f3f5fb', 'center', 900, FS); g.restore();
    silk(g, 'GENESIS', 34, 24.2, 3.2, 'rgba(225,232,250,.85)', 'center', 700, FS, 1.4);
    // the round DDR3 badge on the left
    g.fillStyle = '#f0f0ee'; g.beginPath(); g.arc(7.6, 13, 4.2, 0, TAU); g.fill();
    silk(g, 'DDR3', 7.6, 13, 2.2, '#2a3a7a', 'center', 800, FS);
    // the white Kingston sticker
    g.fillStyle = '#f4f3ee'; g.fillRect(77, 18, 33, 12);
    silk(g, 'Kingston', 79, 20.2, 2.2, '#c8102e', 'left', 800, FSERIF);
    ['KHX1600C9D3/4GX', '4GB 1600MHz CL9', 'ASSY IN CHINA · 1.65V'].forEach((t, i) => silk(g, t, 79, 23 + i * 2.1, 1.35, '#222', 'left', 600, FM));
    for (let i = 0; i < 22; i++) { g.fillStyle = i % 3 ? '#222' : '#555'; g.fillRect(97 + i * 0.5, 22, 0.25 + (i % 2) * 0.2, 4); }
    g.fillStyle = '#1a1a1c'; g.fillRect(104, 19, 4.8, 4.8);
  };
  const {g} = moduleBase({ddr: 3, mask: '#1a1c19', outline, H, draw, edgeCol: '#2c47a6', t: 1.5, rough: 0.42, metal: 0.55});
  return {g, H, ddr: 3};
}

/* ------------------------------------------------------------ 2 · Gloway GAME DDR4 8G 2400 */
function gloway() {
  const H = 33.4;
  // the stepped top edge: low crenels at the ends and two notches toward the middle
  const top = [[-L / 2 + 1.2, H - 2.6], [-L / 2 + 7, H - 2.6], [-L / 2 + 7, H], [-L / 2 + 34, H], [-L / 2 + 34, H - 1.6], [-L / 2 + 44, H - 1.6], [-L / 2 + 44, H], [L / 2 - 44, H], [L / 2 - 44, H - 1.6], [L / 2 - 34, H - 1.6], [L / 2 - 34, H], [L / 2 - 7, H], [L / 2 - 7, H - 2.6], [L / 2 - 1.2, H - 2.6]];
  const outline = [[-L / 2 + 1.2, 6.6], [L / 2 - 1.2, 6.6], ...top.slice().reverse()];
  const draw = (g, w, h, F) => {
    F.shapes(() => {
      g.fillStyle = '#141416'; g.fillRect(0, 0, w, h);
      brushed(g, 0, 0, w, h, rng(41), 0.05);
      g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 0.5; g.strokeRect(2.2, 4.2, w - 4.4, h - 11.5);
      g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(3, h - 9.2); g.lineTo(w - 3, h - 9.2); g.stroke();
    });
    if (F.back) { silk(g, 'GLOWAY', w / 2, h / 2 - 2, 4.2, 'rgba(235,235,235,.85)', 'center', 900, FS, 1); return; }
    // GAME with its lightning slash
    g.save(); g.translate(17, 17.4); g.transform(1, 0, -0.32, 1, 0, 0); silk(g, 'GAME', 0, 0, 7.6, '#eeeeee', 'left', 800, FS, 0.8); g.restore();
    g.fillStyle = '#eeeeee'; poly(g, [[44, 12.6], [49.8, 15.4], [46.6, 16.4], [53.5, 20.5], [45.4, 17.6], [48.2, 16.8]]); g.fill();
    // the sticker: white, GLOWAY DDR4 8G-2400MHZ, spec lines, a QR and a barcode
    const sx = 86, sy = 9.4, sw = 41, sh = 12.6; g.fillStyle = '#f7f7f5'; g.fillRect(sx, sy, sw, sh);
    silk(g, 'GLOWAY', sx + 1.4, sy + 2.2, 2.4, '#111', 'left', 900, FS);
    silk(g, 'DDR4  8G-2400MHZ', sx + 12, sy + 2.2, 1.9, '#111', 'left', 700, FS);
    silk(g, 'PC4-19200  CL17-17-17-39  1.2V', sx + 1.4, sy + 5, 1.1, '#333', 'left', 600, FM);
    for (let i = 0; i < 44; i++) { g.fillStyle = '#111'; g.fillRect(sx + 1.4 + i * 0.52, sy + 7, 0.18 + ((i * 7) % 3) * 0.12, 3.4); }
    silk(g, 'FC CE RoHS', sx + 25, sy + 9.6, 1.3, '#333', 'left', 700, FS);
    qr(g, sx + sw - 11.2, sy + 1, 10.5, 9);
  };
  const {g} = moduleBase({ddr: 4, mask: '#0f1f12', outline, H, draw, edgeCol: '#151517', t: 1.3, rough: 0.55, metal: 0.4});
  return {g, H, ddr: 4};
}
/** a QR-looking square: three finder eyes and seeded modules */
export function qr(g, x, y, size, seed) {
  const n = 21, c = size / n, r = rng(seed);
  g.fillStyle = '#ffffff'; g.fillRect(x, y, size, size); g.fillStyle = '#111';
  const eye = (i0, j0) => { g.fillRect(x + i0 * c, y + j0 * c, 7 * c, 7 * c); g.fillStyle = '#fff'; g.fillRect(x + (i0 + 1) * c, y + (j0 + 1) * c, 5 * c, 5 * c); g.fillStyle = '#111'; g.fillRect(x + (i0 + 2) * c, y + (j0 + 2) * c, 3 * c, 3 * c); };
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const inEye = (i < 8 && j < 8) || (i > 12 && j < 8) || (i < 8 && j > 12); if (!inEye && r() < 0.47) g.fillRect(x + i * c, y + j * c, c, c); }
  eye(0, 0); eye(14, 0); eye(0, 14);
}

/* ------------------------------------------------------------ 3 · Kingston FURY Beast RGB DDR4 */
function fury() {
  const H = 42.2;
  // angular top: three teeth on the left, a long ridge, a step down to the right shoulder
  const top = [[-L / 2 + 1, H - 6], [-L / 2 + 6, H - 6], [-L / 2 + 10, H - 1.8], [-L / 2 + 14, H - 1.8], [-L / 2 + 16, H - 4.5], [-L / 2 + 19, H - 4.5], [-L / 2 + 22, H - 1.8], [-L / 2 + 26, H - 1.8], [-L / 2 + 28, H - 4.5], [-L / 2 + 31, H - 4.5], [-L / 2 + 34, H - 1.8], [-L / 2 + 38, H - 1.8],
    [-L / 2 + 40, H - 4.5], [-L / 2 + 44, H - 4.5], [-L / 2 + 48, H], [L / 2 - 46, H], [L / 2 - 38, H - 6.5], [L / 2 - 8, H - 6.5], [L / 2 - 4, H - 4.5], [L / 2 - 1, H - 4.5]];
  const outline = [[-L / 2 + 1, 6.2], [L / 2 - 1, 6.2], ...top.slice().reverse()];
  const draw = (g, w, h, F) => {
    F.shapes(() => {
      g.fillStyle = '#121214'; g.fillRect(0, 0, w, h);
      // facets: darker and lighter planes like the pressed spreader
      g.fillStyle = 'rgba(255,255,255,.045)'; poly(g, [[48, 8], [w - 46, 8], [w - 30, 22], [70, 22]]); g.fill();
      g.fillStyle = 'rgba(0,0,0,.35)'; poly(g, [[56, 20], [74, 20], [86, h - 9], [66, h - 9]]); g.fill();
      g.fillStyle = 'rgba(255,255,255,.06)'; poly(g, [[60, 26], [70, 26], [76, h - 12], [66, h - 12]]); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 0.35; g.beginPath(); g.moveTo(44, 8); g.lineTo(w - 44, 8); g.lineTo(w - 26, 20); g.stroke();
    });
    if (F.back) { silk(g, 'FURY', F.x(30), 22, 7, 'rgba(240,240,240,.9)', 'center', 900, FS); silk(g, 'KF432C16BBA/8', F.x(100), h - 14, 2.2, 'rgba(220,220,220,.6)', 'center', 600, FM); return; }
    silk(g, 'K I N G S T O N', 9, 13.5, 2.4, '#d8d8d8', 'left', 700, FS, 0.6);
    g.save(); g.translate(9, 21.8); g.transform(1, 0, -0.18, 1, 0, 0); silk(g, 'FURY', 0, 0, 10.2, '#f0f0f0', 'left', 900, FS, -0.2); g.restore();
    g.fillStyle = '#121214'; [[16.5, 0.45], [19.5, 0.35], [24.5, 0.5]].forEach(([y, t]) => g.fillRect(9, y + 2, 36, t));
    silk(g, 'BEAST', w - 32, h - 15.5, 5, '#e6e6e6', 'center', 600, FS, 0.8);
    silk(g, 'DDR4', w - 13, 12.4, 3.6, '#f0f0f0', 'center', 800, FS, 0.3);
  };
  // the light bar: a milky diffuser along the top edge, live so the app can cycle its colour
  const bar = new THREE.Group();
  const barM = std('#e8fff0', 0.35, 0, {emissive: '#2bff7a', emissiveIntensity: 0.9});
  const seg = (x0, x1, y0, y1) => bar.add(box(x1 - x0, y1 - y0, 3.6, barM, (x0 + x1) / 2, y0, 0));
  seg(-L / 2 + 46, L / 2 - 46, H - 3.2, H + 0.6);
  seg(L / 2 - 38, L / 2 - 8, H - 9.4, H - 6.0);
  [[-L / 2 + 8, -L / 2 + 14], [-L / 2 + 20, -L / 2 + 26], [-L / 2 + 32, -L / 2 + 38]].forEach(([a, b]) => seg(a, b, H - 4.8, H - 1.4));
  bar.userData.mat = barM;
  live(bar, 'rgb');
  const {g} = moduleBase({ddr: 4, mask: '#0d0d0f', outline, H, draw, edgeCol: '#18181a', t: 1.6, rough: 0.6, metal: 0.25, topCap: bar});
  return {g, H, ddr: 4, rgb: bar};
}

export const RAM_SPECS = {
  hyperx: {id: 'hyperx', build: hyperx},
  gloway: {id: 'gloway', build: gloway},
  fury: {id: 'fury', build: fury},
};

/** build a module standing along z (to drop into a slot); `root` has the edge's bottom at y = 0 */
export function buildRam(id) {
  const s = RAM_SPECS[id].build();
  const root = new THREE.Group();
  s.g.rotation.y = -PI / 2;
  root.add(s.g);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  mergeGroup(root);
  return {root, H: s.H, ddr: s.ddr, rgb: s.rgb || null, kind: 'ram', id, size: [8, s.H, L]};
}
