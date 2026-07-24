#!/usr/bin/env node
/**
 * Two-mass vocal folds (after Ishizaka & Flanagan, 1972).
 *
 * The LF source we ship is a *prescribed waveform* — a shape drawn to look like glottal flow.
 * This is an oscillator: two coupled masses driven by air pressure, which vibrates because
 * the physics makes it vibrate. Nothing tells it what a cycle looks like.
 *
 * What that buys, if it works: jitter, shimmer and register changes stop being parameters
 * and start being consequences. Every attempt in this project to add irregularity by hand
 * has made it sound less human, which is the argument for making it emerge instead.
 *
 * Run standalone to check it oscillates at all before it goes anywhere near the app.
 */
const SR = 44100;
const DT = 1 / SR;

// Physical scale: cgs units, as in the original paper.
const RHO = 0.00114;      // air density, g/cm³
const L_G = 1.4;          // fold length, cm

class TwoMass {
  constructor(opts = {}) {
    // masses and stiffnesses. m1 is the lower (subglottal) edge, m2 the upper.
    this.m1 = opts.m1 ?? 0.125;      // g
    this.m2 = opts.m2 ?? 0.025;
    this.k1 = opts.k1 ?? 80000;      // dyne/cm
    this.k2 = opts.k2 ?? 8000;
    this.kc = opts.kc ?? 25000;      // coupling between the two masses
    this.d1 = opts.d1 ?? 0.25;       // thickness of each mass, cm
    this.d2 = opts.d2 ?? 0.05;
    // ADDUCTION. Folds at rest are pressed together, not held apart. That matters: with a
    // gap at rest the Bernoulli pressures on the two masses cancel, there is no net force,
    // and the thing simply sits there — which is exactly what the first version did.
    // Closed at rest means subglottal pressure has something to push against.
    this.rest1 = opts.rest1 ?? -0.004;   // negative = pressed together
    this.rest2 = opts.rest2 ?? -0.004;
    this.Ps = opts.Ps ?? 8000;       // subglottal pressure, dyne/cm² (~8 cm H2O)

    this.x1 = 0; this.x2 = 0;        // displacement from rest
    this.v1 = 0; this.v2 = 0;
    this.seeded = false;
    this.Ug = 0;                     // glottal volume flow
    this.closedFor = 0;
  }

  // Damping: light when open, heavy on collision — the folds hit each other.
  damping(m, k, colliding) {
    const zeta = colliding ? 1.1 : 0.1;
    return 2 * zeta * Math.sqrt(m * k);
  }

  step() {
    // A tiny kick to break the symmetry. Real folds are never perfectly symmetric either.
    if (!this.seeded) { this.x1 = 0.002; this.seeded = true; }
    const a1 = Math.max(0, 2 * L_G * (this.rest1 + this.x1));
    const a2 = Math.max(0, 2 * L_G * (this.rest2 + this.x2));
    const open = a1 > 0 && a2 > 0;
    const amin = Math.min(a1, a2);

    // Flow through the narrowest point, from Bernoulli.
    let Ug = 0, P1 = 0, P2 = 0;
    if (open) {
      Ug = amin * Math.sqrt(Math.max(0, 2 * this.Ps / RHO));
      // Pressure on the lower mass: partly recovered subglottal pressure.
      // Pressure on the upper mass: near zero if the jet has separated.
      const ratio = amin / Math.max(1e-9, a1);
      P1 = this.Ps * (1 - ratio * ratio);
      P2 = 0;
    } else {
      // Closed: full subglottal pressure pushes the lower mass open again.
      Ug = 0;
      P1 = this.Ps;
      P2 = 0;
    }
    this.Ug = Ug;

    // Collision: when a mass closes past the midline it meets the other fold and the
    // stiffness roughly triples.
    const col1 = (this.rest1 + this.x1) <= 0;
    const col2 = (this.rest2 + this.x2) <= 0;
    const k1e = col1 ? this.k1 * 3 : this.k1;
    const k2e = col2 ? this.k2 * 3 : this.k2;

    const F1 = P1 * L_G * this.d1;
    const F2 = P2 * L_G * this.d2;

    const r1 = this.damping(this.m1, this.k1, col1);
    const r2 = this.damping(this.m2, this.k2, col2);

    const a1acc = (F1 - k1e * this.x1 - r1 * this.v1 - this.kc * (this.x1 - this.x2)) / this.m1;
    const a2acc = (F2 - k2e * this.x2 - r2 * this.v2 - this.kc * (this.x2 - this.x1)) / this.m2;

    this.v1 += a1acc * DT; this.x1 += this.v1 * DT;
    this.v2 += a2acc * DT; this.x2 += this.v2 * DT;

    // Keep it sane: the folds cannot pass through each other by more than a little.
    const floor = -0.06;
    if (this.rest1 + this.x1 < floor) { this.x1 = floor - this.rest1; this.v1 = 0; }
    if (this.rest2 + this.x2 < floor) { this.x2 = floor - this.rest2; this.v2 = 0; }

    return Ug;
  }
}

// ---------- does it oscillate, and at what frequency? ----------
function measure(opts, seconds = 0.5) {
  const f = new TwoMass(opts);
  const n = Math.floor(SR * seconds);
  const u = new Float64Array(n);
  for (let i = 0; i < n; i++) u[i] = f.step();
  const half = Math.floor(n / 2);
  const tail = u.subarray(half);
  const mean = tail.reduce((a, b) => a + b, 0) / tail.length;
  let peak = 0;
  for (const v of tail) peak = Math.max(peak, Math.abs(v - mean));
  // zero crossings of the mean-removed flow give the period
  let cross = 0, prev = tail[0] - mean;
  for (let i = 1; i < tail.length; i++) {
    const cur = tail[i] - mean;
    if (prev <= 0 && cur > 0) cross++;
    prev = cur;
  }
  const f0 = cross / (tail.length / SR);
  // open quotient: fraction of the cycle with any flow
  let openN = 0;
  for (const v of tail) if (v > 1e-6) openN++;
  return { f0, peak, oq: openN / tail.length, mean };
}

if (require.main === module) {
  console.log("does it self-oscillate?\n");
  console.log("  k1(tension)   Ps(effort)    F0      peak flow   open quotient");
  for (const k1 of [40000, 80000, 160000, 320000]) {
    for (const Ps of [4000, 8000, 16000]) {
      const r = measure({ k1, k2: k1 / 10, kc: k1 / 3.2, Ps });
      const alive = r.peak > 1 && r.f0 > 20;
      console.log(`  ${String(k1).padStart(7)}    ${String(Ps).padStart(6)}    ` +
        `${r.f0.toFixed(0).padStart(4)} Hz   ${r.peak.toFixed(0).padStart(6)}     ` +
        `${(r.oq * 100).toFixed(0).padStart(3)}%  ${alive ? "" : "  <- dead"}`);
    }
  }
  console.log("\n  A real voice: F0 rises with tension AND with subglottal pressure — which is");
  console.log("  why you go sharp when you shout. If that falls out of this, the model is right.");
}

module.exports = { TwoMass, measure, SR };
