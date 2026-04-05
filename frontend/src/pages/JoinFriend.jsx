import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, 
  Check, 
  X, 
  Loader2, 
  ShieldCheck, 
  Zap, 
  Users,
  ArrowLeft
} from 'lucide-react';
import { auth } from '../config/firebase.js';
import friendService from '../services/friendService';
import Avatar from '../components/common/Avatar';
import toast from 'react-hot-toast';

const JoinFriend = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviterId = searchParams.get('uid');
  
  const [inviter, setInviter] = useState(null);
  const [status, setStatus] = useState('loading'); // loading, error, self, friend, pending_incoming, pending_outgoing, none
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchInviter = async () => {
      if (!inviterId) {
        setStatus('error');
        return;
      }

      try {
        const currentUser = auth.currentUser;
        if (currentUser && (currentUser.uid === inviterId)) {
          setStatus('self');
          return;
        }

        const [userRes, relRes] = await Promise.all([
          friendService.getUser(inviterId),
          friendService.checkRelationship(inviterId)
        ]);

        setInviter(userRes.data.data);
        setStatus(relRes.data.data.status);
      } catch (error) {
        console.error("Join Error:", error);
        setStatus('error');
      }
    };

    const authUnsub = auth.onAuthStateChanged((user) => {
      if (user) {
        // Clear stored invite since we're now authenticated and on the page
        localStorage.removeItem('pendingFriendInvite');
        fetchInviter();
      } else {
        // Save the friend invite path so the user returns here after login
        if (inviterId) {
          localStorage.setItem('pendingFriendInvite', inviterId);
        }
        setStatus('login_required');
      }
    });

    return () => authUnsub();
  }, [inviterId]);

  const handleConnect = async () => {
    try {
      setIsProcessing(true);
      await friendService.sendRequest(inviterId);
      toast.success('Connection request broadcasted', {
        icon: '📡',
        style: {
          borderRadius: '1rem',
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)'
        }
      });
      setStatus('pending_outgoing');
    } catch (error) {
      toast.error('Transmission failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className="flex flex-col items-center justify-center gap-6 py-20">
          <Loader2 className="w-12 h-12 animate-spin text-primary" strokeWidth={1.5} />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Decrypting Invite Node</p>
        </div>
      );
    }

    if (status === 'error' || !inviter) {
      return (
        <div className="text-center py-20 space-y-6">
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-[2rem] flex items-center justify-center mx-auto">
            <X size={32} className="text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Signal Lost</h2>
            <p className="text-xs text-white/30 font-medium">This invite link is invalid or has expired.</p>
          </div>
          <button 
            onClick={() => navigate('/friends')}
            className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
          >
            Return to Matrix
          </button>
        </div>
      );
    }

    if (status === 'login_required') {
        return (
          <div className="text-center py-20 space-y-8">
            <ShieldCheck size={48} className="mx-auto text-primary animate-pulse" />
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Identity Required</h2>
              <p className="text-xs text-white/30 font-medium px-10">You must be logged into the Social Matrix to accept connections.</p>
            </div>
            <button 
              onClick={() => navigate('/login', { state: { from: `/join-friend?uid=${inviterId}` } })}
              className="w-full max-w-xs py-5 bg-white text-black rounded-3xl text-sm font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all mx-auto"
            >
              Initialize Identity
            </button>
          </div>
        );
      }

    return (
      <div className="space-y-10">
        <div className="relative group">
          <div className="absolute -inset-10 bg-primary/20 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          
          <div className="relative bg-surface-container-low border border-white/5 rounded-[3rem] p-8 sm:p-12 shadow-2xl text-center space-y-8">
            <div className="relative inline-block">
              <div className="absolute -inset-4 bg-white/5 blur-xl rounded-full" />
              <Avatar 
                src={inviter.avatar} 
                name={inviter.name} 
                className="w-24 h-24 sm:w-32 sm:h-32 text-4xl border-4 border-black shadow-2xl relative"
              />
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-black border border-white/10 rounded-2xl flex items-center justify-center text-primary shadow-xl">
                <Zap size={20} fill="currentColor" />
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-black text-white font-manrope tracking-tight leading-tight">
                {inviter.name}
              </h1>
              <div className="flex items-center justify-center gap-2 text-white/20">
                <Users size={14} />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Network Invitation</p>
              </div>
            </div>

            <div className="pt-4">
              <AnimatePresence mode="wait">
                {status === 'friend' ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="w-full py-5 bg-white/5 border border-white/10 rounded-[2rem] text-white/40 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3">
                      <Check size={16} className="text-primary" />
                      Node Already Connected
                    </div>
                    <button 
                      onClick={() => navigate('/friends')}
                      className="text-[10px] font-black text-white/20 uppercase tracking-widest hover:text-white transition-colors"
                    >
                      Go to Contacts
                    </button>
                  </motion.div>
                ) : status === 'pending_outgoing' ? (
                  <div className="w-full py-5 bg-white/5 border border-white/10 rounded-[2rem] text-white/40 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
                    Signal Broadcasted...
                  </div>
                ) : status === 'pending_incoming' ? (
                  <button
                    onClick={() => navigate('/friends?tab=pending')}
                    className="w-full py-5 bg-primary text-black rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    Resolve Incoming Signal
                  </button>
                ) : status === 'self' ? (
                    <div className="w-full py-5 bg-white/5 border border-white/10 rounded-[2rem] text-white/20 text-[10px] font-black uppercase tracking-widest">
                      Your Own Neural Node
                    </div>
                  ) : (
                  <button
                    onClick={handleConnect}
                    disabled={isProcessing}
                    className="w-full py-6 bg-white text-black rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <UserPlus size={20} strokeWidth={3} />
                        Establish Connection
                      </>
                    )}
                  </button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 text-white/10">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/5" />
          <p className="text-[9px] font-bold uppercase tracking-[0.5em] whitespace-nowrap">Encrypted Invitation Protocol v4</p>
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/5" />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 sm:p-12 pb-32">
      <div className="w-full max-w-md">
        <button 
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-3 text-white/20 hover:text-white transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10">
            <ArrowLeft size={18} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Abort Join</span>
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default JoinFriend;
