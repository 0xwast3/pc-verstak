// AUDIO · a calm procedural lo-fi loop (warm electric-piano chords, a round bass, a soft swung kit, vinyl crackle,
// now and then a few melody notes through a tape delay) and the workbench sounds. Everything is synthesised with
// WebAudio, nothing is loaded. The context starts on the first click, as browsers require.
let ctx = null, master, musicBus, sfxBus, lp, crackleSrc, fanGain, fanSrc;
let playing = false, timer = null, nextT = 0, step = 0, bar = 0;
const BPM = 74, SPB = 60 / BPM, STEP = SPB / 4, SWING = 0.17;
let musicVol = 0.62;

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
// a jazzy four-bar loop and its variation: Fmaj9 · Em7 · Dm9 · Cmaj7(add6) | Fmaj7 · E7(b9) · Am9 · G13sus
const CHORDS = [
  [[53, 57, 60, 64, 67], [52, 55, 59, 62, 66], [50, 53, 57, 60, 64], [48, 52, 55, 57, 59]],
  [[53, 57, 60, 64, 69], [52, 56, 59, 62, 65], [45, 52, 55, 59, 60], [43, 50, 53, 57, 60]],
];
const BASS = [[41, 40, 38, 36], [41, 40, 33, 31]];
const PENTA = [72, 74, 76, 79, 81, 84, 86];

function noiseBuffer(sec, kind) {
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    else if (kind === 'crackle') { d[i] = (Math.random() < 0.0006 ? (Math.random() * 2 - 1) * 0.9 : 0) + w * 0.012; }
    else d[i] = w;
  }
  return b;
}
let WHITE = null;

export function initAudio() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
  master.connect(comp).connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.gain.value = 0;
  lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; lp.Q.value = 0.4;
  // tape warmth: a soft saturation
  const sat = ctx.createWaveShaper(); const k = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; k[i] = Math.tanh(x * 1.6) / Math.tanh(1.6); } sat.curve = k;
  musicBus.connect(sat).connect(lp).connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
  WHITE = noiseBuffer(2, 'white');
  // vinyl crackle and hiss, always under the music
  crackleSrc = ctx.createBufferSource(); crackleSrc.buffer = noiseBuffer(4, 'crackle'); crackleSrc.loop = true;
  const ch = ctx.createBiquadFilter(); ch.type = 'highpass'; ch.frequency.value = 900;
  const cg = ctx.createGain(); cg.gain.value = 0.5;
  crackleSrc.connect(ch).connect(cg).connect(musicBus); crackleSrc.start();
  // the fan hum for the powered bench
  fanSrc = ctx.createBufferSource(); fanSrc.buffer = noiseBuffer(3, 'brown'); fanSrc.loop = true;
  const fb = ctx.createBiquadFilter(); fb.type = 'bandpass'; fb.frequency.value = 420; fb.Q.value = 0.6;
  fanGain = ctx.createGain(); fanGain.gain.value = 0;
  fanSrc.connect(fb).connect(fanGain).connect(sfxBus); fanSrc.start();
  return ctx;
}
export const audioReady = () => !!ctx && ctx.state === 'running';

/* ------------------------------------------------------------ instruments */
function keys(t, notes, vel = 1, len = 2.2) {
  notes.forEach((n, i) => {
    const t0 = t + i * 0.018 + Math.random() * 0.01, f = midi(n);
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2.001;
    m.type = 'sine'; m.frequency.value = f * 1.0; mg.gain.setValueAtTime(f * 1.4, t0); mg.gain.exponentialRampToValueAtTime(f * 0.05, t0 + 0.6);
    m.connect(mg).connect(o.frequency);
    const g2 = ctx.createGain(); g2.gain.value = 0.12;
    const peak = 0.07 * vel / Math.sqrt(notes.length) * 2;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0 + 0.012); g.gain.exponentialRampToValueAtTime(peak * 0.35, t0 + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    // tremolo, the electric-piano wobble
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 4.6; lg.gain.value = peak * 0.18; lfo.connect(lg).connect(g.gain);
    o.connect(g); o2.connect(g2).connect(g); g.connect(musicBus);
    [o, o2, m, lfo].forEach((x) => { x.start(t0); x.stop(t0 + len + 0.05); });
  });
}
function bass(t, n, len) {
  const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  o.type = 'triangle'; o.frequency.value = midi(n);
  f.type = 'lowpass'; f.frequency.value = 420;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + 0.02); g.gain.exponentialRampToValueAtTime(0.08, t + len * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(f).connect(g).connect(musicBus); o.start(t); o.stop(t + len + 0.05);
}
function kick(t, v = 1) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(118, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
  g.gain.setValueAtTime(0.5 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
  o.connect(g).connect(musicBus); o.start(t); o.stop(t + 0.4);
}
function snare(t, v = 1) {
  const n = ctx.createBufferSource(); n.buffer = WHITE;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = 0.8;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.16 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  n.connect(f).connect(g).connect(musicBus); n.start(t, Math.random()); n.stop(t + 0.25);
  const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = 190; og.gain.setValueAtTime(0.08 * v, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  o.connect(og).connect(musicBus); o.start(t); o.stop(t + 0.12);
}
function hat(t, v = 1, open = false) {
  const n = ctx.createBufferSource(); n.buffer = WHITE;
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7200;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.045 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.22 : 0.05));
  n.connect(f).connect(g).connect(musicBus); n.start(t, Math.random()); n.stop(t + 0.25);
}
let delayIn = null;
function lead(t, n) {
  if (!delayIn) {
    delayIn = ctx.createGain(); const d = ctx.createDelay(1.5), fb = ctx.createGain(), df = ctx.createBiquadFilter();
    d.delayTime.value = SPB * 0.75; fb.gain.value = 0.38; df.type = 'lowpass'; df.frequency.value = 1800;
    delayIn.connect(musicBus); delayIn.connect(d); d.connect(df).connect(fb).connect(d); df.connect(musicBus);
  }
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = midi(n);
  const v = ctx.createOscillator(), vg = ctx.createGain(); v.frequency.value = 5; vg.gain.value = 2.2; v.connect(vg).connect(o.frequency);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  o.connect(g).connect(delayIn); [o, v].forEach((x) => { x.start(t); x.stop(t + 1.2); });
}

/* ------------------------------------------------------------ the sequencer */
function schedule() {
  while (nextT < ctx.currentTime + 0.25) {
    const s = step % 16, beat = Math.floor(s / 4), half = Math.floor(bar / 4) % 2, chordI = bar % 4;
    const t = nextT + (s % 2 ? SWING * STEP : 0);
    if (s === 0) { keys(t, CHORDS[half][chordI], 1, SPB * 3.6); bass(t, BASS[half][chordI], SPB * 1.8); }
    if (s === 6) keys(t, CHORDS[half][chordI].slice(1, 4), 0.55, SPB * 1.4);
    if (s === 8) bass(t, BASS[half][chordI] + (Math.random() < 0.5 ? 7 : 12), SPB * 1.6);
    if (s === 0 || (s === 10 && Math.random() < 0.6) || (s === 7 && Math.random() < 0.25)) kick(t, s === 0 ? 1 : 0.7);
    if (s === 4 || s === 12) snare(t, 0.9);
    if (s % 2 === 0 && Math.random() < 0.92) hat(t, s % 4 === 0 ? 1 : 0.6, s === 14 && Math.random() < 0.3);
    if (bar % 2 === 1 && s % 3 === 0 && Math.random() < 0.28) lead(t, PENTA[Math.floor(Math.random() * PENTA.length)]);
    nextT += STEP; step++;
    if (step % 16 === 0) bar++;
  }
}
export function setMusic(on) {
  if (!ctx) initAudio();
  if (!ctx) return false;
  if (ctx.state !== 'running') ctx.resume();
  playing = on;
  const t = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(t); musicBus.gain.setValueAtTime(musicBus.gain.value, t);
  musicBus.gain.linearRampToValueAtTime(on ? musicVol : 0, t + (on ? 1.6 : 0.6));
  if (on && !timer) { nextT = ctx.currentTime + 0.1; timer = setInterval(schedule, 60); }
  if (!on && timer) setTimeout(() => { if (!playing && timer) { clearInterval(timer); timer = null; } }, 700);
  return true;
}
export const musicOn = () => playing;

/* ------------------------------------------------------------ workbench sounds */
function blip(f, len, type = 'sine', vol = 0.2, t = 0, glide) {
  if (!ctx) return;
  const t0 = ctx.currentTime + t, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0); if (glide) o.frequency.exponentialRampToValueAtTime(glide, t0 + len);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
  o.connect(g).connect(sfxBus); o.start(t0); o.stop(t0 + len + 0.02);
}
function thump(f = 160, vol = 0.35, t = 0, nz = 0.2) {
  if (!ctx) return;
  const t0 = ctx.currentTime + t;
  blip(f, 0.12, 'sine', vol, t, f * 0.5);
  const n = ctx.createBufferSource(); n.buffer = WHITE; const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1400;
  const g = ctx.createGain(); g.gain.setValueAtTime(nz, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
  n.connect(fl).connect(g).connect(sfxBus); n.start(t0, Math.random()); n.stop(t0 + 0.08);
}
export const sfx = {
  click: () => blip(1250, 0.04, 'sine', 0.08),
  hover: () => blip(2100, 0.02, 'sine', 0.02),
  pick: () => { blip(520, 0.09, 'triangle', 0.12, 0, 780); },
  drop: () => thump(150, 0.28, 0, 0.12),
  snap: () => { thump(220, 0.3); blip(2400, 0.03, 'square', 0.04, 0.03); },
  latch: () => { blip(3200, 0.02, 'square', 0.05); blip(2600, 0.02, 'square', 0.05, 0.05); },
  error: () => { blip(196, 0.14, 'square', 0.06); blip(156, 0.2, 'square', 0.06, 0.15); },
  ok: () => { [0, 4, 7, 12].forEach((n, i) => blip(midi(72 + n), 0.5, 'sine', 0.07, i * 0.07)); },
  beep: () => blip(1000, 0.2, 'square', 0.05),
  power: () => { blip(60, 1.2, 'sawtooth', 0.05, 0, 240); thump(90, 0.3); },
  whoosh: () => { if (!ctx) return; const t0 = ctx.currentTime; const n = ctx.createBufferSource(); n.buffer = WHITE; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(300, t0); f.frequency.exponentialRampToValueAtTime(2400, t0 + 0.35); const g = ctx.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.08, t0 + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45); n.connect(f).connect(g).connect(sfxBus); n.start(t0, Math.random()); n.stop(t0 + 0.5); },
};
export function setFans(level) {
  if (!ctx) return;
  const t = ctx.currentTime; fanGain.gain.cancelScheduledValues(t); fanGain.gain.setValueAtTime(fanGain.gain.value, t); fanGain.gain.linearRampToValueAtTime(level * 0.35, t + 1.2);
}
