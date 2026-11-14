// BOARDS · the five motherboards. buildBoard(spec) lays out every standard feature from the spec (socket, DIMMs,
// PCIe, M.2, power, SATA, headers, VRM, I/O, SMD fields, the printed top and the underside) and spec.dress adds what
// makes the board itself: its heatsinks, covers, RGB and logos, cut from outlines and printed on one cover texture.
import {THREE, V3, PI, TAU, MAT, std, topTex, ctex, mapCap, slab, box, rbox, cylY, cylX, cylZ, lathe, tube, grp, at, put, silk, rrect, poly,
  softShadow, prismGeo, Scatter, live, rng, FM, FS, FSERIF, decal, plate, faceTex, mergeGroup, carbon, brushed, dots} from '../lib.js';
import {T, dimmSlot, pcieSlot, m2Socket, standoff, powerConn, sataPort, pinHeader, fanHeader, battery, qfp, cpuSocket, ioStack, sink, finBlock,
  boardPCB, traceBundle, randomTraces, mountHole, drawUnderside, smdField, capBank, chokeRow, mosfetRow, SOCKETS} from './boardkit.js';

/* ------------------------------------------------------------ the generic board */
export function buildBoard(spec) {
  const r = rng(spec.seed || 1);
  const {W, D} = spec;
  const P = (u, v) => [u - W / 2, v - D / 2];
  const root = new THREE.Group();
  const sc = new Scatter();
  const occ = [];                                    // rectangles in u, v the SMD scatter keeps out of
  const block = (u0, v0, u1, v1) => occ.push([u0, v0, u1, v1]);
  const free = (x, z) => { const u = x + W / 2, v = z + D / 2; return !occ.some(([a, b, c, d]) => u > a - 1 && u < c + 1 && v > b - 1 && v < d + 1); };
  const shadows = [];                                // baked contact shadows on the PCB map, in u, v
  const shade = (u0, v0, u1, v1, a = 0.35, blur = 2) => shadows.push([u0, v0, u1, v1, a, blur]);
  const labels = [];                                 // silkscreen designators
  const lab = (s, u, v, rot = 0, size = 2.1) => labels.push([s, u, v, rot, size]);
  const under = [];
  const hot = [];
  const seats = {dimm: [], pcie: [], m2: []};
  const anchors = {};
  const liveRefs = {dimms: [], m2shields: [], fans: [], rgb: [], leds: []};
  const H = (id, name, desc, u0, v0, u1, v1, y1 = 12, y0 = 0) => { const [x0, z0] = P(u0, v0), [x1, z1] = P(u1, v1); hot.push({id, name, desc, box: [x0, y0, z0, x1, y1, z1]}); };
  const silkCol = spec.silk || 'rgba(232,234,238,.82)';

  // ---- cover texture: every heatsink top on this board is printed on one map in board coordinates
  const cover = topTex(W, D, 5, () => {});
  mapCap(cover, W, D);
  const paints = [];
  const ctx = {
    W, D, P, r, sc, root, block, shade, lab, H, cover, paints, liveRefs, anchors, seats, spec,
    paint: (fn) => paints.push(fn),
    capMat: (rough = 0.45, metal = 0.3, extra = {}) => std('#ffffff', rough, metal, Object.assign({map: cover}, extra)),
    poly: (pts) => pts.map(([u, v]) => P(u, v)),
    rect: (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]],
    sink: (ptsUV, y0, h, capM, sideM, bevel = 0.8, fnUV) => {
      const fn = fnUV ? (x, z) => fnUV(x + W / 2, z + D / 2) : null;
      const m = sink(ptsUV.map(([u, v]) => P(u, v)), h, capM, sideM, bevel, fn);
      m.position.y = y0; root.add(m); return m;
    },
    add: (o, u, v, y = 0, ry = 0) => { const [x, z] = P(u, v); const w = new THREE.Group(); w.add(o); w.position.set(x, y, z); if (ry) w.rotation.y = ry; root.add(w); return o; },
  };

  // ---- the socket
  const S = spec.socket, [sx, sz] = P(S.u, S.v);
  const sock = cpuSocket(S.type, {plate: S.plate, capCol: S.capCol});
  sock.g.position.set(sx, 0, sz); root.add(sock.g);
  const sk = SOCKETS[S.type];
  block(S.u - sk.frame[0] / 2 - 4, S.v - sk.frame[1] / 2 - 4, S.u + sk.frame[0] / 2 + 6, S.v + sk.frame[1] / 2 + 4);
  if (sk.kind === 'pga') block(S.u - 28, S.v - 54, S.u + 28, S.v + 54);
  shade(S.u - sk.frame[0] / 2, S.v - sk.frame[1] / 2, S.u + sk.frame[0] / 2, S.v + sk.frame[1] / 2, 0.45, 2.5);
  under.push({t: 'rect', x: sx, z: sz, w: sk.frame[0] + 10, d: sk.frame[1] + 6, col: '#2c2d31', edge: '#8c9097'});
  seats.cpu = {pos: V3(sx, sock.info.seatY, sz), socket: S.type, info: sock.info};
  const pins = {LGA1700: 1700, LGA1200: 1200, LGA1151: 1151, 'LGA2011-3': 2011, AM4: 1331}[S.type];
  H('socket', `Socket ${S.type}`, sk.kind === 'pga'
    ? `A socket with ${pins} holes: the pins are on the CPU itself. Lift the lever, line up the gold triangle, drop the CPU in without force and lower the lever.`
    : `${pins} spring contacts under the load frame. Lay the CPU in by its key notches, close the frame and latch the lever; the black cover pops off by itself.`,
  S.u - sk.frame[0] / 2, S.v - sk.frame[1] / 2, S.u + sk.frame[0] / 2, S.v + sk.frame[1] / 2, 8);

  // ---- memory slots
  const DM = spec.dimm;
  DM.us.forEach((u, i) => {
    const len = DM.v1 - DM.v0, [x, z] = P(u, (DM.v0 + DM.v1) / 2);
    const s = dimmSlot(len, DM.body, DM.latch, DM.latchBoth !== false);
    s.position.set(x, 0, z); root.add(s); liveRefs.dimms.push(s);
    block(u - 4, DM.v0, u + 4, DM.v1); shade(u - 3.4, DM.v0 + 2, u + 3.4, DM.v1 - 2, 0.4, 1.4);
    seats.dimm.push({pos: V3(x, T + 1.9, z), slot: s, name: DM.names ? DM.names[i] : `DIMM${'AB'[Math.floor(i / 2) % 2]}${(i % 2) + 1}`, index: i});
    under.push({t: 'row', x, z: z - len / 2 + 6, dz: 1.6, n: Math.floor((len - 12) / 1.6), r: 0.4});
  });
  {
    const desc = DM.desc || `System memory. The key in the slot only lets DDR4 in. For two sticks the maker recommends ${DM.pair || 'A2 and B2'}, which turns on dual channel.`;
    if (DM.split) { H('dimm', `DDR4 memory slots ×${DM.us.length} (left)`, desc, DM.split[0][0], DM.v0, DM.split[0][1], DM.v1, 14); H('dimm_r', `DDR4 memory slots (right)`, desc, DM.split[1][0], DM.v0, DM.split[1][1], DM.v1, 14); }
    else H('dimm', `DDR4 memory slots ×${DM.us.length}`, desc, Math.min(...DM.us) - 4, DM.v0, Math.max(...DM.us) + 4, DM.v1, 14);
  }
  seats.dimmOrder = DM.order || DM.us.map((_, i) => i);
  const ddrLab = spec.dimm.labels || [];
  ddrLab.forEach(([s, u, v, rot]) => lab(s, u, v, rot, 2.2));

  // ---- PCIe
  spec.pcie.forEach((p, i) => {
    const s = pcieSlot(p.kind, p.body, p.armor, p.latch);
    const [x, z] = P(p.u0 ?? spec.pcieU0 ?? 42, p.v);
    s.position.set(x, 0, z); root.add(s);
    const len = s.userData.len;
    block((p.u0 ?? spec.pcieU0 ?? 42) - 2, p.v - 5, (p.u0 ?? spec.pcieU0 ?? 42) + len + 6, p.v + 5);
    shade((p.u0 ?? spec.pcieU0 ?? 42), p.v - 4, (p.u0 ?? spec.pcieU0 ?? 42) + len, p.v + 4, 0.38, 1.4);
    seats.pcie.push({pos: V3(x, T + 2.4, z), kind: p.kind, main: !!p.main, index: i});
    lab(p.name || `PCI_E${i + 1}`, (p.u0 ?? spec.pcieU0 ?? 42) + 6, p.v + 6.6, 0, 1.9);
    under.push({t: 'row', x: x + 2, z: z - 1.2, dx: 1, n: Math.floor(len - 4), r: 0.35});
  });
  const mainSlot = seats.pcie.find((s) => s.main) || seats.pcie.find((s) => s.kind === 'x16');
  seats.gpu = mainSlot;
  {
    const p = spec.pcie.find((q) => q.main) || spec.pcie.find((q) => q.kind === 'x16');
    const u0 = p.u0 ?? spec.pcieU0 ?? 42;
    H('pcie', 'PCIe x16, the graphics card slot', `Sixteen lanes straight to the CPU (${spec.pcieGen || 'PCIe 4.0'}). ${p.armor ? 'Steel armor holds a heavy card and keeps the slot from cracking.' : 'A latch at the far end locks the card.'}`, u0, p.v - 5, u0 + 95, p.v + 5, 14);
  }

  // ---- M.2
  spec.m2.forEach((m, i) => {
    const s = m2Socket();
    const [x, z] = P(m.u, m.v);
    s.position.set(x, 0, z); if (m.dir === 1) s.rotation.y = PI; root.add(s);
    const len = m.len || 80, dir = m.dir || -1;
    const so = standoff(); const [ox, oz] = P(m.u + dir * len, m.v); so.position.set(ox, 0, oz); root.add(so);
    block(Math.min(m.u, m.u + dir * len) - 3, m.v - 12, Math.max(m.u, m.u + dir * len) + 3, m.v + 12);
    seats.m2.push({pos: V3(x, T + 2.0, z), dir, len, index: i, shield: null, name: m.name || `M2_${i + 1}`});
    lab(m.name || `M2_${i + 1}`, m.u + dir * 12, m.v - 12.5, 0, 1.9);
  });
  if (spec.m2.length) {
    const m = spec.m2[0];
    H('m2', `M.2 slot${spec.m2.length > 1 ? ` (${spec.m2.length} of them)` : ''}`, `For a 2280 NVMe drive: goes in at 20 degrees, presses down and is held by a screw. Four PCIe lanes, several times faster than SATA.${spec.m2[0].shieldName ? ' On top sits the ' + spec.m2[0].shieldName + ' heatsink.' : ''}`,
      Math.min(m.u, m.u + (m.dir || -1) * 80), m.v - 10, Math.max(m.u, m.u + (m.dir || -1) * 80), m.v + 10, 8);
  }

  // ---- power
  {
    const A = spec.atx24, c = powerConn(2, 12, A.col);
    const [x, z] = P(A.u, A.v); c.position.set(x, 0, z); root.add(c);
    block(A.u - 6, A.v - 28, A.u + 6, A.v + 28); shade(A.u - 5, A.v - 27, A.u + 5, A.v + 27, 0.4);
    anchors.atx24 = V3(x, T + 9.4, z); lab('ATX_PWR1', A.u - 8, A.v, PI / 2);
    H('atx24', '24-pin ATX, the main power', 'Here the board gets 3.3, 5 and 12 V from the power supply. The side latch holds the plug so vibration cannot loosen it.', A.u - 6, A.v - 28, A.u + 6, A.v + 28, 12);
    under.push({t: 'row', x: x - 2.1, z: z - 23, dz: 4.2, n: 12, r: 0.9}, {t: 'row', x: x + 2.1, z: z - 23, dz: 4.2, n: 12, r: 0.9});
  }
  spec.eps.forEach((e, i) => {
    const c = powerConn(e.n === 4 ? 2 : 4, 2, e.col); const [x, z] = P(e.u, e.v); c.position.set(x, 0, z); root.add(c);
    block(e.u - 10, e.v - 6, e.u + 10, e.v + 6); shade(e.u - 9, e.v - 5, e.u + 9, e.v + 5, 0.4);
    if (!i) anchors.eps = V3(x, T + 9.4, z);
    lab(`CPU_PWR${i + 1}`, e.u, e.v + 8, 0, 1.8);
  });
  if (spec.eps.length) { const e = spec.eps[0]; H('eps', `EPS ${spec.eps.map((x) => x.n || 8).join('+')}-pin, the CPU power`, 'A separate 12 V line straight to the CPU power phases. Without this cable the board will not even begin to start.', e.u - 12, e.v - 6, spec.eps[spec.eps.length - 1].u + 12, e.v + 6, 12); }
  (spec.sata || []).forEach((s) => {
    for (let i = 0; i < (s.n || 1); i++) {
      const p = sataPort(s.col, s.angled !== false); const uu = s.u + (s.du || 0) * i, vv = s.v + (s.dv ?? 9.4) * i;
      const [x, z] = P(uu, vv); p.position.set(x, 0, z); root.add(p); block(uu - 6, vv - 8, uu + 6, vv + 8);
    }
  });
  if (spec.sata && spec.sata.length) { const s0 = spec.sata[0], s1 = spec.sata[spec.sata.length - 1]; H('sata', 'SATA ports', 'For 2.5 and 3.5 inch SSDs and hard drives: 6 Gbit/s. The ports face sideways so cables stay clear of a long graphics card.', s0.u - 7, s0.v - 8, s1.u + 7, s1.v + (s1.dv ?? 9.4) * ((s1.n || 1) - 1) + 8, 10); }
  if (spec.battery) {
    const b = battery(); const [x, z] = P(spec.battery.u, spec.battery.v); b.position.set(x, 0, z); root.add(b);
    block(spec.battery.u - 13, spec.battery.v - 15, spec.battery.u + 13, spec.battery.v + 13); shade(spec.battery.u - 11, spec.battery.v - 11, spec.battery.u + 11, spec.battery.v + 11, 0.35, 2);
    lab('BAT1', spec.battery.u + 15, spec.battery.v - 10, 0, 1.8);
    H('battery', 'CMOS battery, CR2032', 'Keeps the clock and BIOS settings while the PC is unplugged. Pull it for a minute and the settings reset to factory.', spec.battery.u - 12, spec.battery.v - 12, spec.battery.u + 12, spec.battery.v + 12, 6);
  }
  (spec.headers || []).forEach((h) => { const p = pinHeader(h.n, h.rows || 2, h.shroud, h.col); const [x, z] = P(h.u, h.v); p.position.set(x, 0, z); if (h.rot) p.rotation.y = h.rot; root.add(p); block(h.u - h.n * 1.4, h.v - 4, h.u + h.n * 1.4, h.v + 4); if (h.label) lab(h.label, h.u, h.v - 5, 0, 1.6); });
  if (spec.front) H('front', 'Front panel headers', 'The case power and reset buttons, its LEDs, front USB and audio. The pin names are printed on the silkscreen next to them.', spec.front[0], spec.front[1], spec.front[2], spec.front[3], 9);
  (spec.fans || []).forEach(([u, v, rot]) => { const f = fanHeader(); const [x, z] = P(u, v); f.position.set(x, 0, z); if (rot) f.rotation.y = rot; root.add(f); block(u - 6, v - 4, u + 6, v + 4); });

  // ---- VRM: chokes and capacitors in an L round the socket, MOSFETs under the heatsinks
  if (spec.vrm) {
    const V = spec.vrm;
    chokeRow(sc, V.chokes.map(([u, v]) => P(u, v)), V.size || 9.6, V.h || 6.8, V.col);
    V.chokes.forEach(([u, v]) => block(u - 5.5, v - 5.5, u + 5.5, v + 5.5));
    if (V.caps) { capBank(sc, V.caps.map(([u, v]) => P(u, v)), V.capR || 2.6, V.capH || 7, V.capMat ? std(V.capMat, 0.3, 0.75) : null); V.caps.forEach(([u, v]) => block(u - 3, v - 3, u + 3, v + 3)); }
    if (V.fets) mosfetRow(sc, V.fets.map(([u, v]) => P(u, v)));
    H('vrm', 'CPU power phases (VRM)', V.desc || 'Chokes, transistors and capacitors step 12 V down to ~1.2 V for the cores and keep it steady under load. The heatsink over them carries the heat away.', V.hot[0], V.hot[1], V.hot[2], V.hot[3], 30);
  }

  // ---- rear I/O
  if (spec.io) {
    const io = ioStack(spec.io.map((p) => ({...p, v: p.v - D / 2})));
    io.position.x = -W / 2 + 6; root.add(io);
    block(-8, 0, 22, spec.ioEnd || 150);
    H('io', 'Rear panel (I/O)', spec.ioDesc || 'Everything that faces out the back of the case: USB, network, audio, video outputs for the integrated graphics.', -8, spec.io[0].v - 10, 22, spec.io[spec.io.length - 1].v + 10, 30);
  }

  // ---- chips under and around
  (spec.chips || []).forEach((c) => { const q = qfp(c.w, c.d, c.h || 1.2, c.label, c.sub, c.col); const [x, z] = P(c.u, c.v); q.position.set(x, 0, z); if (c.rot) q.rotation.y = c.rot; root.add(q); block(c.u - c.w / 2 - 2, c.v - c.d / 2 - 2, c.u + c.w / 2 + 2, c.v + c.d / 2 + 2); shade(c.u - c.w / 2, c.v - c.d / 2, c.u + c.w / 2, c.v + c.d / 2, 0.25, 1); });
  if (spec.audio) {
    const A = spec.audio;
    capBank(sc, A.caps.map(([u, v]) => P(u, v)), A.r || 3.2, A.h || 7, std(A.col || '#d4a52c', 0.35, 0.55));
    A.caps.forEach(([u, v]) => block(u - 4, v - 4, u + 4, v + 4));
    H('audio', 'Audio section', A.desc || 'The audio codec and audio capacitors live on their own island: a gap line in the mask separates them from noisy digital parts.', A.hot[0], A.hot[1], A.hot[2], A.hot[3], 10);
  }

  // ---- what makes the board itself
  spec.dress(ctx);

  // ---- SMD dressing everywhere free
  smdField(sc, r, -W / 2 + 4, -D / 2 + 4, W / 2 - 4, D / 2 - 4, spec.smd || 1700, free);
  sc.build(root);

  // ---- print the PCB: mask, traces, art, designators, holes, contact shadows; and its underside
  const holes = spec.holes.map(([u, v]) => P(u, v));
  const pcb = boardPCB(W, D, spec.mask, spec.edge, (g) => {
    g.fillStyle = spec.mask; g.fillRect(-W / 2, -D / 2, W, D);
    const tone = spec.trace || 'rgba(255,255,255,.055)';
    randomTraces(g, rng(spec.seed + 7), W, D, spec.traces || 420, tone);
    // the memory bus: wide bundles from the socket to the DIMMs, and the PCIe lanes down to slot 1
    const [mx, mz] = P(DM.us[0], (DM.v0 + DM.v1) / 2);
    traceBundle(g, [[sx + 20, sz - 6], [sx + 30, sz - 6], [mx - 10, mz - 20], [mx - 6, mz - 20]], 14, 0.55, tone, 0.24);
    traceBundle(g, [[sx + 20, sz + 8], [sx + 34, sz + 8], [mx - 10, mz + 20], [mx - 6, mz + 20]], 14, 0.55, tone, 0.24);
    if (mainSlot) traceBundle(g, [[sx - 6, sz + 30], [sx - 6, sz + 44], [mainSlot.pos.x + 30, mainSlot.pos.z - 10], [mainSlot.pos.x + 30, mainSlot.pos.z - 5]], 16, 0.6, tone, 0.24);
    if (spec.art) spec.art(g, ctx);
    for (const [u0, v0, u1, v1, a, blur] of shadows) { const [x0, z0] = P(u0, v0), [x1, z1] = P(u1, v1); softShadow(g, (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, a, blur); }
    holes.forEach(([x, z]) => mountHole(g, x, z, spec.holeRing || '#c9a85a'));
    for (const [s, u, v, rot, size] of labels) { const [x, z] = P(u, v); g.save(); g.translate(x, z); g.rotate(rot); silk(g, s, 0, 0, size, silkCol, 'center', 700, FM); g.restore(); }
    if (spec.print) spec.print(g, ctx);
  }, (g) => {
    drawUnderside(g, W, D, spec.under || spec.mask, under, rng(spec.seed + 11));
    holes.forEach(([x, z]) => mountHole(g, x, z, spec.holeRing || '#c9a85a'));
    silk(g, spec.name.toUpperCase(), 0, D / 2 - 14, 6, 'rgba(255,255,255,.55)', 'center', 700, FM);
  }, holes.map(([x, z]) => ({x, z, r: 1.8})));
  root.add(pcb.g);

  // ---- the cover map, now that every heatsink has said what is printed on it
  {
    const g = cover.userData.g, cv = cover.userData.cv;
    g.save(); g.scale(cv.width / W, cv.height / D); g.translate(W / 2, D / 2);
    g.fillStyle = spec.coverBase || '#777'; g.fillRect(-W / 2, -D / 2, W, D);
    for (const fn of paints) { g.save(); fn(g, ctx); g.restore(); }
    g.restore(); cover.needsUpdate = true;
  }

  root.traverse((o) => { if (o.isMesh) { o.castShadow = !(o.material?.transparent && o.material.opacity < 0.5); o.receiveShadow = true; } });
  pcb.g.children.forEach((m) => { if (m.isMesh) m.castShadow = m === pcb.g.children[0]; });
  mergeGroup(root);
  return {root, W, D, T, seats, anchors, hot, liveRefs, socket: sock.info, spec, kind: 'board'};
}

/* ------------------------------------------------------------ shared art helpers */
function lightBar(ctx, uv0, uv1, y, w, col, col2) {
  // an RGB light pipe: a glowing strip between two board points, live so the app can drive its colour
  const [x0, z0] = ctx.P(...uv0), [x1, z1] = ctx.P(...uv1);
  const len = Math.hypot(x1 - x0, z1 - z0);
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, w, w), new THREE.MeshStandardMaterial({color: '#111', emissive: col, emissiveIntensity: 0.25, roughness: 0.3}));
  m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
  m.userData.rgb = {col, col2}; live(m); ctx.root.add(m); ctx.liveRefs.rgb.push(m);
  return m;
}
function textOnFace(ctx, s, uv, y, w, h, ry, opts) {
  const tex = faceTex(w, h, 12, (g, W, Hh) => { g.clearRect(0, 0, W, Hh); silk(g, s, W / 2, Hh / 2 + 0.2, opts.size || Hh * 0.7, opts.col || '#ddd', 'center', opts.weight || 800, opts.font || FS, opts.spacing); });
  const p = plate(w, h, tex, {transparent: true, mat: {metalness: opts.metal || 0, roughness: opts.rough || 0.45}});
  const [x, z] = ctx.P(...uv); p.position.set(x, y, z); p.rotation.y = ry || 0; ctx.root.add(p);
  return p;
}
const msiLogo = (g, x, z, s, col) => { silk(g, 'msi', x, z, s, col, 'center', 800, FS, -s * 0.04); };
function dragon(g, x, z, s, col, eye) {
  // a stylised dragon head silhouette (MSI's gaming emblem, simplified)
  g.save(); g.translate(x, z); g.scale(s / 20, s / 20); g.fillStyle = col;
  g.beginPath(); g.moveTo(-10, 4); g.quadraticCurveTo(-6, -8, 4, -9); g.lineTo(10, -12); g.lineTo(7, -6); g.lineTo(11, -4); g.lineTo(6, -2); g.quadraticCurveTo(8, 2, 4, 5);
  g.lineTo(9, 9); g.lineTo(1, 7); g.quadraticCurveTo(-4, 10, -10, 4); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-8, -2); g.lineTo(-14, -10); g.lineTo(-6, -6); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-4, -6); g.lineTo(-6, -14); g.lineTo(0, -8); g.closePath(); g.fill();
  if (eye) { g.fillStyle = eye; g.beginPath(); g.ellipse(2, -4, 1.6, 0.9, -0.4, 0, TAU); g.fill(); }
  g.restore();
}
function msiArt(g, ctx, col, density = 1) {
  // MSI's thin geometric silkscreen: long diagonal strokes and stepped lines
  const {W, D, r} = ctx; g.strokeStyle = col; g.lineCap = 'square';
  for (let i = 0; i < 22 * density; i++) {
    const x = -W / 2 + r() * W, z = -D / 2 + r() * D, len = 20 + r() * 60, a = r() < 0.5 ? -PI / 4 : PI / 4;
    g.lineWidth = r() < 0.3 ? 1.2 : 0.4; g.beginPath(); g.moveTo(x, z); g.lineTo(x + Math.cos(a) * len, z + Math.sin(a) * len);
    if (r() < 0.5) g.lineTo(x + Math.cos(a) * len + len * 0.4, z + Math.sin(a) * len); g.stroke();
  }
}

/* ------------------------------------------------------------ 1 · MSI MAG B660M Mortar (mATX 244 x 244) */
const MORTAR = {
  id: 'b660m', name: 'MSI MAG B660M Mortar', seed: 660, W: 244, D: 244,
  mask: '#18191c', edge: '#141518', under: '#1b1c20', silk: 'rgba(214,217,222,.75)', trace: 'rgba(255,255,255,.05)', holeRing: '#b9bcc0',
  socket: {type: 'LGA1700', u: 96, v: 76, plate: '#bfc4ca'},
  dimm: {us: [148, 156.2, 166, 174.2], v0: 8, v1: 152, body: '#1d1e21', latch: '#2a2b2f', pair: 'DIMMA2 and DIMMB2', order: [1, 3, 0, 2], names: ['DIMMA1', 'DIMMA2', 'DIMMB1', 'DIMMB2'], labels: [['DDR4 BOOST', 140, 95, -PI / 2], ['CORE BOOST', 134, 95, -PI / 2]]},
  pcieU0: 42, pcieGen: 'PCIe 4.0',
  pcie: [{v: 140, kind: 'x16', body: '#1a1b1e', armor: true, main: true, latch: '#2a2b2f', name: 'PCI_E1'}, {v: 162, kind: 'x1', body: '#1a1b1e', name: 'PCI_E2'}, {v: 222, kind: 'x16', body: '#1a1b1e', latch: '#2a2b2f', name: 'PCI_E3'}],
  m2: [{u: 128, v: 124, dir: -1, shieldName: 'M.2 Shield Frozr', name: 'M2_1'}, {u: 170, v: 182, dir: -1, name: 'M2_2'}],
  atx24: {u: 237, v: 96}, eps: [{u: 22, v: 6, n: 8}, {u: 44, v: 6, n: 4}],
  sata: [{u: 232, v: 200, n: 2, dv: 9.4, col: '#1d1e21'}, {u: 232, v: 222, n: 2, dv: 9.4, col: '#1d1e21'}],
  battery: {u: 24, v: 162},
  headers: [{u: 70, v: 240, n: 9, label: 'JFP1'}, {u: 100, v: 240, n: 5, label: 'JUSB1'}, {u: 124, v: 240, n: 5, label: 'JUSB2'}, {u: 150, v: 240, n: 5, label: 'JRGB1'}, {u: 176, v: 240, n: 5, label: 'JARGB_V2'}, {u: 228, v: 160, n: 10, rows: 2, shroud: true, rot: PI / 2, label: ''}],
  front: [60, 234, 190, 244],
  fans: [[60, 4], [212, 6], [236, 40], [200, 238]],
  vrm: {chokes: [[50, 52], [50, 64], [50, 76], [50, 88], [50, 100], [66, 36], [78, 36], [90, 36], [102, 36], [114, 36]], caps: [[58, 112], [64, 112], [126, 38], [126, 46]], hot: [36, 14, 128, 112],
    desc: 'Twelve 60 A phases in an L shape around the socket. Silver heatsinks with a dotted texture sit on the transistors over thermal pads.'},
  io: [{t: 'bios', v: 18}, {t: 'usb2', v: 32, n: 2}, {t: 'dp', v: 50}, {t: 'hdmi', v: 66}, {t: 'usb3', v: 82, n: 2, col: '#d32f2f'}, {t: 'usbc', v: 96}, {t: 'lan', v: 108, usb: true}, {t: 'ant', v: 130}, {t: 'audio', v: 150, n: 6, gold: true, optical: true}],
  ioEnd: 166,
  chips: [{u: 196, v: 196, w: 18, d: 18, label: 'B660', sub: 'INTEL', col: '#1b1c1f'}, {u: 194, v: 120, w: 10, d: 10, label: 'NCT', sub: '6687D'}, {u: 22, v: 210, w: 7, d: 7, label: 'ALC', sub: '897'}],
  audio: {caps: [[10, 186], [10, 196], [10, 206], [18, 222], [26, 222], [34, 222]], col: '#d5a83a', hot: [2, 178, 44, 236]},
  holes: [[8, 10], [8, 158], [8, 232], [130, 10], [130, 158], [236, 10], [236, 232]],
  smd: 1600, traces: 380,
  art(g, ctx) {
    msiArt(g, ctx, 'rgba(160,166,174,.20)');
    const {P} = ctx;
    // the audio island split and its label
    g.strokeStyle = 'rgba(200,170,90,.45)'; g.lineWidth = 0.5; g.setLineDash([2, 1.2]);
    const [a0, b0] = P(46, 176), [a1, b1] = P(46, 244); g.beginPath(); g.moveTo(a0, b0); g.lineTo(a1, b1); g.stroke(); g.setLineDash([]);
    const [mx, mz] = P(200, 236); silk(g, 'MAG B660M MORTAR WIFI DDR4', mx, mz, 3, 'rgba(214,217,222,.7)', 'center', 800, FS, 0.4);
  },
  dress(ctx) {
    const {P, rect} = ctx;
    const silver = std('#c8ccd1', 0.38, 0.85), silverDk = std('#9ca2a9', 0.42, 0.8), capM = ctx.capMat(0.42, 0.55);
    // I/O cover: a tall bead-blasted aluminium block over the left VRM
    const io = [[0, 12], [40, 12], [40, 30], [46, 36], [46, 110], [40, 118], [0, 124]];
    ctx.sink(io, T, 36, capM, silver, 1.2, (u, v) => 36 - Math.max(0, (u - 26)) * 0.35);
    ctx.block(0, 12, 46, 124);
    // top VRM heatsink with the dark MAG insert
    ctx.sink([[46, 14], [130, 14], [130, 34], [118, 34], [112, 28], [52, 28], [46, 34]], T, 22, capM, silver, 1, (u, v) => 22 - Math.max(0, v - 24) * 0.4);
    ctx.block(46, 14, 130, 34);
    // M.2 shield D1 above PCIe 1, and D2 lower down
    const d1 = ctx.sink([[44, 117], [128, 117], [131, 120], [131, 131], [52, 131], [44, 125]], T + 4.2, 4.2, capM, silverDk, 0.5);
    live(d1, 'm2shield0'); ctx.liveRefs.m2shields[0] = d1; ctx.seats.m2[0].shield = d1;
    const d2 = ctx.sink([[86, 175], [172, 175], [176, 179], [176, 189], [94, 189], [86, 183]], T + 4.2, 4.2, capM, silverDk, 0.5);
    live(d2, 'm2shield1'); ctx.liveRefs.m2shields[1] = d2; ctx.seats.m2[1].shield = d2;
    // the chipset heatsink: the MORTAR block, a faceted silver slab with a dark lip
    ctx.sink([[178, 162], [240, 162], [240, 214], [196, 214], [178, 196]], T, 11, capM, silver, 1, (u, v) => 11 - Math.max(0, v - 196) * 0.25);
    ctx.block(178, 162, 240, 214);
    ctx.paint((g) => {
      // bead-blast dots on every silver surface, dark accents, logos
      g.fillStyle = '#b4b9bf'; g.fillRect(-122, -122, 244, 244);
      dots(g, -122, -122, 244, 244, 1.3, 0.3, 'rgba(70,76,84,.4)');
      brushed(g, -122, -122, 244, 244, rng(5), 0.05);
      const [x0, z0] = P(0, 0);
      // I/O cover: a dark inset with MAG and the msi logo
      g.fillStyle = '#2b2d31'; poly(g, [P(6, 18), P(30, 18), P(30, 40), P(6, 52)].map((p) => p)); g.fill();
      silk(g, 'MAG', ...P(18, 28), 5.2, '#d9dce0', 'center', 800, FS, 0.3);
      g.save(); g.translate(...P(22, 98)); msiLogo(g, 0, 0, 9, '#2a2c30'); g.restore();
      g.strokeStyle = 'rgba(40,42,46,.55)'; g.lineWidth = 0.6; poly(g, [P(4, 60), P(36, 44), P(36, 50), P(4, 66)]); g.stroke();
      // top heatsink insert
      g.fillStyle = '#26282c'; rrect(g, ...P(70, 16), 34, 9, 1.5); g.fill();
      silk(g, 'MAG', ...P(87, 20.5), 5, '#dfe2e6', 'center', 800, FS, 0.6);
      // M.2 shields
      silk(g, 'D1', ...P(64, 124), 4, '#3a3d42', 'center', 800, FS);
      silk(g, 'D2', ...P(104, 182), 4, '#3a3d42', 'center', 800, FS);
      g.strokeStyle = 'rgba(50,52,56,.6)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(...P(70, 120)); g.lineTo(...P(126, 120)); g.stroke();
      // chipset: the dark band with MORTAR and the arrow mark
      g.fillStyle = '#2a2c30'; poly(g, [P(184, 196), P(238, 196), P(238, 210), P(198, 210)]); g.fill();
      silk(g, 'MORTAR', ...P(220, 203), 5.4, '#e3e6ea', 'center', 800, FS, 1.2);
      g.strokeStyle = '#3a3d42'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(...P(200, 172)); g.lineTo(...P(206, 180)); g.lineTo(...P(200, 188)); g.stroke();
      g.beginPath(); g.moveTo(...P(208, 172)); g.lineTo(...P(214, 180)); g.lineTo(...P(208, 188)); g.stroke();
    });
    // the EZ debug LEDs by the 24-pin
    ['CPU', 'DRAM', 'VGA', 'BOOT'].forEach((s, i) => { const l = box(1.6, 0.8, 1.2, std('#3a1010', 0.3, 0, {}), 0, 0, 0); const [x, z] = P(226, 50 + i * 4.4); l.position.set(x, T, z); live(l); ctx.root.add(l); ctx.liveRefs.leds.push({m: l, name: s}); ctx.lab(s, 219, 50 + i * 4.4, 0, 1.5); });
    ctx.H('ezdebug', 'EZ Debug LEDs', 'Four LEDs: CPU, DRAM, VGA, BOOT. They light in turn at start; if one gets stuck, you know where the system tripped.', 214, 46, 232, 66, 4);
    ctx.H('chipset', 'Intel B660 chipset under the MORTAR heatsink', 'Hands out lanes for SATA, USB, the second M.2 and the network. It runs cool, so the heatsink is flat and has no fan.', 178, 162, 240, 214, 14);
    ctx.H('shield', 'M.2 heatsink D1', 'An aluminium plate with a thermal pad presses on the NVMe drive from above. Two screws hold it; lift it before installing the drive.', 44, 117, 131, 131, 10);
  },
};

/* ------------------------------------------------------------ 2 · MSI MPG Z490 Gaming Carbon WiFi (ATX 244 x 305) */
const CARBON = {
  id: 'z490', name: 'MSI MPG Z490 Gaming Carbon WiFi', seed: 490, W: 244, D: 305,
  mask: '#141517', edge: '#111214', under: '#17181b', silk: 'rgba(200,204,210,.62)', trace: 'rgba(255,255,255,.045)', holeRing: '#a9adb3',
  socket: {type: 'LGA1200', u: 104, v: 84, plate: '#b9bec4'},
  dimm: {us: [164, 172.2, 182, 190.2], v0: 10, v1: 154, body: '#1b1c1f', latch: '#25262a', pair: 'DIMMA2 and DIMMB2', order: [1, 3, 0, 2], names: ['DIMMA1', 'DIMMA2', 'DIMMB1', 'DIMMB2'], labels: [['DDR4 BOOST', 157, 96, -PI / 2], ['CORE BOOST', 151, 96, -PI / 2]]},
  pcieU0: 40, pcieGen: 'PCIe 3.0',
  pcie: [{v: 168, kind: 'x16', body: '#1a1b1e', armor: true, main: true, latch: '#2a2b2f'}, {v: 188, kind: 'x1', body: '#1a1b1e'}, {v: 209, kind: 'x16', body: '#1a1b1e', armor: true, latch: '#2a2b2f'}, {v: 230, kind: 'x1', body: '#1a1b1e'}, {v: 270, kind: 'x16', body: '#1a1b1e', latch: '#2a2b2f'}],
  m2: [{u: 136, v: 153, dir: -1, shieldName: 'M.2 Shield Frozr'}, {u: 214, v: 250, dir: -1}],
  atx24: {u: 237, v: 112}, eps: [{u: 50, v: 6, n: 8}, {u: 72, v: 6, n: 4}],
  sata: [{u: 232, v: 232, n: 6, dv: 9.4, col: '#1b1c1f'}],
  battery: {u: 90, v: 192},
  headers: [{u: 70, v: 300, n: 9, label: 'JFP1'}, {u: 100, v: 300, n: 5, label: 'JUSB1'}, {u: 128, v: 300, n: 5, label: 'JUSB2'}, {u: 156, v: 300, n: 5, label: 'JRGB1'}, {u: 184, v: 300, n: 5, label: 'JRAINBOW1'}, {u: 232, v: 166, n: 10, rows: 2, shroud: true, rot: PI / 2}],
  front: [60, 294, 196, 305],
  fans: [[64, 2], [206, 6], [238, 54], [212, 300]],
  vrm: {chokes: [[54, 52], [54, 64], [54, 76], [54, 88], [54, 100], [54, 112], [70, 40], [82, 40], [94, 40], [106, 40], [118, 40], [130, 40]], caps: [[62, 124], [68, 124], [142, 42], [142, 50]], hot: [40, 14, 146, 124],
    desc: 'Twelve 90 A power phases. Above them sit carbon heatsinks joined by a heat pipe so both halves warm evenly.'},
  io: [{t: 'bios', v: 20}, {t: 'ps2', v: 34}, {t: 'usb2', v: 50, n: 2}, {t: 'hdmi', v: 66}, {t: 'dp', v: 80}, {t: 'usb3', v: 96, n: 2, col: '#d32f2f'}, {t: 'usbc', v: 110}, {t: 'lan', v: 124, usb: true}, {t: 'ant', v: 146}, {t: 'audio', v: 168, n: 6, gold: true, optical: true}],
  ioEnd: 184,
  chips: [{u: 196, v: 200, w: 20, d: 20, label: 'Z490', sub: 'INTEL'}, {u: 22, v: 240, w: 8, d: 8, label: 'ALC', sub: '1220'}, {u: 206, v: 152, w: 10, d: 10, label: 'NCT', sub: '6687D'}],
  audio: {caps: [[10, 214], [10, 224], [10, 234], [10, 244], [20, 262], [28, 262], [36, 262]], col: '#d4a52c', hot: [2, 204, 46, 290]},
  holes: [[8, 10], [8, 166], [8, 296], [132, 10], [132, 166], [132, 296], [236, 10], [236, 166], [236, 296]],
  smd: 1900, traces: 460,
  art(g, ctx) {
    msiArt(g, ctx, 'rgba(150,156,166,.16)', 1.2);
    const {P} = ctx;
    g.strokeStyle = 'rgba(200,170,90,.4)'; g.lineWidth = 0.5; g.setLineDash([2, 1.2]); g.beginPath(); g.moveTo(...P(48, 200)); g.lineTo(...P(48, 305)); g.stroke(); g.setLineDash([]);
    silk(g, 'MPG Z490 GAMING CARBON WIFI', ...P(130, 286), 3.4, 'rgba(210,214,220,.7)', 'center', 800, FS, 0.4);
  },
  dress(ctx) {
    const {P} = ctx;
    const blackS = std('#1b1c1f', 0.42, 0.35), capM = ctx.capMat(0.38, 0.35);
    // I/O cover: a tall faceted carbon block with an RGB slit along its front edge
    ctx.sink([[0, 12], [42, 12], [48, 18], [48, 140], [36, 152], [0, 152]], T, 40, capM, blackS, 1.2, (u, v) => 40 - Math.max(0, u - 28) * 0.55);
    ctx.block(0, 12, 48, 152);
    lightBar(ctx, [44, 22], [44, 120], T + 30, 1.6, '#8b3dff', '#2f7bff');
    // top VRM heatsink, tied to the left one by a heatpipe
    ctx.sink([[48, 16], [146, 16], [146, 36], [134, 36], [128, 30], [56, 30], [48, 38]], T, 24, capM, blackS, 1, (u, v) => 24 - Math.max(0, v - 26) * 0.5);
    ctx.block(48, 16, 146, 36);
    // M.2 Shield Frozr over slot 1
    const s1 = ctx.sink([[40, 146], [136, 146], [140, 150], [140, 160], [46, 160], [40, 154]], T + 4.2, 4.6, capM, blackS, 0.6);
    live(s1, 'm2shield0'); ctx.liveRefs.m2shields[0] = s1; ctx.seats.m2[0].shield = s1;
    const s2 = ctx.sink([[130, 243], [216, 243], [220, 247], [220, 257], [136, 257], [130, 251]], T + 4.2, 4.2, capM, blackS, 0.6);
    live(s2, 'm2shield1'); ctx.liveRefs.m2shields[1] = s2; ctx.seats.m2[1].shield = s2;
    // the CARBON chipset block: a big diagonal slab, the dragon, an RGB edge
    ctx.sink([[150, 176], [240, 176], [240, 236], [176, 236], [150, 214]], T, 12, capM, blackS, 1, (u, v) => 12 - Math.max(0, 196 - v) * 0.08);
    ctx.block(150, 176, 240, 236);
    lightBar(ctx, [176, 236.6], [238, 236.6], T + 3, 1.4, '#b03dff', '#2f7bff');
    ctx.paint((g) => {
      g.fillStyle = '#1a1b1e'; g.fillRect(-122, -153, 244, 305);
      carbon(g, -122, -153, 244, 305, 1.4, 0.9);
      // I/O: a smooth panel with the MPG mark
      g.fillStyle = 'rgba(40,42,46,.9)'; poly(g, [P(4, 120), P(30, 120), P(30, 148), P(4, 148)]); g.fill();
      silk(g, 'MPG', ...P(17, 134), 6, '#cfd3d8', 'center', 800, FS, 0.5);
      g.fillStyle = 'rgba(20,21,24,.9)'; rrect(g, ...P(80, 18), 40, 9, 1.4); g.fill();
      silk(g, 'MPG', ...P(100, 22.5), 5, '#d6d9de', 'center', 800, FS, 0.8);
      // the shield: name in white
      silk(g, 'M.2 SHIELD FROZR', ...P(90, 153), 3.4, '#c8ccd2', 'center', 800, FS, 0.4);
      // chipset: CARBON in brushed silver letters, the dragon on the right
      g.fillStyle = 'rgba(30,31,35,.95)'; poly(g, [P(160, 196), P(232, 196), P(232, 228), P(176, 228)]); g.fill();
      silk(g, 'CARBON', ...P(200, 213), 9, '#c9ccd1', 'center', 800, FS, 0.6);
      dragon(g, ...P(222, 186), 10, '#d7d9dc', '#d9262c');
    });
    ctx.H('chipset', 'Intel Z490 chipset under CARBON', 'A Z chipset allows CPU and memory overclocking. Above it sits a large carbon-textured heatsink with a lit edge.', 150, 176, 240, 236, 14);
    ctx.H('rgb', 'Mystic Light lighting', 'Glowing slots on the I/O shroud and by the chipset. Syncs with memory and fans over the JRGB and JRAINBOW headers.', 36, 18, 50, 124, 40);
    ctx.H('shield', 'M.2 Shield Frozr', 'A heatsink over the first NVMe drive. Without it a hot drive slows down after a couple of minutes of writing.', 40, 146, 140, 160, 10);
  },
};

/* ------------------------------------------------------------ 3 · MSI MEG X570 Godlike (E-ATX 277 x 305) */
const GODLIKE = {
  id: 'x570', name: 'MSI MEG X570 Godlike', seed: 570, W: 277, D: 305,
  mask: '#121315', edge: '#0f1012', under: '#151619', silk: 'rgba(180,184,190,.55)', trace: 'rgba(255,255,255,.04)', holeRing: '#9da1a7',
  socket: {type: 'AM4', u: 118, v: 96},
  dimm: {us: [186, 194.2, 204, 212.2], v0: 12, v1: 158, body: '#1b1c1f', latch: '#2a2b2f', pair: 'DIMMA2 and DIMMB2', order: [1, 3, 0, 2], names: ['DIMMA1', 'DIMMA2', 'DIMMB1', 'DIMMB2']},
  pcieU0: 42, pcieGen: 'PCIe 4.0',
  pcie: [{v: 168, kind: 'x16', body: '#1a1b1e', armor: true, main: true, latch: '#2a2b2f'}, {v: 210, kind: 'x16', body: '#1a1b1e', armor: true, latch: '#2a2b2f'}, {v: 250, kind: 'x16', body: '#1a1b1e', armor: true, latch: '#2a2b2f'}, {v: 290, kind: 'x16', body: '#1a1b1e', armor: true, latch: '#2a2b2f'}],
  m2: [{u: 150, v: 189, dir: -1, shieldName: 'Lightning Gen4 M.2'}, {u: 150, v: 230, dir: -1}, {u: 150, v: 270, dir: -1}],
  atx24: {u: 271, v: 150}, eps: [{u: 64, v: 6, n: 8}, {u: 86, v: 6, n: 8}],
  sata: [{u: 266, v: 186, n: 6, dv: 9.4, col: '#1b1c1f'}],
  battery: {u: 172, v: 296},
  headers: [{u: 80, v: 301, n: 9, label: 'JFP1'}, {u: 110, v: 301, n: 5, label: 'JUSB1'}, {u: 138, v: 301, n: 5, label: 'JUSB2'}],
  front: [70, 295, 150, 305],
  fans: [[58, 2], [240, 4], [270, 60]],
  vrm: {chokes: [[64, 58], [64, 70], [64, 82], [64, 94], [64, 106], [64, 118], [64, 130], [78, 48], [90, 48], [102, 48], [114, 48], [126, 48], [138, 48], [150, 48]], caps: [[72, 142], [78, 142], [160, 50], [160, 58]], hot: [54, 12, 168, 142],
    desc: 'Fourteen 70 A phases plus four for the SoC. The heatsink on top has fins like a cooler and a heat pipe to the I/O shroud.'},
  io: [{t: 'bios', v: 18}, {t: 'usb3', v: 32, n: 2, col: '#d32f2f'}, {t: 'usb3', v: 50, n: 2, col: '#d32f2f'}, {t: 'usbc', v: 66}, {t: 'lan', v: 82, usb: true}, {t: 'lan', v: 104, usb: true}, {t: 'ant', v: 124}, {t: 'audio', v: 146, n: 6, gold: true, optical: true}],
  ioEnd: 162,
  chips: [{u: 240, v: 214, w: 24, d: 24, label: 'X570', sub: 'AMD'}, {u: 14, v: 220, w: 8, d: 8, label: 'ALC', sub: '1220'}],
  audio: {caps: [[34, 178], [34, 188], [34, 198], [34, 208], [34, 222], [34, 232]], col: '#d4a52c', hot: [0, 166, 40, 300]},
  holes: [[8, 10], [8, 166], [8, 296], [132, 10], [132, 166], [132, 296], [236, 10], [236, 166], [236, 296]],
  smd: 2000, traces: 480,
  art(g, ctx) {
    msiArt(g, ctx, 'rgba(140,146,156,.15)', 1.3);
    const {P} = ctx;
    msiLogo(g, ...P(120, 160), 10, 'rgba(200,204,210,.55)');
  },
  dress(ctx) {
    const {P} = ctx;
    const gun = std('#25272b', 0.32, 0.55), capM = ctx.capMat(0.32, 0.45), gloss = ctx.capMat(0.12, 0.2);
    // the I/O shroud with its infinity mirror panel
    ctx.sink([[0, 0], [52, 0], [58, 8], [58, 150], [48, 162], [0, 162]], T, 46, capM, gun, 1.4, (u, v) => 46 - Math.max(0, u - 40) * 0.6);
    ctx.block(0, 0, 58, 162);
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(26, 96), new THREE.MeshStandardMaterial({color: '#050506', roughness: 0.08, metalness: 0.4, emissive: '#ffffff', emissiveMap: mirrorTex(), emissiveIntensity: 0.3}));
    mirror.rotation.x = -PI / 2; const [mx, mz] = P(22, 76); mirror.position.set(mx, T + 46.06, mz); mirror.userData.rgb = {mirror: true}; live(mirror); ctx.root.add(mirror); ctx.liveRefs.rgb.push(mirror);
    textOnFace(ctx, 'GODLIKE', [29, 162.2], T + 8, 52, 9, 0, {col: '#c6c9ce', size: 6.4, spacing: 1.4});
    // top VRM heatsink: a fin stack under a dark cap with MEG
    ctx.root.add(at(finBlock(...P(62, 0).slice(0, 1), P(168, 0)[0], 22, 1.2, P(0, 26)[1], 26, T + 4, 34, std('#2c2e33', 0.4, 0.6)), 0, 0, 0));
    ctx.sink([[60, 10], [170, 10], [170, 16], [60, 16]], T, 42, capM, gun, 0.8);
    ctx.sink([[60, 36], [170, 36], [170, 42], [60, 42]], T, 38, capM, gun, 0.8);
    ctx.sink([[86, 4], [146, 4], [150, 12], [82, 12]], T, 44, capM, gun, 1);
    ctx.block(58, 4, 170, 44);
    // TRUE GAMING cover to the right of the DIMMs
    ctx.sink([[224, 4], [254, 4], [254, 118], [242, 130], [224, 130]], T, 14, capM, gun, 1, (u, v) => 14 - Math.max(0, u - 244) * 0.6);
    ctx.block(224, 4, 254, 130);
    // three M.2 shields between the slots
    [[178, 0], [219, 1], [259, 2]].forEach(([v, i]) => {
      const s = ctx.sink([[40, v], [150, v], [158, v + 6], [158, v + 20], [48, v + 20], [40, v + 12]], T + 4.2, 4.6, capM, gun, 0.6);
      live(s, 'm2shield' + i); ctx.liveRefs.m2shields[i] = s; ctx.seats.m2[i].shield = s;
    });
    // the audio cover
    ctx.sink([[0, 170], [28, 170], [28, 296], [20, 305], [0, 305]], T, 12, capM, gun, 1);
    ctx.block(0, 170, 28, 305);
    // the chipset cover: a glossy black slab with the dragon, a fan grille and an RGB lip
    ctx.sink([[168, 176], [272, 176], [272, 262], [234, 286], [168, 286]], T, 14, gloss, gun, 1.2, (u, v) => 14 - Math.max(0, 200 - v) * 0.12);
    ctx.block(168, 176, 272, 286);
    lightBar(ctx, [170, 250], [232, 280], T + 13, 1.4, '#ff3dd2', '#6a3dff');
    // buttons and knobs bottom right
    [[220, 294], [230, 294], [240, 294]].forEach(([u, v]) => { const b = cylY(3, 4, std('#1f2024', 0.4), 0, 0, 0, 20); ctx.add(b, u, v, T); });
    ctx.add(cylY(6, 6, std('#2a2c31', 0.35, 0.5), 0, 0, 0, 28), 258, 294, T);
    ctx.paint((g) => {
      g.fillStyle = '#26282c'; g.fillRect(-140, -153, 277, 305);
      brushed(g, -140, -153, 277, 305, rng(9), 0.06);
      // MEG cap
      g.fillStyle = '#1b1c1f'; poly(g, [P(86, 4), P(146, 4), P(150, 12), P(82, 12)]); g.fill();
      silk(g, 'MEG', ...P(116, 8), 5, '#d0d3d8', 'center', 800, FS, 1);
      // TRUE GAMING
      g.save(); g.translate(...P(239, 64)); g.rotate(-PI / 2); silk(g, 'TRUE GAMING', 0, 0, 5.4, '#cfd2d7', 'center', 800, FS, 1.4); g.restore();
      // M.2 shields
      [178, 219, 259].forEach((v) => { silk(g, 'LIGHTNING GEN4 M.2', ...P(98, v + 10), 3.6, '#c4c7cc', 'center', 800, FS, 0.4); g.strokeStyle = 'rgba(200,204,210,.5)'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(...P(48, v + 16)); g.lineTo(...P(150, v + 16)); g.stroke(); });
      // audio cover text
      g.save(); g.translate(...P(14, 236)); g.rotate(-PI / 2); silk(g, 'XTREME AUDIO DAC', 0, 0, 4.4, '#c4c7cc', 'center', 800, FS, 1); g.restore();
      // chipset: glossy black, a grille of slots, the dragon in pink
      g.fillStyle = '#0c0c0e'; g.fillRect(...P(168, 176), 104, 110);
      g.strokeStyle = 'rgba(80,84,92,.9)'; g.lineWidth = 1.2; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(...P(186 + i * 6, 250)); g.lineTo(...P(198 + i * 6, 236)); g.stroke(); }
      dragon(g, ...P(220, 206), 22, '#e7a3e0', '#ff4fd8');
      msiLogo(g, ...P(196, 274), 8, '#8f939a');
      g.strokeStyle = 'rgba(255,90,220,.6)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(...P(172, 228)); g.lineTo(...P(268, 186)); g.stroke();
    });
    ctx.H('chipset', 'AMD X570 chipset with a fan', 'The only chipset here with its own fan: PCIe 4.0 heats it to 10–15 W. On top: a dragon and an RGB edge.', 168, 176, 272, 286, 16);
    ctx.H('mirror', 'Mystic Light Infinity mirror', 'LEDs between two mirrors make an endless tunnel of light. Purely for looks, but what looks.', 6, 24, 40, 130, 48);
    ctx.H('shield', 'Three Lightning Gen4 M.2 heatsinks', 'Each covers an M.2 slot with PCIe 4.0 x4. The heatsinks come off one by one; their pads press on the drive from above.', 40, 178, 158, 280, 10);
    ctx.H('buttons', 'Power, reset and Game Boost buttons', 'For an open bench: start the board right here, without a case and its buttons. The round knob holds overclocking presets.', 214, 288, 266, 300, 8);
  },
};
function mirrorTex() {
  return ctex(128, 480, (g, W, H) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 18; i++) {
      const t = i / 18, y = H * (0.06 + t * 0.88), a = 1 - t * 0.85;
      const gr = g.createLinearGradient(0, y, W, y);
      gr.addColorStop(0, `hsla(${(i * 22) % 360},100%,60%,${a})`); gr.addColorStop(1, `hsla(${(i * 22 + 120) % 360},100%,60%,${a})`);
      g.strokeStyle = gr; g.lineWidth = 3 - t * 2; const m = 10 + t * 40; g.strokeRect(m, y - 2, W - 2 * m, 4);
    }
  });
}

/* ------------------------------------------------------------ 4 · ASRock X99 OC Formula (ATX 244 x 305) */
const X99 = {
  id: 'x99', name: 'ASRock X99 OC Formula', seed: 99, W: 244, D: 305,
  mask: '#121214', edge: '#0f0f11', under: '#151517', silk: 'rgba(225,225,228,.75)', trace: 'rgba(255,255,255,.045)', holeRing: '#c9a85a',
  socket: {type: 'LGA2011-3', u: 124, v: 84, plate: '#c4c8cd'},
  dimm: {us: [62, 69.6, 77.2, 84.8, 179, 186.6, 194.2, 201.8], split: [[58, 89], [175, 206]], v0: 22, v1: 166, body: '#151517', latch: '#efefea', pair: 'A1 and B1', order: [4, 6, 3, 1, 5, 7, 2, 0], names: ['DDR4_D2', 'DDR4_D1', 'DDR4_C2', 'DDR4_C1', 'DDR4_A1', 'DDR4_A2', 'DDR4_B1', 'DDR4_B2'], latchBoth: false,
    desc: 'Eight DDR4 slots, four on each side of the socket: LGA2011-3 has four memory channels. White latches, one per slot. Two sticks go in A1 and B1, nearest the CPU.'},
  pcieU0: 40, pcieGen: 'PCIe 3.0',
  pcie: [{v: 176, kind: 'x16', body: '#e4b417', latch: '#f2f2ee', main: true}, {v: 196, kind: 'x1', body: '#141416'}, {v: 216, kind: 'x16', body: '#e4b417', latch: '#f2f2ee'}, {v: 256, kind: 'x16', body: '#e4b417', latch: '#f2f2ee'}, {v: 286, kind: 'x16', body: '#e4b417', latch: '#f2f2ee'}],
  m2: [{u: 214, v: 236, dir: -1, name: 'ULTRA_M2'}],
  atx24: {u: 237, v: 104, col: '#151517'}, eps: [{u: 56, v: 6, n: 8}, {u: 78, v: 6, n: 4}],
  sata: [{u: 230, v: 188, n: 5, dv: 9.4, col: '#e4b417'}, {u: 240, v: 188, n: 5, dv: 9.4, col: '#e4b417'}],
  battery: {u: 214, v: 172},
  headers: [{u: 70, v: 300, n: 9, label: 'PANEL1'}, {u: 100, v: 300, n: 5, label: 'USB_7_8'}, {u: 128, v: 300, n: 5, label: 'USB_9_10'}],
  front: [60, 294, 140, 305],
  fans: [[100, 4], [210, 6], [238, 48]],
  vrm: {chokes: [[48, 30], [48, 42], [48, 54], [48, 66], [48, 78], [48, 90], [48, 102], [48, 114], [104, 40], [116, 40], [128, 40], [140, 40]],
    caps: [[96, 52], [96, 60], [96, 68], [96, 76], [96, 84], [96, 92], [96, 100], [96, 108], [96, 116], [152, 52], [152, 60], [152, 68], [152, 76], [152, 84], [152, 92], [152, 100], [152, 108], [152, 116], [104, 122], [112, 122], [120, 122], [128, 122], [136, 122], [144, 122]], capR: 2.6, capH: 7.6, capMat: '#c7a456', hot: [34, 14, 160, 132],
    desc: 'Twelve phases with 60 A chokes: the board was built for overclocking records. A ring of gold capacitors circles the socket.'},
  io: [{t: 'ps2', v: 14}, {t: 'usb2', v: 30, n: 2}, {t: 'usb3', v: 48, n: 2, col: '#2163d6'}, {t: 'usb3', v: 66, n: 2, col: '#2163d6'}, {t: 'lan', v: 84, usb: true}, {t: 'bios', v: 100}, {t: 'audio', v: 140, n: 6, gold: true, optical: true}],
  ioEnd: 156,
  chips: [{u: 206, v: 200, w: 22, d: 22, label: 'X99', sub: 'INTEL'}, {u: 18, v: 238, w: 8, d: 8, label: 'ALC', sub: '1150'}],
  audio: {caps: [[10, 214], [10, 224], [10, 234], [20, 260], [28, 260], [36, 260], [44, 260]], col: '#d4a52c', hot: [0, 200, 50, 290], desc: 'Purity Sound 2: a Realtek ALC1150 codec under a shield, a headphone amp and Japanese audio capacitors on their own island.'},
  holes: [[8, 10], [8, 166], [8, 296], [132, 10], [132, 166], [132, 296], [236, 10], [236, 166], [236, 296]],
  smd: 2000, traces: 460,
  art(g, ctx) {
    const {P} = ctx;
    g.strokeStyle = 'rgba(228,180,23,.14)'; g.lineWidth = 0.8;
    for (let i = 0; i < 16; i++) { g.beginPath(); g.moveTo(...P(-20 + i * 18, 305)); g.lineTo(...P(60 + i * 18, 160)); g.stroke(); }
    silk(g, 'X99 OC Formula', ...P(140, 238), 8, 'rgba(240,240,244,.85)', 'center', 800, FSERIF, 0.3);
    silk(g, 'Designed by Nick Shih', ...P(140, 246), 3, 'rgba(240,240,244,.6)', 'center', 600, FSERIF);
    silk(g, 'ASRock', ...P(156, 272), 10, 'rgba(240,240,244,.8)', 'center', 800, FS, 0.4);
    g.strokeStyle = 'rgba(228,180,23,.6)'; g.lineWidth = 0.5; g.setLineDash([2, 1.2]); g.beginPath(); g.moveTo(...P(52, 200)); g.lineTo(...P(52, 305)); g.stroke(); g.setLineDash([]);
  },
  dress(ctx) {
    const {P} = ctx;
    const gold = std('#e0ac16', 0.34, 0.55), capM = ctx.capMat(0.34, 0.5);
    // I/O cover: gold, slashed, with the ASRock Cloud panel
    ctx.sink([[0, 8], [32, 8], [36, 14], [36, 132], [28, 140], [0, 140]], T, 30, capM, gold, 1.2, (u, v) => 30 - Math.max(0, u - 22) * 0.4);
    ctx.block(0, 8, 36, 140);
    const cloud = rbox(26, 18, 22, 2, std('#1a1d24', 0.3, 0.4), ...[0, 0, 0]); ctx.add(cloud, 18, 120, T + 30);
    const scr = decal(20, 15, ctex(200, 150, (g, W, H) => {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2b7de0'); gr.addColorStop(1, '#0e3c8c'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(80, 70, 22, 0, TAU); g.arc(112, 62, 28, 0, TAU); g.arc(138, 76, 18, 0, TAU); g.rect(80, 70, 60, 24); g.fill();
      g.fillStyle = '#2b7de0'; g.beginPath(); g.moveTo(108, 60); g.lineTo(122, 78); g.lineTo(114, 78); g.lineTo(114, 92); g.lineTo(102, 92); g.lineTo(102, 78); g.lineTo(94, 78); g.closePath(); g.fill();
      silk(g, 'ASRock Cloud', W / 2, H - 22, 18, '#ffffff', 'center', 800, FS);
    }), T + 48.1, {mat: {emissive: '#ffffff', emissiveIntensity: 0.15, roughness: 0.2}});
    const [cx, cz] = P(18, 120); scr.position.x = cx; scr.position.z = cz; scr.rotation.y = PI / 2; ctx.root.add(scr);
    // the gold frame: top block with X99, two side rails and a lower rail round the socket, a left VRM block
    ctx.sink([[86, 2], [164, 2], [164, 30], [156, 36], [94, 36], [86, 30]], T, 28, capM, gold, 1.2, (u, v) => 28 - Math.max(0, v - 22) * 0.6);
    ctx.sink([[36, 18], [56, 18], [56, 126], [36, 126]], T, 24, capM, gold, 1, (u, v) => 24 - Math.max(0, u - 46) * 0.4);
    ctx.sink([[88, 36], [94, 36], [94, 140], [88, 140]], T, 12, capM, gold, 0.6);
    ctx.sink([[156, 36], [162, 36], [162, 140], [156, 140]], T, 12, capM, gold, 0.6);
    ctx.sink([[88, 134], [162, 134], [162, 142], [88, 142]], T, 10, capM, gold, 0.6);
    ctx.block(36, 2, 164, 142);
    // heatpipe from the left block to the top block
    const hp = tube([V3(...[P(46, 20)[0], T + 25, P(46, 20)[1]]), V3(P(60, 10)[0], T + 30, P(60, 10)[1]), V3(P(86, 12)[0], T + 27, P(86, 12)[1])], 2.6, std('#c58a3a', 0.3, 1), 40, 10);
    ctx.root.add(hp);
    // chipset heatsink: tall gold slab with ASRock running down it
    ctx.sink([[172, 180], [236, 180], [236, 240], [184, 240], [172, 226]], T, 16, capM, gold, 1.2, (u, v) => 16 - Math.max(0, 196 - v) * 0.15);
    ctx.block(172, 180, 236, 240);
    // debug LED
    const led = decal(14, 9, ctex(140, 90, (g, W, H) => { g.fillStyle = '#120808'; g.fillRect(0, 0, W, H); }), T + 3.1);
    const ledBody = rbox(16, 3, 11, 0.6, std('#1a1a1c', 0.4), 0, 0, 0); ctx.add(ledBody, 222, 294, T); const [lx, lz] = P(222, 294); led.position.set(lx, T + 3.05, lz); live(led, 'post'); ctx.root.add(led); ctx.liveRefs.post = led;
    [[196, 296, '#d32f2f'], [206, 296, '#1d1d1f']].forEach(([u, v, c]) => { ctx.add(rbox(7, 4, 7, 1, std('#2a2a2c', 0.5), 0, 0, 0), u, v, T); ctx.add(cylY(2.4, 1.6, std(c, 0.4), 0, 0, 0, 16), u, v, T + 4); });
    ctx.paint((g) => {
      g.fillStyle = '#e1ad19'; g.fillRect(-122, -153, 244, 305);
      brushed(g, -122, -153, 244, 305, rng(3), 0.09);
      // slashes
      g.strokeStyle = 'rgba(60,40,0,.55)'; g.lineWidth = 2.2;
      [[40, 70], [40, 80], [40, 90]].forEach(([u, v]) => { g.beginPath(); g.moveTo(...P(u, v)); g.lineTo(...P(u + 14, v - 16)); g.stroke(); });
      [[136, 26], [144, 26], [152, 26]].forEach(([u, v]) => { g.beginPath(); g.moveTo(...P(u, v)); g.lineTo(...P(u + 8, v - 20)); g.stroke(); });
      [[4, 40], [4, 50], [4, 60]].forEach(([u, v]) => { g.beginPath(); g.moveTo(...P(u, v)); g.lineTo(...P(u + 24, v - 26)); g.stroke(); });
      g.fillStyle = '#1c1606'; g.font = 'italic 900 13px ' + FS; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('X99', ...P(114, 18));
      g.save(); g.translate(...P(222, 210)); g.rotate(-PI / 2); silk(g, 'ASRock', 0, 0, 10, '#1c1606', 'center', 900, FS, 0.4); g.restore();
      g.strokeStyle = 'rgba(40,28,0,.6)'; g.lineWidth = 1.2; poly(g, [P(178, 186), P(232, 186), P(232, 236), P(186, 236)]); g.stroke();
    });
    ctx.H('chipset', 'Intel X99 chipset under a gold heatsink', 'The 2014 flagship platform: up to 10 SATA, the first mainstream DDR4 and PCIe 3.0. The heatsink is passive, with ASRock written vertically.', 172, 180, 236, 240, 18);
    ctx.H('post', 'POST code display', 'Two seven segment digits show which self test step the board is on. Stuck at 55 means memory trouble, b2 means the graphics card.', 212, 288, 232, 300, 5);
    ctx.H('cloud', 'ASRock Cloud panel', 'A lit plate on the I/O shroud, a signature detail of the Formula. In a glass case you see it from the side.', 4, 108, 32, 132, 52);
    ctx.H('vrm2', 'Gold frame around the socket', 'A chain of heatsinks surrounds the CPU on four sides, joined by a heat pipe: the phases heat up when overclocked to 300 W.', 86, 2, 164, 142, 30);
  },
};

/* ------------------------------------------------------------ 5 · MSI H310M Gaming Arctic (mATX 190 x 244, white) */
const ARCTIC = {
  id: 'h310m', name: 'MSI H310M Gaming Arctic', seed: 310, W: 190, D: 244,
  mask: '#e9ebec', edge: '#dfe2e4', under: '#e3e6e8', silk: 'rgba(110,116,124,.85)', trace: 'rgba(120,128,138,.10)', holeRing: '#c9ccd0',
  socket: {type: 'LGA1151', u: 88, v: 64, plate: '#c9cdd2', capCol: '#f4f4f2'},
  dimm: {us: [150, 158.6], v0: 8, v1: 152, body: '#f2f2f0', latch: '#c9ccd1', pair: 'both slots', order: [0, 1], names: ['DIMM1', 'DIMM2'], labels: [['DDR4 BOOST', 143, 70, -PI / 2], ['CORE BOOST', 137, 70, -PI / 2]],
    desc: 'Two DDR4 slots, up to 32 GB. White, to match the board. For two channels use both sticks, one in each slot.'},
  pcieU0: 36, pcieGen: 'PCIe 3.0',
  pcie: [{v: 170, kind: 'x16', body: '#f2f2f0', armor: true, main: true, latch: '#d0d3d7'}, {v: 196, kind: 'x1', body: '#f2f2f0'}, {v: 218, kind: 'x1', body: '#f2f2f0'}],
  m2: [{u: 132, v: 144, dir: -1}],
  atx24: {u: 183, v: 104, col: '#f2f2f0'}, eps: [{u: 60, v: 6, n: 4, col: '#f2f2f0'}],
  sata: [{u: 178, v: 200, n: 2, dv: 9.4, col: '#f2f2f0'}, {u: 178, v: 222, n: 2, dv: 9.4, col: '#f2f2f0'}],
  battery: {u: 116, v: 196},
  headers: [{u: 40, v: 240, n: 9, label: 'JFP1', col: '#1c1d20'}, {u: 72, v: 240, n: 5, label: 'JUSB1', col: '#1c1d20'}, {u: 100, v: 240, n: 5, label: 'JAUD1', col: '#1c1d20'}, {u: 128, v: 240, n: 5, label: 'JCI1', col: '#1c1d20'}],
  front: [30, 234, 140, 244],
  fans: [[92, 4], [118, 4], [186, 60]],
  vrm: {chokes: [[44, 38], [44, 50], [44, 62], [44, 74], [44, 86], [58, 26], [70, 26], [82, 26]], caps: [[32, 40], [32, 48], [32, 56], [32, 64], [32, 72], [32, 80], [32, 88], [56, 102], [64, 102], [96, 26], [104, 26]], capR: 2.8, capH: 8, capMat: '#c9ccd1', col: '#5f646b', hot: [26, 18, 112, 108],
    desc: 'A modest 4+2 phases without heatsinks, enough for CPUs up to 65 W. Grey squares are chokes, silver cylinders are solid capacitors.'},
  io: [{t: 'ps2', v: 12, col: '#7a4fd0'}, {t: 'usb2', v: 28, n: 2}, {t: 'dvi', v: 56, col: '#f0efea'}, {t: 'hdmi', v: 86}, {t: 'usb3', v: 102, n: 2, col: '#2163d6'}, {t: 'lan', v: 124, usb: true}, {t: 'audio', v: 158, n: 3, cols: ['#5ac8fa', '#7ed957', '#f472b6']}],
  ioEnd: 176, ioDesc: 'White ports: PS/2, USB 2.0 and 3.0, network, audio and two video outputs, DVI-D and HDMI, for the integrated graphics.',
  chips: [{u: 160, v: 214, w: 16, d: 16, label: 'H310', sub: 'INTEL', col: '#1d1e21'}, {u: 18, v: 204, w: 7, d: 7, label: 'ALC', sub: '887'}, {u: 112, v: 124, w: 10, d: 10, label: 'NCT', sub: '6797D'}],
  audio: {caps: [[10, 190], [18, 190], [26, 190], [10, 198], [18, 198]], col: '#d6c46e', hot: [2, 182, 36, 230]},
  holes: [[8, 10], [8, 158], [8, 232], [118, 10], [118, 158], [182, 10], [182, 232]],
  smd: 1100, traces: 300,
  art(g, ctx) {
    const {P, r} = ctx;
    // pale grey stripes and diagonals, the Arctic look
    g.strokeStyle = 'rgba(150,158,168,.35)';
    for (let i = 0; i < 26; i++) { g.lineWidth = r() < 0.3 ? 1.4 : 0.5; const u = r() * 190, v = r() * 244, l = 20 + r() * 50; g.beginPath(); g.moveTo(...P(u, v)); g.lineTo(...P(u + l, v - l)); g.stroke(); }
    g.save(); g.translate(...P(12, 214)); g.rotate(-PI / 2); silk(g, 'H310M GAMING ARCTIC', 0, 0, 3.6, 'rgba(120,126,134,.9)', 'center', 800, FS, 0.4); g.restore();
    msiLogo(g, ...P(98, 150), 9, 'rgba(60,64,70,.85)');
    g.fillStyle = 'rgba(120,126,134,.18)'; poly(g, [P(0, 160), P(30, 130), P(36, 130), P(6, 160)]); g.fill();
  },
  dress(ctx) {
    const {P} = ctx;
    const white = std('#f1f1ef', 0.4, 0.1), capM = ctx.capMat(0.4, 0.1);
    // a slim white chipset heatsink with the msi mark and stripes
    ctx.sink([[132, 202], [188, 202], [188, 230], [146, 230], [132, 218]], T, 10, capM, white, 1, (u, v) => 10 - Math.max(0, u - 170) * 0.2);
    ctx.block(132, 202, 188, 230);
    ctx.paint((g) => {
      g.fillStyle = '#efefed'; g.fillRect(-95, -122, 190, 244);
      g.strokeStyle = 'rgba(150,156,164,.6)'; g.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(...P(140 + i * 6, 226)); g.lineTo(...P(160 + i * 6, 206)); g.stroke(); }
      msiLogo(g, ...P(172, 220), 8, '#7d838b');
    });
    ctx.H('chipset', 'Intel H310 chipset', 'The simplest chipset of its generation: no overclocking, PCIe 2.0 and only four SATA. The thin white heatsink is almost decorative.', 132, 202, 188, 230, 12);
    ctx.H('white', 'White mask and white slots', 'The Arctic series is for white builds: white solder mask, slots, connectors and even the socket cover. Traces show grey under the mask.', 60, 104, 130, 160, 3);
  },
};

export const BOARD_SPECS = {b660m: MORTAR, z490: CARBON, x570: GODLIKE, x99: X99, h310m: ARCTIC};
