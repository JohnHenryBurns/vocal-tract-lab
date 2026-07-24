# lab

Everything that is not the app. Nothing here ships; it exists to keep the app honest.

## The gate

    node lab/check.js

One command, one verdict, exit 0 means shippable. Twenty-two checks, each with a band that exists
because something once broke that way. It drives the **shipping engine**, extracted straight
out of `index.html`, so it cannot drift from what actually runs.

    ./lab/ship.sh "commit message"       # syntax -> checks -> deploy, stops on any failure

`ship.sh` uses `set -euo pipefail` and no `&&` chaining, because three separate times a
broken build reached production through a masked exit code.

## Files

| file | what it is |
|---|---|
| `check.js` | the gate. Twenty-two checks with calibrated bands |
| `harness.js` | drives the shipping engine — extracts the worklet and the phoneme tables from `index.html` at run time |
| `tract.js` | a standalone Kelly–Lochbaum tract, **mirrors the worklet**. Used for transfer-function work where running the whole engine is overkill |
| `ship.sh` | the deploy gate |
| `voice-fit.py` | measure a real recording: segment it, then F0, formants, H1–H2, spectral tilt per segment |
| `fit-preset.js` | turn those measurements into a preset — tract length from F3, articulations solved per vowel, source from the voice-quality measures, and a seed |
| `twomass.js` | standalone two-mass vocal-fold model. Prototype for the oscillator in the app |
| `lpc.js` | LPC formant estimation. **Kept as a warning**: it invents poles, and has misled this project six times |
| `RECORDING.md` | the script to read when recording a voice, and how to run the analysis |

## Two rules learned the hard way

**Bands are calibrated against a known-bad build, not guessed.** The click threshold sits where
it does because a deliberately over-driven burst measures 558% while the shipping build measures
177%. A guessed band flags healthy behaviour or misses real faults.

**Anything measuring a random process must average.** Frication is intermittent by design, so a
single render of /ʃ/ reports anywhere from 42% to 77% of its energy above 3 kHz. Measured once,
a check passes or fails at random — which happened twice, and the second time it laundered a
failure into a green tick. Five consecutive runs must agree before a gate counts as stable.

## Two rules about measurement

**Peak-pick the transfer function; do not trust LPC.** It placed an /ɛ/ F2 at 2490 Hz where the
spectrum has no peak at all. When two estimators disagree, plot the thing.

**`tract.js` mirrors the worklet and must be kept in step.** It carried its own copy of the
branch geometry once and drifted, so the gate was testing a tract the app did not have.
