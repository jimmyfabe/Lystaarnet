/* engelsk-opgaver.js — Engelsk for helt nye begyndere (Jimmy 13-10-2026): barnet hører et engelsk ord og trykker på
   billedet. Ingen læsetekst. Syv verdener med 6–10 ord hver: farver, tal, dyr, figurer og (18-10-2026) hverdagens ting
   i køkkenet, hjemme og på legepladsen.
   To stemmer, aldrig i samme sætning: spørgsmålet og det danske ord siges af den danske stemme (Piper-dansk), det
   engelske ord kun af Piper-filen med den engelske stemme (talefiler.js STEMME_EN) — aldrig af enhedens stemme.
   Rene funktioner uden DOM, så alt kan testes i Node (test/test-engelsk.js). Billederne tegnes i app.js ud fra
   ord.billede: { art: 'farve' | 'tal' | 'dyr' | 'form' | 'ting', … } — kun spillets egne tegninger (grafik.js, formSvg,
   terninger; tingene fra grafik-kilde/hverdag/ → grafik.js hverdag). */
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
  const TING = (id) => ({ art: 'ting', tegning: id });
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
    // Hverdagens ting (Jimmy 18-10-2026: «biler, kopper, kander og andre ting fra køkkenet og hverdagen, computeren,
    // legepladsen»). Tegningerne: grafik-kilde/hverdag/<id>.svg (id = det engelske ord) → grafik.js hverdag.
    engKoekken: {
      navn: 'Køkken', type: 'engKoekken', ikon: '🍴', kerne: 5,
      spoerg: 'Lyt. Hvad er det?', tekst: 'Hvad hører du?',
      ord: [
        ['cup', 'kop', TING('cup'), ['glass', 'jug']],
        ['plate', 'tallerken', TING('plate'), ['bowl']],
        ['spoon', 'ske', TING('spoon'), ['fork', 'knife']],
        ['glass', 'glas', TING('glass'), ['cup']],
        ['bowl', 'skål', TING('bowl'), ['plate', 'pot']],
        ['fork', 'gaffel', TING('fork'), ['spoon', 'knife']],
        ['knife', 'kniv', TING('knife'), ['spoon', 'fork']],
        ['jug', 'kande', TING('jug'), ['cup', 'pot']],
        ['pot', 'gryde', TING('pot'), ['bowl', 'jug']],
        ['fridge', 'køleskab', TING('fridge'), []],
      ],
    },
    engHjemme: {
      navn: 'Hjemme', type: 'engHjemme', ikon: '🏠', kerne: 5,
      spoerg: 'Lyt. Hvad er det?', tekst: 'Hvad hører du?',
      ord: [
        ['car', 'bil', TING('car'), ['bus', 'bike']],
        ['bus', 'bus', TING('bus'), ['car']],
        ['book', 'bog', TING('book'), []],
        ['phone', 'telefon', TING('phone'), ['computer']],
        ['bed', 'seng', TING('bed'), ['table']],
        ['chair', 'stol', TING('chair'), ['table']],
        ['table', 'bord', TING('table'), ['chair', 'bed']],
        ['door', 'dør', TING('door'), []],
        ['bike', 'cykel', TING('bike'), ['car']],
        ['computer', 'computer', TING('computer'), ['phone']],
      ],
    },
    engLegeplads: {
      navn: 'Legeplads', type: 'engLegeplads', ikon: '⚽', kerne: 4,
      spoerg: 'Lyt. Hvad er det?', tekst: 'Hvad hører du?',
      ord: [
        ['ball', 'bold', TING('ball'), []],
        ['swing', 'gynge', TING('swing'), ['slide']],
        ['slide', 'rutsjebane', TING('slide'), ['swing']],
        ['tree', 'træ', TING('tree'), []],
        ['sandbox', 'sandkasse', TING('sandbox'), []],
        ['bench', 'bænk', TING('bench'), []],
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

  // ---------- «Sig efter mig» (Jimmy 18-10-2026): korte sætninger, der bygger op til en lille samtale ----------
  // Den danske stemme siger først, hvad sætningen bruges til (da), så siger den engelske stemme sætningen (en). Barnet
  // siger den højt og trykker på «Jeg sagde det» — der er ingen mikrofon, og udtalen bedømmes ikke: at sige det er at
  // klare det (fejl straffes aldrig). «My name is»: så barnets eget navn fra optagelsen på enheden (app.js) — eller en
  // pause, hvor barnet selv siger navnet. Navnet er aldrig tekst her (ditNavn — dansk bruger navn: true om
  // bogstavets navn). udtryk = vennens udtryk, mens den siger sætningen.
  const TIMER = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const SIG = {
    hello: { en: 'Hello!', da: 'Sådan siger du hej. Sig efter mig, og tryk så på den grønne knap.', udtryk: 'vinker' },
    myName: { en: 'My name is', da: 'Sådan siger du, hvad du hedder. Sig efter mig, og sig dit navn til sidst.', udtryk: 'glad', ditNavn: true },
    yourName: { en: 'What is your name?', da: 'Sådan spørger du, hvad den anden hedder. Sig efter mig.', udtryk: 'taenker' },
    howAreYou: { en: 'How are you?', da: 'Sådan spørger du, hvordan den anden har det. Sig efter mig.', udtryk: 'taenker' },
    fine: { en: 'I am fine, thank you.', da: 'Sådan siger du, at du har det godt. Sig efter mig.', udtryk: 'jubler' },
    whatTime: { en: 'What time is it?', da: 'Sådan spørger du, hvad klokken er. Sig efter mig.', udtryk: 'taenker', ur: true },
    oclock: { en: (t) => 'It is ' + TIMER[t - 1] + " o'clock.", da: 'Se på uret. Sådan siger du, hvad klokken er. Sig efter mig.', udtryk: 'glad', ur: true },
    thanks: { en: 'Thank you!', da: 'Sådan siger du tak. Sig efter mig.', udtryk: 'glad' },
    goodbye: { en: 'Goodbye!', da: 'Sådan siger du farvel. Sig efter mig.', udtryk: 'vinker' },
  };
  // Midten af samtalen pr. niveau: små enheder, der hører sammen (spørgsmål og svar), mellem «Hello!» og «Goodbye!».
  // Klokken (niveau 3): «What time is it?» og «It is … o'clock.» viser det samme ur (hele timer 1–12).
  const SIG_ENHEDER = {
    1: [['myName'], ['thanks']],
    2: [['yourName', 'myName'], ['howAreYou', 'fine'], ['thanks']],
    3: [['yourName', 'myName'], ['howAreYou', 'fine'], ['whatTime', 'oclock'], ['thanks']],
  };
  const SIG_ROS = ['Godt sagt!', 'Flot!', 'Sådan!'];
  const sigEn = (id, time) => (typeof SIG[id].en === 'function' ? SIG[id].en(time) : SIG[id].en);
  function sigOpgave(id, niveau, time, ros) {
    const s = SIG[id];
    const en = sigEn(id, time);
    const ur = s.ur ? time : null;
    return {
      fag: 'engelsk', emne: 'engSig', type: 'engSig', niveau: niveau, noegle: 'engSig:' + id + (ur ? ':' + ur : ''), ikon: '💬',
      tale: s.da,                                                  // dansk stemme
      lyd: [{ en: en }].concat(s.ditNavn ? [{ ditNavn: true }] : []), // så sætningen (kun den engelske stemmes fil) — og navnet
      tekst: 'Sig efter mig.',
      vis: { art: 'engelskSig', saetning: id, udtryk: s.udtryk, klokke: ur ? ur + ':00' : null },
      svar: 'sagt', valg: ['sagt'], valgArt: 'sig',
      ordEn: en,
      ros: SIG_ROS[ros % SIG_ROS.length],                         // ros efter «Jeg sagde det» (dansk stemme; ordDa er ordverdenernes danske ord)
      hjaelp: [],
    };
  }
  // Én sætning (til GEN og puljen): fra niveauets sætninger
  GEN.engSig = function (niveau, rng) {
    const n = Math.min(3, Math.max(1, niveau));
    const ids = ['hello', 'goodbye'].concat(...SIG_ENHEDER[n]);
    return sigOpgave(vaelg(rng, ids), n, 1 + Math.floor(rng() * 12), Math.floor(rng() * SIG_ROS.length));
  };
  // Runden er en samtale: «Hello!» først, «Goodbye!» til sidst, og midten er niveauets enheder i rækkefølge fra et
  // tilfældigt sted. En enhed, der ikke er plads til, springes over (så et spørgsmål aldrig står uden svar), og samme
  // sætning kommer aldrig to gange i træk. Passer ingen enhed, fyldes op med «Thank you!» eller «My name is».
  function sigRunde(niveau, rng, antal) {
    const enheder = SIG_ENHEDER[niveau];
    const time = 1 + Math.floor(rng() * 12);
    const ids = ['hello'];
    let k = Math.floor(rng() * enheder.length);
    while (ids.length < antal - 1) {
      const plads = antal - 1 - ids.length, sidst = ids[ids.length - 1];
      let e = null;
      for (let j = 0; j < enheder.length && !e; j++) { const u = enheder[k++ % enheder.length]; if (u.length <= plads && u[0] !== sidst) e = u; }
      ids.push(...(e || [sidst === 'thanks' ? 'myName' : 'thanks']));
    }
    if (antal > 1) ids.push('goodbye');
    const ros0 = Math.floor(rng() * SIG_ROS.length);
    return ids.slice(0, antal).map((id, i) => sigOpgave(id, niveau, time, ros0 + i));
  }

  // Emner (verdener) og niveauer — samme form som opgaver.js/dansk-opgaver.js, så rundemotoren og gem.js kan bruge dem
  const EMNER = {};
  for (const emne of Object.keys(VERDENER)) {
    const t = VERDENER[emne].type;
    EMNER[emne] = { navn: VERDENER[emne].navn, maxNiveau: 3, niveauer: { 1: [t], 2: [t], 3: [t] } };
  }
  EMNER.engSig = { navn: 'Sig efter mig', maxNiveau: 3, niveauer: { 1: ['engSig'], 2: ['engSig'], 3: ['engSig'] } };
  // De engelske ytringer i et emne (🔇 på kortet, når én af dem ikke kan høres)
  const udtalerFor = (emne) => (emne === 'engSig' ? saetningerSig() : VERDENER[emne].ord.map((id) => udtaleEn(ORD[id])));
  function saetningerSig() {
    const ud = [];
    for (const id of Object.keys(SIG)) if (typeof SIG[id].en === 'function') TIMER.forEach((x, i) => ud.push(SIG[id].en(i + 1))); else ud.push(SIG[id].en);
    return ud;
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
    if (emneId === 'engSig') return sigRunde(niveau, rng, antal); // en samtale; ingen gentagelser (intet kan gå galt)
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
  // dansk = spørgsmålene, de danske ord og «Sig efter mig»s forklaringer og ros · engelsk = de engelske ord og sætninger.
  // Intet andet går til den engelske stemme.
  function saetninger() {
    const dansk = [], engelsk = [];
    for (const emne of Object.keys(VERDENER)) dansk.push(VERDENER[emne].spoerg);
    for (const id of Object.keys(ORD)) { dansk.push(udtaleDa(ORD[id])); engelsk.push(udtaleEn(ORD[id])); }
    for (const id of Object.keys(SIG)) dansk.push(SIG[id].da);
    dansk.push('Sig efter mig.', ...SIG_ROS);
    engelsk.push(...saetningerSig());
    return { dansk: dansk, engelsk: engelsk };
  }

  const Engelsk = { VERDENER, ORD, EMNER, GEN, SIG, SIG_ENHEDER, TIMER, antalValg, udtaleEn, udtaleDa, udtalerFor, lavOpgave, puljeOpgave, lavRunde, saetninger, lavRng };

  if (typeof module !== 'undefined' && module.exports) module.exports = Engelsk;
  else root.Engelsk = Engelsk;
})(typeof self !== 'undefined' ? self : this);
