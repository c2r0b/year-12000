// Prints how the converter does on the labelled corpus.
// Run with: npm run corpus
const { scoreCorpus } = require('../test/corpus/score.js');

const percent = (value) => `${(value * 100).toFixed(1)}%`;
const corpus = scoreCorpus();

for (const file of corpus.files) {
  console.log(
    `${file.name.padEnd(34)} years ${String(file.years).padStart(3)}  other numbers ${String(file.quantities).padStart(3)}  ` +
      `recall ${percent(file.recall).padStart(6)}  precision ${percent(file.precision).padStart(6)}`,
  );
  for (const miss of file.missed) console.log(`    missed year:        …${miss.context}…`);
  for (const error of file.wrong) console.log(`    converted quantity: …${error.context}…`);
}

console.log(
  `\nTotal: ${corpus.years} years, ${corpus.quantities} other numbers. ` +
    `Recall ${percent(corpus.recall)} (${corpus.missed.length} missed), ` +
    `precision ${percent(corpus.precision)} (${corpus.wrong.length} wrongly converted).`,
);
