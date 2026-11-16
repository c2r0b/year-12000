// Accuracy on real text: the labelled Wikipedia extracts in test/corpus.
// `npm run corpus` prints the full report, including every miss.
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { scoreCorpus } = require('../corpus/score.js');

const corpus = scoreCorpus();
const LANGUAGES = ['de', 'en', 'es', 'fr', 'it', 'pt'];

describe('corpus', () => {
  test('covers every supported language', () => {
    const languages = [...new Set(corpus.files.map((file) => file.language))].sort();
    assert.deepEqual(languages, LANGUAGES);
  });

  for (const file of corpus.files) {
    test(`${file.name} is reviewed, attributed and labelled`, () => {
      assert.ok(file.reviewed, 'labels are still marked UNREVIEWED');
      assert.ok(file.hasSource, 'missing "# Source:" line');
      assert.ok(file.years > 0, 'no year is labelled');
    });
  }

  test('almost never converts a quantity (precision ≥ 98%)', () => {
    const wrong = corpus.wrong.map((outcome) => outcome.context);
    assert.ok(corpus.precision >= 0.98, `precision ${corpus.precision}: ${wrong.join(' | ')}`);
  });

  test('finds nearly every year (recall ≥ 95%)', () => {
    const missed = corpus.missed.map((outcome) => outcome.context);
    assert.ok(corpus.recall >= 0.95, `recall ${corpus.recall}: ${missed.join(' | ')}`);
  });

  for (const language of LANGUAGES) {
    test(`finds most years in "${language}" text (recall ≥ 90%)`, () => {
      const outcomes = corpus.files
        .filter((file) => file.language === language)
        .flatMap((file) => file.outcomes)
        .filter((outcome) => outcome.isYear);
      const found = outcomes.filter((outcome) => outcome.converted).length;
      assert.ok(found / outcomes.length >= 0.9, `${found} of ${outcomes.length}`);
    });
  }

  test('has enough material to mean something', () => {
    assert.ok(corpus.years >= 100, `${corpus.years} years`);
    assert.ok(corpus.quantities >= 10, `${corpus.quantities} other numbers`);
  });
});
