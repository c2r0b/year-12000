// Checks the addons.mozilla.org API credentials without publishing anything.
// Publishing itself is done by `web-ext sign` (see .github/workflows/release.yml).
//
//   node scripts/firefox-add-ons.js status
//
// Environment (from https://addons.mozilla.org/developers/addon/api/key/):
//   WEB_EXT_API_KEY      the "JWT issuer"
//   WEB_EXT_API_SECRET   the "JWT secret"
const crypto = require('node:crypto');

const API = 'https://addons.mozilla.org/api/v5';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

const base64url = (value) => Buffer.from(value).toString('base64url');

// A short-lived token signed with the shared secret.
function signedJwt(issuer, secret, now = Math.floor(Date.now() / 1000)) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({ iss: issuer, jti: crypto.randomUUID(), iat: now, exp: now + 60 }),
  );
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${claims}`).digest('base64url');
  return `${header}.${claims}.${signature}`;
}

async function main() {
  if (process.argv[2] !== 'status') throw new Error('Usage: firefox-add-ons.js status');
  const token = signedJwt(requireEnv('WEB_EXT_API_KEY'), requireEnv('WEB_EXT_API_SECRET'));
  const response = await fetch(`${API}/accounts/profile/`, { headers: { authorization: `JWT ${token}` } });
  if (!response.ok) {
    throw new Error(`addons.mozilla.org rejected the credentials (${response.status}): ${await response.text()}`);
  }
  const profile = await response.json();
  console.log(`Credentials accepted for the account "${profile.name ?? profile.username}".`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { signedJwt };
