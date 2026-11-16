// Adds a Wikipedia article to the test corpus.
//
//   node scripts/fetch-corpus.js <language> <article title>
//   node scripts/fetch-corpus.js it "Cortina d'Ampezzo"
//
// The text is saved with every number from 1000 to 2099 marked as a year, like
// {1969}. That is only a first guess: read the file and remove the braces from
// the numbers that are not years. See test/corpus/README.md.
const fs = require('node:fs');
const path = require('node:path');

const MAX_LENGTH = 3000;
const [language, ...titleWords] = process.argv.slice(2);
const title = titleWords.join(' ');

if (!language || !title) {
  console.error('Usage: node scripts/fetch-corpus.js <language> <article title>');
  process.exit(1);
}

(async () => {
  const api = new URL(`https://${language}.wikipedia.org/w/api.php`);
  api.search = new URLSearchParams({
    action: 'query',
    prop: 'extracts',
    explaintext: '1',
    redirects: '1',
    format: 'json',
    titles: title,
  });
  const response = await fetch(api, { headers: { 'user-agent': 'corpus-builder/1.0' } });
  const page = Object.values((await response.json()).query.pages)[0];
  if (!page.extract) throw new Error(`No article "${title}" on ${language}.wikipedia.org`);

  // Whole paragraphs, up to the size limit, without section headings.
  let text = '';
  for (const paragraph of page.extract.split(/\n+/)) {
    if (/^=+.*=+$/.test(paragraph.trim()) || !paragraph.trim()) continue;
    if (text.length + paragraph.length > MAX_LENGTH) break;
    text += `${paragraph.trim()}\n\n`;
  }

  const marked = text.replace(/(?<![\d.,])(?:1\d{3}|20\d{2})(?!\d)/g, '{$&}');
  const slug = page.title
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  const file = path.join(__dirname, '..', 'test', 'corpus', `${language}-${slug}.txt`);
  const url = `https://${language}.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ', '_'))}`;
  fs.writeFileSync(
    file,
    `# Source: ${url}\n# License: CC BY-SA 4.0, text by Wikipedia contributors\n# Labels: UNREVIEWED\n\n${marked.trim()}\n`,
  );
  console.log(`${path.relative(process.cwd(), file)}: ${(marked.match(/\{/g) ?? []).length} numbers marked`);
})();
