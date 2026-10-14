/* talefiler.js — Piper-stemmen som lydfiler (Jimmy 12-10-2026). Delt af spillet og vaerktoej/lav-tale.js, så begge
   deler tekster og regner filnavne præcis ens:
     enheder(tekst)  → sætningerne i teksten (delt efter . ? ! …), normaliseret
     noegle(enhed)   → filnavnet uden mappe og endelse (cyrb53 af STEMME + sætningen, 14 hex-tegn)
     STEMME          → Piper-modellen og farten. Skiftes stemmen eller farten, får alle sætninger nye navne, så
                       iPad'erne henter de nye filer (de gamle ligger ellers i cachen for altid — review 12-10, fund 5)
     noegleEn(enhed) → det samme for et engelsk ord med den engelske stemme (STEMME_EN)
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

  // Engelsk (Jimmy 13-10-2026): de engelske ord siges af Piper «en_GB-cori-high» (LibriVox, public domain) — kun fra
  // filer, aldrig af enhedens stemme. Egen STEMME_EN, så de engelske filnavne aldrig kolliderer med de danske; samme
  // mappe (tale/<ab>/<nøgle>.mp3) og samme liste.json. ALDRIG en_US-lessac-* eller en_US-ryan-* (licenserne tillader
  // ikke et offentligt spil) — vaerktoej/lav-tale.js afviser dem og tjekker modellens sha256.
  const MODEL_EN = 'en_GB-cori-high';
  const FART_EN = '1.1'; // lidt langsommere end normalt — et nyt ord til en begynder
  // Mindre støj end standarden (noise_w 0,8 / noise_scale 0,667): korte enkeltord blev ellers af og til trukket ud
  const STOEJ_EN = ['0.333', '0.5']; // [noise_w, noise_scale]
  const STEMME_EN = MODEL_EN + '@' + FART_EN + '/' + STOEJ_EN.join('/');
  const noegleEn = (enhed) => noegleMed(STEMME_EN, enhed);

  const sti = (n) => 'tale/' + n.slice(0, 2) + '/' + n + '.mp3';

  const Talefiler = { enheder, noegle, noegleMed, noegleEn, sti, STEMME, MODEL, FART, STEMME_EN, MODEL_EN, FART_EN, STOEJ_EN };
  root.Talefiler = Talefiler;
  if (typeof module !== 'undefined' && module.exports) module.exports = Talefiler;
})(typeof window !== 'undefined' ? window : globalThis);
