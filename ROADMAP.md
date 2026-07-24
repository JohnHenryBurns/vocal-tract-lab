# Roadmap — chasing the GOOOOAAALLL

**The goal:** a synthesized stadium goal cry, produced entirely by physical modelling, that a
room full of people would accept as a human being shouting.

**Where we are:** the tract produces recognisable vowels — nine of the eleven English
monophthongs land within 6% of Peterson & Barney's measured formants — and the /g/ is a real
seal-and-release. But the word currently comes out, in the project's own field notes, as
*"Goooo aaaa uuuwwll."* The vowels are there. The consonants and the vocal effort are not.

---

## Where it stands

| | |
|---|---|
| **Sounds** | 39 — 12 vowels, 5 diphthongs, 22 consonants |
| **Voices** | 9 presets plus Custom, two of them measured from a real speaker |
| **Voice vector** | 18 parameters, **36-character seeds**, carrying source, timing, tract length and fold model |
| **Gate** | 22 checks, `node lab/check.js` — subsettable, streaming, parallel |
| **Engine** | one copy, `engine/tract-worklet.js`, loaded by URL and read by the harness |
| **Phonemes** | one copy, `engine/phonemes.js` — shared by the app, the bench and the gate |
| **Bench** | `lab/bench.html` — sweep, blind test, minimal pairs, render-all-to-WAV |
| **Live** | johnhenryburns.github.io/vocal-tract-lab |

### Vowels are solved. Consonants are the work.

Vowels land within 12% of target: **10/10 against Peterson & Barney's measured adult-male
means**, plus schwa and /o/, which P&B did not measure, against conventional values. A labelled
ɑCɑ sweep on voice=john scored
**1 / 22** on consonants. That is four root causes, not twenty-two:

| # | fault | state |
|---|---|---|
| 1 | No VOT — p/t/k heard as their voiced partners | ✅ fixed in `ee87eea` |
| 2 | Velar bursts fronting: g→d, k→t | ✅ fixed in `ee87eea` |
| 3 | Every fricative reads as undifferentiated hiss although the centroids are right (/s/ 4700 Hz, /ʃ/ 3000). Likely **level** — /s/ peaks around 3× the vowels | open |
| 4 | The nasal side branch is ~1.6 cm where a real nasal tract is 10–12, so there is no antiformant. /m n ŋ/ collapse to a generic voiced continuant and drag /z ð l r j w/ with them | open — biggest job, do it last and alone |

**Re-swept against `ee87eea`**, ɑCɑ, voice=john, 16 renders averaged:

*Voicing (VOT, ms).* Voiced stops unmoved at 10–15; voiceless were bunched at ~43 ms, inside
the voiced band, which is exactly why they were heard as /b d g/. They now sit at **75 / 80 /
105** for p/t/k, and in the right order — labial < alveolar < velar — so VOT now carries place
as well as voicing.

*Place (burst peak, Hz).* Before, all three voiceless bursts pinned to the bottom of the scan:
one dark thump, place erased. After: /p/ diffuse and low, **/t/ 4400**, **/k/ 2000**. The three
places separate.

Both fixes hold. What has *not* been done is the blind re-listen in `bench.html` — the ear is
still the judge, and the sweep score has not been re-taken.

*(An instrument note, because this project keeps being misled by its own: the first burst
measurement read 400 Hz for every stop on both builds. That was F0 and the voice bar swamping
the window, not a burst. Measure burst place above 800 Hz.)*

Built: the A/B tournament, the lateral branch, the articulatory layer, the LF source,
nasals, voiceless stops, fricatives, spelling-to-sound, the voice library, per-voice
articulation, source–tract interaction, and two-mass folds.

Not built: prosody beyond a pitch arc (Phase 4), finer sections (7c), and frequency-dependent
losses — which was attempted, measured, and reverted.

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

## Why it sounds the way it does

A note from testing, which turned out to be the most useful framing anyone has offered:

> *"It sounds like the way deaf people who have learned to speak sound. Which is very close to
> the truth of how this is built."*

That is not a simile, it is a diagnosis. Speech learned without hearing tends to get
articulatory **targets** right — where the tongue goes is teachable — while timing, prosody,
nasal control and laryngeal quality drift, because those can only be tuned by hearing yourself
and correcting.

This synthesiser has precisely that profile. Formant targets are solved against measured data,
so place of articulation is correct. Timing is scripted uniformly. The pitch arc is invented.
There is no velopharyngeal control at all. The glottal source is a generic pulse with no model
of vocal effort.

The common cause is the same in both cases: **speech produced without auditory feedback.**

This changes what Phase 1 *is*. The A/B rig is not a convenience for tuning faster. It is the
missing feedback loop, with a human ear closing it — the one thing the model has never had.

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

## Phase 2 — the lateral branch  ✅ built

The /l/ is the largest intelligibility defect. It reads as a *w*.

A real lateral splits the airflow around the tongue and rejoins it, which places a **zero** in
the transfer function. A single unbranched tube is an all-pole system: it is not that our /l/
is badly tuned, it is that this geometry **cannot produce a lateral at all**.

The fix is a side-branch waveguide — a second short tube coupled at a junction, with its own
scattering. It is the same mechanism that produces nasals, so /m n ŋ/ come almost free
afterwards.

**Built.** Three-port scattering junction (pj = 2·Σu⁺/ΣA, u⁻ᵢ = Aᵢ·pj − u⁺ᵢ), verified to
reduce exactly to the two-port form when the branch is shut so it cannot disturb the validated
tract. The lateral was then re-solved *with* the pocket coupled: tongue-tip constriction at
u=0.74, a 12-section closed pocket tapping it. Measured in the shipping engine: a **−33.7 dB
notch at 1950 Hz**, and F2 lifted clear of /w/ territory. The same mechanism, with an open far
end at the velum, gives the nasals in Phase 5.

**Original criterion:** the spectrum during /l/ shows a measurable anti-resonance, and the F2 trajectory
stops rising into *w* territory at the end of the word.

---

## Phase 2b — the articulatory layer  ✅ built

The tract is currently parameterised abstractly: *a constriction somewhere, this wide, this
tight.* It reaches the vowels, but it does not know what a tongue is — which is how the solver
once handed back a lateral with **rounded lips**. Nothing in the model said lips and tongue are
different organs.

Replace that with six things a person actually has: **jaw, tongue body position, tongue body
height, tongue tip, lip aperture**, and later the velum.

**Feasibility, measured before committing:** an articulator model reaches **9 of 11 English
vowels within 10%** — the same accuracy as the abstract parameterisation. More tellingly, the
articulations it found are correct without being told any phonetics: /i/ came out high and
front, /ɑ/ low and back with an open jaw, /u/ with rounded lips, and schwa with the tongue at
rest and the jaw nearly closed. That is the vowel quadrilateral, recovered from tube acoustics.

**What it buys:**

- **Impossible solutions become impossible.** A tongue cannot be in two places, and lips are
  not part of it. The rounded-lip lateral could not have been proposed.
- **Six shared parameters instead of sixty-five.** Every phoneme currently carries five
  abstract numbers of its own. Articulators are shared, so the search space means something.
- **Coarticulation stops being interpolation.** A tongue has mass and cannot teleport;
  transitions become physical rather than linear blends between abstract shapes.
- **The picture becomes the point.** A mid-sagittal view — palate, tongue, jaw, lips — driving
  the area function that drives the tubes. You watch the tongue make the vowel.

**Done when:** every phoneme in the inventory is expressed as articulator positions, and the
mid-sagittal view and the tube view are two renderings of the same state.

### Does this break the rest of the plan?

No, and it helps three of the remaining phases:

| phase | interaction |
|---|---|
| **1 — tournament** | Untouched. The tournament tunes the *voice*; articulation belongs to the *word*. Seeds stay stable. |
| **2 — lateral branch** | Improved. The branch taps wherever the tongue tip is, instead of a hand-solved position — and the rounded-lip failure becomes unreachable. |
| **3 — LF source** | Orthogonal. The source sits upstream of the tract and does not care how the tube got its shape. |
| **4 — prosody** | Improved. Articulator mass gives transition timing a physical basis rather than a tuned constant. |
| **5 — rest of English** | Substantially helped. Nasals need a **velum**, which is an articulator. Fricatives need turbulence injected *at the constriction*, and an articulatory model knows where the constriction is by construction. |
| **library** | Improved. A word becomes a sequence of articulator targets — smaller, and portable across voices. |

The one real cost is a one-time re-solve of the whole phoneme inventory in articulator space,
plus a likely small accuracy loss on the rounded back vowels, which want finer lip modelling
than a single aperture parameter provides.

---

## Phase 3 — the shout source  ✅ built

The glottal source is currently a Rosenberg pulse. That is a model of **speech**.

A shout is not loud speech. It is *pressed phonation*: higher subglottal pressure, more abrupt
glottal closure, a different spectral slope, and more energy in the upper harmonics. Turning up
the gain on a speech source produces loud speech, which is why the cry still sounds like a
synthesizer rather than a person.

The replacement is the **LF model** (Fant, Liljencrants & Lin 1985), which parameterises the
derivative of glottal flow. Fant's later `Rd` collapses its shape onto a single knob sweeping
breathy → modal → pressed. One control, physically grounded, measurable through H1–H2.

This is the most likely single change to move the result from *instrument* to *person*.

**Built.** LF implemented with Fant's Rd mapping, eps and alpha solved by Newton iteration at
parameter-change time rather than per sample. Verified inside the shipping engine: H1-H2 runs
from **-5.3 dB at Rd 0.4 (pressed) to +12.8 dB at Rd 2.2 (breathy)**, matching published ranges.
Effort is linked: Rd falls toward the pressed end at the peak of a word, so a shout presses
rather than merely getting louder. Rd and press replaced the two Rosenberg knobs in the voice
vector, so seeds still load positionally.

**Original criterion:** H1–H2 sits in the pressed range at peak effort, and the source can sweep from
breathy to pressed without the tract changing.

---

## Phase 4 — prosody  ◐ partial

The shape of the shout over time: the onset, the climb, the sustained strain at the top, the
fall at the end. Roughly six parameters — pitch arc, effort arc, drawl distribution, final
descent, and the amount and rate of roughness.

All of these are perceptual. None of them should be guessed. They are exactly what the Phase 1
tournament is for.

**Done when:** the ear says so.

---

## Phase 5 — the rest of English  ✅ built

**5a built.** The nasal tract is a second branch — 11 cm, open at the nostrils — coupled by a
velum parameter. /m n ŋ/ are the /b d g/ closures with the velum open, and they measure as
proper murmurs (F1 330/380/415 Hz). One anatomical bug worth recording: the velopharyngeal port
was first placed at u=0.57, *downstream* of a velar closure, which sealed the nose off from the
glottis and left /ŋ/ completely silent. It has to sit upstream of the closure.

Voiceless stops are the same articulations with the folds apart: voicing gated to zero during
closure and a release about four times stronger, because a /k/ is aspirated where a /g/ is not.

The inventory is now **22 phonemes**, and *Maximus* is down to a single missing sound class.


Everything above serves one word. This phase makes the instrument general.

The current inventory is twelve vowels plus /l b d g/, which is enough for **goal, gold, ball,
bulldog, dad, good, bird** and any other word built from voiced stops and vowels. It is not
enough for most names. Taking "Maximus" — /m æ k s ɪ m ə s/ — as the worked example, three
things are missing, and they differ enormously in cost:

| missing | what it needs | cost |
|---|---|---|
| /m n ŋ/ nasals | side branch coupled at the velum | ✅ **built** |
| /p t k/ voiceless stops | existing closure, voicing gated off, aspiration on release | ✅ **built** |
| /s ʃ f θ/ fricatives | sustained turbulence at a constriction, plus the short front cavity that gives sibilants their resonance | ✅ **built** |

Note the ordering that falls out of this: **Phase 2 pays for the nasals as a side effect.** The
branched waveguide built to fix the /l/ is the same mechanism that opens the velopharyngeal
port. Voiceless stops are close to free once it exists — the tube already seals and releases;
what changes is that the glottis is quiet and the burst is aspirated rather than voiced.

Fricatives are the genuine addition. A noise source has to be injected *at* the constriction
rather than at the glottis, with its level driven by the pressure drop and the constriction
area, and sibilants need geometry fine enough to resolve the small cavity in front of the teeth
that puts /s/ up around 4–8 kHz. That may also force a higher section count.

**5b built.** Turbulence is generated at the constriction and injected *forward*, so only the
cavity in front of it shapes the result — which is the whole reason /s/ is high and /ʃ/ lower.
The /s/ articulation was solved for a narrow gap well forward (tip at u=0.91, gap 0.18) leaving
a 1.6 cm front cavity. Measured: peak in the sibilant range with 70% of energy above 3 kHz.
A **hiss** parameter joined the tournament.

**Done — the app says names it was never tuned for.** Inventory 26 phonemes.
*Maximus, Solana, Max* all render clean.

**Original criterion:** the app can say a name it was never tuned for.

---

## The voice library  ✅ built

**A voice is now one vector, and a seed is the whole voice.** Seventeen parameters covering
source (Rd, effort, jitter, breath), radiation, timing (seconds per sound, drawl, glide, stop
hold), the burst and hiss, the vowel opening, and **tract length in sections**. Thirty-four
characters. Every preset round-trips exactly, which means a tuned voice can be handed back as a
string and baked in as a default.

Current preset seeds. Paste one into the Lab to restore that voice exactly, or hand a tuned
one back to be baked in as a new default:

```
    Goal announcer  2aulgsqnawl6gpc67imbafci4ad9se26qq00
    John            fz6hc0qnawk41514192wafci4ad9om1t1j00
    John shouting   3issflqnawnab87g3xllafci4ad9om26qq00
    Man             aj6hc0qnawj22b2q272wafci4ad9ub1t3m00
    Woman           ft5ec0qnawm8hahmgw2wafci4ad9ls1t3m00
    Child           hk4bflqnawnar2rar82wafci4ad9g31t3300
    Helium          aj6hc0qnawj22b2q272wafci4ad94q1t3m00
    Whisper         z300llqnawri77777u3mafci4ad9se135500
    Barry White     7k7xd7wiawj200000051afci4ad9w73m5500
```

Presets ship as complete vectors; **Custom** is what you get the moment you touch a slider or
choose in the Lab, and it reveals the timing and tract-length editors. Everything else stays
hidden, because a preset that can be half-edited is a preset you cannot trust.

One caveat worth stating: **per-phoneme articulation is still global.** The tongue postures for
/o/ or /s/ are shared by every voice; only the tube length changes. Making postures per-voice —
so a child rounds differently from an announcer — is a further step, and probably the right one
eventually.

Voices are presets over source *and tract length*, because length is what makes a voice read as
a man, a woman or a child — pitch alone does not. Measured on /ɑ/: 17.5 cm gives 680/1070,
14.7 cm gives 815/1280, 12.3 cm gives 980/1535. Those ratios are exactly the length ratios, and
they land on published adult-female and child data.

Helium is the same knob by another route, and the best demonstration in the app: the gas carries
sound faster, so the same source at the same pitch rings an acoustically much shorter tube.
Source and filter come apart audibly.

Shipping: **Goal announcer, Man, Woman, Child, Helium, Whisper.** Any voice can say any word.

---

## Phase 6 — words from spelling  ✅ built

Typing *Maximus* and having it work, instead of tapping out `m æ k s ɪ m ə s`.

**The catch is ordering.** Grapheme-to-phoneme is only useful once Phase 5 exists. Today the
inventory is twelve vowels and four consonants, so a converter would spend most of its time
reporting phonemes the model cannot pronounce. It belongs after the rest of English, not before.

**The approach**, in increasing cost:

1. **A hand-written dictionary.** For a family project this is not a compromise, it is the
   right answer for the words that matter most. Names are exactly where automatic conversion is
   worst, and there are perhaps thirty that count.
2. **Letter-to-sound rules.** The NRL rule set (Elovitz, Johnson, McHugh & Shore, 1976, NRL
   Report 7948) is the classic: 329 rules, and the report claims correct pronunciations for
   about **90%** of words in average text. Later independent evaluations put practical accuracy
   lower, and names are much worse than either figure. *(Corrected: this used to say the rules
   are "still used in eSpeak" and cite 70–85%. eSpeak ships its own per-language rule files and
   no source connects it to the NRL set, and 70–85% was not the report's own number.)*
3. **Rules plus an exception list**, which is what practical systems actually ship. The
   exception list is the dictionary from (1), and it grows every time someone corrects it.

**The feature that makes it work regardless of accuracy:** show the phonemes it chose, let them
be edited by tapping, and remember the correction. Then a wrong guess costs one tap and is wrong
only once. Given that the words we care about are family names, the personal dictionary will
outperform any general converter within a week of use.

**Usable before Phase 5:** the same machinery answers *"can this word be said yet?"* — which
turns the missing-phoneme list into something concrete rather than abstract.

**Built.** Rules first (digraphs, magic-e, soft c and g, common endings), then a personal
dictionary in local storage that overrides them. Five approximants — /w j r h v/ — were added
to make English spelling reachable; they are vowel postures with no closure, so they cost
nothing. Every test word came out sayable, with the expected failures on names: *solana* rules
to `s ɑ l æ n æ` rather than `s o l ɑ n ə`. Correcting it takes one tap and holds.

**Done — a name can be typed, corrected once if needed, and spoken thereafter.**

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

## Per-voice articulation  ✅ built

Postures were **global**: every voice moved its tongue identically and only the tube length
changed. That cannot represent a real speaker. The measured /u/ and /ʊ/ in the reference
recording are *fronted* by around 400 Hz in F2 — a dialect feature, not a tract-length one,
and shared postures have no way to express it.

A voice may now carry its own postures and fall back to the shared ones for anything it does
not override. Fitted against the recording: **mean vowel error 21% with generic postures, 4%
with measured ones.**

**Consonants are still hand-placed**, from articulatory description — "tip to the ridge",
"body to the velum" — then adjusted until the acoustics looked right. They are not fitted to
anyone. That is the next honest gap.

### The estimator that invented a formant

The first fit reported every vowel within 0.5–4%. The postures it produced were wrong. It had
optimised against **LPC**, which for two of the vowels placed F2 around 2500 Hz where the
transfer function has no peak at all — /ɛ/ came out 1620 Hz adrift. Plotting the spectrum
settled it in one look: peaks at 500, 900 and 2950, and nothing between.

Sixth time in this project that a measurement, rather than a piece of reasoning, has been the
thing that was wrong. The rule that keeps holding: **peak-pick the transfer function; do not
trust LPC**, and when two estimators disagree, plot the thing.

---

## Consonants, measured

Consonant postures were the last part of the model with no evidence behind them — described
rather than measured, then adjusted until the acoustics looked plausible. The reference
recording covers all of them, so they were extracted by acoustic signature rather than by
position: a fricative is the frame with the most high-frequency energy relative to low, a
nasal murmur is the frame with the lowest first formant.

**Approximants and nasals fitted cleanly** — /r/ to 1%, /ŋ/ to 0%, /n/ and /j/ and /l/ to 4%.
The measured nasals have first formants at 234–307 Hz where the model had 330–415; a real
murmur is lower than I had it.

**Fricatives took four attempts and a reversal.** The measurements said the whole family was
far too bright: /ʃ/ at 4250 Hz against a real 2188, /f/ at 6050 against 2438, /θ/ at 9800
against 1750. Three structural fixes followed, each from the same observation — that a
sibilant has a front cavity and an obstacle to strike, and a labiodental or dental has
neither:

- the low cut has to **track the sound**, because a fixed 2.8 kHz corner cannot produce a
  fricative that peaks at 2.2 kHz — it removes exactly the band that sound lives in;
- a fricative is **broadband noise with a resonance on top**, not a resonator fed by noise,
  which is why /ʃ/ had no high tail;
- and **no cavity means no resonance claim** — three sections is not a resonator and should
  not be allowed a 7 kHz quarter-wave.

The reversal: I also tilted the source down for cavity-less fricatives, reasoning that slow
channel turbulence must be low-frequency. The recording disagreed — /f/ carries 65% of its
energy above 3 kHz and /ð/ 63%. They are not low, they are **broad**: a low peak with a long
tail. Removed.

Hand-tuning oscillated between 18 and 28 points of error; a systematic fit with **averaged**
measurements reached 6 on the sibilants and 16 on the rest. Averaging matters because a single
render of a noise source varies by a third, so tuning against one measurement is tuning
against the noise.

**Scope.** The first fricative fits were made at the reference speaker's tract length and did
not transfer — installing them globally broke sibilants at other lengths, because a fricative's
peak is set by the cavity in front of the constriction and that cavity scales with the tube.

So the generic inventory was refitted **at its own default length**, against the same recording
with the targets scaled by the tract ratio (peaks scale inversely with length; the
high-frequency *share* is a shape property and carries across unchanged). Mean error in
high-frequency share: **34 points hand-placed, 9 points fitted**, with every level landing in a
sensible band.

Two things made the fit work that did not work by hand. **Seeding from the target geometry** —
`front cavity = c/4f` fixes where the constriction has to sit, and a hill-climb started from
wherever the posture happened to be fell into a 400 Hz minimum for /ʃ/. And **averaging the
measurements**, because one render of a noise source varies by a third.

The last correction came from the recording again: with no front cavity the low-cut corner was
dropping very far and the lows swamped the sound — but a narrow aperture at the lips radiates
highs *better*, not worse, and a real /f/ carries 65% of its energy above 3 kHz.

---

## Phase 7 — pushing the physics

Measured against a real recording, the model is within 5–8 dB below 3 kHz and **10–17 dB
short above 5 kHz**. It is duller than the speaker. That deficit is the sound of missing
physics, and most of it can be named.

Ordered by expected payoff:

### 7a. Source–tract interaction  ✅ built

The glottis is not a fixed boundary. It is a hole whose area changes over every cycle — wide
open at peak flow, sealed at closure — so the reflection coefficient at that end should change
with it. Ours is a constant 0.75. Real folds are also *loaded* by the tract: the pressure wave
returning from above pushes back on them and skews the flow pulse. This is the difference
between a source that plays into a tube and a source that is part of one, and it is the most
likely single cause of the missing high end.

**Built.** The reflection now follows the glottal area, `r = (A1 − Ag)/(A1 + Ag)`: **0.99
when the folds seal, 0.88 at peak flow, 0.68 when they are abducted** for a voiceless sound.
Previously a flat 0.75 — the folds were not being loaded by the tract at all.

Two things fell out of building it. The first attempt derived glottal area from flow alone,
which made it *zero* during voiceless sounds — modelling abducted folds as sealed, the exact
opposite of the truth, and turning the glottis into a mirror. The gate caught it as a broken
sibilant at one tract length. The second is that abduction opens the glottis *wider* than the
phonatory cycle ever does, so the voiceless case needed its own value rather than a scaled one.

And a measurement worth keeping: the model's high-frequency deficit against a real recording
turned out to be **aspiration**, not losses or radiation. Every preset had breath set at
0.02–0.045; real modal phonation leaks considerably more, because the folds never seal
perfectly and there is always turbulence riding on the voice. Raising it closed most of a
10–17 dB gap above 5 kHz.

### 7b. Frequency-dependent losses  ❌ attempted, reverted

One damping constant is applied everywhere. Real losses are not flat: viscous and thermal
boundary-layer losses scale roughly with √f and with the inverse of the radius, and soft walls
absorb low frequencies through compliance. The audible consequence is **formant bandwidth** —
a real F1 is narrow and a real F3 is wide, where ours are all much the same. Flat bandwidths
are a large part of what makes synthetic speech sound like a filter bank.

**Measured first:** our bandwidths run 24–68 Hz with no trend from F1 to F3, against real
values of 50–90 for F1 and 110–180 for F3. So the diagnosis was right — a real F3 is two to
three times wider than a real F1, and ours were all alike.

**Two implementations, both reverted.**

*Per-section one-pole lowpass.* Gives exactly the right tilt — F3/F1 bandwidth ratio went from
0.7× to 1.9× — and loss that grows in narrow sections, which is physically correct. But
forty-four cascaded one-poles carry forty-four lots of group delay. That lengthens the tube:
F1 fell 11%, and every vowel drifted off its target.

*Consolidated at the boundary.* One filter per round trip instead of forty-four, which is
standard waveguide practice and mostly fixes the drift. But one filter is too gentle to reach
realistic bandwidths, and pushing it hard enough (wallK 0.82) brought the delay back —
vowel accuracy collapsed from 11/12 to 4/12, the uniform-tube validation shifted from
500/1500/2500 to 475/1430/2385, and stop releases went to 240% of the vowel.

**The trade, measured:** at the strongest setting that keeps 11 of 12 vowels, the bandwidth
ratio only reaches ~1.3×. The realism gained does not pay for the accuracy lost, so it is out.

**What it would take.** The obstacle is group delay, not the loss model. Doing this properly
means either a delay-compensated loss filter (shorten the delay lines by exactly the filter's
group delay, which varies with frequency and so needs an allpass to do honestly), or moving to
a formulation where losses are applied in a way that does not add delay at all. Both are real
work, and neither is a tuning exercise. Left documented rather than half-done.

### 7c. Finer sections

At 44.1 kHz with two scattering steps per sample the sections are 3.97 mm. A vowel resonance
spans dozens of them; the front cavity that gives /s/ its character spans **six**. Four steps
per sample halves the section length and roughly doubles the cost. This is the one that would
most improve fricatives.

### 7d. Two-mass folds  ✅ built

Replace the prescribed LF waveform with an oscillator: two coupled masses driven by
subglottal pressure. **Built, and selectable** — *Advanced → Vocal folds → oscillator*.

Three things fell out of the physics without being coded:

- **Pitch rises with tension** at an exponent of 0.44 against the spring law's 0.5. A mass on
  a spring, emerging.
- **Pitch also rises with breath pressure**, which is why a shout goes sharp.
- **Stiff folds at low pressure will not start at all.** That is phonation threshold pressure,
  a real and well-documented phenomenon, and nothing in the model mentions it.

**Two failures worth recording.** The first version never oscillated: with the folds held
*apart* at rest, the Bernoulli pressures on the two masses cancel and there is no net force —
it simply sat there. Real folds rest *adducted*, pressed together, so that subglottal pressure
has something to push against. And the second: a symmetric oscillator does **not** produce
jitter. It settles into a perfectly clean limit cycle, 0.00%. I had expected irregularity to
appear on its own and it does not.

**What it actually buys** is better than that. Real jitter comes from the *drive* — neural
firing is not perfectly regular and breath pressure wobbles. Feed the model a 10% wobble in
breath pressure and it returns **jitter 0.21% and shimmer 2.45%**, both in the healthy human
range, at a ratio of 11.8×. One input, correctly distributed across period, amplitude and
waveform shape. With a prescribed waveform you must set jitter and shimmer separately and
*choose* that ratio; here it is a consequence.

### What this will not achieve

It will not sound like a specific person. Sixty years of articulatory synthesis, up to and
including 3D MRI-derived models, has not managed that — while neural synthesis reached
human-indistinguishable a decade ago by learning a mapping and modelling nothing. The
achievable target here is *clearly intelligible, well-articulated speech that reads as a man
with roughly the right tract and pitch*. The value is that every part of it can be explained,
and you can watch it happen.

---

## The voice was too clean

Reported as *"unnatural peaks in the spectrogram"* and *"still robotic"*. Checking the output
against the tract's transfer function found no spurious resonances at all — every peak was a
harmonic, exactly where it should be. The problem was not wrong peaks. It was peaks that were
**too distinct**.

**Harmonic-to-noise ratio** measures this: how much energy sits *on* the harmonics against
*between* them. A perfectly periodic source puts everything on the harmonics and nothing in the
gaps, which is the comb-like appearance of synthesis and much of what makes it sound like a
machine. Real voices leak — the folds never seal perfectly, and there is always turbulence
riding on the voice.

Measured: **the model at 38 dB.** Published healthy voices sit around 15–25 — Praat's own
documentation puts a healthy sustained [a] near 20, and the clinical literature runs roughly
7–26. Thirty-eight is not a person.

*Corrected 2026-07: this section used to report the reference recording at 2–5 dB on the same
measure. That is the hoarse/pathological range, not a healthy one, and it was almost certainly
our estimator misreading a room recording. Nothing was calibrated against it — the band is
v < 30, from the published range — and the presets landed at 12–29 dB, inside the human band.
The number was wrong; the work it prompted was not.*

The fix is aspiration, and the parameter could not even reach it — `brth` was capped at 0.12
when about 0.20 was needed. Widened, and every preset raised. All nine now sit between 12 and
29 dB, inside the human band, with a check to keep them there.

Worth noting what this was *not*: not the formant bandwidths, not a bug in the tract, not the
new oscillator. Just a source that was cleaner than any real larynx.

---

## On flaky checks

Twice now a check has passed and failed at random, and both times the cause was the same:
**measuring a noise source once**. Frication is intermittent by design — the jet sheds eddies —
so a single render of /ʃ/ can report anywhere from 42% to 77% of its energy above 3 kHz. A
threshold anywhere in that range is a coin flip.

The second time it slipped through and deployed, because the gate's own run happened to pass
while a verification run failed. A flaky gate is worse than a failing one: it launders a
problem into a green tick.

The rule: **any check measuring a random process averages, over windows long enough to see
several cycles of whatever makes it random.** Five consecutive runs must agree before it counts
as stable.

---

## The harness

`node lab/check.js` — one command, one verdict, exit 0 means shippable. It drives the
**shipping engine**, extracted straight out of index.html, so it cannot drift from what
actually runs. Eleven checks, each with a band that exists because something once broke that
way: the uniform tube still resonating at c/4L, vowels against Peterson & Barney, stops sealing
at their own place of articulation, the lateral not collapsing into a /w/, nasals producing a
murmur, sibilants shaped rather than broadband, no clicks at releases, silence after a word
ends, every non-stop sound audible, output finite and unclipped, and Rd spanning the phonation
range.

Two rules learned the hard way. **Bands are calibrated against a known-bad build, not guessed** —
the click threshold sits at 220% because a deliberately over-driven burst measures 558% while
the shipping build measures 177%, and an earlier guess of 140% was flagging normal /d/
dynamics. And **the check must exit non-zero**: a gate that prints a failure but lets the
pipeline continue is not a gate, and one did exactly that here.

The harness found a real physics bug on its first run: the voice-bar decay was being applied to
nasals. That decay models pressure building behind a closure, but a nasal's closure has the
nose open, so pressure never builds — which is precisely why /m/ can be held forever and /b/
cannot. It was silencing /n/ and /ŋ/.

**On resolution.** The acoustic timestep is not a free parameter: section length = c × timestep,
so halving the step halves the section. At 44.1 kHz with two scattering steps per sample the
sections are 3.97 mm and articulation is recomputed every sample. For vowels that is ample — a
resonance spans dozens of sections. Where it bites is **sibilants**: the front cavity that gives
/s/ its character is only six sections long, so its resonance is quantised coarsely. Doubling to
four steps per sample would halve the sections and roughly double the CPU. That is the honest
case for finer resolution, and it is about fricatives, not about the model being under-sampled.

---

## Measured against a real voice

A recording of the whole phoneme set, 41 items, was analysed and fitted. Three findings, one
of which overturned a modelling decision.

**Tract length must come from F3.** Fitting length to F1 and F2 gave a flat, meaningless
minimum — everything from 40 to 52 sections landed within 1% — because those formants are
dominated by where the tongue is, so the search simply stretched the tube to cover for the
articulation model's limits. F3 barely moves with articulation; it tracks the tube. It gave
15.9 cm cleanly.

**/u/ and /ʊ/ sit ~400 Hz higher in F2 than Peterson & Barney.** That is not error, it is
*/u/-fronting* — a documented shift in modern American English, strongest in the West. The
1952 data was recorded from speakers born around 1900. Targets drawn from published averages
carry a seventy-year-old dialect.

**The goal cry does not open, and I had it backwards.** I had modelled a shouted vowel as
opening — the jaw dropping as it is held, turning a long /o/ into "goooaaa". Measured on a
real cry: F1 fell 35 Hz and F2 fell 73 Hz across 2.9 seconds. The vowel *closes* slightly and
sits backer and more rounded than any vowel in the speaker's own set. The pitch also falls
monotonically, 158 to 93 Hz, where the model had it rise then fall. Three assumptions, all
reasonable, all wrong, and none of them findable without a recording.

That is the argument for measuring rather than reasoning, stated as plainly as this project
can state it.

---

## Open faults

Things known to be wrong, so they are not rediscovered as surprises.

**The voice sounds hoarse, and the noise LEVEL is not why.** Noticed by ear, and it survives
the obvious explanation. Harmonic-to-noise sits at 22.8 dB and every preset is between 12 and
29, which is inside the healthy human band — Praat puts a healthy sustained [a] near 20. So
there is not too much noise. What is wrong is its **colour**. Measured spectral tilt from
4–20 kHz, where real speech falls:

| | measured tilt | real speech |
|---|---|---|
| /ɑ/ | **+4.4 dB/oct** | −12 or steeper |
| /ʃ/ | +7.0 | falls above ~4 kHz |
| /ð/ | +10.8 | falls |
| /h/ | **−5.7** | −6 to −12 ✓ |

Everything rises toward Nyquist except /h/, and a vowel cannot do that. The cluster around
+4 to +7 dB/octave is the signature of a **differentiator**, which is exactly what lip
radiation is (R(z) = 1 − 1/z, +6 dB/oct) — correct physics that requires the source to roll off
to compensate. The breath noise mixed into the glottal source does not roll off. It goes in as
raw white noise:

    let src=(g*0.9 + (Math.random()*2-1)*this.breath*g)*this.vAmp;   // engine, unfiltered

The /h/ path and the stop-aspiration path both put their noise through a two-pole lowpass
first, and /h/ is the one sound on the list with a physically sane tilt. The filtered paths
behave; the unfiltered one does not.

This is one candidate cause for three separate complaints: the hoarseness, the `static` tag the
bench put on six sounds (g z ʃ ð v h), and the /ʃ ʒ h/ that read as hiss at levels where /f/
reads correctly — gain was measured and is not their problem. **Fix to try:** shape the breath
noise the way the other two noise paths already are. It touches every voice and every sound,
and it is coupled to the harmonic-to-noise band, so that band will want re-checking after.

**The dental fricatives hiss.** /ð/ in *mother* and *father* comes out as a staticy "sh"
rather than a soft voiced buzz. The measured target is a peak near 500 Hz with the energy
spread; the model puts it higher and noisier. Suspected cause: the aspiration raised across all
voices to fix the harmonic-to-noise problem also lands on the dentals, where there is very
little voicing to mask it. Not yet diagnosed properly.

**Consonant postures are fitted from one speaker.** The fricatives were refitted at the default
tract length with the targets scaled, but everything else — stops, nasals, approximants —
carries hand-placed generic postures, with only the measured voice getting fitted ones.

**Stop bursts are still tuned rather than derived.** A release is a pressure transient whose
strength should follow from the pressure built behind the closure and the speed of the opening.
It is currently a level parameter with a place-of-articulation scaling.

**The two-mass oscillator sounds more robotic than the waveform it replaced.** A symmetric
oscillator settles into a limit cycle more perfectly periodic than the LF path with jitter
applied. It is off by default. Making it sound better probably means asymmetry between the two
folds, which real larynges have and this model does not.

**No prosody above the word.** Pitch is an arc across a single word, and a phrase is words with
pauses between them. Real speech has phrase-level contours, stress, and final lengthening.

---

## Note on method

Four times during the earlier synthesis work, a confident diagnosis turned out to be a
measurement artefact rather than a real defect. The offline scoring in Phase 1 exists partly to
stop that happening again: every metric it reports should be checked against a case where the
answer is independently known before it is trusted to judge anything.
