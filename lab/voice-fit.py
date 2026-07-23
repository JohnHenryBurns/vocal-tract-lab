#!/usr/bin/env python3
"""
Measure a real voice and report what the model should be set to.

    python3 lab/voice-fit.py <recording> [--labels heed,hid,...]

Decodes anything ffmpeg can read, splits on silence, and for each segment reports
F0, the first four formants, voice-quality measures, and — from a sustained vowel —
an estimate of the speaker's vocal tract length.

Nothing here is guessed. Every number is measured, and where a number feeds a model
parameter the mapping is stated.
"""
import sys, subprocess, wave, struct, math
import numpy as np

SR = 16000            # plenty for formants; keeps LPC well conditioned
C  = 35000.0          # speed of sound, cm/s


def decode(path):
    """Anything -> mono float array at SR."""
    out = subprocess.run(
        ["ffmpeg", "-v", "quiet", "-i", path, "-ac", "1", "-ar", str(SR),
         "-f", "wav", "-"], capture_output=True, check=True).stdout
    # find the data chunk rather than assuming a 44-byte header
    i = out.find(b"data")
    n = struct.unpack("<I", out[i+4:i+8])[0]
    pcm = np.frombuffer(out[i+8:i+8+n], dtype="<i2").astype(np.float64) / 32768.0
    return pcm


def segments(x, floor_db=-42, min_len=0.18, pad=0.03):
    """Split on silence. Returns [(start_s, end_s)]."""
    win = int(0.02 * SR)
    frames = [x[i:i+win] for i in range(0, len(x) - win, win)]
    e = np.array([20 * math.log10(np.sqrt((f ** 2).mean()) + 1e-12) for f in frames])
    peak = e.max()
    on = e > (peak + floor_db)
    segs, start = [], None
    for i, v in enumerate(on):
        if v and start is None:
            start = i
        elif not v and start is not None:
            a, b = start * win / SR, i * win / SR
            if b - a >= min_len:
                segs.append((max(0, a - pad), b + pad))
            start = None
    if start is not None:
        segs.append((max(0, start * win / SR - pad), len(x) / SR))
    return segs


def f0_of(seg):
    """Autocorrelation pitch, with an octave guard."""
    x = seg - seg.mean()
    x *= np.hanning(len(x))
    ac = np.correlate(x, x, "full")[len(x) - 1:]
    lo, hi = int(SR / 400), int(SR / 55)
    if hi >= len(ac):
        return 0.0
    region = ac[lo:hi]
    if not len(region) or ac[0] <= 0:
        return 0.0
    lag = lo + int(np.argmax(region))
    # if half the lag also correlates well, the true period is the shorter one
    half = lag // 2
    if half > lo and ac[half] > 0.8 * ac[lag]:
        lag = half
    return SR / lag


def formants(seg, order=14, n=4):
    """LPC formants from the steady middle of a segment."""
    mid = seg[len(seg)//3: len(seg)*2//3]
    if len(mid) < 256:
        mid = seg
    x = np.append(mid[0], mid[1:] - 0.97 * mid[:-1])      # pre-emphasis
    x = x * np.hamming(len(x))
    r = np.correlate(x, x, "full")[len(x)-1:][:order+1]
    if r[0] <= 0:
        return []
    a = np.zeros(order + 1); a[0] = 1.0; err = r[0]
    for i in range(1, order + 1):
        acc = r[i] - sum(a[j] * r[i-j] for j in range(1, i))
        k = acc / err
        new = a.copy()
        for j in range(1, i):
            new[j] = a[j] - k * a[i-j]
        new[i] = k
        a = new
        err *= (1 - k*k)
        if err <= 0:
            break
    coef = np.concatenate(([1.0], -a[1:order+1]))
    roots = np.roots(coef)
    roots = [z for z in roots if np.imag(z) > 0.01]
    fs = sorted((float(np.angle(z) * SR / (2*np.pi)),
                 float(-0.5 * (SR/np.pi) * np.log(abs(z)))) for z in roots)
    return [(f, bw) for f, bw in fs if 150 < f < 5200][:n]


def quality(seg, f0):
    """H1-H2 (pressed vs breathy) and spectral tilt."""
    if f0 <= 0:
        return None, None
    N = 1 << int(math.log2(len(seg)))
    x = seg[:N] * np.hanning(N)
    S = np.abs(np.fft.rfft(x)) + 1e-12
    fr = np.fft.rfftfreq(N, 1/SR)
    def at(f):
        k = int(np.argmin(np.abs(fr - f)))
        return 20*math.log10(S[max(1,k-2):k+3].max())
    h1h2 = at(f0) - at(2*f0)
    tilt = at(3000) - at(500)
    return h1h2, tilt


def tract_length(fs):
    """A uniform tube resonates at (2n-1)c/4L, so the SPACING gives L directly."""
    if len(fs) < 3:
        return None
    f = [x[0] for x in fs]
    gaps = [f[i+1] - f[i] for i in range(len(f)-1)]
    spacing = float(np.median(gaps))          # ~ c/2L
    return C / (2 * spacing)


def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    path = sys.argv[1]
    labels = []
    if "--labels" in sys.argv:
        labels = sys.argv[sys.argv.index("--labels")+1].split(",")

    x = decode(path)
    print(f"\n{path}  —  {len(x)/SR:.1f} s at {SR} Hz\n")
    segs = segments(x)
    print(f"found {len(segs)} segments\n")
    print("  #   label      start    dur     F0      F1    F2    F3    F4    H1-H2  tilt")
    rows = []
    for i, (a, b) in enumerate(segs):
        seg = x[int(a*SR):int(b*SR)]
        if len(seg) < 512:
            continue
        f0 = f0_of(seg)
        fs = formants(seg)
        h1h2, tilt = quality(seg, f0)
        lab = labels[i] if i < len(labels) else ""
        fstr = "  ".join(f"{f:4.0f}" for f, _ in fs) + "      " * (4 - len(fs))
        print(f"  {i:<3} {lab:<10} {a:5.2f}  {b-a:5.2f}  {f0:5.0f}   {fstr}"
              f"  {('%5.1f' % h1h2) if h1h2 is not None else '    -'}"
              f"  {('%5.1f' % tilt) if tilt is not None else '    -'}")
        rows.append(dict(i=i, label=lab, a=a, b=b, f0=f0,
                         F=[f for f, _ in fs], BW=[bw for _, bw in fs],
                         h1h2=h1h2, tilt=tilt))

    # Tract length from a SINGLE vowel is unreliable — /i/ gave 9.3 cm for an 18.3 cm tube,
    # because a high front vowel is nothing like a uniform tube and its formant spacing is
    # meaningless. Prefer a labelled neutral vowel; otherwise use the flattest spectrum,
    # and say plainly that it is approximate. The trustworthy number comes from FITTING the
    # model to the whole vowel set, where length is one parameter against ten constraints.
    if rows:
        neutral = next((r for r in rows if r["label"].lower() in
                        ("uh", "schwa", "ə", "sustained", "neutral", "hud")), None)
        if neutral is None:
            def evenness(r):
                f = r["F"]
                if len(f) < 4: return 1e9
                g = [f[i+1]-f[i] for i in range(len(f)-1)]
                return float(np.std(g) / (np.mean(g) + 1e-9))
            neutral = min(rows, key=evenness)
        L = tract_length(list(zip(neutral["F"], neutral["BW"])))
        print(f"\nreference segment: {neutral['label'] or '#'+str(neutral['i'])} "
              f"({neutral['b']-neutral['a']:.1f} s)")
        if L:
            print(f"  vocal tract length  ≈ {L:.1f} cm  (±15% — a real schwa is not a uniform tube)")
            print(f"  model sections      ≈ {round(L/100 / (350/(44100*2))):d}   "
                  f"— treat as a starting point, not the answer")
        steady = neutral
        print(f"  F0                  ≈ {steady['f0']:.0f} Hz")
        if steady["h1h2"] is not None:
            rd = max(0.35, min(2.4, 0.55 + 0.13 * steady["h1h2"]))
            print(f"  H1-H2               = {steady['h1h2']:.1f} dB  ->  Rd ≈ {rd:.2f}")
        f0s = [r["f0"] for r in rows if r["f0"] > 0]
        if len(f0s) > 2:
            print(f"  F0 across all words : {min(f0s):.0f} – {max(f0s):.0f} Hz "
                  f"(median {np.median(f0s):.0f})")

    import json
    out = "/home/claude/voice-fit.json"
    json.dump(rows, open(out, "w"), indent=1)
    print(f"\nwritten to {out}")


if __name__ == "__main__":
    main()
