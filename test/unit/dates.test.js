// Run with: npm run test:unit
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { createConverter } = require('../../dates.js');

const convert = createConverter(['en', 'it', 'es', 'de', 'fr', 'ja']);

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

describe('numeric dates', () => {
  converts([
    ['2026-11-16', '12026-11-16'],
    ['2026/11/16', '12026/11/16'],
    ['2026.11.16', '12026.11.16'],
    ['2026-1-5', '12026-1-5'],
    ['2026-11-16T10:30:00Z', '12026-11-16T10:30:00Z'],
    ['2026-11-16 10:30', '12026-11-16 10:30'],
    ['16/11/2026', '16/11/12026'],
    ['11/16/2026', '11/16/12026'],
    ['16-11-2026', '16-11-12026'],
    ['16.11.2026', '16.11.12026'],
    ['1/2/2026', '1/2/12026'],
    ['11.16.2026 at 10:30', '11.16.12026 at 10:30'],
    ['Updated 01/02/1999.', 'Updated 01/02/11999.'],
    ['11/2026', '11/12026'],
    ['03-2026', '03-12026'],
    ['0842-06-05', '10842-06-05'],
    ['05/06/0842', '05/06/10842'],
    ['3024-01-01', '13024-01-01'],
    ['(2026-11-16)', '(12026-11-16)'],
  ]);

  leavesAlone([
    '2026-13-16',
    '2026-11-32',
    '32/11/2026',
    '16/11-2026',
    '2026-11-161',
    '1.2.3.2026',
    '192.168.1.2026',
    'v1.2.2026',
    '5/2026',
  ]);
});

describe('dates with a month name', () => {
  converts([
    ['November 16, 2026', 'November 16, 12026'],
    ['November 16 2026', 'November 16 12026'],
    ['November 2026', 'November 12026'],
    ['Nov 2026', 'Nov 12026'],
    ['Nov. 16, 2026', 'Nov. 16, 12026'],
    ['NOVEMBER 2026', 'NOVEMBER 12026'],
    ['Sept 3, 2026', 'Sept 3, 12026'],
    ['16 November 2026', '16 November 12026'],
    ['16th November 2026', '16th November 12026'],
    ['November 16th, 2026', 'November 16th, 12026'],
    ['16th of November 2026', '16th of November 12026'],
    ['Monday, November 16, 2026', 'Monday, November 16, 12026'],
    ['July 16–24, 1969', 'July 16–24, 11969'],
    ['July 16-24, 1969', 'July 16-24, 11969'],
    ['July 16th – 24th, 1969', 'July 16th – 24th, 11969'],
    ['May 2000', 'May 12000'],
    ['June 5, 0842', 'June 5, 10842'],
    ['16 novembre 2026', '16 novembre 12026'],
    ['16 de noviembre de 2026', '16 de noviembre de 12026'],
    ['16. November 2026', '16. November 12026'],
    ['16 nov 2026', '16 nov 12026'],
    ['1er janvier 2026', '1er janvier 12026'],
    ['März 2026', 'März 12026'],
    ['2026年11月16日', '12026年11月16日'],
    ['2026 年', '12026 年'],
    ['2026년 11월', '12026년 11월'],
  ]);

  leavesAlone(['November 20261', 'November 2026.5', 'Movember 20', 'mayhem 2000 units']);
});

describe('bare years with strong evidence', () => {
  converts([
    ['© 2026 Example Inc.', '© 12026 Example Inc.'],
    ['©2026', '©12026'],
    ['(c) 2026 Example', '(c) 12026 Example'],
    ['Copyright 2026', 'Copyright 12026'],
    ['the year 2000', 'the year 12000'],
    ['Year 1000', 'Year 11000'],
    ['since 1998', 'since 11998'],
    ['Since 2000, things changed', 'Since 12000, things changed'],
    ['circa 1500', 'circa 11500'],
    ['c. 1200', 'c. 11200'],
    ['ca. 1450', 'ca. 11450'],
    ['Est. 1987', 'Est. 11987'],
    ['founded 1912', 'founded 11912'],
    ['born 1950', 'born 11950'],
    ['Summer 2026', 'Summer 12026'],
    ['early 2000', 'early 12000'],
    ['Q3 2026 earnings', 'Q3 12026 earnings'],
    ['FY 2025', 'FY 12025'],
    ['until 2030', 'until 12030'],
    ['during 1944', 'during 11944'],
    ['AD 1066', 'AD 11066'],
    ['1066 AD', '11066 AD'],
    ['1492 CE', '11492 CE'],
    ['2000 was a leap year', '12000 was a leap year'],
    ['1900 saw the first', '11900 saw the first'],
    ['The 2000 election', 'The 12000 election'],
    ['(2026)', '(12026)'],
    ['Inception (2010) is a film', 'Inception (12010) is a film'],
    ['[1999]', '[11999]'],
    ['nel 2026', 'nel 12026'],
    ["dall'anno 2000", "dall'anno 12000"],
    ['seit 1990', 'seit 11990'],
    ['depuis 2015', 'depuis 12015'],
    ['desde 1999', 'desde 11999'],
    ['el año 2000', 'el año 12000'],
  ]);
});

describe('year ranges and lists', () => {
  converts([
    ['1939–1945', '11939–11945', 2],
    ['1939 – 1945', '11939 – 11945', 2],
    ['1939—1945', '11939—11945', 2],
    ['2020-2026', '12020-12026', 2],
    ['2025/2026', '12025/12026', 2],
    ['1000–2000', '11000–12000', 2],
    ['season 2025-26', 'season 12025-26'],
    ['2025/26', '12025/26'],
    ['2026-11', '12026-11'],
    ['2024, 2025 and 2026', '12024, 12025 and 12026', 3],
    ['in 2024, 2025 and 2026', 'in 12024, 12025 and 12026', 3],
    ['from 1990 to 1995', 'from 11990 to 11995', 2],
    ['between 1914 and 1918', 'between 11914 and 11918', 2],
    ['2019 vs 2020', '12019 vs 12020', 2],
    ['since 2000, 2004 and 2008', 'since 12000, 12004 and 12008', 3],
  ]);

  leavesAlone([
    '1000–2000 people',
    '1500-2000 words',
    'from 1200 to 1500 respondents',
    '1500, 2000 and 1000',
    'about 1200–1500',
    '4242-2026-1111-2222',
  ]);
});

describe('bare years after a preposition', () => {
  converts([
    ['in 2026', 'in 12026'],
    ['In 2026.', 'In 12026.'],
    ['Back in 1969, humans', 'Back in 11969, humans'],
    ['It ended in 2026.', 'It ended in 12026.'],
    ['in 2000', 'in 12000'],
    ['in 2000 we partied', 'in 12000 we partied'],
    ['in 1066 the Normans', 'in 11066 the Normans'],
    ['In 2026 Apple released', 'In 12026 Apple released'],
    ['the 2026 budget', 'the 12026 budget'],
    ['plans for 2027', 'plans for 12027'],
    ['by 2030', 'by 12030'],
    ['the class of 1999', 'the class of 11999'],
    ['before 1900', 'before 11900'],
    ['after 1945 everything changed', 'after 11945 everything changed'],
    ['en 2026', 'en 12026'],
    ['im 2026', 'im 12026'],
  ]);

  leavesAlone([
    'in 2026 people will', // known trade-off: "people" marks a quantity
    'of 2000 respondents',
    'the 1500 participants',
    'for 1200 dollars',
    'by 1500 points',
    'a total of 1500 attendees',
    'in 2000 pieces',
    'the 1250 sheep',
  ]);
});

describe('bare years by position', () => {
  converts([
    ['2026', '12026'],
    [' 2026 ', ' 12026 '],
    ['2026.', '12026.'],
    ['— 2026', '— 12026'],
    ['2000', '12000'],
    ['1900', '11900'],
    ['World Cup 2026', 'World Cup 12026'],
    ['Best Phones 2026: our picks', 'Best Phones 12026: our picks'],
    ['Election 2024', 'Election 12024'],
    ['CES 2026 - highlights', 'CES 12026 - highlights'],
    ['2026 World Cup', '12026 World Cup'],
    ['2024 Annual Report', '12024 Annual Report'],
    ['2026 in review', '12026 in review'],
  ]);

  leavesAlone([
    '1500',
    '1234',
    '1899',
    'Total 1500',
    'Score: 1850',
    'Odyssey 2000',
    '2000 Things To Do',
    '1500 Broadway',
    'we sold 2026 tickets',
    'roughly 2026',
    'has 1999 entries',
  ]);
});

describe('quantities, labels and other numbers', () => {
  leavesAlone([
    '2000 people',
    '2026 users',
    '1500 words',
    '1200 calories',
    '2000 km',
    '1500 m',
    '2000-word essay',
    '1999 dollars',
    '2000 years ago',
    '1200 BC',
    '1200 BCE',
    'in 1200 BC',
    'over 2000',
    'about 1500',
    'nearly 2000',
    'more than 2000',
    'at least 1500',
    'approximately 1999',
    '~2000',
    '≈ 2026',
    'x = 2026',
    'Room 2026',
    'Flight 1549',
    'page 2024',
    'p. 1984',
    'No. 2026',
    'Model 2000',
    'Windows 2000',
    'Office 2019',
    'port 2049',
    'order 2025',
    '$2026',
    '$ 2026',
    '€2026',
    '2026 €',
    '2026€',
    '2026%',
    '2026 %',
    '2,026',
    '1,2026',
    '2026.5',
    '2026,5',
    '3.2026',
    '20:26',
    '2026:01',
    '555-2026',
    '+39 2026',
    '#2026',
    '1920x1080',
    '1080p',
    'v2026',
    'abc2026',
    '2026abc',
    'año2026',
    '2026_01',
    '99999',
    '2026-1',
    '999',
    '2100',
    '3000',
    '0999',
    'in 2100',
    'year 3000',
  ]);
});

describe('already converted text', () => {
  leavesAlone([
    '12026',
    'in 12026',
    'November 16, 12026',
    '12026-11-16',
    '16/11/12026',
    '© 12026',
    '11939–11945',
    '12026年',
  ]);

  test('converting twice changes nothing more', () => {
    const inputs = [
      'Nov 16, 2026 · 2026-11-16 · 16/11/2026 · in 2026',
      'in 2024, 2025 and 2026',
      '1939–1945 and 2000 people',
      'since 2000 and of 1500 respondents',
    ];
    for (const input of inputs) {
      const once = convert(input).text;
      assert.deepEqual(convert(once), { text: once, count: 0 });
    }
  });
});

describe('mixed text', () => {
  converts([
    [
      'From 16 November 2026 to 2027-01-02, then in 1999.',
      'From 16 November 12026 to 12027-01-02, then in 11999.',
      3,
    ],
    [
      'In 2026, about 2000 people paid $1999 for 1500 units.',
      'In 12026, about 2000 people paid $1999 for 1500 units.',
      1,
    ],
    [
      'Posted Nov 3, 2025 · 2048 views · © 2026',
      'Posted Nov 3, 12025 · 2048 views · © 12026',
      2,
    ],
    ['Room 2026 was booked in 2026.', 'Room 2026 was booked in 12026.', 1],
    ['WWII (1939–1945) killed over 2000 daily', 'WWII (11939–11945) killed over 2000 daily', 2],
  ]);

  test('empty and digit-free text', () => {
    assert.deepEqual(convert(''), { text: '', count: 0 });
    assert.deepEqual(convert('no numbers here'), { text: 'no numbers here', count: 0 });
  });
});

describe('locales', () => {
  test('English month names always work', () => {
    assert.equal(createConverter()('5 March 0900').text, '5 March 10900');
    assert.equal(createConverter(['xx-invalid-locale-tag!', '', undefined])('5 March 0900').text, '5 March 10900');
  });

  test('other languages need their locale', () => {
    assert.equal(createConverter(['en'])('5 marzo 0900').text, '5 marzo 0900');
    assert.equal(createConverter(['it'])('5 marzo 0900').text, '5 marzo 10900');
    assert.equal(createConverter(['fr'])('5 mars 0900').text, '5 mars 10900');
  });
});
