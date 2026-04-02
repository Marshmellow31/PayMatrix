import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  Search,
  Check,
  X,
  Users,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Loader2,
  User as UserIcon,
  Clock,
  ExternalLink,
  ChevronRight,
  Layers,
  Sparkles
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  onSnapshot,
  doc,
  collection,
  query,
  where
} from 'firebase/firestore';
import { auth, db } from '../config/firebase.js';
import friendService from '../services/friendService';
import toast from 'react-hot-toast';
import Modal from '../components/common/Modal';

const Friends = () => {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [totalSharedBalance, setTotalSharedBalance] = useState(0);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState({}); // { userId: 'friend' | 'pending_incoming' | ... }
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  // Quick Settle Modal State
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedFriendForSettle, setSelectedFriendForSettle] = useState(null);

  const fetchData = useCallback(async (isInitial = true) => {
    try {
      if (isInitial) setIsLoading(true);
      const [analyticsRes, requestsRes] = await Promise.all([
        friendService.getNetworkAnalytics(),
        friendService.getRequests()
      ]);
      setFriends(analyticsRes.data.data?.networkAnalytics || []);
      setTotalSharedBalance(analyticsRes.data.data?.totalSharedBalance || 0);
      setRequests(requestsRes.data.data || { incoming: [], outgoing: [] });
    } catch (error) {
      console.error("Fetch Data Error:", error);
      // Only toast on initial error to avoid noise
      if (isInitial) toast.error('Failed to load network intelligence');
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let unsubs = [];

    const setupListeners = () => {
      const user = auth.currentUser;
      if (!user) return;

      // 1. Initial snapshot of all data
      fetchData(true);

      // 2. Listen to user document (friend list changes)
      unsubs.push(onSnapshot(doc(db, 'users', user.uid), () => {
        fetchData(false);
      }));

      // 3. Listen to incoming requests
      const qReq = query(
        collection(db, 'friendRequests'),
        where('to', '==', user.uid),
        where('status', '==', 'pending')
      );
      unsubs.push(onSnapshot(qReq, () => {
        fetchData(false);
      }));

      // 4. Listen to outgoing requests
      const qReqOut = query(
        collection(db, 'friendRequests'),
        where('from', '==', user.uid),
        where('status', '==', 'pending')
      );
      unsubs.push(onSnapshot(qReqOut, () => {
        fetchData(false);
      }));

      // 5. Listen to groups user is in
      // Due to 'touch' mechanism in expenseService, any subcollection change
      // will update the group doc, triggering this listener.
      const qGroups = query(
        collection(db, 'groups'),
        where('members', 'array-contains', user.uid)
      );
      unsubs.push(onSnapshot(qGroups, () => {
        fetchData(false);
      }));
    };

    // Give auth a moment to initialize if needed
    const authUnsub = auth.onAuthStateChanged((user) => {
      if (user) {
        setupListeners();
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      authUnsub();
      unsubs.forEach(u => u());
    };
  }, [fetchData]);

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const res = await friendService.searchUsers(query);
      const currentUser = auth.currentUser;
      const users = (res.data.data.users || [])
        .filter(u => u._id !== currentUser?.uid && u._id !== currentUser?._id);
      setSearchResults(users);

      // Batch check relationships for search results
      const statusMap = {};
      await Promise.all(users.map(async (u) => {
        const relRes = await friendService.checkRelationship(u._id);
        statusMap[u._id] = relRes.data.data.status;
      }));
      setSearchStatus(prev => ({ ...prev, ...statusMap }));
    } catch (error) {
      // Background search errors
    } finally {
      setIsSearching(false);
    }
  };

  const sendRequest = async (userId) => {
    try {
      await friendService.sendRequest(userId);
      toast.success('Connection request broadcasted');
      setSearchStatus(prev => ({ ...prev, [userId]: 'pending_outgoing' }));
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Connection failed');
    }
  };

  const respondToRequest = async (requestId, status) => {
    try {
      await friendService.respondToRequest(requestId, status);
      toast.success(status === 'accepted' ? 'Network bridged' : 'Signal dissolved');
      fetchData();
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const handleQuickSettle = (friendNode) => {
    setSelectedFriendForSettle(friendNode);
    setSettleModalOpen(true);
  };

  if (isLoading && friends.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 text-white/20">
        <Loader2 className="w-12 h-12 animate-spin" strokeWidth={1.5} />
        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Optimizing Network Nodes</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-32 space-y-10">
      {/* Network Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6 px-1"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-black font-manrope text-white tracking-tight uppercase leading-none">Friends</h1>
          <p className="text-[10px] font-black font-manrope tracking-[0.4em] text-white/20 uppercase">Social Matrix v3.1</p>
        </div>

        <div className="relative group/search">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-white/40 group-focus-within/search:text-primary transition-all duration-500">
            <Search size={18} strokeWidth={2.5} />
          </div>
          <input
            type="text"
            placeholder="Search friends..."
            className="w-full bg-surface-container-low border border-white/5 rounded-2xl py-4 pl-14 pr-12 text-white font-manrope font-bold placeholder:text-white/10 focus:outline-none focus:border-white/10 focus:ring-4 focus:ring-white/[0.02] transition-all duration-500 shadow-2xl text-sm"
            value={searchQuery}
            onChange={handleSearch}
          />

          <AnimatePresence>
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => handleSearch({ target: { value: '' } })}
                className="absolute inset-y-0 right-3 flex items-center p-1 text-white/20 hover:text-white transition-colors"
              >
                <div className="bg-white/5 hover:bg-white/10 rounded-full p-2 border border-white/5 text-white/30">
                  <X size={12} strokeWidth={3} />
                </div>
              </motion.button>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                className="absolute top-full left-0 right-0 mt-4 bg-surface-container-low border border-white/5 rounded-[2.5rem] p-4 z-50 shadow-[0_32px_120px_rgba(0,0,0,1)] backdrop-blur-3xl overflow-hidden"
              >
                <p className="px-5 py-2 text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Potential Connections</p>
                <div className="max-h-[380px] overflow-y-auto no-scrollbar space-y-1.5 mt-2">
                  {searchResults.map((user) => {
                    const status = searchStatus[user._id] || 'none';
                    return (
                      <div key={user._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all group/item">
                        <div className="flex items-center gap-5 min-w-0">
                          <div className="w-14 h-14 rounded-[1.25rem] flex-shrink-0 bg-white/5 border border-white/5 flex items-center justify-center font-black text-white/10 group-hover/item:text-white group-hover/item:bg-white/10 transition-all uppercase text-xl">
                            {user.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-black text-white tracking-wide truncate">{user.name}</p>
                            <p className="text-xs text-white/20 font-semibold lowercase tracking-tight truncate">{user.email}</p>
                          </div>
                        </div>

                        <div className="flex sm:justify-end w-full sm:w-auto">
                          {status === 'friend' ? (
                            <div className="flex-shrink-0 flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 w-full sm:w-auto justify-center">
                              <div className="w-2 h-2 rounded-full bg-white/40" />
                              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Connected</span>
                            </div>
                          ) : status === 'pending_outgoing' ? (
                            <div className="flex-shrink-0 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/5 w-full sm:w-auto text-center">
                              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">Signal Sent</span>
                            </div>
                          ) : status === 'pending_incoming' ? (
                            <button
                              onClick={() => setActiveTab('pending')}
                              className="flex-shrink-0 w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest shadow-lg shadow-white/5 hover:scale-105 active:scale-95 transition-all"
                            >Action Required</button>
                          ) : (
                            <button
                              onClick={() => sendRequest(user._id)}
                              className="flex-shrink-0 w-full sm:w-14 h-14 rounded-2xl bg-white text-black hover:bg-white/90 active:scale-90 transition-all flex items-center justify-center shadow-xl shadow-white/5"
                            >
                              <UserPlus size={22} strokeWidth={3} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Tabs Menu */}
      <div className="flex gap-8 border-b border-white/5 px-2">
        {[
          { id: 'all', label: 'Nodes', count: friends.length },
          { id: 'pending', label: 'Signals', count: requests.incoming.length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-5 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative group ${activeTab === tab.id ? 'text-white' : 'text-white/20 hover:text-white/40'
              }`}
          >
            <div className="flex items-center gap-3">
              <span>{tab.label}</span>
              <span className={`text-[8px] px-2 py-0.5 rounded-lg border font-black ${activeTab === tab.id
                ? 'bg-white/10 text-white border-white/20'
                : 'bg-transparent text-white/10 border-white/5 group-hover:border-white/10'
                }`}>
                {tab.count}
              </span>
            </div>
            {activeTab === tab.id && (
              <motion.div
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,0.4)]"
              />
            )}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {requests.incoming.length === 0 && (
              <div className="py-24 text-center border border-dashed border-white/10 rounded-[2.5rem] bg-white/[0.01]">
                <Clock size={32} className="mx-auto mb-4 text-white/5" />
                <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.4em]">No external bridge requests</p>
              </div>
            )}

            {requests.incoming.map((req) => (
              <motion.div
                key={req._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-4 rounded-2xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20">
                    <UserIcon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white font-manrope">{req.from?.name || 'Inbound User'}</p>
                    <p className="text-[10px] text-white/20 font-medium uppercase tracking-widest">Wants to connect</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => respondToRequest(req._id, 'accepted')}
                    className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center hover:bg-white/90 active:scale-95 transition-all shadow-lg shadow-white/5"
                  >
                    <Check size={16} strokeWidth={3} />
                  </button>
                  <button
                    onClick={() => respondToRequest(req._id, 'declined')}
                    className="w-10 h-10 rounded-xl bg-white/5 text-white/40 border border-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'all' && (
          <div className="flex flex-col gap-3">
            {friends.length === 0 ? (
              <div className="col-span-full py-32 text-center border border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
                <Users size={48} className="mx-auto mb-6 text-white/5" />
                <p className="text-white/20 font-black uppercase tracking-[0.5em] text-[10px]">Zero connection nodes found</p>
              </div>
            ) : (
              friends.map((friendNode, index) => {
                const balance = friendNode.netBalance;
                const isPositive = balance > 0;
                const isNegative = balance < 0;
                const hasBalance = balance !== 0;

                return (
                  <motion.div
                    key={friendNode.friend._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="group relative bg-[#1a1a1a]/40 border border-white/5 p-4 rounded-2xl hover:bg-[#1a1a1a] hover:border-white/10 transition-all duration-300 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-lg font-black text-white group-hover:bg-white group-hover:text-black transition-all duration-300 shrink-0">
                        {friendNode.friend.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Name & Cohorts */}
                      <div className="min-w-0">
                        <Link
                          to={`/friends/${friendNode.friend._id}`}
                          className="text-sm font-black text-white tracking-tight hover:text-primary transition-colors block truncate"
                        >
                          {friendNode.friend.name}
                        </Link>
                        <p className="text-[9px] text-white/20 font-black uppercase tracking-widest mt-0.5">
                          {friendNode.mutualGroupsCount} Mutual Cohorts
                        </p>
                      </div>
                    </div>

                    {/* Balance and Actions */}
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right">
                        <p className={`text-sm font-black font-manrope tracking-tight ${isPositive ? 'text-white' : isNegative ? 'text-white/40' : 'text-white/10'}`}>
                          {hasBalance ? `₹${Math.abs(balance).toLocaleString()}` : 'Settled'}
                        </p>
                        {hasBalance && (
                          <p className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${isPositive ? 'text-white/40' : 'text-white/10'}`}>
                            {isPositive ? 'Receivable' : 'Payable'}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isNegative && (
                          <button
                            onClick={() => handleQuickSettle(friendNode)}
                            className="bg-white/5 text-white hover:bg-white hover:text-black h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 border border-white/10"
                          >
                            Settle
                          </button>
                        )}
                        <Link
                          to={`/friends/${friendNode.friend._id}`}
                          className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/20 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <ChevronRight size={16} />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Quick Settle Modal */}
      <Modal
        isOpen={settleModalOpen}
        onClose={() => setSettleModalOpen(false)}
        title="Quick Settlement"
      >
        <div className="space-y-6">
          <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">Counterparty</p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white text-black flex items-center justify-center font-black">
                {selectedFriendForSettle?.friend.name.charAt(0)}
              </div>
              <div>
                <p className="text-lg font-black text-white font-manrope">{selectedFriendForSettle?.friend.name}</p>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Global Debt: ₹{Math.abs(selectedFriendForSettle?.netBalance || 0)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] px-2 italic">Select Active Cohort</p>
            <div className="space-y-2">
              {selectedFriendForSettle?.mutualGroups.filter(g => g.balance < 0).map(group => (
                <button
                  key={group.id}
                  onClick={() => navigate(`/groups/${group.id}?settle=true&with=${selectedFriendForSettle.friend._id}`)}
                  className="w-full p-5 rounded-2xl bg-white/[0.04] border border-white/5 hover:bg-white/[0.08] hover:border-white/20 flex items-center justify-between group/btn transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/20 group-hover/btn:text-white transition-colors">
                      <Layers size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-white uppercase tracking-wider">{group.title}</p>
                      <p className="text-[10px] text-white/20 font-bold tracking-widest">LOCAL DEBT: ₹{Math.abs(group.balance).toLocaleString()}</p>
                    </div>
                  </div>
                  <ExternalLink size={16} className="text-white/10 group-hover/btn:text-white transition-colors" />
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setSettleModalOpen(false)}
              className="w-full py-4 text-[10px] font-black text-white/20 uppercase tracking-[0.3em] hover:text-white transition-colors"
            >
              Cancel Operation
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Friends;
