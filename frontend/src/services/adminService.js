import { db, functions } from '../config/firebase.js';
import { httpsCallable } from 'firebase/functions';
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  getDoc,
  where,
  setDoc,
  getCountFromServer,
  writeBatch,
  deleteDoc,
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
      getCountFromServer(
        query(collection(db, 'users'), where('createdAt', '>=', sevenDaysAgo.toISOString()))
      ),
      getCountFromServer(
        query(collection(db, 'users'), where('createdAt', '>=', thirtyDaysAgo.toISOString()))
      ),
      getCountFromServer(query(collection(db, 'groups'), where('status', '==', 'active'))),
      getCountFromServer(
        query(collection(db, 'security_logs'), where('timestamp', '>=', sevenDaysAgo.toISOString()))
      ),
      getCountFromServer(
        query(
          collection(db, 'notifications'),
          where('createdAt', '>=', thirtyDaysAgo.toISOString())
        )
      ),
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

      const count = recentUsersSnap.docs.filter((doc) => {
        const createdAt = doc.data().createdAt;
        return createdAt && createdAt.startsWith(dateStr);
      }).length;

      dailyCounts.push({ date: dateStr, count });
    }

    return {
      data: {
        totalUsers: usersCount.data().count,
        totalGroups: groupsCount.data().count,
        activeGroups: activeGroups.data().count,
        totalNotifications: notifCount.data().count,
        totalSecurityEvents: securityCount.data().count,
        totalAiRequests: aiCount.data().count,
        newUsersLast7Days: newUsers7.data().count,
        newUsersLast30Days: newUsers30.data().count,
        recentSecurityEvents: recentSecurity.data().count,
        recentNotifications: recentNotifs.data().count,
        signupTrend: dailyCounts,
      },
    };
  },

  // ─── Users ──────────────────────────────────────────────────────────────────
  getAllUsers: async (pageSize = 20, lastDoc = null) => {
    let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(pageSize));
    if (lastDoc)
      q = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(pageSize)
      );
    const snap = await getDocs(q);
    return {
      users: snap.docs.map((d) => ({ _id: d.id, ...d.data() })),
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
      user: userSnap.exists() ? { _id: userSnap.id, ...userSnap.data() } : null,
      groups: groupsSnap.docs.map((d) => ({ _id: d.id, ...d.data() })),
    };
  },

  // All privileged user mutations run through the admin-gated `adminManageUser`
  // Cloud Function (verifies the `admin` custom claim server-side). Grant/revoke
  // set the actual Firebase custom claim — the previous client-side `isAdmin`
  // field write did nothing for authorization and has been removed.
  suspendUser: async (uid) => {
    await httpsCallable(functions, 'adminManageUser')({ uid, action: 'disable' });
    return { data: { success: true } };
  },
  enableUser: async (uid) => {
    await httpsCallable(functions, 'adminManageUser')({ uid, action: 'enable' });
    return { data: { success: true } };
  },
  clearUserFCM: async (uid) => {
    await httpsCallable(functions, 'adminManageUser')({ uid, action: 'clearFcm' });
    return { data: { success: true } };
  },
  grantAdmin: async (uid) => {
    await httpsCallable(functions, 'adminManageUser')({ uid, action: 'grantAdmin' });
    return { data: { success: true } };
  },
  revokeAdmin: async (uid) => {
    await httpsCallable(functions, 'adminManageUser')({ uid, action: 'revokeAdmin' });
    return { data: { success: true } };
  },

  bootstrapAdmin: () => Promise.resolve({ data: { success: true } }),

  // ─── Broadcast Notifications ────────────────────────────────────────────────
  // Routed through the admin-gated `broadcastNotification` Cloud Function, which
  // fans out FCM web-push and records the history entry with admin privileges.
  // (Client-side batch writes to other users' notifications are now blocked by
  // the tightened Firestore rules, and never delivered a real push anyway.)
  broadcastNotification: async ({ title, body, url, targetUid }) => {
    const res = await httpsCallable(
      functions,
      'broadcastNotification'
    )({
      title,
      body,
      url,
      targetUid,
    });
    return { data: res.data };
  },

  getNotificationHistory: async (pageSize = 20, lastDoc = null) => {
    let q = query(
      collection(db, 'admin_notifications'),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );
    if (lastDoc)
      q = query(
        collection(db, 'admin_notifications'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(pageSize)
      );
    const snap = await getDocs(q);
    return {
      notifications: snap.docs.map((d) => ({ _id: d.id, ...d.data() })),
      lastDoc: snap.docs[snap.docs.length - 1] || null,
      hasMore: snap.docs.length === pageSize,
    };
  },

  deleteNotificationHistoryItem: async (id) => {
    // 1. Get the admin notification details first
    const adminNotifSnap = await getDoc(doc(db, 'admin_notifications', id));
    if (!adminNotifSnap.exists()) {
      await deleteDoc(doc(db, 'admin_notifications', id));
      return;
    }

    const adminNotifData = adminNotifSnap.data();
    const { body, targetUid } = adminNotifData;

    // 2. Query all user notifications linked to this admin notification ID
    const q = query(collection(db, 'notifications'), where('parentAdminNotificationId', '==', id));
    let userNotifsSnap = await getDocs(q);

    // 3. Fallback for older notifications that don't have the parentAdminNotificationId field
    if (userNotifsSnap.empty && body) {
      let fallbackQuery = query(collection(db, 'notifications'), where('message', '==', body));
      if (targetUid) {
        fallbackQuery = query(
          collection(db, 'notifications'),
          where('message', '==', body),
          where('to', '==', targetUid)
        );
      }
      userNotifsSnap = await getDocs(fallbackQuery);
    }

    // 4. Batch delete the user notifications
    if (!userNotifsSnap.empty) {
      const batch = writeBatch(db);
      userNotifsSnap.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    }

    // 5. Delete the admin history log document itself
    await deleteDoc(doc(db, 'admin_notifications', id));
  },

  // ─── Groups ──────────────────────────────────────────────────────────────────
  getAllGroups: async (pageSize = 20, lastDoc = null) => {
    const callable = httpsCallable(functions, 'adminListGroups');
    const res = await callable({ pageSize, startAfterId: lastDoc });
    return {
      groups: res.data.groups,
      lastDoc: res.data.lastDocId,
      hasMore: res.data.hasMore,
    };
  },

  getGroupDetails: async (groupId) => {
    const callable = httpsCallable(functions, 'adminGetGroupDetails');
    const res = await callable({ groupId });
    return res.data;
  },

  forceArchiveGroup: async (groupId) => {
    const callable = httpsCallable(functions, 'adminArchiveGroup');
    await callable({ groupId });
  },

  forceDeleteGroup: async (groupId) => {
    const callable = httpsCallable(functions, 'adminDeleteGroup');
    await callable({ groupId });
  },

  // ─── Security Logs ───────────────────────────────────────────────────────────
  getSecurityLogs: async (pageSize = 30, lastDoc = null, eventFilter = null) => {
    let baseQuery = eventFilter
      ? query(
          collection(db, 'security_logs'),
          where('event', '==', eventFilter),
          orderBy('timestamp', 'desc'),
          limit(pageSize)
        )
      : query(collection(db, 'security_logs'), orderBy('timestamp', 'desc'), limit(pageSize));
    if (lastDoc) baseQuery = query(baseQuery, startAfter(lastDoc));
    const snap = await getDocs(baseQuery);
    return {
      logs: snap.docs.map((d) => ({ _id: d.id, ...d.data() })),
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
    if (lastDoc)
      q = query(
        collection(db, 'ai_requests'),
        orderBy('timestamp', 'desc'),
        startAfter(lastDoc),
        limit(pageSize)
      );
    const snap = await getDocs(q);
    return {
      logs: snap.docs.map((d) => ({ _id: d.id, ...d.data() })),
      lastDoc: snap.docs[snap.docs.length - 1] || null,
      hasMore: snap.docs.length === pageSize,
    };
  },

  getAiScanStats: async () => {
    const snap = await getDocs(
      query(collection(db, 'ai_requests'), orderBy('timestamp', 'desc'), limit(500))
    );
    const docs = snap.docs.map((d) => d.data());

    const total = docs.length;
    const passed = docs.filter((d) => d.status === 'passed').length;
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
      failed,
    };
  },
};

export default adminService;
