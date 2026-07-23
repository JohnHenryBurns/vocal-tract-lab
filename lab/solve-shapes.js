// Solve for the tract SHAPE that produces a target vowel.
// Parameterize the tube (base width, constriction position/depth/width, lip aperture),
// then search for parameters whose measured resonances match published formant data.
const { Tract, SR, N } = require("./tract.js");

// build a diameter profile from articulatory-ish parameters
function shape(p) {
  const d = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    let v = p.base;
    // cosine constriction centred at cPos
    const x = (i - p.cPos) / p.cWidth;
    if (Math.abs(x) < 1) v = p.base - (p.base - p.cDiam) * 0.5 * (1 + Math.cos(Math.PI * x));
    d[i] = v;
  }
  // lip aperture over the last 3 sections
  for (let i = N - 3; i < N; i++) d[i] = Math.min(d[i], p.lip);
  // glottal end stays narrow
  d[0] = Math.min(d[0], 0.8);
  return d;
}

// fast formant estimate for search (short IR, coarse bins)
function formantsFast(d, maxF = 3200) {
  const t = new Tract();
  t.diam.set(d); t.calcReflections();
  const L = 4096;
  const ir = new Float64Array(L);
  ir[0] = t.sample(1);
  for (let i = 1; i < L; i++) ir[i] = t.sample(0);
  const spec = [];
  for (let f = 200; f <= maxF; f += 10) {
    let re = 0, im = 0;
    for (let i = 0; i < L; i++) {
      const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / L);
      const a = 2 * Math.PI * f * i / SR;
      re += ir[i] * w * Math.cos(a); im -= ir[i] * w * Math.sin(a);
    }
    spec.push([f, Math.hypot(re, im)]);
  }
  const pk = [];
  for (let i = 1; i < spec.length - 1; i++)
    if (spec[i][1] > spec[i-1][1] && spec[i][1] > spec[i+1][1]) pk.push(spec[i]);
  pk.sort((a, b) => b[1] - a[1]);
  return pk.slice(0, 3).map(x => x[0]).sort((a, b) => a - b);
}

function solve(name, targetF1, targetF2, iters = 900) {
  let best = null, bestErr = 1e9;
  let rnd = (() => { let t = 12345; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t>>>15, 1|t); r = r + Math.imul(r ^ r>>>7, 61|r) ^ r; return ((r ^ r>>>14) >>> 0) / 4294967296; }; })();
  for (let k = 0; k < iters; k++) {
    const p = {
      base:   1.2 + rnd() * 1.4,
      cPos:   4  + rnd() * 34,
      cDiam:  0.25 + rnd() * 1.3,
      cWidth: 4  + rnd() * 11,
      lip:    0.4 + rnd() * 1.8,
    };
    const f = formantsFast(shape(p));
    if (f.length < 2) continue;
    const e = Math.pow((f[0]-targetF1)/targetF1, 2) + Math.pow((f[1]-targetF2)/targetF2, 2);
    if (e < bestErr) { bestErr = e; best = { p, f }; }
  }
  const pct = Math.sqrt(bestErr) * 100;
  console.log(`${name.padEnd(6)} target F1 ${targetF1}  F2 ${targetF2}  ->  got ${best.f[0]} / ${best.f[1]}` +
              (best.f[2] ? ` / ${best.f[2]}` : "") + `   (err ${pct.toFixed(1)}%)`);
  console.log(`       shape: base ${best.p.base.toFixed(2)}  constriction @${best.p.cPos.toFixed(0)}` +
              ` d=${best.p.cDiam.toFixed(2)} w=${best.p.cWidth.toFixed(1)}  lip ${best.p.lip.toFixed(2)}`);
  return best;
}

if (require.main === module) {
  console.log("Inverse-solving tract shapes against Peterson & Barney adult-male formants:\n");
  const out = {};
  out.oh = solve("/o/",  490,  910);   // back rounded
  out.ah = solve("/ɑ/",  730, 1090);   // open back
  out.l  = solve("/l/",  380,  880);   // dark lateral (no side branch — see note)
  require("fs").writeFileSync("/home/claude/shapes.json", JSON.stringify(
    Object.fromEntries(Object.entries(out).map(([k,v]) => [k, v.p])), null, 1));
  console.log("\nshapes written to shapes.json");
}
module.exports = { shape, formantsFast };
