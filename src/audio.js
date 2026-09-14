// audio.js — synthesised SFX (no files) plus one music track. An enemy never swings with the hero's sound.
let ctx = null, master = null, sfxGain = null, musGain = null;
let musicSrc = null, musicBuf = null, musicName = null, musicGen = 0;
const S = { sfx: 0.8, music: 0.5, muted: false };
export const settings = S;

export function boot() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.connect(ctx.destination);
    sfxGain = ctx.createGain(); sfxGain.connect(master); musGain = ctx.createGain(); musGain.connect(master);
    apply();
  } catch (e) { ctx = null; }
}
export function apply() { if (!ctx) return; master.gain.value = S.muted ? 0 : 1; sfxGain.gain.value = S.sfx; musGain.gain.value = S.music; }

function tone(freq, dur, type = 'square', vol = 0.3, slide = 0, attack = 0.005) {
  if (!ctx) return; const t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + dur + 0.02);
}
let noiseBuf = null;
function noise(dur, vol = 0.3, lp = 4000, hp = 100) {
  if (!ctx) return; const t = ctx.currentTime;
  if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
  const h = ctx.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(h); h.connect(g); g.connect(sfxGain); s.start(t); s.stop(t + dur + 0.02);
}
export const sfx = {
  slash(i = 0) { noise(0.09, 0.25, 6000 - i * 800, 900); tone(520 + i * 60, 0.06, 'triangle', 0.08, -200); },
  heavy() { noise(0.16, 0.35, 3500, 300); tone(180, 0.18, 'sawtooth', 0.15, -80); },
  charge() { tone(220, 0.3, 'triangle', 0.07, 260); },
  hit(mat = 'flesh') { if (mat === 'wood') { tone(240, 0.06, 'square', 0.18, -100); noise(0.05, 0.2, 2500, 200); } else if (mat === 'stone') { noise(0.08, 0.3, 1800, 100); tone(120, 0.08, 'square', 0.15, -40); } else { noise(0.07, 0.3, 2200, 150); tone(160, 0.07, 'sawtooth', 0.12, -60); } },
  hurt() { tone(300, 0.14, 'square', 0.22, -160); noise(0.1, 0.2, 1500, 100); },
  parry() { tone(1400, 0.12, 'square', 0.18, 400); tone(2100, 0.2, 'triangle', 0.12, 300); noise(0.05, 0.15, 8000, 2000); },
  guard() { tone(200, 0.08, 'square', 0.18, -60); noise(0.06, 0.2, 3000, 300); },
  guardBreak() { tone(140, 0.3, 'sawtooth', 0.22, -100); noise(0.2, 0.25, 1200, 80); },
  roll() { noise(0.12, 0.12, 1200, 80); },
  step() { noise(0.03, 0.05, 900, 100); },
  coin() { tone(1320, 0.07, 'square', 0.1); tone(1760, 0.12, 'square', 0.08, 0, 0.03); },
  heart() { tone(660, 0.1, 'triangle', 0.15); tone(880, 0.15, 'triangle', 0.15, 0, 0.08); tone(1320, 0.2, 'triangle', 0.12, 0, 0.16); },
  key() { tone(988, 0.08, 'square', 0.12); tone(1319, 0.14, 'square', 0.1, 0, 0.06); },
  chest() { tone(392, 0.1, 'square', 0.12); tone(523, 0.1, 'square', 0.12, 0, 0.1); tone(659, 0.1, 'square', 0.12, 0, 0.2); tone(784, 0.25, 'square', 0.12, 0, 0.3); },
  unlock() { tone(220, 0.08, 'square', 0.15); noise(0.08, 0.15, 3000, 500); tone(330, 0.15, 'square', 0.12, 0, 0.1); },
  seal() { noise(0.2, 0.3, 900, 60); tone(90, 0.25, 'square', 0.2, -30); },
  open() { tone(330, 0.12, 'triangle', 0.15); tone(495, 0.12, 'triangle', 0.15, 0, 0.1); tone(660, 0.3, 'triangle', 0.15, 0, 0.2); },
  tell(kind = 0) { const f = [420, 300, 520, 360][kind & 3]; tone(f, 0.16, 'triangle', 0.14, 120); },
  tellBig() { tone(110, 0.35, 'sawtooth', 0.2, 60); noise(0.2, 0.15, 500, 40); },
  lunge() { noise(0.1, 0.2, 4000, 500); },
  bite() { noise(0.05, 0.25, 3000, 400); tone(700, 0.04, 'square', 0.1, -300); },
  arrow() { noise(0.12, 0.18, 7000, 1500); tone(900, 0.1, 'triangle', 0.06, -500); },
  shove() { noise(0.1, 0.3, 1500, 100); tone(130, 0.1, 'square', 0.15, -40); },
  dig() { noise(0.18, 0.3, 1000, 60); tone(80, 0.15, 'sawtooth', 0.1, -20); },
  burrow() { noise(0.4, 0.2, 600, 40); },
  erupt() { noise(0.25, 0.4, 1500, 60); tone(70, 0.3, 'sawtooth', 0.2, -30); },
  rock() { noise(0.15, 0.4, 1200, 80); tone(60, 0.2, 'square', 0.25, -20); },
  quake() { noise(0.6, 0.3, 300, 30); tone(45, 0.6, 'sawtooth', 0.25, -10); },
  roar() { tone(90, 0.5, 'sawtooth', 0.25, 40); tone(135, 0.5, 'square', 0.12, 30); noise(0.4, 0.2, 700, 60); },
  chargeRun() { noise(0.3, 0.25, 800, 80); },
  wallHit() { noise(0.3, 0.45, 1500, 60); tone(50, 0.35, 'square', 0.3, -15); },
  die(big = false) { if (big) { tone(160, 0.6, 'sawtooth', 0.25, -120); noise(0.5, 0.3, 800, 60); } else { tone(260, 0.2, 'square', 0.15, -180); noise(0.12, 0.2, 2000, 200); } },
  levelup() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'square', 0.12, 0, 0.01 + i * 0.09)); },
  skill() { tone(880, 0.08, 'square', 0.12); tone(1175, 0.16, 'square', 0.1, 0, 0.07); },
  menu() { tone(600, 0.04, 'square', 0.08); },
  take() { tone(800, 0.06, 'square', 0.1); tone(1200, 0.08, 'square', 0.08, 0, 0.05); },
  back() { tone(400, 0.06, 'square', 0.08, -100); },
  death() { [330, 262, 196, 131].forEach((f, i) => tone(f, 0.4, 'triangle', 0.15, 0, 0.01 + i * 0.25)); },
  keeping() { [392, 494, 587, 784, 988].forEach((f, i) => tone(f, 0.5, 'triangle', 0.14, 0, 0.01 + i * 0.12)); },
  fall() { tone(500, 0.4, 'triangle', 0.15, -400); },
  claw() { noise(0.2, 0.3, 5000, 800); tone(300, 0.2, 'sawtooth', 0.12, -200); },
};

// ---- music: one decoded track, chained sources (long buffers loop into static on Chrome) ----
export async function playMusic(url, name) {
  if (!ctx) return;
  if (musicName === name && musicSrc) return;
  stopMusic(); musicName = name; const gen = ++musicGen;
  try {
    const res = await fetch(url); const arr = await res.arrayBuffer(); const buf = await ctx.decodeAudioData(arr);
    if (gen !== musicGen) return; musicBuf = buf;
    const start = (at) => { const s = ctx.createBufferSource(); s.buffer = buf; s.connect(musGain); s.start(at); musicSrc = s; const next = at + buf.duration; s.onended = () => {}; schedule(next, gen); };
    const schedule = (next, g) => { const wait = (next - ctx.currentTime - 0.6) * 1000; setTimeout(() => { if (g === musicGen) start(next); }, Math.max(0, wait)); };
    start(ctx.currentTime + 0.05);
  } catch (e) { /* no music is not an error */ }
}
export function stopMusic() { musicGen++; if (musicSrc) { try { musicSrc.stop(); } catch (e) {} musicSrc = null; } musicName = null; }
export function musicPlaying() { return !!musicSrc; }
