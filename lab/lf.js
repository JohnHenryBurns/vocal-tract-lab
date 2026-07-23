// The LF model (Fant, Liljencrants & Lin, 1985) — a model of the DERIVATIVE of glottal flow.
// A Rosenberg pulse is a shape someone drew. This is a model of what the folds actually do,
// and Fant's later Rd parameter collapses it to one knob: breathy -> modal -> pressed.
//
//   open phase   0 <= t < te :  E(t) =  E0 * e^(a t) * sin(wg t)
//   return phase te <= t < tc:  E(t) = -(Ee/(eps*ta)) * [e^(-eps(t-te)) - e^(-eps(tc-te))]

// Fant's (1995) mapping from Rd to the timing ratios. Rd ~0.3 pressed, ~1 modal, ~2.7 breathy.
function rdToTiming(Rd) {
  Rd = Math.max(0.25, Math.min(2.9, Rd));
  const Rap = (-1 + 4.8 * Rd) / 100;
  const Rkp = (22.4 + 11.8 * Rd) / 100;
  const Rgp = 0.25 * Rkp / (((0.11 * Rd) / (0.5 + 1.2 * Rkp)) - Rap);
  const tp = 1 / (2 * Rgp);          // instant of peak glottal flow  (fraction of T0)
  const te = tp * (1 + Rkp);         // instant of maximum discharge
  const ta = Rap;                    // return-phase time constant
  return { tp, te, ta };
}

// eps solves  eps*ta = 1 - exp(-eps*(tc-te))   — the return phase must land on zero at tc
function solveEps(ta, te, tc = 1) {
  const d = tc - te;
  let eps = 1 / Math.max(1e-6, ta);
  for (let i = 0; i < 60; i++) {
    const f = eps * ta - 1 + Math.exp(-eps * d);
    const df = ta - d * Math.exp(-eps * d);
    const step = f / df;
    eps -= step;
    if (!Number.isFinite(eps) || eps <= 0) { eps = 1 / Math.max(1e-6, ta); break; }
    if (Math.abs(step) < 1e-12) break;
  }
  return eps;
}

// alpha makes the net area of the derivative zero over one period — flow starts and ends at 0
function solveAlpha(tp, te, ta, eps, tc = 1) {
  const wg = Math.PI / tp;
  // area of the return phase (closed form, negative)
  const A2 = -(1 / (eps * eps * ta)) *
             (1 - Math.exp(-eps * (tc - te)) * (1 + eps * (tc - te)));
  let a = 0;
  for (let i = 0; i < 80; i++) {
    // area of the open phase for a given alpha, normalised so E(te) = -1
    const denom = a * a + wg * wg;
    const Eate = Math.exp(a * te);
    const A1 = (Eate * (a * Math.sin(wg * te) - wg * Math.cos(wg * te)) + wg) / denom;
    const scale = -1 / (Eate * Math.sin(wg * te));   // so the open phase ends at -1
    const f = A1 * scale + A2;
    // numeric derivative — cheap, and this runs once per parameter change, not per sample
    const h = 1e-5, a2 = a + h;
    const d2 = a2 * a2 + wg * wg, E2 = Math.exp(a2 * te);
    const A1b = (E2 * (a2 * Math.sin(wg * te) - wg * Math.cos(wg * te)) + wg) / d2;
    const s2 = -1 / (E2 * Math.sin(wg * te));
    const df = ((A1b * s2 + A2) - f) / h;
    if (!Number.isFinite(df) || Math.abs(df) < 1e-12) break;
    const step = f / df;
    a -= step;
    if (!Number.isFinite(a)) { a = 0; break; }
    if (Math.abs(step) < 1e-10) break;
  }
  return a;
}

function makeLF(Rd) {
  const { tp, te, ta } = rdToTiming(Rd);
  const eps = solveEps(ta, te);
  const alpha = solveAlpha(tp, te, ta, eps);
  const wg = Math.PI / tp;
  const scale = -1 / (Math.exp(alpha * te) * Math.sin(wg * te));  // normalise Ee to 1
  return { tp, te, ta, eps, alpha, wg, scale, Rd };
}

// one sample of the flow derivative, phase in [0,1)
function lf(P, ph) {
  if (ph < P.te) return P.scale * Math.exp(P.alpha * ph) * Math.sin(P.wg * ph);
  const d = 1 - P.te;
  return -(1 / (P.eps * P.ta)) * (Math.exp(-P.eps * (ph - P.te)) - Math.exp(-P.eps * d));
}

module.exports = { makeLF, lf, rdToTiming };

// ================= validation =================
if (require.main === module) {
  const SR = 44100, F0 = 120;
  console.log("LF model across the phonation range:\n");
  console.log("  Rd     tp     te     ta      alpha     H1-H2   character");
  for (const Rd of [0.3, 0.5, 0.7, 1.0, 1.5, 2.0, 2.7]) {
    const P = makeLF(Rd);
    // render a few periods and measure H1-H2, the standard pressed/breathy measure
    const N = Math.floor(SR / F0) * 12;
    const x = new Float64Array(N);
    let ph = 0;
    for (let i = 0; i < N; i++) { ph += F0 / SR; if (ph >= 1) ph -= 1; x[i] = lf(P, ph); }
    const amp = (h) => {
      let re = 0, im = 0;
      for (let i = 0; i < N; i++) {
        const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
        const a = 2 * Math.PI * h * F0 * i / SR;
        re += x[i] * w * Math.cos(a); im -= x[i] * w * Math.sin(a);
      }
      return 20 * Math.log10(Math.hypot(re, im) / N + 1e-12);
    };
    const h1h2 = amp(1) - amp(2);
    const character = Rd < 0.6 ? "pressed" : Rd < 1.3 ? "modal" : "breathy";
    console.log(`  ${Rd.toFixed(1).padEnd(6)}${P.tp.toFixed(3)}  ${P.te.toFixed(3)}  ${P.ta.toFixed(4)}  ` +
                `${P.alpha.toFixed(2).padStart(8)}  ${h1h2.toFixed(1).padStart(6)}   ${character}`);
  }
  console.log("\n  H1-H2 should RISE with Rd: pressed voice has a weak first harmonic,");
  console.log("  breathy voice a strong one. That single number is what a shout changes.");
}
