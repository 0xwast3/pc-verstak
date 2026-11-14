// DESK · a light oak desk, a blue-grey anti-static mat with a 20 mm grid and rulers, and what lies around a PC build:
// a mug on a coaster, the meter's probes, a USB-C cable, a screwdriver, a magnetic bowl of screws, a syringe of paste,
// zip ties and a wrist strap clipped to the mat. Palette after the reference video: cream, steel, red and black.
import {THREE, V3, PI, TAU, MAT, std, topTex, ctex, mapCap, slab, box, cylY, cylX, lathe, tube, grp, at, put, silk, rng, FM, FS, mergeGroup, shadowAll, sph} from './lib.js';

export const MAT_W = 1240, MAT_D = 780, MAT_H = 3;
const MAT_COL = '#7a8690';

function woodTex() {
  const r = rng(77);
  return ctex(2048, 1024, (g, W, H) => {
    g.fillStyle = '#e3c79c'; g.fillRect(0, 0, W, H);
    const plank = 128;
    for (let y = 0, i = 0; y < H; y += plank, i++) {
      const tone = 0.92 + r() * 0.12;
      g.fillStyle = `rgba(${Math.round(226 * tone)},${Math.round(196 * tone)},${Math.round(152 * tone)},1)`; g.fillRect(0, y, W, plank);
      for (let k = 0; k < 46; k++) {
        const yy = y + r() * plank, a = 0.03 + r() * 0.07;
        g.strokeStyle = r() < 0.5 ? `rgba(150,105,55,${a})` : `rgba(255,240,210,${a})`; g.lineWidth = 0.6 + r() * 2.2;
        g.beginPath(); g.moveTo(0, yy);
        for (let x = 0; x <= W; x += 64) g.lineTo(x, yy + Math.sin(x * 0.004 + k) * (2 + r() * 3));
        g.stroke();
      }
      g.fillStyle = 'rgba(120,80,40,.22)'; g.fillRect(0, y, W, 1.5);
      const off = r() * W; g.fillRect(off, y, 1.5, plank);
    }
  }, {repeat: true});
}

function matTex() {
  const r = rng(4242), ppm = 2.6;
  return topTex(MAT_W, MAT_D, ppm, (g, w, d) => {
    const x0 = -w / 2, z0 = -d / 2;
    g.fillStyle = MAT_COL; g.fillRect(x0, z0, w, d);
    // the dissipative surface: faint mottling and a slight sheen toward the middle
    for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.012)' : 'rgba(10,20,30,.016)'; g.fillRect(x0 + r() * w, z0 + r() * d, 0.6 + r() * 2.2, 0.6 + r() * 2.2); }
    { const gr = g.createRadialGradient(0, 0, 40, 0, 0, w * 0.62); gr.addColorStop(0, 'rgba(255,255,255,.035)'); gr.addColorStop(1, 'rgba(0,10,20,.06)'); g.fillStyle = gr; g.fillRect(x0, z0, w, d); }
    const m = 20, S = 20, MJ = 100;
    g.lineWidth = 0.42; g.strokeStyle = 'rgba(232,240,244,.30)';
    for (let x = x0 + m; x <= x0 + w - m + 0.01; x += S) { g.beginPath(); g.moveTo(x, z0 + m); g.lineTo(x, z0 + d - m); g.stroke(); }
    for (let z = z0 + m; z <= z0 + d - m + 0.01; z += S) { g.beginPath(); g.moveTo(x0 + m, z); g.lineTo(x0 + w - m, z); g.stroke(); }
    g.lineWidth = 0.9; g.strokeStyle = 'rgba(240,246,248,.40)';
    for (let x = x0 + m; x <= x0 + w - m + 0.01; x += MJ) { g.beginPath(); g.moveTo(x, z0 + m); g.lineTo(x, z0 + d - m); g.stroke(); }
    for (let z = z0 + m; z <= z0 + d - m + 0.01; z += MJ) { g.beginPath(); g.moveTo(x0 + m, z); g.lineTo(x0 + w - m, z); g.stroke(); }
    // a ruler along the near edge and the left edge, in centimetres
    g.strokeStyle = 'rgba(236,242,246,.75)'; g.fillStyle = 'rgba(236,242,246,.8)';
    for (let i = 0, x = x0 + m; x <= x0 + w - m + 0.01; x += 10, i++) {
      const L = i % 10 === 0 ? 7 : i % 5 === 0 ? 4.5 : 2.6; g.lineWidth = i % 10 === 0 ? 0.7 : 0.4;
      g.beginPath(); g.moveTo(x, z0 + d - m); g.lineTo(x, z0 + d - m + L); g.stroke();
      if (i % 10 === 0 && i) silk(g, String(i), x, z0 + d - m + 12, 7, 'rgba(236,242,246,.82)', 'center', 700, FM);
    }
    for (let i = 0, z = z0 + m; z <= z0 + d - m + 0.01; z += 10, i++) {
      const L = i % 10 === 0 ? 7 : i % 5 === 0 ? 4.5 : 2.6; g.lineWidth = i % 10 === 0 ? 0.7 : 0.4;
      g.beginPath(); g.moveTo(x0 + m, z); g.lineTo(x0 + m - L, z); g.stroke();
    }
    // the maker's print
    silk(g, 'ANTISTATIC MAT · 1 SQUARE = 20 MM', x0 + m + 2, z0 + 10, 7.2, 'rgba(236,242,246,.78)', 'left', 700, FM, 1.2);
    silk(g, 'PC VERSTAK · ESD 10⁶–10⁹ Ω · 1240 × 780', x0 + w - m - 2, z0 + 10, 7.2, 'rgba(236,242,246,.55)', 'right', 600, FM, 1.2);
    // a protractor arc in the far right corner
    g.lineWidth = 0.6; g.strokeStyle = 'rgba(236,242,246,.32)'; const cx = x0 + w - m, cz = z0 + m;
    [80, 120].forEach((rr) => { g.beginPath(); g.arc(cx, cz, rr, PI / 2, PI); g.stroke(); });
    for (let a = 0; a <= 90; a += 5) { const t = PI / 2 + (a * PI) / 180, r1 = a % 15 === 0 ? 104 : 112; g.beginPath(); g.moveTo(cx + Math.cos(t) * r1, cz + Math.sin(t) * r1); g.lineTo(cx + Math.cos(t) * 120, cz + Math.sin(t) * 120); g.stroke(); }
  });
}

/* a test probe: ribbed grip, finger guard, a shroud and a steel needle, along +x (kestrel's) */
function probe(col) {
  const m = std(col, 0.55);
  const p = lathe([[0, 0], [3.1, 0], [3.6, 4], [3.9, 14], [4.2, 18], [4.2, 22], [3.9, 24], [4.2, 26], [4.2, 30], [3.9, 32], [4.2, 34], [4.2, 38], [3.9, 40],
    [4.2, 42], [4.3, 62], [5.2, 66], [7.6, 69], [7.6, 74], [4.6, 77], [4.1, 96], [2.6, 108], [1.4, 112], [0, 112]], m, 28);
  p.rotation.z = -PI / 2;
  const tip = cylX(0.55, 16, MAT.steel, 118, 0, 0, 10);
  const strain = lathe([[0, 0], [2.4, 0], [2.6, -14], [1.6, -22], [0, -22]], m, 20); strain.rotation.z = -PI / 2;
  return grp(p, tip, strain);
}
function screwdriver() {
  const g = new THREE.Group();
  const h = lathe([[0, 0], [9, 0], [11.5, 4], [12, 14], [11, 30], [12, 52], [12.5, 74], [10.5, 86], [7, 92], [5, 96], [0, 96]], std('#efe6d2', 0.42), 36);
  h.rotation.z = -PI / 2; g.add(h);
  // two dark grip bands
  [[30, 6], [50, 6]].forEach(([x, l]) => { const b = cylX(12.15, l, std('#2a2b30', 0.6), x + l / 2, 0, 0, 36); g.add(b); });
  g.add(cylX(3, 110, MAT.chrome, 96 + 55, 0, 0, 20));
  const tip = lathe([[0, 0], [3, 0], [3, 6], [1.2, 14], [0, 15]], MAT.chrome, 4); tip.rotation.z = -PI / 2; tip.position.x = 206; g.add(tip);
  return g;
}
function mug() {
  const g = new THREE.Group();
  const coaster = lathe([[0, 0], [62, 0], [64, 1.5], [64, 5], [62, 6], [0, 6]], std('#ece4d2', 0.85), 64); g.add(coaster);
  const body = lathe([[0, 6.2], [36, 6.2], [40, 8], [42, 20], [43, 80], [43.5, 98], [41, 98.5], [40.4, 96], [39.6, 30], [0, 28]], std('#f3eee3', 0.32), 64);
  g.add(body);
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(40, 48), std('#3a2418', 0.18)); coffee.rotation.x = -PI / 2; coffee.position.y = 88; g.add(coffee);
  const hpts = []; for (let i = 0; i <= 24; i++) { const a = -PI / 2 + (i / 24) * PI; hpts.push(V3(43 + Math.cos(a) * 18, 54 + Math.sin(a) * 22, 0)); }
  const handle = tube(hpts, 5.5, std('#f3eee3', 0.32), 48, 12); g.add(handle);
  return g;
}
function usbCable() {
  const g = new THREE.Group();
  const cm = std('#ece4d0', 0.55);
  const pts = [V3(0, 4, 0)];
  for (let i = 1; i <= 40; i++) { const t = i / 40; pts.push(V3(-t * 360 - Math.sin(t * 4) * 40, 3.2, t * 120 + Math.sin(t * 6.5) * 55)); }
  pts.push(V3(-520, 3.2, 230));
  g.add(tube(pts, 3.2, cm, 420, 12));
  const plug = new THREE.Group();
  plug.add(lathe([[0, 0], [3.4, 0], [4, 6], [4.6, 8], [4, 10], [4.6, 12], [4, 14], [4.6, 16], [4.4, 18], [6.6, 24], [7.6, 34], [7.6, 46], [0, 47]], cm, 28));
  const shell = slab(8.4, 2.6, 8, 1.25, MAT.chrome); shell.rotation.x = PI / 2; shell.position.set(0, 54.5, 1.3); plug.add(shell);
  plug.rotation.z = PI / 2; plug.rotation.y = 0.35; plug.position.set(0, 7.6, 0); g.add(plug);
  return g;
}
function bowl() {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [44, 0], [48, 3], [52, 16], [50, 17], [46, 5], [0, 4]], std('#e9e2d1', 0.4), 56));
  const r = rng(91);
  for (let i = 0; i < 9; i++) {
    const s = grp(cylY(2.6, 1.6, MAT.steel, 0, 0, 0, 14), cylY(1.5, 6, MAT.steel, 0, -6, 0, 10));
    s.rotation.set(PI / 2 + (r() - 0.5) * 0.6, r() * TAU, 0); s.position.set((r() - 0.5) * 50, 7, (r() - 0.5) * 50); g.add(s);
  }
  for (let i = 0; i < 4; i++) {
    const so = grp(cylY(2.75, 6.5, MAT.brass, 0, 0, 0, 6), cylY(1.3, 4, MAT.brass, 0, 6.5, 0, 8));
    so.rotation.set(PI / 2, r() * TAU, 0); so.position.set((r() - 0.5) * 44, 7.5, (r() - 0.5) * 44); g.add(so);
  }
  return g;
}
function syringe() {
  const g = new THREE.Group();
  const barrel = lathe([[0, 0], [5, 0], [5, 62], [7.5, 63], [7.5, 66], [0, 66]], std('#d9dde2', 0.25, 0, {transparent: true, opacity: 0.82}), 24);
  barrel.rotation.z = -PI / 2; g.add(barrel);
  g.add(cylX(4.4, 58, std('#9ea3aa', 0.5, 0.4), 31, 0, 0, 20));
  const nose = lathe([[0, 0], [3.4, 0], [1.4, 10], [0.8, 14], [0, 14]], std('#9ea3aa', 0.5, 0.4), 16); nose.rotation.z = PI / 2; g.add(nose);
  g.add(cylX(1.6, 30, MAT.whitePl, 80, 0, 0, 12)); g.add(cylX(6.5, 2, MAT.whitePl, 96, 0, 0, 24));
  return g;
}
function zipTie(len, r) {
  const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(V3(t * len, 1.1, Math.sin(t * PI) * r)); }
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 1.1, 4), std('#18191c', 0.5));
  g.add(m); g.add(box(6, 3.2, 5, std('#18191c', 0.5), 0, 0, 0));
  return g;
}
function wristStrap() {
  const g = new THREE.Group();
  const coil = [];
  for (let i = 0; i <= 260; i++) { const t = i / 260, a = t * TAU * 9; coil.push(V3(t * 210, 9 + Math.cos(a) * 7, Math.sin(a) * 7 + Math.sin(t * 3) * 18)); }
  g.add(tube(coil, 1.3, std('#2b3340', 0.5), 1600, 6));
  const band = lathe([[26, -9], [30, -9], [30, 9], [26, 9]], std('#1a1b1f', 0.85), 48); band.rotation.x = PI / 2; band.position.set(250, 9, 10); band.scale.set(1, 1, 0.6); g.add(band);
  g.add(cylY(6, 3.4, MAT.chrome, 0, 0, 0, 24));
  return g;
}

export function buildDesk(scene) {
  const desk = new THREE.Group();
  const wt = woodTex(); wt.repeat.set(4.5 / 2, 3 / 2);
  const wood = new THREE.Mesh(new THREE.PlaneGeometry(5600, 3800), std('#ffffff', 0.62, 0, {map: wt}));
  wood.material.userData.noCast = true;
  wood.rotation.x = -PI / 2; wood.position.y = -MAT_H; wood.receiveShadow = true;
  scene.add(wood);
  const mt = matTex();
  const capM = std('#ffffff', 0.86, 0, {map: mapCap(mt, MAT_W, MAT_D), envMapIntensity: 0.5});
  const mat = slab(MAT_W, MAT_D, MAT_H, 10, capM, std('#5c656b', 0.8));
  mat.position.y = -MAT_H; mat.receiveShadow = true; mat.castShadow = false;
  scene.add(mat);

  const Y = 0;
  const m = mug(); at(m, 40, Y, -470, 0.4); desk.add(m);
  const pr = probe('#d8453c'), pb = probe('#2a2b30');
  at(pr, 470, Y + 4.4, -250, 2.55); at(pb, 500, Y + 4.4, -215, 2.62); desk.add(pr, pb);
  desk.add(tube([V3(394, Y + 4.4, -199), V3(360, Y + 3, -150), V3(420, Y + 3, -60), V3(640, Y + 2, -40), V3(900, Y - 2, -80)], 1.7, std('#c8342c', 0.55), 220));
  desk.add(tube([V3(424, Y + 4.4, -168), V3(390, Y + 3, -120), V3(450, Y + 3, -30), V3(660, Y + 2, -10), V3(900, Y - 2, -30)], 1.7, std('#25262b', 0.6), 220));
  const cab = usbCable(); at(cab, -460, Y, 300, -0.55); desk.add(cab);
  const sd = screwdriver(); at(sd, -150, Y + 12.4, -335, 0.12); desk.add(sd);
  const bw = bowl(); at(bw, -560, Y, -300); desk.add(bw);
  const sy = syringe(); at(sy, 150, Y + 7.5, -330, 2.6); desk.add(sy);
  [[-330, 350, 0.3, 120, 6], [-300, 362, 0.24, 110, 9], [560, 120, -1.2, 130, 4]].forEach(([x, z, ry, l, r]) => { const t = zipTie(l, r); at(t, x, Y, z, ry); desk.add(t); });
  const ws = wristStrap(); at(ws, -600, Y, 360, -0.25); desk.add(ws);
  shadowAll(desk, true, false);
  mergeGroup(desk);
  scene.add(desk);
  return {desk, mat, wood};
}
