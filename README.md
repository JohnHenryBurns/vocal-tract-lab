# Vocal Tract Lab

**[Open the lab →](https://johnhenryburns.github.io/vocal-tract-lab/)**

An interactive Kelly–Lochbaum digital waveguide vocal tract, running in the browser.
Forty-four cylinders, sound sloshing back and forth between them, and the resonances
of human speech falling out of the geometry.

There are no formant filters anywhere in this code.

---

## What you're looking at

The vocal tract is modelled as a chain of short cylindrical tubes laid along the path
from glottis to lips. Sound travels through it as two counter-propagating waves. Wherever
two neighbouring cylinders have different cross-sectional areas, part of the wave reflects:

```
r = (A₁ − A₂) / (A₁ + A₂)
```

That single line is the whole model. Run it 44 times in a row, twice per audio sample, and
you have a throat. Change the tube's shape and the resonances move on their own — which is
what a vowel *is*.

Each cylinder in the 3D view is coloured by the standing-wave energy actually present in
that section, so you can watch the pressure pattern that produces a formant.

The tube is drawn as soon as the page loads and the articulator sliders reshape it
immediately — audio just adds the wind. Starting the voice sustains **one** vowel;
**SAY GOOOAAALLL** is the only control that moves the tract through a whole word.

## Controls

Four controls sit in the dock. **Hold** voices whatever shape the tract is currently in —
a sustained vowel. **Play word** speaks the word you have built, and becomes **Stop** while
it is speaking. **Word** and **Tract** open the two panels: what to say, and how the
instrument behaves. Any of them will unlock the browser's audio on first tap.

**Tongue position** slides the constriction from the pharynx toward the lips.
**Constriction** sets how tight it is. **Lip aperture** rounds or spreads the mouth.
Between them you can reach most of the vowel space.

The shape buttons load tract geometries that were **solved, not guessed**: an offline
search over tube shapes, scored against Peterson & Barney's measured adult-male formant
data, until the simulated resonances matched. The solver independently rediscovered real
articulatory phonetics — it found that /o/ wants a back constriction plus lip rounding,
and /ɑ/ wants a low pharyngeal constriction with an open jaw.

**SAY GOOOAAALLL** animates the tract through /g/ → o → ɑ → l. The stop consonant is a
genuine seal-and-release: the tube closes at the velum, pressure builds, and the burst is
turbulence at a constriction springing open. The coarticulation between vowels isn't
scripted — it's the shape the tube passes through on the way.

## Verification

The model is checked against physics rather than against taste. A uniform tube closed at
one end is a quarter-wave resonator, so a 17.5 cm tract must resonate at odd multiples of
c/4L — 500, 1500, 2500 Hz, the neutral schwa. Measured: **500 / 1505 / 2505 Hz**, under 1%
error. The tract auto-sizes its section count to the hardware sample rate so the length
stays correct on any device.

## Known limitation

The /l/ is imperfect, and audibly so — it comes out closer to a *w*. A real lateral splits
the airflow around the tongue, producing a spectral **zero**, and a single unbranched tube
is an all-pole system that structurally cannot produce one. The fix is a branched waveguide,
which is also how you would get nasals. That's the next build.

## Background

This started as an attempt to synthesize a stadium goal cry for a
[three-sided football simulator](https://github.com/JohnHenryBurns/three-sided-football),
went through nine iterations of formant synthesis that variously sounded like a ghost, a
sasquatch, a cow and a sheep, and ended up here. The write-up of that journey — including a
retracted finding — is in that repo under `docs/AUDIO-EXPERIMENT.md`.

## Reading

- Kelly & Lochbaum (1962), *Speech Synthesis* — the waveguide model
- Fant (1960), *Acoustic Theory of Speech Production* — source–filter
- Klatt (1980), JASA — the cascade/parallel formant synthesizer
- Fant, Liljencrants & Lin (1985) — the LF glottal flow model
- Peterson & Barney (1952) — the vowel formant measurements used to solve these shapes
- Neil Thapen's [Pink Trombone](https://dood.al/pink-trombone/) — the articulatory
  synthesizer that showed this could live in a browser tab
