// An ARTICULATORY layer over the waveguide.
// Instead of "a constriction somewhere", the tract is shaped by things a person has:
// a jaw, a tongue body, a tongue tip, and lips. Every phoneme uses the SAME parameters.
const { Tract, SR, N } = require("./tract.js");

// resting tract: pharynx narrower, oral cavity wider — the neutral schwa
function restingDiam(n = N) {
  const d = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    d[i] = u < 0.30 ? 1.45
         : u < 0.62 ? 1.45 + (u - 0.30) / 0.32 * 0.75
         : 2.20;
  }
  return d;
}

// A hump on the tract wall. The tongue is a body, so its influence is smooth and wide;
// the tip is smaller and sharper. Neither can act at two places at once.
function hump(u, centre, width, height) {
  const x = (u - centre) / width;
  if (Math.abs(x) >= 1) return 0;
  return height * 0.5 * (1 + Math.cos(Math.PI * x));
}

/**
 * ART = {
 *   jaw:      0 (closed) .. 1 (open)   — scales the whole oral cavity
 *   bodyPos:  0.15 .. 0.85             — where along the tract the tongue body sits
 *   bodyHi:   0 .. 1                   — how close the body comes to the roof
 *   tipPos:   0.70 .. 0.95             — where the tip is
 *   tipHi:    0 .. 1                   — how close the tip comes to the ridge
 *   lip:      0 .. 1                   — 0 shut, 1 wide
 * }
 */
function articulate(A, n = N) {
  const d = restingDiam(n);
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    // jaw opens the oral cavity only — it cannot change the pharynx
    if (u > 0.45) d[i] *= 0.72 + 0.55 * A.jaw;
    // the tongue body: wide, smooth, one place at a time
    d[i] -= hump(u, A.bodyPos, 0.30, A.bodyHi * 2.05);
    // the tip: narrow, only near the ridge
    d[i] -= hump(u, A.tipPos, 0.085, A.tipHi * 2.3);
    d[i] = Math.max(0.02, d[i]);
  }
  // lips terminate the tube
  const lipD = 0.18 + 2.5 * A.lip;
  for (let i = Math.floor(n * 0.94); i < n; i++) d[i] = Math.min(d[i], lipD);
  d[0] = Math.min(d[0], 0.8);
  return d;
}

// ---- formants from an area function, via LPC on the impulse response ----
function formants(diam, order = 12) {
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
  for (let k = 0; k <= order; k++) { let a = 0; for (let i = 0; i < M-k; i++) a += s[i]*s[i+k]; r[k] = a; }
  if (!(r[0] > 0)) return [];
  const a = new Float64Array(order+1), tmp = new Float64Array(order+1);
  let E = r[0];
  for (let i = 1; i <= order; i++) {
    let acc = r[i];
    for (let j = 1; j < i; j++) acc -= a[j]*r[i-j];
    const k = acc/E;
    tmp.set(a); tmp[i] = k;
    for (let j = 1; j < i; j++) tmp[j] = a[j] - k*a[i-j];
    a.set(tmp); E *= (1-k*k);
    if (!(E > 0)) break;
  }
  const pk = []; let pm2 = 0, pm1 = 0;
  for (let f = 150; f <= 3600; f += 12) {
    const w = 2*Math.PI*f/sr;
    let re = 1, im = 0;
    for (let j = 1; j <= order; j++) { re -= a[j]*Math.cos(w*j); im += a[j]*Math.sin(w*j); }
    const mag = 1/Math.hypot(re, im);
    if (pm1 > pm2 && pm1 > mag) pk.push(f-12);
    pm2 = pm1; pm1 = mag;
  }
  return pk.slice(0, 4);
}

module.exports = { articulate, restingDiam, formants };

// ================= can articulators reach the vowels? =================
if (require.main === module) {
  const TARGETS = [
    ["i","heed",270,2290],["ɪ","hid",390,1990],["ɛ","head",530,1840],["æ","had",660,1720],
    ["ʌ","hud",640,1190],["ɑ","hod",730,1090],["ɔ","hawed",570,840],["ʊ","hood",440,1020],
    ["u","who'd",300,870],["ɝ","heard",490,1350],["ə","sofa",500,1500],
  ];
  function solve(f1, f2, iters = 1500) {
    let best = null, bestErr = 1e9, t = 20260723;
    const rnd = () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t>>>15, 1|t);
                        r = r + Math.imul(r ^ r>>>7, 61|r) ^ r; return ((r ^ r>>>14)>>>0)/4294967296; };
    for (let k = 0; k < iters; k++) {
      const A = { jaw:rnd(), bodyPos:0.15+rnd()*0.70, bodyHi:rnd()*0.95,
                  tipPos:0.70+rnd()*0.25, tipHi:rnd()*0.35, lip:0.08+rnd()*0.92 };
      const f = formants(articulate(A));
      if (f.length < 2) continue;
      const e = Math.pow((f[0]-f1)/f1,2) + Math.pow((f[1]-f2)/f2,2);
      if (e < bestErr) { bestErr = e; best = { A, f }; }
    }
    return { ...best, err: Math.sqrt(bestErr)*100 };
  }
  console.log("Can a jaw, a tongue and lips reach the English vowels?\n");
  console.log("  vowel        target        reached       error   articulation");
  const out = {};
  let good = 0;
  for (const [ipa, word, f1, f2] of TARGETS) {
    const r = solve(f1, f2);
    if (r.err < 10) good++;
    console.log(`  ${ipa} (${word})`.padEnd(15) +
      `${f1}/${f2}`.padEnd(14) + `${r.f[0]}/${r.f[1]}`.padEnd(14) +
      `${r.err.toFixed(1)}%`.padEnd(8) +
      `jaw ${r.A.jaw.toFixed(2)}  body ${r.A.bodyPos.toFixed(2)}@${r.A.bodyHi.toFixed(2)}  lip ${r.A.lip.toFixed(2)}`);
    out[ipa] = Object.fromEntries(Object.entries(r.A).map(([k,v]) => [k, +v.toFixed(3)]));
  }
  console.log(`\n  ${good}/${TARGETS.length} within 10%`);
  require("fs").writeFileSync("/home/claude/artic-vowels.json", JSON.stringify(out, null, 1));
}
