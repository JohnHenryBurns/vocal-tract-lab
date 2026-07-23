# Roadmap — chasing the GOOOOAAALLL

**The goal:** a synthesized stadium goal cry, produced entirely by physical modelling, that a
room full of people would accept as a human being shouting.

**Where we are:** the tract produces recognisable vowels — nine of the eleven English
monophthongs land within 6% of Peterson & Barney's measured formants — and the /g/ is a real
seal-and-release. But the word currently comes out, in the project's own field notes, as
*"Goooo aaaa uuuwwll."* The vowels are there. The consonants and the vocal effort are not.

---

## The problem behind the problem

Every iteration so far has run on the same loop: change a parameter, render, listen, describe
the result as an animal, change another parameter. That loop produced nine versions of the
earlier formant synth and a document full of retracted findings. It is slow, and it burns the
one genuinely scarce resource in this project — a human ear that can tell whether something
sounds like a person.

The objective function lives in that ear. Nothing else can evaluate it. So the first job is not
to improve the cry; it is to **make evaluation cheap**.

That principle orders everything below.

---

## Phase 1 — the iteration rig

*Nothing else should start before this exists.*

### 1a. Offline sweep and scoring

A harness that renders hundreds of parameter combinations to audio and scores each one on the
things that have objective answers:

| measure | what it catches |
|---|---|
| formant trajectory vs target | is it saying the right vowels, at the right times |
| burst energy at release | is the /g/ actually a stop |
| spectral zero near F2 during /l/ | is the lateral real (Phase 2 gate) |
| AM depth in the 4–9 Hz band | the sheep. Never again |
| H1–H2 | pressed vs breathy phonation — vocal effort |
| spectral tilt | shout brightness without buzz |

This prunes the parameter space without a human hearing a single rendering. Anything that fails
these never reaches the ear.

### 1b. In-browser A/B tournament

Hear variant A. Hear variant B. Tap the better one. The app mutates around the winner and
serves the next pair. Eight to ten taps converges somewhere slider-dragging never would.

This is the correct tool when the judge is a human ear, and it puts every second of listening
time onto perceptual questions rather than measurable ones.

### 1c. Seed codes

Any cry can be saved, shared and returned to as a short string. Without this, a good result
found at 11pm on a phone is gone by morning.

**Done when:** a full tournament round — render, compare, choose, mutate — takes under a minute
on a phone, and a winner can be recovered exactly from its code.

---

## Phase 2 — the lateral branch

The /l/ is the largest intelligibility defect. It reads as a *w*.

A real lateral splits the airflow around the tongue and rejoins it, which places a **zero** in
the transfer function. A single unbranched tube is an all-pole system: it is not that our /l/
is badly tuned, it is that this geometry **cannot produce a lateral at all**.

The fix is a side-branch waveguide — a second short tube coupled at a junction, with its own
scattering. It is the same mechanism that produces nasals, so /m n ŋ/ come almost free
afterwards.

**Done when:** the spectrum during /l/ shows a measurable anti-resonance, and the F2 trajectory
stops rising into *w* territory at the end of the word.

---

## Phase 3 — the shout source

The glottal source is currently a Rosenberg pulse. That is a model of **speech**.

A shout is not loud speech. It is *pressed phonation*: higher subglottal pressure, more abrupt
glottal closure, a different spectral slope, and more energy in the upper harmonics. Turning up
the gain on a speech source produces loud speech, which is why the cry still sounds like a
synthesizer rather than a person.

The replacement is the **LF model** (Fant, Liljencrants & Lin 1985), which parameterises the
derivative of glottal flow. Fant's later `Rd` collapses its shape onto a single knob sweeping
breathy → modal → pressed. One control, physically grounded, measurable through H1–H2.

This is the most likely single change to move the result from *instrument* to *person*.

**Done when:** H1–H2 sits in the pressed range at peak effort, and the source can sweep from
breathy to pressed without the tract changing.

---

## Phase 4 — prosody

The shape of the shout over time: the onset, the climb, the sustained strain at the top, the
fall at the end. Roughly six parameters — pitch arc, effort arc, drawl distribution, final
descent, and the amount and rate of roughness.

All of these are perceptual. None of them should be guessed. They are exactly what the Phase 1
tournament is for.

**Done when:** the ear says so.

---

## Phase 5 — the rest of English

Everything above serves one word. This phase makes the instrument general.

The current inventory is twelve vowels plus /l b d g/, which is enough for **goal, gold, ball,
bulldog, dad, good, bird** and any other word built from voiced stops and vowels. It is not
enough for most names. Taking "Maximus" — /m æ k s ɪ m ə s/ — as the worked example, three
things are missing, and they differ enormously in cost:

| missing | what it needs | cost |
|---|---|---|
| /m n ŋ/ nasals | side branch coupled at the velum | **free** — Phase 2 already builds it |
| /p t k/ voiceless stops | existing closure, voicing gated off, aspiration on release | cheap |
| /s ʃ f θ/ fricatives | sustained turbulence at a constriction, plus the short front cavity that gives sibilants their resonance | the real work |

Note the ordering that falls out of this: **Phase 2 pays for the nasals as a side effect.** The
branched waveguide built to fix the /l/ is the same mechanism that opens the velopharyngeal
port. Voiceless stops are close to free once it exists — the tube already seals and releases;
what changes is that the glottis is quiet and the burst is aspirated rather than voiced.

Fricatives are the genuine addition. A noise source has to be injected *at* the constriction
rather than at the glottis, with its level driven by the pressure drop and the constriction
area, and sibilants need geometry fine enough to resolve the small cavity in front of the teeth
that puts /s/ up around 4–8 kHz. That may also force a higher section count.

**Done when:** the app can say a name it was never tuned for.

---

## The calibration library

A/B tournaments should not produce one good goal cry. They should produce a **voice**.

The parameters divide cleanly, and this division is what makes a library possible:

- **A voice** is the source and expression: glottal shape, effort arc, pitch range, roughness,
  brightness. It is completely word-independent. *"Stadium shout", "announcer", "small child",
  "grandfather".*
- **A word** is a phoneme sequence and its timing. It is completely voice-independent.
  *goal, bulldog, Maximus.*

They compose. Any voice can say any word. A tournament tunes a **voice**, and every word in the
library immediately inherits the result — so the listening effort spent perfecting the goal cry
is not spent again on the next word.

That means the seed code from Phase 1c should encode the pair — `voice:word` — and the library
is simply two lists that multiply.

The near-term consequence: tune the stadium-shout voice on *goal*, because it is short and we
know what it should sound like. Then point it at *bulldog*, and later at the kids' names, and
the hard-won calibration comes along for free.

---

## Which parameters go where

The split matters, because it decides what costs human attention:

**Machine decides** (objective, swept and scored offline): vowel target geometry, formant
accuracy, burst timing and strength, lateral branch dimensions, anti-alias and stability
margins, sheep-band suppression.

**Human decides** (perceptual, settled by tournament): drawl distribution, pitch arc shape,
effort arc, roughness amount, brightness, how the word ends.

Roughly 20 parameters total, of which only 6–8 should ever reach a human.

---

## Success criteria

The ear is final. But these gates must pass on the way, or the ear is being asked to judge
something already known to be broken:

1. Lateral shows an anti-resonance
2. Formant trajectory tracks a real /gɔːl/ within tolerance
3. H1–H2 in the pressed range at peak effort
4. No AM above ~2% in the 4–9 Hz band
5. Spectral tilt in voice range, not buzz range
6. A tuned voice can speak a word it was never tuned on, without retuning

---

## Open questions

- **Does a stadium cry even want to be intelligible?** Real ones are half-articulated. Perhaps
  the target is not a clean /gɔːl/ but a controlled collapse of one.
- **Does nasal coupling help?** Shouting often leaks through the velopharyngeal port. Once the
  branch exists in Phase 2, this is a cheap experiment.
- **How much roughness is right?** Real shouting is slightly chaotic. Every attempt so far to
  add irregularity by hand has made it *less* human. Emergent roughness — from a two-mass fold
  model — may be the only honest route, but that is a Phase 5 question.

---

## Note on method

Four times during the earlier synthesis work, a confident diagnosis turned out to be a
measurement artefact rather than a real defect. The offline scoring in Phase 1 exists partly to
stop that happening again: every metric it reports should be checked against a case where the
answer is independently known before it is trusted to judge anything.
