// Talks to the Chrome Web Store API (V2) with a Google service account.
//
//   node scripts/chrome-web-store.js status            show the item's state
//   node scripts/chrome-web-store.js publish <zip>     upload a zip and submit it for review
//
// Environment:
//   CWS_PUBLISHER_ID          Developer Dashboard > Account
//   CWS_EXTENSION_ID          the 32-letter item ID
//   CWS_SERVICE_ACCOUNT_KEY   the service account's JSON key, as text
//
// No dependencies: the access token is obtained by signing a JWT with Node's
// crypto module. Nothing secret is ever printed.
const crypto = require('node:crypto');
const fs = require('node:fs');

const API = 'https://chromewebstore.googleapis.com';
const SCOPE = 'https://www.googleapis.com/auth/chromewebstore';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

const base64url = (value) => Buffer.from(value).toString('base64url');

// Builds the signed JWT that Google exchanges for an access token.
function signedJwt(key, now = Math.floor(Date.now() / 1000)) {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: key.private_key_id }));
  const claims = base64url(
    JSON.stringify({
      iss: key.client_email,
      scope: SCOPE,
      aud: key.token_uri,
      iat: now,
      exp: now + 600,
    }),
  );
  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${claims}`), key.private_key);
  return `${header}.${claims}.${signature.toString('base64url')}`;
}

async function accessToken(key) {
  const response = await fetch(key.token_uri, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedJwt(key),
    }),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Could not get an access token: ${body.error} ${body.error_description ?? ''}`);
  }
  return body.access_token;
}

async function call(token, method, url, body, headers = {}) {
  const response = await fetch(url, {
    method,
    body,
    headers: { authorization: `Bearer ${token}`, ...headers },
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`${method} ${new URL(url).pathname} failed (${response.status}): ${JSON.stringify(json)}`);
  }
  return json;
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function main() {
  const [command, zipPath] = process.argv.slice(2);
  if (!['status', 'publish'].includes(command) || (command === 'publish' && !zipPath)) {
    throw new Error('Usage: chrome-web-store.js status | publish <zip>');
  }

  const item = `publishers/${requireEnv('CWS_PUBLISHER_ID')}/items/${requireEnv('CWS_EXTENSION_ID')}`;
  const key = JSON.parse(requireEnv('CWS_SERVICE_ACCOUNT_KEY'));
  const token = await accessToken(key);
  const fetchStatus = () => call(token, 'GET', `${API}/v2/${item}:fetchStatus`);

  if (command === 'status') {
    const status = await fetchStatus();
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  console.log(`Uploading ${zipPath}…`);
  const upload = await call(token, 'POST', `${API}/upload/v2/${item}:upload`, fs.readFileSync(zipPath), {
    'content-type': 'application/zip',
  });
  let state = upload.uploadState;
  for (let attempt = 0; /IN_PROGRESS/.test(state) && attempt < 60; attempt++) {
    await sleep(5000);
    state = (await fetchStatus()).lastAsyncUploadState;
  }
  if (state !== 'SUCCEEDED') throw new Error(`Upload did not succeed: ${state ?? JSON.stringify(upload)}`);
  console.log(`Uploaded version ${upload.crxVersion ?? '(see dashboard)'}.`);

  const published = await call(token, 'POST', `${API}/v2/${item}:publish`, JSON.stringify({}), {
    'content-type': 'application/json',
  });
  console.log(`Submitted. State: ${published.state}.`);
  for (const warning of published.warningInfo?.warnings ?? []) {
    console.log(`Warning: ${warning.reason} ${warning.description ?? ''}`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { signedJwt };
