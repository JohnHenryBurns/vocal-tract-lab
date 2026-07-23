// How much of English can this tube actually reach?
// Fast: LPC on the tract's impulse response instead of a brute-force DFT.
const { Tract, SR, N } = require("./tract.js");

function shapeFromNorm(p, n = N) {
  const d = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    let v = p.base;
    const x = (u - p.cPos) / p.cWidth;
    if (Math.abs(x) < 1) v = p.base - (p.base - p.cDiam) * 0.5 * (1 + Math.cos(Math.PI * x));
    d[i] = v;
  }
  for (let i = Math.floor(n * 0.93); i < n; i++) d[i] = Math.min(d[i], p.lip);
  d[0] = Math.min(d[0], 0.8);
  return d;
}

function formantsLPC(diam, order = 12) {
  const t = new Tract();
  t.diam.set(diam); t.calcReflections();
  const L = 2048, F = 4;
  const ir = new Float64Array(L);
  ir[0] = t.sample(1);
  for (let i = 1; i < L; i++) ir[i] = t.sample(0);
  const M = Math.floor(L / F), s = new Float64Array(M);
  for (let i = 0; i < M; i++) { let a = 0; for (let k = 0; k < F; k++) a += ir[i*F+k]; s[i] = a/F; }
  const sr = SR / F;
  const r = new Float64Array(order + 1);
  for (let k = 0; k <= order; k++) { let a = 0; for (let i = 0; i < M - k; i++) a += s[i]*s[i+k]; r[k] = a; }
  if (!(r[0] > 0)) return [];
  const a = new Float64Array(order + 1), tmp = new Float64Array(order + 1);
  let E = r[0];
  for (let i = 1; i <= order; i++) {
    let acc = r[i];
    for (let j = 1; j < i; j++) acc -= a[j]*r[i-j];
    const k = acc / E;
    tmp.set(a); tmp[i] = k;
    for (let j = 1; j < i; j++) tmp[j] = a[j] - k*a[i-j];
    a.set(tmp); E *= (1 - k*k);
    if (!(E > 0)) break;
  }
  const peaks = [];
  let pm2 = 0, pm1 = 0;
  for (let f = 150; f <= 3600; f += 12) {
    const w = 2*Math.PI*f/sr;
    let re = 1, im = 0;
    for (let j = 1; j <= order; j++) { re -= a[j]*Math.cos(w*j); im += a[j]*Math.sin(w*j); }
    const mag = 1/Math.hypot(re, im);
    if (pm1 > pm2 && pm1 > mag) peaks.push(f - 12);
    pm2 = pm1; pm1 = mag;
  }
  return peaks.slice(0, 5);
}

const VOWELS = [
  ["i","heed",270,2290],["ɪ","hid",390,1990],["ɛ","head",530,1840],["æ","had",660,1720],
  ["ʌ","hud",640,1190],["ɑ","hod",730,1090],["ɔ","hawed",570,840],["ʊ","hood",440,1020],
  ["u","who'd",300,870],["ɝ","heard",490,1350],["ə","sofa",500,1500],
];

function solve(f1, f2, iters = 1200) {
  let best = null, bestErr = 1e9, t = 987654321;
  const rnd = () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t>>>15, 1|t);
                      r = r + Math.imul(r ^ r>>>7, 61|r) ^ r; return ((r ^ r>>>14) >>> 0)/4294967296; };
  for (let k = 0; k < iters; k++) {
    // plausibility floor: a vowel is an OPEN tract. Below ~0.35 you have a consonant,
    // and the solver will happily hand you a sealed tube that resonates on paper.
    const p = { base:1.1+rnd()*1.7, cPos:0.08+rnd()*0.78, cDiam:0.38+rnd()*1.3,
                cWidth:0.08+rnd()*0.30, lip:0.35+rnd()*2.0 };
    const f = formantsLPC(shapeFromNorm(p));
    if (f.length < 2) continue;
    const e = Math.pow((f[0]-f1)/f1,2) + Math.pow((f[1]-f2)/f2,2);
    if (e < bestErr) { bestErr = e; best = { p, f }; }
  }
  return { ...best, err: Math.sqrt(bestErr)*100 };
}

if (require.main === module) {
  console.log("Solving the English vowel space against Peterson & Barney (1952):\n");
  console.log("  vowel          target       reached      error   verdict");
  const out = {};
  for (const [ipa, word, f1, f2] of VOWELS) {
    const r = solve(f1, f2);
    const ok = r.err < 8 ? "good" : r.err < 16 ? "close" : "beyond this model";
    console.log(`  ${ipa} (${word})`.padEnd(16) + `${f1}/${f2}`.padEnd(13) +
                `${r.f[0]}/${r.f[1]}`.padEnd(13) + `${r.err.toFixed(1)}%`.padEnd(8) + ok);
    out[ipa] = { base:+r.p.base.toFixed(3), cPos:+r.p.cPos.toFixed(3), cDiam:+r.p.cDiam.toFixed(3),
                 cWidth:+r.p.cWidth.toFixed(3), lip:+r.p.lip.toFixed(3), err:+r.err.toFixed(1) };
  }
  require("fs").writeFileSync("/home/claude/vowels.json", JSON.stringify(out, null, 1));
  console.log("\nwritten to vowels.json");
}
module.exports = { shapeFromNorm, formantsLPC };
