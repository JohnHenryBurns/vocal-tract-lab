// Harness: drives the SHIPPING engine, extracted straight out of index.html.
// Nothing here re-implements the model — if the page changes, this follows.
const fs = require("fs");
const path = require("path");

const PAGE = process.env.VTL_PAGE || path.join(__dirname, "..", "index.html");
const SR = 44100;

function loadPage() {
  const html = fs.readFileSync(PAGE, "utf8");
  let worklet = html.match(/const workletSrc = `([\s\S]*?)`;/)[1]
                      .replace(/\$\{VELAR\}/g, "0.568");
  // A hook for sweeping a constant without editing the page:  VTL_PATCH="a=>b"
  if (process.env.VTL_PATCH) {
    const [find, repl] = process.env.VTL_PATCH.split("=>");
    if (!worklet.includes(find)) throw new Error("VTL_PATCH found nothing: " + find);
    worklet = worklet.split(find).join(repl);
  }
  const ART = JSON.parse(html.match(/const ART = (\{[\s\S]*?\n\});/)[1]);
  const articulate = new Function(
    html.match(/function restingDiam[\s\S]*?\n\}/)[0] + "\n" +
    html.match(/function hump[\s\S]*?\n\}/)[0] + "\n" +
    html.match(/function articulate\(A,n\)\{[\s\S]*?\n\}/)[0] + "\nreturn articulate;")();
  const main = html.match(/<script>([\s\S]*)<\/script>/g).pop();
  const VOICE_SPEC = new Function(main.match(/const VOICE_SPEC=\[[\s\S]*?\];/)[0] + "; return VOICE_SPEC;")();
  const defaultVoice = () => Object.fromEntries(VOICE_SPEC.map(p => [p.k, p.d]));
  // phoneme classes, read from the page so they cannot drift from it
  const grab = (name) => new Function("return " + main.match(new RegExp("const " + name + "\\s*=\\s*(\\{[^}]*\\})"))[1])();
  const arr  = (name) => new Function("return " + main.match(new RegExp("const " + name + "\\s*=\\s*(\\[[^\\]]*\\])"))[1])();
  return { html, worklet, ART, articulate, VOICE_SPEC, defaultVoice,
           STOP_KEYS: arr("STOP_KEYS"), APPROX: arr("APPROX"),
           NASAL: grab("NASAL"), VOICELESS: grab("VOICELESS"), FRICATIVE: grab("FRICATIVE"),
           BRANCHED: grab("BRANCHED") };
}

const P = loadPage();

function makeProcessor(n) {
  global.sampleRate = SR;
  global.AudioWorkletProcessor = class { constructor(){ this.port = { onmessage:null, postMessage(){} }; } };
  let Proc = null;
  global.registerProcessor = (name, cls) => { Proc = cls; };
  eval(P.worklet);
  return new Proc({ processorOptions: { n } });
}

/** Sustain one phoneme and return the audio. */
function sustain(sym, { n = 44, seconds = 1.2, voice = null, f0 = 110 } = {}) {
  const p = makeProcessor(n);
  const v = { ...P.defaultVoice(), ...(voice || {}) };
  p.port.onmessage({ data: { type: "voice", v } });
  p.port.onmessage({ data: { type: "shape", diam: P.articulate(P.ART[sym], n),
      br: P.BRANCHED[sym] || 0, nz: P.NASAL[sym] || 0,
      fr: P.FRICATIVE[sym] || 0, vl: P.VOICELESS[sym] || 0, snap: true } });
  p.voicing = 1; p.vAmp = 1; p.flow = 1; p.flowT = 1; p.f0 = f0;
  const blocks = Math.ceil(seconds * SR / 128);
  const buf = new Float64Array(blocks * 128), out = [new Float32Array(128)];
  for (let b = 0; b < blocks; b++) { p.process([], [out]); for (let i = 0; i < 128; i++) buf[b*128+i] = out[0][i]; }
  return buf;
}

/** Build the same keyframes the page builds for a word. */
function plan(chain, D, voice) {
  const v = { ...P.defaultVoice(), ...(voice || {}) };
  const glide = v.glide, stopHold = v.stopT, drawl = v.drawl, n = 44;
  const isS = c => P.STOP_KEYS.includes(c), isA = c => P.APPROX.includes(c);
  const gf = i => (i > 0 && (isS(chain[i]) || isA(chain[i]))) ? glide*0.45 : glide;
  let gl = 0; for (let i = 1; i < chain.length; i++) gl += gf(i);
  const vw = []; let first = true;
  chain.forEach(c => { if (isS(c)) return;
    if (isA(c)) vw.push(0.34); else { vw.push(first ? 1+drawl*2.6 : 1); first = false; } });
  const ws = vw.reduce((a,b)=>a+b, 0) || 1;
  const held = chain.filter(c => !isS(c)).length;
  const pool = Math.max(0.12*Math.max(held,1), D - chain.filter(isS).length*stopHold - gl);
  const keys = []; const seg = []; let t = 0, k = 0;
  chain.forEach((sym, i) => {
    const d = Array.from(P.articulate(P.ART[sym], n));
    const o = { b: P.BRANCHED[sym]||0, nz: P.NASAL[sym]||0,
                vl: P.VOICELESS[sym]||0, fr: P.FRICATIVE[sym]||0 };
    const dur = isS(sym) ? stopHold : pool*vw[k++]/ws;
    if (i > 0) t += gf(i);
    keys.push({ t, d, ...o });
    seg.push({ sym, a: t, b: t + dur });
    t += dur;
    keys.push({ t, d, ...o });
  });
  return { keys, seg, end: t + 0.22, v };
}

/** Speak a word and return audio plus the segment map. */
function say(chain, { D = null, voice = null, n = 44, extra = 0.9 } = {}) {
  const dur = D !== null ? D : Math.max(0.5, Math.min(2.2, chain.length*0.17));
  const { keys, seg, end, v } = plan(chain, dur, voice);
  const p = makeProcessor(n);
  p.port.onmessage({ data: { type: "voice", v } });
  const f0 = [[0,v.f0a],[Math.min(0.12,end*0.1),v.f0b],[end*0.55,v.f0b],
              [end*0.82,(v.f0b+v.f0c)/2],[end,v.f0c],[end+0.2,v.f0c*0.92]];
  p.port.onmessage({ data: { type: "goal", seq: { keys, f0, end } } });
  const blocks = Math.ceil((end + extra) * SR / 128);
  const buf = new Float64Array(blocks*128), out = [new Float32Array(128)];
  for (let b = 0; b < blocks; b++) { p.process([], [out]); for (let i = 0; i < 128; i++) buf[b*128+i] = out[0][i]; }
  return { buf, seg, end };
}

// ---- measurement ----
const rms = (x, a, b) => {
  let s = 0, c = 0;
  for (let i = Math.max(0,Math.floor(a*SR)); i < Math.min(x.length, Math.floor(b*SR)); i++) { s += x[i]*x[i]; c++; }
  return Math.sqrt(s / Math.max(1, c));
};

/** Averaged magnitude spectrum — averaging matters, noise-excited sounds need it. */
function spectrum(x, { from = 0.4, lo = 500, hi = 10000, step = 250, win = 2048, hops = 24 } = {}) {
  const start = Math.floor(x.length * from);
  const freqs = []; for (let f = lo; f <= hi; f += step) freqs.push(f);
  const acc = freqs.map(() => 0);
  let used = 0;
  for (let h = 0; h < hops; h++) {
    const st = start + h*win;
    if (st + win >= x.length) break;
    used++;
    freqs.forEach((f, k) => {
      let re = 0, im = 0;
      for (let i = 0; i < win; i++) {
        const w = 0.5 - 0.5*Math.cos(2*Math.PI*i/win);
        const a = 2*Math.PI*f*i/SR;
        re += x[st+i]*w*Math.cos(a); im -= x[st+i]*w*Math.sin(a);
      }
      acc[k] += re*re + im*im;
    });
  }
  return freqs.map((f, k) => [f, 10*Math.log10(acc[k]/Math.max(1,used) + 1e-20)]);
}

const peakOf = (sp) => { const mx = Math.max(...sp.map(a=>a[1])); return { f: sp.find(a=>a[1]===mx)[0], db: mx }; };
const bandShare = (sp, lo, hi) => {
  let inb = 0, tot = 0;
  for (const [f, m] of sp) { const p = Math.pow(10, m/10); tot += p; if (f >= lo && f <= hi) inb += p; }
  return inb/tot*100;
};

/** Formants via LPC on the tract's impulse response — the transfer function, not the output.
 *  (Voiced-signal LPC has misled this project five times. Do not use it for formants.) */
function formants(sym, { n = 44, order = 12 } = {}) {
  const { Tract } = require("./tract.js");
  const t = new Tract();
  t.diam.set(P.articulate(P.ART[sym], n));
  // Measure a branched phoneme the way it is HEARD — with its pocket open. Measuring /l/
  // with the branch shut hid the fact that the branch was turning it into an /r/.
  t.bOpen = P.BRANCHED[sym] || 0;
  t.calcReflections();
  const L = 8192, ir = new Float64Array(L);
  ir[0] = t.sample(1); for (let i = 1; i < L; i++) ir[i] = t.sample(0);
  const pk = []; let a = 0, b = 0;
  for (let f = 180; f <= 3400; f += 10) {
    let re = 0, im = 0;
    for (let i = 0; i < L; i++) {
      const w = 0.5 - 0.5*Math.cos(2*Math.PI*i/L);
      const q = 2*Math.PI*f*i/SR;
      re += ir[i]*w*Math.cos(q); im -= ir[i]*w*Math.sin(q);
    }
    const m = Math.hypot(re, im);
    if (b > a && b > m) pk.push(f - 10);
    a = b; b = m;
  }
  return pk.slice(0, 3);
}

/** Largest transient relative to the signal's own normal motion. */
function outlier(x, from = 0.3, to = 0.6) {
  // The reference window must sit INSIDE the sound. Measured against a silent tail the
  // noise floor becomes the yardstick and every transient looks like a 900x click.
  const j = [];
  for (let i = Math.floor(x.length*from)+1; i < Math.floor(x.length*to); i++) j.push(Math.abs(x[i]-x[i-1]));
  j.sort((a,b)=>a-b);
  const norm = j[Math.floor(j.length*0.98)] || 1e-9;
  let mx = 0, at = 0;
  for (let i = 1; i < x.length; i++) { const d = Math.abs(x[i]-x[i-1])/norm; if (d > mx) { mx = d; at = i/SR; } }
  return { ratio: mx, at };
}

module.exports = { P, SR, sustain, say, plan, rms, spectrum, peakOf, bandShare, formants, outlier, makeProcessor };
