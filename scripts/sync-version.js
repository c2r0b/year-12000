// Copies the version from package.json to manifest.json. Runs as part of
// `npm version`, so both files and the git tag always agree.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const manifestPath = path.join(root, 'manifest.json');
const manifest = fs.readFileSync(manifestPath, 'utf8');

const updated = manifest.replace(/("version":\s*")[^"]+(")/, `$1${version}$2`);
if (updated === manifest && !manifest.includes(`"version": "${version}"`)) {
  console.error('Could not find the version field in manifest.json');
  process.exit(1);
}
fs.writeFileSync(manifestPath, updated);
console.log(`manifest.json is at ${version}`);
