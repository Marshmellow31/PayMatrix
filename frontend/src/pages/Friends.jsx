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

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [analyticsRes, requestsRes] = await Promise.all([
        friendService.getNetworkAnalytics(),
        friendService.getRequests()
      ]);
      setFriends(analyticsRes.data.data?.networkAnalytics || []);
      setTotalSharedBalance(analyticsRes.data.data?.totalSharedBalance || 0);
      setRequests(requestsRes.data.data || { incoming: [], outgoing: [] });
    } catch (error) {
      toast.error('Failed to load network intelligence');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
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
      const users = res.data.data.users;
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

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 text-white/20">
        <Loader2 className="w-12 h-12 animate-spin" strokeWidth={1.5} />
        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Optimizing Network Nodes</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-32 space-y-12">
      
      {/* Header & Global Position */}
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black font-manrope tracking-tighter text-white italic">Network</h1>
            <p className="text-[11px] text-white/30 font-black uppercase tracking-[0.3em]">Institutionalized Connections</p>
          </div>
          
          <div className="glass-card px-6 py-4 flex flex-col items-end border-white/10">
            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Collective Net Position</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black font-manrope ${totalSharedBalance >= 0 ? 'text-white' : 'text-white/40'}`}>
                ₹{Math.abs(totalSharedBalance).toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-white/20 uppercase">
                {totalSharedBalance >= 0 ? 'Surplus' : 'Payable'}
              </span>
            </div>
          </div>
        </div>

        {/* Search Matrix */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-white/20 group-focus-within:text-white transition-colors">
            <Search size={20} />
          </div>
          <input 
            type="text"
            placeholder="Scan name or digital sign (email)..."
            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white font-manrope font-bold placeholder:text-white/10 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
            value={searchQuery}
            onChange={handleSearch}
          />
          
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 right-0 mt-3 bg-[#0D0D0D] border border-white/10 rounded-3xl p-3 z-50 shadow-[0_30px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl overflow-hidden"
              >
                {searchResults.map((user) => {
                  const status = searchStatus[user._id] || 'none';
                  return (
                    <div key={user._id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/[0.03] transition-colors group/item">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center font-black text-white/20 group-hover/item:text-white transition-colors uppercase">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-white">{user.name}</p>
                          <p className="text-[10px] text-white/30 uppercase tracking-widest">{user.email}</p>
                        </div>
                      </div>
                      
                      {status === 'friend' ? (
                        <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black text-white/40 uppercase tracking-widest">Connected</span>
                      ) : status === 'pending_outgoing' ? (
                        <span className="px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/5 text-[9px] font-black text-white/20 uppercase tracking-widest italic">Signal Sent</span>
                      ) : status === 'pending_incoming' ? (
                        <button 
                          onClick={() => setActiveTab('pending')}
                          className="px-3 py-1.5 rounded-lg bg-white text-black text-[9px] font-black uppercase tracking-widest"
                        >Action Required</button>
                      ) : (
                        <button 
                          onClick={() => sendRequest(user._id)}
                          className="p-3 rounded-xl bg-white text-black hover:bg-white/90 active:scale-95 transition-all"
                        >
                          <UserPlus size={18} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Persistence Tabs */}
      <div className="flex gap-8 border-b border-white/5 px-2">
        {[
          { id: 'all', label: 'Nodes', count: friends.length },
          { id: 'pending', label: 'Signals', count: requests.incoming.length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-5 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative ${
              activeTab === tab.id ? 'text-white' : 'text-white/20 hover:text-white/40'
            }`}
          >
            {tab.label} <span className="opacity-40">[{tab.count}]</span>
            {activeTab === tab.id && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full" />
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
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-between glass-card p-6 border-white/10"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                    <UserIcon size={24} />
                  </div>
                  <div>
                    <p className="text-base font-black text-white font-manrope">{req.from?.name || 'Inbound User'}</p>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">Requesting Entry</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => respondToRequest(req._id, 'accepted')}
                    className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center hover:bg-white/90 active:scale-95 transition-all shadow-xl shadow-white/10"
                  >
                    <Check size={20} strokeWidth={3} />
                  </button>
                  <button 
                    onClick={() => respondToRequest(req._id, 'declined')}
                    className="w-12 h-12 rounded-2xl bg-white/5 text-white/40 border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
                  >
                    <X size={20} strokeWidth={2} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'all' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {friends.length === 0 ? (
              <div className="col-span-full py-40 text-center border border-dashed border-white/10 rounded-[3rem] bg-white/[0.01]">
                <Users size={48} className="mx-auto mb-6 text-white/5" />
                <p className="text-white/20 font-black uppercase tracking-[0.5em] text-[10px]">Your financial vault is solitary</p>
              </div>
            ) : (
              friends.map((friendNode) => {
                const balance = friendNode.netBalance;
                const isPositive = balance > 0;
                const isNegative = balance < 0;
                const hasBalance = balance !== 0;

                return (
                  <motion.div 
                    key={friendNode.friend._id}
                    className="group glass-card p-6 hover:bg-white/[0.06] hover:border-white/20 transition-all duration-500 overflow-hidden relative"
                  >
                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-[1.25rem] bg-white text-black flex items-center justify-center text-xl font-black font-manrope shadow-2xl group-hover:scale-105 transition-transform">
                          {friendNode.friend.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-lg font-black text-white font-manrope leading-tight">{friendNode.friend.name}</p>
                          <div className="flex items-center gap-2">
                             <div className={`w-1 h-1 rounded-full ${friendNode.totalTurnover > 1000 ? 'bg-white' : 'bg-white/20'}`} />
                             <p className="text-[9px] text-white/30 font-black uppercase tracking-widest">
                               {friendNode.mutualGroupsCount} Mutual Cohorts
                             </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end text-right">
                         <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Shared Position</p>
                         <p className={`text-lg font-extrabold font-manrope leading-none ${isPositive ? 'text-white' : isNegative ? 'text-white/40' : 'text-white/20'}`}>
                           {hasBalance ? `₹${Math.abs(balance).toLocaleString()}` : '--'}
                         </p>
                         <p className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1.5 ${isPositive ? 'text-white/40' : 'text-white/10'}`}>
                           {isPositive ? 'Receivable' : isNegative ? 'Payable' : 'Settled'}
                         </p>
                      </div>
                    </div>
                    
                    {/* Activity Metric / Turnover */}
                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp size={10} className="text-white/30" />
                          <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Transaction Volume</p>
                        </div>
                        <p className="text-xs font-black text-white/60 tracking-wider">₹{friendNode.totalTurnover.toLocaleString()}</p>
                      </div>
                      
                      <div className="flex gap-2">
                        {isNegative && (
                          <button 
                            onClick={() => handleQuickSettle(friendNode)}
                            className="bg-white text-black px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/90 active:scale-95 transition-all shadow-xl shadow-white/5"
                          >
                            Settle
                          </button>
                        )}
                        <Link 
                          to={`/profile/${friendNode.friend._id}`}
                          className="p-3 rounded-xl bg-white/5 border border-white/5 text-white/20 group-hover:text-white group-hover:bg-white/10 group-hover:border-white/20 transition-all"
                        >
                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    </div>
                    
                    {/* Decorative Background Element */}
                    <div className="absolute -right-4 -bottom-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                      <Sparkles size={80} strokeWidth={1} />
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
