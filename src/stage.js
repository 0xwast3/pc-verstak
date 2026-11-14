// STAGE · the renderer, the studio light, the soft shadows and the lens (bloom for the LEDs, a tilt-shift for the
// shallow depth of field the reference video has at the far and near edges of the bench).
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {InkPass, patchToon, CF} from './ink.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {Pass} from 'three/addons/postprocessing/Pass.js';

export const FOG = CF.paper;
/** the lens is long (near-isometric, like a Colorfigures plate); scenes are framed as if it were 30 degrees */
export const FOV = 13, DK = Math.tan((30 * Math.PI) / 360) / Math.tan((FOV * Math.PI) / 360);

const TiltShift = {
  uniforms: {tDiffuse: {value: null}, dir: {value: new THREE.Vector2(1, 0)}, res: {value: new THREE.Vector2(1, 1)}, focus: {value: 0.45}, band: {value: 0.16}, top: {value: 0.35}, bottom: {value: 0.42}, amount: {value: 7}},
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 dir; uniform vec2 res; uniform float focus, band, top, bottom, amount; varying vec2 vUv;
    void main(){
      float d = vUv.y - focus;
      float k = d > 0.0 ? 1.0 - smoothstep(band + top, band, d) : 1.0 - smoothstep(band + bottom, band, -d);
      float r = amount * k;
      if (r < 0.35) { gl_FragColor = texture2D(tDiffuse, vUv); return; }
      vec4 c = vec4(0.0); float ws = 0.0;
      for (int i = -6; i <= 6; i++) { float t = float(i) / 6.0; float w = exp(-t * t * 2.2); c += texture2D(tDiffuse, vUv + dir * t * r / res) * w; ws += w; }
      gl_FragColor = c / ws;
    }`,
};

class Toggle extends Pass {
  constructor(fn) { super(); this.needsSwap = false; this.fn = fn; }
  render() { this.fn(); }
}

function studioEnv(renderer) {
  // a soft studio: a warm grey room, a big top softbox, two side strips and a pale floor bounce, prefiltered once
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(10, 6, 10), new THREE.MeshBasicMaterial({color: '#8f9399', side: THREE.BackSide})));
  [[0, 2.9, 0, 6, 0.1, 4.5, 3.4], [-4.9, 1.1, 1, 0.1, 3, 4, 1.6], [4.9, 0.9, -1.5, 0.1, 2.4, 3, 1.2], [0, 1.2, 4.9, 5, 2, 0.1, 0.9], [0, -2.9, 0, 9, 0.1, 9, 0.45]].forEach(([x, y, z, w, h, d, k]) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({color: new THREE.Color(k * 1.02, k, k * 0.96)}));
    p.position.set(x, y, z); s.add(p);
  });
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(s, 0.035);
  pm.dispose();
  return rt.texture;
}

export function createStage(canvas) {
  patchToon();
  const renderer = new THREE.WebGLRenderer({canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true});
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(FOG);
  scene.fog = null;
  const env = null;

  const camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 8, 30000);

  // Colorfigures light: the tones come from a light fixed to the viewer (in ink.js); this key only casts the flat blue
  // shadow, short (0.45 x height) and toward the lower left of the screen, turning with the viewer
  const hemi = new THREE.HemisphereLight('#ffffff', '#ffffff', 0.0);
  scene.add(hemi);
  const key = new THREE.DirectionalLight('#ffffff', 1.0);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.6;
  key.shadow.radius = 1.5;
  const sc = key.shadow.camera;
  Object.assign(sc, {left: -700, right: 700, top: 560, bottom: -560, near: 50, far: 6000});
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight('#ffffff', 0.0);
  const aim = {x: 0, z: 0, half: 650};
  const R = new THREE.Vector3(), F = new THREE.Vector3(), D = new THREE.Vector3();
  const followCam = () => {
    camera.updateMatrixWorld();
    R.setFromMatrixColumn(camera.matrixWorld, 0).setY(0);
    if (R.lengthSq() < 1e-6) R.set(1, 0, 0);
    R.normalize(); F.set(R.z, 0, -R.x); // horizontal forward, away from the viewer
    D.set(0, 1, 0).addScaledVector(R, 0.389).addScaledVector(F, 0.225).normalize();
    key.target.position.set(aim.x, 0, aim.z);
    key.position.set(aim.x, 0, aim.z).addScaledVector(D, 2600);
    key.target.updateMatrixWorld();
  };
  /** aim the shadow at a point on the bench, sized for what is in view */
  const aimLight = (cx, cz, half = 650) => {
    aim.x = cx; aim.z = cz; aim.half = half;
    Object.assign(sc, {left: -half * 1.25, right: half * 1.25, top: half * 1.25, bottom: -half * 1.25});
    sc.updateProjectionMatrix();
  };
  aimLight(0, 0);

  // ------------------------------------------------------------ post: colour, sRGB, then the ink pass on top
  const target = new THREE.WebGLRenderTarget(4, 4, {type: THREE.HalfFloatType, samples: 4});
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new OutputPass());
  const ink = new InkPass(scene, camera);
  composer.addPass(ink);
  // smooth the stair-steps on the ink so every edge reads as one clean straight stroke
  const fxaa = new ShaderPass(FXAAShader);
  composer.addPass(fxaa);
  const gtao = {enabled: false}, bloom = {enabled: false}, aoHide = [];

  const size = {w: 1600, h: 900, pr: 1};
  const resize = (w, h, pr) => {
    size.w = w; size.h = h; size.pr = pr;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    ink.px = pr;
    fxaa.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const tilt = () => {};
  const setQuality = ({shadow, samples}) => {
    if (samples !== undefined) for (const t of [composer.renderTarget1, composer.renderTarget2]) { t.samples = samples; t.dispose(); }
    if (shadow !== undefined && key.shadow.mapSize.x !== shadow) { key.shadow.mapSize.set(shadow, shadow); key.shadow.map?.dispose(); key.shadow.map = null; }
  };
  const pv = new THREE.Vector3();
  const project = (p) => {
    pv.copy(p).project(camera);
    return {x: (pv.x * 0.5 + 0.5) * size.w, y: (-pv.y * 0.5 + 0.5) * size.h, ok: pv.z < 1 && pv.z > -1};
  };
  return {THREE, renderer, scene, camera, composer, gtao, bloom, key, fill, hemi, env, ink, size, resize, tilt, setQuality, project, aimLight, aoHide, render: () => { followCam(); composer.render(); }};
}
