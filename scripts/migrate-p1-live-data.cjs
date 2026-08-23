const fs = require('node:fs/promises');
const path = require('node:path');

const projectId = process.env.FIREBASE_PROJECT_ID || 'paymatrix-174b5';
const globalModules = process.env.FIREBASE_TOOLS_MODULES;
const apply = process.argv.includes('--apply');

if (!globalModules) throw new Error('FIREBASE_TOOLS_MODULES is required.');

const firebaseAuth = require(path.join(globalModules, 'firebase-tools', 'lib', 'auth.js'));
const scopes = require(path.join(globalModules, 'firebase-tools', 'lib', 'scopes.js'));
const databaseRoot = `projects/${projectId}/databases/(default)/documents`;
const apiRoot = `https://firestore.googleapis.com/v1/${databaseRoot}`;
const now = new Date().toISOString();

const stringValue = (value) => ({ stringValue: String(value) });
const integerValue = (value) => ({ integerValue: String(value) });
const timestampValue = (value = now) => ({ timestampValue: value });
const booleanValue = (value) => ({ booleanValue: Boolean(value) });
const getString = (doc, field) => doc.fields?.[field]?.stringValue || '';
const hasField = (doc, field) => Object.prototype.hasOwnProperty.call(doc.fields || {}, field);
const getNumber = (doc, field) => {
  const value = doc.fields?.[field];
  if (!value) return NaN;
  return Number(value.integerValue ?? value.doubleValue);
};
const getStringArray = (doc, field) =>
  (doc.fields?.[field]?.arrayValue?.values || []).map((value) => value.stringValue).filter(Boolean);
const documentId = (doc) => doc.name.split('/').pop();

const main = async () => {
  const account = firebaseAuth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI login is required.');
  const authScopes = [
    scopes.EMAIL,
    scopes.OPENID,
    scopes.CLOUD_PROJECTS_READONLY,
    scopes.FIREBASE_PLATFORM,
    scopes.CLOUD_PLATFORM,
  ];
  const token = await firebaseAuth.getAccessToken(account.tokens.refresh_token, authScopes);
  const headers = { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' };
  const request = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
    });
    if (!response.ok) throw new Error(`Firestore ${response.status}: ${(await response.text()).slice(0, 500)}`);
    return response.json();
  };
  const runQuery = async (collectionId, allDescendants = false) => {
    const rows = await request(`${apiRoot}:runQuery`, {
      method: 'POST',
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId, allDescendants }] } }),
    });
    return rows.filter(({ document }) => document).map(({ document }) => document);
  };

  const [users, groups, expenses, settlements, friendRequests, groupInvites] = await Promise.all([
    runQuery('users'),
    runQuery('groups'),
    runQuery('expenses', true),
    runQuery('settlements', true),
    runQuery('friendRequests'),
    runQuery('groupInvites'),
  ]);
  const allDocuments = { users, groups, expenses, settlements, friendRequests, groupInvites };
  const fieldUpdates = new Map();
  const mergeFields = (name, fields) => {
    fieldUpdates.set(name, { ...(fieldUpdates.get(name) || {}), ...fields });
  };

  const userById = new Map(users.map((doc) => [documentId(doc), doc]));
  const friendSets = new Map(users.map((doc) => [documentId(doc), new Set(getStringArray(doc, 'friends'))]));
  for (const user of users) {
    if (!hasField(user, 'displayName') && getString(user, 'name')) {
      mergeFields(user.name, { displayName: stringValue(getString(user, 'name').slice(0, 50)) });
    }
  }

  const inviteByGroup = new Set(groupInvites.map((doc) => getString(doc, 'groupId')).filter(Boolean));
  let inviteMappingsAdded = 0;
  for (const group of groups) {
    const groupId = documentId(group);
    const owner = getString(group, 'createdBy') || getString(group, 'admin');
    if (!hasField(group, 'createdBy') && owner) mergeFields(group.name, { createdBy: stringValue(owner) });
    const code = getString(group, 'inviteCode');
    if (owner && /^[A-Z0-9]{8}$/.test(code) && !inviteByGroup.has(groupId)) {
      const createdAt = group.fields?.createdAt || timestampValue();
      mergeFields(`${databaseRoot}/groupInvites/${code}`, {
        groupId: stringValue(groupId), createdBy: stringValue(owner), active: booleanValue(true), createdAt,
      });
      inviteMappingsAdded += 1;
    }
  }

  let expensesMigrated = 0;
  for (const expense of expenses) {
    const fields = {};
    const amount = getNumber(expense, 'amount');
    if (!hasField(expense, 'amountPaise') && Number.isFinite(amount) && amount > 0) {
      fields.amountPaise = integerValue(Math.round(amount * 100));
    }
    if (!hasField(expense, 'splitUserIds')) {
      fields.splitUserIds = { arrayValue: { values: getStringArray(expense, 'participants').map(stringValue) } };
    }
    if (!hasField(expense, 'version')) fields.version = integerValue(1);
    if (Object.keys(fields).length) {
      mergeFields(expense.name, fields);
      expensesMigrated += 1;
    }
  }

  let settlementsMigrated = 0;
  for (const settlement of settlements) {
    const fields = {};
    const amount = getNumber(settlement, 'amount');
    if (!hasField(settlement, 'amountPaise') && Number.isFinite(amount) && amount > 0) {
      fields.amountPaise = integerValue(Math.round(amount * 100));
    }
    if (!hasField(settlement, 'version')) fields.version = integerValue(1);
    if (Object.keys(fields).length) {
      mergeFields(settlement.name, fields);
      settlementsMigrated += 1;
    }
  }

  const requestById = new Map(friendRequests.map((doc) => [documentId(doc), doc]));
  let pendingRequestsMigrated = 0;
  for (const friendRequest of friendRequests) {
    const from = getString(friendRequest, 'from');
    const to = getString(friendRequest, 'to');
    const status = getString(friendRequest, 'status');
    if (!from || !to) continue;
    if (status === 'accepted') {
      if (userById.has(from) && userById.has(to)) {
        friendSets.get(from).add(to);
        friendSets.get(to).add(from);
      }
      continue;
    }
    if (status !== 'pending') continue;
    const canonicalId = `${from}_${to}`;
    if (documentId(friendRequest) === canonicalId) continue;
    if (!requestById.has(canonicalId)) {
      mergeFields(`${databaseRoot}/friendRequests/${canonicalId}`, {
        from: stringValue(from), to: stringValue(to), status: stringValue('pending'),
        createdAt: friendRequest.fields?.createdAt || timestampValue(),
      });
    }
    mergeFields(friendRequest.name, { status: stringValue('superseded'), migratedAt: timestampValue() });
    pendingRequestsMigrated += 1;
  }

  let friendshipsRepaired = 0;
  for (const [uid, friends] of friendSets) {
    const original = getStringArray(userById.get(uid), 'friends');
    if (friends.size !== original.length || original.some((friend) => !friends.has(friend))) {
      mergeFields(userById.get(uid).name, {
        friends: { arrayValue: { values: [...friends].sort().map(stringValue) } },
      });
      friendshipsRepaired += 1;
    }
  }

  const writes = [...fieldUpdates].map(([name, fields]) => ({
    update: { name, fields },
    updateMask: { fieldPaths: Object.keys(fields) },
  }));
  const summary = {
    mode: apply ? 'apply' : 'dry-run', projectId, documentsToUpdate: writes.length,
    groupsUpdated: groups.filter((doc) => !hasField(doc, 'createdBy')).length,
    inviteMappingsAdded, expensesMigrated, settlementsMigrated,
    pendingRequestsMigrated, friendshipsRepaired,
  };
  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const backupDir = path.resolve('.paymatrix-migration.local');
  await fs.mkdir(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `backup-${now.replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(backupPath, JSON.stringify({ projectId, capturedAt: now, ...allDocuments }, null, 2));
  for (let offset = 0; offset < writes.length; offset += 400) {
    await request(`${apiRoot}:commit`, {
      method: 'POST',
      body: JSON.stringify({ writes: writes.slice(offset, offset + 400) }),
    });
  }
  console.log(JSON.stringify({ ...summary, backupPath }, null, 2));
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
