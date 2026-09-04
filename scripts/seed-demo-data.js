const fs = require('fs');
const os = require('os');
const path = require('path');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'paymatrix-174b5';
const DATABASE_ROOT = `projects/${PROJECT_ID}/databases/(default)/documents`;
const API_ROOT = `https://firestore.googleapis.com/v1/${DATABASE_ROOT}`;

function getCliAccessToken() {
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`Firebase tools config not found at: ${configPath}. Run 'firebase login' first.`);
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const token = config?.tokens?.access_token;
  if (!token) {
    throw new Error('No access_token found in firebase-tools config.');
  }
  return token;
}

// Verified test users created earlier
const REVIEWER_UID = 'xsxEdPKDPCMCUkwxwxg90tSPC6o2'; // google.reviewer@paymatrix.app
const TESTER1_UID = 'Aqg5x8EMXwSU3uDRGjGrKB9iYs13';  // tester1@paymatrix.app

const REVIEWER_EMAIL = 'google.reviewer@paymatrix.app';
const TESTER1_EMAIL = 'tester1@paymatrix.app';

const REVIEWER_NAME = 'Google Reviewer';
const TESTER1_NAME = 'Test User One';

const GROUP_ID = 'goa_weekend_demo';
const LOG_GROUP_ID = 'goa_spending_demo';

async function commitWrites(writes, token) {
  const response = await fetch(`${API_ROOT}:commit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ writes }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firestore commit failed (${response.status}): ${errorText}`);
  }
  return response.json();
}

async function seedDemoData() {
  const token = getCliAccessToken();
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();

  console.log('Seeding demo data for:');
  console.log(`- ${REVIEWER_NAME} (${REVIEWER_EMAIL}, UID: ${REVIEWER_UID})`);
  console.log(`- ${TESTER1_NAME} (${TESTER1_EMAIL}, UID: ${TESTER1_UID})`);

  const writes = [];

  // 1. User profiles in users/{uid}
  writes.push({
    update: {
      name: `${DATABASE_ROOT}/users/${REVIEWER_UID}`,
      fields: {
        uid: { stringValue: REVIEWER_UID },
        _id: { stringValue: REVIEWER_UID },
        email: { stringValue: REVIEWER_EMAIL },
        name: { stringValue: REVIEWER_NAME },
        displayName: { stringValue: REVIEWER_NAME },
        nameLowerCase: { stringValue: REVIEWER_NAME.toLowerCase() },
        avatar: { stringValue: '' },
        photoURL: { stringValue: '' },
        upiId: { stringValue: 'reviewer@okhdfcbank' },
        phone: { stringValue: '+91 9876543210' },
        friendCode: { stringValue: 'REVW2026' },
        friends: {
          arrayValue: {
            values: [{ stringValue: TESTER1_UID }],
          },
        },
        createdAt: { stringValue: twoDaysAgo },
        updatedAt: { stringValue: now },
      },
    },
  });

  writes.push({
    update: {
      name: `${DATABASE_ROOT}/users/${TESTER1_UID}`,
      fields: {
        uid: { stringValue: TESTER1_UID },
        _id: { stringValue: TESTER1_UID },
        email: { stringValue: TESTER1_EMAIL },
        name: { stringValue: TESTER1_NAME },
        displayName: { stringValue: TESTER1_NAME },
        nameLowerCase: { stringValue: TESTER1_NAME.toLowerCase() },
        avatar: { stringValue: '' },
        photoURL: { stringValue: '' },
        upiId: { stringValue: 'tester1@oksbi' },
        phone: { stringValue: '+91 9123456780' },
        friendCode: { stringValue: 'TEST2026' },
        friends: {
          arrayValue: {
            values: [{ stringValue: REVIEWER_UID }],
          },
        },
        createdAt: { stringValue: twoDaysAgo },
        updatedAt: { stringValue: now },
      },
    },
  });

  // 2. Public profiles in publicProfiles/{uid}
  writes.push({
    update: {
      name: `${DATABASE_ROOT}/publicProfiles/${REVIEWER_UID}`,
      fields: {
        uid: { stringValue: REVIEWER_UID },
        name: { stringValue: REVIEWER_NAME },
        displayName: { stringValue: REVIEWER_NAME },
        avatar: { stringValue: '' },
        photoURL: { stringValue: '' },
        friendCode: { stringValue: 'REVW2026' },
        updatedAt: { timestampValue: now },
      },
    },
  });

  writes.push({
    update: {
      name: `${DATABASE_ROOT}/publicProfiles/${TESTER1_UID}`,
      fields: {
        uid: { stringValue: TESTER1_UID },
        name: { stringValue: TESTER1_NAME },
        displayName: { stringValue: TESTER1_NAME },
        avatar: { stringValue: '' },
        photoURL: { stringValue: '' },
        friendCode: { stringValue: 'TEST2026' },
        updatedAt: { timestampValue: now },
      },
    },
  });

  // 3. Friend codes
  writes.push({
    update: {
      name: `${DATABASE_ROOT}/friendCodes/REVW2026`,
      fields: {
        uid: { stringValue: REVIEWER_UID },
        name: { stringValue: REVIEWER_NAME },
        avatar: { stringValue: '' },
        createdAt: { stringValue: twoDaysAgo },
      },
    },
  });

  writes.push({
    update: {
      name: `${DATABASE_ROOT}/friendCodes/TEST2026`,
      fields: {
        uid: { stringValue: TESTER1_UID },
        name: { stringValue: TESTER1_NAME },
        avatar: { stringValue: '' },
        createdAt: { stringValue: twoDaysAgo },
      },
    },
  });

  // 4. Group: "Goa weekend"
  writes.push({
    update: {
      name: `${DATABASE_ROOT}/groups/${GROUP_ID}`,
      fields: {
        name: { stringValue: 'Goa weekend' },
        title: { stringValue: 'Goa weekend' },
        description: { stringValue: 'Beach villa, seafood shacks & water sports split' },
        category: { stringValue: 'Trip' },
        status: { stringValue: 'active' },
        admin: { stringValue: REVIEWER_UID },
        createdBy: { stringValue: REVIEWER_UID },
        inviteCode: { stringValue: 'GOAWKND1' },
        members: {
          arrayValue: {
            values: [
              { stringValue: REVIEWER_UID },
              { stringValue: TESTER1_UID },
            ],
          },
        },
        historicalMembers: {
          arrayValue: {
            values: [
              { stringValue: REVIEWER_UID },
              { stringValue: TESTER1_UID },
            ],
          },
        },
        createdAt: { stringValue: twoDaysAgo },
        updatedAt: { stringValue: now },
      },
    },
  });

  // Group Invite record
  writes.push({
    update: {
      name: `${DATABASE_ROOT}/groupInvites/GOAWKND1`,
      fields: {
        groupId: { stringValue: GROUP_ID },
        createdBy: { stringValue: REVIEWER_UID },
        active: { booleanValue: true },
        createdAt: { timestampValue: twoDaysAgo },
      },
    },
  });

  // 5. Expenses in groups/{GROUP_ID}/expenses/...
  // Expense 1: Beachside Seafood Dinner (Paid by Google Reviewer, Split Equal)
  const exp1Id = 'exp_beach_dinner_01';
  writes.push({
    update: {
      name: `${DATABASE_ROOT}/groups/${GROUP_ID}/expenses/${exp1Id}`,
      fields: {
        title: { stringValue: 'Fishermans Wharf Seafood Dinner' },
        amount: { integerValue: '2800' },
        amountPaise: { integerValue: '280000' },
        currency: { stringValue: 'INR' },
        category: { stringValue: 'Food' },
        date: { stringValue: '2026-09-02' },
        groupId: { stringValue: GROUP_ID },
        paidBy: { stringValue: REVIEWER_UID },
        paidByName: { stringValue: REVIEWER_NAME },
        createdBy: { stringValue: REVIEWER_UID },
        admin: { stringValue: REVIEWER_UID },
        lastEditedBy: { stringValue: REVIEWER_UID },
        splitType: { stringValue: 'equal' },
        status: { stringValue: 'active' },
        version: { integerValue: '1' },
        notes: { stringValue: 'Kingfish rawa fry, prawns & beverages at Calangute' },
        participants: {
          arrayValue: {
            values: [{ stringValue: REVIEWER_UID }, { stringValue: TESTER1_UID }],
          },
        },
        splitUserIds: {
          arrayValue: {
            values: [{ stringValue: REVIEWER_UID }, { stringValue: TESTER1_UID }],
          },
        },
        splits: {
          arrayValue: {
            values: [
              {
                mapValue: {
                  fields: {
                    user: { stringValue: REVIEWER_UID },
                    amount: { integerValue: '1400' },
                  },
                },
              },
              {
                mapValue: {
                  fields: {
                    user: { stringValue: TESTER1_UID },
                    amount: { integerValue: '1400' },
                  },
                },
              },
            ],
          },
        },
        lastMutationId: { stringValue: 'log_exp_01' },
        lastMutationType: { stringValue: 'expense_added' },
        lastMutationAt: { stringValue: twoDaysAgo },
        createdAt: { stringValue: twoDaysAgo },
        updatedAt: { stringValue: twoDaysAgo },
      },
    },
  });

  // Log for Expense 1
  writes.push({
    update: {
      name: `${DATABASE_ROOT}/groups/${GROUP_ID}/logs/log_exp_01`,
      fields: {
        type: { stringValue: 'expense_added' },
        message: { stringValue: `${REVIEWER_NAME} added "Fishermans Wharf Seafood Dinner" (₹2,800.00)` },
        actorId: { stringValue: REVIEWER_UID },
        actorName: { stringValue: REVIEWER_NAME },
        relatedId: { stringValue: exp1Id },
        createdAt: { stringValue: twoDaysAgo },
      },
    },
  });

  // Expense 2: Scooters / Bike Rental (Paid by Tester One, Split Equal)
  const exp2Id = 'exp_bike_rental_02';
  writes.push({
    update: {
      name: `${DATABASE_ROOT}/groups/${GROUP_ID}/expenses/${exp2Id}`,
      fields: {
        title: { stringValue: 'Activa Scooters Rental (2 Days)' },
        amount: { integerValue: '1600' },
        amountPaise: { integerValue: '160000' },
        currency: { stringValue: 'INR' },
        category: { stringValue: 'Transportation' },
        date: { stringValue: '2026-09-03' },
        groupId: { stringValue: GROUP_ID },
        paidBy: { stringValue: TESTER1_UID },
        paidByName: { stringValue: TESTER1_NAME },
        createdBy: { stringValue: TESTER1_UID },
        admin: { stringValue: REVIEWER_UID },
        lastEditedBy: { stringValue: TESTER1_UID },
        splitType: { stringValue: 'equal' },
        status: { stringValue: 'active' },
        version: { integerValue: '1' },
        notes: { stringValue: 'Rental for North Goa beach hopping' },
        participants: {
          arrayValue: {
            values: [{ stringValue: REVIEWER_UID }, { stringValue: TESTER1_UID }],
          },
        },
        splitUserIds: {
          arrayValue: {
            values: [{ stringValue: REVIEWER_UID }, { stringValue: TESTER1_UID }],
          },
        },
        splits: {
          arrayValue: {
            values: [
              {
                mapValue: {
                  fields: {
                    user: { stringValue: REVIEWER_UID },
                    amount: { integerValue: '800' },
                  },
                },
              },
              {
                mapValue: {
                  fields: {
                    user: { stringValue: TESTER1_UID },
                    amount: { integerValue: '800' },
                  },
                },
              },
            ],
          },
        },
        lastMutationId: { stringValue: 'log_exp_02' },
        lastMutationType: { stringValue: 'expense_added' },
        lastMutationAt: { stringValue: yesterday },
        createdAt: { stringValue: yesterday },
        updatedAt: { stringValue: yesterday },
      },
    },
  });

  // Log for Expense 2
  writes.push({
    update: {
      name: `${DATABASE_ROOT}/groups/${GROUP_ID}/logs/log_exp_02`,
      fields: {
        type: { stringValue: 'expense_added' },
        message: { stringValue: `${TESTER1_NAME} added "Activa Scooters Rental (2 Days)" (₹1,600.00)` },
        actorId: { stringValue: TESTER1_UID },
        actorName: { stringValue: TESTER1_NAME },
        relatedId: { stringValue: exp2Id },
        createdAt: { stringValue: yesterday },
      },
    },
  });

  // Expense 3: Scuba & Water Sports (Paid by Google Reviewer, Split Equal)
  const exp3Id = 'exp_water_sports_03';
  writes.push({
    update: {
      name: `${DATABASE_ROOT}/groups/${GROUP_ID}/expenses/${exp3Id}`,
      fields: {
        title: { stringValue: 'Baga Water Sports & Parasailing' },
        amount: { integerValue: '3500' },
        amountPaise: { integerValue: '350000' },
        currency: { stringValue: 'INR' },
        category: { stringValue: 'Entertainment' },
        date: { stringValue: '2026-09-03' },
        groupId: { stringValue: GROUP_ID },
        paidBy: { stringValue: REVIEWER_UID },
        paidByName: { stringValue: REVIEWER_NAME },
        createdBy: { stringValue: REVIEWER_UID },
        admin: { stringValue: REVIEWER_UID },
        lastEditedBy: { stringValue: REVIEWER_UID },
        splitType: { stringValue: 'equal' },
        status: { stringValue: 'active' },
        version: { integerValue: '1' },
        notes: { stringValue: 'Parasailing + jet ski combo tickets' },
        participants: {
          arrayValue: {
            values: [{ stringValue: REVIEWER_UID }, { stringValue: TESTER1_UID }],
          },
        },
        splitUserIds: {
          arrayValue: {
            values: [{ stringValue: REVIEWER_UID }, { stringValue: TESTER1_UID }],
          },
        },
        splits: {
          arrayValue: {
            values: [
              {
                mapValue: {
                  fields: {
                    user: { stringValue: REVIEWER_UID },
                    amount: { integerValue: '1750' },
                  },
                },
              },
              {
                mapValue: {
                  fields: {
                    user: { stringValue: TESTER1_UID },
                    amount: { integerValue: '1750' },
                  },
                },
              },
            ],
          },
        },
        lastMutationId: { stringValue: 'log_exp_03' },
        lastMutationType: { stringValue: 'expense_added' },
        lastMutationAt: { stringValue: yesterday },
        createdAt: { stringValue: yesterday },
        updatedAt: { stringValue: yesterday },
      },
    },
  });

  // Log for Expense 3
  writes.push({
    update: {
      name: `${DATABASE_ROOT}/groups/${GROUP_ID}/logs/log_exp_03`,
      fields: {
        type: { stringValue: 'expense_added' },
        message: { stringValue: `${REVIEWER_NAME} added "Baga Water Sports & Parasailing" (₹3,500.00)` },
        actorId: { stringValue: REVIEWER_UID },
        actorName: { stringValue: REVIEWER_NAME },
        relatedId: { stringValue: exp3Id },
        createdAt: { stringValue: yesterday },
      },
    },
  });

  // 6. Spending Log Group ("Goa weekend spending") for Spending Logs screen testing
  writes.push({
    update: {
      name: `${DATABASE_ROOT}/logGroups/${LOG_GROUP_ID}`,
      fields: {
        name: { stringValue: 'Goa weekend' },
        ownerId: { stringValue: REVIEWER_UID },
        status: { stringValue: 'active' },
        members: {
          arrayValue: {
            values: [{ stringValue: REVIEWER_UID }, { stringValue: TESTER1_UID }],
          },
        },
        createdAt: { timestampValue: twoDaysAgo },
        updatedAt: { timestampValue: now },
      },
    },
  });

  // Spending log entry
  const entryId = 'entry_coffee_01';
  writes.push({
    update: {
      name: `${DATABASE_ROOT}/logGroups/${LOG_GROUP_ID}/entries/${entryId}`,
      fields: {
        title: { stringValue: 'Cafe Alchemia Breakfast' },
        amount: { integerValue: '650' },
        category: { stringValue: 'Food' },
        place: { stringValue: 'Anjuna Beach' },
        note: { stringValue: 'Avocado toast, iced coffee & croissants' },
        date: { stringValue: '2026-09-04' },
        type: { stringValue: 'manual' },
        status: { stringValue: 'active' },
        addedBy: { stringValue: REVIEWER_UID },
        lastEditedBy: { stringValue: REVIEWER_UID },
        lastMutationId: { stringValue: 'act_01' },
        lastMutationType: { stringValue: 'entry_added' },
        lastMutationAt: { timestampValue: now },
        createdAt: { timestampValue: now },
        updatedAt: { timestampValue: now },
      },
    },
  });

  // Spending log immutable activity
  writes.push({
    update: {
      name: `${DATABASE_ROOT}/logGroups/${LOG_GROUP_ID}/activity/act_01`,
      fields: {
        type: { stringValue: 'entry_added' },
        message: { stringValue: `${REVIEWER_NAME} added "Cafe Alchemia Breakfast" (₹650)` },
        actorId: { stringValue: REVIEWER_UID },
        actorName: { stringValue: REVIEWER_NAME },
        relatedId: { stringValue: entryId },
        groupId: { stringValue: LOG_GROUP_ID },
        createdAt: { timestampValue: now },
      },
    },
  });

  console.log(`Committing ${writes.length} documents in Firestore...`);
  await commitWrites(writes, token);
  console.log('✅ Demo data committed successfully!');
}

seedDemoData().catch((err) => {
  console.error('❌ Failed to seed demo data:', err);
  process.exit(1);
});
