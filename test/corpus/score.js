// Scores the converter against the labelled corpus in this folder.
const fs = require('node:fs');
const path = require('node:path');
const { createConverter } = require('../../dates.js');

// Reads a corpus file: "#" lines are the header, {1969} marks a year.
function readCorpusFile(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const header = lines.filter((line) => line.startsWith('#'));
  const paragraphs = lines.filter((line) => line.trim() && !line.startsWith('#'));
  return {
    name: path.basename(file, '.txt'),
    language: path.basename(file).split('-')[0],
    reviewed: header.some((line) => /^# Labels: reviewed/.test(line)),
    hasSource: header.some((line) => /^# Source: https:\/\//.test(line)),
    paragraphs,
  };
}

// Compares, number by number, what was converted with what was labelled.
function scoreParagraph(convert, marked) {
  const input = marked.replace(/[{}]/g, '');
  const output = convert(input).text;

  const labels = [...marked.matchAll(/(\{?)(\d+)/g)].map((match) => match[1] === '{');
  const before = [...input.matchAll(/\d+/g)];
  const after = [...output.matchAll(/\d+/g)];

  const outcomes = [];
  before.forEach((token, index) => {
    const isYear = labels[index];
    const converted = after[index][0] !== token[0];
    if (!isYear && !converted && !/^(?:1\d{3}|20\d{2})$/.test(token[0])) return; // not a candidate
    const context = input.slice(Math.max(0, token.index - 40), token.index + token[0].length + 25);
    outcomes.push({ number: token[0], isYear, converted, context });
  });
  return outcomes;
}

function scoreCorpus(directory = __dirname) {
  const files = fs
    .readdirSync(directory)
    .filter((name) => name.endsWith('.txt'))
    .sort()
    .map((name) => readCorpusFile(path.join(directory, name)));

  const results = files.map((file) => {
    const convert = createConverter([file.language], file.language);
    const outcomes = file.paragraphs.flatMap((paragraph) => scoreParagraph(convert, paragraph));
    return { ...file, outcomes, ...summarise(outcomes) };
  });
  return { files: results, ...summarise(results.flatMap((file) => file.outcomes)) };
}

function summarise(outcomes) {
  const hits = outcomes.filter((outcome) => outcome.isYear && outcome.converted).length;
  const missed = outcomes.filter((outcome) => outcome.isYear && !outcome.converted);
  const wrong = outcomes.filter((outcome) => !outcome.isYear && converted(outcome));
  const years = hits + missed.length;
  return {
    years,
    quantities: outcomes.length - years,
    missed,
    wrong,
    recall: years ? hits / years : 1,
    precision: hits + wrong.length ? hits / (hits + wrong.length) : 1,
  };
}

const converted = (outcome) => outcome.converted;

module.exports = { scoreCorpus };
