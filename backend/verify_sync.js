import axios from 'axios';
import mongoose from 'mongoose';
import 'dotenv/config';

const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@paymatrix.local'; // Assume from previous tests or generate new
const TEST_PASSWORD = 'password123';
const API_URL = 'http://localhost:5000/api/v1';

async function verifySync() {
  try {
    console.log('--- PayMatrix Sync Verification ---');

    console.log('1. Attempting login to get token...');
    let token;
    let user;
    try {
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });
        token = loginRes.data.data.token;
        user = loginRes.data.data.user;
        console.log(`✅ Logged in as ${user.name}`);
    } catch (err) {
        if (err.response?.status === 401) {
            console.log('Login failed, creating new user for test...');
            const randCode = Math.floor(Math.random() * 10000);
            const regRes = await axios.post(`${API_URL}/auth/register`, {
                name: `Test User ${randCode}`,
                email: `test${randCode}@paymatrix.local`,
                password: TEST_PASSWORD
            });
            token = regRes.data.data.token;
            user = regRes.data.data.user;
            console.log(`✅ Registered and logged in as ${user.name}`);
        } else {
            throw err;
        }
    }

    const axiosInstance = axios.create({
        baseURL: API_URL,
        headers: { Authorization: `Bearer ${token}` }
    });

    console.log('\n2. Creating a group via Sync...');
    const groupOpId = `op_test_${Date.now()}`;
    const syncRes1 = await axiosInstance.post('/sync', {
        operations: [
            {
                operation_id: groupOpId,
                type: 'create',
                entity: 'group',
                payload: {
                    title: 'Offline Sync Group',
                    category: 'Trip',
                    currency: 'INR',
                    simplifyDebts: true,
                    defaultSplit: 'equal'
                },
                timestamp: new Date().toISOString()
            }
        ]
    });
    
    if (syncRes1.data.data.success.includes(groupOpId)) {
        console.log('✅ Group successfully created via Sync queue.');
    } else {
        console.error('❌ Failed to create group via sync:', syncRes1.data.data.failed);
    }
    
    const groupId = syncRes1.data.data.server_updates.find(u => u.operation_id === groupOpId)?.server_id;

    console.log('\n3. Creating an expense via Sync...');
    const expenseOpId = `op_test_exp_${Date.now()}`;
    const syncRes2 = await axiosInstance.post('/sync', {
        operations: [
            {
                operation_id: expenseOpId,
                type: 'create',
                entity: 'expense',
                payload: {
                    title: 'Offline Lunch',
                    amount: 500,
                    category: 'Food',
                    groupId: groupId
                },
                timestamp: new Date().toISOString()
            }
        ]
    });

    if (syncRes2.data.data.success.includes(expenseOpId)) {
        console.log('✅ Expense successfully created via Sync queue.');
    } else {
        console.error('❌ Failed to create expense via sync:', syncRes2.data.data.failed);
    }

    const expenseId = syncRes2.data.data.server_updates.find(u => u.operation_id === expenseOpId)?.server_id;

    console.log('\n4. Testing Conflict Logging (Updating expense with older timestamp)...');
    
    // First, standard direct update outside sync
    await axiosInstance.put(`/expenses/${expenseId}`, {
        title: 'Offline Lunch UPDATED SERVER'
    });

    // Now send sync with older timestamp
    const conflictOpId = `op_test_conflict_${Date.now()}`;
    const syncRes3 = await axiosInstance.post('/sync', {
        operations: [
            {
                operation_id: conflictOpId,
                type: 'update',
                entity: 'expense',
                payload: {
                    id: expenseId,
                    title: 'Offline Lunch CLIENT OVERWRITE',
                    amount: 550
                },
                timestamp: new Date(Date.now() - 10000).toISOString() // 10s ago
            }
        ]
    });

    if (syncRes3.data.data.success.includes(conflictOpId)) {
        console.log('✅ Conflict update applied successfully (Last-Write-Wins rule). Check database for AuditLog.');
    } else {
        console.error('❌ Failed to apply conflict update:', syncRes3.data.data.failed);
    }

    // Direct check of DB to verify Audit Log
    console.log('\n5. Verifying DB for AuditLog entry...');
    await mongoose.connect(process.env.MONGO_URI);
    const AuditLog = mongoose.connection.collection('auditlogs');
    const logs = await AuditLog.find({ expense: new mongoose.Types.ObjectId(expenseId), action: 'sync_conflict' }).toArray();
    
    if (logs.length > 0) {
       console.log(`✅ Confirmed: Found ${logs.length} sync_conflict log(s) for the expense!`);
    } else {
       console.error('❌ No sync_conflict log found in database!');
    }
    
    await mongoose.disconnect();
    console.log('\n--- Sync Verification Complete ---');

  } catch (err) {
    console.error('Verification failed:', err.response?.data || err.message);
  }
}

verifySync();
