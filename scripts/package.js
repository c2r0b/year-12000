// Builds the store packages: only the files the extension needs at runtime,
// nothing from tests, docs or node_modules.
//
//   node scripts/package.js            both targets
//   node scripts/package.js chrome     dist/chrome/   + dist/year-12000-<version>-chrome.zip
//   node scripts/package.js firefox    dist/firefox/  + dist/year-12000-<version>-firefox.zip
//
// Prints the path of each zip it writes. The Chrome package also serves Edge
// and the other Chromium browsers. The Firefox package differs only in its
// manifest, which gains the settings Firefox requires.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
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

const TARGETS = {
  chrome: (base) => base,
  firefox: (base) => ({
    ...base,
    browser_specific_settings: {
      gecko: {
        // Permanent once the add-on is listed: it identifies it on addons.mozilla.org.
        id: '@year-12000.c2r0b',
        // The first version that understands data_collection_permissions.
        strict_min_version: '140.0',
        data_collection_permissions: { required: ['none'] },
      },
    },
  }),
};

function check() {
  // Everything the manifest points to must be in the list above.
  const referenced = [
    ...Object.values(manifest.icons ?? {}),
    ...Object.values(manifest.action?.default_icon ?? {}),
    manifest.action?.default_popup,
    ...(manifest.content_scripts ?? []).flatMap((script) => [...(script.js ?? []), ...(script.css ?? [])]),
  ].filter(Boolean);

  const unpackaged = [...new Set(referenced)].filter((file) => !FILES.includes(file));
  if (unpackaged.length) {
    throw new Error(`manifest.json references files that are not packaged: ${unpackaged.join(', ')}`);
  }
  const missing = FILES.filter((file) => !fs.existsSync(path.join(root, file)));
  if (missing.length) throw new Error(`Missing files: ${missing.join(', ')}`);
}

function build(target) {
  const directory = path.join(dist, target);
  fs.rmSync(directory, { recursive: true, force: true });
  for (const file of FILES) {
    fs.mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
    fs.copyFileSync(path.join(root, file), path.join(directory, file));
  }
  fs.writeFileSync(
    path.join(directory, 'manifest.json'),
    `${JSON.stringify(TARGETS[target](manifest), null, 2)}\n`,
  );

  const zip = path.join(dist, `year-12000-${manifest.version}-${target}.zip`);
  fs.rmSync(zip, { force: true });
  execFileSync('zip', ['-q', '-X', zip, ...FILES], { cwd: directory, stdio: 'inherit' });
  return zip;
}

try {
  const requested = process.argv.slice(2);
  const unknown = requested.filter((target) => !TARGETS[target]);
  if (unknown.length) throw new Error(`Unknown target: ${unknown.join(', ')}. Use chrome or firefox.`);

  check();
  for (const target of requested.length ? requested : Object.keys(TARGETS)) {
    console.log(path.relative(process.cwd(), build(target)));
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
