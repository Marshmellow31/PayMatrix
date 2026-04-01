import { db, auth } from '../config/firebase.js';
import { 
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, getDocFromCache
} from 'firebase/firestore';
import { calculateSplits } from '../utils/balanceEngine.js';

// Helper to mimic Axios response structure expected by Redux Thunks
const wrap = (data, message = 'Success') => ({ data: { data, message, status: 'success' } });

// Recursively remove undefined values for Firestore
const clean = (obj) => {
  const newObj = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] === undefined) return;
    if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
      newObj[key] = clean(obj[key]);
    } else {
      newObj[key] = obj[key];
    }
  });
  return newObj;
};

// Helper for non-blocking name resolution in activity logs (prioritizes speed)
const getStoredName = async (uid, fallback = 'Member') => {
  if (!uid) return fallback;
  try {
    const snap = await getDocFromCache(doc(db, 'users', uid));
    if (snap.exists() && snap.data().name) return snap.data().name;
    if (snap.exists() && snap.data().email) return snap.data().email;
  } catch (_) {
    // Cache miss or offline error
  }
  return fallback;
};

const expenseService = {
  getExpenses: async (groupId, page = 1) => {
    // For simplicity, returning all expenses without pagination in this migration snippet
    const q = query(collection(db, 'groups', groupId, 'expenses'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const expenses = querySnapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    
    // Mimic the backend pagination signature
    return wrap({ expenses, totalPages: 1, currentPage: 1 });
  },

  getExpense: async (id) => {
     // Since expense is a subcollection in our new model, we shouldn't fetch by global ID alone.
     // However if we must, we'd need collection group queries. Let's assume this isn't used heavily.
     throw new Error("getExpense requires groupId in Firestore model");
  },

  addExpense: async (groupId, data, userId) => {
    if (!userId) throw new Error("Authentication required to record transactions.");

    // Calculate splits array from form structure before saving
    const splits = calculateSplits(data.amount, data.splitType || 'equal', data.splitData || {}, data.participants || []);

    const payload = clean({
      ...data,
      paidBy: data.paidBy || userId,
      paidByName: 'Member', // Fallback for instant resolution
      splits,
      admin: userId, 
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // Primary write: Await this only
    const docRef = await addDoc(collection(db, 'groups', groupId, 'expenses'), payload);

    // Secondary tasks: Log and metadata lookups happen in background (non-blocking)
    (async () => {
      try {
        const [resolvedPaidByName, actorName] = await Promise.all([
          getStoredName(data.paidBy || userId, 'Member'),
          getStoredName(userId, 'Someone')
        ]);

        // Update the expense with resolved name if it changed (silent)
        if (resolvedPaidByName !== 'Member') {
          updateDoc(docRef, { paidByName: resolvedPaidByName }).catch(() => {});
        }

        // Write activity log
        addDoc(collection(db, 'groups', groupId, 'logs'), {
          type: 'expense_added',
          message: `${actorName} added "${data.title || 'an expense'}" (₹${parseFloat(data.amount || 0).toFixed(2)})`,
          actorId: userId,
          actorName,
          relatedId: docRef.id,
          createdAt: new Date().toISOString(),
        }).catch(() => {});
      } catch (_) {}
    })().catch(() => {});

    return wrap({ expense: { _id: docRef.id, ...payload } }, 'Expense saved instantly offline/online');
  },

  updateExpense: async (id, data) => {
    const groupId = data.groupId;
    const userId = data.admin; // actor doing the update
    const docRef = doc(db, 'groups', groupId, 'expenses', id);

    // Re-calculate splits if amount or split configuration changed
    const splits = calculateSplits(data.amount, data.splitType, data.splitData || {}, data.participants || []);

    const payload = clean({
      ...data,
      paidByName: data.paidByName || 'Member',
      splits,
      updatedAt: new Date().toISOString()
    });
    
    // Primary write: Await this only
    await updateDoc(docRef, payload);

    // Secondary tasks (non-blocking)
    (async () => {
      try {
        const actorName = await getStoredName(userId, 'Someone');
        if (groupId) {
          addDoc(collection(db, 'groups', groupId, 'logs'), {
            type: 'expense_updated',
            message: `${actorName} edited "${data.title || 'an expense'}"`,
            actorId: userId || 'unknown',
            actorName,
            relatedId: id,
            createdAt: new Date().toISOString(),
          }).catch(() => {});
        }
      } catch (_) {}
    })().catch(() => {});

    return wrap({ expense: { _id: id, ...payload } });
  },

  deleteExpense: async (id, groupId, userId) => {
    if (!groupId) throw new Error("deleteExpense requires groupId");

    const docRef = doc(db, 'groups', groupId, 'expenses', id);

    // Secondary task: Resolution happens in background
    (async () => {
      try {
        let expenseTitle = 'an expense';
        const [expSnap, actorName] = await Promise.all([
          getDocFromCache(docRef).catch(() => null),
          getStoredName(userId, 'Someone')
        ]);
        
        if (expSnap?.exists()) expenseTitle = expSnap.data().title || 'an expense';

        addDoc(collection(db, 'groups', groupId, 'logs'), {
          type: 'expense_deleted',
          message: `${actorName} deleted "${expenseTitle}"`,
          actorId: userId || 'unknown',
          actorName,
          relatedId: id,
          createdAt: new Date().toISOString(),
        }).catch(() => {});
      } catch (_) {}
    })().catch(() => {});

    // Primary write: Await this only
    await deleteDoc(docRef);

    return wrap({ message: 'Expense deleted' });
  },

  restoreExpense: async (id, groupId) => {
    console.warn("Restore not supported natively without a soft-delete field");
    return wrap({ message: 'Restore executed' });
  },

  // Notice: For balances, we actually compute this on the client now when the store updates.
  // But to satisfy old Thunks, we can mock it by pulling all expenses + settlements 
  // and running balanceEngine directly here.
  getBalances: async (groupId) => {
     const { computeGroupBalances } = await import('../utils/balanceEngine.js');
     
     // Fetch expenses and settlements
     const expSnap = await getDocs(query(collection(db, 'groups', groupId, 'expenses')));
     const stlSnap = await getDocs(query(collection(db, 'groups', groupId, 'settlements')));
     const grpSnap = await getDoc(doc(db, 'groups', groupId));
     
     const expenses = expSnap.docs.map(d => d.data());
     const settlements = stlSnap.docs.map(d => d.data());
     const groupMembers = (grpSnap.exists() && grpSnap.data().members) || [];
     
     const balances = computeGroupBalances(expenses, settlements, groupMembers.map(uid => ({ uid })));
     return wrap({ balances });
  },
  
  getSettlements: async (groupId) => {
    const q = query(collection(db, 'groups', groupId, 'settlements'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const settlements = querySnapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    return wrap({ settlements });
  },

  createSettlement: async (groupId, data, userId) => {
    if (!userId) throw new Error("Authentication required to settle up.");

    const payload = { 
        ...data, 
        payer: userId, // Ensure payer field is present for engine
        createdBy: userId, 
        createdAt: new Date().toISOString() 
    };

    // Primary write: Await this only
    const docRef = await addDoc(collection(db, 'groups', groupId, 'settlements'), payload);

    // Secondary tasks (non-blocking)
    (async () => {
      try {
        const actorName = await getStoredName(userId, 'Someone');
        addDoc(collection(db, 'groups', groupId, 'logs'), {
          type: 'settlement_added',
          message: `${actorName} recorded a settlement (₹${parseFloat(data.amount || 0).toFixed(2)})`,
          actorId: userId,
          actorName,
          relatedId: docRef.id,
          createdAt: new Date().toISOString(),
        }).catch(() => {});
      } catch (_) {}
    })().catch(() => {});

    return wrap({ settlement: { _id: docRef.id, ...payload } }, 'Settlement recorded');
  },

  getSummary: async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return wrap({ totalOwed: 0, totalOwe: 0, netBalance: 0, categories: [] });

    try {
      // Find all groups where user is a member
      const q = query(collection(db, 'groups'), where('members', 'array-contains', userId));
      const groupSnap = await getDocs(q);
      const groupIds = groupSnap.docs.map(d => d.id);

      let totalOwed = 0;
      let totalOwe = 0;
      const categoryTotals = {};

      const { computeGroupBalances } = await import('../utils/balanceEngine.js');

      for (const groupId of groupIds) {
        const [expSnap, stlSnap] = await Promise.all([
          getDocs(collection(db, 'groups', groupId, 'expenses')),
          getDocs(collection(db, 'groups', groupId, 'settlements'))
        ]);

        const expenses = expSnap.docs.map(d => d.data());
        const settlements = stlSnap.docs.map(d => d.data());
        
        // Calculate category totals for all expenses I participated in (paid or split)
        expenses.forEach(exp => {
          const isParticipant = exp.participants?.includes(userId) || exp.paidBy === userId;
          if (isParticipant && exp.category) {
            categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + parseFloat(exp.amount || 0);
          }
        });

        const balances = computeGroupBalances(expenses, settlements, (groupSnap.docs.find(d => d.id === groupId).data().members || []).map(uid => ({ uid })));
        const myBalance = balances[userId] || 0;

        if (myBalance > 0) totalOwed += myBalance;
        else if (myBalance < 0) totalOwe += Math.abs(myBalance);
      }

      const categories = Object.keys(categoryTotals).map(name => ({
        name,
        value: categoryTotals[name]
      })).sort((a, b) => b.value - a.value);

      return wrap({
        totalOwed,
        totalOwe,
        netBalance: totalOwed - totalOwe,
        categories
      });
    } catch (error) {
      console.error("Summary calc error:", error);
      return wrap({ totalOwed: 0, totalOwe: 0, netBalance: 0, categories: [] });
    }
  },

  getUserSettlementPlan: async (groupId, userId) => {
    const balancesReq = await expenseService.getBalances(groupId);
    const balancesMap = balancesReq.data.data.balances;
    const { simplifyDebts } = await import('../utils/balanceEngine.js');
    const plan = simplifyDebts(balancesMap); 
    
    const userDebts = plan.filter(tx => tx.from === userId);
    const total_owe = userDebts.reduce((sum, tx) => sum + tx.amount, 0);
    
    return wrap({ 
        total_owe,
        settlements: userDebts,
        simplifiedDebts: plan
    });
  },

  getActivity: async (groupId) => {
    const q = query(
      collection(db, 'groups', groupId, 'logs'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    const activity = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
    return wrap({ activity });
  },

  getSpendingTrends: async (days = 30) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return wrap({ trends: [] });

    try {
      const q = query(collection(db, 'groups'), where('members', 'array-contains', userId));
      const groupSnap = await getDocs(q);
      const groupIds = groupSnap.docs.map(d => d.id);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString();

      const allExpenseData = [];

      for (const groupId of groupIds) {
        const expQ = query(
          collection(db, 'groups', groupId, 'expenses'), 
          where('createdAt', '>=', startDateStr),
          orderBy('createdAt', 'asc')
        );
        const expSnap = await getDocs(expQ);
        expSnap.forEach(d => allExpenseData.push(d.data()));
      }

      // Group by date
      const trendsMap = {};
      allExpenseData.forEach(exp => {
        const date = exp.createdAt.split('T')[0];
        trendsMap[date] = (trendsMap[date] || 0) + parseFloat(exp.amount || 0);
      });

      const trends = Object.keys(trendsMap).map(date => ({
        date,
        amount: trendsMap[date]
      })).sort((a, b) => a.date.localeCompare(b.date));

      return wrap({ trends });
    } catch (error) {
      console.error("Trends calc error:", error);
      return wrap({ trends: [] });
    }
  },
};

export default expenseService;
