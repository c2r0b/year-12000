// The release tooling: packaging and the token request for the store API.
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { signedJwt } = require('../../scripts/chrome-web-store.js');

const root = path.join(__dirname, '..', '..');
const manifest = require('../../manifest.json');

describe('versions', () => {
  test('package.json and manifest.json agree', () => {
    assert.equal(require('../../package.json').version, manifest.version);
  });
});

describe('package', () => {
  const zip = path.join(root, execFileSync('node', ['scripts/package.js'], { cwd: root, encoding: 'utf8' }).trim());
  const entries = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).trim().split('\n').sort();

  test('is named after the manifest version', () => {
    assert.equal(path.basename(zip), `year-12000-${manifest.version}.zip`);
  });

  test('contains exactly the runtime files', () => {
    assert.deepEqual(entries, [
      'content.js',
      'dates.js',
      'icons/icon-128.png',
      'icons/icon-16.png',
      'icons/icon-32.png',
      'icons/icon-48.png',
      'lexicon.js',
      'manifest.json',
      'popup.css',
      'popup.html',
      'popup.js',
    ]);
  });

  test('contains every file the manifest and the popup refer to', () => {
    const popup = fs.readFileSync(path.join(root, 'popup.html'), 'utf8');
    const referenced = [
      ...Object.values(manifest.icons),
      ...Object.values(manifest.action.default_icon),
      manifest.action.default_popup,
      ...manifest.content_scripts.flatMap((script) => script.js),
      ...[...popup.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]),
    ];
    for (const file of referenced) assert.ok(entries.includes(file), `${file} is not packaged`);
  });
});

describe('service account token request', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const key = {
    client_email: 'robot@example.iam.gserviceaccount.com',
    private_key_id: 'key-1',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    token_uri: 'https://oauth2.googleapis.com/token',
  };
  const [header, claims, signature] = signedJwt(key, 1_000_000).split('.');
  const decode = (part) => JSON.parse(Buffer.from(part, 'base64url').toString());

  test('carries the right claims', () => {
    assert.deepEqual(decode(header), { alg: 'RS256', typ: 'JWT', kid: 'key-1' });
    assert.deepEqual(decode(claims), {
      iss: 'robot@example.iam.gserviceaccount.com',
      scope: 'https://www.googleapis.com/auth/chromewebstore',
      aud: 'https://oauth2.googleapis.com/token',
      iat: 1_000_000,
      exp: 1_000_600,
    });
  });

  test('is signed with the account key', () => {
    const valid = crypto.verify(
      'RSA-SHA256',
      Buffer.from(`${header}.${claims}`),
      publicKey,
      Buffer.from(signature, 'base64url'),
    );
    assert.ok(valid);
  });
});
