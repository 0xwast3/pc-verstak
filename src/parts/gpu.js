// GPU · two graphics cards after the user's photos: the RTX 3090 Founders Edition (a titanium frame, gunmetal
// plates crossed by an X, one fan on each face, the flow-through fan at the far end, "GEFORCE RTX" lit on the top
// edge) and the ASUS ROG Strix RTX 4090 (a dark shroud with a brushed silver panel, three Axial-tech fans with ROG
// hubs, a chrome ring, a purple light strip, a skeletal far end).
// Card space: x runs along the card from the start of the gold fingers (the slot's rear end) toward the far end,
// the bracket is at x = -BR; y = 0 is the bottom of the fingers (seated in the slot); the PCB is the plane z = 0 and
// the cooler and fans face +z (down, in a tower case).
import {THREE, PI, TAU, MAT, std, faceTex, ctex, topTex, silk, rrect, poly, slabGeo, prismGeo, box, rbox, cylZ, cylY, lathe, grp, live, rng, FM, FS, mergeGroup, brushed, decal, plate, mapCap} from '../lib.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const BR = 42;      // bracket to the start of the fingers

/* a flat plate facing +z, w along x and h along y, centred on (0, 0), thickness t from z = 0 up; holes {x, y, r} */
function facePlate(w, h, t, r, holes, map, sideMat, bevel = 0.4) {
  const g = slabGeo(w, h, t, r, bevel, (holes || []).map((o) => ({x: o.x, z: -o.y, r: o.r})));
  g.rotateX(PI / 2);
  return new THREE.Mesh(g, [std('#ffffff', 0.42, 0.5, {map}), sideMat]);
}
/** a face map for a plate w x h: draw(g, w, h) with canvas origin at the plate's top-left, y down */
function plateMap(w, h, draw, back, ppm = 4) {
  const t = faceTex(w, h, ppm, (g, W, H) => { if (back) { g.translate(W, 0); g.scale(-1, 1); } draw(g, W, H); });
  t.repeat.set(1 / w, 1 / h); t.offset.set(0.5, 0.5); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/* ------------------------------------------------------------ fans */
function bladeGeo(r0, r1, sweep, width, pitch, thick) {
  const N = 14, lead = [], trail = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, rr = r0 + (r1 - r0) * t, a = sweep * t * t, wa = (width * (0.6 + 0.55 * t)) / rr;
    lead.push([rr * Math.cos(a), rr * Math.sin(a)]); trail.push([rr * Math.cos(a - wa), rr * Math.sin(a - wa)]);
  }
  const s = new THREE.Shape(); [...lead, ...trail.reverse()].forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(s, {depth: thick, bevelEnabled: false, curveSegments: 4});
  // twist the flat blade into a helical pitch: the trailing edge sits higher than the leading edge
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), rr = Math.hypot(x, y), a = Math.atan2(y, x);
    const t = (rr - r0) / (r1 - r0), a0 = sweep * t * t;
    let da = a0 - a; while (da > PI) da -= TAU; while (da < -PI) da += TAU;
    P.setZ(i, P.getZ(i) + da * rr * Math.tan(pitch));
  }
  g.computeVertexNormals();
  return g;
}
/** a fan rotor turning about local z, the blades rising toward +z; live so the app spins it */
export function fanRotor(o) {
  const rotor = new THREE.Group();
  const geos = [];
  for (let i = 0; i < o.n; i++) { const b = bladeGeo(o.hub * 0.92, o.r, o.sweep ?? 0.9, o.width ?? o.r * 0.5, o.pitch ?? 0.42, 0.9); b.rotateZ((i * TAU) / o.n); geos.push(b); }
  rotor.add(new THREE.Mesh(mergeGeometries(geos), o.bladeMat || std('#1d1e21', 0.55)));
  if (o.ring) { const ring = new THREE.Mesh(new THREE.TorusGeometry(o.r - 0.6, 1.2, 8, 72), o.ringMat || o.bladeMat || std('#1d1e21', 0.55)); ring.position.z = 1.5; ring.scale.z = 1.6; rotor.add(ring); }
  const hub = lathe([[0, o.depth + 0.6], [o.hub * 0.82, o.depth + 0.4], [o.hub, o.depth - 1.2], [o.hub, -1], [0, -1]], o.hubMat || std('#1b1c1f', 0.5), 40);
  hub.rotation.x = PI / 2; rotor.add(hub);
  if (o.hubTex) { const d = decal(o.hub * 1.64, o.hub * 1.64, o.hubTex, 0, {transparent: true, mat: {metalness: 0.6, roughness: 0.32}}); d.rotation.x = PI / 2; d.position.z = o.depth + 0.66; rotor.add(d); }
  rotor.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  live(rotor, 'fan');
  return rotor;
}

/* ------------------------------------------------------------ shared: fingers, bracket, ports */
function fingers(g, mask) {
  // the PCB strip that drops into the slot: 89 mm of gold fingers with the key at 11.65 mm
  const tex = faceTex(96, 12, 8, (c, w, h) => {
    c.fillStyle = mask; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d7a548';
    for (let x = 3.6; x < 93; x += 1.0) { if (x > 14.4 && x < 16.6) continue; c.fillRect(x, h - 8.4, 0.62, 7.6); }
  });
  const shape = new THREE.Shape();
  [[-2, 12], [-2, 2], [0, 0], [11.65 - 0.3, 0], [11.65 - 0.3, 3], [11.65 + 1.9, 3], [11.65 + 1.9, 0], [89, 0], [91, 2], [94, 12]].forEach((p, i) => (i ? shape.lineTo(p[0], p[1]) : shape.moveTo(p[0], p[1])));
  const geo = new THREE.ExtrudeGeometry(shape, {depth: 1.6, bevelEnabled: false}); geo.translate(0, 0, -0.8);
  tex.repeat.set(1 / 96, 1 / 12); tex.offset.set(2 / 96, 0); tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const m = new THREE.Mesh(geo, [std('#ffffff', 0.45, 0.2, {map: tex}), std(mask, 0.6)]);
  g.add(m);
}
function bracket(g, z0, z1, top, ports, col = '#2a2b2e') {
  // the I/O bracket: a steel plate in the y-z plane at x = -BR with a foot and a vent pattern
  const w = z1 - z0, h = top + 6;
  const tex = faceTex(w, h, 6, (c, W, H) => {
    c.fillStyle = col; c.fillRect(0, 0, W, H);
    brushed(c, 0, 0, W, H, rng(12), 0.05);
    c.fillStyle = '#0b0b0c';
    for (let j = 0; j < 6; j++) for (let i = 0; i < Math.floor(W / 7); i++) { const x = 3 + i * 7 + (j % 2) * 3.5, y = 8 + j * 6; if (x > W - 4) continue; c.beginPath(); for (let k = 0; k < 6; k++) { const a = (k * TAU) / 6; c.lineTo(x + Math.cos(a) * 2.3, y + Math.sin(a) * 2.3); } c.fill(); }
  });
  const m = plate(w, h, tex, {mat: {metalness: 0.7, roughness: 0.38}, side: THREE.DoubleSide});
  m.rotation.y = -PI / 2; m.position.set(-BR - 0.1, -4, (z0 + z1) / 2);
  g.add(m);
  g.add(box(1.2, h, w, std(col, 0.4, 0.7), -BR + 0.6, -4, (z0 + z1) / 2));
  g.add(box(10, 1.2, w, std(col, 0.4, 0.7), -BR + 5, top + 1, (z0 + z1) / 2));
  g.add(box(1.2, 14, 4, std(col, 0.4, 0.7), -BR + 0.6, -14, z0 + w * 0.5));
  // the ports: DP and HDMI shells sticking out of the bracket
  const tin = std('#cfd3d8', 0.3, 1), blk = std('#0c0c0e', 0.8);
  ports.forEach(([t, y, z]) => {
    const pw = t === 'dp' ? 16.4 : 15.4, ph = 6.4;
    g.add(box(10, ph, pw, tin, -BR + 4.8, y - ph / 2, z));
    g.add(box(0.6, ph - 2, pw - 2, blk, -BR - 0.5, y - ph / 2 + 1, z));
  });
}
function powerPlug(g, x, y, z, pins, rot = 0) {
  // a 12-pin / 16-pin socket on the top edge
  const G = new THREE.Group(), m = std('#151517', 0.55);
  const w = (pins / 2) * 3.0 + 2;
  G.add(rbox(w, 8.5, 8, 0.6, m, 0, 0, 0));
  for (let i = 0; i < pins / 2; i++) for (let j = 0; j < 2; j++) G.add(box(2.2, 0.6, 2.2, std('#050506', 0.9), -w / 2 + 2 + i * 3, 8.2, -1.6 + j * 3.2));
  if (pins === 16) for (let i = 0; i < 4; i++) G.add(box(1, 0.6, 1, std('#050506', 0.9), -w / 2 + 3 + i * 3, 8.2, 4.4));
  G.position.set(x, y, z); G.rotation.z = rot;
  g.add(G);
  return G;
}

/* ------------------------------------------------------------ 1 · NVIDIA GeForce RTX 3090 Founders Edition */
function fe3090() {
  const g = new THREE.Group();
  const L = 313, X0 = -BR + 2, X1 = X0 + L, Y0 = 11, Y1 = 138, Z0 = -16, Z1 = 45;
  const cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2, W = X1 - X0, H = Y1 - Y0;
  const ti = std('#8f887b', 0.36, 0.78), tiDark = std('#6e695f', 0.4, 0.75), fin = std('#141517', 0.6, 0.3);
  // the core: the fin stack and frame, then the two faces
  g.add(rbox(W - 2, H - 2, Z1 - Z0 - 6, 3, fin, cx, Y0 + 1, (Z0 + Z1) / 2));
  // the titanium frame: top and bottom rails and the two end caps, rounded
  const rail = (y) => g.add(rbox(W, 6, Z1 - Z0, 2.4, ti, cx, y, (Z0 + Z1) / 2));
  rail(Y0); rail(Y1 - 6);
  [X0 + 3, X1 - 3].forEach((x) => g.add(rbox(6, H, Z1 - Z0, 2.4, ti, x, Y0, (Z0 + Z1) / 2)));
  // the faces: gunmetal plates in an X; the fan sits in a round opening
  const fanR = 52, xc = 0.47;
  const drawFace = (fanX, text) => (c, w, h) => {
    const X = w * xc, Yc = h / 2;
    c.fillStyle = '#4a4b4d'; c.fillRect(0, 0, w, h);
    const tri = (pts, a, b) => { const gr = c.createLinearGradient(pts[0][0], pts[0][1], pts[2][0], pts[2][1]); gr.addColorStop(0, a); gr.addColorStop(1, b); c.fillStyle = gr; poly(c, pts); c.fill(); };
    tri([[0, 0], [w * 0.62, 0], [X, Yc]], '#5c5d60', '#3a3b3e');
    tri([[0, h], [w * 0.62, h], [X, Yc]], '#2f3033', '#4a4b4e');
    tri([[0, 0], [0, h], [X, Yc]], '#55575a', '#3c3d40');
    tri([[w, 0], [w, h], [X, Yc]], '#2a2b2e', '#3b3c3f');
    // the X arms: titanium bands
    c.strokeStyle = '#a39b8c'; c.lineWidth = 4.2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(w * 0.62 + 2, -2); c.lineTo(X, Yc); c.lineTo(w * 0.62 + 2, h + 2); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(w * 0.62 + 2, -2); c.lineTo(X, Yc); c.stroke();
    // black fins showing at the far end below the fan
    c.fillStyle = '#0f1012'; poly(c, [[w * 0.66, h], [w, h], [w, h * 0.55], [w * 0.8, h * 0.55]]); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = 0.6; for (let x = w * 0.68; x < w; x += 2.2) { c.beginPath(); c.moveTo(x, h * 0.58); c.lineTo(x, h); c.stroke(); }
    if (text) { c.save(); c.translate(w * 0.2, h * 0.62); c.rotate(-0.42); silk(c, text, 0, 0, 7, 'rgba(215,212,205,.85)', 'center', 600, FS, 1.2); c.restore(); }
    // the opening's chamfered rim
    c.strokeStyle = '#8e877a'; c.lineWidth = 3; c.beginPath(); c.arc(fanX + w / 2, Yc, fanR + 1, 0, TAU); c.stroke();
  };
  const faces = [
    {z: Z1, s: 1, fanX: -W / 2 + 70, text: ''},
    {z: Z0, s: -1, fanX: W / 2 - 66, text: 'RTX 3090'},
  ];
  for (const f of faces) {
    const back = f.s < 0;
    // on the back the plate is mirrored in z, so the map is drawn mirrored and the fan x flips into map space
    const mapFanX = back ? -f.fanX : f.fanX;
    const map = plateMap(W - 8, H - 10, drawFace(mapFanX, f.text), back);
    const p = facePlate(W - 8, H - 10, 1.6, 4, [{x: mapFanX, y: 0, r: fanR}], map, tiDark);
    p.position.set(cx, cy, f.z - (back ? -0 : 0));
    if (back) p.scale.z = -1;
    g.add(p);
    // a dark fin disc behind the fan and the fan itself
    const disc = new THREE.Mesh(new THREE.CircleGeometry(fanR, 48), std('#0d0e10', 0.7, 0.3)); disc.position.set(cx + f.fanX, cy, f.z - f.s * 12); if (back) disc.rotation.y = PI; g.add(disc);
    const hubTex = ctex(256, 256, (c, w, h) => {
      const gr = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, '#9a9ca0'); gr.addColorStop(0.7, '#6f7277'); gr.addColorStop(1, '#4a4c50'); c.fillStyle = gr; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = 2; for (let r = 20; r < w / 2; r += 9) { c.beginPath(); c.arc(w / 2, h / 2, r, 0, TAU); c.stroke(); }
    });
    const rot = fanRotor({r: fanR - 2, n: 7, hub: 19, depth: 10, sweep: 1.05, width: 30, pitch: 0.5, bladeMat: std('#1a1b1d', 0.5), hubMat: std('#9da0a5', 0.3, 0.9), hubTex, ring: true});
    rot.position.set(cx + f.fanX, cy, f.z - f.s * 10);
    if (back) rot.rotation.y = PI;
    g.add(rot);
  }
  // the top edge: GEFORCE RTX lit white, the 12-pin socket in the middle
  const topTex = faceTex(120, 18, 8, (c, w, h) => { c.clearRect(0, 0, w, h); silk(c, 'GEFORCE RTX', w / 2, h / 2, 9, '#ffffff', 'center', 700, FS, 2.2); });
  const led = plate(110, 14, topTex, {transparent: true, mat: {emissive: '#ffffff', emissiveIntensity: 0.0, emissiveMap: topTex, color: '#d9d6cf'}});
  led.rotation.x = -PI / 2; led.position.set(X1 - 80, Y1 + 0.15, (Z0 + Z1) / 2 + 7); live(led, 'led'); g.add(led);
  const plug = powerPlug(g, cx - 4, Y1 - 2, (Z0 + Z1) / 2 - 4, 12, -0.18);
  // the end of the card is open: a darker grille plate
  bracket(g, Z0 - 1, Z1 + 1, Y1 - 4, [['dp', 30, Z1 - 12], ['hdmi', 30, Z1 - 32], ['dp', 30, Z0 + 8], ['dp', 50, Z1 - 22]], '#1d1e21');
  fingers(g, '#16201a');
  return {g, L, Y1, Z0, Z1, led, plug: {x: cx - 4, y: Y1 + 7, z: (Z0 + Z1) / 2 - 4, pins: 12}, tbp: 350, len: L};
}

/* ------------------------------------------------------------ 2 · ASUS ROG Strix GeForce RTX 4090 */
function rogEye(c, w, h, col) {
  // a stylised ROG-style eye: a sharp sweeping lid over a slanted pupil (simplified emblem)
  c.save(); c.translate(w / 2, h / 2); c.scale(w / 100, h / 100);
  c.fillStyle = col;
  c.beginPath(); c.moveTo(-34, -6); c.quadraticCurveTo(-6, -26, 34, -16); c.lineTo(22, -10); c.quadraticCurveTo(-2, -16, -26, -2); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(-30, 2); c.quadraticCurveTo(-4, -8, 26, -4); c.quadraticCurveTo(14, 16, -8, 22); c.quadraticCurveTo(-24, 18, -30, 2); c.closePath(); c.fill();
  c.fillStyle = '#16171a'; c.beginPath(); c.moveTo(-14, 6); c.quadraticCurveTo(2, -2, 16, 0); c.quadraticCurveTo(8, 10, -4, 13); c.closePath(); c.fill();
  c.restore();
}
function strix4090() {
  const g = new THREE.Group();
  const L = 358, X0 = -BR + 2, X1 = X0 + L, Y0 = 11, Y1 = 150, Z0 = -14, Z1 = 56;
  const cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2, W = X1 - X0, H = Y1 - Y0;
  const shroud = std('#2c2e32', 0.48, 0.55), dark = std('#1c1d20', 0.55, 0.4), silver = std('#b9bdc2', 0.3, 0.92), fin = std('#121315', 0.6, 0.3);
  g.add(rbox(W - 4, H - 4, Z1 - Z0 - 8, 3, fin, cx, Y0 + 2, (Z0 + Z1) / 2));
  // the frame: chunky top and bottom, a skeletal far end (two posts and an open window)
  g.add(rbox(W, 9, Z1 - Z0, 3, shroud, cx, Y1 - 9, (Z0 + Z1) / 2));
  g.add(rbox(W, 7, Z1 - Z0, 3, shroud, cx, Y0, (Z0 + Z1) / 2));
  g.add(rbox(7, H, Z1 - Z0, 3, shroud, X0 + 3.5, Y0, (Z0 + Z1) / 2));
  g.add(rbox(9, H, Z1 - Z0, 3, shroud, X1 - 4.5, Y0, (Z0 + Z1) / 2));
  g.add(rbox(6, H - 12, Z1 - Z0 - 6, 2, shroud, X1 - 30, Y0 + 6, (Z0 + Z1) / 2));
  // the front shroud: three fan openings, a brushed silver panel behind the fans
  const fanR = 50, fx = [X0 + 64, X0 + 175, X0 + 286].map((x) => x - cx);
  const front = plateMap(W - 14, H - 14, (c, w, h) => {
    c.fillStyle = '#2b2d31'; c.fillRect(0, 0, w, h);
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#c8ccd1'); gr.addColorStop(1, '#8f949a');
    c.fillStyle = gr; poly(c, [[10, 14], [w * 0.62, 14], [w * 0.7, h - 14], [10, h - 14]]); c.fill();
    brushed(c, 10, 14, w * 0.6, h - 28, rng(77), 0.12);
    // angular dark cuts across the silver
    c.fillStyle = '#2b2d31'; poly(c, [[w * 0.27, h * 0.1], [w * 0.31, h * 0.1], [w * 0.29, h * 0.9], [w * 0.25, h * 0.9]]); c.fill();
    poly(c, [[w * 0.58, h * 0.1], [w * 0.62, h * 0.1], [w * 0.6, h * 0.9], [w * 0.56, h * 0.9]]); c.fill();
    // the far end's skeletal window
    c.fillStyle = '#121315'; rrect(c, w - 26, 12, 14, h - 24, 3); c.fill();
    silk(c, 'ROG STRIX', w * 0.36, 7.5, 3.6, 'rgba(225,228,232,.7)', 'center', 800, FS, 1.6);
  });
  const fp = facePlate(W - 14, H - 14, 2, 5, fx.map((x) => ({x, y: 0, r: fanR + 1})), front, dark);
  fp.position.set(cx, cy, Z1 - 2); g.add(fp);
  // rings: dark shrouds for the outer two, the chrome ring with notches on the far one
  fx.forEach((x, i) => {
    const ringM = i === 2 ? silver : dark;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(fanR + 2.2, i === 2 ? 3 : 2.2, 10, 80), ringM); ring.position.set(cx + x, cy, Z1 + 0.4); ring.scale.z = 0.6; g.add(ring);
    if (i === 2) for (let k = 0; k < 24; k++) { const a = (k * TAU) / 24; g.add(box(1.2, 1.6, 1.2, std('#55595f', 0.4, 0.9), cx + x + Math.cos(a) * (fanR + 2.2), cy + Math.sin(a) * (fanR + 2.2) - 0.8, Z1 + 2.2)); }
    const disc = new THREE.Mesh(new THREE.CircleGeometry(fanR + 1, 48), std('#0c0d0f', 0.7, 0.3)); disc.position.set(cx + x, cy, Z1 - 14); g.add(disc);
    const hubTex = ctex(256, 256, (c, w, h) => {
      const gr = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, '#2a2c30'); gr.addColorStop(1, '#141518'); c.fillStyle = gr; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, TAU); c.fill();
      c.strokeStyle = '#c9cdd2'; c.lineWidth = 7; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 6, 0, TAU); c.stroke();
      rogEye(c, w, h, '#e9ebee');
    });
    const rot = fanRotor({r: fanR - 1.5, n: 11, hub: 18, depth: 12, sweep: 0.75, width: 18, pitch: 0.55, bladeMat: std('#1c1d20', 0.5), hubMat: std('#1a1b1e', 0.4, 0.5), hubTex, ring: true, ringMat: std('#1c1d20', 0.5)});
    rot.position.set(cx + x, cy, Z1 - 13); g.add(rot);
  });
  // the purple light strip along the top of the front, and the top edge with GEFORCE RTX
  const stripM = std('#d8c4ff', 0.3, 0, {emissive: '#9b5cff', emissiveIntensity: 1.2});
  const strip = new THREE.Group();
  const sGeo = new THREE.BoxGeometry(W * 0.74, 2.2, 1.6); const s1 = new THREE.Mesh(sGeo, stripM); s1.position.set(X0 + W * 0.37 + 6, Y1 - 4, Z1 + 0.6); s1.rotation.z = -0.025; strip.add(s1);
  const s2 = new THREE.Mesh(new THREE.BoxGeometry(W * 0.62, 1.4, 2), stripM); s2.position.set(X0 + W * 0.33, Y1 + 0.3, Z1 - 6); strip.add(s2);
  strip.userData.mat = stripM; live(strip, 'rgb'); g.add(strip);
  const topT = faceTex(150, 20, 8, (c, w, h) => { c.clearRect(0, 0, w, h); silk(c, 'GEFORCE RTX', w * 0.3, h / 2, 8.6, '#e9e9ee', 'center', 700, FS, 2); silk(c, 'ROG STRIX', w * 0.8, h / 2, 6.4, '#c9c9d0', 'center', 800, FS, 1.6); });
  const led = plate(140, 16, topT, {transparent: true, mat: {emissive: '#b98cff', emissiveIntensity: 0.0, emissiveMap: topT}});
  led.rotation.x = -PI / 2; led.position.set(X0 + 100, Y1 + 0.2, (Z0 + Z1) / 2 + 6); live(led, 'led'); g.add(led);
  // backplate side: a dark plate with a vent window at the far end
  const back = plateMap(W - 10, H - 10, (c, w, h) => {
    c.fillStyle = '#26282c'; c.fillRect(0, 0, w, h); brushed(c, 0, 0, w, h, rng(5), 0.06);
    c.fillStyle = '#0d0e10'; for (let i = 0; i < 9; i++) rrect(c, w - 60 + (i % 3) * 16, 18 + Math.floor(i / 3) * 36, 12, 30, 3), c.fill();
    c.strokeStyle = 'rgba(255,255,255,.1)'; c.lineWidth = 0.8; poly(c, [[20, 16], [w * 0.55, 16], [w * 0.62, h - 16], [20, h - 16]]); c.stroke();
    silk(c, 'REPUBLIC OF GAMERS', w * 0.33, h / 2, 6, 'rgba(210,214,220,.6)', 'center', 800, FS, 3);
    c.save(); c.translate(w * 0.33 - 30, h / 2 - 34); rogEye(c, 60, 40, 'rgba(210,214,220,.6)'); c.restore();
  }, true);
  const bp = facePlate(W - 10, H - 10, 2, 4, [], back, dark); bp.position.set(cx, cy, Z0 + 1.6); bp.scale.z = -1; g.add(bp);
  powerPlug(g, X0 + 238, Y1 - 2, (Z0 + Z1) / 2 + 2, 16, 0);
  bracket(g, Z0 - 3, Z1 + 2, Y1 - 6, [['hdmi', 30, Z1 - 10], ['hdmi', 30, Z1 - 30], ['dp', 30, Z0 + 10], ['dp', 52, Z1 - 20], ['dp', 52, Z0 + 18]], '#1d1e21');
  fingers(g, '#121414');
  return {g, L, Y1, Z0, Z1, led, rgb: strip, plug: {x: X0 + 238, y: Y1 + 7, z: (Z0 + Z1) / 2 + 2, pins: 16}, tbp: 450, len: L};
}

export const GPU_SPECS = {fe3090: {build: fe3090}, strix4090: {build: strix4090}};

/** build a card in slot space (fingers' rear end at the origin, standing up, fans toward +z) */
export function buildGpu(id) {
  const s = GPU_SPECS[id].build();
  const root = new THREE.Group(); root.add(s.g);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = !(o.material?.transparent); o.receiveShadow = true; } });
  const fans = []; root.traverse((o) => { if (o.name === 'fan') fans.push(o); });
  mergeGroup(root);
  return {root, kind: 'gpu', id, fans, led: s.led, rgb: s.rgb || null, plug: s.plug, tbp: s.tbp, len: s.len, Y1: s.Y1, Z0: s.Z0, Z1: s.Z1};
}
