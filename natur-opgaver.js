/* natur-opgaver.js — Natur (Jimmy 19-10-2026: «det sjoveste i hele verden» som barn), pilot 20-10-2026: «Gæt en lort».
   Barnet ser et tegnet efterladenskab (og dyrets spor) og trykker på det dyr, der har lavet det. Ingen læsetekst: stemmen
   siger «Hvem har lavet den?», og efter det rigtige svar én kort, sand sætning om dyret.
   Fakta (hvordan lorten og sporet ser ud, og hvad dyret spiser) står med kilder i docs/NATUR-FAKTA.md — ret dér først.
   Kun danske dyr. Rene funktioner uden DOM, så alt kan testes i Node (test/test-natur.js). Tegningerne:
   grafik-kilde/natur/<dyr|lort|spor>-<id>.svg → grafik.js natur (spillets egne tegninger; emojien er reserven). */
(function (root) {
  'use strict';

  const O = (typeof module !== 'undefined' && module.exports) ? require('./opgaver.js') : root.Opgaver;
  const { lavRng, vaelg, bland } = O;

  // ---------- Dyrene. Rækkefølgen er læringsrækkefølgen: de første KERNE er niveau 1 (dyr, alle børn kender, og lort,
  // der ikke ligner hinanden), de første MELLEM niveau 2, alle niveau 3 (runde 2, 20-10-2026: 28 dyr). «Nær» = lorten
  // eller sporet ligner — i naturen eller på tegningerne (kontaktarket 21-10-2026: sorte kugler, små korn, pølser og brune
  // kugler; symmetrisk, test) — kun på niveau 3 står et nært dyr blandt valgene. fakta siges efter det
  // rigtige svar, ledetraad i hjælpens første trin (aldrig dyrets navn). sporOrd: dyrets «spor» er ikke et fodspor. ----------
  const DYR = [
    // 1–10: niveau 1
    { id: 'ko', navn: 'ko', bestemt: 'koen', e: '🐄', naer: ['hest', 'raadyr'],
      fakta: 'Koen spiser masser af græs, så dens lort bliver en stor, flad kokasse.',
      ledetraad: 'Dyret giver os mælk.' },
    { id: 'hest', navn: 'hest', bestemt: 'hesten', e: '🐎', naer: ['ko', 'hare', 'baever'],
      fakta: 'Hesten spiser græs, og dens lort hedder hestepærer.',
      ledetraad: 'Man kan ride på dyret.' },
    { id: 'hare', navn: 'hare', bestemt: 'haren', e: '🐇', naer: ['raadyr', 'egern', 'kanin', 'hest', 'baever'],
      fakta: 'Haren spiser græs, så dens lort er små, runde, grønbrune kugler.',
      ledetraad: 'Dyret har lange ører og meget lange bagben.' },
    { id: 'pindsvin', navn: 'pindsvin', bestemt: 'pindsvinet', e: '🦔', naer: [],
      fakta: 'Pindsvinet spiser biller, så dets lort glimter af små skinnende stykker.',
      ledetraad: 'Dyret har pigge på ryggen.' },
    { id: 'hund', navn: 'hund', bestemt: 'hunden', e: '🐕', naer: ['raev', 'kat', 'ulv', 'skovmaar'],
      fakta: 'Hunden får den samme mad hver dag, så dens lort er en jævn pølle.',
      ledetraad: 'Dyret siger vov.' },
    { id: 'kat', navn: 'kat', bestemt: 'katten', e: '🐈', naer: ['hund'],
      fakta: 'Katten graver sin lort ned i jorden, så den er gemt.',
      ledetraad: 'Dyret siger miav.' },
    { id: 'hoene', navn: 'høne', bestemt: 'hønen', e: '🐔', naer: ['gaas'],
      fakta: 'Hønens lort har en hvid klat, og det hvide er hønens tis.',
      ledetraad: 'Dyret lægger æg, som vi kan spise.' },
    { id: 'faar', navn: 'får', bestemt: 'fåret', e: '🐑', naer: ['raadyr', 'krondyr', 'vildsvin'],
      fakta: 'Fåret spiser græs, og dets lort er små sorte kugler i en klump.',
      ledetraad: 'Dyret siger mæh.' },
    // Sneglens «spor» er slimsporet
    { id: 'snegl', navn: 'snegl', bestemt: 'sneglen', e: '🐌', naer: ['kaalorm'], sporOrd: 'slimsporet',
      fakta: 'Sneglens lort får samme farve som den mad, den har spist.',
      ledetraad: 'Dyret bærer sit hus på ryggen.' },
    { id: 'egern', navn: 'egern', bestemt: 'egernet', e: '🐿️', naer: ['hare'],
      fakta: 'Egernet spiser frø og nødder, så dets lort er bittesmå kugler.',
      ledetraad: 'Dyret bor højt oppe i træerne og gemmer nødder til vinteren.' },
    // 11–20: niveau 2. Uglen efterlader et gylp (ikke lort), og dens fodspor er ikke kildebelagt: «sporet» er dens træ
    { id: 'ugle', navn: 'ugle', bestemt: 'uglen', e: '🦉', naer: [], sporOrd: 'træet',
      fakta: 'Det er ikke lort, men et gylp. Uglen kan ikke fordøje knogler, så den gylper dem op.',
      ledetraad: 'Dyret sidder stille på en gren om natten og venter på en mus.' },
    { id: 'raev', navn: 'ræv', bestemt: 'ræven', e: '🦊', naer: ['hund', 'graevling', 'ulv', 'skovmaar'],
      fakta: 'Ræven spiser mus, så der er små hår i dens lort.',
      ledetraad: 'Dyret har en lang busket hale og spidse ører.' },
    { id: 'raadyr', navn: 'rådyr', bestemt: 'rådyret', e: '🦌', naer: ['hare', 'ko', 'faar', 'krondyr', 'vildsvin'],
      fakta: 'Rådyret spiser blade og knopper, så dets lort er små, sorte bønner.',
      ledetraad: 'Dyret har en hvid plet bagi og hopper højt, når det bliver bange.' },
    { id: 'graevling', navn: 'grævling', bestemt: 'grævlingen', e: '🦡', naer: ['raev'],
      fakta: 'Grævlingen spiser regnorme og laver sit toilet i et lille hul.',
      ledetraad: 'Dyret har sorte og hvide striber i ansigtet.' },
    { id: 'gaas', navn: 'gås', bestemt: 'gåsen', e: '🪿', naer: ['hoene'],
      fakta: 'Gåsen spiser græs, så dens lort er grøn og lang som en finger.',
      ledetraad: 'Dyret flyver i store flokke og har lyserøde fødder.' },
    // Kaninens og regnormens «spor» er deres hul
    { id: 'kanin', navn: 'kanin', bestemt: 'kaninen', e: '🐰', naer: ['hare'], sporOrd: 'hullet',
      fakta: 'Kaninen lægger sine små, runde kugler i store bunker — hundredvis på ét sted.',
      ledetraad: 'Dyret har en lille hvid hale og bor i huller under jorden.' },
    { id: 'mus', navn: 'mus', bestemt: 'musen', e: '🐭', naer: ['rotte', 'flagermus'],
      fakta: 'Musen kan lave op til 70 bittesmå lorte på én dag.',
      ledetraad: 'Dyret er bitte lille og har store ører.' },
    { id: 'regnorm', navn: 'regnorm', bestemt: 'regnormen', e: '🪱', naer: [], sporOrd: 'hullet',
      fakta: 'Regnormen spiser gamle blade og jord, så dens lort er små bunker jord.',
      ledetraad: 'Dyret graver lange gange nede i jorden.' },
    // Kålormens «spor» er bladet med huller, biens er vokstavlen
    { id: 'kaalorm', navn: 'kålorm', bestemt: 'kålormen', e: '🐛', naer: ['snegl'], sporOrd: 'bladet',
      fakta: 'Kålormen spiser kålblade, så dens lort er små, grønne kugler.',
      ledetraad: 'Dyret bliver til en hvid sommerfugl.' },
    { id: 'bi', navn: 'bi', bestemt: 'bien', e: '🐝', naer: [], sporOrd: 'tavlen',
      fakta: 'Bien laver ikke lort i bistadet. Den venter, til den kan flyve ud.',
      ledetraad: 'Dyret laver honning af blomsternes søde saft.' },
    // 21–28: niveau 3
    { id: 'vildsvin', navn: 'vildsvin', bestemt: 'vildsvinet', e: '🐗', naer: ['krondyr', 'faar', 'raadyr'],
      fakta: 'Vildsvinet roder i jorden efter mad, og dets lort er en tyk, klumpet pølse.',
      ledetraad: 'Dyret graver i jorden med snuden.' },
    { id: 'krondyr', navn: 'krondyr', bestemt: 'krondyret', e: '🦌', naer: ['raadyr', 'faar', 'vildsvin'],
      fakta: 'Krondyret spiser græs og lyng, så dets lort er store, sorte bønner.',
      ledetraad: 'Dyret har et stort gevir og brøler om efteråret.' },
    { id: 'rotte', navn: 'rotte', bestemt: 'rotten', e: '🐀', naer: ['mus', 'flagermus'],
      fakta: 'Rottens lort ligner musens, men er meget større.',
      ledetraad: 'Dyret har en lang, næsten nøgen hale og kan svømme.' },
    { id: 'ulv', navn: 'ulv', bestemt: 'ulven', e: '🐺', naer: ['hund', 'raev', 'skovmaar'],
      fakta: 'Ulven spiser hjorte, så der er hår og knoglestumper i dens lort.',
      ledetraad: 'Dyret hyler sammen med sin flok.' },
    { id: 'odder', navn: 'odder', bestemt: 'odderen', e: '🦦', naer: [],
      fakta: 'Odderen spiser fisk, så der er fiskeben og skæl i dens lort.',
      ledetraad: 'Dyret bor ved åer og søer og fanger fisk.' },
    // Bæverens «spor» er det gnavede træ, flagermusens huset, den bor i
    { id: 'baever', navn: 'bæver', bestemt: 'bæveren', e: '🦫', naer: ['hest', 'hare'], sporOrd: 'træet',
      fakta: 'Bæveren spiser bark og laver det meste af sin lort i vandet.',
      ledetraad: 'Dyret klasker med halen i vandet, når der er fare.' },
    { id: 'skovmaar', navn: 'skovmår', bestemt: 'skovmåren', e: '🐾', naer: ['raev', 'hund', 'ulv'],
      fakta: 'Skovmåren lægger sin lort, så andre kan se den: her bor jeg!',
      ledetraad: 'Dyret har en gul plet på halsen.' },
    { id: 'flagermus', navn: 'flagermus', bestemt: 'flagermusen', e: '🦇', naer: ['mus', 'rotte'], sporOrd: 'huset',
      fakta: 'Flagermusen spiser insekter, så dens lort er fuld af små insektstumper.',
      ledetraad: 'Dyret kan flyve og finder vej ved at lytte til ekko.' },
  ];
  // Størrelsen (21-10-2026): hver lort er tegnet i én af tre målestokke, og ved siden af står en barnefinger i samme
  // målestok (grafik-kilde/natur/finger-<str>.svg). Tegningens bredde (96) er så mange cm — en museklat og en kokasse kan
  // begge ses, og fingeren viser forskellen. Lortenes mål (med kilder) står i docs/NATUR-FAKTA.md.
  const STOERRELSER = { lille: 6, mellem: 20, stor: 40 };
  const STR = {
    ko: 'stor', hest: 'mellem', hare: 'lille', pindsvin: 'lille', hund: 'mellem', kat: 'mellem', hoene: 'lille', faar: 'lille',
    snegl: 'lille', egern: 'lille', ugle: 'lille', raev: 'mellem', raadyr: 'lille', graevling: 'mellem', gaas: 'mellem',
    kanin: 'lille', mus: 'lille', regnorm: 'lille', kaalorm: 'lille', bi: 'lille', vildsvin: 'mellem', krondyr: 'lille',
    rotte: 'lille', ulv: 'mellem', odder: 'mellem', baever: 'lille', skovmaar: 'lille', flagermus: 'lille',
  };
  // Fodsporene (trin 0, 21-10-2026: «Hvem har gået her?»): kun de 20 dyr med et kildebelagt fodspor (uden sporOrd). naer =
  // sporene ligner hinanden på tegningerne (klove, poter med fire tæer, fem tæer, hop to og to, fugle); symmetrisk (test).
  // fakta siges efter det rigtige svar og står ordret i docs/NATUR-FAKTA.md under «Spillet siger (spor)».
  const SPOR = {
    ko: { naer: ['hest', 'faar', 'raadyr', 'krondyr', 'vildsvin'], fakta: 'Koen har to klove på hver fod, så sporet er to store halvdele.' },
    hest: { naer: ['ko'], fakta: 'Hesten har én stor hov på hver fod, så sporet er ét helt aftryk.' },
    hare: { naer: ['egern', 'mus', 'skovmaar'], fakta: 'Haren hopper, og de lange bagfødder lander foran de små forfødder.' },
    pindsvin: { naer: ['rotte', 'graevling', 'skovmaar'], fakta: 'Pindsvinets forfod har fem tæer og ligner en lille hånd.' },
    hund: { naer: ['kat', 'raev', 'ulv'], fakta: 'Hunden har fire tæer med kløer, og den løber kors og tværs.' },
    kat: { naer: ['hund', 'raev', 'ulv'], fakta: 'Kattens spor er rundt med fire tæer og ingen kløer.' },
    hoene: { naer: ['gaas'], fakta: 'Hønen har tre tæer fremad og én lille tå bagud.' },
    faar: { naer: ['ko', 'raadyr', 'krondyr', 'vildsvin'], fakta: 'Fåret har to klove, og den ene er lidt større end den anden.' },
    egern: { naer: ['hare', 'mus', 'skovmaar'], fakta: 'Egernet har fire tæer på forfoden og fem på bagfoden.' },
    raev: { naer: ['hund', 'kat', 'ulv'], fakta: 'Rævens spor er smalt, og sporene ligger på en næsten lige linje.' },
    raadyr: { naer: ['ko', 'faar', 'krondyr', 'vildsvin'], fakta: 'Rådyret har to smalle, spidse klove, som et hjerte på hovedet.' },
    graevling: { naer: ['pindsvin', 'odder', 'skovmaar'], fakta: 'Grævlingen har fem tæer på en lige linje og lange kløer.' },
    gaas: { naer: ['hoene'], fakta: 'Gåsen har svømmehud mellem de tre tæer, der peger frem.' },
    mus: { naer: ['hare', 'egern', 'rotte'], fakta: 'Musen hopper, og i sne ses tit en streg fra halen.' },
    vildsvin: { naer: ['ko', 'faar', 'raadyr', 'krondyr'], fakta: 'Vildsvinet har to runde klove og to små klove langt ude til siderne.' },
    krondyr: { naer: ['ko', 'faar', 'raadyr', 'vildsvin'], fakta: 'Krondyrets to klove er større end rådyrets.' },
    rotte: { naer: ['pindsvin', 'mus'], fakta: 'Rottens bagfod er lang og har fem tæer.' },
    ulv: { naer: ['hund', 'kat', 'raev'], fakta: 'Ulvens spor ligner en stor hunds, og ulven traver i en næsten lige række.' },
    odder: { naer: ['graevling', 'skovmaar'], fakta: 'Odderen har svømmehud mellem sine fem tæer.' },
    skovmaar: { naer: ['hare', 'pindsvin', 'egern', 'graevling', 'odder'], fakta: 'Skovmåren hopper, så dens spor ligger to og to.' },
  };
  const KERNE = 10;
  const MELLEM = 20;
  const DYR_ID = {};
  DYR.forEach((d) => { DYR_ID[d.id] = d; d.str = STR[d.id]; });
  // Et id fra de gemte data er kun et dyr, hvis det er et af vores egne (ikke 'constructor', '__proto__' … fra prototypen)
  const erDyr = (id) => typeof id === 'string' && Object.prototype.hasOwnProperty.call(DYR_ID, id);
  const stort = (t) => t.charAt(0).toUpperCase() + t.slice(1);

  // ---------- Verdenerne: «Gæt en lort» (pilot 20-10) og «Hvem har gået her?» (trin 0, 21-10: kun sporet) ----------
  const VERDENER = {
    naturLort: {
      navn: 'Gæt en lort', type: 'naturLort', ikon: '💩', kerne: KERNE,
      spoerg: 'Hvem har lavet den?', tekst: 'Hvem har lavet den?',
      dyr: DYR.map((d) => d.id),
    },
    naturSpor: {
      navn: 'Hvem har gået her?', type: 'naturSpor', ikon: '🐾',
      spoerg: 'Hvem har gået her?', tekst: 'Hvem har gået her?',
      dyr: DYR.filter((d) => SPOR[d.id]).map((d) => d.id),
    },
  };
  // Dyrene, der ligner svaret: lorten (naturLort) eller sporet (naturSpor)
  const naerFor = (emne, id) => (emne === 'naturSpor' ? SPOR[id].naer : DYR_ID[id].naer);

  // ---------- Opgaven: se lorten (og sporet) → tryk på dyret ----------
  // Niveau 1: to valg blandt de første KERNE dyr, sporet ses · 2: tre valg blandt de første MELLEM, sporet ses · 3: tre
  // valg blandt alle, hvoraf ét er «nært», og sporet kommer først med hjælpen (på niveau 1–2 aldrig et dyr, der ligner
  // svaret, blandt valgene). «Hvem har gået her?» bruger de samme niveauer, men kun dyrene med et fodspor (9 · 14 · 20).
  const antalValg = (niveau) => (niveau <= 1 ? 2 : 3);
  const puljeFor = (niveau, emne) => {
    const dyr = VERDENER[emne || 'naturLort'].dyr;
    return DYR.slice(0, niveau <= 1 ? KERNE : niveau === 2 ? MELLEM : DYR.length).map((d) => d.id).filter((id) => dyr.indexOf(id) >= 0);
  };
  const ros = (d) => 'Ja! Det er ' + d.bestemt + '.';
  const visDyret = (d) => 'Det er ' + d.bestemt + '. Tryk på den, der lyser.';
  const seSporet = (d) => 'Se ' + (d.sporOrd || 'sporet') + '. ' + d.ledetraad;
  function gaetLort(niveau, rng) { return opgaveFor(niveau, vaelg(rng, puljeFor(niveau)), rng); }
  function hvemGik(niveau, rng) { return opgaveFor(niveau, vaelg(rng, puljeFor(niveau, 'naturSpor')), rng, 'naturSpor'); }
  // Opgaven med et bestemt dyr (runden vælger selv dyrene): valgene er andre dyr fra niveauets pulje
  function opgaveFor(niveau, id, rng, emne) {
    emne = emne || 'naturLort';
    const naer = naerFor(emne, id);
    const andre = puljeFor(niveau, emne).filter((x) => x !== id);
    const fjerne = bland(rng, andre.filter((x) => naer.indexOf(x) < 0));
    const naere = bland(rng, andre.filter((x) => naer.indexOf(x) >= 0));
    const forkerte = (niveau >= 3 ? naere.slice(0, 1) : []).concat(fjerne).slice(0, antalValg(niveau) - 1);
    return bygOpgave(niveau, id, bland(rng, forkerte.concat([id])), emne);
  }
  // Opgaven ud fra dyret og valgene. Al tekst kommer herfra — også i en gentagelse fra de gemte data (lavRunde)
  function bygOpgave(niveau, id, valg, emne) {
    emne = emne || 'naturLort';
    const V = VERDENER[emne];
    const d = DYR_ID[id];
    const sporAlene = emne === 'naturSpor';
    return {
      fag: 'natur', emne: emne, type: V.type, niveau: niveau, noegle: V.type + ':' + id, ikon: V.ikon,
      tale: V.spoerg,
      tekst: V.tekst,
      // «Hvem har gået her?» viser kun sporet, stort; «Gæt en lort» lorten og (på niveau 1–2) sporet ved siden af
      vis: sporAlene ? { art: 'naturSpor', dyr: id } : { art: 'naturLort', dyr: id, spor: niveau < 3 },
      svar: id, valg: valg, valgArt: 'billede',
      ros: ros(d),                      // efter det rigtige svar: «Ja! Det er ræven.» …
      fakta: sporAlene ? SPOR[id].fakta : d.fakta, // … og så én sand sætning om dyret (dets lort eller dets spor)
      // Fejl straffes aldrig: først sporet (det lyser) og en ledetråd, så lyser det rigtige dyr
      hjaelp: [{ art: 'naturSpor', tale: seSporet(d) }, { art: 'visNatur', tale: visDyret(d) }],
    };
  }
  const GEN = { naturLort: gaetLort, naturSpor: hvemGik };

  // Emner (verdener) og niveauer — samme form som opgaver.js/dansk-opgaver.js, så rundemotoren og gem.js kan bruge dem
  const EMNER = {
    naturLort: { navn: VERDENER.naturLort.navn, maxNiveau: 3, niveauer: { 1: ['naturLort'], 2: ['naturLort'], 3: ['naturLort'] } },
    naturSpor: { navn: VERDENER.naturSpor.navn, maxNiveau: 3, niveauer: { 1: ['naturSpor'], 2: ['naturSpor'], 3: ['naturSpor'] } },
  };

  // Ingen fast pulje som i opgaver.js: stemmens sætninger afhænger kun af dyret (saetninger), og runden vælger selv dyrene
  function lavOpgave(type, niveau, rng) { return GEN[type](niveau, rng); }

  // En gentagelse passer kun til en runde på samme niveau: samme antal valg, valgene fra niveauets dyr og et «nært» dyr
  // kun på niveau 3 — og sporet vises som på rundens niveau
  function passerTilNiveau(o, niveau) {
    if (!o || !Object.prototype.hasOwnProperty.call(VERDENER, o.emne)) return false;
    const pulje = puljeFor(niveau, o.emne);
    if (!Array.isArray(o.valg) || o.valg.length !== antalValg(niveau) || pulje.indexOf(o.svar) < 0) return false;
    if (new Set(o.valg).size !== o.valg.length || o.valg.indexOf(o.svar) < 0 || !o.valg.every((v) => pulje.indexOf(v) >= 0)) return false;
    if (o.emne === 'naturLort' && (!o.vis || o.vis.spor !== (niveau < 3))) return false;
    return niveau >= 3 || !o.valg.some((v) => naerFor(o.emne, o.svar).indexOf(v) >= 0);
  }
  // En gemt opgave (afbrudt mission, «kommer igen») kan stamme fra en anden udgave: kun hvis dyrene stadig findes
  function opgaveKendt(o) {
    const V = o && Object.prototype.hasOwnProperty.call(VERDENER, o.emne) ? VERDENER[o.emne] : null;
    return !!(V && o.fag === 'natur' && o.type === V.type && o.vis && o.vis.art === V.type && erDyr(o.svar) &&
      V.dyr.indexOf(o.svar) >= 0 && o.vis.dyr === o.svar && Array.isArray(o.valg) && o.valg.every(erDyr) && Array.isArray(o.hjaelp));
  }

  // En runde: forskellige dyr, så længe der er nok, og aldrig samme dyr to gange i træk. Svære dyr fra sidst (gentag) får
  // plads 3 og 4 fra start, så dyrene omkring dem vælges uden om dem. Variation mellem runderne (runde 2, 20-10-2026):
  // opts.nylige er de senest viste dyr (ældst først); dyr, barnet ikke har set for nylig, kommer først, og dyrene fra
  // sidste runde (de sidste `antal`) til sidst. En gentagelse bygges igen ud fra dyret og valgene (bygOpgave): gemt tekst
  // når aldrig stemmen (sikkerhedsreview 20-10-2026).
  function lavRunde(emneId, niveau, rng, opts) {
    opts = opts || {};
    const antal = opts.antal || 5;
    niveau = Math.min(EMNER[emneId].maxNiveau, Math.max(1, Math.round(Number(niveau)) || 1));
    const pulje = puljeFor(niveau, emneId);
    const brugt = Object.create(null); // dyr → gange i denne runde
    const plads = {};
    const nylige = (Array.isArray(opts.nylige) ? opts.nylige : []).filter(erDyr);
    // Hvor længe siden dyret sidst blev vist: -1 = ikke set for nylig (først), ellers jo længere siden, jo før. Kun «set
    // eller ej» gav enkelte dyr lange pauser (9 runder på niveau 2 med 5 opgaver, code-review 20-10-2026); nu er den
    // længste pause den mindst mulige, puljen / antal (test-natur)
    const trin = (id) => nylige.lastIndexOf(id);
    (opts.gentag || [])
      .filter((o) => opgaveKendt(o) && o.emne === emneId && passerTilNiveau(o, niveau))
      .filter((o, i, l) => l.findIndex((x) => x.svar === o.svar) === i)
      .slice(0, 2)
      .forEach((o, i) => {
        const p = Math.min(antal - 1, 2 + i);
        if (plads[p]) return;
        plads[p] = Object.assign(bygOpgave(niveau, o.svar, o.valg.slice(), emneId), { gentaget: true });
        brugt[o.svar] = 1;
      });
    const runde = [];
    for (let i = 0; i < antal; i++) {
      if (plads[i]) { runde.push(plads[i]); continue; }
      const forrige = runde[i - 1];
      const naeste = plads[i + 1];
      // Tilfældig orden først, så en stabil sortering: færrest gange i runden, så trinnet (ikke set for nylig → længst
      // siden → sidste runde). Er puljen kun 2 × antal (niveau 2 med 10), skifter runderne mellem to sæt
      const id = bland(rng, pulje)
        .filter((x) => !(forrige && forrige.svar === x) && !(naeste && naeste.svar === x))
        .sort((a, b) => ((brugt[a] || 0) - (brugt[b] || 0)) || (trin(a) - trin(b)))[0];
      brugt[id] = (brugt[id] || 0) + 1;
      runde.push(opgaveFor(niveau, id, rng, emneId));
    }
    return runde;
  }

  // Alle sætninger, stemmen kan sige i natur (vaerktoej/tale-tekster.js laver Piper-filerne ud fra dem)
  function saetninger() {
    const ud = [VERDENER.naturLort.spoerg, VERDENER.naturSpor.spoerg];
    for (const d of DYR) ud.push(ros(d), d.fakta, seSporet(d), visDyret(d), stort(d.navn) + '.');
    for (const id of VERDENER.naturSpor.dyr) ud.push(SPOR[id].fakta);
    return ud;
  }

  const Natur = { DYR, DYR_ID, SPOR, STOERRELSER, KERNE, MELLEM, VERDENER, EMNER, GEN, antalValg, puljeFor, lavOpgave, opgaveFor, lavRunde, passerTilNiveau, opgaveKendt, saetninger, lavRng };

  if (typeof module !== 'undefined' && module.exports) module.exports = Natur;
  else root.Natur = Natur;
})(typeof self !== 'undefined' ? self : this);
