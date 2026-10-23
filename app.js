/* app.js — al logik til Matematikspillet («Lystårnet»).
   Skallerne (index.html, dino.html, enhjorning.html, voksen.html) sætter kun farver og window.TEMA.
   Opgaver og facit kommer fra opgaver.js, gem/indlæs fra gem.js. */
(function () {
  'use strict';

  const T = window.TEMA || { side: 'index' };
  const O = window.Opgaver;
  const G = window.Gem;
  const D = window.Dansk; // den danske del (dansk-opgaver.js) — kun på børnenes og voksnes sider
  const E = window.Engelsk; // engelsk for begyndere (engelsk-opgaver.js) — kun på børnenes sider
  const N = window.Natur; // natur (natur-opgaver.js) — kun på børnenes sider

  // ---------- Fælles indhold ----------
  // Rejsevenner. Skallerne vælger hvilke fire, der vises (TEMA.figurer). De gemte id'er (data.figur) ændres aldrig —
  // Jimmy 10-10: bobo er skildpadden Bobo, luna er enhjørningen Måne, rosa er natfuglen Fnug. Tegningerne står i grafik.js.
  const FIGURER = {
    bobo:  { e: '🐢', navn: 'Bobo' },
    rex:   { e: '🦖', navn: 'Rex' },
    luna:  { e: '🦄', navn: 'Måne' },
    rosa:  { e: '🦉', navn: 'Fnug' },
    gnist: { e: '🐉', navn: 'Gnist' },
    rap:   { e: '🦊', navn: 'Rap' },
  };
  // Vennebogens venner (opgaver.js NYE_VENNER, Jimmy 14-10-2026): lysperlerne låser dem op én ad gangen (visVennebog)
  for (const v of (O && O.NYE_VENNER) || []) FIGURER[v.id] = { e: v.e, navn: v.navn };

  // Verdenerne på kortet i samme rækkefølge som skolens bog (se docs/INSPIRATION.md).
  // De første ÅBNE_FRA_START er åbne; resten åbner, når verdenen før er mestret.
  const VERDENER = [
    { id: 'taelle', e: '🌲', navn: 'Tælleskoven', emne: 'taelle', tale: 'Tælleskoven. Her tæller vi til 20.' },
    { id: 'former', e: '🔺', navn: 'Formbyen', emne: 'former', tale: 'Formbyen. Cirkler, trekanter og firkanter.' },
    { id: 'tegne', e: '✏️', navn: 'Tegnebyen', emne: 'tegne', tale: 'Tegnebyen. Her tegner vi figurer og måler med lineal og klodser.' },
    { id: 'plus10', e: '⛰️', navn: 'Plusbjerget', emne: 'plus10', tale: 'Plusbjerget. Her lægger vi sammen.' },
    { id: 'venner', e: '🏝️', navn: 'Venneøen', emne: 'venner', tale: "Venneøen. 5'er-venner og 10'er-venner." },
    { id: 'minus', e: '🌊', navn: 'Minussøen', emne: 'minus', tale: 'Minussøen. Vi tager væk og finder forskellen.' },
    { id: 'tiere', e: '🏗️', navn: 'Klodsbyen', emne: 'tiere', tale: 'Klodsbyen. Tiere og enere.' },
    { id: 'tierbro', e: '🌉', navn: 'Tierbroen', emne: 'tierbro', tale: 'Tierbroen. Plus og minus til 20.' },
    { id: 'moenstre', e: '🏰', navn: 'Mønsterslottet', emne: 'moenstre', tale: 'Mønsterslottet. Mønstre og talrækker.' },
    { id: 'torvet', e: '🕰️', navn: 'Klokketorvet', emne: 'maaling', tale: 'Klokketorvet. Klokken og penge.' },
    { id: 'taarn', e: '🗼', svg: true, navn: 'Lystårnet', emne: 'taarn', blandet: true, tale: 'Lystårnet. Det hele blandet.' },
  ];
  // De fem første er åbne fra start (Tegnebyen kom ind som nr. 3 i B6 — så Venneøen stadig er åben som før)
  const AABNE_FRA_START = 5;

  // Den danske del (B4): verdener i rækkefølgen fra docs/DANSK-ANALYSE.md. De fire første er åbne fra start;
  // Små ord åbner ved Lydering trin 2; Historiebogen er åben (B5).
  const DANSK_VERDENER = [
    { id: 'rim', fag: 'dansk', e: '🎵', navn: 'Rim', emne: 'rim', tale: 'Rim. Ord, der lyder ens til sidst.' },
    { id: 'lyde', fag: 'dansk', e: '👂', navn: 'Lyde', emne: 'lyde', tale: 'Lyde. Hvad siger bogstaverne?' },
    { id: 'alfabet', fag: 'dansk', e: '🔤', navn: 'Alfabetet', emne: 'alfabet', tale: 'Alfabetet. Alle bogstaverne.' },
    { id: 'lydering', fag: 'dansk', e: '🐍', navn: 'Lydering', emne: 'lydering', tale: 'Lydering. Lydene efter hinanden bliver til et ord.' },
    { id: 'smaaord', fag: 'dansk', e: '👀', navn: 'Små ord', emne: 'smaaord', tale: 'Små ord. Ord, vi kender med det samme.' },
    { id: 'historiebog', fag: 'dansk', e: '📖', navn: 'Historiebogen', emne: 'historie', tale: 'Historiebogen. Læs, tegn og skriv.' },
    { id: 'jagt', fag: 'dansk', e: '🫧', navn: 'Bogstavjagt', emne: 'jagt', tale: 'Bogstavjagt. Stryg gennem det bogstav, du hører.' },
  ];
  const DANSK_AABNE_FRA_START = 4;

  // Engelsk for helt nye begyndere (Jimmy 13-10-2026): hør ordet → tryk på billedet. Alle er åbne fra start.
  // Fremskridtet gemmes som dansk-emnerne (data.dansk[emne]) — ingen nye felter i de gemte data.
  const ENGELSK_VERDENER = [
    { id: 'engFarver', fag: 'engelsk', e: '🎨', navn: 'Farver', emne: 'engFarver', tale: 'Farver. Lyt til farverne på engelsk.' },
    { id: 'engTal', fag: 'engelsk', e: '🎲', navn: 'Tal', emne: 'engTal', tale: 'Tal. Lyt til tallene på engelsk.' },
    { id: 'engDyr', fag: 'engelsk', e: '🐾', navn: 'Dyr', emne: 'engDyr', tale: 'Dyr. Lyt til dyrene på engelsk.' },
    { id: 'engFormer', fag: 'engelsk', e: '🔷', navn: 'Figurer', emne: 'engFormer', tale: 'Figurer. Lyt til figurerne på engelsk.' },
    // Hverdagens ting (18-10-2026)
    { id: 'engKoekken', fag: 'engelsk', e: '🍴', navn: 'Køkken', emne: 'engKoekken', tale: 'Køkken. Lyt til tingene i køkkenet på engelsk.' },
    { id: 'engHjemme', fag: 'engelsk', e: '🏠', navn: 'Hjemme', emne: 'engHjemme', tale: 'Hjemme. Lyt til tingene derhjemme på engelsk.' },
    { id: 'engLegeplads', fag: 'engelsk', e: '⚽', navn: 'Legeplads', emne: 'engLegeplads', tale: 'Legeplads. Lyt til tingene på legepladsen på engelsk.' },
    // Mad og tøj (20-10-2026)
    { id: 'engMad', fag: 'engelsk', e: '🍎', navn: 'Mad', emne: 'engMad', tale: 'Mad. Lyt til maden på engelsk.' },
    { id: 'engToej', fag: 'engelsk', e: '👕', navn: 'Tøj', emne: 'engToej', tale: 'Tøj. Lyt til tøjet på engelsk.' },
    // «Sig efter mig» (18-10-2026): barnet hører en kort sætning og siger den selv (engelsk-opgaver.js SIG)
    { id: 'engSig', fag: 'engelsk', e: '💬', navn: 'Sig efter mig', emne: 'engSig', tale: 'Sig efter mig. Sig det, du hører på engelsk.' },
  ];

  // Natur (pilot 20-10-2026, natur-opgaver.js): se lorten og sporet → tryk på dyret; «Hvem har gået her?» (trin 0,
  // 21-10-2026): kun sporet. Åbne fra start; fremskridtet gemmes som engelsk i data.dansk[emne] (gem.js kender emnet).
  // hvad: voksnes overblik (voksen.js indlæser ikke natur-opgaver.js). Savannen (pilot 21-10-2026: spor og lort skiftevis) er
  // pilot: true — den lyser aldrig som anbefalet (indholdsplanen: ellers måler vi lyset, ikke lysten); ▶ går kun dertil for
  // at fortsætte en afbrudt mission dér (spilVerden).
  const NATUR_VERDENER = [
    { id: 'naturLort', fag: 'natur', e: '💩', navn: 'Gæt en lort', emne: 'naturLort', hvad: 'Lort og spor → dyr', tale: 'Gæt en lort. Hvem har lavet den?' },
    { id: 'naturSpor', fag: 'natur', e: '🐾', navn: 'Hvem har gået her?', emne: 'naturSpor', hvad: 'Spor → dyr', tale: 'Hvem har gået her? Se sporet, og tryk på dyret.' },
    { id: 'naturSavanne', fag: 'natur', e: '🦁', navn: 'Savannen', emne: 'naturSavanne', hvad: 'Spor og lort → dyr · tæl zebraer · første lyd', tale: 'Savannen. Her bor løven og zebraen.', pilot: true },
  ];

  // Fagene på fagvalget i tastaturets rækkefølge (1, 2, 3, 4). Engelsk og natur kun, når deres opgavefil er indlæst.
  const FAG = [
    { id: 'matematik', e: '🔢', navn: 'Matematik', label: 'Matematik — tal', tale: 'Matematik.' },
    { id: 'dansk', e: '🔤', navn: 'Dansk', label: 'Dansk — bogstaver', tale: 'Dansk.' },
    { id: 'engelsk', e: '🇬🇧', navn: 'Engelsk', label: 'Engelsk — ord', tale: 'Engelsk.' },
    { id: 'natur', e: '🌿', navn: 'Natur', label: 'Natur — dyr', tale: 'Natur.' },
  ];

  // Lektion: vises første gang, en verden åbnes (og kan høres igen med 📖). 2–4 korte sætninger, der læses op,
  // og en lille tegning med de repræsentationer, verdenen bruger (lektionTegning nedenfor).
  const LEKTIONER = {
    taelle: 'Her i Tælleskoven tæller vi. Vi peger på hver ting og siger et tal. Det sidste tal, vi siger, er, hvor mange der er.',
    tegne: 'I Tegnebyen tegner og måler vi. Vi trykker på prikker og tegner trekanter og firkanter. Vi måler med en lineal i centimeter — og med klodser.',
    former: 'I Formbyen bor figurerne. En trekant har tre hjørner. En firkant har fire hjørner. En cirkel er rund og har ingen hjørner.',
    plus10: 'På Plusbjerget lægger vi sammen. Tre og to er fem i alt. Vi kan tælle på fingrene.',
    venner: "På Venneøen bor 10'er-vennerne. Syv og tre er 10'er-venner, for de er ti tilsammen.",
    minus: 'I Minussøen tager vi væk. Vi har seks og tager to væk. Så er der fire tilbage.',
    tiere: 'I Klodsbyen bygger vi med stænger. En stang er ti klodser. To stænger og tre klodser er treogtyve.',
    tierbro: 'På Tierbroen går vi over ti. Otte og fem: først op til ti, og så resten. Det er tretten.',
    moenstre: 'I Mønsterslottet gentager vi. Rød, blå, rød, blå. Hvad kommer så? Rød!',
    torvet: 'På Klokketorvet ser vi på uret og tæller penge. Den lille viser viser timen. Den store viser viser minutterne.',
    taarn: 'I Lystårnet er det hele blandet. Hver gang du hjælper et dyr, lyser tårnet lidt mere.',
    rim: 'Ord rimer, når de lyder ens til sidst. Kat og hat rimer. Sol og stol rimer.',
    lyde: 'Hvert bogstav har sin egen lyd. Sol starter med lyden i sol. Mus starter med lyden i mus. Lyt godt efter.',
    alfabet: 'Alfabetet er alle bogstaverne i rækkefølge. Hvert bogstav har et stort og et lille.',
    lydering: 'Når vi lyderer, siger vi lydene efter hinanden. Så hører vi, hvilket ord det er.',
    smaaord: 'Nogle små ord ser vi så tit, at vi kender dem med det samme. Og, er og jeg er små ord.',
    jagt: 'I Bogstavjagten flyver der bobler med bogstaver. Lyt til lyden, og stryg gennem det bogstav, du hører — med fingeren eller pennen.',
    historiebog: 'I Historiebogen er der små historier. Tryk på et ord, så hører du det. Læs historien, tegn den, og skriv et ord fra den.',
    naturLort: 'Alle dyr laver lort, og den ser forskellig ud. Se på lorten og på sporet. Tryk så på det dyr, der har lavet den.',
    naturSpor: 'Når et dyr går i mudder eller sne, sætter det spor. Se på sporet. Tryk så på det dyr, der har gået her.',
    naturSavanne: 'Langt væk ligger savannen, en stor slette med græs og spredte træer. Her bor løven, zebraen og giraffen. Se sporet eller lorten, og tryk på dyret.',
  };

  // «Vælg selv» (🎒): fagets emner som store ikoner, delt i afsnit (Jimmy 18-10-2026: «når man vælger dansk er det det
  // man kommer ind på»). Hver verden står i præcis ét afsnit af sit fag; overskriften læses op ved tryk (tale).
  // Overskriftens ikon må ikke stå på et kort eller en knap på samme skærm (UI-review 18-10: 📖 lignede lektionsknappen).
  // Dansk følger læsningens vej: lytte → bogstaverne → læse. Engelsk: de første ord og selv sige det øverst, hverdagens ting
  // og mad og tøj nedenunder — så de 10 kort står på to rækker på iPad liggende (med «Sig det selv» sidst blev det tre
  // rækker, og 69 px skulle rulles; e2e tjekAlleKortSynlige, 21-10-2026). Eventyrets rækkefølge er ENGELSK_VERDENER.
  const VAELG_GRUPPER = [
    { fag: 'matematik', e: '🔢', navn: 'Tal', tale: 'Tal. Her tæller og regner vi.', verdener: ['taelle', 'plus10', 'venner', 'minus', 'tiere', 'tierbro', 'moenstre'] },
    { fag: 'matematik', e: '📐', navn: 'Former', tale: 'Former. Her leger vi med figurer.', verdener: ['former', 'tegne'] },
    { fag: 'matematik', e: '💰', navn: 'Klokken og penge', tale: 'Klokken og penge.', verdener: ['torvet'] },
    { fag: 'matematik', e: '🧩', navn: 'Det hele blandet', tale: 'Det hele blandet.', verdener: ['taarn'] },
    { fag: 'dansk', e: '🎧', navn: 'Rim og lyde', tale: 'Rim og lyde. Her lytter vi til ordene.', verdener: ['rim', 'lyde'] },
    { fag: 'dansk', e: '🅰️', navn: 'Bogstaver', tale: 'Bogstaver. Her leger vi med bogstaverne.', verdener: ['alfabet', 'jagt'] },
    { fag: 'dansk', e: '📝', navn: 'Læse og skrive', tale: 'Læse og skrive. Her læser vi ord og historier.', verdener: ['lydering', 'smaaord', 'historiebog'] },
    { fag: 'engelsk', e: '🌱', navn: 'De første ord', tale: 'De første ord. Farver, tal, dyr og figurer på engelsk.', verdener: ['engFarver', 'engTal', 'engDyr', 'engFormer'] },
    { fag: 'engelsk', e: '🗣️', navn: 'Sig det selv', tale: 'Sig det selv. Sig det, du hører på engelsk.', verdener: ['engSig'] },
    { fag: 'engelsk', e: '🧺', navn: 'Hverdagens ting', tale: 'Hverdagens ting. Køkkenet, hjemmet og legepladsen på engelsk.', verdener: ['engKoekken', 'engHjemme', 'engLegeplads'] },
    { fag: 'engelsk', e: '🛒', navn: 'Mad og tøj', tale: 'Mad og tøj. Lyt til maden og tøjet på engelsk.', verdener: ['engMad', 'engToej'] },
    { fag: 'natur', e: '🔍', navn: 'Dyrenes spor', tale: 'Dyrenes spor. Hvem har været her?', verdener: ['naturLort', 'naturSpor'] },
    { fag: 'natur', e: '🌍', navn: 'Savannen', tale: 'Savannen. Her bor løven og zebraen.', verdener: ['naturSavanne'] },
  ];

  // Skolens ord bruges i oplæsningen (tælle videre, tage væk, forskel, 10'er-venner …)
  const HJAELP_TALE = {
    tael: 'Lad os tælle sammen.',
    figurHjoerner: 'Lad os tælle hjørner og sider.',
    cmHop: 'Lad os hoppe en centimeter ad gangen.',
    tallinje: 'Lad os hoppe på tallinjen.',
    fingre: 'Lad os tælle på fingrene.',
    fingreMangler: 'Lad os tælle videre på fingrene.',
    kugle: 'Lad os kigge under bladet.',
    talstreg: 'Lad os tælle hen ad talslangen.',
    visTal: 'Se her.',
    sammenlign: 'Lad os bygge et tårn for hvert tal.',
    tilbage: 'Lad os tælle dem, der er tilbage.',
    klodserVaek: 'Lad os tage klodserne væk én ad gangen.',
    klodserPlus: 'Lad os tælle videre med klodser.',
    tiFoerst: 'Lad os fylde 10-stangen først.',
    forskel: 'Lad os se, hvor mange flere der er.',
    parvis: 'Lad os sætte dem sammen to og to.',
    par: 'Lad os stille klodserne to og to.',
    raekke: 'Lad os tælle sammen.',
    staenger: 'Lad os tælle stængerne. Hver stang er 10.',
    visForm: 'Se her.',
    hjoerner: 'Lad os tælle hjørnerne.',
    kanter: 'Lad os tælle kanterne.',
    moenster: 'Lad os sige mønstret højt.',
    urVisere: 'Lad os kigge på viserne.',
    visUr: 'Se her.',
    stilHel: 'Lad os stille uret sammen.',
    stilFlyt: 'Lad os flytte den store viser.',
    stilLille: 'Lad os kigge på den lille viser.',
    stilKvarter: 'Lad os flytte den store viser et kvarter ad gangen.',
    moenter: 'Lad os tælle kronerne. Vi starter med den største mønt.',
    hoerIgen: 'Lyt godt efter.',
    visBogstav: 'Se her.',
    visOrd: 'Se her.',
    rimLyt: 'Lyt efter slutningen af ordene.',
    alfabetSang: 'Lad os sige alfabetet.',
    lys: 'Se her.',
    visEngelsk: 'Se her.', // engelsk: det rigtige billede, og ordet på engelsk og så på dansk
    urFem: 'Lad os tælle fem ad gangen.',
    rute: 'Lad os gå vejen sammen.',
    vendOp: 'Se kortene igen.',
    laesKort: 'Lyt til svarene.',
    foersteBrik: 'Se her. Den her kommer først.',
    skrivBogstav: 'Se, hvordan vi skriver det i hånden.',
    alfabetVis: 'Se alfabetet.',
    visPlads: 'Se her.',
    lydFoerste: 'Lyt til lydene i det første ord.',
    fortaelTil: 'Lyt til historien igen.',
    naesteBrik: 'Se her.',
  };

  // Figurer i Formbyen som SVG (egen grafik). Hjørnerne får små prikker, som hjælpen kan tælle.
  const FORM_PUNKTER = (() => {
    const polygon = (n, r, start) => Array.from({ length: n }, (_, i) => {
      const a = start + i * 2 * Math.PI / n;
      return [50 + r * Math.cos(a), 52 + r * Math.sin(a)];
    });
    return {
      trekant: [[50, 8], [93, 88], [7, 88]],
      firkant: [[12, 20], [84, 8], [92, 86], [16, 90]], // en firkant er ikke altid et kvadrat
      kvadrat: [[12, 12], [88, 12], [88, 88], [12, 88]],
      rektangel: [[2, 26], [98, 26], [98, 78], [2, 78]],
      femkant: polygon(5, 46, -Math.PI / 2),
      sekskant: polygon(6, 46, -Math.PI / 2),
      // Engelsk (13-10-2026): stjernen (fem takker) og hjertet (hjertekurven i 48 punkter) — kun til «Figurer»
      stjerne: Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 20 : 48;
        return [50 + rr * Math.cos(a), 55 + rr * Math.sin(a)];
      }),
      hjerte: Array.from({ length: 48 }, (_, i) => {
        const t = i * 2 * Math.PI / 48, sn = Math.sin(t);
        return [50 + 2.85 * 16 * sn * sn * sn, 47 - 2.85 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))];
      }),
      // Engelsk (20-10-2026): flere figurer — ovalen på højkant (aldrig en cirkel), romben højere end bred (aldrig et
      // drejet kvadrat), halvcirklen med den flade side nedad, pilen mod højre, korset som et plus og ottekanten med
      // en flad top som et stopskilt
      oval: Array.from({ length: 48 }, (_, i) => {
        const a = i * 2 * Math.PI / 48;
        return [50 + 31 * Math.cos(a), 50 + 46 * Math.sin(a)];
      }),
      rombe: [[50, 4], [84, 50], [50, 96], [16, 50]],
      halvcirkel: Array.from({ length: 25 }, (_, i) => {
        const a = Math.PI + i * Math.PI / 24;
        return [50 + 47 * Math.cos(a), 74 + 47 * Math.sin(a)];
      }),
      pil: [[4, 36], [54, 36], [54, 12], [96, 50], [54, 88], [54, 64], [4, 64]],
      kors: [[36, 6], [64, 6], [64, 36], [94, 36], [94, 64], [64, 64], [64, 94], [36, 94], [36, 64], [6, 64], [6, 36], [36, 36]],
      ottekant: polygon(8, 47, -Math.PI / 2 + Math.PI / 8),
    };
  })();
  function formSvg(form, farve, drej, medHjoerner) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '-4 -4 108 108');
    svg.setAttribute('class', 'form-svg form-farve-' + ((farve || 0) % 6));
    svg.setAttribute('aria-hidden', 'true');
    const g = document.createElementNS(ns, 'g');
    if (drej) g.setAttribute('transform', 'rotate(' + drej + ' 50 50)');
    let figur;
    if (form === 'cirkel') {
      figur = document.createElementNS(ns, 'circle');
      figur.setAttribute('cx', 50); figur.setAttribute('cy', 50); figur.setAttribute('r', 44);
    } else {
      figur = document.createElementNS(ns, 'polygon');
      figur.setAttribute('points', FORM_PUNKTER[form].map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '));
    }
    figur.setAttribute('class', 'form-figur');
    g.append(figur);
    if (medHjoerner && FORM_PUNKTER[form]) {
      // Kanterne som streger (til «tæl kanterne») og hjørnerne som prikker
      const pk = FORM_PUNKTER[form];
      pk.forEach((p, i) => {
        const q = pk[(i + 1) % pk.length];
        const l = document.createElementNS(ns, 'line');
        l.setAttribute('x1', p[0]); l.setAttribute('y1', p[1]); l.setAttribute('x2', q[0]); l.setAttribute('y2', q[1]);
        l.setAttribute('class', 'kant');
        g.append(l);
      });
      FORM_PUNKTER[form].forEach((p) => {
        const c = document.createElementNS(ns, 'circle');
        c.setAttribute('cx', p[0]); c.setAttribute('cy', p[1]); c.setAttribute('r', 7);
        c.setAttribute('class', 'hjoerne taelbar');
        g.append(c);
      });
    }
    svg.append(g);
    return svg;
  }

  // Lystårnet tegnet som inline SVG (egen grafik) — bruges kun, hvis grafik.js mangler
  const FYRTAARN = '<svg viewBox="0 0 100 120" aria-hidden="true"><path d="M50 30 L6 14 L6 46 Z M50 30 L94 14 L94 46 Z" fill="#ffe680" opacity=".75"/>' +
    '<path d="M36 112 L40 40 L60 40 L64 112 Z" fill="#fffdf8" stroke="#4a2f1c" stroke-width="2"/>' +
    '<path d="M38.4 84 L61.6 84 L62.4 98 L37.6 98 Z M39.6 58 L60.4 58 L61 70 L39 70 Z" fill="#e5484d"/>' +
    '<rect x="38" y="26" width="24" height="14" rx="3" fill="#ffc83d" stroke="#4a2f1c" stroke-width="2"/>' +
    '<path d="M35 27 L50 12 L65 27 Z" fill="#e5484d" stroke="#4a2f1c" stroke-width="2"/>' +
    '<rect x="26" y="110" width="48" height="8" rx="4" fill="#4a2f1c" opacity=".5"/></svg>';
  // Voksen-kortets lås på forsiden i samme tegnestil som grafik.js (96 × 96, kontur 3, flade farver fra kortets variabler)
  const LAAS = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none" stroke="var(--kontur,#4a2f1c)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
    '<ellipse cx="48" cy="88" rx="30" ry="4" fill="var(--farve-1-moerk,#4f4338)" opacity=".15" stroke="none"/>' +
    '<path d="M30 44V31a18 18 0 0 1 36 0v13" stroke-width="12"/><path d="M30 44V31a18 18 0 0 1 36 0v13" stroke="var(--papir,#fffaf0)" stroke-width="5"/>' +
    '<rect x="18" y="42" width="60" height="42" rx="10" fill="var(--farve-1,#8a7a6b)"/>' +
    '<path d="M48 55a6 6 0 0 0-3.5 10.9L42 75h12l-2.5-9.1A6 6 0 0 0 48 55Z" fill="var(--kontur,#4a2f1c)"/></svg>';
  // Voksen-kortets bog (13-10-2026: den voksnes eget spil er åbent, låsen sidder på Indstillinger): en opslået bog med
  // tekstlinjer og en parabel — samme tegnestil og kortets variabler som låsen
  const BOG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none" stroke="var(--kontur,#4a2f1c)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
    '<ellipse cx="48" cy="88" rx="34" ry="4" fill="var(--farve-1-moerk,#4f4338)" opacity=".15" stroke="none"/>' +
    '<path d="M6 30v48q22-6 42 5 20-11 42-5V30" fill="var(--farve-1,#8a7a6b)"/>' +
    '<path d="M48 78Q31 66 11 71V22q20-8 37 4 17-12 37-4v49q-20-5-37 7Z" fill="var(--papir,#fffaf0)"/>' +
    '<path d="M48 26v52M18 36h22M18 45h22M18 54h15M57 62h22M60 66V33"/>' +
    '<path d="M61 37q8 34 17 0" stroke="var(--farve-2-moerk,#c2830f)" stroke-width="4"/></svg>';
  // Lystårnet i fem lysstadier (grafik.taarn[0..4]) efter lysperlerne, der allerede gemmes (data.perler: én pr. mission i
  // eventyret). Lanternen tændes ved den første perle, de to nederste vinduer og strålerne ved 5 og 12, alt lys og to
  // stjerner ved 30 — samme sted, som tårnets glød er fuld (lysStyrke). Perlerne tælles kun op, så lys slukkes aldrig.
  const TAARN_TAERSKLER = [0, 1, 5, 12, 30];
  function taarnStadie(perler) {
    let st = 0;
    TAARN_TAERSKLER.forEach((t, i) => { if ((Number(perler) || 0) >= t) st = i; });
    return st;
  }
  // stadie udeladt: barnets eget tårn (med tekst til skærmlæser). Startsiden (intet barn) viser et fast stadie.
  function fyrtaarn(klasse, stadie) {
    const n = document.createElement('span');
    n.className = 'fyrtaarn ' + (klasse || '');
    const st = stadie === undefined ? taarnStadie(data ? data.perler : 0) : stadie;
    const svg = GR && GR.taarn ? tegning(GR.taarn[st], 'taarn-tegning') : null;
    if (!svg) { n.innerHTML = FYRTAARN; return n; }
    n.classList.add('med-tegning');
    n.setAttribute('data-stadie', st);
    if (stadie === undefined) { n.setAttribute('role', 'img'); n.setAttribute('aria-label', 'Lystårnet: ' + st + ' af 4 lys tændt'); }
    n.append(svg);
    return n;
  }

  // ---------- Tegningerne fra grafik.js (fase A) ----------
  // Kun SVG-tekst fra grafik.js (tjekket af test/test-grafik.js) sættes ind. Mangler filen eller en tegning,
  // viser spillet emojien som før. Farverne kommer fra skallernes variabler (--farve-1, --kontur …).
  const GR = window.Grafik || null;
  const SVG_SKABELON = document.createElement('template');
  function tegning(tekst, klasse) {
    if (typeof tekst !== 'string' || !tekst) return null;
    SVG_SKABELON.innerHTML = tekst;
    const svg = SVG_SKABELON.content.firstElementChild;
    SVG_SKABELON.innerHTML = '';
    if (!svg || svg.localName !== 'svg') return null;
    svg.setAttribute('class', klasse);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    return svg;
  }
  // Rejsevennen med et udtryk — hvert udtryk er sin egen tegning (grafik.vennerUdtryk, ChatGPT/Codex 11-10):
  // glad (standard), taenker (efter et forkert svar), jubler (fejringen), vinker (startskærmen og valg af ven), laeser og
  // maler (Historiebogen), taeller (tællehjælpen), maler (Tegnebyen), udforsker (kortet og 🎒), regnvejr (bruges ikke p.t.)
  // og hviler («Vi ses i morgen»). Mangler udtrykket, bruges den gamle tegning med tre udtryk (grafik.venner; CSS viser
  // glad for de andre), og ellers emojien. Vennebogens venner (grafik.univers) har én tegning til alle udtryk.
  // data-ven og data-udtryk bruges af saetUdtryk (og testene).
  function venTegning(id, udtryk) {
    const u = udtryk || 'glad';
    const alle = GR && GR.vennerUdtryk && GR.vennerUdtryk[id];
    const en = GR && GR.univers && GR.univers[id];
    const svg = (alle ? tegning(alle[u], 'ven-tegning') : null) || (en ? tegning(en, 'ven-tegning') : null) ||
      (GR && GR.venner ? tegning(GR.venner[id], 'ven-tegning') : null);
    if (!svg) return document.createTextNode((FIGURER[id] || FIGURER.bobo).e);
    svg.setAttribute('data-ven', id);
    svg.setAttribute('data-udtryk', u);
    return svg;
  }
  // Vækststigens ven i voksendelen (grafik.trin, forslag B) — mangler tegningen, viser voksen.js en reserve
  const vaekstTegning = (id) => (GR && GR.trin ? tegning(GR.trin[id], 'vaekst-tegning') : null);
  // Skift udtryk ved at bytte hele tegningen (én SVG pr. udtryk) — intet sker, hvis vennen allerede har udtrykket
  function saetUdtryk(el, udtryk) {
    const svg = el && el.querySelector('.ven-tegning');
    if (!svg || svg.getAttribute('data-udtryk') === udtryk) return;
    const ny = venTegning(svg.getAttribute('data-ven'), udtryk);
    if (ny.nodeType === 1) svg.replaceWith(ny);
  }
  // Vennens udtryk, mens barnet arbejder på en opgave: maler ved tegneopgaverne (Tegnebyen), ellers glad
  const grundUdtryk = (opg) => (opg && opg.emne === 'tegne' ? 'maler' : 'glad');
  // Verdenens ikon (de 18 verdener på kortet, i 🎒 Vælg selv og ved lektionen) — ellers emojien (Lystårnet: det gamle tårn)
  function verdenIkon(v) {
    const svg = GR && GR.verdener ? tegning(GR.verdener[v.id], 'verden-tegning') : null;
    if (svg) return h('span', { class: 'station-ikon med-tegning', 'aria-hidden': 'true' }, svg);
    return v.svg ? fyrtaarn('station-ikon') : h('span', { class: 'station-ikon', 'aria-hidden': 'true' }, v.e);
  }
  // Samledyret (grafik.samledyr: samme id'er og rækkefølge som MAERKER i opgaver.js) — ellers emojien
  function dyrTegning(m) {
    const svg = GR && GR.samledyr ? tegning(GR.samledyr[(T.samling || 'jungle') + '/' + m.id], 'dyr-tegning') : null;
    return svg || document.createTextNode(m.e);
  }
  // Lille udgave til en tekstlinje (▶ på kortet, lektionens titel)
  function verdenIkonLille(v, klasse) {
    const svg = GR && GR.verdener ? tegning(GR.verdener[v.id], 'verden-tegning') : null;
    return h('span', { class: klasse + (svg ? ' med-tegning' : ''), 'aria-hidden': 'true' }, svg || (v.svg ? '🗼' : v.e));
  }
  // C · minispil: tegningerne i Grafik.minispil (id = overskriften i docs/LYSTAARNET-GRAFIK-C.md). Mangler en, bruges emojien.
  const MINI = (GR && GR.minispil) || {};
  const erMinispil = (opg) => !!opg && O.MINISPIL.some((m) => m.id === opg.type);
  function miniTegning(id, klasse) { return id && MINI[id] ? tegning(MINI[id], klasse || 'mini-tegning') : null; }
  function miniBillede(id, e, klasse) {
    const svg = miniTegning(id, 'mini-tegning');
    return h('span', { class: 'mini-billede' + (klasse ? ' ' + klasse : '') + (svg ? ' med-tegning' : ''), 'aria-hidden': 'true' }, svg || ordTegn(e) || '');
  }
  // Talordenes emoji er tastetegn (🔟, 2️⃣ …): et barn på seks skal se ti ting, ikke en tast. Billedet bliver i stedet
  // terningbilleder (skolens repræsentation, som terning() i matematik): 1–6 på én terning, 7–10 som fem og resten på
  // to terninger. Ordet og oplæsningen er de samme — kun billedet skifter. Andre emoji kommer tilbage uændret.
  const TERNING_PLADS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  function tastetegnTal(e) {
    if (e === '\u{1F51F}') return 10;
    const m = /^([1-9])\uFE0F?\u20E3$/.exec(e || '');
    return m ? Number(m[1]) : 0;
  }
  function talBillede(n) {
    const svg = svgEl('svg', { class: 'tal-billede', viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false', 'data-tal': n });
    // En terning med sit antal øjne: x, y = øverste venstre hjørne, s = sidelængden
    const terning = (x, y, s, antal) => {
      svgEl('rect', { x: x, y: y, width: s, height: s, rx: s * 0.22, class: 'tal-terning' }, svg);
      TERNING_PLADS[antal].forEach((p) => svgEl('circle', { cx: x + s * (0.27 + 0.23 * ((p - 1) % 3)), cy: y + s * (0.27 + 0.23 * Math.floor((p - 1) / 3)), r: s * 0.095, class: 'tal-oeje' }, svg));
    };
    if (n <= 6) terning(7, 7, 86, n);
    else { terning(2, 2, 54, 5); terning(44, 44, 54, n - 5); } // to terninger på skrå: den anden ligger på hjørnet (dækker intet øje)
    return svg;
  }
  const ordTegn = (e) => { const n = tastetegnTal(e); return n ? talBillede(n) : e; };

  // ---------- Små hjælpere ----------
  function h(tag, props) {
    const n = document.createElement(tag);
    if (props) {
      for (const k in props) {
        const v = props[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'style') n.style.cssText = v;
        else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? '' : v);
      }
    }
    for (let i = 2; i < arguments.length; i++) tilfoejBoern(n, arguments[i]);
    return n;
  }
  function tilfoejBoern(n, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach((x) => tilfoejBoern(n, x)); return; }
    n.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  // ?hurtig i adressen afspiller hjælpen hurtigere (bruges kun af test/test-e2e.js)
  const TEMPO = /[?&]hurtig/.test(location.search) ? 0.12 : 1;
  // Mens hjælpens indledning siges (Tale.foerst), starter ventetiden først, når den er sagt færdig
  const vent = (ms) => {
    const tid = () => new Promise((r) => setTimeout(r, ms * TEMPO));
    return Tale.foerst ? Tale.foerst.then(tid) : tid();
  };
  // Bevægelse er pynt: med prefers-reduced-motion springer den direkte til slutbilledet
  const udenBevaegelse = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------- Lager ----------
  let lager;
  let lagerIHukommelse = false; // localStorage kan ikke bruges (blokerede websitedata): intet gemmes
  let lagerFuldt = false;       // localStorage kan læses, men ikke skrives (fuldt, eller privat browsing på ældre iOS)
  try {
    lager = window.localStorage;
    lager.getItem('mat_test'); // kaster, hvis adgang er spærret
  } catch (e) {
    lager = G.hukommelsesLager();
    lagerIHukommelse = true;
  }
  if (!lagerIHukommelse) {
    // Et fuldt lager må IKKE skifte til et tomt hukommelseslager — så ville pigernes data se ud til at være væk,
    // og «Gem en kopi» ville gemme en tom fil. Vi bliver på localStorage, kan læse alt og advarer om, at der ikke gemmes.
    try { lager.setItem('mat_test', '1'); lager.removeItem('mat_test'); } catch (e) { lagerFuldt = true; }
  }
  // Data under de gamle nøgler kopieres til de nye (den gamle nøgle bliver liggende som backup) — på alle sider
  G.migrerNoegler(lager);
  let voksenRes = G.indlaesVoksen(lager);
  const voksen = voksenRes.data;

  // ---------- Lager på enheden (IndexedDB): indtalte lydklip og børnenes tegninger ----------
  // Kun på denne enhed — intet sendes nogen steder hen. Fejler IndexedDB (fx privat browsing), virker spillet uden.
  const KlipLager = {
    db: null,
    aaben() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((res, rej) => {
        let r;
        try { r = indexedDB.open('lystaarn', 1); } catch (e) { rej(e); return; }
        r.onupgradeneeded = () => {
          const db = r.result;
          if (!db.objectStoreNames.contains('klip')) db.createObjectStore('klip');
          if (!db.objectStoreNames.contains('tegninger')) db.createObjectStore('tegninger');
        };
        r.onsuccess = () => { this.db = r.result; res(this.db); };
        r.onerror = () => rej(r.error);
      });
    },
    async kald(store, mode, fn) {
      const db = await this.aaben();
      return new Promise((res, rej) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        tx.oncomplete = () => res(req ? req.result : undefined);
        tx.onerror = () => rej(tx.error);
        tx.onabort = () => rej(tx.error);
      });
    },
    hent(store, id) { return this.kald(store, 'readonly', (s) => s.get(id)); },
    gem(store, id, v) { return this.kald(store, 'readwrite', (s) => s.put(v, id)); },
    slet(store, id) { return this.kald(store, 'readwrite', (s) => s.delete(id)); },
    noegler(store) { return this.kald(store, 'readonly', (s) => s.getAllKeys()); },
    alle(store) {
      return this.aaben().then((db) => new Promise((res, rej) => {
        const ud = {};
        const tx = db.transaction(store, 'readonly');
        const c = tx.objectStore(store).openCursor();
        c.onsuccess = () => { const k = c.result; if (k) { ud[k.key] = k.value; k.continue(); } };
        tx.oncomplete = () => res(ud);
        tx.onerror = () => rej(tx.error);
      }));
    },
  };

  // Barnets navn som lydklip: «egetnavn-<barn>» (lydklip.js navnKlipId) — optaget på enheden, aldrig i repoet
  const NAVNEKLIP = 'egetnavn-';
  const erNavneklip = (id) => typeof id === 'string' && id.indexOf(NAVNEKLIP) === 0;

  // ---------- Lyd (WebAudio) — effekter og indtalte klip ----------
  // Effekterne spilles af lydpalet.js (fase B) på spillets egen AudioContext — Lyd er en tynd facade, så de mange
  // Lyd.tryk()/Lyd.rigtig() i spillet ikke skal ændres. Feedback med tale går gennem Forloeb (docs/LYD-INTEGRATION.md).
  const Lyd = {
    ctx: null,
    // Opret/væk konteksten i selve trykket (paletten kalder den også, når den låser op)
    aabn() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        if (!this.ctx) {
          this.ctx = new AC();
          // iOS: en tom lyd i selve trykket låser lyden op
          const b = this.ctx.createBuffer(1, 1, 22050);
          const s = this.ctx.createBufferSource();
          s.buffer = b; s.connect(this.ctx.destination); s.start(0);
        }
        // iOS: 'suspended' — og 'interrupted' efter baggrund, opkald eller lydløs — vækkes i selve trykket
        const st = this.ctx.state;
        if (st && st !== 'running' && st !== 'closed') { const p = this.ctx.resume(); if (p && p.catch) p.catch(() => {}); }
      } catch (e) { this.ctx = null; }
      return this.ctx;
    },
    // Kaldes i hvert tryk: låser også paletten op (den vækker også fra iOS' 'interrupted')
    init() { this.aabn(); Palet.unlock(); },
    // Højst én effekt ad gangen; en vigtigere afløser en mindre vigtig (tryk < svar < fejring)
    tryk() { if (!Forloeb.optaget()) Palet.tryk(); }, // intet klik oven i en igangværende feedback
    rigtig() { Palet.rigtig(); },
    blid() { Palet.forkertBlid(); },
    tael() { if (!Tale.foerst) Palet.tryk(); }, // ikke oven i den blide lyd og hjælpens indledning
    fejring() { Palet.fejring(); },
    pling() { Palet.boblePop(); },
    hop() { Palet.fodspor(); },

    // ---- Indtalte klip (fx bogstavlyde): lyd/<id>.wav, hvis id'et står i lyd/liste.json → reserven med talesyntesen.
    // En bogstavlyd må aldrig blive bogstavets navn: reserven er fx «lyden i sol». Klip er oplæsning, så de følger den
    // voksnes «Oplæsning» til/fra. Fra enheden (IndexedDB) spilles KUN barnets navn: bogstav- og ordoptagelser fra
    // 🎙️ Indtal bliver liggende, men afspilles ikke (Jimmy 14-10-2026: «man kan ikke høre, hvad jeg siger»).
    lokale: {},      // id → Uint8Array (WAV), indtalt på denne enhed
    liste: null,     // Set med id'er fra lyd/liste.json
    bufre: {},       // id → afkodet AudioBuffer
    harLokaltKlip(id) { return !!this.lokale[id]; },
    lokaltKlip(id) { return this.lokale[id] || null; },
    saetLokaltKlip(id, bytes) { this.lokale[id] = bytes; delete this.bufre[id]; },
    fjernLokaltKlip(id) { delete this.lokale[id]; delete this.bufre[id]; },
    // Barnets navn (NAVNEKLIP) findes kun på enheden: aldrig fra lyd/liste.json. Alt andet kun fra lyd/liste.json.
    harKlip(id) { return erNavneklip(id) ? !!this.lokale[id] : !!(this.liste && this.liste.has(id)); },
    indlaesKlip() {
      const lokale = KlipLager.alle('klip').then((alle) => { for (const id in alle) if (alle[id]) this.lokale[id] = new Uint8Array(alle[id]); }).catch(() => {});
      const liste = (/^https?:$/.test(location.protocol) ? fetch('lyd/liste.json').then((r) => (r.ok ? r.json() : [])) : Promise.resolve([]))
        .then((l) => { this.liste = new Set(Array.isArray(l) ? l.filter((x) => typeof x === 'string') : []); })
        .catch(() => { this.liste = new Set(); });
      return Promise.all([lokale, liste]);
    },
    async afkod(id) {
      if (this.bufre[id]) return this.bufre[id];
      let bytes = erNavneklip(id) ? this.lokale[id] : null;
      if (!bytes && !erNavneklip(id) && this.liste && this.liste.has(id)) {
        const r = await fetch('lyd/' + encodeURIComponent(id) + '.wav');
        if (r.ok) bytes = new Uint8Array(await r.arrayBuffer());
      }
      if (!bytes || !this.ctx) return null;
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      const buf = await new Promise((res, rej) => { const p = this.ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); });
      this.bufre[id] = buf;
      return buf;
    },
    // Afspil et klip (eller sig reserven). Løftet holder, til lyden er færdig.
    async klip(id, reserve) {
      if (!voksen.tale) return;
      // Barnets navn: kun et klip optaget på enheden — ingen hentning og ingen reserve (navnet må aldrig til talen)
      const navn = erNavneklip(id);
      if (navn) { if (!this.lokale[id]) return; reserve = ''; }
      const gen = this.klipGen, ng = this.navnGen;
      let buf = null;
      try { if (this.harKlip(id)) buf = await this.afkod(id); } catch (e) { buf = null; }
      if (gen !== this.klipGen) return; // stoppet, mens klippet blev hentet/afkodet: hverken klip eller reserve
      if (navn && ng !== this.navnGen) return; // ny tale eller stop imens: navnet siges ikke bagefter
      if (buf && this.ctx) {
        return new Promise((res) => {
          try {
            const s = this.ctx.createBufferSource();
            s.buffer = buf; s.connect(this.ctx.destination);
            const k = { s: s, res: res };
            if (navn) this.navnKilde = k; else this.kilde = k;
            s.onended = () => { if (this.kilde === k) this.kilde = null; if (this.navnKilde === k) this.navnKilde = null; res(); };
            s.start(0);
            setTimeout(res, (buf.duration * 1000 + 400) * TEMPO + 200); // hvis onended aldrig kommer
          } catch (e) { res(); }
        });
      }
      if (reserve) return Tale.sigVent(reserve);
    },
    kilde: null,     // klippet, der spiller nu ({ s: AudioBufferSourceNode, res })
    klipGen: 0,      // tælles op af stopKlip, så et klip, der stadig hentes/afkodes, aldrig starter bagefter
    // Stop klippet, der spiller — og et, der stadig hentes/afkodes (et afbrudt feedback-forløb, eller 🔊 midt i det,
    // så sætningen ikke starter oven i klippet). Klippets løfte afsluttes.
    stopKlip() {
      this.klipGen++;
      this.stopNavn();
      const k = this.kilde;
      if (!k) return;
      this.kilde = null;
      try { k.s.onended = null; k.s.stop(); } catch (e) { /* allerede stoppet */ }
      k.res();
    },
    // Barnets navn har sin egen plads og tæller: Tale.sig og Tale.stop stopper KUN navnet — Lydtogets og Bogstavjagtens
    // bogstavklip spiller videre som før
    navnKilde: null,
    navnGen: 0,
    stopNavn() {
      this.navnGen++;
      const k = this.navnKilde;
      if (!k) return;
      this.navnKilde = null;
      try { k.s.onended = null; k.s.stop(); } catch (e) { /* allerede stoppet */ }
      k.res();
    },
  };

  // ---------- Piper-stemmen som lydfiler (Jimmy 12-10-2026: «piper stemmen er mega god brug den») ----------
  // tale/liste.json = { nøgle: ms } og tale/<ab>/<nøgle>.mp3 laves af vaerktoej/lav-tale.js. Tale.sig deler teksten i
  // sætninger (talefiler.js) og spiller dem, der findes som fil, på spillets AudioContext; resten siges med
  // talesyntesen som før. Bruges, når den voksne ikke har valgt en bestemt stemme (voksen.stemme tom = «Automatisk»).
  const Piper = {
    liste: null,         // { nøgle: ms }, når tale/liste.json er hentet
    bufre: new Map(),    // nøgle → AudioBuffer (højst 80; den ældste ryger ud)
    henter: new Map(),   // nøgle → løfte, mens filen hentes og afkodes
    indlaes() {
      if (!/^https?:$/.test(location.protocol) || !window.Talefiler) return Promise.resolve();
      return fetch('tale/liste.json').then((r) => (r.ok ? r.json() : {}))
        .then((l) => { this.liste = l && typeof l === 'object' && !Array.isArray(l) ? l : {}; })
        .catch(() => { this.liste = {}; });
    },
    // window.__ingenPiper: e2e-delene, der lytter efter den falske stemmes tekst-log (test/test-e2e.js)
    slaaetTil() { return !!this.liste && !voksen.stemme && !!window.Talefiler && !window.__ingenPiper; },
    // Filerne findes (uanset den voksnes valg) — voksendelen viser så «Lystårnets stemme» øverst
    findes() { return !!this.liste && Object.keys(this.liste).length > 0 && !!window.Talefiler && !window.__ingenPiper; },
    // window.__taleUdenFil: e2e-delen «piper» samler de sætninger, der blev sagt uden fil
    noter(tekst) {
      if (!window.__taleUdenFil || !this.slaaetTil() || !Lyd.ctx) return;
      for (const e of window.Talefiler.enheder(tekst)) if (!this.noegle(e)) window.__taleUdenFil.push(e);
    },
    noegle(enhed) { const n = window.Talefiler.noegle(enhed); return this.liste && Object.prototype.hasOwnProperty.call(this.liste, n) ? n : null; },
    // Mindst én sætning har en fil, og lyden er låst op (efter første tryk) — ellers talesyntesen som før
    // Lydkanalen skal køre: på iOS kan den være 'suspended'/'interrupted' (opkald, lydløs) — så taler enhedens stemme
    // (review 12-10, fund 7)
    kan(tekst) { return this.vilTale(tekst) && this.kanalKoerer(); },
    // Piper ville tale sætningen (mindst én fil, og lyden er låst op) — uanset om kanalen kører lige nu
    vilTale(tekst) { return this.slaaetTil() && !!Lyd.ctx && window.Talefiler.enheder(tekst).some((e) => this.noegle(e)); },
    kanalKoerer() { return !!Lyd.ctx && (!Lyd.ctx.state || Lyd.ctx.state === 'running'); },
    // Væk lydkanalen og vent højst ms på 'running' (statechange eller resume()'s løfte). Giver true, hvis den kører.
    // iOS lægger kanalen i 'suspended'/'interrupted' (baggrund, opkald, lydløs); resume() er asynkron — uden ventetiden
    // talte første sætning efter et tryk med enhedens stemme og den næste med Piper (Jimmy 12-10: stemmen skiftede).
    VAEK_MS: 500,
    vaekKanal(ms) {
      const c = Lyd.ctx;
      if (!c) return Promise.resolve(false);
      if (this.kanalKoerer()) return Promise.resolve(true);
      if (c.state === 'closed') return Promise.resolve(false);
      return new Promise((res) => {
        let faerdig = false, frist = null;
        const slut = (v) => {
          if (faerdig) return;
          faerdig = true;
          clearTimeout(frist);
          try { if (c.removeEventListener) c.removeEventListener('statechange', tjek); } catch (e) { /* ingenting */ }
          res(v);
        };
        const tjek = () => { if (this.kanalKoerer()) slut(true); };
        try { if (c.addEventListener) c.addEventListener('statechange', tjek); } catch (e) { /* ingenting */ }
        frist = setTimeout(() => slut(this.kanalKoerer()), ms);
        try { const p = c.resume && c.resume(); if (p && p.then) p.then(tjek, () => {}); } catch (e) { /* kan ikke vækkes */ }
      });
    },
    // Piper er i brug, og listen er hentet. Alle puljens sætninger har en fil (test-tale), så «hør og find» kan bruges
    // uden en dansk stemme på enheden. (Gamle «gentag»-opgaver fra før puljen kan mangle filer — de siges med enhedens stemme.)
    klar() { return this.slaaetTil() && Object.keys(this.liste).length > 0; },
    buffer(n) {
      if (this.bufre.has(n)) { const b = this.bufre.get(n); this.bufre.delete(n); this.bufre.set(n, b); return Promise.resolve(b); }
      if (this.henter.has(n)) return this.henter.get(n);
      const ctx = Lyd.ctx;
      const p = fetch(window.Talefiler.sti(n)).then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((ab) => (ab && ctx ? new Promise((res, rej) => { const q = ctx.decodeAudioData(ab, res, rej); if (q && q.then) q.then(res, rej); }) : null))
        .then((b) => {
          this.henter.delete(n);
          if (b) { this.bufre.set(n, b); if (this.bufre.size > 80) this.bufre.delete(this.bufre.keys().next().value); }
          return b;
        }, () => { this.henter.delete(n); return null; });
      this.henter.set(n, p);
      // Et svar, der aldrig kommer, må ikke gøre sætningen tavs for altid: efter 8 s prøves der forfra næste gang
      setTimeout(() => { if (this.henter.get(n) === p) this.henter.delete(n); }, 8000);
      return p;
    },
    // Højst ms på en fil — ellers null (så taler enhedens stemme). Fejl giver også null.
    medFrist(p, ms) { return Promise.race([p.then((b) => b, () => null), new Promise((r) => setTimeout(() => r(null), ms))]); },
    // Pausen mellem sætningerne (Jimmy 21-10-2026: «Pauserne er blevet for lange … de skal være lidt mindre»): hver fil
    // slutter med 0,1–0,55 s stilhed (Pipers sentence_silence og stemmens hale, målt 21-10). Kun HALE_BEHOLD af den
    // spilles, så pausen bliver mindre, men ikke væk. Giver spilletiden i s; en buffer uden getChannelData (testenes falske) spilles helt.
    HALE_BEHOLD: 0.5,
    STILLE: 0.01, // ca. −40 dB
    tider: new WeakMap(), // AudioBuffer → spilletid
    spilletid(buf) {
      if (!buf.getChannelData || !buf.sampleRate) return buf.duration;
      if (this.tider.has(buf)) return this.tider.get(buf);
      const d = buf.getChannelData(0);
      let i = d.length - 1;
      while (i > 0 && Math.abs(d[i]) < this.STILLE) i--;
      const t = buf.duration - (d.length - 1 - i) / buf.sampleRate * (1 - this.HALE_BEHOLD);
      this.tider.set(buf, t);
      return t;
    },
    // Hent hele stemmen i baggrunden til brug uden net — roligt (to ad gangen) og kun, mens siden er synlig og online.
    // Filerne ligger i IndexedDB (TaleLager nedenfor; sw.js slår dem op dér). status = { hentet, iAlt } til voksendelen
    // (hentet = gemt i IndexedDB).
    // Aldrig Cache API her: et kald dertil får WebKit til at indlæse alle caches (13-10-2026, sw v126).
    status: null,
    async hentAlle() {
      // Kun når stemmen bruges (ikke med en valgt enhedsstemme eller uden oplæsning) — review 12-10, fund 4
      if (!this.liste || !TaleLager.findes() || this.henterAlle || !this.slaaetTil() || !voksen.tale) return;
      this.henterAlle = true;
      try {
        const gemte = await TaleLager.noegler();
        const har = new Set(gemte);
        // Filer, der ikke står i listen (en gammel stemme eller fart), fjernes (review 12-10, fund 5)
        const loese = gemte.filter((n) => !Object.prototype.hasOwnProperty.call(this.liste, n));
        if (loese.length) await TaleLager.slet(loese);
        const mangler = Object.keys(this.liste).filter((n) => !har.has(n));
        const iAlt = Object.keys(this.liste).length;
        this.status = { hentet: iAlt - mangler.length, iAlt: iAlt };
        // Styrer service workeren siden, gemmer den selv filen (sw.js) — ellers gør siden det. En fejl ved gemning
        // (fx fuld kvote) stopper det hele, så der ikke hentes 80 MB, der ikke kan gemmes. En netfejl (fetch eller
        // indholdet) springer kun filen over; den prøves igen ved næste start.
        // Service workeren sluger sine egne fejl ved gemning, så siden tæller selv efter i IndexedDB for hver
        // TJEK_HVER hentede filer: er antallet ikke vokset, stoppes der, og status viser det, der faktisk ligger dér.
        const swGemmer = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
        const TJEK_HVER = 200;
        let stop = false, sidenTjek = 0, sidstTalt = this.status.hentet;
        let taeller = null; // løftet, mens lageret tælles — den anden arbejder venter på det, før den henter mere
        const taelGemte = async () => {
          try {
            const nu = (await TaleLager.noegler()).filter((n) => Object.prototype.hasOwnProperty.call(this.liste, n)).length;
            this.status.hentet = nu;
            return nu;
          } catch (e) { return -1; } // kan lageret ikke læses, kan det heller ikke gemme
        };
        const arbejder = async () => {
          while (mangler.length && !stop) {
            if (taeller) { await taeller; continue; }
            if (document.hidden || navigator.onLine === false) { await new Promise((r) => setTimeout(r, 5000)); continue; }
            const n = mangler.shift();
            let ab = null;
            try {
              const svar = await fetch(window.Talefiler.sti(n));
              if (!svar || !svar.ok) continue;
              // Uden sw gemmer siden selv: kun et lydsvar (som sw.js' heltLydsvar) — ellers kunne fx en captive portals
              // HTML blive gemt som stemmefil og aldrig blive hentet igen
              if (!swGemmer && !/^audio\//i.test((svar.headers && svar.headers.get('Content-Type')) || '')) continue;
              ab = await svar.arrayBuffer();
            } catch (e) { continue; } // netfejl: filen springes over
            if (!swGemmer) {
              try { await TaleLager.gem(n, ab); } catch (e) { stop = true; break; }
              this.status.hentet++;
            } else if (++sidenTjek >= TJEK_HVER) {
              sidenTjek = 0;
              taeller = taelGemte().then((nu) => { if (nu <= sidstTalt) stop = true; sidstTalt = nu; taeller = null; });
              await taeller;
            }
          }
        };
        await Promise.all([arbejder(), arbejder()]);
        if (swGemmer) await taelGemte();
      } catch (e) { /* uden IndexedDB: filerne hentes, når de bruges */ }
      this.henterAlle = false;
    },
    // Engelsk (13-10-2026): nøglen til et engelsk ord med den engelske stemme (Talefiler.noegleEn), hvis filen findes.
    // Uafhængig af den voksnes valg af dansk stemme — der findes ingen anden engelsk stemme. Ikke i e2e uden Piper.
    noegleEn(tekst) {
      if (!this.liste || !window.Talefiler || !window.Talefiler.noegleEn || window.__ingenPiper) return null;
      const e = window.Talefiler.enheder(tekst)[0];
      const n = e ? window.Talefiler.noegleEn(e) : null;
      return n && Object.prototype.hasOwnProperty.call(this.liste, n) ? n : null;
    },
    forhentEn(tekst) { const n = Lyd.ctx && voksen.tale ? this.noegleEn(tekst) : null; if (n) this.buffer(n); },
    // Hent og afkod på forhånd (næste opgave), så talen starter uden ventetid
    forhent(tekst) {
      if (!tekst || !this.slaaetTil() || !Lyd.ctx) return;
      for (const e of window.Talefiler.enheder(tekst)) { const n = this.noegle(e); if (n) this.buffer(n); }
    },
  };

  // Stemmefilerne på enheden: en EGEN IndexedDB (sw.js TALE_DB/TALE_STORE — samme navn, version og store), nøgle =
  // filens 14 hex-tegn, værdi = ArrayBuffer (Blob har været ustabil i iOS' IndexedDB). Adskilt fra KlipLager
  // («lystaarn»), som rummer børnenes optagelser — stemmen kan slettes og hentes igen, optagelserne kan ikke.
  const TaleLager = {
    db: null,
    findes() { return typeof indexedDB !== 'undefined' && !!indexedDB; },
    aaben() {
      if (this.db) return this.db;
      const p = new Promise((res, rej) => {
        let r;
        try { r = indexedDB.open('lystaarn-tale', 1); } catch (e) { rej(e); return; }
        r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('filer')) r.result.createObjectStore('filer'); };
        r.onsuccess = () => {
          const db = r.result;
          db.onversionchange = () => { db.close(); if (this.db === p) this.db = null; };
          db.onclose = () => { if (this.db === p) this.db = null; };
          res(db);
        };
        r.onerror = () => rej(r.error);
      });
      this.db = p;
      p.catch(() => { if (this.db === p) this.db = null; });
      return p;
    },
    kald(mode, fn) {
      return this.aaben().then((db) => new Promise((res, rej) => {
        let tx;
        // En lukket forbindelse (InvalidStateError): glem den, så næste kald åbner en ny (som sw.js taleKald)
        try { tx = db.transaction('filer', mode); } catch (err) { this.db = null; rej(err); return; }
        const req = fn(tx.objectStore('filer'));
        tx.oncomplete = () => res(req ? req.result : undefined);
        tx.onerror = () => rej(tx.error);
        tx.onabort = () => rej(tx.error);
      }));
    },
    noegler() { return this.kald('readonly', (s) => s.getAllKeys()); },
    gem(n, ab) { return this.kald('readwrite', (s) => s.put(ab, n)); },
    // Flere nøgler i én transaktion
    slet(liste) { return this.kald('readwrite', (s) => { for (const n of liste) s.delete(n); return null; }); },
  };

  // ---------- Oplæsning (Piper-filer, ellers speechSynthesis, dansk) ----------
  const Tale = {
    stemme: null,
    udenDansk: false,
    foerst: null,  // løfte, mens hjælpens indledning siges (sigFoerst)
    gen: 0,        // tælles op ved stop(), så ventende sætninger ikke siges på en ny skærm
    findes: 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window,
    init() {
      if (!this.findes) return;
      const vaelgStemme = () => {
        const alle = window.speechSynthesis.getVoices() || [];
        // Den voksnes valg → «Premium/Enhanced/Forbedret» → ikke «compact» → lokal → første danske (lydklip.js)
        if (window.Lydklip) this.stemme = window.Lydklip.vaelgStemme(alle, voksen.stemme);
        else {
          const da = alle.filter((v) => /^da([-_]|$)/i.test(v.lang || ''));
          this.stemme = da.find((v) => v.localService) || da[0] || null;
        }
        // Ingen dansk stemme: «hør og find» kan ikke bruges (iOS ville læse op på et andet sprog). En tom liste
        // (stemmerne er ikke hentet endnu) tæller også som «ingen dansk» — hellere springe de opgaver over.
        this.udenDansk = !this.stemme;
      };
      this.opdaterStemmer = vaelgStemme;
      vaelgStemme();
      if (window.speechSynthesis.addEventListener) window.speechSynthesis.addEventListener('voiceschanged', vaelgStemme);
      else window.speechSynthesis.onvoiceschanged = vaelgStemme;
    },
    sig(tekst, efter) {
      if (window.__taleSagt && tekst) window.__taleSagt(String(tekst)); // e2e: samler alt, spillet siger (Piper-dækning)
      // Hjælpens indledning er i gang: denne sætning venter, til den er sagt færdig (se sigFoerst)
      const f = this.foerst;
      if (f) {
        const g = this.gen;
        f.then(() => { if (g === this.gen) this.sig(tekst, efter); else if (efter) efter(); });
        return;
      }
      let faerdig = false;
      const slut = () => { if (!faerdig) { faerdig = true; if (efter) efter(); } };
      if (!voksen.tale || !tekst) { if (efter) setTimeout(slut, 0); return; }
      this.stopPiper(); // et nyt sig afbryder det forrige — også en Piper-sætning
      Lyd.stopNavn();   // og barnets navn (men ikke et bogstavklip)
      Piper.noter(tekst);
      if (Piper.kan(tekst)) { this.stopSyntese(); this.spilPiper(tekst, slut, !!efter); return; }
      // Piper ville tale, men lydkanalen sover (iOS): væk den og vent højst Piper.VAEK_MS, så stemmen ikke skifter mellem
      // Piper og enhedens stemme. Kører den ikke da, taler enhedens stemme (review 12-10, fund 7: hellere end ingenting).
      // Et nyt sig eller stop() imens afbryder (piperNr/venter) — efter kaldes præcis én gang, aldrig synkront.
      if (Piper.vilTale(tekst)) {
        this.stopSyntese(); // den forrige sætning stopper nu — ikke først, når kanalen er vågen
        const mit = this.piperNr;
        this.venter = () => setTimeout(slut, 0);
        Piper.vaekKanal(Piper.VAEK_MS).then(() => {
          if (mit !== this.piperNr) return; // afbrudt imens: venter har kaldt efter
          this.venter = null;
          if (Piper.kan(tekst)) { this.stopSyntese(); this.spilPiper(tekst, slut, !!efter); return; }
          if (!this.findes) { if (efter) setTimeout(slut, 0); return; }
          this.sigSyntese(tekst, efter ? slut : null);
        });
        return;
      }
      if (!this.findes) { if (efter) setTimeout(slut, 0); return; }
      this.sigSyntese(tekst, efter ? slut : null);
    },
    // Talesyntesen stoppes, før Piper taler — ellers taler to stemmer oven i hinanden (review 12-10, fund 1)
    stopSyntese() {
      if (!this.findes) return;
      this.aktuel = null; // en sætning, der venter 60 ms efter cancel, må ikke starte alligevel
      try { const s = window.speechSynthesis; if (s.speaking || s.pending) s.cancel(); } catch (e) { /* ingenting */ }
    },
    // Talesyntesen (enhedens stemme). efter kaldes, når sætningen er sagt — eller ved fejl/afbrydelse.
    sigSyntese(tekst, efter) {
      let faerdig = false;
      const slut = () => { if (!faerdig) { faerdig = true; if (efter) efter(); } };
      if (!this.findes) { if (efter) setTimeout(slut, 0); return; }
      try {
        const s = window.speechSynthesis;
        const travl = s.speaking || s.pending;
        if (travl) s.cancel();
        if (s.paused) s.resume();
        const u = new SpeechSynthesisUtterance(tekst);
        this.aktuel = u; // holdes fast, ellers kan Chrome glemme onend
        u.lang = 'da-DK';
        if (this.stemme) u.voice = this.stemme;
        u.rate = 0.92;
        u.pitch = 1.08;
        if (efter) {
          u.onend = slut; u.onerror = slut;
          setTimeout(slut, (1200 + tekst.length * 85) * TEMPO); // hvis onend aldrig kommer
        }
        // Safari taber nogle gange en sætning, der startes lige efter cancel()
        if (travl) setTimeout(() => { if (this.aktuel === u) s.speak(u); }, 60);
        else s.speak(u);
      } catch (e) { if (efter) setTimeout(slut, 0); }
    },
    // Sig noget og vent, til det er sagt (så næste sætning ikke skærer det over)
    sigVent(tekst) {
      return new Promise((r) => this.sig(tekst, r));
    },
    // Engelsk (Jimmy 13-10-2026): ét engelsk ord med den engelske stemme — KUN fra Piper-filen (Piper.noegleEn), aldrig
    // talesyntesen (enhedens stemme ville læse ordet på dansk). Uden fil, oplæsning eller lydkanal: tavshed (billedet
    // står der stadig), og efter kaldes alligevel. Som sig: venter på hjælpens indledning, stopper den forrige sætning
    // (også enhedens stemme), og et nyt sig eller stop() afbryder ordet — så taler to stemmer aldrig på én gang.
    sigEn(tekst, efter) {
      if (window.__engelskSagt && tekst) window.__engelskSagt(String(tekst)); // e2e: hvert engelsk ord, spillet siger
      const f = this.foerst;
      if (f) {
        const g = this.gen;
        f.then(() => { if (g === this.gen) this.sigEn(tekst, efter); else if (efter) efter(); });
        return;
      }
      let faerdig = false;
      const slut = () => { if (!faerdig) { faerdig = true; if (efter) efter(); } };
      this.stopPiper();
      Lyd.stopNavn();
      this.stopSyntese();
      const n = voksen.tale && tekst ? Piper.noegleEn(tekst) : null;
      if (!n || !Lyd.ctx) {
        if (voksen.tale && tekst && window.__taleUdenFil && Piper.liste && !window.__ingenPiper) window.__taleUdenFil.push('en: ' + tekst);
        setTimeout(slut, 0);
        return;
      }
      const mit = this.piperNr;
      this.venter = () => setTimeout(slut, 0);
      Piper.vaekKanal(Piper.VAEK_MS).then((koerer) => {
        if (mit !== this.piperNr) return; // afbrudt imens: venter har kaldt efter
        this.venter = null;
        if (!koerer) { setTimeout(slut, 0); return; } // iOS: kanalen sover — hellere tavshed end enhedens stemme
        Piper.medFrist(Piper.buffer(n), 2500).then((buf) => {
          if (mit !== this.piperNr || !buf || !Lyd.ctx) { slut(); return; }
          try {
            const s = Lyd.ctx.createBufferSource();
            s.buffer = buf; s.connect(Lyd.ctx.destination);
            const k = this.kilde = { s: s, res: slut };
            s.onended = () => { if (this.kilde === k) this.kilde = null; slut(); };
            const t = Piper.spilletid(buf);
            s.start(0, 0, t);
            setTimeout(slut, t * 1000 + 400); // hvis onended aldrig kommer
          } catch (e) { slut(); }
        });
      });
    },
    sigEnVent(tekst) {
      return new Promise((r) => this.sigEn(tekst, r));
    },
    // Hjælpens indledning («Lad os tælle sammen.»), sagt efter `forsinkelse` ms. Indtil den er sagt
    // færdig, venter andre sætninger og vent() på den — så animationen kan vise sit første trin med
    // det samme, uden at dens tal skærer indledningen over.
    sigFoerst(tekst, forsinkelse) {
      let slip;
      let sagt = false;
      const f = new Promise((r) => { slip = r; });
      this.foerst = f;
      const faerdig = () => { sagt = true; if (this.foerst === f) this.foerst = null; slip(); };
      setTimeout(() => {
        if (this.foerst !== f) { slip(); return; } // stoppet imens (skærmskift)
        this.foerst = null; // kun indledningen selv slipper forbi
        this.sig(tekst, faerdig);
        if (!sagt && this.foerst === null) this.foerst = f;
      }, forsinkelse || 0);
      return f;
    },
    // Piper: sætningerne efter hinanden; en sætning uden fil siges med talesyntesen. Et nyt sig eller stop afbryder
    // (piperNr), og efter kaldes præcis én gang — også hvis noget går galt (loftet: summen af varighederne + 1,2 s).
    piperNr: 0,
    kilde: null,
    venter: null, // en sætning, der venter på, at lydkanalen vågner — et nyt sig eller stop afbryder den
    stopPiper() {
      this.piperNr++;
      const v = this.venter;
      this.venter = null;
      if (v) v();
      const k = this.kilde;
      this.kilde = null;
      if (k) { try { k.s.onended = null; k.s.stop(); } catch (e) { /* allerede stoppet */ } k.res(); }
    },
    spilPiper(tekst, slut, medEfter) {
      const mit = this.piperNr;
      const lever = () => mit === this.piperNr;
      const enh = window.Talefiler.enheder(tekst);
      // Alle sætningers filer hentes på én gang fra starten, hver højst 2,5 s — ellers taler enhedens stemme den sætning
      // (review 12-10, fund 3: én ad gangen gav huller på langsomt net, og et hængende svar gjorde sætningen tavs)
      const bufre = enh.map((e) => { const n = Piper.noegle(e); return n ? Piper.medFrist(Piper.buffer(n), 2500) : Promise.resolve(null); });
      const ms = enh.reduce((s, e) => { const n = Piper.noegle(e); return s + (n ? Piper.liste[n] : e.length * 85); }, 0);
      if (medEfter) setTimeout(slut, ms + 2500 + 1200 + enh.length * 400); // hvis noget aldrig bliver færdigt
      const spil = (buf) => new Promise((res) => {
        try {
          const s = Lyd.ctx.createBufferSource();
          s.buffer = buf; s.connect(Lyd.ctx.destination);
          const k = this.kilde = { s: s, res: res };
          s.onended = () => { if (this.kilde === k) this.kilde = null; res(); };
          const t = Piper.spilletid(buf);
          s.start(0, 0, t);
          setTimeout(res, t * 1000 + 400); // hvis onended aldrig kommer
        } catch (e) { res(); }
      });
      (async () => {
        // Afbrudt (nyt sig eller stop): efter kaldes alligevel med det samme — som cancel → onerror i talesyntesen
        for (let i = 0; i < enh.length; i++) {
          const e = enh[i];
          if (!lever()) { slut(); return; }
          let buf = null;
          try { buf = await bufre[i]; } catch (x) { buf = null; }
          if (!lever()) { slut(); return; }
          if (buf && Lyd.ctx) await spil(buf);
          else await new Promise((r) => this.sigSyntese(e, r)); // ingen fil: enhedens stemme for netop denne sætning
        }
        slut();
      })();
    },
    stop() {
      this.gen++;
      this.foerst = null;
      this.stopPiper();
      Lyd.stopNavn();
      if (!this.findes) return;
      this.aktuel = null; // så en sætning, der venter på at blive startet (60 ms efter cancel), ikke starter alligevel
      try { window.speechSynthesis.cancel(); } catch (e) { /* ingenting */ }
    },
  };

  // ---------- Lydpalet og feedback-forløb (fase B: lydpalet.js og feedback-forloeb.js) ----------
  // Uden de to filer (fx en gammel cache) bruges en tom palet (NAVNE: null, så forløbet ikke afviser effekternes navne) og
  // et reserve-forløb, der afspiller klip og tale som før — spillet virker uden lyd, og en runde hænger aldrig.
  const TOM_PALET = { NAVNE: null, unlock: () => Promise.resolve(false), stop() {}, onInterrupted: () => () => {}, vilSpille: () => false,
    play: () => Promise.resolve({ status: 'skipped', reason: 'locked' }) };
  ['tryk', 'rigtig', 'forkertBlid', 'fodspor', 'boblePop', 'niveauOp', 'pauseStart', 'fejring'].forEach((n) => { TOM_PALET[n] = TOM_PALET.play; });
  const Palet = window.Lydpalet ? window.Lydpalet.lav({ vindue: window, aabnKontekst: () => Lyd.aabn(), lydTil: () => voksen.lyd }) : TOM_PALET;
  // Uden dansk stemme tales der som i dag (Tale.sig med lang alene) — at kræve en dansk stemme er en åben B3-beslutning
  const Forloeb = window.FeedbackForloeb
    ? window.FeedbackForloeb.lav({ palet: Palet, vindue: window, tale: window.FeedbackForloeb.taleFraSpillet({ Tale: Tale, Lyd: Lyd, taleTil: () => voksen.tale }) })
    : {
      run: (o) => {
        o = o || {};
        if (o.lyd) Palet.play(o.lyd);
        const t = [o.tekst || o.reserve, o.efter].filter(Boolean).join(' '); // navnKlip bruges ikke her (navnet er aldrig tekst)
        const p = o.klip ? Lyd.klip(o.klip, o.reserve) : t ? Tale.sigVent(t) : null;
        return Promise.resolve(p).then(() => ({ status: 'completed', reason: 'reserve', effekt: '', tale: '', animation: '' }));
      },
      stop() {},
      optaget: () => false,
    };
  // Vent mindst så længe (spillets gang efter et svar) — ikke vent(), der skalerer med ?hurtig og venter på Tale.foerst
  const pause = (ms) => new Promise((res) => setTimeout(res, ms));

  // ---------- Tilstand ----------
  const S = {
    token: 0,          // tælles op ved hvert skærmskift, så gamle animationer stopper
    taster: null,      // tastatur-håndtering for den aktuelle skærm
    gentagTale: '',    // det 🔊-knappen læser op
    oplaes: 0,         // tælles op ved svar og ny oplæsning: en gammel opgaveoplæsning (sigOpgave) holder op
    runde: null,
    afbrudt: { pauset: null, pausetDansk: null, pausetEngelsk: null, pausetNatur: null }, // afbrudte runder pr. fag (▶ fortsætter dem) — se PAUSET_FELTER
    ur: null,          // Historiebogens og Bogstavjagtens fælles ur (se startUr)
    forlad: null,      // ryddes op, når skærmen skiftes (fx «Sig dit navn»: mikrofonen slukkes)
  };

  let data = null;     // barnets data
  let skrivebeskyttet = false; // sættes, hvis gemte data ikke kunne læses og ikke kunne kopieres
  let indlaesAdvarsel = null;  // forklaringen fra gem.js, når data ikke kunne læses
  let gemFejlet = false;       // sidste forsøg på at gemme mislykkedes (fx fuldt lager)
  const app = () => document.getElementById('app');

  function gem() {
    // Skrivebeskyttet: gemte data kunne ikke læses, og der var ikke plads til en kopi — rør dem ikke
    if (!T.noegle || !data || skrivebeskyttet) return;
    gemFejlet = !G.gemBarn(lager, T.noegle, data);
  }

  // Voksendata gemmes kun, hvis de ikke er skrivebeskyttede (ulæselige og uden plads til en kopi)
  function gemVoksen() {
    if (voksenRes.skrivebeskyttet) return false;
    return G.gemVoksen(lager, voksen);
  }

  // Besked til en voksen, når spillet ikke kan gemme — barnet ser kun ⚠️ (og hører «Hent en voksen»)
  function lagerAdvarsel() {
    if (lagerIHukommelse) return 'Spillet kan ikke gemme på denne enhed (fx privat browsing eller blokerede websitedata). Fremskridtet forsvinder, når siden lukkes.';
    if (skrivebeskyttet) return indlaesAdvarsel || 'Gemte data kunne ikke læses. Spillet gemmer ikke, før en voksen har ryddet op under Indstillinger på forsiden (hold låsen, og vælg Indstillinger).';
    if (gemFejlet || lagerFuldt) return 'Spillet kan ikke gemme — lageret er fuldt (eller enheden er i privat browsing). Det, der allerede er gemt, er der stadig. Tag en kopi under Indstillinger på forsiden (hold låsen, og vælg Indstillinger), og ryd plads (fx data fra andre websider på samme adresse).';
    if (T.side === 'voksen' && voksenRes.skrivebeskyttet) return voksenRes.advarsel;
    return null;
  }

  function advarselKnap() {
    const t = lagerAdvarsel();
    if (!t) return null;
    return ikonKnap('⚠️', 'Besked til en voksen', () => {
      Tale.sig('Hent en voksen.');
      setTimeout(() => alert('Til den voksne: ' + t), 300);
    }, 'advarsel-knap');
  }

  // ---------- Barnets eget navn (12-10-2026) ----------
  // Som tekst: forsiden, startskærmen og topbarerne viser altid Dino/Enhjørning (Jimmy 13-10-2026) — barnets eget navn
  // står kun på «Hvad hedder du?», mens barnet skriver det, og i voksendelen («Mit navn»).
  // Som tale KUN fra en optagelse på enheden (NAVNEKLIP): navnet sendes aldrig til Tale.sig, Forloeb.run({ tekst }),
  // 🔊 eller en log — en sætning uden lydfil læses af enhedens stemme, og repoet er offentligt.
  const navnKlipId = () => NAVNEKLIP + T.id;
  // Navnet kan siges: barnet har et navn, og det er optaget på denne enhed
  const harNavneklip = () => !!(data && data.egetNavn && T.id && Lyd.harLokaltKlip(navnKlipId()));
  // «Bare det ikke bliver for meget» (Jimmy 12-10-2026): hilsenen én gang pr. besøg, og i runderne højst én gang pr.
  // runde i hver NAVN_HVER. runde — fejringen, eller «Prøv igen» efter hjælpen, hvis det kom først
  const NAVN_HVER = 2;
  let navnRunder = 0;
  const navnTur = () => (++navnRunder % NAVN_HVER === 0);
  const navnIRunden = (r) => !!(r && r.navnMaa && !r.navnSagt && harNavneklip());
  let navnHilst = false;
  // Hilsenen: «Hej!» + navnet (klippet, hvis barnet har et navn og en optagelse) + skærmens spørgsmål.
  // Talen siger aldrig «Hej Dino!» — Dino og Enhjørning er profilerne, ikke barnets navn (Jimmy 13-10-2026).
  const NAVN_HEJ = Object.freeze({ hej: 'Hej!' });
  const hilsen = () => NAVN_HEJ;
  // foer + navnet + efter gennem feedback-forløbet. Uden klip, eller når forløbet er optaget: foer + efter uden navn.
  // Giver true, hvis navnet bliver sagt.
  function sigMedNavn(foer, efter) {
    if (!harNavneklip() || Forloeb.optaget()) { Tale.sig([foer, efter].filter(Boolean).join(' ')); return false; }
    Forloeb.run({ tekst: foer, navnKlip: navnKlipId(), efter: efter || '' });
    return true;
  }
  // En skærms hilsen + spørgsmål (visFigurValg, visFagValg, visTilstandValg)
  function sigHilsen(h0, resten) {
    if (h0 === NAVN_HEJ) {
      if (navnHilst) { Tale.sig([h0.hej, resten].filter(Boolean).join(' ')); return; }
      navnHilst = true;
      sigMedNavn(h0.hej, resten);
      return;
    }
    Tale.sig([h0, resten].filter(Boolean).join(' '));
  }
  // Et nyt eller slettet navn må ikke beholde den gamle optagelse: spillet ville sige det gamle navn
  function glemNavneklip() {
    if (!T.id) return;
    const id = navnKlipId();
    Lyd.fjernLokaltKlip(id);
    KlipLager.slet('klip', id).catch(() => {});
  }
  // En voksen kan have optaget eller slettet navnet i en anden fane: klippet læses igen fra enheden (ved ▶)
  function opdaterNavneklip() {
    if (!T.id || !data || !data.egetNavn) return;
    const id = navnKlipId();
    KlipLager.hent('klip', id).then((v) => { if (v) Lyd.saetLokaltKlip(id, new Uint8Array(v)); else Lyd.fjernLokaltKlip(id); }).catch(() => {});
  }

  function skift(node, taster) {
    if (S.forlad) { const f = S.forlad; S.forlad = null; f(); } // den gamle skærms oprydning (fx mikrofonen)
    Forloeb.stop(); // en igangværende feedback hører til den gamle skærm
    gemUr(); // Historiebogens/Bogstavjagtens tid gemmes ved hvert skærmskift
    S.token++;
    S.spaertTil = performance.now() + 380; // et dobbelttryk må ikke ramme den nye skærm
    S.oplaes++; // en oplæsning fra den gamle skærm (fx et klip efter talen) holder op
    Tale.stop();
    S.taster = taster || null;
    S.gentagFn = null; // 🔊 læser S.gentagTale — eller kalder S.gentagFn (dansk: tekst + indtalte lyde)
    const a = app();
    a.textContent = '';
    a.append(node);
    return S.token;
  }

  function ikonKnap(ikon, label, onclick, ekstraKlasse) {
    return h('button', {
      class: 'ikon-knap' + (ekstraKlasse ? ' ' + ekstraKlasse : ''),
      'aria-label': label, title: label, type: 'button',
      onclick: (e) => { Lyd.init(); Lyd.tryk(); onclick(e); },
    }, ikon);
  }

  // Tom plads lige så bred som en ikonknap, så titlen står midt på skærmen
  function topbarPlads() {
    return h('span', { class: 'topbar-plads', 'aria-hidden': 'true' });
  }

  function gentag() { if (S.gentagFn) S.gentagFn(); else Tale.sig(S.gentagTale); }

  function hoejttaler() {
    return ikonKnap('🔊', 'Læs op igen', () => { Forloeb.stop(); gentag(); }, 'hoejttaler'); // ikke oven i en feedback
  }

  // En ven fra Vennebogen, som perlerne (fx efter en indlæst backup) ikke har låst op, falder tilbage som et ukendt id
  function minFigur() {
    const id = O.valgtVen(data && data.figur, data && data.perler, Object.keys(FIGURER), (T.figurer || ['bobo'])[0]);
    return Object.assign({ id: id }, FIGURER[id] || FIGURER.bobo);
  }

  // =====================================================================
  //  STARTSIDEN (index.html) — vælg spiller
  // =====================================================================
  function visIndex() {
    // Hvert barn har sit faste dyr — det er det, barnet genkender uden at læse: Rex på Dinos kort, Måne på Enhjørningens,
    // tegnet i barnets egne farver (index.html sætter temaets variabler på kortet). Uden grafik.js: emojien (🦖 🦄 📘 🔐) som før.
    const figur = (tegn, e) => h('span', { class: 'spiller-figur' + (tegn ? ' med-tegning' : ''), 'aria-hidden': 'true' }, tegn || e);
    const kort = (T.spillere || []).map((sp) => {
      const ven = sp.ven ? venTegning(sp.ven, 'vinker') : null;
      return h('a', { class: 'spiller-kort spiller-' + sp.id, href: sp.side, 'aria-label': sp.navn },
        figur(ven && ven.nodeType === 1 ? ven : null, sp.e),
        h('span', { class: 'spiller-navn' + (sp.navn.length > 6 ? ' langt' : '') }, sp.navn));
    });
    // Den voksnes to kort (Jimmy 13-10-2026): Voksen (bogen) er åben — den voksnes eget spil. Indstillinger (låsen) går
    // til voksen.html#indstillinger, hvor låsen står. Samlet i én gruppe: under hinanden ved børnenes kort, og på en
    // telefon på højkant som anden række (2 × 2).
    if (T.voksenSide) {
      const voksenKort = (id, href, navn, tegn, e) => h('a', { class: 'spiller-kort spiller-' + id, href: href, 'aria-label': navn },
        figur(tegn, e), h('span', { class: 'spiller-navn' }, navn));
      kort.push(h('div', { class: 'voksen-gruppe' },
        voksenKort('voksen', T.voksenSide, 'Voksen', GR ? tegning(BOG, 'bog-tegning') : null, '📘'),
        voksenKort('indstillinger', T.voksenSide + '#indstillinger', 'Indstillinger', GR ? tegning(LAAS, 'laas-tegning') : null, '🔐')));
    }
    const version = h('div', { class: 'index-version', 'aria-hidden': 'true' });
    skift(h('div', { class: 'skaerm index' },
      version,
      h('h1', { class: 'index-titel' }, fyrtaarn('', 4), h('span', null, 'Lystårnet')),
      h('div', { class: 'spiller-liste' }, kort)));
    visVersion(version);
  }

  // Versionsnummeret i forsidens hjørne (Jimmy 20-10-2026: «så jeg kan se den nyeste version»). Tallet kommer fra den
  // service worker, der leverede siden (sw.js svarer med sin VERSION) — den udgave, der faktisk kører. Uden service
  // worker eller uden svar står hjørnet tomt: intet tal er bedre end et forkert. Kun textContent
  const versionsTekst = (v) => { const m = typeof v === 'string' && /-v(\d{1,4})$/.exec(v); return m ? 'v' + m[1] : ''; };
  function visVersion(el) {
    const sw = navigator.serviceWorker;
    if (!sw || !/^https?:$/.test(location.protocol) || typeof MessageChannel !== 'function') return;
    const spoerg = (w) => {
      if (!w) return;
      const kanal = new MessageChannel();
      kanal.port1.onmessage = (e) => { el.textContent = versionsTekst(e.data); };
      w.postMessage('version', [kanal.port2]);
    };
    // Ingen controller (første besøg, hård genindlæsning): siden kom fra nettet, og først den service worker, der så
    // overtager (clients.claim), passer til koden. Overtager en ny midt i et besøg med en gammel, vises intet nyt tal:
    // koden er stadig den gamle, til appen åbnes igen (code-review 20-10-2026: reg.active kunne vise en anden udgave)
    if (sw.controller) spoerg(sw.controller);
    else sw.addEventListener('controllerchange', () => spoerg(sw.controller), { once: true });
  }

  // =====================================================================
  //  BØRNEDELEN
  // =====================================================================

  // ---------- Startskærm (låser også lyd og oplæsning op på iPad) ----------
  function visStart() {
    const fig = minFigur();
    opdaterNavneklip();
    const videre = () => {
      if (!data.figur) {
        visFigurValg(true, hilsen());
      } else if (D) {
        visFagValg(hilsen()); // fagvalget ved hver start (Jimmy 18-10-2026) — det sidste fag lyser
      } else {
        visTilstandValg(hilsen());
      }
    };
    const start = () => {
      Lyd.init();
      Lyd.rigtig();
      // Første gang (også for et barn, der allerede spiller): «Hvad hedder du?» — kun én gang (data.navnSpurgt)
      if (!data.navnSpurgt && !window.__udenNavn) visNavnSkaerm(videre);
      else videre();
    };
    const taarn = h('button', {
      class: 'start-taarn-knap', type: 'button', 'aria-label': 'Hør historien om Lystårnet',
      style: '--lysstyrke:' + lysStyrke(),
      onclick: () => { Lyd.init(); visHistorie(() => visStart()); },
    }, fyrtaarn('start-taarn'), data.perler ? h('span', { class: 'perle-tal' }, '✨ ' + data.perler) : null);
    skift(h('div', { class: 'skaerm start' },
      h('a', { class: 'ikon-knap hjem', href: 'index.html', 'aria-label': 'Skift spiller', title: 'Skift spiller' }, '🏠'),
      advarselKnap(),
      taarn,
      h('div', { class: 'start-figur', 'aria-hidden': 'true', 'data-ven': fig.id }, venTegning(fig.id, 'vinker')),
      h('div', { class: 'start-navn' }, data.navn),
      h('button', { class: 'stor-knap spil-knap puls', type: 'button', 'aria-label': 'Start', onclick: start }, '▶')),
    (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } });
  }

  // ---------- «Hvad hedder du?» — barnet skriver sit eget navn (12-10-2026) ----------
  // Store bogstavtaster i ABC-rækkefølge, ⌫, ✔ (fra ét bogstav) og ⏭ (spring over). Tastaturcoveret virker også
  // (Enter = ✔, Esc = ⏭). Bogstaverne siger intet (navnet må aldrig til talen), og navnet står ikke i et aria-live-felt.
  // Spørges kun én gang (navnSpurgt). Undtagelse fra «3–5 valg pr. skærm»: se docs/DESIGN-NOTER.md.
  function visNavnSkaerm(fortsaet) {
    let navn = '';
    const vis = h('div', { class: 'navn-vis tom' }, '');
    const okKnap = h('button', { class: 'tast tast-ok navn-ok', type: 'button', 'aria-label': 'Færdig', disabled: true, onclick: () => faerdig() }, '✔');
    const tastatur = bogstavTastatur({
      max: G.MAX_NAVN,
      naar: (t) => {
        navn = t;
        vis.textContent = stortNavn(t);
        vis.classList.toggle('tom', !t);
        vis.classList.toggle('lang', t.length > 8);
        // Et bredt navn på en smal skærm: skriften bliver mindre (ned til 18 px), til navnet kan være i feltet
        vis.style.fontSize = '';
        for (let px = parseFloat(getComputedStyle(vis).fontSize); px > 18 && vis.scrollWidth > vis.clientWidth + 1; px -= 2) vis.style.fontSize = Math.max(18, px - 2) + 'px';
        okKnap.disabled = !/[^ -]/.test(t);
        okKnap.classList.toggle('puls', !okKnap.disabled);
      },
    });
    const faerdig = () => {
      if (okKnap.disabled) return;
      Lyd.init(); Lyd.tryk();
      const foer = data.egetNavn || null;
      G.saetEgetNavn(data, navn); // normaliseres i gem.js (højst 12 tegn, kun bogstaver)
      gem();
      if ((data.egetNavn || null) !== foer) glemNavneklip(); // samme navn igen: optagelsen bliver
      sigNavnEllerVidere(fortsaet); // «Sig dit navn» (13-10-2026), hvis der ikke er en optagelse
    };
    // ⏭ og Esc: står der bogstaver, gemmes navnet som med ✔ (tastaturcoverets Esc må ikke smide det væk — review 12-10)
    const springOver = () => {
      if (!okKnap.disabled) { faerdig(); return; }
      Lyd.init(); Lyd.tryk();
      data.navnSpurgt = true; // spørges ikke igen; en voksen kan skrive navnet under Indstillinger
      gem();
      fortsaet();
    };
    const fig = minFigur();
    S.gentagTale = 'Hvad hedder du? Skriv dit navn. Du må gerne få hjælp af en voksen.';
    skift(h('div', { class: 'skaerm navneskaerm' },
      h('div', { class: 'topbar' },
        ikonKnap('⏭', 'Spring over', springOver, 'navn-spring'),
        h('div', { class: 'topbar-titel', 'aria-hidden': 'true' }, '✏️'),
        hoejttaler()),
      h('div', { class: 'navn-midte' },
        h('div', { class: 'navn-raekke' },
          h('div', { class: 'navn-ven', 'aria-hidden': 'true', 'data-ven': fig.id }, venTegning(fig.id, 'vinker')),
          vis,
          okKnap),
        tastatur.el)),
    (e) => {
      // En fokuseret knap (Tab) beholder sin Enter og sit mellemrum
      const knapFokus = document.activeElement && document.activeElement.tagName === 'BUTTON';
      if (e.key === 'Enter') { if (!knapFokus) { e.preventDefault(); faerdig(); } return; }
      if (e.key === 'Escape') { e.preventDefault(); springOver(); return; }
      if (e.key === ' ' && knapFokus) return;
      if (tastatur.tast(e.key)) e.preventDefault();
    });
    Tale.sig(S.gentagTale); // synkront i trykket på ▶ (iOS)
  }
  // «anne-sofie» → «Anne-Sofie» (som gem.js gemmer det) — mens barnet skriver
  const stortNavn = (t) => t.replace(/[^ -]+/g, (o) => o.charAt(0).toUpperCase() + o.slice(1));

  // ---------- Vælg rejseven ----------
  function visFigurValg(foersteGang, hilsen) {
    // Højst to valg pr. skærm (docs/DESIGN-NOTER.md)
    const ids = (T.figurer || ['bobo', 'rex']).filter((id) => FIGURER[id]).slice(0, 2);
    let valgt = data.figur;
    const knapper = {};
    const okKnap = h('button', {
      class: 'stor-knap ok-knap' + (valgt ? '' : ' skjult'), type: 'button', 'aria-label': 'Færdig',
      onclick: () => {
        if (!valgt) return;
        Lyd.init(); Lyd.rigtig();
        data.figur = valgt;
        gem();
        if (!data.historie) { visHistorie(() => (D ? visFagValg() : visTilstandValg()), 'Godt valgt! ' + FIGURER[valgt].navn + ' tager med.'); return; }
        if (D) { visFagValg('Godt valgt! ' + FIGURER[valgt].navn + ' tager med.'); return; }
        visTilstandValg('Godt valgt! ' + FIGURER[valgt].navn + ' tager med.');
      },
    }, '✔');
    const vaelgFigur = (id) => {
      Lyd.init(); Lyd.tryk();
      valgt = id;
      for (const k in knapper) knapper[k].classList.toggle('valgt', k === id);
      knapper[id].classList.remove('hop'); void knapper[id].offsetWidth; knapper[id].classList.add('hop');
      okKnap.classList.remove('skjult');
      okKnap.classList.add('puls');
      Tale.sig('Hej, jeg hedder ' + FIGURER[id].navn + '! Tryk på den grønne knap.');
    };
    const liste = ids.map((id) => {
      knapper[id] = h('button', {
        class: 'figur-knap' + (id === valgt ? ' valgt' : ''), type: 'button', 'aria-label': FIGURER[id].navn,
        onclick: () => vaelgFigur(id),
      }, h('span', { class: 'figur-emoji', 'aria-hidden': 'true' }, venTegning(id, 'vinker')), h('span', { class: 'figur-navn' }, FIGURER[id].navn));
      return knapper[id];
    });
    S.gentagTale = 'Hvem skal med dig på rejsen? Tryk på en.';
    skift(h('div', { class: 'skaerm figurvalg' },
      h('div', { class: 'topbar' },
        foersteGang ? topbarPlads() : ikonKnap('🗺️', 'Tilbage til kortet', () => visKort(false)),
        h('div', { class: 'topbar-titel' }, 'Vælg din ven'),
        hoejttaler()),
      h('div', { class: 'figur-liste' }, liste),
      okKnap),
    (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= ids.length) vaelgFigur(ids[n - 1]);
      else if (e.key === 'Enter') okKnap.click();
    });
    // Synkront efter skærmskiftet (stadig i tryk-handleren): iOS kræver en brugergestus til den første oplæsning
    if (hilsen) sigHilsen(hilsen, S.gentagTale);
  }

  // ---------- Vennebogen (Jimmy 14-10-2026): temaets to rejsevenner + dem, lysperlerne har låst op ----------
  // Åbnes fra vennen på kortet. Højst fire venner pr. side, ⬅️/➡️ blader. En låst ven er en skygge med 🔒; den næste har
  // en ✨ pr. perle, den koster (de farvede er samlet, de grå mangler). Tryk på en ven: «Hej, jeg hedder …!»; ✔ tager den med
  // (data.figur). Ingen læsetekst — navnene står kun som støtte. Tastatur: 1–4 vælger, ←/→ blader, Enter = ✔, Esc = kortet.
  const VENNER_PR_SIDE = 4;
  // En ny ven fra fejringen venter i bogen: vennen på kortet får et ✨, til bogen er åbnet (kun i denne session, intet gemt)
  let nyVenUset = false;
  function visVennebog() {
    nyVenUset = false;
    const rejse = (T.figurer || ['bobo', 'rex']).filter((id) => FIGURER[id]).slice(0, 2);
    const alle = rejse.concat(O.NYE_VENNER.map((v) => v.id));
    const aabne = new Set(rejse.concat(O.oplaasteVenner(data.perler)));
    const naeste = O.naesteVen(data.perler);
    const antalSider = Math.ceil(alle.length / VENNER_PR_SIDE);
    let valgt = minFigur().id;
    const foer = valgt;
    // Bogen åbner på den valgte vens side (ui-review 14-10-2026) — en ven uden for bogen: første side
    let side = Math.floor(Math.max(0, alle.indexOf(valgt)) / VENNER_PR_SIDE);
    let knapper = [];
    const gitter = h('div', { class: 'vennebog-gitter' });
    const sider = h('div', { class: 'vennebog-sider', 'aria-hidden': 'true' });
    const trykVen = (id, kort) => {
      Lyd.init(); Lyd.tryk();
      if (!aabne.has(id)) { hop(kort, 'ryst'); Tale.sig('Saml flere lysperler, så kommer jeg!'); return; }
      valgt = id;
      for (const k of knapper) k.classList.toggle('valgt', k.getAttribute('data-ven') === id);
      hop(kort, 'hop');
      okKnap.classList.add('puls');
      Tale.sig('Hej, jeg hedder ' + FIGURER[id].navn + '! Tryk på den grønne knap.');
    };
    const venKort = (id) => {
      const aaben = aabne.has(id);
      const erNaeste = !aaben && !!naeste && naeste.id === id;
      const kort = h('button', {
        class: ['ven-kort', aaben ? 'aaben' : 'laast', erNaeste ? 'naeste' : '', id === valgt ? 'valgt' : ''].filter(Boolean).join(' '),
        type: 'button', 'data-ven': id,
        'aria-label': aaben ? FIGURER[id].navn : erNaeste ? ['Låst:', naeste.mangler, 'lysperler', 'mere'].join(' ') : 'Låst',
        onclick: () => trykVen(id, kort),
      },
      h('span', { class: 'ven-kort-tegning', 'aria-hidden': 'true' }, venTegning(id, 'vinker')),
      aaben ? h('span', { class: 'figur-navn' }, FIGURER[id].navn) : h('span', { class: 'ven-kort-laas', 'aria-hidden': 'true' }, '🔒'),
      // Perlerne til den næste ven: én ✨ pr. perle fra den forrige vens grænse — farvet = samlet, grå = mangler
      erNaeste ? h('span', { class: 'ven-kort-perler', 'aria-hidden': 'true' },
        Array.from({ length: naeste.perler - naeste.fra }, (_, i) => h('i', { class: i < naeste.perler - naeste.fra - naeste.mangler ? 'fuld' : 'tom' }))) : null);
      return kort;
    };
    const forrige = ikonKnap('⬅️', 'Forrige', () => blad(-1), 'vennebog-blad');
    const frem = ikonKnap('➡️', 'Næste', () => blad(1), 'vennebog-blad');
    const visSide = () => {
      knapper = alle.slice(side * VENNER_PR_SIDE, (side + 1) * VENNER_PR_SIDE).map(venKort);
      gitter.textContent = '';
      gitter.append(...knapper);
      forrige.disabled = side === 0;
      frem.disabled = side >= antalSider - 1;
      sider.textContent = '';
      for (let k = 0; k < antalSider; k++) sider.append(h('i', { class: k === side ? 'nu' : 'tom' }));
    };
    const blad = (d) => {
      const ny = Math.max(0, Math.min(antalSider - 1, side + d));
      if (ny === side) return;
      side = ny;
      visSide();
      hop(gitter, d < 0 ? 'blad-tilbage' : 'blad-frem');
    };
    const okKnap = h('button', {
      class: ['stor-knap', 'ok-knap', 'vennebog-ok'].join(' '), type: 'button', 'aria-label': 'Færdig',
      onclick: () => {
        Lyd.init(); Lyd.rigtig();
        // Uden et nyt valg røres data.figur ikke: en gemt ven, perlerne ikke har låst op (fx efter en backup), bevares
        if (valgt !== foer) { data.figur = valgt; gem(); }
        visKort('Godt valgt! ' + FIGURER[valgt].navn + ' tager med.');
      },
    }, '✔');
    visSide();
    S.gentagTale = 'Her er dine venner. Tryk på en ven.';
    skift(h('div', { class: ['skaerm', 'vennebog'].join(' ') },
      h('div', { class: 'topbar' },
        ikonKnap('🗺️', 'Tilbage til kortet', () => visKort(false)),
        h('div', { class: 'topbar-titel' }, '🤝 ' + aabne.size + ' / ' + alle.length),
        hoejttaler()),
      h('div', { class: 'vennebog-side' }, gitter),
      sider,
      h('div', { class: 'vennebog-bund' }, forrige, okKnap, frem)),
    (e) => {
      // En fokuseret knap (Tab) beholder sin Enter og sit mellemrum
      const knapFokus = document.activeElement && document.activeElement.tagName === 'BUTTON';
      const n = Number(e.key);
      if (n >= 1 && n <= knapper.length) knapper[n - 1].click();
      else if (e.key === 'ArrowLeft') forrige.click();
      else if (e.key === 'ArrowRight') frem.click();
      else if (e.key === 'Enter' && !knapFokus) { e.preventDefault(); okKnap.click(); }
      else if (e.key === 'Escape') visKort(false);
    });
    Tale.sig(S.gentagTale);
  }

  // ---------- Optageren: et kort lydklip her på enheden ----------
  // MediaRecorder → WebAudio → lydklip.js (mono, renset, beskåret, fast lydstyrke, WAV) → IndexedDB og Lyd. Intet
  // sendes nogen steder hen. Bruges af voksendelens 🎙️ Indtal og navneoptagelse (gennem ctx) og af barnets «Sig dit
  // navn» (flyttet fra voksen.js 13-10-2026, så der kun er én optager).
  // valg: { status(tekst, kode), startTekst(id), gemt(id, r), maxSek (stopper selv), stopTekst (knappens tekst under
  //   optagelsen), foerStart() (mikrofonen har svaret — lige før optagelsen starter: fx stemmen stoppes), behold(id, r)
  //   (valgfri: klippet gemmes IKKE — kalderen gemmer selv; barnets skærm først ved ✔) }
  // kode (til barnets skærm, der ikke viser den voksnes tekst): kan-ikke · mikrofon (nej eller fejl) · stille · fejl
  const kanOptage = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  // Mikrofonen med browserens egen rensning (ekko, støj, lydstyrke) i mono (14-10-2026). Værdierne er ønsker, ikke krav;
  // afviser en ældre browser dem alligevel, prøves der uden — men aldrig efter et nej fra brugeren, uden mikrofon eller
  // når starten er annulleret imens (s = optagerens starter-tilstand: så ville forsøg 2 tænde mikrofonen kort igen).
  // Ekko-navnet står i to dele: test-gem (B1) søger alle filer igennem for et af de gamle navne, der står midt i ordet.
  const MIK_RENS = { ['echoCancel' + 'lation']: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 };
  async function aabenMikrofon(s) {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: MIK_RENS });
    } catch (e) {
      if (!e || !/^(OverconstrainedError|ConstraintNotSatisfiedError|TypeError)$/.test(e.name)) throw e;
      if (s && s.annulleret) return null;
      return navigator.mediaDevices.getUserMedia({ audio: true });
    }
  }
  function lavOptager(valg) {
    const LK = window.Lydklip;
    const kan = kanOptage();
    let optagelse = null; // { id, recorder, stream, chunks, knap, tekst, timer }
    // Sættes FØR der ventes på mikrofonen (getUserMedia kan tage sekunder på iPad): et nyt tryk imens starter ikke en
    // optagelse til, og stop()/afbryd() (Tilbage, skærmen forlades) annullerer den, så mikrofonen slukkes, når den svarer
    let starter = null; // { id, annulleret }
    const slukSpor = (stream) => { if (stream) stream.getTracks().forEach((t) => { try { t.stop(); } catch (e) { /* allerede slukket */ } }); };
    const hvil = (o) => { clearTimeout(o.timer); o.knap.classList.remove('optager'); o.knap.textContent = o.tekst; };
    async function stop() {
      if (starter) { starter.annulleret = true; starter = null; }
      const o = optagelse;
      if (!o) return;
      optagelse = null;
      hvil(o);
      const faerdig = new Promise((res) => { o.recorder.onstop = res; });
      try { o.recorder.stop(); } catch (e) { /* allerede stoppet */ }
      // Højst 2 s på optagerens stop: mikrofonen slukkes under alle omstændigheder
      let frist = null;
      await Promise.race([faerdig, new Promise((res) => { frist = setTimeout(res, 2000); })]);
      clearTimeout(frist);
      slukSpor(o.stream);
      try {
        const blob = new Blob(o.chunks, { type: o.recorder.mimeType || 'audio/webm' });
        const buf = await blob.arrayBuffer();
        Lyd.init();
        const ac = Lyd.ctx || new (window.AudioContext || window.webkitAudioContext)();
        const lyd = await new Promise((res, rej) => { const p = ac.decodeAudioData(buf.slice(0), res, rej); if (p && p.then) p.then(res, rej); });
        const kanaler = [];
        for (let k = 0; k < lyd.numberOfChannels; k++) kanaler.push(lyd.getChannelData(k));
        const r = LK.behandl(kanaler, lyd.sampleRate);
        if (!r) { valg.status('Der var kun stilhed — prøv igen tættere på mikrofonen.', 'stille'); return; }
        if (valg.behold) { valg.behold(o.id, r); return; } // kalderen gemmer selv
        await KlipLager.gem('klip', o.id, r.wav);
        Lyd.saetLokaltKlip(o.id, r.wav);
        valg.gemt(o.id, r);
      } catch (e) {
        valg.status('Optagelsen kunne ikke gemmes (' + (e && e.message ? e.message : 'ukendt fejl') + ').', 'fejl');
      }
    }
    // Afbryd uden at gemme (skærmen forlades, appen går i baggrunden): mikrofonen slukkes med det samme
    function afbryd() {
      if (starter) { starter.annulleret = true; starter = null; }
      const o = optagelse;
      if (!o) return;
      optagelse = null;
      hvil(o);
      o.recorder.ondataavailable = null;
      o.recorder.onstop = null;
      try { o.recorder.stop(); } catch (e) { /* allerede stoppet */ }
      slukSpor(o.stream);
    }
    async function optag(id, knap) {
      if (starter) return; // mikrofonen er ved at starte: et tryk mere starter ikke en til
      if (optagelse) { const forrige = optagelse.id; await stop(); if (forrige === id) return; }
      if (!kan) { valg.status('Denne browser kan ikke optage lyd.', 'kan-ikke'); return; }
      const s = starter = { id, annulleret: false };
      let stream = null;
      try {
        stream = await aabenMikrofon(s);
        if (s.annulleret) { slukSpor(stream); return; } // stoppet, mens mikrofonen startede (stream kan være null)
        starter = null;
        if (valg.foerStart) valg.foerStart(id);
        const recorder = new MediaRecorder(stream);
        const chunks = [];
        recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
        recorder.start();
        const o = optagelse = { id, recorder, stream, chunks, knap, tekst: knap.textContent, timer: null };
        // Højst maxSek: så stopper optagelsen selv (men kun denne — ikke en ny, der er startet bagefter)
        if (valg.maxSek) o.timer = setTimeout(() => { if (optagelse === o) stop(); }, valg.maxSek * 1000);
        knap.classList.add('optager');
        knap.textContent = valg.stopTekst || '⏹';
        valg.status(valg.startTekst(id));
      } catch (e) {
        if (starter === s) starter = null;
        slukSpor(stream); // fx kunne MediaRecorder ikke laves: mikrofonen må ikke blive ved med at være tændt
        if (!s.annulleret) valg.status('Mikrofonen kunne ikke bruges. Giv spillet lov til mikrofonen i browserens indstillinger.', 'mikrofon');
      }
    }
    return { kan, optag, stop, afbryd, optager: () => !!optagelse };
  }

  // ---------- «Sig dit navn» — barnet indtaler selv sit navn (Jimmy 13-10-2026) ----------
  // Lige efter navneskærmen, når et navn netop er gemt, oplæsningen er slået til, enheden kan optage, og der ikke er en
  // optagelse i forvejen. Stemmen guider med sætninger UDEN navnet. 🔴 optager højst 3 s (ringen fyldes), ⏹ stopper før,
  // og mikrofonen slukkes straks. Optagelsen spilles, og barnet vælger ✔ (gem), 🔁 (prøv igen) eller ⏭ (en voksen kan
  // optage navnet senere under Indstillinger). Klippet gemmes FØRST ved ✔ — samme lager og id som voksendelens
  // navneoptagelse, så hilsenen bagefter er «Hej!» + navnet. Stemmen taler aldrig, mens der optages (🔊 er slukket imens),
  // og mikrofonen slukkes ved ⏭, skærmskift (S.forlad), pagehide/visibilitychange og fejl. Nej til mikrofonen, en fejl
  // eller stilhed to gange i træk: «Det gør vi en anden gang.», og spillet går videre.
  const kanSigeNavn = () => !!(data && data.egetNavn && T.id && voksen.tale && kanOptage() && window.Lydklip &&
    (window.AudioContext || window.webkitAudioContext) && !harNavneklip());
  function sigNavnEllerVidere(fortsaet) {
    if (kanSigeNavn()) visSigNavn(fortsaet); else fortsaet();
  }
  const SIG_NAVN_TRYK = 'Tryk på den røde knap, og sig dit navn.';
  const SIG_NAVN_HJAELP_MS = 900; // svarer mikrofonen ikke inden da, spørger iPad nok om lov (en boks, barnet ikke kan læse)
  function visSigNavn(fortsaet) {
    const id = navnKlipId();
    const proeve = id + '-proeve'; // optagelsen, til barnet trykker ✔ — kun i hukommelsen (Lyd.lokale)
    const navnNu = data.egetNavn;   // navnet, optagelsen hører til
    let fase = 'klar'; // klar · starter (venter på mikrofonen) · optager · behandler · lyt · slut
    let startTid = 0, ringTimer = null, hjaelpTimer = null, stille = 0, wav = null, videreKaldt = false;
    const fig = minFigur();
    const optagKnap = h('button', { class: 'sig-navn-optag', type: 'button', 'aria-label': 'Optag', onclick: () => roedKnap() }, '🔴');
    const ring = h('span', { class: 'sig-navn-ring', 'aria-hidden': 'true' });
    const optagFelt = h('div', { class: 'sig-navn-knap' }, optagKnap, ring);
    const igenKnap = h('button', { class: 'sig-navn-igen', type: 'button', 'aria-label': 'Igen', onclick: () => igen() }, '🔁');
    const okKnap = h('button', { class: 'sig-navn-ok', type: 'button', 'aria-label': 'Færdig', onclick: () => gemKlip() }, '✔');
    const valgFelt = h('div', { class: 'sig-navn-valg' }, igenKnap, okKnap);
    const hoejt = hoejttaler();
    const optager = lavOptager({
      maxSek: 3,
      stopTekst: '⏹',
      foerStart: () => { clearTimeout(hjaelpTimer); Forloeb.stop(); Tale.stop(); }, // stemmen må aldrig tale, mens der optages
      startTekst: () => { visOptager(); return ''; },
      status: (t, kode) => { if (kode) fejl(kode); },
      behold: (_, r) => lyt(r.wav),
    });

    function visKlar() {
      fase = 'klar';
      clearInterval(ringTimer);
      ring.style.setProperty('--p', 0);
      valgFelt.classList.add('skjult');
      okKnap.classList.remove('puls');
      optagFelt.classList.remove('skjult');
      optagKnap.classList.add('puls');
      optagKnap.setAttribute('aria-label', 'Optag');
      hoejt.disabled = false;
    }
    function visOptager() {
      fase = 'optager';
      startTid = performance.now();
      optagKnap.classList.remove('puls');
      optagKnap.setAttribute('aria-label', 'Stop');
      ring.style.setProperty('--p', 0);
      clearInterval(ringTimer);
      // Ringen fyldes på 3 s; er optagelsen stoppet (⏹ eller af sig selv), behandles den
      ringTimer = setInterval(() => {
        if (!optager.optager()) { clearInterval(ringTimer); if (fase === 'optager') fase = 'behandler'; return; }
        ring.style.setProperty('--p', Math.min(1, (performance.now() - startTid) / 3000));
      }, 50);
    }
    // 🔴 (og ⏹ under optagelsen). Et dobbelttryk starter ikke to optagelser og stopper ikke den første med det samme.
    function roedKnap() {
      if (fase === 'optager') {
        if (performance.now() - startTid < 700) return;
        fase = 'behandler';
        Lyd.init();
        optager.stop();
        return;
      }
      if (fase !== 'klar') return; // mikrofonen er ved at starte, eller optagelsen behandles
      fase = 'starter';
      Lyd.init();
      Forloeb.stop(); Tale.stop();
      optagKnap.classList.remove('puls');
      hoejt.disabled = true;
      // Første gang kan iPad spørge om lov til mikrofonen: svarer den ikke straks, skal barnet hente en voksen
      hjaelpTimer = setTimeout(() => { if (fase === 'starter') Tale.sig('Hent en voksen, hvis der kommer en besked.'); }, SIG_NAVN_HJAELP_MS);
      optager.optag(proeve, optagKnap);
    }
    function lyt(w) {
      if (fase === 'slut') return; // skærmen er forladt, mens optagelsen blev behandlet
      clearInterval(ringTimer);
      fase = 'lyt';
      wav = w;
      Lyd.saetLokaltKlip(proeve, w);
      ring.style.setProperty('--p', 0);
      const fokus = optagFelt.contains(document.activeElement);
      optagFelt.classList.add('skjult');
      valgFelt.classList.remove('skjult');
      okKnap.classList.add('puls');
      hoejt.disabled = false;
      if (fokus) okKnap.focus();
      Lyd.aabn(); // iOS: lydkanalen kan være afbrudt af mikrofonen
      afspil();
    }
    const afspil = () => { Forloeb.stop(); Forloeb.run({ tekst: 'Hør her.', navnKlip: proeve, efter: 'Var det godt? Så tryk på det grønne flueben.' }); };
    function igen() {
      if (fase !== 'lyt') return;
      Lyd.init(); Lyd.tryk();
      Forloeb.stop();
      Lyd.fjernLokaltKlip(proeve);
      wav = null;
      const fokus = valgFelt.contains(document.activeElement);
      visKlar();
      if (fokus) optagKnap.focus();
      Tale.sig(SIG_NAVN_TRYK);
    }
    // ✔: gemmes på enheden som voksendelens navneoptagelse og bruges med det samme (synkront i trykket — iOS).
    // Kan IndexedDB ikke gemme (fx privat browsing), bruges klippet heller ikke nu.
    function gemKlip() {
      if (fase !== 'lyt' || !wav) return;
      Lyd.init(); Lyd.tryk();
      const w = wav;
      if (!data || data.egetNavn !== navnNu) { videre(); return; } // navnet er ændret i en anden fane imens
      Lyd.saetLokaltKlip(id, w);
      KlipLager.gem('klip', id, w).catch(() => Lyd.fjernLokaltKlip(id));
      videre();
    }
    function fejl(kode) {
      if (fase === 'slut') return;
      clearTimeout(hjaelpTimer);
      if (kode === 'stille' && ++stille < 2) { visKlar(); Tale.sig('Jeg kunne ikke høre dig. Prøv igen.'); return; }
      ryd();
      Tale.sig('Det gør vi en anden gang.', videre); // spillet går videre, når sætningen er sagt (⏭ imens går straks)
    }
    function ryd() {
      fase = 'slut';
      clearTimeout(hjaelpTimer);
      clearInterval(ringTimer);
      optager.afbryd(); // mikrofonen slukkes med det samme — også hvis den stadig er ved at starte
      Lyd.fjernLokaltKlip(proeve);
      wav = null;
      document.removeEventListener('visibilitychange', vagt);
      window.removeEventListener('pagehide', vagt);
      if (S.forlad === ryd) S.forlad = null;
    }
    function videre() {
      if (videreKaldt) return;
      videreKaldt = true;
      ryd();
      if (tok === S.token) fortsaet();
    }
    // Appen i baggrunden eller siden lukkes: mikrofonen slukkes, og barnet kan trykke 🔴 igen bagefter
    function vagt(e) {
      if (e.type !== 'pagehide' && !document.hidden) return;
      if (fase !== 'starter' && fase !== 'optager') return;
      clearTimeout(hjaelpTimer);
      optager.afbryd();
      visKlar();
    }
    const springOver = () => { Lyd.init(); videre(); }; // ⏭ og Esc: optagelsen kasseres

    const tok = skift(h('div', { class: ['skaerm', 'sig-navn'].join(' ') },
      h('div', { class: 'topbar' },
        ikonKnap('⏭', 'Spring over', springOver, 'sig-navn-spring'),
        h('div', { class: 'topbar-titel', 'aria-hidden': 'true' }, '🎙️'),
        hoejt),
      h('div', { class: 'sig-navn-midte' },
        h('div', { class: 'sig-navn-ven', 'aria-hidden': 'true', 'data-ven': fig.id }, venTegning(fig.id, 'vinker')),
        optagFelt,
        valgFelt)),
    (e) => {
      if (performance.now() < (S.spaertTil || 0)) return; // 2. Enter/Esc fra «Hvad hedder du?» (dobbelttryk) rammer ikke her
      if (e.key === 'Escape') { e.preventDefault(); springOver(); return; }
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') return; // en fokuseret knap (Tab) beholder sin tast
      e.preventDefault();
      if (fase === 'lyt') gemKlip(); else roedKnap();
    });
    S.forlad = ryd;
    S.gentagTale = 'Nu skal du sige dit navn. ' + SIG_NAVN_TRYK;
    S.gentagFn = () => { if (fase === 'lyt') afspil(); else if (fase === 'klar') Tale.sig(S.gentagTale); }; // aldrig under optagelsen
    document.addEventListener('visibilitychange', vagt);
    window.addEventListener('pagehide', vagt);
    visKlar();
    Tale.sig(S.gentagTale); // synkront i trykket på ✔ (iOS)
  }

  // ---------- Verdenskort ----------
  // Fire kort: matematik (VERDENER), dansk (DANSK_VERDENER), engelsk (ENGELSK_VERDENER) og natur (NATUR_VERDENER).
  // data.fag husker det sidste valg.
  const fagNu = () => (D && data && data.fag === 'dansk' ? 'dansk' : E && data && data.fag === 'engelsk' ? 'engelsk'
    : N && data && data.fag === 'natur' ? 'natur' : 'matematik');
  const verdenerFor = (fag) => (fag === 'dansk' ? DANSK_VERDENER : fag === 'engelsk' ? ENGELSK_VERDENER : fag === 'natur' ? NATUR_VERDENER : VERDENER);
  const alleVerdener = () => VERDENER.concat(DANSK_VERDENER, E ? ENGELSK_VERDENER : [], N ? NATUR_VERDENER : []);
  const erDanskEmne = (emne) => !!(D && (D.EMNER[emne] || emne === 'historie' || emne === 'jagt'));
  const erEngelskEmne = (emne) => !!(E && E.EMNER[emne]);
  const erNaturEmne = (emne) => !!(N && N.EMNER[emne]);
  // Det engelske ord høres kun fra den engelske stemmes fil (Tale.sigEn — aldrig enhedens stemme). Uden oplæsning eller
  // uden filen er engelsk gætteleg: svaret tæller ikke (registrer), runden tæller ikke med i emnet (afslutRunde), og
  // fagkortet og verdenerne får et 🔇-mærke, så den voksne ser, at der skal lyd til (review 14-10-2026, fund 3)
  const enHoeres = (tekst) => !!(voksen.tale && tekst && Piper.noegleEn(tekst));
  const emneHoeres = (emne) => E.udtalerFor(emne).every(enHoeres);
  function udenLydMaerke(emne) {
    if (!E || (emne ? emneHoeres(emne) : Object.keys(E.EMNER).some(emneHoeres))) return null;
    return h('span', { class: 'uden-lyd-maerke', 'aria-hidden': 'true' }, '🔇');
  }
  const emneDef = (emne) => O.EMNER[emne] || (D && D.EMNER[emne]) || (E && E.EMNER[emne]) || (N && N.EMNER[emne]) || null;
  // Dansk-emnerne gemmes for sig (data.dansk) med samme form som matematikkens (data.emner) — engelsk og natur også dér
  // (emne-id'erne engFarver, engTal … engLegeplads, naturLort), så de gemte data ikke får nye felter
  const emneLager = (emne) => (erDanskEmne(emne) || erEngelskEmne(emne) || erNaturEmne(emne) ? data.dansk : data.emner);
  const emneData = (emne) => emneLager(emne)[emne];

  function verdenAaben(i, fag) {
    fag = fag || 'matematik';
    const liste = verdenerFor(fag);
    const v = liste[i];
    if (fag === 'engelsk') return erEngelskEmne(v.emne); // alle er åbne fra start
    if (fag === 'natur') return erNaturEmne(v.emne); // også åben fra start
    if (fag === 'dansk') {
      if (!v.emne) return false;
      if (v.emne === 'historie' || v.emne === 'jagt') return true; // Historiebogen (B5) og Bogstavjagt (B10) er åbne fra start
      if (!D.EMNER[v.emne]) return false;
      if (i < DANSK_AABNE_FRA_START) return true;
      if (voksen.aabneAlle && voksen.aabneAlle[T.id]) return true;
      // Små ord åbner, når Lydering er nået til trin 2 (DANSK-ANALYSE 4.4)
      const l = data.dansk.lydering;
      return !!(l && (l.niveau >= 2 || l.mestret));
    }
    if (!v.emne || (!O.EMNER[v.emne] && !v.blandet)) return false;
    if (i < AABNE_FRA_START) return true;
    if (voksen.aabneAlle && voksen.aabneAlle[T.id]) return true;
    // Den nærmeste verden før, som er slået til — en verden, forælderen har slået fra, må ikke låse resten
    let j = i - 1;
    while (j >= 0 && !liste[j].blandet && !emneSlaaetTil(liste[j].emne)) j--;
    if (j < 0) return true;
    const e = data.emner[liste[j].emne];
    return !!(e && e.mestret);
  }

  function emneSlaaetTil(emne) {
    const f = voksen.emner && voksen.emner[T.id];
    return !(f && f[emne] === false);
  }

  function anbefaletVerden(fag) {
    fag = fag || 'matematik';
    const liste = verdenerFor(fag);
    // En pilot (Savannen) anbefales aldrig — heller ikke en afbrudt mission dér (den fortsætter ▶ alligevel: spilVerden)
    // eller den sidst spillede
    const aabne = liste.map((v, i) => i).filter((i) => verdenAaben(i, fag) && emneSlaaetTil(liste[i].emne) && !liste[i].pilot);
    if (!aabne.length) return 0;
    // En afbrudt mission (🗺️ midt i runden) går forud, så de fyldte fodspor ikke tabes
    for (const felt of PAUSET_FELTER) {
      const p = S.afbrudt[felt];
      const pi = p ? liste.findIndex((v) => v.id === p.verden.id) : -1;
      if (aabne.indexOf(pi) >= 0) return pi;
    }
    const sidst = liste.findIndex((v) => v.id === data.sidsteVerden);
    if (aabne.indexOf(sidst) >= 0) {
      const e = emneData(liste[sidst].emne);
      if (!e || !e.mestret) return sidst;
    }
    const ikkeMestret = aabne.find((i) => { const e = emneData(liste[i].emne); return !e || !e.mestret; });
    return ikkeMestret !== undefined ? ikkeMestret : aabne[aabne.length - 1];
  }

  // ▶ på kortet: en afbrudt mission i en pilot fortsættes — ellers ville ▶ starte den anbefalede verden, og startRunde
  // sletter så de fyldte fodspor (én mission pr. fag). Stationernes glød og vennen følger stadig anbefaletVerden
  function spilVerden(fag) {
    fag = fag || 'matematik';
    const liste = verdenerFor(fag);
    for (const felt of PAUSET_FELTER) {
      const p = S.afbrudt[felt];
      const pi = p ? liste.findIndex((v) => v.id === p.verden.id) : -1;
      if (pi >= 0 && liste[pi].pilot && verdenAaben(pi, fag) && emneSlaaetTil(liste[pi].emne)) return pi;
    }
    return anbefaletVerden(fag);
  }

  function stjerner(emne) {
    const e = emneData(emne);
    if (!e) return 0;
    if (!emneDef(emne)) return Math.min(3, e.runder); // Lystårnet og Historiebogen: én stjerne pr. runde
    if (e.mestret) return 3;
    return Math.min(2, e.niveau - 1);
  }

  // En verden, der husker hjælpen: der gror noget, jo flere runder barnet har spillet der
  function verdenHusker(v) {
    const e = emneData(v.emne);
    if (!e || !e.runder) return null;
    const tegn = e.mestret ? '👑' : e.runder >= 6 ? '🌳' : e.runder >= 3 ? '🌿' : '🌱';
    return h('span', { class: 'station-groede', 'aria-hidden': 'true' }, tegn);
  }

  // Matematik, dansk, engelsk eller natur? Store kort (tast 1–4). Vises ved hver start (Jimmy 18-10-2026): det sidste valg
  // (data.fag) lyser, og Enter vælger det — som «Eventyr eller Vælg selv?». Man kan også skifte fra kortet.
  // Fra Vælg selv (tilVaelgSelv) går et fag direkte til det fags Vælg selv — «Eventyr eller Vælg selv?» springes over
  // (Jimmy 18-10-2026: «når man vælger dansk er det det man kommer ind på»)
  function visFagValg(hilsen, tilVaelgSelv) {
    S.runde = null;
    const fagene = FAG.filter((f) => (f.id !== 'engelsk' || E) && (f.id !== 'natur' || N));
    const vaelg = (f) => {
      Lyd.init(); Lyd.rigtig();
      data.fag = f.id;
      gem();
      if (tilVaelgSelv) visVaelgSelv(f.tale + ' Vælg selv. Tryk på det, du vil lege med.');
      else visTilstandValg(f.tale);
    };
    const kort = (f) => h('button', {
      class: 'fag-kort ' + f.id + (data.fag === f.id ? ' sidst' : ''), type: 'button', 'aria-label': f.label, 'data-fag': f.id,
      onclick: () => vaelg(f),
    }, h('span', { class: 'fag-ikon', 'aria-hidden': 'true' }, fagTegning(f) || f.e), h('span', { class: 'fag-navn' }, f.navn),
    f.id === 'engelsk' ? udenLydMaerke() : null); // 🔇: engelsk kan ikke høres (fund 3)
    S.gentagTale = fagene.length > 3 ? 'Vil du lege med tal, bogstaver, engelsk eller natur?'
      : fagene.length > 2 ? 'Vil du lege med tal, bogstaver eller engelsk?' : 'Vil du lege med tal eller med bogstaver?';
    skift(h('div', { class: 'skaerm fagvalg' },
      h('div', { class: 'topbar' },
        h('a', { class: 'ikon-knap', href: 'index.html', 'aria-label': 'Skift spiller', title: 'Skift spiller' }, '🏠'),
        h('div', { class: 'topbar-titel' }, data.navn),
        h('div', { class: 'topbar-hoejre' }, advarselKnap(), hoejttaler())), // ⚠️ hvis spillet ikke kan gemme
      h('div', { class: ['fagvalg-liste', 'fag-' + fagene.length].join(' ') }, fagene.map(kort))),
    (e) => {
      if (performance.now() < (S.spaertTil || 0)) return; // 2. Enter i et dobbelttryk fra skærmen før vælger ikke et fag
      const n = Number(e.key); if (n >= 1 && n <= fagene.length) vaelg(fagene[n - 1]);
      else if (e.key === 'Enter' && !(document.activeElement && document.activeElement.tagName === 'BUTTON')) { // en fokuseret knap beholder sin Enter
        e.preventDefault();
        vaelg(fagene.find((f) => f.id === data.fag) || fagene[0]);
      }
    });
    sigHilsen(hilsen, S.gentagTale);
  }

  // Naturkortet får ræven fra grafik.js (de andre fag har deres emoji); mangler tegningen, bruges emojien (🌿)
  const fagTegning = (f) => (f.id === 'natur' && GR && GR.natur ? tegning(GR.natur['dyr-raev'], 'fag-tegning') : null);

  // Skift fag (i topbarerne): åbner fagvalget. Ikonet er et andet fag end det, barnet er i (🔢 eller 🔤) — i engelsk og
  // natur et neutralt 📚 (der er flere andre fag, og 🔢 lovede matematik, men åbnede fagvalget)
  function fagSkiftKnap(fag, tilVaelgSelv) {
    const neutral = fag === 'engelsk' || fag === 'natur';
    const label = fag === 'dansk' ? 'Skift til matematik' : neutral ? 'Skift fag' : 'Skift til dansk';
    return ikonKnap(fag === 'matematik' ? '🔤' : neutral ? '📚' : '🔢', label, () => visFagValg(undefined, tilVaelgSelv), 'fag-knap');
  }

  // B10: Eventyr eller Vælg selv? To store kort efter fagvalget — vises hver gang (ét tryk); det sidste valg lyser
  function visTilstandValg(hilsen) {
    S.runde = null;
    const fag = fagNu();
    const vaelg = (t) => {
      Lyd.init(); Lyd.rigtig();
      data.tilstand = t;
      gem();
      if (t === 'frit') visVaelgSelv('Vælg selv. Tryk på det, du vil lege med.');
      else visKort(fag === 'dansk' ? 'Eventyr. Tryk på den store knap, så leger vi med bogstaver.' : fag === 'engelsk' ? 'Eventyr. Tryk på den store knap, så leger vi med engelsk.'
        : fag === 'natur' ? 'Eventyr. Tryk på den store knap, så leger vi med naturen.' : 'Eventyr. Tryk på den store knap, så leger vi med tal.');
    };
    const kort = (t, ikon, navn, label) => h('button', {
      class: 'fag-kort tilstand-kort ' + t + (data.tilstand === t ? ' sidst' : ''), type: 'button', 'aria-label': label, 'data-tilstand': t,
      onclick: () => vaelg(t),
    }, h('span', { class: 'fag-ikon', 'aria-hidden': 'true' }, ikon), h('span', { class: 'fag-navn' }, navn));
    const fagKnap = D ? fagSkiftKnap(fag) : topbarPlads();
    S.gentagTale = 'Vil du på eventyr, eller vil du selv vælge?';
    skift(h('div', { class: 'skaerm fagvalg tilstandvalg fag-' + fag },
      h('div', { class: 'topbar' },
        h('a', { class: 'ikon-knap', href: 'index.html', 'aria-label': 'Skift spiller', title: 'Skift spiller' }, '🏠'),
        fagKnap,
        h('div', { class: 'topbar-titel' }, data.navn),
        h('div', { class: 'topbar-hoejre' }, advarselKnap(), hoejttaler())),
      h('div', { class: 'fagvalg-liste' },
        kort('eventyr', '🗺️', 'Eventyr', 'Eventyr — verdenerne i rækkefølge'),
        kort('frit', '🎒', 'Vælg selv', 'Vælg selv — fagets emner'))),
    (e) => {
      if (e.key === '1') vaelg('eventyr');
      else if (e.key === '2') vaelg('frit');
      else if (e.key === 'Enter') { e.preventDefault(); vaelg(data.tilstand || 'eventyr'); }
    });
    sigHilsen(hilsen, S.gentagTale);
  }

  // Lystårnets lys: én lysperle pr. runde i eventyret (forudsigeligt), fuldt lys ved 30.
  // Runder i «Vælg selv» giver dyr til samlebogen, men ingen lysperler (data.perler).
  function lysStyrke() {
    return Math.min(1, (data ? data.perler : 0) / 30).toFixed(2);
  }

  function visKort(hils) {
    stopUr();
    S.runde = null; // ingen runde i gang, så tid tælles ikke på kortet
    const fig = minFigur();
    const fag = fagNu();
    const liste = verdenerFor(fag);
    const anbefalet = anbefaletVerden(fag);
    const flade = h('div', { class: 'kort-flade' });
    // Kortets baggrund (grafik.js): et roligt landskab bag stien og stationerne — kun pynt, ingen knapper
    const bund = GR ? tegning(GR.kort, 'kort-baggrund') : null;
    if (bund) { bund.setAttribute('preserveAspectRatio', 'xMidYMid slice'); flade.append(bund); }
    const sti = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sti.setAttribute('class', 'kort-sti');
    sti.setAttribute('aria-hidden', 'true');
    flade.append(sti);

    const stationer = liste.map((v, i) => {
      const aaben = verdenAaben(i, fag) && emneSlaaetTil(v.emne);
      const kommer = !v.emne;
      const antalStj = v.emne ? stjerner(v.emne) : 0;
      const knap = h('button', {
        class: 'station' + (aaben ? ' aaben' : ' laast') + (kommer ? ' kommer' : '') + (i === anbefalet ? ' anbefalet' : ''),
        type: 'button', 'aria-label': v.navn,
        onclick: () => {
          Lyd.init();
          if (aaben) { Lyd.tryk(); startRunde(v); }
          else { Lyd.tryk(); Tale.sig(v.tale + (kommer ? ' Den kommer snart.' : ' Den åbner, når du har klaret verdenen før.')); }
        },
      },
      verdenIkon(v),
      !aaben ? h('span', { class: 'station-laas', 'aria-hidden': 'true' }, '🔒') : null,
      v.fag === 'engelsk' && aaben ? udenLydMaerke(v.emne) : null,
      h('span', { class: 'station-navn' }, v.navn),
      aaben ? h('span', { class: 'station-stjerner', 'aria-label': antalStj + (antalStj === 1 ? ' stjerne' : ' stjerner') },
        [0, 1, 2].map((k) => h('i', { class: k < antalStj ? 'fuld' : '' }, '★'))) : null,
      aaben ? verdenHusker(v) : null);
      flade.append(knap);
      return knap;
    });

    // Vennen på kortet åbner Vennebogen (14-10-2026): temaets to rejsevenner og dem, lysperlerne har låst op
    const ven = h('button', {
      class: ['kort-ven', nyVenUset ? 'ny-ven' : ''].filter(Boolean).join(' '), type: 'button', 'aria-label': 'Skift ven: ' + fig.navn,
      onclick: () => { Lyd.init(); Lyd.tryk(); visVennebog(); },
    }, venTegning(fig.id, 'udforsker'));
    flade.append(ven);

    // 🎒 Vælg selv: alle emner frit — eventyret (▶ og stationerne) er det samme som før
    const fritKnap = h('button', {
      class: 'kort-frit', type: 'button', 'aria-label': 'Vælg selv',
      onclick: () => { Lyd.init(); Lyd.tryk(); visVaelgSelv('Vælg selv. Tryk på det, du vil lege med.'); },
    }, h('span', { 'aria-hidden': 'true' }, '🎒'));
    flade.append(fritKnap);

    const v = liste[spilVerden(fag)];
    const spil = () => { Lyd.init(); Lyd.tryk(); startRunde(v); };
    const spilKnap = h('button', { class: 'stor-knap spil-knap kort-spil puls', type: 'button', 'aria-label': 'Spil: ' + v.navn, onclick: spil },
      h('span', { 'aria-hidden': 'true' }, '▶'), verdenIkonLille(v, 'kort-spil-ikon'));
    flade.append(spilKnap);

    S.gentagTale = 'Tryk på den store knap for at spille. Eller tryk på en verden.';
    // ⚠️ (spillet kan ikke gemme) står på den tomme plads til venstre. Så er der ikke plads til lysperlerne
    // i titlen på en smal telefon — de ses stadig på startskærmen.
    const advarsel = advarselKnap();
    // Skift mellem matematik og dansk (🔢 / 🔤) — står på pladsen til venstre; ⚠️ flytter så til højre
    const fagKnap = D ? fagSkiftKnap(fag) : null;
    skift(h('div', { class: 'skaerm kort fag-' + fag },
      h('div', { class: 'topbar' },
        h('a', { class: 'ikon-knap', href: 'index.html', 'aria-label': 'Skift spiller', title: 'Skift spiller' }, '🏠'),
        fagKnap || advarsel || topbarPlads(), // to knapper til højre — så titlen står i midten
        h('div', { class: 'topbar-titel' }, h('span', { class: 'kort-navn' }, data.navn), data.perler && !advarsel ? h('span', { class: 'perle-tal lille' }, ' ✨ ' + data.perler) : null),
        h('div', { class: 'topbar-hoejre' },
          fagKnap ? advarsel : null,
          ikonKnap('📖', 'Samlebog', () => visSamlebog()),
          hoejttaler())),
      flade),
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); spil(); }
      const n = Number(e.key);
      if (n >= 1 && n <= stationer.length) stationer[n - 1].click();
    });

    // Placér stationerne langs en snoet sti (genberegnes ved drej/størrelse)
    const placer = () => {
      const w = flade.clientWidth, hh = flade.clientHeight;
      if (!w || !hh) return;
      const n = liste.length;
      const liggende = w >= hh * 1.05;
      const knap = spilKnap.offsetWidth || 130;
      // 🎒 står i øverste venstre hjørne: ingen station (med navn og stjerner) må ligge inde over den
      const frit = fritKnap.offsetWidth || 80;
      const ssMax = Math.max(...stationer.map((s) => s.offsetWidth || 100));
      const x0Start = Math.min(90, w * 0.08), y0Start = Math.min(80, hh * 0.08);
      let x0 = x0Start, y0 = y0Start;
      const halv = Math.max(ssMax, 150) / 2; // navneskiltet kan være bredere end stationen
      // Halvdelen af stationens bredde med navneskilt (navnene på låste verdener er skjult på små skærme)
      const halvNavn = (i) => { const st = stationer[i], nv = st && st.querySelector('.station-navn'); return Math.max((st && st.offsetWidth || 80) / 2, nv ? nv.offsetWidth / 2 : 0); };
      // trang: højkant uden navneskilte (.trangt) — så skal der ikke være plads til navnet under den næstsidste station
      const beregn = (trang) => {
        // Én verden (natur, 20-10-2026): stationen står midt på kortet — ikke alene oppe i hjørnet ved 🎒
        if (n === 1) return [{ x: w / 2, y: hh * 0.45 }];
        // Den sidste station står altid i øverste række (liggende) / til venstre (højkant), så ▶ nederst til højre ikke dækker den.
        // ▶ har sin egen plads nederst til højre: kun rækken/søjlen med ▶ skal stoppe før den — den anden må gå
        // næsten helt ud til kanten. Så får stationerne mere plads (B6: 11 verdener).
        const fri = liggende ? w - halvNavn(n - 1) - 8 : hh - ssMax / 2 - 40;                      // den sidste station (uden ▶)
        const vedKnap = liggende ? w - knap - 24 - Math.max(16, halvNavn(n - 2)) : hh - knap - ssMax / 2 - (trang ? 40 : 75);  // den næstsidste (rækken med ▶) — navnet under den og ▶'s lille ikon må ikke røre ▶
        const start = liggende ? x0 : y0;
        const trin = n > 2 ? Math.min((fri - start) / (n - 1), (vedKnap - start) / (n - 2)) : (vedKnap - start);
        return liste.map((_, i) => {
          const top = (n - 1 - i) % 2 === 0;
          const pos = start + trin * i;
          return liggende ? { x: pos, y: hh * (top ? 0.3 : 0.7) } : { x: w * (top ? 0.3 : 0.7), y: pos };
        });
      };
      // Uden navneskilte (trang) er stationen kun sin cirkel og stjernerne over den (målt) — ellers navnets bredde og 30 px
      const stj = stationer.map((st) => st.querySelector('.station-stjerner')).find(Boolean);
      const stjOver = stj ? Math.max(0, stj.closest('.station').getBoundingClientRect().top - stj.getBoundingClientRect().top) + 2 : 30;
      const iHjoernet = (p, trang) => p.x - (trang ? ssMax / 2 : halv) < frit + 10 && p.y - ssMax / 2 - (trang ? stjOver : 30) < frit + 10;
      const stil = (trang) => {
        x0 = x0Start; y0 = y0Start;
        let pk = beregn(trang);
        const steg = trang ? 4 : 12; // uden navne tæller hver pixel: finere skridt forbi 🎒
        for (let k = 0; k < 144 / steg && pk.some((q) => iHjoernet(q, trang)); k++) {
          if (liggende) x0 += steg; else y0 += steg;
          pk = beregn(trang);
        }
        return pk;
      };
      let punkter = stil(false);
      // Højkant med mange verdener (iPhone): er der ikke plads til navneskiltet mellem to stationer i samme søjle,
      // skjules navnene (de lå under den næste stations stjerner — testlisten v112). Ikonerne, stjernerne og oplæsningen
      // bærer betydningen; de låste verdeners navne er allerede skjult på små skærme. Uden navne bruges luften over
      // den første station og over ▶ til mere afstand i søjlen, så stjernerne ikke ligger ind over stationen ovenover
      // (review 12-10: et tryk dér åbnede den forkerte verden)
      const trangt = !liggende && n > 2 && Math.abs(punkter[2].y - punkter[0].y) < ssMax + 44;
      if (trangt) punkter = stil(true);
      punkter.forEach((p, i) => { stationer[i].style.left = p.x + 'px'; stationer[i].style.top = p.y + 'px'; });
      flade.classList.toggle('trangt', trangt);
      // glat kurve gennem punkterne
      let d = 'M' + punkter[0].x + ',' + punkter[0].y;
      for (let i = 1; i < punkter.length; i++) {
        const p0 = punkter[Math.max(0, i - 2)], p1 = punkter[i - 1], p2 = punkter[i], p3 = punkter[Math.min(punkter.length - 1, i + 1)];
        const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
        d += ' C' + c1x + ',' + c1y + ' ' + c2x + ',' + c2y + ' ' + p2.x + ',' + p2.y;
      }
      sti.setAttribute('viewBox', '0 0 ' + w + ' ' + hh);
      sti.innerHTML = '<path d="' + d + '" class="sti-kant"/><path d="' + d + '" class="sti-midte"/>';
      // Vennen står skråt over den anbefalede verden — men altid inden for kortet
      const p = punkter[anbefalet];
      const vs = ven.offsetWidth || 80;
      const ss = stationer[anbefalet].offsetWidth || 100;
      let vx, vy;
      if (liggende) {
        vx = p.x - ss * 0.55;
        vy = p.y - ss * 0.5 - vs * 0.75;
        if (vy < vs * 0.5) {
          // Ingen plads over stationen: ved siden af (til venstre, ellers til højre) — under den står næste stations stjerner
          vy = p.y;
          vx = p.x - ss * 0.5 - vs * 0.6;
          if (vx < vs * 0.5 + 2) vx = p.x + ss * 0.5 + vs * 0.6;
        }
      } else {
        // Højkant: stationerne står tæt lodret — vennen står ved siden af, ud mod kanten, så den ikke dækker et navn
        vx = p.x < w / 2 ? p.x - ss * 0.5 - vs * 0.6 : p.x + ss * 0.5 + vs * 0.6;
        vy = p.y - ss * 0.15;
      }
      vx = Math.max(vs * 0.5 + 2, Math.min(w - vs * 0.5 - 2, vx));
      if (vx - vs / 2 < frit + 8 && vy - vs / 2 < frit + 8) vx = Math.min(w - vs * 0.5 - 2, p.x + ss * 0.5 + vs * 0.6); // ikke oven på 🎒
      // Dækker vennen et navn, en station, 🎒 eller ▶ (fx når kortet er trangt)? Så prøv pladser rundt om stationen
      if (w && hh) {
        const fr = flade.getBoundingClientRect();
        const hindringer = [...flade.querySelectorAll('.station-navn, .station-ikon, .station-stjerner, .kort-frit, .kort-spil')].map((el) => {
          const r = el.getBoundingClientRect();
          return { l: r.left - fr.left, t: r.top - fr.top, r: r.right - fr.left, b: r.bottom - fr.top };
        });
        const halvV = vs / 2 + 10; // vennen svæver op og ned (animationen «svaev»)
        const fri = (x, y) => x - halvV >= 0 && x + halvV <= w && y - halvV >= 0 && y + halvV <= hh &&
          hindringer.every((o) => x + halvV <= o.l || x - halvV >= o.r || y + halvV <= o.t || y - halvV >= o.b);
        if (!fri(vx, vy)) {
          const kand = [];
          for (const f of [1, 1.4, 1.9]) for (let k = 0; k < 16; k++) {
            const v = -Math.PI / 2 - Math.PI / 4 + k * Math.PI / 8;
            kand.push([p.x + Math.cos(v) * (ss * 0.5 + vs * 0.5) * f, p.y + Math.sin(v) * (ss * 0.5 + vs * 0.5) * f]);
          }
          const valgt = kand.find(([x, y]) => fri(x, y));
          if (valgt) { vx = valgt[0]; vy = valgt[1]; }
        }
      }
      ven.style.left = vx + 'px';
      ven.style.top = vy + 'px';
    };
    placer(); // med det samme, så et hurtigt tryk ikke rammer stationer, der står oven i hinanden
    requestAnimationFrame(placer);
    kortPlacer = placer;
    if (typeof hils === 'string') Tale.sig(hils); // skift() ovenfor stoppede al tale — sig hilsenen nu
  }
  let kortPlacer = null;
  window.addEventListener('resize', () => { if (kortPlacer && document.querySelector('.kort-flade')) kortPlacer(); });

  // ---------- Runde = en lille mission: hjælp et bestemt dyr med 5 opgaver ----------
  // Valgfri daglig tidsgrænse fra voksendelen — en igangværende runde gøres altid færdig
  function tidOpbrugt() {
    const g = voksen.tidsgraense && voksen.tidsgraense[T.id];
    if (!g) return false;
    const d = data.dage[G.idag()];
    return !!d && d.sek >= g * 60;
  }

  function visTidBrugt() {
    stopUr();
    const fig = minFigur();
    skift(h('div', { class: 'skaerm pause tid-brugt' },
      h('div', { class: 'topbar' },
        h('a', { class: 'ikon-knap', href: 'index.html', 'aria-label': 'Til forsiden', title: 'Til forsiden' }, '🏠'),
        h('div', { class: 'topbar-titel' }, 'Vi ses i morgen'),
        ikonKnap('🗺️', 'Til kortet', () => visKort(false))),
      h('div', { class: 'pause-midte' },
        h('div', { class: 'pause-ven', 'aria-hidden': 'true' }, venTegning(fig.id, 'hviler'), '💤'),
        h('div', { class: 'pause-tekst' }, 'Nu har vi spillet nok i dag.'))));
    S.gentagTale = 'Nu har vi spillet nok i dag. ' + fig.navn + ' hviler sig. Vi ses i morgen!';
    Tale.sig(S.gentagTale);
  }

  // opts.frit: runden er startet fra «Vælg selv» (🎒) — samme emne-niveau og samme dyr, men ingen lysperle,
  // og ⬅️ fører tilbage til 🎒. opts.lektionSet: lektionen er vist (første gang i verdenen).
  // B10: opgaver pr. runde og pause efter så mange runder — den voksne vælger under Indstillinger
  const antalOpgaver = () => ([5, 8, 10].indexOf(voksen.opgaverPrRunde) >= 0 ? voksen.opgaverPrRunde : 8);
  // Natur husker de senest viste dyr, mens siden er åben (S.naturNylige), så næste runde begynder med dyr, barnet ikke
  // lige har set (runde 2, 20-10-2026). Ikke i de gemte data: et nyt felt ville kræve en migrering. Kun dyrene: Savannens
  // tælling (fase 3) har et tal som svar. udenLyt: oplæsningen er fra, så Savannens «første lyd» springes over
  function naturRunde(emne, niveau, rng, gentag, udenLyt) {
    const opgaver = N.lavRunde(emne, niveau, rng, { gentag: gentag, antal: antalOpgaver(), nylige: S.naturNylige || [], udenLyt: !!udenLyt });
    S.naturNylige = (S.naturNylige || []).concat(opgaver.map((o) => o.svar).filter((x) => typeof x === 'string')).slice(-40);
    return opgaver;
  }
  const pauseEfter = () => ([2, 3, 4].indexOf(voksen.pauseEfter) >= 0 ? voksen.pauseEfter : 3);

  function startRunde(verden, opts) {
    opts = opts || {};
    if (tidOpbrugt()) { visTidBrugt(); return; }
    // Afbrudt med 🗺️? Så fortsætter vi samme mission med de fodspor, der allerede er fyldt
    const fraFelt = PAUSET_FELTER.find((f) => S.afbrudt[f] && S.afbrudt[f].verden.id === verden.id);
    const p = fraFelt ? S.afbrudt[fraFelt] : null;
    if (p && p.i < p.opgaver.length) {
      S.afbrudt[fraFelt] = null;
      S.runde = p;
      p.sidstAktiv = Date.now();
      try {
        visRundeSkaerm(true);
        return;
      } catch (e) {
        // Missionen kunne ikke tegnes (fx fra en anden udgave): glem den og start en ny
        S.runde = null;
        saetPauset(fraFelt, null);
      }
    }
    // Første gang i en verden: en kort lektion først
    if (!opts.lektionSet && LEKTIONER[verden.id] && !data.lektioner[verden.id]) {
      visLektion(verden, () => startRunde(verden, Object.assign({}, opts, { lektionSet: true })), opts.frit ? () => visVaelgSelv() : () => visKort(false));
      return;
    }
    // Historiebogen er ingen runde med opgaver, men læs → tegn → skriv (B5)
    if (verden.emne === 'historie') {
      if (opts.frit) visHistorieValg(); else visHistorieSide(naesteHistorie(), false);
      return;
    }
    if (verden.emne === 'jagt') { visBogstavjagt(!!opts.frit); return; } // B10
    // En ny mission i en anden verden erstatter den afbrudte — men kun i samme fag
    S.afbrudt[fagFelt(verden)] = null;
    saetPauset(fagFelt(verden), null);
    const emne = verden.emne;
    if (Tale.opdaterStemmer) Tale.opdaterStemmer(); // stemmerne kan være kommet siden opstart (iOS)
    // Uden oplæsning, eller hverken Piper-filer eller en dansk stemme på enheden: «hør og find» springes over
    const udenLyt = !voksen.tale || (!Piper.klar() && (!Tale.findes || Tale.udenDansk));
    const lagerE = emneLager(emne);
    if (!lagerE[emne]) lagerE[emne] = G.standardEmne();
    const ed = lagerE[emne];
    const rng = O.lavRng((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
    let opgaver;
    if (verden.blandet) {
      // Lystårnet: en opgave fra hvert åbent emne (i «Vælg selv»: alle emner), på barnets eget niveau i emnet
      const niveauer = {};
      VERDENER.forEach((v, i) => {
        if (!v.blandet && (opts.frit || verdenAaben(i)) && emneSlaaetTil(v.emne)) niveauer[v.emne] = data.emner[v.emne] ? data.emner[v.emne].niveau : 1;
      });
      opgaver = O.lavBlandetRunde(niveauer, rng, { ting: T.ting, udenLyt: udenLyt, antal: antalOpgaver() });
    } else if (verden.fag === 'dansk') {
      ed.niveau = Math.min(D.EMNER[emne].maxNiveau, Math.max(1, ed.niveau || 1));
      opgaver = D.lavRunde(emne, ed.niveau, rng, { gentag: (data.gentag[emne] || []).filter(opgaveKendt), udenLyt: udenLyt, antal: antalOpgaver() });
    } else if (verden.fag === 'engelsk') {
      // Engelsk er altid «hør og find»: uden lyd siges ordet ikke (tavshed + billedet) — runden kan spilles, men tæller
      // ikke (registrer/afslutRunde), og kortene viser 🔇 (udenLydMaerke)
      ed.niveau = Math.min(E.EMNER[emne].maxNiveau, Math.max(1, ed.niveau || 1));
      opgaver = E.lavRunde(emne, ed.niveau, rng, { gentag: (data.gentag[emne] || []).filter(opgaveKendt), antal: antalOpgaver() });
    } else if (verden.fag === 'natur') {
      // Natur: se lorten (og sporet) → tryk på dyret. Billederne bærer opgaven, så den kan også spilles uden lyd — kun
      // Savannens «Hvilket dyr starter med …?» skal høres, og den kommer ikke uden oplæsning
      ed.niveau = Math.min(N.EMNER[emne].maxNiveau, Math.max(1, ed.niveau || 1));
      opgaver = naturRunde(emne, ed.niveau, rng, (data.gentag[emne] || []).filter(opgaveKendt), udenLyt);
    } else {
      ed.niveau = O.klemNiveau(emne, ed.niveau);
      opgaver = O.lavRunde(emne, ed.niveau, rng, { ting: T.ting, gentag: (data.gentag[emne] || []).filter(opgaveKendt), udenLyt: udenLyt, antal: antalOpgaver() });
    }
    if (!opgaver || !opgaver.length) { visKort(); return; } // fx alle emner slået fra — aldrig en tom runde
    if (!opts.frit) data.sidsteVerden = verden.id;
    gem();
    S.runde = {
      verden: verden, emne: emne, opgaver: opgaver, i: 0, forsoeg: 0, frit: !!opts.frit,
      sidstAktiv: Date.now(), aktivMs: 0, niveauOp: false, registreret: -1,
      maerke: O.maerkeForRunde(T.samling, data.runderIalt, minFigur().e, data.maerker), // dyret, vi hjælper — kendt fra start
      navnMaa: navnTur(), // barnets navn må siges én gang i denne runde (hver anden runde)
    };
    visRundeSkaerm(false, opts.frit ? fritIntro(verden, opgaver) : '');
  }

  // Hvert fag husker sin egen afbrudte mission (fund 5, Jimmy 11-10-2026): matematik i data.pauset (som altid),
  // dansk i det valgfrie felt data.pausetDansk. En runde i det ene fag rører aldrig det andet fags mission.
  // En mission, der er hentet fra et felt, bliver i det felt (r.pausetFelt) — også en dansk mission, der fra
  // før lå i pauset (den flyttes ikke). Historiebogen, Bogstavjagt og 🤔 rører ingen af dem.
  // Engelsk (13-10-2026) og natur (20-10-2026) husker deres afbrudte mission kun, mens siden er åben
  // (S.afbrudt.pausetEngelsk/pausetNatur): et nyt felt i de gemte data ville kræve en migrering. saetPauset gemmer dem aldrig.
  const PAUSET_FELTER = ['pauset', 'pausetDansk', 'pausetEngelsk', 'pausetNatur'];
  const fagFelt = (verden) => (verden && verden.fag === 'dansk' ? 'pausetDansk' : verden && verden.fag === 'engelsk' ? 'pausetEngelsk'
    : verden && verden.fag === 'natur' ? 'pausetNatur' : 'pauset');
  const rundeFelt = (r) => r.pausetFelt || fagFelt(r.verden);
  function saetPauset(felt, p) {
    if (felt === 'pausetEngelsk' || felt === 'pausetNatur') return; // kun i hukommelsen
    if (felt === 'pauset') data.pauset = p || null;
    else if (p) data[felt] = p;
    else delete data[felt]; // valgfrit felt: ingen afbrudt dansk mission = intet felt
  }

  // Missionen gemmes undervejs, så den kan fortsætte, også hvis siden lukkes eller genindlæses
  function huskMission() {
    const r = S.runde;
    if (!r || r.test) return;
    saetPauset(rundeFelt(r), { verden: r.verden.id, i: r.i, opgaver: r.opgaver, niveauOp: r.niveauOp, registreret: r.registreret, maerke: r.maerke.id, frit: r.frit === true });
  }

  // En gemt opgave (afbrudt mission, «kommer igen») kan stamme fra en anden udgave af spillet: brug den kun,
  // hvis emnet, visningen og tingene stadig findes — ellers kan runden gå i stå
  const KENDTE_VISNINGER = ['ting', 'terning', 'terninger', 'klodser', 'streger', 'fingre', 'haand', 'kugleramme', 'par', 'flest', 'forskel', 'lyt', 'talstreg', 'plus', 'regnestykke', 'mangler', 'stoerst', 'minus', 'raekke', 'staenger', 'form', 'formScene', 'ur', 'moenter', 'koeb', 'moenster', 'soembraet', 'lineal', 'linealTegn', 'maalKlodser', 'scene', 'rute', 'kurv'];
  const KENDTE_DANSK = ['ordBillede', 'lyt', 'lytLyd', 'bogstav', 'stortBogstav', 'alfabet', 'lydering', 'skrevetOrd', 'bygOrd', 'saetning', 'bygSaetning', 'scene', 'tryktBogstav', 'retOrd', 'bygAlfabet', 'ikkeSkilt', 'lydTog', 'sand'];
  function opgaveKendt(o) {
    if (o && o.fag === 'natur') return !!(N && N.opgaveKendt(o));
    if (o && o.fag === 'engelsk' && o.valgArt === 'sig') return !!(E && E.EMNER[o.emne] && E.GEN[o.type] && o.vis && o.vis.art === 'engelskSig' && E.SIG[o.vis.saetning] && o.svar === 'sagt');
    if (o && o.fag === 'engelsk') return !!(E && E.EMNER[o.emne] && E.GEN[o.type] && o.vis && o.vis.art === 'engelskLyt' && E.ORD[o.svar] && Array.isArray(o.valg) && o.valg.every((v) => E.ORD[v]));
    if (o && o.fag === 'dansk') return !!(D && D.EMNER[o.emne] && D.GEN[o.type] && o.vis && KENDTE_DANSK.indexOf(o.vis.art) >= 0);
    return !!(o && O.EMNER[o.emne] && o.vis && KENDTE_VISNINGER.indexOf(o.vis.art) >= 0 && (!o.vis.ting || O.TING[o.vis.ting]) &&
      (!o.vis.form || O.FORMER[o.vis.form]));
  }

  // Ved opstart: de gemte, afbrudte missioner (en pr. fag) bliver til S.afbrudt (▶ på kortet fortsætter dem)
  function hentMission() {
    const pulje = O.MAERKER[T.samling] || O.MAERKER.jungle;
    for (const felt of PAUSET_FELTER) {
      // Den engelske mission og naturmissionen findes kun i hukommelsen (saetPauset gemmer dem aldrig): et felt i data
      // læses ikke, og en storage-hændelse (hentMission igen) beholder missionen i S.afbrudt
      if (felt === 'pausetEngelsk' || felt === 'pausetNatur') continue;
      const p = data[felt];
      const verden = p && alleVerdener().find((v) => v.id === p.verden);
      // En engelsk mission eller en naturmission i et andet felt kan kun komme fra en håndrettet fil: den hentes ikke
      // (sikkerhedsreview 20-10-2026)
      const kunHukommelse = verden && (verden.fag === 'engelsk' || verden.fag === 'natur');
      if (!verden || kunHukommelse || !Array.isArray(p.opgaver) || !p.opgaver.every(opgaveKendt)) { S.afbrudt[felt] = null; saetPauset(felt, null); continue; }
      S.afbrudt[felt] = {
        verden: verden, emne: verden.emne, opgaver: p.opgaver, i: p.i, forsoeg: 0, pausetFelt: felt,
        sidstAktiv: Date.now(), aktivMs: 0, niveauOp: p.niveauOp, registreret: p.registreret, frit: p.frit === true,
        maerke: pulje.find((m) => m.id === p.maerke) || O.maerkeForRunde(T.samling, data.runderIalt, minFigur().e, data.maerker),
      };
    }
  }

  function registrerAktivitet() {
    const r = S.runde;
    if (!r) return;
    const nu = Date.now();
    r.aktivMs += Math.min(60000, nu - r.sidstAktiv); // pauser over et minut tæller ikke
    r.sidstAktiv = nu;
  }

  const pronomen = (m) => (m.art === 'et' ? 'det' : 'den');
  const stort = (t) => t.charAt(0).toUpperCase() + t.slice(1);

  // Tilbage fra en runde: til kortet (eventyret) eller til 🎒 (Vælg selv). Missionen huskes (▶ fortsætter den).
  function forladRunde() {
    const r = S.runde;
    if (r && r.quiz) { S.runde = null; visHistorieSide(r.quiz.nr, r.quiz.frit); return; } // 🤔: tilbage til historien
    registrerAktivitet(); gemTid();
    if (r) S.afbrudt[rundeFelt(r)] = r;
    if (r && r.frit) visVaelgSelv(); else visKort(false);
  }

  function visRundeSkaerm(genoptag, forTale) {
    const r = S.runde;
    // Fodspor, der fyldes undervejs, og dyret for enden af sporet
    const prikker = h('div', { class: 'fremdrift', 'aria-hidden': 'true', style: '--n:' + r.opgaver.length },
      r.opgaver.map(() => h('span', { class: 'prik' })),
      h('span', { class: 'fremdrift-dyr' }, dyrTegning(r.maerke)));
    const fig = minFigur();
    r.dom = {
      prikker: prikker,
      visning: h('div', { class: 'visning' }),
      hjaelp: h('div', { class: 'hjaelp-felt' }),
      tekst: h('div', { class: 'spoerg-tekst' }),
      svar: h('div', { class: 'svar-panel' }),
      ven: h('div', { class: 'runde-ven', 'aria-hidden': 'true' }, venTegning(fig.id, grundUdtryk(r.opgaver[r.i]))),
    };
    r.dom.krop = h('div', { class: 'runde-krop' },
      h('div', { class: 'visning-panel' }, r.dom.tekst, r.dom.visning, r.dom.hjaelp, r.dom.ven),
      r.dom.svar);
    skift(h('div', { class: 'skaerm runde' },
      h('div', { class: 'topbar' },
        r.quiz ? ikonKnap('📖', 'Tilbage til historien', forladRunde) : r.frit ? ikonKnap('🎒', 'Tilbage til Vælg selv', forladRunde) : ikonKnap('🗺️', 'Tilbage til kortet', forladRunde),
        prikker,
        // 📖 læser verdenens lektion op igen (uden at forlade opgaven)
        LEKTIONER[r.verden.id] && !r.test
          ? h('div', { class: 'topbar-hoejre' }, ikonKnap('📖', 'Hør lektionen igen', () => Tale.sig(LEKTIONER[r.verden.id]), 'hoer-lektion'), hoejttaler())
          : hoejttaler()),
      r.dom.krop),
    rundeTaster);
    // Fodspor, der allerede er fyldt (når en afbrudt mission fortsætter)
    [...prikker.querySelectorAll('.prik')].slice(0, r.i).forEach((pk) => pk.classList.add('fuld'));
    // Kort missionsbesked før første spørgsmål — lange sætninger mister man undervejs
    visOpgave(r.quiz ? 'Hvad skete der? Lyt godt efter.' : genoptag ? 'Vi fortsætter.' : (forTale ? forTale + ' ' : '') + 'Hjælp ' + r.maerke.bestemt + '!');
  }

  function gemTid() {
    const r = S.runde;
    if (!r || !r.aktivMs || r.quiz) return;
    G.dag(data).sek += Math.round(r.aktivMs / 1000);
    r.aktivMs = 0;
    gem();
  }

  function visOpgave(forTale) {
    const r = S.runde;
    const opg = r.opgaver[r.i];
    r.forsoeg = 0;
    r.laast = false;
    r.visSvar = false;
    r.buffer = '';
    r.opdaterDisplay = null; r.bygNulstil = null; r.byg = null; r.figur = null; r.lineal = null; r.vendtOp = false;
    r.hjaelpIntro = null; r.placer = null; r.trinvis = null; r.sand = null; // C · minispil
    S.spaertTil = performance.now() + 300; // et dobbelttryk på sidste svar må ikke besvare den nye opgave
    [...r.dom.prikker.querySelectorAll('.prik')].forEach((p, i) => p.classList.toggle('nu', i === r.i));
    r.dom.tekst.textContent = '';
    r.dom.tekst.append(h('span', { class: 'opgave-ikon', 'aria-hidden': 'true' }, opg.ikon || ''), ' ' + opg.tekst);
    r.dom.visning.textContent = '';
    r.dom.visning.append(tegnVisning(opg));
    r.dom.hjaelp.textContent = '';
    r.dom.hjaelp.parentNode.classList.remove('med-hjaelp');
    saetUdtryk(r.dom.ven, grundUdtryk(opg));
    r.dom.ven.classList.remove('paa-broen'); // Skovbroens slutbillede: vennen var på broen
    r.dom.svar.classList.remove('venter');
    r.dom.svar.textContent = '';
    r.dom.svar.classList.toggle('tast', !opg.valg && !opg.byg && !opg.interaktiv);
    r.dom.krop.classList.toggle('tegne-opgave', !!opg.interaktiv); // svarpanelet er smalt — tegnefeltet får pladsen
    r.dom.svar.classList.toggle('byg', !!opg.byg);
    // «Hvor er der flest?»: grupperne i svarkortene ER opgaven — de får pladsen, vægten i midten bliver lille
    r.dom.krop.classList.toggle('gruppe-opgave', opg.valgArt === 'gruppe');
    r.dom.krop.classList.toggle('stil-opgave', opg.valgArt === 'stil'); // uret med målene ER svaret — det får pladsen
    r.dom.krop.classList.toggle('scene-opgave', opg.valgArt === 'scene'); // svarkort med små scener
    // Variation («Hvem passer ikke ind?»): de fire kort ER opgaven — øret i opgavefeltet siger spørgsmålet igen
    r.dom.krop.classList.toggle('kort-opgave', opg.valgArt === 'scene' && opg.vis.art === 'lyt');
    r.dom.krop.classList.remove('kort-store', 'kort-halv'); // tilpasScener vælger kortenes opstilling igen
    // Uret er opgaven: på en telefon på langs står hjælpen ved siden af uret, så uret ikke skrumper
    r.dom.krop.classList.toggle('ur-opgave', !!opg.vis && opg.vis.art === 'ur');
    r.dom.krop.classList.toggle('dansk-opgave', opg.fag === 'dansk');
    r.dom.krop.classList.toggle('engelsk-opgave', opg.fag === 'engelsk');
    r.dom.krop.classList.toggle('natur-opgave', opg.fag === 'natur');
    r.dom.krop.classList.toggle('sig-opgave', opg.valgArt === 'sig'); // vennen står i opgaven — ikke også i hjørnet
    r.dom.svar.append(opg.valg ? valgKnapper(opg) : opg.byg ? (opg.byg.trinvis ? trinvisPanel(opg) : bygPanel(opg)) : opg.interaktiv ? interaktivPanel(opg) : taltastatur(opg));
    fjernKopier();
    // Slutbilledets lag (lysblomsten, rimparret) hører til den forrige opgave — det ligger uden for visningen (review, fund 1)
    r.dom.visning.parentNode.querySelectorAll('.slut-lag').forEach((l) => l.remove());
    if (placerMaal(opg)) placerFelt(opg);
    S.gentagTale = opg.tale;
    // Piper: næste opgaves sætninger og svaret på denne hentes og afkodes nu, så talen starter uden ventetid
    const naeste = r.opgaver[r.i + 1];
    if (naeste) Piper.forhent(naeste.tale);
    if (opg.fag === 'natur') Piper.forhent(opg.ros + ' ' + opg.fakta); // natur: rosen og dyrets fakta efter det rigtige svar
    else if (opg.svar != null && typeof opg.svar !== 'object') Piper.forhent('Ja, det er ' + opg.svar + '!');
    // Dansk: teksten, så de indtalte lyde (eller reserverne) — 🔊 gentager det hele
    S.gentagFn = r.trinvis ? r.trinvis.gentag : opg.lyd ? () => sigOpgave(opg) : null;
    // Engelsk: 🔊 (og 👂) siger kun det engelske ord igen. Ordet til denne og næste opgave hentes nu.
    if (opg.fag === 'engelsk') {
      S.gentagFn = () => sigEngelsk(opg);
      Piper.forhentEn(opg.ordEn);
      if (naeste && naeste.ordEn) Piper.forhentEn(naeste.ordEn);
    }
    if (opg.valgArt === 'skjult') {
      // Huskekort: 🔊 vender kortene op, læser igen og vender dem igen (til hjælpen har vendt dem op for godt)
      S.gentagFn = () => { if (r.vendtOp) Tale.sig(opg.tale); else visSkjulteKort(opg); };
      visSkjulteKort(opg, forTale);
    } else if (opg.enAdGangen) enAdGangen(opg, forTale); // C · Rimhaven
    else if (r.sand) (opg.lyd ? sigOpgave(opg, forTale) : Tale.sigVent((forTale ? forTale + ' ' : '') + opg.tale)).then(() => { if (S.runde === r && r.sand) r.sand.efterTale(); }); // forbilledet efter talen
    else if (opg.valgArt === 'sig') sigOgAabn(opg, forTale);
    else sigOpgave(opg, forTale);
    huskMission();
    gem();
  }

  // ---------- Visninger (skolens repræsentationer: fingre, terning, klodser, tallinje — ingen tierramme) ----------
  function tegnVisning(opg) {
    if (opg.fag === 'dansk') return tegnDanskVisning(opg);
    if (opg.fag === 'engelsk') return engelskVisning(opg);
    if (opg.fag === 'natur') return naturVisning(opg);
    const v = opg.vis;
    switch (v.art) {
      case 'ting': return taelTing(v.antal, O.TING[v.ting].e);
      case 'terning': return terning(v.antal);
      case 'terninger': return h('div', { class: 'terninger' }, terning(v.a, 'a'), h('span', { class: 'plus-tegn', 'aria-hidden': 'true' }, '+'), terning(v.b, 'b'));
      case 'klodser': return klodser(v.a, v.b);
      case 'streger': return streger(v.antal);
      case 'soembraet': return soembraet(opg);
      case 'lineal': case 'linealTegn': return linealVisning(opg);
      case 'maalKlodser': return maalKlodserVisning(opg);
      case 'fingre': return haender(v.a, v.b, 10);
      case 'haand': return haender(v.a, 0, 5);
      case 'kugleramme': return kugleramme(v.a, v.hel, true);
      case 'par': return parKlodser(v.antal);
      case 'flest': {
        // Barnet kan ikke læse «flest»/«færrest»: en bunke af tingen (flest) eller én enkelt (færrest) under vægten
        const e = O.TING[v.ting].e;
        const faa = v.spoerg === 'faerrest';
        return h('div', { class: 'flest-billede', 'aria-hidden': 'true' },
          h('span', { class: 'vaegt' }, '⚖️'),
          h('span', { class: 'flest-bunke' + (faa ? ' faa' : '') }, faa ? h('i', null, e) : [h('i', null, e), h('i', null, e), h('i', null, e)]));
      }
      case 'forskel': return taarne(v.a, v.b);
      case 'lyt': return h('button', {
        class: 'lyt-knap', type: 'button', 'aria-label': 'Hør igen',
        onclick: () => { Lyd.init(); Tale.sig(opg.tale); },
      }, h('span', { 'aria-hidden': 'true' }, '👂'));
      case 'talstreg': return talstreg(v);
      case 'plus': {
        const st = Math.max(v.a, v.b) <= 3 ? 'stor' : Math.max(v.a, v.b) <= 5 ? 'mellem' : 'lille';
        // Få ting må gerne være store: CSS deler bredden med antallet af kolonner (rækker af 5) og højden med rækkerne.
        // Mange ting (over 5 kolonner) stilles under hinanden i høje felter (se app.css) — så bruges begge sæt mål.
        const ra = Math.ceil(v.a / 5), rb = Math.ceil(v.b / 5);
        const mange = Math.min(v.a, 5) + Math.min(v.b, 5) > 5;
        return h('div', {
          class: 'plus-ting' + (mange ? ' mange' : ''),
          style: '--kol:' + (Math.min(v.a, 5) + Math.min(v.b, 5)) + ';--raek:' + Math.max(ra, rb) +
            ';--kol2:' + Math.max(Math.min(v.a, 5), Math.min(v.b, 5)) + ';--raek2:' + (ra + rb),
        },
          tingGruppe(v.a, O.TING[v.ting].e, 'a', st),
          h('span', { class: 'plus-tegn', 'aria-hidden': 'true' }, '+'),
          tingGruppe(v.b, O.TING[v.ting].e, 'b', st));
      }
      case 'regnestykke': return regnestykke([v.a, v.op || '+', v.b, '=', '?']);
      case 'mangler': return regnestykke([v.a, '+', '?', '=', v.sum]);
      case 'stoerst': return h('div', { class: 'krokodille', 'aria-hidden': 'true' }, v.spoerg === 'mindst' ? '🐭' : '🐊');
      case 'minus':
        if (v.stil === 'klodser') {
          const kl = klodser(v.a, 0);
          [...kl.querySelectorAll('.klods')].slice(v.a - v.b).forEach((k) => { k.classList.add('vaek'); k.classList.remove('taelbar'); });
          return kl;
        } else {
          const gr = tingGruppe(v.a, O.TING[v.ting].e);
          [...gr.querySelectorAll('.ting')].slice(v.a - v.b).forEach((t) => { t.classList.add('vaek'); t.classList.remove('taelbar'); });
          return gr;
        }
      case 'raekke': return raekke(v);
      case 'staenger': return staenger(v.tiere, v.enere);
      case 'form': return h('div', { class: 'form-stor' }, formSvg(v.form, v.farve, v.drej, true));
      case 'formScene': return h('div', { class: 'form-scene' }, v.former.map((f) =>
        h('span', { class: 'scene-form' + (f.form === v.spoerg ? ' taelbar' : '') }, formSvg(f.form, f.farve, f.drej, false))));
      case 'ur': return h('div', { class: 'ur-ramme' }, urSvg(v.klokke));
      case 'scene': return tegnScene(v.dele, { lag: v.lag, tegninger: erMinispil(opg) });
      case 'rute': return rutebraet(opg);
      case 'kurv': return froePost(opg);
      case 'moenter': return moentRaekke(v.moenter);
      case 'koeb': return h('div', { class: 'koeb' },
        h('div', { class: 'koeb-vare' }, h('span', { class: 'moent-plads' }, moentSvg(v.har)), h('span', { class: 'koeb-pris' }, v.har + ' kr')),
        h('span', { class: 'koeb-pil', 'aria-hidden': 'true' }, '→'),
        h('div', { class: 'koeb-vare' }, h('span', { class: 'koeb-emoji', 'aria-hidden': 'true' }, v.vare), h('span', { class: 'koeb-pris' }, v.pris + ' kr')));
      case 'moenster': {
        const celler = [];
        for (let i = 0; i < v.vist; i++) celler.push(h('span', { class: 'brik-celle taelbar', 'data-brik': v.enhed[i % v.enhed.length] }, v.enhed[i % v.enhed.length]));
        celler.push(h('span', { class: 'brik-celle hul' }, '?'));
        // Grupper pr. gentagelse, så mønstret kun brydes mellem to hele gentagelser (smalle skærme)
        const grupper = [];
        for (let i = 0; i < celler.length; i += v.enhed.length) grupper.push(h('span', { class: 'moenster-enhed' }, celler.slice(i, i + v.enhed.length)));
        return h('div', { class: 'moenster' }, grupper);
      }
      default: return h('div');
    }
  }

  // Ting i rækker af 5 — og blokke af 10, når der er flere end 10
// ---------- Ekstra: ur og mønter (egen grafik som SVG) ----------
  // Analogt ur: lille viser = timer, stor viser = minutter. Tallene 1–12 står på skiven.
  function urSvg(klokke, lille) {
    const [t, m] = String(klokke).split(':').map(Number);
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'ur-svg' + (lille ? ' lille' : ''));
    svg.setAttribute('aria-hidden', 'true');
    const el = (tag, a) => { const n = document.createElementNS(ns, tag); for (const k in a) n.setAttribute(k, a[k]); svg.append(n); return n; };
    el('circle', { cx: 50, cy: 50, r: 46, class: 'ur-skive' });
    // Det lille ur (i svarknapperne) viser kun 12, 3, 6 og 9 — store nok til at læse — og en streg for hver time
    for (let k = 1; k <= 12; k++) {
      const v = (k / 12) * 2 * Math.PI;
      if (lille) {
        el('line', { x1: (50 + 41 * Math.sin(v)).toFixed(1), y1: (50 - 41 * Math.cos(v)).toFixed(1), x2: (50 + 44 * Math.sin(v)).toFixed(1), y2: (50 - 44 * Math.cos(v)).toFixed(1), class: 'ur-streg' });
        if (k % 3) continue;
      }
      const rr = lille ? 31 : 35;
      const tx = el('text', { x: (50 + rr * Math.sin(v)).toFixed(1), y: (50 - rr * Math.cos(v) + (lille ? 8 : 5)).toFixed(1), class: 'ur-tal', 'data-tal': k });
      tx.textContent = String(k);
    }
    // Viserne stopper før tallene, så tallet, den peger på, kan ses (minutviseren 3,5 enheder under «12», også når den lyser)
    el('line', { x1: 50, y1: 50, x2: 50, y2: lille ? 34 : 31, class: 'ur-time', transform: 'rotate(' + (((t % 12) + m / 60) * 30) + ' 50 50)' });
    el('line', { x1: 50, y1: 50, x2: 50, y2: lille ? 29 : 27, class: 'ur-minut', transform: 'rotate(' + (m * 6) + ' 50 50)' });
    el('circle', { cx: 50, cy: 50, r: 3.5, class: 'ur-midte' });
    return svg;
  }

  // Stil viserne: et stort ur, hvor målene for den store viser (12, 3, 6, 9) er rigtige knapper oven på tallene.
  // Valgene er tider ('7:45'); minuttallet bestemmer målet. Urets stilling gemmes som minutter siden 12
  // (data-min), så den lille viser følger mekanisk med: 7:00 → 7:45 er tre fjerdedele af vejen fra 7 mod 8.
  const MAAL_TAL = { 0: 12, 15: 3, 30: 6, 45: 9 };
  function stilMin(klokke, start) {
    const [t, m] = String(klokke).split(':').map(Number);
    const fra = (Number(String(start).split(':')[0]) % 12) * 60;
    let x = (t % 12) * 60 + m;
    while (x < fra) x += 720; // «kvart i et»: 12:45 → 1:00 fortsætter fremad
    return x;
  }
  // C · Urværkstedet (vis.viser 'lille'): målene står ved timetallene, og kun den lille viser drejer — den store bliver på 12
  function stilUr(opg) {
    const ur = urSvg(opg.vis.start);
    // Den lille (tykke) viser tegnes øverst: ved klokken 12 lå den under den store og lignede én viser (ui-review 11-10).
    // Nu ses den korte, tykke viser med den lange, tynde stikkende ud over den — uden at uret viser en anden tid
    ur.insertBefore(ur.querySelector('.ur-time'), ur.querySelector('.ur-midte'));
    const lille = opg.vis.viser === 'lille';
    return h('div', { class: 'stil-ur' + (lille ? ' viser-lille' : ''), 'data-start': opg.vis.start, 'data-min': stilMin(opg.vis.start, opg.vis.start), 'data-viser': lille ? 'lille' : null },
      ur,
      opg.valg.map((x) => {
        const tal = lille ? (Number(x.split(':')[0]) % 12 || 12) : MAAL_TAL[Number(x.split(':')[1])];
        const under = ur.querySelector('.ur-tal[data-tal="' + tal + '"]');
        if (under) under.remove(); // knappen viser selv tallet — ellers skinner det igennem, når målet er dæmpet
        const v = (tal / 12) * 2 * Math.PI;
        return h('button', {
          class: 'valg-knap stil-maal', type: 'button', 'data-v': x, 'aria-label': (lille ? 'Den lille viser på ' : 'Den store viser på ') + tal,
          // Målet står lidt inden for tallenes ring (r 32, tallene står ved 35): så rører det hverken urets kant eller
          // nabotallene (ui-review 11-10: ringen om 11 dækkede 10 og 12)
          style: '--x:' + (50 + 32 * Math.sin(v)).toFixed(1) + ';--y:' + (50 - 32 * Math.cos(v)).toFixed(1),
          onclick: (e) => { Lyd.init(); stilViser(opg, x, e.currentTarget); },
        }, String(tal));
      }));
  }
  // Drej viserne til en tid. Uden bevægelse (prefers-reduced-motion): straks den nye stilling.
  function drejUr(felt, klokke) {
    const ur = felt.querySelector('.ur-svg');
    const fra = Number(felt.getAttribute('data-min'));
    const til = stilMin(klokke, felt.getAttribute('data-start'));
    felt.setAttribute('data-min', til);
    const lille = felt.getAttribute('data-viser') === 'lille'; // kun den lille viser drejer (hele timer)
    const saet = (x) => {
      ur.querySelector('.ur-time').setAttribute('transform', 'rotate(' + (x / 2) + ' 50 50)');
      if (!lille) ur.querySelector('.ur-minut').setAttribute('transform', 'rotate(' + (x * 6) + ' 50 50)');
    };
    const rolig = udenBevaegelse();
    // et kvarter ≈ 0,8 s, en hel omgang ≈ 1,6 s — den lille viser alene højst 1,5 s
    const varighed = rolig ? 0 : (lille ? Math.min(1500, 500 + Math.abs(til - fra) * 4) : 500 + Math.abs(til - fra) * 18) * TEMPO;
    if (!varighed || fra === til) { saet(til); return Promise.resolve(); }
    return new Promise((ok) => {
      const t0 = performance.now();
      let faerdig = false;
      const slut = () => { if (!faerdig) { faerdig = true; saet(til); ok(); } };
      const trin = (nu) => {
        if (faerdig) return;
        const p = Math.min(1, (nu - t0) / varighed);
        saet(fra + (til - fra) * (p < 0.5 ? 2 * p * p : 1 - Math.pow(2 - 2 * p, 2) / 2));
        if (p < 1) requestAnimationFrame(trin); else slut();
      };
      requestAnimationFrame(trin);
      setTimeout(slut, varighed + 400); // en skjult fane tegner ingen billeder — svaret må ikke hænge
    });
  }
  // Et tryk på et mål: den store viser drejer derhen (den lille følger med), så vurderes svaret som altid
  async function stilViser(opg, x, knap) {
    const r = S.runde;
    if (!r || r.laast) return;
    const felt = r.dom.svar.querySelector('.stil-ur');
    if (!felt) { svar(x, knap); return; }
    const token = S.token, i = r.i;
    r.laast = true;
    clearTimeout(r.mindTimer);
    Tale.stop();
    felt.querySelectorAll('.lyser').forEach((el) => el.classList.remove('lyser'));
    await drejUr(felt, x);
    if (token !== S.token || S.runde !== r || r.i !== i) return;
    r.laast = false;
    svar(x, knap);
  }

  // Mønter: 1, 2 og 5 kr er sølv med hul, 10 og 20 kr er guld (forenklet, egen tegning)
  function moentSvg(kr) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'moent moent-' + kr);
    svg.setAttribute('data-kr', kr);
    const r = { 1: 36, 2: 41, 5: 46, 10: 40, 20: 46 }[kr] || 40;
    const el = (tag, a) => { const n = document.createElementNS(ns, tag); for (const k in a) n.setAttribute(k, a[k]); svg.append(n); return n; };
    el('circle', { cx: 50, cy: 50, r: r, class: kr >= 10 ? 'moent-guld' : 'moent-soelv' });
    el('circle', { cx: 50, cy: 50, r: r - 5, class: 'moent-kant' });
    if (kr < 10) el('circle', { cx: 50, cy: 50, r: 8, class: 'moent-hul' });
    const tx = el('text', { x: 50, y: kr < 10 ? 38 : 60, class: 'moent-tal' + (kr < 10 ? ' over-hul' : '') }); // over hullet på sølvmønterne
    tx.textContent = String(kr);
    return svg;
  }

  function moentRaekke(liste) {
    return h('div', { class: 'moenter' }, liste.map((kr) => h('span', { class: 'moent-plads taelbar', 'data-kr': kr }, moentSvg(kr))));
  }

  function tingGruppe(antal, emoji, gruppe, stoerrelse) {
    stoerrelse = stoerrelse || (antal <= 5 ? 'stor' : antal <= 10 ? 'mellem' : 'lille');
    const blokke = [];
    for (let start = 0; start < antal; start += 10) {
      const blok = h('div', { class: 'ting-blok' });
      for (let r = start; r < Math.min(antal, start + 10); r += 5) {
        const raekke = h('div', { class: 'ting-raekke' });
        for (let k = r; k < Math.min(antal, r + 5, start + 10); k++) {
          // emoji kan være en funktion, der laver en ny tegning til hver ting (Natur: zebraerne ved vandhullet)
          raekke.append(h('span', { class: 'ting taelbar' + (gruppe ? ' gruppe-' + gruppe : '') }, typeof emoji === 'function' ? emoji() : emoji));
        }
        blok.append(raekke);
      }
      blokke.push(blok);
    }
    return h('div', { class: 'ting-gruppe ' + stoerrelse + (gruppe ? ' gruppe-' + gruppe : '') }, blokke);
  }

  // «Tæl» (antal): tingGruppe med plads over hver ting til tællehjælpens tal-mærke. Størrelsen regnes i app.css
  // (.tael-ting) af søjlerne (--kol: den bredeste række) og rækkerne (--raek: alle rækkerne under hinanden)
  function taelTing(antal, emoji) {
    const g = tingGruppe(antal, emoji);
    let raek = 0;
    for (let s = 0; s < antal; s += 10) raek += Math.ceil(Math.min(10, antal - s) / 5);
    g.classList.add('tael-ting');
    g.style.setProperty('--kol', Math.min(antal, 5));
    g.style.setProperty('--raek', raek);
    return g;
  }

  function terning(antal, gruppe) {
    const pladser = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] }[antal] || [];
    const t = h('div', { class: 'terning' + (gruppe ? ' lille-terning' : '') });
    for (let p = 1; p <= 9; p++) t.append(h('span', { class: 'terning-felt' }));
    pladser.forEach((p) => t.children[p - 1].append(h('i', { class: 'pip taelbar' + (gruppe ? ' gruppe-' + gruppe : '') })));
    return t;
  }

  // Klikklodser: a røde/temafarvede + b blå. Over 10: en hel 10-stang og løse klodser.
  // Én farve skifter nuance ved hver 5. klods, så man kan se fem uden at tælle.
  function klodser(a, b) {
    b = b || 0;
    const ud = h('div', { class: 'klodser' });
    const lavKlods = (gruppe, nr) => h('i', {
      class: 'klods taelbar gruppe-' + gruppe + (b ? (gruppe === 'a' ? ' rod' : ' blaa') : (Math.floor(nr / 5) % 2 ? ' tema-lys' : ' tema')),
    });
    const stang = () => h('span', { class: 'stang-raekke' });
    if (a + b <= 10) {
      const s = stang();
      for (let k = 0; k < a; k++) s.append(lavKlods('a', k));
      for (let k = 0; k < b; k++) s.append(lavKlods('b', a + k));
      ud.append(s);
    } else if (b === 0 || a === 10) {
      // 10-stang + løse klodser (tælle 11–20, eller 10 + b)
      const ti = stang(); ti.classList.add('ti-stang');
      for (let k = 0; k < 10; k++) ti.append(lavKlods('a', k));
      const rest = stang();
      const n = b === 0 ? a - 10 : b;
      for (let k = 0; k < n; k++) rest.append(lavKlods(b === 0 ? 'a' : 'b', 10 + k));
      ud.append(ti, rest);
    } else {
      // 8 og 5: to stænger hver for sig — hjælpen fylder den første op til 10
      const s1 = stang(); for (let k = 0; k < a; k++) s1.append(lavKlods('a', k));
      const s2 = stang(); for (let k = 0; k < b; k++) s2.append(lavKlods('b', a + k));
      ud.append(s1, s2);
    }
    // Den længste række bestemmer størrelsen: få klodser må gerne være store (CSS: --n)
    ud.style.setProperty('--n', a + b <= 10 ? Math.max(a + b, 1) : 10);
    return ud;
  }

  // Tællestreger i bundter af 5: fire lodrette og den femte på tværs
  function streger(antal) {
    const ud = h('div', { class: 'streger' });
    for (let start = 0; start < antal; start += 5) {
      const bundt = h('span', { class: 'bundt' });
      const n = Math.min(5, antal - start);
      for (let k = 0; k < n; k++) bundt.append(h('i', { class: 'streg taelbar' + (k === 4 ? ' tvaers' : '') }));
      if (n === 5) bundt.classList.add('fuldt');
      ud.append(bundt);
    }
    return ud;
  }

  // Hænder med fingre: a fingre oppe (gruppe a) + b fingre oppe (gruppe b), resten nede.
  // To hænder tælles fra venstre mod højre: lillefinger → tommelfinger, tommelfinger → lillefinger.
  function haender(a, b, maks) {
    const ud = h('div', { class: 'haender' });
    const antalHaender = maks > 5 ? 2 : 1;
    let k = 0;
    for (let hd = 0; hd < antalHaender; hd++) {
      const venstre = antalHaender === 2 && hd === 0;
      const haand = h('span', { class: 'haand' + (venstre ? ' venstre' : '') });
      const fingre = [];
      for (let f = 0; f < 5; f++) {
        const oppe = k < a + b;
        const gruppe = k < a ? 'a' : 'b';
        fingre.push(h('i', { class: 'finger f' + (venstre ? 4 - f : f) + (oppe ? ' oppe taelbar gruppe-' + gruppe : ' nede gruppe-b') }));
        k++;
      }
      haand.append(h('span', { class: 'haandflade' }));
      fingre.forEach((fi) => haand.append(fi));
      ud.append(haand);
    }
    return ud;
  }

  // Kugleramme: a kugler til venstre, resten til højre — evt. gemt under et blad
  function kugleramme(a, hel, skjul) {
    const ramme = h('div', { class: 'kugleramme' + (skjul ? ' skjul' : '') });
    const stang = h('div', { class: 'kugle-stang' });
    const venstre = h('span', { class: 'kugle-side' });
    const hoejre = h('span', { class: 'kugle-side hoejre' });
    for (let k = 0; k < a; k++) venstre.append(h('i', { class: 'kugle rod taelbar gruppe-a' }));
    for (let k = a; k < hel; k++) hoejre.append(h('i', { class: 'kugle blaa taelbar gruppe-b' }));
    hoejre.append(h('span', { class: 'kugle-blad', 'aria-hidden': 'true' }, '🍃'));
    stang.append(venstre, hoejre);
    ramme.append(stang);
    return ramme;
  }

  // Klodser to og to (lige/ulige): hvert par står i en søjle
  function parKlodser(antal) {
    const ud = h('div', { class: 'par-klodser' });
    for (let k = 0; k < antal; k += 2) {
      const soejle = h('span', { class: 'par-soejle' + (k + 1 >= antal ? ' alene' : '') });
      soejle.append(h('i', { class: 'klods tema taelbar' }));
      if (k + 1 < antal) soejle.append(h('i', { class: 'klods tema-lys taelbar' }));
      ud.append(soejle);
    }
    return ud;
  }

  // To tårne af klodser (forskel og sammenligning)
  function taarne(a, b) {
    const ud = h('div', { class: 'taarne' });
    ud.style.setProperty('--n', Math.max(a, b, 1)); // lave tårne må gerne have store klodser
    [a, b].forEach((n, i) => {
      const taarn = h('span', { class: 'taarn taarn-' + (i ? 'b' : 'a') });
      for (let k = 0; k < n; k++) taarn.append(h('i', { class: 'klods ' + (i ? 'blaa' : 'rod') }));
      ud.append(h('span', { class: 'taarn-kolonne' }, taarn, h('b', { class: 'taarn-tal' }, String(n))));
    });
    return ud;
  }

  function talstreg(v) {
    const ud = h('div', { class: 'talstreg' });
    for (let n = v.fra; n <= v.til; n++) {
      const skjult = n === v.skjult;
      ud.append(h('span', { class: 'tal-celle taelbar' + (skjult ? ' hul' : '') + (n >= 100 ? ' tre-cifre' : ''), 'data-tal': n }, skjult ? '?' : String(n)));
    }
    return h('div', { class: 'talstreg-ramme' }, ud, h('div', { class: 'talstreg-linje' }));
  }

  function regnestykke(dele) {
    return h('div', { class: 'regnestykke' }, dele.map((d) => h('span', {
      class: d === '?' ? 'ukendt' : (d === '+' || d === '=' || d === '−') ? 'tegn' : 'tal',
    }, String(d))));
  }

  // Talrække: 10, 20, 30, ? — som felter på en sti
  function raekke(v) {
    const ud = h('div', { class: 'talstreg raekke' });
    for (let i = 0; i < v.laengde; i++) {
      const tal = v.start + i * v.trin;
      const skjult = i === v.skjult;
      ud.append(h('span', { class: 'tal-celle taelbar' + (skjult ? ' hul' : '') + (tal >= 100 ? ' tre-cifre' : ''), 'data-tal': tal }, skjult ? '?' : String(tal)));
    }
    return h('div', { class: 'talstreg-ramme' }, ud, h('div', { class: 'talstreg-linje' }));
  }

  // 10-stænger og løse klodser
  function staenger(tiere, enere) {
    const ud = h('div', { class: 'staenger' });
    for (let t = 0; t < tiere; t++) {
      const stang = h('span', { class: 'stang taelbar' });
      for (let k = 0; k < 10; k++) stang.append(h('i', { class: 'klods' }));
      ud.append(stang);
    }
    if (enere) {
      const en = h('span', { class: 'enere' });
      for (let k = 0; k < enere; k++) en.append(h('i', { class: 'klods ener taelbar' }));
      ud.append(en);
    }
    return ud;
  }

  // Tallinje med hop-buer (hjælpens sidste trin)
  function tallinjeEl(fra, til) {
    const linje = h('div', { class: 'tallinje' });
    const skala = h('div', { class: 'tl-skala' });
    for (let n = fra; n <= til; n++) skala.append(h('span', { class: 'tl-tal', 'data-tal': n }, h('i', { class: 'tl-streg' }), h('b', null, String(n))));
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'tl-buer');
    svg.setAttribute('aria-hidden', 'true');
    linje.append(svg, skala, h('span', { class: 'tl-figur', 'aria-hidden': 'true' }, venTegning(minFigur().id)));
    return linje;
  }

  // =====================================================================
  //  D (forslaget 09-10): SCENER. De nye opgavetyper beskriver små dele (docs/SCENE.md), som tegnes ens overalt:
  //  i opgavefeltet og på svarkortene. Alle mål er gange --u (px); tilpasScener() sætter --u, så scenen fylder
  //  sin plads uden at stikke ud. data-del="id" er det, hjælpen «lys» peger på.
  // =====================================================================
  const RAMMER = ['boks', 'kurv', 'kasse', 'maatte', 'ingen'];

  // Ting: rækker af 5 (tingGruppe) — eller én række (linje), så to rækker kan sammenlignes ting for ting.
  // «under» giver nogle af tingene et data-del (og evt. et andet taelbar) uden synlig forskel.
  function sceneTing(d) {
    let el, ting;
    if (d.linje) {
      ting = Array.from({ length: d.n }, () => h('span', { class: 'ting taelbar' }, d.e));
      el = h('div', { class: 'ting-gruppe i-scene linje' }, h('div', { class: 'ting-blok' }, h('div', { class: 'ting-raekke' }, ting)));
    } else {
      el = tingGruppe(d.n, d.e, null, 'i-scene');
      ting = [...el.querySelectorAll('.ting')];
    }
    if (d.spredt) el.classList.add('spredt');
    if (d.taelbar === false) ting.forEach((t) => t.classList.remove('taelbar'));
    // C · ting.billede: GRAFIK-C's tegning i stedet for emojien (Fortællebroen) — emojien, hvis tegningen mangler
    if (d.billede && MINI[d.billede]) ting.forEach((t) => { t.textContent = ''; t.classList.add('med-tegning'); t.append(miniTegning(d.billede, 'ting-tegning')); });
    // Et talord (ti, to …) som terningbillede i stedet for tastetegnet (rimPar, findPar, ordStrimmel)
    else if (tastetegnTal(d.e)) ting.forEach((t) => { t.textContent = ''; t.classList.add('med-tegning'); t.append(talBillede(tastetegnTal(d.e))); });
    // D2: maerk = synlig ring (dem, der flytter) · vaek = taget væk (stiplet + kryds, som i minus; tælles ikke)
    (d.under || []).forEach((u) => ting.slice(u.fra, u.til).forEach((t) => {
      t.setAttribute('data-del', u.id);
      if (u.maerk) t.classList.add('maerk');
      if (u.vaek) { t.classList.add('vaek'); if (u.taelbar !== true) t.classList.remove('taelbar'); }
      if (u.taelbar === true) t.classList.add('taelbar');
      else if (u.taelbar === false) t.classList.remove('taelbar');
    }));
    // kommer: gruppen kommer til — en lille pil ind mod tingene
    if (d.kommer) el.prepend(h('span', { class: 'sd-kommer', 'aria-hidden': 'true' }, pilSvg()));
    return el;
  }
  // Den fælles pil (som frisens): peger mod højre
  function pilSvg() {
    const svg = svgEl('svg', { viewBox: '0 0 40 40', 'aria-hidden': 'true' });
    svgEl('path', { d: 'M3 14 H21 V5 L38 20 L21 35 V26 H3 Z', class: 'sd-pil-form' }, svg);
    return svg;
  }

  // Et hus med n værelser i én række. De fyldte værelser har en emoji og et data-del; fra taelbarFra tælles de
  function scenePladser(d) {
    const celler = [];
    for (let i = 0; i < d.n; i++) {
      const f = (d.fyldt || []).find((x) => i >= x.fra && i < x.til);
      const taelbar = typeof d.taelbarFra === 'number' && i >= d.taelbarFra;
      celler.push(h('span', { class: 'plads' + (f ? ' fyldt' : '') + (taelbar ? ' taelbar' : ''), 'data-del': f ? f.id : null }, f ? f.e : null));
    }
    return h('div', { class: 'sd-hus' }, h('span', { class: 'hus-tag', 'aria-hidden': 'true' }), h('div', { class: 'hus-rum' }, celler));
  }

  // Tierstænger og enere. Enerne står i søjler af højst 10 (over 9: to søjler). rammeOmTi: de første 10 enere
  // står i en stiplet ramme (data-del 'ti') — lige så høj som en tierstang
  function sceneStaenger(d, opts) {
    const ud = staenger(d.tiere, 0);
    const soejle = (n) => { const en = h('span', { class: 'enere' }); for (let k = 0; k < n; k++) en.append(h('i', { class: 'klods ener taelbar' })); return en; };
    let rest = d.enere || 0;
    // I opgaven altid (D2), så hjælpen kan lyse dem. På et svarkort kun med rammeOmTi — ellers tænder et «tiere»-trin
    // stængerne på alle kort (review #2, byt10)
    if (d.rammeOmTi || !(opts && opts.kort)) ud.querySelectorAll('.stang').forEach((s) => s.setAttribute('data-del', 'tiere'));
    if (d.rammeOmTi) {
      if (rest >= 10) { ud.append(h('span', { class: 'sd-ti', 'data-del': 'ti' }, soejle(10))); rest -= 10; }
      if (rest) { const s = soejle(rest); s.setAttribute('data-del', 'rest'); ud.append(s); }
    } else {
      while (rest > 0) { const n = Math.min(10, rest); ud.append(soejle(n)); rest -= n; }
    }
    return ud;
  }

  // Mønsterbrikker i en række. pil: her begynder mønstret. pakke k: brikkerne grupperes k ad gangen (data-del g0,
  // g1 …) uden synligt mellemrum — så gentagelsen ikke afsløres
  function sceneRaekke(d) {
    // '?' er den tomme celle (klassen hul, som tal-delen)
    const celler = d.celler.map((c) => (c === '?' ? h('span', { class: 'brik-celle hul' }, '?') : h('span', { class: 'brik-celle taelbar', 'data-brik': c }, c)));
    let indhold = celler;
    if (d.pakke) {
      indhold = [];
      for (let i = 0; i < celler.length; i += d.pakke) indhold.push(h('span', { class: 'sd-pakke', 'data-del': 'g' + (i / d.pakke) }, celler.slice(i, i + d.pakke)));
    }
    const pil = d.pil ? h('span', { class: 'sd-pil' }, pilSvg()) : null;
    // Brikker pr. række, når frisen står i to rækker: med pakker brydes der kun mellem hele pakker (9 i pakker af 3
    // → 6 + 3), så den anden række ikke begynder midt i en pakke
    const halv = d.pakke ? Math.ceil(Math.ceil(d.celler.length / d.pakke) / 2) * d.pakke : Math.ceil(d.celler.length / 2);
    return h('div', { class: 'sd-raekke' + (d.pil ? ' frise' : ''), style: '--halv:' + halv }, pil, indhold);
  }

  // Formbyen (D): brikker i et koordinatsystem, hvor kvadratet er 100 × 100 (som PUSLESPIL i opgaver.js).
  // Trekanten er retvinklet med den rette vinkel i hjørnet nv/no/sv/so; halvcirklen har den flade side op/ned/venstre/hoejre.
  function brikSti(b, x, y) {
    x = x || 0; y = y || 0;
    const B = b.b, H = b.h;
    const p = (q) => q[0] + ',' + q[1];
    if (b.form === 'trekant') {
      const hj = { nv: [[x, y], [x + B, y], [x, y + H]], no: [[x + B, y], [x, y], [x + B, y + H]], sv: [[x, y + H], [x, y], [x + B, y + H]], so: [[x + B, y + H], [x + B, y], [x, y + H]] }[b.hjoerne] || [[x, y + H], [x, y], [x + B, y + H]];
      return 'M' + hj.map(p).join(' L') + ' Z';
    }
    if (b.form === 'halvcirkel') {
      const bue = (fra, til, rx, ry) => 'M' + p(fra) + ' A' + rx + ',' + ry + ' 0 0 1 ' + p(til) + ' Z';
      if (b.flad === 'op') return bue([x + B, y], [x, y], B / 2, H);
      if (b.flad === 'venstre') return bue([x, y], [x, y + H], B, H / 2);
      if (b.flad === 'hoejre') return bue([x + B, y + H], [x + B, y], B, H / 2);
      return bue([x, y + H], [x + B, y + H], B / 2, H); // flad side nedad
    }
    if (b.form === 'cirkel') return 'M' + x + ',' + (y + H / 2) + ' A' + B / 2 + ',' + H / 2 + ' 0 1 1 ' + (x + B) + ',' + (y + H / 2) + ' A' + B / 2 + ',' + H / 2 + ' 0 1 1 ' + x + ',' + (y + H / 2) + ' Z';
    return 'M' + x + ',' + y + ' H' + (x + B) + ' V' + (y + H) + ' H' + x + ' Z'; // kvadrat og rektangel
  }
  // Puslespillet: en bakke med figuren skåret i to — den faste brik er farvet, hullet er en stiplet kontur
  function scenePuslespil(d) {
    const m = 14;
    const svg = svgEl('svg', { viewBox: (-m) + ' ' + (-m) + ' ' + (d.b + 2 * m) + ' ' + (d.h + 2 * m), 'aria-hidden': 'true' });
    svgEl('rect', { x: 2 - m, y: 2 - m, width: d.b + 2 * m - 4, height: d.h + 2 * m - 4, rx: 10, class: 'pusle-bakke' }, svg);
    svgEl('path', { d: brikSti(d.fast, d.fast.x, d.fast.y), class: 'brik-fyld' }, svg);
    // C · skygge: hullet er en mørk skygge (Skyggeatelieret trin 3) i stedet for den stiplede kontur
    svgEl('path', { d: brikSti(d.hul, d.hul.x, d.hul.y), class: 'pusle-hul' + (d.skygge ? ' skygge' : ''), 'data-del': 'hul' }, svg);
    return h('span', { class: 'sd-pusle', style: '--vb-b:' + (d.b + 2 * m) + ';--vb-h:' + (d.h + 2 * m) }, svg);
  }
  // Én brik (svarkort) i samme målestok som puslespillet
  function sceneBrik(d) {
    const m = 6;
    const svg = svgEl('svg', { viewBox: (-m) + ' ' + (-m) + ' ' + (d.b + 2 * m) + ' ' + (d.h + 2 * m), 'aria-hidden': 'true' });
    svgEl('path', { d: brikSti(d), class: 'brik-fyld' }, svg);
    return h('span', { class: 'sd-brik', style: '--vb-b:' + (d.b + 2 * m) + ';--vb-h:' + (d.h + 2 * m) }, svg);
  }

  // Små ord (D1): tingen er tydeligt INDE I beholderen (delvist skjult bag forkanten), OVEN PÅ den eller BAG den.
  // «På» tegnes med beholderen stående og lukket med et låg (kasse, kurv og skål), og tingen står på låget —
  // «i» med beholderen åben, så man ser ned i den. Så ligner de to aldrig hinanden (en kurv på hovedet lignede en skammel).
  // «Bag» (bagved): beholderen står lukket som i «på», og tingen står bag den, forskudt til højre, så den kigger frem
  // bag kanten fra siden og over låget — resten skjules af beholderens forside. (Midt bag beholderen lignede den «i».)
  // Tegningen er 128 bred (x −14 … 114, beholderen står midt i, x 50), så «bag»-tingen ikke klippes; alle tre ens.
  // Lagene: beholderens bagside → tingen → forsiden. Begge lag har data-del="beholder" (hjælpen lyser dem).
  // Scenen har data-rel (i/på/bag), så testene kan se, hvilken placering der er tegnet.
  function scenePlacering(d) {
    const rel = d.rel === 'i' || d.rel === 'bag' ? d.rel : 'på';
    const paa = rel !== 'i'; // lukket beholder med låg (både «på» og «bag»)
    const lag = (klasse) => svgEl('svg', { viewBox: '-14 0 128 110', class: klasse, 'data-del': 'beholder', 'aria-hidden': 'true' });
    const bag = lag('plac-bag'), foran = lag('plac-for');
    const laag = (x, b, rx) => svgEl('rect', { x: x, y: 53, width: b, height: 11, rx: rx, class: 'plac-laag' }, foran);
    // Kurvens fletning: vandrette streger, der stopper ved de skrå sider (kanten går fra x 10–90 ved y0 til 22–78 ved 104)
    const flet = (y0, ys) => ys.forEach((y) => {
      const ind = 12 * (y - y0) / (104 - y0) + 2.5;
      svgEl('line', { x1: 10 + ind, y1: y, x2: 90 - ind, y2: y, class: 'plac-flet' }, foran);
    });
    let top; // hvor tingen står (y i tegningen): bunden af tingen
    if (d.beholder === 'kurv') {
      if (paa) {
        svgEl('path', { d: 'M10 62 H90 L78 104 H22 Z', class: 'plac-krop' }, foran);
        flet(62, [76, 90]);
        laag(6, 88, 4);
        top = 54;
      } else {
        svgEl('path', { d: 'M18 58 C18 6 82 6 82 58', class: 'plac-hank' }, bag);
        svgEl('ellipse', { cx: 50, cy: 58, rx: 40, ry: 9, class: 'plac-inde' }, bag);
        svgEl('path', { d: 'M10 58 H90 L78 104 H22 Z', class: 'plac-krop' }, foran);
        flet(58, [72, 88]);
        top = 78;
      }
    } else if (d.beholder === 'skaal') {
      if (paa) {
        svgEl('path', { d: 'M6 62 A44 42 0 0 0 94 62 Z', class: 'plac-krop' }, foran);
        laag(3, 94, 5);
        top = 54;
      } else {
        svgEl('ellipse', { cx: 50, cy: 62, rx: 44, ry: 10, class: 'plac-inde' }, bag);
        svgEl('path', { d: 'M6 62 A44 42 0 0 0 94 62 Z', class: 'plac-krop' }, foran);
        top = 82;
      }
    } else {
      // Kassen: åben (tingen er inde i den) eller lukket med låg (tingen står ovenpå)
      if (paa) {
        svgEl('rect', { x: 10, y: 62, width: 80, height: 42, rx: 4, class: 'plac-krop' }, foran);
        laag(6, 88, 3);
        top = 54;
      } else {
        svgEl('path', { d: 'M10 62 L20 46 H80 L90 62 Z', class: 'plac-inde' }, bag);
        svgEl('rect', { x: 10, y: 62, width: 80, height: 42, rx: 4, class: 'plac-krop' }, foran);
        top = 80;
      }
    }
    // Bag: tingens midte står ved beholderens højre kant (x 84) og dens bund skjult bag forsiden (y 80), så toppen
    // og den højre halvdel ses — venstre halvdel er bag beholderen
    let midt = 50;
    if (rel === 'bag') { top = 80; midt = 84; }
    const ting = h('span', { class: 'plac-ting', 'aria-hidden': 'true', style: 'bottom:' + ((110 - top) / 110 * 100).toFixed(1) + '%;left:' + ((midt + 14) / 128 * 100).toFixed(1) + '%' }, d.ting);
    return h('span', { class: 'sd-placering beholder-' + (d.beholder || 'kasse') + ({ i: ' i', 'på': ' paa', bag: ' bag' })[rel], 'data-rel': rel }, bag, ting, foran);
  }

  // =====================================================================
  //  D2/D3 Regning: spejl, lineal, tårne, kø, mønstre, skilt, prikgitter og ur (docs/SCENE.md)
  // =====================================================================
  // Spejlet: motivet til venstre, en lodret stiplet spejllinje og et tomt felt til højre
  function sceneSpejl(d) {
    return h('div', { class: 'sd-spejl', 'data-del': 'spejl' },
      h('span', { class: 'sd-motiv-e', 'aria-hidden': 'true' }, d.e),
      h('span', { class: 'spejl-linje', 'aria-hidden': 'true' }),
      h('span', { class: 'spejl-felt' }, '?'));
  }
  // Motivet spejlet vandret, som det er eller vendt på hovedet (svarkort)
  const sceneMotiv = (d) => h('span', { class: 'sd-motiv vend-' + (['spejl', 'ingen', 'drej'].indexOf(d.vend) >= 0 ? d.vend : 'ingen') },
    h('span', { class: 'sd-motiv-e', 'aria-hidden': 'true' }, d.e));

  // Streg og lineal: 1 cm = --cm (5 --u). Stregen begynder 1,5 cm inde; linealens tal «start» står ud for den.
  // Skråt: linealen drejes 12° om sit nul. Alle tre kort har samme højde (plads til den skrå), så intet afslører svaret
  const sceneStreg = (d) => h('div', { class: 'sd-streg', style: '--cmn:' + d.cm }, h('span', { class: 'streg-linje' }));
  function sceneLinealPlacering(d) {
    const L = d.cm + 1, start = d.start === 1 ? 1 : 0;
    const lineal = h('div', { class: 'sd-lineal' + (d.skraa ? ' skraa' : ''), style: '--x0:' + (1.5 - start) + ';--L:' + L });
    for (let i = 0; i <= L; i++) {
      const maerke = [h('i', { class: 'lineal-cm-s', style: 'left:calc(var(--cm) * ' + (i + 0.4) + ')' }),
        h('b', { class: 'lineal-tal-s', style: 'left:calc(var(--cm) * ' + (i + 0.4) + ')' }, String(i))];
      if (i === 0) lineal.append(h('span', { class: 'lineal-nul', 'data-del': 'nul' }, maerke));
      else lineal.append(...maerke);
      if (i < L) lineal.append(h('i', { class: 'lineal-halv-s', style: 'left:calc(var(--cm) * ' + (i + 0.9) + ')' }));
    }
    const fald = (L + 0.8) * 5 * Math.sin(12 * Math.PI / 180); // så meget længere ned når den skrå lineal
    return h('div', { class: 'sd-linealplac', style: '--cmn:' + d.cm + ';--hoejde:' + (10.5 + fald).toFixed(1) },
      h('span', { class: 'streg-linje' }), lineal);
  }

  // Klodser (to farver) i scenens mål
  const sceneKlodser = (d) => klodser(d.a, d.b);

  // To tårne på fælles bundlinje. De øverste «vaek» i hvert tårn er taget væk; i det høje tårn er klodserne over
  // det lave tårns rest taelbar (dem uden makker)
  function sceneTaarne(d) {
    const hoej = Math.max(d.a, d.b), lav = Math.min(d.a, d.b), v = d.vaek || 0;
    const taarn = (n, farve, erHoej) => {
      const t = h('span', { class: 'sd-taarn' });
      for (let i = 0; i < n; i++) {
        const k = h('i', { class: 'klods ' + farve });
        if (i >= n - v) { k.classList.add('vaek'); k.setAttribute('data-del', 'vaek'); }
        else if (erHoej && i >= lav - v) k.classList.add('taelbar');
        t.append(k);
      }
      return t;
    };
    return h('div', { class: 'sd-taarne' }, h('div', { class: 'taarne-par' }, taarn(hoej, 'rod', true), taarn(lav, 'blaa', false)), h('span', { class: 'taarne-bund', 'aria-hidden': 'true' }));
  }

  // Køen: vogne på række med et flag i den ene ende. Vognene nummereres fra flaget (v1 står ved flaget)
  function sceneKoe(d) {
    const flag = h('span', { class: 'koe-flag', 'data-del': 'flag', 'aria-hidden': 'true' }, '🚩');
    const vogne = [];
    for (let k = 1; k <= d.n; k++) vogne.push(h('span', { class: 'koe-vogn' + (d.maerk === k ? ' maerk' : ''), 'data-del': 'v' + k, 'aria-hidden': 'true' }, '🚃'));
    const hoejre = d.flag === 'hoejre';
    return h('div', { class: 'sd-koe' }, hoejre ? vogne.reverse().concat([flag]) : [flag].concat(vogne));
  }

  // Mønster i en figur: striber eller prikker (ikke kun farve). Mønstret er et <pattern> med et unikt id
  let moensterNr = 0;
  function moensterFyld(svg, moenster) {
    const id = 'sd-moenster-' + (++moensterNr);
    const defs = svgEl('defs', {}, svg);
    const p = svgEl('pattern', Object.assign({ id: id, patternUnits: 'userSpaceOnUse', width: 16, height: 16 }, moenster === 'striber' ? { patternTransform: 'rotate(45)' } : {}), defs);
    if (moenster === 'striber') svgEl('rect', { x: 0, y: 0, width: 7, height: 16, class: 'moenster-tegn' }, p);
    else svgEl('circle', { cx: 8, cy: 8, r: 3.6, class: 'moenster-tegn' }, p);
    return 'url(#' + id + ')';
  }
  // C · Skyggeatelieret: figurerne og skyggen er GRAFIK-C's tegninger (samme form på kortet og i skyggen). Kortet får
  // sin egen farve (--form-N), skyggen er mørk (--kontur) og drejet drej grader om midten.
  const SKYGGE_TEGNING = { cirkel: 'shadowCircle', trekant: 'shadowTriangle', kvadrat: 'shadowSquare', rektangel: 'shadowRectangle' };
  function figurTegning(form, farve, skygge) {
    const svg = miniTegning(SKYGGE_TEGNING[form], 'mini-tegning');
    return svg ? h('span', { class: 'mini-form' + (skygge ? ' skygge-form' : ' form-farve-' + ((farve || 0) % 6)) }, svg) : null;
  }
  function sceneForm(d, opts) {
    if (d.skygge || (opts && opts.tegninger)) {
      const fig = figurTegning(d.form, d.farve, d.skygge);
      const el = h('span', { class: 'sd-figur' + (fig ? ' mini' : '') + (d.skygge ? ' skygge' : ''), style: d.drej ? '--drej:' + d.drej + 'deg' : null },
        fig || formSvg(d.form, d.farve, d.skygge ? d.drej : 0, false));
      if (!fig && d.skygge) el.classList.add('skygge-reserve');
      return el;
    }
    const svg = formSvg(d.form, d.farve, d.drej, false);
    if (d.moenster === 'striber' || d.moenster === 'prikker') {
      const figur = svg.querySelector('.form-figur');
      const lag = figur.cloneNode(false);
      lag.setAttribute('class', 'form-moenster');
      lag.setAttribute('fill', moensterFyld(svg, d.moenster));
      figur.after(lag);
    }
    return h('span', { class: 'sd-figur' }, svg);
  }

  // Skiltet med to regler: antal hjørner som billede (små vinkler; 0 = en rund ring) og en prøve af mønstret
  function sceneSkilt(d) {
    const svg = svgEl('svg', { viewBox: '0 0 200 100', 'aria-hidden': 'true' });
    svgEl('rect', { x: 3, y: 3, width: 194, height: 94, rx: 14, class: 'skilt-plade' }, svg);
    svgEl('line', { x1: 100, y1: 16, x2: 100, y2: 84, class: 'skilt-skille' }, svg);
    const hj = d.hjoerner || 0;
    if (!hj) svgEl('circle', { cx: 50, cy: 50, r: 24, class: 'skilt-vinkel' }, svg);
    else {
      // Hvert hjørne er en spids vinkel (^) med en prik i spidsen — som hjørneprikkerne i Formbyen
      const pladser = hj === 3 ? [[50, 22], [28, 56], [72, 56]] : [[30, 22], [70, 22], [30, 56], [70, 56]];
      pladser.forEach(([x, y]) => {
        svgEl('path', { d: 'M' + (x - 13) + ' ' + (y + 20) + ' L' + x + ' ' + y + ' L' + (x + 13) + ' ' + (y + 20), class: 'skilt-vinkel' }, svg);
        svgEl('circle', { cx: x, cy: y, r: 5, class: 'skilt-hjoerne' }, svg);
      });
    }
    const fyld = moensterFyld(svg, d.moenster);
    svgEl('rect', { x: 122, y: 22, width: 56, height: 56, rx: 14, class: 'skilt-proeve' }, svg);
    svgEl('rect', { x: 122, y: 22, width: 56, height: 56, rx: 14, fill: fyld }, svg);
    return h('span', { class: 'sd-skilt' }, svg);
  }

  // Prikgitter med en vej: prikkerne og vejstykkerne er spans (så hjælpen kan sætte tal-mærker på stykkerne).
  // punkter i gitterenheder; vejens stykker er taelbar
  function prikGitter(kol, raek, punkter, klasse) {
    const felt = h('div', { class: 'sd-gitter ' + klasse, style: '--kol:' + (kol - 1) + ';--raek:' + (raek - 1) });
    for (let y = 0; y < raek; y++) for (let x = 0; x < kol; x++) felt.append(h('i', { class: 'gitter-prik', style: '--x:' + x + ';--y:' + y }));
    for (let i = 1; i < punkter.length; i++) {
      const [a, b] = [punkter[i - 1], punkter[i]];
      const vandret = a[1] === b[1];
      felt.append(h('span', { class: 'vej-stykke taelbar ' + (vandret ? 'vandret' : 'lodret'), style: '--x:' + Math.min(a[0], b[0]) + ';--y:' + Math.min(a[1], b[1]) }));
    }
    return felt;
  }
  function sceneGitterRute(d) {
    const skridt = { hoejre: [1, 0], venstre: [-1, 0], op: [0, -1], ned: [0, 1] };
    const pkt = [[0, 0]];
    // En ukendt retning er en fejl i opgaven — den må ikke tegnes som et stykke på stedet (review #10)
    (d.opskrift || []).forEach(([ret, n]) => {
      const s = skridt[ret];
      if (!s) throw new Error('gitterRute: ukendt retning «' + ret + '»');
      for (let k = 0; k < n; k++) { const p = pkt[pkt.length - 1]; pkt.push([p[0] + s[0], p[1] + s[1]]); }
    });
    const minX = Math.min(...pkt.map((p) => p[0])), minY = Math.min(...pkt.map((p) => p[1]));
    const norm = pkt.map((p) => [p[0] - minX + 1, p[1] - minY + 1]); // én prik luft hele vejen rundt
    const kol = Math.max(...norm.map((p) => p[0])) + 2, raek = Math.max(...norm.map((p) => p[1])) + 2;
    const el = prikGitter(kol, raek, norm, 'g-rute');
    el.setAttribute('data-del', 'vej');
    el.append(h('i', { class: 'gitter-start', style: '--x:' + norm[0][0] + ';--y:' + norm[0][1] }));
    return el;
  }
  // En lige vej på en prikrække (svarkort). Altid mindst 8 prikker, så kortene har samme målestok
  function sceneGitterStreg(d) {
    const l = d.laengde || 1, kol = Math.max(8, l + 2);
    const pkt = Array.from({ length: l + 1 }, (_, i) => [1 + i, 0]);
    const el = prikGitter(kol, 1, pkt, 'g-lige');
    el.append(h('i', { class: 'gitter-start', style: '--x:1;--y:0' }));
    return el;
  }

  // =====================================================================
  //  D2/D3 Dansk: lydprikker og ordstrimlen (docs/SCENE.md)
  // =====================================================================
  // Lydprikker: én stor prik for hver lyd i ordet (svarkort — ingen bogstaver). Prikkerne er taelbar
  const scenePrikker = (d) => h('div', { class: 'lyd-prikker' }, Array.from({ length: Math.max(0, d.n || 0) }, () => h('i', { class: 'lyd-prik taelbar' })));
  // Ordstrimlen: bogstaverne som brikker, der rører hinanden (ingen mellemrum). skille p: en tydelig lodret
  // streg mellem brik p−1 og p, der stikker op over og ned under strimlen. Brikkerne har data-i (hjælpen lydFoerste)
  function sceneStrimmel(d) {
    const ord = String(d.ord || '');
    const el = h('div', { class: 'strimmel' });
    ord.split('').forEach((b, i) => {
      if (d.skille && i === d.skille) el.append(h('span', { class: 'strimmel-skille', 'aria-hidden': 'true' }));
      el.append(h('span', { class: 'strimmel-b', 'data-i': i }, b));
    });
    return el;
  }

  // C · Skovbroen: broåbningen og brobrikkerne i GRAFIK-C's målestok (24 enheder pr. felt). Tegningerne fra grafik.js
  // bruges, hvor de findes (åbning 5, 10, 13; brik 1–5, 7, 8) — de andre længder tegnes med præcis samme opbygning.
  const TAL_ID = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen'];
  const svgHoved = (b, hh) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + b + ' ' + hh + '" fill="none" stroke="var(--kontur,#33493C)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">';
  // Åbningen: vand, broens dæk med et stiplet skel pr. felt; femmergrænsen er en forlænget streg, tiermærket to streger
  function broAabningTekst(n) {
    if (MINI['forestBridgeGap' + TAL_ID[n]]) return MINI['forestBridgeGap' + TAL_ID[n]];
    const B = 24 * n + 8;
    let s = svgHoved(B, 84) + '<rect x="4" y="8" width="' + 24 * n + '" height="68" rx="8" fill="var(--vand,#CBDDE0)" stroke="none"/>' +
      '<path d="M12 65Q' + B / 2 + ' 75 ' + (B - 12) + ' 65" fill="none" stroke="var(--papir,#FFFEF8)"/>' +
      '<rect x="4" y="30" width="' + 24 * n + '" height="24" rx="0" fill="var(--papir,#FFFEF8)"/>';
    for (let k = 1; k <= n; k++) {
      const x = 24 * k + 4;
      if (k % 10 === 0) s += '<path d="M' + (x - 2) + ' 24V60M' + (x + 2) + ' 24V60" fill="none" stroke-width="2"/>';
      else if (k === n) continue;
      else if (k % 5 === 0) s += '<path d="M' + x + ' 26V58" fill="none" stroke-width="3"/>';
      else s += '<path d="M' + x + ' 31V53" fill="none" stroke-width="2" stroke-dasharray="3 3"/>';
    }
    return s + '<path d="M4 23V61M' + (24 * n + 4) + ' 23V61" fill="none" stroke-width="4"/></svg>';
  }
  function broBrikTekst(n) {
    if (MINI['forestBridgePiece' + TAL_ID[n]]) return MINI['forestBridgePiece' + TAL_ID[n]];
    let s = svgHoved(24 * n + 8, 40) + '<rect x="4" y="8" width="' + 24 * n + '" height="24" rx="5" fill="var(--farve-2,#EDB561)"/>';
    for (let k = 1; k < n; k++) s += '<path d="M' + (24 * k + 4) + ' 9V31" fill="none" stroke-width="' + (k % 5 === 0 ? 4 : 2) + '"/>';
    return s + '</svg>';
  }
  // En brik (felterne fra..fra+n i åbningen): tegningen stikker 4 enheder ud til hver side og 8 op, som i GRAFIK-C
  function broBrik(n, klasse, del) {
    return h('span', { class: 'bro-brik ' + (klasse || ''), 'data-del': del || null, style: '--n:' + n }, tegning(broBrikTekst(n), 'brik-tegning'));
  }
  // Åbningen: den faste brik ligger fra venstre (data-del fast); de tomme felter op til tiermærket er «tomme» (taelbar),
  // felterne efter tiermærket «efterTi». Felterne er HTML oven på tegningen, så hjælpen kan tælle og lyse dem.
  function sceneBro(d) {
    const n = d.n, fast = Math.min(n, d.fast || 0);
    const felt = (k) => h('span', { class: 'bro-felt' + (k < 10 ? ' taelbar' : '') });
    const raekke = h('span', { class: 'bro-felter' });
    if (fast) raekke.append(broBrik(fast, 'fast', 'fast'));
    const tomme = [], efter = [];
    for (let k = fast; k < n; k++) (k < 10 ? tomme : efter).push(felt(k));
    if (tomme.length) raekke.append(h('span', { class: 'bro-gruppe', 'data-del': 'tomme', style: '--n:' + tomme.length }, tomme));
    if (efter.length) raekke.append(h('span', { class: 'bro-gruppe efter-ti', 'data-del': 'efterTi', style: '--n:' + efter.length }, efter));
    return h('span', { class: 'sd-bro', style: '--bn:' + n }, tegning(broAabningTekst(n), 'bro-tegning'), raekke);
  }
  // Brobrikken på et svarkort: samme målestok som broen (længden er svaret — aldrig samme bredde)
  function sceneBroBrik(d) {
    return h('span', { class: 'sd-brobrik', style: '--n:' + d.n }, tegning(broBrikTekst(d.n), 'brik-tegning'));
  }

  const SCENE_DEL = {
    gruppe: (d, opts) => {
      const el = h('div', { class: 'sd-gruppe ramme-' + (RAMMER.indexOf(d.ramme) >= 0 ? d.ramme : 'boks') }, (d.dele || []).map((x) => sceneDel(x, opts)));
      if (d.gentagelse) el.classList.add('gentagelse'); // en gentagelse i et mønster (formRaekke): se app.css
      return el;
    },
    ting: sceneTing,
    tegn: (d) => h('span', { class: 'sd-tegn', 'aria-hidden': 'true' }, d.s),
    tal: (d) => h('span', { class: 'sd-tal' + (d.s === '?' ? ' hul' : '') + (d.ret ? ' ret' : '') }, String(d.s),
      d.laast ? h('i', { class: 'sd-laas', 'aria-hidden': 'true' }, '🔒') : null),
    pladser: scenePladser,
    staenger: sceneStaenger,
    raekke: sceneRaekke,
    moenter: (d) => moentRaekke(d.liste || []),
    moent: (d) => h('span', { class: 'moent-plads' }, moentSvg(d.kr)),
    vare: (d) => h('div', { class: 'koeb-vare' }, h('span', { class: 'koeb-emoji', 'aria-hidden': 'true' }, d.e), h('span', { class: 'koeb-pris' }, d.pris + ' kr')),
    digital: (d) => h('div', { class: 'sd-digital-ur' }, h('span', { class: 'sd-digital-tal' }, d.klokke)),
    form: sceneForm,
    puslespil: scenePuslespil,
    brik: sceneBrik,
    placering: scenePlacering,
    spejl: sceneSpejl,
    motiv: sceneMotiv,
    streg: sceneStreg,
    linealPlacering: sceneLinealPlacering,
    klodser: sceneKlodser,
    taarne: sceneTaarne,
    koe: sceneKoe,
    skilt: sceneSkilt,
    gitterRute: sceneGitterRute,
    gitterStreg: sceneGitterStreg,
    ur: (d) => h('div', { class: 'sd-ur' }, urSvg(d.klokke)),
    prikker: scenePrikker,
    strimmel: sceneStrimmel,
    bro: sceneBro,
    brobrik: sceneBroBrik,
  };

  // Én del: elementet får klassen sd-<t> og data-del; et navn står som en lille etiket under delen
  // opts.kort: delen står på et svarkort
  function sceneDel(d, opts) {
    const lav = SCENE_DEL[d.t];
    let el = lav ? lav(d, opts || {}) : h('span');
    el.classList.add('sd', 'sd-' + d.t);
    if (d.id) el.setAttribute('data-del', d.id);
    if (d.navn) el = h('div', { class: 'sd-navngivet' }, el, h('span', { class: 'sd-navn' }, d.navn));
    return el;
  }

  // Hele scenen: delene i rækker (lag 'raekke': én række, evt. to; 'stak': én del pr. række)
  function tegnScene(dele, opts) {
    opts = opts || {};
    const scene = h('div', { class: 'scene lag-' + (opts.lag === 'stak' ? 'stak' : 'raekke') + (opts.kort ? ' kort-scene' : '') });
    scene._dele = (dele || []).map((d) => sceneDel(d, opts));
    scene._lag = opts.lag === 'stak' ? 'stak' : 'raekke';
    scene._kort = !!opts.kort;
    arrangerScene(scene, 0);
    setTimeout(() => foelgScene(scene), 0);
    return scene;
  }

  // En frise (mønsterrække med pil) læses bedst i én linje: den brydes kun, når brikkerne ellers bliver små.
  // En lille pakke på et svarkort brydes aldrig (A B / C ligner et andet mønster)
  const harFrise = (scene) => !!scene.querySelector('.sd-raekke.frise');
  // To rækker, der sammenlignes ting for ting (stak af lange rækker), kan vendes til to søjler side om side
  const kanVendes = (scene) => scene._lag === 'stak' && scene._dele.length > 1 && scene._dele.every((d) => d.classList.contains('linje'));
  // Hvor en række af dele må brydes. Er der tegn, brydes der lige EFTER et tegn (en ny linje begynder aldrig med
  // «+»), og en pil (→) står for sig selv og peger nedad. Uden tegn må der brydes mellem alle dele.
  function brudSteder(dele) {
    const erTegn = dele.map((d) => d.classList.contains('sd-tegn'));
    const ud = [];
    if (erTegn.some(Boolean)) {
      dele.forEach((d, t) => {
        if (!erTegn[t] || t === 0 || t === dele.length - 1) return;
        ud.push(d.textContent === '→' ? { t: t, pil: true } : { t: t + 1, pil: false });
      });
    } else for (let t = 1; t < dele.length; t++) ud.push({ t: t, pil: false });
    return ud;
  }
  function delIRader(dele, brud) {
    const rader = [];
    let fra = 0;
    brud.forEach((b) => {
      rader.push(dele.slice(fra, b.t));
      if (b.pil) { rader.push([dele[b.t]]); fra = b.t + 1; } else fra = b.t;
    });
    rader.push(dele.slice(fra));
    return rader.every((r) => r.length) ? rader : null;
  }
  const kombinationer = (liste, k) => (k === 0 ? [[]] : [].concat.apply([], liste.map((x, i) => kombinationer(liste.slice(i + 1), k - 1).map((r) => [x].concat(r)))));
  // Mange mønter på et svarkort kan lægges tæt som en bunke (bytMoent: op til 4 mønter, som ikke kan blive mindre end
  // 80 px — på en telefon er der ellers ikke plads, og kortet klipper dem). Bunken ligger vandret (1) eller — på
  // smalle, høje kort — lodret (2)
  const kanBunke = (scene) => !!scene._kort && !!scene.querySelector('.sd-moenter .moent-plads:nth-child(3)');
  // Hvor mange gange kan scenen brydes (0 = kun én opstilling)? Rækker af dele: op til to brud (tre rækker)
  function maksBrud(scene) {
    if (kanBunke(scene)) return 2;
    if (harFrise(scene)) return 1;
    if (scene._lag === 'stak') return kanVendes(scene) ? 1 : 0;
    return scene._dele.length > 1 ? Math.min(2, brudSteder(scene._dele).length) : 0;
  }

  // Stil delene op. to = antal brud: 0 = én række (stak: én del pr. række). Ellers deles rækken, så den bredeste
  // række bliver så smal som muligt; en frise brydes i to, og en stak af lange rækker vendes til søjler.
  // (Bredderne måles, så scenen skal være på skærmen.)
  function arrangerScene(scene, to) {
    to = Number(to) || 0;
    const dele = scene._dele;
    // Mønter på et svarkort: «tæt» (to > 0) lægger dem som en bunke — hver mønt dækker lidt af den næste, og den
    // første ligger øverst (en 10'er står altid først, så dens tal ses helt). Lodret (to = 2): den nederste ligger
    // øverst, så tallet i den øverste del af hver mønt ses
    scene.querySelectorAll('.sd-moenter').forEach((m) => {
      const taet = to > 0 && !!scene._kort, lodret = taet && to > 1;
      m.classList.toggle('taet', taet);
      m.classList.toggle('lodret', lodret);
      [...m.children].forEach((p, i, l) => { p.style.zIndex = taet ? String(lodret ? i + 1 : l.length - i) : ''; });
    });
    dele.forEach((d) => [d].concat([...d.querySelectorAll('.sd-raekke')]).forEach((x) => {
      if (x.classList.contains('sd-raekke')) x.classList.toggle('to-rader', to > 0 && x.classList.contains('frise') && x.querySelectorAll('.brik-celle').length > 2);
    }));
    const vend = to > 0 && kanVendes(scene);
    scene.classList.toggle('lodret', vend);
    let rader = [dele];
    if (scene._lag === 'stak') rader = vend ? [dele] : dele.map((d) => [d]);
    else if (to && dele.length > 1) {
      scene.textContent = '';
      const proeve = h('div', { class: 'scene-rad' }, dele);
      scene.append(proeve);
      const b = dele.map((d) => d.offsetWidth);
      const gab = parseFloat(getComputedStyle(proeve).columnGap) || 0;
      const bredde = (rad) => rad.reduce((s, d) => s + b[dele.indexOf(d)], 0) + gab * (rad.length - 1);
      const steder = brudSteder(dele);
      let bedst = null, bedstB = Infinity;
      for (let k = Math.min(to, steder.length); k >= 1 && !bedst; k--) {
        kombinationer(steder, k).forEach((brud) => {
          const r = delIRader(dele, brud);
          if (!r) return;
          const w = Math.max.apply(null, r.map(bredde));
          if (w < bedstB) { bedstB = w; bedst = r; }
        });
      }
      if (bedst) rader = bedst;
    }
    // En pil, der står alene i sin række, peger nedad
    dele.forEach((d) => { if (d.classList.contains('sd-tegn')) d.classList.toggle('ned', rader.length > 1 && rader.some((rad) => rad.length === 1 && rad[0] === d)); });
    scene.textContent = '';
    rader.forEach((rad) => scene.append(h('div', { class: 'scene-rad' }, rad)));
    scene._to = to;
  }

  // Det største --u, hvor scenen kan stå i B × H. Nogle mål har et minimum (tekst ≥ 17 px), så der måles igen.
  const U_MIN = 3;
  function saetU(scene, u) { scene.style.setProperty('--u', (Math.floor(u * 100) / 100) + 'px'); }
  function stoersteU(scene, B, H, uMax) {
    let u = Math.min(10, uMax), passer = 0;
    for (let k = 0; k < 7; k++) {
      saetU(scene, u);
      const w = scene.offsetWidth, hh = scene.offsetHeight;
      if (!w || !hh) return u;
      const f = Math.min(B / w, H / hh);
      if (f >= 1) passer = Math.max(passer, u);
      if (f >= 1 && (f < 1.02 || u >= uMax)) break;
      const ny = Math.max(U_MIN, Math.min(uMax, u * f * (f < 1 ? 0.99 : 1)));
      if (Math.abs(ny - u) < 0.02) break;
      u = ny;
    }
    return Math.min(uMax, passer || U_MIN);
  }
  // Pladsen til en scene: forælderens indholdsboks (minus søskende i samme felt og en lille margen til lyset)
  function sceneBoks(scene) {
    const p = scene.parentElement;
    const cs = getComputedStyle(p);
    let B = p.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    let H = p.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const gab = parseFloat(cs.rowGap) || 0;
    [...p.children].forEach((c) => { if (c !== scene && c.getClientRects().length) H -= c.offsetHeight + gab; });
    return [B - 10, H - 10];
  }
  function tilpasEn(scene, uMax) {
    const [B, H] = sceneBoks(scene);
    if (B <= 0 || H <= 0) return 0;
    // Hvert brud mere skal give tydeligt større dele (15 %); en frise brydes kun, når brikkerne ellers bliver små
    arrangerScene(scene, 0);
    let u = stoersteU(scene, B, H, uMax), to = 0;
    const frise = harFrise(scene);
    for (let k = 1; k <= maksBrud(scene); k++) {
      arrangerScene(scene, k);
      const uk = stoersteU(scene, B, H, uMax);
      if (frise ? to === 0 && u < 7 && uk > u * 1.4 : uk > u * 1.15) { u = uk; to = k; }
    }
    if (scene._to !== to) arrangerScene(scene, to);
    saetU(scene, u);
    return u;
  }
  // Svarkortene får samme opstilling og samme --u, så de kan sammenlignes
  function tilpasKort(scener, uMax) {
    const proev = (to) => Math.min.apply(null, scener.map((s) => {
      arrangerScene(s, to);
      const [B, H] = sceneBoks(s);
      return B > 0 && H > 0 ? stoersteU(s, B, H, uMax) : U_MIN;
    }));
    let to = 0, u = proev(0);
    const maks = Math.max.apply(null, scener.map(maksBrud));
    for (let k = 1; k <= maks; k++) {
      // Mønterne lægges kun tæt, når de ellers ikke kan være der i fuld størrelse (mindst 80 px — tallet er 17 px)
      if (u > U_MIN + 0.01 && scener.some(kanBunke)) break;
      const uk = proev(k);
      if (uk > u * 1.15) { to = k; u = uk; }
    }
    // Kan mønterne ikke være der i nogen opstilling (fx når «vis svaret» giver et smalt kort en ramme), ligger de
    // alligevel i en bunke — lodret på et højt kort, ellers vandret — så de stikker mindst muligt ud
    if (u <= U_MIN + 0.01 && scener.some(kanBunke)) { const [B, H] = sceneBoks(scener[0]); to = H > B ? 2 : 1; }
    scener.forEach((s) => { if (s._to !== to) arrangerScene(s, to); saetU(s, u); });
    return u;
  }
  // Alle scener i runden tilpasses samlet: når de tegnes, og når deres felt skifter størrelse (fx når hjælpen
  // tager plads, eller iPad'en vendes). Ved puslespillet får hullet og brikkerne samme størrelse på skærmen.
  let tilpasVenter = 0;
  const sceneFelter = new Set();
  const sceneRO = window.ResizeObserver ? new ResizeObserver(() => planlaegTilpas()) : null;
  function planlaegTilpas() {
    if (!tilpasVenter) tilpasVenter = requestAnimationFrame(() => { tilpasVenter = 0; tilpasScener(); });
  }
  function foelgScene(scene) {
    const p = scene.parentElement;
    if (!scene.isConnected || !p) return;
    if (sceneRO && !sceneFelter.has(p)) { sceneFelter.add(p); sceneRO.observe(p); }
    planlaegTilpas();
  }
  if (!window.ResizeObserver) window.addEventListener('resize', () => planlaegTilpas());
  function tilpasScener() {
    sceneFelter.forEach((p) => { if (!p.isConnected) { sceneFelter.delete(p); if (sceneRO) sceneRO.unobserve(p); } });
    const alle = [...document.querySelectorAll('#app .runde .scene')];
    const kort = alle.filter((s) => s.closest('.valg-knap'));
    const opgave = alle.filter((s) => !s.closest('.valg-knap'));
    // Puslespil, mønter, prikgitre og klodsrækker: opgaven og svarkortene tegnes i samme størrelse (hullet = brikken,
    // 1 kr = 1 kr, en vejlængde = en vejlængde, en klods = en klods — review #3: retVej, sammeSum, bytMoent)
    // C: broåbningen og brobrikkerne, skyggen og figurerne — også i samme målestok (en brik på 3 = tre felter i broen)
    const samme = opgave.find((s) => s.querySelector('.sd-pusle, .sd-moenter, .sd-gitter, .sd-klodser, .sd-bro, .sd-figur.skygge'));
    const sammeKort = !!samme && kort.some((s) => s.querySelector('.sd-brik, .sd-moent, .sd-moenter, .sd-gitter, .sd-klodser, .sd-brobrik' + (samme.querySelector('.skygge') ? ', .sd-figur' : '')));
    // Mønsterfrisen: brikkerne på svarkortene er aldrig større end frisens (opgaven er det, der skal ses)
    const friseKort = opgave.some(harFrise) && kort.some((s) => s.querySelector('.sd-raekke'));
    // Tilpas det hele; giver den mindste --u (opgave eller kort) — den, der bestemmer, hvor godt det kan ses
    const tilpasAlt = () => {
      let uq = 22;
      opgave.forEach((s) => { const u = tilpasEn(s, 22); if (u) uq = Math.min(uq, u); });
      if (!kort.length) return uq;
      const uk = tilpasKort(kort, sammeKort || friseKort ? uq : 22);
      if (sammeKort && uk < uq) { saetU(samme, uk); uq = uk; }
      return Math.min(uq, uk);
    };
    const valg = kort.length ? kort[0].closest('.valg') : null;
    if (!valg) { tilpasAlt(); return; }
    // Svarkortene side om side — eller stablet under hinanden (brede kort som mønsterrækker og figur med bær)?
    // Høje kort (fx tierstænger) får desuden prøvet «store» kort: på en iPad på langs side om side i en bredere
    // kolonne (normalt står de under hinanden i en smal), på højkant højere kort. Den opstilling, hvor det mindste
    // står størst, vælges (den første, hvis de er lige gode). Telefonen på langs har sin egen opstilling.
    // «store-stak» (iPad på langs): de store korts brede kolonne, men kortene under hinanden — til brede, lave kort
    // som en kø af vogne eller en ordstrimmel, der ellers står småt i den smalle kolonne (D2/D3).
    // «halv-stak» (iPad på langs): som store-stak, men opgave og kort deler bredden lige — når opgaven er den samme slags
    // brede tegning som kortene (køen, strimlen), står de så i samme målestok (ui-review #2: køen stod i 70 % af kortenes).
    // Valget ligger fast for skærmens størrelse — kortene må ikke springe, når hjælpen tager plads i opgavefeltet.
    const skaerm = window.innerWidth + 'x' + window.innerHeight;
    if (valg._stakFor === skaerm) { tilpasAlt(); return; }
    valg._stakFor = skaerm;
    const krop = valg.closest('.runde-krop');
    const saet = (o) => {
      valg.classList.toggle('kort-stak', o === 'stak' || o === 'store-stak' || o === 'halv-stak');
      valg.classList.toggle('kort-gitter', o === 'gitter');
      if (krop) krop.classList.toggle('kort-store', o === 'store' || o === 'store-stak' || o === 'halv-stak' || o === 'gitter');
      if (krop) krop.classList.toggle('kort-halv', o === 'halv-stak');
    };
    const muligheder = ['side', 'stak'];
    if (krop && (window.innerHeight > window.innerWidth || window.innerHeight > 500)) muligheder.push('store');
    if (krop && window.innerWidth > window.innerHeight && window.innerHeight > 500) muligheder.push('store-stak', 'halv-stak');
    // Højkant: «store-stak» er kortene under hinanden, men højere — til små tegninger, der ellers står småt i lave kort
    // (ui-review #3: bamsen i laesPlacering var ca. 20 px på en iPhone)
    else if (krop && window.innerHeight > window.innerWidth) muligheder.push('store-stak');
    // Højkant med tierstænger på alle tre kort (byt10): to kort øverst og ét under, så hvert kort bliver dobbelt så bredt.
    // Tre smalle kort side om side gav stænger på ca. 10 px på en iPhone (D1-tjekket); kun når det giver mest plads
    // iPad på langs: de store kort i den brede kolonne stod tre side om side med meget luft over og under (D1-tjekket)
    if (krop && (window.innerHeight > window.innerWidth || window.innerHeight > 500) && kort.length === 3 && kort.every((s) => s.querySelector('.staenger'))) muligheder.push('gitter');
    // Variation: fire kort («Hvem passer ikke ind?») står to og to — på højkant også under hinanden, når tegningerne så
    // bliver klart større (fem ting på en række blev ca. 26 px i 2 × 2 på en iPhone). Tasterne 1–4 følger læseretningen.
    if (krop && krop.classList.contains('kort-opgave') && kort.length === 4) muligheder.splice(0, muligheder.length, ...(window.innerHeight > window.innerWidth ? ['gitter', 'stak'] : ['gitter']));
    let valgt = null, bedst = 0;
    // Mønter i en bunke (tæt) er en nødløsning: en opstilling uden bunke vælges, hvis den er næsten lige så god —
    // og en lodret bunke kun, når den vandrette ikke kan være der
    const straf = () => (valg.querySelector('.moenter.taet.lodret') ? 0.65 : valg.querySelector('.moenter.taet') ? 0.75 : 1);
    muligheder.forEach((o) => { saet(o); const u = tilpasAlt() * straf(); if (!valgt || u > bedst * 1.1) { valgt = o; bedst = u; } });
    saet(valgt);
    tilpasAlt();
  }

  // ---------- Dansk (B4): visninger, svarknapper, byg-ord og hjælp ----------
  // Bogstav-kort: stort og lille bogstav (M m) — læses og skrives med små, så det lille er størst
  function bogstavKort(b, kunLille) {
    return h('span', { class: 'bogstav-kort' }, kunLille ? null : h('span', { class: 'bogstav-stort' }, b.toUpperCase()), h('span', { class: 'bogstav-lille' }, b));
  }
  // En emoji, der siger sit ord, når man trykker på den (ikke et svar)
  function ordEmoji(ord, e, klasse, billede) {
    return h('button', {
      class: 'ord-emoji ' + (klasse || ''), type: 'button', 'aria-label': ord,
      onclick: () => { Lyd.init(); Tale.sig(ord); },
    }, billede && MINI[billede] ? miniBillede(billede, e, 'ord-tegning') : h('span', { 'aria-hidden': 'true' }, ordTegn(e)));
  }
  function lytKnap(opg) {
    return h('button', {
      class: 'lyt-knap', type: 'button', 'aria-label': 'Hør igen',
      onclick: () => { Lyd.init(); sigOpgave(opg); },
    }, h('span', { 'aria-hidden': 'true' }, '👂'));
  }
  // Et skrevet ord, hvor hvert bogstav kan trykkes og siger sin lyd (indtalt klip — ellers «lyden i …»)
  function skrevetOrd(ord) {
    return h('div', { class: 'skrevet-ord' }, ord.split('').map((b) => h('button', {
      class: 'ord-bogstav', type: 'button', 'aria-label': 'Lyden ' + b, 'data-b': b,
      onclick: () => { Lyd.init(); Lyd.klip(D.lydId(b), D.lydReserve(b)); },
    }, b)));
  }
  // Tomme felter, der fyldes, mens barnet bygger ordet/sætningen
  function bygFelter(opg, nummereret) {
    const dele = opg.byg.dele;
    // «Hvad skete der?»: pladserne er nummererede (1 2 3), og brikkerne er billeder
    return h('div', { class: 'byg-felter' + (opg.byg.adskil ? ' ord' : '') + (nummereret ? ' nummereret' : '') },
      Array.from({ length: dele }, (_, k) => h('span', { class: 'byg-felt', 'data-nr': nummereret ? k + 1 : null, 'data-plads': opg.byg.trinvis ? k : null })));
  }

  // ---------- Engelsk (Jimmy 13-10-2026): hør ordet → tryk på billedet. Kun spillets egne tegninger. ----------
  // 🔊 og 👂 siger kun det engelske ord (sigEngelsk) — S.oplaes tælles op, så en igangværende oplæsning af opgaven
  // ikke bagefter siger ordet en gang til. Mens hjælpen taler (r.laast), siger de intet: hjælpens engelske og danske
  // ord må ikke afbrydes af eller blandes med ordet fra 🔊 (review 14-10-2026, fund 4)
  function sigEngelsk(opg) { if (S.runde && S.runde.laast) return; S.oplaes++; Tale.sigEn(opg.ordEn); }
  function engelskVisning(opg) {
    const lyt = h('button', {
      class: 'lyt-knap', type: 'button', 'aria-label': 'Hør igen',
      onclick: () => { Lyd.init(); if (S.runde && S.runde.laast) return; sigEngelsk(opg); },
    }, h('span', { 'aria-hidden': 'true' }, '👂'));
    if (opg.vis.art === 'engelskSig') return sigVisning(opg, lyt);
    return h('div', { class: 'dansk-billede' }, lyt);
  }
  // «Sig efter mig» (18-10-2026): rejsevennen siger sætningen — 👂 i taleboblen siger den igen. Ved klokken står uret
  // i boblen (hele timer), ved farven og dyret (20-10-2026) ordets billede. Ingen læsetekst: barnet hører sætningen og
  // siger den, og den grønne knap er svaret.
  function sigVisning(opg, lyt) {
    const v = opg.vis;
    const ekstra = v.klokke ? ['med-ur'] : v.billede ? ['med-billede'] : [];
    return h('div', { class: ['sig-efter'].concat(ekstra).join(' ') }, // uden mellemrum i strengen: tale-tekster.js tager strenge med mellemrum for sætninger
      h('span', { class: 'sig-ven', 'aria-hidden': 'true' }, venTegning(minFigur().id, v.udtryk)),
      h('div', { class: 'sig-boble' }, v.klokke ? urSvg(v.klokke, false) : null, v.billede ? engelskBillede(v.billede) : null, lyt));
  }
  // Farveklatten: en blød, skæv klat (9 buler med forskudte vinkler, glat kurve) i ordets faste farve (--eng-<farve> i
  // app.css) med kontur. Regelmæssige buler lignede en sekskant.
  const KLAT = (() => {
    const r = [44, 37, 42, 46, 36, 43, 38, 45, 39];
    const skaev = [0, 6, -5, 4, -7, 3, -4, 7, -2];
    const p = r.map((rr, i) => { const a = (i * 40 + skaev[i]) * Math.PI / 180; return [50 + rr * Math.cos(a), 50 + rr * Math.sin(a)]; });
    let d = 'M' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1);
    for (let i = 0; i < p.length; i++) {
      const p0 = p[(i - 1 + p.length) % p.length], p1 = p[i], p2 = p[(i + 1) % p.length], p3 = p[(i + 2) % p.length];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += 'C' + [c1, c2, p2].map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ');
    }
    return d + 'Z';
  })();
  function farveKlat(farve) {
    const svg = svgEl('svg', { viewBox: '0 0 100 100', class: 'eng-klat', 'aria-hidden': 'true', focusable: 'false' });
    svg.style.setProperty('--klat', 'var(--eng-' + farve + ')');
    svg.append(svgEl('path', { d: KLAT, class: 'eng-klat-flade' }), svgEl('circle', { cx: 88, cy: 84, r: 6, class: 'eng-klat-flade' }));
    return svg;
  }
  // Tallet med terningøjne under: 1–6 på én terning, 7–11 som fem og resten (som terningbillederne i matematik), 12 som
  // to seksere. Eget navn: hed den talBillede, overskrev den danske talBillede (samme scope — den sidste erklæring vinder)
  const OEJNE = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  function engTalBillede(n) {
    const sider = n <= 6 ? [n] : n <= 11 ? [5, n - 5] : [6, n - 6];
    const svg = svgEl('svg', { viewBox: '-2 -2 ' + (sider.length * 38 - 2) + ' 38', class: 'eng-terninger', 'aria-hidden': 'true', focusable: 'false' });
    sider.forEach((antal, i) => {
      svg.append(svgEl('rect', { x: i * 38, y: 0, width: 34, height: 34, rx: 8, class: 'eng-terning' }));
      for (const pl of OEJNE[antal]) svg.append(svgEl('circle', { cx: i * 38 + 8 + ((pl - 1) % 3) * 9, cy: 8 + Math.floor((pl - 1) / 3) * 9, r: 3.4, class: 'eng-pip' }));
    });
    return h('span', { class: 'eng-tal-indhold' }, h('span', { class: 'eng-tal-tal' }, String(n)), svg);
  }
  // Ordets billede (svarkortene og hjælpen): farveklat · tal med terningøjne · samledyr (grafik.js, emoji som reserve) · figur
  function engelskBillede(id) {
    const o = E && E.ORD[id];
    const b = o ? o.billede : null;
    let indhold = '?';
    if (b && b.art === 'farve') indhold = farveKlat(b.farve);
    else if (b && b.art === 'tal') indhold = engTalBillede(b.tal);
    else if (b && b.art === 'dyr') indhold = (GR && GR.samledyr ? tegning(GR.samledyr[b.tegning], 'eng-dyr-tegning') : null) || h('span', { class: 'eng-dyr-e' }, b.e);
    else if (b && b.art === 'form') indhold = formSvg(b.form, 1, 0, false);
    else if (b && b.art === 'ting') indhold = (GR && GR.hverdag ? tegning(GR.hverdag[b.tegning], 'eng-ting-tegning') : null) || '?';
    return h('span', { class: ['eng-billede', 'eng-' + (b ? b.art : 'ukendt')].join(' '), 'aria-hidden': 'true' }, indhold);
  }

  // ---------- Natur (pilot 20-10-2026): «Gæt en lort» — se lorten (og sporet), tryk på dyret. Ingen læsetekst. ----------
  // «Hvem har gået her?» (trin 0, 21-10-2026, vis.art 'naturSpor'): kun sporet, stort, på samme skovbund — i Savannen
  // (emne naturSavanne, både spor og lort) på tørt græs og sand (.savanne).
  // Lorten står stort på en stribe skovbund, sporet ved siden af. På niveau 3 er sporet skjult, til hjælpen viser det
  // (naturSpor). Kun spillets egne tegninger (grafik.js natur); mangler en, står emojien — uglens «spor» er dens træ.
  const naturTegning = (navn, klasse) => (GR && GR.natur ? tegning(GR.natur[navn], klasse) : null);
  function naturVisning(opg) {
    const id = opg.vis.dyr;
    const d = N && N.DYR_ID[id];
    const sand = opg.emne === 'naturSavanne' ? ['savanne'] : [];
    // «Tæl ved vandhullet» (Savannen, fase 3, 22-10-2026): zebraerne i rækker af 5 og blokke af 10 som matematikkens
    // «Tæl» (tingGruppe: hver zebra er taelbar, så tællehjælpen tæller dem) ved vandhullet på sandet
    if (opg.vis.art === 'naturTael') {
      const zebra = () => naturTegning('dyr-' + id, 'natur-ting-tegning') || (d ? d.e : '🦓');
      // Zebraernes størrelse regnes i app.css af rækkerne og søjlerne: --kol er den bredeste række under hinanden, --raek alle
      // rækkerne, og --kol-side søjlerne, når blokkene står side om side (telefon liggende)
      const n = opg.vis.antal;
      let raek = 0, kolSide = 0;
      for (let s = 0; s < n; s += 10) { const i = Math.min(10, n - s); raek += Math.ceil(i / 5); kolSide += Math.min(5, i); }
      const maal = '--kol:' + Math.min(n, 5) + ';--raek:' + raek + ';--blokke:' + Math.ceil(n / 10) + ';--kol-side:' + kolSide;
      return h('div', { class: ['natur-scene', 'natur-tael'].concat(sand).join(' '), style: maal, 'aria-hidden': 'true' },
        tingGruppe(opg.vis.antal, zebra),
        h('div', { class: 'natur-vandhul' }),
        h('div', { class: 'natur-jord' }));
    }
    // «Hvilket dyr starter med …?» (fase 4): eksemplets billede (solen, lammet …) og på niveau 1–2 bogstavet på sandet;
    // dyrene står på kortene. På niveau 3 står bogstavet usynligt på sin plads (.gemt), til hjælpen viser det (visBogstav) —
    // så billedet ikke flytter sig, når det kommer frem
    if (opg.vis.art === 'naturLyd') {
      const b = opg.vis.bogstav || (d && d.forlyd) || '';
      const kort = b ? bogstavKort(b) : null;
      if (kort && !opg.vis.bogstav) kort.classList.add('gemt');
      return h('div', { class: ['natur-scene', 'natur-lyd'].concat(sand).join(' '), 'aria-hidden': 'true' },
        h('div', { class: 'natur-lyd-par' }, h('span', { class: 'natur-lyd-e' }, ordTegn(opg.vis.e)), kort),
        h('div', { class: 'natur-jord' }));
    }
    if (opg.vis.art === 'naturSpor') {
      // Sporet har klassen natur-spor, så hjælpens første trin (naturSpor) får det til at lyse
      return h('div', { class: ['natur-scene', 'spor-alene'].concat(sand).join(' '), 'aria-hidden': 'true' },
        h('div', { class: 'natur-fund' }, h('div', { class: 'natur-spor' },
          naturTegning('spor-' + id, 'natur-tegning') || h('span', { class: 'natur-e' }, '🐾'))),
        h('div', { class: 'natur-jord' }));
    }
    // Barnefingeren i lortens målestok (lille · mellem · stor, natur-opgaver.js STOERRELSER) peger ind fra venstre; hånden
    // tegnes langt ud over kassen, så feltets kant (overflow: hidden) klipper den — den kommer «udefra». Savannens dyr har
    // målestokken i lort.str og kun, hvor størrelsen er kildebelagt (docs/SAVANNE-FAKTA.md)
    const tegnet = naturTegning('lort-' + id, 'natur-tegning');
    const str = d && (d.lort ? d.lort.str : d.str);
    const lort = h('div', { class: 'natur-lort' }, tegnet || h('span', { class: 'natur-e' }, '💩'),
      tegnet && str ? naturTegning('finger-' + str, 'natur-finger') : null);
    const spor = h('div', { class: opg.vis.spor ? 'natur-spor' : ['natur-spor', 'skjult'].join(' ') }, // uden mellemrum i strengen (tale-tekster.js)
      naturTegning('spor-' + id, 'natur-tegning') || h('span', { class: 'natur-e' }, d && d.sporOrd ? '🌳' : '🐾'));
    return h('div', { class: ['natur-scene'].concat(sand).join(' '), 'aria-hidden': 'true' },
      h('div', { class: 'natur-fund' }, lort, spor),
      h('div', { class: 'natur-jord' }));
  }
  // Dyret på svarkortet (og i lektionen)
  function naturDyrBillede(id) {
    const d = N && N.DYR_ID[id];
    return h('span', { class: 'natur-dyr', 'aria-hidden': 'true' },
      naturTegning('dyr-' + id, 'natur-dyr-tegning') || h('span', { class: 'natur-dyr-e' }, d ? d.e : '?'));
  }

  function tegnDanskVisning(opg) {
    const v = opg.vis;
    switch (v.art) {
      case 'ordBillede': return h('div', { class: 'dansk-billede' }, ordEmoji(v.ord, v.e, 'stor', erMinispil(opg) && D.BILLEDE[v.ord]));
      case 'lyt': case 'lytLyd': return lytKnap(opg);
      case 'bogstav': return h('div', { class: 'dansk-billede' }, lytKnap(opg), bogstavKort(v.bogstav));
      case 'stortBogstav': return h('div', { class: 'dansk-billede' }, h('span', { class: 'bogstav-kort enkelt' }, h('span', { class: 'bogstav-stort kun' }, v.bogstav.toUpperCase())));
      case 'alfabet': {
        const celler = [];
        for (let i = v.fra; i <= v.til; i++) {
          const b = D.ALFABET[i];
          celler.push(h('span', { class: 'alfabet-celle taelbar' + (i === v.skjult ? ' hul' : ''), 'data-b': b }, i === v.skjult ? '?' : b));
        }
        return h('div', { class: 'alfabet-stribe' }, celler);
      }
      case 'lydering': {
        // Uden indtalte lyde kan lydene ikke høres: så står ordet skrevet (og barnet læser det selv)
        const alle = v.ord.split('').every((b) => Lyd.harKlip(D.lydId(b)));
        return h('div', { class: 'dansk-billede' }, lytKnap(opg), alle ? null : skrevetOrd(v.ord));
      }
      case 'skrevetOrd': return h('div', { class: 'dansk-billede' }, skrevetOrd(v.ord));
      case 'bygOrd': return h('div', { class: 'dansk-billede byg' }, ordEmoji(v.ord, v.e, 'mellem'), bygFelter(opg));
      case 'saetning': return lytKnap(opg);
      case 'bygSaetning': return h('div', { class: 'dansk-billede byg' }, lytKnap(opg), bygFelter(opg));
      case 'bygHistorie': return h('div', { class: 'dansk-billede byg' }, lytKnap(opg), bygFelter(opg, true));
      case 'lydTog': return lydTogVisning(opg); // C · Lydtoget
      case 'sand': return sandVisning(opg); // C · Spor i sandet
      // D1: scener (fx «i» og «på»), det trykte bogstav og ordet med ét forkert bogstav
      case 'scene': return tegnScene(v.dele, { lag: v.lag });
      case 'tryktBogstav': return h('div', { class: 'dansk-billede trykt' }, h('span', { class: 'trykt-bogstav' }, v.bogstav));
      case 'retOrd': {
        const ord = skrevetOrd(v.vist);
        const ret = ord.children[v.plads];
        // Brikken, der skal rettes (stiplet ring). D2 skjulPlads: ringen kommer først med hjælpen visPlads
        if (ret && !v.skjulPlads) ret.classList.add('ret');
        return h('div', { class: 'dansk-billede' }, ordEmoji(v.ord, v.e, 'mellem'), ord);
      }
      // D2: tomme pladser til bogstaverne i alfabetets rækkefølge — pilen under dem viser, at man begynder fra venstre
      case 'bygAlfabet': return h('div', { class: 'dansk-billede byg' },
        h('div', { class: 'byg-retning' }, bygFelter(opg), h('span', { class: 'byg-retning-pil', 'aria-hidden': 'true' })));
      // D3: skiltet «Her er ikke en 🐈» — ordet på plads fremhaev lyser gult. Ordene er ikke knapper (de skal læses)
      case 'ikkeSkilt': return h('div', { class: 'dansk-billede ikke-skilt-ramme' },
        h('div', { class: 'ikke-skilt', role: 'img', 'aria-label': v.ord.join(' ') + ' ' + (v.dyr || '') },
          h('div', { class: 'ikke-skilt-plade' },
            v.ord.map((w, i) => h('span', { class: 'skilt-ord' + (i === v.fremhaev ? ' fremhaev' : '') }, w)),
            h('span', { class: 'skilt-e', 'aria-hidden': 'true' }, v.e)),
          h('span', { class: 'ikke-skilt-pael', 'aria-hidden': 'true' })));
      default: return h('div');
    }
  }

  // Et bogstav skrevet i hånden: strøgene fra Dansk.SKRIFT som fulde streger (samme forlæg som ✏️ Skriv)
  function haandskriftSvg(b) {
    const svg = svgEl('svg', { viewBox: '18 8 64 94', class: 'haandskrift-svg', 'aria-hidden': 'true' });
    ((D && D.SKRIFT && D.SKRIFT[b]) || []).forEach((st) => svgEl('polyline', { points: st.map((q) => q.join(',')).join(' '), class: 'haandskrift-streg' }, svg));
    return svg;
  }

  function danskValgIndhold(opg, x) {
    if (opg.valgArt === 'emoji') {
      const o = D.ORD[x];
      // C · Rimhaven: GRAFIK-C's tegninger af billedordene, hvor de findes (ellers emojien)
      if (erMinispil(opg) && MINI[D.BILLEDE[x]]) return miniBillede(D.BILLEDE[x], o.e, 'valg-emoji valg-tegning');
      return h('span', { class: 'valg-emoji', 'aria-hidden': 'true' }, o ? ordTegn(o.e) : x);
    }
    // Huskekort: forsiden (billedet) og bagsiden — kortet vendes af visSkjulteKort
    if (opg.valgArt === 'skjult') {
      const o = D.ORD[x];
      return h('span', { class: 'vende-kort', 'aria-hidden': 'true' }, h('span', { class: 'vende-for valg-emoji' }, o ? ordTegn(o.e) : x), h('span', { class: 'vende-bag' }, '?'));
    }
    if (opg.valgArt === 'haandskrift') return haandskriftSvg(x);
    if (opg.valgArt === 'scene') return tegnScene(opg.kort[x].dele, { kort: true });
    if (opg.valgArt === 'bogstav') return bogstavKort(x, opg.kunLille || opg.emne !== 'alfabet');
    if (opg.valgArt === 'skrevet') return h('span', { class: 'valg-skrevet' }, x);
    return String(x);
  }

  // Byg et ord eller en sætning af brikker (tryk i rækkefølge; ⌫ fjerner den sidste)
  function bygPanel(opg) {
    const r = S.runde;
    r.byg = [];
    const B = opg.byg;
    // byg.tale: brikken siger sin sætning (fx hændelsen på billedet) i stedet for selve teksten
    const brikker = B.brikker.map((t, i) => h('button', {
      class: 'byg-brik' + (B.adskil ? ' ord' : '') + (B.tale ? ' billede' : ''), type: 'button', 'data-i': i, 'data-t': t, 'aria-label': B.tale ? B.tale[i] : t,
      onclick: () => vaelg(i),
    }, t));
    const slet = h('button', { class: 'byg-brik slet', type: 'button', 'aria-label': 'Slet', onclick: () => fjern() }, '⌫');
    const tegn = () => {
      const felter = r.dom.visning.querySelectorAll('.byg-felt');
      felter.forEach((f, k) => { f.textContent = r.byg[k] !== undefined ? B.brikker[r.byg[k]] : ''; f.classList.toggle('fyldt', r.byg[k] !== undefined); });
      brikker.forEach((k, i) => { k.disabled = r.byg.indexOf(i) >= 0; });
      slet.disabled = !r.byg.length;
    };
    const vaelg = (i) => {
      if (r.laast || r.byg.indexOf(i) >= 0 || r.byg.length >= B.dele) return;
      Lyd.init(); Lyd.tryk();
      r.byg.push(i);
      // Hver brik siger sin lyd (bogstav) eller sit ord — i alfabetet (byg.navn) bogstavets navn
      if (B.tale) Tale.sig(B.tale[i]);
      else if (B.adskil) Tale.sig(B.brikker[i]);
      else if (B.navn) Lyd.klip(D.navnId(B.brikker[i]), D.NAVNE[B.brikker[i]] || B.brikker[i]);
      else Lyd.klip(D.lydId(B.brikker[i]), '');
      tegn();
      if (r.byg.length === B.dele) {
        const svarTekst = r.byg.map((k) => B.brikker[k]).join(B.adskil);
        setTimeout(() => { if (!r.laast) svar(svarTekst, null); }, 350);
      }
    };
    const fjern = () => { if (r.laast || !r.byg.length) return; Lyd.init(); Lyd.tryk(); r.byg.pop(); tegn(); };
    r.bygVaelg = vaelg;
    r.bygFjern = fjern;
    r.bygNulstil = () => { r.byg = []; tegn(); };
    setTimeout(tegn, 0);
    return h('div', { class: 'byg-panel' + (B.adskil ? ' ord' : '') + (B.tale ? ' billeder' : '') }, brikker, slet);
  }

  // Spørgsmålet læses op: tekst → (indtalte lyde eller reserver) → evt. de mulige svar
  async function sigOpgave(opg, forTale, langsomt) {
    const token = S.token;
    const oplaes = ++S.oplaes;
    const levende = () => token === S.token && oplaes === S.oplaes; // ikke efter et svar eller en ny oplæsning
    const tekst = (forTale ? forTale + ' ' : '') + opg.tale;
    if (!opg.lyd) { Tale.sig(tekst); return; }
    await Tale.sigVent(tekst);
    for (const l of opg.lyd) {
      if (!levende()) return;
      if (l.en) await Tale.sigEnVent(l.en); // engelsk: kun den engelske stemmes fil (aldrig en dansk reserve)
      // «My name is»: barnets navn KUN fra optagelsen på enheden og kun på rundens tur (navnIRunden: hver anden runde,
      // højst én gang pr. runde — så siger fejringen det ikke igen). Ellers en pause, hvor barnet selv siger det.
      // (Ikke l.navn: det er dansks bogstavnavn, klippet navn-s, som spilles nedenfor)
      else if (l.ditNavn) {
        const r = S.runde;
        if (navnIRunden(r)) { r.navnSagt = true; await Lyd.klip(navnKlipId(), ''); } else await vent(2000);
      }
      else await Lyd.klip(l.klip, l.reserve);
      await vent((l.pause || 250) * (langsomt ? 2.2 : 1));
    }
    if (!levende()) return;
    if (opg.efterTale) await Tale.sigVent(opg.efterTale);
  }
  // «Sig efter mig»: «Jeg sagde det» er slået fra, til sætningen — og navnet eller pausen — er sagt én gang, så Enter-mas
  // eller et tryk midt i oplæsningen ikke tæller som sagt. Afbrydes oplæsningen (fx af 🔊), åbner knappen også.
  function sigOgAabn(opg, forTale) {
    const r = S.runde, i = r.i;
    const aabn = () => {
      const k = S.runde === r && r.i === i ? r.dom.svar.querySelector('.valg-knap') : null;
      if (k) k.disabled = false;
    };
    return sigOpgave(opg, forTale).then(aabn, aabn);
  }

  // Huskekort (D1): kortene ligger med forsiden op, mens oplæsningen nævner dem. Når den er færdig (senest efter
  // 8 s), vendes de. Kortene flytter sig ikke. Med prefers-reduced-motion vendes de uden animation (CSS).
  function visSkjulteKort(opg, forTale) {
    const r = S.runde, i = r.i;
    const valg = r.dom.svar.querySelector('.valg');
    if (!valg) return;
    valg.classList.remove('vendt');
    // Hvert kald har sit eget nummer: når 🔊 afbryder oplæsningen, må det ældre kald ikke vende kortene (review #1)
    const gen = r.skjultGen = (r.skjultGen || 0) + 1;
    const start = performance.now();
    let vendt = false;
    const vend = () => {
      if (vendt || S.runde !== r || r.i !== i || r.vendtOp || r.skjultGen !== gen) return;
      // Forsiden ses mindst 3 s — også uden oplæsning, hvor talen «slutter» med det samme (review #2)
      const rest = 3000 * TEMPO - (performance.now() - start);
      if (rest > 0) { setTimeout(vend, rest); return; }
      vendt = true;
      valg.classList.add('vendt');
    };
    Tale.sig((forTale ? forTale + ' ' : '') + opg.tale, vend);
    setTimeout(vend, 8000 * TEMPO);
  }

  // ---------- Svar: knapper ----------
  // Indholdet af en svarknap: tal, figur, gruppe af ting, ord eller mønsterbrik
  function valgIndhold(opg, x) {
    if (opg.fag === 'dansk') return danskValgIndhold(opg, x);
    // «Sig efter mig»: én stor, grøn knap — barnet har sagt sætningen (ingen mikrofon, intet kan være forkert)
    if (opg.valgArt === 'sig') return [h('span', { class: 'sig-ikon', 'aria-hidden': 'true' }, '🗣️'), h('span', { class: 'sig-tekst' }, 'Jeg sagde det')];
    if (opg.fag === 'engelsk') return engelskBillede(x);
    if (opg.fag === 'natur' && opg.valgArt === 'billede') return naturDyrBillede(x); // tællingen har tal på kortene
    const v = opg.vis;
    if (opg.valgArt === 'form') return formSvg(x, ['cirkel', 'trekant', 'firkant', 'kvadrat', 'rektangel', 'femkant', 'sekskant'].indexOf(x), 0, false);
    if (opg.valgArt === 'gruppe') return tingGruppe(x === 'a' ? v.a : v.b, O.TING[v.ting].e, x, 'knap');
    if (opg.valgArt === 'ur') return urSvg(x, true);
    if (opg.valgArt === 'tid') return h('span', { class: 'tid-tekst' }, x);
    if (opg.valgArt === 'scene') return tegnScene(opg.kort[x].dele, { kort: true, tegninger: erMinispil(opg) });
    if (opg.valgArt === 'ord') {
      // lige: alle har en makker · ulige: én står alene
      const ikon = h('span', { class: 'ord-ikon', 'aria-hidden': 'true' }, x === 'lige' ? '●● ●●' : '●● ●');
      return [ikon, h('span', { class: 'ord-tekst' }, x)];
    }
    return String(x);
  }

  function valgKnapper(opg) {
    if (opg.valgArt === 'stil') return stilUr(opg);
    const indhold = (x) => valgIndhold(opg, x);
    const placer = !!placerMaal(opg); // C: løft kortet og læg det på broen/skyggen
    return h('div', { class: 'valg' + (opg.valgArt ? ' valg-' + opg.valgArt : '') + ' antal-' + opg.valg.length + (placer ? ' placer' : '') }, opg.valg.map((x) => {
      const k = h('button', {
        class: 'valg-knap', type: 'button', 'data-v': x, 'aria-pressed': placer ? 'false' : null,
        disabled: opg.valgArt === 'sig' ? true : null, // «Jeg sagde det» åbner, når sætningen er sagt (sigOgAabn)
        'aria-label': opg.valgArt === 'gruppe' ? (x === 'a' ? 'Venstre gruppe' : 'Højre gruppe') : opg.valgArt === 'scene' ? opg.kort[x].navn : opg.valgArt === 'sig' ? 'Jeg sagde det' : opg.fag === 'engelsk' && E && E.ORD[x] ? E.ORD[x].da
          : opg.fag === 'natur' && N && N.DYR_ID[x] ? stort(N.DYR_ID[x].navn) : String(x),
        onclick: (e) => { Lyd.init(); if (placer) loeftKort(x, e.currentTarget); else svar(x, e.currentTarget); },
      }, indhold(x));
      if (placer) traekbar(k, x);
      return k;
    }));
  }

  // ---------- Svar: eget taltastatur (intet <input>) ----------
  function taltastatur(opg) {
    const r = S.runde;
    const display = h('div', { class: 'tast-display', 'aria-live': 'polite' }, '');
    const opdater = () => {
      display.textContent = r.buffer;
      okKnap.disabled = !r.buffer;
      okKnap.classList.toggle('puls', !!r.buffer);
      clearTimeout(r.mindTimer);
      if (r.buffer) {
        const token = S.token, i = r.i;
        r.mindTimer = setTimeout(() => { if (token === S.token && r.i === i && r.buffer && !r.laast) Tale.sig('Tryk på den grønne knap, når du er færdig.'); }, 3500);
      }
      const ukendt = r.dom.visning.querySelector('.regnestykke .ukendt');
      if (ukendt) ukendt.textContent = r.buffer || '?';
    };
    const tast = (t) => {
      if (r.laast) return;
      Lyd.init(); Lyd.tryk();
      if (t === '⌫') r.buffer = r.buffer.slice(0, -1);
      else if (t === '✔') { if (r.buffer) svar(Number(r.buffer), display); return; }
      else if (r.buffer.length < 2) r.buffer = (r.buffer === '0' ? '' : r.buffer) + t;
      opdater();
    };
    const knap = (t, kl, label) => h('button', { class: 'tast ' + (kl || ''), type: 'button', 'aria-label': label || t, onclick: () => tast(t) }, t);
    const okKnap = knap('✔', 'tast-ok', 'Færdig');
    const taster = h('div', { class: 'taster' },
      ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((t) => knap(t)),
      knap('⌫', 'tast-slet', 'Slet'), knap('0'), okKnap);
    r.tast = tast;
    r.opdaterDisplay = opdater;
    const ud = h('div', { class: 'taltastatur' }, display, taster);
    setTimeout(opdater, 0);
    return ud;
  }

  // ---------- Bogstavtastatur (intet <input>): A–Å i ABC-rækkefølge + ⌫ ----------
  // valg: { max, naar(tekst) }. Teksten er med små bogstaver (stort begyndelsesbogstav sættes ved visning/gem).
  // tast(key) bruges af skærmens fysiske tastatur: bogstaver (også med accent), mellemrum/bindestreg mellem bogstaver
  // og Backspace. Giver true, hvis tasten blev brugt. Bogstavtasterne siger intet — kun klikket.
  const NAVNE_BOGSTAV = /^[a-zæøåäöüéèêëáàíóúñç]$/;
  function bogstavTastatur(valg) {
    const max = valg.max || 12;
    let tekst = '';
    const taster = [];
    const opdater = () => {
      const fuld = tekst.length >= max;
      for (const k of taster) if (k.dataset.b) k.disabled = fuld;
      slet.disabled = !tekst;
      valg.naar(tekst);
    };
    const tilfoej = (b) => {
      if (tekst.length >= max) return false;
      if ((b === ' ' || b === '-') && (!tekst || /[ -]$/.test(tekst))) return false; // kun mellem bogstaver
      tekst += b;
      opdater();
      return true;
    };
    const fjern = () => { if (!tekst) return false; tekst = tekst.slice(0, -1); opdater(); return true; };
    const knap = (b) => {
      const k = h('button', { class: 'bogstav-tast', type: 'button', 'data-b': b, 'aria-label': b.toUpperCase(), onclick: () => { Lyd.init(); Lyd.tryk(); tilfoej(b); } }, b.toUpperCase());
      taster.push(k);
      return k;
    };
    const slet = h('button', { class: 'bogstav-tast bogstav-slet', type: 'button', 'aria-label': 'Slet', onclick: () => { Lyd.init(); Lyd.tryk(); fjern(); } }, '⌫');
    const el = h('div', { class: 'bogstav-tastatur' }, 'abcdefghijklmnopqrstuvwxyzæøå'.split('').map(knap), slet);
    taster.push(slet);
    setTimeout(opdater, 0);
    return {
      el: el,
      tast: (key) => {
        if (key === 'Backspace') return fjern();
        const b = typeof key === 'string' ? key.toLowerCase() : '';
        if (NAVNE_BOGSTAV.test(b) || b === ' ' || b === '-') { Lyd.init(); Lyd.tryk(); tilfoej(b); return true; }
        return false;
      },
    };
  }

  function rundeTaster(e) {
    const r = S.runde;
    if (!r) return;
    const opg = r.opgaver[r.i];
    if (e.key === 'Escape') { forladRunde(); return; }
    // R gentager — men ikke, når bogstavtasterne er svar (dansk)
    const bogstavSvar = !!(opg && (opg.valgArt === 'bogstav' || (opg.byg && !opg.byg.adskil)));
    if (e.key === ' ' || ((e.key === 'r' || e.key === 'R') && !bogstavSvar)) { e.preventDefault(); gentag(); return; }
    if (!opg || r.laast) return;
    // Tegneopgaver (B6): piletaster, Enter og Backspace styrer sømbrættet eller linealen
    if (opg.interaktiv) { const st = r.figur || r.lineal; if (st && st.taster) st.taster(e); return; }
    if (r.visSvar) {
      if (e.key === 'Enter') { const k = r.dom.svar.querySelector('.vis-svar'); if (k) k.click(); }
      return;
    }
    // C · trinvis byg: bogstavtasten (Lydtoget) eller 1, 2, 3 vælger et af kortene til den aktive plads
    if (r.trinvis) {
      const kort = [...r.dom.svar.querySelectorAll('.trinvis-kort:not(:disabled)')];
      const n = Number(e.key);
      const k = n >= 1 && n <= 3 ? r.dom.svar.querySelectorAll('.trinvis-kort')[n - 1] : kort.find((x) => x.getAttribute('data-b') === e.key.toLowerCase());
      if (k && !k.disabled) k.click();
      return;
    }
    // Dansk: byg et ord (bogstavtaster, Backspace) eller en sætning (1, 2, 3 vælger brikken efter plads)
    if (opg.byg) {
      const k = e.key.toLowerCase();
      if (e.key === 'Backspace') { e.preventDefault(); r.bygFjern(); }
      else if (!opg.byg.adskil && /^[a-zæøå]$/.test(k)) {
        const i = opg.byg.brikker.findIndex((b, j) => b === k && r.byg.indexOf(j) < 0);
        if (i >= 0) r.bygVaelg(i);
      } else if (opg.byg.adskil) {
        const n = Number(e.key);
        if (n >= 1 && n <= opg.byg.brikker.length) r.bygVaelg(n - 1);
      }
      return;
    }
    // Dansk: en bogstavtast vælger bogstav-svaret
    if (opg.valgArt === 'bogstav' && /^[a-zæøå]$/i.test(e.key)) {
      const k = r.dom.svar.querySelector('.valg-knap[data-v="' + e.key.toLowerCase() + '"]');
      if (k && !k.disabled) k.click();
      return;
    }
    if (!opg.valg) {
      if (/^[0-9]$/.test(e.key)) r.tast(e.key);
      else if (e.key === 'Backspace') { e.preventDefault(); r.tast('⌫'); }
      else if (e.key === 'Enter') r.tast('✔');
      return;
    }
    // Stil viserne: tasterne følger tallene på målene — 3, 6, 9, og 1 eller 0 for 12. Andre taster gør intet.
    // C · Urværkstedet med den lille viser: 1–9 er timetallet (1 er ikke 12); 10 og 11 nås med ← → (eller Tab) og Enter
    if (opg.valgArt === 'stil') {
      const maal = [...r.dom.svar.querySelectorAll('.stil-maal')].filter((b) => !b.disabled);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const i = maal.indexOf(document.activeElement);
        const ny = maal[i < 0 ? (e.key === 'ArrowRight' ? 0 : maal.length - 1) : (i + (e.key === 'ArrowRight' ? 1 : -1) + maal.length) % maal.length];
        if (ny) ny.focus();
        return;
      }
      const lille = opg.vis && opg.vis.viser === 'lille';
      const tal = !lille && (e.key === '1' || e.key === '0') ? '12' : e.key;
      const k = maal.find((b) => b.textContent === tal);
      if (k) k.click();
      return;
    }
    // «Sig efter mig»: Enter trykker på «Jeg sagde det» (en knap med fokus klarer selv Enter)
    if (opg.valgArt === 'sig' && e.key === 'Enter') {
      const k = r.dom.svar.querySelector('.valg-knap');
      if (k && !(document.activeElement && document.activeElement.tagName === 'BUTTON')) { e.preventDefault(); k.click(); }
      return;
    }
    // C · løft og læg: Enter lægger det løftede kort på stedet (1, 2, 3 løfter — se nedenfor)
    if (r.placer && e.key === 'Enter') { if (r.placer.x !== null) { e.preventDefault(); laegKort(); } return; }
    // Figurer, grupper, ord og mønsterbrikker: 1, 2, 3 vælger knappen efter plads
    if (opg.valgArt) {
      const n = Number(e.key);
      const knapper = r.dom.svar.querySelectorAll('.valg-knap');
      if (n >= 1 && n <= knapper.length && !knapper[n - 1].disabled) knapper[n - 1].click();
      return;
    }
    // Tal-knapper: tast tallet på knappen (også tocifrede)
    if (/^[0-9]$/.test(e.key)) {
      const aktive = [...r.dom.svar.querySelectorAll('.valg-knap:not(.forkert)')].map((k) => k.getAttribute('data-v'));
      let buf = r.buffer + e.key;
      if (!aktive.some((v) => v.indexOf(buf) === 0)) buf = e.key;
      r.buffer = buf;
      const lige = aktive.filter((v) => v === buf);
      const laengere = aktive.filter((v) => v !== buf && v.indexOf(buf) === 0);
      if (lige.length && !laengere.length) {
        r.buffer = '';
        const k = r.dom.svar.querySelector('.valg-knap[data-v="' + buf + '"]');
        if (k) k.click();
      }
      clearTimeout(r.bufferTimer);
      r.bufferTimer = setTimeout(() => { r.buffer = ''; }, 1500);
    } else if (e.key === 'Enter' && r.buffer) {
      const k = r.dom.svar.querySelector('.valg-knap[data-v="' + r.buffer + '"]:not(.forkert)');
      r.buffer = '';
      if (k) k.click();
    }
  }

  // ---------- Svar ----------
  function svar(v, knap) {
    const r = S.runde;
    if (!r || r.laast) return;
    const opg = r.opgaver[r.i];
    registrerAktivitet();
    clearTimeout(r.mindTimer);
    S.oplaes++; // opgavens oplæsning holder op — et klip, der spiller (fx den sidste brik), spiller færdigt
    Forloeb.stop(); // et nyt svar afløser den gamle feedback (dobbelttryk stoppes af r.laast og disabled)
    Tale.stop();
    if (v === opg.svar) rigtigtSvar(opg, knap);
    else forkertSvar(opg, knap);
  }

  function hop(el, klasse) {
    if (!el) return;
    el.classList.remove(klasse); void el.offsetWidth; el.classList.add(klasse);
  }
  // Vennens ene jubel (fejr-en-gang, 480 ms) — først når lyd og tale er færdige. Reduceret bevægelse: kun udtrykket (CSS)
  function fejrEnGang(el) {
    const svg = el && el.querySelector('.ven-tegning');
    if (!svg) return;
    svg.classList.remove('fejr-en-gang'); void svg.getBoundingClientRect(); svg.classList.add('fejr-en-gang');
  }

  // Rigtigt: én rolig hændelse — en lille lyd og et fodspor, der fyldes. Ingen tale oveni.
  function rigtigtSvar(opg, knap) {
    const r = S.runde;
    r.laast = true;
    if (r.forsoeg === 0) registrer(opg, true);
    if (knap && knap.classList) {
      knap.classList.remove('vis-svar'); // ellers bliver svaret hvid tekst på guld
      knap.classList.add('rigtig');
    }
    // Lyden og (efter hjælp) svaret i ét forløb: lyd → ro → tale. Fodsporet fyldes straks (nedenfor).
    // C: en opgave, der ikke bedømmes (Spor i sandet), får en blød boble — ikke «rigtigt»-lyden. Et minispil med
    // et slutbillede siger selv «Ja!» eller sin egen sætning (slutBillede), så forløbet har ingen tekst dér.
    const tekst = r.forsoeg > 0 && !opg.slut ? (opg.valgArt || opg.interaktiv ? 'Ja!' : 'Ja, det er ' + opg.svar + '!') : '';
    // Engelsk (13-10-2026): lyden → ordet igen på engelsk (den engelske stemme) → det danske ord (den danske stemme).
    // «Sig efter mig»: lyden → ros på dansk («Godt sagt!»), og vennen i boblen jubler
    const fb = opg.valgArt === 'sig' ? Forloeb.run({ lyd: 'rigtig', tekst: opg.ros })
      : opg.fag === 'engelsk' ? Forloeb.run({ lyd: 'rigtig', en: opg.ordEn, tekst: opg.ordDa })
      // natur: «Ja! Det er ræven.» og én sand sætning — efter hjælpen kun «Ja!», for hjælpen har lige sagt dyrets navn
      : opg.fag === 'natur' ? Forloeb.run({ lyd: 'rigtig', tekst: (r.forsoeg > 0 ? 'Ja!' : opg.ros) + ' ' + opg.fakta })
      : Forloeb.run({ lyd: O.taellerMed(opg) ? 'rigtig' : 'boblePop', tekst });
    if (opg.valgArt === 'sig') saetUdtryk(r.dom.visning, 'jubler');
    // Ret bogstavet (D1): det rigtige bogstav kommer på plads i ordet
    if (opg.vis && opg.vis.art === 'retOrd') {
      const b = r.dom.visning.querySelectorAll('.ord-bogstav')[opg.vis.plads];
      if (b) { b.textContent = opg.svar; b.classList.remove('ret'); b.classList.add('rettet'); }
    }
    saetUdtryk(r.dom.ven, 'glad');
    const prik = r.dom.prikker.querySelectorAll('.prik')[r.i];
    prik.classList.add('fuld');
    hop(prik, 'pop');
    const token = S.token;
    const videre = () => {
      if (token !== S.token) return;
      r.i++;
      if (r.i < r.opgaver.length) visOpgave();
      else afslutRunde();
    };
    // C · minispil: et kort, roligt slutbillede efter lyden (bedømmes ikke) — så videre
    if (opg.slut) { fb.then(() => slutBillede(opg, knap, token)).then(() => { if (token === S.token) setTimeout(videre, 350 * TEMPO); }); return; }
    // Næste opgave, når forløbet er færdigt — og tidligst som før (uanset forløbets status)
    Promise.all([fb, pause(r.forsoeg === 0 ? 900 : 1700)]).then(videre);
  }

  // Forkert: blid lyd, knappen toner ned, og hjælpetrappen tager næste trin
  function forkertSvar(opg, knap) {
    const r = S.runde;
    r.forsoeg++;
    // Først: run() stopper anden tale (Tale.stop nulstiller Tale.foerst) — så hjælpens Tale.sigFoerst skal komme efter
    Forloeb.run({ lyd: 'forkertBlid' });
    hop(r.dom.ven, 'taenk');
    saetUdtryk(r.dom.ven, 'taenker');
    if (knap && knap.classList && (knap.classList.contains('valg-knap') || knap.classList.contains('trinvis-kort'))) {
      knap.classList.add('forkert');
      knap.disabled = true;
    } else {
      hop(r.dom.svar.querySelector('.tast-display') || r.dom.visning.querySelector('.byg-felter'), 'ryst');
      r.buffer = '';
      if (r.opdaterDisplay) r.opdaterDisplay();
      if (r.bygNulstil) r.bygNulstil(); // byg ordet forfra
    }
    if (r.forsoeg === 1) registrer(opg, false);
    const tilbage = opg.valg ? r.dom.svar.querySelectorAll('.valg-knap:not(.forkert)').length : Infinity;
    const trin = opg.hjaelp[r.forsoeg - 1];
    if (trin) visHjaelp(opg, trin, tilbage <= 1);
    else visSvaret(opg);
  }

  // Første forsøg tæller i statistikken og i den tilpassede sværhedsgrad
  function registrer(opg, rigtig) {
    const r = S.runde;
    if (r.quiz) return; // 🤔 gemmer intet
    // C: Spor i sandet bedømmes aldrig (bedoemmes: false) — ingen statistik, intet niveau, ingen gentagelse, ingen fejl
    if (!O.taellerMed(opg)) return;
    // Engelsk uden lyd (oplæsning fra eller ingen fil til ordet) er gætteleg: intet gemmes, og runden mærkes (fund 3)
    if (opg.fag === 'engelsk' && !enHoeres(opg.ordEn)) { r.udenLyd = true; return; }
    // En opgave tæller kun én gang — også når en afbrudt mission fortsætter ved samme opgave
    if (r.registreret === r.i) return;
    r.registreret = r.i;
    const mission = r.test ? null : data[rundeFelt(r)];
    if (mission) mission.registreret = r.i;
    const emne = opg.emne;
    const lagerE = emneLager(emne);
    const ed = G.normaliserEmne(lagerE[emne]);
    ed.ialt++;
    if (rigtig) ed.rigtige++;
    const res = O.opdaterNiveau(ed, rigtig, emneDef(emne).maxNiveau);
    lagerE[emne] = res.data;
    if (res.aendring > 0) { r.niveauOp = true; if (mission) mission.niveauOp = true; }
    const d = G.dag(data);
    d.opgaver++;
    if (rigtig) d.rigtige++;
    if (rigtig) {
      if (opg.gentaget) G.fjernGentag(data, opg);
    } else {
      G.tilfoejGentag(data, opg);
      if (!data.fejl[emne]) data.fejl[emne] = {};
      data.fejl[emne][opg.noegle] = (data.fejl[emne][opg.noegle] || 0) + 1;
    }
    gem();
  }

  // ---------- Hjælpetrappen (fingre → terning/klodser → tallinje) ----------
  async function visHjaelp(opg, trin, visSvarBagefter) {
    const r = S.runde;
    const token = S.token;
    const i = r.i;
    const levende = () => token === S.token && S.runde === r && r.i === i;
    r.laast = true;
    r.dom.visning.classList.add('hjaelp');
    r.dom.svar.classList.add('venter'); // knapperne hviler synligt, mens hjælpen viser
    const plusVidere = trin.art === 'tael' && erPlusVisning(opg) && taelVidere(opg);
    // Den blide lyd først, så indledningen. Animationen går i gang med det samme, så barnet ser
    // noget ske; dens tal og pauser venter, til indledningen er sagt færdig (Tale.sigFoerst).
    // r.hjaelpIntro (C): opgaven har selv sagt, hvad der gik galt («Der er 7 frø i kurven …») — det er indledningen
    // Natur: trinnet har sin egen sætning («Se sporet. Dyret har pigge på ryggen.»)
    const introTekst = r.hjaelpIntro || (opg.fag === 'natur' && trin.tale ? trin.tale : plusVidere ? 'Lad os tælle videre fra det største tal.' : (HJAELP_TALE[trin.art] || 'Lad os se.'));
    r.hjaelpIntro = null;
    const intro = Tale.sigFoerst(introTekst, 250 * TEMPO);
    // Tællehjælpen («Lad os tælle …»): vennen tænker først, og tæller med (taeller), fra indledningen er sagt, til hjælpen er færdig
    if (/^Lad os tælle/.test(introTekst)) intro.then(() => { if (levende()) saetUdtryk(r.dom.ven, 'taeller'); });
    try {
      await hjaelpAnimation(opg, trin, levende);
    } catch (e) { /* hjælp er pynt — spillet fortsætter */ }
    await intro; // en animation uden tal og pauser må ikke låse op midt i indledningen
    if (!levende()) return;
    r.dom.visning.classList.remove('hjaelp');
    r.dom.svar.classList.remove('venter');
    r.laast = false;
    if (visSvarBagefter) { saetUdtryk(r.dom.ven, 'taenker'); visSvaret(opg); return; }
    saetUdtryk(r.dom.ven, grundUdtryk(opg)); // hjælpen er færdig — nu prøver barnet igen
    // «Prøv igen.» + barnets navn (klippet), hvis det er rundens tur — ellers som før. Et svar stopper forløbet (svar()).
    if (navnIRunden(r)) { if (sigMedNavn('Prøv igen.', '')) r.navnSagt = true; } else Tale.sig('Prøv igen.');
    S.gentagTale = 'Prøv igen. ' + opg.tale;
  }

  const erPlusVisning = (opg) => ['plus', 'klodser', 'fingre', 'terninger'].indexOf(opg.vis.art) >= 0 && opg.vis.b > 0;
  const taelVidere = (opg) => opg.niveau >= 2 || Math.max(opg.vis.a, opg.vis.b) >= 5;

  // Tal-mærket på en talt ting. På små ting (klodser, kugler) flytter mærket med, så det ikke dækker naboerne.
  // I «Tæl» (app.css .runde .tael-ting, kun med container queries) står mærket over tingen med plads til det, så dér kan
  // alle stå ned til 36 px: et tocifret mærke er ca. 32 px bredt (talt), og luften mellem to er ca. tingen − 30 px — målt
  // i WebKit 23-10-2026: 43 px → 13 px luft (844 × 390 med 16–20), 34 → 4, 30 → rører; ved 36 px er der ca. 6 px
  const MAERKE_GRAENSE_TAEL = 36;
  function saetTal(el, n, forrige) {
    const graense = el.closest('.runde .tael-ting') && window.CSS && CSS.supports('width', '1cqw') ? MAERKE_GRAENSE_TAEL : 44;
    if (forrige && el.offsetWidth && el.offsetWidth < graense) forrige.removeAttribute('data-n');
    el.setAttribute('data-n', n);
  }

  async function taelOp(elementer, fraTal, levende, pause) {
    for (let k = 0; k < elementer.length; k++) {
      if (!levende()) return false;
      const el = elementer[k];
      el.classList.add('talt');
      saetTal(el, fraTal + k, elementer[k - 1]);
      Lyd.tael();
      Tale.sig(String(fraTal + k));
      await vent(pause || 600);
    }
    return true;
  }

  // Sig et tal og markér en hel gruppe på én gang («5», «10»)
  async function markerGruppe(elementer, tal, levende) {
    if (!levende() || !elementer.length) return;
    elementer.forEach((el) => el.classList.add('talt'));
    elementer[elementer.length - 1].setAttribute('data-n', tal);
    Lyd.tael();
    Tale.sig(String(tal));
    await vent(1000);
  }

  function hjaelpeFelt(node) {
    const r = S.runde;
    r.dom.hjaelp.textContent = '';
    r.dom.hjaelp.parentNode.classList.toggle('med-hjaelp', !!node); // vennen træder til side
    if (node) { r.dom.hjaelp.append(node); hop(node, 'glid-ind'); }
    return node;
  }

  // Sluk alt, hjælpen «lys» har tændt (i opgavefeltet og på svarkortene)
  function slukLys(r) {
    [r.dom.visning, r.dom.svar].forEach((felt) => felt.querySelectorAll('.lyser, .har-lys').forEach((el) => el.classList.remove('lyser', 'har-lys')));
  }

  async function hjaelpAnimation(opg, trin, levende) {
    const r = S.runde;
    const vis = r.dom.visning;
    const art = trin.art;
    // Scener: det, en tidligere hjælp lyste op, slukkes, før næste hjælp viser noget nyt
    if (opg.vis.art === 'scene' && (art === 'tael' || art === 'lys')) slukLys(r);

    // D: trin for trin lyser delene (i opgavefeltet og på svarkortene), sætningen siges, og evt. tælles der
    if (art === 'lys') {
      vis.querySelectorAll('.talt').forEach((el) => { el.classList.remove('talt'); el.removeAttribute('data-n'); });
      for (const t of trin.trin || []) {
        if (!levende()) return;
        if (t.lys) {
          slukLys(r);
          t.lys.forEach((id) => [vis, r.dom.svar].forEach((felt) => felt.querySelectorAll('[data-del="' + id + '"]').forEach((el) => {
            el.classList.add('lyser');
            const kort = el.closest('.valg-knap');
            if (kort) kort.classList.add('har-lys'); // kortet hviler ikke, mens det lyser
          })));
        }
        if (t.tale) await Tale.sigVent(t.tale);
        if (!levende()) return;
        if (t.tael) {
          const omr = vis.querySelector('[data-del="' + t.tael + '"]');
          // Vennen tæller med, som i tællehjælpen (fase A) — fx frøene i Frøpostens kurv (review, fund 6)
          if (omr) { saetUdtryk(r.dom.ven, 'taeller'); await taelOp([...omr.querySelectorAll('.taelbar')], 1, levende); }
        }
        await vent(300);
      }
      // «Hvem passer ikke ind?» lyser kortene ét ad gangen: det sidste må ikke blive ved med at lyse — guld betyder «tryk her»
      if (opg.vis.art === 'lyt') slukLys(r);
      return;
    }

    // Klokken i 5-minutter: tæl 5, 10, 15 … ved tallene 1, 2, 3 … frem til den store viser — så timen
    if (art === 'urFem') {
      const [t, m] = String(trin.klokke).split(':').map(Number);
      const ur = vis.querySelector('.ur-svg');
      if (!ur) return;
      const minut = ur.querySelector('.ur-minut'), time = ur.querySelector('.ur-time');
      ur.querySelectorAll('.lyser').forEach((el) => el.classList.remove('lyser'));
      minut.classList.add('lyser');
      await vent(300);
      // D3 (spring): tæl 5, 10, 15 … fra viserens plads og «spring» minutter frem — tallene lyser undervejs
      if (trin.spring) {
        const fra = Math.round(m / 5);
        await Tale.sigVent('Den store viser peger på ' + (fra || 12) + '. Nu tæller vi ' + trin.spring + ' minutter frem.');
        for (let k = 1; k <= Math.round(trin.spring / 5); k++) {
          if (!levende()) return;
          const tx = ur.querySelector('.ur-tal[data-tal="' + (((fra + k - 1) % 12) + 1) + '"]');
          if (tx) tx.classList.add('lyser');
          Lyd.tael();
          // Vent, til tallet er sagt — et langt tal («femoghalvtreds») må ikke klippes af det næste (review #7)
          await Promise.all([Tale.sigVent(String(k * 5)), vent(trin.spring > 30 ? 500 : 800)]);
        }
        if (!levende()) return;
        const slut = (m + trin.spring) % 60;
        // Præcis på 12 (fx 1:30 + 30, 4:00 + 60) er viseren ikke «gået forbi» 12 (review #5)
        await Tale.sigVent(m + trin.spring === 60 ? 'Nu peger den store viser på 12. Så er klokken hel, og den lille viser er rykket hen til næste time.'
          : m + trin.spring > 60 ? 'Den store viser er gået forbi 12. Så er timen gået, og den lille viser er rykket videre.' : 'Nu peger den store viser på ' + (slut / 5) + '.');
        return;
      }
      for (let k = 1; k <= Math.round(m / 5); k++) {
        if (!levende()) return;
        const tx = ur.querySelector('.ur-tal[data-tal="' + k + '"]');
        if (tx) tx.classList.add('lyser');
        Lyd.tael();
        Tale.sig(String(k * 5));
        await vent(800);
      }
      if (!levende()) return;
      await Tale.sigVent('Den store viser peger på ' + Math.round(m / 5) + '. Det er ' + m + ' minutter.');
      if (!levende()) return;
      minut.classList.remove('lyser');
      time.classList.add('lyser');
      const naeste = (t % 12) + 1;
      // Efter halv er den lille viser tæt på næste time — men timen er stadig den, den er gået forbi
      await Tale.sigVent(m > 30 ? 'Den lille viser er ikke nået til ' + naeste + ' endnu. Timen er stadig ' + t + '.' : 'Den lille viser er lige gået forbi ' + t + '.');
      if (!levende()) return;
      await Tale.sigVent(m > 20 ? m + ' minutter over ' + t + '. Det hedder ' + O.klokkeNavn(trin.klokke) + '.' : 'Så er klokken ' + O.klokkeNavn(trin.klokke) + '.');
      return;
    }

    if (art === 'rute') { await ruteHjaelp(opg, trin, levende); return; }

    if (art === 'tael') {
      const alle = [...vis.querySelectorAll('.taelbar')];
      // Plus: tæl videre fra den største gruppe («6 … 7»)
      if (erPlusVisning(opg) && taelVidere(opg)) {
        const ga = alle.filter((el) => el.classList.contains('gruppe-a'));
        const gb = alle.filter((el) => el.classList.contains('gruppe-b'));
        const [stor, lille] = ga.length >= gb.length ? [ga, gb] : [gb, ga];
        await markerGruppe(stor, stor.length, levende);
        await taelOp(lille, stor.length + 1, levende);
        return;
      }
      // Mange ting i blokke af 10: «10», så tæl videre (halverer tiden) — også zebraerne ved vandhullet
      const blok = (opg.vis.art === 'ting' || opg.vis.art === 'naturTael') && opg.vis.antal > 10 ? vis.querySelector('.ting-blok') : null;
      if (blok) {
        const ti = [...blok.querySelectorAll('.taelbar')];
        await markerGruppe(ti, 10, levende);
        await taelOp(alle.filter((el) => ti.indexOf(el) < 0), 11, levende);
        return;
      }
      // En hel 10-stang: «10», så tæl videre
      const tiStang = vis.querySelector('.ti-stang');
      if (tiStang) {
        const ti = [...tiStang.querySelectorAll('.taelbar')];
        await markerGruppe(ti, 10, levende);
        await taelOp(alle.filter((el) => ti.indexOf(el) < 0), 11, levende);
        return;
      }
      // Tællestreger: 5, 10, 15 … for hvert fuldt bundt
      if (opg.vis.art === 'streger') {
        let n = 0;
        for (const b of vis.querySelectorAll('.bundt.fuldt')) { n += 5; await markerGruppe([...b.children], n, levende); }
        await taelOp([...vis.querySelectorAll('.bundt:not(.fuldt) .streg')], n + 1, levende);
        return;
      }
      await taelOp(alle, 1, levende);
      return;
    }

    if (art === 'tallinje') {
      const slut = trin.start + trin.hop;
      const lo = Math.min(trin.start, slut), hi = Math.max(trin.start, slut);
      let fra = Math.max(0, lo - 1), til = fra + 10;
      if (til < hi) { til = hi; fra = Math.max(0, til - 10); }
      const linje = hjaelpeFelt(tallinjeEl(fra, til));
      await vent(150);
      const celler = [...linje.querySelectorAll('.tl-tal')];
      const figur = linje.querySelector('.tl-figur');
      const svg = linje.querySelector('.tl-buer');
      const midt = (n) => { const c = celler[n - fra]; return c.offsetLeft + c.offsetWidth / 2; };
      const flyt = (n) => { figur.style.left = midt(n) + 'px'; celler[n - fra].classList.add('talt'); };
      svg.setAttribute('viewBox', '0 0 ' + linje.offsetWidth + ' ' + linje.offsetHeight);
      flyt(trin.start);
      Tale.sig(String(trin.start));
      await vent(1000);
      const retning = trin.hop < 0 ? -1 : 1;
      for (let k = 1; k <= Math.abs(trin.hop); k++) {
        if (!levende()) return;
        const fraN = trin.start + (k - 1) * retning, tilN = trin.start + k * retning;
        const x1 = midt(fraN), x2 = midt(tilN), y = linje.querySelector('.tl-skala').offsetTop + 4;
        const bue = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        bue.setAttribute('d', 'M' + x1 + ',' + y + ' Q' + ((x1 + x2) / 2) + ',' + (y - 34) + ' ' + x2 + ',' + y);
        bue.setAttribute('class', 'tl-bue');
        svg.append(bue);
        if (trin.taelHop) {
          // «Hvor mange mangler/forskel»: skriv og sig hoppenes antal
          const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          t.setAttribute('x', (x1 + x2) / 2); t.setAttribute('y', y - 22); t.setAttribute('class', 'tl-hop-tal');
          t.textContent = String(k);
          svg.append(t);
        }
        flyt(tilN);
        Lyd.hop();
        Tale.sig(String(trin.taelHop ? k : tilN));
        await vent(800);
      }
      if (trin.taelHop) await Tale.sigVent(Math.abs(trin.hop) === 1 ? 'Et hop.' : 'Så mange hop.');
      return;
    }

    if (art === 'fingre' || art === 'fingreMangler') {
      const a = trin.a;
      const b = art === 'fingre' ? trin.b : trin.sum - trin.a;
      const maks = a + b > 5 ? 10 : 5;
      const hd = hjaelpeFelt(haender(a, 0, maks));
      const nede = [...hd.querySelectorAll('.finger.nede')].slice(0, b);
      await markerGruppe([...hd.querySelectorAll('.finger.oppe')], a, levende);
      const fraEn = art === 'fingreMangler'; // «hvor mange mangler»: tæl de nye fingre 1, 2, 3
      for (let k = 0; k < nede.length; k++) {
        if (!levende()) return;
        nede[k].classList.remove('nede');
        nede[k].classList.add('oppe', 'talt');
        const n = fraEn ? k + 1 : a + k + 1;
        nede[k].setAttribute('data-n', n);
        Lyd.tael();
        Tale.sig(String(n));
        await vent(760);
      }
      if (fraEn) await Tale.sigVent(nede.length === 1 ? 'Der manglede en finger.' : 'Så mange fingre manglede.');
      return;
    }

    if (art === 'kugle') {
      let ramme = vis.querySelector('.kugleramme');
      if (!ramme) ramme = hjaelpeFelt(kugleramme(trin.a, trin.hel, true));
      await vent(300);
      await markerGruppe([...ramme.querySelectorAll('.gruppe-a')], trin.a, levende);
      ramme.classList.remove('skjul'); // bladet løftes
      await vent(400);
      await taelOp([...ramme.querySelectorAll('.gruppe-b')], 1, levende); // tæl de gemte: 1, 2, 3
      if (levende()) await Tale.sigVent('Så mange gemte sig under bladet.');
      return;
    }

    if (art === 'tilbage') {
      const tilbage = [...vis.querySelectorAll('.taelbar')];
      vis.querySelectorAll('.vaek').forEach((el) => el.classList.add('vaek-helt'));
      await vent(500);
      if (!tilbage.length) { await Tale.sigVent('Der er ingen tilbage. Det er nul.'); return; }
      await taelOp(tilbage, 1, levende);
      return;
    }

    if (art === 'klodserVaek' || art === 'klodserPlus' || art === 'tiFoerst') {
      const a = trin.a, b = trin.b;
      let kl = art === 'tiFoerst' ? vis.querySelector('.klodser') : null;
      if (!kl) kl = hjaelpeFelt(art === 'klodserVaek' ? klodser(a, 0) : klodser(a, b));
      if (art === 'klodserVaek') {
        const alle = [...kl.querySelectorAll('.klods')];
        Lyd.tael(); Tale.sig(String(a));
        await vent(1000);
        for (let k = 0; k < b; k++) {
          if (!levende()) return;
          const kd = alle[a - 1 - k];
          kd.classList.add('vaek');
          Lyd.tael();
          Tale.sig(String(a - 1 - k));
          await vent(760);
          // Over tieren: først de løse klodser ned til 10, så resten fra 10-stangen
          if (a > 10 && a - 1 - k === 10 && k < b - 1) await Tale.sigVent('Nu er vi nede på 10. Og så resten.');
        }
        if (levende()) await Tale.sigVent('Hvor mange er der tilbage?');
        return;
      }
      const ga = [...kl.querySelectorAll('.gruppe-a')];
      const gb = [...kl.querySelectorAll('.gruppe-b')];
      // Den største gruppe først (tælle videre / fylde op fra det største tal)
      const [stor, lille] = ga.length >= gb.length ? [ga, gb] : [gb, ga];
      await markerGruppe(stor, stor.length, levende);
      if (art === 'tiFoerst' && stor.length < 10 && a + b > 10) {
        // Fyld den største stang op til 10 med klodser fra den mindste — så resten
        const stang = stor[0].parentNode;
        const fyld = lille.slice(0, 10 - stor.length);
        await Tale.sigVent(stor.length + ' og ' + fyld.length + ' er 10\'er-venner. Først op til 10.');
        for (let k = 0; k < fyld.length; k++) {
          if (!levende()) return;
          stang.append(fyld[k]);
          fyld[k].classList.add('talt');
          saetTal(fyld[k], stor.length + k + 1, fyld[k - 1]);
          Lyd.tael();
          Tale.sig(String(stor.length + k + 1));
          await vent(760);
        }
        stang.classList.add('ti-stang');
        if (stang.previousElementSibling) stang.parentNode.prepend(stang); // 10-stangen øverst, resten under
        hop(stang, 'pop');
        await Tale.sigVent('10. Og så resten.');
        await taelOp(lille.slice(10 - stor.length), 11, levende);
        return;
      }
      await taelOp(lille, stor.length + 1, levende);
      return;
    }

    if (art === 'forskel') {
      const ta = [...vis.querySelectorAll('.taarn-a .klods')];
      const tb = [...vis.querySelectorAll('.taarn-b .klods')];
      const lav = Math.min(ta.length, tb.length);
      // Klodser i samme højde passer sammen — de ekstra er forskellen
      for (let k = 0; k < lav; k++) { ta[k].classList.add('parret'); tb[k].classList.add('parret'); }
      await Tale.sigVent('De her passer sammen.');
      const ekstra = (ta.length > tb.length ? ta : tb).slice(lav);
      await taelOp(ekstra, 1, levende);
      if (levende()) await Tale.sigVent('Så mange flere er der. Det er forskellen.');
      return;
    }

    if (art === 'parvis') {
      // Flest/færrest: sæt én fra hver gruppe sammen ad gangen
      const ka = [...r.dom.svar.querySelectorAll('.valg-knap[data-v="a"] .ting')];
      const kb = [...r.dom.svar.querySelectorAll('.valg-knap[data-v="b"] .ting')];
      const lav = Math.min(ka.length, kb.length);
      for (let k = 0; k < lav; k++) {
        if (!levende()) return;
        ka[k].classList.add('parret'); kb[k].classList.add('parret');
        Lyd.tael();
        await vent(420);
      }
      const ekstra = (ka.length > kb.length ? ka : kb).slice(lav);
      // Flest: dem til overs lyser (der er svaret). Færrest: de dæmpes — øjet skal over til den anden gruppe.
      ekstra.forEach((el) => el.classList.add(opg.vis.spoerg === 'faerrest' ? 'overs' : 'talt'));
      await Tale.sigVent(opg.vis.spoerg === 'faerrest'
        ? 'Her er nogle til overs. Så er der færrest i den anden gruppe.'
        : 'Her er nogle til overs. Der er flest her.');
      return;
    }

    if (art === 'par') {
      const soejler = [...vis.querySelectorAll('.par-soejle')];
      for (let k = 0; k < soejler.length; k++) {
        if (!levende()) return;
        soejler[k].classList.add('talt');
        Lyd.tael();
        await vent(380);
      }
      const alene = vis.querySelector('.par-soejle.alene');
      if (alene) hop(alene, 'pop');
      await Tale.sigVent(alene ? 'En klods står alene uden makker. Så er tallet ulige.' : 'Alle klodser har en makker. Så er tallet lige.');
      return;
    }

    if (art === 'visTal') {
      const n = trin.tal;
      const tiere = Math.floor(n / 10), enere = n % 10;
      hjaelpeFelt(h('div', { class: 'vis-tal' },
        h('div', { class: 'vis-tal-tal' }, String(n)),
        n > 20 ? staenger(tiere, enere) : n > 0 ? klodser(n, 0) : null));
      let tekst = 'Sådan ser ' + n + ' ud. Find det samme tal.';
      if (n > 20) tekst = 'Sådan ser ' + n + ' ud. Det er ' + tiere + ' tiere' + (enere === 1 ? ' og 1 ener' : enere ? ' og ' + enere + ' enere' : '') + '. Find det samme tal.';
      else if (n > 10) tekst = 'Sådan ser ' + n + ' ud. Det er 10 og ' + (n - 10) + '. Find det samme tal.';
      await Tale.sigVent(tekst);
      return;
    }

    if (art === 'sammenlign') {
      const kol = trin.tal.map((t) => h('span', { class: 'taarn-kolonne' },
        h('span', { class: 'taarn' }, Array.from({ length: t }, () => h('i', { class: 'klods tema' }))),
        h('b', { class: 'taarn-tal' }, String(t))));
      // Tårnene står i selve opgavefeltet (der er plads til 20 klodser), krokodillen træder til side
      vis.textContent = '';
      vis.append(h('div', { class: 'taarne sammenlign' + (Math.max.apply(null, trin.tal) > 10 ? ' hoeje' : '') }, kol));
      hop(kol[opg.vis.spoerg === 'mindst' ? 0 : kol.length - 1], 'pop');
      await Tale.sigVent(opg.vis.spoerg === 'mindst' ? 'Det mindste tal har det laveste tårn.' : 'Det største tal har det højeste tårn.');
      return;
    }

    if (art === 'talstreg') {
      const celler = [...vis.querySelectorAll('.tal-celle')];
      const idx = celler.findIndex((c) => c.classList.contains('hul'));
      const foer = celler.slice(0, idx);
      const liste = foer.length ? foer : celler.slice(idx + 1).reverse();
      for (const c of liste) {
        if (!levende()) return;
        c.classList.add('talt');
        Lyd.tael();
        Tale.sig(c.getAttribute('data-tal'));
        await vent(760);
      }
      hop(celler[idx], 'pop');
      await Tale.sigVent(foer.length ? 'Og så kommer?' : 'Og før det?');
      return;
    }

    if (art === 'raekke' || art === 'moenster') {
      const celler = [...vis.querySelectorAll(art === 'raekke' ? '.tal-celle' : '.brik-celle')];
      for (const c of celler) {
        if (!levende()) return;
        if (c.classList.contains('hul')) {
          hop(c, 'pop');
          await Tale.sigVent('Og så?');
          continue;
        }
        c.classList.add('talt');
        Lyd.tael();
        const brik = O.MOENSTER_BRIKKER[c.getAttribute('data-brik')];
        Tale.sig(art === 'raekke' ? c.getAttribute('data-tal') : (brik ? brik.navn : ''));
        await vent(art === 'raekke' ? 900 : 780);
      }
      if (art === 'raekke' && opg.vis.trin && Math.abs(opg.vis.trin) !== 1) {
        await Tale.sigVent(opg.vis.trin > 0 ? 'Vi lægger ' + opg.vis.trin + ' til hver gang.' : 'Vi trækker ' + (-opg.vis.trin) + ' fra hver gang.');
      } else if (art === 'raekke' && opg.vis.trin === -1) {
        await Tale.sigVent('Vi tæller ned.');
      }
      return;
    }

    if (art === 'staenger') {
      const st = [...vis.querySelectorAll('.stang')];
      for (let k = 0; k < st.length; k++) {
        if (!levende()) return;
        st[k].classList.add('talt');
        st[k].setAttribute('data-n', (k + 1) * 10);
        Lyd.tael();
        Tale.sig(String((k + 1) * 10));
        await vent(850);
      }
      await taelOp([...vis.querySelectorAll('.ener')], st.length * 10 + 1, levende, 760);
      return;
    }

// Ekstra: klokken — viserne forklares, og uret vises med navn
    if (art === 'urVisere') {
      const [t, m] = String(opg.svar).split(':').map(Number);
      const ur = vis.querySelector('.ur-svg');
      const minut = ur && ur.querySelector('.ur-minut'), time = ur && ur.querySelector('.ur-time');
      if (minut) minut.classList.add('lyser');
      if (m === 15 || m === 45) {
        // Kvart: markér en kvart omgang (12 → 3 eller 9 → 12), og tæl 5, 10, 15 på de tre tal
        const over = m === 15;
        if (ur && !ur.querySelector('.ur-kvart')) {
          const kile = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          kile.setAttribute('d', over ? 'M50 50 L50 6 A44 44 0 0 1 94 50 Z' : 'M50 50 L6 50 A44 44 0 0 1 50 6 Z');
          kile.setAttribute('class', 'ur-kvart');
          ur.insertBefore(kile, ur.querySelector('.ur-skive').nextSibling); // under tallene, så de står skarpt
        }
        await Tale.sigVent(over
          ? 'Den store viser peger på 3. Den er gået en kvart omgang fra 12.'
          : 'Den store viser peger på 9. Der mangler en kvart omgang, før den er ved 12.');
        for (const [k, tal] of (over ? [[1, 5], [2, 10], [3, 15]] : [[10, 5], [11, 10], [12, 15]])) {
          if (!levende()) return;
          const tx = ur && ur.querySelector('.ur-tal[data-tal="' + k + '"]');
          if (tx) tx.classList.add('lyser');
          Lyd.tael();
          Tale.sig(String(tal));
          await vent(850);
        }
        if (!levende()) return;
        await Tale.sigVent(over ? '15 minutter. Det er et kvarter. Så er klokken kvart over.' : 'Der mangler 15 minutter. Det er et kvarter. Så er klokken kvart i.');
        if (!levende()) return;
        if (minut) minut.classList.remove('lyser');
        if (time) time.classList.add('lyser');
        await Tale.sigVent(over
          ? 'Den lille viser er lige gået forbi ' + t + '. Så er klokken ' + O.klokkeNavn(opg.svar) + '.'
          : 'Den lille viser er næsten ved ' + ((t % 12) + 1) + '. Så er klokken ' + O.klokkeNavn(opg.svar) + '.');
        return;
      }
      await Tale.sigVent(m === 30 ? 'Den store viser peger på 6. Så er klokken halv.' : 'Den store viser peger på 12. Så er klokken hel.');
      if (!levende()) return;
      if (minut) minut.classList.remove('lyser');
      if (time) time.classList.add('lyser');
      await Tale.sigVent(m === 30
        ? 'Den lille viser er gået forbi ' + t + '. Den er på vej mod ' + ((t % 12) + 1) + '. Så er klokken halv ' + O.klokkeNavn(((t % 12) + 1) + ':00') + '.'
        : 'Den lille viser peger på ' + t + '. Så er klokken ' + O.klokkeNavn(opg.svar) + '.');
      return;
    }
    // C · Urværkstedet trin 1: den lille viser lyser, og målet ved timetallet lyser (det bliver ved med at lyse)
    if (art === 'stilLille') {
      const felt = r.dom.svar.querySelector('.stil-ur');
      if (!felt) return;
      felt.querySelectorAll('.lyser').forEach((el) => el.classList.remove('lyser'));
      const t = Number(String(trin.klokke).split(':')[0]) % 12 || 12;
      await vent(150);
      if (!levende()) return;
      felt.querySelector('.ur-time').classList.add('lyser');
      const maal = [...felt.querySelectorAll('.stil-maal')].find((k) => k.textContent === String(t));
      if (maal) maal.classList.add('lyser');
      await Tale.sigVent('Den lille viser skal pege på ' + t + '.');
      return;
    }
    // C · Urværkstedet trin 3: den store viser flyttes ét kvarter ad gangen fra «fra» og tilbage igen — så vælger barnet
    if (art === 'stilKvarter') {
      const felt = r.dom.svar.querySelector('.stil-ur');
      if (!felt) return;
      felt.querySelectorAll('.lyser').forEach((el) => el.classList.remove('lyser'));
      const [t0, m0] = String(trin.fra).split(':').map(Number);
      const tid = (k) => { const x = t0 * 60 + m0 + 15 * k; return (((Math.floor(x / 60) - 1) % 12) + 1) + ':' + String(x % 60).padStart(2, '0'); };
      const ORD = ['Et kvarter.', 'To kvarterer. Det er en halv time.', 'Tre kvarterer.', 'Fire kvarterer. Det er en hel time.'];
      await vent(150);
      if (!levende()) return;
      await drejUr(felt, trin.fra);
      const minut = felt.querySelector('.ur-minut');
      minut.classList.add('lyser');
      for (let k = 1; k <= (trin.kvarterer || 2); k++) {
        if (!levende()) return;
        await drejUr(felt, tid(k));
        if (!levende()) return;
        await Tale.sigVent(ORD[k - 1] || '');
      }
      if (!levende()) return;
      await vent(300);
      await drejUr(felt, trin.fra);
      minut.classList.remove('lyser');
      return;
    }
    // Stil viserne: trin 1 stiller uret på den hele time, der nævnes; trin 2 flytter derfra til facit
    if (art === 'stilHel' || art === 'stilFlyt') {
      const felt = r.dom.svar.querySelector('.stil-ur');
      if (!felt) return;
      const ur = felt.querySelector('.ur-svg');
      const lys = (sel) => { const el = ur.querySelector(sel); if (el) el.classList.add('lyser'); };
      felt.querySelectorAll('.lyser').forEach((el) => el.classList.remove('lyser'));
      const hel = opg.hjaelp[0].klokke;
      const naevnt = Number(hel.split(':')[0]);
      const navn = O.klokkeNavn(hel);
      const m = Number(String(opg.svar).split(':')[1]);
      await vent(150); // indledningen først — så bevæger uret sig
      if (!levende()) return;
      await drejUr(felt, hel);
      if (!levende()) return;
      if (art === 'stilHel') {
        lys('.ur-time');
        // Ligger timetallet under et mål, er det fjernet fra uret (stilUr) — så lyser målknappen med tallet
        const maal = [...felt.querySelectorAll('.stil-maal')].find((k) => k.textContent === String(naevnt));
        if (maal) maal.classList.add('lyser'); else lys('.ur-tal[data-tal="' + naevnt + '"]');
        await Tale.sigVent('Sådan ser klokken ' + navn + ' ud. Den lille viser peger på ' + naevnt + '.');
        return;
      }
      await Tale.sigVent(m === 15 ? 'Kvart over ' + navn + ' er et kvarter efter ' + navn + '.'
        : m === 45 ? 'Kvart i ' + navn + ' er et kvarter før ' + navn + '.'
          : 'Halv ' + navn + ' er en halv time før ' + navn + '.');
      if (!levende()) return;
      lys('.ur-minut');
      await drejUr(felt, trin.klokke);
      if (!levende()) return;
      ur.querySelector('.ur-minut').classList.remove('lyser');
      lys('.ur-time');
      await Tale.sigVent(m === 15 ? 'Den lille viser er lige gået forbi ' + naevnt + '.'
        : 'Den lille viser er ikke nået til ' + naevnt + ' endnu.' + (m === 30 ? ' Den er halvvejs.' : ''));
      return;
    }
    if (art === 'visUr') {
      hjaelpeFelt(h('div', { class: 'vis-ur' }, urSvg(trin.klokke), h('div', { class: 'vis-ur-tid' }, trin.klokke)));
      await Tale.sigVent('Sådan ser klokken ' + O.klokkeNavn(trin.klokke) + ' ud.' + (opg.valgArt === 'ur' ? ' Find det samme ur.' : ''));
      return;
    }
    // Ekstra: mønter — tæl videre fra den største mønt
    if (art === 'moenter') {
      const pladser = [...vis.querySelectorAll('.moent-plads')];
      let sum = 0;
      for (const p of pladser) {
        if (!levende()) return;
        sum += Number(p.getAttribute('data-kr'));
        p.classList.add('talt');
        Lyd.tael();
        await Tale.sigVent(String(sum));
      }
      await Tale.sigVent('Det er ' + sum + ' kroner i alt.');
      return;
    }

    if (art === 'visForm') {
      const form = trin.form;
      hjaelpeFelt(h('div', { class: 'form-stor lille' }, formSvg(form, 1, 0, true)));
      const F = O.FORMER[form];
      let tekst = 'Sådan ser ' + F.ubestemt + ' ud.' + (F.hjoerner ? ' Den har ' + F.hjoerner + ' hjørner.' : ' Den er rund og har ingen hjørner.');
      if (form === 'kvadrat') tekst = 'Sådan ser et kvadrat ud. Det har fire rette hjørner, og alle kanter er lige lange.';
      if (form === 'rektangel') tekst = 'Sådan ser et rektangel ud. Det har fire rette hjørner.';
      await Tale.sigVent(tekst);
      return;
    }

    // ---- Engelsk: det rigtige billede vises, og ordet siges på engelsk og så på dansk (to ytringer) ----
    // ---- Natur: sporet kommer frem og lyser (stemmen siger en ledetråd), så lyser det rigtige dyr ----
    // Indledningen er trinnets egen sætning (visHjaelp); vent() venter, til den er sagt
    if (art === 'naturSpor') {
      const spor = vis.querySelector('.natur-spor');
      if (spor) { spor.classList.remove('skjult'); spor.classList.add('lyser'); hop(spor, 'pop'); }
      await vent(700);
      if (spor) spor.classList.remove('lyser');
      return;
    }
    if (art === 'visNatur') {
      const kort = [...r.dom.svar.querySelectorAll('.valg-knap')].find((k) => k.getAttribute('data-v') === opg.svar);
      if (kort) kort.classList.add('lytter'); // fuld styrke og guldkant; de andre kort hviler (app.css .natur-opgave)
      await vent(500);
      if (kort) kort.classList.remove('lytter');
      return;
    }
    if (art === 'visEngelsk') {
      hjaelpeFelt(h('div', { class: 'eng-hjaelp' }, engelskBillede(opg.svar)));
      // Det rigtige svarkort lyser med fuld styrke og guldkant, mens ordet siges (som de danske kort, der læses op);
      // de andre hviler (app.css: .engelsk-opgave .svar-panel.venter)
      const kort = [...r.dom.svar.querySelectorAll('.valg-knap')].find((k) => k.getAttribute('data-v') === opg.svar);
      if (kort) kort.classList.add('lytter');
      await vent(200);
      if (!levende()) return;
      await Tale.sigEnVent(opg.ordEn);
      if (!levende()) return;
      await vent(250);
      if (levende()) await Tale.sigVent(opg.ordDa);
      if (kort) kort.classList.remove('lytter');
      return;
    }

    // ---- Dansk (B4): hør igen langsomt → vis bogstavet med et billede → (svaret lyser) ----
    if (art === 'hoerIgen') {
      // C · Lydtoget: den AKTIVE vogns lyd (ikke kun den første) — to gange med en pause
      const tv = r.trinvis && opg.byg && opg.byg.vogne ? opg.byg.vogne[r.trinvis.aktiv()] : null;
      if (tv && tv.lyd) {
        await vent(200);
        for (let k = 0; k < 2 && levende(); k++) { await Lyd.klip(tv.lyd.klip, tv.lyd.reserve); await vent(700); }
        return;
      }
      await sigOpgave(opg, '', !!trin.langsomt);
      return;
    }
    // C · Fortællebroen: historien genfortælles kun frem til og med den aktive plads
    if (art === 'fortaelTil') {
      const k = r.trinvis ? r.trinvis.aktiv() : 0;
      await vent(200);
      if (levende()) await Tale.sigVent((opg.vis.historie || []).slice(0, k + 1).join(' '));
      return;
    }
    // C · Fortællebroen: billedet til den aktive plads lyser, og dets sætning siges (det bliver ved med at lyse)
    if (art === 'naesteBrik') {
      const k = r.trinvis ? r.trinvis.aktiv() : 0;
      const b = opg.svar.split(opg.byg.adskil)[k];
      const brik = [...r.dom.svar.querySelectorAll('.trinvis-kort')].find((x) => x.getAttribute('data-b') === b);
      if (brik) brik.classList.add('lyser');
      await vent(200);
      if (levende()) await Tale.sigVent((opg.vis.historie || [])[k] || '');
      return;
    }
    if (art === 'visBogstav') {
      // Natur, «Hvilket dyr starter med …?»: scenens eget billede og bogstav lyser (på niveau 3 kommer bogstavet frem på sin
      // plads) i stedet for en kopi nederst — kopien tog feltets højde, så scenen skrumpede (UI-review 22-10-2026)
      const par = opg.vis.art === 'naturLyd' ? vis.querySelector('.natur-lyd-par') : null;
      const kort = par && par.querySelector('.bogstav-kort');
      if (kort) { kort.classList.remove('gemt'); hop(kort, 'pop'); par.classList.add('lyser'); } else {
        hjaelpeFelt(h('div', { class: 'vis-bogstav' }, bogstavKort(trin.bogstav), trin.e ? h('span', { class: 'vis-bogstav-e', 'aria-hidden': 'true' }, ordTegn(trin.e)) : null,
          trin.ord ? h('span', { class: 'vis-bogstav-ord' }, trin.ord) : null));
      }
      await vent(200);
      if (!levende()) return;
      if (opg.emne === 'alfabet') { await Tale.sigVent('Sådan ser det ud.'); return; }
      await Lyd.klip(D.lydId(trin.bogstav), D.lydReserve(trin.bogstav));
      if (levende() && trin.ord) await Tale.sigVent(stort(trin.ord) + (trin.midt ? ' har den lyd i midten.' : trin.slut || opg.type === 'udlyd' ? ' slutter med den lyd.' : ' starter med den lyd.'));
      if (kort) par.classList.remove('lyser'); // bogstavet bliver stående
      return;
    }
    // D2: hele alfabetet (ikke knapper) — de nævnte bogstaver er markeret og lyser op ét ad gangen.
    // Store bogstaver, når opgaven viser det store bogstav (hylderne A–G …), ellers små som brikkerne
    if (art === 'alfabetVis') {
      const naevnt = trin.bogstaver || [];
      const store = opg.vis && opg.vis.art === 'stortBogstav';
      const felt = hjaelpeFelt(h('div', { class: 'alfabet-vis', 'aria-hidden': 'true' },
        D.ALFABET.map((b) => h('span', { class: 'alfabet-vis-b' + (naevnt.indexOf(b) >= 0 ? ' naevnt' : ''), 'data-b': b }, store ? b.toUpperCase() : b))));
      await vent(300);
      for (const c of felt.querySelectorAll('.naevnt')) {
        if (!levende()) return;
        hop(c, 'pop');
        Lyd.tael();
        await vent(550);
      }
      if (levende()) await Tale.sigVent(naevnt.length > 1 ? 'Se, hvor de står i alfabetet.' : 'Se, hvor det står i alfabetet.');
      return;
    }
    // D2 (skiftBogstav): pladsen, der skal skiftes, får sin stiplede ring først nu
    if (art === 'visPlads') {
      const b = vis.querySelectorAll('.ord-bogstav')[opg.vis.plads];
      if (b) { b.classList.add('ret'); hop(b, 'pop'); }
      await vent(300);
      if (levende()) await Tale.sigVent('Det er det bogstav, der skal skiftes.');
      return;
    }
    // D3 (delOrd): lydene i det første ord ét ad gangen, mens bogstavet lyser i strimlen (resten af svaret siges ikke)
    if (art === 'lydFoerste') {
      const strimmel = vis.querySelector('.strimmel');
      const bogstaver = trin.bogstaver || [];
      await vent(200); // indledningen først — et indtalt klip venter ikke selv på den
      for (let k = 0; k < bogstaver.length; k++) {
        if (!levende()) return;
        const el = strimmel ? strimmel.querySelector('.strimmel-b[data-i="' + k + '"]') : null;
        if (el) el.classList.add('lyser');
        await Lyd.klip(D.lydId(bogstaver[k]), D.lydReserve(bogstaver[k]));
        if (el) el.classList.remove('lyser');
        await vent(250);
      }
      return;
    }
    // Svarkort med scener (Historiebogen): hvert kort læses op, mens det lyser
    if (art === 'laesKort') {
      for (const k of [...r.dom.svar.querySelectorAll('.valg-knap:not(.forkert)')]) {
        if (!levende()) return;
        const kort = opg.kort && opg.kort[k.getAttribute('data-v')];
        k.classList.add('lytter');
        await Tale.sigVent(kort ? kort.navn : k.getAttribute('aria-label'));
        k.classList.remove('lytter');
        await vent(250);
      }
      return;
    }
    // Byg (D1): den brik, der skal først, lyser, og dens sætning siges. Den bliver ved med at lyse
    if (art === 'foersteBrik') {
      const brik = [...r.dom.svar.querySelectorAll('.byg-brik')].find((b) => b.getAttribute('data-t') === trin.brik);
      if (brik) brik.classList.add('lyser');
      await vent(200);
      if (levende() && trin.tale) await Tale.sigVent(trin.tale);
      return;
    }
    // Huskekort (D1): kortene vendes op og bliver liggende sådan; hvert kort siges, mens det lyser
    if (art === 'vendOp') {
      r.vendtOp = true;
      const valg = r.dom.svar.querySelector('.valg');
      if (valg) valg.classList.remove('vendt');
      await vent(450);
      for (const k of [...r.dom.svar.querySelectorAll('.valg-knap:not(.forkert)')]) {
        if (!levende()) return;
        k.classList.add('lytter');
        await Tale.sigVent(k.getAttribute('data-v') + '.');
        k.classList.remove('lytter');
      }
      return;
    }
    // Håndskrift (D1): ved siden af det trykte bogstav skrives det håndskrevne langsomt, strøg for strøg
    if (art === 'skrivBogstav') {
      const billede = vis.querySelector('.dansk-billede');
      if (!billede) return;
      const gammel = billede.querySelector('.skrevet-felt');
      if (gammel) gammel.remove();
      const svg = haandskriftSvg(trin.bogstav);
      billede.append(h('span', { class: 'skrevet-felt' }, svg));
      const streger = [...svg.querySelectorAll('.haandskrift-streg')];
      const laengde = streger.map((st) => (st.getTotalLength ? st.getTotalLength() : 100) || 1);
      streger.forEach((st, k) => { st.style.strokeDasharray = laengde[k] + ' ' + laengde[k]; st.style.strokeDashoffset = String(laengde[k]); });
      await vent(300);
      for (let k = 0; k < streger.length; k++) {
        if (!levende()) return;
        const ms = Math.max(450, laengde[k] * 14);
        streger[k].style.transition = 'stroke-dashoffset ' + Math.round(ms * TEMPO) + 'ms linear';
        void streger[k].getBoundingClientRect();
        streger[k].style.strokeDashoffset = '0';
        await vent(ms + 250);
      }
      if (!levende()) return;
      await Tale.sigVent('Sådan skriver vi ' + (D.NAVNE[trin.bogstav] || trin.bogstav) + ' i hånden. Find det samme.');
      return;
    }
    if (art === 'visOrd') {
      hjaelpeFelt(h('div', { class: 'vis-bogstav' }, h('span', { class: 'vis-bogstav-ord' }, trin.ord)));
      await Tale.sigVent('Sådan ser ' + trin.ord + ' ud.');
      return;
    }
    if (art === 'rimLyt') {
      const knapper = [...r.dom.svar.querySelectorAll('.valg-knap:not(.forkert)')].filter((k) => k.getAttribute('data-v') !== trin.stik);
      for (const k of knapper) {
        if (!levende()) return;
        k.classList.add('lytter');
        await Tale.sigVent(trin.stik + ' — ' + k.getAttribute('data-v') + '.');
        k.classList.remove('lytter');
        await vent(300);
      }
      return;
    }
    if (art === 'alfabetSang') {
      for (const c of [...vis.querySelectorAll('.alfabet-celle')]) {
        if (!levende()) return;
        if (c.classList.contains('hul')) { hop(c, 'pop'); await Tale.sigVent('Og så?'); continue; }
        c.classList.add('talt');
        Tale.sig(D.NAVNE[c.getAttribute('data-b')] || c.getAttribute('data-b'));
        await vent(750);
      }
      return;
    }

    if (art === 'figurHjoerner') { await figurHjaelp(opg, trin, levende); return; }
    if (art === 'cmHop') { await cmHjaelp(opg, levende); return; }
    if (art === 'hjoerner' || art === 'kanter') {
      const dele = [...vis.querySelectorAll(art === 'hjoerner' ? '.hjoerne' : '.kant')];
      if (!dele.length) {
        await Tale.sigVent('En cirkel er rund. Den har ingen hjørner.');
        return;
      }
      for (let k = 0; k < dele.length; k++) {
        if (!levende()) return;
        dele[k].classList.add('talt');
        Lyd.tael();
        Tale.sig(String(k + 1));
        await vent(800);
      }
    }
  }

  // =====================================================================
  //  TEGNEBYEN (B6): sømbræt, lineal og klodser — finger, pen og mus (Pointer Events)
  // =====================================================================
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, a, forael) => { const n = document.createElementNS(SVG_NS, tag); for (const k in a) n.setAttribute(k, a[k]); if (forael) forael.append(n); return n; };
  // Tegner igen, når feltet skifter størrelse (fx når iPad'en vendes midt i opgaven).
  // fn kører i næste frame, ikke i selve ResizeObserver-kaldet: fn må gerne ændre feltets egen størrelse
  // (klodserne gør det via --k) — ellers sender Safari «ResizeObserver loop completed with undelivered notifications»
  // Et felt, der er væk fra skærmen (næste opgave, kortet), holder op med at lytte: når det opdager det selv, og når
  // det næste felt begynder at lytte — ellers hobede ResizeObservere og resize-lyttere sig op opgave for opgave
  const stoerrelsesVagter = new Set();
  const vedStoerrelse = (el, fn) => {
    stoerrelsesVagter.forEach((v) => { if (v.vist && !v.el.isConnected) v.stop(); });
    let ventende = 0, ro = null;
    const v = { el: el, vist: false };
    const koer = () => { if (el.isConnected) { v.vist = true; fn(); } else if (v.vist) v.stop(); };
    const senere = () => { if (!ventende) ventende = requestAnimationFrame(() => { ventende = 0; koer(); }); };
    v.stop = () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', koer); stoerrelsesVagter.delete(v); };
    stoerrelsesVagter.add(v);
    if (window.ResizeObserver) { ro = new ResizeObserver(senere); ro.observe(el); } else window.addEventListener('resize', koer);
    setTimeout(() => { if (el.isConnected) v.vist = true; fn(); }, 0);
  };

  // Sømbræt: prikkerne er knapper (≥ 52 px); stregerne tegnes i en SVG ovenpå. Den grønne prik er sat på forhånd.
  function soembraet(opg) {
    const v = opg.vis;
    const r = S.runde;
    const tavle = h('div', { class: 'soembraet', style: '--kol:' + v.kol + ';--raek:' + v.raek });
    const svg = svgEl('svg', { class: 'soem-streger', 'aria-hidden': 'true' });
    tavle.append(svg);
    const prikker = {};
    for (let y = 0; y < v.raek; y++) for (let x = 0; x < v.kol; x++) {
      prikker[x + ',' + y] = h('button', { class: 'soem-prik', type: 'button', 'data-x': x, 'data-y': y, 'aria-label': 'Prik ' + (x + 1) + ', ' + (y + 1), onclick: () => trykPrik(x, y) }, h('i', { 'aria-hidden': 'true' }));
      tavle.append(prikker[x + ',' + y]);
    }
    const st = { punkter: [v.start.slice()], lukket: false, markoer: v.start.slice(), vis: null, tast: false };
    r.figur = st;
    const center = ([x, y]) => {
      const t = tavle.getBoundingClientRect(), q = prikker[x + ',' + y].getBoundingClientRect();
      return [Math.round(q.left + q.width / 2 - t.left), Math.round(q.top + q.height / 2 - t.top)];
    };
    function tegn() {
      const t = tavle.getBoundingClientRect();
      svg.setAttribute('viewBox', '0 0 ' + Math.max(1, Math.round(t.width)) + ' ' + Math.max(1, Math.round(t.height)));
      svg.textContent = '';
      if (st.vis) svgEl('polygon', { points: st.vis.map((p) => center(p).join(',')).join(' '), class: 'soem-vis' }, svg);
      // Hjælpen: de sider, der er talt, lyser
      if (st.vis && st.taltSider) for (let k = 0; k < st.taltSider; k++) {
        const a = center(st.vis[k]), b = center(st.vis[(k + 1) % st.vis.length]);
        svgEl('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'soem-talt-side' }, svg);
      }
      const pts = st.punkter.map(center);
      if (st.lukket) pts.push(pts[0]);
      if (pts.length > 1) svgEl('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'soem-linje' + (st.lukket ? ' lukket' : '') }, svg);
      for (const k in prikker) { prikker[k].classList.remove('valgt', 'foerste', 'markoer', 'vis-hjoerne'); prikker[k].removeAttribute('data-n'); }
      st.punkter.forEach(([x, y], i) => prikker[x + ',' + y].classList.add(i === 0 ? 'foerste' : 'valgt'));
      // «Vis svaret»: alle hjørner med nummer. Hjælpen: kun dem, der er talt indtil nu
      if (st.vis) st.vis.forEach(([x, y], i) => {
        if (st.iHjaelp && i >= st.taltHjoerner) return;
        const b = prikker[x + ',' + y]; b.classList.add('vis-hjoerne'); b.setAttribute('data-n', i + 1);
      });
      if (st.tast) prikker[st.markoer.join(',')].classList.add('markoer');
    }
    function trykPrik(x, y) {
      if (r.laast || st.lukket || S.runde !== r) return;
      Lyd.init();
      const [fx, fy] = st.punkter[0];
      const sidst = st.punkter[st.punkter.length - 1];
      if (x === sidst[0] && y === sidst[1]) return;
      if (x === fx && y === fy) {
        if (st.punkter.length < 3) { Lyd.blid(); return; }
        // Figuren er lukket: vurderes (hjørner, sider, rette vinkler) — et kvadrat er også en firkant
        st.lukket = true;
        Lyd.tryk();
        tegn();
        const res = O.vurderFigur(st.punkter);
        // Runden er låst, mens den lukkede figur vises — så vurderes den
        r.laast = true;
        setTimeout(() => { if (S.runde === r) { r.laast = false; svar(O.figurPasser(v.form, res.type) ? 'ok' : 'nej', null); } }, 450);
        return;
      }
      if (st.punkter.some(([px, py]) => px === x && py === y)) { Lyd.blid(); return; }
      Lyd.tryk();
      st.punkter.push([x, y]);
      tegn();
    }
    st.tryk = trykPrik;
    st.fortryd = () => { if (r.laast || st.lukket || st.punkter.length < 2) return; Lyd.init(); Lyd.tryk(); st.punkter.pop(); tegn(); };
    st.nulstil = () => { st.punkter = [st.punkter[0]]; st.lukket = false; tegn(); };
    st.tegn = tegn;
    r.bygNulstil = st.nulstil; // et forkert svar: tegn forfra fra den grønne prik
    // Fysisk tastatur: piletaster flytter markøren, Enter trykker på prikken, Backspace fortryder
    st.taster = (e) => {
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (d) {
        e.preventDefault();
        st.tast = true;
        st.markoer = [Math.min(v.kol - 1, Math.max(0, st.markoer[0] + d[0])), Math.min(v.raek - 1, Math.max(0, st.markoer[1] + d[1]))];
        tegn();
      } else if (e.key === 'Enter') { e.preventDefault(); trykPrik(st.markoer[0], st.markoer[1]); }
      else if (e.key === 'Backspace') { e.preventDefault(); st.fortryd(); }
    };
    vedStoerrelse(tavle, tegn);
    return h('div', { class: 'soem-felt' }, h('div', { class: 'soem-maal', 'aria-hidden': 'true' }, formSvg(v.form, 2, 0, false)), tavle);
  }

  // Tegnebyen (D): gå efter opskriften. Prikgitteret er sømbrættets; vejen tegnes fra den grønne prik, og kun
  // nabo-prikkerne ved vejens ende kan trykkes (højre, venstre, op, ned — ikke tilbage og ikke over vejen).
  // Når vejen er lige så lang som opskriften, vurderes den med Opgaver.rutePasser.
  const RUTE_ORD = { hoejre: 'til højre', venstre: 'til venstre', op: 'op', ned: 'ned' };
  const RUTE_TAL = ['nul', 'ét', 'to', 'tre', 'fire', 'fem', 'seks'];
  const ruteBenTekst = (ret, n) => (RUTE_TAL[n] || String(n)) + ' ' + (n === 1 ? 'felt' : 'felter') + ' ' + RUTE_ORD[ret];
  function rutebraet(opg) {
    const v = opg.vis;
    const r = S.runde;
    const tavle = h('div', { class: 'soembraet rute-braet', style: '--kol:' + v.kol + ';--raek:' + v.raek });
    const svg = svgEl('svg', { class: 'soem-streger', 'aria-hidden': 'true' });
    tavle.append(svg);
    const prikker = {};
    for (let y = 0; y < v.raek; y++) for (let x = 0; x < v.kol; x++) {
      prikker[x + ',' + y] = h('button', { class: 'soem-prik', type: 'button', 'data-x': x, 'data-y': y, 'aria-label': 'Prik ' + (x + 1) + ', ' + (y + 1), onclick: (e) => trykPrik(x, y, e) }, h('i', { 'aria-hidden': 'true' }));
      tavle.append(prikker[x + ',' + y]);
    }
    // Opskriften: ét ben pr. linje, en pil pr. skridt (➡️➡️ / ⬆️). Hjælpen lyser det ben, den viser
    const ben = (v.pile || []).map((p) => h('span', { class: 'rute-ben' }, Array.from({ length: p.antal }, () => h('span', { class: 'rute-pil' }, p.pil))));
    const opskrift = h('div', { class: 'rute-opskrift', role: 'img', 'aria-label': stort(v.opskrift.map(([ret, n], i) => (i ? 'så ' : '') + ruteBenTekst(ret, n)).join(', ')) + '.' }, ben);
    const maal = O.ruteFraOpskrift(v.start, v.opskrift);
    const st = { punkter: [v.start.slice()], guide: null, vis: null, tast: false, ben: -1 };
    r.figur = st;
    const paaVejen = (x, y) => st.punkter.some(([px, py]) => px === x && py === y);
    const naboer = () => {
      if (st.punkter.length >= maal.length) return [];
      const [x, y] = st.punkter[st.punkter.length - 1];
      return [[1, 0], [-1, 0], [0, -1], [0, 1]].map(([dx, dy]) => [x + dx, y + dy])
        .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < v.kol && ny < v.raek && !paaVejen(nx, ny));
    };
    const center = ([x, y]) => {
      const t = tavle.getBoundingClientRect(), q = prikker[x + ',' + y].getBoundingClientRect();
      return [Math.round(q.left + q.width / 2 - t.left), Math.round(q.top + q.height / 2 - t.top)];
    };
    function tegn() {
      const t = tavle.getBoundingClientRect();
      svg.setAttribute('viewBox', '0 0 ' + Math.max(1, Math.round(t.width)) + ' ' + Math.max(1, Math.round(t.height)));
      svg.textContent = '';
      // Hjælpens stiplede vej ligger under barnets egen streg
      if (st.guide && st.guide.length > 1) svgEl('polyline', { points: st.guide.map((p) => center(p).join(',')).join(' '), class: 'rute-guide' }, svg);
      if (st.punkter.length > 1) svgEl('polyline', { points: st.punkter.map((p) => center(p).join(',')).join(' '), class: 'soem-linje' }, svg);
      const aktive = naboer().map((p) => p.join(','));
      for (const k in prikker) {
        const b = prikker[k];
        b.classList.remove('valgt', 'foerste', 'markoer', 'vis-hjoerne');
        b.removeAttribute('data-n');
        b.classList.toggle('aktiv', aktive.indexOf(k) >= 0);
        b.disabled = aktive.indexOf(k) < 0;
      }
      st.punkter.forEach(([x, y], i) => prikker[x + ',' + y].classList.add(i === 0 ? 'foerste' : 'valgt'));
      // «Vis svaret»: vejen med numre fra den grønne prik
      if (st.vis) st.vis.forEach(([x, y], i) => { if (i) { const b = prikker[x + ',' + y]; b.classList.add('vis-hjoerne'); b.setAttribute('data-n', i); } });
      if (st.tast) prikker[st.punkter[st.punkter.length - 1].join(',')].classList.add('markoer');
      ben.forEach((b, i) => b.classList.toggle('nu', i === st.ben));
    }
    function trykPrik(x, y, e) {
      if (r.laast || S.runde !== r || st.punkter.length >= maal.length) return;
      Lyd.init();
      if (!naboer().some(([nx, ny]) => nx === x && ny === y)) { Lyd.blid(); return; }
      Lyd.tryk();
      st.punkter.push([x, y]);
      tegn();
      // Med tastaturet (Tab + Enter): fokus videre til en ny nabo-prik — den trykkede er nu slukket
      if (e && e.detail === 0) { const n = tavle.querySelector('.soem-prik.aktiv'); if (n) n.focus(); }
      if (st.punkter.length === maal.length) {
        // Vejen er færdig: den vises et øjeblik (runden er låst), så vurderes den
        r.laast = true;
        const i = r.i;
        setTimeout(() => { if (S.runde === r && r.i === i) { r.laast = false; svar(O.rutePasser(v.start, v.opskrift, st.punkter) ? 'ok' : 'nej', null); } }, 450);
      }
    }
    st.fortryd = () => { if (r.laast || st.punkter.length < 2) return; Lyd.init(); Lyd.tryk(); st.punkter.pop(); tegn(); };
    st.nulstil = () => { st.punkter = [st.punkter[0]]; tegn(); };
    st.visBen = (i) => { st.ben = i; tegn(); };
    st.tegn = tegn;
    r.bygNulstil = st.nulstil; // et forkert svar: tegn forfra fra den grønne prik
    // Fysisk tastatur: piletasterne går et skridt ad gangen, Backspace fortryder (Tab + Enter virker også)
    st.taster = (e) => {
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (d) {
        e.preventDefault();
        st.tast = true;
        const [x, y] = st.punkter[st.punkter.length - 1];
        trykPrik(x + d[0], y + d[1]);
        tegn();
      } else if (e.key === 'Backspace') { e.preventDefault(); st.fortryd(); }
    };
    vedStoerrelse(tavle, tegn);
    return h('div', { class: 'rute-felt' }, opskrift, tavle);
  }

  // Lineal: 1 cm = 52 px på iPad. Er der ikke plads, skaleres hele linealen — det er stadig «cm på linealen».
  function linealVisning(opg) {
    const v = opg.vis;
    const r = S.runde;
    const tegnMode = v.art === 'linealTegn';
    const L = v.laengde;
    const streg = h('div', { class: 'lineal-streg' + (tegnMode ? ' bruger' : '') });
    const maal = h('div', { class: 'lineal-maal skjult', 'aria-hidden': 'true' });
    const tal = [];
    const skala = h('div', { class: 'lineal' });
    for (let i = 0; i <= L; i++) {
      skala.append(h('i', { class: 'lineal-cm', style: 'left:calc(var(--cm) * ' + i + ')' }));
      if (i < L) skala.append(h('i', { class: 'lineal-halv', style: 'left:calc(var(--cm) * ' + (i + 0.5) + ')' }));
      tal.push(h('span', { class: 'lineal-tal', style: 'left:calc(var(--cm) * ' + i + ')' }, String(i)));
    }
    tal.forEach((t) => skala.append(t));
    const hop = h('div', { class: 'lineal-hop', 'aria-hidden': 'true' });
    const flade = h('div', { class: 'lineal-flade', style: '--L:' + L }, hop, streg, maal, skala);
    const felt = h('div', { class: 'lineal-felt' + (tegnMode ? ' tegn' : '') }, flade);
    const st = { cm: tegnMode ? 0 : v.cm, cmPx: 52 };
    r.lineal = st;
    const tegn = () => { streg.style.width = 'calc(var(--cm) * ' + st.cm + ')'; streg.classList.toggle('tom', !st.cm); };
    const maalCm = () => {
      // Bredden til rådighed: højst 52 px pr. cm (1 cm på iPad), ellers så meget, der er plads til
      const w = felt.clientWidth;
      if (!w) return;
      st.cmPx = Math.max(14, Math.min(52, Math.floor((w - 24) / (L + 0.8))));
      felt.style.setProperty('--cm', st.cmPx + 'px');
    };
    st.nulstil = () => { if (tegnMode) { st.cm = 0; tegn(); } };
    st.visMaal = () => { maal.style.left = 'calc(var(--cm) * ' + v.cm + ')'; maal.classList.remove('skjult'); };
    st.hop = (k) => {
      tal[k].classList.add('hop');
      hop.append(h('i', { class: 'lineal-bue', style: 'left:calc(var(--cm) * ' + (k - 1) + ')' }));
    };
    if (tegnMode) {
      // Træk fra 0: stregen følger fingeren/pennen (afrundet til 0,1 cm); ✔ afgiver svaret
      const tilCm = (e) => {
        const b = skala.getBoundingClientRect();
        return Math.round(Math.min(L, Math.max(0, (e.clientX - b.left) / st.cmPx)) * 10) / 10;
      };
      let aktiv = false;
      flade.addEventListener('pointerdown', (e) => {
        if (r.laast || S.runde !== r) return;
        e.preventDefault();
        Lyd.init();
        aktiv = true;
        if (flade.setPointerCapture) flade.setPointerCapture(e.pointerId);
        st.cm = tilCm(e);
        tegn();
      });
      flade.addEventListener('pointermove', (e) => { if (!aktiv) return; st.cm = tilCm(e); tegn(); });
      ['pointerup', 'pointercancel'].forEach((t) => flade.addEventListener(t, () => { if (aktiv) { aktiv = false; Lyd.tryk(); } }));
      flade.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
      // Fysisk tastatur: → og ← en hel cm ad gangen, Enter = ✔
      st.taster = (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          st.cm = Math.min(L, Math.max(0, Math.round(st.cm) + (e.key === 'ArrowRight' ? 1 : -1)));
          Lyd.tryk();
          tegn();
        } else if (e.key === 'Enter') { e.preventDefault(); st.svar(); }
      };
      st.svar = () => {
        if (r.laast || S.runde !== r) return;
        Lyd.init();
        if (!st.cm) { Lyd.blid(); Tale.sig('Træk fra nul og hen ad linealen.'); return; }
        svar(O.stregPasser(v.cm, st.cm) ? 'ok' : 'nej', null);
      };
      r.bygNulstil = st.nulstil;
    }
    tegn();
    vedStoerrelse(felt, maalCm);
    return felt;
  }

  // Mål med klodser: tingen ligger over en række klodser, der er lige så lang
  function maalKlodserVisning(opg) {
    const v = opg.vis;
    const ting = O.MAALE_TING.find((t) => t.id === v.maaleTing) || O.MAALE_TING[0];
    const klodser = [];
    for (let i = 0; i < v.antal; i++) klodser.push(h('span', { class: 'maale-klods taelbar' }));
    const felt = h('div', { class: 'maale-felt', style: '--n:' + v.antal },
      h('div', { class: 'maale-ting maale-' + ting.id }, h('span', { class: 'maale-ting-e', 'aria-hidden': 'true' }, ting.e)),
      h('div', { class: 'maale-raekke' }, klodser));
    vedStoerrelse(felt, () => {
      const w = felt.clientWidth, hh = felt.parentElement ? felt.parentElement.clientHeight : 0;
      if (!w) return;
      const k = Math.max(22, Math.min(56, Math.floor((w - 16) / (v.antal + 0.3)), hh ? Math.floor(hh / 2.6) : 56));
      felt.style.setProperty('--k', k + 'px');
    });
    return felt;
  }

  // Svarpanelet til tegneopgaverne: ↩️ og 🗑️ (sømbræt) eller ✔ (linealen)
  function interaktivPanel(opg) {
    const r = S.runde;
    if (opg.interaktiv === 'kurv') return kurvPanel(opg);
    if (opg.interaktiv === 'sand') return r.sand.panel();
    if (opg.interaktiv === 'soembraet' || opg.interaktiv === 'rute') {
      return h('div', { class: 'interaktiv-panel' },
        ikonKnap('↩️', 'Fortryd', () => { if (r.figur) r.figur.fortryd(); }, 'soem-fortryd'),
        ikonKnap('🗑️', 'Start forfra', () => { if (!r.laast && r.figur) { Lyd.init(); Lyd.tryk(); r.figur.nulstil(); } }, 'soem-forfra'));
    }
    return h('div', { class: 'interaktiv-panel' },
      h('button', { class: 'stor-knap ok-knap lineal-ok', type: 'button', 'aria-label': 'Færdig', onclick: () => { if (r.lineal && r.lineal.svar) r.lineal.svar(); } }, '✔'));
  }

  // Sidste trin i en tegneopgave: et eksempel lyser, og barnet tegner efter det
  function visSvaretTegn(opg) {
    const r = S.runde;
    r.visSvar = true;
    let tekst = 'Prøv igen.';
    if (opg.interaktiv === 'kurv' && r.figur) {
      tekst = r.figur.visSvaret();
    } else if (opg.interaktiv === 'soembraet' && r.figur) {
      r.figur.nulstil();
      r.figur.vis = O.eksempelFigur(opg.vis.form, opg.vis.start, opg.vis.kol, opg.vis.raek);
      r.figur.tegn();
      tekst = 'Tryk på prikkerne, der lyser: en, to, tre … og slut ved den grønne prik.';
    } else if (opg.interaktiv === 'rute' && r.figur) {
      // Hele vejen med nummererede prikker fra den grønne prik — barnet følger dem
      r.figur.nulstil();
      r.figur.vis = O.ruteFraOpskrift(opg.vis.start, opg.vis.opskrift);
      r.figur.tegn();
      tekst = 'Start ved den grønne prik. Tryk på prikkerne, der lyser: en, to, tre …';
    } else if (r.lineal) {
      r.lineal.nulstil();
      r.lineal.visMaal();
      tekst = 'Træk stregen hen til den gule streg. Tryk så på den grønne knap.';
    }
    S.gentagFn = null;
    S.gentagTale = tekst;
    Tale.sig(tekst);
  }

  // Hjælp: et eksempel lyser på sømbrættet; hjørnerne tælles ét ad gangen, så siderne
  async function figurHjaelp(opg, trin, levende) {
    const st = S.runde.figur;
    const eks = O.eksempelFigur(trin.form, opg.vis.start, opg.vis.kol, opg.vis.raek);
    if (!st || !eks) return;
    st.nulstil();
    st.vis = eks;
    st.iHjaelp = true;
    st.taltHjoerner = 0;
    st.taltSider = 0;
    st.tegn();
    const n = eks.length;
    for (let k = 1; k <= n; k++) {
      if (!levende()) return;
      st.taltHjoerner = k;
      st.tegn();
      Lyd.tael();
      Tale.sig(String(k));
      await vent(800);
    }
    if (!levende()) return;
    await Tale.sigVent(n + ' hjørner.');
    for (let k = 1; k <= n; k++) {
      if (!levende()) return;
      st.taltSider = k;
      st.tegn();
      Lyd.tael();
      Tale.sig(String(k));
      await vent(800);
    }
    if (!levende()) return;
    const ekstra = { kvadrat: ' Alle sider er lige lange, og alle hjørner er rette.', rektangel: ' Alle hjørnerne er rette. To sider er lange, og to er korte.' }[trin.form] || '';
    await Tale.sigVent(n + ' sider.' + ekstra);
    if (!levende()) return;
    // Barnet tegner selv bagefter: eksemplet slukkes igen
    st.vis = null;
    st.iHjaelp = false;
    st.taltHjoerner = st.taltSider = 0;
    st.tegn();
  }

  // Hjælp: de første k ben af vejen tegnes stiplet, skridt for skridt fra den grønne prik. Den stiplede vej
  // bliver liggende, mens barnet selv tegner ovenpå.
  async function ruteHjaelp(opg, trin, levende) {
    const st = S.runde.figur;
    if (!st) return;
    const v = opg.vis;
    st.nulstil();
    st.vis = null;
    const vej = [v.start.slice()];
    st.guide = vej;
    let [x, y] = v.start;
    const antal = Math.min(trin.ben || 1, v.opskrift.length);
    await vent(150);
    for (let b = 0; b < antal; b++) {
      const [ret, n] = v.opskrift[b];
      if (!levende()) return;
      st.visBen(b);
      for (let k = 1; k <= n; k++) {
        if (!levende()) return;
        x += O.RETNING[ret][0]; y += O.RETNING[ret][1];
        vej.push([x, y]);
        st.tegn();
        Lyd.tael();
        Tale.sig(String(k));
        await vent(700);
      }
      if (!levende()) return;
      await Tale.sigVent(stort(ruteBenTekst(ret, n)) + '.');
    }
    if (levende()) st.visBen(-1);
  }

  // Hjælp: cm-hop tælles højt på linealen
  async function cmHjaelp(opg, levende) {
    const st = S.runde.lineal;
    if (!st) return;
    for (let k = 1; k <= opg.vis.cm; k++) {
      if (!levende()) return;
      st.hop(k);
      Lyd.tael();
      Tale.sig(String(k));
      await vent(650);
    }
    if (!levende()) return;
    if (opg.vis.art === 'linealTegn') st.visMaal();
    await Tale.sigVent(opg.vis.cm + ' centimeter.');
  }

  // =====================================================================
  //  C · MINISPIL (docs/MINISPIL.md). Et minispil er én af rundens opgaver: samme fodspor, samme hjælpetrappe og
  //  samme registrering som alle andre. Generatorerne bestemmer indhold og facit; her tegnes de.
  // =====================================================================
  const ventMs = (ms) => new Promise((ok) => setTimeout(ok, ms * TEMPO));
  // Står fokus på en knap (Tab), aktiverer Enter den knap — ikke opgavens genvej
  const fokusPaaKnap = () => !!document.activeElement && document.activeElement.tagName === 'BUTTON';

  // ---------- Frøposten (interaktiv 'kurv'): pak præcis det bestilte antal frø med ➕ / ➖ / ✔ ----------
  // Frøene ligger i et roligt gitter på en lys flade i kurven: rækker à fem (trin 1: én række med en plads pr. bestilt
  // frø, op til seks) og luft efter hver ti. Pladserne og frøene er to lag oven i hinanden, så frø nr. k ligger på plads
  // nr. k. Fladen har plads til bestillingen fra start og vokser kun, hvis barnet lægger flere i — så intet hopper.
  const froeDyr = (v) => (O.FROE_DYR.find((d) => d.id === v.dyr) || { bestemt: 'dyret' });
  function froePost(opg) {
    const v = opg.vis;
    const r = S.runde;
    const Dyr = stort(froeDyr(v).bestemt);
    const st = { antal: v.start, pladser: v.pladser || 0 };
    r.figur = st;
    const froeLag = h('div', { class: 'froe-lag froe-kurvlag', 'data-del': 'kurv' });
    const pladsLag = h('div', { class: 'froe-lag froe-pladser', 'data-del': 'pladser' });
    const indhold = h('div', { class: 'kurv-indhold' }, pladsLag, froeLag);
    const kurv = h('div', { class: 'froe-kurv' }, miniTegning('seedPostBasket', 'kurv-tegning') || h('span', { class: 'kurv-reserve' }), indhold);
    // Bestillingen: dyret og tallet med lige så mange prikker (rækker à fem)
    const prikker = h('span', { class: 'bestil-prikker', 'aria-hidden': 'true' }, Array.from({ length: v.maal }, () => h('i')));
    const bestilling = h('div', { class: 'froe-bestilling', role: 'img', 'aria-label': Dyr + ' skal have ' + v.maal + ' frø' },
      miniBillede(v.billede, v.e, 'froe-dyr'),
      h('div', { class: 'bestil-boble' }, h('span', { class: 'bestil-tal' }, String(v.maal)), prikker));
    const kol = Math.max(5, v.pladser || 0);
    indhold.style.setProperty('--kol', kol);
    function tegn() {
      st.raekker = Math.max(st.raekker || 2, Math.ceil(Math.max(st.antal, v.maal, v.start, st.pladser) / kol));
      indhold.style.setProperty('--rk', st.raekker);
      indhold.classList.toggle('mange', st.raekker > 2);
      while (froeLag.children.length < st.antal) froeLag.append(h('span', { class: 'froe taelbar' }, miniTegning('seedPostSeed', 'froe-tegning') || '🌰'));
      while (froeLag.children.length > st.antal) froeLag.lastElementChild.remove();
      while (pladsLag.children.length < st.pladser) pladsLag.append(h('span', { class: 'froe-plads taelbar' }, miniTegning('seedPostSlot', 'plads-tegning')));
      kurv.setAttribute('aria-label', 'Kurven: ' + st.antal + ' frø');
      if (st.knapper) {
        st.knapper.minus.disabled = st.antal <= 0;
        st.knapper.plus.disabled = st.antal >= O.KURV_MAX;
      }
    }
    // ➕/➖ (og piletasterne) ændrer med ét — aldrig under 0, aldrig over kurven. Et tryk siger ikke tallet.
    st.tryk = (handling) => {
      if (r.laast || S.runde !== r) return;
      Lyd.init();
      const ny = O.froeTryk(st.antal, handling);
      if (ny === st.antal) return; // tom eller fuld kurv: intet sker (og ingen fejl-lyd)
      Lyd.tryk();
      st.antal = ny;
      tegn();
      const sidste = handling === 'tilfoej' ? froeLag.lastElementChild : null;
      if (sidste) hop(sidste, 'land');
    };
    // ✔ Færdig: præcis bestillingen → rigtigt. Ellers tømmes kurven IKKE — barnet hører, hvad der er, og retter videre
    st.faerdig = () => {
      if (r.laast || S.runde !== r) return;
      Lyd.init();
      if (O.froePasser(v, st.antal)) { svar('ok', null); return; }
      // «et frø» (ikke «1 frø»: en dansk stemme siger «en frø» — dyret) (review, fund 5)
      r.hjaelpIntro = (st.antal ? 'Der er ' + (st.antal === 1 ? 'et' : st.antal) + ' frø i kurven. ' : 'Der er ingen frø i kurven. ') + Dyr + ' skal have ' + v.maal + '.';
      svar('nej', null);
    };
    // Sidste trin på hjælpetrappen: en plads pr. bestilt frø, så frøene kan lægges én til én
    st.visSvaret = () => {
      st.pladser = v.maal;
      tegn();
      const p = kurv.querySelector('.froe-pladser');
      if (p) hop(p, 'pop');
      return Dyr + ' skal have ' + v.maal + '. ' + (st.antal > v.maal ? 'Tag de frø op, der ikke har en plads.' : 'Læg et frø på hver plads.') + ' Tryk så på den grønne knap.';
    };
    st.taster = (e) => {
      if (['ArrowRight', 'ArrowUp', '+'].indexOf(e.key) >= 0) { e.preventDefault(); st.tryk('tilfoej'); }
      else if (['ArrowLeft', 'ArrowDown', '-'].indexOf(e.key) >= 0) { e.preventDefault(); st.tryk('fjern'); }
      else if (e.key === 'Enter' && !fokusPaaKnap()) { e.preventDefault(); st.faerdig(); }
    };
    st.tegn = tegn;
    setTimeout(tegn, 0);
    tegn();
    return h('div', { class: 'froe-post' }, bestilling, kurv);
  }
  function kurvPanel(opg) {
    const r = S.runde;
    const st = r.figur;
    const plus = h('button', { class: 'kurv-knap kurv-plus', type: 'button', 'aria-label': 'Læg et frø i kurven', onclick: () => st.tryk('tilfoej') }, '➕');
    const minus = h('button', { class: 'kurv-knap kurv-minus', type: 'button', 'aria-label': 'Tag et frø op', onclick: () => st.tryk('fjern') }, '➖');
    const ok = h('button', { class: 'stor-knap ok-knap kurv-ok', type: 'button', 'aria-label': 'Færdig', onclick: () => st.faerdig() }, '✔');
    st.knapper = { plus: plus, minus: minus };
    st.tegn();
    return h('div', { class: 'interaktiv-panel kurv-panel' }, plus, minus, ok);
  }

  // ---------- Løft og læg (Skovbroen, Skyggeatelieret): tryk på kortet (det løftes), tryk på stedet — eller træk ----------
  // Stedet er scenens bro eller skygge. Et træk, der slippes over stedet, gør det samme som tryk–tryk; præcision kræves
  // ikke (bred tolerance). Tastatur: 1/2/3 (eller Tab + Enter) løfter et kort, Enter lægger det.
  const PLACER_NAVN = { bro: 'Broen', skygge: 'Skyggen', puslespil: 'Vinduet' };
  function placerMaal(opg) {
    if (!opg || opg.valgArt !== 'scene' || !opg.vis || opg.vis.art !== 'scene') return null;
    const d = (opg.vis.dele || []).find((x) => x.t === 'bro' || x.skygge);
    return d && d.id ? d.id : null;
  }
  // Stedet får en gennemsigtig knap (mindst 64 px) oven på tegningen
  function placerFelt(opg) {
    const r = S.runde;
    const id = placerMaal(opg);
    const del = id && r.dom.visning.querySelector('[data-del="' + id + '"]');
    if (!del) return;
    r.placer = { x: null, knap: null, maal: del };
    del.classList.add('placer-sted');
    del.append(h('button', { class: 'placer-felt', type: 'button', 'aria-label': PLACER_NAVN[id] || 'Læg den her', onclick: () => laegKort() }));
  }
  function saetLoeftet(x, knap) {
    const r = S.runde;
    r.placer.x = x; r.placer.knap = knap;
    r.dom.svar.querySelectorAll('.valg-knap').forEach((k) => { k.classList.toggle('loeftet', k === knap); k.setAttribute('aria-pressed', k === knap ? 'true' : 'false'); });
    r.placer.maal.classList.toggle('klar', x !== null);
  }
  function loeftKort(x, knap) {
    const r = S.runde;
    if (!r || r.laast || !r.placer) return;
    Lyd.init();
    if (r.visSvar) { svar(x, knap); return; } // sidste trin på hjælpetrappen: det kort, der lyser, vælges direkte
    if (knap._traek && performance.now() - knap._traek < 450) return; // klikket efter et træk
    Lyd.tryk();
    saetLoeftet(r.placer.x === x ? null : x, r.placer.x === x ? null : knap);
  }
  // En kopi af kortets tegning flyver fra kortet til stedet (og tilbage, hvis den ikke passer)
  // traek: kopien følger fingeren (direkte styring — også med prefers-reduced-motion)
  function flyvKopi(knap, traek) {
    const sc = knap.querySelector('.scene');
    if (!sc || (!traek && udenBevaegelse())) return null;
    const r0 = sc.getBoundingClientRect();
    const kopi = h('div', { class: 'flyv-kopi', 'aria-hidden': 'true', style: 'left:' + r0.left + 'px;top:' + r0.top + 'px;width:' + r0.width + 'px;height:' + r0.height + 'px' }, sc.cloneNode(true));
    document.getElementById('app').append(kopi);
    return kopi;
  }
  // Kopiens midte flyttes til stedets midte (regnet fra kopiens udgangspunkt — også midt i et træk)
  function flyvTil(kopi, rekt) {
    if (!kopi) return Promise.resolve();
    const st = kopi.style;
    const cx = parseFloat(st.left) + parseFloat(st.width) / 2, cy = parseFloat(st.top) + parseFloat(st.height) / 2;
    st.transition = udenBevaegelse() ? 'none' : 'transform ' + Math.round(300 * TEMPO) + 'ms ease-in-out';
    st.transform = 'translate(' + Math.round(rekt.left + rekt.width / 2 - cx) + 'px,' + Math.round(rekt.top + rekt.height / 2 - cy) + 'px)';
    return ventMs(udenBevaegelse() ? 0 : 320);
  }
  const fjernKopier = () => document.querySelectorAll('.flyv-kopi').forEach((k) => k.remove());
  async function laegKort(kopi) {
    const r = S.runde;
    if (!r || r.laast || !r.placer || r.placer.x === null) { if (kopi) kopi.remove(); return; }
    const opg = r.opgaver[r.i];
    const { x, knap } = r.placer;
    const token = S.token, i = r.i;
    saetLoeftet(null, null);
    r.laast = true;
    const k = kopi || flyvKopi(knap);
    await flyvTil(k, r.placer.maal.getBoundingClientRect());
    if (token !== S.token || S.runde !== r || r.i !== i) return;
    r.laast = false;
    if (x === opg.svar) { svar(x, knap); return; } // kopien ligger, til slutbilledet tager over
    // Passer ikke: brikken glider tilbage (ingen falder ned), og hjælpetrappen tager næste trin
    svar(x, knap);
    if (k) { k.style.transform = 'none'; setTimeout(() => k.remove(), 330 * TEMPO); }
  }
  // Træk: kortet kan trækkes til stedet. Under 10 px bevægelse er det et almindeligt tryk (løft).
  function traekbar(knap, x) {
    knap.addEventListener('pointerdown', (e) => {
      const r = S.runde;
      if (!r || r.laast || r.visSvar || !r.placer || e.button > 0) return;
      const x0 = e.clientX, y0 = e.clientY;
      let kopi = null;
      const flyt = (ev) => {
        if (!kopi && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 10) return;
        if (!kopi) {
          kopi = flyvKopi(knap, true);
          if (!kopi) return;
          kopi.classList.add('traekkes');
          saetLoeftet(x, knap);
        }
        kopi.style.transform = 'translate(' + (ev.clientX - x0) + 'px,' + (ev.clientY - y0) + 'px)';
      };
      const slip = (ev) => {
        knap.removeEventListener('pointermove', flyt);
        knap.removeEventListener('pointerup', slip);
        knap.removeEventListener('pointercancel', slip);
        if (!kopi) return;
        knap._traek = performance.now();
        kopi.classList.remove('traekkes');
        const m = r.placer && r.placer.maal.getBoundingClientRect();
        const tol = 40; // bred tolerance: et træk, der slipper i nærheden, tæller
        const over = m && ev.type === 'pointerup' && ev.clientX > m.left - tol && ev.clientX < m.right + tol && ev.clientY > m.top - tol && ev.clientY < m.bottom + tol;
        if (over) laegKort(kopi);
        else {
          // Sluppet et andet sted: kopien glider tilbage, kortet bliver løftet (så et tryk på stedet stadig virker)
          kopi.style.transition = 'transform ' + Math.round(250 * TEMPO) + 'ms ease-out';
          kopi.style.transform = 'none';
          setTimeout(() => kopi.remove(), 280 * TEMPO);
        }
      };
      try { knap.setPointerCapture(e.pointerId); } catch (er) { /* ældre Safari */ }
      knap.addEventListener('pointermove', flyt);
      knap.addEventListener('pointerup', slip);
      knap.addEventListener('pointercancel', slip);
    });
  }

  // ---------- Lydtoget (vis.art 'lydTog'): billedet og toget — én vogn pr. bogstav, kun én er aktiv ----------
  // Den aktive vogn er markeret med en stiplet ramme og står højere (ikke kun farve). Trin 3: ordet (fra) står i
  // vognene, og den første lyd skal byttes — det gamle bogstav står stiplet, til det nye kommer.
  function lydTogVisning(opg) {
    const v = opg.vis, B = opg.byg;
    const ord = v.fra || v.ord;
    const billede = h('button', { class: 'ord-emoji lydtog-billede', type: 'button', 'aria-label': ord, onclick: () => { Lyd.init(); Tale.sig(ord); } },
      miniBillede(v.fra ? v.fraBillede : v.billede, v.fra ? v.fraE : v.e, 'lydtog-tegning'));
    const vogne = B.vogne.map((vg, i) => h('span', { class: 'lydtog-vogn' + (vg.fast ? ' fast' : ''), 'data-plads': i },
      miniTegning('soundTrainWagon', 'vogn-tegning') || h('span', { class: 'vogn-reserve' }),
      h('span', { class: 'vogn-bogstav' + (v.fra && i === 0 ? ' gammel' : '') }, vg.fast ? vg.bogstav : v.fra && i === 0 ? v.fra[0] : '')));
    const tog = h('div', { class: 'lydtog-tog', style: '--vogne:' + vogne.length, role: 'img', 'aria-label': 'Et tog med ' + vogne.length + ' vogne' },
      h('span', { class: 'lydtog-lok' }, miniTegning('soundTrainEngine', 'vogn-tegning') || h('span', { class: 'vogn-reserve lok' }, '🚂')), vogne);
    return h('div', { class: 'lydtog' }, billede, tog);
  }

  // ---------- Trinvis byg (Lydtoget, Fortællebroen): én plads ad gangen, og hver plads tjekkes for sig ----------
  // Rigtigt: brikken bliver på pladsen, og næste plads bliver aktiv. Forkert: kun den aktive plads standser (kortet
  // hviler), de lagte bliver liggende; første fejl er et forkert første forsøg, og hjælpetrappen tager næste trin.
  function trinvisPanel(opg) {
    const r = S.runde;
    const B = opg.byg;
    const tog = !!B.vogne;
    const pladser = tog ? B.vogne.map((v, i) => (v.fast ? -1 : i)).filter((i) => i >= 0) : Array.from({ length: B.dele }, (_, i) => i);
    const st = { nr: 0, lagt: {} };
    r.trinvis = st;
    st.aktiv = () => pladser[Math.min(st.nr, pladser.length - 1)];
    const facit = (p) => (B.adskil ? opg.svar.split(B.adskil) : opg.svar.split(''))[p];
    const lagte = () => Object.keys(st.lagt).map((k) => st.lagt[k]);
    const kortTil = () => (tog ? B.vogne[st.aktiv()].kort : B.brikker.filter((b) => lagte().indexOf(b) < 0));
    const saetning = (b) => (B.tale ? B.tale[B.brikker.indexOf(b)] : b);
    const panel = h('div', { class: 'byg-panel trinvis' + (tog ? ' tog' : ' billeder') });
    function tegn() {
      panel.textContent = '';
      kortTil().forEach((b) => panel.append(h('button', {
        class: 'byg-brik trinvis-kort' + (tog ? '' : ' billede'), type: 'button', 'data-b': b, 'aria-label': tog ? b : saetning(b),
        onclick: (e) => vaelg(b, e.currentTarget),
      }, tog ? b : miniBillede(B.billeder && B.billeder[b], b, 'trinvis-billede'))));
      r.dom.visning.querySelectorAll('[data-plads]').forEach((el) => el.classList.toggle('aktiv', Number(el.getAttribute('data-plads')) === st.aktiv() && st.nr < pladser.length));
      if (r.visSvar) lysSvar();
    }
    function lysSvar() {
      panel.querySelectorAll('.trinvis-kort').forEach((k) => {
        const ja = k.getAttribute('data-b') === facit(st.aktiv());
        k.classList.toggle('vis-svar', ja);
        k.disabled = !ja;
        k.classList.toggle('forkert', !ja);
      });
    }
    // Brikken lægges på sin plads i opgavefeltet (bogstavet i vognen / billedet i rækken)
    function laeg(p, b) {
      st.lagt[p] = b;
      const el = r.dom.visning.querySelector('[data-plads="' + p + '"]');
      if (!el) return;
      el.classList.add('fyldt');
      el.classList.remove('aktiv');
      if (tog) {
        const t = el.querySelector('.vogn-bogstav');
        t.textContent = b;
        t.classList.remove('gammel');
      } else {
        el.textContent = '';
        el.append(miniBillede(B.billeder && B.billeder[b], b, 'felt-billede'));
      }
      hop(el, 'pop');
    }
    async function vaelg(b, knap) {
      if (r.laast || S.runde !== r || st.nr >= pladser.length) return;
      Lyd.init();
      const p = st.aktiv();
      if (!D.trinvisPasser(opg, p, b)) { svar(null, knap); return; } // kortet glider tilbage, hjælpen tager over
      Lyd.tryk();
      laeg(p, b);
      st.nr++;
      const token = S.token, i = r.i;
      const levende = () => token === S.token && S.runde === r && r.i === i;
      r.laast = true; // én hændelse ad gangen: sætningen/lyden, så næste plads
      if (!tog) await Tale.sigVent(saetning(b));
      // Fortællebroen: er der kun ét billede tilbage, lægger det sig selv
      if (levende() && !tog && st.nr === pladser.length - 1) {
        const sidst = kortTil()[0];
        await ventMs(250);
        if (!levende()) return;
        laeg(st.aktiv(), sidst);
        st.nr++;
        await Tale.sigVent(saetning(sidst));
      }
      if (!levende()) return;
      r.laast = false;
      if (st.nr >= pladser.length) { svar(opg.svar, null); return; }
      tegn();
      r.laast = true;
      // 🔊 under sætningen tager over (st.gentag siger den igen og spiller lyden) — så spilles lyden ikke to gange
      if (tog) { const mit = ++S.oplaes; await Tale.sigVent('Lyt til den næste lyd.'); const v = B.vogne[st.aktiv()]; if (levende() && mit === S.oplaes) await Lyd.klip(v.lyd.klip, v.lyd.reserve); }
      else {
        // Overskriften følger med (ui-review 9): «Hvad sker først?» passer kun til den første plads
        const tn = r.dom.tekst.lastChild;
        if (tn && tn.nodeType === 3 && /Hvad sker først\?$/.test(tn.textContent)) tn.textContent = tn.textContent.replace(/først\?$/, 'så?');
        await Tale.sigVent('Hvad sker så?');
      }
      if (levende()) r.laast = false;
    }
    // 🔊: den første plads som opgaven selv — ellers «Lyt til den næste lyd.» + den aktive vogns lyd (Fortællebroen: historien)
    st.gentag = () => {
      if (st.nr === 0) { sigOpgave(opg); return; }
      // Fortællebroen efter første billede: historien og «Hvad sker så?» — ikke «Hvad sker først?» igen (ui-review 9)
      if (!tog) { sigOpgave(Object.assign({}, opg, { tale: opg.tale.replace(/Hvad sker først\?$/, 'Hvad sker så?') })); return; }
      const v = B.vogne[st.aktiv()];
      const mit = ++S.oplaes, nr = st.nr, token = S.token; // review, fund 2: ikke efter et valg eller et svar
      Tale.sigVent('Lyt til den næste lyd.').then(() => { if (mit === S.oplaes && st.nr === nr && token === S.token) Lyd.klip(v.lyd.klip, v.lyd.reserve); });
    };
    // Sidste trin på hjælpetrappen: kortet til den aktive plads lyser (også på de næste pladser)
    st.visSvaret = () => {
      r.visSvar = true;
      lysSvar();
      const tekst = 'Det er den, der lyser. Tryk på den.';
      S.gentagFn = null;
      S.gentagTale = tekst;
      Tale.sig(tekst);
    };
    setTimeout(tegn, 0);
    tegn();
    return panel;
  }

  // ---------- Rimhaven (enAdGangen): kortene vises ét ad gangen, mens deres ord siges — så åbnes de til valg ----------
  // Samme ord hver gang (mus, aldrig markmus). Intet flyver, ingen tid; senest efter ca. 8 s er alle kort åbne.
  function enAdGangen(opg, forTale) {
    const r = S.runde, i = r.i, token = S.token;
    const levende = () => token === S.token && S.runde === r && r.i === i;
    // Hver gennemgang får sit eget oplæsningsnummer (som sigOpgave): et svar eller et nyt 🔊 tæller S.oplaes op, og så
    // holder den gamle gennemgang op — ellers slugte den 🔊's spørgsmål og talte videre efter svaret (review, fund 2)
    const lever = () => { const mit = ++S.oplaes; return () => levende() && mit === S.oplaes; };
    const valg = r.dom.svar.querySelector('.valg');
    if (!valg) { sigOpgave(opg, forTale); return; }
    const knapper = [...valg.querySelectorAll('.valg-knap')];
    knapper.forEach((k) => k.classList.add('skjult-kort'));
    r.laast = true;
    let aaben = false;
    const aabn = () => {
      if (aaben || !levende()) return;
      aaben = true;
      knapper.forEach((k) => { k.classList.remove('skjult-kort', 'lytter'); });
      r.laast = false;
    };
    const sigKortene = async (skjul, ok) => {
      for (const k of knapper) {
        if (!ok() || (skjul && aaben)) return;
        k.classList.remove('skjult-kort');
        k.classList.add('lytter');
        await Tale.sigVent(stort(k.getAttribute('data-v')) + '.');
        k.classList.remove('lytter');
        await ventMs(250);
      }
    };
    // Én gennemgang: spørgsmålet, så kortene. Er kortene ikke åbnet endnu (🔊 tidligt), kommer de stadig ét ad gangen,
    // og senest ca. 8 s efter spørgsmålet er alle åbne. Talen holder op ved 🔊, 👂, et svar eller et skærmskift; kortene
    // åbnes af den nyeste gennemgang (et eget nummer — 👂 tæller også S.oplaes op, og så må runden ikke hænge).
    let nyeste = 0;
    const gennemgang = async (tekst) => {
      const nr = ++nyeste, ok = lever(), skjul = !aaben;
      await Tale.sigVent(tekst);
      const loft = skjul && ok() ? setTimeout(aabn, 8000 * TEMPO) : 0;
      await sigKortene(skjul, ok); // stopper straks, hvis ok() er falsk
      clearTimeout(loft);
      if (nr === nyeste) aabn(); // efter et svar er kortene allerede åbne — så gør aabn intet
    };
    gennemgang((forTale ? forTale + ' ' : '') + opg.tale);
    S.gentagFn = () => { gennemgang(opg.tale); }; // 🔊: spørgsmålet og kortene igen
    stregFraBillede(opg);
  }
  // Stryg en linje fra billedordet til et kort (bred tolerance) — et almindeligt tryk på kortet er ligeværdigt
  function stregFraBillede(opg) {
    const r = S.runde;
    const kilde = r.dom.visning.querySelector('.dansk-billede .ord-emoji');
    if (!kilde) return;
    kilde.style.touchAction = 'none';
    kilde.addEventListener('click', (e) => { if (kilde._traek && performance.now() - kilde._traek < 450) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    kilde.addEventListener('pointerdown', (e) => {
      if (r.laast || r !== S.runde) return;
      const k0 = kilde.getBoundingClientRect();
      const x0 = k0.left + k0.width / 2, y0 = k0.top + k0.height / 2;
      let lag = null, linje = null;
      const flyt = (ev) => {
        if (!lag && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 12) return;
        if (!lag) {
          lag = svgEl('svg', { class: 'streg-lag', 'aria-hidden': 'true' });
          linje = svgEl('line', { x1: x0, y1: y0, x2: x0, y2: y0 }, lag);
          document.getElementById('app').append(lag);
        }
        linje.setAttribute('x2', ev.clientX); linje.setAttribute('y2', ev.clientY);
      };
      const slip = (ev) => {
        kilde.removeEventListener('pointermove', flyt);
        kilde.removeEventListener('pointerup', slip);
        kilde.removeEventListener('pointercancel', slip);
        if (!lag) return;
        kilde._traek = performance.now();
        lag.remove();
        if (ev.type !== 'pointerup' || r.laast || r !== S.runde) return;
        const tol = 30;
        const k = [...r.dom.svar.querySelectorAll('.valg-knap:not(:disabled)')].find((b) => {
          const q = b.getBoundingClientRect();
          return ev.clientX > q.left - tol && ev.clientX < q.right + tol && ev.clientY > q.top - tol && ev.clientY < q.bottom + tol;
        });
        if (k) k.click();
      };
      try { kilde.setPointerCapture(e.pointerId); } catch (er) { /* ældre Safari */ }
      kilde.addEventListener('pointermove', flyt);
      kilde.addEventListener('pointerup', slip);
      kilde.addEventListener('pointercancel', slip);
    });
  }

  // ---------- Spor i sandet (interaktiv 'sand'): tegn et bogstav eller et tal i sandet — BEDØMMES ALDRIG ----------
  // Forbilledet er Dansk.sporModel(tegn) i samme kasse (100 × 100) som ✍️ Spor, tegnet som en blød, fuld streg efter
  // talen. Trin 1 (bane): en bred, lys bane at følge · trin 2 (ved): forbilledet ved siden af feltet · trin 3 (husk):
  // forbilledet i feltet, til barnet skjuler det (👁️) — det kan altid hentes frem igen. ✔ → «Tak for din tegning.»
  // Ingen maskinel vurdering (intet vurderSpor, ingen tælling af streger), og tegningen gemmes ikke.
  // Streger med pen eller finger i en SVG (koordinater i SVG'ens viewBox, som ✍️ Spor). maa(): må der tegnes nu?
  function fingerStreger(svg, gruppe, maa) {
    let streger = [], aktiv = null;
    const punkter = (s) => s.map((q) => q.join(',')).join(' ');
    const tegnAlt = () => {
      gruppe.textContent = '';
      streger.forEach((s) => svgEl('polyline', { points: punkter(s), class: 'sand-streg' }, gruppe));
    };
    const tilPunkt = (e) => {
      const m = svg.getScreenCTM();
      if (!m) return [0, 0];
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const q = pt.matrixTransform(m.inverse());
      return [Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10];
    };
    svg.addEventListener('pointerdown', (e) => {
      if (!maa()) return;
      e.preventDefault();
      try { svg.setPointerCapture(e.pointerId); } catch (er) { /* ældre Safari */ }
      aktiv = [tilPunkt(e)];
      streger.push(aktiv);
      tegnAlt();
    });
    svg.addEventListener('pointermove', (e) => {
      if (!aktiv) return;
      const p = tilPunkt(e), sidst = aktiv[aktiv.length - 1];
      if (Math.abs(p[0] - sidst[0]) + Math.abs(p[1] - sidst[1]) < 0.8) return;
      aktiv.push(p);
      tegnAlt();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => svg.addEventListener(t, () => { aktiv = null; }));
    svg.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    return { ryd() { streger = []; aktiv = null; tegnAlt(); } };
  }
  function sandVisning(opg) {
    const v = opg.vis;
    const r = S.runde;
    const model = D.sporModel(v.tegn) || [];
    const st = { tast: false, modelVist: v.model === 'husk' };
    r.sand = st;
    const punkter = (s) => s.map((q) => q.join(',')).join(' ');
    const svg = svgEl('svg', { class: 'sand-svg', viewBox: '0 0 100 100', role: 'img', 'aria-label': 'Sandfelt — tegn ' + v.tegn });
    const bane = svgEl('g', { class: 'sand-bane skjult-model' }, svg);
    const iFelt = svgEl('g', { class: 'sand-model skjult-model' }, svg);
    if (v.model === 'bane') model.forEach((s) => svgEl('polyline', { points: punkter(s) }, bane));
    if (v.model === 'husk') model.forEach((s) => svgEl('polyline', { points: punkter(s) }, iFelt));
    const visLag = svgEl('g', { class: 'sand-vis' }, svg); // «Vis mig» tegner forbilledet her, strøg for strøg
    const tegnet = svgEl('g', { class: 'sand-tegnet' }, svg);
    const prik = miniTegning('sandStartDot', 'sand-start');
    if (prik) {
      prik.setAttribute('x', v.start[0] - 10); prik.setAttribute('y', v.start[1] - 10);
      prik.setAttribute('width', 20); prik.setAttribute('height', 20);
      svg.append(prik);
    } else svgEl('circle', { cx: v.start[0], cy: v.start[1], r: 5, class: 'sand-start-reserve' }, svg);
    const felt = h('div', { class: 'sand-felt' }, miniTegning('sandDrawingBoard', 'sand-tegning') || h('span', { class: 'sand-reserve' }), svg);
    // Trin 2: forbilledet ved siden af feltet
    let ved = null;
    if (v.model === 'ved') {
      const alle = [].concat.apply([], model);
      const xs = alle.map((q) => q[0]), ys = alle.map((q) => q[1]);
      const side = Math.max(Math.max.apply(null, xs) - Math.min.apply(null, xs), Math.max.apply(null, ys) - Math.min.apply(null, ys)) + 16;
      const cx = (Math.max.apply(null, xs) + Math.min.apply(null, xs)) / 2, cy = (Math.max.apply(null, ys) + Math.min.apply(null, ys)) / 2;
      const m = svgEl('svg', { class: 'sand-ved-svg', viewBox: (cx - side / 2) + ' ' + (cy - side / 2) + ' ' + side + ' ' + side, 'aria-hidden': 'true' });
      const g = svgEl('g', { class: 'sand-model skjult-model' }, m);
      model.forEach((s) => svgEl('polyline', { points: punkter(s) }, g));
      ved = h('div', { class: 'sand-ved' }, m);
    }
    const streger = fingerStreger(svg, tegnet, () => !r.laast && S.runde === r);
    // Efter talen: banen (trin 1), forbilledet ved siden af (trin 2) eller i feltet (trin 3)
    // (Trin 2: kortet ved siden af kommer først frem her — ellers står en tom hvid firkant der under talen, ui-review 11-10)
    st.efterTale = () => { [bane, iFelt].concat(ved ? [ved.querySelector('.sand-model')] : []).forEach((g) => g.classList.remove('skjult-model')); if (!st.modelVist) iFelt.classList.add('skjult-model'); if (ved) ved.classList.add('vis'); };
    st.proevIgen = () => { if (r.laast) return; Lyd.init(); Lyd.tryk(); streger.ryd(); };
    st.faerdig = () => { if (r.laast || S.runde !== r) return; Lyd.init(); svar('ok', null); };
    st.oeje = (knap) => {
      Lyd.init(); Lyd.tryk();
      st.modelVist = !st.modelVist;
      iFelt.classList.toggle('skjult-model', !st.modelVist);
      knap.setAttribute('aria-pressed', st.modelVist ? 'true' : 'false');
    };
    // «Vis mig» (= hjælpen skrivBogstav, med tallene fra sporModel): forbilledet tegnes langsomt, strøg for strøg, oven på
    st.visMig = async () => {
      if (r.laast || S.runde !== r) return;
      Lyd.init();
      const token = S.token, i = r.i;
      const levende = () => token === S.token && S.runde === r && r.i === i;
      r.laast = true;
      r.dom.svar.classList.add('venter');
      visLag.textContent = '';
      const linjer = model.map((s) => svgEl('polyline', { points: punkter(s) }, visLag));
      const laengde = linjer.map((l) => (l.getTotalLength ? l.getTotalLength() : 100) || 1);
      linjer.forEach((l, k) => { l.style.strokeDasharray = laengde[k] + ' ' + laengde[k]; l.style.strokeDashoffset = String(laengde[k]); });
      await Tale.sigVent('Se, hvordan vi tegner det.');
      for (let k = 0; k < linjer.length && levende(); k++) {
        const ms = Math.max(500, laengde[k] * 14);
        linjer[k].style.transition = udenBevaegelse() ? 'none' : 'stroke-dashoffset ' + Math.round(ms * TEMPO) + 'ms linear';
        void linjer[k].getBoundingClientRect();
        linjer[k].style.strokeDashoffset = '0';
        await ventMs(ms + 250);
      }
      if (!levende()) return;
      await Tale.sigVent('Prøv selv. Start ved prikken.');
      if (!levende()) return;
      r.dom.svar.classList.remove('venter');
      r.laast = false;
    };
    // Tastatur (uden pen/finger): find tegnet blandt 2–3 skrevne kort — bogstavarbejde, ikke håndskrift, tæller ikke
    st.visTastatur = () => {
      const T2 = opg.tastatur;
      st.tast = true;
      r.dom.svar.textContent = '';
      r.dom.svar.append(h('div', { class: 'valg valg-skrevet antal-' + T2.valg.length }, T2.valg.map((x) => h('button', {
        class: 'valg-knap', type: 'button', 'data-v': x, 'aria-label': x,
        onclick: (e) => {
          if (r.laast) return;
          Lyd.init();
          if (x === T2.svar) { svar('ok', null); return; }
          Lyd.blid();
          e.currentTarget.classList.add('forkert');
          e.currentTarget.disabled = true;
        },
      }, h('span', { class: 'valg-skrevet' }, x)))));
      const navn = /^\d$/.test(T2.svar) ? null : { klip: D.navnId(T2.svar), reserve: D.NAVNE[T2.svar] || T2.svar };
      S.gentagFn = () => { const mit = ++S.oplaes; Tale.sigVent(T2.tale).then(() => { if (navn && mit === S.oplaes) Lyd.klip(navn.klip, navn.reserve); }); };
      S.gentagFn();
    };
    st.taster = (e) => {
      if (e.key === 'Enter') { if (!st.tast && !fokusPaaKnap()) { e.preventDefault(); st.faerdig(); } return; }
      const k = e.key.toLowerCase();
      if (!/^[a-zæøå0-9]$/.test(k)) return;
      if (!st.tast) { st.visTastatur(); return; }
      const knapper = [...r.dom.svar.querySelectorAll('.valg-knap')];
      const b = knapper.find((x) => x.getAttribute('data-v') === k) || (Number(k) >= 1 && Number(k) <= knapper.length && !knapper.some((x) => /^\d$/.test(x.getAttribute('data-v'))) ? knapper[Number(k) - 1] : null);
      if (b && !b.disabled) b.click();
    };
    st.panel = () => {
      const knapper = [
        h('button', { class: 'kurv-knap sand-vis-mig', type: 'button', 'aria-label': 'Vis mig', onclick: () => st.visMig() }, '💡'),
        v.model === 'husk' ? h('button', { class: 'kurv-knap sand-oeje', type: 'button', 'aria-label': 'Vis eller skjul forbilledet', 'aria-pressed': 'true', onclick: (e) => st.oeje(e.currentTarget) }, '👁️') : null,
        h('button', { class: 'kurv-knap sand-igen', type: 'button', 'aria-label': 'Prøv igen', onclick: () => st.proevIgen() }, '🗑️'),
        h('button', { class: 'stor-knap ok-knap sand-ok', type: 'button', 'aria-label': 'Færdig', onclick: () => st.faerdig() }, '✔'),
      ];
      return h('div', { class: 'interaktiv-panel kurv-panel sand-panel' }, knapper);
    };
    r.figur = st; // tastaturet (rundeTaster → r.figur.taster)
    return h('div', { class: 'sand-post' + (ved ? ' med-ved' : '') }, felt, ved);
  }

  // ---------- Slutbilledet (slut, bedømmes ikke): lyd → (efter hjælp «Ja!») → én rolig bevægelse → evt. tale ----------
  // Højst ca. 1,5 s bevægelse, ingen konfetti. Med prefers-reduced-motion står slutbilledet der med det samme (CSS).
  function slutLag(node) {
    const r = S.runde;
    const lag = h('div', { class: 'slut-lag', 'aria-hidden': 'true' }, node);
    r.dom.visning.parentNode.append(lag);
    return lag;
  }
  // Rimhaven: de to ord, der rimer (billedordet og facit — på trin 3 de to kort, der ikke er facit)
  function rimPar(opg) {
    if (opg.type !== 'rimHave') return [];
    return opg.vis.art === 'ordBillede' ? [opg.vis.ord, opg.svar] : opg.valg.filter((x) => x !== opg.svar);
  }
  const SLUT = {
    // Fortællebroen trin 3: «Vil du tegne, hvad der sker bagefter?» — et sandfelt til en fri fortsættelse (bedømmes
    // ikke, gemmes ikke, ingen mikrofon). ✔ fører videre, når barnet vil.
    async tegnSelv(opg, knap, levende) {
      const r = S.runde;
      const svg = svgEl('svg', { class: 'sand-svg', viewBox: '0 0 100 100', role: 'img', 'aria-label': 'Sandfelt — tegn, hvad der sker bagefter' });
      fingerStreger(svg, svgEl('g', { class: 'sand-tegnet' }, svg), () => levende());
      const ok = h('button', { class: 'stor-knap ok-knap tegn-selv-ok', type: 'button', 'aria-label': 'Videre' }, '✔');
      r.dom.visning.textContent = '';
      r.dom.visning.append(h('div', { class: 'tegn-selv' },
        h('div', { class: 'sand-felt' }, miniTegning('sandDrawingBoard', 'sand-tegning') || h('span', { class: 'sand-reserve' }), svg), ok));
      const videre = new Promise((ja) => ok.addEventListener('click', () => { Lyd.init(); Lyd.tryk(); ja(); }));
      if (opg.slut.tale) await Tale.sigVent(opg.slut.tale);
      if (levende()) ok.focus({ preventScroll: true });
      await videre;
      return true;
    },
    // Lydtoget: hele ordet siges (trin 3: det nye billede kommer frem) — så kører toget
    async tog(opg, knap, levende) {
      const r = S.runde;
      const v = opg.vis;
      const b = r.dom.visning.querySelector('.lydtog-billede');
      if (v.fra && b) {
        b.textContent = '';
        b.append(miniBillede(v.billede, v.e, 'lydtog-tegning'));
        b.setAttribute('aria-label', v.ord);
        hop(b, 'pop');
      }
      if (opg.slut.tale) await Tale.sigVent(opg.slut.tale);
      if (!levende()) return true;
      const tog = r.dom.visning.querySelector('.lydtog-tog');
      if (tog) { tog.classList.add('koerer'); await ventMs(1200); }
      return true;
    },
    // Skyggeatelieret trin 1–2: figuren glider ind og drejer langsomt ned i skyggen, til den dækker den
    async drejInd(opg) {
      const r = S.runde;
      const skygge = r.dom.visning.querySelector('.sd-figur.skygge');
      if (!skygge) return false;
      const kort = opg.kort[opg.svar].dele[0];
      const fig = figurTegning(kort.form, kort.farve, false) || h('span', { class: 'mini-form' }, formSvg(kort.form, kort.farve, 0, false));
      fig.classList.add('drej-ind');
      fig.style.setProperty('--drej', (opg.slut.drej || 0) + 'deg');
      skygge.append(fig);
      fjernKopier();
      void fig.offsetWidth;
      fig.classList.add('vis');
      await ventMs(1100);
      return false;
    },
    // Skyggeatelieret trin 3: vinduet er repareret (shadowRepairedWindow over puslespillet)
    async vindue() {
      const r = S.runde;
      const pusle = r.dom.visning.querySelector('.sd-pusle');
      const vindue = miniTegning('shadowRepairedWindow', 'vindue-tegning');
      fjernKopier();
      if (!pusle || !vindue) return false;
      const lag = h('span', { class: 'vindue-lag' }, vindue);
      pusle.append(lag);
      void lag.offsetWidth;
      lag.classList.add('vis');
      await ventMs(1000);
      return false;
    },
    // Skovbroen: brikken lægger sig i åbningen (trin 3: så resten og regningen), og rejsevennen går over broen
    async bro(opg, knap, levende) {
      const r = S.runde;
      const bro = r.dom.visning.querySelector('.sd-bro');
      if (!bro) return false;
      const f = opg.vis.fakta;
      const n = opg.kort[opg.svar].fakta.n;
      const raekke = bro.querySelector('.bro-felter');
      const laeg = (len, fra) => {
        const b = broBrik(len, 'lagt');
        b.style.setProperty('--fra', fra);
        raekke.append(b);
        void b.offsetWidth;
        b.classList.add('vis');
      };
      laeg(n, f.fast);
      fjernKopier();
      await ventMs(450);
      let sagt = false;
      if (opg.slut.rest) {
        if (!levende()) return true;
        laeg(opg.slut.rest, f.fast + n);
        await ventMs(450);
        if (!levende()) return true;
        if (opg.slut.tale) { await Tale.sigVent(opg.slut.tale); sagt = true; }
      }
      if (!levende()) return true;
      const ven = h('span', { class: 'bro-ven', 'aria-hidden': 'true' }, venTegning(minFigur().id));
      // Vennen går selv over broen — så står den ikke også i hjørnet (to ens venner, ui-review 11-10). visOpgave viser den igen
      if (r.dom.ven) r.dom.ven.classList.add('paa-broen');
      bro.append(ven);
      void ven.offsetWidth;
      ven.classList.add('gaar');
      await ventMs(1100);
      return sagt;
    },
    // Lysblomsten vokser frem (Frøposten, Rimhaven) — par: de to billeder plantes ved den (Rimhaven)
    async lysblomst(opg) {
      const blomst = miniTegning('rhymeLightFlower', 'slut-blomst-tegning');
      if (!blomst) return;
      const r = S.runde;
      const par = rimPar(opg).map((ord) => miniBillede(D && D.BILLEDE[ord], D && D.ORD[ord] ? D.ORD[ord].e : '', 'slut-par'));
      const lag = slutLag(h('div', { class: 'slut-blomst' }, par[0] || null, blomst, par[1] || null));
      void lag.offsetWidth;
      lag.classList.add('vis');
      await ventMs(900);
      if (r.dom && r.dom.ven) fejrEnGang(r.dom.ven);
      await ventMs(500);
    },
  };
  async function slutBillede(opg, knap, token) {
    const r = S.runde;
    const levende = () => token === S.token && S.runde === r;
    await ventMs(350); // lyden først
    if (!levende()) return;
    const s = opg.slut || {};
    // Efter hjælp siges «Ja!» — undtagen når slutbilledet selv har en sætning (fx «Tak for din tegning.»)
    if (r.forsoeg > 0 && !s.tale) await Tale.sigVent('Ja!');
    if (!levende()) return;
    let sagt = false; // et slutbillede, der selv siger sin sætning midt i bevægelsen, svarer true
    try { if (SLUT[s.art]) sagt = await SLUT[s.art](opg, knap, levende); } catch (e) { /* slutbilledet er pynt */ }
    if (!levende()) return;
    if (s.tale && !sagt) await Tale.sigVent(s.tale);
  }

  // ---------- Sidste trin: svaret lyser, og barnet trykker på det ----------
  function visSvaret(opg) {
    const r = S.runde;
    if (opg.interaktiv) { visSvaretTegn(opg); return; }
    if (r.trinvis) { r.trinvis.visSvaret(); return; } // C: kortet til den aktive plads lyser
    r.visSvar = true;
    if (opg.valgArt === 'skjult') { r.vendtOp = true; const v = r.dom.svar.querySelector('.valg'); if (v) v.classList.remove('vendt'); }
    if (opg.valg) {
      r.dom.svar.querySelectorAll('.valg-knap').forEach((k) => {
        if (k.getAttribute('data-v') === String(opg.svar)) {
          k.classList.add('vis-svar');
          if (opg.valgArt === 'scene') k.classList.add('svar-ramme'); // scenen på en lys flade i en guldramme (bliver)
          k.disabled = false;
        }
        else { k.classList.add('forkert'); k.disabled = true; }
      });
    } else {
      r.dom.svar.textContent = '';
      r.dom.svar.append(h('div', { class: 'valg antal-1' }, h('button', {
        class: 'valg-knap vis-svar', type: 'button', 'data-v': opg.svar, 'aria-label': String(opg.svar),
        onclick: (e) => { Lyd.init(); svar(opg.svar, e.currentTarget); },
      }, String(opg.svar))));
    }
    let navn = opg.svar;
    if (opg.valgArt === 'form') navn = O.FORMER[opg.svar].bestemt;
    else if (opg.valgArt === 'brik') navn = O.MOENSTER_BRIKKER[opg.svar] ? O.MOENSTER_BRIKKER[opg.svar].bestemt : '';
    else if (opg.valgArt === 'gruppe') navn = 'den her';
    else if (opg.valgArt === 'scene') navn = opg.kort[opg.svar].navn;
    else if (opg.valgArt === 'ur' || opg.valgArt === 'tid' || opg.valgArt === 'stil') navn = 'klokken ' + O.klokkeNavn(opg.svar);
    // Stil viserne: uret viser facit, mens det siges (sidste trin på hjælpetrappen)
    const stilFelt = opg.valgArt === 'stil' && r.dom.svar.querySelector('.stil-ur');
    if (stilFelt) drejUr(stilFelt, opg.svar);
    let tekst = opg.valgArt ? 'Det er ' + navn + '. Tryk på den, der lyser.' : 'Det er ' + opg.svar + '. Tryk på ' + opg.svar + '.';
    // Et bogstav-svar siges ikke som bogstavets navn (det er lyden, der menes)
    if (opg.fag === 'engelsk') tekst = 'Det er den, der lyser. Tryk på den.'; // aldrig det engelske ord med den danske stemme
    if (opg.fag === 'natur' && N && N.DYR_ID[opg.svar]) tekst = 'Det er ' + N.DYR_ID[opg.svar].bestemt + '. Tryk på den, der lyser.';
    if (opg.fag === 'dansk') tekst = opg.valgArt === 'bogstav' ? 'Det er den, der lyser. Tryk på den.' : opg.valgArt === 'scene' ? stort(navn) + ' Tryk på den, der lyser.' : opg.valgArt ? 'Det er ' + opg.svar + '. Tryk på den, der lyser.' : 'Det er ' + opg.svar + '. Tryk på det.';
    S.gentagFn = null;
    S.gentagTale = tekst;
    // Natur: hjælpens sidste trin (visNatur) har lige sagt den samme sætning — den siges ikke to gange i træk
    if (opg.fag === 'natur' && (opg.hjaelp[r.forsoeg - 1] || {}).art === 'visNatur') return;
    Tale.sig(tekst);
  }

  // ---------- Runden er slut: dyret, vi hjalp, kommer med ----------
  function afslutRunde() {
    const r = S.runde;
    if (r.quiz) { visQuizSlut(r.quiz); return; } // 🤔: intet dyr, ingen lysperle
    // Data kan være læst igen midt i runden (storage-hændelse) uden dette emne — normalisér som i registrer()
    const lagerE = emneLager(r.emne);
    const ed = lagerE[r.emne] = G.normaliserEmne(lagerE[r.emne]);
    if (!r.udenLyd) ed.runder++; // en engelsk runde uden lyd tæller ikke med i emnet (registrer, fund 3)
    data.runderIalt++;
    if (!r.frit) data.perler++; // lysperler kommer kun fra eventyret
    data.rundeTaeller++;
    const d = G.dag(data);
    d.runder++;
    registrerAktivitet();
    gemTid();
    const maerke = r.maerke;
    data.maerker[maerke.id] = (data.maerker[maerke.id] || 0) + 1;
    // Kun en afbrudt mission i samme verden og i rundens eget felt er nu slut: en mission, der venter på ▶, overlever
    // en færdig runde i det andet fag, en historie og en Bogstavjagt. En testrunde rører aldrig en afbrudt mission.
    if (!r.test) {
      const felt = rundeFelt(r);
      if (S.afbrudt[felt] && S.afbrudt[felt].verden.id === r.verden.id) S.afbrudt[felt] = null;
      if (data[felt] && data[felt].verden === r.verden.id) saetPauset(felt, null);
    }
    gem();
    visFejring(maerke, r.niveauOp, r.verden, r.frit);
  }

  // Fejring — én hændelse ad gangen: først lyd og stjerner, så tale, så dyret
  function visFejring(maerke, niveauOp, verden, frit) {
    const fig = minFigur();
    const r = S.runde;
    const videre = (fn) => { Lyd.init(); Lyd.tryk(); if (data.rundeTaeller >= pauseEfter()) visBevaegelse(fn); else fn(); };
    const knapper = h('div', { class: 'fejring-knapper skjult' },
      h('button', { class: 'stor-knap igen-knap', type: 'button', 'aria-label': 'Spil igen', onclick: () => videre(() => startRunde(verden, { frit: frit })) }, '▶'),
      frit
        ? h('button', { class: 'stor-knap kort-knap', type: 'button', 'aria-label': 'Til Vælg selv', onclick: () => videre(() => visVaelgSelv()) }, '🎒')
        : h('button', { class: 'stor-knap kort-knap', type: 'button', 'aria-label': 'Til kortet', onclick: () => videre(() => visKort(false)) }, '🗺️'));
    let aabnet = false;
    let token = -1; // sættes efter skærmskiftet nedenfor
    // Vennen jubler (udtrykket) — og hopper én gang (480 ms), når dyrets sætning er sagt færdig. Uden tegning: emojien danser som før
    const venTeg = venTegning(fig.id, 'jubler');
    const ven = h('div', { class: 'fejring-ven' + (venTeg.nodeType === 1 ? '' : ' danser'), 'aria-hidden': 'true' }, venTeg);
    const dyr = h('button', { class: 'fund-dyr skygge', type: 'button', 'aria-label': maerke.navn }, dyrTegning(maerke));
    const navn = h('div', { class: 'fund-navn skjult' }, maerke.navn);
    // Barnet kan ikke læse «tryk på skyggen»: en ring om skyggen og en hånd, der peger på den.
    // De dukker op sammen med stemmen (CSS-forsinkelse) — ingen ekstra lyd.
    const ring = h('div', { class: 'fund-ring', 'aria-hidden': 'true' });
    const haand = h('div', { class: 'fund-haand', 'aria-hidden': 'true' }, '👆');
    const aabn = () => {
      if (aabnet) return;
      aabnet = true;
      Lyd.init();
      ring.remove();
      haand.remove();
      dyr.classList.remove('skygge');
      hop(dyr, 'frem'); // bevægelsen straks i trykket — kun lyd og tale går gennem forløbet
      navn.classList.remove('skjult');
      flyvPerle();
      const tekst = stort(maerke.bestemt) + ' er med! ' + stort(pronomen(maerke)) + ' er nu i din samlebog.';
      S.gentagTale = tekst;
      Forloeb.stop(); // fejringens intro afbrydes
      // Knapperne først efter 900 ms (niveauOp 0,65 s + ro): et hurtigt ▶ må ikke skære dyrets sætning af.
      // Med en ny ven kommer de først med vennen (visNyVen) — og senest efter 8 s, hvis forløbet hænger: så stoppes det,
      // ellers springer forløbets lås vennens sætning over. Timerne sættes før run, så knapperne kommer, selv om run kaster.
      if (nyVen) setTimeout(() => { if (!venVist && token === S.token) { Forloeb.stop(); visNyVen(); } }, 8000);
      else setTimeout(() => { if (token === S.token) knapper.classList.remove('skjult'); }, 900);
      // Lyd → ro → dyrets sætning → ro → vennen jubler én gang (forløbets animationstrin; ikke med reduceret bevægelse)
      Forloeb.run({ lyd: 'niveauOp', tekst: tekst, animer: () => { fejrEnGang(ven); return pause(480); } })
        .then(() => { if (nyVen) visNyVen(); });
    };
    // Vennebogen (14-10-2026): låste denne perle en ny ven op, kommer vennen frem ved tårnet, når dyrets sætning er sagt
    // (én hændelse ad gangen). Barnet tager vennen med fra Vennebogen (vennen på kortet).
    const nyVen = frit ? null : O.nyVen(data.perler - 1, data.perler);
    const nyVenEl = nyVen ? h('div', { class: ['fejring-ny-ven', 'skjult'].join(' '), 'data-ven': nyVen.id }, venTegning(nyVen.id, 'jubler')) : null;
    let venVist = false;
    const visNyVen = () => {
      if (venVist || token !== S.token) return;
      venVist = true;
      nyVenUset = true;
      nyVenEl.classList.remove('skjult');
      hop(nyVenEl, 'frem');
      const t = ['Du har fået en ny ven!', 'Hej, jeg hedder ' + nyVen.navn + '!'].join(' ');
      S.gentagTale = t;
      setTimeout(() => { if (token === S.token) knapper.classList.remove('skjult'); }, 900);
      Forloeb.run({ lyd: 'boblePop', tekst: t });
    };
    // En lysperle flyver fra dyret til tårnet, og tårnet lyser op (historiens røde tråd)
    // Lysperlen (og tårnet) kun i eventyret — i «Vælg selv» er dyret belønningen
    // Tårnet står på stadiet fra før denne perle; når perlen lander, tændes det nye lys (hvis et stadie er nået)
    const perle = frit ? null : h('div', { class: 'fejring-perle', style: '--lysstyrke:' + lysStyrke(), 'aria-hidden': 'true' }, fyrtaarn('', taarnStadie(data.perler - 1)), h('span', { class: 'perle-tal' }, '✨ ' + data.perler), nyVenEl);
    const taend = () => {
      const nu = taarnStadie(data.perler);
      if (perle && perle.firstChild.getAttribute('data-stadie') !== String(nu)) perle.replaceChild(fyrtaarn('', nu), perle.firstChild);
    };
    const flyvPerle = () => {
      if (!perle) return;
      try {
        const a = dyr.getBoundingClientRect(), b = perle.firstChild.getBoundingClientRect();
        const p = h('span', { class: 'flyvende-perle', 'aria-hidden': 'true', style: 'left:' + (a.left + a.width / 2) + 'px;top:' + (a.top + a.height / 2) + 'px' }, '✨');
        document.body.append(p);
        const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 3 - (a.top + a.height / 2);
        const anim = p.animate([{ transform: 'translate(-50%, -50%) scale(1.4)' }, { transform: 'translate(calc(' + dx + 'px - 50%), calc(' + dy + 'px - 50%)) scale(0.6)' }], { duration: 750, easing: 'ease-in' });
        anim.onfinish = () => { p.remove(); if (token === S.token) { taend(); hop(perle, 'gloed'); } };
      } catch (e) { taend(); hop(perle, 'gloed'); }
    };
    const intro = 'Du klarede det!' + (niveauOp ? ' Du er blevet stærkere!' : '') + ' Tryk på ' + maerke.bestemt + '.';
    const medLyd = Palet.vilSpille('fejring'); // spiller fejringen, siges introen først efter den
    S.gentagTale = intro;
    skift(h('div', { class: 'skaerm fejring' },
      h('div', { class: 'fejring-top' },
        ven,
        h('div', { class: 'fejring-tekst' }, 'Du klarede det!'),
        perle,
        // Missionens fodspor (alle fyldt) — og en stjerne, der popper frem, når barnet er blevet stærkere
        h('div', { class: 'fejring-stjerner', 'aria-hidden': 'true' }, S.runde.opgaver.map(() => h('span', { class: 'fejring-spor' }, '🐾')),
          niveauOp ? h('span', { class: 'fejring-ny-stjerne' }, '⭐') : null)),
      // Klik på hele fundet (også ringen og hånden) åbner — skyggen er ikke det eneste, et barn rammer
      // Ring og hånd kommer med stemmen: efter fejringens lyd (1,7 s), eller som før (0,8 s), når der ingen lyd er (app.css)
      h('div', { class: 'fejring-midte' }, h('div', { class: 'fund', onclick: aabn, style: medLyd ? '--ring-ind:1.7s;--ring-puls:2.1s' : null }, h('div', { class: 'fund-straaler', 'aria-hidden': 'true' }), ring, dyr, haand, navn)),
      knapper),
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!aabnet) aabn();
        else if (!knapper.classList.contains('skjult')) knapper.firstChild.click();
      } else if (e.key === 'Escape') { if (frit) visVaelgSelv(); else visKort(false); }
    });
    token = S.token;
    // Fejringen og så introen (ca. 1,7 s) — ring og hånd kommer med stemmen (app.css). Åbnes dyret før, stoppes introen.
    // Er det rundens tur: «Du klarede det!» + barnets navn (klippet) + resten af introen
    if (navnIRunden(r)) {
      r.navnSagt = true;
      Forloeb.run({ lyd: 'fejring', tekst: 'Du klarede det!', navnKlip: navnKlipId(), efter: intro.slice('Du klarede det! '.length) });
    } else Forloeb.run({ lyd: 'fejring', tekst: intro });
  }

  // ---------- Historien om Lystårnet (tynd ramme, læses højt — én gang, og når man trykker på tårnet) ----------
  const HISTORIE = 'Hver nat lyser Lystårnet over Tallandet. Men i nat blæste stormen tårnets lysperler væk. ' +
    'Hver gang du hjælper et dyr, finder vi en lysperle. Så lyser tårnet lidt mere.';
  function visHistorie(videre, forTekst) {
    const perler = h('div', { class: 'historie-perler', 'aria-hidden': 'true' },
      Array.from({ length: 7 }, (_, i) => h('i', { style: '--i:' + i })));
    const knap = h('button', {
      class: 'stor-knap spil-knap', type: 'button', 'aria-label': 'Videre',
      onclick: () => { Lyd.init(); Lyd.tryk(); data.historie = true; gem(); videre(); },
    }, '▶');
    skift(h('div', { class: 'skaerm historie' },
      h('div', { class: 'topbar historie-top' }, hoejttaler()), // 🔊 øverst til højre som på de andre skærme
      h('div', { class: 'historie-himmel', style: '--lysstyrke:' + lysStyrke() }, fyrtaarn('historie-taarn'), perler),
      h('p', { class: 'historie-tekst' }, HISTORIE),
      knap),
    (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); knap.click(); } });
    S.gentagTale = HISTORIE;
    Tale.sig((forTekst ? forTekst + ' ' : '') + HISTORIE);
  }

  // ---------- Bevægelsespause efter hver 3. runde («læg iPad'en ned» først, altid en siddende variant) ----------
  // B10: en pause er tre øvelser efter hinanden (ca. 90 sekunder), hver med sit antal og et roligt tempo (ms pr. gang)
  const BEVAEGELSER = {
    staa: [
      { e: '🐸', anim: 'hop', n: 10, takt: 2400, tekst: (n) => 'Hop ' + n + ' gange!' },
      { e: '🔄', anim: 'drej', n: 3, takt: 7500, tekst: (n) => 'Drej rundt ' + n + ' gange!' },
      { e: '🙌', anim: 'straek', n: 10, takt: 2400, tekst: (n) => 'Stræk dig mod loftet, og tæl til ' + n + '!' },
      { e: '👏', anim: 'klap', n: 12, takt: 2000, tekst: (n) => 'Klap ' + n + ' gange!' },
      { e: '🦶', anim: 'stamp', n: 12, takt: 2000, tekst: (n) => 'Stamp ' + n + ' gange med fødderne!' },
      { e: '🦵', anim: 'knae', n: 8, takt: 3000, tekst: (n) => 'Gå ned i knæ ' + n + ' gange!' },
    ],
    sid: [
      { e: '👐', anim: 'klap', n: 12, takt: 2000, tekst: (n) => 'Klap på lårene ' + n + ' gange!' },
      { e: '🙌', anim: 'straek', n: 10, takt: 2600, tekst: (n) => 'Stræk armene op ' + n + ' gange!' },
      { e: '🔄', anim: 'drej', n: 10, takt: 2600, tekst: (n) => 'Rul med skuldrene ' + n + ' gange!' },
      { e: '🦶', anim: 'stamp', n: 12, takt: 2000, tekst: (n) => 'Tramp med fødderne under bordet ' + n + ' gange!' },
      { e: '🙂', anim: 'nik', n: 10, takt: 2400, tekst: (n) => 'Nik med hovedet ' + n + ' gange!' },
    ],
  };
  const PAUSE_INTRO = 2600;    // ms: øvelsen vises og siges, før der tælles
  const SPRING_EFTER = 15000;  // ms: ⏭ vises først, når øvelsen har kørt så længe — og springer kun den øvelse over
  // De tre øvelser i en pause: skifter fra pause til pause
  const pauseOevelser = (stil, nr) => { const l = BEVAEGELSER[stil]; return [0, 1, 2].map((k) => l[(nr * 3 + k) % l.length]); };

  function visBevaegelse(videre) {
    // Pausen er «brugt», så snart den vises — lukkes appen midt i den, kommer den ikke igen efter hver runde
    data.rundeTaeller = 0;
    gem();
    const slut = () => videre();
    const fig = minFigur();
    const vaelgStil = (stil) => {
      Lyd.init(); Lyd.tryk();
      const oevelser = pauseOevelser(stil, (data.runderIalt / 3) | 0);
      let faerdigVist = false;
      // Til sidst: tag iPad'en igen
      const faerdig = () => {
        if (faerdigVist) return;
        faerdigVist = true;
        const knap = h('button', { class: 'stor-knap spil-knap puls', type: 'button', 'aria-label': 'Videre', onclick: () => { Lyd.init(); Lyd.tryk(); slut(); } }, '▶');
        const t3 = skift(h('div', { class: 'skaerm pause' },
          h('div', { class: 'topbar' }, topbarPlads(), h('div', { class: 'topbar-titel' }, 'Godt klaret!'), hoejttaler()),
          h('div', { class: 'pause-midte' }, h('div', { class: 'pause-ven danser', 'aria-hidden': 'true' }, venTegning(fig.id, 'jubler')), knap)),
        (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); knap.click(); } });
        S.gentagTale = 'Godt klaret! Tag iPad\'en igen, og tryk på den store knap.';
        Forloeb.run({ lyd: 'fejring', tekst: S.gentagTale }); // fejringen (1,6 s) og så sætningen — ikke oven i hinanden
      };
      // En øvelse: vennen viser bevægelsen, og vi tæller højt i et roligt tempo. ⏭ kommer først efter 15 sekunder.
      const oevelse = async (i) => {
        if (i >= oevelser.length) { faerdig(); return; }
        const ov = oevelser[i];
        const n = ov.n;
        let videreVist = false;
        const naeste = () => { if (videreVist) return; videreVist = true; oevelse(i + 1); };
        const springKnap = h('button', { class: 'ikon-knap spring-over usynlig', type: 'button', 'aria-label': 'Spring øvelsen over', title: 'Spring øvelsen over', onclick: () => { Lyd.init(); Lyd.tryk(); naeste(); } }, '⏭');
        const stort = h('div', { class: 'pause-tal' }, '');
        const ven = h('div', { class: 'pause-ven anim-' + ov.anim, 'aria-hidden': 'true' }, venTegning(fig.id));
        // Bevægelsen selv vises stort ved siden af vennen — barnet kan ikke læse, hvad det skal gøre
        const bev = h('div', { class: 'pause-ven pause-bevaegelse anim-' + ov.anim, 'aria-hidden': 'true' }, ov.e);
        const prikker = h('div', { class: 'pause-prikker', 'aria-hidden': 'true' }, Array.from({ length: n }, () => h('i')));
        const oevelsePrikker = h('div', { class: 'pause-oevelser', 'aria-label': 'Øvelse ' + (i + 1) + ' af ' + oevelser.length },
          oevelser.map((x, k) => h('i', { class: k < i ? 'fuld' : k === i ? 'nu' : '' }, x.e)));
        const t2 = skift(h('div', { class: 'skaerm pause', 'data-oevelse': i + 1 },
          h('div', { class: 'topbar' }, springKnap, oevelsePrikker, hoejttaler()),
          h('div', { class: 'pause-midte' }, h('div', { class: 'pause-par' }, ven, bev), stort, prikker)));
        setTimeout(() => { if (t2 === S.token) springKnap.classList.remove('usynlig'); }, SPRING_EFTER * TEMPO);
        S.gentagTale = ov.tekst(n);
        Tale.sig(ov.tekst(n));
        await vent(PAUSE_INTRO);
        for (let k = 1; k <= n; k++) {
          if (t2 !== S.token) return;
          stort.textContent = String(k);
          hop(stort, 'pop');
          hop(ven, 'gentag');
          hop(bev, 'gentag');
          prikker.children[k - 1].classList.add('fuld');
          Lyd.hop();
          Tale.sig(String(k));
          await vent(ov.takt);
        }
        if (t2 !== S.token) return;
        await vent(800);
        if (t2 === S.token) naeste();
      };
      // Først: læg iPad'en ned (ingen ⏭ — pausen kan ikke klikkes igennem)
      const token = skift(h('div', { class: 'skaerm pause' },
        h('div', { class: 'topbar' }, topbarPlads(), h('div', { class: 'topbar-titel' }, 'Pause'), hoejttaler()),
        h('div', { class: 'pause-midte' },
          // Vennen er glad (der kommer tre øvelser — ikke regnvejr med paraply, ui-review 11-10) ved siden af iPad'en, der lægges ned
          h('div', { class: 'pause-par' },
            h('div', { class: 'pause-ven', 'aria-hidden': 'true' }, venTegning(fig.id, 'glad')),
            // Pilen over iPad'en: når den lægges ned (drejes og glider ned), dækker den ikke pilen (ui-review 11-10)
            h('div', { class: 'laeg-ned', 'aria-hidden': 'true' }, h('span', { class: 'laeg-ned-pil' }, '⬇️'), h('span', { class: 'laeg-ned-ipad' }, '📱'))),
          h('div', { class: 'pause-tekst' }, 'Læg iPad\'en ned'))));
      S.gentagTale = 'Læg iPad\'en ned på bordet. ' + (stil === 'sid' ? 'Bliv siddende. ' : 'Rejs dig op. ') + 'Så gør vi tre øvelser sammen.';
      Tale.sig(S.gentagTale);
      setTimeout(() => { if (token === S.token) oevelse(0); }, 4500 * TEMPO + 300);
    };
    // Valget: stå op eller blive siddende (to valg) — ingen ⏭ her heller
    skift(h('div', { class: 'skaerm pause' },
      h('div', { class: 'topbar' }, topbarPlads(), h('div', { class: 'topbar-titel' }, 'Pause!'), hoejttaler()),
      h('div', { class: 'pause-midte' },
        h('div', { class: 'pause-ven', 'aria-hidden': 'true' }, venTegning(fig.id)),
        h('div', { class: 'pause-valg' },
          h('button', { class: 'pause-knap', type: 'button', 'aria-label': 'Stå op', onclick: () => vaelgStil('staa') }, h('span', { 'aria-hidden': 'true' }, '🧍'), h('b', null, 'Stå')),
          h('button', { class: 'pause-knap', type: 'button', 'aria-label': 'Sid ned', onclick: () => vaelgStil('sid') }, h('span', { 'aria-hidden': 'true' }, '🪑'), h('b', null, 'Sid'))))),
    (e) => { if (e.key === '1') vaelgStil('staa'); else if (e.key === '2') vaelgStil('sid'); });
    S.gentagTale = 'Pause! Vil du stå op eller blive siddende?';
    Tale.sig(S.gentagTale);
  }

  // ---------- 🎒 Vælg selv: fagets emner frit (også dem, eventyret ikke er nået til) ----------
  // Runder her tæller på samme emne-niveau og mestring som i eventyret — øvelse hjælper eventyret videre.
  // Kun det fag, barnet er i (data.fag); de andre fag nås med fagknappen, som på kortet.
  function visVaelgSelv(hilsen) {
    stopUr();
    S.runde = null;
    const fag = fagNu();
    const felt = (v) => {
      const antalStj = stjerner(v.emne);
      const knap = h('button', {
        class: 'vaelg-emne', type: 'button', 'aria-label': v.navn, 'data-verden': v.id,
        onclick: () => { Lyd.init(); Lyd.tryk(); startRunde(v, { frit: true }); },
      },
      verdenIkon(v),
      h('span', { class: 'vaelg-navn' }, v.navn),
      v.fag === 'engelsk' ? udenLydMaerke(v.emne) : null,
      h('span', { class: 'station-stjerner', 'aria-label': antalStj + (antalStj === 1 ? ' stjerne' : ' stjerner') },
        [0, 1, 2].map((k) => h('i', { class: k < antalStj ? 'fuld' : '' }, '★'))));
      // 📖 ved verdenens navn: hør lektionen igen
      const lektion = LEKTIONER[v.id] && data.lektioner[v.id] ? ikonKnap('📖', 'Lektion: ' + v.navn, () => visLektion(v, () => startRunde(v, { frit: true, lektionSet: true }), () => visVaelgSelv()), 'vaelg-lektion') : null;
      return h('div', { class: 'vaelg-felt' }, knap, lektion);
    };
    // Vennen udforsker (med luppen) ved den første gruppes overskrift — står oven på gitteret og ruller med
    let venVist = false;
    const grupper = VAELG_GRUPPER.filter((g) => g.fag === fag).map((g) => {
      const verdener = g.verdener.map((id) => verdenerFor(fag).find((v) => v.id === id)).filter((v) => v && (v.blandet || ((emneDef(v.emne) || v.emne === 'historie' || v.emne === 'jagt') && emneSlaaetTil(v.emne))));
      if (!verdener.length) return null;
      const ven = venVist ? null : h('span', { class: 'vaelg-ven', 'aria-hidden': 'true' }, venTegning(minFigur().id, 'udforsker'));
      venVist = true;
      // Overskriften er en knap: et tryk læser afsnittet op (barnet kan næsten ikke læse endnu)
      const titel = h('button', { class: 'vaelg-gruppe-knap', type: 'button', onclick: () => { Lyd.init(); Tale.sig(g.tale); } },
        h('span', { 'aria-hidden': 'true' }, g.e), g.navn);
      return h('section', { class: 'vaelg-gruppe' },
        h('h2', { class: 'vaelg-gruppe-titel' }, titel, ven),
        h('div', { class: 'vaelg-gitter' }, verdener.map(felt)));
    });
    S.gentagTale = 'Vælg selv. Tryk på det, du vil lege med.';
    const knapper = () => [...document.querySelectorAll('.vaelg-emne')];
    const fagKnap = D ? fagSkiftKnap(fag, true) : null; // de andre fag (🔢 / 🔤 / 📚) — et fag fører direkte til dets Vælg selv
    skift(h('div', { class: ['skaerm', 'vaelg-selv', 'fag-' + fag].join(' ') }, // (som én streng tog tale-tekster.js den for tale)
      h('div', { class: 'topbar' },
        ikonKnap('🗺️', 'Tilbage til eventyret', () => visKort(false)),
        fagKnap,
        h('div', { class: 'topbar-titel' }, '🎒 Vælg selv'),
        fagKnap ? h('div', { class: 'topbar-hoejre' }, topbarPlads(), hoejttaler()) : hoejttaler()), // titlen i midten
      h('div', { class: 'vaelg-selv-liste' }, grupper)),
    (e) => {
      if (e.key === 'Escape') visKort(false);
      const n = Number(e.key);
      if (n >= 1 && n <= knapper().length) knapper()[n - 1].click();
    });
    if (hilsen) Tale.sig(hilsen);
  }

  // ---------- Lektion: kort forklaring (læses op) og en lille tegning, før verdenens første runde ----------
  function lektionTegning(id) {
    switch (id) {
      case 'taelle': return [klodser(5, 0), streger(7)];
      case 'former': return ['trekant', 'kvadrat', 'cirkel'].map((f, i) => formSvg(f, i, 0, f !== 'cirkel'));
      case 'tegne': return ['📌', '📏', '🧱'].map((e) => h('span', { class: 'lektion-emoji' }, e));
      case 'plus10': return haender(3, 2, 5);
      case 'venner': return kugleramme(7, 10, false);
      case 'minus': {
        const kl = klodser(6, 0);
        [...kl.querySelectorAll('.klods')].slice(4).forEach((k) => k.classList.add('vaek'));
        return kl;
      }
      case 'tiere': return staenger(2, 3);
      case 'tierbro': return klodser(8, 5);
      case 'moenstre': return h('div', { class: 'moenster' }, ['🔴', '🔵', '🔴', '🔵'].map((b) => h('span', { class: 'brik-celle' }, b)), h('span', { class: 'brik-celle hul' }, '?'));
      case 'torvet': return [urSvg('3:00'), moentSvg(5)];
      // Dansk: kun egne emoji og bogstaver (ingen tale i tegningen — den kommer fra teksten)
      case 'rim': return ['🐈', '🎩', '☀️', '🪑'].map((e) => h('span', { class: 'lektion-emoji' }, e));
      case 'lyde': return [h('span', { class: 'lektion-emoji' }, '☀️'), h('span', { class: 'bogstav-kort lektion-bogstav' }, h('span', { class: 'bogstav-stort' }, 'S'), h('span', { class: 'bogstav-lille' }, 's'))];
      case 'alfabet': return ['a', 'b', 'c', 'd'].map((b) => h('span', { class: 'bogstav-kort lektion-bogstav' }, h('span', { class: 'bogstav-stort' }, b.toUpperCase()), h('span', { class: 'bogstav-lille' }, b)));
      case 'lydering': return [h('span', { class: 'lektion-emoji' }, '🐭'), h('span', { class: 'lektion-ord' }, 'm · u · s')];
      case 'smaaord': return ['og', 'er', 'jeg'].map((o) => h('span', { class: 'lektion-ord' }, o));
      case 'historiebog': return ['📖', '🖍️', '✏️'].map((e) => h('span', { class: 'lektion-emoji' }, e));
      // Natur: lorten, sporet og dyret, der har lavet dem (ræven) — tegningerne fra grafik.js, ellers emojien
      case 'naturLort': return [['lort-raev', '💩'], ['spor-raev', '🐾'], ['dyr-raev', '🦊']].map(([navn, e]) => naturTegning(navn, 'natur-lektion') || h('span', { class: 'lektion-emoji' }, e));
      // «Hvem har gået her?»: sporet og dyret, der har sat det (hunden)
      case 'naturSpor': return [['spor-hund', '🐾'], ['dyr-hund', '🐕']].map(([navn, e]) => naturTegning(navn, 'natur-lektion') || h('span', { class: 'lektion-emoji' }, e));
      // Savannen: giraffens lort og spor og giraffen
      case 'naturSavanne': return [['lort-giraf', '💩'], ['spor-giraf', '🐾'], ['dyr-giraf', '🦒']].map(([navn, e]) => naturTegning(navn, 'natur-lektion') || h('span', { class: 'lektion-emoji' }, e));
      case 'jagt': return [h('span', { class: 'lektion-emoji' }, '🫧'), h('span', { class: 'bogstav-kort lektion-bogstav' }, h('span', { class: 'bogstav-stort' }, 'S'), h('span', { class: 'bogstav-lille' }, 's'))];
      default: return fyrtaarn();
    }
  }

  // Verdens navn som én sætning: «Gæt en lort.» — et navn, der selv er et spørgsmål («Hvem har gået her?»), får intet
  // punktum (ellers en sætning uden Piper-fil, som enhedens stemme læser)
  function navnSaetning(v) {
    return /[.?!]$/.test(v.navn) ? v.navn : v.navn + '.';
  }
  // Vælg selv siger verdens navn før rundens første spørgsmål — men ikke, når navnet er det spørgsmål
  function fritIntro(verden, opgaver) {
    return opgaver[0] && opgaver[0].tale === verden.navn ? '' : navnSaetning(verden);
  }

  function visLektion(verden, start, tilbage) {
    data.lektioner[verden.id] = true; // vist én gang — kan altid høres igen med 📖
    gem();
    const tekst = LEKTIONER[verden.id] || verden.tale;
    const knap = h('button', { class: 'stor-knap spil-knap lektion-knap puls', type: 'button', 'aria-label': 'Start', onclick: () => { Lyd.init(); Lyd.tryk(); start(); } }, '▶');
    S.gentagTale = tekst;
    skift(h('div', { class: 'skaerm lektion' },
      h('div', { class: 'topbar' },
        ikonKnap('⬅️', 'Tilbage', () => tilbage()),
        h('div', { class: ['topbar-titel'].concat(verden.navn.length > 16 ? ['lang'] : []).join(' ') }, verdenIkonLille(verden, 'titel-ikon'), ' ' + verden.navn),
        hoejttaler()),
      h('div', { class: 'lektion-midte' },
        h('div', { class: 'lektion-tegning', 'aria-hidden': 'true' }, lektionTegning(verden.id)),
        h('p', { class: 'lektion-tekst' }, tekst),
        knap)),
    (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); knap.click(); } else if (e.key === 'Escape') tilbage(); });
    Tale.sig(navnSaetning(verden) + ' ' + tekst);
  }

  // ---------- Samlebog ----------
  function visSamlebog() {
    const pulje = O.MAERKER[T.samling] || O.MAERKER.jungle;
    const antalForskellige = pulje.filter((m) => data.maerker[m.id]).length;
    const naeste = O.maerkeForRunde(T.samling, data.runderIalt, minFigur().e, data.maerker);
    const gitter = h('div', { class: 'samlebog-gitter' }, pulje.map((m) => {
      const antal = data.maerker[m.id] || 0;
      return h('button', {
        class: 'samle-felt' + (antal ? ' har' : ' mangler') + (m.id === naeste.id ? ' naeste' : ''), type: 'button',
        'aria-label': antal ? m.navn : 'Ikke fundet endnu',
        onclick: (e) => {
          Lyd.init();
          Forloeb.stop(); // et nyt dyr afløser det forrige
          if (antal) { hop(e.currentTarget, 'pop'); Forloeb.run({ lyd: 'boblePop', tekst: m.navn + (antal > 1 ? '. Du har ' + antal + '.' : '.') }); }
          else if (m.id === naeste.id) Forloeb.run({ lyd: 'tryk', tekst: stort(m.bestemt) + ' er den næste, du hjælper.' });
          else Forloeb.run({ lyd: 'tryk', tekst: 'Den har du ikke hjulpet endnu.' });
        },
      }, h('span', { class: 'samle-emoji', 'aria-hidden': 'true' }, dyrTegning(m)), antal > 1 ? h('span', { class: 'samle-antal' }, '×' + antal) : null);
    }));
    S.gentagTale = 'Din samlebog. ' + (antalForskellige === 1 ? 'Du har fundet den første.' : 'Du har fundet ' + antalForskellige + ' forskellige.');
    skift(h('div', { class: 'skaerm samlebog' },
      h('div', { class: 'topbar' },
        ikonKnap('🗺️', 'Tilbage til kortet', () => visKort(false)),
        h('div', { class: 'topbar-titel' }, '📖 ' + antalForskellige + ' / ' + pulje.length),
        hoejttaler()),
      gitter),
    (e) => { if (e.key === 'Escape' || e.key === 'Enter') visKort(false); });
    Tale.sig(S.gentagTale);
  }

  // =====================================================================
  //  OPSTART
  // =====================================================================
  // Voksendelens oplåsning (sessionStorage, LAAS_NOEGLE i voksen.js) gælder kun, mens man bliver i voksen.html. Forsiden
  // og børnenes sider sletter den — ved start og fra bfcache — så forsidens Indstillinger-kort møder låsen igen, også når
  // den låste del blev forladt med browserens Tilbage i stedet for 🏠.
  function glemVoksenOplaasning() {
    if (T.side === 'voksen') return;
    try { sessionStorage.removeItem('mat_voksen_aaben'); } catch (e) { /* intet lager */ }
  }

  function boot() {
    // Fysisk tastatur
    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.repeat) return; // en tast holdt nede må ikke springe skærme (og belønningen) over
      if (S.taster) S.taster(e);
    });
    // Tryk lige efter et skærmskift (andet tryk i et dobbelttryk) sluges
    document.addEventListener('click', (e) => {
      // kun rigtige tryk (isTrusted) — tastaturets knap.click() skal altid igennem
      if (e.isTrusted && performance.now() < (S.spaertTil || 0)) { e.stopPropagation(); e.preventDefault(); }
    }, true);
    // :active virker på iOS, når der findes en touch-lytter
    document.addEventListener('touchstart', () => {}, { passive: true });
    // Ingen knib-zoom midt i spillet
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        Tale.stop();
        if (S.runde) { registrerAktivitet(); gemTid(); }
        if (S.ur) { gemUr(); S.ur.start = 0; } // Historiebogen/Bogstavjagt: gem nu, og uret står stille, mens iPad'en er skjult
      } else {
        if (S.runde) S.runde.sidstAktiv = Date.now();
        if (S.ur && !S.ur.start) S.ur.start = Date.now();
      }
    });
    // En anden side (voksendelens import, en anden fane) har ændret data: læs dem igen, så vores gamle
    // kopi ikke overskriver dem ved næste gem. Voksnes indstillinger (lyd, tidsgrænse) slår også igennem.
    window.addEventListener('storage', (e) => {
      if (T.side === 'barn' && e.key === T.noegle) {
        const res = G.indlaesBarn(lager, T.noegle, T.navn);
        data = res.data;
        skrivebeskyttet = !!res.skrivebeskyttet;
        indlaesAdvarsel = res.advarsel;
        // En igangværende runde fortsætter; ellers tages en gemt mission fra den anden side med
        if (!S.runde) hentMission();
      } else if (e.key === 'mat_voksen_v1' && T.side !== 'voksen') {
        Forloeb.stop(); // fx Lydeffekter/Oplæsning slået fra: feedbacken, der kører, stopper først
        voksenRes = G.indlaesVoksen(lager);
        Object.assign(voksen, voksenRes.data);
      } else if (e.key === 'mat_voksen_v1' && T.side === 'voksen') {
        location.reload(); // en anden voksenfane har gemt: start forfra, så vores gamle kopi ikke overskriver den
      }
    });

    glemVoksenOplaasning();
    window.addEventListener('pageshow', glemVoksenOplaasning);

    Tale.init();
    Lyd.indlaesKlip(); // indtalte klip (IndexedDB) og lyd/liste.json — spillet virker også uden
    // Piper-stemmen: tale/liste.json — uden den taler enhedens stemme som før. Efter 20 s hentes resten i baggrunden.
    Piper.indlaes().then(() => setTimeout(() => Piper.hentAlle(), 20000));

    if (T.side === 'barn') {
      const res = G.indlaesBarn(lager, T.noegle, T.navn);
      data = res.data;
      skrivebeskyttet = !!res.skrivebeskyttet;
      indlaesAdvarsel = res.advarsel;
      if (res.advarsel && window.console) console.warn(res.advarsel);
      hentMission();
      visStart();
    } else if (T.side === 'voksen' && window.Voksen) {
      window.Voksen.start({ h, G, O, D, lager, voksen, Lyd, Tale, Piper, Forloeb, KlipLager, lavOptager, skift, hop, vent, FIGURER, venTegning, vaekstTegning, VERDENER, DANSK_VERDENER, NATUR_VERDENER, fyrtaarn, tegnVisning, valgIndhold, gemVoksen, lagerAdvarsel });
    } else {
      visIndex();
    }

    // Offline: service worker (kun over http/https)
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline er en bonus */ });
    }
    maalOpstart();
  }

  // Opstartsmåling (13-10-2026: sort skærm ved start på iPhone) — så rettelsen kan ses på enheden uden en Mac.
  // Hvornår den første skærm var tegnet (næste billede efter boot), og efter load + 1 s tallene fra Navigation Timing
  // (iOS 15.1+) → G.noterOpstart (kun tal, de sidste 10). Samles efter tegningen, så målingen ikke forsinker starten.
  // Kun spillets sider (forsiden og børnenes): voksen-siden, der viser listen, ville ellers selv skubbe en start ud.
  function maalOpstart() {
    const p = window.performance;
    if (!p || typeof p.now !== 'function' || (T.side !== 'barn' && T.side !== 'index')) return;
    const side = T.side === 'barn' ? T.id : T.side;
    const billede = window.requestAnimationFrame ? (f) => window.requestAnimationFrame(f) : (f) => setTimeout(f, 16);
    billede(() => setTimeout(() => {
      const skaerm = p.now(); // lige efter det første billede med skærmen
      const saml = () => setTimeout(() => {
        try {
          const nav = p.getEntriesByType ? p.getEntriesByType('navigation')[0] : null;
          const fcp = p.getEntriesByType ? p.getEntriesByType('paint').find((x) => x.name === 'first-contentful-paint') : null;
          G.noterOpstart(lager, {
            t: Date.now(), side: side, skaerm: skaerm,
            rs: nav ? nav.responseStart : null,
            sw: nav && nav.workerStart > 0 ? nav.responseStart - nav.workerStart : null,
            fcp: fcp ? fcp.startTime : null,
            styret: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
          });
        } catch (e) { /* målingen må aldrig stoppe spillet */ }
      }, 1000);
      if (document.readyState === 'complete') saml(); else window.addEventListener('load', saml, { once: true });
    }, 0));
  }


  // =====================================================================
  //  HISTORIEBOGEN (B5): 📖 Læs → 🖍️ Tegn → ✏️ Skriv (læsehæftets tre trin, egne historier fra dansk-opgaver.js)
  // =====================================================================
  const historieData = (nr) => {
    if (!data.historier[nr]) data.historier[nr] = G.standardHistorie();
    return data.historier[nr];
  };
  // I eventyret kommer historierne i rækkefølge: den første, der ikke er færdig (alle færdige: den sidste)
  function naesteHistorie() {
    const h0 = D.HISTORIER.find((x) => !(data.historier[x.nr] && data.historier[x.nr].faerdig));
    return (h0 || D.HISTORIER[D.HISTORIER.length - 1]).nr;
  }
  // Ordene i en linje som knapper: et tryk siger ordet
  function linjeOrd(linje, nrLinje) {
    return linje.split(/\s+/).map((w, k) => {
      const ren = w.replace(/[^A-Za-zÆØÅæøå]/g, '');
      return h('button', {
        class: 'laes-ord', type: 'button', 'data-ord': ren.toLowerCase(), 'data-pos': nrLinje + ':' + k, 'aria-label': ren,
        onclick: () => { Lyd.init(); Tale.sig(ren); },
      }, w.replace('*', ''));
    });
  }

  // Vælg en historie (Vælg selv): alle 18 kan vælges
  function visHistorieValg() {
    S.runde = null;
    startUr();
    S.ur.historie = null; // den næste historie er en ny start (tidsgrænsen tjekkes igen)
    const knapper = D.HISTORIER.map((x) => {
      const hd = data.historier[x.nr];
      return h('button', {
        class: 'historie-valg' + (hd && hd.faerdig ? ' faerdig' : ''), type: 'button', 'aria-label': 'Historie ' + x.nr + ': ' + x.titel, 'data-nr': x.nr,
        onclick: () => { Lyd.init(); Lyd.tryk(); visHistorieSide(x.nr, true); },
      }, h('span', { class: 'historie-valg-e', 'aria-hidden': 'true' }, x.e), h('b', null, String(x.nr)), hd && hd.faerdig ? h('span', { class: 'historie-valg-ok', 'aria-hidden': 'true' }, '✓') : null);
    });
    S.gentagTale = 'Historiebogen. Tryk på en historie.';
    skift(h('div', { class: 'skaerm historie-bog-valg' },
      h('div', { class: 'topbar' }, ikonKnap('🎒', 'Tilbage til Vælg selv', () => visVaelgSelv()), h('div', { class: 'topbar-titel' }, '📖 Historiebogen'), hoejttaler()),
      h('div', { class: 'historie-valg-gitter' }, knapper)),
    (e) => { if (e.key === 'Escape') visVaelgSelv(); });
    Tale.sig(S.gentagTale);
  }

  function visHistorieSide(nr, frit) {
    // Tilbage fra ✏️ Skriv eller 🤔 i samme, ufærdige historie: den er i gang og gøres færdig (som en runde).
    // En færdig historie er ikke «i gang» — ellers kunne 🤔 gentages forbi tidsgrænsen
    const iGang = !!S.ur && S.ur.historie === nr && !(data.historier[nr] && data.historier[nr].faerdig);
    if (!iGang) { gemUr(); if (tidOpbrugt()) { visTidBrugt(); return; } }
    const H = D.HISTORIER.find((x) => x.nr === nr);
    const hd = historieData(nr);
    S.runde = null;
    startUr();
    S.ur.historie = nr;
    const tilbage = () => { if (frit) visHistorieValg(); else visKort(false); };
    // --- 📖 Læs ---
    const linjer = H.linjer.map((l, i) => h('p', { class: 'laes-linje' }, linjeOrd(l, i)));
    const bobler = h('div', { class: 'laes-bobler' },
      [0, 1, 2, 3].map((k) => h('button', {
        class: 'laes-boble' + (k < hd.bobler ? ' fuld' : ''), type: 'button', 'aria-label': 'Jeg har læst historien (' + (k + 1) + ')',
        onclick: (e) => { Lyd.init(); if (k !== hd.bobler) { Lyd.tryk(); return; } hd.bobler++; e.currentTarget.classList.add('fuld'); Lyd.rigtig(); gem(); tjekFaerdig(); },
      }, k < hd.bobler ? '⭐' : '')),
      h('button', {
        class: 'laes-boble voksen' + (hd.voksen ? ' fuld' : ''), type: 'button', 'aria-label': 'En voksen har hørt mig læse',
        onclick: (e) => { Lyd.init(); if (hd.voksen) return; hd.voksen = true; e.currentTarget.classList.add('fuld'); e.currentTarget.textContent = '🧑'; Lyd.rigtig(); gem(); },
      }, hd.voksen ? '🧑' : '👂'));
    const laesHele = async () => {
      Lyd.init();
      saetUdtryk(ven, 'laeser'); // også med mellemrumstasten
      const token = S.token;
      const ord = [...document.querySelectorAll('.laes-ord')];
      for (const o of ord) {
        if (token !== S.token) return;
        o.classList.add('lyser');
        await Tale.sigVent(o.getAttribute('aria-label'));
        o.classList.remove('lyser');
      }
    };
    // --- 🖍️ Tegn ---
    // Vennen læser (laeser), indtil barnet tegner eller vælger en farve (maler) — og læser igen ved et ord eller ▶
    const ven = h('div', { class: 'tegne-ven', 'aria-hidden': 'true' }, venTegning(minFigur().id, 'laeser'));
    const tegn = tegnefelt('historie-' + nr, () => { if (!hd.tegnet) { hd.tegnet = true; gem(); tjekFaerdig(); } }, ven);
    const laeser = () => saetUdtryk(ven, 'laeser');
    const maler = () => saetUdtryk(ven, 'maler');
    // --- ✏️ Skriv ---
    const skrivKnap = h('button', { class: 'stor-knap trin-knap skriv-knap' + (hd.skrevet ? ' ok' : ''), type: 'button', 'aria-label': 'Skriv', onclick: () => { Lyd.init(); Lyd.tryk(); visSkriv(nr, frit, 0); } }, '✏️');
    const quizKnap = h('button', { class: 'stor-knap trin-knap quiz-knap', type: 'button', 'aria-label': 'Hvad skete der?', onclick: () => { Lyd.init(); Lyd.tryk(); startHistorieQuiz(nr, frit); } }, '🤔');
    // ✏️ og 🤔 følges ad: er der ikke plads på én linje, kommer de to sammen på næste linje (🤔 står aldrig alene)
    const videreKnapper = h('div', { class: 'laes-videre' }, skrivKnap, quizKnap);
    const trinMaerker = h('div', { class: 'historie-trin', 'aria-hidden': 'true' },
      h('span', { class: hd.bobler ? 'ok' : '' }, '📖'), h('span', { class: hd.tegnet ? 'ok' : '' }, '🖍️'), h('span', { class: hd.skrevet ? 'ok' : '' }, '✏️'));
    function tjekFaerdig() {
      trinMaerker.children[0].classList.toggle('ok', hd.bobler > 0);
      trinMaerker.children[1].classList.toggle('ok', hd.tegnet);
      trinMaerker.children[2].classList.toggle('ok', hd.skrevet);
      if (hd.bobler > 0 && hd.tegnet && hd.skrevet && !hd.faerdig) historieFaerdig(nr, frit);
    }
    S.gentagTale = H.titel + '. ' + H.linjer.join(' ');
    skift(h('div', { class: 'skaerm historie-side' },
      h('div', { class: 'topbar' },
        frit ? ikonKnap('📖', 'Tilbage til historierne', tilbage) : ikonKnap('🗺️', 'Tilbage til kortet', tilbage),
        h('div', { class: 'topbar-titel' }, H.e + ' ' + H.nr + ' · ' + H.titel),
        trinMaerker,
        hoejttaler()),
      h('div', { class: 'historie-krop' },
        h('div', { class: 'historie-laes', onpointerdown: laeser, onclick: laeser }, linjer,
          h('div', { class: 'laes-knapper' }, h('button', { class: 'stor-knap trin-knap laes-hele', type: 'button', 'aria-label': 'Læs hele historien', onclick: laesHele }, '▶'), bobler, videreKnapper)),
        h('div', { class: 'historie-tegn', onpointerdown: maler, onclick: maler }, tegn.node))),
    (e) => {
      if (e.key === 'Escape') tilbage();
      else if (e.key === ' ') { e.preventDefault(); laesHele(); }
    });
    tegn.start();
    Tale.sig('Historie ' + H.nr + '. ' + H.titel + '. Tryk på et ord, så hører du det. Tegn ' + H.tegn + ', og skriv bagefter.');
    tjekFaerdig(); // det sidste trin kan være klaret på en anden skærm (✏️ Skriv)
  }

  // 🤔 Hvad skete der? (D1): en lille runde med tre opgaver om små historier. Den bruger rundemotoren, men gemmer
  // intet — ingen statistik, ingen gentagelser, intet dyr og ingen lysperle — og fører tilbage til historiesiden.
  // Tiden tæller med i Historiebogens ur (gemTid springer 🤔 over, så den ikke tælles to gange).
  // Trinnet følger antallet af færdige historier: 0–5 → 1, 6–11 → 2, 12+ → 3.
  function startHistorieQuiz(nr, frit) {
    gemUr();
    if (tidOpbrugt()) { visTidBrugt(); return; } // 🤔 er en ny lille runde: tidsgrænsen gælder
    const faerdige = Object.keys(data.historier || {}).filter((k) => data.historier[k] && data.historier[k].faerdig).length;
    const trin = faerdige >= 12 ? 3 : faerdige >= 6 ? 2 : 1;
    const rng = O.lavRng((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
    const verden = DANSK_VERDENER.find((v) => v.id === 'historiebog');
    S.runde = {
      verden: verden, emne: verden.emne, opgaver: D.lavHistorieQuiz(trin, rng, 3), i: 0, forsoeg: 0, sidstAktiv: Date.now(), aktivMs: 0,
      niveauOp: false, registreret: -1, test: true, quiz: { nr: nr, frit: !!frit }, maerke: { e: '🤔', bestemt: '' },
    };
    visRundeSkaerm();
  }
  // Runden er slut: en rolig «Godt lyttet!» — så tilbage til historien
  function visQuizSlut(q) {
    S.runde = null;
    const tilbage = () => visHistorieSide(q.nr, q.frit);
    const token = skift(h('div', { class: 'skaerm quiz-slut' },
      h('div', { class: 'topbar' }, ikonKnap('📖', 'Tilbage til historien', tilbage), h('div', { class: 'topbar-plads' }), hoejttaler()),
      h('div', { class: 'quiz-slut-midte' },
        h('div', { class: 'quiz-slut-e', 'aria-hidden': 'true' }, '👂'),
        h('div', { class: 'quiz-slut-tekst' }, 'Godt lyttet!'),
        h('button', { class: 'stor-knap ok-knap', type: 'button', 'aria-label': 'Tilbage til historien', onclick: () => { Lyd.init(); tilbage(); } }, '📖'))),
    (e) => { if (e.key === 'Escape' || e.key === 'Enter') tilbage(); });
    S.gentagTale = 'Godt lyttet!';
    Tale.sig('Godt lyttet!', () => setTimeout(() => { if (token === S.token) tilbage(); }, 1600 * TEMPO));
  }

  // Historiebogen og Bogstavjagt har ingen runde, der tæller aktiv tid, men ét fælles ur: det starter, når delen
  // åbnes, gemmes ved hvert skærmskift (også ✏️ Skriv og 🤔) og når iPad'en skjules — mens den er skjult, står
  // uret stille — og stopper på kortet, i 🎒 og ved belønningen. Højst 20 minutter pr. stykke, som før.
  function startUr() {
    if (!S.ur) S.ur = { start: document.hidden ? 0 : Date.now(), historie: null };
  }
  function gemUr() {
    const u = S.ur;
    if (!u || !u.start || !data) return;
    const nu = Date.now();
    G.dag(data).sek += Math.min(1200, Math.max(0, Math.round((nu - u.start) / 1000)));
    u.start = nu;
    gem();
  }
  function stopUr() { gemUr(); S.ur = null; }

  // En færdig historie (læst, tegnet, skrevet) giver en belønning som en runde. Fejringen kommer 600 ms efter, og
  // først dér står historien som færdig: går barnet fra siden inden da (🗺️, 📖, 🤔), kommer belønningen næste gang
  function historieFaerdig(nr, frit) {
    if (S.runde && S.runde.historie === nr) return; // fejringen er allerede på vej
    const verden = DANSK_VERDENER.find((v) => v.id === 'historiebog');
    const r = S.runde = {
      verden: verden, emne: 'historie', opgaver: [{ svar: 'læst' }, { svar: 'tegnet' }, { svar: 'skrevet' }], i: 3, forsoeg: 0, frit: !!frit,
      sidstAktiv: Date.now(), aktivMs: 0, niveauOp: false, registreret: -1, historie: nr,
      maerke: O.maerkeForRunde(T.samling, data.runderIalt, minFigur().e, data.maerker), navnMaa: navnTur(),
    };
    setTimeout(() => {
      if (S.runde !== r) return; // barnet gik videre (fx 🤔): uret kører videre, og historien er ikke belønnet endnu
      stopUr();
      historieData(nr).faerdig = true; // data kan være læst igen i mellemtiden (storage-hændelse)
      afslutRunde(); // gemmer
    }, 600);
  }

  // ---------- Tegnefelt: finger og pen (Pointer Events), 6 farver, viskelæder, start forfra ----------
  // Tegningen gemmes som streger i et 500 × 500-gitter (nedskaleret) i IndexedDB — højst 30; den ældste ryger først.
  const FARVER = ['#2b2b2b', '#e5484d', '#2f7de1', '#2fae66', '#f5b82e', '#9b59d0'];
  const MAX_TEGNINGER = 30;
  let tegneStop = null; // det tegnefelt, der lytter efter ny størrelse lige nu (stopper det)
  // ven (valgfri): vennen står til venstre for farverne (Historiebogen)
  function tegnefelt(noegle, efterStreg, ven) {
    const canvas = h('canvas', { class: 'tegne-canvas', 'aria-label': 'Tegnefelt' });
    let farve = FARVER[0], visk = false;
    let streger = []; // { f: farve, v: visk, p: [[x, y] i 0..500] }
    let aktiv = null;
    const knapper = FARVER.map((f, i) => h('button', {
      class: 'farve-knap' + (i === 0 ? ' valgt' : ''), type: 'button', 'aria-label': 'Farve ' + (i + 1), style: 'background:' + f,
      onclick: (e) => { Lyd.init(); Lyd.tryk(); farve = f; visk = false; vaelgKnap(e.currentTarget); },
    }));
    const viskKnap = h('button', { class: 'farve-knap visk', type: 'button', 'aria-label': 'Viskelæder', onclick: (e) => { Lyd.init(); Lyd.tryk(); visk = true; vaelgKnap(e.currentTarget); } }, '🧽');
    const forfraKnap = h('button', { class: 'farve-knap forfra', type: 'button', 'aria-label': 'Start forfra', onclick: () => { Lyd.init(); Lyd.tryk(); streger = []; tegnAlt(); gemTegning(); } }, '🗑️');
    const vaelgKnap = (k) => { [...knapper, viskKnap].forEach((x) => x.classList.toggle('valgt', x === k)); };
    const ramme = h('div', { class: 'tegne-ramme' }, canvas);
    const vaerktoej = h('div', { class: 'tegne-vaerktoej' }, knapper, viskKnap, forfraKnap);
    const node = h('div', { class: 'tegne-felt' }, ramme, ven ? h('div', { class: 'tegne-bund' }, ven, vaerktoej) : vaerktoej);
    const ctx2 = () => canvas.getContext('2d');
    // Feltet er kvadratisk og så stort, som pladsen tillader (også når iPad'en vendes midt i en tegning).
    // Layoutets mål (offsetWidth/-Height), ikke getBoundingClientRect: skærmen kommer ind med scale(0.985), og et mål
    // midt i den animation gjorde feltet 1,5 % for lille, til iPad'en blev vendt (E)
    function maal() {
      const side = Math.max(120, Math.floor(Math.min(ramme.offsetWidth, ramme.offsetHeight)));
      canvas.style.width = side + 'px'; canvas.style.height = side + 'px';
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(side * dpr);
      if (canvas.width !== w || canvas.height !== w) { canvas.width = w; canvas.height = w; tegnAlt(); }
    }
    function tegnStreg(c, s) {
      const k = canvas.width / 500;
      c.save();
      c.globalCompositeOperation = s.v ? 'destination-out' : 'source-over';
      c.strokeStyle = s.f; c.lineWidth = (s.v ? 34 : 10) * k; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath();
      s.p.forEach(([x, y], i) => { if (i) c.lineTo(x * k, y * k); else c.moveTo(x * k, y * k); });
      if (s.p.length === 1) c.lineTo(s.p[0][0] * k + 0.1, s.p[0][1] * k);
      c.stroke();
      c.restore();
    }
    function tegnAlt() { const c = ctx2(); c.clearRect(0, 0, canvas.width, canvas.height); streger.forEach((s) => tegnStreg(c, s)); }
    const punkt = (e) => { const r = canvas.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * 500), Math.round((e.clientY - r.top) / r.width * 500)]; };
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      aktiv = { f: farve, v: visk, p: [punkt(e)] };
      streger.push(aktiv);
      tegnStreg(ctx2(), aktiv);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!aktiv) return;
      const p = punkt(e), sidst = aktiv.p[aktiv.p.length - 1];
      if (Math.abs(p[0] - sidst[0]) + Math.abs(p[1] - sidst[1]) < 3) return;
      aktiv.p.push(p);
      tegnAlt();
    });
    const slut = () => { if (!aktiv) return; aktiv = null; gemTegning(); if (efterStreg && streger.some((s) => !s.v)) efterStreg(); };
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => canvas.addEventListener(t, slut));
    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false }); // ingen rulning/zoom mens der tegnes
    async function gemTegning() {
      try {
        await KlipLager.gem('tegninger', noegle, { tid: Date.now(), streger: streger });
        // Højst MAX_TEGNINGER: den ældste ryger først
        const alle = await KlipLager.alle('tegninger');
        const ids = Object.keys(alle).sort((a, b) => (alle[a].tid || 0) - (alle[b].tid || 0));
        while (ids.length > MAX_TEGNINGER) await KlipLager.slet('tegninger', ids.shift());
      } catch (e) { /* tegningen gemmes bare ikke */ }
    }
    // Ny størrelse (fx når iPad'en vendes): mål i næste frame, ikke i selve ResizeObserver-kaldet — maal ændrer
    // lærredets størrelse (samme Safari-fejl som i vedStoerrelse). Der er højst ét tegnefelt på skærmen: starter et
    // nyt, eller er feltet væk, stopper det gamle med at lytte (uden ResizeObserver hobede resize-lyttere sig op)
    let ventende = 0, ro = null;
    const senere = () => {
      if (!ramme.isConnected) { stop(); return; }
      if (!ventende) ventende = requestAnimationFrame(() => { ventende = 0; if (ramme.isConnected) maal(); });
    };
    function stop() {
      if (ro) ro.disconnect(); else window.removeEventListener('resize', senere);
      if (tegneStop === stop) tegneStop = null;
    }
    return {
      node,
      start() {
        if (tegneStop) tegneStop();
        tegneStop = stop;
        if (window.ResizeObserver) { ro = new ResizeObserver(senere); ro.observe(ramme); } else window.addEventListener('resize', senere);
        maal();
        KlipLager.hent('tegninger', noegle).then((t) => { if (t && Array.isArray(t.streger) && !streger.length) { streger = t.streger; tegnAlt(); } }).catch(() => {});
      },
      get streger() { return streger; },
    };
  }

  // ---------- ✏️ Skriv: tastatur (bogstavknapper + fysisk tastatur) eller pen/finger på et prikket forlæg ----------
  function visSkriv(nr, frit, ordNr, maade) {
    S.runde = null; // en fejring på vej (✏️ lige efter sidste trin) venter, til barnet er tilbage i historien
    const H = D.HISTORIER.find((x) => x.nr === nr);
    const ord = H.skriv[ordNr];
    const hd = historieData(nr);
    const naeste = () => {
      if (ordNr + 1 < H.skriv.length) visSkriv(nr, frit, ordNr + 1, maade);
      else {
        hd.skrevet = true; gem();
        // Er historien hermed færdig, kommer fejringen med sin egen lyd og tale (visFejring) — ingen ekstra fejring her
        if (!(hd.bobler > 0 && hd.tegnet && !hd.faerdig)) Lyd.fejring();
        visHistorieSide(nr, frit);
      }
    };
    const e = D.ORD[ord] ? D.ORD[ord].e : '';
    const top = h('div', { class: 'topbar' },
      ikonKnap('⬅️', 'Tilbage til historien', () => visHistorieSide(nr, frit)),
      h('div', { class: 'topbar-titel' }, '✏️ ' + (ordNr + 1) + ' / ' + H.skriv.length),
      hoejttaler());
    if (!maade) {
      S.gentagTale = 'Vil du skrive med bogstaverne eller med fingeren?';
      skift(h('div', { class: 'skaerm skriv-valg' }, top,
        h('div', { class: 'fagvalg-liste' },
          h('button', { class: 'fag-kort', type: 'button', 'aria-label': 'Skriv med bogstaver', onclick: () => { Lyd.init(); Lyd.tryk(); visSkriv(nr, frit, ordNr, 'tast'); } }, h('span', { class: 'fag-ikon', 'aria-hidden': 'true' }, '🔤'), h('span', { class: 'fag-navn' }, 'abc')),
          h('button', { class: 'fag-kort dansk', type: 'button', 'aria-label': 'Skriv med fingeren', onclick: () => { Lyd.init(); Lyd.tryk(); visSkriv(nr, frit, ordNr, 'spor'); } }, h('span', { class: 'fag-ikon', 'aria-hidden': 'true' }, '✍️'), h('span', { class: 'fag-navn' }, '✍️')))),
      (ev) => { if (ev.key === '1') visSkriv(nr, frit, ordNr, 'tast'); else if (ev.key === '2') visSkriv(nr, frit, ordNr, 'spor'); });
      Tale.sig(S.gentagTale);
      return;
    }
    if (maade === 'tast') {
      // Ordets bogstaver blandet + 2 ekstra som store knapper (aldrig iPad'ens eget tastatur)
      const rng = O.lavRng((Date.now() ^ (nr * 97)) >>> 0);
      const ekstra = O.bland(rng, D.ALFABET.slice(0, 26).filter((b) => ord.indexOf(b) < 0 && !/[qwxzc]/.test(b))).slice(0, 2);
      const brikker = O.bland(rng, ord.split('').concat(ekstra));
      let skrevet = '';
      const felter = h('div', { class: 'byg-felter' }, ord.split('').map(() => h('span', { class: 'byg-felt' }, '')));
      const knapper = brikker.map((b, i) => h('button', { class: 'byg-brik', type: 'button', 'data-t': b, 'aria-label': b, onclick: () => tryk(i) }, b));
      const brugt = [];
      const vis = () => {
        [...felter.children].forEach((f, k) => { f.textContent = skrevet[k] || ''; f.classList.toggle('fyldt', !!skrevet[k]); f.classList.toggle('rigtig', !!skrevet[k] && skrevet[k] === ord[k]); });
        knapper.forEach((k, i) => { k.disabled = brugt.indexOf(i) >= 0; });
      };
      // Kun det rigtige bogstav på pladsen sættes ind — men intet straffes: et forkert tryk siger bare lyden igen
      const tryk = (i) => {
        if (brugt.indexOf(i) >= 0 || skrevet.length >= ord.length) return;
        const b = brikker[i];
        Lyd.init();
        if (b !== ord[skrevet.length]) {
          Forloeb.stop();
          Forloeb.run({ lyd: 'forkertBlid', klip: D.lydId(ord[skrevet.length]), reserve: D.lydReserve(ord[skrevet.length]) });
          return;
        }
        Forloeb.stop(); // et rigtigt bogstav afløser feedbacken fra et forkert (ellers er låsen optaget, når ordet er færdigt)
        Lyd.tryk();
        brugt.push(i); skrevet += b; vis();
        if (skrevet === ord) {
          // Svarets lyd afløser trykket; ordet siges efter lyden, og næste ord kommer tidligst efter 1,5 s som før
          const t = S.token;
          Promise.all([Forloeb.run({ lyd: 'rigtig', tekst: 'Ja! ' + ord + '.' }), pause(1500)]).then(() => { if (t === S.token) naeste(); });
        }
      };
      S.gentagTale = 'Skriv ' + ord + '. Tryk på bogstaverne.';
      skift(h('div', { class: 'skaerm skriv' }, top,
        h('div', { class: 'skriv-midte' },
          e ? ordEmoji(ord, e, 'mellem') : h('button', { class: 'lyt-knap', type: 'button', 'aria-label': 'Hør ordet', onclick: () => Tale.sig(ord) }, h('span', { 'aria-hidden': 'true' }, '👂')),
          felter,
          h('div', { class: 'byg-panel' }, knapper))),
      (ev) => {
        const k = ev.key.toLowerCase();
        if (k.length === 1 && /[a-zæøå]/.test(k)) { const i = brikker.findIndex((b, j) => b === k && brugt.indexOf(j) < 0); if (i >= 0) tryk(i); }
        else if (ev.key === 'Escape') visHistorieSide(nr, frit);
      });
      vis();
      Tale.sig(S.gentagTale);
      return;
    }
    // ✍️ Spor: følg det prikkede forlæg (startprik + pil pr. strøg). Vurderes på start, retning og dækning.
    visSpor(ord, top, naeste, () => visHistorieSide(nr, frit));
  }

  function visSpor(ord, top, naeste, tilbage) {
    const F = D.forlaegOrd(ord);
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'spor-svg');
    svg.setAttribute('viewBox', '0 0 ' + F.bredde + ' 110');
    const el = (tag, a, forael) => { const n = document.createElementNS(ns, tag); for (const k in a) n.setAttribute(k, a[k]); (forael || svg).append(n); return n; };
    // Skrivelinjer: overlinje, x-linje (stiplet), grundlinje og underlinje
    [[15, 'spor-linje tynd'], [40, 'spor-linje stiplet'], [75, 'spor-linje'], [95, 'spor-linje tynd']].forEach(([y, c]) => el('line', { x1: 0, y1: y, x2: F.bredde, y2: y, class: c }));
    F.strøg.forEach((s) => {
      el('polyline', { points: s.map((p) => p.join(',')).join(' '), class: 'spor-forlaeg' });
      el('circle', { cx: s[0][0], cy: s[0][1], r: 4.5, class: 'spor-start' });
      // Pil fra startprikken i skriveretningen
      const p0 = s[0], p1 = s.find((p) => Math.hypot(p[0] - p0[0], p[1] - p0[1]) > 6) || s[s.length - 1];
      const v = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
      const sp = [p0[0] + Math.cos(v) * 12, p0[1] + Math.sin(v) * 12];
      el('path', { d: 'M' + (sp[0] - Math.cos(v - 0.5) * 6) + ',' + (sp[1] - Math.sin(v - 0.5) * 6) + ' L' + sp[0] + ',' + sp[1] + ' L' + (sp[0] - Math.cos(v + 0.5) * 6) + ',' + (sp[1] - Math.sin(v + 0.5) * 6), class: 'spor-pil' });
    });
    const sporG = el('g', { class: 'spor-tegnet' });
    let spor = [], aktiv = null, forsoeg = 0;
    const tilPunkt = (e) => {
      const m = svg.getScreenCTM();
      if (!m) return [0, 0];
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const q = pt.matrixTransform(m.inverse());
      return [Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10];
    };
    const tegn = () => {
      sporG.textContent = '';
      spor.forEach((s) => el('polyline', { points: s.map((p) => p.join(',')).join(' '), class: 'spor-streg' }, sporG));
    };
    svg.addEventListener('pointerdown', (e) => { e.preventDefault(); svg.setPointerCapture && svg.setPointerCapture(e.pointerId); aktiv = [tilPunkt(e)]; spor.push(aktiv); tegn(); });
    svg.addEventListener('pointermove', (e) => { if (!aktiv) return; aktiv.push(tilPunkt(e)); tegn(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => svg.addEventListener(t, () => { aktiv = null; }));
    svg.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    const besked = h('div', { class: 'spor-besked', 'aria-live': 'polite' }, '');
    const vej = F.bogstaver.map((b) => D.SKRIVEVEJ[b.b]).join('. ');
    const ok = h('button', {
      class: 'stor-knap ok-knap spor-ok', type: 'button', 'aria-label': 'Færdig',
      onclick: () => {
        Lyd.init();
        const r = D.vurderSpor(F.strøg, spor);
        forsoeg++;
        // Ingen straf: «prøv igen» højst én gang — så godkendes det
        Forloeb.stop();
        if (r.ok || forsoeg >= 2) {
          const t = S.token;
          Promise.all([Forloeb.run({ lyd: 'rigtig', tekst: r.ok ? 'Flot skrevet!' : 'Godt øvet!' }), pause(1300)]).then(() => { if (t === S.token) naeste(); });
          return;
        }
        besked.textContent = '';
        Forloeb.run({ lyd: 'forkertBlid', tekst: 'Prøv igen. Start ved den grønne prik. ' + vej + '.' });
        spor = []; tegn();
      },
    }, '✔');
    const igen = h('button', { class: 'ikon-knap', type: 'button', 'aria-label': 'Start forfra', onclick: () => { Lyd.init(); Lyd.tryk(); spor = []; tegn(); } }, '🗑️');
    S.gentagTale = 'Skriv ' + ord + '. Følg prikkerne, og start ved den grønne prik. ' + vej + '.';
    skift(h('div', { class: 'skaerm skriv spor' }, top,
      h('div', { class: 'spor-midte' }, h('div', { class: 'spor-ramme' }, svg), h('div', { class: 'spor-knapper' }, igen, besked, ok))),
    (ev) => { if (ev.key === 'Escape') tilbage(); else if (ev.key === 'Enter') ok.click(); });
    Tale.sig(S.gentagTale);
    S.spor = { forlaeg: F, get spor() { return spor; }, saetSpor(s) { spor = s; tegn(); } }; // til test
  }

  // =====================================================================
  //  BOGSTAVJAGT (B10): bobler med bogstaver flyver op i buer. Spillet siger en lyd, og barnet stryger
  //  gennem det rigtige bogstav med pen eller finger (Pointer Events). Forkert: boblen flyver bare videre.
  // =====================================================================
  function visBogstavjagt(frit) {
    if (tidOpbrugt()) { visTidBrugt(); return; }
    S.runde = null;
    const verden = DANSK_VERDENER.find((v) => v.id === 'jagt');
    if (!data.dansk.jagt) data.dansk.jagt = G.standardEmne();
    const ed = data.dansk.jagt = G.normaliserEmne(data.dansk.jagt);
    const trin = Math.min(3, Math.max(1, ed.niveau));
    const rng = O.lavRng((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
    const runde = D.lavJagtRunde(D.jagtBogstaver(data.dansk.lyde), trin, rng);
    const langsom = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    startUr();
    const st = { i: 0, point: 0, forsoeg: 0, bobler: [], aktiv: true, rigtige: [], laast: false, nr: 0 };
    // Bogstavet, der skal rammes nu. To lyde i rækkefølge (D2): den næste, der ikke er ramt endnu (st.nr)
    st.facit = () => { const r = runde[Math.min(st.i, runde.length - 1)]; return r.raekke ? r.raekke[Math.min(st.nr, r.raekke.length - 1)] : r.bogstav; };
    st.boelgen = () => runde[Math.min(st.i, runde.length - 1)];
    S.jagt = st; // til test
    const felt = h('div', { class: 'jagt-felt', 'aria-label': 'Bogstavjagt' });
    const spor = svgEl('svg', { class: 'jagt-spor', 'aria-hidden': 'true' });
    felt.append(spor);
    const pointTal = h('span', { class: 'jagt-point' }, '0');
    const lyde = h('div', { class: 'jagt-lyde', 'aria-hidden': 'true' }, runde.map(() => h('i')));
    const tilbage = () => { st.aktiv = false; if (frit) visVaelgSelv(); else visKort(false); };
    // En stille bølge (D1, «boblerne venter på barnet»): «Find de to bobler med» + lyden.
    // D2 'raekke': «Find de to lyde i rækkefølge» + lyd 1, kort pause, lyd 2 · D3 'midt': kun sætningen (ordet siges ikke)
    const sigLyd = async () => {
      const r = runde[st.i];
      // Et nyt 🔊/mellemrum afbryder sætningen — så må det ældre kald ikke spille lyden oven i den nye (review #6)
      const n = st.lydGen = (st.lydGen || 0) + 1;
      const stadig = () => st.aktiv && token === S.token && runde[st.i] === r && st.lydGen === n;
      // … og et klip, der spiller endnu, stoppes, før sætningen begynder (code-review #6)
      Lyd.stopKlip();
      if (r.stille === 'midt') return Tale.sigVent('Find bogstavet i midten');
      if (r.stille === 'raekke') {
        await Tale.sigVent('Find de to lyde i rækkefølge');
        if (!stadig()) return;
        await Lyd.klip(D.lydId(r.raekke[0]), D.lydReserve(r.raekke[0]));
        if (!stadig()) return;
        await new Promise((res) => setTimeout(res, 550 * TEMPO));
        if (!stadig()) return;
        return Lyd.klip(D.lydId(r.raekke[1]), D.lydReserve(r.raekke[1]));
      }
      if (r.stille === 'alle') { await Tale.sigVent('Find de to bobler med'); if (!stadig()) return; }
      return Lyd.klip(D.lydId(r.bogstav), D.lydReserve(r.bogstav));
    };
    S.gentagFn = () => sigLyd();
    S.gentagTale = 'Stryg gennem det bogstav, du hører.';
    const token = skift(h('div', { class: 'skaerm bogstavjagt' },
      h('div', { class: 'topbar' },
        frit ? ikonKnap('🎒', 'Tilbage til Vælg selv', tilbage) : ikonKnap('🗺️', 'Tilbage til kortet', tilbage),
        h('div', { class: 'topbar-titel' }, h('span', { 'aria-hidden': 'true' }, '🫧 '), lyde),
        h('div', { class: 'jagt-score', 'aria-label': 'Point' }, '⭐ ', pointTal),
        hoejttaler()),
      felt),
    (e) => {
      if (e.key === 'Escape') { tilbage(); return; }
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); sigLyd(); return; }
      // Fysisk tastatur: tryk bogstavet
      const k = e.key.toLowerCase();
      if (k.length === 1 && /[a-zæøå]/.test(k)) { const b = st.bobler.find((x) => !x.ramt && x.b === k); if (b) ram(b); }
    });
    const boblePx = () => { const b = felt.querySelector('.jagt-boble'); return b ? b.offsetWidth : 90; };
    // En ny boelge bobler til lyden nu (samme lyd igen, hvis de alle faldt ned uden et ramt)
    function boelge() {
      if (!st.aktiv || token !== S.token) return;
      const r = runde[st.i];
      st.bobler.forEach((b) => b.el.remove());
      st.bobler = [];
      st.nr = 0;
      if (st.stilleVis) { st.stilleVis.remove(); st.stilleVis = null; }
      // D2/D3: over boblerne står de to tomme pladser (rækkefølgen) eller ordet (bogstavet i midten)
      if (r.stille === 'raekke') {
        st.stilleVis = h('div', { class: 'jagt-stille-vis raekke', 'aria-hidden': 'true' },
          h('span', { class: 'jagt-plads' }), h('span', { class: 'jagt-raekke-pil' }), h('span', { class: 'jagt-plads' }));
      } else if (r.stille === 'midt') {
        st.stilleVis = h('div', { class: 'jagt-stille-vis midt', 'aria-hidden': 'true' }, r.ord.split('').map((b) => h('span', { class: 'jagt-ord-b' }, b)));
      }
      if (st.stilleVis) felt.append(st.stilleVis);
      const w = felt.clientWidth, hh = felt.clientHeight;
      const nu = performance.now();
      st.forkerteStille = 0;
      r.bobler.forEach((bogstav, k) => {
        const el = h('div', { class: 'jagt-boble', 'data-b': bogstav, 'aria-hidden': 'true' }, h('span', null, bogstav));
        // Hjælp: efter to boelger uden et ramt lyser det rigtige bogstav
        if (st.forsoeg >= 2 && bogstav === r.bogstav) el.classList.add('hjaelp');
        felt.append(el);
        if (r.stille) {
          // Stille bølge: boblerne står jævnt fordelt i tre forskellige højder, så et vandret strøg kun rammer én (review #5)
          const b = { b: bogstav, el: el, stille: { fx: (k + 1) / (r.bobler.length + 1), fy: [0.22, 0.68, 0.45][k % 3] }, t0: nu, ramt: false };
          stilBoble(b, w, hh);
          st.bobler.push(b);
          return;
        }
        st.bobler.push({ b: bogstav, el: el, bane: D.lavBane(rng, trin, w, hh, langsom), t0: nu + k * 450 * (langsom ? 1.4 : 1), ramt: false });
      });
      // Ikke for en bølge, der allerede er klaret (et hurtigt tryk) — så kom lyden først i næste bølge (WebKit-e2e 11-10)
      setTimeout(() => { if (st.aktiv && token === S.token && !st.laast) sigLyd(); }, 150);
    }
    // En stille boble står på sin plads i feltet. Banen står stille (samme form som de flyvende, uden fart og tyngde).
    // En boble, der står lige under pladserne/ordet øverst, rykkes ned under dem
    function stilBoble(b, w, hh) {
      const r = boblePx() / 2;
      const x = w * b.stille.fx;
      let yMin = r + 8;
      if (st.stilleVis) {
        const f = felt.getBoundingClientRect(), v = st.stilleVis.getBoundingClientRect();
        if (x + r > v.left - f.left - 8 && x - r < v.right - f.left + 8) yMin = v.bottom - f.top + r + 8;
      }
      const y = Math.min(Math.max(yMin, hh * b.stille.fy), Math.max(yMin, hh - r - 8));
      b.pos = { x: x, y: y };
      b.bane = { x0: x, y0: y + r, vx: 0, vy: 0, g: 0, T: Infinity };
      b.el.style.transform = 'translate(' + (x - r) + 'px, ' + (y - r) + 'px)';
    }
    // Hjælp i en stille bølge (efter to forkerte): den boble, der skal rammes nu, lyser — i 'alle' begge, i 'midt'
    // også ordets midterste bogstav
    function stilleHjaelp(r) {
      const maal = r.raekke ? r.raekke[st.nr] : r.bogstav;
      st.bobler.forEach((x) => x.el.classList.toggle('hjaelp', !x.ramt && x.b === maal));
      if (r.stille === 'midt' && st.stilleVis) st.stilleVis.children[1].classList.add('hjaelp');
    }
    // Animationen: hver boble følger sin bue (requestAnimationFrame); når alle er landet, kommer en ny boelge
    function frame(nu) {
      if (!st.aktiv || token !== S.token) return;
      const r = boblePx() / 2;
      let iLuften = 0;
      for (const b of st.bobler) {
        if (b.ramt) continue;
        if (b.stille) { iLuften++; continue; } // venter på barnet
        const t = (nu - b.t0) / 1000;
        if (t < 0) { b.el.style.transform = 'translate(-999px, -999px)'; iLuften++; continue; }
        if (t > b.bane.T) { b.el.style.transform = 'translate(-999px, -999px)'; b.ude = true; continue; }
        const p = D.banePunkt(b.bane, t);
        b.pos = { x: p.x, y: p.y - r };
        b.el.style.transform = 'translate(' + (p.x - r) + 'px, ' + (p.y - 2 * r) + 'px)';
        iLuften++;
      }
      if (!iLuften && !st.laast && st.bobler.length) { st.forsoeg++; boelge(); }
      requestAnimationFrame(frame);
    }
    // Ramt: det rigtige deles med en lille lyd og et point; et forkert flyver bare videre
    function ram(b) {
      if (st.laast || b.ramt) return;
      const r = runde[st.i];
      // To lyde i rækkefølge (D2): den, der skal rammes nu, er den næste i rækken — omvendt rækkefølge er forkert
      const maal = r.raekke ? r.raekke[st.nr] : r.bogstav;
      // Forkert: boblen ryster og flyver videre — ingen straf, men det tæller ikke som rigtigt i første forsøg
      if (b.b !== maal) {
        st.forkertHer = true; b.el.classList.remove('forbi'); void b.el.offsetWidth; b.el.classList.add('forbi');
        // Stille bølge: efter to forkerte lyser den, der skal rammes nu
        if (r.stille && ++st.forkerteStille >= 2) stilleHjaelp(r);
        return;
      }
      b.ramt = true;
      b.el.classList.add('delt');
      // To lyde i rækkefølge: den første får kun et kort tik — plinget (ca. 0,9 s) dækkede lyd nr. 2 (code-review #6)
      if (r.raekke && st.nr === 0) Lyd.tael(); else Lyd.pling();
      // Stille bølge: begge bobler med lyden skal rammes, før der er point og en ny lyd
      if (r.stille === 'alle' && st.bobler.some((x) => !x.ramt && x.b === r.bogstav)) return;
      // Rækkefølgen: bogstavet lægges på sin plads; først når begge er ramt, er der point
      if (r.raekke) {
        const plads = st.stilleVis ? st.stilleVis.querySelectorAll('.jagt-plads')[st.nr] : null;
        if (plads) { plads.textContent = b.b; plads.classList.add('fyldt'); }
        st.nr++;
        if (st.nr < r.raekke.length) { if (st.forkerteStille >= 2) stilleHjaelp(r); return; }
      }
      if (r.stille === 'midt' && st.stilleVis) { const m = st.stilleVis.children[1]; m.classList.remove('hjaelp'); m.classList.add('fundet'); }
      st.laast = true;
      Lyd.stopKlip(); // bølgens lyd er forbi — et klip, der stadig hentes, må ikke lyde i næste bølge
      st.point++;
      pointTal.textContent = String(st.point);
      lyde.children[st.i].classList.add('fuld');
      const rigtig = st.forsoeg === 0 && !st.forkertHer;
      st.rigtige.push(rigtig);
      // Første forsøg tæller i trinnet (som de andre emner: op ved 4 af 5, ned ved 3 forkerte i træk)
      const res = O.opdaterNiveau(G.normaliserEmne(data.dansk.jagt), rigtig, 3);
      data.dansk.jagt = res.data;
      data.dansk.jagt.ialt++;
      if (rigtig) data.dansk.jagt.rigtige++;
      const d = G.dag(data); d.opgaver++; if (rigtig) d.rigtige++;
      gem();
      setTimeout(() => {
        if (!st.aktiv || token !== S.token) return;
        st.i++;
        st.forsoeg = 0;
        st.forkertHer = false;
        st.laast = false;
        if (st.i < runde.length) boelge(); else slut();
      }, 1100);
    }
    function slut() {
      st.aktiv = false;
      st.bobler.forEach((b) => b.el.remove());
      if (st.stilleVis) { st.stilleVis.remove(); st.stilleVis = null; }
      stopUr();
      S.runde = {
        verden: verden, emne: 'jagt', opgaver: runde.map((x) => ({ svar: x.bogstav })), i: runde.length, forsoeg: 0, frit: !!frit,
        sidstAktiv: Date.now(), aktivMs: 0, niveauOp: false, registreret: -1,
        maerke: O.maerkeForRunde(T.samling, data.runderIalt, minFigur().e, data.maerker), navnMaa: navnTur(),
      };
      afslutRunde();
    }
    // Strøg med pen eller finger: hvert stykke af strøget testes mod alle bobler i luften
    let sidst = null, sporPunkter = [];
    const pkt = (e) => { const f = felt.getBoundingClientRect(); return { x: e.clientX - f.left, y: e.clientY - f.top }; };
    const tjek = (p, q) => { const r = boblePx() / 2; for (const b of st.bobler) if (!b.ramt && b.pos && D.strygRammer(p, q, b.pos, r)) ram(b); };
    const tegnSpor = () => { spor.textContent = ''; if (sporPunkter.length > 1) svgEl('polyline', { points: sporPunkter.map((p) => p.x + ',' + p.y).join(' '), class: 'jagt-streg' }, spor); };
    felt.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      Lyd.init();
      if (felt.setPointerCapture) felt.setPointerCapture(e.pointerId);
      sidst = pkt(e);
      sporPunkter = [sidst];
      tjek(sidst, sidst);
    });
    felt.addEventListener('pointermove', (e) => {
      if (!sidst) return;
      const p = pkt(e);
      tjek(sidst, p);
      sidst = p;
      sporPunkter.push(p);
      if (sporPunkter.length > 14) sporPunkter.shift();
      tegnSpor();
    });
    ['pointerup', 'pointercancel'].forEach((t) => felt.addEventListener(t, () => { sidst = null; sporPunkter = []; setTimeout(tegnSpor, 120); }));
    felt.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    // Vendes skærmen midt i en bølge, skaleres boblernes baner til det nye felt (ellers flyver de uden for skærmen)
    let felStr = null;
    vedStoerrelse(felt, () => {
      const w = felt.clientWidth, hh = felt.clientHeight;
      if (!w || !hh) return;
      if (felStr && (felStr.w !== w || felStr.h !== hh)) {
        const sx = w / felStr.w, sy = hh / felStr.h;
        st.bobler.forEach((x) => {
          if (x.stille) { if (!x.ramt) stilBoble(x, w, hh); return; }
          const B = x.bane; x.bane = Object.assign({}, B, { x0: B.x0 * sx, vx: B.vx * sx, y0: B.y0 * sy, vy: B.vy * sy, g: B.g * sy });
        });
      }
      felStr = { w: w, h: hh };
    });
    Tale.sig('Bogstavjagt! Lyt, og stryg gennem det bogstav, du hører.');
    setTimeout(() => { if (token === S.token) { boelge(); requestAnimationFrame(frame); } }, 2600 * TEMPO + 200);
  }

  // Til test og voksendelen. _testRunde viser bestemte opgaver (bruges kun af test/test-e2e.js).
  window.Spil = {
    FIGURER, VERDENER, S, get data() { return data; }, _lyd: Lyd, _palet: Palet, _forloeb: Forloeb,
    _pause: { BEVAEGELSER, PAUSE_INTRO, SPRING_EFTER, pauseOevelser, vis: () => visBevaegelse(() => visKort(false)) },
    DANSK_VERDENER,
    ENGELSK_VERDENER,
    NATUR_VERDENER,
    _visHistorie(nr) { visHistorieSide(nr, true); },
    _startVerden(id, frit) { startRunde(alleVerdener().find((v) => v.id === id), { frit: !!frit }); },
    _piper: Piper, // test-e2e «piper»: listen er hentet
    _visLektion(verdenId) { const v = alleVerdener().find((x) => x.id === verdenId); visLektion(v, () => visKort(false), () => visKort(false)); },
    // ekstra (valgfri): fx { quiz: { nr: 1, frit: true } } — runden opfører sig som Historiebogens 🤔-runde (gemmer intet)
    _testRunde(verdenId, opgaver, ekstra) {
      const verden = alleVerdener().find((v) => v.id === verdenId) || alleVerdener().find((v) => v.emne === verdenId); // verdens-id eller emne
      S.runde = Object.assign({ verden: verden, emne: verden.emne, opgaver: opgaver, i: 0, forsoeg: 0, sidstAktiv: Date.now(), aktivMs: 0, niveauOp: false, registreret: -1, test: true, maerke: O.maerkeForRunde(T.samling, data.runderIalt, minFigur().e, data.maerker) }, ekstra || {});
      visRundeSkaerm();
    },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
