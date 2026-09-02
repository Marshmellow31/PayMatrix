import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc, limit } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { clearExpenses, setExpenses } from '../redux/expenseSlice.js';
import groupService from '../services/groupService.js';
import { serializeFirestoreData } from '../utils/firestoreSerialization.js';

/**
 * Custom hook to manage real-time Firestore listeners for a group.
 * Subscribes to group metadata, expenses, and settlements.
 */
export const useGroupRealtime = (groupId, dispatch, deletingGroupRef, activeTab) => {
  const [settlements, setSettlements] = useState([]);
  const [groupLogs, setGroupLogs] = useState([]);

  useEffect(() => {
    if (!groupId) return;

    // 1. Clear any stale expenses from a previous group
    dispatch(clearExpenses());

    // 2. Real-time listener for Group Metadata
    const unsubscribeGroup = onSnapshot(
      doc(db, 'groups', groupId),
      async (docSnap) => {
        if (docSnap.exists()) {
          try {
            const groupData = await groupService.expandGroupData(docSnap);
            dispatch({
              type: 'groups/fetchOne/fulfilled',
              payload: { data: { group: groupData } },
            });
          } catch (err) {
            console.error('Error expanding group snapshot:', err);
            const rawData = serializeFirestoreData({ _id: docSnap.id, ...docSnap.data() });
            dispatch({ type: 'groups/fetchOne/fulfilled', payload: { data: { group: rawData } } });
          }
        }
      },
      (err) => {
        if (deletingGroupRef?.current && err.code === 'permission-denied') return;
        console.error('Group metadata snapshot error:', err);
      }
    );

    // 3. Real-time listener for Expenses
    const qExpenses = query(
      collection(db, 'groups', groupId, 'expenses'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeExpenses = onSnapshot(
      qExpenses,
      (snapshot) => {
        const liveExpenses = snapshot.docs.map((docSnap) =>
          serializeFirestoreData({
            _id: docSnap.id,
            ...docSnap.data(),
          })
        );
        dispatch(setExpenses({ expenses: liveExpenses, groupId }));
      },
      (err) => {
        if (deletingGroupRef?.current && err.code === 'permission-denied') return;
        console.error('Expenses snapshot error:', err);
      }
    );

    // 4. Real-time listener for Settlements
    const qSettlements = query(
      collection(db, 'groups', groupId, 'settlements'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeSettlements = onSnapshot(
      qSettlements,
      (snapshot) => {
        const liveSettlements = snapshot.docs.map((d) =>
          serializeFirestoreData({
            _id: d.id,
            groupId,
            ...d.data(),
          })
        );
        setSettlements(liveSettlements);
      },
      (err) => {
        if (deletingGroupRef?.current && err.code === 'permission-denied') return;
        console.error('Settlements snapshot error:', err);
      }
    );

    return () => {
      setSettlements([]);
      unsubscribeGroup();
      unsubscribeExpenses();
      unsubscribeSettlements();
    };
  }, [groupId, dispatch, deletingGroupRef]);

  // 5. Lazy listener for Group Logs (only when activeTab === 'logs')
  useEffect(() => {
    if (!groupId || activeTab !== 'logs') return;

    const qLogs = query(
      collection(db, 'groups', groupId, 'logs'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const unsubscribeLogs = onSnapshot(
      qLogs,
      (snapshot) => {
        const liveLogs = snapshot.docs
          .map((docSnap) =>
            serializeFirestoreData({
              _id: docSnap.id,
              ...docSnap.data(),
            })
          )
          .sort(
            (a, b) =>
              new Date(b.createdAt || b.updatedAt || 0).getTime() -
              new Date(a.createdAt || a.updatedAt || 0).getTime()
          );
        setGroupLogs(liveLogs);
      },
      (err) => {
        if (deletingGroupRef?.current && err.code === 'permission-denied') return;
        console.error('Logs snapshot error:', err);
      }
    );

    return () => {
      setGroupLogs([]);
      unsubscribeLogs();
    };
  }, [groupId, activeTab, deletingGroupRef]);

  return { settlements, groupLogs };
};
