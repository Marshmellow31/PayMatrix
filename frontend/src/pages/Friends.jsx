import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, 
  Search, 
  Check, 
  X, 
  Users, 
  ArrowRight, 
  TrendingUp,
  Loader2,
  User as UserIcon,
  Clock
} from 'lucide-react';
import friendService from '../services/friendService';
import toast from 'react-hot-toast';

const Friends = () => {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [friendsRes, requestsRes] = await Promise.all([
        friendService.getFriends(),
        friendService.getRequests()
      ]);
      setFriends(friendsRes.data.data?.friends || []);
      setRequests(requestsRes.data.data || { incoming: [], outgoing: [] });
    } catch (error) {
      toast.error('Failed to load friends network');
    } finally {
      setIsLoading(false);
    }
  };

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
      setSearchResults(res.data.data.users);
    } catch (error) {
      // Quiet fail for search
    } finally {
      setIsSearching(false);
    }
  };

  const sendRequest = async (userId) => {
    try {
      await friendService.sendRequest(userId);
      toast.success('Interest established');
      setSearchQuery('');
      setSearchResults([]);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Connection failed');
    }
  };

  const respondToRequest = async (requestId, status) => {
    try {
      await friendService.respondToRequest(requestId, status);
      toast.success(status === 'accepted' ? 'Connection bridged' : 'Request dissolved');
      fetchData();
    } catch (error) {
      toast.error('Action failed');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-white/20 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-32 space-y-10">
      {/* Search Header */}
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black font-manrope tracking-tighter text-white">Network</h1>
          <p className="text-[11px] text-white/30 font-bold uppercase tracking-[0.2em]">Manage your financial circle</p>
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-white/20 group-focus-within:text-white transition-colors">
            <Search size={20} />
          </div>
          <input 
            type="text"
            placeholder="Search by name or email..."
            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white font-manrope font-bold placeholder:text-white/10 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all shadow-2xl"
            value={searchQuery}
            onChange={handleSearch}
          />
          
          {/* Instant Search Results */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 right-0 mt-3 bg-[#0A0A0A] border border-white/10 rounded-2xl p-2 z-50 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl"
              >
                {searchResults.map((user) => (
                  <div key={user._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.05] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center font-black text-white/40">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{user.name}</p>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">{user.email}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => sendRequest(user._id)}
                      className="p-2.5 rounded-lg bg-white text-black hover:bg-white/90 active:scale-95 transition-all"
                    >
                      <UserPlus size={18} />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tabs / Filter */}
      <div className="flex gap-4 border-b border-white/5 pb-1">
        {[
          { id: 'all', label: 'Friends', count: friends?.length || 0 },
          { id: 'pending', label: 'Pending', count: (requests?.incoming?.length || 0) + (requests?.outgoing?.length || 0) }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-4 px-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${
              activeTab === tab.id ? 'text-white' : 'text-white/20 hover:text-white/40'
            }`}
          >
            {tab.label} ({tab.count})
            {activeTab === tab.id && (
              <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
            )}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {activeTab === 'pending' && (
          <div className="space-y-3">
          {(requests?.incoming?.length || 0) === 0 && (requests?.outgoing?.length || 0) === 0 && (
              <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl">
                <p className="text-sm text-white/10 font-bold uppercase tracking-widest">No pending bridge requests</p>
              </div>
            )}
            
            {requests?.incoming?.map((req) => (
              <motion.div 
                key={req._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between bg-white/[0.03] border border-white/10 p-5 rounded-2xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/20">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{req.from?.name || 'Unknown'}</p>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.1em]">Signal Incoming</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => respondToRequest(req._id, 'accepted')}
                    className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center hover:bg-white/90 active:scale-95 transition-all"
                  >
                    <Check size={18} />
                  </button>
                  <button 
                    onClick={() => respondToRequest(req._id, 'declined')}
                    className="w-10 h-10 rounded-xl bg-white/5 text-white/40 border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'all' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {friends.length === 0 ? (
              <div className="col-span-2 py-32 text-center border border-dashed border-white/10 rounded-[3rem] bg-white/[0.01]">
                <Users size={40} className="mx-auto mb-6 text-white/5" />
                <p className="text-white/20 font-black uppercase tracking-[0.3em] text-xs">Your circle is quiet</p>
              </div>
            ) : (
              friends.map((friend) => (
                <motion.div 
                  key={friend._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="group relative p-5 rounded-3xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center text-lg font-black font-manrope">
                      {friend.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-base font-black text-white font-manrope">{friend.name}</p>
                      <div className="flex items-center gap-2">
                         <div className="w-1 h-1 rounded-full bg-white/20" />
                         <p className="text-[10px] text-white/20 font-bold uppercase tracking-wider">Verified Contact</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 flex items-end justify-between">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Global Sync</p>
                      <p className="text-lg font-black font-manrope text-white/60 group-hover:text-white transition-colors leading-none">
                        Active
                      </p>
                    </div>
                    <button className="p-3 rounded-full bg-white/5 border border-white/5 text-white/20 group-hover:text-white group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Friends;
