/* opgaver.js — opgavegeneratorer og indhold til Matematikspillet.
   Rene funktioner uden DOM, så alt kan testes i Node (test/test-opgaver.js).
   Alle tal og facit regnes her af koden — aldrig i hånden. */
(function (root) {
  'use strict';

  // ---------- Tilfældighed (seedbar, så tests kan gentages) ----------
  function lavRng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const heltal = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
  const vaelg = (rng, liste) => liste[Math.floor(rng() * liste.length)];
  function bland(rng, liste) {
    const a = liste.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // ---------- Ting man kan tælle (emoji + dansk til oplæsning) ----------
  const TING = {
    banan:      { e: '🍌', kon: 'en', ent: 'banan', flt: 'bananer' },
    sommerfugl: { e: '🦋', kon: 'en', ent: 'sommerfugl', flt: 'sommerfugle' },
    froe:       { e: '🐸', kon: 'en', ent: 'frø', flt: 'frøer' },
    blad:       { e: '🍁', kon: 'et', ent: 'blad', flt: 'blade' }, // ét tydeligt blad (🍃 havde en vindhvirvel med)
    aeble:      { e: '🍎', kon: 'et', ent: 'æble', flt: 'æbler' },
    skildpadde: { e: '🐢', kon: 'en', ent: 'skildpadde', flt: 'skildpadder' },
    aeg:        { e: '🥚', kon: 'et', ent: 'æg', flt: 'æg' },
    mariehoene: { e: '🐞', kon: 'en', ent: 'mariehøne', flt: 'mariehøns' },
    stjerne:    { e: '⭐', kon: 'en', ent: 'stjerne', flt: 'stjerner' },
    blomst:     { e: '🌸', kon: 'en', ent: 'blomst', flt: 'blomster' },
    kage:       { e: '🧁', kon: 'en', ent: 'kage', flt: 'kager' },
    hjerte:     { e: '💖', kon: 'et', ent: 'hjerte', flt: 'hjerter' },
    jordbaer:   { e: '🍓', kon: 'et', ent: 'jordbær', flt: 'jordbær' },
    ballon:     { e: '🎈', kon: 'en', ent: 'ballon', flt: 'balloner' },
    diamant:    { e: '💎', kon: 'en', ent: 'diamant', flt: 'diamanter' },
    fisk:       { e: '🐟', kon: 'en', ent: 'fisk', flt: 'fisk' },
  };

  // «3 bananer», «en banan», «et æble» — så oplæsningen bøjer rigtigt
  function antalOrd(n, ting) {
    if (n === 1) return ting.kon + ' ' + ting.ent;
    return n + ' ' + ting.flt;
  }

  // ---------- Svarmuligheder ----------
  // Niveau 1 har to svarmuligheder (roligt og overskueligt), derefter tre.
  const antalValg = (niveau) => (niveau <= 1 ? 2 : 3);

  // Facit + nærliggende «forvekslere», alle inden for [min, max], sorteret stigende.
  // Facits plads (mindst, midt, størst) vælges tilfældigt, så svaret ikke altid står i midten.
  function lavValg(rng, svar, min, max, ekstra, antal) {
    antal = antal || 3;
    const ok = (v) => Number.isInteger(v) && v !== svar && v >= min && v <= max;
    const under = [], over = [];
    const tilfoej = (v) => { if (ok(v) && under.indexOf(v) < 0 && over.indexOf(v) < 0) (v < svar ? under : over).push(v); };
    bland(rng, ekstra || []).forEach(tilfoej);           // typiske forvekslinger først
    for (let d = 1; d <= 5; d++) { tilfoej(svar - d); tilfoej(svar + d); } // så de nærmeste naboer
    for (let v = min; v <= max; v++) tilfoej(v);         // reserve i små intervaller
    let p = heltal(rng, 0, antal - 1);                  // facits plads blandt de sorterede valg
    p = Math.max(Math.min(p, under.length), antal - 1 - over.length);
    const valgt = under.slice(0, p).concat(over.slice(0, antal - 1 - p));
    return valgt.concat([svar]).sort((x, y) => x - y);
  }

  // Forvekslere til «find tallet»: omvendte cifre, samme enercifre, tal der ligner hinanden
  function talForvekslere(n, max) {
    const ud = [];
    const s = String(n);
    if (s.length === 2) {
      ud.push(Number(s[1] + s[0]));     // 12 → 21 (filtreres væk, hvis over max)
      ud.push(n % 10);                  // 14 → 4
      ud.push(n + 1, n - 1);
    } else {
      if (n + 10 <= max) ud.push(n + 10); // 4 → 14
      const ligner = { 6: 9, 9: 6, 1: 7, 7: 1, 2: 5, 5: 2, 3: 8, 8: 3 };
      if (ligner[n] !== undefined) ud.push(ligner[n]);
    }
    return ud;
  }

  // Tal i samme «trin» (fx tiere): 30, 40, 50 — ikke 41
  function lavValgTrin(rng, svar, min, max, trin, antal) {
    antal = antal || 3;
    const ok = (v) => v !== svar && v >= min && v <= max;
    const naer = bland(rng, [svar - trin, svar + trin]).filter(ok);
    const fjern = [svar - 2 * trin, svar + 2 * trin, svar - 3 * trin, svar + 3 * trin].filter(ok);
    const valgt = naer.concat(fjern).slice(0, antal - 1);
    return valgt.concat([svar]).sort((x, y) => x - y);
  }

  // Tekst-svar (figurer, mønsterbrikker): facit + andre, i tilfældig rækkefølge
  function lavValgTekst(rng, svar, muligheder, antal) {
    antal = antal || 3;
    const andre = bland(rng, muligheder.filter((m) => m !== svar)).slice(0, antal - 1);
    return bland(rng, andre.concat([svar]));
  }

  // ---------- Figurer (tegnes som SVG i app.js) ----------
  const FORMER = {
    cirkel:    { hjoerner: 0, bestemt: 'cirklen', ubestemt: 'en cirkel', flertal: 'cirkler' },
    trekant:   { hjoerner: 3, bestemt: 'trekanten', ubestemt: 'en trekant', flertal: 'trekanter' },
    firkant:   { hjoerner: 4, bestemt: 'firkanten', ubestemt: 'en firkant', flertal: 'firkanter' },
    kvadrat:   { hjoerner: 4, bestemt: 'kvadratet', ubestemt: 'et kvadrat', flertal: 'kvadrater' },
    rektangel: { hjoerner: 4, bestemt: 'rektanglet', ubestemt: 'et rektangel', flertal: 'rektangler' },
    femkant:   { hjoerner: 5, bestemt: 'femkanten', ubestemt: 'en femkant', flertal: 'femkanter' },
    sekskant:  { hjoerner: 6, bestemt: 'sekskanten', ubestemt: 'en sekskant', flertal: 'sekskanter' },
  };
  // Niveau 3 skelner kvadrat og rektangel (begge er firkanter), som i bogens kapitel om firkanter
  const FORMER_PR_NIVEAU = {
    1: ['cirkel', 'trekant', 'firkant'],
    2: ['cirkel', 'trekant', 'firkant', 'femkant'],
    3: ['cirkel', 'trekant', 'kvadrat', 'rektangel', 'femkant', 'sekskant'],
  };

  // Mønsterbrikker med danske navne (til oplæsning i hjælpen)
  const MOENSTER_BRIKKER = {
    '🔴': { navn: 'rød', bestemt: 'den røde' }, '🔵': { navn: 'blå', bestemt: 'den blå' },
    '🟡': { navn: 'gul', bestemt: 'den gule' }, '🟢': { navn: 'grøn', bestemt: 'den grønne' },
    '⭐': { navn: 'stjerne', bestemt: 'stjernen' }, '🌙': { navn: 'måne', bestemt: 'månen' },
    '🍎': { navn: 'æble', bestemt: 'æblet' }, '🍌': { navn: 'banan', bestemt: 'bananen' },
    '🌸': { navn: 'blomst', bestemt: 'blomsten' }, '🐸': { navn: 'frø', bestemt: 'frøen' },
    '💖': { navn: 'hjerte', bestemt: 'hjertet' }, '🦋': { navn: 'sommerfugl', bestemt: 'sommerfuglen' },
  };


  // ---------- Generatorer ----------
  // Hver generator: (niveau, rng, tingListe) → opgave
  // opgave = { emne, type, niveau, noegle, tale, tekst, ikon, vis, svar, valg (null = taltastatur),
  //            valgArt (tekst-svar), hjaelp: [trin 1, trin 2] }
  // Hjælpetrappen følger skolen: fingre → terning/klodser → tallinje.

  function vaelgTing(rng, tingListe) {
    const noegler = (tingListe && tingListe.length ? tingListe : Object.keys(TING)).filter((k) => TING[k]);
    const k = vaelg(rng, noegler.length ? noegler : Object.keys(TING));
    return { noegle: k, ting: TING[k] };
  }

  // Tallinje-hjælp: start på et tal og hop (negativ = tilbage)
  // taelHop: spørgsmålet er «hvor mange» (mangler, forskel) — så tælles hoppene 1, 2, 3 i stedet for landingstallet
  const tallinje = (start, hop, taelHop) => (taelHop ? { art: 'tallinje', start: start, hop: hop, taelHop: true } : { art: 'tallinje', start: start, hop: hop });

  // Klokken som ord til oplæsning: '4:00' → 'fire', '4:30' → 'halv fem'
  const TIME_ORD = ['tolv', 'et', 'to', 'tre', 'fire', 'fem', 'seks', 'syv', 'otte', 'ni', 'ti', 'elleve', 'tolv'];
  function klokkeNavn(klokke) {
    const [t, m] = String(klokke).split(':').map(Number);
    return m === 30 ? 'halv ' + TIME_ORD[(t % 12) + 1] : TIME_ORD[t];
  }
  // Varer på markedet (bestemt form, så «Isen koster 7 kroner» lyder rigtigt)
  const VARER = [
    { navn: 'Isen', e: '🍦' }, { navn: 'Æblet', e: '🍎' }, { navn: 'Bolden', e: '⚽' },
    { navn: 'Ballonen', e: '🎈' }, { navn: 'Bogen', e: '📕' }, { navn: 'Bananen', e: '🍌' },
  ];

  // ---------- Tegnebyen (B6): sømbræt, lineal og klodser ----------
  const SOEMBRAET = { kol: 5, raek: 4 };
  const TEGNE_FIGURER = { 1: ['trekant', 'firkant'], 2: ['trekant', 'firkant', 'kvadrat'], 3: ['trekant', 'kvadrat', 'rektangel'] };
  const STREG_CM = { 1: [1, 5], 2: [2, 8], 3: [3, 10] };
  const LINEAL_CM = { 1: 6, 2: 10, 3: 10 };
  const KLODS_MAAL = { 1: [2, 5], 2: [3, 8], 3: [4, 10] };
  const MAALE_TING = [
    { id: 'blyant', e: '✏️', bestemt: 'blyanten' },
    { id: 'pensel', e: '🖌️', bestemt: 'penslen' },
    { id: 'tog', e: '🚂', bestemt: 'toget' },
    { id: 'slange', e: '🐍', bestemt: 'slangen' },
  ];

  // Et sømbræt er et gitter af prikker (heltal x, y). vurderFigur → hjørner (punkter på linje tæller ikke),
  // sider (kvadratet på længden), rette vinkler, lige lange sider, om siderne krydser, og typen.
  function vurderFigur(punkter) {
    const ud = { hjoerner: [], sider: [], retteVinkler: 0, ligeLange: false, krydser: false, type: 'ingen' };
    if (!Array.isArray(punkter)) return ud;
    const gyldig = punkter.filter((q) => Array.isArray(q) && Number.isFinite(q[0]) && Number.isFinite(q[1]));
    // Gentagne punkter i træk væk (også et sidste punkt = det første, som lukker figuren)
    let p = gyldig.filter((q, i) => i === 0 || q[0] !== gyldig[i - 1][0] || q[1] !== gyldig[i - 1][1]);
    if (p.length > 1 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1]) p = p.slice(0, -1);
    // Punkter på linje med naboerne er ikke hjørner — fjern dem, til intet ændrer sig
    let aendret = true;
    while (aendret && p.length >= 3) {
      aendret = false;
      for (let i = 0; i < p.length; i++) {
        const a = p[(i - 1 + p.length) % p.length], b = p[i], c = p[(i + 1) % p.length];
        if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) === 0) { p.splice(i, 1); aendret = true; break; }
      }
    }
    if (p.length < 3) return ud;
    const n = p.length;
    ud.hjoerner = p;
    for (let i = 0; i < n; i++) {
      const a = p[i], b = p[(i + 1) % n];
      ud.sider.push((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1]));
    }
    for (let i = 0; i < n; i++) {
      const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n];
      if ((a[0] - b[0]) * (c[0] - b[0]) + (a[1] - b[1]) * (c[1] - b[1]) === 0) ud.retteVinkler++;
    }
    ud.ligeLange = ud.sider.every((s) => s === ud.sider[0]);
    // To sider, der ikke er naboer, må ikke krydse (en «sløjfe» er ikke en figur)
    const side = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
    const skaerer = (p1, p2, p3, p4) => side(p1, p2, p3) * side(p1, p2, p4) < 0 && side(p3, p4, p1) * side(p3, p4, p2) < 0;
    for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (skaerer(p[i], p[(i + 1) % n], p[j], p[(j + 1) % n])) ud.krydser = true;
    }
    if (ud.krydser) ud.type = 'kryds';
    else if (n === 3) ud.type = 'trekant';
    else if (n === 4) ud.type = ud.retteVinkler === 4 ? (ud.ligeLange ? 'kvadrat' : 'rektangel') : 'firkant';
    else ud.type = 'mangekant';
    return ud;
  }

  // Passer den tegnede figur til opgaven? Et kvadrat og et rektangel er også firkanter; et kvadrat er også et rektangel.
  function figurPasser(maal, type) {
    if (maal === type) return true;
    if (maal === 'firkant') return type === 'kvadrat' || type === 'rektangel';
    if (maal === 'rektangel') return type === 'kvadrat';
    return false;
  }

  // En tegnet streg passer, hvis den er højst 0,3 cm fra målet
  const stregPasser = (maal, cm) => Number.isFinite(cm) && Math.abs(cm - maal) <= 0.3 + 1e-9;

  // Et eksempel på figuren med startprikken som første hjørne (til hjælpen og «vis svaret»), eller null
  function eksempelFigur(form, start, kol, raek) {
    kol = kol || SOEMBRAET.kol; raek = raek || SOEMBRAET.raek;
    const [sx, sy] = start;
    const forslag = {
      trekant: [[[2, 0], [0, 2]], [[2, 0], [1, 2]], [[1, 2], [-1, 2]], [[2, 0], [2, 2]]],
      kvadrat: [[[2, 0], [2, 2], [0, 2]], [[1, 0], [1, 1], [0, 1]]],
      rektangel: [[[3, 0], [3, 2], [0, 2]], [[2, 0], [2, 1], [0, 1]], [[3, 0], [3, 1], [0, 1]], [[1, 0], [1, 2], [0, 2]], [[1, 0], [1, 3], [0, 3]]],
      firkant: [[[3, 0], [2, 2], [1, 2]], [[2, 0], [3, 2], [0, 2]], [[2, 0], [2, 2], [0, 1]], [[1, 0], [2, 2], [0, 2]]],
    }[form];
    if (!forslag) return null;
    for (const f of forslag) for (const [mx, my] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const pts = [[sx, sy]].concat(f.map(([dx, dy]) => [sx + mx * dx, sy + my * dy]));
      if (pts.every(([x, y]) => x >= 0 && y >= 0 && x < kol && y < raek) && vurderFigur(pts).type === form) return pts;
    }
    return null;
  }

  const G = {
    // ===== Tælleskoven: tal til 20 =====
    antal(niveau, rng, tingListe) {
      const omr = { 1: [1, 6], 2: [3, 10], 3: [8, 20] }[niveau];
      const n = heltal(rng, omr[0], omr[1]);
      const t = vaelgTing(rng, tingListe);
      return {
        emne: 'taelle', type: 'antal', niveau, noegle: 'antal:' + n, ikon: '👆',
        tale: 'Hvor mange ' + t.ting.flt + ' er der?',
        tekst: 'Hvor mange?',
        vis: { art: 'ting', ting: t.noegle, antal: n },
        svar: n,
        valg: lavValg(rng, n, 1, omr[1], null, antalValg(niveau)),
        hjaelp: [{ art: 'tael' }],
      };
    },

    // Terningøjne (1–6): se antallet med det samme
    terning(niveau, rng) {
      const n = heltal(rng, 1, 6);
      return {
        emne: 'taelle', type: 'terning', niveau, noegle: 'terning:' + n, ikon: '🎲',
        tale: 'Hvor mange øjne er der på terningen?',
        tekst: 'Hvor mange øjne?',
        vis: { art: 'terning', antal: n },
        svar: n,
        valg: lavValg(rng, n, 1, 6, null, antalValg(niveau)),
        hjaelp: [{ art: 'tael' }],
      };
    },

    // Klodser: en stang (op til 10) — eller en 10-stang og løse klodser (11–20)
    klodser(niveau, rng) {
      const omr = niveau >= 3 ? [11, 20] : [2, 10];
      const n = heltal(rng, omr[0], omr[1]);
      return {
        emne: 'taelle', type: 'klodser', niveau, noegle: 'klodser:' + n, ikon: '🧱',
        tale: n > 10 ? 'Stangen har 10 klodser. Hvor mange klodser er der i alt?' : 'Hvor mange klodser er der?',
        tekst: 'Hvor mange klodser?',
        vis: { art: 'klodser', a: n, b: 0 },
        svar: n,
        valg: lavValg(rng, n, 1, niveau >= 3 ? 20 : 10, n > 10 ? [n - 10, n + 10] : null, antalValg(niveau)),
        hjaelp: [{ art: 'tael' }],
      };
    },

    // Tællestreger i bundter af 5 (den femte streg på tværs)
    streger(niveau, rng) {
      const n = heltal(rng, 6, 20);
      return {
        emne: 'taelle', type: 'streger', niveau, noegle: 'streger:' + n, ikon: '✏️',
        tale: 'Hvert bundt er 5 streger. Hvor mange streger er der i alt?',
        tekst: 'Hvor mange streger?',
        vis: { art: 'streger', antal: n },
        svar: n,
        valg: lavValg(rng, n, 1, 20, [n + 5, n - 5], antalValg(niveau)),
        hjaelp: [{ art: 'tael' }],
      };
    },

    // Hør et tal, find det skrevne tal
    findTal(niveau, rng) {
      const omr = { 1: [1, 9], 2: [0, 10], 3: [10, 20] }[niveau];
      const max = { 1: 10, 2: 10, 3: 20 }[niveau];
      const n = heltal(rng, omr[0], omr[1]);
      return {
        emne: 'taelle', type: 'findTal', niveau, noegle: 'findTal:' + n, ikon: '👂',
        tale: 'Find tallet ' + n + '.',
        tekst: 'Find tallet',
        vis: { art: 'lyt', tal: n },
        svar: n,
        valg: lavValg(rng, n, 0, max, talForvekslere(n, max), antalValg(niveau)),
        hjaelp: [{ art: 'visTal', tal: n }],
      };
    },

    // Talslangen: hvilket tal kommer efter?
    efter(niveau, rng) {
      const x = niveau >= 3 ? heltal(rng, 9, 19) : heltal(rng, 1, 9);
      const svar = x + 1;
      return {
        emne: 'taelle', type: 'efter', niveau, noegle: 'efter:' + x, ikon: '➡️',
        tale: 'Hvilket tal kommer efter ' + x + '?',
        tekst: 'Hvad kommer efter ' + x + '?',
        vis: { art: 'talstreg', fra: Math.max(0, x - 3), til: svar, skjult: svar },
        svar: svar,
        valg: lavValg(rng, svar, 0, niveau >= 3 ? 20 : 10, null, antalValg(niveau)),
        hjaelp: [{ art: 'talstreg' }],
      };
    },

    // Talslangen: hvilket tal kommer før?
    foer(niveau, rng) {
      const x = heltal(rng, 1, 20);
      const svar = x - 1;
      return {
        emne: 'taelle', type: 'foer', niveau, noegle: 'foer:' + x, ikon: '⬅️',
        tale: 'Hvilket tal kommer før ' + x + '?',
        tekst: 'Hvad kommer før ' + x + '?',
        vis: { art: 'talstreg', fra: Math.max(0, svar - 2), til: Math.min(20, x + 2), skjult: svar },
        svar: svar,
        valg: lavValg(rng, svar, 0, 20, null, antalValg(niveau)),
        hjaelp: [{ art: 'talstreg' }],
      };
    },

    // Flest eller færrest? Barnet trykker på gruppen
    flest(niveau, rng, tingListe) {
      const max = niveau >= 2 ? 10 : 6;
      const forskel = niveau >= 2 ? 1 : 2;
      let a, b;
      do { a = heltal(rng, 1, max); b = heltal(rng, 1, max); } while (Math.abs(a - b) < forskel);
      const spoerg = niveau >= 2 && rng() < 0.5 ? 'faerrest' : 'flest';
      const t = vaelgTing(rng, tingListe);
      const svar = spoerg === 'flest' ? (a > b ? 'a' : 'b') : (a < b ? 'a' : 'b');
      return {
        emne: 'taelle', type: 'flest', niveau, noegle: spoerg + ':' + Math.min(a, b) + '-' + Math.max(a, b), ikon: '⚖️',
        tale: 'Hvor er der ' + (spoerg === 'flest' ? 'flest' : 'færrest') + ' ' + t.ting.flt + '? Tryk på dem.',
        tekst: spoerg === 'flest' ? 'Hvor er der flest?' : 'Hvor er der færrest?',
        vis: { art: 'flest', ting: t.noegle, a: a, b: b, spoerg: spoerg },
        svar: svar,
        valg: ['a', 'b'],
        valgArt: 'gruppe',
        hjaelp: [{ art: 'parvis' }],
      };
    },

    // Lige eller ulige? Klodserne stilles to og to
    ligeUlige(niveau, rng) {
      const n = heltal(rng, 1, niveau >= 3 ? 20 : 10);
      const svar = n % 2 === 0 ? 'lige' : 'ulige';
      return {
        emne: 'taelle', type: 'ligeUlige', niveau, noegle: 'ligeUlige:' + n, ikon: '👯',
        tale: 'Er ' + n + ' lige eller ulige?',
        tekst: 'Er ' + n + ' lige eller ulige?',
        vis: { art: 'par', antal: n },
        svar: svar,
        valg: ['lige', 'ulige'],
        valgArt: 'ord',
        hjaelp: [{ art: 'par' }],
      };
    },

    // Hvilket tal er størst — eller mindst? (krokodillen vil have det største, musen det mindste)
    stoerst(niveau, rng) {
      const max = niveau >= 3 ? 20 : 10;
      const tal = [];
      while (tal.length < antalValg(niveau)) {
        const t = heltal(rng, 1, max);
        if (tal.indexOf(t) < 0 && (!tal.length || Math.abs(t - tal[0]) <= 6)) tal.push(t);
      }
      tal.sort((x, y) => x - y);
      const mindst = rng() < 0.5;
      const svar = mindst ? tal[0] : tal[tal.length - 1];
      return {
        emne: 'taelle', type: 'stoerst', niveau, noegle: (mindst ? 'mindst:' : 'stoerst:') + tal.join(','), ikon: mindst ? '🐭' : '🐊',
        tale: mindst ? 'Musen vil have det mindste tal. Hvilket tal er mindst?' : 'Krokodillen vil have det største tal. Hvilket tal er størst?',
        tekst: mindst ? 'Hvilket tal er mindst?' : 'Hvilket tal er størst?',
        vis: { art: 'stoerst', tal: tal, spoerg: mindst ? 'mindst' : 'stoerst' },
        svar: svar,
        valg: bland(rng, tal), // blandet: ellers står det største tal altid nederst, og 🐊 afslører pladsen
        hjaelp: [{ art: 'sammenlign', tal: tal }],
      };
    },

    // ===== Formbyen: figurer =====
    findForm(niveau, rng) {
      const alle = FORMER_PR_NIVEAU[niveau];
      const form = vaelg(rng, alle);
      const former = form === 'rektangel' ? alle.filter((f) => f !== 'kvadrat') : alle;
      return {
        emne: 'former', type: 'findForm', niveau, noegle: 'findForm:' + form, ikon: '👂',
        tale: 'Find ' + FORMER[form].bestemt + '.',
        tekst: 'Find ' + FORMER[form].bestemt,
        vis: { art: 'lyt', form: form },
        svar: form,
        valg: lavValgTekst(rng, form, former, antalValg(niveau)),
        valgArt: 'form',
        hjaelp: [{ art: 'visForm', form: form }],
      };
    },

    hjoerner(niveau, rng) {
      const former = FORMER_PR_NIVEAU[niveau].filter((f) => f !== 'cirkel' || niveau >= 3);
      const form = vaelg(rng, former);
      const svar = FORMER[form].hjoerner;
      return {
        emne: 'former', type: 'hjoerner', niveau, noegle: 'hjoerner:' + form, ikon: '📐',
        tale: 'Hvor mange hjørner har ' + FORMER[form].ubestemt + '?',
        tekst: 'Hvor mange hjørner?',
        vis: { art: 'form', form: form, farve: heltal(rng, 0, 5), drej: heltal(rng, 0, 3) * 15 },
        svar: svar,
        valg: lavValg(rng, svar, 0, 6, null, antalValg(niveau)),
        hjaelp: [{ art: 'hjoerner' }],
      };
    },

    kanter(niveau, rng) {
      const former = FORMER_PR_NIVEAU[niveau].filter((f) => f !== 'cirkel');
      const form = vaelg(rng, former);
      const svar = FORMER[form].hjoerner; // en figur med lige kanter har lige så mange kanter som hjørner
      return {
        emne: 'former', type: 'kanter', niveau, noegle: 'kanter:' + form, ikon: '📏',
        tale: 'Hvor mange kanter har ' + FORMER[form].ubestemt + '?',
        tekst: 'Hvor mange kanter?',
        vis: { art: 'form', form: form, farve: heltal(rng, 0, 5), drej: heltal(rng, 0, 3) * 15 },
        svar: svar,
        valg: lavValg(rng, svar, 0, 6, null, antalValg(niveau)),
        hjaelp: [{ art: 'kanter' }],
      };
    },

    // ---------- Tegnebyen (B6): tegn og mål ----------
    // Sømbræt: barnet trykker prikkerne i rækkefølge (den første er sat) og lukker figuren ved den første prik
    tegnFigur(niveau, rng) {
      const form = vaelg(rng, TEGNE_FIGURER[niveau]);
      // Startprikken vælges, så figuren altid kan tegnes ud fra den (eksempelFigur finder en)
      const muligeStart = [];
      for (let y = 0; y < SOEMBRAET.raek; y++) for (let x = 0; x < SOEMBRAET.kol; x++) if (eksempelFigur(form, [x, y])) muligeStart.push([x, y]);
      const start = vaelg(rng, muligeStart);
      return {
        emne: 'tegne', type: 'tegnFigur', niveau, noegle: 'tegnFigur:' + form + ':' + start.join(','), ikon: '📌',
        tale: 'Tegn ' + FORMER[form].ubestemt + '. Start ved den grønne prik. Tryk på prikkerne, og slut ved den grønne prik.',
        tekst: 'Tegn ' + FORMER[form].ubestemt,
        vis: { art: 'soembraet', kol: SOEMBRAET.kol, raek: SOEMBRAET.raek, form: form, start: start },
        svar: 'ok', interaktiv: 'soembraet',
        hjaelp: [{ art: 'figurHjoerner', form: form }],
      };
    },

    // Lineal: «Hvor lang er stregen?» (1 cm på linealen = 52 px på iPad)
    maalStreg(niveau, rng) {
      const [min, max] = STREG_CM[niveau];
      const cm = heltal(rng, min, max);
      const laengde = LINEAL_CM[niveau];
      return {
        emne: 'tegne', type: 'maalStreg', niveau, noegle: 'maalStreg:' + cm, ikon: '📏',
        tale: 'Hvor lang er stregen? Se på linealen.',
        tekst: 'Hvor mange cm?',
        vis: { art: 'lineal', cm: cm, laengde: laengde },
        svar: cm,
        valg: lavValg(rng, cm, 1, laengde, null, antalValg(niveau)),
        hjaelp: [{ art: 'cmHop' }],
      };
    },

    // Lineal: «Tegn en streg på 5 cm» — træk fra 0 (±0,3 cm godkendes)
    tegnStreg(niveau, rng) {
      const [min, max] = STREG_CM[niveau];
      const cm = heltal(rng, Math.max(2, min), max);
      return {
        emne: 'tegne', type: 'tegnStreg', niveau, noegle: 'tegnStreg:' + cm, ikon: '✏️',
        tale: 'Tegn en streg på ' + cm + ' centimeter. Træk fra nul.',
        tekst: 'Tegn ' + cm + ' cm',
        vis: { art: 'linealTegn', cm: cm, laengde: LINEAL_CM[niveau] },
        svar: 'ok', interaktiv: 'lineal',
        hjaelp: [{ art: 'cmHop' }],
      };
    },

    // Mål med klodser (ikke-standardiseret enhed): «Hvor mange klodser lang er blyanten?»
    maalKlodser(niveau, rng) {
      const [min, max] = KLODS_MAAL[niveau];
      const antal = heltal(rng, min, max);
      const ting = vaelg(rng, MAALE_TING);
      return {
        emne: 'tegne', type: 'maalKlodser', niveau, noegle: 'maalKlodser:' + ting.id + ':' + antal, ikon: '🧱',
        tale: 'Hvor mange klodser lang er ' + ting.bestemt + '?',
        tekst: 'Hvor mange klodser?',
        vis: { art: 'maalKlodser', antal: antal, maaleTing: ting.id },
        svar: antal,
        valg: lavValg(rng, antal, 1, 10, null, antalValg(niveau)),
        hjaelp: [{ art: 'tael' }],
      };
    },

    // En lille by af figurer: hvor mange trekanter?
    formScene(niveau, rng) {
      const alle = FORMER_PR_NIVEAU[niveau];
      const spoerg = vaelg(rng, alle);
      const former = spoerg === 'rektangel' ? alle.filter((f) => f !== 'kvadrat') : alle;
      const ialt = heltal(rng, 4, niveau >= 2 ? 8 : 6);
      const antal = heltal(rng, 1, Math.min(5, ialt - 1));
      const andre = former.filter((f) => f !== spoerg);
      const liste = [];
      for (let i = 0; i < antal; i++) liste.push(spoerg);
      while (liste.length < ialt) liste.push(vaelg(rng, andre));
      const scene = bland(rng, liste).map((f) => ({ form: f, farve: heltal(rng, 0, 5), drej: heltal(rng, 0, 5) * 15 }));
      return {
        emne: 'former', type: 'formScene', niveau, noegle: 'formScene:' + spoerg + ':' + antal, ikon: '🏘️',
        tale: 'Hvor mange ' + FORMER[spoerg].flertal + ' er der?',
        tekst: 'Hvor mange ' + FORMER[spoerg].flertal + '?',
        vis: { art: 'formScene', former: scene, spoerg: spoerg },
        svar: antal,
        valg: lavValg(rng, antal, 0, ialt, null, antalValg(niveau)),
        hjaelp: [{ art: 'tael' }],
      };
    },

    // ===== Plusbjerget: plus til 10 («og» og «i alt») =====
    plusTing(niveau, rng, tingListe) {
      const maxSum = niveau >= 2 ? 10 : 5;
      const sum = heltal(rng, 2, maxSum);
      const a = heltal(rng, 1, sum - 1);
      const b = sum - a;
      const t = vaelgTing(rng, tingListe);
      return {
        emne: 'plus10', type: 'plusTing', niveau, noegle: 'plus:' + a + '+' + b, ikon: '➕',
        tale: 'Der er ' + antalOrd(a, t.ting) + '. Og så kommer der ' + b + ' mere. Hvor mange er der i alt?',
        tekst: a + ' og ' + b,
        vis: { art: 'plus', stil: 'ting', ting: t.noegle, a: a, b: b },
        svar: sum,
        valg: lavValg(rng, sum, 1, maxSum, null, antalValg(niveau)),
        hjaelp: [{ art: 'tael' }, tallinje(Math.max(a, b), Math.min(a, b))],
      };
    },

    // To terninger: 3 og 2 øjne
    plusTerning(niveau, rng) {
      const maxSum = niveau >= 2 ? 10 : 5;
      const a = heltal(rng, 1, Math.min(6, maxSum - 1));
      const b = heltal(rng, 1, Math.min(6, maxSum - a));
      return {
        emne: 'plus10', type: 'plusTerning', niveau, noegle: 'plus:' + a + '+' + b, ikon: '🎲',
        tale: (a === 1 ? 'Et øje' : a + ' øjne') + ' og ' + (b === 1 ? 'et øje' : b + ' øjne') + '. Hvor mange øjne er der i alt?',
        tekst: a + ' og ' + b,
        vis: { art: 'terninger', a: a, b: b },
        svar: a + b,
        valg: lavValg(rng, a + b, 1, maxSum, null, antalValg(niveau)),
        hjaelp: [{ art: 'tael' }, tallinje(Math.max(a, b), Math.min(a, b))],
      };
    },

    // Fingre: 3 fingre og 2 fingre
    plusFingre(niveau, rng) {
      const maxSum = niveau >= 2 ? 10 : 5;
      const sum = heltal(rng, 2, maxSum);
      const a = heltal(rng, 1, sum - 1);
      const b = sum - a;
      return {
        emne: 'plus10', type: 'plusFingre', niveau, noegle: 'plus:' + a + '+' + b, ikon: '🖐️',
        tale: a + (a === 1 ? ' finger' : ' fingre') + ' og ' + b + ' mere. Hvor mange fingre er der i alt?',
        tekst: a + ' og ' + b,
        vis: { art: 'fingre', a: a, b: b },
        svar: sum,
        valg: lavValg(rng, sum, 1, maxSum, null, antalValg(niveau)),
        hjaelp: [{ art: 'tael' }, tallinje(Math.max(a, b), Math.min(a, b))],
      };
    },

    // Klikklodser i to farver
    plusKlodser(niveau, rng) {
      const sum = heltal(rng, 3, 10);
      const a = heltal(rng, 1, sum - 1);
      const b = sum - a;
      return {
        emne: 'plus10', type: 'plusKlodser', niveau, noegle: 'plus:' + a + '+' + b, ikon: '🧱',
        tale: (a === 1 ? 'En rød klods' : a + ' røde klodser') + ' og ' + (b === 1 ? 'en blå' : b + ' blå') + '. Hvor mange klodser er der i alt?',
        tekst: a + ' og ' + b,
        vis: { art: 'klodser', a: a, b: b },
        svar: sum,
        valg: lavValg(rng, sum, 1, 10, null, antalValg(niveau)),
        hjaelp: [{ art: 'tael' }, tallinje(Math.max(a, b), Math.min(a, b))],
      };
    },

    // Regnestykke: 4 + 3 = ?
    plusTal(niveau, rng) {
      const min = niveau >= 3 ? 0 : 1;
      const sum = heltal(rng, 2, 10);
      const a = heltal(rng, min, sum - min);
      const b = sum - a;
      return {
        emne: 'plus10', type: 'plusTal', niveau, noegle: 'plus:' + a + '+' + b, ikon: '➕',
        tale: a + ' og ' + b + '. Hvor meget er det i alt?',
        tekst: a + ' + ' + b + ' = ?',
        vis: { art: 'regnestykke', a: a, b: b },
        svar: sum,
        valg: lavValg(rng, sum, 0, 10, null, antalValg(niveau)),
        hjaelp: [{ art: 'fingre', a: Math.max(a, b), b: Math.min(a, b) }, tallinje(Math.max(a, b), Math.min(a, b))],
      };
    },

    plusTalTast(niveau, rng) {
      const o = G.plusTal(niveau, rng);
      o.type = 'plusTalTast';
      o.valg = null;
      return o;
    },

    // Manglende led: 3 + ? = 5
    plusMangler(niveau, rng) {
      const sum = heltal(rng, 3, 10);
      const a = heltal(rng, 1, sum - 1);
      const svar = sum - a;
      return {
        emne: 'plus10', type: 'plusMangler', niveau, noegle: 'mangler:' + a + '+?=' + sum, ikon: '❓',
        tale: a + ' og hvor mange giver ' + sum + ' i alt?',
        tekst: a + ' + ? = ' + sum,
        vis: { art: 'mangler', a: a, sum: sum },
        svar: svar,
        valg: lavValg(rng, svar, 0, 10, null, antalValg(niveau)),
        hjaelp: [{ art: 'fingreMangler', a: a, sum: sum }, tallinje(a, svar, true)],
      };
    },

    // ===== Venneøen: 5'er- og 10'er-venner =====
    // Én hånd: 3 fingre oppe — hvor mange mangler til en «high five»?
    venFingre(niveau, rng) {
      const a = heltal(rng, 1, 4);
      return {
        emne: 'venner', type: 'venFingre', niveau, noegle: 'ven5fingre:' + a, ikon: '🖐️',
        tale: a + (a === 1 ? ' finger er' : ' fingre er') + ' oppe. Hvor mange mangler, før det er en high five?',
        tekst: a + ' og ? er 5',
        vis: { art: 'haand', a: a },
        svar: 5 - a,
        valg: lavValg(rng, 5 - a, 0, 5, null, antalValg(niveau)),
        hjaelp: [{ art: 'fingreMangler', a: a, sum: 5 }, tallinje(a, 5 - a, true)],
      };
    },

    // 5'er- eller 10'er-vennen som regnestykke: 7 + ? = 10
    venTal(niveau, rng) {
      const hel = niveau >= 2 ? 10 : 5;
      const a = heltal(rng, 1, hel - 1);
      const svar = hel - a;
      return {
        emne: 'venner', type: 'venTal', niveau, noegle: 'ven' + hel + ':' + a, ikon: '🤝',
        tale: 'Hvem er ' + hel + "'er-ven med " + a + '? ' + a + ' og hvor mange giver ' + hel + '?',
        tekst: a + ' + ? = ' + hel,
        vis: { art: 'mangler', a: a, sum: hel },
        svar: svar,
        valg: lavValg(rng, svar, 0, hel, null, antalValg(niveau)),
        hjaelp: [hel === 5 ? { art: 'fingreMangler', a: a, sum: 5 } : { art: 'kugle', a: a, hel: 10 }, tallinje(a, svar, true)],
      };
    },

    venTalTast(niveau, rng) {
      const o = G.venTal(niveau, rng);
      o.type = 'venTalTast';
      o.valg = null;
      return o;
    },

    // Kugleramme med 10 kugler: nogle gemmer sig under bladet
    venKugle(niveau, rng) {
      const a = heltal(rng, 1, 9);
      return {
        emne: 'venner', type: 'venKugle', niveau, noegle: 'ven10kugle:' + a, ikon: '🧮',
        tale: 'Der er 10 kugler. ' + a + ' kan du se. Hvor mange gemmer sig under bladet?',
        tekst: a + ' og ? er 10',
        vis: { art: 'kugleramme', a: a, hel: 10 },
        svar: 10 - a,
        valg: lavValg(rng, 10 - a, 0, 10, null, antalValg(niveau)),
        hjaelp: [{ art: 'kugle', a: a, hel: 10 }, tallinje(a, 10 - a, true)],
      };
    },

    // ===== Minussøen: tage væk og forskel =====
    minusTing(niveau, rng, tingListe) {
      const max = niveau >= 2 ? 10 : 5;
      const a = heltal(rng, 2, max);
      const b = heltal(rng, 1, a - 1);
      const t = vaelgTing(rng, tingListe);
      return {
        emne: 'minus', type: 'minusTing', niveau, noegle: 'minus:' + a + '-' + b, ikon: '➖',
        tale: 'Der er ' + antalOrd(a, t.ting) + '. Vi tager ' + b + ' væk. Hvor mange er der tilbage?',
        tekst: a + ' − ' + b,
        vis: { art: 'minus', stil: 'ting', ting: t.noegle, a: a, b: b },
        svar: a - b,
        valg: lavValg(rng, a - b, 0, max, null, antalValg(niveau)),
        hjaelp: [{ art: 'tilbage' }, tallinje(a, -b)],
      };
    },

    minusKlodser(niveau, rng) {
      const max = niveau >= 2 ? 10 : 5;
      const a = heltal(rng, 3, max);
      const b = heltal(rng, 1, niveau >= 3 ? a : a - 1);
      return {
        emne: 'minus', type: 'minusKlodser', niveau, noegle: 'minus:' + a + '-' + b, ikon: '🧱',
        tale: 'Der er ' + a + ' klodser. Vi tager ' + b + ' væk. Hvor mange er der tilbage?',
        tekst: a + ' − ' + b,
        vis: { art: 'minus', stil: 'klodser', a: a, b: b },
        svar: a - b,
        valg: lavValg(rng, a - b, 0, max, null, antalValg(niveau)),
        hjaelp: [{ art: 'tilbage' }, tallinje(a, -b)],
      };
    },

    // Forskel: to tårne af klodser
    forskel(niveau, rng) {
      let a, b;
      do { a = heltal(rng, 1, 10); b = heltal(rng, 1, 10); } while (a === b);
      const svar = Math.abs(a - b);
      return {
        emne: 'minus', type: 'forskel', niveau, noegle: 'forskel:' + Math.min(a, b) + '-' + Math.max(a, b), ikon: '📊',
        tale: 'Hvad er forskellen på ' + a + ' og ' + b + '? Hvor mange flere er der i det højeste tårn?',
        tekst: 'Forskellen på ' + a + ' og ' + b,
        vis: { art: 'forskel', a: a, b: b },
        svar: svar,
        valg: lavValg(rng, svar, 0, 10, null, antalValg(niveau)),
        hjaelp: [{ art: 'forskel' }, tallinje(Math.min(a, b), svar, true)],
      };
    },

    minusTal(niveau, rng) {
      const a = heltal(rng, niveau >= 3 ? 3 : 2, 10);
      const b = heltal(rng, 1, niveau >= 3 ? a : a - 1);
      return {
        emne: 'minus', type: 'minusTal', niveau, noegle: 'minus:' + a + '-' + b, ikon: '➖',
        tale: 'Hvad er ' + a + ' minus ' + b + '?',
        tekst: a + ' − ' + b + ' = ?',
        vis: { art: 'regnestykke', a: a, b: b, op: '−' },
        svar: a - b,
        valg: lavValg(rng, a - b, 0, 10, null, antalValg(niveau)),
        hjaelp: [{ art: 'klodserVaek', a: a, b: b }, tallinje(a, -b)],
      };
    },

    minusTalTast(niveau, rng) {
      const o = G.minusTal(niveau, rng);
      o.type = 'minusTalTast';
      o.valg = null;
      return o;
    },

    // ===== Klodsbyen: tiere og enere (til 50) =====
    tiere(niveau, rng) {
      const start = heltal(rng, 0, 2) * 10;
      const laengde = 4;
      const skjult = niveau >= 2 ? heltal(rng, 1, laengde - 1) : laengde - 1;
      const svar = start + skjult * 10;
      return {
        emne: 'tiere', type: 'tiere', niveau, noegle: 'tiere:' + start + ':' + skjult, ikon: '🔟',
        tale: 'Vi tæller i tiere. Hvilket tal mangler?',
        tekst: 'Tæl i tiere',
        vis: { art: 'raekke', start: start, trin: 10, laengde: laengde, skjult: skjult },
        svar: svar,
        valg: lavValgTrin(rng, svar, 0, 50, 10, antalValg(niveau)),
        hjaelp: [{ art: 'raekke' }],
      };
    },

    // 10-stænger og løse klodser: 3 stænger og 4 klodser = 34
    staenger(niveau, rng) {
      const tiere = heltal(rng, 1, niveau >= 2 ? 4 : 5);
      const enere = niveau >= 2 ? heltal(rng, 0, 9) : 0;
      const svar = tiere * 10 + enere;
      return {
        emne: 'tiere', type: 'staenger', niveau, noegle: 'staenger:' + svar, ikon: '🧱',
        tale: niveau >= 2 ? 'Hver stang er 10. Hvor mange tiere og enere? Hvilket tal er det?' : 'Hver stang er 10. Hvor mange er der i alt?',
        tekst: 'Hvilket tal?',
        vis: { art: 'staenger', tiere: tiere, enere: enere },
        svar: svar,
        valg: enere ? lavValg(rng, svar, 0, 50, [enere * 10 + tiere, svar + 10, svar - 10], antalValg(niveau)) : lavValgTrin(rng, svar, 10, 50, 10, antalValg(niveau)),
        hjaelp: [{ art: 'staenger' }],
      };
    },

    efter50(niveau, rng) {
      const x = heltal(rng, 20, 49);
      const svar = x + 1;
      return {
        emne: 'tiere', type: 'efter50', niveau, noegle: 'efter:' + x, ikon: '➡️',
        tale: 'Hvilket tal kommer efter ' + x + '?',
        tekst: 'Hvad kommer efter ' + x + '?',
        vis: { art: 'talstreg', fra: x - 3, til: svar, skjult: svar },
        svar: svar,
        valg: lavValg(rng, svar, 0, 50, [x + 10, svar + 10], antalValg(niveau)),
        hjaelp: [{ art: 'talstreg' }],
      };
    },

    foer50(niveau, rng) {
      const x = heltal(rng, 21, 50);
      const svar = x - 1;
      return {
        emne: 'tiere', type: 'foer50', niveau, noegle: 'foer:' + x, ikon: '⬅️',
        tale: 'Hvilket tal kommer før ' + x + '?',
        tekst: 'Hvad kommer før ' + x + '?',
        vis: { art: 'talstreg', fra: svar - 2, til: Math.min(50, x + 2), skjult: svar },
        svar: svar,
        valg: lavValg(rng, svar, 0, 50, [svar - 10], antalValg(niveau)),
        hjaelp: [{ art: 'talstreg' }],
      };
    },

    findTal50(niveau, rng) {
      let n = heltal(rng, 21, 49);
      if (n % 11 === 0) n++; // ikke 22, 33, 44 (omvendt giver det samme)
      const s = String(n);
      return {
        emne: 'tiere', type: 'findTal50', niveau, noegle: 'findTal:' + n, ikon: '👂',
        tale: 'Find tallet ' + n + '.',
        tekst: 'Find tallet',
        vis: { art: 'lyt', tal: n },
        svar: n,
        valg: lavValg(rng, n, 0, 50, [Number(s[1] + s[0]), n + 10, n - 10], antalValg(niveau)),
        hjaelp: [{ art: 'visTal', tal: n }],
      };
    },

    // ===== Tierbroen: plus og minus til 20 =====
    // 10 og 4: en 10-stang og løse klodser
    tiPlus(niveau, rng) {
      const b = heltal(rng, 1, 10);
      return {
        emne: 'tierbro', type: 'tiPlus', niveau, noegle: 'plus:10+' + b, ikon: '🧱',
        tale: '10 og ' + b + '. Hvor mange er der i alt?',
        tekst: '10 + ' + b,
        vis: { art: 'klodser', a: 10, b: b },
        svar: 10 + b,
        valg: lavValg(rng, 10 + b, 10, 20, null, antalValg(niveau)),
        hjaelp: [{ art: 'tael' }, tallinje(10, b)],
      };
    },

    // Dobbelt: 6 + 6
    dobbelt(niveau, rng) {
      const a = heltal(rng, 1, niveau >= 2 ? 10 : 5);
      return {
        emne: 'tierbro', type: 'dobbelt', niveau, noegle: 'plus:' + a + '+' + a, ikon: '👯',
        tale: 'Dobbelt op! ' + a + ' og ' + a + '. Hvor meget er det i alt?',
        tekst: a + ' + ' + a + ' = ?',
        vis: { art: 'regnestykke', a: a, b: a },
        svar: a + a,
        valg: lavValg(rng, a + a, 0, 20, null, antalValg(niveau)),
        hjaelp: [a <= 5 ? { art: 'fingre', a: a, b: a } : { art: 'klodserPlus', a: a, b: a }, tallinje(a, a)],
      };
    },

    // 8 + 5: over tieren — fyld 10-stangen først
    overTi(niveau, rng) {
      const a = heltal(rng, 2, 9);
      const b = heltal(rng, Math.max(2, 11 - a), 9);
      return {
        emne: 'tierbro', type: 'overTi', niveau, noegle: 'plus:' + a + '+' + b, ikon: '🌉',
        tale: a + ' og ' + b + '. Hvor mange er der i alt?',
        tekst: a + ' + ' + b + ' = ?',
        vis: { art: 'klodser', a: a, b: b },
        svar: a + b,
        valg: lavValg(rng, a + b, 10, 20, null, antalValg(niveau)),
        hjaelp: [{ art: 'tiFoerst', a: a, b: b }, tallinje(Math.max(a, b), Math.min(a, b))],
      };
    },

    overTiTast(niveau, rng) {
      const o = G.overTi(niveau, rng);
      o.type = 'overTiTast';
      o.vis = { art: 'regnestykke', a: o.vis.a, b: o.vis.b };
      o.valg = null;
      return o;
    },

    // 13 − 5: tilbage over tieren
    minusTi(niveau, rng) {
      const a = heltal(rng, 11, 18);
      const b = heltal(rng, Math.max(2, a - 9), 9); // a − b < 10: først ned til 10, så resten
      return {
        emne: 'tierbro', type: 'minusTi', niveau, noegle: 'minus:' + a + '-' + b, ikon: '➖',
        tale: 'Hvad er ' + a + ' minus ' + b + '?',
        tekst: a + ' − ' + b + ' = ?',
        vis: { art: 'regnestykke', a: a, b: b, op: '−' },
        svar: a - b,
        valg: lavValg(rng, a - b, 0, 20, null, antalValg(niveau)),
        hjaelp: [{ art: 'klodserVaek', a: a, b: b }, tallinje(a, -b)],
      };
    },

    // ===== Mønsterslottet: figurmønstre og talrækker =====
    moenster(niveau, rng) {
      const typer = niveau >= 2 ? ['AAB', 'ABB', 'ABC', 'AB'] : ['AB'];
      const t = vaelg(rng, typer);
      const brikker = bland(rng, Object.keys(MOENSTER_BRIKKER)).slice(0, 4);
      const enhed = t.split('').map((c) => brikker['ABC'.indexOf(c)]);
      const vist = enhed.length * 2 + heltal(rng, 0, enhed.length - 1);
      const svar = enhed[vist % enhed.length];
      const muligheder = brikker.slice(0, new Set(enhed).size).concat([brikker[3]]);
      return {
        emne: 'moenstre', type: 'moenster', niveau, noegle: 'moenster:' + t + ':' + enhed.join(''), ikon: '🔁',
        tale: 'Se mønstret. Hvad kommer så?',
        tekst: 'Hvad kommer så?',
        vis: { art: 'moenster', enhed: enhed, vist: vist },
        svar: svar,
        valg: lavValgTekst(rng, svar, muligheder, antalValg(niveau)),
        valgArt: 'brik',
        hjaelp: [{ art: 'moenster' }],
      };
    },

    // Talrækker: +1, −1, +2 … (som i bogens kapitel 8)
    talRaekke(niveau, rng) {
      const trin = vaelg(rng, niveau >= 3 ? [2, -1, 5, 10, -2] : [1, -1, 2]);
      const laengde = 4;
      const skjult = laengde - 1;
      let start;
      if (trin > 0) start = trin === 10 ? heltal(rng, 0, 2) * 10 : trin === 5 ? heltal(rng, 0, 2) * 5 : heltal(rng, 0, 10);
      else start = heltal(rng, -trin * skjult, 20); // tæl ned uden at komme under nul
      const svar = start + skjult * trin;
      return {
        emne: 'moenstre', type: 'talRaekke', niveau, noegle: 'talRaekke:' + start + (trin > 0 ? '+' : '') + trin, ikon: '🔢',
        tale: trin < 0 ? 'Vi tæller ned. Hvilket tal kommer så?' : 'Hvilket tal kommer så?',
        tekst: 'Hvad kommer så?',
        vis: { art: 'raekke', start: start, trin: trin, laengde: laengde, skjult: skjult },
        svar: svar,
        valg: Math.abs(trin) >= 5 ? lavValgTrin(rng, svar, 0, 50, Math.abs(trin), antalValg(niveau)) : lavValg(rng, svar, 0, 50, [svar + trin, svar - trin], antalValg(niveau)),
        hjaelp: Math.abs(trin) <= 2 ? [{ art: 'raekke' }, tallinje(svar - trin, trin)] : [{ art: 'raekke' }],
      };
    },

    // ===== Klokketårnet: hel og halv (ekstra) =====
    // Dansk tidssprog: «halv fem» er 4:30. Tal skrives som «t:mm» (fx '4:30') — én tekstværdi pr. svar.
    klokkeLaes(niveau, rng) {
      const halv = niveau >= 2 && rng() < 0.6;
      const t = heltal(rng, 1, 12);
      const svar = t + ':' + (halv ? '30' : '00');
      const naeste = (t % 12) + 1, forrige = t === 1 ? 12 : t - 1;
      // Typiske fejl: hel/halv byttet, «halv fem» læst som 5:30, timen før/efter
      const andre = halv ? [naeste + ':30', t + ':00', naeste + ':00', forrige + ':30'] : [naeste + ':00', forrige + ':00', t + ':30'];
      return {
        emne: 'maaling', type: 'klokkeLaes', niveau, noegle: 'klokkeLaes:' + svar, ikon: '🕰️',
        tale: 'Hvad er klokken?',
        tekst: 'Hvad er klokken?',
        vis: { art: 'ur', klokke: svar },
        svar: svar,
        valg: lavValgTekst(rng, svar, [svar].concat(andre), antalValg(niveau)),
        valgArt: 'tid',
        hjaelp: [{ art: 'urVisere' }, { art: 'visUr', klokke: svar }],
      };
    },

    // Lyt og find uret («Find klokken halv fem») — svarene er analoge ure
    klokkeFind(niveau, rng) {
      const halv = niveau >= 2 && rng() < 0.6;
      const tNavn = heltal(rng, 1, 12);                        // timen, man siger
      const t = halv ? (tNavn === 1 ? 12 : tNavn - 1) : tNavn; // timen, uret viser
      const svar = t + ':' + (halv ? '30' : '00');
      const naeste = (t % 12) + 1, forrige = t === 1 ? 12 : t - 1;
      const andre = halv ? [tNavn + ':30', tNavn + ':00', t + ':00', forrige + ':30'] : [naeste + ':00', forrige + ':00', t + ':30'];
      return {
        emne: 'maaling', type: 'klokkeFind', niveau, noegle: 'klokkeFind:' + svar, ikon: '👂',
        tale: 'Find uret, der viser klokken ' + klokkeNavn(svar) + '.',
        tekst: 'Find uret',
        vis: { art: 'lyt', klokke: svar },
        svar: svar,
        valg: lavValgTekst(rng, svar, [svar].concat(andre), antalValg(niveau)),
        valgArt: 'ur',
        hjaelp: [{ art: 'visUr', klokke: svar }],
      };
    },

    // ===== Markedet: penge (kroner til 20) (ekstra) =====
    moenter(niveau, rng) {
      const typer = niveau >= 2 ? [1, 2, 5, 10] : [1, 2];
      const max = niveau >= 2 ? 20 : 10;
      let liste;
      do {
        liste = [];
        let sum = 0;
        const antal = heltal(rng, 2, niveau >= 2 ? 4 : 5);
        for (let i = 0; i < antal; i++) {
          const muligt = typer.filter((m) => sum + m <= max);
          if (!muligt.length) break;
          const m = vaelg(rng, muligt);
          liste.push(m); sum += m;
        }
      } while (liste.length < 2 || (niveau >= 2 && liste.every((m) => m === liste[0])));
      liste.sort((x, y) => y - x); // største mønt først: tæl videre fra den største
      const sum = liste.reduce((s, m) => s + m, 0);
      return {
        emne: 'maaling', type: 'moenter', niveau, noegle: 'moenter:' + liste.join('+'), ikon: '🪙',
        tale: 'Hvor mange kroner er der i alt?',
        tekst: 'Hvor mange kroner?',
        vis: { art: 'moenter', moenter: liste },
        svar: sum,
        // Typisk fejl: tælle mønterne i stedet for kronerne
        valg: lavValg(rng, sum, 1, max, [liste.length], antalValg(niveau)),
        hjaelp: [{ art: 'moenter' }],
      };
    },

    // Byttepenge: du har 10 kr og køber noget til 7 kr — tæl op fra prisen
    byttepenge(niveau, rng) {
      const har = niveau >= 3 ? vaelg(rng, [10, 20]) : 10;
      const pris = har === 10 ? heltal(rng, niveau >= 3 ? 3 : 5, 9) : heltal(rng, 11, 18);
      const vare = vaelg(rng, VARER);
      return {
        emne: 'maaling', type: 'byttepenge', niveau, noegle: 'bytte:' + har + '-' + pris, ikon: '🛒',
        tale: 'Du har ' + har + ' kroner. ' + vare.navn + ' koster ' + pris + ' kroner. Hvor mange kroner får du tilbage?',
        tekst: har + ' kr − ' + pris + ' kr',
        vis: { art: 'koeb', har: har, pris: pris, vare: vare.e },
        svar: har - pris,
        valg: lavValg(rng, har - pris, 0, 20, [pris, har - pris + 1], antalValg(niveau)),
        hjaelp: [tallinje(pris, har - pris, true)],
      };
    },
  };

  // ---------- Emner og niveauer (i bogens rækkefølge) ----------
  // typer[0] er den letteste på niveauet — runden starter altid med den (succes fra start)
  const EMNER = {
    taelle: {
      navn: 'Tal til 20', omraade: 'Tal og algebra', maxNiveau: 3,
      niveauer: {
        1: ['antal', 'terning', 'flest', 'findTal'],
        2: ['antal', 'klodser', 'efter', 'findTal', 'ligeUlige', 'flest'],
        3: ['klodser', 'streger', 'efter', 'foer', 'findTal', 'ligeUlige', 'stoerst'],
      },
    },
    former: {
      navn: 'Figurer', omraade: 'Geometri og måling', maxNiveau: 3,
      niveauer: {
        1: ['findForm', 'formScene'],
        2: ['findForm', 'hjoerner', 'kanter', 'formScene'],
        3: ['findForm', 'hjoerner', 'kanter', 'formScene'],
      },
    },
    tegne: {
      navn: 'Tegn og mål', omraade: 'Geometri og måling', maxNiveau: 3,
      niveauer: {
        1: ['maalKlodser', 'tegnFigur', 'maalStreg'],
        2: ['maalKlodser', 'tegnFigur', 'maalStreg', 'tegnStreg'],
        3: ['tegnFigur', 'maalStreg', 'tegnStreg'],
      },
    },
    plus10: {
      navn: 'Plus til 10', omraade: 'Tal og algebra', maxNiveau: 3,
      niveauer: {
        1: ['plusTing', 'plusFingre', 'plusTerning'],
        2: ['plusTing', 'plusFingre', 'plusTerning', 'plusKlodser', 'plusTal'],
        3: ['plusKlodser', 'plusTal', 'plusTalTast', 'plusMangler'],
      },
    },
    venner: {
      navn: "5'er- og 10'er-venner", omraade: 'Tal og algebra', maxNiveau: 3,
      niveauer: {
        1: ['venFingre', 'venTal'],
        2: ['venKugle', 'venTal'],
        3: ['venKugle', 'venTal', 'venTalTast'],
      },
    },
    minus: {
      navn: 'Minus og forskel', omraade: 'Tal og algebra', maxNiveau: 3,
      niveauer: {
        1: ['minusTing', 'minusKlodser'],
        2: ['minusTing', 'minusKlodser', 'forskel', 'minusTal'],
        3: ['minusKlodser', 'forskel', 'minusTal', 'minusTalTast'],
      },
    },
    tiere: {
      navn: 'Tiere og enere', omraade: 'Tal og algebra', maxNiveau: 3,
      niveauer: {
        1: ['staenger', 'tiere'],
        2: ['staenger', 'tiere', 'efter50'],
        3: ['staenger', 'efter50', 'foer50', 'findTal50'],
      },
    },
    tierbro: {
      navn: 'Plus og minus til 20', omraade: 'Tal og algebra', maxNiveau: 3,
      niveauer: {
        1: ['tiPlus', 'dobbelt'],
        2: ['tiPlus', 'dobbelt', 'overTi'],
        3: ['overTi', 'overTiTast', 'minusTi', 'dobbelt'],
      },
    },
    moenstre: {
      navn: 'Mønstre og talrækker', omraade: 'Tal og algebra', maxNiveau: 3,
      niveauer: {
        1: ['moenster'],
        2: ['moenster', 'talRaekke'],
        3: ['talRaekke', 'moenster'],
      },
    },
    // Ekstra: klokken hel og halv, kroner til 20 (Fælles Mål: måling — tid og penge)
    maaling: {
      navn: 'Klokken og penge', omraade: 'Måling', maxNiveau: 3,
      niveauer: {
        1: ['klokkeLaes', 'moenter', 'klokkeFind'],
        2: ['klokkeLaes', 'klokkeFind', 'moenter', 'byttepenge'],
        3: ['klokkeLaes', 'byttepenge', 'moenter', 'klokkeFind'],
      },
    },
  };

  function klemNiveau(emneId, niveau) {
    const max = EMNER[emneId].maxNiveau;
    const n = Math.round(Number(niveau)) || 1;
    return Math.min(max, Math.max(1, n));
  }

  function lavOpgave(type, niveau, rng, tingListe) {
    return G[type](niveau, rng, tingListe);
  }

  // En runde = 5 korte opgaver. Svære opgaver fra sidst (gentag) sættes ind på plads 3 og 4.
  // Opgaver, der kun kan løses ved at høre oplæsningen
  const LYT_TYPER = ['findTal', 'findTal50', 'findForm', 'klokkeFind'];
  function brugbareTyper(typer, opts) {
    if (!opts || !opts.udenLyt) return typer;
    const uden = typer.filter((t) => LYT_TYPER.indexOf(t) < 0);
    return uden.length ? uden : typer;
  }

  function lavRunde(emneId, niveau, rng, opts) {
    opts = opts || {};
    const antal = opts.antal || 5;
    niveau = klemNiveau(emneId, niveau);
    const typer = brugbareTyper(EMNER[emneId].niveauer[niveau], opts);
    const runde = [];
    const brugte = {};
    let koe = [typer[0]];
    let forsoeg = 0;
    while (runde.length < antal && forsoeg < 500) {
      forsoeg++;
      if (!koe.length) koe = bland(rng, typer);
      const type = koe.shift();
      // samme type to gange i træk undgås, når der er flere at vælge imellem
      if (runde.length && typer.length > 1 && runde[runde.length - 1].type === type && forsoeg < 400) continue;
      const o = lavOpgave(type, niveau, rng, opts.ting);
      if (brugte[o.noegle] && forsoeg < 400) continue;
      brugte[o.noegle] = true;
      runde.push(o);
    }
    const gentag = (opts.gentag || []).filter((o) => o && o.emne === emneId && G[o.type] && Array.isArray(o.hjaelp) && !brugte[o.noegle] && !(opts.udenLyt && LYT_TYPER.indexOf(o.type) >= 0)).slice(0, 2);
    gentag.forEach((o, i) => {
      const plads = Math.min(runde.length - 1, 2 + i);
      runde[plads] = Object.assign({}, o, { gentaget: true });
    });
    return runde;
  }

  // Lystårnet: én opgave fra hvert af fem forskellige emner, hver på sit eget niveau.
  // niveauer = { emneId: niveau } for de emner, barnet har åbne.
  function lavBlandetRunde(niveauer, rng, opts) {
    opts = opts || {};
    const emner = bland(rng, Object.keys(niveauer).filter((e) => EMNER[e]));
    const runde = [];
    let i = 0;
    const antal = opts.antal || 5;
    while (runde.length < antal && emner.length) {
      const e = emner[i % emner.length];
      const n = klemNiveau(e, niveauer[e]);
      const typer = brugbareTyper(EMNER[e].niveauer[n], opts);
      const o = lavOpgave(vaelg(rng, typer), n, rng, opts.ting);
      if (!runde.some((x) => x.noegle === o.noegle)) runde.push(o);
      i++;
      if (i > 60) break;
    }
    return runde;
  }

  // ---------- Tilpasset sværhedsgrad (sigter efter ca. 80 % rigtige) ----------
  // Kun første forsøg tæller. Op: 4 af de sidste 5 rigtige. Ned: 3 forkerte i træk eller højst 2 af 5.
  // Mestret: mindst 6 af de sidste 8 rigtige på øverste trin (det åbner næste verden).
  function opdaterNiveau(emneData, rigtig, maxNiveau) {
    const d = Object.assign({ niveau: 1, seneste: [], mestret: false }, emneData);
    const seneste = (d.seneste || []).concat([rigtig ? 1 : 0]).slice(-10);
    const sum = (l) => l.reduce((s, v) => s + v, 0);
    const s5 = seneste.slice(-5);
    const s3 = seneste.slice(-3);
    let niveau = d.niveau;
    let aendring = 0;
    if (s5.length === 5 && sum(s5) >= 4 && niveau < maxNiveau) {
      niveau++; aendring = 1;
    } else if (niveau > 1 && ((s3.length === 3 && sum(s3) === 0) || (s5.length === 5 && sum(s5) <= 2))) {
      niveau--; aendring = -1;
    }
    const s8 = seneste.slice(-8);
    const mestret = d.mestret || (d.niveau === maxNiveau && aendring === 0 && s8.length === 8 && sum(s8) >= 6);
    const data = Object.assign({}, d, { niveau: niveau, seneste: aendring ? [] : seneste, mestret: mestret });
    return { data: data, aendring: aendring };
  }

  // ---------- Samlemærker: faste dyr i fast rækkefølge (ingen tilfældige præmier) ----------
  // Hver runde hjælper ét bestemt dyr, som barnet kan se fra start; bagefter kommer det i samlebogen.
  const MAERKER = {
    jungle: [
      { id: 'trex', e: '🦖', art: 'en', navn: 'T-rex', bestemt: 'T-rexen' },
      { id: 'langhals', e: '🦕', art: 'en', navn: 'langhals', bestemt: 'langhalsen' },
      { id: 'papegoeje', e: '🦜', art: 'en', navn: 'papegøje', bestemt: 'papegøjen' },
      { id: 'abe', e: '🐒', art: 'en', navn: 'abe', bestemt: 'aben' },
      { id: 'froe', e: '🐸', art: 'en', navn: 'frø', bestemt: 'frøen' },
      { id: 'skildpadde', e: '🐢', art: 'en', navn: 'skildpadde', bestemt: 'skildpadden' },
      { id: 'elefant', e: '🐘', art: 'en', navn: 'elefant', bestemt: 'elefanten' },
      { id: 'giraf', e: '🦒', art: 'en', navn: 'giraf', bestemt: 'giraffen' },
      { id: 'krokodille', e: '🐊', art: 'en', navn: 'krokodille', bestemt: 'krokodillen' },
      { id: 'firben', e: '🦎', art: 'et', navn: 'firben', bestemt: 'firbenet' },
      { id: 'zebra', e: '🦓', art: 'en', navn: 'zebra', bestemt: 'zebraen' },
      { id: 'flodhest', e: '🦛', art: 'en', navn: 'flodhest', bestemt: 'flodhesten' },
      { id: 'slange', e: '🐍', art: 'en', navn: 'slange', bestemt: 'slangen' },
      { id: 'gorilla', e: '🦍', art: 'en', navn: 'gorilla', bestemt: 'gorillaen' },
      { id: 'flamingo', e: '🦩', art: 'en', navn: 'flamingo', bestemt: 'flamingoen' },
      { id: 'leopard', e: '🐆', art: 'en', navn: 'leopard', bestemt: 'leoparden' },
      { id: 'tiger', e: '🐅', art: 'en', navn: 'tiger', bestemt: 'tigeren' },
      { id: 'dovendyr', e: '🦥', art: 'et', navn: 'dovendyr', bestemt: 'dovendyret' },
      { id: 'naesehorn', e: '🦏', art: 'et', navn: 'næsehorn', bestemt: 'næsehornet' },
      { id: 'drage', e: '🐉', art: 'en', navn: 'drage', bestemt: 'dragen' },
      // Ekstra (tilføjet bagerst, så de første 20 runder giver de samme dyr som før)
      { id: 'loeve', e: '🦁', art: 'en', navn: 'løve', bestemt: 'løven' },
      { id: 'kaenguru', e: '🦘', art: 'en', navn: 'kænguru', bestemt: 'kænguruen' },
      { id: 'flagermus', e: '🦇', art: 'en', navn: 'flagermus', bestemt: 'flagermusen' },
      { id: 'oern', e: '🦅', art: 'en', navn: 'ørn', bestemt: 'ørnen' },
      { id: 'kamel', e: '🐫', art: 'en', navn: 'kamel', bestemt: 'kamelen' },
      { id: 'lama', e: '🦙', art: 'en', navn: 'lama', bestemt: 'lamaen' },
      { id: 'odder', e: '🦦', art: 'en', navn: 'odder', bestemt: 'odderen' },
      { id: 'bjoern', e: '🐻', art: 'en', navn: 'bjørn', bestemt: 'bjørnen' },
      { id: 'hval', e: '🐳', art: 'en', navn: 'hval', bestemt: 'hvalen' },
      { id: 'krabbe', e: '🦀', art: 'en', navn: 'krabbe', bestemt: 'krabben' },
    ],
    eventyr: [
      { id: 'enhjoerning', e: '🦄', art: 'en', navn: 'enhjørning', bestemt: 'enhjørningen' },
      { id: 'kat', e: '🐱', art: 'en', navn: 'kat', bestemt: 'katten' },
      { id: 'kanin', e: '🐰', art: 'en', navn: 'kanin', bestemt: 'kaninen' },
      { id: 'sommerfugl', e: '🦋', art: 'en', navn: 'sommerfugl', bestemt: 'sommerfuglen' },
      { id: 'svane', e: '🦢', art: 'en', navn: 'svane', bestemt: 'svanen' },
      { id: 'hest', e: '🐴', art: 'en', navn: 'hest', bestemt: 'hesten' },
      { id: 'fe', e: '🧚', art: 'en', navn: 'fe', bestemt: 'feen' },
      { id: 'prinsesse', e: '👸', art: 'en', navn: 'prinsesse', bestemt: 'prinsessen' },
      { id: 'paafugl', e: '🦚', art: 'en', navn: 'påfugl', bestemt: 'påfuglen' },
      { id: 'delfin', e: '🐬', art: 'en', navn: 'delfin', bestemt: 'delfinen' },
      { id: 'mariehoene', e: '🐞', art: 'en', navn: 'mariehøne', bestemt: 'mariehønen' },
      { id: 'ugle', e: '🦉', art: 'en', navn: 'ugle', bestemt: 'uglen' },
      { id: 'egern', e: '🐿️', art: 'et', navn: 'egern', bestemt: 'egernet' },
      { id: 'pindsvin', e: '🦔', art: 'et', navn: 'pindsvin', bestemt: 'pindsvinet' },
      { id: 'flamingo', e: '🦩', art: 'en', navn: 'flamingo', bestemt: 'flamingoen' },
      { id: 'sael', e: '🦭', art: 'en', navn: 'sæl', bestemt: 'sælen' },
      { id: 'panda', e: '🐼', art: 'en', navn: 'panda', bestemt: 'pandaen' },
      { id: 'koala', e: '🐨', art: 'en', navn: 'koala', bestemt: 'koalaen' },
      { id: 'skildpadde', e: '🐢', art: 'en', navn: 'skildpadde', bestemt: 'skildpadden' },
      { id: 'drage', e: '🐉', art: 'en', navn: 'drage', bestemt: 'dragen' },
      // Ekstra (tilføjet bagerst, så de første 20 runder giver de samme dyr som før)
      { id: 'hund', e: '🐶', art: 'en', navn: 'hund', bestemt: 'hunden' },
      { id: 'hamster', e: '🐹', art: 'en', navn: 'hamster', bestemt: 'hamsteren' },
      { id: 'pingvin', e: '🐧', art: 'en', navn: 'pingvin', bestemt: 'pingvinen' },
      { id: 'bi', e: '🐝', art: 'en', navn: 'bi', bestemt: 'bien' },
      { id: 'snegl', e: '🐌', art: 'en', navn: 'snegl', bestemt: 'sneglen' },
      { id: 'fisk', e: '🐠', art: 'en', navn: 'fisk', bestemt: 'fisken' },
      { id: 'blaeksprutte', e: '🐙', art: 'en', navn: 'blæksprutte', bestemt: 'blæksprutten' },
      { id: 'lam', e: '🐑', art: 'et', navn: 'lam', bestemt: 'lammet' },
      { id: 'kylling', e: '🐣', art: 'en', navn: 'kylling', bestemt: 'kyllingen' },
      { id: 'gris', e: '🐷', art: 'en', navn: 'gris', bestemt: 'grisen' },
    ],
  };

  // Mærket til runde nr. (0, 1, 2 …): altid det samme for samme nummer — forudsigeligt.
  // Dyr med samme emoji som barnets rejseven springes over (vennen skal ikke «reddes»).
  function maerkeForRunde(samling, nr, undgaaEmoji) {
    const pulje = (MAERKER[samling] || MAERKER.jungle).filter((m) => m.e !== undgaaEmoji);
    const n = Math.max(0, Math.floor(Number(nr) || 0));
    return pulje[n % pulje.length];
  }

  // ---------- Til voksenoverblikket: «hvad driller» i almindelige ord ----------
  function beskrivNoegle(noegle) {
    const [art, rest] = String(noegle).split(/:(.*)/s);
    const r = rest || '';
    const tekster = {
      antal: () => 'Tælle ' + r + ' ting',
      tegnFigur: () => 'Tegne ' + (FORMER[r.split(':')[0]] ? FORMER[r.split(':')[0]].ubestemt : 'en figur') + ' på sømbrættet',
      maalStreg: () => 'Måle en streg på ' + r + ' cm',
      tegnStreg: () => 'Tegne en streg på ' + r + ' cm',
      maalKlodser: () => 'Måle med klodser (' + r.split(':')[1] + ' lang)',
      terning: () => 'Terningøjne: ' + r,
      klodser: () => 'Tælle ' + r + ' klodser',
      streger: () => 'Tællestreger: ' + r,
      findTal: () => 'Genkende tallet ' + r,
      efter: () => 'Tallet efter ' + r,
      foer: () => 'Tallet før ' + r,
      flest: () => 'Flest (' + r.replace('-', ' eller ') + ')',
      faerrest: () => 'Færrest (' + r.replace('-', ' eller ') + ')',
      ligeUlige: () => 'Er ' + r + ' lige eller ulige?',
      stoerst: () => 'Størst af ' + r.split(',').join(', '),
      mindst: () => 'Mindst af ' + r.split(',').join(', '),
      findForm: () => 'Finde ' + (FORMER[r] ? FORMER[r].bestemt : r),
      hjoerner: () => 'Hjørner på ' + (FORMER[r] ? FORMER[r].ubestemt : r),
      kanter: () => 'Kanter på ' + (FORMER[r] ? FORMER[r].ubestemt : r),
      formScene: () => 'Tælle ' + (FORMER[r.split(':')[0]] ? FORMER[r.split(':')[0]].flertal : 'figurer'),
      plus: () => r.replace('+', ' + '),
      mangler: () => r.replace('+?=', ' + ? = '),
      ven5fingre: () => "5'er-vennen til " + r + ' (fingre)',
      ven5: () => "5'er-vennen til " + r,
      ven10: () => "10'er-vennen til " + r,
      ven10kugle: () => "10'er-vennen til " + r + ' (kugleramme)',
      minus: () => r.replace('-', ' − '),
      forskel: () => 'Forskellen på ' + r.replace('-', ' og '),
      tiere: () => 'Tælle i tiere',
      staenger: () => 'Tiere og enere: ' + r,
      moenster: () => 'Mønster (' + r.split(':')[0] + ')',
      talRaekke: () => 'Talrække fra ' + r,
      klokkeLaes: () => 'Aflæse klokken ' + klokkeNavn(r),
      klokkeFind: () => 'Finde uret, der viser ' + klokkeNavn(r),
      moenter: () => 'Tælle mønter: ' + r.split('+').join(' + ') + ' kr',
      bytte: () => 'Byttepenge: ' + r.replace('-', ' kr − ') + ' kr',
    };
    return tekster[art] ? tekster[art]() : String(noegle);
  }

  // Idéer til hjemmet pr. emne (egne formuleringer — inspireret af skolens «aktiviteter til hjemmet»)
  const HJEMME_IDEER = {
    taelle: 'Tæl ting i hverdagen: trappetrin, knapper, gulerødder. Slå med en terning og sig antallet uden at tælle. Stil sokker to og to: lige eller ulige?',
    tegne: 'Mål ting med klodser, tændstikker eller en lineal: hvor mange klodser lang er skeen? Tegn trekanter og firkanter på ternet papir — og tæl hjørnerne bagefter.',
    former: 'Find cirkler, trekanter og firkanter i køkkenet og på gåturen. Tæl hjørner og kanter på en bog eller en pizzaskive.',
    plus10: 'Plus på fingrene: «Vis 3 — og 2 mere. Hvor mange i alt?» Slå med to terninger og læg øjnene sammen.',
    venner: "10'er-venner med fingrene: vis 7 — hvor mange mangler til 10? Læg 10 perler på en snor og skub nogle til siden.",
    minus: 'Tag væk: 8 rosiner, spis 3 — hvor mange er tilbage? Byg to tårne af klodser og find forskellen.',
    tiere: 'Saml ting i bunker af 10 (tiere) og resten løse (enere). Tæl tikroner og enkroner i sparegrisen.',
    tierbro: 'Dobbelt: 6 og 6, 7 og 7. Brug en æggebakke med 10 huller: fyld op til 10 først, så resten.',
    moenstre: 'Lav mønstre med klodser eller perler: rød-blå-rød-blå. Tæl i 2\'ere på trappen.',
    maaling: 'Kig på uret sammen ved hele og halve timer: «Nu er klokken halv fem — den store viser peger på 6.» Lad barnet betale med mønter i bageren og tælle byttepengene.',
  };

  const Opgaver = {
    lavRng, heltal, vaelg, bland,
    TING, EMNER, MAERKER, FORMER, FORMER_PR_NIVEAU, MOENSTER_BRIKKER, G,
    antalOrd, antalValg, lavValg, lavValgTrin, lavValgTekst, talForvekslere, LYT_TYPER,
    lavOpgave, lavRunde, lavBlandetRunde, klemNiveau, opdaterNiveau, maerkeForRunde,
    beskrivNoegle, HJEMME_IDEER, klokkeNavn,
    SOEMBRAET, MAALE_TING, vurderFigur, figurPasser, stregPasser, eksempelFigur,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Opgaver;
  else root.Opgaver = Opgaver;
})(typeof self !== 'undefined' ? self : this);
