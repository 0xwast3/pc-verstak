// STORAGE · two M.2 2280 NVMe drives drawn for the kit (fictional VERSTAK brand): "Nova 1TB" (PCIe 3.0, a cream
// label with a red stripe) and "Pulse 2TB" (PCIe 4.0, a graphite heat-spreader label with a copper band).
// Drive space: the edge connector at x = 0, the drive running along +x to the screw notch at x = 80, width along z,
// the PCB's bottom at y = 0.
import {THREE, PI, TAU, MAT, std, topTex, silk, rrect, poly, slab, box, rbox, grp, rng, FM, FS, mergeGroup, mapCap} from '../lib.js';
import {qr} from './ram.js';

const LEN = 80, WID = 22, PT = 0.8;

function drive(o) {
  const g = new THREE.Group();
  // PCB: the M-key notch at the connector end, the half-moon screw notch at the far end
  const s = new THREE.Shape();
  const keyZ = WID / 2 - 5.75; // M key: 5.75 mm from one edge, seen in shape space as y
  const pts = [[0, -WID / 2], [LEN - 2.2, -WID / 2], [LEN, -WID / 2 + 2.2], [LEN, -1.8]];
  pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])));
  s.absarc(LEN, 0, 1.8, -PI / 2, -PI * 1.5, true);
  [[LEN, WID / 2 - 2.2], [LEN - 2.2, WID / 2], [0, WID / 2], [0, keyZ + 0.6], [4.2, keyZ + 0.6], [4.2, keyZ - 0.6], [0, keyZ - 0.6]].forEach((p) => s.lineTo(p[0], p[1]));
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {depth: PT, bevelEnabled: false, curveSegments: 10});
  geo.rotateX(-PI / 2);   // shape y -> -z, extrude depth -> +y
  const top = topTex(LEN, WID, 14, (c, w, d) => {
    c.translate(w / 2, 0);   // map space x from 0..80 -> canvas -40..40 shifted
    c.fillStyle = o.mask; c.fillRect(-w, -d / 2, w, d);
    c.fillStyle = '#d6a64a'; for (let z = -d / 2 + 1.2; z < d / 2 - 1; z += 0.5) { if (Math.abs(z - (-keyZ)) < 0.9) continue; c.fillRect(-w + 0.3, z, 3.6, 0.3); }
    silk(c, '2280-M', -10, d / 2 - 1.6, 1.4, 'rgba(255,255,255,.5)', 'center', 700, FM);
  });
  top.repeat.set(1 / LEN, 1 / WID); top.offset.set(0, 0.5); top.wrapS = top.wrapT = THREE.ClampToEdgeWrapping;
  g.add(new THREE.Mesh(geo, [std('#ffffff', 0.5, 0.1, {map: top}), std(o.mask, 0.6)]));
  // chips under the label: controller, DRAM, two NAND packages (seen as bumps through the sticker)
  const chip = std('#151618', 0.45);
  [[14, 11, 11, 1.1], [27, 8, 9, 1.0], [45, 14, 16, 1.2], [63, 14, 16, 1.2]].forEach(([x, w, d, h]) => g.add(rbox(w, h, d, 0.25, chip, x, PT, 0)));
  // the label: a thin printed skin over the chips
  const lab = topTex(66, WID, 14, (c, w, d) => {
    o.label(c, w, d);
  });
  const L = slab(66, WID - 0.4, 0.22, 0.6, std('#ffffff', o.labelRough ?? 0.5, o.labelMetal ?? 0, {map: mapCap(lab, 66, WID - 0.4)}), std(o.labelEdge || '#d8d2c4', 0.5));
  L.position.set(6 + 33, PT + 1.25, 0); g.add(L);
  return g;
}

const nova = {mask: '#121a14', labelEdge: '#e9e2d0', label: (c, w, d) => {
  c.fillStyle = '#efe8d6'; c.fillRect(-w / 2, -d / 2, w, d);
  c.fillStyle = '#c8402a'; c.fillRect(-w / 2, -d / 2, 9, d);
  c.save(); c.translate(-w / 2 + 4.5, 0); c.rotate(-PI / 2); silk(c, 'NVMe', 0, 0, 3.2, '#efe8d6', 'center', 800, FS, 0.8); c.restore();
  silk(c, 'VERSTAK', -w / 2 + 12, -d / 2 + 5, 4.2, '#1d1e21', 'left', 800, FS, 1.2);
  silk(c, 'NOVA · 1 TB', -w / 2 + 12, -d / 2 + 10.5, 3.2, '#1d1e21', 'left', 700, FS, 0.4);
  silk(c, 'PCIe 3.0 ×4 · 3500 MB/s', -w / 2 + 12, -d / 2 + 15, 1.9, '#5b5a55', 'left', 600, FM);
  silk(c, 'S/N VK1T0-2611-0042', -w / 2 + 12, -d / 2 + 18.5, 1.4, '#5b5a55', 'left', 600, FM);
  qr(c, w / 2 - 12, -d / 2 + 4, 9, 77);
  for (let i = 0; i < 30; i++) { c.fillStyle = '#1d1e21'; c.fillRect(w / 2 - 26 + i * 0.4, d / 2 - 6.5, 0.15 + (i % 3) * 0.1, 3.6); }
}};
const pulse = {mask: '#0c0c0e', labelEdge: '#2a2b2f', labelRough: 0.35, labelMetal: 0.6, label: (c, w, d) => {
  const gr = c.createLinearGradient(-w / 2, 0, w / 2, 0); gr.addColorStop(0, '#2e3034'); gr.addColorStop(1, '#1d1e21'); c.fillStyle = gr; c.fillRect(-w / 2, -d / 2, w, d);
  c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 0.2; for (let x = -w / 2; x < w / 2; x += 0.8) { c.beginPath(); c.moveTo(x, -d / 2); c.lineTo(x, d / 2); c.stroke(); }
  c.fillStyle = '#c9814e'; c.fillRect(w / 2 - 14, -d / 2, 3, d);
  silk(c, 'VERSTAK', -w / 2 + 4, -d / 2 + 5.5, 4.4, '#e9e4d6', 'left', 800, FS, 1.4);
  silk(c, 'PULSE', -w / 2 + 4, -d / 2 + 12, 5.2, '#c9814e', 'left', 800, FS, 0.8);
  silk(c, '2 TB · PCIe 4.0 ×4 · 7000 MB/s', -w / 2 + 4, -d / 2 + 17.6, 1.9, 'rgba(233,228,214,.7)', 'left', 600, FM);
  silk(c, 'GEN4', w / 2 - 5.5, 0, 2.4, 'rgba(233,228,214,.8)', 'center', 800, FM);
}};

export const SSD_SPECS = {nova: {o: nova, gen: 3}, pulse: {o: pulse, gen: 4}};

export function buildSsd(id) {
  const s = SSD_SPECS[id];
  const g = drive(s.o);
  const root = new THREE.Group(); root.add(g);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  mergeGroup(root);
  return {root, kind: 'ssd', id, gen: s.gen, len: LEN};
}
