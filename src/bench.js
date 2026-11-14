// BENCH · the workbench props from the reference video's assembly mode, sized for a PC: a dark anti-static
// board box the motherboard rests on, and the cream parts tray with a raised lip. Plus a soft footprint where the
// power supply stands.
import {THREE, PI, TAU, MAT, std, topTex, silk, rrect, slab, slabGeo, box, grp, FM, FS, mergeGroup, mapCap} from './lib.js';

/** the dark board box: w x d, h tall, a faint printed lid */
export function boardBox(w = 330, d = 360, h = 16) {
  const g = new THREE.Group();
  const lid = topTex(w, d, 2.4, (c, W, D) => {
    c.fillStyle = '#2b2c33'; c.fillRect(-W / 2, -D / 2, W, D);
    c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 0.8; rrect(c, -W / 2 + 10, -D / 2 + 10, W - 20, D - 20, 10); c.stroke();
    silk(c, 'ANTISTATIC · ESD SAFE', W / 2 - 16, D / 2 - 14, 6.5, 'rgba(255,255,255,.12)', 'right', 700, FM, 2);
    silk(c, 'PC VERSTAK', -W / 2 + 16, D / 2 - 14, 6.5, 'rgba(255,255,255,.12)', 'left', 700, FM, 2);
  });
  const m = slab(w, d, h, 12, std('#ffffff', 0.78, 0.0, {map: mapCap(lid, w, d)}), std('#24252b', 0.7), 2.5);
  g.add(m);
  g.userData.top = h;
  return g;
}

/** the cream tray: a floor and a raised rounded lip, open in the middle */
export function partsTray(w = 600, d = 250) {
  const g = new THREE.Group();
  const cream = std('#efe4d1', 0.62), floor = std('#f2e9d9', 0.7);
  const base = slab(w, d, 3, 22, floor, cream, 1);
  g.add(base);
  const lip = new THREE.Mesh(slabGeo(w, d, 10, 22, 1.6, [{x: 0, z: 0, w: w - 18, d: d - 18}]), [cream, cream]);
  g.add(lip);
  // rounded inner corners are approximated by a thin rim at the inner edge
  g.userData.floor = 3;
  g.userData.size = [w, d];
  return g;
}

/** a printed footprint on the mat for the PSU */
export function psuPad(w = 190, d = 180) {
  const tex = topTex(w, d, 2, (c, W, D) => {
    c.clearRect(-W / 2, -D / 2, W, D);
    c.strokeStyle = 'rgba(240,244,246,.55)'; c.lineWidth = 1.2; c.setLineDash([6, 5]); rrect(c, -W / 2 + 3, -D / 2 + 3, W - 6, D - 6, 10); c.stroke(); c.setLineDash([]);
    silk(c, 'POWER SUPPLY', 0, D / 2 - 14, 8, 'rgba(240,244,246,.6)', 'center', 700, FM, 3);
  });
  const geo = new THREE.PlaneGeometry(w, d); geo.rotateX(-PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({map: tex, transparent: true, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2}));
  m.position.y = 0.05; m.receiveShadow = true;
  return m;
}
