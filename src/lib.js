// LIB · the small kit every part is built from (the kestrel way): units are millimetres, +y is up.
// A part is plain geometry from code: rounded slabs, boxes, lathes and tubes, with canvas textures for every
// printed surface (solder mask, silkscreen, labels, logos). Static children are merged per material at the end.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export {THREE};
export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const PI = Math.PI, TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sm = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const smr = (t) => { t = clamp(t, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
export const ramp = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
export const easeInOut = (t) => { const k = clamp(t, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
export const easeOutBack = (x, s = 1.4) => { const k = clamp(x, 0, 1) - 1; return 1 + (s + 1) * k * k * k + s * k * k; };

/** seeded PRNG (Park-Miller); every model draws its own detail from its own seed, so it is the same every load */
export function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
export let rnd = rng(20261114);
export const reseed = (s) => { rnd = rng(s); };

/* ---------- materials: one cache, so identical looks share a program and merge into one mesh ---------- */
const MATS = new Map();
export function std(col, rough = 0.5, metal = 0, extra) {
  const key = extra ? null : col + '|' + rough + '|' + metal;
  if (key && MATS.has(key)) return MATS.get(key);
  const m = new THREE.MeshStandardMaterial(Object.assign({color: col, roughness: rough, metalness: metal}, extra || {}));
  if (key) MATS.set(key, m);
  return m;
}
export const MAT = {};
export function initMats() {
  Object.assign(MAT, {
    gold: std('#d9a842', 0.3, 1), goldPin: std('#e0b04c', 0.32, 1), tin: std('#d3d7dc', 0.32, 1), chrome: std('#e9edf1', 0.14, 1),
    steel: std('#b8bec6', 0.34, 1), steelDark: std('#7d838b', 0.4, 1), brass: std('#d6a24a', 0.32, 1), copper: std('#c8733a', 0.34, 1),
    alu: std('#c4c9cf', 0.4, 0.9), aluDark: std('#5f646b', 0.45, 0.85), nickel: std('#c9c6bf', 0.3, 1),
    blackPl: std('#17181b', 0.55), blackMat: std('#1d1e22', 0.82), header: std('#141518', 0.5), rubber: std('#1c1c1f', 0.9),
    whitePl: std('#f4f1e8', 0.45), creamPl: std('#efe8d6', 0.5), greyPl: std('#8d939c', 0.5), darkPl: std('#2a2c31', 0.55),
    chip: std('#1a1b1f', 0.42), chipLight: std('#26282d', 0.45), ferrite: std('#3a3c40', 0.62), choke: std('#4b4e53', 0.5, 0.2),
    capAl: std('#c9ccd1', 0.28, 0.95), capTop: std('#9aa0a8', 0.35, 0.9), solid: std('#2b2d33', 0.35, 0.6),
    smdBody: std('#2b2724', 0.5), smdCer: std('#8a7760', 0.66), smdEnd: std('#9ba0a6', 0.46, 0.9),
    ink: std('#231e16', 0.7), paper: std('#f6f1e4', 0.9),
    ledOff: std('#5a1515', 0.25), glass: new THREE.MeshPhysicalMaterial({color: '#d8ecff', roughness: 0.05, transparent: true, opacity: 0.25, depthWrite: false}),
  });
}

/* ---------- canvas textures ---------- */
export const FM = "'JetBrains Mono', ui-monospace, monospace", FS = "'Inter', system-ui, sans-serif", FSERIF = "'Source Serif 4', Georgia, serif";
export function ctex(wpx, hpx, draw, opts = {}) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(2, Math.round(wpx)); cv.height = Math.max(2, Math.round(hpx));
  const g = cv.getContext('2d');
  draw(g, cv.width, cv.height);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opts.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.userData = {cv, g};
  return t;
}
/** a top-view map for a w x d footprint: canvas x = +x, canvas y = +z, ppm pixels a millimetre, origin in the middle */
export function topTex(w, d, ppm, draw, opts) {
  return ctex(w * ppm, d * ppm, (g, W, H) => { g.save(); g.scale(W / w, H / d); g.translate(w / 2, d / 2); draw(g, w, d); g.restore(); }, opts);
}
/** a face map in a w x h rectangle, origin top-left, ppm pixels a millimetre */
export function faceTex(w, h, ppm, draw, opts) {
  return ctex(w * ppm, h * ppm, (g, W, H) => { g.save(); g.scale(W / w, H / h); draw(g, w, h); g.restore(); }, opts);
}
export function mapCap(tex, w, d) { tex.repeat.set(1 / w, 1 / d); tex.offset.set(0.5, 0.5); tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; return tex; }

export function silk(g, s, x, y, size, col, align, weight, font, spacing) {
  g.font = (weight || 700) + ' ' + size + 'px ' + (font || FM);
  g.fillStyle = col || '#ffffff'; g.textAlign = align || 'center'; g.textBaseline = 'middle';
  if (spacing !== undefined && 'letterSpacing' in g) g.letterSpacing = spacing + 'px';
  g.fillText(s, x, y);
  if ('letterSpacing' in g) g.letterSpacing = '0px';
}
export function rrect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
export function poly(g, pts) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); }
/** soft contact shadow baked into a surface map: a blurred dark rectangle under a part */
export function softShadow(g, x, z, w, d, a = 0.35, blur = 2.2) {
  g.save(); g.filter = 'blur(' + blur + 'px)'; g.fillStyle = 'rgba(0,0,0,' + a + ')'; g.fillRect(x - w / 2, z - d / 2, w, d); g.restore();
}
/** carbon weave in a rectangle: a two-cell tile as a pattern, scaled to `cell` millimetres */
const CARBON_TILE = (() => {
  let cv = null;
  return () => {
    if (cv) return cv;
    cv = document.createElement('canvas'); cv.width = cv.height = 32; const g = cv.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, 32, 32);
    const cellPaint = (x, y, horiz) => {
      const gr = horiz ? g.createLinearGradient(x, y, x, y + 16) : g.createLinearGradient(x, y, x + 16, y);
      gr.addColorStop(0, 'rgba(255,255,255,.02)'); gr.addColorStop(0.5, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,.02)');
      g.fillStyle = gr; g.fillRect(x + 1, y + 1, 14, 14);
    };
    cellPaint(0, 0, true); cellPaint(16, 16, true); cellPaint(16, 0, false); cellPaint(0, 16, false);
    return cv;
  };
})();
export function carbon(g, x, y, w, h, cell, a = 1) {
  const pat = g.createPattern(CARBON_TILE(), 'repeat');
  if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(cell / 16));
  g.save(); g.globalAlpha = a; g.fillStyle = pat; g.fillRect(x, y, w, h); g.restore();
}
/** brushed metal streaks */
export function brushed(g, x, y, w, h, r, a = 0.08, vertical = false) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  const n = Math.round((vertical ? w : h) * 3);
  for (let i = 0; i < n; i++) {
    const t = r(); g.strokeStyle = t < 0.5 ? `rgba(255,255,255,${a * r()})` : `rgba(0,0,0,${a * 0.8 * r()})`; g.lineWidth = 0.12 + r() * 0.25;
    g.beginPath();
    if (vertical) { const xx = x + r() * w; g.moveTo(xx, y); g.lineTo(xx, y + h); } else { const yy = y + r() * h; g.moveTo(x, yy); g.lineTo(x + w, yy); }
    g.stroke();
  }
  g.restore();
}
/** a dot texture like a bead-blasted cover (MAG Mortar) */
export function dots(g, x, y, w, h, step, rad, col) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = col;
  for (let yy = y, i = 0; yy < y + h + step; yy += step * 0.866, i++) for (let xx = x + (i % 2) * step / 2; xx < x + w + step; xx += step) { g.beginPath(); g.arc(xx, yy, rad, 0, TAU); g.fill(); }
  g.restore();
}

/* ---------- geometry ---------- */
export function rrShape(w, d, r, holes) {
  const s = new THREE.Shape(), x0 = -w / 2, y0 = -d / 2; r = Math.max(0.01, Math.min(r, w / 2 - 0.01, d / 2 - 0.01));
  s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); s.lineTo(x0 + w, y0 + d - r);
  s.quadraticCurveTo(x0 + w, y0 + d, x0 + w - r, y0 + d); s.lineTo(x0 + r, y0 + d); s.quadraticCurveTo(x0, y0 + d, x0, y0 + d - r);
  s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  (holes || []).forEach((h) => {
    const p = new THREE.Path();
    if (h.r) p.absarc(h.x, -h.z, h.r, 0, TAU, true);
    else { const hw = h.w / 2, hd = h.d / 2; p.moveTo(h.x - hw, -h.z - hd); p.lineTo(h.x - hw, -h.z + hd); p.lineTo(h.x + hw, -h.z + hd); p.lineTo(h.x + hw, -h.z - hd); p.lineTo(h.x - hw, -h.z - hd); }
    s.holes.push(p);
  });
  return s;
}
/** a rounded slab standing on y = 0: footprint w (x) by d (z), height h; group 0 = top & bottom caps, group 1 = sides */
export function slabGeo(w, d, h, r, bevel, holes) {
  const bv = bevel || 0;
  const g = new THREE.ExtrudeGeometry(rrShape(w - 2 * bv, d - 2 * bv, Math.max(0.2, r - bv), holes),
    {depth: Math.max(0.01, h - 2 * bv), bevelEnabled: bv > 0, bevelThickness: bv, bevelSize: bv, bevelSegments: bv > 0 ? 3 : 0, curveSegments: 8});
  g.rotateX(-PI / 2); g.translate(0, bv, 0);
  return g;
}
export function slab(w, d, h, r, capMat, sideMat, bevel, holes) { return new THREE.Mesh(slabGeo(w, d, h, r, bevel, holes), [capMat, sideMat || capMat]); }
/** an arbitrary outline (top view, [x, z] points) extruded up from y = 0 to h, with an optional bevel that catches light */
export function prismGeo(pts, h, bevel = 0) {
  const s = new THREE.Shape(); pts.forEach((p, i) => (i ? s.lineTo(p[0], -p[1]) : s.moveTo(p[0], -p[1])));
  const g = new THREE.ExtrudeGeometry(s, {depth: Math.max(0.01, h - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: bevel > 0 ? 2 : 0, curveSegments: 6});
  g.rotateX(-PI / 2); g.translate(0, bevel, 0);
  return g;
}
export function prism(pts, h, capMat, sideMat, bevel) { return new THREE.Mesh(prismGeo(pts, h, bevel), [capMat, sideMat || capMat]); }
/** an outline drawn in a vertical plane (side view, [x, y] points) extruded along z, centred on z = 0 */
export function profileGeo(pts, depth, bevel = 0) {
  const s = new THREE.Shape(); pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(s, {depth: Math.max(0.01, depth - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: bevel > 0 ? 2 : 0, curveSegments: 10});
  g.translate(0, 0, -depth / 2 + bevel);
  return g;
}
export function profile(pts, depth, capMat, sideMat, bevel) { return new THREE.Mesh(profileGeo(pts, depth, bevel), [capMat, sideMat || capMat]); }
/** a box sitting on y (its base at y) */
export function box(w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x || 0, (y || 0) + h / 2, z || 0); return m; }
export function rbox(w, h, d, r, mat, x, y, z, seg = 2) { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2)), mat); m.position.set(x || 0, (y || 0) + h / 2, z || 0); return m; }
export function cylY(r, h, mat, x, y, z, seg, r2) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r2 === undefined ? r : r2, h, seg || 24), mat); m.position.set(x || 0, (y || 0) + h / 2, z || 0); return m; }
export function cylX(r, len, mat, x, y, z, seg) { const g = new THREE.CylinderGeometry(r, r, len, seg || 24); g.rotateZ(-PI / 2); const m = new THREE.Mesh(g, mat); m.position.set(x || 0, y || 0, z || 0); return m; }
export function cylZ(r, len, mat, x, y, z, seg) { const g = new THREE.CylinderGeometry(r, r, len, seg || 24); g.rotateX(PI / 2); const m = new THREE.Mesh(g, mat); m.position.set(x || 0, y || 0, z || 0); return m; }
export function lathe(pts, mat, seg) { return new THREE.Mesh(new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg || 32), mat); }
export function sph(r, mat, x, y, z, ws, hs) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws || 20, hs || 14), mat); m.position.set(x || 0, y || 0, z || 0); return m; }
export function tubeGeo(pts, r, segs, rs, closed) {
  const c = new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : V3(p[0], p[1], p[2]))), !!closed, 'centripetal');
  return new THREE.TubeGeometry(c, segs || Math.max(24, Math.round(c.getLength() / 3)), r, rs || 8, !!closed);
}
export function tube(pts, r, mat, segs, rs, closed) { return new THREE.Mesh(tubeGeo(pts, r, segs, rs, closed), mat); }
export function grp(...kids) { const g = new THREE.Group(); kids.forEach((k) => k && g.add(k)); return g; }
export function at(o, x, y, z, ry, rx, rz) { o.position.set(x, y, z); if (ry) o.rotation.y = ry; if (rx) o.rotation.x = rx; if (rz) o.rotation.z = rz; return o; }
export function put(parent, o, x, y, z) { o.position.set(x || 0, y || 0, z || 0); parent.add(o); return o; }
/** a printed flat face lying on y (looking up), w along x and d along z */
export function decal(w, d, tex, y, opts = {}) {
  const geo = new THREE.PlaneGeometry(w, d); geo.rotateX(-PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial(Object.assign({map: tex, roughness: 0.55, metalness: 0, transparent: !!opts.transparent, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2}, opts.mat || {})));
  m.position.y = y || 0;
  m.receiveShadow = true;
  return m;
}
/** a printed face standing upright facing +z (w along x, h along y), base at y = 0 */
export function plate(w, h, tex, opts = {}) {
  const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial(Object.assign({map: tex, roughness: 0.5, metalness: 0, transparent: !!opts.transparent, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: opts.side || THREE.FrontSide}, opts.mat || {})));
  m.receiveShadow = true;
  return m;
}

/* pins: a row of square gold pins on a black spacer; n pins along +x from x = 0, pitch 2.54 */
export function pinRow(n, up, mat, rows = 1) {
  const g = new THREE.Group(), P = 2.54;
  g.add(box(n * P, 2.5, rows * P, MAT.header, (n - 1) * P / 2, 0, (rows - 1) * P / 2));
  for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) g.add(box(0.64, up + 2.5, 0.64, mat || MAT.goldPin, i * P, 0, r * P));
  return g;
}

/* ---------- instanced small parts (thousands of SMD parts in two draw calls) ---------- */
export class Scatter {
  constructor() { this.items = []; }
  add(geoKey, mat, x, y, z, sx, sy, sz, ry = 0) { this.items.push({geoKey, mat, x, y, z, sx, sy, sz, ry}); }
  build(parent) {
    const by = new Map();
    for (const it of this.items) { const k = it.geoKey + '|' + it.mat.uuid; if (!by.has(k)) by.set(k, []); by.get(k).push(it); }
    const geos = {box: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 16).translate(0, 0.5, 0), cyl8: new THREE.CylinderGeometry(0.5, 0.5, 1, 8).translate(0, 0.5, 0)};
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
    for (const list of by.values()) {
      const im = new THREE.InstancedMesh(geos[list[0].geoKey], list[0].mat, list.length);
      list.forEach((it, i) => { e.set(0, it.ry, 0); q.setFromEuler(e); p.set(it.x, it.y, it.z); s.set(it.sx, it.sy, it.sz); m4.compose(p, q, s); im.setMatrixAt(i, m4); });
      im.castShadow = true; im.receiveShadow = true; im.userData.scatter = true;
      parent.add(im);
    }
  }
}
/** an SMD chip resistor / capacitor: a body with two metal ends */
export function smd(sc, x, y, z, l, w, h, rot, bodyMat) {
  const c = Math.cos(rot || 0), s = Math.sin(rot || 0), e = l * 0.22;
  sc.add('box', bodyMat || MAT.smdBody, x, y, z, rot ? w : l - 2 * e, h, rot ? l - 2 * e : w, 0);
  [-1, 1].forEach((k) => sc.add('box', MAT.smdEnd, x + (rot ? 0 : k * (l / 2 - e / 2)), y, z + (rot ? k * (l / 2 - e / 2) : 0), rot ? w * 1.02 : e, h * 1.04, rot ? e : w * 1.02, 0));
}

/* ---------- merging: one mesh per material for a group's static children (kestrel's mergeGroup) ---------- */
export function mergeGroup(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), buckets = new Map(), drop = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o === root) return;
    let p = o, live = false;
    while (p && p !== root) { if (p.userData.live) live = true; p = p.parent; }
    if (live) return;
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    geo.applyMatrix4(m);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    const groups = Array.isArray(o.material) && geo.groups.length ? geo.groups : [{start: 0, count: geo.attributes.position.count, materialIndex: 0}];
    groups.forEach((gr) => {
      const mat = mats[gr.materialIndex] || mats[0];
      if (!buckets.has(mat)) buckets.set(mat, []);
      buckets.get(mat).push({geo, start: gr.start, count: Math.min(gr.count, geo.attributes.position.count - gr.start), cast: o.castShadow !== false});
    });
    drop.push(o);
  });
  drop.forEach((o) => o.parent.remove(o));
  for (const [mat, list] of buckets) {
    let n = 0; list.forEach((l) => (n += l.count));
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let k = 0;
    list.forEach((l) => {
      const P = l.geo.attributes.position.array, N = l.geo.attributes.normal.array, U = l.geo.attributes.uv.array;
      pos.set(P.subarray(l.start * 3, (l.start + l.count) * 3), k * 3); nor.set(N.subarray(l.start * 3, (l.start + l.count) * 3), k * 3);
      uv.set(U.subarray(l.start * 2, (l.start + l.count) * 2), k * 2); k += l.count;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.computeBoundingSphere(); g.computeBoundingBox();
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = !(mat.transparent && mat.opacity < 0.9) && !mat.isShadowMaterial && !mat.userData.noCast;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  return root;
}
export function shadowAll(o, cast = true, recv = true) {
  o.traverse((m) => { if (m.isMesh) { m.castShadow = cast && !(m.material && m.material.transparent && m.material.opacity < 0.5); m.receiveShadow = recv; } });
  return o;
}
/** mark a subtree as live: it stays a separate object the app animates (fans, latches, LEDs) */
export function live(o, name) { o.userData.live = true; if (name) o.name = name; return o; }
