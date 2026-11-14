// INK · the Colorfigures look in WebGL. Every lit material is shaded in three flat tones (light / mid / dark) by how
// its face meets a light that stays fixed to the viewer (up and to the right, as in the Colorfigures engine), the
// ground surfaces take a flat blue cast shadow, and a screen pass inks the drawing: a heavy line round every part,
// finer lines on panel edges and where one surface passes behind another, a slight hand-drawn wobble and paper grain.
// The numbers follow the Colorfigures core: tone thresholds -.15 / -.45 with a soft band of .18, mid = 16 % darker,
// dark = 42 % darker, ink #231e16, shadow #41538f, paper #f2efe7.
import * as THREE from 'three';
import {Pass, FullScreenQuad} from 'three/addons/postprocessing/Pass.js';

export const CF = {paper: '#f2efe7', ink: '#231e16', shadow: '#41538f'};

// the light in view space: Colorfigures' L = norm(.22, -.82, 1) seen through its default camera (yaw 45, pitch 35.26)
const LV = new THREE.Vector3(0.5605, 0.8088, 0.1759).normalize();
const SHC = new THREE.Color(CF.shadow); // linear
const f3 = (v) => `vec3(${v.x.toFixed(4)}, ${v.y.toFixed(4)}, ${v.z.toFixed(4)})`;

const TOON = `
	float cfSh = 1.0;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
		cfSh = receiveShadow ? getShadow( directionalShadowMap[ 0 ], directionalLightShadows[ 0 ].shadowMapSize, directionalLightShadows[ 0 ].shadowIntensity, directionalLightShadows[ 0 ].shadowBias, directionalLightShadows[ 0 ].shadowRadius, vDirectionalShadowCoord[ 0 ] ) : 1.0;
	#endif
	float cfD = dot( normalize( normal ), ${f3(LV)} );
	float cfK = cfD > -0.30 ? mix( 0.68, 1.0, smoothstep( -0.33, 0.03, cfD ) ) : mix( 0.30, 0.68, smoothstep( -0.63, -0.27, cfD ) );
	vec3 outgoingLight = diffuseColor.rgb * cfK + totalEmissiveRadiance;
	outgoingLight = mix( outgoingLight, ${f3({x: SHC.r, y: SHC.g, z: SHC.b})}, 1.0 - smoothstep( 0.3, 0.7, cfSh ) );
`;

let patched = false;
/** switch every MeshStandard / MeshPhysical material to flat Colorfigures tones (call once, before the first render) */
export function patchToon() {
  if (patched) return; patched = true;
  const lib = THREE.ShaderLib.physical;
  const line = 'vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;';
  if (!lib.fragmentShader.includes(line)) { console.warn('ink: physical shader changed, toon patch skipped'); return; }
  lib.fragmentShader = lib.fragmentShader.replace(line, TOON);
  // later clearcoat / sheen additions would add specular back: neutralise them
  lib.fragmentShader = lib.fragmentShader.replace(/outgoingLight = outgoingLight \+ sheenSpecularDirect \+ sheenSpecularIndirect;/, '').replace(/outgoingLight = outgoingLight \* \( 1\.0 - material\.clearcoat \* Fcc \) \+ \( clearcoatSpecularDirect \+ clearcoatSpecularIndirect \) \* material\.clearcoat;/, '');
}

/* ------------------------------------------------------------ the G-buffer: part id, mesh id, depth, normal */
const GBUF = new THREE.ShaderMaterial({
  uniforms: {pid: {value: 0}, mid: {value: 0}},
  side: THREE.DoubleSide,
  vertexShader: `
    #include <common>
    #include <batching_pars_vertex>
    varying vec3 vN; varying float vZ;
    void main() {
      #include <batching_vertex>
      #include <beginnormal_vertex>
      #include <defaultnormal_vertex>
      #include <begin_vertex>
      #include <project_vertex>
      vN = normalize( transformedNormal ); vZ = -mvPosition.z;
    }`,
  fragmentShader: `
    uniform float pid, mid; varying vec3 vN; varying float vZ;
    void main() {
      vec3 n = normalize( vN ); if ( !gl_FrontFacing ) n = -n;
      n /= ( abs( n.x ) + abs( n.y ) + abs( n.z ) );
      vec2 o = n.z >= 0.0 ? n.xy : ( 1.0 - abs( n.yx ) ) * vec2( n.x >= 0.0 ? 1.0 : -1.0, n.y >= 0.0 ? 1.0 : -1.0 );
      o = floor( ( o * 0.5 + 0.5 ) * 255.0 + 0.5 );
      gl_FragColor = vec4( pid, mid, vZ, o.x * 256.0 + o.y );
    }`,
});

// which part a mesh belongs to: the nearest ancestor marked cfRoot, else the top-level object under the scene
function pidOf(o) {
  let p = o;
  while (p.parent && !p.userData.cfRoot && !p.parent.isScene) p = p.parent;
  return p.id;
}
const meshHook = function (r, s, c, g, m) {
  if (m !== GBUF) return;
  GBUF.uniforms.pid.value = this.userData.cfPid ?? pidOf(this);
  GBUF.uniforms.mid.value = this.id;
  GBUF.uniformsNeedUpdate = true;
};
THREE.Mesh.prototype.onBeforeRender = meshHook;

const hidden = [];
function hideForGbuf(scene) {
  scene.traverseVisible((o) => {
    let hide = false;
    if (o.isLine || o.isPoints || o.isSprite) hide = true;
    else if (o.isMesh) {
      const m = o.material;
      if (o.userData.noInk) hide = true;
      else if (Array.isArray(m)) hide = m.every((q) => q.transparent || !q.visible);
      else hide = m.transparent || !m.visible || m.colorWrite === false;
    }
    if (hide) { o.visible = false; hidden.push(o); }
  });
}
function restore() { while (hidden.length) hidden.pop().visible = true; }

/* ------------------------------------------------------------ the ink composite */
const InkShader = {
  uniforms: {
    tDiffuse: {value: null}, tG: {value: null}, res: {value: new THREE.Vector2(1, 1)}, px: {value: 1},
    wob: {value: 0.0}, grain: {value: 1}, ink: {value: new THREE.Vector3(0x23 / 255, 0x1e / 255, 0x16 / 255)}, inkK: {value: 1}, linIn: {value: 0},
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse, tG; uniform vec2 res; uniform float px, wob, grain, inkK, linIn; uniform vec3 ink;
    varying vec2 vUv;
    float hash( vec2 p ) { p = fract( p * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
    float vnoise( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
      return mix( mix( hash( i ), hash( i + vec2( 1, 0 ) ), f.x ), mix( hash( i + vec2( 0, 1 ) ), hash( i + vec2( 1, 1 ) ), f.x ), f.y ); }
    vec3 octDec( float a ) { vec2 o = vec2( floor( a / 256.0 ), mod( a, 256.0 ) ) / 255.0 * 2.0 - 1.0;
      vec3 n = vec3( o, 1.0 - abs( o.x ) - abs( o.y ) ); if ( n.z < 0.0 ) n.xy = ( 1.0 - abs( n.yx ) ) * vec2( n.x >= 0.0 ? 1.0 : -1.0, n.y >= 0.0 ? 1.0 : -1.0 );
      return normalize( n ); }
    void main() {
      vec2 fc = vUv * res;
      // hand-drawn wobble: a slow warp of the whole drawing, about a pixel and a half either way
      vec2 w = vec2( vnoise( fc / ( 34.0 * px ) ), vnoise( fc / ( 34.0 * px ) + 31.7 ) ) - 0.5;
      vec2 uv = vUv + w * wob * px / res;
      vec4 c = texture2D( tDiffuse, uv );
      vec4 g0 = texture2D( tG, uv );
      vec3 n0 = octDec( g0.w );
      float heavy = 0.0, thin = 0.0;
      for ( int i = 0; i < 8; i++ ) {
        float a = float( i ) * 0.785398;
        vec2 d = vec2( cos( a ), sin( a ) ) * px / res;
        // the part's outline: both sides of the edge, out to two pixels (a soft second ring)
        vec4 g1 = texture2D( tG, uv + d );
        vec4 g2 = texture2D( tG, uv + d * 2.0 );
        vec4 g3 = texture2D( tG, uv + d * 3.0 );
        vec4 g4 = texture2D( tG, uv + d * 3.9 );
        // the outline lies outside the nearer part (on whatever is behind it), so thin cables keep their colour
        bool o1 = g1.x != g0.x && ( g1.z < g0.z - 0.5 || g0.x == 0.0 );
        bool o2 = g2.x != g0.x && ( g2.z < g0.z - 0.5 || g0.x == 0.0 );
        bool o3 = g3.x != g0.x && ( g3.z < g0.z - 0.5 || g0.x == 0.0 );
        bool o4 = g4.x != g0.x && ( g4.z < g0.z - 0.5 || g0.x == 0.0 );
        if ( g1.x != g0.x && g1.x != 0.0 && g0.x != 0.0 && abs( g1.z - g0.z ) < 0.5 ) o1 = true;
        if ( o1 || o2 || o3 ) heavy = 1.0;
        else if ( o4 ) heavy = max( heavy, 0.45 );
        if ( g1.x == g0.x && g0.x > 0.0 ) {
          // finer lines inside a part: a different mesh, a fold, or a surface passing behind another (one-sided)
          float t = 0.0;
          if ( g1.y != g0.y && g0.y > g1.y ) t = 0.85;
          vec3 n1 = octDec( g1.w );
          if ( dot( n0, n1 ) < 0.55 && g0.w > g1.w ) t = max( t, 0.8 );
          if ( g0.z - g1.z > max( 1.6, g0.z * 0.006 ) ) t = max( t, 0.95 );
          thin = max( thin, t );
        }
      }
      float a = max( heavy, thin * 0.9 ) * inkK;
      vec3 col = c.rgb;
      // illustration grade: no true blacks, the darkest bodies sit on warm dark greys like the Colorfigures DARK swatch
      if ( linIn > 0.5 ) col = mix( col * 12.92, 1.055 * pow( max( col, 0.0 ), vec3( 0.41667 ) ) - 0.055, step( 0.0031308, col ) ) * ( c.a > 0.0 ? 1.0 : 0.0 );
      float lum = dot( col, vec3( 0.299, 0.587, 0.114 ) );
      col += vec3( 1.0, 0.93, 0.80 ) * 0.17 * pow( 1.0 - clamp( lum, 0.0, 1.0 ), 3.0 ) * ( c.a > 0.0 ? 1.0 : 0.0 );
      col = mix( col, ink, a );
      // paper grain and soft blotches, multiplied like the Colorfigures filter
      float gr = ( vnoise( fc / ( 1.1 * px ) ) * 0.5 + vnoise( fc / ( 2.3 * px ) + 7.1 ) * 0.5 - 0.5 ) * 0.16;
      float bl = ( vnoise( fc / ( 90.0 * px ) + 3.3 ) - 0.5 ) * 0.10;
      col *= 1.0 + ( gr + bl ) * grain;
      gl_FragColor = vec4( col, max( c.a, a ) );
    }`,
};

/** a composer pass: renders the G-buffer of (scene, camera) and inks the frame it receives */
export class InkPass extends Pass {
  constructor(scene, camera) {
    super();
    this.scene = scene; this.camera = camera;
    this.g = new THREE.WebGLRenderTarget(4, 4, {type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true});
    this.mat = new THREE.ShaderMaterial({...InkShader, uniforms: THREE.UniformsUtils.clone(InkShader.uniforms)});
    this.mat.uniforms.tG.value = this.g.texture;
    this.quad = new FullScreenQuad(this.mat);
    this.px = 1;
  }
  setSize(w, h) { this.g.setSize(w, h); this.mat.uniforms.res.value.set(w, h); }
  renderG(renderer) {
    const sc = this.scene, bg = sc.background, ov = sc.overrideMaterial, fog = sc.fog;
    const cc = new THREE.Color(); renderer.getClearColor(cc); const ca = renderer.getClearAlpha();
    sc.background = null; sc.overrideMaterial = GBUF; sc.fog = null;
    const sm = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
    hideForGbuf(sc);
    renderer.setRenderTarget(this.g);
    renderer.setClearColor(0x000000, 0); renderer.clear(true, true, false);
    renderer.render(sc, this.camera);
    restore();
    renderer.shadowMap.autoUpdate = sm;
    sc.background = bg; sc.overrideMaterial = ov; sc.fog = fog;
    renderer.setClearColor(cc, ca);
  }
  render(renderer, writeBuffer, readBuffer) {
    this.renderG(renderer);
    this.mat.uniforms.tDiffuse.value = readBuffer.texture;
    this.mat.uniforms.px.value = this.px;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    if (this.clear) renderer.clear();
    this.quad.render(renderer);
  }
  dispose() { this.g.dispose(); this.mat.dispose(); this.quad.dispose(); }
}

/** a tiny inked renderer for thumbnails: draw (scene, camera) into the renderer's canvas with ink and grain */
export function createInkShot(renderer) {
  const color = new THREE.WebGLRenderTarget(4, 4, {type: THREE.HalfFloatType, samples: 4});
  const out = new THREE.WebGLRenderTarget(4, 4, {type: THREE.HalfFloatType});
  let pass = null;
  return (scene, camera) => {
    const s = renderer.getDrawingBufferSize(new THREE.Vector2());
    if (!pass) { pass = new InkPass(scene, camera); pass.renderToScreen = true; }
    pass.scene = scene; pass.camera = camera;
    if (color.width !== s.x || color.height !== s.y) { color.setSize(s.x, s.y); out.setSize(s.x, s.y); pass.setSize(s.x, s.y); }
    pass.px = renderer.getPixelRatio();
    pass.mat.uniforms.grain.value = 0.6; pass.mat.uniforms.linIn.value = 1;
    renderer.setRenderTarget(color); renderer.clear(); renderer.render(scene, camera);
    // the color target holds linear values; the quad writes straight to the canvas, so the pass encodes to sRGB
    pass.render(renderer, out, color);
    renderer.setRenderTarget(null);
  };
}
