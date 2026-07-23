# Recording a voice

One file per person. Say each item once, clear pause between — the analyser splits on silence.
Phone voice memos are fine; any format ffmpeg reads works.

## Full set (adults)

**Sustained** — the single most useful item
> "uhhhhhh" — about three seconds, steady, comfortable pitch

**Vowels** — the Peterson & Barney /hVd/ set, directly comparable to the data the model targets
> heed · hid · head · had · hod · hawed · hood · who'd · hud · heard

**Consonants**
> bad · pad · dot · tot · goat · coat · sue · shoe · fan · van · led · red · ram · ran · rang

**And**
> GOOOOAAALLL

## Short set (children, or anyone impatient)

> "uhhhhhh" (three seconds) · heed · had · hod · who'd · hud · their own name · GOOOOAAALLL

Eight items. Enough for tract length, pitch, voice quality and the cry.

## Running it

    python3 lab/voice-fit.py <file> --labels uh,heed,hid,head,had,hod,hawed,hood,whod,hud,heard
    node   lab/fit-preset.js /home/claude/voice-fit.json <name>

The first measures F0, formants, H1-H2 and spectral tilt per segment. The second fits one
tract length across the whole vowel set, re-solves each vowel's articulation at that length,
derives the source parameters, and prints a seed.

## The impersonation experiment

Record the same list twice — once normally, once *as* Barry White. You cannot grow a vocal
tract, so the difference in fitted length is exactly how much lengthening larynx-lowering and
lip protrusion actually buy. Everything beyond that is source and prosody, and the diff says
which is which.

## Known limits

- Tract length came back ~8% low on a synthetic test where the truth was known. The fitted
  articulations compensate, so the sound matches even where the number drifts.
- H1-H2 to Rd is an approximate mapping; expect to tune it by ear afterwards.
- Per-phoneme articulation is still shared across voices. Fitting a real person is the
  argument for finally making postures per-voice.
