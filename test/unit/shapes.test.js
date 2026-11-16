// Decades and hyphenated prefixes.
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { createConverter } = require('../../dates.js');

const convert = createConverter(['en', 'de']);

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

describe('decades', () => {
  converts([
    ['the 1990s', 'the 11990s'],
    ['The 2020s have been odd', 'The 12020s have been odd'],
    ["1990's music", "11990's music"],
    ['1990’s', '11990’s'],
    ['mid-1990s', 'mid-11990s'],
    ['late-1800s', 'late-11800s'],
    ['the 1960s and 1970s', 'the 11960s and 11970s', 2],
    ['1920s–1930s', '11920s–11930s', 2],
    ['die 1990er Jahre', 'die 11990er Jahre'],
    ['in den 1990ern', 'in den 11990ern'],
    ['(1980s)', '(11980s)'],
  ]);

  leavesAlone([
    '1000s of people',
    '2000s of them',
    '1995s',
    '2100s',
    '$1990s',
    '11990s',
    'x1990s',
    '1990st',
    '1990sx',
  ]);
});

describe('hyphenated prefixes', () => {
  converts([
    ['mid-2026', 'mid-12026'],
    ['pre-2020 levels', 'pre-12020 levels'],
    ['post-1945 Europe', 'post-11945 Europe'],
    ['early-2000 optimism', 'early-12000 optimism'],
    ['late-1999', 'late-11999'],
    ['Mid-2026', 'Mid-12026'],
    ['the pre-1900 era', 'the pre-11900 era'],
  ]);

  leavesAlone(['amid-2026', 'pre-2020.5', 'post-1945-01', 'x-2026', 'mid-12026', 'pre-3000', 'pre-999']);
});
