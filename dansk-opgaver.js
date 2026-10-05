/* dansk-opgaver.js — den danske del af Lystårnet: ordlister, lydliste, rim, små ord, historier og
   opgavegeneratorer. Rene funktioner uden DOM, så alt kan testes i Node (test/test-dansk.js).
   Alle ord, rim og historier er egne (docs/DANSK-ANALYSE.md) — intet fra læsehæfter eller skolebøger.
   Bruger Opgaver (opgaver.js) til tilfældighed og sværhedsgrad. */
(function (root) {
  'use strict';

  const O = (typeof module !== 'undefined' && module.exports) ? require('./opgaver.js') : root.Opgaver;
  const { lavRng, heltal, vaelg, bland } = O;

  const ALFABET = 'abcdefghijklmnopqrstuvwxyzæøå'.split('');
  const VOKALER = 'aeiouyæøå';
  const erVokal = (b) => VOKALER.indexOf(b) >= 0;

  // ---------- Ordlister (DANSK-ANALYSE afsnit 7). Kun ord med en entydig emoji. ----------
  // Gruppe A: to bogstaver · B: tre bogstaver · C: konsonantklynger · D: to–tre stavelser · E: ikke-lydrette
  // ny: emojien findes ikke på ældre iPads (iOS < 16.4) — ordet bruges ikke i opgaverne
  const ORDLISTE = {
    A: 'is🍦 ø🏝️ æg🥚 ur⌚ ko🐄 bi🐝 fe🧚 to2️⃣ ti🔟 ni9️⃣',
    B: 'sol☀️ mus🐭 hus🏠 bus🚌 bil🚗 kat🐈 hat🎩 lam🐑 ris🍚 gul🟡 bøf🥩 pen🖊️ sok🧦 lys💡 lyn⚡ fem5️⃣ jul🎄 sæl🦭 mål🥅 nål🪡 hul🕳️ kys💋 gås🪿 kål🥬 kok🧑‍🍳 dør🚪',
    C: 'ost🧀 ske🥄 sne❄️ tre3️⃣ seks6️⃣ hest🐎 telt⛺ fly✈️ frø🐸 træ🌳 mælk🥛 blå🔵 svamp🍄 flag🇩🇰 dans💃 stol🪑 bro🌉 sko👟 ski🎿 slot🏰 kost🧹 gris🐷 blomst🌸 post📮 vest🦺 sky☁️ skæg🧔 smør🧈',
    D: 'abe🐒 hane🐓 due🕊️ rose🌹 løve🦁 gave🎁 vase🏺 næse👃 måne🌙 kano🛶 sofa🛋️ banan🍌 tomat🍅 kamel🐫 kanin🐰 robot🤖 dino🦕 delfin🐬 palme🌴 æble🍎 krone👑 plante🪴 yoyo🪀 kokos🥥 ananas🍍 tulipan🌷 elefant🐘 dåse🥫 svane🦢 bamse🧸 pose🛍️ bue🏹 flue🪰 kjole👗 øre👂 fire4️⃣',
    E: 'bog📖 tog🚂 hund🐕 mund👄 and🦆 mand👨 tand🦷 vand💧 hånd✋ bånd🎀 rød🔴 brød🍞 båd⛵ tråd🧵 ged🐐 fod🦶 mad🍽️ hav🌊 sav🪚 ræv🦊 syv7️⃣ fisk🐟 fugl🐦 ugle🦉 hjul🛞 hjerte❤️ hval🐋 kage🍰 pige👧 dreng👦 seng🛏️ ring💍 regn🌧️ kniv🔪 tøj👕 øje👁️ otte8️⃣ nisse🎅 jakke🧥 rotte🐀 tromme🥁 vaffel🧇 gaffel🍴 bold⚽ citron🍋 cykel🚲',
  };
  const NYE_EMOJI = ['gås', 'hjul'];
  const ORD = {};
  for (const g of Object.keys(ORDLISTE)) {
    for (const del of ORDLISTE[g].split(' ')) {
      const m = /^([a-zæøå]+)(.+)$/.exec(del);
      ORD[m[1]] = { ord: m[1], e: m[2], gruppe: g, lydret: g !== 'E', ny: NYE_EMOJI.indexOf(m[1]) >= 0 };
    }
  }
  const ordIGruppe = (grupper) => Object.keys(ORD).filter((o) => grupper.indexOf(ORD[o].gruppe) >= 0 && !ORD[o].ny);

  // ---------- Rimgrupper (afsnit 8). Rim er lyd — derfor en liste, ikke endelsesbogstaver. ----------
  const RIM = [
    ['mus', 'hus', 'bus'], ['kat', 'hat'], ['sol', 'stol'], ['is', 'ris', 'gris'], ['ko', 'sko', 'bro', 'to'],
    ['lys', 'kys'], ['gul', 'hul', 'jul', 'hjul'], ['mål', 'nål', 'kål'], ['sok', 'kok'], ['hest', 'vest'],
    ['dør', 'smør'], ['frø', 'ø'], ['bi', 'ti', 'ni', 'ski'], ['fe', 'ske', 'sne', 'tre'], ['ost', 'kost', 'post'],
    ['æg', 'skæg'], ['fly', 'sky'], ['due', 'flue', 'bue'], ['hane', 'svane'], ['rose', 'pose'],
    ['tand', 'mand', 'and', 'vand'], ['hund', 'mund'], ['bog', 'tog'], ['rød', 'brød'], ['båd', 'tråd'],
    ['hånd', 'bånd'], ['seng', 'dreng'],
  ].map((g) => g.filter((o) => ORD[o] && !ORD[o].ny)).filter((g) => g.length >= 2);
  const rimGruppe = (ord) => RIM.find((g) => g.indexOf(ord) >= 0) || null;

  // Rimdelen (fra den betonede vokal til enden) — bruges kun til at holde «næsten-rim» UDE af de forkerte valg.
  // Ender ordet på et tryksvagt e (hane, rose), tæller vokalen før med.
  function rimdel(ord) {
    let i = ord.length - 1;
    while (i >= 0 && !erVokal(ord[i])) i--;
    while (i > 0 && erVokal(ord[i - 1])) i--;
    if (ord[ord.length - 1] === 'e' && i === ord.length - 1 && i > 0) {
      let j = i - 1;
      while (j >= 0 && !erVokal(ord[j])) j--;
      while (j > 0 && erVokal(ord[j - 1])) j--;
      if (j >= 0) i = j;
    }
    return ord.slice(Math.max(0, i));
  }
  const rimerPaa = (a, b) => a !== b && ((rimGruppe(a) && rimGruppe(a) === rimGruppe(b)) || rimdel(a) === rimdel(b));

  // ---------- Bogstaverne i den rækkefølge, de kommer (afsnit 5) ----------
  const RAEKKEFOELGE = 'solimuaktenrbåhfgødypævjcqwxz'.split('');
  const HOLDELYDE = 'mslfnvr'.split('');
  const STOPLYDE = 'ptkbdg'.split('');
  const KUN_NAVN = 'qwxz'.split('');
  // Bogstavets id i lydlisten (æ, ø, å skrives ae, oe, aa i filnavne)
  const lydId = (b) => 'lyd-' + ({ æ: 'ae', ø: 'oe', å: 'aa' }[b] || b);
  const navnId = (b) => 'navn-' + ({ æ: 'ae', ø: 'oe', å: 'aa' }[b] || b);
  // Navnet, som talesyntesen siger (det store bogstav læses som navnet)
  const NAVNE = { a: 'a', b: 'be', c: 'se', d: 'de', e: 'e', f: 'æf', g: 'ge', h: 'hå', i: 'i', j: 'jåd', k: 'kå', l: 'æl', m: 'æm', n: 'æn', o: 'o', p: 'pe', q: 'ku', r: 'ær', s: 'æs', t: 'te', u: 'u', v: 've', w: 'dobbelt-ve', x: 'æks', y: 'y', z: 'sæt', æ: 'æ', ø: 'ø', å: 'å' };

  // ---------- Lydliste til indtaling (afsnit 6) — 🎙️ Indtal i voksendelen bruger den ----------
  const LYDLISTE = [
    ['a', 'Langt, lyst «aaa» som i abe — ikke det mørke a i far.', 'abe'],
    ['b', 'Kort «b»: luk læberne, slip, stop. Intet «ø» bagefter.', 'bi'],
    ['c', 'Kun navnet «se».', ''],
    ['d', 'Kort «d» med tungespidsen bag fortænderne. Stop straks.', 'due'],
    ['e', 'Langt «eee» som i se og fe (ikke «æ»).', 'fe'],
    ['f', 'Hold «fff» — kun luft mellem tænder og underlæbe.', 'fem'],
    ['g', 'Kort, hårdt «g» som i gul. Aldrig «gø» eller «j».', 'gul'],
    ['h', 'Et kort pust «hhh» uden stemme.', 'hus'],
    ['i', 'Langt «iii» som i is.', 'is'],
    ['j', '«jjj» som starten af ja, holdt kort.', 'jul'],
    ['k', 'Kort «k» bagest i munden. Stop straks.', 'ko'],
    ['l', 'Hold «lll» med tungespidsen oppe.', 'lam'],
    ['m', 'Hold «mmm» med lukkede læber.', 'mus'],
    ['n', 'Hold «nnn».', 'ni'],
    ['o', 'Langt, rundt «ooo» som i ko og sol.', 'ko'],
    ['p', 'Kort «p»: læberne, et lille pust, stop.', 'pen'],
    ['q', 'Kun navnet «ku».', ''],
    ['r', '«rrr» bagest i halsen, blødt (dansk r).', 'ris'],
    ['s', 'Hold «sss».', 'sol'],
    ['t', 'Kort «t» med tungespidsen. Stop straks.', 'ti'],
    ['u', 'Langt «uuu» som i hus og mus.', 'mus'],
    ['v', 'Hold «vvv» med stemme (ikke «f»).', 'vase'],
    ['w', 'Kun navnet «dobbelt-ve».', ''],
    ['x', 'Kun navnet «æks».', ''],
    ['y', 'Langt «yyy» som i lys — rundede læber.', 'lys'],
    ['z', 'Kun navnet «sæt».', ''],
    ['æ', 'Langt «æææ» som i æble.', 'æble'],
    ['ø', 'Langt «øøø» som i ø og sø.', 'ø'],
    ['å', 'Langt «ååå» som i mål.', 'mål'],
  ].map(([b, instruktion, eks]) => ({ id: lydId(b), bogstav: b, instruktion: instruktion, eksempel: eks }))
    .concat([
      { id: 'lyd-c-s', bogstav: 'c', instruktion: 'c siger tit s: hold «sss».', eksempel: 'cykel' },
      { id: 'lyd-a-kort', bogstav: 'a', instruktion: 'Kort, fladt «a» som i kat.', eksempel: 'kat' },
      { id: 'lyd-o-aaben', bogstav: 'o', instruktion: 'Kort, åbent o som i ost og sok.', eksempel: 'ost' },
      { id: 'lyd-e-tryksvag', bogstav: 'e', instruktion: 'Svagt e som sidst i abe.', eksempel: 'abe' },
      { id: 'lyd-d-bloed', bogstav: 'd', instruktion: 'Blødt d som i rød (tungen bred mod undertænderne).', eksempel: 'rød' },
    ]);
  // Reserve, når et klip mangler: aldrig bogstavets navn — men «lyden i sol»
  function lydReserve(b) {
    const l = LYDLISTE.find((x) => x.id === lydId(b));
    return l && l.eksempel ? 'lyden i ' + l.eksempel : 'bogstavet ' + b;
  }

  // ---------- Små ord i den rækkefølge, de kommer (afsnit 9). † = ikke-lydret, lyderes aldrig ----------
  const SMAAORD_LISTE = {
    1: 'se en er† det† min her nej og† to de† et der† i på mig† dig† vi får† jeg† du ser den lille†',
    2: 'ja stor vil op kan ikke† har† må få siger† sød† kom til så med† om nu skal',
    3: 'have† glad† god† hun han ud var† hvad† af† at† ned ind fra hen som ham kunne† sagde†',
  };
  const SMAAORD = {};
  for (const t of Object.keys(SMAAORD_LISTE)) {
    for (const del of SMAAORD_LISTE[t].split(' ')) SMAAORD[del.replace('†', '')] = { ord: del.replace('†', ''), trin: Number(t), lydret: del.indexOf('†') < 0 };
  }

  // ---------- Egne historier (afsnit 10) — Historiebogen (B5) ----------
  // * efter et ord = undtagelse (ikke på listerne; læses op og lyderes ikke)
  const HISTORIER = [
    { nr: 1, titel: 'Is', e: '🍦', linjer: ['Se en is.', 'Det er min is.', 'Her er en mus.', 'Nej, mus! Min is.'], tegn: 'en mus, der kigger på en is', skriv: ['is'] },
    { nr: 2, titel: 'Ko og kat', e: '🐄', linjer: ['Se en ko.', 'Se en kat.', 'Ko og kat.', 'De er to.'], tegn: 'en ko og en kat', skriv: ['ko', 'kat'] },
    { nr: 3, titel: 'Hus', e: '🏠', linjer: ['Her er et hus.', 'Der er en mus.', 'Mus er i hus.', 'Se! En kat!'], tegn: 'huset med musen og katten', skriv: ['hus', 'mus'] },
    { nr: 4, titel: 'Sol', e: '☀️', linjer: ['Se, en sol!', 'Sol på mig.', 'Sol på dig.', 'Vi får is.'], tegn: 'solen og to børn med is', skriv: ['sol'] },
    { nr: 5, titel: 'Bus', e: '🚌', linjer: ['Her er en bus.', 'Jeg er i bus.', 'Du er i bus.', 'Vi ser en ko.'], tegn: 'bussen og koen i vinduet', skriv: ['bus'] },
    { nr: 6, titel: 'Bi', e: '🐝', linjer: ['Se en bi.', 'Den er lille.', 'Bi på min hat.', 'Nej, bi! Nej!'], tegn: 'en bi på en hat', skriv: ['bi', 'hat'] },
    { nr: 7, titel: 'Hest', e: '🐎', linjer: ['Her er en hest.', 'Den er stor.', 'Jeg vil op.', 'Op på hest!'], tegn: 'barnet oppe på hesten', skriv: ['hest', 'op'] },
    { nr: 8, titel: 'Sne', e: '❄️', linjer: ['Se! Det er sne.', 'Sne på hus.', 'Sne på træ.', 'Sne på min hat.'], tegn: 'hus, træ og hat med sne', skriv: ['sne'] },
    { nr: 9, titel: 'Gris', e: '🐷', linjer: ['Her er en gris.', 'Den er lille og sød.', 'Gris, kom til mig!', 'Så får gris et kys.'], tegn: 'grisen får et kys', skriv: ['gris'] },
    { nr: 10, titel: 'Abe', e: '🐒', linjer: ['En abe er i et træ.', 'Den har en banan.', 'Må jeg få en?', 'Nej! siger abe.'], tegn: 'aben i træet med bananer', skriv: ['abe', 'banan'] },
    { nr: 11, titel: 'Fly', e: '✈️', linjer: ['Se et fly!', 'Jeg vil med.', 'Du må ikke.', 'Så ser jeg på det.'], tegn: 'flyet og barnet, der kigger op', skriv: ['fly'] },
    { nr: 12, titel: 'Mælk', e: '🥛', linjer: ['Jeg har et glas*.', 'Der er mælk i.', 'Kat ser mælk.', 'Nej, kat! Min mælk!'], tegn: 'katten og glasset med mælk', skriv: ['mælk'] },
    { nr: 13, titel: 'Hund og mund', e: '🐕', linjer: ['Her er min hund.', 'Den har en stor mund.', 'Den vil have mad.', 'Så er den glad.'], tegn: 'hunden med sin mad', skriv: ['hund', 'mund'] },
    { nr: 14, titel: 'Rød', e: '🔴', linjer: ['Jeg har en rød bil.', 'Du har en rød båd.', 'Her er et rødt* brød.', 'Rød, rød, rød!'], tegn: 'bilen, båden og brødet', skriv: ['rød'] },
    { nr: 15, titel: 'Fisk', e: '🐟', linjer: ['Her er en fisk.', 'Den er i et glas*.', 'Kat ser på fisk.', 'Fisk ser på kat.'], tegn: 'fisken i glasset og katten', skriv: ['fisk'] },
    { nr: 16, titel: 'Bog og tog', e: '📖', linjer: ['Jeg har en bog.', 'Den er om et tog.', 'Se! Her er et tog!', 'Tog og bog, bog og tog.'], tegn: 'bogen og toget', skriv: ['bog', 'tog'] },
    { nr: 17, titel: 'Tand', e: '🦷', linjer: ['Jeg har en tand, se!', 'Den er løs*.', 'Og så — pop*!', 'Nu har jeg et hul.'], tegn: 'barnet med hul i tandrækken', skriv: ['tand', 'hul'] },
    { nr: 18, titel: 'Måne', e: '🌙', linjer: ['Se, en måne!', 'Den er stor og gul.', 'Jeg ser på den.', 'Så må jeg i seng.'], tegn: 'månen og barnet ved vinduet', skriv: ['jeg', 'ser', 'en', 'måne'] },
  ];
  // Ordene i en linje (uden tegn og *), som de står — «Nej, mus! Min is.» → ['Nej', 'mus', 'Min', 'is']
  const ordILinje = (linje) => linje.split(/\s+/).map((w) => w.replace(/[^A-Za-zÆØÅæøå]/g, '')).filter(Boolean);
  const undtagelser = (h) => h.linjer.join(' ').split(/\s+/).filter((w) => w.indexOf('*') >= 0).map((w) => w.replace(/[^a-zæøå]/gi, '').toLowerCase());

  // ---------- Håndskrift: prikkede forlæg til små bogstaver (afsnit 11) ----------
  // Kasse 100 × 100: overlinje y = 15, x-linje 40, grundlinje 75, underlinje 95. Hvert strøg er en liste af
  // punkter i skriveretningen; første punkt er startprikken. Runde former mod uret (som c), streger oppefra og ned.
  // Vinkler i grader med y nedad: 0 = kl. 3, −90 = kl. 12, −60 = kl. 2, 30 = kl. 4. Mod uret = faldende vinkel.
  function bue(cx, cy, rx, ry, fra, til) {
    const ud = [];
    const n = Math.max(2, Math.ceil(Math.abs(til - fra) / 15));
    for (let i = 0; i <= n; i++) {
      const v = (fra + (til - fra) * i / n) * Math.PI / 180;
      ud.push([Math.round((cx + rx * Math.cos(v)) * 10) / 10, Math.round((cy + ry * Math.sin(v)) * 10) / 10]);
    }
    return ud;
  }
  const BY = 57.5, BR = 17.5; // midten og den lodrette radius af de runde små bogstaver
  const SKRIFT = {
    a: [bue(48, BY, 14, BR, -60, -420).concat([[62, 40], [62, 75]])],
    b: [[[36, 15], [36, 75], [36, 48]].concat(bue(50, BY, 14, BR, -150, 150))],
    c: [bue(52, BY, 15, BR, -60, -330)],
    d: [bue(46, BY, 14, BR, -60, -420).concat([[60, 40], [60, 15], [60, 75]])],
    e: [[[36, BY], [65, BY]].concat(bue(50, BY, 15, BR, 0, -330))],
    f: [[[62, 19], [56, 15], [49, 17], [47, 24], [47, 75]], [[38, 40], [60, 40]]],
    g: [bue(48, BY, 14, BR, -60, -420).concat([[62, 40], [62, 90], [57, 96], [47, 97], [39, 93]])],
    h: [[[36, 15], [36, 75], [36, 50], [41, 43], [50, 40], [59, 43], [63, 51], [63, 75]]],
    i: [[[50, 40], [50, 75]], [[50, 27], [50, 30]]],
    j: [[[55, 40], [55, 90], [50, 96], [42, 96], [37, 91]], [[55, 27], [55, 30]]],
    k: [[[36, 15], [36, 75]], [[62, 40], [37, 60], [63, 75]]],
    l: [[[50, 15], [50, 75]]],
    m: [[[28, 40], [28, 75], [28, 48], [33, 41], [41, 40], [47, 45], [48, 52], [48, 75], [48, 48], [53, 41], [61, 40], [67, 45], [68, 52], [68, 75]]],
    n: [[[36, 40], [36, 75], [36, 49], [42, 41], [51, 40], [59, 44], [62, 52], [62, 75]]],
    o: [bue(50, BY, 15, BR, -90, -450)],
    p: [[[36, 40], [36, 95], [36, 48]].concat(bue(50, BY, 14, BR, -150, 150))],
    q: [bue(48, BY, 14, BR, -60, -420).concat([[62, 40], [62, 95], [68, 91]])],
    r: [[[40, 40], [40, 75], [40, 51], [46, 43], [54, 40], [62, 43]]],
    s: [[[63, 45], [57, 40], [46, 40], [38, 45], [40, 53], [50, 57], [60, 61], [64, 68], [58, 75], [46, 75], [37, 70]]],
    t: [[[50, 25], [50, 69], [53, 75], [61, 75]], [[40, 40], [62, 40]]],
    u: [[[36, 40], [36, 66], [42, 74], [51, 75], [59, 70], [62, 61], [62, 40], [62, 75]]],
    v: [[[35, 40], [50, 75], [65, 40]]],
    w: [[[27, 40], [36, 75], [46, 47], [56, 75], [65, 40]]],
    x: [[[36, 40], [64, 75]], [[64, 40], [36, 75]]],
    y: [[[36, 40], [50, 75]], [[64, 40], [50, 75], [40, 95]]],
    z: [[[36, 40], [64, 40], [36, 75], [64, 75]]],
    æ: [bue(37, BY, 11, BR, -60, -420).concat([[48, 40], [48, 75]]), [[48, BY], [74, BY]].concat(bue(63, BY, 11, BR, 0, -330))],
    ø: [bue(50, BY, 15, BR, -90, -450), [[35, 79], [65, 36]]],
    å: [bue(48, BY, 14, BR, -60, -420).concat([[62, 40], [62, 75]]), bue(50, 24, 6, 6, -90, -450)],
  };
  // Hvad den voksne/oplæsningen siger om skrivevejen
  const SKRIVEVEJ = {
    a: 'rundt — og ned', b: 'ned — op — rundt', c: 'rundt', d: 'rundt — op — ned', e: 'hen — og rundt', f: 'krog — ned. Streg på tværs',
    g: 'rundt — ned — krog', h: 'ned — op — over og ned', i: 'ned. Prik', j: 'ned — krog. Prik', k: 'ned. Ind — og ud', l: 'ned', m: 'ned — op — over — over',
    n: 'ned — op — over', o: 'rundt', p: 'ned — op — rundt', q: 'rundt — ned', r: 'ned — op — lille bue', s: 'bue — og bue', t: 'ned — krog. Streg på tværs',
    u: 'ned — rundt — op — ned', v: 'ned — op', w: 'ned — op — ned — op', x: 'skråt. Skråt', y: 'skråt. Skråt og ned', z: 'hen — skråt — hen',
    æ: 'rundt og ned. Hen og rundt', ø: 'rundt. Streg på skrå', å: 'rundt og ned. Lille ring',
  };
  const BOGSTAV_BREDDE = 56; // afstand mellem bogstaverne i et ord (forlæggene fylder ca. x = 27–74)

  // Forlægget til et helt ord: strøgene for hvert bogstav, forskudt mod højre. Kun små bogstaver a–å.
  function forlaegOrd(ord) {
    const ud = { bredde: 0, strøg: [], bogstaver: [] };
    String(ord).toLowerCase().split('').forEach((b, i) => {
      const dx = i * BOGSTAV_BREDDE;
      if (!SKRIFT[b]) return;
      const fra = ud.strøg.length;
      SKRIFT[b].forEach((s) => ud.strøg.push(s.map(([x, y]) => [x + dx, y])));
      ud.bogstaver.push({ b: b, dx: dx, strøg: [fra, ud.strøg.length] });
    });
    ud.bredde = String(ord).length * BOGSTAV_BREDDE + 44;
    return ud;
  }

  // Punkter langs et strøg med fast afstand (så lange og korte stykker vægtes ens)
  function langs(strøg, afstand) {
    const ud = [strøg[0]];
    for (let i = 1; i < strøg.length; i++) {
      const [x0, y0] = strøg[i - 1], [x1, y1] = strøg[i];
      const l = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.max(1, Math.ceil(l / afstand));
      for (let k = 1; k <= n; k++) ud.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]);
    }
    return ud;
  }
  const afst = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  // Vurdér et spor mod forlægget (begge i forlæggets koordinater). Ingen skønhedskrav — kun:
  //  start: hvert strøg er begyndt ved (eller nær) startprikken,
  //  retning: punkterne nær strøget er tegnet i strøgets retning (mest fremad),
  //  dækning: mindst 70 % af forlægget har et tegnet punkt inden for tolerancen,
  //  og sporet ligger mest på forlægget (ikke kruseduller over det hele).
  function vurderSpor(forlaeg, spor, tol) {
    tol = tol || 11;
    const brugerStrøg = (spor || []).filter((s) => Array.isArray(s) && s.length);
    const alle = [];
    brugerStrøg.forEach((s, si) => langs(s, 3).forEach((p) => alle.push({ p: p, si: si })));
    const res = { ok: false, start: true, retning: true, daekning: 0, paaForlaeg: 0, strøg: [] };
    if (!alle.length) return res.start = false, res;
    const proever = forlaeg.map((f) => langs(f, 2));
    // Hvert tegnet punkt hører til det strøg i forlægget, det ligger nærmest
    for (const a of alle) {
      let bedst = -1, bd = Infinity;
      proever.forEach((pr, fi) => pr.forEach((q) => { const dd = afst(a.p, q); if (dd < bd) { bd = dd; bedst = fi; } }));
      a.fi = bedst;
    }
    let daekket = 0, ialt = 0;
    for (let fi = 0; fi < forlaeg.length; fi++) {
      const f = forlaeg[fi];
      const pr = proever[fi];
      const kort = afst(f[0], f[f.length - 1]) < 6 && pr.length < 4; // en prik (i, j)
      let d = 0;
      for (const q of pr) if (alle.some((a) => afst(a.p, q) <= tol)) d++;
      daekket += d; ialt += pr.length;
      const start = brugerStrøg.some((s) => afst(s[0], f[0]) <= tol * 1.4);
      // Retning: sporets punkter nær strøget i tegnerækkefølge → plads langs strøget; flest skridt fremad
      let frem = 0, tilbage = 0, forrige = null;
      if (!kort) {
        for (const a of alle) {
          let bedst = -1, bd = tol;
          if (a.fi === fi) pr.forEach((q, i) => { const dd = afst(a.p, q); if (dd <= bd) { bd = dd; bedst = i; } });
          if (bedst < 0) { forrige = null; continue; }
          // Kun små skridt tæller (et hop fra enden af en cirkel til starten er ikke «baglæns»)
          if (forrige !== null && forrige.si === a.si && Math.abs(bedst - forrige.i) < pr.length / 3) {
            if (bedst > forrige.i + 1) frem++; else if (bedst < forrige.i - 1) tilbage++;
          }
          forrige = { i: bedst, si: a.si };
        }
      }
      const retning = kort || frem >= tilbage;
      res.strøg.push({ daekning: d / pr.length, start: start || kort, retning: retning });
      if (!start && !kort) res.start = false;
      if (!retning) res.retning = false;
    }
    res.daekning = ialt ? daekket / ialt : 0;
    const alleForlaeg = [];
    forlaeg.forEach((f) => langs(f, 3).forEach((q) => alleForlaeg.push(q)));
    res.paaForlaeg = alle.filter((a) => alleForlaeg.some((q) => afst(a.p, q) <= tol * 2)).length / alle.length;
    res.ok = res.start && res.retning && res.daekning >= 0.7 && res.paaForlaeg >= 0.6;
    return res;
  }

  // ---------- Hjælpere til opgaver ----------
  const antalValg = (niveau) => (niveau <= 1 ? 2 : 3);
  const stort = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  function opgave(o) {
    // Fælles felter, så rundemotoren i app.js kan vise opgaven som de matematiske
    return Object.assign({ fag: 'dansk' }, o);
  }
  // Hjælpetrappen: hør igen langsomt → vis bogstavet (eller ordet) med et billede → svaret lyser
  const hjaelpBogstav = (b, ord) => ({ art: 'visBogstav', bogstav: b, ord: ord || '', e: ord && ORD[ord] ? ORD[ord].e : '' });
  // Et eksempelord, der starter med bogstavet (og ikke er et af valgene)
  function eksempelOrd(rng, b, undgaa) {
    const l = ordIGruppe(['A', 'B', 'C', 'D']).filter((o) => o[0] === b && (undgaa || []).indexOf(o) < 0);
    return l.length ? vaelg(rng, l) : '';
  }

  // =====================================================================
  //  Generatorer — emne, type, niveau → opgave (samme form som opgaver.js)
  // =====================================================================
  const GEN = {
    // ===== Rim =====
    // Trin 1: to valg, tydeligt forskellige · trin 2: tre valg, én med samme forlyd · trin 3: «hvilket passer ikke?»
    rim(niveau, rng) {
      const gruppe = vaelg(rng, RIM);
      const [stik, rigtig] = bland(rng, gruppe);
      const alle = Object.keys(ORD).filter((o) => !ORD[o].ny);
      const ikkeRim = alle.filter((o) => o !== stik && !rimerPaa(stik, o) && gruppe.indexOf(o) < 0 && ORD[o].e !== ORD[stik].e);
      let forkerte;
      if (niveau >= 2) {
        const sammeForlyd = bland(rng, ikkeRim.filter((o) => o[0] === stik[0]));
        const andre = bland(rng, ikkeRim.filter((o) => o[0] !== stik[0] && o[0] !== rigtig[0]));
        forkerte = sammeForlyd.slice(0, 1).concat(andre).slice(0, antalValg(niveau) - 1);
      } else {
        forkerte = bland(rng, ikkeRim.filter((o) => o[0] !== stik[0] && o[0] !== rigtig[0])).slice(0, 1);
      }
      const valg = bland(rng, forkerte.concat([rigtig]));
      return opgave({
        emne: 'rim', type: 'rim', niveau, noegle: 'rim:' + stik + '-' + rigtig, ikon: '🎵',
        tale: 'Hvad rimer på ' + stik + '? ' + valg.map(stort).join(', eller ') + '?',
        tekst: 'Hvad rimer på ' + stik + '?',
        vis: { art: 'ordBillede', ord: stik, e: ORD[stik].e },
        svar: rigtig, valg: valg, valgArt: 'emoji',
        hjaelp: [{ art: 'rimLyt', stik: stik, valg: valg }],
      });
    },
    passerIkke(niveau, rng) {
      const gruppe = vaelg(rng, RIM.filter((g) => g.length >= 3));
      const rimord = bland(rng, gruppe).slice(0, 3);
      const ikkeRim = Object.keys(ORD).filter((o) => !ORD[o].ny && rimord.every((r) => !rimerPaa(r, o) && r !== o) && gruppe.indexOf(o) < 0);
      const svar = vaelg(rng, ikkeRim);
      const valg = bland(rng, rimord.concat([svar]));
      return opgave({
        emne: 'rim', type: 'passerIkke', niveau, noegle: 'passerIkke:' + rimord[0] + '-' + svar, ikon: '🎵',
        tale: 'Tre af dem rimer. Hvilket ord passer ikke? ' + valg.map(stort).join(', ') + '.',
        tekst: 'Hvilket passer ikke?',
        vis: { art: 'lyt' },
        svar: svar, valg: valg, valgArt: 'emoji',
        hjaelp: [{ art: 'rimLyt', stik: rimord[0], valg: valg }],
      });
    },

    // ===== Lyde =====
    // Trin 1: hør lyden → find bogstavet (først holdelyde) · 2: hvad starter med lyden · 3: hvad slutter med lyden
    lydBogstav(niveau, rng) {
      const pulje = niveau <= 1 ? HOLDELYDE.concat(['a', 'i', 'o', 'u']) : RAEKKEFOELGE.filter((b) => KUN_NAVN.indexOf(b) < 0 && b !== 'c');
      const b = vaelg(rng, pulje);
      const andre = ulige(rng, pulje, b, antalValg(niveau) - 1);
      const valg = bland(rng, andre.concat([b]));
      return opgave({
        emne: 'lyde', type: 'lydBogstav', niveau, noegle: 'lydBogstav:' + b, ikon: '👂',
        tale: 'Hvilket bogstav siger',
        lyd: [{ klip: lydId(b), reserve: lydReserve(b) }],
        tekst: 'Hvilket bogstav hører du?',
        vis: { art: 'lytLyd' },
        svar: b, valg: valg, valgArt: 'bogstav',
        hjaelp: [{ art: 'hoerIgen' }, hjaelpBogstav(b, eksempelOrd(rng, b))],
      });
    },
    forlyd(niveau, rng) {
      const pulje = RAEKKEFOELGE.slice(0, 18).filter((b) => ordIGruppe(['A', 'B', 'C', 'D']).some((o) => o[0] === b));
      const b = vaelg(rng, pulje);
      const ord = ordIGruppe(['A', 'B', 'C', 'D']);
      const rigtig = vaelg(rng, ord.filter((o) => o[0] === b));
      const forkerte = bland(rng, ord.filter((o) => o[0] !== b)).filter((o, i, l) => l.findIndex((x) => x[0] === o[0]) === i).slice(0, antalValg(niveau) - 1);
      const valg = bland(rng, forkerte.concat([rigtig]));
      const eks = eksempelOrd(rng, b, valg);
      return opgave({
        emne: 'lyde', type: 'forlyd', niveau, noegle: 'forlyd:' + b, ikon: '👂',
        tale: 'Hvad starter med',
        lyd: [{ klip: lydId(b), reserve: eks ? 'samme lyd som ' + eks : lydReserve(b) }],
        efterTale: valg.map(stort).join(', eller ') + '?',
        tekst: 'Hvad starter med lyden?',
        vis: { art: 'bogstav', bogstav: b },
        svar: rigtig, valg: valg, valgArt: 'emoji',
        hjaelp: [{ art: 'hoerIgen' }, hjaelpBogstav(b, eks)],
      });
    },
    udlyd(niveau, rng) {
      const slut = 'slmntkp';
      const ord = ordIGruppe(['A', 'B', 'C', 'D']).filter((o) => slut.indexOf(o[o.length - 1]) >= 0);
      const b = vaelg(rng, slut.split('').filter((x) => ord.some((o) => o[o.length - 1] === x)));
      const rigtig = vaelg(rng, ord.filter((o) => o[o.length - 1] === b));
      const forkerte = bland(rng, ordIGruppe(['A', 'B', 'C', 'D']).filter((o) => o[o.length - 1] !== b && o[0] !== b))
        .filter((o, i, l) => l.findIndex((x) => x[x.length - 1] === o[o.length - 1]) === i).slice(0, 2);
      const valg = bland(rng, forkerte.concat([rigtig]));
      return opgave({
        emne: 'lyde', type: 'udlyd', niveau, noegle: 'udlyd:' + b, ikon: '👂',
        tale: 'Hvad slutter med',
        lyd: [{ klip: lydId(b), reserve: lydReserve(b) }],
        efterTale: valg.map(stort).join(', eller ') + '?',
        tekst: 'Hvad slutter med lyden?',
        vis: { art: 'bogstav', bogstav: b },
        svar: rigtig, valg: valg, valgArt: 'emoji',
        hjaelp: [{ art: 'hoerIgen' }, hjaelpBogstav(b, rigtig)],
      });
    },

    // ===== Alfabetet =====
    findBogstav(niveau, rng) {
      const pulje = ALFABET.filter((b) => KUN_NAVN.indexOf(b) < 0);
      const b = vaelg(rng, pulje);
      const andre = ulige(rng, pulje, b, antalValg(niveau) - 1);
      const valg = bland(rng, andre.concat([b]));
      return opgave({
        emne: 'alfabet', type: 'findBogstav', niveau, noegle: 'findBogstav:' + b, ikon: '🔤',
        tale: 'Find bogstavet',
        lyd: [{ klip: navnId(b), reserve: NAVNE[b], navn: true }],
        tekst: 'Find bogstavet',
        vis: { art: 'lytLyd' },
        svar: b, valg: valg, valgArt: 'bogstav',
        hjaelp: [{ art: 'hoerIgen' }, hjaelpBogstav(b, eksempelOrd(rng, b))],
      });
    },
    storLille(niveau, rng) {
      const pulje = ALFABET.filter((b) => KUN_NAVN.indexOf(b) < 0);
      const b = vaelg(rng, pulje);
      const andre = bland(rng, pulje.filter((x) => x !== b)).slice(0, antalValg(niveau) - 1);
      const valg = bland(rng, andre.concat([b]));
      return opgave({
        emne: 'alfabet', type: 'storLille', niveau, noegle: 'storLille:' + b, ikon: '🔤',
        tale: 'Her er et stort bogstav. Find det lille bogstav, der passer.',
        tekst: 'Find det lille bogstav',
        vis: { art: 'stortBogstav', bogstav: b },
        svar: b, valg: valg, valgArt: 'bogstav', kunLille: true,
        hjaelp: [{ art: 'hoerIgen' }, hjaelpBogstav(b, eksempelOrd(rng, b))],
      });
    },
    efterBogstav(niveau, rng) { return alfabetNabo(niveau, rng, 1); },
    foerBogstav(niveau, rng) { return alfabetNabo(niveau, rng, -1); },

    // ===== Lydering =====
    // Trin 1: hør lydene → find billedet · 2: ordet står skrevet → find billedet · 3: byg ordet af bogstaver
    lydering(niveau, rng) {
      const ord = ordIGruppe(['A', 'B']);
      const rigtig = vaelg(rng, ord);
      const forkerte = bland(rng, ord.filter((o) => o[0] !== rigtig[0] && ORD[o].e !== ORD[rigtig].e)).slice(0, antalValg(niveau) - 1);
      const valg = bland(rng, forkerte.concat([rigtig]));
      return opgave({
        emne: 'lydering', type: 'lydering', niveau, noegle: 'lydering:' + rigtig, ikon: '👂',
        tale: 'Lyt. Hvad siger det?',
        lyd: rigtig.split('').map((b) => ({ klip: lydId(b), reserve: '', pause: 500 })),
        efterTale: '',
        tekst: 'Hvad siger det?',
        vis: { art: 'lydering', ord: rigtig },
        svar: rigtig, valg: valg, valgArt: 'emoji',
        hjaelp: [{ art: 'hoerIgen', langsomt: true }, hjaelpBogstav(rigtig[0], rigtig)],
      });
    },
    laesOrd(niveau, rng) {
      const ord = ordIGruppe(['B', 'C']);
      const rigtig = vaelg(rng, ord);
      // Forkerte deler forlyd eller rimdel (mus/hus/bus), så billedet ikke kan gættes af første bogstav alene
      const naer = ord.filter((o) => o !== rigtig && ORD[o].e !== ORD[rigtig].e && (o[0] === rigtig[0] || rimdel(o) === rimdel(rigtig)));
      const fjern = ord.filter((o) => o !== rigtig && ORD[o].e !== ORD[rigtig].e && naer.indexOf(o) < 0);
      const forkerte = bland(rng, naer).concat(bland(rng, fjern)).slice(0, 2);
      const valg = bland(rng, forkerte.concat([rigtig]));
      return opgave({
        emne: 'lydering', type: 'laesOrd', niveau, noegle: 'laesOrd:' + rigtig, ikon: '📖',
        tale: 'Hvad står der? Tryk på bogstaverne, så hører du dem.',
        tekst: 'Hvad står der?',
        vis: { art: 'skrevetOrd', ord: rigtig },
        svar: rigtig, valg: valg, valgArt: 'emoji',
        hjaelp: [{ art: 'hoerIgen', langsomt: true }, hjaelpBogstav(rigtig[0], rigtig)],
      });
    },
    bygOrd(niveau, rng) {
      const ord = ordIGruppe(['B', 'C', 'D']).filter((o) => o.length >= 3 && o.length <= 5);
      const rigtig = vaelg(rng, ord);
      const ekstra = bland(rng, RAEKKEFOELGE.slice(0, 22).filter((b) => rigtig.indexOf(b) < 0)).slice(0, rigtig.length >= 5 ? 1 : 2);
      return opgave({
        emne: 'lydering', type: 'bygOrd', niveau, noegle: 'bygOrd:' + rigtig, ikon: '✏️',
        tale: 'Byg ordet ' + rigtig + '. Tryk på bogstaverne i den rigtige rækkefølge.',
        tekst: 'Byg ordet',
        vis: { art: 'bygOrd', ord: rigtig, e: ORD[rigtig].e },
        svar: rigtig, byg: { brikker: bland(rng, rigtig.split('').concat(ekstra)), dele: rigtig.length, adskil: '' },
        hjaelp: [{ art: 'hoerIgen', langsomt: true }, hjaelpBogstav(rigtig[0], rigtig)],
      });
    },

    // ===== Små ord =====
    findOrd(niveau, rng) {
      const pulje = Object.keys(SMAAORD).filter((o) => SMAAORD[o].trin <= Math.max(1, niveau));
      const rigtig = vaelg(rng, pulje);
      // Visuelt forskellige: ikke samme første bogstav og ikke samme længde, hvis det kan undgås
      const forskellige = pulje.filter((o) => o !== rigtig && o[0] !== rigtig[0]);
      const forkerte = bland(rng, forskellige).slice(0, antalValg(niveau) - 1);
      const valg = bland(rng, forkerte.concat([rigtig]));
      return opgave({
        emne: 'smaaord', type: 'findOrd', niveau, noegle: 'findOrd:' + rigtig, ikon: '👀',
        tale: 'Find ordet ' + rigtig + '.',
        tekst: 'Find ordet',
        vis: { art: 'lyt' },
        svar: rigtig, valg: valg, valgArt: 'skrevet',
        hjaelp: [{ art: 'hoerIgen', langsomt: true }, { art: 'visOrd', ord: rigtig }],
      });
    },
    ordISaetning(niveau, rng) {
      // En linje fra historierne med 3–4 forskellige ord, hvoraf mindst ét er et småord
      const linjer = [];
      HISTORIER.forEach((h) => h.linjer.forEach((l) => {
        const ord = ordILinje(l);
        if (l.indexOf('*') < 0 && ord.length >= 3 && ord.length <= 4 && new Set(ord.map((w) => w.toLowerCase())).size === ord.length &&
          ord.some((w) => SMAAORD[w.toLowerCase()])) linjer.push(l);
      }));
      const linje = vaelg(rng, linjer);
      const ord = ordILinje(linje);
      const svar = vaelg(rng, ord.filter((w) => SMAAORD[w.toLowerCase()]));
      return opgave({
        emne: 'smaaord', type: 'ordISaetning', niveau, noegle: 'ordISaetning:' + svar.toLowerCase(), ikon: '👀',
        tale: 'Tryk på ordet ' + svar.toLowerCase() + '.',
        tekst: 'Tryk på ordet',
        vis: { art: 'saetning', linje: linje },
        svar: svar, valg: ord, valgArt: 'skrevet', fastRaekkefoelge: true,
        hjaelp: [{ art: 'hoerIgen', langsomt: true }, { art: 'visOrd', ord: svar }],
      });
    },
    bygSaetning(niveau, rng) {
      const linjer = [];
      HISTORIER.slice(0, 12).forEach((h) => h.linjer.forEach((l) => {
        const ord = ordILinje(l);
        if (l.indexOf('*') < 0 && ord.length === 3 && new Set(ord.map((w) => w.toLowerCase())).size === 3) linjer.push(l);
      }));
      const linje = vaelg(rng, linjer);
      const ord = ordILinje(linje);
      return opgave({
        emne: 'smaaord', type: 'bygSaetning', niveau, noegle: 'bygSaetning:' + ord.join(' ').toLowerCase(), ikon: '✏️',
        tale: 'Byg sætningen: ' + linje + ' Tryk på ordene i den rigtige rækkefølge.',
        tekst: 'Byg sætningen',
        vis: { art: 'bygSaetning', linje: linje },
        svar: ord.join(' '), byg: { brikker: bland(rng, ord), dele: ord.length, adskil: ' ' },
        hjaelp: [{ art: 'hoerIgen', langsomt: true }, { art: 'visOrd', ord: ord.join(' ') }],
      });
    },
  };

  // Bogstaver, der ligner hinanden i form eller lyd, står ikke sammen på de første trin (b/d, p/q, n/u, f/v …)
  const LIGNER = ['bd', 'pq', 'nu', 'mn', 'fv', 'bp', 'gk', 'ij', 'oø', 'aæ', 'aå', 'ey', 'iy', 'dt'];
  const ligner = (a, b) => LIGNER.some((p) => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
  // n andre bogstaver end b, der hverken ligner b eller hinanden
  function ulige(rng, pulje, b, n) {
    const valgt = [];
    for (const x of bland(rng, pulje)) {
      if (valgt.length >= n) break;
      if (x !== b && !ligner(x, b) && valgt.every((y) => !ligner(x, y))) valgt.push(x);
    }
    return valgt;
  }

  function alfabetNabo(niveau, rng, retning) {
    const i = retning > 0 ? heltal(rng, 0, ALFABET.length - 2) : heltal(rng, 1, ALFABET.length - 1);
    const b = ALFABET[i], svar = ALFABET[i + retning];
    const naboer = [ALFABET[i - retning], ALFABET[i + 2 * retning], ALFABET[i + retning + retning * 3]].filter((x) => x && x !== svar && x !== b);
    const valg = bland(rng, bland(rng, naboer).slice(0, antalValg(niveau) - 1).concat([svar]));
    // Et vindue af alfabetet omkring hullet (hele striben er for bred til en telefon)
    const fra = Math.max(0, Math.min(ALFABET.length - 7, Math.min(i, i + retning) - 3));
    return opgave({
      emne: 'alfabet', type: retning > 0 ? 'efterBogstav' : 'foerBogstav', niveau, noegle: (retning > 0 ? 'efterBogstav:' : 'foerBogstav:') + b, ikon: retning > 0 ? '➡️' : '⬅️',
      tale: 'Hvilket bogstav kommer ' + (retning > 0 ? 'efter ' : 'før ') + NAVNE[b] + '?',
      tekst: 'Hvad kommer ' + (retning > 0 ? 'efter ' : 'før ') + b + '?',
      vis: { art: 'alfabet', fra: fra, til: fra + 6, skjult: i + retning },
      svar: svar, valg: valg, valgArt: 'bogstav',
      hjaelp: [{ art: 'alfabetSang' }, hjaelpBogstav(svar, eksempelOrd(rng, svar))],
    });
  }

  // ---------- Emner (verdener) og niveauer ----------
  // typer[0] er den letteste — en runde starter altid med den
  const EMNER = {
    rim: { navn: 'Rim', maxNiveau: 3, niveauer: { 1: ['rim'], 2: ['rim'], 3: ['rim', 'passerIkke'] } },
    lyde: { navn: 'Lyde', maxNiveau: 3, niveauer: { 1: ['lydBogstav'], 2: ['lydBogstav', 'forlyd'], 3: ['forlyd', 'udlyd', 'lydBogstav'] } },
    alfabet: { navn: 'Alfabetet', maxNiveau: 3, niveauer: { 1: ['findBogstav', 'storLille'], 2: ['storLille', 'findBogstav', 'efterBogstav'], 3: ['efterBogstav', 'foerBogstav', 'findBogstav'] } },
    lydering: { navn: 'Lydering', maxNiveau: 3, niveauer: { 1: ['lydering'], 2: ['laesOrd', 'lydering'], 3: ['laesOrd', 'bygOrd'] } },
    smaaord: { navn: 'Små ord', maxNiveau: 3, niveauer: { 1: ['findOrd'], 2: ['findOrd', 'ordISaetning'], 3: ['ordISaetning', 'bygSaetning', 'findOrd'] } },
  };
  // Typer, der kun kan løses ved at høre (springes over uden dansk stemme — medmindre der er indtalte klip)
  const LYT_TYPER = ['lydBogstav', 'forlyd', 'udlyd', 'findBogstav', 'lydering', 'findOrd', 'ordISaetning', 'rim', 'passerIkke'];

  function lavOpgave(type, niveau, rng) { return GEN[type](niveau, rng); }

  function lavRunde(emneId, niveau, rng, opts) {
    opts = opts || {};
    const antal = opts.antal || 5;
    niveau = Math.min(EMNER[emneId].maxNiveau, Math.max(1, Math.round(Number(niveau)) || 1));
    let typer = EMNER[emneId].niveauer[niveau];
    if (opts.udenLyt) { const u = typer.filter((t) => LYT_TYPER.indexOf(t) < 0); if (u.length) typer = u; }
    const runde = [];
    const brugte = {};
    let koe = [typer[0]];
    let forsoeg = 0;
    while (runde.length < antal && forsoeg < 500) {
      forsoeg++;
      if (!koe.length) koe = bland(rng, typer);
      const type = koe.shift();
      const o = lavOpgave(type, niveau, rng);
      if (brugte[o.noegle] && forsoeg < 400) continue;
      brugte[o.noegle] = true;
      runde.push(o);
    }
    const gentag = (opts.gentag || []).filter((o) => o && o.emne === emneId && GEN[o.type] && Array.isArray(o.hjaelp) && !brugte[o.noegle]).slice(0, 2);
    gentag.forEach((o, i) => { runde[Math.min(runde.length - 1, 2 + i)] = Object.assign({}, o, { gentaget: true }); });
    return runde;
  }

  // «Hvad driller» til voksenoverblikket
  function beskrivNoegle(noegle) {
    const [art, r] = String(noegle).split(/:(.*)/s);
    const t = {
      rim: () => 'Rim: ' + (r || '').replace('-', ' – '),
      passerIkke: () => 'Hvilket ord rimer ikke (' + (r || '').split('-')[0] + ')',
      lydBogstav: () => 'Lyden ' + r + ' → bogstavet',
      forlyd: () => 'Ord, der starter med lyden ' + r,
      udlyd: () => 'Ord, der slutter med lyden ' + r,
      findBogstav: () => 'Finde bogstavet ' + r,
      storLille: () => 'Stort og lille ' + r,
      efterBogstav: () => 'Bogstavet efter ' + r,
      foerBogstav: () => 'Bogstavet før ' + r,
      lydering: () => 'Lydere «' + r + '»',
      laesOrd: () => 'Læse «' + r + '»',
      bygOrd: () => 'Stave «' + r + '»',
      findOrd: () => 'Genkende ordet «' + r + '»',
      ordISaetning: () => 'Finde «' + r + '» i en sætning',
      bygSaetning: () => 'Bygge sætningen «' + r + '»',
    };
    return t[art] ? t[art]() : null;
  }

  // =====================================================================
  //  BOGSTAVJAGT (B10): bobler med bogstaver flyver op i buer; barnet stryger gennem det, det hører
  //  Rene funktioner (testes i test-dansk.js): hvilke bogstaver, runden, banen og «ramte strøget boblen?»
  // =====================================================================
  // Tempo pr. trin: bobler ad gangen, lyde pr. runde og en flyvetur (op og ned igen) i sekunder
  const JAGT_TRIN = {
    1: { samtidig: 2, lyde: 8, flyvetid: 6.5 },
    2: { samtidig: 3, lyde: 9, flyvetid: 5.2 },
    3: { samtidig: 4, lyde: 10, flyvetid: 4.0 },
  };
  // Bogstaver nået i Lyde-verdenen (rækkefølgen i DANSK-ANALYSE): flere jo længere barnet er nået.
  // Kun bogstaver med en lyd (ikke q, w, x, z og c).
  function jagtBogstaver(lyde) {
    const n = !lyde || !lyde.runder ? 8 : lyde.mestret ? 99 : ({ 1: 10, 2: 15, 3: 22 }[lyde.niveau] || 10);
    return RAEKKEFOELGE.filter((b) => KUN_NAVN.indexOf(b) < 0 && b !== 'c').slice(0, n);
  }
  // En runde: for hver lyd det rigtige bogstav og 1–3 andre (2–4 bobler ad gangen); samme bogstav aldrig to gange i træk
  function lavJagtRunde(bogstaver, trin, rng) {
    const T = JAGT_TRIN[trin] || JAGT_TRIN[1];
    const pulje = bogstaver.length >= T.samtidig ? bogstaver : RAEKKEFOELGE.slice(0, 8);
    const ud = [];
    let forrige = null;
    for (let i = 0; i < T.lyde; i++) {
      let b;
      do { b = vaelg(rng, pulje); } while (b === forrige && pulje.length > 1);
      forrige = b;
      // Bogstaver, der ligner hinanden (b/d/p, m/n …), kommer gerne med — det er dem, der skal øves
      const andre = bland(rng, pulje.filter((x) => x !== b)).slice(0, T.samtidig - 1);
      ud.push({ bogstav: b, bobler: bland(rng, [b].concat(andre)) });
    }
    return ud;
  }
  // En bane: boblen starter under feltets bund, flyver op i en bue og falder ned igen.
  // Koordinater i px med y nedad; g er tyngden. hoejde = toppunktet (andel af feltets højde fra bunden).
  function lavBane(rng, trin, w, h, langsom) {
    const T = (JAGT_TRIN[trin] || JAGT_TRIN[1]).flyvetid * (langsom ? 1.5 : 1);
    const x0 = w * (0.15 + rng() * 0.7);
    const x1 = Math.min(w * 0.88, Math.max(w * 0.12, x0 + (rng() - 0.5) * w * 0.5));
    const top = h * (0.55 + rng() * 0.3);   // så højt op kommer boblen (fra bunden)
    const g = 8 * top / (T * T);            // så den er i toppen efter T/2 og tilbage ved bunden efter T
    return { x0: x0, y0: h, vx: (x1 - x0) / T, vy: g * T / 2, g: g, T: T };
  }
  const banePunkt = (b, t) => ({ x: b.x0 + b.vx * t, y: b.y0 - b.vy * t + b.g * t * t / 2 });
  // Rammer et strøg (linjestykket p → q) en cirkel (midte c, radius r)? Et tryk (p = q) tæller også.
  function strygRammer(p, q, c, r) {
    const dx = q.x - p.x, dy = q.y - p.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((c.x - p.x) * dx + (c.y - p.y) * dy) / l2)) : 0;
    const nx = p.x + t * dx - c.x, ny = p.y + t * dy - c.y;
    return nx * nx + ny * ny <= r * r;
  }

  const Dansk = {
    ALFABET, VOKALER, ORD, ORDLISTE, RIM, RAEKKEFOELGE, HOLDELYDE, STOPLYDE, KUN_NAVN, NAVNE, LYDLISTE, SMAAORD, HISTORIER,
    EMNER, GEN, LYT_TYPER, SKRIFT, SKRIVEVEJ, BOGSTAV_BREDDE, forlaegOrd, vurderSpor, langs,
    lydId, navnId, lydReserve, rimdel, rimerPaa, rimGruppe, ordIGruppe, ordILinje, undtagelser, ligner,
    lavOpgave, lavRunde, beskrivNoegle, lavRng,
    JAGT_TRIN, jagtBogstaver, lavJagtRunde, lavBane, banePunkt, strygRammer,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Dansk;
  else root.Dansk = Dansk;
})(typeof self !== 'undefined' ? self : this);
