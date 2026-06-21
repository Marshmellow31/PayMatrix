import { db, functions, auth } from '../config/firebase.js';
import { httpsCallable } from 'firebase/functions';
import {
  collection, query, orderBy, limit, startAfter,
  getDocs, doc, getDoc, where, updateDoc, setDoc,
  getCountFromServer, writeBatch, addDoc, deleteField,
} from 'firebase/firestore';

const adminService = {

  // ─── Stats (Calculated client-side via Firestore) ───────────────────────────
  getStats: async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      usersCount,
      groupsCount,
      notifCount,
      securityCount,
      aiCount,
      newUsers7,
      newUsers30,
      activeGroups,
      recentSecurity,
      recentNotifs,
    ] = await Promise.all([
      getCountFromServer(collection(db, 'users')),
      getCountFromServer(collection(db, 'groups')),
      getCountFromServer(collection(db, 'notifications')),
      getCountFromServer(collection(db, 'security_logs')),
      getCountFromServer(collection(db, 'ai_requests')),
      getCountFromServer(query(collection(db, 'users'), where('createdAt', '>=', sevenDaysAgo.toISOString()))),
      getCountFromServer(query(collection(db, 'users'), where('createdAt', '>=', thirtyDaysAgo.toISOString()))),
      getCountFromServer(query(collection(db, 'groups'), where('status', '==', 'active'))),
      getCountFromServer(query(collection(db, 'security_logs'), where('timestamp', '>=', sevenDaysAgo.toISOString()))),
      getCountFromServer(query(collection(db, 'notifications'), where('createdAt', '>=', thirtyDaysAgo.toISOString()))),
    ]);

    // Calculate signup trend over the last 7 days
    const recentUsersSnap = await getDocs(
      query(collection(db, 'users'), where('createdAt', '>=', sevenDaysAgo.toISOString()))
    );
    
    const dailyCounts = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const count = recentUsersSnap.docs.filter(doc => {
        const createdAt = doc.data().createdAt;
        return createdAt && createdAt.startsWith(dateStr);
      }).length;

      dailyCounts.push({ date: dateStr, count });
    }

    return {
      data: {
        totalUsers:             usersCount.data().count,
        totalGroups:            groupsCount.data().count,
        activeGroups:           activeGroups.data().count,
        totalNotifications:     notifCount.data().count,
        totalSecurityEvents:    securityCount.data().count,
        totalAiRequests:        aiCount.data().count,
        newUsersLast7Days:      newUsers7.data().count,
        newUsersLast30Days:     newUsers30.data().count,
        recentSecurityEvents:   recentSecurity.data().count,
        recentNotifications:    recentNotifs.data().count,
        signupTrend:            dailyCounts,
      }
    };
  },

  // ─── Users ──────────────────────────────────────────────────────────────────
  getAllUsers: async (pageSize = 20, lastDoc = null) => {
    let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(pageSize));
    if (lastDoc) q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(pageSize));
    const snap = await getDocs(q);
    return {
      users:   snap.docs.map((d) => ({ _id: d.id, ...d.data() })),
      lastDoc: snap.docs[snap.docs.length - 1] || null,
      hasMore: snap.docs.length === pageSize,
    };
  },

  getUserDetails: async (uid) => {
    const [userSnap, groupsSnap] = await Promise.all([
      getDoc(doc(db, 'users', uid)),
      getDocs(query(collection(db, 'groups'), where('members', 'array-contains', uid), limit(20))),
    ]);
    return {
      user:   userSnap.exists() ? { _id: userSnap.id, ...userSnap.data() } : null,
      groups: groupsSnap.docs.map((d) => ({ _id: d.id, ...d.data() })),
    };
  },

  suspendUser:  async (uid) => {
    await updateDoc(doc(db, 'users', uid), { suspended: true, suspendedAt: new Date().toISOString() });
    return { data: { success: true } };
  },
  enableUser:   async (uid) => {
    await updateDoc(doc(db, 'users', uid), { suspended: false, suspendedAt: null });
    return { data: { success: true } };
  },
  clearUserFCM: async (uid) => {
    await updateDoc(doc(db, 'users', uid), { fcmToken: deleteField() });
    return { data: { success: true } };
  },
  grantAdmin:   async (uid) => {
    await updateDoc(doc(db, 'users', uid), { isAdmin: true });
    return { data: { success: true } };
  },
  revokeAdmin:  async (uid) => {
    await updateDoc(doc(db, 'users', uid), { isAdmin: false });
    return { data: { success: true } };
  },

  bootstrapAdmin: () => Promise.resolve({ data: { success: true } }),

  // ─── Broadcast Notifications ────────────────────────────────────────────────
  broadcastNotification: async ({ title, body, url, targetUid }) => {
    let targetUsers = [];
    if (targetUid) {
      const userSnap = await getDoc(doc(db, 'users', targetUid));
      if (userSnap.exists()) {
        targetUsers.push({ id: userSnap.id, ...userSnap.data() });
      }
    } else {
      const usersSnap = await getDocs(collection(db, 'users'));
      targetUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    const recipientCount = targetUsers.length;

    // Log history entry in Firestore
    await addDoc(collection(db, 'admin_notifications'), {
      title,
      body,
      url: url || "",
      targetUid: targetUid || null,
      sentBy: auth.currentUser?.uid || "admin",
      recipientCount,
      successCount: recipientCount,
      failureCount: 0,
      createdAt: new Date().toISOString(),
    });

    // Write alerts for active in-app listener
    const batch = writeBatch(db);
    targetUsers.forEach(user => {
      const ref = doc(collection(db, 'notifications'));
      batch.set(ref, {
        to: user.id,
        message: body,
        type: 'info',
        read: false,
        createdAt: new Date().toISOString()
      });
    });
    await batch.commit();

    return { data: { sent: recipientCount, failed: 0, recipientCount } };
  },

  getNotificationHistory: async (pageSize = 20, lastDoc = null) => {
    let q = query(collection(db, 'admin_notifications'), orderBy('createdAt', 'desc'), limit(pageSize));
    if (lastDoc) q = query(collection(db, 'admin_notifications'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(pageSize));
    const snap = await getDocs(q);
    return {
      notifications: snap.docs.map((d) => ({ _id: d.id, ...d.data() })),
      lastDoc:       snap.docs[snap.docs.length - 1] || null,
      hasMore:       snap.docs.length === pageSize,
    };
  },

  // ─── Groups ──────────────────────────────────────────────────────────────────
  getAllGroups: async (pageSize = 20, lastDoc = null) => {
    let q = query(collection(db, 'groups'), orderBy('createdAt', 'desc'), limit(pageSize));
    if (lastDoc) q = query(collection(db, 'groups'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(pageSize));
    const snap = await getDocs(q);
    return {
      groups:  snap.docs.map((d) => ({ _id: d.id, ...d.data() })),
      lastDoc: snap.docs[snap.docs.length - 1] || null,
      hasMore: snap.docs.length === pageSize,
    };
  },

  getGroupDetails: async (groupId) => {
    const [groupSnap, expensesSnap, settlementsSnap] = await Promise.all([
      getDoc(doc(db, 'groups', groupId)),
      getDocs(query(collection(db, `groups/${groupId}/expenses`), orderBy('createdAt', 'desc'), limit(20))),
      getDocs(query(collection(db, `groups/${groupId}/settlements`), orderBy('createdAt', 'desc'), limit(20))),
    ]);
    return {
      group:       groupSnap.exists() ? { _id: groupSnap.id, ...groupSnap.data() } : null,
      expenses:    expensesSnap.docs.map((d) => ({ _id: d.id, ...d.data() })),
      settlements: settlementsSnap.docs.map((d) => ({ _id: d.id, ...d.data() })),
    };
  },

  forceArchiveGroup: (groupId) =>
    updateDoc(doc(db, 'groups', groupId), { status: 'archived', archivedAt: new Date().toISOString() }),

  forceDeleteGroup: (groupId) =>
    updateDoc(doc(db, 'groups', groupId), { status: 'deleted', deletedAt: new Date().toISOString() }),

  // ─── Security Logs ───────────────────────────────────────────────────────────
  getSecurityLogs: async (pageSize = 30, lastDoc = null, eventFilter = null) => {
    let baseQuery = eventFilter
      ? query(collection(db, 'security_logs'), where('event', '==', eventFilter), orderBy('timestamp', 'desc'), limit(pageSize))
      : query(collection(db, 'security_logs'), orderBy('timestamp', 'desc'), limit(pageSize));
    if (lastDoc) baseQuery = query(baseQuery, startAfter(lastDoc));
    const snap = await getDocs(baseQuery);
    return {
      logs:    snap.docs.map((d) => ({ _id: d.id, ...d.data() })),
      lastDoc: snap.docs[snap.docs.length - 1] || null,
      hasMore: snap.docs.length === pageSize,
    };
  },

  // ─── Feature Flags ───────────────────────────────────────────────────────────
  getFeatureFlags: async () => {
    const snap = await getDoc(doc(db, 'config', 'featureFlags'));
    return snap.exists() ? snap.data() : {};
  },

  setFeatureFlag: async (flag, value) => {
    const ref = doc(db, 'config', 'featureFlags');
    await setDoc(ref, { [flag]: value, updatedAt: new Date().toISOString() }, { merge: true });
  },

  // ─── AI Scan Analytics ──────────────────────────────────────────────────────
  getAiScanLogs: async (pageSize = 20, lastDoc = null) => {
    let q = query(collection(db, 'ai_requests'), orderBy('timestamp', 'desc'), limit(pageSize));
    if (lastDoc) q = query(collection(db, 'ai_requests'), orderBy('timestamp', 'desc'), startAfter(lastDoc), limit(pageSize));
    const snap = await getDocs(q);
    return {
      logs:    snap.docs.map((d) => ({ _id: d.id, ...d.data() })),
      lastDoc: snap.docs[snap.docs.length - 1] || null,
      hasMore: snap.docs.length === pageSize,
    };
  },

  getAiScanStats: async () => {
    const snap = await getDocs(query(collection(db, 'ai_requests'), orderBy('timestamp', 'desc'), limit(500)));
    const docs = snap.docs.map(d => d.data());
    
    const total = docs.length;
    const passed = docs.filter(d => d.status === 'passed').length;
    const failed = total - passed;
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 100;
    
    const totalDuration = docs.reduce((acc, d) => acc + (d.duration || 0), 0);
    const avgDuration = total > 0 ? Math.round(totalDuration / total) : 0;
    
    // Gemini-3.1-flash-lite pricing: input $0.075 / 1M tokens, output $0.30 / 1M tokens
    // Estimated ₹0.05 per request for input image + output tokens
    const estCost = total * 0.05;
    
    return {
      total,
      successRate,
      avgDuration,
      estCost,
      passed,
      failed
    };
  },
};

export default adminService;
