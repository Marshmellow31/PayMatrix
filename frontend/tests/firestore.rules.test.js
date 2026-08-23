import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  arrayUnion,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';

const projectId = 'demo-paymatrix';
let environment;

const group = {
  name: 'Trip',
  members: ['owner', 'member'],
  historicalMembers: ['owner', 'member'],
  admin: 'owner',
  createdBy: 'owner',
  status: 'active',
  inviteCode: 'JOIN1234',
  createdAt: '2026-08-23T00:00:00.000Z',
  updatedAt: '2026-08-23T00:00:00.000Z',
};

const expense = {
  title: 'Dinner',
  amount: 100,
  amountPaise: 10000,
  currency: 'INR',
  paidBy: 'owner',
  paidByName: 'Owner',
  createdBy: 'owner',
  admin: 'owner',
  groupId: 'group-1',
  participants: ['owner', 'member'],
  splitUserIds: ['owner', 'member'],
  splitType: 'equal',
  splitData: {},
  splits: [
    { user: 'owner', amount: 50, amountPaise: 5000 },
    { user: 'member', amount: 50, amountPaise: 5000 },
  ],
  status: 'active',
  version: 1,
  lastEditedBy: 'owner',
  lastMutationId: 'seed-log',
  lastMutationType: 'expense_added',
  lastMutationAt: Timestamp.fromMillis(0),
};

before(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: await readFile(resolve('..', 'firestore.rules'), 'utf8'),
    },
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'users', 'owner'), { displayName: 'Owner', friends: [] }),
      setDoc(doc(db, 'users', 'member'), { displayName: 'Member', friends: [] }),
      setDoc(doc(db, 'users', 'attacker'), { displayName: 'Attacker', friends: [] }),
      setDoc(doc(db, 'publicProfiles', 'owner'), { name: 'Owner', avatar: '', updatedAt: 'now' }),
      setDoc(doc(db, 'groups', 'group-1'), group),
      setDoc(doc(db, 'groups', 'group-1', 'expenses', 'expense-1'), expense),
      setDoc(doc(db, 'groupInvites', 'JOIN1234'), {
        groupId: 'group-1', createdBy: 'owner', active: true, createdAt: 'now',
      }),
    ]);
  });
});

after(async () => environment?.cleanup());

describe('PayMatrix Firestore authorization', () => {
  test('rejects group takeover by a signed-in nonmember', async () => {
    const db = environment.authenticatedContext('attacker').firestore();
    await assertFails(updateDoc(doc(db, 'groups', 'group-1'), { admin: 'attacker' }));
  });

  test('rejects unilateral friendship and permits accepted-request atomic friendship', async () => {
    const attackerDb = environment.authenticatedContext('attacker').firestore();
    await assertFails(updateDoc(doc(attackerDb, 'users', 'owner'), { friends: arrayUnion('attacker') }));

    await environment.withSecurityRulesDisabled((context) =>
      setDoc(doc(context.firestore(), 'friendRequests', 'owner_member'), {
        from: 'owner', to: 'member', status: 'pending', createdAt: 'now',
      })
    );
    const memberDb = environment.authenticatedContext('member').firestore();
    const batch = writeBatch(memberDb);
    batch.update(doc(memberDb, 'friendRequests', 'owner_member'), {
      status: 'accepted', respondedAt: 'now',
    });
    batch.update(doc(memberDb, 'users', 'owner'), { friends: arrayUnion('member') });
    batch.update(doc(memberDb, 'users', 'member'), { friends: arrayUnion('owner') });
    await assertSucceeds(batch.commit());
  });

  test('lets a group member read a minimal public profile but not a private profile', async () => {
    const db = environment.authenticatedContext('member').firestore();
    await assertSucceeds(getDoc(doc(db, 'publicProfiles', 'owner')));
    await assertFails(getDoc(doc(db, 'users', 'owner')));
  });

  test('requires an atomic audit record for collaborative expense edits', async () => {
    const db = environment.authenticatedContext('member').firestore();
    await assertFails(updateDoc(doc(db, 'groups', 'group-1', 'expenses', 'expense-1'), {
      amount: 90,
      amountPaise: 9000,
    }));

    const batch = writeBatch(db);
    batch.update(doc(db, 'groups', 'group-1', 'expenses', 'expense-1'), {
      amount: 90,
      amountPaise: 9000,
      splits: [
        { user: 'owner', amount: 45, amountPaise: 4500 },
        { user: 'member', amount: 45, amountPaise: 4500 },
      ],
      lastEditedBy: 'member',
      lastMutationId: 'edit-log',
      lastMutationType: 'expense_updated',
      lastMutationAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      version: 2,
    });
    batch.set(doc(db, 'groups', 'group-1', 'logs', 'edit-log'), {
      type: 'expense_updated',
      message: 'Member edited Dinner (amount)',
      actorId: 'member',
      actorName: 'Member',
      relatedId: 'expense-1',
      groupId: 'group-1',
      createdAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
  });

  test('rejects a stale collaborative edit even when its audit record is present', async () => {
    const db = environment.authenticatedContext('member').firestore();
    const batch = writeBatch(db);
    batch.update(doc(db, 'groups', 'group-1', 'expenses', 'expense-1'), {
      title: 'Stale dinner', lastEditedBy: 'member', lastMutationId: 'stale-log',
      lastMutationType: 'expense_updated', lastMutationAt: serverTimestamp(),
      updatedAt: serverTimestamp(), version: 1,
    });
    batch.set(doc(db, 'groups', 'group-1', 'logs', 'stale-log'), {
      type: 'expense_updated', message: 'Member edited Dinner', actorId: 'member',
      actorName: 'Member', relatedId: 'expense-1', groupId: 'group-1',
      createdAt: serverTimestamp(),
    });
    await assertFails(batch.commit());
  });

  test('allows a legacy expense to be soft-deleted with an atomic audit record', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'groups', 'group-1', 'expenses', 'legacy-expense'), {
        title: 'Legacy dinner', amount: 75, paidBy: 'owner', admin: 'owner',
        groupId: 'group-1', participants: ['owner', 'member'], status: 'active',
      });
    });

    const db = environment.authenticatedContext('member').firestore();
    const batch = writeBatch(db);
    batch.update(doc(db, 'groups', 'group-1', 'expenses', 'legacy-expense'), {
      status: 'deleted', updatedAt: serverTimestamp(), version: 2,
      lastEditedBy: 'member', lastMutationId: 'legacy-delete-log',
      lastMutationType: 'expense_deleted', lastMutationAt: serverTimestamp(),
    });
    batch.set(doc(db, 'groups', 'group-1', 'logs', 'legacy-delete-log'), {
      type: 'expense_deleted', message: 'Member deleted Legacy dinner', actorId: 'member',
      actorName: 'Member', relatedId: 'legacy-expense', groupId: 'group-1',
      createdAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
  });

  test('binds confirmed settlement payer to the authenticated user', async () => {
    const db = environment.authenticatedContext('member').firestore();
    const forged = {
      payer: 'owner', payee: 'member', amount: 10, amountPaise: 1000,
      groupId: 'group-1', operationId: 'forged', confirmationStatus: 'confirmed',
      confirmedBy: 'member', confirmedAt: serverTimestamp(), status: 'active',
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), version: 1,
      lastEditedBy: 'member', lastMutationId: 'forged-log',
      lastMutationType: 'settlement_added', lastMutationAt: serverTimestamp(),
    };
    await assertFails(setDoc(doc(db, 'groups', 'group-1', 'settlements', 'forged'), forged));
  });

  test('accepts a payer-confirmed settlement only with its atomic audit record', async () => {
    const db = environment.authenticatedContext('member').firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, 'groups', 'group-1', 'settlements', 'payment-1'), {
      payer: 'member', payee: 'owner', amount: 10, amountPaise: 1000,
      groupId: 'group-1', operationId: 'payment-1', confirmationStatus: 'confirmed',
      confirmedBy: 'member', confirmedAt: serverTimestamp(), status: 'active',
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), version: 1,
      lastEditedBy: 'member', lastMutationId: 'payment-log',
      lastMutationType: 'settlement_added', lastMutationAt: serverTimestamp(),
    });
    batch.set(doc(db, 'groups', 'group-1', 'logs', 'payment-log'), {
      type: 'settlement_added', message: 'Member recorded a payment', actorId: 'member',
      actorName: 'Member', relatedId: 'payment-1', groupId: 'group-1',
      createdAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
  });

  test('allows an invited user to join only themselves', async () => {
    const db = environment.authenticatedContext('attacker').firestore();
    await assertSucceeds(updateDoc(doc(db, 'groups', 'group-1'), {
      members: arrayUnion('attacker'), historicalMembers: arrayUnion('attacker'),
      updatedAt: 'now',
    }));
    await assertFails(updateDoc(doc(db, 'groups', 'group-1'), {
      members: arrayUnion('somebody-else'), historicalMembers: arrayUnion('somebody-else'),
      updatedAt: 'now',
    }));
  });

  test('lets the original sender re-send a deterministic rejected request', async () => {
    await environment.withSecurityRulesDisabled((context) =>
      setDoc(doc(context.firestore(), 'friendRequests', 'owner_member'), {
        from: 'owner', to: 'member', status: 'rejected', createdAt: 'old', respondedAt: 'old',
      })
    );
    const ownerDb = environment.authenticatedContext('owner').firestore();
    await assertSucceeds(setDoc(doc(ownerDb, 'friendRequests', 'owner_member'), {
      from: 'owner', to: 'member', status: 'pending', createdAt: 'new',
    }));
  });

  test('enforces the AI request counter and hourly cap', async () => {
    const db = environment.authenticatedContext('member').firestore();
    await assertSucceeds(setDoc(doc(db, 'rate_limits', 'member'), {
      uid: 'member', count: 1, windowStart: serverTimestamp(), lastRequestAt: serverTimestamp(),
    }));
    await assertSucceeds(updateDoc(doc(db, 'rate_limits', 'member'), {
      count: 2, lastRequestAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(doc(db, 'rate_limits', 'member'), {
      count: 10, lastRequestAt: serverTimestamp(),
    }));
  });

  test('permits atomic anonymization only with a 30-day deletion receipt', async () => {
    const db = environment.authenticatedContext('owner').firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', 'owner'), {
      uid: 'owner', name: 'Deleted user', displayName: 'Deleted user',
      nameLowerCase: 'deleted user', avatar: '', photoURL: '', friends: [],
      deletedAt: serverTimestamp(), deletionStatus: 'anonymized',
    });
    batch.set(doc(db, 'publicProfiles', 'owner'), {
      name: 'Deleted user', avatar: '', updatedAt: serverTimestamp(), deleted: true,
    });
    batch.set(doc(db, 'accountDeletionRequests', 'owner'), {
      uidHashVersion: 1, status: 'anonymized', requestedAt: serverTimestamp(),
      deleteAfter: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await assertSucceeds(batch.commit());
  });
});
