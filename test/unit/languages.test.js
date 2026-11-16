// Context words in languages other than English.
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { createConverter } = require('../../dates.js');
const { LEXICON } = require('../../lexicon.js');

const convert = createConverter(['en', 'it', 'es', 'fr', 'de', 'pt']);

function converts(cases) {
  for (const [input, expected, count = 1] of cases) {
    test(`"${input}" → "${expected}"`, () => {
      assert.deepEqual(convert(input), { text: expected, count });
    });
  }
}

function leavesAlone(cases) {
  for (const input of cases) {
    test(`"${input}" is left alone`, () => {
      assert.deepEqual(convert(input), { text: input, count: 0 });
    });
  }
}

describe('Italian', () => {
  converts([
    ['nel 2026', 'nel 12026'],
    ["nell'anno 2000", "nell'anno 12000"],
    ['dal 1998 al 2004', 'dal 11998 al 12004', 2],
    ['entro il 2030', 'entro il 12030'],
    ['fondata nel 1088', 'fondata nel 11088'],
    ['il bilancio del 2025', 'il bilancio del 12025'],
    ["l'estate 2026", "l'estate 12026"],
    ['tra il 1914 e il 1918', 'tra il 11914 e il 11918', 2],
    ['nato nel 1950 a Roma', 'nato nel 11950 a Roma'],
    ['nel 2000 circa', 'nel 12000 circa'],
    ['476 d.C. e 1453 d.C.', '476 d.C. e 11453 d.C.'],
  ]);
  leavesAlone([
    '2000 persone',
    'circa 1500 abitanti',
    'quasi 2000',
    'più di 1500',
    'oltre 2000 metri',
    '1200 euro',
    'di 2000 partecipanti',
    'stanza 2026',
    '1200 a.C.',
    '2000 anni fa',
  ]);
});

describe('Spanish', () => {
  converts([
    ['en 2026', 'en 12026'],
    ['el año 2000', 'el año 12000'],
    ['desde 1998 hasta 2004', 'desde 11998 hasta 12004', 2],
    ['fundada en 1218', 'fundada en 11218'],
    ['el verano de 2026', 'el verano de 12026'],
    ['entre 1936 y 1939', 'entre 11936 y 11939', 2],
    ['a principios de 1999', 'a principios de 11999'],
  ]);
  leavesAlone([
    '2000 personas',
    'unos 1500 habitantes',
    'casi 2000',
    'más de 1500',
    '1200 euros',
    'de 2000 participantes',
    'habitación 2026',
    '2000 años',
  ]);
});

describe('French', () => {
  converts([
    ['en 2026', 'en 12026'],
    ["l'an 2000", "l'an 12000"],
    ['depuis 1998', 'depuis 11998'],
    ["d'ici 2030", "d'ici 12030"],
    ['fondée en 1257', 'fondée en 11257'],
    ['entre 1914 et 1918', 'entre 11914 et 11918', 2],
    ['fin 2026', 'fin 12026'],
    ["jusqu'en 2028", "jusqu'en 12028"],
  ]);
  leavesAlone([
    '2000 personnes',
    'environ 1500 habitants',
    'près de 2000',
    'plus de 1500',
    '1200 euros',
    'de 2000 participants',
    'chambre 2026',
    '2000 ans',
  ]);
});

describe('German', () => {
  converts([
    ['im Jahr 2026', 'im Jahr 12026'],
    ['im Jahre 1648', 'im Jahre 11648'],
    ['seit 1998', 'seit 11998'],
    ['bis 2030', 'bis 12030'],
    ['gegründet 1386', 'gegründet 11386'],
    ['zwischen 1914 und 1918', 'zwischen 11914 und 11918', 2],
    ['Ende 2026', 'Ende 12026'],
    ['von 1990 bis 1998', 'von 11990 bis 11998', 2],
    ['1648 n. Chr.', '11648 n. Chr.'],
  ]);
  leavesAlone([
    '2000 Menschen',
    'etwa 1500 Einwohner',
    'rund 2000',
    'mehr als 1500',
    '1200 Euro',
    'über 2000 Meter',
    'Zimmer 2026',
    '2000 Jahre',
    '1200 v. Chr.',
  ]);
});

describe('Portuguese', () => {
  converts([
    ['em 2026', 'em 12026'],
    ['no ano 2000', 'no ano 12000'],
    ['desde 1998 até 2004', 'desde 11998 até 12004', 2],
    ['fundada em 1290', 'fundada em 11290'],
    ['o verão de 2026', 'o verão de 12026'],
    ['entre 1914 e 1918', 'entre 11914 e 11918', 2],
    ['em meados de 1999', 'em meados de 11999'],
  ]);
  leavesAlone([
    '2000 pessoas',
    'cerca de 1500 habitantes',
    'quase 2000',
    'mais de 1500',
    '1200 euros',
    'de 2000 participantes',
    'quarto 2026',
    '2000 anos',
  ]);
});

describe('definite articles after the number', () => {
  converts([
    ['He received 1385 the charter', 'He received 11385 the charter'],
    ['Sie erhielt 1385 das Privileg', 'Sie erhielt 11385 das Privileg'],
    ['ottenne 1385 il privilegio', 'ottenne 11385 il privilegio'],
    ['obtuvo 1385 el privilegio', 'obtuvo 11385 el privilegio'],
    ['obtint 1385 le privilège', 'obtint 11385 le privilège'],
  ]);
  leavesAlone(['costs 1500 a month', 'earns 2000 a year', 'about 1385 the', 'Room 1385 the']);
});

describe('pages declared as German', () => {
  const german = createConverter(['de'], 'de-DE');
  const cases = [
    ['gegründet und 1803 durch den Markgrafen', 'gegründet und 11803 durch den Markgrafen'],
    ['ist ein 1935 aus zwei Gemeinden entstandener Markt', 'ist ein 11935 aus zwei Gemeinden entstandener Markt'],
    ['Ende. 2023 lehrten 557 Professoren', 'Ende. 12023 lehrten 557 Professoren'],
    ['2018 generierte das Fest', '12018 generierte das Fest'],
    // still quantities: capitalised nouns, units, blockers
    ['es kamen 2023 Menschen', 'es kamen 2023 Menschen'],
    ['mit 1803 Teilnehmern', 'mit 1803 Teilnehmern'],
    ['etwa 1935 aus', 'etwa 1935 aus'],
    // round or very old numbers need more
    ['kostet 1500 und', 'kostet 1500 und'],
    ['Urban VI. 1386 von Kurfürst', 'Urban VI. 1386 von Kurfürst'],
  ];
  for (const [input, expected] of cases) {
    test(`"${input}" → "${expected}"`, () => {
      assert.equal(german(input).text, expected);
    });
  }

  test('the same sentences are left alone on pages in other languages', () => {
    assert.equal(convert('gegründet und 1803 durch den Markgrafen').text, 'gegründet und 1803 durch den Markgrafen');
    assert.equal(createConverter(['de'], 'en')('we sold 1985 of them').text, 'we sold 1985 of them');
  });
});

describe('lexicon', () => {
  const fields = [
    'strongBefore',
    'weakBefore',
    'blockBefore',
    'strongAfter',
    'unitAfter',
    'functionWords',
    'connectors',
    'articles',
    'dateHeader',
    'quantityHeader',
  ];

  for (const [language, entry] of Object.entries(LEXICON)) {
    test(`${language} defines every field with valid patterns`, () => {
      assert.deepEqual(Object.keys(entry).sort(), [...fields].sort());
      for (const field of fields) {
        const words = entry[field].trim().split(/\s+/);
        assert.ok(words.length > 0 && words[0] !== '', `${language}.${field} is empty`);
        for (const word of words) assert.doesNotThrow(() => new RegExp(word, 'iu'), `${language}.${field}: ${word}`);
      }
    });

    test(`${language} function words are lowercase`, () => {
      for (const word of entry.functionWords.trim().split(/\s+/)) {
        assert.equal(word, word.toLowerCase());
      }
    });
  }
});
