// ─────────────────────────────────────────────────────────────────────────────
// THE PHONEME LAYER. One copy, in a file.
//
// The tract shapes, the phoneme classes, the voice table, and the articulation and
// word-building that turn them into keyframes. This used to live inside index.html, which
// meant every other consumer had to re-derive it by regex: bench.html pulled ART, VOICES,
// articulate and buildWord out of the page with fifteen regular expressions, and harness.js
// did the same and then kept its OWN near-copy of buildWord called plan() — with a comment
// admitting that "the harness having its own slightly different copy of this is exactly how
// a gate ends up testing the wrong thing". It was right. This is that fixed.
//
// It is a classic script on purpose. index.html's top-level scoping does not change: the page
// loads this first and aliases what it needs, so every existing reference still resolves.
//
//   browser   <script src="engine/phonemes.js"></script>   then use VTL.*
//   node      const P = require("./engine/phonemes.js")
//
// Nothing here touches the DOM, the AudioContext, or any module-level mutable state. Given the
// same arguments it returns the same thing, which is what makes it shareable.
// ─────────────────────────────────────────────────────────────────────────────
(function (root) {
'use strict';

// ---- the solved tract shapes ----
// Positions are normalised (0 = glottis, 1 = lips) so they survive any sample rate.
const ART = {
 "i": {
  "jaw": 0.133,
  "bodyPos": 0.61,
  "bodyHi": 0.67,
  "tipPos": 0.88,
  "tipHi": 0.25,
  "lip": 0.65
 },
 "ɪ": {
  "jaw": 0.722,
  "bodyPos": 0.652,
  "bodyHi": 0.924,
  "tipPos": 0.807,
  "tipHi": 0.131,
  "lip": 0.789
 },
 "ɛ": {
  "jaw": 0.756,
  "bodyPos": 0.638,
  "bodyHi": 0.692,
  "tipPos": 0.904,
  "tipHi": 0.086,
  "lip": 0.966
 },
 "æ": {
  "jaw": 0.99,
  "bodyPos": 0.643,
  "bodyHi": 0.472,
  "tipPos": 0.742,
  "tipHi": 0.07,
  "lip": 0.879
 },
 "ʌ": {
  "jaw": 0.719,
  "bodyPos": 0.388,
  "bodyHi": 0.308,
  "tipPos": 0.731,
  "tipHi": 0.294,
  "lip": 0.646
 },
 "ɑ": {
  "jaw": 0.847,
  "bodyPos": 0.301,
  "bodyHi": 0.409,
  "tipPos": 0.817,
  "tipHi": 0.059,
  "lip": 0.889
 },
 "ɔ": {
  "jaw": 0.795,
  "bodyPos": 0.286,
  "bodyHi": 0.482,
  "tipPos": 0.84,
  "tipHi": 0.019,
  "lip": 0.438
 },
 "ʊ": {
  "jaw": 0.94,
  "bodyPos": 0.487,
  "bodyHi": 0.339,
  "tipPos": 0.84,
  "tipHi": 0.081,
  "lip": 0.304
 },
 "u": {
  "jaw": 0.651,
  "bodyPos": 0.493,
  "bodyHi": 0.451,
  "tipPos": 0.84,
  "tipHi": 0.037,
  "lip": 0.178
 },
 "ɝ": {
  "jaw": 0.958,
  "bodyPos": 0.829,
  "bodyHi": 0.33,
  "tipPos": 0.79,
  "tipHi": 0.215,
  "lip": 0.405
 },
 "ə": {
  "jaw": 0.065,
  "bodyPos": 0.638,
  "bodyHi": 0.106,
  "tipPos": 0.936,
  "tipHi": 0.198,
  "lip": 0.714
 },
 "o": {
  "jaw": 0.715,
  "bodyPos": 0.475,
  "bodyHi": 0.584,
  "tipPos": 0.84,
  "tipHi": 0.057,
  "lip": 0.374
 },
 "b": {
  "jaw": 0.25,
  "bodyPos": 0.3,
  "bodyHi": 0.1,
  "tipPos": 0.85,
  "tipHi": 0.0,
  "lip": 0.0
 },
 "d": {
  "jaw": 0.3,
  "bodyPos": 0.55,
  "bodyHi": 0.25,
  "tipPos": 0.83,
  "tipHi": 1.0,
  "lip": 0.765
 },
 "g": {
  "jaw": 0.28,
  "bodyPos": 0.56,
  "bodyHi": 1.0,
  "tipPos": 0.85,
  "tipHi": 0.0,
  "lip": 0.737
 },
 "l": {
  "jaw": 0.45,
  "bodyPos": 0.3,
  "bodyHi": 0.18,
  "tipPos": 0.84,
  "tipHi": 0.72,
  "lip": 0.812
 },
 "m": {
  "jaw": 0.25,
  "bodyPos": 0.3,
  "bodyHi": 0.1,
  "tipPos": 0.85,
  "tipHi": 0.0,
  "lip": 0.0
 },
 "n": {
  "jaw": 0.3,
  "bodyPos": 0.55,
  "bodyHi": 0.25,
  "tipPos": 0.83,
  "tipHi": 1.0,
  "lip": 0.765
 },
 "ŋ": {
  "jaw": 0.28,
  "bodyPos": 0.56,
  "bodyHi": 1.0,
  "tipPos": 0.85,
  "tipHi": 0.0,
  "lip": 0.737
 },
 "p": {
  "jaw": 0.25,
  "bodyPos": 0.3,
  "bodyHi": 0.1,
  "tipPos": 0.85,
  "tipHi": 0.0,
  "lip": 0.0
 },
 "t": {
  "jaw": 0.3,
  "bodyPos": 0.55,
  "bodyHi": 0.25,
  "tipPos": 0.83,
  "tipHi": 1.0,
  "lip": 0.765
 },
 "k": {
  "jaw": 0.28,
  "bodyPos": 0.56,
  "bodyHi": 1.0,
  "tipPos": 0.85,
  "tipHi": 0.0,
  "lip": 0.737
 },
 "s": {
  "jaw": 0.45,
  "bodyPos": 0.55,
  "bodyHi": 0.28,
  "tipPos": 0.85,
  "tipHi": 0.85,
  "lip": 0.931
 },
 "z": {
  "jaw": 0.35,
  "bodyPos": 0.55,
  "bodyHi": 0.28,
  "tipPos": 0.85,
  "tipHi": 0.85,
  "lip": 0.975
 },
 "ʃ": {
  "jaw": 0.45,
  "bodyPos": 0.55,
  "bodyHi": 0.28,
  "tipPos": 0.842,
  "tipHi": 0.8,
  "lip": 0.452
 },
 "f": {
  "jaw": 0.4,
  "bodyPos": 0.35,
  "bodyHi": 0.15,
  "tipPos": 0.869,
  "tipHi": 0.1,
  "lip": 0.088
 },
 "w": {
  "jaw": 0.651,
  "bodyPos": 0.493,
  "bodyHi": 0.451,
  "tipPos": 0.84,
  "tipHi": 0.037,
  "lip": 0.154
 },
 "j": {
  "jaw": 0.133,
  "bodyPos": 0.61,
  "bodyHi": 0.67,
  "tipPos": 0.88,
  "tipHi": 0.25,
  "lip": 0.65
 },
 "r": {
  "jaw": 0.958,
  "bodyPos": 0.829,
  "bodyHi": 0.33,
  "tipPos": 0.79,
  "tipHi": 0.215,
  "lip": 0.405
 },
 "h": {
  "jaw": 0.065,
  "bodyPos": 0.638,
  "bodyHi": 0.106,
  "tipPos": 0.936,
  "tipHi": 0.198,
  "lip": 0.714
 },
 "v": {
  "jaw": 0.3,
  "bodyPos": 0.35,
  "bodyHi": 0.15,
  "tipPos": 0.86,
  "tipHi": 0,
  "lip": 0.088
 },
 "ʒ": {
  "jaw": 0.45,
  "bodyPos": 0.55,
  "bodyHi": 0.28,
  "tipPos": 0.862,
  "tipHi": 0.8,
  "lip": 0.677
 },
 "θ": {
  "jaw": 0.43,
  "bodyPos": 0.5,
  "bodyHi": 0.2,
  "tipPos": 0.94,
  "tipHi": 0.86,
  "lip": 0.86
 },
 "ð": {
  "jaw": 0.38,
  "bodyPos": 0.5,
  "bodyHi": 0.2,
  "tipPos": 0.93,
  "tipHi": 0.8,
  "lip": 0.759
 }
};

// ---- the tract, shaped by things a person has ----
function restingDiam(n){
  const d=new Float64Array(n);
  for(let i=0;i<n;i++){
    const u=i/(n-1);
    d[i] = u<0.30 ? 1.45 : u<0.62 ? 1.45+(u-0.30)/0.32*0.75 : 2.20;
  }
  return d;
}
function hump(u,centre,width,height){
  const x=(u-centre)/width;
  if(Math.abs(x)>=1) return 0;
  return height*0.5*(1+Math.cos(Math.PI*x));
}
function articulate(A,n){
  const d=restingDiam(n);
  for(let i=0;i<n;i++){
    const u=i/(n-1);
    if(u>0.45) d[i]*=0.72+0.55*A.jaw;
    d[i]-=hump(u,A.bodyPos,0.30,A.bodyHi*2.05);
    d[i]-=hump(u,A.tipPos,0.085,A.tipHi*2.3);
    d[i]=Math.max(0.02,d[i]);
  }
  const lipD=0.02+2.66*A.lip;   // lip=0 must SEAL, or /b/ and /p/ leak
  for(let i=Math.floor(n*0.94);i<n;i++) d[i]=Math.min(d[i],lipD);
  d[0]=Math.min(d[0],0.8);
  return d;
}

const STOPS = { b:0.97, d:0.80, g:0.568 };   // lips · alveolar ridge · velum
const VELAR = STOPS.g;

// ---- the inventory, by class ----
const VOWEL_KEYS = ['i', 'ɪ', 'ɛ', 'æ', 'ʌ', 'ɑ', 'ɔ', 'ʊ', 'u', 'ɝ', 'ə', 'o', 'l'];
const STOP_KEYS  = ['b','d','g','p','t','k'];
const CONS_KEYS  = ['l','r','w','j','m','n','ŋ','b','d','g','p','t','k',
                    's','z','ʃ','ʒ','θ','ð','f','v','h'];
const APPROX=['l','m','n','ŋ','w','j','r'];   // sustainable consonants: short and quick
const DIPH={ 'aɪ':['ɑ','i'], 'aʊ':['ɑ','ʊ'], 'ɔɪ':['ɔ','i'], 'eɪ':['ɛ','i'], 'oʊ':['o','ʊ'] };
const BRANCHED={ l:1 };                 // /l/ opens the closed pocket at the tongue tip
const NASAL={ m:1, n:1, 'ŋ':1 };        // the velum opens the nasal tract
const VOICELESS={ p:1, t:1, k:1, s:1, 'ʃ':1, f:1, h:1, 'θ':1 };   // folds apart
const FRICATIVE={ 's':0.42, 'z':0.32, 'ʃ':1, 'ʒ':0.34, 'f':0.73, 'v':0.63, 'θ':0.16, 'ð':0.20 };
const ASPIRATE ={ h:1 };                               // turbulence at the glottis instead

const branchFor    = sym => BRANCHED[sym]  || 0;
const nasalFor     = sym => NASAL[sym]     || 0;
const voicelessFor = sym => VOICELESS[sym] || 0;
const fricFor      = sym => FRICATIVE[sym] || 0;
const aspFor       = sym => ASPIRATE[sym]  || 0;
const isPause = sym => sym === ' ';
const isDiph  = sym => !!DIPH[sym];

// ---- the voices ----
const VOICE_SPEC=[
  {k:'rd',   lo:0.35,   hi:2.40,    d:0.80},    // LF shape: pressed <-> breathy
  {k:'press',lo:0,      hi:1,       d:0.45},    // how much effort presses at the peak
  {k:'jit',  lo:0,      hi:3,       d:1},       // vocal-fold irregularity
  {k:'damp', lo:0.9985, hi:0.99985, d:0.9995},  // tract losses -> formant bandwidth
  {k:'lipR', lo:-0.95,  hi:-0.62,   d:-0.85},   // radiation at the lips
  {k:'brth', lo:0,      hi:0.34,    d:0.18},   // aspiration — the noise BETWEEN harmonics,    // aspiration
  {k:'f0a',  lo:80,     hi:330,     d:208},     // pitch: onset  (must reach a man at 110
  {k:'f0b',  lo:90,     hi:380,     d:250},     //        peak     and a child at 310)
  {k:'f0c',  lo:70,     hi:300,     d:190},     //        fall
  {k:'drawl',lo:0,      hi:1,       d:0.55},    // how much the first vowel is stretched
  {k:'glide',lo:0.03,   hi:0.22,    d:0.085},  // transition time between sounds
  {k:'stopT',lo:0.035,  hi:0.15,    d:0.075},  // how long a stop stays sealed
  {k:'burst',lo:0.02,   hi:1.2,     d:0.16},   // release strength; the seal does most of the work
  {k:'hiss', lo:0.3,    hi:2.2,     d:1.0},    // how hard fricatives hiss
  {k:'sect', lo:14,     hi:52,      d:44},     // tract length in sections (44 = 17.5 cm)
  {k:'open', lo:0,      hi:1,       d:0.05},   // how far a held vowel opens as it is shouted
  {k:'per',  lo:0.10,   hi:0.80,    d:0.17},   // seconds per sound
  {k:'folds',lo:0,      hi:1,       d:0},      // 0 = LF waveform, 1 = two-mass oscillator
];
const VOICES = {
  // Measured from a real goal cry: the pitch falls the whole way (158 -> 93 Hz) and the
  // vowel does NOT open. I had modelled it as an arc with the jaw dropping; the recording
  // says otherwise, so the recording wins.
  announcer:{ label:'Goal announcer', note:'Pressed and drawn out, pitch falling the whole way. Measured from a real cry.',
    v:{ rd:0.48, press:0.85, jit:1.4, brth:0.20, drawl:0.62, open:0.06, per:0.62,
        sect:44, f0a:196, f0b:188, f0c:118 } },
  john:{ art:{"i": {"jaw": 0.092, "bodyPos": 0.637, "bodyHi": 0.67, "tipPos": 0.88, "tipHi": 0.25, "lip": 0.65}, "ɪ": {"jaw": 0.785, "bodyPos": 0.602, "bodyHi": 0.924, "tipPos": 0.807, "tipHi": 0.131, "lip": 1}, "ɛ": {"jaw": 0.782, "bodyPos": 0.638, "bodyHi": 0.792, "tipPos": 0.904, "tipHi": 0.086, "lip": 0.966}, "æ": {"jaw": 0.825, "bodyPos": 0.823, "bodyHi": 0.381, "tipPos": 0.742, "tipHi": 0.07, "lip": 0.879}, "ɑ": {"jaw": 0.7, "bodyPos": 0.301, "bodyHi": 0.409, "tipPos": 0.817, "tipHi": 0.059, "lip": 0.589}, "ɔ": {"jaw": 0.33, "bodyPos": 0.336, "bodyHi": 0.482, "tipPos": 0.84, "tipHi": 0.019, "lip": 0.438}, "ʊ": {"jaw": 0.94, "bodyPos": 0.514, "bodyHi": 0.039, "tipPos": 0.84, "tipHi": 0.081, "lip": 0.282}, "u": {"jaw": 0.951, "bodyPos": 0.702, "bodyHi": 0.286, "tipPos": 0.84, "tipHi": 0.037, "lip": 0.178}, "ʌ": {"jaw": 0.33, "bodyPos": 0.223, "bodyHi": 0.308, "tipPos": 0.731, "tipHi": 0.294, "lip": 0.346}, "ɝ": {"jaw": 0.749, "bodyPos": 0.529, "bodyHi": 0.721, "tipPos": 0.79, "tipHi": 0.215, "lip": 0.378}, "ə": {"jaw": 0.891, "bodyPos": 0.55, "bodyHi": 0.406, "tipPos": 0.936, "tipHi": 0.198, "lip": 0.414}, "l": {"jaw": 0.428, "bodyPos": 0.52, "bodyHi": 0.43, "tipPos": 0.7, "tipHi": 0.191, "lip": 1}, "r": {"jaw": 0.617, "bodyPos": 0.708, "bodyHi": 0.147, "tipPos": 0.79, "tipHi": 0.435, "lip": 0.405}, "w": {"jaw": 0.718, "bodyPos": 0.85, "bodyHi": 0.584, "tipPos": 0.84, "tipHi": 0.39, "lip": 0.154}, "j": {"jaw": 0, "bodyPos": 0.677, "bodyHi": 0.603, "tipPos": 0.813, "tipHi": 0.2, "lip": 0.65}, "m": {"jaw": 0.349, "bodyPos": 0.15, "bodyHi": 0.441, "tipPos": 0.85, "tipHi": 0.22, "lip": 0.121}, "n": {"jaw": 0.28, "bodyPos": 0.55, "bodyHi": 0.03, "tipPos": 0.81, "tipHi": 0.78, "lip": 0.545}, "ŋ": {"jaw": 0.347, "bodyPos": 0.592, "bodyHi": 0.78, "tipPos": 0.85, "tipHi": 0, "lip": 0.737}, "s": {"jaw": 0.45, "bodyPos": 0.55, "bodyHi": 0.28, "tipPos": 0.85, "tipHi": 0.85, "lip": 0.975}, "z": {"jaw": 0.45, "bodyPos": 0.55, "bodyHi": 0.28, "tipPos": 0.85, "tipHi": 0.85, "lip": 1}, "ʃ": {"jaw": 0.35, "bodyPos": 0.55, "bodyHi": 0.28, "tipPos": 0.8, "tipHi": 0.75, "lip": 0.577}, "ʒ": {"jaw": 0.35, "bodyPos": 0.55, "bodyHi": 0.28, "tipPos": 0.8, "tipHi": 0.8, "lip": 0.627}, "f": {"jaw": 0.3, "bodyPos": 0.35, "bodyHi": 0.15, "tipPos": 0.68, "tipHi": 0.1, "lip": 0.088}, "v": {"jaw": 0.15, "bodyPos": 0.35, "bodyHi": 0.15, "tipPos": 0.84, "tipHi": 0, "lip": 0.088}, "θ": {"jaw": 0.18, "bodyPos": 0.5, "bodyHi": 0.2, "tipPos": 0.96, "tipHi": 0.79, "lip": 0.759}, "ð": {"jaw": 0.355, "bodyPos": 0.5, "bodyHi": 0.2, "tipPos": 0.945, "tipHi": 0.79, "lip": 0.984}}, label:'John', note:'Measured: a 15.9 cm tract from F3, modal voice, pitch around 93 Hz.',
    v:{ rd:1.26, press:0.18, jit:1.0, brth:0.19, drawl:0.08, open:0.05, per:0.13,
        sect:40, f0a:88, f0b:99, f0c:78 } },
  johncry:{ art:{"i": {"jaw": 0.092, "bodyPos": 0.637, "bodyHi": 0.67, "tipPos": 0.88, "tipHi": 0.25, "lip": 0.65}, "ɪ": {"jaw": 0.785, "bodyPos": 0.602, "bodyHi": 0.924, "tipPos": 0.807, "tipHi": 0.131, "lip": 1}, "ɛ": {"jaw": 0.782, "bodyPos": 0.638, "bodyHi": 0.792, "tipPos": 0.904, "tipHi": 0.086, "lip": 0.966}, "æ": {"jaw": 0.825, "bodyPos": 0.823, "bodyHi": 0.381, "tipPos": 0.742, "tipHi": 0.07, "lip": 0.879}, "ɑ": {"jaw": 0.7, "bodyPos": 0.301, "bodyHi": 0.409, "tipPos": 0.817, "tipHi": 0.059, "lip": 0.589}, "ɔ": {"jaw": 0.33, "bodyPos": 0.336, "bodyHi": 0.482, "tipPos": 0.84, "tipHi": 0.019, "lip": 0.438}, "ʊ": {"jaw": 0.94, "bodyPos": 0.514, "bodyHi": 0.039, "tipPos": 0.84, "tipHi": 0.081, "lip": 0.282}, "u": {"jaw": 0.951, "bodyPos": 0.702, "bodyHi": 0.286, "tipPos": 0.84, "tipHi": 0.037, "lip": 0.178}, "ʌ": {"jaw": 0.33, "bodyPos": 0.223, "bodyHi": 0.308, "tipPos": 0.731, "tipHi": 0.294, "lip": 0.346}, "ɝ": {"jaw": 0.749, "bodyPos": 0.529, "bodyHi": 0.721, "tipPos": 0.79, "tipHi": 0.215, "lip": 0.378}, "ə": {"jaw": 0.891, "bodyPos": 0.55, "bodyHi": 0.406, "tipPos": 0.936, "tipHi": 0.198, "lip": 0.414}, "l": {"jaw": 0.428, "bodyPos": 0.52, "bodyHi": 0.43, "tipPos": 0.7, "tipHi": 0.191, "lip": 1}, "r": {"jaw": 0.617, "bodyPos": 0.708, "bodyHi": 0.147, "tipPos": 0.79, "tipHi": 0.435, "lip": 0.405}, "w": {"jaw": 0.718, "bodyPos": 0.85, "bodyHi": 0.584, "tipPos": 0.84, "tipHi": 0.39, "lip": 0.154}, "j": {"jaw": 0, "bodyPos": 0.677, "bodyHi": 0.603, "tipPos": 0.813, "tipHi": 0.2, "lip": 0.65}, "m": {"jaw": 0.349, "bodyPos": 0.15, "bodyHi": 0.441, "tipPos": 0.85, "tipHi": 0.22, "lip": 0.121}, "n": {"jaw": 0.28, "bodyPos": 0.55, "bodyHi": 0.03, "tipPos": 0.81, "tipHi": 0.78, "lip": 0.545}, "ŋ": {"jaw": 0.347, "bodyPos": 0.592, "bodyHi": 0.78, "tipPos": 0.85, "tipHi": 0, "lip": 0.737}, "s": {"jaw": 0.45, "bodyPos": 0.55, "bodyHi": 0.28, "tipPos": 0.85, "tipHi": 0.85, "lip": 0.975}, "z": {"jaw": 0.45, "bodyPos": 0.55, "bodyHi": 0.28, "tipPos": 0.85, "tipHi": 0.85, "lip": 1}, "ʃ": {"jaw": 0.35, "bodyPos": 0.55, "bodyHi": 0.28, "tipPos": 0.8, "tipHi": 0.75, "lip": 0.577}, "ʒ": {"jaw": 0.35, "bodyPos": 0.55, "bodyHi": 0.28, "tipPos": 0.8, "tipHi": 0.8, "lip": 0.627}, "f": {"jaw": 0.3, "bodyPos": 0.35, "bodyHi": 0.15, "tipPos": 0.68, "tipHi": 0.1, "lip": 0.088}, "v": {"jaw": 0.15, "bodyPos": 0.35, "bodyHi": 0.15, "tipPos": 0.84, "tipHi": 0, "lip": 0.088}, "θ": {"jaw": 0.18, "bodyPos": 0.5, "bodyHi": 0.2, "tipPos": 0.96, "tipHi": 0.79, "lip": 0.759}, "ð": {"jaw": 0.355, "bodyPos": 0.5, "bodyHi": 0.2, "tipPos": 0.945, "tipHi": 0.79, "lip": 0.984}}, label:'John shouting', note:'His own goal cry, measured: pitch falling 158 to 93 Hz over 2.9 seconds.',
    v:{ rd:0.55, press:0.80, jit:1.3, brth:0.22, drawl:0.60, open:0.06, per:0.62,
        sect:40, f0a:158, f0b:150, f0c:95 } },
  man:{ label:'Man', note:'A 17.5 cm tract, modal voice, ordinary timing.',
    v:{ rd:0.95, press:0.18, jit:1.0, brth:0.18, drawl:0.08, open:0.05, per:0.17,
        sect:46, f0a:96, f0b:112, f0c:84 } },
  woman:{ label:'Woman', note:'A shorter tract lifts every formant — that, not pitch alone, is the difference.',
    v:{ rd:1.25, press:0.15, jit:1.0, brth:0.21, drawl:0.08, open:0.05, per:0.17,
        sect:37, f0a:200, f0b:232, f0c:178 } },
  child:{ label:'Child', note:'Shorter still, and breathier.',
    v:{ rd:1.35, press:0.12, jit:1.3, brth:0.22, drawl:0.08, open:0.05, per:0.16,
        sect:31, f0a:268, f0b:310, f0c:244 } },
  helium:{ label:'Helium', note:'Same voice, same pitch — sound just travels faster, so the tube rings much higher. Source-filter separation, audible.',
    v:{ rd:0.95, press:0.18, jit:1.0, brth:0.18, drawl:0.08, open:0.05, per:0.17,
        sect:19, f0a:96, f0b:112, f0c:84 } },
  whisper:{ label:'Whisper', note:'Barely phonating: the folds hardly close at all.',
    v:{ rd:2.35, press:0.0, jit:1.8, brth:0.26, drawl:0.10, open:0.03, per:0.20,
        sect:44, f0a:130, f0b:148, f0c:120 } },
  barry:{ label:'Barry White', note:'A long tract and a low larynx: deep, resonant, unhurried.',
    v:{ rd:0.78, press:0.22, jit:1.1, brth:0.18, drawl:0.14, open:0.10, per:0.20,
        damp:0.99972, sect:48, f0a:58, f0b:88, f0c:48 } },
  custom:{ label:'Custom', note:'Yours. Tune it in the Lab, then copy the seed — a seed is the whole voice, tract length and timing included.', v:null },
};
const defaultVoice = () => Object.fromEntries(VOICE_SPEC.map(p => [p.k, p.d]));

// ---- posture lookup ----
// A voice may carry its own measured postures and falls back to the shared ones for anything
// it does not override. Pass art = null for the shared inventory.
function baseFor(sym, art){
  if(art && art[sym]) return art[sym];
  if(DIPH[sym]){
    const first = DIPH[sym][0];
    if(art && art[first]) return art[first];
    return ART[first];
  }
  return ART[sym] || ART['ə'];
}
function shapeFor(sym, n, art){ return articulate(baseFor(sym, art), n); }

// Hold a shout and your jaw drops — the vowel opens as it goes.
// NOTE, preserved deliberately: this reads ART directly rather than going through baseFor, so
// it ignores per-voice postures where the rest of buildWord honours them. That asymmetry is
// pre-existing. It is recorded here rather than silently corrected, because changing it would
// move the output of every voice that carries its own art, and that is a measurement, not a
// refactor. Fix it on purpose, with the gate watching, not as a side effect of moving files.
function openedShape(sym, amt, n, art){
  const A={...(ART[sym]||ART['ə'])};
  A.jaw   = Math.min(1, A.jaw + amt*(1-A.jaw));
  A.bodyHi= Math.max(0, A.bodyHi*(1-amt*0.55));
  A.lip   = Math.min(1, A.lip + amt*0.35*(1-A.lip));
  return articulate(A, n);
}

// ---- a word, as keyframes ----
function buildWord(chain, opts){
  // Everything this used to reach out of scope for is now an argument. It closed over N (the
  // section count) and voiceName (through baseFor/shapeFor/openedShape), which is why it could
  // not be shared: the harness had to keep a near-copy, and that copy drifted by construction.
  const o = opts || {};
  const n = o.n || 44;
  const vart = o.art || null;                     // per-voice posture overrides, or null
  const D = o.D;
  const drawl = o.drawl || 0;
  let glide = o.glide, stopHold = o.stopHold, open = o.open;
  glide = glide||0.085; stopHold = stopHold||0.075; open = open||0;
  const base  = sym => baseFor(sym, vart);
  const shape = sym => articulate(base(sym), n);
  const isStop=c=>STOP_KEYS.includes(c), isAp=c=>APPROX.includes(c);
  const stops=chain.filter(isStop).length;
  // transitions into a consonant are fast; a slow approach to /l/ just sounds like /w/
  const glideFor=(i)=> (i>0 && isPause(chain[i-1])) ? 0
                     : (i>0 && (isStop(chain[i])||isAp(chain[i]))) ? glide*0.45 : glide;
  let glides=0; for(let i=1;i<chain.length;i++) glides+=glideFor(i);
  const vw=[];                            // weights over everything that is held
  let first=true;
  chain.forEach(c=>{ if(isStop(c)||isPause(c)) return;
    if(isAp(c)) vw.push(0.34);            // a lateral is a beat, not a vowel
    else { vw.push(first ? 1+drawl*2.6 : 1); first=false; }
  });
  const wsum=vw.reduce((a,b)=>a+b,0)||1;
  const held=chain.filter(c=>!isStop(c)&&!isPause(c)).length;
  let pool=Math.max(0.12*Math.max(held,1), D-stops*stopHold-glides);
  const keys=[], art=[], seg=[]; let t=0, k=0;
  chain.forEach((sym,i)=>{
    if(isPause(sym)){
      // Hold the previous shape briefly, then GLIDE to the next sound while silent. The
      // articulators travel during the gap, which is what makes two words sound like a
      // phrase rather than two recordings played back to back.
      const nextSym=chain[i+1];
      const gap=Math.max(0.09, Math.min(0.30, 0.14*(1+drawl)));
      const prev=chain[i-1];
      const pd=prev?Array.from(shape(prev)):Array.from(shape('ə'));
      const nd=nextSym?Array.from(shape(nextSym)):pd;
      const pA=prev?base(prev):base('ə');
      const nA=nextSym?base(nextSym):pA;
      keys.push({t,d:pd,b:0,nz:0,vl:1,fr:0,as:0,sil:1}); art.push({t,A:pA});
      seg.push({sym:' ', a:t, b:t+gap});
      t+=gap;
      keys.push({t,d:nd,b:0,nz:0,vl:1,fr:0,as:0,sil:1}); art.push({t,A:nA});
      return;
    }
    const d=Array.from(shape(sym));
    const A=base(sym);
    const b=branchFor(sym), nz=nasalFor(sym), vl=voicelessFor(sym),
          fr=fricFor(sym), as=aspFor(sym);
    const dur=isStop(sym) ? stopHold : pool*vw[k++]/wsum;
    if(i>0) t+=glideFor(i);
    seg.push({sym, a:t, b:t+dur});
    keys.push({t,d,b,nz,vl,fr,as}); art.push({t,A});
    t+=dur;
    // A diphthong always glides to its second target, however short. A plain vowel only
    // drifts open when held long enough for the jaw to move.
    if(isDiph(sym)){
      const A2=base(DIPH[sym][1]);
      keys.push({t,d:Array.from(articulate(A2,n)),b,nz,vl,fr,as}); art.push({t,A:A2});
      t+=0; // the segment already advanced
    } else {
    const canOpen = !isStop(sym) && !isAp(sym) && open>0.01 && dur>0.28;
    if(canOpen){
      const amt=open*Math.min(1,(dur-0.28)/0.9);
      const A2={...A, jaw:Math.min(1,A.jaw+amt*(1-A.jaw)),
                      bodyHi:Math.max(0,A.bodyHi*(1-amt*0.55)),
                      lip:Math.min(1,A.lip+amt*0.35*(1-A.lip))};
      keys.push({t,d:Array.from(openedShape(sym,amt,n,vart)),b,nz,vl,fr,as}); art.push({t,A:A2});
    } else {
      keys.push({t,d,b,nz,vl,fr,as}); art.push({t,A});
    }
    }
  });
  return {keys, art, seg, end:t+0.22};
}

const VTL = {
  ART, STOPS, VELAR, DIPH, APPROX, STOP_KEYS, VOWEL_KEYS, CONS_KEYS,
  BRANCHED, NASAL, VOICELESS, FRICATIVE, ASPIRATE,
  VOICE_SPEC, VOICES, defaultVoice,
  restingDiam, hump, articulate, baseFor, shapeFor, openedShape, buildWord,
  branchFor, nasalFor, voicelessFor, fricFor, aspFor, isPause, isDiph
};

root.VTL = VTL;
if (typeof module !== 'undefined' && module.exports) module.exports = VTL;

})(typeof window !== 'undefined' ? window : globalThis);
