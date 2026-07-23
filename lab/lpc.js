// Proper formant analysis: LPC spectral envelope, not raw spectral peaks.
// (This is the tool the write-up said should have been used from the start.)
const fs = require("fs");
const SR = 44100;

function loadWav(p) {
  const b = fs.readFileSync(p);
  const n = (b.length - 44) / 2;
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = b.readInt16LE(44 + i * 2) / 32768;
  return x;
}

// decimate to ~11 kHz so a modest LPC order covers 0-5.5 kHz
function decimate(x, start, len, factor) {
  // crude anti-alias: moving average then pick
  const out = new Float64Array(Math.floor(len / factor));
  for (let i = 0; i < out.length; i++) {
    let s = 0;
    for (let k = 0; k < factor; k++) s += x[start + i * factor + k] || 0;
    out[i] = s / factor;
  }
  return out;
}

function lpcFormants(x, start, order = 12, winMs = 40) {
  const F = 4, sr = SR / F;
  const len = Math.floor(winMs / 1000 * SR);
  let s = decimate(x, start, len, F);
  // pre-emphasis (compensates the source tilt so formants dominate)
  for (let i = s.length - 1; i > 0; i--) s[i] -= 0.97 * s[i - 1];
  // Hamming window
  for (let i = 0; i < s.length; i++) s[i] *= 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (s.length - 1));
  // autocorrelation
  const r = new Float64Array(order + 1);
  for (let k = 0; k <= order; k++) { let a = 0; for (let i = 0; i < s.length - k; i++) a += s[i] * s[i + k]; r[k] = a; }
  if (r[0] <= 0) return [];
  // Levinson-Durbin
  let a = new Float64Array(order + 1), tmp = new Float64Array(order + 1);
  let E = r[0];
  for (let i = 1; i <= order; i++) {
    let acc = r[i];
    for (let j = 1; j < i; j++) acc -= a[j] * r[i - j];
    const k = acc / E;
    tmp.set(a);
    tmp[i] = k;
    for (let j = 1; j < i; j++) tmp[j] = a[j] - k * a[i - j];
    a.set(tmp);
    E *= (1 - k * k);
    if (E <= 0) break;
  }
  // LPC spectral envelope, peak-picked
  const spec = [];
  for (let f = 150; f <= 4000; f += 5) {
    const w = 2 * Math.PI * f / sr;
    let re = 1, im = 0;
    for (let j = 1; j <= order; j++) { re -= a[j] * Math.cos(w * j); im += a[j] * Math.sin(w * j); }
    spec.push([f, 1 / Math.hypot(re, im)]);
  }
  const pk = [];
  for (let i = 1; i < spec.length - 1; i++)
    if (spec[i][1] > spec[i - 1][1] && spec[i][1] > spec[i + 1][1]) pk.push(spec[i]);
  // formants are the LOWEST resonances in order — not the loudest.
  // (Sorting by magnitude drops a weak F2 and promotes F3 into its place.)
  return pk.map(p => p[0]).filter(f => f > 180).sort((p, q) => p - q).slice(0, 4);
}

if (require.main === module) {
  const file = process.argv[2];
  const marks = process.argv.slice(3).map(Number);
  const x = loadWav(file);
  for (const t of marks) {
    const f = lpcFormants(x, Math.floor(t * SR));
    console.log(`  ${t.toFixed(2)}s   ` + f.slice(0, 3).map(v => String(v).padStart(4)).join("  ") + " Hz");
  }
}
module.exports = { loadWav, lpcFormants };
