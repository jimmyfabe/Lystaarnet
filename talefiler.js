/* talefiler.js — Piper-stemmen som lydfiler (Jimmy 12-10-2026). Delt af spillet og vaerktoej/lav-tale.js, så begge
   deler tekster og regner filnavne præcis ens:
     enheder(tekst)  → sætningerne i teksten (delt efter . ? ! …), normaliseret
     noegle(enhed)   → filnavnet uden mappe og endelse (cyrb53 af STEMME + sætningen, 14 hex-tegn)
     STEMME          → Piper-modellen og farten. Skiftes stemmen eller farten, får alle sætninger nye navne, så
                       iPad'erne henter de nye filer (de gamle ligger ellers i cachen for altid — review 12-10, fund 5)
     sti(noegle)     → 'tale/ab/abcdef….mp3'
   Kun rene funktioner — ingen lyd, ingen DOM. */
(function (root) {
  'use strict';

  // Én sætning ad gangen: efter . ? ! eller … følger mellemrum. Mellemrum samles, og enderne skæres væk.
  // (Ingen lookbehind i det regulære udtryk — det findes først i Safari 16.4, og så ville filen fejle på ældre iPads.)
  function enheder(tekst) {
    return String(tekst == null ? '' : tekst).replace(/\s+/g, ' ').trim()
      .replace(/([.?!…]) /g, '$1\n').split('\n').map((s) => s.trim()).filter(Boolean);
  }

  const MODEL = 'da_DK-talesyntese-medium';
  const FART = '1.2'; // Pipers length_scale: 1,2 = lidt langsommere (den prøve, Jimmy valgte 12-10)
  const STEMME = MODEL + '@' + FART;

  // cyrb53 (bryc, offentlig ejendom): hurtig 53-bit hash — samme resultat i Node og alle browsere
  function noegleMed(stemme, enhed) {
    const s = stemme + '|' + String(enhed);
    let h1 = 0xdeadbeef ^ s.length, h2 = 0x41c6ce57 ^ s.length;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761);
      h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
  }
  const noegle = (enhed) => noegleMed(STEMME, enhed);

  const sti = (n) => 'tale/' + n.slice(0, 2) + '/' + n + '.mp3';

  const Talefiler = { enheder, noegle, noegleMed, sti, STEMME, MODEL, FART };
  root.Talefiler = Talefiler;
  if (typeof module !== 'undefined' && module.exports) module.exports = Talefiler;
})(typeof window !== 'undefined' ? window : globalThis);
