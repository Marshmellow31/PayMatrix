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
  Sparkles,
  Link as LinkIcon,
  Copy,
  QrCode,
  ShieldCheck
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Link, useNavigate } from 'react-router-dom';
import Avatar from '../components/common/Avatar';
import { getInitials } from '../utils/nameUtils.js';
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
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showInvite, setShowInvite] = useState(false);

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

  const copyInviteLink = () => {
    const user = auth.currentUser;
    if (!user) return;
    
    const link = `${window.location.origin}/join-friend?uid=${user.uid}`;
    navigator.clipboard.writeText(link).then(() => {
      toast.success('Invite link copied to clipboard', {
        icon: '🔗',
        style: {
          borderRadius: '1rem',
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)'
        }
      });
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  const sendRequest = async (userId) => {
    try {
      await friendService.sendRequest(userId);
      toast.success('Connection request broadcasted');
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-32 space-y-10 overflow-x-hidden">
      {/* Network Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 sm:gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-black font-manrope text-white tracking-tight uppercase leading-none">Friends</h1>
            <p className="text-[10px] font-black font-manrope tracking-[0.4em] text-white/20 uppercase">Social Matrix v3.1</p>
          </div>
          <button
            onClick={() => setShowInvite(!showInvite)}
            className={`flex items-center justify-center gap-2 px-6 py-4 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl border transition-all duration-500 font-bold text-[10px] uppercase tracking-widest w-full sm:w-auto ${
              showInvite 
                ? 'bg-white text-black border-white shadow-xl translate-y-[-2px]' 
                : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
            }`}
          >
            <UserPlus size={14} strokeWidth={3} />
            {showInvite ? 'Hide Invite' : 'Invite Friend'}
          </button>
        </div>

        <AnimatePresence>
          {showInvite && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="bg-surface-container-low border border-white/5 rounded-2xl sm:rounded-[2.5rem] p-1 sm:p-2 shadow-2xl relative overflow-hidden w-full"
            >
              <div className="p-4 sm:p-10 flex flex-col sm:flex-row gap-6 sm:gap-12 items-center w-full max-w-full overflow-hidden">
                {/* QR Code */}
                <div className="relative group/qr shrink-0">
                  <div className="absolute -inset-6 bg-primary/10 blur-3xl rounded-full opacity-0 group-hover/qr:opacity-100 transition-opacity duration-700" />
                  <div className="relative p-5 sm:p-6 bg-white rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
                    <QRCodeSVG 
                      value={`${window.location.origin}/join-friend?uid=${auth.currentUser?.uid}`} 
                      size={120}
                      level="H"
                      includeMargin={false}
                      className="sm:w-[150px] sm:h-[150px]"
                    />
                  </div>
                </div>

                <div className="flex-1 w-full min-w-0 space-y-6 sm:space-y-8 text-center sm:text-left">
                  <div className="space-y-1.5 sm:space-y-3">
                    <h3 className="text-base sm:text-xl font-black text-white font-manrope tracking-tight leading-none italic uppercase">Neural Identity Link</h3>
                    <p className="text-[9px] sm:text-xs text-white/30 font-bold uppercase tracking-[0.3em] leading-relaxed">Share via physical scan or digital broadcast</p>
                  </div>

                  <div className="flex flex-col gap-4 w-full">
                    <button
                      onClick={copyInviteLink}
                      className="h-14 sm:h-16 w-full rounded-2xl bg-white text-black hover:bg-neutral-200 active:scale-95 transition-all font-manrope font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shrink-0"
                    >
                      <Copy size={16} strokeWidth={3} />
                      Transmit Link
                    </button>
                  </div>

                  <div className="flex items-center justify-center sm:justify-start gap-3 text-white/10 pt-2">
                    <ShieldCheck size={14} className="text-primary shrink-0" />
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-50">Peer-to-peer validation active</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Tabs Menu */}
      <div className="flex gap-4 sm:gap-8 border-b border-white/5 px-1 sm:px-2 overflow-x-auto no-scrollbar whitespace-nowrap">
        {[
          { id: 'all', label: 'Nodes', count: friends.length },
          { id: 'pending', label: 'Signals', count: requests.incoming.length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative group ${activeTab === tab.id ? 'text-white' : 'text-white/20 hover:text-white/40'
              }`}
          >
            <div className="flex items-center gap-3">
              <span className={`${tab.id === 'pending' && tab.count > 0 ? 'text-primary/90 font-black' : ''}`}>{tab.label}</span>
              <span className={`text-[8px] px-2 py-0.5 rounded-lg border font-black transition-all duration-300 ${
                tab.id === 'pending' && tab.count > 0
                  ? 'bg-primary text-on-primary border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)] animate-pulse'
                  : activeTab === tab.id
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
                  <Avatar 
                    name={req.from?.name} 
                    src={req.from?.avatar || req.from?.photoURL} 
                    size="sm" 
                  />
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
                    className="group relative bg-surface-container-high/40 border border-white/5 p-3 sm:p-4 rounded-2xl hover:bg-surface-container-high hover:border-white/10 transition-all duration-300 flex items-center justify-between gap-2 sm:gap-4 overflow-hidden"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      {/* Avatar */}
                      <Avatar 
                        name={friendNode.friend.name}
                        src={friendNode.friend.avatar || friendNode.friend.photoURL}
                        size="md"
                        className="rounded-xl"
                      />

                      {/* Name & Cohorts */}
                      <div className="min-w-0">
                        <Link
                          to={`/friends/${friendNode.friend._id}`}
                          className="text-xs sm:text-sm font-black text-white tracking-tight hover:text-primary transition-colors block truncate"
                        >
                          {friendNode.friend.name}
                        </Link>
                        <p className="text-[8px] sm:text-[9px] text-white/20 font-black uppercase tracking-widest mt-0.5 truncate">
                          {friendNode.mutualGroupsCount} Mutual Cohorts
                        </p>
                      </div>
                    </div>

                    {/* Balance and Actions */}
                    <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                      <div className="text-right">
                        <p className={`text-[11px] sm:text-sm font-black font-manrope tracking-tight ${isPositive ? 'text-white' : isNegative ? 'text-white/40' : 'text-white/10'}`}>
                          {hasBalance ? `₹${Math.abs(balance).toLocaleString()}` : 'Settled'}
                        </p>
                        {hasBalance && (
                          <p className={`text-[7px] sm:text-[8px] font-black uppercase tracking-widest mt-0.5 ${isPositive ? 'text-white/40' : 'text-white/10'}`}>
                            {isPositive ? 'Receivable' : 'Payable'}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {isNegative && (
                          <button
                            onClick={() => handleQuickSettle(friendNode)}
                            className="bg-white/5 text-white hover:bg-white hover:text-black h-8 sm:h-9 px-2 sm:px-4 rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 border border-white/10"
                          >
                            Settle
                          </button>
                        )}
                        <Link
                          to={`/friends/${friendNode.friend._id}`}
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/20 hover:text-white hover:bg-white/10 transition-all shrink-0"
                        >
                          <ChevronRight size={14} />
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
              <Avatar 
                name={selectedFriendForSettle?.friend.name}
                src={selectedFriendForSettle?.friend.avatar || selectedFriendForSettle?.friend.photoURL}
                size="lg"
                className="rounded-2xl"
              />
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
