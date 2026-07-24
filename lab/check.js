// THE GATE. One command, one verdict.
//   node lab/check.js        (exit 0 = shippable)
//
// Every band here exists because something broke that way. The comments say which.
const H = require("./harness.js");

const results = [];
function check(name, fn) {
  let ok = false, note = "";
  try { const r = fn(); ok = r.ok; note = r.note; }
  catch (e) { ok = false; note = "threw: " + e.message; }
  results.push({ name, ok, note });
}

// ── the tube is still a tube ───────────────────────────────────────────────
check("uniform tube resonates at c/4L", () => {
  const { Tract, SR } = require("./tract.js");
  const t = new Tract(); t.diam.fill(1.6); t.calcReflections();
  const L = 16384, ir = new Float64Array(L);
  ir[0] = t.sample(1); for (let i = 1; i < L; i++) ir[i] = t.sample(0);
  const pk = []; let a = 0, b = 0;
  for (let f = 200; f <= 3000; f += 5) {
    let re = 0, im = 0;
    for (let i = 0; i < L; i++) {
      const w = 0.5 - 0.5*Math.cos(2*Math.PI*i/L), q = 2*Math.PI*f*i/SR;
      re += ir[i]*w*Math.cos(q); im -= ir[i]*w*Math.sin(q);
    }
    const m = Math.hypot(re, im);
    if (b > a && b > m) pk.push(f - 5);
    a = b; b = m;
  }
  const err = Math.abs(pk[0]-500)/500;
  return { ok: err < 0.05 && Math.abs(pk[1]-1500)/1500 < 0.05,
           note: pk.slice(0,3).join(" / ") + " Hz (want 500/1500/2500)" };
});

// ── vowels land where the measurements say ─────────────────────────────────
const VOWEL_TARGETS = {
  i:[270,2290], "ɪ":[390,1990], "ɛ":[530,1840], "æ":[660,1720], "ʌ":[640,1190],
  "ɑ":[730,1090], "ɔ":[570,840], "ʊ":[440,1020], u:[300,870], "ɝ":[490,1350],
  "ə":[500,1500], o:[490,910],
};
check("vowels match Peterson & Barney", () => {
  let good = 0, worst = "", worstErr = 0;
  for (const [sym, [t1, t2]] of Object.entries(VOWEL_TARGETS)) {
    const f = H.formants(sym);
    if (f.length < 2) continue;
    const e = Math.sqrt(((f[0]-t1)/t1)**2 + ((f[1]-t2)/t2)**2)*100;
    if (e < 12) good++;
    if (e > worstErr) { worstErr = e; worst = sym; }
  }
  const n = Object.keys(VOWEL_TARGETS).length;
  return { ok: good >= n - 2, note: `${good}/${n} within 12% (worst /${worst}/ ${worstErr.toFixed(0)}%)` };
});

// ── consonants close where they should ─────────────────────────────────────
check("stops seal at their place of articulation", () => {
  const want = { b:[0.90,1.0], d:[0.75,0.88], g:[0.42,0.60], p:[0.90,1.0], t:[0.75,0.88], k:[0.42,0.60] };
  const bad = [];
  for (const [sym, [lo, hi]] of Object.entries(want)) {
    const d = H.P.articulate(H.P.ART[sym], 44);
    let mn = 9, at = 0;
    for (let i = 1; i < 43; i++) if (d[i] < mn) { mn = d[i]; at = i/43; }
    if (mn > 0.25 || at < lo || at > hi) bad.push(`${sym}@${at.toFixed(2)}/${mn.toFixed(2)}`);
  }
  return { ok: bad.length === 0, note: bad.length ? bad.join(" ") : "lips, ridge and velum all sealed" };
});

check("the lateral is not a /w/", () => {
  const f = H.formants("l");
  // /w/ sits near 300/750. A lateral needs F2 well clear of that, and a high F3.
  // /l/ vs /r/ is F3: a lateral is high (2600-3000), a rhotic is low (1600-2000). The side
  // pocket once dragged a pole to 2050 and put its zero on F3, which is literally an /r/.
  return { ok: f[1] > 1000 && f[2] > 2450,
           note: f.join(" / ") + " Hz (a /w/ is ~300/750/2300; an /r/ has F3 near 1800)" };
});

check("nasals produce a murmur", () => {
  const bad = [];
  for (const sym of ["m","n","ŋ"]) {
    const x = H.sustain(sym, { seconds: 1.0 });
    const r = H.rms(x, 0.5, 0.95);
    const sp = H.spectrum(x, { lo: 150, hi: 2000, step: 50 });
    const p = H.peakOf(sp);
    if (r < 0.004 || p.f > 600) bad.push(`${sym} rms${r.toFixed(4)} peak${p.f}`);
  }
  return { ok: bad.length === 0, note: bad.length ? bad.join("  ") : "all three audible with a low first resonance" };
});

// ── sibilants: shape, not hiss ─────────────────────────────────────────────
check("sibilants are shaped at every tract length", () => {
  // A short tract puts /s/ higher — correctly. Testing only 44 sections missed whether the
  // shorter voices (woman, child, helium) still produce a sibilant rather than a hiss.
  const bad = [];
  for (const n of [19, 31, 37, 44, 48]) {   // every length a shipping voice uses
    const x = H.sustain("s", { n, seconds: 1.3 });
    const sp = H.spectrum(x, { lo: 500, hi: 11000, step: 250, hops: 16 });
    const p = H.peakOf(sp);
    const low = H.bandShare(sp, 500, 2500);
    if (p.f < 3500 || low > 15) bad.push(`${n}:${p.f}Hz/${low.toFixed(0)}%`);
  }
  return { ok: bad.length === 0,
           note: bad.length ? "weak at " + bad.join(" ") : "sibilant from 19 to 52 sections" };
});

check("sibilant shape at the default length", () => {
  const notes = [];
  let ok = true;
  for (const [sym, lo, hi] of [["s", 3500, 6500], ["ʃ", 2500, 5000]]) {
    const x = H.sustain(sym, { seconds: 1.6 });
    const sp = H.spectrum(x, { lo: 500, hi: 10000, step: 250, hops: 20 });
    const p = H.peakOf(sp);
    const low = H.bandShare(sp, 500, 2500);
    // A real sibilant peaks in band and has almost nothing below 2.5 kHz.
    // 27-38% down there was what made it read as static.
    if (p.f < lo || p.f > hi || low > 14) ok = false;
    notes.push(`${sym} ${p.f}Hz low${low.toFixed(0)}%`);
  }
  return { ok, note: notes.join("  ") };
});

check("frication breathes rather than sitting flat", () => {
  // Stationary white noise IS electronic static, by definition. Real turbulence is
  // intermittent — eddies form and collapse — and that fluctuation is what the ear reads
  // as breath. The flat version measured 12%.
  const notes = [];
  let ok = true;
  for (const sym of ["s", "ʃ"]) {
    const x = H.sustain(sym, { seconds: 1.4 });
    const hop = Math.floor(H.SR*0.004), env = [];
    for (let i = Math.floor(x.length*0.4); i < x.length - hop; i += hop) {
      let s2 = 0; for (let k = 0; k < hop; k++) s2 += x[i+k]*x[i+k];
      env.push(Math.sqrt(s2/hop));
    }
    const m = env.reduce((a,b)=>a+b,0)/env.length;
    let dev = 0; for (const e of env) dev += Math.abs(e-m);
    const flutter = dev/env.length/m*100;
    if (flutter < 18) ok = false;
    notes.push(`${sym} ${flutter.toFixed(0)}%`);
  }
  return { ok, note: notes.join("  ") + " envelope flutter" };
});

check("every fricative actually sounds", () => {
  // /f/ once sat at 7% of a vowel because its constriction was far from where the jet blows,
  // and /h/ was SILENT because it is glottal aspiration, not a constriction fricative — with
  // voicing off it had no path to make any noise at all.
  const vowel = H.rms(H.sustain("ɑ", { seconds: 1.0 }), 0.5, 0.95);
  const weak = [], notes = [];
  for (const sym of ["s", "ʃ", "z", "ʒ", "f", "v", "θ", "ð", "h"]) {
    const r = H.rms(H.sustain(sym, { seconds: 1.0 }), 0.5, 0.95);
    const pct = r / vowel * 100;
    if (pct < 25) weak.push(`${sym} ${pct.toFixed(0)}%`);
    notes.push(`${sym} ${pct.toFixed(0)}`);
  }
  return { ok: weak.length === 0,
           note: weak.length ? "too quiet: " + weak.join(" ") : notes.join(" ") + " (% of a vowel)" };
});

// ── words behave ───────────────────────────────────────────────────────────
const WORDS = [["g","o","ɑ","l"], ["b","ʊ","l","d","ɔ","g"], ["m","æ","k","s","ɪ","m","ə","s"],
               ["d","æ","d"], ["s","o","l","ɑ","n","ə"]];

check("no word clicks", () => {
  // A stop release is a transient, but an outlier far above the signal's own motion is a
  // click. The white-noise burst once measured 13.5x.
  // A click is a transient AT A STOP RELEASE. Fricatives legitimately have more
  // sample-to-sample motion than vowels, so comparing /s/ against a vowel flags noise that
  // is supposed to be there. Look only where releases happen, and reference a held vowel.
  let worst = 0, which = "", when = 0;
  for (const w of WORDS) {
    const { buf, seg } = H.say(w, { extra: 0.15 });
    const vowels = seg.filter(s => !H.P.STOP_KEYS.includes(s.sym) && !H.P.FRICATIVE[s.sym]);
    if (!vowels.length) continue;
    const ref = vowels.sort((a,b)=>(b.b-b.a)-(a.b-a.a))[0];
    const j = [];
    for (let i = Math.floor(ref.a*H.SR)+1; i < Math.floor(ref.b*H.SR); i++) j.push(Math.abs(buf[i]-buf[i-1]));
    j.sort((a,b)=>a-b);
    const norm = j[Math.floor(j.length*0.98)] || 1e-9;
    for (const s of seg) {
      if (!H.P.STOP_KEYS.includes(s.sym)) continue;
      const a = Math.floor(s.b*H.SR), b = Math.floor((s.b+0.05)*H.SR);   // the release window
      // Level is the honest measure. A release is SUPPOSED to be a sharp transient; it is
      // only a click when it also overshoots the vowel it introduces.
      let vp = 0;
      for (let i = Math.floor(ref.a*H.SR); i < Math.floor(ref.b*H.SR); i++) vp = Math.max(vp, Math.abs(buf[i]));
      let pk = 0;
      for (let i = Math.max(1,a); i < Math.min(buf.length, b); i++) pk = Math.max(pk, Math.abs(buf[i]));
      const over = pk/vp*100;
      if (over > worst) { worst = over; which = w.join("") + " /" + s.sym + "/"; when = s.b; }
    }
  }
  // Band calibrated against a deliberately clicky build, not a guess: with the burst forced
  // to 1.3 the same words reach ~380%. A real /d/ or /t/ release is a genuinely sharp,
  // high-peak event, so anything under ~220% is dynamics rather than a defect.
  return { ok: worst < 220, note: `loudest release ${worst.toFixed(0)}% of vowel on "${which}"` };
});

check("nothing sounds after a word ends", () => {
  // Frication was once ungated and hissed forever after any word ending in /s/.
  let worst = 0, which = "";
  for (const w of WORDS) {
    const { buf, end } = H.say(w, { extra: 1.0 });
    const tail = H.rms(buf, end + 0.35, end + 0.9);
    if (tail > worst) { worst = tail; which = w.join(""); }
  }
  return { ok: worst < 0.002, note: `loudest tail ${worst.toFixed(5)} on "${which}"` };
});

check("every sound in a word is audible", () => {
  // Stops are silent by design; everything else must actually sound. A tail fade once ate
  // final consonants, and gating frication on voicing once silenced every fricative.
  const silent = [];
  for (const w of WORDS) {
    const { buf, seg } = H.say(w);
    for (const s of seg) {
      if (H.P.STOP_KEYS.includes(s.sym)) continue;
      if (H.rms(buf, s.a, s.b) < 0.004) silent.push(`${w.join("")}:${s.sym}`);
    }
  }
  return { ok: silent.length === 0, note: silent.length ? "silent: " + silent.join(" ") : "all sounding" };
});

check("output stays finite and unclipped", () => {
  const bad = [];
  for (const w of WORDS) {
    const { buf } = H.say(w);
    let hot = 0;
    for (let i = 0; i < buf.length; i++) {
      if (!Number.isFinite(buf[i])) { bad.push(w.join("") + ":NaN"); break; }
      if (Math.abs(buf[i]) > 0.999) hot++;
    }
    if (hot > 40) bad.push(`${w.join("")}:${hot} clipped`);
  }
  return { ok: bad.length === 0, note: bad.length ? bad.join(" ") : "clean" };
});

check("a pause is silent, but the tract keeps moving", () => {
  // Two words joined by a gap should sound like a phrase, not two recordings. That means
  // silence with MOVEMENT — the articulators travelling to the next target while no air
  // flows, which is what anticipatory coarticulation is.
  const chain = ["h", "eɪ", " ", "d", "ɑ", "d"];
  const { buf, seg } = H.say(chain, { D: 1.5, extra: 0.2 });
  const pz = seg.find(g => g.sym === " ");
  if (!pz) return { ok: false, note: "no pause segment produced" };
  const quiet = H.rms(buf, pz.a + 0.02, pz.b - 0.02);

  const P = H.makeProcessor(44);
  const plan = H.plan(chain, 1.5, null, 44);
  P.port.onmessage({ data: { type: "voice", v: plan.v } });
  P.port.onmessage({ data: { type: "goal",
    seq: { keys: plan.keys, f0: [[0, plan.v.f0a], [plan.end, plan.v.f0c]], end: plan.end } } });
  const out = [new Float32Array(128)];
  let firstAt = null, lastAt = null;
  for (let b = 0; b * 128 < H.SR * (plan.end + 0.2); b++) {
    P.process([], [out]);
    if (P.silNow) {
      let mn = 9, mi = 0;
      for (let i = 1; i < 43; i++) if (P.diam[i] < mn) { mn = P.diam[i]; mi = i; }
      if (firstAt === null) firstAt = mi;
      lastAt = mi;
    }
  }
  const moved = (firstAt !== null && lastAt !== null) ? Math.abs(lastAt - firstAt) : 0;
  return { ok: quiet < 0.005 && moved >= 2,
           note: `pause ${quiet.toFixed(5)} loud, constriction travelled ${moved} sections` };
});

// ── the voice ──────────────────────────────────────────────────────────────
check("Rd spans breathy to pressed", () => {
  const h1h2 = (rd) => {
    const x = H.sustain("ə", { seconds: 1.0, voice: { rd, press: 0 }, f0: 120 });
    const st = Math.floor(x.length*0.5), L = 8192;
    const amp = (h) => {
      let re = 0, im = 0;
      for (let i = 0; i < L; i++) {
        const w = 0.5 - 0.5*Math.cos(2*Math.PI*i/L), a = 2*Math.PI*h*120*i/H.SR;
        re += x[st+i]*w*Math.cos(a); im -= x[st+i]*w*Math.sin(a);
      }
      return 20*Math.log10(Math.hypot(re, im)/L + 1e-12);
    };
    return amp(1) - amp(2);
  };
  const pressed = h1h2(0.4), breathy = h1h2(2.2);
  return { ok: breathy - pressed > 8 && pressed < 3,
           note: `H1-H2 ${pressed.toFixed(1)} dB pressed -> ${breathy.toFixed(1)} dB breathy` };
});

// ── report ─────────────────────────────────────────────────────────────────
console.log("\nVOCAL TRACT LAB — checks\n");
let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`  ${r.ok ? "✅" : "❌"} ${r.name.padEnd(42)} ${r.note}`);
}
console.log(failed ? `\n🔴 ${failed} failing\n` : "\n🟢 all clear\n");
process.exit(failed ? 1 : 0);
