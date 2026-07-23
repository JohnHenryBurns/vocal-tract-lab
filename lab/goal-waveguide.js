// "GOAL" through a Kelly–Lochbaum waveguide.
// We do NOT schedule formants. We schedule TONGUE POSITIONS — the tube shape —
// and the formants (and the coarticulation between them) fall out of the physics.
const fs = require("fs");
const { Tract, rosenberg, writeWav, SR, N } = require("./tract.js");
const { shape } = require("./solve-shapes.js");

const P = JSON.parse(fs.readFileSync("/home/claude/shapes.json", "utf8"));

// articulatory targets, solved against real formant data
const OH = shape(P.oh), AH = shape(P.ah), LL = shape(P.l);

// /g/ = the /o/ shape with a complete velar closure
const G = Float64Array.from(OH);
const VELAR = 25;                                  // velar place of articulation
for (let i = VELAR - 3; i <= VELAR + 3; i++) {
  const k = 1 - Math.abs(i - VELAR) / 4;
  G[i] = Math.max(0.02, OH[i] * (1 - k) + 0.02 * k);
}

const lerpArr = (a, b, t, out) => { for (let i = 0; i < N; i++) out[i] = a[i] + (b[i] - a[i]) * t; };
const smooth = t => t * t * (3 - 2 * t);           // ease — articulators have mass

// the articulation schedule, in seconds
const D = 2.9;
const KEY = [
  { t: 0.000, s: G  },   // closure
  { t: 0.055, s: G  },   // hold the stop
  { t: 0.105, s: OH },   // release into the vowel
  { t: 1.150, s: OH },   // hold "oh"
  { t: 1.330, s: AH },   // jaw opens
  { t: 2.150, s: AH },   // hold "aah"
  { t: 2.330, s: LL },   // tongue to the ridge
  { t: 2.900, s: LL },   // hold the lateral
];

function shapeAt(time, out) {
  if (time <= KEY[0].t) { out.set(KEY[0].s); return; }
  for (let i = 1; i < KEY.length; i++) {
    if (time <= KEY[i].t) {
      const a = KEY[i - 1], b = KEY[i];
      lerpArr(a.s, b.s, smooth((time - a.t) / (b.t - a.t)), out);
      return;
    }
  }
  out.set(KEY[KEY.length - 1].s);
}

// pitch: climbs, strains, falls. Steady — a shout is not a bleat.
function f0At(t) {
  const pts = [[0, 208], [0.12, 244], [0.55, 252], [2.0, 249], [2.45, 238], [2.75, 205], [3.1, 182]];
  for (let i = 1; i < pts.length; i++)
    if (t <= pts[i][0]) {
      const [t0, v0] = pts[i - 1], [t1, v1] = pts[i];
      return v0 + (v1 - v0) * (t - t0) / (t1 - t0);
    }
  return 182;
}

function render() {
  const total = Math.floor(SR * (D + 0.35));
  const out = new Float64Array(total);
  const tract = new Tract();
  const cur = new Float64Array(N);
  let phase = 0, jit = 0, jitTarget = 0, jitCd = 0;
  let prevClosure = 1;

  for (let n = 0; n < total; n++) {
    const t = n / SR;
    shapeAt(t, cur);
    tract.diam.set(cur);
    tract.calcReflections();

    // --- glottal source: Rosenberg flow pulse, gentle jitter ---
    if (--jitCd <= 0) { jitTarget = (Math.random() * 2 - 1); jitCd = Math.floor(SR * 0.025); }
    jit += (jitTarget - jit) * 0.004;
    const f0 = f0At(t) * (1 + jit * 0.004);
    phase += f0 / SR; if (phase >= 1) phase -= 1;

    // voicing amplitude: a voice bar during the stop, full after release
    const closure = cur[VELAR];
    let amp = 1;
    if (t < 0.055) amp = 0.18;                       // voiced closure — the /g/ "voice bar"
    else if (t < 0.115) amp = 0.18 + 0.82 * (t - 0.055) / 0.06;
    if (t > D - 0.35) amp *= Math.max(0, (D + 0.05 - t) / 0.4);

    let src = rosenberg(phase) * amp * 0.9;

    // --- aspiration, modulated by the glottal cycle (pulsatile, not steady hiss) ---
    src += (Math.random() * 2 - 1) * 0.012 * rosenberg(phase) * amp;

    let y = tract.sample(src);

    // --- release burst: turbulence as the closure springs open ---
    // physically motivated — fast area change at a narrow constriction is a jet
    const dA = closure - prevClosure;
    if (closure < 0.6 && dA > 0.0008) {
      const burst = (Math.random() * 2 - 1) * dA * 26;
      tract.R[VELAR] += burst; tract.L[VELAR] += burst;
    }
    prevClosure = closure;

    out[n] = y;
  }

  // DC block + normalize
  let prev = 0, prevY = 0;
  for (let n = 0; n < total; n++) {
    const x = out[n];
    const y = x - prev + 0.995 * prevY;
    prev = x; prevY = y; out[n] = y;
  }
  let peak = 0; for (let n = 0; n < total; n++) peak = Math.max(peak, Math.abs(out[n]));
  if (peak > 0) for (let n = 0; n < total; n++) out[n] = out[n] / peak * 0.94;
  return out;
}

if (require.main === module) {
  const pcm = render();
  writeWav(process.argv[2] || "/home/claude/goal-waveguide.wav", pcm);
  let rms = 0; for (const v of pcm) rms += v * v;
  console.log(`rendered ${(pcm.length / SR).toFixed(2)}s  rms ${Math.sqrt(rms / pcm.length).toFixed(3)}`);
}
