// THUMBS · the plates' pictures: each part rendered once, in its showroom pose, by a small offscreen renderer with
// the stage's studio light, on a transparent background.
import * as THREE from 'three';
import {createInkShot, patchToon} from '../ink.js';

export function createThumbs(env) {
  const W = 240, H = 150;
  patchToon();
  const r = new THREE.WebGLRenderer({antialias: false, alpha: true, preserveDrawingBuffer: true});
  r.setPixelRatio(2); r.setSize(W, H, false);
  r.toneMapping = THREE.NoToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
  r.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.environment = env; scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight('#f4f1ea', '#5f656c', 0.6));
  const key = new THREE.DirectionalLight('#fff3e2', 2.6); key.position.set(-0.5, 1, -0.4).multiplyScalar(1000); scene.add(key);
  const fill = new THREE.DirectionalLight('#dfe8ff', 0.9); fill.position.set(0.7, 0.5, 0.9).multiplyScalar(1000); scene.add(fill);
  const cam = new THREE.PerspectiveCamera(12, W / H, 1, 50000);
  const ink = createInkShot(r);
  const box = new THREE.Box3(), sph = new THREE.Sphere(), c = new THREE.Vector3();
  /** render a posed object (any Object3D) to a data URL */
  return function shot(obj, az = 0.62, el = 0.62) {
    scene.add(obj);
    obj.updateMatrixWorld(true);
    box.setFromObject(obj); box.getCenter(c); box.getBoundingSphere(sph);
    const d = sph.radius / Math.sin((cam.fov * Math.PI) / 360) * 0.92;
    cam.position.set(c.x + d * Math.cos(el) * Math.sin(az), c.y + d * Math.sin(el), c.z + d * Math.cos(el) * Math.cos(az));
    cam.lookAt(c); cam.near = d / 20; cam.far = d * 4; cam.updateProjectionMatrix();
    ink(scene, cam);
    const url = r.domElement.toDataURL('image/png');
    scene.remove(obj);
    return url;
  };
}
