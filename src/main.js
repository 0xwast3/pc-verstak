// PC VERSTAK · the entry: fonts, materials, the stage and the desk, then the app (showroom, workbench, pages).
// With ?part=kind:id:x:z:ry:rz:y:rx,... it opens the model lab instead: parts on the mat, a fixed camera, for review shots.
import {loadFonts} from './fonts.js';
import {THREE, initMats} from './lib.js';
import {createStage, DK} from './stage.js';
import {buildDesk} from './desk.js';
import {buildBoard, BOARD_SPECS} from './parts/boards.js';
import {buildRam} from './parts/ram.js';
import {buildGpu} from './parts/gpu.js';
import {buildCpu} from './parts/cpu.js';
import {buildCooler} from './parts/cooling.js';
import {buildSsd} from './parts/storage.js';
import {buildPsu} from './parts/power.js';
import {startApp} from './app/app.js';

document.title = 'PC Verstak';
const css = document.createElement('style');
css.textContent = 'html,body{margin:0;background:#f2efe7;overflow:hidden;height:100%} #app{position:fixed;inset:0} #gl{position:fixed;inset:0;width:100vw;height:100vh;display:block}';
document.head.appendChild(css);

const BUILDERS = {
  board: (id) => buildBoard(BOARD_SPECS[id]),
  ram: (id) => buildRam(id),
  gpu: (id) => buildGpu(id),
  cpu: (id) => buildCpu(id),
  cooler: (id) => buildCooler(id),
  ssd: (id) => buildSsd(id),
  psu: (id) => buildPsu(id),
};

async function app() {
  const root = document.getElementById('app') || Object.assign(document.body.appendChild(document.createElement('div')), {id: 'app'});
  const canvas = document.createElement('canvas'); canvas.id = 'gl'; canvas.className = 'grab'; root.appendChild(canvas);
  await loadFonts();
  initMats();
  const st = createStage(canvas);
  st.resize(innerWidth, innerHeight, Math.min(devicePixelRatio || 1, 1.5));
  const desk = buildDesk(st.scene);
  const a = startApp(st, desk);
  a.U.loadProgress(0.2, 'Rolling out the mat');
  await a.boot(a.U.loadProgress);
  setTimeout(() => a.U.loadDone(), 350);
  window.__ready = true; window.__app = a;
}

(async () => {
  const q = new URLSearchParams(location.search);
  if (!q.has('part')) { app(); return; }
  await loadFonts();
  initMats();
  const canvas = document.createElement('canvas'); canvas.id = 'gl'; document.body.appendChild(canvas);
  const st = createStage(canvas);
  buildDesk(st.scene);
  const list = (q.get('part') || 'board:b660m').split(',');
  list.forEach((s) => {
    const [kind, id, x = 0, z = 0, ry = 0, rz = 0, y = 0, rx = 0] = s.split(':');
    const o = BUILDERS[kind](id);
    o.root.position.set(+x, +y + (kind === 'board' ? 5 : 0), +z);
    o.root.rotation.set(+rx, +ry, +rz, 'YXZ');
    o.root.traverse((m) => { if (m.isMesh) m.receiveShadow = false; });
    st.scene.add(o.root);
  });
  st.aimLight(+(q.get('tx') ?? 0), +(q.get('tz') ?? 0), 520);
  const az = +(q.get('az') ?? 0.55), el = +(q.get('el') ?? 0.62), d = +(q.get('d') ?? 620) * DK;
  const tgt = new THREE.Vector3(+(q.get('tx') ?? 0), +(q.get('ty') ?? 0), +(q.get('tz') ?? 0));
  const cam = st.camera;
  cam.position.set(tgt.x + d * Math.cos(el) * Math.sin(az), tgt.y + d * Math.sin(el), tgt.z + d * Math.cos(el) * Math.cos(az));
  cam.lookAt(tgt);
  st.resize(innerWidth, innerHeight, 1);
  st.setQuality({ao: q.has('ao'), samples: 4, bloom: q.has('bloom')});
  st.tilt({amount: +(q.get('tilt') ?? 0)});
  for (const [k, o, f] of [['env', st.scene, 'environmentIntensity'], ['hemi', st.hemi, 'intensity'], ['key', st.key, 'intensity'], ['fill', st.fill, 'intensity']]) if (q.has(k)) o[f] = +q.get(k);
  st.render();
  window.__ready = true;
  window.__st = st;
})();
