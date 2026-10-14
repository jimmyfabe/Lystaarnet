/* engelsk-opgaver.js — Engelsk for helt nye begyndere (Jimmy 13-10-2026): barnet hører et engelsk ord og trykker på
   billedet. Ingen læsetekst. Fire verdener (farver, tal, dyr, figurer) med 6–10 ord hver.
   To stemmer, aldrig i samme sætning: spørgsmålet og det danske ord siges af den danske stemme (Piper-dansk), det
   engelske ord kun af Piper-filen med den engelske stemme (talefiler.js STEMME_EN) — aldrig af enhedens stemme.
   Rene funktioner uden DOM, så alt kan testes i Node (test/test-engelsk.js). Billederne tegnes i app.js ud fra
   ord.billede: { art: 'farve' | 'tal' | 'dyr' | 'form', … } — kun spillets egne tegninger (grafik.js, formSvg, terninger). */
(function (root) {
  'use strict';

  const O = (typeof module !== 'undefined' && module.exports) ? require('./opgaver.js') : root.Opgaver;
  const { lavRng, vaelg, bland, puljeFroe, puljeNr } = O;

  const stort = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  // Det, stemmerne siger: «Red!» (engelsk) og «Rød.» (dansk) — én sætning hver, så hver har sin egen Piper-fil.
  // Udråbstegn på engelsk: med punktum lagde Cori-stemmen ekstra lyde efter nogle korte ord («Red.» 1–2,7 s mod 0,4 s
  // lyd for «Red!» — målt 13-10-2026, scratchpad/en-proeve3.js)
  const udtaleEn = (o) => stort(o.en) + '!';
  const udtaleDa = (o) => stort(o.da) + '.';

  // ---------- Ordene: [id = engelsk, dansk, billede, nær (let at forveksle)]. De første `kerne` er niveau 1. ----------
  // Rækkefølgen er læringsrækkefølgen. «Nær» er symmetrisk (test) og holdes ude af valgene på niveau 1–2.
  const DYR = (samling, id) => {
    const m = (O.MAERKER[samling] || []).find((x) => x.id === id);
    return { art: 'dyr', tegning: samling + '/' + id, e: m ? m.e : '' };
  };
  const VERDENER = {
    engFarver: {
      navn: 'Farver', type: 'engFarve', ikon: '🎨', kerne: 5,
      spoerg: 'Lyt. Hvilken farve er det?', tekst: 'Hvilken farve hører du?',
      ord: [
        ['red', 'rød', { art: 'farve', farve: 'red' }, ['pink', 'orange']],
        ['blue', 'blå', { art: 'farve', farve: 'blue' }, ['purple']],
        ['yellow', 'gul', { art: 'farve', farve: 'yellow' }, ['orange']],
        ['green', 'grøn', { art: 'farve', farve: 'green' }, []],
        ['black', 'sort', { art: 'farve', farve: 'black' }, ['brown']],
        ['white', 'hvid', { art: 'farve', farve: 'white' }, []],
        ['orange', 'orange', { art: 'farve', farve: 'orange' }, ['red', 'yellow']],
        ['pink', 'lyserød', { art: 'farve', farve: 'pink' }, ['red', 'purple']],
        ['purple', 'lilla', { art: 'farve', farve: 'purple' }, ['blue', 'pink']],
        ['brown', 'brun', { art: 'farve', farve: 'brown' }, ['black']],
      ],
    },
    engTal: {
      navn: 'Tal', type: 'engTal', ikon: '🎲', kerne: 5,
      spoerg: 'Lyt. Hvilket tal er det?', tekst: 'Hvilket tal hører du?',
      ord: [
        ['one', 'en', { art: 'tal', tal: 1 }], ['two', 'to', { art: 'tal', tal: 2 }], ['three', 'tre', { art: 'tal', tal: 3 }],
        ['four', 'fire', { art: 'tal', tal: 4 }], ['five', 'fem', { art: 'tal', tal: 5 }], ['six', 'seks', { art: 'tal', tal: 6 }],
        ['seven', 'syv', { art: 'tal', tal: 7 }], ['eight', 'otte', { art: 'tal', tal: 8 }], ['nine', 'ni', { art: 'tal', tal: 9 }],
        ['ten', 'ti', { art: 'tal', tal: 10 }],
      ].map((o) => o.concat([[]])), // nær: nabotallene (sættes nedenfor)
    },
    engDyr: {
      navn: 'Dyr', type: 'engDyr', ikon: '🐾', kerne: 5,
      spoerg: 'Lyt. Hvilket dyr er det?', tekst: 'Hvilket dyr hører du?',
      // Kun dyr, spillet allerede tegner (samledyrene i grafik.js); emojien er reserven
      ord: [
        ['cat', 'kat', DYR('eventyr', 'kat'), ['dog', 'rabbit', 'lion']],
        ['dog', 'hund', DYR('eventyr', 'hund'), ['cat', 'horse']],
        ['fish', 'fisk', DYR('eventyr', 'fisk'), ['frog']],
        ['pig', 'gris', DYR('eventyr', 'gris'), ['elephant']],
        ['horse', 'hest', DYR('eventyr', 'hest'), ['dog']],
        ['rabbit', 'kanin', DYR('eventyr', 'kanin'), ['cat']],
        ['lion', 'løve', DYR('jungle', 'loeve'), ['cat', 'monkey']],
        ['elephant', 'elefant', DYR('jungle', 'elefant'), ['pig']],
        ['frog', 'frø', DYR('jungle', 'froe'), ['fish']],
        ['monkey', 'abe', DYR('jungle', 'abe'), ['lion']],
      ],
    },
    engFormer: {
      navn: 'Figurer', type: 'engForm', ikon: '🔷', kerne: 4,
      spoerg: 'Lyt. Hvilken figur er det?', tekst: 'Hvilken figur hører du?',
      // form = navnet i app.js' formSvg (FORM_PUNKTER; stjerne og hjerte tegnes også dér)
      ord: [
        ['circle', 'cirkel', { art: 'form', form: 'cirkel' }, ['heart']],
        ['square', 'kvadrat', { art: 'form', form: 'kvadrat' }, ['rectangle']],
        ['triangle', 'trekant', { art: 'form', form: 'trekant' }, ['star']],
        ['star', 'stjerne', { art: 'form', form: 'stjerne' }, ['triangle']],
        ['heart', 'hjerte', { art: 'form', form: 'hjerte' }, ['circle']],
        ['rectangle', 'rektangel', { art: 'form', form: 'rektangel' }, ['square']],
      ],
    },
  };

  // ORD: id → { id, en, da, emne, billede, naer } · VERDENER[emne].ord bliver en liste af id'er
  const ORD = {};
  for (const emne of Object.keys(VERDENER)) {
    const V = VERDENER[emne];
    V.ord = V.ord.map(([en, da, billede, naer]) => {
      ORD[en] = { id: en, en: en, da: da, emne: emne, billede: billede, naer: naer.slice() };
      return en;
    });
  }
  // Tallene: nær = nabotallene
  VERDENER.engTal.ord.forEach((id, i, l) => { ORD[id].naer = [l[i - 1], l[i + 1]].filter(Boolean); });

  // ---------- Opgaven: hør ordet → tryk på billedet ----------
  // Niveau 1: to valg blandt kerneordene · 2: tre valg blandt alle ordene · 3: tre valg, hvoraf ét er «nær»
  // (på niveau 1–2 er der aldrig et nært ord blandt valgene — fx aldrig kvadrat og rektangel sammen).
  const antalValg = (niveau) => (niveau <= 1 ? 2 : 3);
  function hoerOgFind(emne) {
    return function (niveau, rng) {
      const V = VERDENER[emne];
      const pulje = niveau <= 1 ? V.ord.slice(0, V.kerne) : V.ord;
      const id = vaelg(rng, pulje);
      const o = ORD[id];
      const andre = pulje.filter((x) => x !== id);
      const fjerne = bland(rng, andre.filter((x) => o.naer.indexOf(x) < 0));
      const naere = bland(rng, andre.filter((x) => o.naer.indexOf(x) >= 0));
      const forkerte = (niveau >= 3 ? naere.slice(0, 1) : []).concat(fjerne).slice(0, antalValg(niveau) - 1);
      const valg = bland(rng, forkerte.concat([id]));
      return {
        fag: 'engelsk', emne: emne, type: V.type, niveau: niveau, noegle: V.type + ':' + id, ikon: V.ikon,
        tale: V.spoerg,                  // dansk stemme
        lyd: [{ en: udtaleEn(o) }],      // så det engelske ord (kun Piper-filen med den engelske stemme)
        tekst: V.tekst,
        vis: { art: 'engelskLyt', ord: id },
        svar: id, valg: valg, valgArt: 'billede',
        ordEn: udtaleEn(o),              // efter et rigtigt svar: det engelske ord igen …
        ordDa: udtaleDa(o),              // … og så det danske (to ytringer, aldrig i samme sætning)
        // Fejl straffes aldrig: hjælpen viser det rigtige billede og siger ordet på engelsk og dansk
        hjaelp: [{ art: 'visEngelsk' }],
      };
    };
  }
  const GEN = {};
  for (const emne of Object.keys(VERDENER)) GEN[VERDENER[emne].type] = hoerOgFind(emne);

  // Emner (verdener) og niveauer — samme form som opgaver.js/dansk-opgaver.js, så rundemotoren og gem.js kan bruge dem
  const EMNER = {};
  for (const emne of Object.keys(VERDENER)) {
    const t = VERDENER[emne].type;
    EMNER[emne] = { navn: VERDENER[emne].navn, maxNiveau: 3, niveauer: { 1: [t], 2: [t], 3: [t] } };
  }

  function lavOpgave(type, niveau, rng) { return GEN[type](niveau, rng); }
  // Fast pulje som i opgaver.js (Piper-stemmen): rng vælger nummeret, opgaven laves med sit eget frø
  function puljeOpgave(type, niveau, rng) { return lavOpgave(type, niveau, lavRng(puljeFroe('engelsk:' + type, niveau, puljeNr(rng)))); }

  // En gentagelse passer kun til en runde på samme niveau: samme antal valg, valgene fra niveauets ord (kerneordene på
  // niveau 1) og et «nært» ord kun på niveau 3 — en opgave fra et andet niveau beholder ellers sine gamle valg
  function passerTilNiveau(o, emneId, niveau) {
    const V = VERDENER[emneId];
    const pulje = niveau <= 1 ? V.ord.slice(0, V.kerne) : V.ord;
    if (!Array.isArray(o.valg) || o.valg.length !== antalValg(niveau) || pulje.indexOf(o.svar) < 0) return false;
    if (new Set(o.valg).size !== o.valg.length || o.valg.indexOf(o.svar) < 0 || !o.valg.every((v) => pulje.indexOf(v) >= 0)) return false;
    return niveau >= 3 || !o.valg.some((v) => ORD[o.svar].naer.indexOf(v) >= 0);
  }

  // En runde: forskellige ord, så længe der er nok (niveau 1 har 4–5 ord — så kommer de igen, og det er godt).
  // Svære ord fra sidst (gentag) får plads 3 og 4 fra start, så ordene omkring dem vælges uden om dem:
  // aldrig samme ord to gange i træk — heller ikke ved en gentagelse.
  function lavRunde(emneId, niveau, rng, opts) {
    opts = opts || {};
    const antal = opts.antal || 5;
    niveau = Math.min(EMNER[emneId].maxNiveau, Math.max(1, Math.round(Number(niveau)) || 1));
    const V = VERDENER[emneId];
    const type = EMNER[emneId].niveauer[niveau][0];
    const ordIPuljen = niveau <= 1 ? V.kerne : V.ord.length;
    const brugte = {};
    // Højst to gentagelser med hvert sit ord, kun gyldige engelske opgaver fra samme verden og på rundens niveau
    const plads = {};
    (opts.gentag || [])
      .filter((o) => o && o.fag === 'engelsk' && o.emne === emneId && GEN[o.type] && ORD[o.svar] && Array.isArray(o.hjaelp) && passerTilNiveau(o, emneId, niveau))
      .filter((o, i, l) => l.findIndex((x) => x.svar === o.svar) === i)
      .slice(0, 2)
      .forEach((o, i) => {
        const p = Math.min(antal - 1, 2 + i);
        if (plads[p]) return;
        plads[p] = Object.assign({}, o, { gentaget: true });
        brugte[o.svar] = true;
      });
    const runde = [];
    let forsoeg = 0;
    while (runde.length < antal && forsoeg < 400) {
      if (plads[runde.length]) { runde.push(plads[runde.length]); continue; }
      forsoeg++;
      const o = puljeOpgave(type, niveau, rng);
      const forrige = runde[runde.length - 1];
      const naeste = plads[runde.length + 1];
      const alleBrugt = Object.keys(brugte).length >= ordIPuljen;
      // Et nyt ord, så længe der er nogen — og aldrig det samme ord som naboen (heller ikke en kommende gentagelse)
      if ((forrige && forrige.svar === o.svar) || (naeste && naeste.svar === o.svar)) continue;
      if (forsoeg < 300 && brugte[o.svar] && !alleBrugt) continue;
      brugte[o.svar] = true;
      runde.push(o);
    }
    return runde;
  }

  // Alle sætninger, stemmerne kan sige i den engelske del (vaerktoej/tale-tekster.js laver Piper-filerne ud fra dem):
  // dansk = spørgsmålene og de danske ord · engelsk = de engelske ord. Intet andet går til den engelske stemme.
  function saetninger() {
    const dansk = [], engelsk = [];
    for (const emne of Object.keys(VERDENER)) dansk.push(VERDENER[emne].spoerg);
    for (const id of Object.keys(ORD)) { dansk.push(udtaleDa(ORD[id])); engelsk.push(udtaleEn(ORD[id])); }
    return { dansk: dansk, engelsk: engelsk };
  }

  const Engelsk = { VERDENER, ORD, EMNER, GEN, antalValg, udtaleEn, udtaleDa, lavOpgave, puljeOpgave, lavRunde, saetninger, lavRng };

  if (typeof module !== 'undefined' && module.exports) module.exports = Engelsk;
  else root.Engelsk = Engelsk;
})(typeof self !== 'undefined' ? self : this);
