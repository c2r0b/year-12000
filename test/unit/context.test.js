// Context that comes from the page around a piece of text.
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { createConverter, classifyHeader } = require('../../dates.js');

const convert = createConverter(['en', 'it']);

// Each case: [before, text, after, expected text, expected count]
function withContext(cases) {
  for (const [before, text, after, expected, count = expected === text ? 0 : 1] of cases) {
    test(`"${before}[${text}]${after}" → "${expected}"`, () => {
      assert.deepEqual(convert(text, { before, after }), { text: expected, count });
    });
  }
}

describe('surrounding text', () => {
  describe('provides the evidence a lone piece lacks', () => {
    withContext([
      ['since ', '1500', '', '11500'],
      ['in ', '2000', '', '12000'],
      ['Published ', '2019', ' by Example', '12019'],
      ['Nov 16, ', '1500', '', '11500'],
      ['November ', '1500', '', '11500'],
      ['16 novembre ', '1500', '', '11500'],
      ['', '1500', ' was a hard year', '11500'],
      ['', '1066', ' AD', '11066'],
      ['(', '1500', ')', '11500'],
      ['', '1939', '–1945', '11939'],
      ['1939–', '1945', '', '11945'],
      ['in 2024, ', '1500', ' and 2026', '11500'],
      ['the ', '2026', ' budget', '12026'],
    ]);
  });

  describe('reveals quantities and labels', () => {
    withContext([
      ['', '2026', ' people', '2026'],
      ['about ', '2026', '', '2026'],
      ['Room ', '2026', '', '2026'],
      ['$', '2026', '', '2026'],
      ['', '2026', '%', '2026'],
      ['', '2026', '.50', '2026'],
      ['Total: ', '2026', '', '2026'],
      ['', '2026', ' km away', '2026'],
      ['of ', '2000', ' respondents', '2000'],
      ['1500–', '2000', ' people', '2000'],
      ['', '2026', 'px', '2026'],
      ['v', '2026', '', '2026'],
    ]);
  });

  test('is never changed itself and never counted', () => {
    const result = convert(' and ', { before: 'between 1914', after: '1918' });
    assert.deepEqual(result, { text: ' and ', count: 0 });
  });

  test('only the piece in the middle is converted', () => {
    const result = convert('1914 and 1918', { before: 'between 1900, ', after: ' and 1920' });
    assert.deepEqual(result, { text: '11914 and 11918', count: 2 });
  });

  test('a number split across pieces is not a candidate', () => {
    assert.deepEqual(convert('26', { before: 'in 20' }), { text: '26', count: 0 });
    assert.deepEqual(convert('20', { after: '26' }), { text: '20', count: 0 });
  });

  test('full dates inside the piece do not need the context', () => {
    assert.deepEqual(convert('2026-11-16', { before: 'about ', after: ' people' }), {
      text: '12026-11-16',
      count: 1,
    });
  });
});

describe('date and quantity context', () => {
  test('date context accepts numbers without other evidence', () => {
    assert.deepEqual(convert('1500', { dateContext: true }), { text: '11500', count: 1 });
    assert.deepEqual(convert('Total 1850', { dateContext: true }), { text: 'Total 11850', count: 1 });
  });

  test('date context still refuses obvious quantities', () => {
    assert.deepEqual(convert('2000 people', { dateContext: true }), { text: '2000 people', count: 0 });
    assert.deepEqual(convert('$2026', { dateContext: true }), { text: '$2026', count: 0 });
  });

  test('quantity context refuses bare numbers even with evidence', () => {
    assert.deepEqual(convert('2026', { quantityContext: true }), { text: '2026', count: 0 });
    assert.deepEqual(convert('in 2026', { quantityContext: true }), { text: 'in 2026', count: 0 });
    assert.deepEqual(convert('1939–1945', { quantityContext: true }), { text: '1939–1945', count: 0 });
  });

  test('quantity context does not affect full dates', () => {
    assert.deepEqual(convert('2026-11-16', { quantityContext: true }), { text: '12026-11-16', count: 1 });
    assert.deepEqual(convert('Nov 2026', { quantityContext: true }), { text: 'Nov 12026', count: 1 });
  });
});

describe('table headers', () => {
  const cases = [
    ['Year', 'date'],
    ['Release year', 'date'],
    ['Date', 'date'],
    ['Founded', 'date'],
    ['Born', 'date'],
    ['Anno', 'date'],
    ['Año', 'date'],
    ['Année', 'date'],
    ['Jahr', 'date'],
    ['Ano', 'date'],
    ['Fecha de nacimiento', 'date'],
    ['Price', 'quantity'],
    ['Total', 'quantity'],
    ['Population', 'quantity'],
    ['Qty', 'quantity'],
    ['Prezzo', 'quantity'],
    ['Preis', 'quantity'],
    ['Prix', 'quantity'],
    ['Elevation (m)', 'quantity'],
    ['Name', null],
    ['', null],
    ['Yearly', null],
    ['Total by year', null],
  ];
  for (const [header, expected] of cases) {
    test(`"${header}" → ${expected}`, () => {
      assert.equal(classifyHeader(header), expected);
    });
  }
});
