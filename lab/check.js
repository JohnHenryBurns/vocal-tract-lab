// THE GATE. One command, one verdict.
//   node lab/check.js        (exit 0 = shippable)
//
// Every band here exists because something broke that way. The comments say which.
const H = require("./harness.js");

// Which voices the per-voice checks exercise. Ten presets is slow and most of them are
// nobody's target; john and man are the two being tuned. VTL_ALL=1 runs the full set
// before a release, when a preset silently breaking actually matters.
const VOICES_UNDER_TEST = process.env.VTL_ALL
  ? null
  : (process.env.VTL_VOICES || "john,man").split(",").map(s => s.trim());

// Checks REGISTER here; they do not run on registration. Running them at registration time
// meant the gate was all-or-nothing: no way to run the three stop checks while working on
// stops, no output until all twenty-two had finished, and no way to spread them over cores.
// A check body is unchanged by this — it is still a function returning {ok, note}.
const REG = [];
function check(name, fn) { REG.push({ name, fn }); }

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
// Peterson & Barney (1952), adult-male means, JASA 24(2):175-184. These ten are theirs and
// match the published table exactly.
const VOWEL_TARGETS = {
  i:[270,2290], "ɪ":[390,1990], "ɛ":[530,1840], "æ":[660,1720], "ʌ":[640,1190],
  "ɑ":[730,1090], "ɔ":[570,840], "ʊ":[440,1020], u:[300,870], "ɝ":[490,1350],
  // NOT Peterson & Barney. They measured ten vowels — heed hid head had hod hawed hood who'd
  // hud heard — and neither of these is among them. Conventional adult-male values, kept
  // because the model should hit them, but the check's name overstated its authority while
  // they sat in the same table unmarked.
  "ə":[500,1500], o:[490,910],
};
const PB_VOWELS = new Set(["i","ɪ","ɛ","æ","ʌ","ɑ","ɔ","ʊ","u","ɝ"]);
check("vowels match Peterson & Barney", () => {
  // Reported split by provenance. Twelve targets are checked but only ten are Peterson &
  // Barney's; saying "12/12 against P&B" claimed an authority two of them do not have.
  let good = 0, pbGood = 0, pbN = 0, worst = "", worstErr = 0;
  for (const [sym, [t1, t2]] of Object.entries(VOWEL_TARGETS)) {
    const f = H.formants(sym);
    if (f.length < 2) continue;
    const e = Math.sqrt(((f[0]-t1)/t1)**2 + ((f[1]-t2)/t2)**2)*100;
    const isPB = PB_VOWELS.has(sym);
    if (isPB) pbN++;
    if (e < 12) { good++; if (isPB) pbGood++; }
    if (e > worstErr) { worstErr = e; worst = sym; }
  }
  const n = Object.keys(VOWEL_TARGETS).length;
  return { ok: good >= n - 2,
           note: `${pbGood}/${pbN} vs P&B, ${good}/${n} overall within 12% (worst /${worst}/ ${worstErr.toFixed(0)}%)` };
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
  // Frication is intermittent by design — a real jet sheds eddies — so a single render's
  // band share swings by tens of points. Measured once, this check passes or fails at random,
  // which it did. Average, and use enough window to see several eddies.
  const bad = [];
  for (const n of [19, 31, 37, 44, 48]) {   // every length a shipping voice uses
    let pk = 0, low = 0;
    for (let i = 0; i < 3; i++) {
      const sp = H.spectrum(H.sustain("s", { n, seconds: 1.8 }),
                            { lo: 500, hi: 11000, step: 250, hops: 22 });
      pk += H.peakOf(sp).f; low += H.bandShare(sp, 500, 2500);
    }
    pk /= 3; low /= 3;
    if (pk < 3200 || low > 20) bad.push(`${n}:${pk.toFixed(0)}Hz/${low.toFixed(0)}%`);
  }
  return { ok: bad.length === 0,
           note: bad.length ? "weak at " + bad.join(" ") : "sibilant from 19 to 52 sections" };
});

check("sibilant shape at the default length", () => {
  // Bands from a real recording, not from assumption. Measured on the reference speaker:
  // /s/ peaks at 4625 Hz with 96% of its energy above 3 kHz; /ʃ/ peaks at 2188 with 57%.
  // They are DIFFERENT sounds and an earlier version of this check demanded both be
  // sibilant-bright, which is why fitting /ʃ/ to the recording made the gate fail.
  const notes = [];
  let ok = true;
  // Bands from a fit against a real recording, scaled for the tract-length difference
  // between that speaker and the default. /s/ and /ʃ/ are genuinely different sounds and get
  // different bands — an earlier version demanded both be sibilant-bright, which is why
  // fitting /ʃ/ honestly made the gate fail.
  for (const [sym, lo, hi, minHigh] of [["s", 3500, 6000, 80], ["ʃ", 1000, 4000, 35]]) {
    let pk = 0, high = 0;
    const K = 4;                                  // /ʃ/ swings 42-77% between single renders
    for (let i = 0; i < K; i++) {
      const sp = H.spectrum(H.sustain(sym, { seconds: 1.8 }),
                            { lo: 400, hi: 9000, step: 200, hops: 22 });
      pk += H.peakOf(sp).f; high += H.bandShare(sp, 3000, 9000);
    }
    pk /= K; high /= K;
    if (pk < lo || pk > hi || high < minHigh) ok = false;
    notes.push(`${sym} ${pk.toFixed(0)}Hz ${high.toFixed(0)}% high`);
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
  // These are NOISE sources — a single render varies by a third run to run. Measuring once
  // and comparing to a fixed threshold gives a check that passes or fails at random, which
  // is worse than one that simply fails. Average.
  const mean = (sym, k = 3) => {
    let a = 0;
    for (let i = 0; i < k; i++) a += H.rms(H.sustain(sym, { seconds: 1.0 }), 0.5, 0.95);
    return a / k;
  };
  const vowel = mean("ɑ");
  const weak = [], notes = [];
  for (const sym of ["s", "ʃ", "z", "ʒ", "f", "v", "θ", "ð", "h"]) {
    const pct = mean(sym) / vowel * 100;
    if (pct < 22) weak.push(`${sym} ${pct.toFixed(0)}%`);
    notes.push(`${sym} ${pct.toFixed(0)}`);
  }
  return { ok: weak.length === 0,
           note: weak.length ? "too quiet: " + weak.join(" ") : notes.join(" ") + " (% of a vowel)" };
});

check("nothing the speller produces gets silently dropped", () => {
  // "name" spelled correctly to n eɪ m and then came out as "n m", because the app filtered
  // the result against ART — where diphthongs do not live. A sound that vanishes between
  // the speller and the chain is invisible unless something checks for it.
  const known = new Set([...Object.keys(H.P.ART), ...Object.keys(H.P.DIPH), " "]);
  // The speller is a file. This used to rebuild it out of index.html with six regular
  // expressions and a fake localStorage — one of which required `const PAUSE=` to be
  // immediately followed by `function g2pWord`, so reordering two unrelated declarations in
  // the page would have broken this check while looking like a speller regression.
  // Required with no storage, so it tests the SHIPPED dictionary rather than a browser's.
  const S = require(__dirname + "/../engine/spelling.js");
  const g2p = S.g2p;
  const words = ["name","high","how","boy","bay","boat","thin","then","chin","gin","measure",
                 "goal","bulldog","maximus","solana","rachel","orion","jupiter","atlas",
                 "this","mother","wed","you","zoo","hey sexy lady"];
  const bad = [];
  for (const w of words) {
    const ph = g2p(w).ph;
    const lost = ph.filter(x => !known.has(x));
    if (lost.length) bad.push(`${w}:${[...new Set(lost)].join("")}`);
  }
  return { ok: bad.length === 0,
           note: bad.length ? "would be dropped — " + bad.join(" ")
                            : `${words.length} words, nothing unspeakable` };
});

check("no fricative strays into another's band", () => {
  // /ð/ in "mother" came out as a static sh. Not a bug in the sound — it was in the WRONG
  // BAND. An automatic fit chasing a spectral target had moved the dental constriction back
  // to 0.78, giving it a front cavity the size of /ʃ/'s, so it duly became a /ʃ/. A dental
  // is made at the teeth with nothing in front to ring.
  // What separates a sibilant from a dental is not where its centroid sits — those overlap.
  // It is that a sibilant is LOUD and CONCENTRATED (jet on the teeth, cavity to ring) and a
  // dental is weak and diffuse (neither). Measure that, and by band share rather than peak:
  // on a noise source the peak wanders 84% between renders, and three checks in this file
  // went flaky before I stopped using it.
  // AVERAGING, sized against measured variance rather than picked. Per render: /ʃ/ high-share
  // is 40.4% ±12.1% and /ð/ 31.0% ±13.4%, so at three renders the two distributions overlap
  // often enough to trip the 0.95 margin about 2% of the time — and it did, once in seven runs
  // while checking something unrelated. A gate that fails at random is worse than one that
  // fails, because the next green tick means nothing. Averaged over longer renders with more
  // spectral hops, which buys the same variance reduction far cheaper than more renders do.
  //
  // NOTE, and it wants looking at: the LEVEL half of this test is currently vacuous. /ð/
  // measures 0.0202 against /ʃ/'s 0.0173 — the dental is LOUDER than the sibilant, so
  // `l > shL*0.95` is always true and the whole check rests on the high-share half alone.
  // That is not what "weaker OR duller" was meant to mean. It predates the sibilant rescale
  // (the gate's own notes show ð 82% of a vowel against ʃ 78% well before it). Recorded here
  // rather than patched, because the fix belongs in the fricative levels, not in the band.
  const lvl = sym => { let a = 0;
    for (let i = 0; i < 3; i++) a += H.rms(H.sustain(sym, { seconds: 1.0 }), 0.45, 0.9);
    return a/3; };
  const high = sym => { let a = 0;
    for (let i = 0; i < 4; i++)
      a += H.bandShare(H.spectrum(H.sustain(sym, { seconds: 1.8 }),
                                  { lo: 300, hi: 9000, step: 200, hops: 20 }), 3000, 9000);
    return a/4; };
  const shL = lvl("ʃ"), shH = high("ʃ");
  const bad = [];
  for (const sym of ["f", "v", "θ", "ð"]) {
    const l = lvl(sym), h = high(sym);
    // a dental must be clearly weaker OR clearly less high-concentrated than /ʃ/
    if (l > shL*0.95 && h > shH*0.95) bad.push(`${sym} as strong and as bright as ʃ`);
  }
  return { ok: bad.length === 0,
           note: bad.length ? bad.join("  ")
                            : `dentals and labiodentals weaker or duller than /ʃ/ (${(shH).toFixed(0)}% high)` };
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

check("the glottis moves with the folds", () => {
  // Source-tract interaction: the glottal reflection must FOLLOW the glottal area — near
  // total when the folds close, much less when they are open. A fixed value means the folds
  // are not being loaded by the tract at all. And when abducted for a voiceless sound the
  // glottis is WIDE OPEN, not shut — getting that backwards turned it into a mirror.
  const P = H.makeProcessor(44);
  P.port.onmessage({ data: { type: "voice", v: H.P.defaultVoice() } });
  P.port.onmessage({ data: { type: "shape", diam: H.P.articulate(H.P.ART["ɑ"], 44),
                             br:0, nz:0, fr:0, vl:0, as:0, snap:true } });
  P.voicing = 1; P.vAmp = 1; P.flow = 1; P.flowT = 1; P.f0 = 110;
  const out = [new Float32Array(128)];
  for (let b = 0; b < 200; b++) P.process([], [out]);
  let lo = 9, hi = -9;
  for (let b = 0; b < 40; b++) {
    P.process([], [out]);
    lo = Math.min(lo, P.glotNow); hi = Math.max(hi, P.glotNow);
  }
  // and the voiceless case: folds apart means a LOW reflection
  P.voiceless = 1;
  for (let b = 0; b < 40; b++) P.process([], [out]);
  const vlR = P.glotNow;
  // The test is relative, not a magic number: abducted folds must be at least as open as
  // the widest point of the phonatory cycle, which means a LOWER reflection than `lo`.
  return { ok: (hi - lo) > 0.05 && vlR < lo,
           note: `voiced ${lo.toFixed(2)}-${hi.toFixed(2)}, abducted ${vlR.toFixed(2)}` };
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

check("the two-mass folds oscillate and follow pitch", () => {
  // An oscillator, not a waveform: it vibrates because the physics makes it. Pitch must
  // follow tension, and it must actually start.
  const bad = [];
  for (const f0 of [95, 140, 200]) {
    const x = H.sustain("ɑ", { n: 44, seconds: 0.9, f0,
                               voice: { ...H.P.defaultVoice(), folds: 1, press: 0.35 } });
    let e = 0;
    for (let i = Math.floor(x.length*0.5); i < x.length; i++) e += x[i]*x[i];
    if (Math.sqrt(e / (x.length*0.5)) < 0.004) { bad.push(`${f0}Hz silent`); continue; }
    const st = Math.floor(x.length*0.55);
    let best = 0, bl = 0;
    for (let lag = Math.floor(H.SR/400); lag < Math.floor(H.SR/60); lag++) {
      let s2 = 0;
      for (let i = 0; i < 3000; i++) s2 += x[st+i]*x[st+i+lag];
      if (s2 > best) { best = s2; bl = lag; }
    }
    let m = bl ? H.SR/bl : 0;
    while (m > 0 && m < f0*0.7) m *= 2;
    if (Math.abs(m - f0)/f0 > 0.10) bad.push(`${f0}->${m.toFixed(0)}`);
  }
  return { ok: bad.length === 0,
           note: bad.length ? bad.join(" ") : "oscillates and tracks pitch at 95, 140 and 200 Hz" };
});

check("the voice is not too cleanly periodic", () => {
  // Harmonic-to-noise ratio: how much energy sits ON the harmonics against between them.
  // A perfectly periodic source puts everything on the harmonics and nothing between, which
  // is the comb-like look of synthesis and a large part of why it sounds robotic. Measured
  // Measured at 38 dB before the fix. Published healthy voices sit around 15-25 dB: Praat's
  // own documentation puts a healthy sustained [a] at about 20, and the clinical literature
  // runs roughly 7-26. Aspiration is what fills the gaps.
  // A CORRECTION, recorded rather than quietly dropped: this check used to cite "a real
  // recording measures 2-5 dB on this". That figure is not a healthy value — 2-5 dB is the
  // hoarse/pathological range — and it was almost certainly our own estimator misreading a
  // room recording rather than a property of the speaker. The band below was never set from
  // it (it is v < 30, which follows the published range), and the aspiration raise in 401c855
  // landed all nine presets at 12-29 dB, inside the human band. So the number was wrong and
  // the work it prompted was still right. It is corrected here so nobody aims at 2-5 next time.
  const hnr = (sig, f0) => {
    let N = 1; while (N*2 <= sig.length) N *= 2; N = Math.min(N, 16384);
    const st = Math.floor((sig.length - N)/2);
    const re = new Float64Array(N/2+1), im = new Float64Array(N/2+1);
    for (let k = 0; k <= N/2; k++) {
      let a = 0, b = 0;
      for (let i = 0; i < N; i++) {
        const w = 0.5 - 0.5*Math.cos(2*Math.PI*i/N), th = 2*Math.PI*k*i/N;
        a += sig[st+i]*w*Math.cos(th); b -= sig[st+i]*w*Math.sin(th);
      }
      re[k] = a; im[k] = b;
    }
    const S = k => re[k]*re[k] + im[k]*im[k], bin = f => Math.round(f/H.SR*N);
    let h = 0, nz = 0;
    for (let k = 1; k*f0 < 5000; k++) {
      const c = k*f0;
      for (let b = bin(c-f0*0.18); b <= bin(c+f0*0.18); b++) if (b > 0 && b <= N/2) h += S(b);
      for (let b = bin(c+f0*0.28); b <= bin(c+f0*0.72); b++) if (b > 0 && b <= N/2) nz += S(b);
    }
    return 10*Math.log10(h/Math.max(nz, 1e-12));
  };
  const x = H.sustain("ɑ", { n: 44, seconds: 1.2, f0: 100 });
  const v = hnr(x.subarray(Math.floor(x.length*0.4)), 100);
  return { ok: v < 30, note: `${v.toFixed(1)} dB (healthy voices 15-25; 38 was ours before aspiration)` };
});

check("every voice speaks at its own tract length", () => {
  // The worklet changes tract length ONLY on a {type:'tract'} message — a 'voice' message
  // does not resize it. Build keyframes at one length, run the processor at another, and the
  // tail of every diameter array reads undefined: the output goes NaN, which plays as
  // SILENCE rather than throwing. lab/bench.html shipped exactly this and looked merely
  // unresponsive — nothing in the console, every control apparently dead. harness.js has
  // carried a comment warning about it since the day it cost an afternoon.
  const V = H.P.VOICES, word = ["ɑ","g","ɑ","l"], bad = [];
  const names = VOICES_UNDER_TEST
    ? VOICES_UNDER_TEST.filter(n => V[n])
    : Object.keys(V);
  let quietest = Infinity, quietName = "";
  for (const name of names) {
    const voice = { ...V[name].v };
    const n = Math.round(voice.sect || 44);
    const { keys } = H.plan(word, 0.9, voice, n);
    const wrong = keys.filter(k => k.d.length !== n).length;
    if (wrong) { bad.push(`${name}: ${wrong} keyframes ≠ ${n} sections`); continue; }
    const { buf } = H.say(word, { voice, n });
    let pk = 0, nan = 0;
    for (let i = 0; i < buf.length; i++) {
      if (!Number.isFinite(buf[i])) { nan++; break; }
      const a = Math.abs(buf[i]); if (a > pk) pk = a;
    }
    // Calibrated, not guessed: forcing keyframes of 40 into a 44-section processor gives
    // 67072 NaN samples and a peak of exactly 0, while the quietest healthy
    // preset peaks between 0.055 and 0.08 depending on where the jitter lands. 1e-3 has
    // ~55x headroom either way, so this one does not need averaging to be stable.
    if (nan) bad.push(`${name}: NaN`);
    else if (pk < 1e-3) bad.push(`${name}: silent (${pk.toExponential(1)})`);
    if (pk < quietest) { quietest = pk; quietName = name; }
  }
  return { ok: bad.length === 0,
           note: bad.length ? bad.join("  ")
               : `${names.join("+")} — keyframes match the tract, quietest /${quietName}/ ${quietest.toFixed(4)}${VOICES_UNDER_TEST ? "  (VTL_ALL=1 for all " + Object.keys(V).length + ")" : ""}` };
});

check("voiceless stops are aspirated", () => {
  // English stop voicing lives almost entirely in the gap between the burst and the return
  // of the folds: ~58/70/80 ms labial/alveolar/velar for /p t k/ against ~10 for /b d g/.
  // The keyframe interpolation was handing voicing back at the midpoint of the glide, about
  // 19 ms, which is squarely in the VOICED range — so a blind listener returned p as b, t as
  // d and k as t, all three. Measured on the OUTPUT by periodicity, because an energy
  // threshold is tripped instantly by a loud broadband burst and reports zero every time.
  const V = H.P.VOICES.john.v, n = Math.round(V.sect);
  const lowband = (buf, i, L = 512) => {          // the voice bar, 60-350 Hz
    let s = 0;
    for (let f = 60; f <= 350; f += 25) {
      let r = 0, m = 0;
      for (let j = 0; j < L; j++) {
        const w = 0.5 - 0.5*Math.cos(2*Math.PI*j/L), a = 2*Math.PI*f*j/H.SR;
        r += (buf[i+j]||0)*w*Math.cos(a); m -= (buf[i+j]||0)*w*Math.sin(a);
      }
      s += r*r + m*m;
    }
    return s;
  };
  const vot = {};
  for (const c of ["b","p","d","t","g","k"]) {
    const { buf, seg } = H.say(["ɑ", c, "ɑ"], { D: 0.9, voice: V, n });
    const s = seg.find(x => x.sym === c), v2 = seg[2];
    const ref = lowband(buf, Math.floor((v2.a + v2.b)/2*H.SR));
    const from = Math.floor(s.b*H.SR), step = Math.floor(H.SR*0.005);
    // The bar must be SUSTAINED. A single-frame threshold is tripped by the burst itself,
    // which is loud and broadband, and duly reported 0 ms for every stop in the inventory.
    let run = 0, on = from + Math.floor(H.SR*0.25);
    for (let i = from; i < from + Math.floor(H.SR*0.25); i += step) {
      if (lowband(buf, i) > ref*0.30) { if (++run >= 4) { on = i - 3*step; break; } }
      else run = 0;
    }
    vot[c] = (on - from)/H.SR*1000;
  }
  // Calibrated against a build with the VOT line deleted, not guessed. This one reads
  // 10-15 ms voiced against 75-105 voiceless; with VOT removed every stop falls into the
  // voiced band. The 35/50 split sits in the empty gap between the two clusters.
  const bad = [];
  for (const c of ["b","d","g"]) if (vot[c] > 35) bad.push(`${c} ${vot[c].toFixed(0)}ms (voiced, want <35)`);
  for (const c of ["p","t","k"]) if (vot[c] < 50) bad.push(`${c} ${vot[c].toFixed(0)}ms (voiceless, want >50)`);
  return { ok: bad.length === 0,
           note: bad.length ? bad.join("  ")
               : `b${vot.b.toFixed(0)} d${vot.d.toFixed(0)} g${vot.g.toFixed(0)} vs p${vot.p.toFixed(0)} t${vot.t.toFixed(0)} k${vot.k.toFixed(0)} ms` };
});

// ── the runner ─────────────────────────────────────────────────────────────
// The gate gates correctness. It should not gate iteration. Three things follow:
//   a subset can be run while working   node lab/check.js stops
//   results appear as they finish       (they used to print only after all 22)
//   independent checks use idle cores   VTL_JOBS=n, defaults to the core count
// The FULL gate is still what ships:  ./lab/ship.sh runs it with no filter, and a filtered
// run says so loudly in its verdict so a partial pass can never be mistaken for a green gate.
const os = require("os");
const { isMainThread, parentPort, workerData, Worker } = require("worker_threads");

function runOne(i) {
  const c = REG[i], t0 = Date.now();
  let ok = false, note = "";
  try { const r = c.fn(); ok = r.ok; note = r.note; }
  catch (e) { ok = false; note = "threw: " + e.message; }
  return { i, name: c.name, ok, note, ms: Date.now() - t0 };
}

if (!isMainThread && workerData && workerData.idx) {
  // Report each result the moment it lands. Posting the whole slice at the end would put the
  // streaming property back where it started — nothing visible until a worker is completely
  // done — which is the thing this runner exists to fix.
  for (const i of workerData.idx) parentPort.postMessage([runOne(i)]);
} else {
  const args  = process.argv.slice(2).filter(a => a !== "--list");
  const query = (process.env.VTL_ONLY || args.join(" ")).trim().toLowerCase();
  const terms = query ? query.split(/[,\s]+/).filter(Boolean) : [];
  const idx = REG.map((_, i) => i)
                 .filter(i => !terms.length || terms.some(t => REG[i].name.toLowerCase().includes(t)));

  if (process.argv.includes("--list")) {
    REG.forEach((c, i) => console.log(`  ${String(i).padStart(2)}  ${c.name}`));
    process.exit(0);
  }
  if (!idx.length) {
    console.log(`\nno check matches "${query}" — run with --list to see the names\n`);
    process.exit(2);
  }

  const bail = !!process.env.VTL_BAIL;
  const jobs = Math.max(1, Math.min(
    parseInt(process.env.VTL_JOBS || "", 10) || os.cpus().length, idx.length));
  const t0 = Date.now();
  const done = [];

  console.log(`\nHOLLERBOX — checks   ${idx.length}/${REG.length}` +
              `${terms.length ? ` matching "${query}"` : ""}` +
              `${jobs > 1 && !bail ? `, ${jobs} jobs` : ""}\n`);

  const line = r => console.log(`  ${r.ok ? "✅" : "❌"} ${r.name.padEnd(42)} ${String(r.note).padEnd(46)} ${(r.ms/1000).toFixed(1)}s`);

  const verdict = () => {
    done.sort((a, b) => a.i - b.i);
    const failed = done.filter(r => !r.ok);
    const partial = idx.length !== REG.length;
    console.log(failed.length
      ? `\n🔴 ${failed.length} failing   (${((Date.now()-t0)/1000).toFixed(0)}s)\n`
      : partial
        ? `\n🟡 ${done.length} passed, but this was a SUBSET — not a green gate. Run the full gate before pushing.   (${((Date.now()-t0)/1000).toFixed(0)}s)\n`
        : `\n🟢 all clear   (${((Date.now()-t0)/1000).toFixed(0)}s)\n`);
    process.exit(failed.length ? 1 : 0);
  };

  // Sequential when asked to stop at the first failure, or when there is one core to use.
  if (jobs === 1 || bail) {
    for (const i of idx) {
      const r = runOne(i); done.push(r); line(r);
      if (!r.ok && bail) { console.log("\n🔴 stopped at first failure (VTL_BAIL)\n"); process.exit(1); }
    }
    verdict();
  } else {
    // Deal the checks round-robin so one slow check does not leave a core idle at the end.
    const slices = Array.from({ length: jobs }, () => []);
    idx.forEach((c, k) => slices[k % jobs].push(c));
    let live = 0;
    slices.filter(s => s.length).forEach(slice => {
      live++;
      const w = new Worker(__filename, { workerData: { idx: slice } });
      w.on("message", rs => { rs.forEach(r => { done.push(r); line(r); }); });
      w.on("error", e => { slice.forEach(i => done.push({ i, name: REG[i].name, ok: false, note: "worker died: " + e.message, ms: 0 })); });
      w.on("exit", () => { if (--live === 0) verdict(); });
    });
  }
}
