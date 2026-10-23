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

  // Klokken som ord til oplæsning: '4:00' → 'fire', '4:30' → 'halv fem', '4:15' → 'kvart over fire', '4:45' → 'kvart i fem'
  const TIME_ORD = ['tolv', 'et', 'to', 'tre', 'fire', 'fem', 'seks', 'syv', 'otte', 'ni', 'ti', 'elleve', 'tolv'];
  // 5-minutter: '7:05' → 'fem minutter over syv', '7:25' → 'fem minutter i halv otte', '7:40' → 'tyve minutter i otte'
  function klokkeNavn(klokke) {
    const [t, m] = String(klokke).split(':').map(Number);
    const naeste = TIME_ORD[(t % 12) + 1];
    if (m === 30) return 'halv ' + naeste;
    if (m === 15) return 'kvart over ' + TIME_ORD[t];
    if (m === 45) return 'kvart i ' + naeste;
    const fem = { 5: 'fem minutter over ' + TIME_ORD[t], 10: 'ti minutter over ' + TIME_ORD[t], 20: 'tyve minutter over ' + TIME_ORD[t],
      25: 'fem minutter i halv ' + naeste, 35: 'fem minutter over halv ' + naeste, 40: 'tyve minutter i ' + naeste,
      50: 'ti minutter i ' + naeste, 55: 'fem minutter i ' + naeste }[m];
    return fem || TIME_ORD[t];
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
    // Punkter på linje med naboerne er ikke hjørner — fjern dem, til intet ændrer sig. Men kun når punktet ligger
    // MELLEM naboerne: går stregen frem og tilbage ad samme linje (en «pig»), er det ingen figur (E #5).
    let aendret = true;
    while (aendret && p.length >= 3) {
      aendret = false;
      for (let i = 0; i < p.length; i++) {
        const a = p[(i - 1 + p.length) % p.length], b = p[i], c = p[(i + 1) % p.length];
        if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) !== 0) continue;
        if ((a[0] - b[0]) * (c[0] - b[0]) + (a[1] - b[1]) * (c[1] - b[1]) >= 0) return ud; // pig: ingen figur
        p.splice(i, 1); aendret = true; break;
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

  // ---------- D (forslaget 09-10): fælles hjælpere til de nye opgavetyper ----------
  // De nye typer tegnes som en «scene» af små dele (vis.art 'scene', se docs/SCENE.md). vis.fakta er opgavens tal
  // med rene ord — testen regner facit ud fra dem, uafhængigt af generatoren.

  // Tal-svar ud fra typiske fejl — aldrig et tilfældigt nabotal.
  // Fejl, der kolliderer (ens med facit eller en anden, uden for [min, max]), springes over. Er der for få, bliver
  // der færre valg (testen fanger det).
  function lavValgFejl(svar, fejl, antal, min, max, rng) {
    const gyldige = [];
    for (const f of fejl) if (Number.isInteger(f) && f >= min && f <= max && f !== svar && gyldige.indexOf(f) < 0) gyldige.push(f);
    // Med rng: et tilfældigt udvalg af de typiske fejl og tilfældig rækkefølge. Sorteret ville facit stå samme sted
    // hver gang (fx altid i midten ved n − 1, n, n + 1), og barnet lærer pladsen i stedet for at regne (UI-review D1)
    const ud = [svar].concat(rng ? bland(rng, gyldige).slice(0, antal - 1) : gyldige.slice(0, antal - 1));
    return rng ? bland(rng, ud) : ud.sort((x, y) => x - y);
  }

  // Svarkort (valgArt 'scene'): facit + fejlkort i prioriteret rækkefølge → id'erne a, b, c i tilfældig rækkefølge.
  // Hvert kort: { dele: [...], navn: 'oplæst/aria-navn', fakta: {...} }. To kort med samme fakta kommer aldrig med.
  function lavKort(rng, facit, fejl, antal) {
    const noegle = (k) => JSON.stringify(k.fakta);
    const unik = [];
    for (const k of [facit].concat(fejl)) if (k && !unik.some((u) => noegle(u) === noegle(k))) unik.push(k);
    const valgte = unik.slice(0, antal);
    const blandet = bland(rng, valgte);
    const ids = ['a', 'b', 'c', 'd'];
    const kort = {};
    blandet.forEach((k, i) => { kort[ids[i]] = k; });
    return { kort: kort, valg: ids.slice(0, blandet.length), svar: ids[blandet.indexOf(facit)] };
  }

  const TAL_ORD = ['nul', 'ét', 'to', 'tre', 'fire', 'fem', 'seks', 'syv', 'otte', 'ni', 'ti'];

  // Tegnebyen: en rute på prikgitteret. Retninger med y nedad (som på skærmen): op = y − 1.
  const RETNING = { hoejre: [1, 0], venstre: [-1, 0], op: [0, -1], ned: [0, 1] };
  const RETNING_ORD = { hoejre: 'til højre', venstre: 'til venstre', op: 'op', ned: 'ned' };
  const RETNING_PIL = { hoejre: '➡️', venstre: '⬅️', op: '⬆️', ned: '⬇️' };
  // Opskriften [[retning, antal], …] → alle punkter fra start til slut
  function ruteFraOpskrift(start, opskrift) {
    const ud = [start.slice()];
    let [x, y] = start;
    for (const [r, n] of opskrift) for (let i = 0; i < n; i++) { x += RETNING[r][0]; y += RETNING[r][1]; ud.push([x, y]); }
    return ud;
  }
  // Passer den tegnede vej (punkter fra start) præcis til opskriften? Samme slutpunkt ad en anden vej er ikke nok.
  function rutePasser(start, opskrift, punkter) {
    const maal = ruteFraOpskrift(start, opskrift);
    return Array.isArray(punkter) && punkter.length === maal.length &&
      punkter.every((p, i) => Array.isArray(p) && p[0] === maal[i][0] && p[1] === maal[i][1]);
  }

  // Formbyen: brik-puslespil. En figur er skåret i to; den ene halvdel ligger fast, den anden er et hul.
  // En brik: { form, b, h, … } i et koordinatsystem, hvor kvadratet er 100 × 100. Trekanten har den rette vinkel i
  // hjørnet 'nv', 'no', 'sv' eller 'so'; halvcirklen har den flade side 'op', 'ned', 'venstre' eller 'hoejre'.
  const PUSLESPIL = [];
  (function () {
    const tre = (hj) => ({ form: 'trekant', b: 100, h: 100, hjoerne: hj });
    // Kvadrat skåret over diagonalen: to snit × to halvdele
    [['/', 'nv', 'so'], ['\\', 'no', 'sv']].forEach(([snit, a, b]) => {
      PUSLESPIL.push({ figur: 'kvadrat', b: 100, h: 100, snit: snit, fast: Object.assign(tre(b), { x: 0, y: 0 }), hul: Object.assign(tre(a), { x: 0, y: 0 }) });
      PUSLESPIL.push({ figur: 'kvadrat', b: 100, h: 100, snit: snit, fast: Object.assign(tre(a), { x: 0, y: 0 }), hul: Object.assign(tre(b), { x: 0, y: 0 }) });
    });
    // Liggende rektangel skåret lodret (to kvadrater) og stående skåret vandret
    const kv = (x, y) => ({ form: 'kvadrat', b: 100, h: 100, x: x, y: y });
    PUSLESPIL.push({ figur: 'rektangel', b: 200, h: 100, snit: '|', fast: kv(100, 0), hul: kv(0, 0) });
    PUSLESPIL.push({ figur: 'rektangel', b: 200, h: 100, snit: '|', fast: kv(0, 0), hul: kv(100, 0) });
    PUSLESPIL.push({ figur: 'rektangel', b: 100, h: 200, snit: '-', fast: kv(0, 100), hul: kv(0, 0) });
    PUSLESPIL.push({ figur: 'rektangel', b: 100, h: 200, snit: '-', fast: kv(0, 0), hul: kv(0, 100) });
    // Kvadrat skåret lodret (to stående rektangler) og vandret (to liggende)
    const re = (b, h, x, y) => ({ form: 'rektangel', b: b, h: h, x: x, y: y });
    PUSLESPIL.push({ figur: 'kvadrat', b: 100, h: 100, snit: '|', fast: re(50, 100, 50, 0), hul: re(50, 100, 0, 0) });
    PUSLESPIL.push({ figur: 'kvadrat', b: 100, h: 100, snit: '|', fast: re(50, 100, 0, 0), hul: re(50, 100, 50, 0) });
    PUSLESPIL.push({ figur: 'kvadrat', b: 100, h: 100, snit: '-', fast: re(100, 50, 0, 50), hul: re(100, 50, 0, 0) });
    PUSLESPIL.push({ figur: 'kvadrat', b: 100, h: 100, snit: '-', fast: re(100, 50, 0, 0), hul: re(100, 50, 0, 50) });
    // Cirkel skåret i to halvcirkler
    const hc = (flad, x, y) => ({ form: 'halvcirkel', b: flad === 'op' || flad === 'ned' ? 100 : 50, h: flad === 'op' || flad === 'ned' ? 50 : 100, flad: flad, x: x, y: y });
    PUSLESPIL.push({ figur: 'cirkel', b: 100, h: 100, snit: '|', fast: hc('venstre', 50, 0), hul: hc('hoejre', 0, 0) });
    PUSLESPIL.push({ figur: 'cirkel', b: 100, h: 100, snit: '|', fast: hc('hoejre', 0, 0), hul: hc('venstre', 50, 0) });
    PUSLESPIL.push({ figur: 'cirkel', b: 100, h: 100, snit: '-', fast: hc('op', 0, 50), hul: hc('ned', 0, 0) });
    PUSLESPIL.push({ figur: 'cirkel', b: 100, h: 100, snit: '-', fast: hc('ned', 0, 0), hul: hc('op', 0, 50) });
  })();
  const BRIK_NAVN = { trekant: 'en trekant', kvadrat: 'et kvadrat', rektangel: 'et rektangel', halvcirkel: 'en halvcirkel' };
  const brikUdenSted = (b) => { const k = Object.assign({}, b); delete k.x; delete k.y; return k; };

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

    // ===== Klokketårnet: hel og halv, på niveau 3 også kvart over og kvart i (ekstra) =====
    // Dansk tidssprog: «halv fem» er 4:30, «kvart i fem» er 4:45. Tal skrives som «t:mm» (fx '4:30') — én tekstværdi pr. svar.
    klokkeLaes(niveau, rng) {
      const kvart = niveau >= 3 && rng() < 0.55; // niveau 1 og 2 trækker de samme tal som før
      const halv = !kvart && niveau >= 2 && rng() < 0.6;
      const kvartI = kvart && rng() < 0.5;
      const t = heltal(rng, 1, 12);
      const m = kvart ? (kvartI ? 45 : 15) : halv ? 30 : 0;
      const svar = t + ':' + (m < 10 ? '0' : '') + m;
      const naeste = (t % 12) + 1, forrige = t === 1 ? 12 : t - 1;
      let andre;
      if (kvart) {
        // Typiske fejl i prioriteret rækkefølge: kvart over ↔ kvart i; ved kvart i den nævnte time
        // («kvart i otte» læst som 8:45 — så barnet også skal aflæse timen); viserne byttet om
        // (den store visers tal læst som timer, den lilles nærmeste tal som minutter: 7:15 → 3:07),
        // og som reserve: den nævnte time uden kvarteret / kvarteret læst som halv
        const lilleTal = (Math.round(t + m / 60) + 11) % 12 + 1;
        const byttet = (m / 5) + ':' + (lilleTal < 10 ? '0' : '') + lilleTal;
        const kandidater = kvartI
          ? [t + ':15', naeste + ':45', byttet, naeste + ':00', t + ':30']
          : [t + ':45', byttet, t + ':00', t + ':30', naeste + ':15'];
        andre = kandidater.filter((k, i) => k !== svar && kandidater.indexOf(k) === i).slice(0, antalValg(niveau) - 1);
      } else {
        // Typiske fejl: hel/halv byttet, «halv fem» læst som 5:30, timen før/efter
        andre = halv ? [naeste + ':30', t + ':00', naeste + ':00', forrige + ':30'] : [naeste + ':00', forrige + ':00', t + ':30'];
      }
      return {
        emne: 'maaling', type: 'klokkeLaes', niveau, noegle: 'klokkeLaes:' + svar, ikon: '🕰️',
        tale: 'Hvad er klokken?',
        tekst: 'Hvad er klokken?',
        vis: { art: 'ur', klokke: svar },
        svar: svar,
        valg: lavValgTekst(rng, svar, [svar].concat(andre), antalValg(niveau)),
        valgArt: 'tid',
        // Kvart: trin 1 markerer en kvart omgang og tæller 5, 10, 15 — trin 2 viser svaret og siger det
        hjaelp: [{ art: 'urVisere' }, { art: 'visUr', klokke: svar }],
      };
    },

    // Lyt og find uret («Find klokken halv fem») — svarene er analoge ure. Niveau 3: også kvart over og kvart i
    klokkeFind(niveau, rng) {
      const kvart = niveau >= 3 && rng() < 0.55; // niveau 1 og 2 trækker de samme tal som før
      const halv = !kvart && niveau >= 2 && rng() < 0.6;
      const kvartI = kvart && rng() < 0.5;
      const tNavn = heltal(rng, 1, 12);                                  // timen, man siger
      const t = halv || kvartI ? (tNavn === 1 ? 12 : tNavn - 1) : tNavn; // timen, uret viser
      const m = kvart ? (kvartI ? 45 : 15) : halv ? 30 : 0;
      const svar = t + ':' + (m < 10 ? '0' : '') + m;
      const naeste = (t % 12) + 1, forrige = t === 1 ? 12 : t - 1;
      let andre;
      if (kvart) {
        // Typiske fejl i prioriteret rækkefølge: kvart over ↔ kvart i (kun den store viser er anderledes);
        // ved kvart i den nævnte time («kvart i otte» stillet som 8:45); ved kvart over halv-reglen overført
        // («kvart over syv» stillet som 6:15, ligesom «halv syv» er 6:30) — begge kræver, at barnet ser på
        // den lille viser. Som reserve: den nævnte time hel / kvarteret stillet som halv
        const kandidater = kvartI
          ? [t + ':15', tNavn + ':45', tNavn + ':00', t + ':30']
          : [t + ':45', forrige + ':15', t + ':00', t + ':30'];
        andre = kandidater.filter((k, i) => k !== svar && kandidater.indexOf(k) === i).slice(0, antalValg(niveau) - 1);
      } else {
        andre = halv ? [tNavn + ':30', tNavn + ':00', t + ':00', forrige + ':30'] : [naeste + ':00', forrige + ':00', t + ':30'];
      }
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

    // Stil viserne («Stil uret på kvart i otte») — kun niveau 3. Uret står på forhånd på den hele time,
    // tiden ligger i (7:00 ved «kvart i otte»); barnet vælger, hvor den store viser skal hen.
    // Svar og valg er tider ('7:45'); app.js tegner hvert valg som et mål på urskiven ud fra minuttallet
    // (0 → 12, 15 → 3, 30 → 6, 45 → 9), og den lille viser følger mekanisk med.
    klokkeStil(niveau, rng) {
      const art = vaelg(rng, ['over', 'i', 'halv']);
      const t = heltal(rng, 1, 12);                           // timen, uret står i
      const naeste = (t % 12) + 1;
      const m = art === 'over' ? 15 : art === 'i' ? 45 : 30;
      const svar = t + ':' + m;
      const hel = (art === 'over' ? t : naeste) + ':00';      // den hele time, der nævnes («otte» → 8:00)
      // Typiske fejl (ingen tilfældige mål): kvart over ↔ kvart i, og den nævnte hele time (12-målet).
      // Ved halv: kvart i (9-målet) — «halv otte» og «kvart i otte» ligger begge før otte og blandes sammen
      const fejl = art === 'over' ? t + ':45' : t + ':' + (art === 'i' ? 15 : 45);
      const minut = (k) => Number(k.split(':')[1]);
      return {
        emne: 'maaling', type: 'klokkeStil', niveau, noegle: 'klokkeStil:' + svar, ikon: '🕰️',
        tale: 'Stil uret på ' + klokkeNavn(svar) + '.',
        tekst: 'Stil uret',
        vis: { art: 'lyt', start: t + ':00' },
        svar: svar,
        valg: [svar, fejl, hel].sort((a, b) => minut(a) - minut(b)), // med uret: 12, 3, 6, 9 (tasterne 3, 6, 9 og 1/0 for 12, og Tab)
        valgArt: 'stil',
        // Trin 1: den nævnte hele time. Trin 2: et kvarter (ved halv: en halv time) derfra til facit —
        // den lille viser er ikke nået til otte endnu. Bagefter viser spillet facit og siger det (visSvaret)
        hjaelp: [{ art: 'stilHel', klokke: hel }, { art: 'stilFlyt', klokke: svar }],
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

    // =====================================================================
    //  D1 · trin 1 (forslaget 09-10). Fejlsvarene bygger på de typiske fejl, som forslaget nævner.
    // =====================================================================

    // Tælleskoven: tingene flytter sig — er der stadig lige mange? (antallet ændrer sig ikke)
    flytTing(niveau, rng, tingListe) {
      const { ting } = vaelgTing(rng, tingListe);
      const n = heltal(rng, 3, 9); // n + 1 (fejlsvaret) må højst være 10
      return {
        emne: 'taelle', type: 'flytTing', niveau, noegle: 'flytTing:' + n, ikon: '🔀',
        tale: 'Der var ' + antalOrd(n, ting) + '. De flytter sig. Hvor mange er der nu?',
        tekst: 'Hvor mange nu?',
        vis: { art: 'scene', fakta: { foer: n, nu: n }, dele: [
          { t: 'gruppe', id: 'foer', navn: 'Før', dele: [{ t: 'ting', e: ting.e, n: n, taelbar: false }] },
          { t: 'tegn', s: '→' },
          { t: 'gruppe', id: 'nu', navn: 'Nu', dele: [{ t: 'ting', e: ting.e, n: n, spredt: true }] },
        ] },
        svar: n,
        // Mere plads ser ud som flere (n + 1) · én bliver overset (n − 1)
        valg: lavValgFejl(n, [n + 1, n - 1], antalValg(niveau), 1, 10, rng), valgBlandet: true,
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Se. Ingen kom til, og ingen gik væk.', lys: ['foer', 'nu'] }] }, { art: 'tael' }],
      };
    },

    // Formbyen: hvilken brik passer i hullet? (kongruens — samme form, størrelse og retning)
    brikPuslespil(niveau, rng) {
      const p = vaelg(rng, PUSLESPIL);
      const hul = brikUdenSted(p.hul);
      const kortAf = (b) => ({ dele: [Object.assign({ t: 'brik' }, b)], navn: BRIK_NAVN[b.form], fakta: b });
      // Fejlbrikker, der næsten passer: følger én kant eller fylder hullets kasse, men har en anden form
      const fejl = {
        trekant: [{ form: 'rektangel', b: hul.b, h: hul.h / 2 }, { form: 'halvcirkel', b: hul.b, h: hul.h / 2, flad: 'ned' }],
        kvadrat: [{ form: 'trekant', b: hul.b, h: hul.h, hjoerne: 'sv' }, { form: 'rektangel', b: hul.b, h: hul.h / 2 }],
        rektangel: [{ form: 'kvadrat', b: Math.min(hul.b, hul.h), h: Math.min(hul.b, hul.h) }, { form: 'trekant', b: hul.b, h: hul.h, hjoerne: 'sv' }],
        halvcirkel: [{ form: 'rektangel', b: hul.b, h: hul.h }, { form: 'trekant', b: hul.b, h: hul.h, hjoerne: hul.flad === 'op' ? 'nv' : 'sv' }],
      }[hul.form];
      const k = lavKort(rng, kortAf(hul), fejl.map(kortAf), antalValg(niveau));
      const beskriv = { trekant: 'Hullet har tre hjørner.', kvadrat: 'Hullet har fire lige lange sider.', rektangel: 'Hullet er en aflang firkant.', halvcirkel: 'Hullet er rundt på den ene side.' }[hul.form];
      return {
        emne: 'former', type: 'brikPuslespil', niveau, noegle: 'brikPuslespil:' + p.figur + p.snit + p.hul.x + ',' + p.hul.y + (p.hul.hjoerne || p.hul.flad || ''), ikon: '🧩',
        tale: 'Hvilken brik passer i hullet?',
        tekst: 'Hvilken brik passer?',
        vis: { art: 'scene', fakta: { figur: p.figur, snit: p.snit, hul: p.hul }, dele: [{ t: 'puslespil', id: 'puslespil', figur: p.figur, b: p.b, h: p.h, fast: p.fast, hul: p.hul }] },
        svar: k.svar, valg: k.valg, kort: k.kort, valgArt: 'scene',
        hjaelp: [{ art: 'lys', trin: [{ tale: beskriv, lys: ['hul'] }] }],
      };
    },

    // Tegnebyen: gå efter en opskrift på prikgitteret («to til højre, så ét op») og tegn vejen
    tegnRute(niveau, rng) {
      const kol = SOEMBRAET.kol, raek = SOEMBRAET.raek;
      let opskrift, start, punkter;
      for (let forsoeg = 0; forsoeg < 200; forsoeg++) {
        if (niveau <= 1) {
          // To ben: højre og op i en af de to rækkefølger, 1–2 skridt hver
          const ben = [['hoejre', heltal(rng, 1, 2)], ['op', heltal(rng, 1, 2)]];
          opskrift = rng() < 0.5 ? ben : [ben[1], ben[0]];
        } else {
          // Tre ben i forskellige retninger, aldrig lige tilbage
          opskrift = [];
          let forrige = null;
          for (let i = 0; i < 3; i++) {
            const mulige = Object.keys(RETNING).filter((r) => r !== forrige && !(forrige && RETNING[r][0] === -RETNING[forrige][0] && RETNING[r][1] === -RETNING[forrige][1]));
            const r = vaelg(rng, mulige);
            opskrift.push([r, heltal(rng, 1, 2)]);
            forrige = r;
          }
        }
        start = [heltal(rng, 0, kol - 1), heltal(rng, 0, raek - 1)];
        punkter = ruteFraOpskrift(start, opskrift);
        const inde = punkter.every(([x, y]) => x >= 0 && y >= 0 && x < kol && y < raek);
        const unikke = new Set(punkter.map((q) => q.join(','))).size === punkter.length;
        if (inde && unikke) break;
      }
      const tale = opskrift.map(([r, n], i) => (i === 0 ? 'Gå ' : 'Gå så ') + TAL_ORD[n] + ' ' + (n === 1 ? 'felt' : 'felter') + ' ' + RETNING_ORD[r] + '.').join(' ');
      return {
        emne: 'tegne', type: 'tegnRute', niveau, noegle: 'tegnRute:' + opskrift.map(([r, n]) => r[0] + n).join(''), ikon: '🧭',
        tale: tale + ' Tegn vejen.',
        tekst: 'Tegn vejen',
        vis: { art: 'rute', kol: kol, raek: raek, start: start, opskrift: opskrift, pile: opskrift.map(([r, n]) => ({ pil: RETNING_PIL[r], antal: n })), fakta: { slut: punkter[punkter.length - 1] } },
        svar: 'ok', interaktiv: 'rute',
        // Trin 1: det første ben lyser · trin 2: hele vejen stiplet · bagefter følger barnet den nummererede vej
        hjaelp: [{ art: 'rute', ben: 1 }, { art: 'rute', ben: opskrift.length }],
      };
    },

    // Plusbjerget: tre leverancer i træk (først 1, så 2, så 3) — hvor mange i kassen?
    treKurve(niveau, rng, tingListe) {
      const { ting } = vaelgTing(rng, tingListe);
      const maxSum = niveau >= 2 ? 10 : 5;
      let a, b, c;
      do { a = heltal(rng, 1, 3); b = heltal(rng, 1, 3); c = heltal(rng, 1, 4); } while (a + b + c > maxSum || (niveau >= 2 && a + b + c < 6));
      const sum = a + b + c;
      const kurv = (id, n) => ({ t: 'gruppe', id: id, ramme: 'kurv', dele: [{ t: 'ting', e: ting.e, n: n }] });
      return {
        emne: 'plus10', type: 'treKurve', niveau, noegle: 'treKurve:' + a + '+' + b + '+' + c, ikon: '🧺',
        tale: 'Først kommer ' + antalOrd(a, ting) + ', så ' + b + ' og så ' + c + '. Hvor mange er der i kassen?',
        tekst: a + ' + ' + b + ' + ' + c,
        vis: { art: 'scene', fakta: { a: a, b: b, c: c }, dele: [kurv('a', a), { t: 'tegn', s: '+' }, kurv('b', b), { t: 'tegn', s: '+' }, kurv('c', c), { t: 'tegn', s: '→' }, { t: 'gruppe', id: 'kasse', ramme: 'kasse', dele: [{ t: 'tal', s: '?' }] }] },
        svar: sum,
        // Den første leverance glemt (b + c) · kun den sidste (c)
        valg: lavValgFejl(sum, [b + c, c], antalValg(niveau), 0, maxSum, rng), valgBlandet: true,
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Først ' + a + '.', lys: ['a'] }, { tale: 'Så ' + b + '.', lys: ['b'] }, { tale: 'Og så ' + c + '.', lys: ['c'] }] }, { art: 'tael' }],
      };
    },

    // Venneøen: ret vennerne — venstre side er låst; hvor mange skal der være til højre, så huset er fuldt?
    retVenner(niveau, rng) {
      const hel = niveau >= 2 ? 10 : 5;
      let a, w;
      // Forkert højre side: huset har tomme pladser. De to typiske fejl skal være forskellige fra facit og hinanden
      do { a = heltal(rng, 1, hel - 2); w = heltal(rng, 1, hel - a - 1); } while (niveau >= 2 && (a + w === hel - a || hel - a - w === a + w));
      const svar = hel - a;
      return {
        emne: 'venner', type: 'retVenner', niveau, noegle: 'retVenner:' + a + '+' + w + '/' + hel, ikon: '🏠',
        tale: 'Der skal bo ' + hel + ' her. ' + (a === 1 ? 'Den ene' : 'De ' + a) + ' til venstre bliver. Hvor mange skal der være til højre?',
        tekst: a + ' + ? = ' + hel,
        vis: { art: 'scene', fakta: { hel: hel, venstre: a, hoejre: w }, dele: [
          { t: 'pladser', id: 'hus', n: hel, fyldt: [{ id: 'venstre', fra: 0, til: a, e: '🔵' }, { id: 'hoejre', fra: a, til: a + w, e: '🟠' }], taelbarFra: a },
          { t: 'gruppe', ramme: 'ingen', dele: [{ t: 'tal', s: String(a), id: 'kort-venstre', laast: true }, { t: 'tegn', s: '+' }, { t: 'tal', s: String(w), id: 'kort-hoejre', ret: true }] },
        ] },
        svar: svar,
        // Antallet af tomme pladser i stedet for hele højre side · den nuværende total
        valg: lavValgFejl(svar, [hel - a - w, a + w], antalValg(niveau), 0, hel, rng), valgBlandet: true,
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Huset har ' + hel + ' pladser.', lys: ['hus'] }] },
          { art: 'lys', trin: [{ tale: (a === 1 ? 'Den ene' : 'De ' + a) + ' til venstre bliver. Tæl de andre pladser.', lys: ['venstre'], tael: 'hus' }] }],
      };
    },

    // Minussøen: før og nu — hvor mange svømmede væk?
    hvorMangeVaek(niveau, rng) {
      const max = niveau >= 2 ? 10 : 5;
      let f, e;
      // Ikke f = 2e: så er «dem, der er tilbage» det samme som facit, og den mest typiske fejl forsvinder
      do { f = heltal(rng, 3, max); e = heltal(rng, 1, f - 1); } while (f === 2 * e);
      const svar = f - e;
      return {
        emne: 'minus', type: 'hvorMangeVaek', niveau, noegle: 'hvorMangeVaek:' + f + '-' + e, ikon: '🦆',
        tale: 'Før var der ' + f + ' ænder. Nu er der ' + (e === 1 ? 'én' : e) + '. Hvor mange svømmede væk?',
        tekst: f + ' − ? = ' + e,
        vis: { art: 'scene', fakta: { foer: f, nu: e }, dele: [
          { t: 'gruppe', id: 'foer', navn: 'Før', dele: [{ t: 'ting', e: '🦆', n: f, under: [{ id: 'foer-par', fra: 0, til: e, taelbar: false }, { id: 'foer-vaek', fra: e, til: f, taelbar: true }] }] },
          { t: 'tegn', s: '→' },
          { t: 'gruppe', id: 'nu', navn: 'Nu', dele: [{ t: 'ting', e: '🦆', n: e, taelbar: false }] },
        ] },
        svar: svar,
        // Svarer med dem, der er tilbage (e) · lægger før og nu sammen · svarer med før
        valg: lavValgFejl(svar, [e, f + e, f], antalValg(niveau), 0, max, rng), valgBlandet: true,
        hjaelp: [{ art: 'lys', trin: [{ tale: (e === 1 ? 'Den ene' : 'De ' + e) + ' er her stadig.', lys: ['nu', 'foer-par'] }] },
          { art: 'lys', trin: [{ tale: 'Tæl dem, der svømmede væk.', tael: 'foer' }] }],
      };
    },

    // Klodsbyen: byt ti små klodser til én tierstang — samme mængde, ny måde at se den på
    byt10(niveau, rng) {
      const kortAf = (tiere, enere) => ({ dele: [{ t: 'staenger', tiere: tiere, enere: enere }], navn: tiere + (tiere === 1 ? ' tier' : ' tiere') + ' og ' + enere + (enere === 1 ? ' ener' : ' enere'), fakta: { tiere: tiere, enere: enere } });
      let T, k, fejl;
      do {
        T = heltal(rng, 0, 3);
        k = heltal(rng, 1, 9);
        fejl = [kortAf(T, k)];                                                // glemmer den nye tierstang
        if (k * 10 + T + 1 <= 50 && k !== T + 1) fejl.push(kortAf(k, T + 1)); // bytter tiere og enere om
        if ((T + 2) * 10 + k <= 50) fejl.push(kortAf(T + 2, k));               // tæller en tier for meget
        if (k + 1 <= 9) fejl.push(kortAf(T + 1, k + 1));                       // tæller en ener for meget
      } while (fejl.length < 2); // tre kort på niveau 2 og 3
      const kort = lavKort(rng, kortAf(T + 1, k), fejl, antalValg(niveau));
      return {
        emne: 'tiere', type: 'byt10', niveau, noegle: 'byt10:' + T + '+' + (10 + k), ikon: '🔁',
        tale: 'Byt ti små klodser til én tierstang. Hvordan ser det ud bagefter?',
        tekst: 'Byt ti til én tier',
        vis: { art: 'scene', fakta: { tiere: T, enere: 10 + k }, dele: [{ t: 'staenger', id: 'start', tiere: T, enere: 10 + k, rammeOmTi: true }] },
        svar: kort.svar, valg: kort.valg, kort: kort.kort, valgArt: 'scene',
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Ti små klodser er lige så lange som én tierstang.', lys: ['ti'] }] },
          // Tierstængerne lyser kun i opgaven (review #2) — er der ingen endnu, lyser kun de små klodser, der er tilbage
          { art: 'lys', trin: [{ tale: 'Så kommer der én tierstang mere, og ' + (k === 1 ? 'én lille klods' : k + ' små klodser') + ' er tilbage.', lys: T > 0 ? ['tiere', 'rest'] : ['rest'] }] }],
      };
    },

    // Tierbroen: næsten dobbelt — 6 og 6 er 12, så er 6 og 7 én mere
    naestenDobbelt(niveau, rng, tingListe) {
      const { ting } = vaelgTing(rng, tingListe);
      const a = heltal(rng, niveau >= 2 ? 5 : 2, niveau >= 2 ? 9 : 6);
      const stoerstFoerst = rng() < 0.5;
      const x = stoerstFoerst ? a + 1 : a, y = stoerstFoerst ? a : a + 1;
      const svar = 2 * a + 1;
      const raekke = (id, n) => ({ t: 'ting', id: id, e: ting.e, n: n, linje: true, under: n > a ? [{ id: 'ekstra', fra: a, til: a + 1 }] : [] });
      return {
        emne: 'tierbro', type: 'naestenDobbelt', niveau, noegle: 'naestenDobbelt:' + x + '+' + y, ikon: '👯',
        tale: a + ' og ' + a + ' er ' + 2 * a + '. Her er ' + x + ' og ' + y + '. Hvor mange er der tilsammen?',
        tekst: x + ' + ' + y,
        vis: { art: 'scene', lag: 'stak', fakta: { a: x, b: y }, dele: [raekke('r1', x), raekke('r2', y)] },
        svar: svar,
        // Glemmer den ekstra (dobbelt af det mindste) · fordobler det største
        valg: lavValgFejl(svar, [2 * a, 2 * a + 2], antalValg(niveau), 0, 20, rng), valgBlandet: true,
        hjaelp: [{ art: 'lys', trin: [{ tale: a + ' par. Og så én ekstra.', lys: ['ekstra'] }] }, tallinje(2 * a, 1)],
      };
    },

    // Mønsterslottet: hvilken lille pakke gentages fra pilen?
    gentagPakke(niveau, rng) {
      const t = vaelg(rng, niveau >= 2 ? ['AB', 'ABB', 'AAB', 'ABC'] : ['AB', 'ABB', 'AAB']);
      const brikker = bland(rng, Object.keys(MOENSTER_BRIKKER)).slice(0, 3);
      const enhed = t.split('').map((c) => brikker['ABC'.indexOf(c)]);
      const frise = [].concat(enhed, enhed, enhed);
      const roter = (l, k) => l.slice(k).concat(l.slice(0, k));
      const kortAf = (celler) => ({ dele: [{ t: 'raekke', celler: celler }], navn: celler.map((c) => MOENSTER_BRIKKER[c].navn).join(', '), fakta: { celler: celler } });
      // Starter et forkert sted (pakken roteret) · udelader en brik · tager en brik for meget
      const fejl = [kortAf(roter(enhed, 1)), kortAf(enhed.slice(0, -1)), kortAf(enhed.concat([enhed[0]])), kortAf(roter(enhed, 2))];
      const kort = lavKort(rng, kortAf(enhed), fejl.filter((k) => k.fakta.celler.length >= 2), antalValg(niveau));
      return {
        emne: 'moenstre', type: 'gentagPakke', niveau, noegle: 'gentagPakke:' + t + ':' + enhed.join(''), ikon: '📦',
        tale: 'Hvilken lille pakke gentages fra pilen?',
        tekst: 'Hvad gentages?',
        vis: { art: 'scene', fakta: { enhed: enhed, gange: 3 }, dele: [{ t: 'raekke', id: 'frise', celler: frise, pil: true, pakke: enhed.length }] },
        svar: kort.svar, valg: kort.valg, kort: kort.kort, valgArt: 'scene',
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Se på de første ' + enhed.length + '.', lys: ['g0'] }, { tale: 'Så kommer de samme igen.', lys: ['g1'] }] }],
      };
    },

    // Klokketorvet: betal præcis — der ligger én mønt; vælg én mønt mere
    betalPrecis(niveau, rng) {
      const forste = niveau >= 2 ? [5, 10] : [1, 2, 5];
      const andre = niveau >= 2 ? [1, 2, 5, 10] : [1, 2, 5];
      const max = niveau >= 2 ? 20 : 10;
      let c1, c2;
      do { c1 = vaelg(rng, forste); c2 = vaelg(rng, andre); } while (c1 + c2 > max);
      const pris = c1 + c2;
      const vare = vaelg(rng, VARER);
      const kortAf = (kr) => ({ dele: [{ t: 'moent', kr: kr }], navn: kr + (kr === 1 ? ' krone' : ' kroner'), fakta: { kr: kr } });
      // En for lille mønt (kommer ikke op til prisen) og en for stor (betaler for meget) — de nærmeste først
      const mindre = andre.filter((m) => m < c2).reverse(), stoerre = andre.filter((m) => m > c2);
      const fejl = [];
      for (let i = 0; i < 3; i++) { if (mindre[i] !== undefined) fejl.push(kortAf(mindre[i])); if (stoerre[i] !== undefined) fejl.push(kortAf(stoerre[i])); }
      const kort = lavKort(rng, kortAf(c2), fejl, antalValg(niveau));
      return {
        emne: 'maaling', type: 'betalPrecis', niveau, noegle: 'betalPrecis:' + c1 + '+' + c2, ikon: '🪙',
        tale: vare.navn + ' koster ' + pris + ' kroner. Du har lagt ' + c1 + (c1 === 1 ? ' krone' : ' kroner') + '. Vælg én mønt mere, så du betaler præcis.',
        tekst: pris + ' kr',
        vis: { art: 'scene', fakta: { pris: pris, lagt: c1 }, dele: [
          { t: 'vare', id: 'vare', e: vare.e, pris: pris },
          { t: 'gruppe', id: 'maatte', ramme: 'maatte', dele: [{ t: 'moenter', liste: [c1] }, { t: 'tegn', s: '+' }, { t: 'tal', s: '?' }] },
        ] },
        svar: kort.svar, valg: kort.valg, kort: kort.kort, valgArt: 'scene',
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Du har lagt ' + c1 + '. Det skal blive ' + pris + '.', lys: ['maatte', 'vare'] }] }, tallinje(c1, c2)],
      };
    },

    // Klokketorvet: digitalt → analogt. Det digitale ur viser tiden; find uret med visere, der viser det samme
    urDigital(niveau, rng) {
      const kvart = niveau >= 3 && rng() < 0.5;
      const halv = !kvart && niveau >= 2 && rng() < 0.6;
      const kvartI = kvart && rng() < 0.5;
      const t = heltal(rng, 1, 12);
      const m = kvart ? (kvartI ? 45 : 15) : halv ? 30 : 0;
      const svar = t + ':' + (m < 10 ? '0' : '') + m;
      const naeste = (t % 12) + 1, forrige = t === 1 ? 12 : t - 1;
      // Typiske fejl: den lille viser ved den næste time (halv/kvart i læst som «snart»), store viser forkert kvarter
      // eller hel time, og timen før
      const kandidater = m === 0 ? [naeste + ':00', t + ':30', forrige + ':00']
        : m === 30 ? [naeste + ':30', t + ':00', forrige + ':30']
          : m === 15 ? [t + ':45', t + ':00', naeste + ':15']
            : [t + ':15', naeste + ':45', t + ':30'];
      return {
        emne: 'maaling', type: 'urDigital', niveau, noegle: 'urDigital:' + svar, ikon: '⌚',
        tale: 'Find uret med visere, der viser det samme.',
        tekst: 'Find det samme',
        vis: { art: 'scene', fakta: { klokke: svar }, dele: [{ t: 'digital', id: 'digital', klokke: svar }] },
        svar: svar,
        valg: lavValgTekst(rng, svar, [svar].concat(kandidater.slice(0, antalValg(niveau) - 1)), antalValg(niveau)),
        valgArt: 'ur',
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Der står ' + klokkeNavn(svar) + '.', lys: ['digital'] }] }, { art: 'visUr', klokke: svar }],
      };
    },

    // Klokketorvet: 5-minutter (Jimmys ønske 08-10). Tæl 5, 10, 15 … på den store viser
    klokke5(niveau, rng) {
      const t = heltal(rng, 1, 12);
      const m = vaelg(rng, [5, 10, 20, 25, 35, 40, 50, 55]);
      const pad = (x) => (x < 10 ? '0' : '') + x;
      const svar = t + ':' + pad(m);
      const naeste = (t % 12) + 1;
      // Læser tallet, den store viser peger på, som minutter (7:25 → 7:05) · efter halv: den næste time, fordi
      // den lille viser er tæt på den (7:40 → 8:40) · før halv: spejlet om 6 (7:20 → 7:40)
      const fejl = [t + ':' + pad(m / 5), m > 30 ? naeste + ':' + pad(m) : t + ':' + pad(60 - m)];
      return {
        emne: 'maaling', type: 'klokke5', niveau, noegle: 'klokke5:' + svar, ikon: '🕰️',
        tale: 'Hvad er klokken? Tæl fem ad gangen på den store viser.',
        tekst: 'Hvad er klokken?',
        vis: { art: 'ur', klokke: svar },
        svar: svar,
        valg: lavValgTekst(rng, svar, [svar].concat(fejl.slice(0, antalValg(niveau) - 1)), antalValg(niveau)),
        valgArt: 'tid',
        hjaelp: [{ art: 'urFem', klokke: svar }, { art: 'visUr', klokke: svar }],
      };
    },

    // Lystårnet (tæller i Formbyen): to krav på én gang — den rigtige kurv med det rigtige antal bær
    formOgAntal(niveau, rng) {
      const former = ['trekant', 'cirkel', 'firkant'];
      const form = vaelg(rng, former);
      const n = heltal(rng, 2, niveau >= 2 ? 6 : 5);
      const andenForm = vaelg(rng, former.filter((f) => f !== form));
      const andetAntal = vaelg(rng, [n - 1, n + 1].filter((x) => x >= 1 && x <= 6));
      const kortAf = (f, k) => ({ dele: [{ t: 'form', id: 'f-' + f, form: f, farve: 1 }, { t: 'ting', e: '🍓', n: k }], navn: FORMER[f].ubestemt + ' med ' + k + ' bær', fakta: { form: f, antal: k } });
      // Kun antallet passer · kun formen passer
      const kort = lavKort(rng, kortAf(form, n), [kortAf(andenForm, n), kortAf(form, andetAntal)], antalValg(niveau));
      return {
        emne: 'former', type: 'formOgAntal', niveau, noegle: 'formOgAntal:' + form + n, ikon: '🍓',
        tale: 'Vælg ' + FORMER[form].bestemt + ' med ' + n + ' bær.',
        tekst: 'Find formen med bærrene',
        vis: { art: 'scene', fakta: { form: form, antal: n }, dele: [{ t: 'form', form: form, farve: 1, id: 'maal-form' }, { t: 'tal', s: String(n) }, { t: 'ting', e: '🍓', n: 1, taelbar: false }] },
        svar: kort.svar, valg: kort.valg, kort: kort.kort, valgArt: 'scene',
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Find ' + FORMER[form].flertal + '.', lys: ['f-' + form] }, { tale: 'Tæl bærrene.' }] }],
      };
    },

    // =====================================================================
    //  D2 · trin 2 (forslaget 09-10): en ny sammenhæng
    // =====================================================================

    // Tælleskoven: hver skål får ét bær — hvor mange bær er tilbage?
    fordelBaer(niveau, rng) {
      const max = niveau >= 3 ? 20 : 10;
      let b, s;
      // Resten må ikke være lig antallet af skåle (så forsvinder fejlen «tæller skålene»)
      do { b = heltal(rng, 4, max - 2); s = heltal(rng, 2, Math.min(6, b - 1)); } while (b + s > max || b - s === s);
      const rest = b - s;
      return {
        emne: 'taelle', type: 'fordelBaer', niveau, noegle: 'fordelBaer:' + b + '-' + s, ikon: '🥣',
        tale: 'Der er ' + b + ' jordbær. Hver af de ' + s + ' skåle får ét. Hvor mange jordbær bliver tilbage?',
        tekst: 'Hvor mange er tilbage?',
        vis: { art: 'scene', lag: 'stak', fakta: { baer: b, skaale: s }, dele: [
          { t: 'ting', id: 'baer', e: '🍓', n: b, under: [{ id: 'parret', fra: 0, til: s, taelbar: false }, { id: 'rest', fra: s, til: b, taelbar: true }] },
          { t: 'ting', id: 'skaale', e: '🥣', n: s, linje: true, taelbar: false },
        ] },
        svar: rest,
        // Tæller skålene · lægger bær og skåle sammen
        valg: lavValgFejl(rest, [s, b + s], antalValg(niveau), 0, max, rng), valgBlandet: true,
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Hver skål får ét jordbær.', lys: ['parret', 'skaale'] }] },
          { art: 'lys', trin: [{ tale: 'Tæl dem, der er tilbage.', tael: 'baer' }] }],
      };
    },

    // Formbyen: spejlbilledet — hvad ser man på den anden side af spejlet?
    spejlBillede(niveau, rng) {
      const e = vaelg(rng, SPEJL_MOTIVER);
      const kortAf = (vend) => ({ dele: [{ t: 'motiv', e: e, vend: vend }], navn: { spejl: 'spejlet', ingen: 'som det er', drej: 'på hovedet' }[vend], fakta: { vend: vend } });
      // Kopierer uden at spejle · drejer i stedet for at spejle
      const kort = lavKort(rng, kortAf('spejl'), [kortAf('ingen'), kortAf('drej')], antalValg(niveau));
      return {
        emne: 'former', type: 'spejlBillede', niveau, noegle: 'spejlBillede:' + e, ikon: '🪞',
        tale: 'Her er et spejl. Hvilket billede passer på den anden side?',
        tekst: 'Hvad ser man i spejlet?',
        vis: { art: 'scene', fakta: { motiv: e }, dele: [{ t: 'spejl', id: 'spejl', e: e }] },
        svar: kort.svar, valg: kort.valg, kort: kort.kort, valgArt: 'scene',
        hjaelp: [{ art: 'lys', trin: [{ tale: 'I et spejl kigger den den anden vej. Men den står ikke på hovedet.', lys: ['spejl'] }] }],
      };
    },

    // Tegnebyen: hvilken lineal ligger klar til at måle stregen? (nul ved starten, langs stregen)
    linealNul(niveau, rng) {
      const cm = heltal(rng, 2, niveau >= 3 ? 8 : 6);
      const kortAf = (start, skraa) => ({ dele: [{ t: 'linealPlacering', cm: cm, start: start, skraa: skraa }], navn: skraa ? 'linealen ligger skråt' : start === 0 ? 'nul ved starten' : 'et ved starten', fakta: { start: start, skraa: skraa } });
      // Starter ved 1 (målingen bliver én for stor) · linealen ligger skråt
      const kort = lavKort(rng, kortAf(0, false), [kortAf(1, false), kortAf(0, true)], antalValg(niveau));
      return {
        emne: 'tegne', type: 'linealNul', niveau, noegle: 'linealNul:' + cm, ikon: '📏',
        tale: 'Hvilken lineal ligger klar til at måle stregen?',
        tekst: 'Hvilken lineal er klar?',
        vis: { art: 'scene', fakta: { cm: cm }, dele: [{ t: 'streg', id: 'streg', cm: cm }] },
        svar: kort.svar, valg: kort.valg, kort: kort.kort, valgArt: 'scene',
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Nul skal stå ved starten af stregen.', lys: ['streg', 'nul'] }, { tale: 'Og linealen skal ligge langs stregen.' }] }],
      };
    },

    // Plusbjerget: samme antal, delt på en anden måde (3 + 4 og 2 + 5 er begge 7)
    sammeSum(niveau, rng) {
      const kortAf = (x, y) => ({ dele: [{ t: 'klodser', a: x, b: y }], navn: x + ' og ' + y, fakta: { a: x, b: y } });
      let a, b, c, d, sum, fejl;
      do {
        sum = heltal(rng, 5, 10);
        a = heltal(rng, 1, sum - 1); b = sum - a;
        c = heltal(rng, 1, sum - 1); d = sum - c;
        const stor = Math.max(a, b);
        // Én del næsten ens, men én for lidt · tæller den største del to gange · én for meget
        fejl = [kortAf(c, d - 1), kortAf(stor, stor), kortAf(c, d + 1)].filter((k) => k.fakta.a + k.fakta.b !== sum && k.fakta.b >= 1 && k.fakta.a + k.fakta.b <= 10);
      } while (c === a || c === b || a === b || fejl.length < 2);
      const kort = lavKort(rng, kortAf(c, d), fejl, antalValg(niveau));
      return {
        emne: 'plus10', type: 'sammeSum', niveau, noegle: 'sammeSum:' + a + '+' + b + '=' + c + '+' + d, ikon: '⚖️',
        tale: 'Hvilken måtte har lige så mange klodser som den øverste, men delt på en anden måde?',
        tekst: a + ' + ' + b,
        vis: { art: 'scene', fakta: { a: a, b: b }, dele: [{ t: 'klodser', id: 'top', a: a, b: b }] },
        svar: kort.svar, valg: kort.valg, kort: kort.kort, valgArt: 'scene',
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Tæl klodserne øverst.', tael: 'top' }, { tale: 'Find en måtte med ' + sum + ' i alt.' }] }],
      };
    },

    // Venneøen: én (eller to) flytter fra venstre til højre — de ti er stadig ti, men delt anderledes
    flytVen(niveau, rng) {
      const k = niveau >= 3 ? heltal(rng, 1, 2) : 1;
      const L = heltal(rng, k + 1, 9 - k);
      const R = 10 - L;
      const kortAf = (x, y) => ({ dele: [{ t: 'tal', s: x + ' + ' + y }], navn: x + ' og ' + y, fakta: { v: x, h: y } });
      // Flytter den modsatte vej · lægger til højre uden at tage fra venstre
      const kort = lavKort(rng, kortAf(L - k, R + k), [kortAf(L + k, R - k), kortAf(L, R + k)], antalValg(niveau));
      return {
        emne: 'venner', type: 'flytVen', niveau, noegle: 'flytVen:' + L + '+' + R + '>' + k, ikon: '➡️',
        tale: 'Vi flytter ' + (k === 1 ? 'én' : 'to') + ' fra venstre til højre. Hvordan er de ti nu delt?',
        tekst: L + ' + ' + R,
        vis: { art: 'scene', fakta: { venstre: L, hoejre: R, flyt: k }, dele: [
          { t: 'gruppe', id: 'venstre', ramme: 'boks', dele: [{ t: 'ting', e: '🔵', n: L, under: [{ id: 'flyt', fra: L - k, til: L, maerk: true }] }] },
          { t: 'tegn', s: '→' },
          { t: 'gruppe', id: 'hoejre', ramme: 'boks', dele: [{ t: 'ting', e: '🔵', n: R }] },
        ] },
        svar: kort.svar, valg: kort.valg, kort: kort.kort, valgArt: 'scene',
        hjaelp: [{ art: 'lys', trin: [{ tale: (k === 1 ? 'Den her flytter' : 'De her to flytter') + ' over til højre.', lys: ['flyt'] }, { tale: 'Til venstre bliver der ' + (k === 1 ? 'én' : 'to') + ' færre. Til højre bliver der ' + (k === 1 ? 'én' : 'to') + ' flere.' }] }],
      };
    },

    // Minussøen: begge tårne mister lige mange — forskellen er den samme
    sammeForskel(niveau, rng) {
      const k = heltal(rng, 1, 2);
      let a, b;
      do { b = heltal(rng, k + 1, 8); a = heltal(rng, b + 1, 10); } while (a - b <= k); // ellers forsvinder fejlen «d − k»
      const d = a - b;
      return {
        emne: 'minus', type: 'sammeForskel', niveau, noegle: 'sammeForskel:' + a + '-' + b + '-' + k, ikon: '🏰',
        tale: 'Begge tårne mister ' + k + (k === 1 ? ' klods' : ' klodser') + '. Hvor mange klodser er det høje tårn nu højere?',
        tekst: (a - k) + ' − ' + (b - k),
        vis: { art: 'scene', fakta: { a: a, b: b, vaek: k }, dele: [{ t: 'taarne', id: 'taarne', a: a, b: b, vaek: k }] },
        svar: d,
        // Trækker det fjernede fra forskellen · lægger det til
        valg: lavValgFejl(d, [d - k, d + k], antalValg(niveau), 0, 10, rng), valgBlandet: true,
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Tag ' + k + ' væk fra begge tårne.', lys: ['vaek'] }] },
          { art: 'lys', trin: [{ tale: 'Tæl de klodser, der ikke har en makker.', tael: 'taarne' }] }],
      };
    },

    // Klodsbyen: hvilken port hører tallet til (30–39)?
    talIInterval(niveau, rng) {
      const kortAf = (fra) => ({ dele: [{ t: 'tal', s: fra + '–' + (fra + 9) }], navn: 'fra ' + fra + ' til ' + (fra + 9), fakta: { fra: fra } });
      let T, e, fejl;
      do {
        T = heltal(rng, 2, 4); e = heltal(rng, 1, 9);
        // Bruger enerens ciffer som tier (32 → 20–29) · runder op uden at kontrollere (40–49) · porten før
        fejl = [e <= 4 ? e * 10 : null, T + 1 <= 4 ? (T + 1) * 10 : null, (T - 1) * 10].filter((f, i, l) => f !== null && f >= 10 && f !== T * 10 && l.indexOf(f) === i);
      } while (e === T || fejl.length < 2);
      const n = T * 10 + e;
      fejl = fejl.map(kortAf);
      const kort = lavKort(rng, kortAf(T * 10), fejl, antalValg(niveau));
      return {
        emne: 'tiere', type: 'talIInterval', niveau, noegle: 'talIInterval:' + n, ikon: '🚪',
        tale: 'Hvilken port hører ' + n + ' til? Tallet skal ligge mellem portens to tal.',
        tekst: 'Hvilken port?',
        vis: { art: 'scene', fakta: { tal: n }, dele: [{ t: 'staenger', id: 'tal', tiere: T, enere: e }] },
        svar: kort.svar, valg: kort.valg, kort: kort.kort, valgArt: 'scene',
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Tæl tierstængerne: ' + T + ' tiere.', lys: ['tiere'] }, { tale: 'Så ligger tallet mellem ' + T * 10 + ' og ' + (T * 10 + 9) + '.' }] }],
      };
    },

    // Tierbroen: fyld op til ti først — hvordan skal tallet deles? (8 + 7: først 2, så 5)
    delTilTi(niveau, rng) {
      const a = heltal(rng, 6, 9);
      const b = heltal(rng, 12 - a, 9); // resten mindst 2, så fejlen «første del for stor» findes
      const f = 10 - a, r = b - f;
      const kortAf = (x, y) => ({ dele: [{ t: 'tal', s: x + ' + ' + y }], navn: 'først ' + x + ', så ' + y, fakta: { foerst: x, saa: y } });
      // Første del fylder for meget (summen er stadig b) · bruger de samme to igen (f + b) · første del for lille
      const fejl = [r >= 2 ? kortAf(f + 1, r - 1) : null, kortAf(f, b), f >= 2 ? kortAf(f - 1, r + 1) : null].filter(Boolean);
      const kort = lavKort(rng, kortAf(f, r), fejl, antalValg(niveau));
      return {
        emne: 'tierbro', type: 'delTilTi', niveau, noegle: 'delTilTi:' + a + '+' + b, ikon: '🔟',
        tale: 'Vi vil først fylde op til ti. Hvordan skal de ' + b + ' deles: først op til ti, og så resten?',
        tekst: a + ' + ' + b,
        vis: { art: 'scene', fakta: { a: a, b: b }, dele: [
          { t: 'pladser', id: 'ramme', n: 10, fyldt: [{ id: 'fyldt', fra: 0, til: a, e: '🔵' }], taelbarFra: a },
          { t: 'tegn', s: '+' },
          { t: 'gruppe', id: 'kurv', ramme: 'kurv', dele: [{ t: 'ting', e: '🟠', n: b, taelbar: false }] },
        ] },
        svar: kort.svar, valg: kort.valg, kort: kort.kort, valgArt: 'scene',
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Tæl de tomme pladser.', tael: 'ramme' }] }, tallinje(a, b)],
      };
    },

    // Mønsterslottet: oversæt figurer til bevægelser (blad = klap, stjerne = tramp)
    bevaegelsesKode(niveau, rng) {
      const A = '🍁', B = '⭐', KLAP = '👏', TRAMP = '🦶';
      let frise;
      do { frise = [0, 1, 2].map(() => (rng() < 0.5 ? A : B)); } while (new Set(frise).size < 2);
      const oversaet = (l, byt) => l.map((c) => ((c === A) !== !!byt ? KLAP : TRAMP));
      const navn = (l) => l.map((c) => (c === KLAP ? 'klap' : 'tramp')).join(', ');
      const kortAf = (l) => ({ dele: [{ t: 'raekke', celler: l }], navn: navn(l), fakta: { celler: l } });
      const roter = frise.slice(1).concat(frise.slice(0, 1));
      // Flytter gentagelsen (rækken roteret) · bytter betydningen af figurerne
      const kort = lavKort(rng, kortAf(oversaet(frise)), [kortAf(oversaet(roter)), kortAf(oversaet(frise, true))], antalValg(niveau));
      return {
        emne: 'moenstre', type: 'bevaegelsesKode', niveau, noegle: 'bevaegelsesKode:' + frise.join(''), ikon: '👏',
        tale: 'Blade betyder klap. Stjerner betyder tramp. Hvilken række bevægelser passer?',
        tekst: 'Blad = klap · stjerne = tramp',
        vis: { art: 'scene', lag: 'stak', fakta: { frise: frise }, dele: [
          { t: 'gruppe', id: 'kode', ramme: 'boks', dele: [{ t: 'raekke', celler: [A, KLAP] }, { t: 'raekke', celler: [B, TRAMP] }] },
          { t: 'raekke', id: 'frise', celler: frise, pil: true, pakke: 1 },
        ] },
        svar: kort.svar, valg: kort.valg, kort: kort.kort, valgArt: 'scene',
        hjaelp: [{ art: 'lys', trin: frise.map((c, i) => ({ tale: (c === A ? 'Blad: klap.' : 'Stjerne: tramp.'), lys: ['g' + i] })) }],
      };
    },

    // Klokketorvet: hvilken bakke kan byttes lige over med ti-kronen (eller tyve-kronen)?
    bytMoent(niveau, rng) {
      // Højst 4 mønter i en bakke — også i fejlbakkerne: mønterne kan ikke blive under 80 px (tallet skal kunne
      // læses), og en bunke med flere er ikke på en telefon på 360 px (ui-review #1). Med 10 kr giver det kun to
      // bakker, så trin 2 bytter også fem-kronen (trin 3: ti- og tyve-kronen som før)
      const maal = niveau >= 3 ? (rng() < 0.5 ? 20 : 10) : (rng() < 0.5 ? 5 : 10);
      const muligheder = { 5: [[2, 2, 1], [2, 1, 1, 1]], 10: [[5, 2, 2, 1], [5, 5]], 20: [[10, 5, 5], [10, 10], [5, 5, 5, 5]] }[maal];
      const rigtig = vaelg(rng, muligheder);
      const sum = (l) => l.reduce((s, m) => s + m, 0);
      const stoerstFoerst = (l) => l.slice().sort((a, b) => b - a);
      // Overser en mønt (helst en 2-krone) · én mønt for meget: en 1-krone mere — eller, når bakken er fuld, er den
      // mindste mønt én størrelse større (1 → 2, 2 → 5, 5 → 10)
      const uden = rigtig.indexOf(2) >= 0 ? rigtig.filter((m, i) => i !== rigtig.indexOf(2)) : rigtig.slice(0, -1);
      const STOERRE = { 1: 2, 2: 5, 5: 10 };
      const mere = rigtig.length < 4 ? rigtig.concat([1]) : rigtig.slice(0, -1).concat([STOERRE[rigtig[rigtig.length - 1]]]);
      const kortAf = (l) => ({ dele: [{ t: 'moenter', liste: stoerstFoerst(l) }], navn: stoerstFoerst(l).join(' og ') + ' kroner', fakta: { liste: stoerstFoerst(l) } });
      const kort = lavKort(rng, kortAf(rigtig), [kortAf(uden), kortAf(mere)].filter((k) => sum(k.fakta.liste) !== maal), antalValg(niveau));
      return {
        emne: 'maaling', type: 'bytMoent', niveau, noegle: 'bytMoent:' + maal + ':' + rigtig.join('+'), ikon: '🔁',
        tale: 'Hvilken bakke kan byttes lige over med ' + { 5: 'fem-kronen', 10: 'ti-kronen', 20: 'tyve-kronen' }[maal] + '?',
        tekst: 'Byt ' + maal + ' kr',
        vis: { art: 'scene', fakta: { maal: maal }, dele: [{ t: 'moenter', id: 'moent', liste: [maal] }] },
        svar: kort.svar, valg: kort.valg, kort: kort.kort, valgArt: 'scene',
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Tæl kronerne i hver bakke. Det skal blive ' + maal + '.' }] }],
      };
    },

    // Lystårnet (tæller i Plusbjerget): en lille billedtabel — hvor mange lamper tilsammen?
    tabelPlus(niveau, rng) {
      const dyr = bland(rng, TABEL_DYR).slice(0, 2);
      let a, b;
      do { a = heltal(rng, 1, 7); b = heltal(rng, 1, 7); } while (a === b || a + b > 10);
      const raekke = (id, d, n) => ({ t: 'gruppe', id: id, ramme: 'ingen', dele: [{ t: 'ting', e: d.e, n: 1, taelbar: false }, { t: 'ting', e: '🏮', n: n, linje: true }] });
      return {
        emne: 'plus10', type: 'tabelPlus', niveau, noegle: 'tabelPlus:' + a + '+' + b, ikon: '📊',
        tale: 'Hvor mange lamper har ' + dyr[0].bestemt + ' og ' + dyr[1].bestemt + ' tilsammen?',
        tekst: 'Hvor mange lamper i alt?',
        vis: { art: 'scene', lag: 'stak', fakta: { a: a, b: b }, dele: [raekke('r1', dyr[0], a), raekke('r2', dyr[1], b)] },
        svar: a + b,
        // Finder forskellen · læser kun den største række
        valg: lavValgFejl(a + b, [Math.abs(a - b), Math.max(a, b)], antalValg(niveau), 0, 10, rng), valgBlandet: true,
        hjaelp: [{ art: 'lys', trin: [{ tale: stort(dyr[0].bestemt) + ' har ' + a + '.', lys: ['r1'] }, { tale: stort(dyr[1].bestemt) + ' har ' + b + '.', lys: ['r2'] }] }, { art: 'tael' }],
      };
    },

    // =====================================================================
    //  D3 · trin 3 (forslaget 09-10): en valgfri udfordring — her på niveau 3
    // =====================================================================

    // Tælleskoven: hvilken vogn er nummer tre i køen? (tæl fra flaget — køen kan vende begge veje)
    koePlads(niveau, rng) {
      let n, k;
      do { n = heltal(rng, 4, 8); k = heltal(rng, 2, Math.min(5, n - 1)); } while (n - k + 1 === k || n - k + 1 === k - 1);
      const flag = vaelg(rng, ['venstre', 'hoejre']);
      const kortAf = (m) => ({ dele: [{ t: 'koe', n: n, flag: flag, maerk: m }], navn: 'vogn nummer ' + m + ' fra flaget', fakta: { maerk: m } });
      // Starter med at tælle ved nul (én for tidligt) · tæller fra den forkerte ende
      const kort = lavKort(rng, kortAf(k), [kortAf(k - 1), kortAf(n - k + 1)], antalValg(niveau));
      return {
        emne: 'taelle', type: 'koePlads', niveau, noegle: 'koePlads:' + n + '-' + k + flag[0], ikon: '🚃',
        tale: 'Begynd ved flaget. Hvilken vogn er den ' + ORDENSTAL[k] + ' i køen?',
        tekst: 'Nummer ' + k + ' fra flaget',
        vis: { art: 'scene', fakta: { n: n, nummer: k }, dele: [{ t: 'koe', id: 'koe', n: n, flag: flag }] },
        svar: kort.svar, valg: kort.valg, kort: kort.kort, valgArt: 'scene',
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Her er flaget. Den første vogn står ved flaget.', lys: ['flag', 'v1'] }] },
          { art: 'lys', trin: Array.from({ length: k }, (_, i) => ({ tale: ORDENSTAL[i + 1].charAt(0).toUpperCase() + ORDENSTAL[i + 1].slice(1) + '.', lys: ['v' + (i + 1)] })) }],
      };
    },

    // Formbyen: to regler på én gang — fx tre hjørner OG striber
    toRegler(niveau, rng) {
      const former = ['trekant', 'firkant', 'cirkel'], moenstre = ['striber', 'prikker'];
      const form = vaelg(rng, former), m = vaelg(rng, moenstre);
      const andenForm = vaelg(rng, former.filter((f) => f !== form)), andetM = moenstre.find((x) => x !== m);
      const kortAf = (f, mm) => ({ dele: [{ t: 'form', id: 'f-' + f, form: f, farve: 3, moenster: mm }], navn: FORMER[f].ubestemt + ' med ' + mm, fakta: { form: f, moenster: mm } });
      // Bruger kun mønstret · bruger kun hjørnerne
      const kort = lavKort(rng, kortAf(form, m), [kortAf(andenForm, m), kortAf(form, andetM)], antalValg(niveau));
      const hj = FORMER[form].hjoerner;
      // Hjælpen lyser alle kort med formen — ental eller flertal efter, hvor mange det er (review #9)
      const hvem = kort.valg.filter((v) => kort.kort[v].fakta.form === form).length > 1 ? 'figurerne' : 'figuren';
      return {
        emne: 'former', type: 'toRegler', niveau, noegle: 'toRegler:' + form + '-' + m, ikon: '🔍',
        tale: 'Find figuren, som både har ' + (hj ? TAL_ORD[hj].replace('ét', 'et') + ' hjørner' : 'ingen hjørner') + ' og ' + m + '.',
        tekst: 'To regler',
        vis: { art: 'scene', fakta: { hjoerner: hj, moenster: m }, dele: [{ t: 'skilt', id: 'skilt', hjoerner: hj, moenster: m }] },
        svar: kort.svar, valg: kort.valg, kort: kort.kort, valgArt: 'scene',
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Find ' + hvem + (hj ? ' med ' + TAL_ORD[hj] + ' hjørner.' : ' uden hjørner.'), lys: ['f-' + form] }, { tale: 'Hvilken af dem har ' + m + '?' }] }],
      };
    },

    // Tegnebyen: ret den knækkede vej ud — hvilken lige vej er lige så lang?
    retVej(niveau, rng) {
      const a = heltal(rng, 1, 3), b = heltal(rng, 1, 3);
      const L = a + b;
      const kortAf = (l) => ({ dele: [{ t: 'gitterStreg', laengde: l }], navn: 'en lige vej på ' + l + ' felter', fakta: { laengde: l } });
      // Bruger kun bredden · tæller hjørner/prikker i stedet for vejstykker (én for meget) · bruger kun højden
      const kort = lavKort(rng, kortAf(L), [kortAf(a), kortAf(L + 1), kortAf(b)].filter((k) => k.fakta.laengde !== L), antalValg(niveau));
      return {
        emne: 'tegne', type: 'retVej', niveau, noegle: 'retVej:' + a + '+' + b, ikon: '📐',
        tale: 'Den knækkede vej skal rettes ud. Hvilken lige vej er lige så lang?',
        tekst: 'Lige så lang',
        vis: { art: 'scene', fakta: { hen: a, op: b }, dele: [{ t: 'gitterRute', id: 'vej', opskrift: [['hoejre', a], ['op', b]] }] },
        svar: kort.svar, valg: kort.valg, kort: kort.kort, valgArt: 'scene',
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Tæl stykkerne på vejen.', tael: 'vej' }] }],
      };
    },

    // Plusbjerget: hvilken historie viser regnestykket? (3 + 4: tre fugle, og fire kommer til)
    regneHistorie(niveau, rng, tingListe) {
      const { ting } = vaelgTing(rng, tingListe);
      let a, b;
      do { a = heltal(rng, 2, 6); b = heltal(rng, 2, 6); } while (a + b > 10 || a === b);
      const plus = (x, y) => ({ dele: [{ t: 'ting', e: ting.e, n: x, taelbar: false }, { t: 'tegn', s: '+' }, { t: 'ting', e: ting.e, n: y, taelbar: false, kommer: true }], navn: x + ', og ' + y + ' kommer til', fakta: { start: x, op: '+', n: y } });
      const minus = (x, y) => ({ dele: [{ t: 'ting', e: ting.e, n: x, taelbar: false, under: [{ id: 'vaek', fra: x - y, til: x, vaek: true }] }], navn: x + ', og ' + y + ' går væk', fakta: { start: x, op: '−', n: y } });
      // Overser den præcise nye mængde (én for mange) · de samme tal, men den modsatte handling
      const kort = lavKort(rng, plus(a, b), [plus(a, b + 1), minus(a + b, b)], antalValg(niveau));
      return {
        emne: 'plus10', type: 'regneHistorie', niveau, noegle: 'regneHistorie:' + a + '+' + b, ikon: '📖',
        tale: a + ' plus ' + b + '. Hvilken historie viser det regnestykke?',
        tekst: a + ' + ' + b,
        vis: { art: 'scene', fakta: { a: a, b: b }, dele: [{ t: 'tal', id: 'stykke', s: a + ' + ' + b }] },
        svar: kort.svar, valg: kort.valg, kort: kort.kort, valgArt: 'scene',
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Plus betyder, at der kommer nogen til.', lys: ['stykke'] }, { tale: 'Find historien, hvor der er ' + a + ', og ' + b + ' kommer til.' }] }],
      };
    },

    // Venneøen: ti deles mellem tre venner — hvor mange får den sidste?
    treVenner(niveau, rng) {
      let a, b;
      do { a = heltal(rng, 1, 7); b = heltal(rng, 1, 8 - a); } while (10 - a - b < 1 || a + b === 10 - a - b || a + b === 10 - a);
      const svar = 10 - a - b;
      return {
        emne: 'venner', type: 'treVenner', niveau, noegle: 'treVenner:' + a + '+' + b, ikon: '👨‍👩‍👧',
        tale: 'Ti skal deles mellem tre venner. Den første har ' + a + '. Den anden har ' + b + '. Hvor mange får den sidste?',
        tekst: a + ' + ' + b + ' + ? = 10',
        vis: { art: 'scene', fakta: { a: a, b: b }, dele: [{ t: 'pladser', id: 'ti', n: 10, fyldt: [{ id: 'v1', fra: 0, til: a, e: '🔵' }, { id: 'v2', fra: a, til: a + b, e: '🟠' }], taelbarFra: a + b }] },
        svar: svar,
        // Svarer med det, der allerede er delt ud · trækker kun den første fra
        valg: lavValgFejl(svar, [a + b, 10 - a], antalValg(niveau), 0, 10, rng), valgBlandet: true,
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Den første har ' + a + ', og den anden har ' + b + '.', lys: ['v1', 'v2'] }] },
          { art: 'lys', trin: [{ tale: 'Tæl de tomme pladser.', tael: 'ti' }] }],
      };
    },

    // Minussøen: hvilket minusstykke efterlader lige så mange? (9 − 4 og 8 − 3 efterlader begge 5)
    sammeRest(niveau, rng) {
      const kortAf = (x, y) => ({ dele: [{ t: 'tal', s: x + ' − ' + y }, { t: 'ting', e: '🪨', n: x, taelbar: false, under: [{ id: 'vaek', fra: x - y, til: x, vaek: true }] }], navn: x + ' minus ' + y, fakta: { a: x, b: y } });
      let a, b, c, d, r, fejl;
      do {
        a = heltal(rng, 5, 10); b = heltal(rng, 1, a - 2); r = a - b; c = heltal(rng, r + 1, 10); d = c - r;
        // Bevarer kun det, der fjernes (c − b) · bevarer kun begyndelsen (a − d)
        fejl = [kortAf(c, b), kortAf(a, d)].filter((k) => k.fakta.a - k.fakta.b !== r && k.fakta.b >= 1 && k.fakta.b < k.fakta.a);
      } while (c === a || d === b || d < 1 || fejl.length < 2);
      const kort = lavKort(rng, kortAf(c, d), fejl, antalValg(niveau));
      return {
        emne: 'minus', type: 'sammeRest', niveau, noegle: 'sammeRest:' + a + '-' + b + '=' + c + '-' + d, ikon: '🪨',
        tale: a + ' minus ' + b + '. Hvilket af de nye minusstykker efterlader lige så mange sten?',
        tekst: a + ' − ' + b,
        vis: { art: 'scene', fakta: { a: a, b: b }, dele: [{ t: 'tal', s: a + ' − ' + b }, { t: 'ting', id: 'sten', e: '🪨', n: a, under: [{ id: 'rest', fra: 0, til: r, taelbar: true }, { id: 'vaek', fra: r, til: a, vaek: true, taelbar: false }] }] },
        svar: kort.svar, valg: kort.valg, kort: kort.kort, valgArt: 'scene',
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Her er der ' + r + ' tilbage.', tael: 'sten' }] }],
      };
    },

    // Klodsbyen: tag én lille klods væk, og læg én tierstang til — hvilket tal har vi nu?
    enerTilTier(niveau, rng) {
      let T, e;
      do { T = heltal(rng, 1, 3); e = heltal(rng, 1, 9); } while (T * 10 + e - 1 + 10 > 50);
      const n = T * 10 + e, svar = n - 1 + 10;
      return {
        emne: 'tiere', type: 'enerTilTier', niveau, noegle: 'enerTilTier:' + n, ikon: '🔄',
        tale: 'Her er ' + n + '. Tag én lille klods væk. Læg én tierstang til. Hvilket tal har vi nu?',
        tekst: n + ' − 1 + 10',
        vis: { art: 'scene', fakta: { tal: n }, dele: [{ t: 'staenger', id: 'start', tiere: T, enere: e }, { t: 'tegn', s: '−' }, { t: 'staenger', id: 'ener', tiere: 0, enere: 1 }, { t: 'tegn', s: '+' }, { t: 'staenger', id: 'tier', tiere: 1, enere: 0 }] },
        svar: svar,
        // Glemmer at tage eneren væk · behandler tierstangen som én ener
        valg: lavValgFejl(svar, [n + 10, n + 1], antalValg(niveau), 0, 50, rng), valgBlandet: true,
        hjaelp: [{ art: 'lys', trin: [{ tale: 'En tierstang er ti små klodser lang.', lys: ['tier'] }] },
          { art: 'lys', trin: [{ tale: 'Først ' + (n - 1) + '. Så ' + svar + '.', lys: ['start'] }] }],
      };
    },

    // Tierbroen: en returrejse — de nye flyver hjem igen. Hvilket regnestykke viser det?
    tilbageHistorie(niveau, rng) {
      let a, b;
      do { a = heltal(rng, 5, 9); b = heltal(rng, 3, 9); } while (a === b);
      const sum = a + b;
      const kortAf = (x, y) => ({ dele: [{ t: 'tal', s: x + ' − ' + y }], navn: x + ' minus ' + y, fakta: { a: x, b: y } });
      // Sender de oprindelige hjem (sum − a) · glemmer, at der nu er flere (a − b)
      const fejl = [kortAf(sum, a), a > b ? kortAf(a, b) : kortAf(b, a)].filter((k) => !(k.fakta.a === sum && k.fakta.b === b));
      const kort = lavKort(rng, kortAf(sum, b), fejl, antalValg(niveau));
      return {
        emne: 'tierbro', type: 'tilbageHistorie', niveau, noegle: 'tilbageHistorie:' + a + '+' + b, ikon: '🏡',
        tale: a + ' fugle fik ' + b + ' nye venner. Nu er de ' + sum + '. Nu flyver netop de ' + b + ' nye hjem igen. Hvilket regnestykke viser det?',
        tekst: a + ' + ' + b + ' = ' + sum,
        vis: { art: 'scene', fakta: { a: a, b: b }, dele: [
          { t: 'ting', id: 'gamle', e: '🐦', n: a, taelbar: false }, { t: 'tegn', s: '+' }, { t: 'ting', id: 'nye', e: '🐤', n: b, taelbar: false }, { t: 'tegn', s: '=' }, { t: 'tal', s: String(sum) }] },
        svar: kort.svar, valg: kort.valg, kort: kort.kort, valgArt: 'scene',
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Det er de ' + b + ' nye, der flyver hjem.', lys: ['nye'] }, { tale: 'Vi starter med ' + sum + ' og tager ' + b + ' væk.' }] }],
      };
    },

    // Mønsterslottet: skiftende hop (+1, +2, +1, +2 …) — reglen siges altid
    skiftendeHop(niveau, rng) {
      const regler = [[1, 2], [2, 1], [1, 3], [2, 3]];
      const [h1, h2] = vaelg(rng, regler);
      const start = heltal(rng, 0, 4);
      const raekke = [start];
      for (let i = 1; i < 7; i++) raekke.push(raekke[i - 1] + (i % 2 ? h1 : h2));
      const svar = raekke[6] + h1; // det næste hop er h1 igen
      if (svar > 20) return G.skiftendeHop(niveau, rng);
      const ord = (h) => (h === 1 ? 'én' : TAL_ORD[h]);
      return {
        emne: 'moenstre', type: 'skiftendeHop', niveau, noegle: 'skiftendeHop:' + start + ':' + h1 + h2, ikon: '🦘',
        tale: 'Først ' + ord(h1) + ' frem, så ' + ord(h2) + ' frem. Gentag den regel. Hvilket tal kommer så?',
        tekst: '+' + h1 + ', +' + h2 + ' …',
        vis: { art: 'scene', fakta: { start: start, hop1: h1, hop2: h2 }, dele: [{ t: 'raekke', id: 'tal', celler: raekke.map(String).concat(['?']) }, { t: 'tal', id: 'regel', s: '+' + h1 + ', +' + h2 }] },
        svar: svar,
        // Gentager kun det sidste hop (h2) · lægger begge hop til på én gang
        valg: lavValgFejl(svar, [raekke[6] + h2, raekke[6] + h1 + h2], antalValg(niveau), 0, 50, rng), valgBlandet: true,
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Hoppene skifter: ' + ord(h1) + ', ' + ord(h2) + ', ' + ord(h1) + ', ' + ord(h2) + '.', lys: ['regel'] }] }, tallinje(raekke[6], h1)],
      };
    },

    // Klokketorvet: hvad er klokken 10 minutter senere? (ofte over en hel time — aldrig over 12)
    tidFrem(niveau, rng) {
      const spring = vaelg(rng, [5, 10, 15, 30, 60]);
      const pad = (x) => (x < 10 ? '0' : '') + x;
      const tid = (tt, mm) => tt + ':' + pad(mm);
      let t, m, fejl, svar;
      do {
        t = heltal(rng, 1, 10);
        // Timeskiftet er det svære: to ud af tre gange går springet over en hel time
        m = rng() < 0.67 && spring < 60 ? vaelg(rng, [60 - spring, 55, 50, 45].filter((x) => x >= 60 - spring && x < 60)) : 5 * heltal(rng, 0, 11);
        const total = m + spring;
        svar = tid(t + Math.floor(total / 60), total % 60);
        const over = total >= 60;
        fejl = [
          over && total < 100 ? t + ':' + total : null,                                   // minutterne som et almindeligt tal (7:60)
          (() => { const d = m + 2 * spring; return t + Math.floor(d / 60) <= 12 ? tid(t + Math.floor(d / 60), d % 60) : null; })(), // springer to gange (8:10)
          over ? tid(t, total % 60) : tid(t + 1, total % 60),                              // glemmer timen — eller skifter time for tidligt
        ].filter((f, i, l) => f && f !== svar && l.indexOf(f) === i);
      } while (fejl.length < 2);
      const fra = tid(t, m);
      return {
        emne: 'maaling', type: 'tidFrem', niveau, noegle: 'tidFrem:' + fra + '+' + spring, ikon: '⏩',
        tale: 'Klokken er ' + klokkeNavn(fra) + '. Hvad er klokken ' + (spring === 60 ? 'en time' : spring + ' minutter') + ' senere?',
        tekst: '+ ' + (spring === 60 ? '1 time' : spring + ' min'),
        vis: { art: 'scene', fakta: { fra: fra, spring: spring }, dele: [{ t: 'ur', id: 'ur', klokke: fra }, { t: 'tal', s: '+ ' + (spring === 60 ? '1 time' : spring + ' min') }] },
        svar: svar,
        valg: lavValgTekst(rng, svar, [svar].concat(fejl.slice(0, antalValg(niveau) - 1)), antalValg(niveau)),
        valgArt: 'tid',
        hjaelp: [{ art: 'urFem', klokke: fra, spring: spring }, { art: 'visUr', klokke: svar }],
      };
    },

    // Klokketorvet: to køb — hvor mange kroner har du tilbage?
    toKoeb(niveau, rng) {
      const har = vaelg(rng, [10, 10, 20]);
      let p1, p2;
      do { p1 = heltal(rng, 2, har === 10 ? 6 : 9); p2 = heltal(rng, 1, har === 10 ? 5 : 9); } while (p1 === p2 || p1 + p2 >= har);
      const [v1, v2] = bland(rng, VARER).slice(0, 2);
      const svar = har - p1 - p2;
      return {
        emne: 'maaling', type: 'toKoeb', niveau, noegle: 'toKoeb:' + har + '-' + p1 + '-' + p2, ikon: '🧺',
        tale: 'Du har ' + har + ' kroner og køber begge ting. ' + v1.navn + ' koster ' + p1 + ' kroner. ' + v2.navn + ' koster ' + p2 + ' kroner. Hvor mange kroner har du tilbage?',
        tekst: har + ' − ' + p1 + ' − ' + p2,
        vis: { art: 'scene', fakta: { har: har, p1: p1, p2: p2 }, dele: [{ t: 'moenter', id: 'pung', liste: [har] }, { t: 'tegn', s: '→' }, { t: 'vare', id: 'v1', e: v1.e, pris: p1 }, { t: 'vare', id: 'v2', e: v2.e, pris: p2 }] },
        svar: svar,
        // Betaler kun den ene · betaler kun den anden
        valg: lavValgFejl(svar, [har - p1, har - p2, p1 + p2], antalValg(niveau), 0, 20, rng), valgBlandet: true,
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Først betaler du ' + p1 + '. Så har du ' + (har - p1) + '.', lys: ['v1'] }, { tale: 'Så betaler du ' + p2 + '.', lys: ['v2'] }] }, tallinje(har - p1, -p2)],
      };
    },

    // Lystårnet (tæller i Tierbroen): to handlinger i træk — 8 sten, 5 mere, 3 bruges
    toTrin(niveau, rng) {
      let s, plus, minus;
      do { s = heltal(rng, 3, 10); plus = heltal(rng, 2, 6); minus = heltal(rng, 2, 6); } while (s + plus > 20 || minus >= s + plus || s - minus < 0 || minus === plus);
      const svar = s + plus - minus;
      return {
        emne: 'tierbro', type: 'toTrin', niveau, noegle: 'toTrin:' + s + '+' + plus + '-' + minus, ikon: '🧱',
        tale: 'Vi har ' + s + ' sten. Vi finder ' + plus + ' mere. Vi bruger ' + minus + '. Hvor mange sten ligger nu i kurven?',
        tekst: s + ' + ' + plus + ' − ' + minus,
        vis: { art: 'scene', fakta: { start: s, plus: plus, minus: minus }, dele: [
          { t: 'gruppe', id: 'kurv', ramme: 'kurv', dele: [{ t: 'ting', e: '🪨', n: s, taelbar: false }] },
          { t: 'tegn', s: '+' }, { t: 'gruppe', id: 'plus', ramme: 'ingen', dele: [{ t: 'ting', e: '🪨', n: plus, taelbar: false }] },
          { t: 'tegn', s: '−' }, { t: 'gruppe', id: 'minus', ramme: 'ingen', dele: [{ t: 'ting', e: '🪨', n: minus, taelbar: false, under: [{ id: 'brugt', fra: 0, til: minus, vaek: true }] }] },
        ] },
        svar: svar,
        // Stopper efter første handling · glemmer de nye (trækker fra begyndelsen)
        valg: lavValgFejl(svar, [s + plus, s - minus], antalValg(niveau), 0, 20, rng), valgBlandet: true,
        hjaelp: [{ art: 'lys', trin: [{ tale: s + ' og ' + plus + ' mere er ' + (s + plus) + '.', lys: ['kurv', 'plus'] }] }, tallinje(s + plus, -minus)],
      };
    },

    // =====================================================================
    //  C · minispil (forslaget 09-10, afsnit C). Visningen er specificeret i docs/MINISPIL.md.
    //  Koblet på EMNER bagerst på niveauet: MINISPIL (nedenfor) siger, hvilken verden og hvilket niveau hvert trin hører til.
    //  Et minispil er én af rundens opgaver (ingen egen pointøkonomi). Trin = niveau. Højst 3 valg pr. skærm.
    // =====================================================================

    // Frøposten (Tælleskoven): pak præcis det bestilte antal frø i kurven med ➕ / ➖ / Færdig (interaktiv 'kurv').
    // Trin 1: tom kurv, bestilling 3–6 med lige så mange pladser (én-til-én) · trin 2: der ligger 2–5, pak op til
    // 2–6 flere (højst 10) · trin 3: der ligger 11–15 og skal være 2–5 færre (to af tre gange) — ellers 6–9 op til 11–14
    froePost(niveau, rng) {
      const dyr = vaelg(rng, FROE_DYR);
      let start, maal;
      if (niveau <= 1) { start = 0; maal = heltal(rng, 3, 6); }
      else if (niveau === 2) { start = heltal(rng, 2, 5); maal = heltal(rng, start + 2, Math.min(10, start + 6)); }
      else if (rng() < 0.67) { start = heltal(rng, 11, 15); maal = start - heltal(rng, 2, 5); }
      else { start = heltal(rng, 6, 9); maal = heltal(rng, Math.max(11, start + 2), Math.min(14, start + 5)); }
      const Dyr = stort(dyr.bestemt);
      // Hjælp: tæl frøene i kurven → (trin 1) hvert frø får sin plads · (trin 2–3) tallinjen fra det, der ligger, til bestillingen
      const tael = { art: 'lys', trin: [{ tale: (start > 10 ? 'Der ligger ' + start + '. Det er ti og ' + (start - 10) + '. ' : '') + 'Tæl frøene i kurven.', lys: ['kurv'], tael: 'kurv' }] };
      const vis = { art: 'kurv', start: start, maal: maal, pladser: start === 0 ? maal : 0, dyr: dyr.id, e: dyr.e, fakta: { start: start, maal: maal } };
      if (dyr.billede) vis.billede = dyr.billede;
      return {
        emne: 'taelle', type: 'froePost', niveau, noegle: 'froePost:' + start + '>' + maal, ikon: '🌰',
        tale: start === 0
          ? Dyr + ' skal have ' + maal + ' frø. Pak dem i kurven.'
          : 'Der ligger ' + start + ' frø i kurven. ' + Dyr + ' skal ' + (maal < start ? 'kun have ' + maal + '. Tag nogle op, så der er ' : 'have ' + maal + '. Pak, så der er ') + maal + '.',
        tekst: Dyr + ' skal have ' + maal, // bestillingen — ikke «12 frø i kurven», mens der ligger 15 (ui-review 11-10)
        vis: vis,
        svar: 'ok', interaktiv: 'kurv',
        hjaelp: start === 0
          ? [tael, { art: 'lys', trin: [{ tale: 'Hvert frø skal have sin egen plads. Der er ' + maal + ' pladser.', lys: ['pladser'], tael: 'pladser' }] }]
          : [tael, tallinje(start, maal - start)],
        slut: { art: 'lysblomst' },
      };
    },

    // Skovbroen (Venneøen trin 1–2, Tierbroen trin 3): vælg den brobrik, der passer i broåbningen.
    // Trin 1: bro 5, fast brik 1–4 · trin 2: bro 10, fast 3–8 (10'er-venner) · trin 3: fast 6–9 og en anden del på 3–8,
    // der går over ti (broen er 11–14 lang): find brikken op til tiermærket. Fejlbrikkerne er typiske fejl, aldrig
    // tilfældige: én for lidt/meget (talt forkert) · den faste brik igen · (trin 3) resten efter tieren, og som reserve
    // to–tre for meget. ALDRIG en brik, der fylder hele broen (fast + brik = bro): den ville passe og være «forkert».
    skovBro(niveau, rng) {
      let bro, fast, del = 0;
      if (niveau <= 1) { bro = 5; fast = heltal(rng, 1, 4); }
      else if (niveau === 2) { bro = 10; fast = heltal(rng, 3, 8); }
      else { fast = heltal(rng, 6, 9); del = heltal(rng, Math.max(3, 11 - fast), 14 - fast); bro = fast + del; } // del ≥ 3: ellers er der for få typiske fejl
      const maal = niveau >= 3 ? 10 : bro; // trin 3: først op til tiermærket
      const svar = maal - fast;
      const pm = bland(rng, [svar - 1, svar + 1]);
      const kandidater = niveau <= 1 ? pm : niveau === 2 ? [pm[0], fast, pm[1]] : [del - svar, pm[0], pm[1], svar + 2, svar + 3];
      const fejl = [];
      for (const n of kandidater) if (n >= 1 && n <= 9 && n !== svar && fast + n !== bro && fejl.indexOf(n) < 0) fejl.push(n);
      const kortAf = (n) => ({ dele: [{ t: 'brobrik', n: n }], navn: TAL_ORD[n] + (n === 1 ? ' felt' : ' felter'), fakta: { n: n } });
      const k = lavKort(rng, kortAf(svar), fejl.map(kortAf), antalValg(niveau));
      return {
        emne: niveau >= 3 ? 'tierbro' : 'venner', type: 'skovBro', niveau,
        noegle: 'skovBro:' + (niveau >= 3 ? fast + '+' + del : fast + '+?=' + bro), ikon: '🌉',
        tale: niveau >= 3
          ? 'Broen er ' + fast + ' plus ' + del + ' felter lang. Her ligger ' + fast + '. Fyld først op til tiermærket.'
          : 'Broen skal være ' + bro + ' felter lang. Her ligger ' + fast + '. Find resten.',
        tekst: niveau >= 3 ? fast + ' + ' + del : fast + ' + ? = ' + bro,
        vis: { art: 'scene', fakta: niveau >= 3 ? { bro: bro, fast: fast, del: del, maal: maal } : { bro: bro, fast: fast, maal: maal }, dele: [{ t: 'bro', id: 'bro', n: bro, fast: fast }] },
        svar: k.svar, valg: k.valg, kort: k.kort, valgArt: 'scene',
        hjaelp: [{ art: 'lys', trin: [{ tale: niveau >= 3 ? 'Tæl de tomme felter op til tiermærket.' : 'Tæl de tomme felter.', lys: ['tomme'], tael: 'tomme' }] }, tallinje(fast, svar)],
        // Efter det rigtige valg (bedømmes ikke): trin 3 lægger resten på næste skærm og siger regningen
        slut: niveau >= 3 ? { art: 'bro', rest: del - svar, tale: fast + ' og ' + svar + ' er 10. 10 og ' + (del - svar) + ' er ' + bro + '.' } : { art: 'bro' },
      };
    },

    // Skyggeatelieret (Formbyen): find figuren, der kan dække skyggen. Trin 1: cirkel-, trekant- eller kvadratskygge,
    // lige · trin 2: skyggen er drejet (±25° eller ±40°) — en figur beholder sin type, når den drejer · trin 3: et
    // kvadrat af to retvinklede trekanter; den ene ligger — find den anden: samme trekant, drejet en halv omgang.
    skyggeAtelier(niveau, rng) {
      if (niveau >= 3) {
        const hj = vaelg(rng, ['nv', 'no', 'sv', 'so']);
        const hul = MODSAT_HJOERNE[hj];
        const tre = (h) => ({ form: 'trekant', b: 100, h: 100, hjoerne: h });
        // Fejl: vendt som den, der ligger (ikke drejet) · drejet en kvart omgang
        const kvart = vaelg(rng, ['nv', 'no', 'sv', 'so'].filter((h) => h !== hj && h !== hul));
        const kortAf = (b) => ({ dele: [Object.assign({ t: 'brik' }, b)], navn: 'en trekant med den rette vinkel ' + HJOERNE_ORD[b.hjoerne], fakta: b });
        const k = lavKort(rng, kortAf(tre(hul)), [kortAf(tre(hj)), kortAf(tre(kvart))], antalValg(niveau));
        return {
          emne: 'former', type: 'skyggeAtelier', niveau, noegle: 'skyggeAtelier:halv-' + hj, ikon: '🪟',
          tale: 'Reparér vinduet. Den ene trekant ligger der allerede. Hvilken trekant passer i resten af skyggen?',
          tekst: 'Hvilken trekant passer?',
          vis: { art: 'scene', fakta: { figur: 'kvadrat', fast: hj, hul: hul }, dele: [{ t: 'puslespil', id: 'puslespil', figur: 'kvadrat', b: 100, h: 100, fast: Object.assign(tre(hj), { x: 0, y: 0 }), hul: Object.assign(tre(hul), { x: 0, y: 0 }), skygge: true }] },
          svar: k.svar, valg: k.valg, kort: k.kort, valgArt: 'scene',
          hjaelp: [
            { art: 'lys', trin: [{ tale: 'Stregen på skrå deler kvadratet i to trekanter. Den ene ligger der allerede.', lys: ['hul'] }] },
            { art: 'lys', trin: [{ tale: 'Den sidste trekant er magen til — bare drejet en halv omgang.', lys: ['hul'] }] },
          ],
          slut: { art: 'vindue' },
        };
      }
      const pulje = niveau <= 1 ? ['cirkel', 'trekant', 'kvadrat'] : ['trekant', 'rektangel', 'kvadrat'];
      const form = vaelg(rng, pulje);
      const drej = niveau <= 1 ? 0 : vaelg(rng, [-40, -25, 25, 40]);
      // Fejl: de andre figurer på trinnet — på trin 2 den typiske forveksling først (kvadrat ↔ rektangel)
      const fejl = niveau <= 1 ? bland(rng, pulje.filter((f) => f !== form)) : SKYGGE_FEJL[form];
      // Kortene har hver sin farve: skyggen genkendes på formen, ikke på farven
      const farver = bland(rng, [0, 1, 2, 3, 4, 5]);
      const kortAf = (f, i) => ({ dele: [{ t: 'form', form: f, farve: farver[i] }], navn: FORMER[f].ubestemt, fakta: { form: f } });
      const k = lavKort(rng, kortAf(form, 0), fejl.map((f, i) => kortAf(f, i + 1)), antalValg(niveau));
      const hjaelp = [{ art: 'lys', trin: [{ tale: SKYGGE_BESKRIV[form], lys: ['skygge'] }] }];
      if (drej) hjaelp.push({ art: 'lys', trin: [{ tale: 'Skyggen er drejet. ' + stort(FORMER[form].ubestemt) + ' er stadig ' + FORMER[form].ubestemt + ', når den drejer.', lys: ['skygge'] }] });
      return {
        emne: 'former', type: 'skyggeAtelier', niveau, noegle: 'skyggeAtelier:' + form + (drej ? '@' + drej : ''), ikon: '🌑',
        tale: 'Find den figur, der kan dække skyggen.',
        tekst: 'Hvilken figur passer?',
        vis: { art: 'scene', fakta: { form: form, drej: drej }, dele: [{ t: 'form', id: 'skygge', form: form, drej: drej, skygge: true }] },
        svar: k.svar, valg: k.valg, kort: k.kort, valgArt: 'scene',
        hjaelp: hjaelp,
        // Efter det rigtige valg: figuren glider ind og drejer langsomt ned i skyggen (efter talen)
        slut: { art: 'drejInd', drej: drej },
      };
    },

    // Urværkstedet (Klokketorvet): stil uret til en aftale (valgArt 'stil' som klokkeStil). Trin 1: hele timer — den
    // lille viser flyttes, målene står ved timetallene (vis.viser 'lille') · trin 2: halv fra den hele time før
    // («halv otte» fra 7:00) · trin 3: uret viser kvart over/i — stil det en halv time senere (to kvarterer frem).
    urVaerksted(niveau, rng) {
      const minut = (k) => Number(k.split(':')[1]);
      const tid = (t, m) => t + ':' + (m < 10 ? '0' : '') + m;
      const faelles = { emne: 'maaling', type: 'urVaerksted', niveau, ikon: '🔧', tekst: 'Stil uret', valgArt: 'stil' };
      if (niveau <= 1) {
        const t = heltal(rng, 1, 11);
        // Fejl: spejlbilledet (venstre og højre byttet: 4 ↔ 8) — ved 6 en kvart omgang ved siden af
        const f = t === 6 ? vaelg(rng, [3, 9]) : 12 - t;
        const svar = tid(t, 0);
        return Object.assign(faelles, {
          noegle: 'urVaerksted:' + svar,
          tale: 'Vi mødes klokken ' + TIME_ORD[t] + '. Stil uret på ' + TIME_ORD[t] + '.',
          vis: { art: 'lyt', start: '12:00', viser: 'lille' },
          svar: svar, valg: [t, f].sort((a, b) => a - b).map((x) => tid(x, 0)),
          hjaelp: [{ art: 'stilLille', klokke: svar }],
        });
      }
      if (niveau === 2) {
        const t = heltal(rng, 1, 12);
        const naeste = (t % 12) + 1;
        const svar = tid(t, 30);
        return Object.assign(faelles, {
          noegle: 'urVaerksted:' + svar,
          tale: 'Vi mødes klokken halv ' + TIME_ORD[naeste] + '. Stil uret på halv ' + TIME_ORD[naeste] + '.',
          vis: { art: 'lyt', start: tid(t, 0) },
          svar: svar,
          // Fejl (som klokkeStil): kvart i — «halv otte» og «kvart i otte» ligger begge før otte · den nævnte hele time
          valg: [svar, tid(t, 45), tid(naeste, 0)].sort((a, b) => minut(a) - minut(b)),
          hjaelp: [{ art: 'stilHel', klokke: tid(naeste, 0) }, { art: 'stilFlyt', klokke: svar }],
        });
      }
      const t = heltal(rng, 1, 12);
      const m0 = vaelg(rng, [15, 45]);
      const start = tid(t, m0);
      const frem = (min) => { const x = t * 60 + m0 + min; return tid(((Math.floor(x / 60) - 1) % 12) + 1, x % 60); };
      const svar = frem(30);
      return Object.assign(faelles, {
        noegle: 'urVaerksted:' + start + '+30',
        tale: 'Uret viser ' + klokkeNavn(start) + '. Vi mødes en halv time senere. Stil uret.',
        tekst: 'En halv time senere',
        vis: { art: 'lyt', start: start },
        svar: svar,
        // Fejl: kun ét kvarter frem («halv» hørt som 6-tallet ved kvart over) · tre kvarterer frem
        valg: [frem(15), svar, frem(45)].sort((a, b) => minut(a) - minut(b)),
        hjaelp: [{ art: 'stilKvarter', fra: start, kvarterer: 2 }, { art: 'visUr', klokke: svar }],
      });
    },

    // =====================================================================
    //  Variation (20-10-2026): «Hvem passer ikke ind?» og «Hvad mangler?» — barnet løser dem med øjne, ører og
    //  fingre. Hjælperne (udenforKort, udenforSumOpgave, manglerRaekke) står lige efter G.
    // =====================================================================

    // Tælleskoven: tre af fire kort har lige mange. Kortene er tegnet på fire måder (terning, to slags ting, klodser),
    // så det ene kort kun kan findes ved at tælle — ikke ved at se, hvilket kort der ser anderledes ud
    udenforAntal(niveau, rng, tingListe) {
      const max = niveau >= 2 ? 10 : 6;
      const n = heltal(rng, niveau >= 2 ? 4 : 2, niveau >= 2 ? 9 : 5);
      const anden = vaelg(rng, [n - 1, n + 1].filter((x) => x >= 1 && x <= max));
      const t1 = vaelgTing(rng, tingListe).ting;
      // Den anden ting: helst fra temaet — har temaet ingen anden brugbar ting, så fra alle ting (som vaelgTing)
      const andre = (liste) => liste.map((k) => TING[k]).filter((t) => t && t.e !== t1.e);
      const fraTema = andre(tingListe && tingListe.length ? tingListe : Object.keys(TING));
      const t2 = vaelg(rng, fraTema.length ? fraTema : andre(Object.keys(TING)));
      // r: 0 terning · 1 temaets ting · 2 en anden ting (begge i rækker af 5 — én lang linje gjorde alle kort små) · 3 klodser (tal i fakta — de siges aldrig)
      // 7–10 er to terninger side om side, fem og resten (som udenforSum): de to på én tegning blev det mindste kort, med
      // øjne på 7–9 px på en iPhone (ui-review 21-10-2026)
      const terning = (x) => ({ t: 'ting', e: terningTegn(x), n: 1, taelbar: false });
      const kortAf = (r, k) => ({
        dele: r === 0 ? (k > 6 ? [terning(5), terning(k - 5)] : [terning(k)]) : [r === 3 ? { t: 'klodser', a: k, b: 0 }
          : { t: 'ting', e: (r === 1 ? t1 : t2).e, n: k }],
        navn: r === 0 ? (k > 6 ? 'terningerne med ' : 'terningen med ') + k : r === 3 ? (k === 1 ? 'en klods' : k + ' klodser') : antalOrd(k, r === 1 ? t1 : t2),
        fakta: { r: r, n: k },
      });
      const ulige = heltal(rng, 0, 3);
      const u = udenforKort(rng, kortAf(ulige, anden), [0, 1, 2, 3].filter((r) => r !== ulige).map((r) => kortAf(r, n)), (k) => 'Her er ' + k.fakta.n + '.');
      return {
        emne: 'taelle', type: 'udenforAntal', niveau, noegle: 'udenforAntal:' + n + '|' + ulige + '>' + anden, ikon: '🔎',
        tale: 'Tre af kortene har lige mange. Hvilket kort passer ikke ind?',
        tekst: 'Hvem passer ikke ind?',
        vis: { art: 'lyt', fakta: { ens: n, ulige: anden } },
        svar: u.svar, valg: u.valg, kort: u.kort, valgArt: 'scene',
        hjaelp: u.hjaelp,
      };
    },
    // Plusbjerget: tre kort har lige mange i alt (trin 1: to bunker ting, i alt 4–5 · trin 2: to terninger, i alt 6–9)
    udenforSum(niveau, rng, tingListe) {
      return udenforSumOpgave(niveau, rng, tingListe, {
        emne: 'plus10', type: 'udenforSum', fra: niveau >= 2 ? 6 : 4, til: niveau >= 2 ? 9 : 5, max: niveau >= 2 ? 10 : 5, terninger: niveau >= 2,
        tale: 'Tre af kortene har lige mange i alt. Hvilket kort passer ikke ind?',
      });
    },
    // Venneøen: tre kort er 5'er-venner (to terninger med 5 i alt) — det ene har kun 4
    udenforVen(niveau, rng) {
      return udenforSumOpgave(niveau, rng, null, {
        emne: 'venner', type: 'udenforVen', fra: 5, til: 5, max: 5, terninger: true,
        tale: "Tre af kortene er 5'er-venner. Hvilket kort passer ikke ind?",
      });
    },
    // Tælleskoven: terninger, der går én op — hvilken terning mangler i hullet?
    manglerOp(niveau, rng) {
      return manglerRaekke(niveau, rng, { emne: 'taelle', type: 'manglerOp', trin: 1, max: 6, laengde: [4, 5], tale: 'Der kommer én mere hver gang. Hvilken terning mangler?' });
    },
    // Minusbjerget: terninger, der går én ned
    manglerNed(niveau, rng) {
      return manglerRaekke(niveau, rng, { emne: 'minus', type: 'manglerNed', trin: -1, max: 5, laengde: [3, 5], tale: 'Der bliver én mindre hver gang. Hvilken terning mangler?' });
    },
    // Formbyen: figurer i et mønster med et hul (aldrig i den første pakke — hjælpen viser den). Trin 1: AB (to figurer i
    // to farver) · trin 2: også AAB, ABB og ABC, og et fejlkort med den rigtige figur i en anden farve. Farverne er rød,
    // blå og gul — aldrig rød og grøn sammen
    formRaekke(niveau, rng) {
      const t = niveau >= 2 ? vaelg(rng, ['AB', 'AAB', 'ABB', 'ABC']) : 'AB';
      const former = bland(rng, FORMER_PR_NIVEAU[niveau] || FORMER_PR_NIVEAU[2]).slice(0, 3);
      const farver = bland(rng, [0, 1, 2]);
      const enhed = t.split('').map((c) => ({ form: former['ABC'.indexOf(c)], farve: farver['ABC'.indexOf(c)] }));
      const raekke = [].concat(enhed, enhed, enhed).slice(0, 6);
      const hul = heltal(rng, enhed.length, raekke.length - 1);
      const facit = raekke[hul];
      const ens = (a, b) => a.form === b.form && a.farve === b.farve;
      // «den røde cirkel» · «det røde kvadrat» (kønnet efter FORMER's ubestemte form)
      const kortAf = (b) => {
        const [kaen, ord] = FORMER[b.form].ubestemt.split(' ');
        return { dele: [{ t: 'form', form: b.form, farve: b.farve }], navn: (kaen === 'et' ? 'det ' : 'den ') + FORM_FARVE_ORD[b.farve] + ' ' + ord, fakta: { form: b.form, farve: b.farve } };
      };
      // Fejl: en anden figur fra mønstret · (trin 2) den rigtige figur i en anden farve (helst en, mønstret ikke bruger)
      const fejl = bland(rng, enhed.filter((b, i) => !ens(b, facit) && enhed.findIndex((x) => ens(x, b)) === i));
      if (niveau >= 2) {
        const fri = [0, 1, 2].filter((f) => f !== facit.farve && !enhed.some((b) => b.farve === f));
        fejl.splice(1, 0, { form: facit.form, farve: fri.length ? fri[0] : vaelg(rng, [0, 1, 2].filter((f) => f !== facit.farve)) });
      }
      const kort = lavKort(rng, kortAf(facit), fejl.map(kortAf), antalValg(niveau));
      return {
        emne: 'former', type: 'formRaekke', niveau, noegle: 'formRaekke:' + enhed.map((b) => b.form + b.farve).join('-') + ':' + hul, ikon: '❔',
        tale: 'Hvilken figur mangler i mønstret?',
        tekst: 'Hvad mangler?',
        // Hver gentagelse er én gruppe uden ramme: en smal skærm bryder kun rækken mellem gentagelserne (to og to skjulte
        // et mønster på tre på en iPhone), og hjælpen lyser hele gentagelsen op. gentagelse: tæt inde i den og bred luft
        // til den næste (app.css), så «■ ● ? ●» læses som to gentagelser
        vis: { art: 'scene', fakta: { pakke: enhed.length, hul: hul }, dele: Array.from({ length: raekke.length / enhed.length }, (_, u) => ({
          t: 'gruppe', id: 'u' + u, ramme: 'ingen', gentagelse: true, dele: enhed.map((_, j) => u * enhed.length + j).map((i) => (i === hul ? { t: 'tal', s: '?', id: 'hul' }
            : { t: 'form', form: raekke[i].form, farve: raekke[i].farve })) })) },
        svar: kort.svar, valg: kort.valg, kort: kort.kort, valgArt: 'scene',
        // Andet trin lyser gentagelsen med hullet — ikke bare den næste (ui-review 21-10-2026: hullet i u2 lyste aldrig)
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Se på de første ' + enhed.length + '.', lys: ['u0'] }, { tale: 'Så kommer de samme igen.', lys: ['u' + Math.floor(hul / enhed.length)] }] }],
      };
    },
  };

  // ---------- Variation (20-10-2026): hjælperne til «Hvem passer ikke ind?» og «Hvad mangler?» ----------
  // De nye typer (test, tale-tekster.js) · de fire-kort-typer («Hvem passer ikke ind?» har altid fire kort)
  const VARIATION_TYPER = ['udenforAntal', 'udenforSum', 'udenforVen', 'manglerOp', 'manglerNed', 'formRaekke'];
  const UDENFOR_TYPER = ['udenforAntal', 'udenforSum', 'udenforVen'];
  const FORM_FARVE_ORD = ['røde', 'blå', 'gule']; // --form-0, --form-1, --form-2 i app.css
  // Et tal som tastetegn (5️⃣, 🔟): app.js tegner det som terningbilleder (talBillede) — også i ældre udgaver af spillet
  function terningTegn(n) { return n === 10 ? String.fromCodePoint(0x1F51F) : String.fromCodePoint(48 + n, 0xFE0F, 0x20E3); }
  // Fire kort (det ene + tre ens), blandet. Hvert korts indhold får en usynlig ramme med id'et k-<kort>, så hjælpen kan
  // lyse kortene ét ad gangen og sige, hvad der er på dem (sig(kort) → sætningen)
  function udenforKort(rng, ulige, ens, sig) {
    const k = lavKort(rng, ulige, ens, 4);
    k.valg.forEach((id) => { k.kort[id].dele = [{ t: 'gruppe', id: 'k-' + id, ramme: 'ingen', dele: k.kort[id].dele }]; });
    return { kort: k.kort, valg: k.valg, svar: k.svar, hjaelp: [{ art: 'lys', trin: k.valg.map((id) => ({ tale: sig(k.kort[id]), lys: ['k-' + id] })) }] };
  }
  // Tre kort med samme sum (forskellige opdelinger), det ene med én for meget eller én for lidt — helst med en del, der også
  // står på et af de andre kort (den typiske fejl: «der er jo også 3 på det»). s: emne, type, fra/til (summen), max (det
  // største tal på trinnet), terninger (ellers to bunker af temaets ting) og tale.
  function udenforSumOpgave(niveau, rng, tingListe, s) {
    const sum = heltal(rng, s.fra, s.til);
    const delMax = s.terninger ? 6 : 9;
    const opdel = (x) => { const ud = []; for (let a = 1; a < x; a++) if (a <= delMax && x - a <= delMax) ud.push([a, x - a]); return ud; };
    const ens = bland(rng, opdel(sum)).slice(0, 3);
    const anden = vaelg(rng, [sum - 1, sum + 1].filter((x) => x >= 3 && x <= s.max));
    const muligt = opdel(anden);
    const naer = muligt.filter(([a, b]) => ens.some(([x, y]) => x === a || y === b));
    const ulige = vaelg(rng, naer.length ? naer : muligt);
    const { ting } = vaelgTing(rng, tingListe);
    const bunke = (n) => (s.terninger ? { t: 'ting', e: terningTegn(n), n: 1, taelbar: false } : { t: 'ting', e: ting.e, n: n });
    const kortAf = ([a, b]) => ({ dele: [bunke(a), { t: 'tegn', s: '+' }, bunke(b)], navn: a + ' og ' + b, fakta: { a: a, b: b } });
    const u = udenforKort(rng, kortAf(ulige), ens.map(kortAf), (k) => k.fakta.a + ' og ' + k.fakta.b + ' er ' + (k.fakta.a + k.fakta.b) + '.');
    return {
      emne: s.emne, type: s.type, niveau, noegle: s.type + ':' + sum + '|' + ens.map((p) => p.join('+')).sort().join(',') + '>' + ulige.join('+'), ikon: '🔎',
      tale: s.tale,
      tekst: 'Hvem passer ikke ind?',
      vis: { art: 'lyt', fakta: { sum: sum, ulige: anden } },
      svar: u.svar, valg: u.valg, kort: u.kort, valgArt: 'scene',
      hjaelp: u.hjaelp,
    };
  }
  // «Hvad mangler?» i en række terninger, der går én op eller én ned. Hullet er aldrig det første (hjælpen tæller frem til
  // hullet: «1. 2. Og så?»). Fejlkortene er naboerne — tal, der også står i rækken. s: emne, type, trin (+1/−1), max,
  // laengde [fra, til] og tale.
  function manglerRaekke(niveau, rng, s) {
    const L = heltal(rng, s.laengde[0], s.laengde[1]);
    const foerste = s.trin > 0 ? heltal(rng, 1, s.max - L + 1) : heltal(rng, L, s.max);
    const tal = Array.from({ length: L }, (_, i) => foerste + i * s.trin);
    const hul = heltal(rng, 1, L - 1);
    const svar = tal[hul];
    const terning = (n) => ({ t: 'ting', e: terningTegn(n), n: 1, taelbar: false });
    const kortAf = (n) => ({ dele: [terning(n)], navn: 'terningen med ' + n, fakta: { n: n } });
    const naboer = bland(rng, [svar - 1, svar + 1]).concat([svar + 2, svar - 2]).filter((n) => n >= 1 && n <= s.max);
    const kort = lavKort(rng, kortAf(svar), naboer.map(kortAf), antalValg(niveau));
    return {
      emne: s.emne, type: s.type, niveau, noegle: s.type + ':' + tal.join('-') + ':' + hul, ikon: '❔',
      tale: s.tale,
      tekst: 'Hvad mangler?',
      vis: { art: 'scene', fakta: { start: foerste, trin: s.trin, laengde: L, hul: hul },
        dele: tal.map((n, i) => (i === hul ? { t: 'tal', s: '?', id: 'hul' } : Object.assign({ id: 't' + i }, terning(n)))) },
      svar: kort.svar, valg: kort.valg, kort: kort.kort, valgArt: 'scene',
      hjaelp: [{ art: 'lys', trin: tal.slice(0, hul).map((n, i) => ({ tale: n + '.', lys: ['t' + i] })).concat([{ tale: 'Og så?', lys: ['hul'] }]) }],
    };
  }

  // ---------- C · minispil: data og rene kontrolfunktioner (docs/MINISPIL.md) ----------
  // Frøposten: dyrene, der bestiller. billede = tegningen i grafik.js (Grafik.minispil), ellers emojien.
  const FROE_DYR = [
    { id: 'mus', e: '🐭', bestemt: 'musen', billede: 'seedPostMouse' }, { id: 'egern', e: '🐿️', bestemt: 'egernet' },
    { id: 'fugl', e: '🐦', bestemt: 'fuglen' }, { id: 'pindsvin', e: '🦔', bestemt: 'pindsvinet' },
  ];
  const KURV_MAX = 20; // kurven rummer to rækker à ti
  // Et tryk på ➕ eller ➖ (eller en piletast). Aldrig under nul, aldrig over KURV_MAX.
  function froeTryk(antal, handling) {
    if (handling === 'tilfoej') return Math.min(KURV_MAX, antal + 1);
    if (handling === 'fjern') return Math.max(0, antal - 1);
    return antal;
  }
  // «Færdig»: er der præcis det bestilte antal i kurven? (En fejl tømmer ikke kurven — barnet retter videre.)
  const froePasser = (vis, antal) => Number.isInteger(antal) && antal === vis.maal;
  // Skovbroen: passer brikken? fast + brik skal nå målet (broens længde — på trin 3 tiermærket)
  const broPasser = (fast, brik, maal) => Number.isInteger(brik) && brik >= 1 && fast + brik === maal;

  // Skyggeatelieret: hjørnet med den rette vinkel ↔ drejning (med uret) af GRAFIK-C's shadowHalfSquare (ret vinkel 'sv')
  const HJOERNE_DREJ = { sv: 0, nv: 90, no: 180, so: 270 };
  const MODSAT_HJOERNE = { nv: 'so', so: 'nv', no: 'sv', sv: 'no' };
  const HJOERNE_ORD = { nv: 'oppe til venstre', no: 'oppe til højre', sv: 'nede til venstre', so: 'nede til højre' };
  const SKYGGE_FEJL = { trekant: ['rektangel', 'cirkel'], rektangel: ['kvadrat', 'trekant'], kvadrat: ['rektangel', 'cirkel'] };
  const SKYGGE_BESKRIV = {
    cirkel: 'Skyggen er rund hele vejen rundt. Den har ingen hjørner.', trekant: 'Skyggen har tre hjørner.',
    kvadrat: 'Skyggen har fire hjørner, og alle siderne er lige lange.', rektangel: 'Skyggen har fire hjørner og er aflang.',
  };
  // Den mindste drejning, der giver samme figur (trekanten i GRAFIK-C er ligebenet — kun en hel omgang)
  const SYMMETRI = { kvadrat: 90, rektangel: 180, trekant: 360 };
  // Dækker figuren skyggen, når den er drejet drej grader? Samme form og samme drejning (op til figurens symmetri)
  function skyggeDaekker(skygge, form, drej) {
    if (!skygge || form !== skygge.form || !Number.isFinite(drej)) return false;
    if (form === 'cirkel') return true;
    const s = SYMMETRI[form] || 360;
    return (((drej - (skygge.drej || 0)) % s) + s) % s === 0;
  }
  // Trin 3: danner de to trekanter kvadratet? Samme trekant, den ene drejet en halv omgang i forhold til den anden
  function halvdelePasser(fast, brik) {
    if (!fast || !brik || fast.form !== 'trekant' || brik.form !== 'trekant' || fast.b !== brik.b || fast.h !== brik.h) return false;
    if (!(fast.hjoerne in HJOERNE_DREJ) || !(brik.hjoerne in HJOERNE_DREJ)) return false;
    return (HJOERNE_DREJ[brik.hjoerne] - HJOERNE_DREJ[fast.hjoerne] + 360) % 360 === 180;
  }
  // Urværkstedet: visernes vinkel med uret fra 12 (GRAFIK-C: minutviser 6 × minutter, timeviser 30 × timer + ½ × minutter)
  function urVinkler(klokke) {
    const [t, m] = String(klokke).split(':').map(Number);
    return { time: 30 * (t % 12) + 0.5 * m, minut: 6 * m };
  }
  // Tæller opgaven med i statistik og sværhedsgrad? Nej, når bedoemmes er false (Spor i sandet, Find parret) — runden spørger her
  const taellerMed = (opg) => !!opg && opg.bedoemmes !== false;

  // De otte minispil: hvor de skal kobles på (kobling[trin − 1] = [emne, niveau]), og om de kun kan løses ved at høre.
  // Regnespillene ligger i G her, de danske i Dansk.GEN. 'historie' er Historiebogens 🤔-runde (Dansk.HISTORIE_QUIZ).
  const MINISPIL = [
    { id: 'froePost', navn: 'Frøposten', fag: 'matematik', kobling: [['taelle', 1], ['taelle', 2], ['taelle', 3]], lyt: false },
    { id: 'skovBro', navn: 'Skovbroen', fag: 'matematik', kobling: [['venner', 1], ['venner', 2], ['tierbro', 3]], lyt: false },
    { id: 'skyggeAtelier', navn: 'Skyggeatelieret', fag: 'matematik', kobling: [['former', 1], ['former', 2], ['former', 3]], lyt: false },
    { id: 'urVaerksted', navn: 'Urværkstedet', fag: 'matematik', kobling: [['maaling', 1], ['maaling', 2], ['maaling', 3]], lyt: true },
    { id: 'lydTog', navn: 'Lydtoget', fag: 'dansk', kobling: [['lydering', 1], ['lydering', 2], ['lydering', 3]], lyt: true },
    { id: 'rimHave', navn: 'Rimhaven', fag: 'dansk', kobling: [['rim', 1], ['rim', 2], ['rim', 3]], lyt: true },
    { id: 'sporISandet', navn: 'Spor i sandet', fag: 'dansk', kobling: [['alfabet', 1], ['alfabet', 2], ['alfabet', 3]], lyt: false, bedoemmes: false },
    { id: 'fortaelleBro', navn: 'Fortællebroen', fag: 'dansk', kobling: [['historie', 1], ['historie', 2], ['historie', 3]], lyt: true },
  ];

  const ORDENSTAL = ['nulte', 'første', 'anden', 'tredje', 'fjerde', 'femte', 'sjette', 'syvende', 'ottende'];

  const stort = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  // Spejl: emoji, der tydeligt vender til én side (en spejling kan ses)
  const SPEJL_MOTIVER = ['🐌', '🐟', '🚗', '🦆', '🐕', '🐎', '🚂', '🐦', '🐢', '🦒', '🐘', '🦕', '🛴', '👟', '🐓', '🐇'];
  const TABEL_DYR = [{ e: '🦊', bestemt: 'ræven' }, { e: '🦉', bestemt: 'uglen' }, { e: '🐻', bestemt: 'bjørnen' }, { e: '🐰', bestemt: 'kaninen' }];

  // Lystårnets egne opgaver: hver tæller i et eksisterende emne (intet nyt felt i de gemte data) og kommer kun
  // med i Lystårnets blandede runde — fra emnets niveau 'fra' og op.
  const LYSTAARN_TYPER = [
    { type: 'formOgAntal', emne: 'former', fra: 1 },
    { type: 'tabelPlus', emne: 'plus10', fra: 2 },
    { type: 'toTrin', emne: 'tierbro', fra: 3 },
  ];

  // ---------- Emner og niveauer (i bogens rækkefølge) ----------
  // typer[0] er den letteste på niveauet — runden starter altid med den (succes fra start)
  const EMNER = {
    taelle: {
      navn: 'Tal til 20', omraade: 'Tal og algebra', maxNiveau: 3,
      niveauer: {
        1: ['antal', 'terning', 'flest', 'findTal', 'flytTing', 'udenforAntal', 'manglerOp', 'froePost'],
        2: ['antal', 'klodser', 'efter', 'findTal', 'ligeUlige', 'flest', 'flytTing', 'fordelBaer', 'udenforAntal', 'froePost'],
        3: ['klodser', 'streger', 'efter', 'foer', 'findTal', 'ligeUlige', 'stoerst', 'koePlads', 'froePost'],
      },
    },
    former: {
      navn: 'Figurer', omraade: 'Geometri og måling', maxNiveau: 3,
      niveauer: {
        1: ['findForm', 'formScene', 'brikPuslespil', 'formRaekke', 'skyggeAtelier'],
        2: ['findForm', 'hjoerner', 'kanter', 'formScene', 'brikPuslespil', 'spejlBillede', 'formRaekke', 'skyggeAtelier'],
        3: ['findForm', 'hjoerner', 'kanter', 'formScene', 'toRegler', 'skyggeAtelier'],
      },
    },
    tegne: {
      navn: 'Tegn og mål', omraade: 'Geometri og måling', maxNiveau: 3,
      niveauer: {
        1: ['maalKlodser', 'tegnFigur', 'maalStreg', 'tegnRute'],
        2: ['maalKlodser', 'tegnFigur', 'maalStreg', 'tegnStreg', 'tegnRute', 'linealNul'],
        3: ['tegnFigur', 'maalStreg', 'tegnStreg', 'retVej'],
      },
    },
    plus10: {
      navn: 'Plus til 10', omraade: 'Tal og algebra', maxNiveau: 3,
      niveauer: {
        1: ['plusTing', 'plusFingre', 'plusTerning', 'treKurve', 'udenforSum'],
        2: ['plusTing', 'plusFingre', 'plusTerning', 'plusKlodser', 'plusTal', 'treKurve', 'sammeSum', 'udenforSum'],
        3: ['plusKlodser', 'plusTal', 'plusTalTast', 'plusMangler', 'regneHistorie'],
      },
    },
    venner: {
      navn: "5'er- og 10'er-venner", omraade: 'Tal og algebra', maxNiveau: 3,
      niveauer: {
        1: ['venFingre', 'venTal', 'retVenner', 'udenforVen', 'skovBro'],
        2: ['venKugle', 'venTal', 'retVenner', 'flytVen', 'skovBro'],
        3: ['venKugle', 'venTal', 'venTalTast', 'treVenner'],
      },
    },
    minus: {
      navn: 'Minus og forskel', omraade: 'Tal og algebra', maxNiveau: 3,
      niveauer: {
        1: ['minusTing', 'minusKlodser', 'hvorMangeVaek', 'manglerNed'],
        2: ['minusTing', 'minusKlodser', 'forskel', 'minusTal', 'hvorMangeVaek', 'sammeForskel'],
        3: ['minusKlodser', 'forskel', 'minusTal', 'minusTalTast', 'sammeRest'],
      },
    },
    tiere: {
      navn: 'Tiere og enere', omraade: 'Tal og algebra', maxNiveau: 3,
      niveauer: {
        1: ['staenger', 'tiere', 'byt10'],
        2: ['staenger', 'tiere', 'efter50', 'byt10', 'talIInterval'],
        3: ['staenger', 'efter50', 'foer50', 'findTal50', 'enerTilTier'],
      },
    },
    tierbro: {
      navn: 'Plus og minus til 20', omraade: 'Tal og algebra', maxNiveau: 3,
      niveauer: {
        1: ['tiPlus', 'dobbelt', 'naestenDobbelt'],
        2: ['tiPlus', 'dobbelt', 'overTi', 'naestenDobbelt', 'delTilTi'],
        3: ['overTi', 'overTiTast', 'minusTi', 'dobbelt', 'tilbageHistorie', 'skovBro'],
      },
    },
    moenstre: {
      navn: 'Mønstre og talrækker', omraade: 'Tal og algebra', maxNiveau: 3,
      niveauer: {
        1: ['moenster', 'gentagPakke'],
        2: ['moenster', 'talRaekke', 'gentagPakke', 'bevaegelsesKode'],
        3: ['talRaekke', 'moenster', 'skiftendeHop'],
      },
    },
    // Ekstra: klokken hel og halv (niveau 3: også kvart over og kvart i), kroner til 20 (Fælles Mål: måling — tid og penge)
    maaling: {
      navn: 'Klokken og penge', omraade: 'Måling', maxNiveau: 3,
      niveauer: {
        1: ['klokkeLaes', 'moenter', 'klokkeFind', 'betalPrecis', 'urDigital', 'urVaerksted'],
        2: ['klokkeLaes', 'klokkeFind', 'moenter', 'byttepenge', 'betalPrecis', 'urDigital', 'bytMoent', 'urVaerksted'],
        3: ['klokkeLaes', 'byttepenge', 'moenter', 'klokkeFind', 'klokkeStil', 'urDigital', 'klokke5', 'tidFrem', 'toKoeb', 'urVaerksted'],
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

  // ---------- Fast pulje (Piper-stemmen, Jimmy 12-10-2026) ----------
  // Hver opgave trækkes fra en fast pulje på PULJE stk. pr. type og trin (og tema, fordi tingene skifter). Så er alle
  // sætninger kendte på forhånd og kan laves som lydfiler med Piper (vaerktoej/lav-tale.js). rng vælger nummeret i
  // puljen; opgaven laves med sit eget frø, så samme nummer altid giver samme opgave. Hæves PULJE, skal lyden laves igen.
  const PULJE = 100;
  function puljeFroe(navn, niveau, k) {
    let h = 2166136261; // FNV-1a
    const s = navn + '|' + niveau + '|' + k;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) || 1;
  }
  const puljeNr = (rng) => 1 + Math.floor(rng() * PULJE);
  function puljeOpgave(type, niveau, rng, tingListe) {
    return lavOpgave(type, niveau, lavRng(puljeFroe(type, niveau, puljeNr(rng))), tingListe);
  }

  // En runde = 5 korte opgaver. Svære opgaver fra sidst (gentag) sættes ind på plads 3 og 4.
  // Opgaver, der kun kan løses ved at høre oplæsningen
  const LYT_TYPER = ['findTal', 'findTal50', 'findForm', 'klokkeFind', 'klokkeStil', 'urVaerksted']; // C: Urværkstedet høres
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
      const o = puljeOpgave(type, niveau, rng, opts.ting);
      if (brugte[o.noegle] && forsoeg < 400) continue;
      brugte[o.noegle] = true;
      runde.push(o);
    }
    // Lystårnets egne opgaver kommer kun igen i Lystårnet — ikke i deres emnes egen verden (review #4)
    const gentag = (opts.gentag || []).filter((o) => o && o.emne === emneId && G[o.type] && Array.isArray(o.hjaelp) && !brugte[o.noegle] && !(opts.udenLyt && LYT_TYPER.indexOf(o.type) >= 0) &&
      !LYSTAARN_TYPER.some((l) => l.type === o.type)).slice(0, 2);
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
      // Lystårnets egne opgaver tæller i emnet, de hører til — så hvert emne stadig kun kommer med én gang pr. omgang
      const egne = LYSTAARN_TYPER.filter((l) => l.emne === e && n >= l.fra).map((l) => l.type);
      const typer = brugbareTyper(EMNER[e].niveauer[n].concat(egne), opts);
      const o = puljeOpgave(vaelg(rng, typer), n, rng, opts.ting);
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
  // fundet (valgfri, data.maerker: id → antal): det første dyr i den faste rækkefølge, barnet har færrest af. Har barnet
  // fået dyrene i rækkefølge, er det præcis pulje[nr % længde] som før. Skifter vennens emoji (fase A, 10-10: Bobo 🦕 → 🐢,
  // Rosa 👸 → Fnug 🦉), flytter puljen sig — så sørger antallene for, at et fundet dyr ikke kommer igen før de andre.
  function maerkeForRunde(samling, nr, undgaaEmoji, fundet) {
    const pulje = (MAERKER[samling] || MAERKER.jungle).filter((m) => m.e !== undgaaEmoji);
    const n = Math.max(0, Math.floor(Number(nr) || 0));
    if (!fundet || typeof fundet !== 'object') return pulje[n % pulje.length];
    const antal = (m) => Math.max(0, Math.floor(Number(fundet[m.id]) || 0));
    const faerrest = Math.min.apply(null, pulje.map(antal));
    return pulje.find((m) => antal(m) === faerrest);
  }

  // ---------- Vennebogen: nye venner låses op med lysperlerne (Jimmy 14-10-2026) ----------
  // Tegningerne er 0. klasse-udgaven fra Codex' «Lystårnet-univers» (grafik.univers). Vennerne kommer én ad gangen i en
  // fast rækkefølge, når barnets lysperler (data.perler: én pr. mission i eventyret) når grænsen. Ingen nye felter i de
  // gemte data: oplåsningen regnes ud af perlerne, og data.figur må være en af vennerne. Hver ven koster én perle mere
  // end den forrige (3, 6, 10, 15 … 78), så den første kommer på den første spilledag, og de sidste tager et par måneder.
  // Rækkefølgen skifter mellem venner, der passer til hvert af de to temaer. e = emojien, hvis grafik.js mangler.
  const NYE_VENNER = [
    { id: 'spire', navn: 'Spire', e: '🌱', perler: 3 },
    { id: 'glimt', navn: 'Glimt', e: '💎', perler: 6 },
    { id: 'tulle', navn: 'Tulle', e: '🐌', perler: 10 },
    { id: 'puf', navn: 'Puf', e: '⛅', perler: 15 },
    { id: 'bolt', navn: 'Bolt', e: '🤖', perler: 21 },
    { id: 'plask', navn: 'Plask', e: '💧', perler: 28 },
    { id: 'nova', navn: 'Nova', e: '🌟', perler: 36 },
    { id: 'kroelle', navn: 'Krølle', e: '🌀', perler: 45 },
    { id: 'klik', navn: 'Klik', e: '📷', perler: 55 },
    { id: 'zuzu', navn: 'Zuzu', e: '👽', perler: 66 },
    { id: 'bobli', navn: 'Bobli', e: '👾', perler: 78 },
  ];
  const perleTal = (p) => Math.max(0, Math.floor(Number(p) || 0));
  // De nye venner, barnet har låst op (id'er i rækkefølgen)
  function oplaasteVenner(perler) {
    const p = perleTal(perler);
    return NYE_VENNER.filter((v) => p >= v.perler).map((v) => v.id);
  }
  // Den næste ven, der venter: { id, navn, perler (grænsen), fra (den forriges grænse), mangler } — null, når alle er her
  function naesteVen(perler) {
    const p = perleTal(perler);
    const i = NYE_VENNER.findIndex((v) => p < v.perler);
    if (i < 0) return null;
    const v = NYE_VENNER[i];
    return { id: v.id, navn: v.navn, perler: v.perler, fra: i ? NYE_VENNER[i - 1].perler : 0, mangler: v.perler - p };
  }
  // Vennen, som netop denne perle låste op (perlerne gik fra foer til efter), ellers null
  function nyVen(foer, efter) {
    const a = perleTal(foer), b = perleTal(efter);
    return NYE_VENNER.find((v) => a < v.perler && b >= v.perler) || null;
  }
  // Er id en ny ven, som perlerne ikke har låst op endnu? (rejsevennerne og ukendte id'er er aldrig låst)
  function venLaast(id, perler) {
    const v = NYE_VENNER.find((x) => x.id === id);
    return !!v && perleTal(perler) < v.perler;
  }
  // Barnets rejseven ud fra de gemte data: data.figur, hvis spillet kender id'et (kendte) og vennen er låst op — ellers
  // standard (temaets første ven). Et ukendt eller låst id i data.figur bliver stående (gem.js) og falder kun tilbage her.
  function valgtVen(figur, perler, kendte, standard) {
    return typeof figur === 'string' && (kendte || []).indexOf(figur) >= 0 && !venLaast(figur, perler) ? figur : standard;
  }

  // ---------- Til voksenoverblikket: «hvad driller» i almindelige ord ----------
  function beskrivNoegle(noegle) {
    const [art, rest] = String(noegle).split(/:(.*)/s);
    const r = rest || '';
    const medHul = (x) => { const [tal, hul] = x.split(':'); return tal.split('-').map((n, i) => (i === Number(hul) ? '?' : n)).join(', '); };
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
      klokkeStil: () => 'Stille uret på ' + klokkeNavn(r),
      moenter: () => 'Tælle mønter: ' + r.split('+').join(' + ') + ' kr',
      bytte: () => 'Byttepenge: ' + r.replace('-', ' kr − ') + ' kr',
      flytTing: () => 'Lige mange, når ' + r + ' ting flytter sig',
      brikPuslespil: () => 'Finde brikken, der passer i hullet',
      tegnRute: () => 'Tegne en vej efter en opskrift',
      treKurve: () => 'Tre leverancer: ' + r.split('+').join(' + '),
      retVenner: () => 'Rette vennerne: ' + r.split('/')[0].split('+')[0] + ' + ? = ' + r.split('/')[1],
      hvorMangeVaek: () => 'Hvor mange gik væk: ' + r.replace('-', ' → '),
      byt10: () => 'Bytte ti enere til en tier',
      naestenDobbelt: () => 'Næsten dobbelt: ' + r.replace('+', ' + '),
      gentagPakke: () => 'Finde det, der gentages i et mønster',
      betalPrecis: () => 'Betale præcis med ' + r.split('+').join(' kr + ') + ' kr',
      urDigital: () => 'Digitalt ur → ur med visere: ' + r,
      klokke5: () => 'Aflæse klokken ' + klokkeNavn(r),
      formOgAntal: () => 'Form og antal på én gang',
      fordelBaer: () => 'Fordele: ' + r.replace('-', ' bær, ') + ' skåle — hvor mange tilbage',
      spejlBillede: () => 'Finde spejlbilledet',
      linealNul: () => 'Lægge linealen rigtigt (nul ved starten)',
      sammeSum: () => 'Samme antal, delt anderledes: ' + r.replace('=', ' = ').split('+').join(' + '),
      flytVen: () => 'Flytte mellem venner: ' + r.split('>')[0].replace('+', ' + '),
      sammeForskel: () => 'Samme forskel, når begge tårne mister lige mange',
      talIInterval: () => 'Hvilket interval ' + r + ' ligger i',
      delTilTi: () => 'Dele op til ti: ' + r.replace('+', ' + '),
      bevaegelsesKode: () => 'Oversætte figurer til bevægelser',
      bytMoent: () => 'Bytte ' + r.split(':')[0] + ' kr til mindre mønter',
      tabelPlus: () => 'Læse en billedtabel: ' + r.replace('+', ' + '),
      koePlads: () => 'Finde nummer ' + r.split('-')[1].replace(/\D/g, '') + ' i en kø fra flaget',
      toRegler: () => 'To regler på én gang: ' + r.replace('-', ' og '),
      retVej: () => 'Rette en knækket vej ud: ' + r.replace('+', ' + '),
      regneHistorie: () => 'Finde historien til ' + r.replace('+', ' + '),
      treVenner: () => 'Dele ti mellem tre: ' + r.replace('+', ' + ') + ' + ?',
      sammeRest: () => 'Samme rest: ' + r.split('=')[0].replace('-', ' − '),
      enerTilTier: () => r + ' − 1 + 10',
      tilbageHistorie: () => 'Returhistorie: ' + r.replace('+', ' + '),
      skiftendeHop: () => 'Skiftende hop fra ' + r.split(':')[0],
      tidFrem: () => 'Tiden frem: ' + r.replace('+', ' + ') + ' min',
      toKoeb: () => 'To køb for ' + r.split('-')[0] + ' kr',
      toTrin: () => 'To trin: ' + r.replace('+', ' + ').replace('-', ' − '),
      // C · minispil
      froePost: () => 'Frøposten: ' + r.replace('>', ' frø → ') + ' frø',
      skovBro: () => 'Skovbroen: ' + r.replace('+', ' + ').replace('=', ' = '),
      skyggeAtelier: () => 'Skyggeatelieret: ' + (/^halv-/.test(r) ? 'to trekanter bliver et kvadrat' : (FORMER[r.split('@')[0]] ? FORMER[r.split('@')[0]].ubestemt : r) + (r.indexOf('@') >= 0 ? ', drejet' : '')),
      urVaerksted: () => 'Urværkstedet: ' + (/\+30$/.test(r) ? 'en halv time efter ' + klokkeNavn(r.replace('+30', '')) : 'stille uret på ' + klokkeNavn(r)),
      // Variation (20-10-2026)
      udenforAntal: () => 'Hvem passer ikke ind: tre kort med ' + r.split('|')[0] + ', ét med ' + r.split('>')[1],
      udenforSum: () => 'Hvem passer ikke ind: tre kort med ' + r.split('|')[0] + ' i alt, ét med ' + (r.split('>')[1] || '').replace('+', ' + '),
      udenforVen: () => "Hvem passer ikke ind: 5'er-venner og " + (r.split('>')[1] || '').replace('+', ' + '),
      // Rækken, som barnet ser den: hullet er ?, ikke facit (nøglen er «tal-tal-…:hul»)
      manglerOp: () => 'Hvad mangler: ' + medHul(r) + ' (én mere hver gang)',
      manglerNed: () => 'Hvad mangler: ' + medHul(r) + ' (én mindre hver gang)',
      formRaekke: () => 'Hvad mangler i et mønster af figurer',
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
    maaling: 'Kig på uret sammen ved hele og halve timer: «Nu er klokken halv fem — den store viser peger på 6.» Senere kvart over og kvart i: «Kvart over syv — den store viser peger på 3. Kvart i otte — den peger på 9.» Lad barnet betale med mønter i bageren og tælle byttepengene.',
  };

  const Opgaver = {
    lavRng, heltal, vaelg, bland,
    TING, EMNER, MAERKER, FORMER, FORMER_PR_NIVEAU, MOENSTER_BRIKKER, G,
    antalOrd, antalValg, lavValg, lavValgTrin, lavValgTekst, talForvekslere, LYT_TYPER,
    lavOpgave, lavRunde, lavBlandetRunde, klemNiveau, opdaterNiveau, maerkeForRunde,
    NYE_VENNER, oplaasteVenner, naesteVen, nyVen, venLaast, valgtVen,
    PULJE, puljeFroe, puljeNr, puljeOpgave,
    beskrivNoegle, HJEMME_IDEER, klokkeNavn,
    SOEMBRAET, MAALE_TING, vurderFigur, figurPasser, stregPasser, eksempelFigur,
    lavValgFejl, lavKort, LYSTAARN_TYPER, PUSLESPIL, RETNING, ruteFraOpskrift, rutePasser,
    // C · minispil
    MINISPIL, FROE_DYR, KURV_MAX, froeTryk, froePasser, broPasser, HJOERNE_DREJ, MODSAT_HJOERNE, SYMMETRI,
    skyggeDaekker, halvdelePasser, urVinkler, taellerMed, TAL_ORD, TIME_ORD,
    VARIATION_TYPER, UDENFOR_TYPER, terningTegn, // Variation (20-10-2026)
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Opgaver;
  else root.Opgaver = Opgaver;
})(typeof self !== 'undefined' ? self : this);
