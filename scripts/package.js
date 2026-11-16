// Builds the zip that goes to the Chrome Web Store: only the files the
// extension needs at runtime, nothing from tests, docs or node_modules.
// Run with: npm run package
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

const FILES = [
  'manifest.json',
  'lexicon.js',
  'dates.js',
  'content.js',
  'popup.html',
  'popup.css',
  'popup.js',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'icons/icon-128.png',
];

// Everything the manifest points to must be in the list above.
const referenced = [
  ...Object.values(manifest.icons ?? {}),
  ...Object.values(manifest.action?.default_icon ?? {}),
  manifest.action?.default_popup,
  ...(manifest.content_scripts ?? []).flatMap((script) => [...(script.js ?? []), ...(script.css ?? [])]),
].filter(Boolean);

const missing = [...new Set(referenced)].filter((file) => !FILES.includes(file));
if (missing.length) {
  console.error(`manifest.json references files that are not packaged: ${missing.join(', ')}`);
  process.exit(1);
}
for (const file of FILES) {
  if (!fs.existsSync(path.join(root, file))) {
    console.error(`Missing file: ${file}`);
    process.exit(1);
  }
}

const dist = path.join(root, 'dist');
const zip = path.join(dist, `year-12000-${manifest.version}.zip`);
fs.mkdirSync(dist, { recursive: true });
fs.rmSync(zip, { force: true });
execFileSync('zip', ['-q', '-X', zip, ...FILES], { cwd: root, stdio: 'inherit' });

console.log(path.relative(process.cwd(), zip));
