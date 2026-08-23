const fs = require('node:fs/promises');
const path = require('node:path');

const projectId = process.env.FIREBASE_PROJECT_ID;
const authExportPath = process.env.AUTH_EXPORT_FILE;
const globalModules = process.env.FIREBASE_TOOLS_MODULES;

if (!projectId || !authExportPath || !globalModules) {
  throw new Error('FIREBASE_PROJECT_ID, AUTH_EXPORT_FILE, and FIREBASE_TOOLS_MODULES are required.');
}

const firebaseAuth = require(path.join(globalModules, 'firebase-tools', 'lib', 'auth.js'));
const scopes = require(path.join(globalModules, 'firebase-tools', 'lib', 'scopes.js'));
const databaseRoot = `projects/${projectId}/databases/(default)/documents`;
const apiRoot = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

const getBearerToken = async () => {
  const account = firebaseAuth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI login is required.');
  const token = await firebaseAuth.getAccessToken(account.tokens.refresh_token, [
    scopes.EMAIL,
    scopes.OPENID,
    scopes.CLOUD_PROJECTS_READONLY,
    scopes.FIREBASE_PLATFORM,
    scopes.CLOUD_PLATFORM,
  ]);
  if (!token?.access_token) throw new Error('Could not acquire a Firebase CLI access token.');
  return token.access_token;
};

const request = async (url, token, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Firestore ${response.status}: ${detail.slice(0, 500)}`);
  }
  return response.json();
};

const batchGetProfiles = async (users, token) => {
  const responses = await request(`${apiRoot}:batchGet`, token, {
    method: 'POST',
    body: JSON.stringify({
      documents: users.map(({ localId }) => `${databaseRoot}/publicProfiles/${localId}`),
      mask: { fieldPaths: ['name', 'deleted'] },
    }),
  });
  return new Map(
    responses
      .filter(({ found }) => found)
      .map(({ found }) => [found.name.split('/').pop(), found.fields || {}])
  );
};

const allowedAvatar = (url) => {
  const value = String(url || '').trim();
  return /^(https:\/\/lh3\.googleusercontent\.com\/|https:\/\/firebasestorage\.googleapis\.com\/)/.test(value)
    ? value.slice(0, 2048)
    : '';
};

const main = async () => {
  const exportData = JSON.parse(await fs.readFile(authExportPath, 'utf8'));
  const users = Array.isArray(exportData.users) ? exportData.users : [];
  const token = await getBearerToken();
  const existing = await batchGetProfiles(users, token);
  const timestamp = new Date().toISOString();
  let skippedDeleted = 0;

  const writes = users.flatMap((user) => {
    const current = existing.get(user.localId) || {};
    const currentName = current.name?.stringValue || '';
    const deleted = current.deleted?.booleanValue === true || currentName === 'Deleted user';
    if (deleted) {
      skippedDeleted += 1;
      return [];
    }

    const name = String(user.displayName || '').trim().slice(0, 50);
    if (!name) return [];
    return [{
      update: {
        name: `${databaseRoot}/publicProfiles/${user.localId}`,
        fields: {
          name: { stringValue: name },
          avatar: { stringValue: allowedAvatar(user.photoUrl) },
          updatedAt: { timestampValue: timestamp },
        },
      },
      updateMask: { fieldPaths: ['name', 'avatar', 'updatedAt'] },
    }];
  });

  for (let offset = 0; offset < writes.length; offset += 400) {
    await request(`${apiRoot}:commit`, token, {
      method: 'POST',
      body: JSON.stringify({ writes: writes.slice(offset, offset + 400) }),
    });
  }

  const verified = await batchGetProfiles(users, token);
  const usableProfiles = [...verified.values()].filter((fields) => {
    const name = String(fields.name?.stringValue || '').trim().toLowerCase();
    return name && name !== 'member' && name !== 'group member';
  }).length;

  console.log(JSON.stringify({ exportedUsers: users.length, written: writes.length, skippedDeleted, usableProfiles }));
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
