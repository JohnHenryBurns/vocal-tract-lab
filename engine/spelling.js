// ─────────────────────────────────────────────────────────────────────────────
// THE SPELLER. One copy, in a file.
//
// Grapheme-to-phoneme rules, the built-in dictionary, and the personal dictionary on top of
// it. This lived in index.html, and the gate reached it by rebuilding the function out of the
// page with six regular expressions and a fake localStorage — including one that depended on
// `const PAUSE=` being immediately followed by `function g2pWord`, so reordering two unrelated
// declarations would have broken the speller check while looking like a speller regression.
//
// The personal dictionary is browser state, so storage is INJECTED rather than reached for.
// That is the same change that made buildWord shareable: a module that reaches for a global
// can only run where that global exists.
//
//   browser   <script src="engine/spelling.js"></script>
//             HOLLER_SPELL.useStorage(localStorage)     // opt in to the personal dictionary
//   node      const S = require("./engine/spelling.js")
//             // no storage: BUILTIN_DICT only, which is what the gate wants
// ─────────────────────────────────────────────────────────────────────────────
(function (root) {
'use strict';

// No storage until someone supplies it. The gate runs with this default and therefore tests
// the shipped dictionary, not whatever happens to be in a browser.
let STORE = { getItem: () => null, setItem: () => {} };
function useStorage(s){ if (s && s.getItem && s.setItem) STORE = s; }

const G2P_RULES = [
  // longest patterns first
  [/^tion/,      ['ʃ','ə','n']],
  [/^sion/,      ['ʃ','ə','n']],
  [/^ought/,     ['ɔ','t']],
  // "augh" is two different vowels and NOTHING in the spelling says which: "daughter" is
  // /dɔtɝ/ and "laughter" is /læftɝ/. The rule used to be /æf/ unconditionally, so daughter
  // came out d-æ-f-t-ɝ and "taught" came out "taft". Before a /t/ the majority is /ɔ/ —
  // taught, caught, naught, fraught, naughty, slaughter, onslaught, daughter — so that is
  // the rule, and the /æf/ side of it is a closed set of five words that goes in the
  // dictionary where lexical facts belong. Longest pattern first, so this must precede
  // the bare "augh" that still serves "laugh" and "laughing".
  [/^aught/,     ['ɔ','t']],
  [/^augh/,      ['æ','f']],
  [/^igh/,       ['aɪ']],
  [/^tch/,       ['t','ʃ']],
  [/^dge/,       ['d','ʒ']],
  [/^ch/,        ['t','ʃ']],
  [/^sh/,        ['ʃ']],
  [/^ph/,        ['f']],
  [/^th/,        ['θ']],          // voiceless by default; "the/this/that" are in the dictionary
  [/^wh/,        ['w']],
  [/^ck/,        ['k']],
  [/^ng/,        ['ŋ']],
  [/^qu/,        ['k','w']],
  [/^x/,         ['k','s']],
  [/^eo/,        ['i']],         // people
  [/^wa(?=[^aeiouy])/, ['w','ɔ']], // water, want, wash, watch
  [/^ee/,        ['i']],
  [/^ea/,        ['i']],
  [/^ie/,        ['i']],
  [/^oo/,        ['u']],
  [/^ow$/,       ['oʊ']],       // yellow, window, show — final -ow is not the -ow of "down"
  [/^ou/,        ['aʊ']],
  [/^ow/,        ['aʊ']],
  [/^oa/,        ['oʊ']],
  [/^oe/,        ['o']],
  [/^ai/,        ['eɪ']],
  [/^ay/,        ['eɪ']],
  [/^ei/,        ['eɪ']],
  [/^ey/,        ['eɪ']],
  [/^oi/,        ['ɔɪ']],
  [/^oy/,        ['ɔɪ']],
  [/^au/,        ['ɔ']],
  [/^aw/,        ['ɔ']],
  [/^ar/,        ['ɑ','r']],
  [/^or/,        ['ɔ','r']],
  [/^er/,        ['ɝ']],
  [/^ir/,        ['ɝ']],
  [/^ur/,        ['ɝ']],
  [/^le$/,       ['ə','l']],
  // magic e: a single consonant then a final e lengthens the vowel
  [/^a(?=[^aeiou]e$)/, ['eɪ']],
  [/^i(?=[^aeiou]e$)/, ['aɪ']],
  [/^o(?=[^aeiou]e$)/, ['o']],
  [/^u(?=[^aeiou]e$)/, ['u']],
  [/^e(?=[^aeiou]e$)/, ['i']],
  // soft c and g
  [/^c(?=[eiy])/, ['s']],
  [/^g(?=[eiy])/, ['d','ʒ']],
  [/^c/,         ['k']],
  // y
  [/^y(?=[aeiou])/, ['j']],
  [/^y$/,        ['i']],
  [/^y/,         ['ɪ']],
  [/^o$/,        ['oʊ']],       // go, no, hello, potato
  // a final silent e
  [/^e$/,        []],
  // plain letters
  [/^a/, ['æ']], [/^e/, ['ɛ']], [/^i/, ['ɪ']], [/^o/, ['ɑ']], [/^u/, ['ʌ']],
  [/^b/, ['b']], [/^d/, ['d']], [/^f/, ['f']], [/^g/, ['g']], [/^h/, ['h']],
  [/^j/, ['d','ʒ']], [/^k/, ['k']], [/^l/, ['l']], [/^m/, ['m']], [/^n/, ['n']],
  [/^p/, ['p']], [/^r/, ['r']], [/^s/, ['s']], [/^t/, ['t']], [/^v/, ['v']],
  [/^w/, ['w']], [/^z/, ['z']],
];

const PAUSE=' ';                    // a word boundary in the sound chain
function g2p(phrase){
  // A space is a word boundary. Each word is looked up on its own, then joined by a pause.
  const words=String(phrase||'').trim().split(/\s+/).filter(Boolean);
  if(words.length>1){
    const out=[]; let from='rules';
    words.forEach((w,i)=>{
      const r=g2pWord(w);
      if(r.from==='remembered'||r.from==='built in') from=r.from;
      if(i) out.push(PAUSE);
      out.push(...r.ph);
    });
    return {ph:out, from: words.length+' words'};
  }
  return g2pWord(words[0]||'');
}
// English reduces unstressed vowels to schwa, and rules cannot see stress. But the weak
// first syllable is highly patterned: a-bout, a-gain, be-cause, com-puter, to-gether. Catching
// those prefixes fixes most of it without needing a stress model.
const WEAK_FIRST=/^(a|be|com|con|de|re|to|pro|per|sur|sup|suc|o[bcf]|ac|ad|al|as|at|ef|em|en|ex|im|in|ob|oc|op|pre|sub)(?=[a-z]{3,})/;
function g2pWord(word){
  let w=String(word||'').toLowerCase().replace(/[^a-z]/g,'');
  const dict=loadDict();
  if(dict[w]) return {ph:dict[w].slice(), from: BUILTIN_DICT[w]?'built in':'remembered'};
  const out=[];
  let guard=0;
  // reduce the vowel of a weak first syllable before the rules see it
  let weak=0;
  const m0=w.match(WEAK_FIRST);
  if(m0 && !/^[aeiou]{2}/.test(w)){
    const pre=m0[1];
    const vi=pre.search(/[aeiou]/);
    if(vi>=0){ out.push(...(vi?[]:[]) ); weak=vi+1; }
  }
  if(weak){
    // consonants before the weak vowel go through the rules as usual
    let head=w.slice(0,weak-1), rest=w.slice(weak);
    let hg=0;
    while(head.length && hg++<8){
      let hit=null;
      for(const [re,ph] of G2P_RULES){ const mm=head.match(re); if(mm){ hit=[mm[0].length||1,ph]; break; } }
      if(!hit){ head=head.slice(1); continue; }
      out.push(...hit[1]); head=head.slice(hit[0]);
    }
    out.push('ə');
    w=rest;
  }
  while(w.length && guard++<200){
    let hit=null;
    for(const [re,ph] of G2P_RULES){
      const m=w.match(re);
      if(m){ hit=[m[0].length||1, ph]; break; }
    }
    if(!hit){ w=w.slice(1); continue; }           // unknown letter: skip it
    out.push(...hit[1]);
    w=w.slice(hit[0]);
  }
  // collapse doubled consonants, which English spells but does not say
  const clean=[];
  for(const ph of out) if(!(clean.length && clean[clean.length-1]===ph && !'iɪɛæʌɑɔʊuɝəo'.includes(ph))) clean.push(ph);
  return {ph:clean, from:'rules'};
}

const BUILTIN_DICT = {
  // English spells /θ/ and /ð/ identically. Only a list can tell them apart, and the
  // voiced ones are almost all function words — a short list covers most of the language.
  // The words English simply does not spell phonetically. Rules reach about 60%; the rest
  // is memorised, by people as much as by programs.
  // "augh" is /ɔ/ by rule; these are the words where it is not. See the aught rule above.
  laughter:['l','æ','f','t','ɝ'], laughed:['l','æ','f','t'], draught:['d','r','æ','f','t'],
  draughts:['d','r','æ','f','t','s'], laughs:['l','æ','f','s'],
  hello:['h','ə','l','oʊ'], hi:['h','aɪ'], hey:['h','eɪ'],
  because:['b','ɪ','k','ɔ','z'], again:['ə','g','ɛ','n'], any:['ɛ','n','i'],
  many:['m','ɛ','n','i'], said:['s','ɛ','d'], says:['s','ɛ','z'],
  one:['w','ʌ','n'], once:['w','ʌ','n','s'], two:['t','u'], who:['h','u'],
  what:['w','ʌ','t'], want:['w','ɔ','n','t'], was:['w','ʌ','z'], were:['w','ɝ'],
  are:['ɑ','r'], have:['h','æ','v'], give:['g','ɪ','v'], live:['l','ɪ','v'],
  come:['k','ʌ','m'], some:['s','ʌ','m'], done:['d','ʌ','n'], love:['l','ʌ','v'],
  computer:['k','ə','m','p','j','u','t','ɝ'], together:['t','ə','g','ɛ','ð','ɝ'],
  potato:['p','ə','t','eɪ','t','oʊ'], tomato:['t','ə','m','eɪ','t','oʊ'],
  music:['m','j','u','z','ɪ','k'], use:['j','u','z'], you:['j','u'], your:['j','ɔ','r'],
  friend:['f','r','ɛ','n','d'], school:['s','k','u','l'], their:['ð','ɛ','r'],
  eye:['aɪ'], eyes:['aɪ','z'], door:['d','ɔ','r'], floor:['f','l','ɔ','r'],
  // English writes "oo" for two different vowels and gives no clue which. Only a list knows.
  good:['g','ʊ','d'], book:['b','ʊ','k'], look:['l','ʊ','k'], took:['t','ʊ','k'],
  foot:['f','ʊ','t'], hood:['h','ʊ','d'], wood:['w','ʊ','d'], wool:['w','ʊ','l'],
  could:['k','ʊ','d'], would:['w','ʊ','d'], should:['ʃ','ʊ','d'], put:['p','ʊ','t'],
  bulldog:['b','ʊ','l','d','ɔ','g'],
  the:['ð','ə'], this:['ð','ɪ','s'], that:['ð','æ','t'], then:['ð','ɛ','n'],
  them:['ð','ɛ','m'], these:['ð','i','z'], those:['ð','oʊ','z'], there:['ð','ɛ','r'],
  their:['ð','ɛ','r'], they:['ð','eɪ'], though:['ð','oʊ'], than:['ð','æ','n'],
  with:['w','ɪ','θ'], mother:['m','ʌ','ð','ɝ'], father:['f','ɑ','ð','ɝ'],
  brother:['b','r','ʌ','ð','ɝ'], other:['ʌ','ð','ɝ'], measure:['m','ɛ','ʒ','ɝ'],
  goal:['g','o','l'],
  maximus:['m','æ','k','s','ɪ','m','ə','s'],  max:['m','æ','k','s'],
  jupiter:['d','ʒ','u','p','ɪ','t','ɝ'],
  solana:['s','o','l','ɑ','n','ə'],
  orion:['ɔ','r','aɪ','ə','n'],
  atlas:['æ','t','l','ə','s'],
  rachel:['r','eɪ','t','ʃ','ə','l'],
  john:['d','ʒ','ɑ','n'],           bo:['b','o'],
  momo:['m','o','m','o'],           cliff:['k','l','ɪ','f'],
  gloria:['g','l','ɔ','r','i','ə'], greg:['g','r','ɛ','g'],
  bridget:['b','r','ɪ','d','ʒ','ɪ','t'],
  eric:['ɛ','r','ɪ','k'],           dan:['d','æ','n'],
  lincoln:['l','ɪ','ŋ','k','ə','n'],
  wizard:['w','ɪ','z','ɝ','d'],     banana:['b','ə','n','æ','n','ə'],
  princess:['p','r','ɪ','n','s','ɛ','s'],
  sparkle:['s','p','ɑ','r','k','ə','l'],
};
function loadDict(){
  let user={};
  try{ user=JSON.parse(STORE.getItem('hollerbox.dict')||'{}'); }catch(e){}
  return {...BUILTIN_DICT, ...user};      // your corrections win
}
function saveWord(word,ph){
  try{ const d=loadDict(); d[String(word).toLowerCase().replace(/[^a-z]/g,'')]=ph.slice();
       STORE.setItem('hollerbox.dict',JSON.stringify(d)); }catch(e){}
}

root.HOLLER_SPELL = { G2P_RULES, BUILTIN_DICT, PAUSE, WEAK_FIRST,
                  g2p, g2pWord, loadDict, saveWord, useStorage };
if (typeof module !== 'undefined' && module.exports) module.exports = root.HOLLER_SPELL;

})(typeof window !== 'undefined' ? window : globalThis);
