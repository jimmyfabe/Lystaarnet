/* engelsk-opgaver.js — Engelsk for helt nye begyndere (Jimmy 13-10-2026): barnet hører et engelsk ord og trykker på
   billedet. Ingen læsetekst. Ni verdener med 12–14 ord hver (7–8 på niveau 1, 20-10-2026): farver, tal, dyr, figurer,
   (18-10-2026) hverdagens ting i køkkenet, hjemme og på legepladsen og (20-10-2026) mad og tøj.
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
  // Variation (Jimmy 20-10-2026: «det er de samme tre ord, der nærmest kører igen … Der skal lidt mere fylde på»):
  // 7–8 ord på niveau 1 og 12–14 i alt i hver verden. De gamle kerneord bliver i kernen, så en gemt opgave fra
  // niveau 1 stadig passer (passerTilNiveau; alt gemt er id-baseret) — og «nær» er kun lagt på mellem et nyt ord og et
  // andet, ud over huset og vinduet (code-review 21-10-2026: hustegningen har vinduer).
  const VERDENER = {
    engFarver: {
      navn: 'Farver', type: 'engFarve', ikon: '🎨', kerne: 7,
      spoerg: 'Lyt. Hvilken farve er det?', tekst: 'Hvilken farve hører du?',
      ord: [
        ['red', 'rød', { art: 'farve', farve: 'red' }, ['pink', 'orange']],
        ['blue', 'blå', { art: 'farve', farve: 'blue' }, ['purple', 'turquoise']],
        ['yellow', 'gul', { art: 'farve', farve: 'yellow' }, ['orange']],
        ['green', 'grøn', { art: 'farve', farve: 'green' }, ['turquoise']],
        ['black', 'sort', { art: 'farve', farve: 'black' }, ['brown', 'grey']],
        ['white', 'hvid', { art: 'farve', farve: 'white' }, ['grey']],
        ['pink', 'lyserød', { art: 'farve', farve: 'pink' }, ['red', 'purple']],
        ['orange', 'orange', { art: 'farve', farve: 'orange' }, ['red', 'yellow']],
        ['purple', 'lilla', { art: 'farve', farve: 'purple' }, ['blue', 'pink']],
        ['brown', 'brun', { art: 'farve', farve: 'brown' }, ['black']],
        ['grey', 'grå', { art: 'farve', farve: 'grey' }, ['black', 'white']],
        ['turquoise', 'turkis', { art: 'farve', farve: 'turquoise' }, ['blue', 'green']],
      ],
    },
    engTal: {
      navn: 'Tal', type: 'engTal', ikon: '🎲', kerne: 7,
      spoerg: 'Lyt. Hvilket tal er det?', tekst: 'Hvilket tal hører du?',
      ord: [
        ['one', 'en', { art: 'tal', tal: 1 }], ['two', 'to', { art: 'tal', tal: 2 }], ['three', 'tre', { art: 'tal', tal: 3 }],
        ['four', 'fire', { art: 'tal', tal: 4 }], ['five', 'fem', { art: 'tal', tal: 5 }], ['six', 'seks', { art: 'tal', tal: 6 }],
        ['seven', 'syv', { art: 'tal', tal: 7 }], ['eight', 'otte', { art: 'tal', tal: 8 }], ['nine', 'ni', { art: 'tal', tal: 9 }],
        ['ten', 'ti', { art: 'tal', tal: 10 }], ['eleven', 'elleve', { art: 'tal', tal: 11 }], ['twelve', 'tolv', { art: 'tal', tal: 12 }],
      ].map((o) => o.concat([[]])), // nær: nabotallene (sættes nedenfor)
    },
    engDyr: {
      navn: 'Dyr', type: 'engDyr', ikon: '🐾', kerne: 8,
      spoerg: 'Lyt. Hvilket dyr er det?', tekst: 'Hvilket dyr hører du?',
      // Kun dyr, spillet allerede tegner (samledyrene i grafik.js); emojien er reserven
      ord: [
        ['cat', 'kat', DYR('eventyr', 'kat'), ['dog', 'rabbit', 'lion']],
        ['dog', 'hund', DYR('eventyr', 'hund'), ['cat', 'horse', 'bear']],
        ['fish', 'fisk', DYR('eventyr', 'fisk'), ['frog', 'snake']],
        ['pig', 'gris', DYR('eventyr', 'gris'), ['elephant', 'sheep']],
        ['horse', 'hest', DYR('eventyr', 'hest'), ['dog', 'giraffe']],
        ['rabbit', 'kanin', DYR('eventyr', 'kanin'), ['cat', 'sheep']],
        ['lion', 'løve', DYR('jungle', 'loeve'), ['cat', 'monkey', 'bear']],
        ['elephant', 'elefant', DYR('jungle', 'elefant'), ['pig']],
        ['frog', 'frø', DYR('jungle', 'froe'), ['fish']],
        ['monkey', 'abe', DYR('jungle', 'abe'), ['lion']],
        ['sheep', 'får', DYR('eventyr', 'lam'), ['pig', 'rabbit']],
        ['bear', 'bjørn', DYR('jungle', 'bjoern'), ['dog', 'lion']],
        ['giraffe', 'giraf', DYR('jungle', 'giraf'), ['horse']],
        ['snake', 'slange', DYR('jungle', 'slange'), ['fish']],
      ],
    },
    engFormer: {
      navn: 'Figurer', type: 'engForm', ikon: '🔷', kerne: 8,
      spoerg: 'Lyt. Hvilken figur er det?', tekst: 'Hvilken figur hører du?',
      // form = navnet i app.js' formSvg (FORM_PUNKTER: cirklen tegnes for sig, resten som en polygon)
      ord: [
        ['circle', 'cirkel', { art: 'form', form: 'cirkel' }, ['heart', 'oval', 'semicircle']],
        ['square', 'kvadrat', { art: 'form', form: 'kvadrat' }, ['rectangle', 'diamond']],
        ['triangle', 'trekant', { art: 'form', form: 'trekant' }, ['star', 'arrow']],
        ['star', 'stjerne', { art: 'form', form: 'stjerne' }, ['triangle', 'cross']],
        ['heart', 'hjerte', { art: 'form', form: 'hjerte' }, ['circle']],
        ['rectangle', 'rektangel', { art: 'form', form: 'rektangel' }, ['square']],
        ['oval', 'oval', { art: 'form', form: 'oval' }, ['circle']],
        ['diamond', 'rombe', { art: 'form', form: 'rombe' }, ['square']],
        ['semicircle', 'halvcirkel', { art: 'form', form: 'halvcirkel' }, ['circle']],
        ['arrow', 'pil', { art: 'form', form: 'pil' }, ['triangle']],
        ['cross', 'kors', { art: 'form', form: 'kors' }, ['star']],
        ['pentagon', 'femkant', { art: 'form', form: 'femkant' }, ['hexagon', 'octagon']],
        ['hexagon', 'sekskant', { art: 'form', form: 'sekskant' }, ['pentagon', 'octagon']],
        ['octagon', 'ottekant', { art: 'form', form: 'ottekant' }, ['pentagon', 'hexagon']],
      ],
    },
    // Hverdagens ting (Jimmy 18-10-2026: «biler, kopper, kander og andre ting fra køkkenet og hverdagen, computeren,
    // legepladsen»). Tegningerne: grafik-kilde/hverdag/<id>.svg (id = det engelske ord) → grafik.js hverdag.
    // house og flower er kopier af minispillenes soundWordHouse og rhymeLightFlower (docs/LYSTAARNET-GRAFIK-C.md).
    engKoekken: {
      navn: 'Køkken', type: 'engKoekken', ikon: '🍴', kerne: 8,
      spoerg: 'Lyt. Hvad er det?', tekst: 'Hvad hører du?',
      ord: [
        ['cup', 'kop', TING('cup'), ['glass', 'jug']],
        ['plate', 'tallerken', TING('plate'), ['bowl']],
        ['spoon', 'ske', TING('spoon'), ['fork', 'knife']],
        ['glass', 'glas', TING('glass'), ['cup', 'bottle']],
        ['bowl', 'skål', TING('bowl'), ['plate', 'pot']],
        ['fork', 'gaffel', TING('fork'), ['spoon', 'knife']],
        ['knife', 'kniv', TING('knife'), ['spoon', 'fork']],
        ['jug', 'kande', TING('jug'), ['cup', 'pot', 'bottle', 'kettle']],
        ['pot', 'gryde', TING('pot'), ['bowl', 'jug', 'pan', 'kettle']],
        ['fridge', 'køleskab', TING('fridge'), ['oven']],
        ['pan', 'pande', TING('pan'), ['pot']],
        ['bottle', 'flaske', TING('bottle'), ['glass', 'jug']],
        ['kettle', 'kedel', TING('kettle'), ['jug', 'pot']],
        ['oven', 'ovn', TING('oven'), ['fridge']],
      ],
    },
    engHjemme: {
      navn: 'Hjemme', type: 'engHjemme', ikon: '🏠', kerne: 8,
      spoerg: 'Lyt. Hvad er det?', tekst: 'Hvad hører du?',
      ord: [
        ['car', 'bil', TING('car'), ['bus', 'bike']],
        ['bus', 'bus', TING('bus'), ['car']],
        ['book', 'bog', TING('book'), []],
        ['phone', 'telefon', TING('phone'), ['computer']],
        ['bed', 'seng', TING('bed'), ['table']],
        ['chair', 'stol', TING('chair'), ['table']],
        ['table', 'bord', TING('table'), ['chair', 'bed']],
        ['door', 'dør', TING('door'), ['window', 'house']],
        ['bike', 'cykel', TING('bike'), ['car']],
        ['computer', 'computer', TING('computer'), ['phone']],
        ['house', 'hus', TING('house'), ['door', 'window']],
        ['window', 'vindue', TING('window'), ['door', 'house']],
        ['lamp', 'lampe', TING('lamp'), []],
        ['teddy', 'bamse', TING('teddy'), []],
      ],
    },
    engLegeplads: {
      navn: 'Legeplads', type: 'engLegeplads', ikon: '⚽', kerne: 8,
      spoerg: 'Lyt. Hvad er det?', tekst: 'Hvad hører du?',
      ord: [
        ['ball', 'bold', TING('ball'), []],
        ['swing', 'gynge', TING('swing'), ['slide', 'seesaw']],
        ['slide', 'rutsjebane', TING('slide'), ['swing', 'seesaw']],
        ['tree', 'træ', TING('tree'), ['flower']],
        ['sandbox', 'sandkasse', TING('sandbox'), ['bucket', 'spade']],
        ['flower', 'blomst', TING('flower'), ['tree']],
        ['bird', 'fugl', TING('bird'), ['kite']],
        ['kite', 'drage', TING('kite'), ['bird']],
        ['bench', 'bænk', TING('bench'), []],
        ['bucket', 'spand', TING('bucket'), ['sandbox', 'spade']],
        ['spade', 'skovl', TING('spade'), ['sandbox', 'bucket']],
        ['seesaw', 'vippe', TING('seesaw'), ['swing', 'slide']],
        ['scooter', 'løbehjul', TING('scooter'), []],
      ],
    },
    // Mad og tøj (20-10-2026): to nye verdener med hverdagens ting. hat er en kopi af minispillenes rhymeHat
    engMad: {
      navn: 'Mad', type: 'engMad', ikon: '🍎', kerne: 8,
      spoerg: 'Lyt. Hvilken mad er det?', tekst: 'Hvilken mad hører du?',
      ord: [
        ['apple', 'æble', TING('apple'), ['pear', 'tomato']],
        ['banana', 'banan', TING('banana'), []],
        ['bread', 'brød', TING('bread'), ['cake']],
        ['milk', 'mælk', TING('milk'), []],
        ['egg', 'æg', TING('egg'), []],
        ['cheese', 'ost', TING('cheese'), []],
        ['carrot', 'gulerod', TING('carrot'), []],
        ['cake', 'kage', TING('cake'), ['bread']],
        ['strawberry', 'jordbær', TING('strawberry'), ['tomato']],
        ['pizza', 'pizza', TING('pizza'), []],
        ['pear', 'pære', TING('pear'), ['apple']],
        ['grapes', 'vindruer', TING('grapes'), []],
        ['tomato', 'tomat', TING('tomato'), ['apple', 'strawberry']],
        ['sausage', 'pølse', TING('sausage'), []],
      ],
    },
    engToej: {
      navn: 'Tøj', type: 'engToej', ikon: '👕', kerne: 8,
      spoerg: 'Lyt. Hvilket tøj er det?', tekst: 'Hvilket tøj hører du?',
      ord: [
        ['hat', 'hat', TING('hat'), ['cap']],
        ['shoes', 'sko', TING('shoes'), ['boots', 'socks']],
        ['socks', 'sokker', TING('socks'), ['shoes', 'gloves']],
        ['dress', 'kjole', TING('dress'), ['skirt']],
        ['trousers', 'bukser', TING('trousers'), ['shorts']],
        ['jacket', 'jakke', TING('jacket'), ['shirt']],
        ['gloves', 'handsker', TING('gloves'), ['socks']],
        ['scarf', 'halstørklæde', TING('scarf'), []],
        ['boots', 'støvler', TING('boots'), ['shoes']],
        ['skirt', 'nederdel', TING('skirt'), ['dress', 'shorts']],
        ['shorts', 'shorts', TING('shorts'), ['trousers', 'skirt']],
        ['cap', 'kasket', TING('cap'), ['hat']],
        ['shirt', 'skjorte', TING('shirt'), ['jacket']],
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
  // Tallene: nær = nabotallene — og «seven»/«eleven», der lyder næsten ens
  VERDENER.engTal.ord.forEach((id, i, l) => { ORD[id].naer = [l[i - 1], l[i + 1]].filter(Boolean); });
  ORD.seven.naer.push('eleven');
  ORD.eleven.naer.push('seven');

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
  // Variation (Jimmy 20-10-2026: «Eller så er det, sig dit navn»): 39 sætninger i små samtaler — hilse, hvordan har du
  // det, hvad man kan lide, farver og dyr. Ingen sætninger om alder, skole, by eller familie. Der står aldrig «to» på
  // engelsk (den danske stemme siger «To.» om tallet), og de danske forklaringer bruger ingen af de engelske ord.
  // Et billede (billede: 'farve' | 'dyr') står i boblen: farven eller dyret fra ordverdenernes niveau 1.
  const TIMER = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const SIG_FARVER = VERDENER.engFarver.ord.slice(0, VERDENER.engFarver.kerne);
  const SIG_DYR = VERDENER.engDyr.ord.slice(0, VERDENER.engDyr.kerne);
  const enDyr = (id) => (/^[aeiou]/.test(ORD[id].en) ? 'an ' : 'a ') + ORD[id].en;
  const SIG = {
    // Begyndelsen og slutningen af samtalen
    hello: { en: 'Hello!', da: 'Sådan siger du hej. Sig efter mig, og tryk så på den grønne knap.', udtryk: 'vinker' },
    hi: { en: 'Hi!', da: 'Sådan siger du hej på en anden måde. Sig efter mig, og tryk så på den grønne knap.', udtryk: 'vinker' },
    goodMorning: { en: 'Good morning!', da: 'Sådan siger du godmorgen. Sig efter mig, og tryk så på den grønne knap.', udtryk: 'vinker' },
    goodbye: { en: 'Goodbye!', da: 'Sådan siger du farvel. Sig efter mig.', udtryk: 'vinker' },
    byeBye: { en: 'Bye bye!', da: 'Sådan siger du farvel på en anden måde. Sig efter mig.', udtryk: 'vinker' },
    seeYou: { en: 'See you later!', da: 'Sådan siger du, at vi ses igen. Sig efter mig.', udtryk: 'vinker' },
    // Niveau 1: korte sætninger
    myName: { en: 'My name is', da: 'Sådan siger du, hvad du hedder. Sig efter mig, og sig dit navn til sidst.', udtryk: 'glad', ditNavn: true },
    thanks: { en: 'Thank you!', da: 'Sådan siger du tak. Sig efter mig.', udtryk: 'glad' },
    yesPlease: { en: 'Yes, please!', da: 'Sådan siger du ja tak. Sig efter mig.', udtryk: 'glad' },
    noThanks: { en: 'No, thank you!', da: 'Sådan siger du nej tak. Sig efter mig.', udtryk: 'glad' },
    happy: { en: 'I am happy!', da: 'Sådan siger du, at du er glad. Sig efter mig.', udtryk: 'jubler' },
    letsPlay: { en: "Let's play!", da: 'Sådan siger du, at nu skal vi lege. Sig efter mig.', udtryk: 'jubler' },
    myTurn: { en: 'My turn!', da: 'Sådan siger du, at nu er det din tur. Sig efter mig.', udtryk: 'glad' },
    yourTurn: { en: 'Your turn!', da: 'Sådan siger du, at nu er det den andens tur. Sig efter mig.', udtryk: 'glad' },
    wellDone: { en: 'Well done!', da: 'Sådan siger du godt klaret. Sig efter mig.', udtryk: 'jubler' },
    look: { en: 'Look!', da: 'Sådan siger du, at den anden skal kigge. Sig efter mig.', udtryk: 'udforsker' },
    wow: { en: 'Wow!', da: 'Sådan siger du, at noget er flot. Sig efter mig.', udtryk: 'jubler' },
    // Niveau 2: spørgsmål og svar
    yourName: { en: 'What is your name?', da: 'Sådan spørger du, hvad den anden hedder. Sig efter mig.', udtryk: 'taenker' },
    howAreYou: { en: 'How are you?', da: 'Sådan spørger du, hvordan den anden har det. Sig efter mig.', udtryk: 'taenker' },
    fine: { en: 'I am fine, thank you.', da: 'Sådan siger du, at du har det godt. Sig efter mig.', udtryk: 'jubler' },
    andYou: { en: 'And you?', da: 'Sådan spørger du den anden om det samme. Sig efter mig.', udtryk: 'taenker' },
    hungry: { en: 'I am hungry!', da: 'Sådan siger du, at du er sulten. Sig efter mig.', udtryk: 'glad' },
    tired: { en: 'I am tired!', da: 'Sådan siger du, at du er træt. Sig efter mig.', udtryk: 'hviler' },
    whatColour: { en: 'What colour is it?', da: 'Se på farven. Sådan spørger du, hvilken farve det er. Sig efter mig.', udtryk: 'taenker', billede: 'farve' },
    itIsColour: { en: (f) => 'It is ' + ORD[f].en + '!', varianter: SIG_FARVER, da: 'Sådan siger du, hvilken farve det er. Sig efter mig.', udtryk: 'glad', billede: 'farve' },
    likeDogs: { en: 'I like dogs!', da: 'Sådan siger du, at du kan lide hunde. Sig efter mig.', udtryk: 'glad', billede: 'dog' },
    likeCats: { en: 'I like cats!', da: 'Sådan siger du, at du kan lide katte. Sig efter mig.', udtryk: 'glad', billede: 'cat' },
    canIPlay: { en: 'Can I play?', da: 'Sådan spørger du, om du må være med. Sig efter mig.', udtryk: 'taenker' },
    yesYouCan: { en: 'Yes, you can!', da: 'Sådan siger du, at den anden må være med. Sig efter mig.', udtryk: 'jubler' },
    sorry: { en: 'Sorry!', da: 'Sådan siger du undskyld. Sig efter mig.', udtryk: 'taenker' },
    itsOk: { en: "It's okay!", da: 'Sådan siger du, at det gør ikke noget. Sig efter mig.', udtryk: 'glad' },
    // Niveau 3: klokken, dyrene, hjælp og tælle
    whatTime: { en: 'What time is it?', da: 'Sådan spørger du, hvad klokken er. Sig efter mig.', udtryk: 'taenker', ur: true },
    oclock: { en: (t) => 'It is ' + TIMER[t - 1] + " o'clock.", varianter: TIMER.map((x, i) => i + 1), da: 'Se på uret. Sådan siger du, hvad klokken er. Sig efter mig.', udtryk: 'glad', ur: true },
    whatIsIt: { en: 'What is it?', da: 'Se på dyret. Sådan spørger du, hvad det er. Sig efter mig.', udtryk: 'taenker', billede: 'dyr' },
    itIsAnimal: { en: (d) => 'It is ' + enDyr(d) + '!', varianter: SIG_DYR, da: 'Sådan siger du, hvilket dyr det er. Sig efter mig.', udtryk: 'glad', billede: 'dyr' },
    canYouHelp: { en: 'Can you help me?', da: 'Sådan spørger du, om den anden vil hjælpe dig. Sig efter mig.', udtryk: 'taenker' },
    yesICan: { en: 'Yes, I can!', da: 'Sådan siger du, at du gerne vil hjælpe. Sig efter mig.', udtryk: 'jubler' },
    letsCount: { en: "Let's count!", da: 'Sådan siger du, at nu skal vi tælle. Sig efter mig.', udtryk: 'taeller' },
    oneTwoThree: { en: 'One, two, three!', da: 'Tæl med. Sig efter mig.', udtryk: 'taeller' },
  };
  // Samtalens begyndelse og slutning pr. niveau (de nye hilsner fra niveau 2)
  const SIG_START = { 1: ['hello', 'hi'], 2: ['hello', 'hi', 'goodMorning'], 3: ['hello', 'hi', 'goodMorning'] };
  const SIG_SLUT = { 1: ['goodbye', 'byeBye'], 2: ['goodbye', 'byeBye', 'seeYou'], 3: ['goodbye', 'byeBye', 'seeYou'] };
  // Midten af samtalen: små enheder, der hører sammen (spørgsmål og svar). Hvert niveau har også de lettere niveauers.
  // Klokken, farven og dyret: spørgsmålet og svaret viser det samme billede (samme ur, farve eller dyr i hele runden).
  const SIG_NY = {
    1: [['myName'], ['thanks'], ['yesPlease'], ['noThanks'], ['happy'], ['letsPlay'], ['myTurn', 'yourTurn'], ['wellDone'], ['look', 'wow']],
    2: [['yourName', 'myName'], ['howAreYou', 'fine', 'andYou'], ['hungry'], ['tired'], ['whatColour', 'itIsColour'],
      ['likeDogs'], ['likeCats'], ['canIPlay', 'yesYouCan'], ['sorry', 'itsOk']],
    3: [['whatTime', 'oclock'], ['whatIsIt', 'itIsAnimal'], ['canYouHelp', 'yesICan'], ['letsCount', 'oneTwoThree']],
  };
  const SIG_ENHEDER = { 1: SIG_NY[1], 2: SIG_NY[1].concat(SIG_NY[2]), 3: SIG_NY[1].concat(SIG_NY[2], SIG_NY[3]) };
  const SIG_ROS = ['Godt sagt!', 'Flot!', 'Sådan!'];
  const sigEn = (id, variant) => (typeof SIG[id].en === 'function' ? SIG[id].en(variant) : SIG[id].en);
  // variant: { time, farve, dyr } — rundens ur, farve og dyr (spørgsmålet og svaret deler dem)
  function sigOpgave(id, niveau, variant, ros) {
    const s = SIG[id];
    const ur = s.ur ? variant.time : null;
    const billede = s.billede === 'farve' ? variant.farve : s.billede === 'dyr' ? variant.dyr : s.billede || null;
    const v = s.ur ? variant.time : s.billede === 'farve' ? variant.farve : s.billede === 'dyr' ? variant.dyr : null;
    const en = sigEn(id, v);
    return {
      fag: 'engelsk', emne: 'engSig', type: 'engSig', niveau: niveau, ikon: '💬',
      noegle: 'engSig:' + id + (typeof s.en === 'function' ? ':' + v : ''),
      tale: s.da,                                                  // dansk stemme
      lyd: [{ en: en }].concat(s.ditNavn ? [{ ditNavn: true }] : []), // så sætningen (kun den engelske stemmes fil) — og navnet
      tekst: 'Sig efter mig.',
      vis: { art: 'engelskSig', saetning: id, udtryk: s.udtryk, klokke: ur ? ur + ':00' : null, billede: billede },
      svar: 'sagt', valg: ['sagt'], valgArt: 'sig',
      ordEn: en,
      ros: SIG_ROS[ros % SIG_ROS.length],                         // ros efter «Jeg sagde det» (dansk stemme; ordDa er ordverdenernes danske ord)
      hjaelp: [],
    };
  }
  const sigVariant = (rng) => ({ time: 1 + Math.floor(rng() * 12), farve: vaelg(rng, SIG_FARVER), dyr: vaelg(rng, SIG_DYR) });
  // Én sætning (til GEN og puljen): fra niveauets sætninger
  GEN.engSig = function (niveau, rng) {
    const n = Math.min(3, Math.max(1, niveau));
    const ids = SIG_START[n].concat(SIG_SLUT[n], ...SIG_ENHEDER[n]);
    return sigOpgave(vaelg(rng, ids), n, sigVariant(rng), Math.floor(rng() * SIG_ROS.length));
  };
  // Runden er en samtale: en hilsen først, et farvel til sidst, og midten er niveauets enheder i tilfældig rækkefølge —
  // den første fra rundens eget niveau, så et nyt niveau også giver nye sætninger. Samme sætning kommer aldrig to gange
  // i en runde (så «My name is» er der ikke hver gang), og en enhed, der ikke er plads til, springes over (så et
  // spørgsmål aldrig står uden svar). Går det ikke op, prøves en ny rækkefølge.
  function sigRunde(niveau, rng, antal) {
    const variant = sigVariant(rng);
    const plads = Math.max(0, antal - 2);
    let midte = [];
    for (let forsoeg = 0; forsoeg < 20 && (forsoeg === 0 || midte.length < plads); forsoeg++) {
      const foerst = vaelg(rng, SIG_NY[niveau]);
      const raekke = [foerst].concat(bland(rng, SIG_ENHEDER[niveau].filter((u) => u !== foerst)));
      midte = [];
      for (const u of raekke) if (u.length <= plads - midte.length && !u.some((id) => midte.indexOf(id) >= 0)) midte.push(...u);
    }
    // Kun hvis ingen rækkefølge gik op (det sker ikke med niveauernes sætninger): en kort sætning, der ikke er brugt
    const fyld = SIG_ENHEDER[niveau].filter((u) => u.length === 1 && midte.indexOf(u[0]) < 0).map((u) => u[0]);
    while (midte.length < plads) midte.push(fyld.length ? fyld.shift() : 'thanks');
    const ids = [vaelg(rng, SIG_START[niveau])].concat(midte, antal > 1 ? [vaelg(rng, SIG_SLUT[niveau])] : []);
    const ros0 = Math.floor(rng() * SIG_ROS.length);
    return ids.slice(0, antal).map((id, i) => sigOpgave(id, niveau, variant, ros0 + i));
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
    for (const id of Object.keys(SIG)) if (typeof SIG[id].en === 'function') SIG[id].varianter.forEach((v) => ud.push(SIG[id].en(v))); else ud.push(SIG[id].en);
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

  // En runde: forskellige ord, så længe der er nok (niveau 1 har 7–8 ord — så kommer de igen, og det er godt).
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

  const Engelsk = { VERDENER, ORD, EMNER, GEN, SIG, SIG_START, SIG_SLUT, SIG_ENHEDER, TIMER, antalValg, udtaleEn, udtaleDa, udtalerFor, lavOpgave, puljeOpgave, lavRunde, saetninger, lavRng };

  if (typeof module !== 'undefined' && module.exports) module.exports = Engelsk;
  else root.Engelsk = Engelsk;
})(typeof self !== 'undefined' ? self : this);
