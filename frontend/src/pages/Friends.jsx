import { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  Users,
  Loader2,
  ExternalLink,
  ChevronRight,
  Layers,
  Copy,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Avatar from '../components/common/Avatar';
import { onSnapshot, doc, collection, query, where } from 'firebase/firestore';
import { auth, db } from '../config/firebase.js';
import friendService from '../services/friendService';
import friendCodeService, { formatFriendCode } from '../services/friendCodeService.js';
import toast from 'react-hot-toast';
import Modal from '../components/common/Modal';

import { useFeatureFlags } from '../hooks/useFeatureFlags.js';
import LiveUpdate from '../components/common/LiveUpdate.jsx';

const successToastStyle = {
  borderRadius: '1rem',
  background: '#1a1a1a',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.1)',
};

const RELATIONSHIP_LABELS = {
  self: 'This is your own code',
  friend: 'Already connected',
  pending_incoming: 'They already sent you a request',
  pending_outgoing: 'Request already sent',
};

const Friends = () => {
  const navigate = useNavigate();
  const isActive = useLocation().pathname === '/friends';
  const groups = useSelector((state) => state.groups.groups);
  const groupsRevision = JSON.stringify(
    (groups || []).map((group) => [group._id, group.updatedAt])
  );
  const fetchRevision = useRef(0);
  const refreshTimer = useRef();
  const flags = useFeatureFlags();
  const { user } = useSelector((state) => state.auth);
  const requestSnapshots = useRef({});
  const [requestBusy, setRequestBusy] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [friends, setFriends] = useState([]);
  const [_totalSharedBalance, setTotalSharedBalance] = useState(0);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showInvite, setShowInvite] = useState(false);

  // Add-by-code state
  const [codeInput, setCodeInput] = useState('');
  const [codeLookupLoading, setCodeLookupLoading] = useState(false);
  const [codePreview, setCodePreview] = useState(null);
  const [codeError, setCodeError] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  // Quick Settle Modal State
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedFriendForSettle, setSelectedFriendForSettle] = useState(null);

  const fetchData = useCallback(async (isInitial = true) => {
    const uid = auth.currentUser?.uid;
    const revision = ++fetchRevision.current;
    try {
      if (isInitial) setIsLoading(true);
      const [analyticsRes, requestsRes] = await Promise.all([
        friendService.getNetworkAnalytics(),
        friendService.getRequests(requestSnapshots.current),
      ]);
      if (auth.currentUser?.uid !== uid || revision !== fetchRevision.current) return;
      setLoadError('');
      setFriends(analyticsRes.data.data?.networkAnalytics || []);
      setTotalSharedBalance(analyticsRes.data.data?.totalSharedBalance || 0);
      setRequests(requestsRes.data.data || { incoming: [], outgoing: [] });
    } catch (error) {
      console.error('Fetch Data Error:', error);
      if (auth.currentUser?.uid === uid && revision === fetchRevision.current)
        setLoadError('Could not refresh connections. Your saved view may be out of date.');
      // Only toast on initial error to avoid noise
      if (isInitial) toast.error('Failed to load network intelligence');
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isActive) return undefined;
    let unsubs = [];
    const schedule = () => {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(
        () => fetchData(false).finally(() => setIsLoading(false)),
        180
      );
    };
    const authUnsub = auth.onAuthStateChanged((currentUser) => {
      unsubs.forEach((unsubscribe) => unsubscribe());
      clearTimeout(refreshTimer.current);
      requestSnapshots.current = {};
      setFriends([]);
      setRequests({ incoming: [], outgoing: [] });
      if (!currentUser) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const uid = currentUser.uid;
      const failed = () => {
        toast.error('Could not refresh connections.');
        setIsLoading(false);
      };
      unsubs = [
        onSnapshot(doc(db, 'users', uid), schedule, failed),
        ...['incoming', 'outgoing'].map((direction) =>
          onSnapshot(
            query(
              collection(db, 'friendRequests'),
              where(direction === 'incoming' ? 'to' : 'from', '==', uid),
              where('status', '==', 'pending')
            ),
            (snapshot) => {
              requestSnapshots.current[direction] = snapshot;
              schedule();
            },
            failed
          )
        ),
      ];
    });
    return () => {
      fetchRevision.current += 1;
      authUnsub();
      clearTimeout(refreshTimer.current);
      unsubs.forEach((unsubscribe) => unsubscribe());
    };
  }, [fetchData, isActive]);

  useEffect(() => {
    if (!isActive) return undefined;
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(
      () => fetchData(false).finally(() => setIsLoading(false)),
      250
    );
    return () => clearTimeout(refreshTimer.current);
  }, [fetchData, groupsRevision, isActive]);

  const copyMyCode = () => {
    if (!user?.friendCode) return;
    navigator.clipboard
      .writeText(formatFriendCode(user.friendCode))
      .then(() =>
        toast.success('Code copied to clipboard', { icon: '📋', style: successToastStyle })
      )
      .catch(() => toast.error('Failed to copy code'));
  };

  const handleLookupCode = async (e) => {
    e.preventDefault();
    if (!codeInput.trim()) return;
    setCodeError('');
    setCodePreview(null);
    setCodeLookupLoading(true);
    try {
      const res = await friendCodeService.lookupFriendCode(codeInput);
      setCodePreview(res.data.data);
    } catch (error) {
      setCodeError(error.message || 'Code not found');
    } finally {
      setCodeLookupLoading(false);
    }
  };

  const handleSendRequestByCode = async () => {
    if (!codePreview?.uid) return;
    setSendingRequest(true);
    try {
      const result = await friendService.sendRequest(codePreview.uid);
      toast.success(
        result.data.data?.alreadyPending
          ? 'Connection request is already pending'
          : 'Connection request sent'
      );
      setCodePreview(null);
      setCodeInput('');
      fetchData();
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      toast.error(message || 'Could not send the request. Check your connection and try again.');
    } finally {
      setSendingRequest(false);
    }
  };

  const respondToRequest = async (requestId, status) => {
    if (requestBusy) return;
    setRequestBusy(requestId);
    try {
      if (status === 'cancelled') await friendService.cancelRequest(requestId);
      else await friendService.respondToRequest(requestId, status);
      toast.success(
        status === 'accepted'
          ? 'Friend added'
          : status === 'cancelled'
            ? 'Request cancelled'
            : 'Request declined'
      );
    } catch (error) {
      toast.error(error.message || 'Action failed');
    } finally {
      setRequestBusy(null);
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
        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Loading Friends</p>
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
            <h1 className="text-xl font-black font-manrope text-white tracking-tight uppercase leading-none">
              Friends
            </h1>
            <p className="text-[10px] font-black font-manrope tracking-[0.4em] text-white/20 uppercase">
              Social Matrix v3.1
            </p>
          </div>
          {flags.friendRequests && (
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
          )}
        </div>

        <AnimatePresence>
          {showInvite && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="bg-surface-container-low border border-white/5 rounded-2xl sm:rounded-[2.5rem] p-1 sm:p-2 shadow-2xl relative overflow-hidden w-full"
            >
              <div className="p-4 sm:p-10 flex flex-col gap-8 w-full max-w-full overflow-hidden">
                {/* Your Code */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="text-base sm:text-xl font-black text-white font-manrope tracking-tight leading-none italic uppercase">
                      Your Code
                    </h3>
                    <p className="text-[9px] sm:text-xs text-white/30 font-bold uppercase tracking-[0.3em] leading-relaxed">
                      Share this so others can add you
                    </p>
                  </div>
                  {user?.friendCode ? (
                    <button
                      onClick={copyMyCode}
                      className="w-full flex items-center justify-between gap-4 px-6 py-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all active:scale-[0.99]"
                    >
                      <span className="text-xl sm:text-2xl font-black font-manrope text-white tracking-[0.2em]">
                        {formatFriendCode(user.friendCode)}
                      </span>
                      <Copy size={18} className="text-white/40 shrink-0" />
                    </button>
                  ) : (
                    <div className="w-full px-6 py-5 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
                        Generating your code…
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-white/10">
                    <ShieldCheck size={14} className="text-primary shrink-0" />
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-50">
                      Peer-to-peer validation active
                    </p>
                  </div>
                </div>

                <div className="h-px bg-white/5" />

                {/* Add by code */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="text-base sm:text-xl font-black text-white font-manrope tracking-tight leading-none italic uppercase">
                      Add By Code
                    </h3>
                    <p className="text-[9px] sm:text-xs text-white/30 font-bold uppercase tracking-[0.3em] leading-relaxed">
                      Enter a friend&apos;s code to connect
                    </p>
                  </div>
                  <form onSubmit={handleLookupCode} className="flex flex-col sm:flex-row gap-3">
                    <input
                      value={codeInput}
                      onChange={(e) => {
                        setCodeInput(e.target.value.toUpperCase());
                        setCodeError('');
                        setCodePreview(null);
                      }}
                      placeholder="XXXXXXXX"
                      className="input-field flex-1 uppercase tracking-[0.15em] font-manrope font-bold"
                    />
                    <button
                      type="submit"
                      disabled={codeLookupLoading || !codeInput.trim()}
                      className="h-14 sm:h-auto px-6 rounded-2xl bg-white text-black hover:bg-neutral-200 active:scale-95 transition-all font-manrope font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shrink-0 disabled:opacity-40"
                    >
                      {codeLookupLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Search size={16} strokeWidth={3} />
                      )}
                      Find
                    </button>
                  </form>

                  {codeError && (
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                      {codeError}
                    </p>
                  )}

                  {codePreview && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4"
                    >
                      <div className="flex w-full min-w-0 items-center gap-4">
                        <Avatar name={codePreview.name} src={codePreview.avatar} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="font-manrope text-sm font-bold leading-snug text-white">
                            {codePreview.name || 'Member'}
                          </p>
                          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-white/30">
                            {RELATIONSHIP_LABELS[codePreview.status] || 'Not yet connected'}
                          </p>
                        </div>
                      </div>
                      {codePreview.status === 'none' && (
                        <button
                          type="button"
                          onClick={handleSendRequestByCode}
                          disabled={sendingRequest}
                          className="flex h-11 w-full items-center justify-center rounded-xl bg-white px-5 text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-white/5 transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-50"
                        >
                          {sendingRequest ? 'Connecting…' : 'Connect'}
                        </button>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Tabs Menu */}
      <div className="flex gap-4 sm:gap-8 border-b border-white/5 px-1 sm:px-2 overflow-x-auto no-scrollbar whitespace-nowrap">
        {[
          { id: 'all', label: 'Friends', count: friends.length },
          { id: 'pending', label: 'Requests', count: requests.incoming.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative group ${
              activeTab === tab.id ? 'text-white' : 'text-white/20 hover:text-white/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`${tab.id === 'pending' && tab.count > 0 ? 'text-primary/90 font-black' : ''}`}
              >
                {tab.label}
              </span>
              <span
                className={`text-[8px] px-2 py-0.5 rounded-lg border font-black transition-all duration-300 ${
                  tab.id === 'pending' && tab.count > 0
                    ? 'bg-primary text-on-primary border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)] animate-pulse'
                    : activeTab === tab.id
                      ? 'bg-white/10 text-white border-white/20'
                      : 'bg-transparent text-white/10 border-white/5 group-hover:border-white/10'
                }`}
              >
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

      {loadError && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-white/10 p-3 text-sm text-white/70"
        >
          <p className="flex-1">{loadError}</p>
          <button
            type="button"
            onClick={() => fetchData(false)}
            className="min-h-11 px-3 text-white underline"
          >
            Retry
          </button>
        </div>
      )}
      <div className="space-y-6">
        {activeTab === 'pending' && (
          <div className="space-y-6">
            {['incoming', 'outgoing'].map((direction) => (
              <section key={direction} aria-label={`${direction} requests`}>
                <h2 className="mb-3 text-sm font-semibold text-white/80">
                  {direction === 'incoming' ? 'Incoming' : 'Outgoing'}{' '}
                  <span className="ml-2 text-white/50">{requests[direction].length}</span>
                </h2>
                <div className="space-y-3">
                  {requests[direction].length === 0 && (
                    <p className="rounded-2xl border border-white/10 px-4 py-6 text-sm text-white/60">
                      No {direction} requests.
                    </p>
                  )}
                  {requests[direction].map((req) => {
                    const person = direction === 'incoming' ? req.from : req.to;
                    return (
                      <div
                        key={req._id}
                        className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/5 bg-surface-container-high/40 p-3 sm:p-4"
                      >
                        <Avatar
                          name={person?.name}
                          src={person?.avatar}
                          size="md"
                          className="rounded-xl"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">
                            {person?.name || 'Member'}
                          </p>
                          <p className="mt-1 text-xs text-white/60">
                            {direction === 'incoming' ? 'Wants to connect' : 'Awaiting a response'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {direction === 'incoming' && (
                            <button
                              disabled={!!requestBusy}
                              onClick={() => respondToRequest(req._id, 'accepted')}
                              className="min-h-11 rounded-xl bg-white px-3 text-xs font-semibold text-black disabled:opacity-50"
                            >
                              Accept
                            </button>
                          )}
                          <button
                            disabled={!!requestBusy}
                            onClick={() =>
                              respondToRequest(
                                req._id,
                                direction === 'incoming' ? 'declined' : 'cancelled'
                              )
                            }
                            className="min-h-11 rounded-xl border border-white/10 px-3 text-xs font-medium text-white/75 hover:bg-white/5 disabled:opacity-50"
                          >
                            {requestBusy === req._id
                              ? 'Saving…'
                              : direction === 'incoming'
                                ? 'Decline'
                                : 'Cancel request'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {activeTab === 'all' && (
          <div className="flex flex-col gap-3">
            {friends.length === 0 ? (
              <div className="col-span-full py-32 text-center border border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
                <Users size={48} className="mx-auto mb-6 text-white/5" />
                <p className="text-white/20 font-black uppercase tracking-[0.5em] text-[10px]">
                  No friends added yet
                </p>
              </div>
            ) : (
              friends.map((friendNode, index) => {
                const balance = friendNode.netBalance;
                const isPositive = balance > 0;
                const isNegative = balance < 0;
                const hasBalance = balance !== 0;

                return (
                  <LiveUpdate
                    key={friendNode.friend._id}
                    value={`${friendNode.netBalance}:${friendNode.mutualGroupsCount}:${friendNode.friend.name || ''}`}
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="group relative bg-surface-container-high/40 border border-white/5 p-3 sm:p-4 rounded-2xl hover:bg-surface-container-high hover:border-white/10 transition-all duration-300 flex items-center justify-between gap-2 sm:gap-4 overflow-hidden"
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        {/* Avatar */}
                        <Avatar
                          name={friendNode.friend.name}
                          src={friendNode.friend.avatar}
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
                            {friendNode.mutualGroupsCount} Shared Groups
                          </p>
                        </div>
                      </div>

                      {/* Balance and Actions */}
                      <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                        <div className="text-right">
                          <p
                            className={`text-[11px] sm:text-sm font-black font-manrope tracking-tight ${isPositive ? 'text-white' : isNegative ? 'text-white/40' : 'text-white/10'}`}
                          >
                            {hasBalance ? `₹${Math.abs(balance).toLocaleString()}` : 'Settled'}
                          </p>
                          {hasBalance && (
                            <p
                              className={`text-[7px] sm:text-[8px] font-black uppercase tracking-widest mt-0.5 ${isPositive ? 'text-white/40' : 'text-white/10'}`}
                            >
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
                  </LiveUpdate>
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
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">
              Counterparty
            </p>
            <div className="flex items-center gap-4">
              <Avatar
                name={selectedFriendForSettle?.friend.name}
                src={selectedFriendForSettle?.friend.avatar}
                size="lg"
                className="rounded-2xl"
              />
              <div>
                <p className="text-lg font-black text-white font-manrope">
                  {selectedFriendForSettle?.friend.name}
                </p>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                  Global Debt: ₹{Math.abs(selectedFriendForSettle?.netBalance || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] px-2">
              Select Group to Settle
            </p>
            <div className="space-y-2">
              {selectedFriendForSettle?.mutualGroups
                .filter((g) => g.balance < 0)
                .map((group) => (
                  <button
                    key={group.id}
                    onClick={() =>
                      navigate(
                        `/groups/${group.id}?settle=true&with=${selectedFriendForSettle.friend._id}`
                      )
                    }
                    className="w-full p-5 rounded-2xl bg-white/[0.04] border border-white/5 hover:bg-white/[0.08] hover:border-white/20 flex items-center justify-between group/btn transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/20 group-hover/btn:text-white transition-colors">
                        <Layers size={18} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-white uppercase tracking-wider">
                          {group.name || group.title}
                        </p>
                        <p className="text-[10px] text-white/20 font-bold tracking-widest">
                          LOCAL DEBT: ₹{Math.abs(group.balance).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <ExternalLink
                      size={16}
                      className="text-white/10 group-hover/btn:text-white transition-colors"
                    />
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
