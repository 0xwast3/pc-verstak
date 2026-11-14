// CPU · five processors, one for each board's socket: Core i5-12600K (LGA1700), Core i7-10700K (LGA1200),
// Core i3-9100F (LGA1151), Core i7-5820K (LGA2011-3), Ryzen 7 5800X (AM4). Each is a substrate with the land grid
// (or the pins) printed underneath, an outlined heat spreader with its laser marking, and the pin-1 triangle.
// Package space: centred on the origin, the substrate's bottom at y = 0; x and z as the socket's pkg [x, z].
import {THREE, PI, TAU, MAT, std, topTex, ctex, silk, rrect, poly, prismGeo, slab, slabGeo, box, mapCap, grp, rng, FM, FS, mergeGroup} from '../lib.js';
import {SOCKETS} from './boardkit.js';

/* the heat spreader's outline (top view) for each family, in a w x d box centred on 0 */
function ihsOutline(kind, w, d) {
  const hw = w / 2, hd = d / 2;
  if (kind === 'adl') {           // 12th gen: a long rectangle with two shallow wings on each long side
    const t = 1.5, a = d * 0.18;
    return [[-hw + t, -hd], [hw - t, -hd], [hw - t, -a - 4], [hw, -a - 2], [hw, -a + 4], [hw - t, -a + 6], [hw - t, a - 6], [hw, a - 4], [hw, a + 2], [hw - t, a + 4], [hw - t, hd], [-hw + t, hd], [-hw + t, a + 4], [-hw, a + 2], [-hw, a - 4], [-hw + t, a - 6], [-hw + t, -a + 6], [-hw, -a + 4], [-hw, -a - 2], [-hw + t, -a - 4]];
  }
  if (kind === 'cml') {           // LGA1151/1200: a square body with four ears on the sides
    const t = 2.6, e = 5;
    return [[-hw + t, -hd + t], [-e, -hd + t], [-e + 2, -hd], [e - 2, -hd], [e, -hd + t], [hw - t, -hd + t], [hw - t, -e], [hw, -e + 2], [hw, e - 2], [hw - t, e], [hw - t, hd - t], [e, hd - t], [e - 2, hd], [-e + 2, hd], [-e, hd - t], [-hw + t, hd - t], [-hw + t, e], [-hw, e - 2], [-hw, -e + 2], [-hw + t, -e]];
  }
  if (kind === 'hsw') {           // LGA2011-3: a big plate with two tabs on each long side
    const t = 3.4, z1 = d * 0.28;
    const side = (s) => [[s * (hw - t), -hd], [s * (hw - t), -z1 - 5], [s * hw, -z1 - 3], [s * hw, -z1 + 3], [s * (hw - t), -z1 + 5], [s * (hw - t), z1 - 5], [s * hw, z1 - 3], [s * hw, z1 + 3], [s * (hw - t), z1 + 5], [s * (hw - t), hd]];
    const r = side(1), l = side(-1).reverse();
    return [...r, ...l];
  }
  // AM4: a square with a notch in the middle of each side
  const n = 4.5, t = 1.6;
  return [[-hw, -hd], [-n, -hd], [-n + 1, -hd + t], [n - 1, -hd + t], [n, -hd], [hw, -hd], [hw, -n], [hw - t, -n + 1], [hw - t, n - 1], [hw, n], [hw, hd], [n, hd], [n - 1, hd - t], [-n + 1, hd - t], [-n, hd], [-hw, hd], [-hw, n], [-hw + t, n - 1], [-hw + t, -n + 1], [-hw, -n]];
}

function dataMatrix(g, x, y, s, seed) {
  const r = rng(seed), n = 14, c = s / n;
  g.fillStyle = 'rgba(40,40,40,.75)';
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i === 0 || j === n - 1 || (j === 0 && i % 2 === 0) || (i === n - 1 && j % 2 === 1) || r() < 0.45) g.fillRect(x + i * c, y + j * c, c, c);
}

function build(o) {
  const g = new THREE.Group();
  const [pw, pd] = o.pkg, subT = o.amd ? 1.3 : 1.15;
  // substrate: green with the pin-1 triangle and small caps on top around the spreader
  const sub = topTex(pw, pd, 12, (c, w, d) => {
    c.fillStyle = o.sub; c.fillRect(-w / 2, -d / 2, w, d);
    c.strokeStyle = 'rgba(255,255,255,.06)'; c.lineWidth = 0.15; for (let i = 0; i < 60; i++) { c.beginPath(); c.moveTo(-w / 2, -d / 2 + i * (d / 60)); c.lineTo(w / 2, -d / 2 + i * (d / 60)); c.stroke(); }
    c.fillStyle = '#d8b04a'; poly(c, [[-w / 2 + 0.8, d / 2 - 0.8], [-w / 2 + 4.6, d / 2 - 0.8], [-w / 2 + 0.8, d / 2 - 4.6]]); c.fill();
  });
  const notches = o.amd ? [] : [{x: -pw / 2, z: -pd * 0.2, w: 2.2, d: 2.8}, {x: pw / 2, z: -pd * 0.2, w: 2.2, d: 2.8}];
  const subM = slab(pw, pd, subT, 0.8, std('#ffffff', 0.55, 0.05, {map: mapCap(sub, pw, pd)}), std(o.sub, 0.6), 0);
  g.add(subM);
  // the underside: gold lands (LGA) or the pin field (AM4)
  const under = topTex(pw, pd, 10, (c, w, d) => {
    c.fillStyle = o.sub; c.fillRect(-w / 2, -d / 2, w, d);
    c.fillStyle = o.amd ? '#9a8a3a' : '#d6ad4c';
    const pitch = o.amd ? 1.27 : 0.95;
    for (let x = -w / 2 + 1.6; x < w / 2 - 1.2; x += pitch) for (let z = -d / 2 + 1.6; z < d / 2 - 1.2; z += pitch) {
      if (!o.amd && Math.abs(x) < w * 0.17 && Math.abs(z) < d * 0.2) continue;
      if (o.amd) { c.beginPath(); c.arc(x, z, 0.22, 0, TAU); c.fill(); } else c.fillRect(x - 0.22, z - 0.22, 0.44, 0.44);
    }
    if (!o.amd) { c.fillStyle = '#2a2b2e'; for (let i = 0; i < 16; i++) c.fillRect(-w * 0.12 + (i % 4) * w * 0.07, -d * 0.12 + Math.floor(i / 4) * d * 0.07, 1.4, 0.8); }
  });
  const ug = new THREE.PlaneGeometry(pw, pd); ug.rotateX(PI / 2);
  const um = new THREE.Mesh(ug, std('#ffffff', 0.35, 0.4, {map: under})); um.position.y = -0.02; g.add(um);
  if (o.amd) {
    // real pins: an instanced field of short gold posts
    const pins = [];
    for (let x = -pw / 2 + 1.8; x < pw / 2 - 1.4; x += 1.27) for (let z = -pd / 2 + 1.8; z < pd / 2 - 1.4; z += 1.27) { if (Math.abs(x) < 5.5 && Math.abs(z) < 5.5) continue; pins.push([x, z]); }
    const geo = new THREE.CylinderGeometry(0.16, 0.16, 1.9, 6); geo.translate(0, -0.95, 0);
    const im = new THREE.InstancedMesh(geo, std('#d9b04e', 0.3, 1), pins.length);
    const m4 = new THREE.Matrix4(); pins.forEach(([x, z], i) => { m4.makeTranslation(x, 0, z); im.setMatrixAt(i, m4); });
    im.castShadow = true; im.userData.scatter = true; g.add(im);
  }
  // the little capacitors on the substrate around the spreader
  const capM = std('#8a7760', 0.6), endM = std('#9ba0a6', 0.45, 0.9);
  const r = rng(o.seed);
  for (let i = 0; i < (o.amd ? 0 : 22); i++) {
    const side = i % 4, t = r() - 0.5;
    const x = side < 2 ? (side ? 1 : -1) * (pw / 2 - 1.6) : t * pw * 0.7, z = side < 2 ? t * pd * 0.7 : (side === 2 ? 1 : -1) * (pd / 2 - 1.6);
    if (Math.abs(x) < o.ihs[0] / 2 + 0.5 && Math.abs(z) < o.ihs[1] / 2 + 0.5) continue;
    g.add(box(0.6, 0.45, 1.0, capM, x, subT, z)); g.add(box(0.62, 0.47, 0.22, endM, x, subT, z - 0.45)); g.add(box(0.62, 0.47, 0.22, endM, x, subT, z + 0.45));
  }
  // the heat spreader: outline extruded, the laser marking on top
  const [iw, id] = o.ihs, ih = o.ihsH || 2.9;
  const mark = topTex(iw, id, 16, (c, w, d) => {
    const gr = c.createLinearGradient(-w / 2, -d / 2, w / 2, d / 2); gr.addColorStop(0, '#c9ccd0'); gr.addColorStop(0.5, '#b6babe'); gr.addColorStop(1, '#c2c5c9'); c.fillStyle = gr; c.fillRect(-w / 2, -d / 2, w, d);
    // the brushed nickel and a faint machining swirl
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 0.2; for (let rr = 2; rr < w; rr += 1.3) { c.beginPath(); c.arc(-w * 0.3, -d * 0.4, rr, 0, TAU); c.stroke(); }
    const ink = 'rgba(48,50,54,.92)';
    o.lines.forEach((s, i) => silk(c, s, -w / 2 + 3.4, -d / 2 + 5.4 + i * (o.lh || 3.2), i === 0 ? o.big || 2.3 : o.small || 1.65, ink, 'left', i === 0 ? 800 : 600, i === 0 ? FS : FM, 0.1));
    dataMatrix(c, w / 2 - 9, d / 2 - 9, 6, o.seed);
    if (o.amd) { c.fillStyle = 'rgba(70,72,76,.8)'; poly(c, [[-w / 2 + 1.2, d / 2 - 1.2], [-w / 2 + 4.2, d / 2 - 1.2], [-w / 2 + 1.2, d / 2 - 4.2]]); c.fill(); }
  });
  const ihs = new THREE.Mesh(prismGeo(ihsOutline(o.ihsKind, iw, id), ih, 0.35), [std('#ffffff', 0.36, 0.75, {map: mapCap(mark, iw, id)}), std('#b9bdc2', 0.32, 0.9)]);
  ihs.position.y = subT; g.add(ihs);
  // the glue bead where the spreader meets the substrate
  g.add(box(iw - 3, 0.25, id - 3, std('#1d1e20', 0.7), 0, subT, 0));
  g.userData.top = subT + ih;
  return g;
}

export const CPU_SPECS = {
  i5_12600k: {socket: 'LGA1700', ihsKind: 'adl', ihs: [30.5, 39], sub: '#1f3a28', seed: 12600, tdp: 125, igpu: true,
    lines: ['intel® CORE™ i5', 'i5-12600K', 'SRL4T 3.70GHZ', 'X218L367 (e3)']},
  i7_10700k: {socket: 'LGA1200', ihsKind: 'cml', ihs: [31.5, 31.5], sub: '#1e3527', seed: 10700, tdp: 125, igpu: true,
    lines: ['intel® CORE™ i7', 'i7-10700K', 'SRH72 3.80GHZ', 'X027G914 (e4)']},
  i3_9100f: {socket: 'LGA1151', ihsKind: 'cml', ihs: [31.5, 31.5], sub: '#20382a', seed: 9100, tdp: 65, igpu: false,
    lines: ['intel® CORE™ i3', 'i3-9100F', 'SRF6N 3.60GHZ', 'L926C551 (e4)']},
  i7_5820k: {socket: 'LGA2011-3', ihsKind: 'hsw', ihs: [44, 38], sub: '#1c3125', seed: 5820, tdp: 140, igpu: false,
    lines: ['intel® CORE™ i7', 'i7-5820K', 'SR20S 3.30GHZ', 'L452B235 (e4)'], big: 3, small: 2.2, lh: 4},
  r7_5800x: {socket: 'AM4', ihsKind: 'am4', ihs: [32, 32], sub: '#1c4a2c', seed: 5800, tdp: 105, igpu: false, amd: true,
    lines: ['AMD RYZEN 7', '5800X', '100-000000063', 'DIFFUSED IN TAIWAN', 'MADE IN CHINA'], lh: 3.1},
};

/** build a processor in package space; `top` is the spreader's height for seating a cooler */
export function buildCpu(id) {
  const s = CPU_SPECS[id];
  const pkg = SOCKETS[s.socket].pkg;
  const g = build(Object.assign({pkg}, s));
  const root = new THREE.Group(); root.add(g);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  mergeGroup(root);
  return {root, kind: 'cpu', id, socket: s.socket, top: g.userData.top, tdp: s.tdp, igpu: s.igpu, pkg};
}
