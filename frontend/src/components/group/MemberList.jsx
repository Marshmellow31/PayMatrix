import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import Avatar from '../common/Avatar.jsx';
import Button from '../common/Button.jsx';
import groupService from '../../services/groupService.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const MemberList = ({ members = [], adminId, balances = [], groupId, onMemberRemoved, currentUserId }) => {
  const [selectedMember, setSelectedMember] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Icons from Lucide (using robust access)
  const UserMinus = Lucide.UserMinus || Lucide.Trash2;
  const X = Lucide.X || Lucide.XCircle;
  const Mail = Lucide.Mail;
  const Clock = Lucide.Clock;
  const CreditCard = Lucide.CreditCard;
  const ChevronRight = Lucide.ChevronRight;

  // De-duplicate members by user ID for visual consistency
  const uniqueMembers = [];
  const seenIds = new Set();
  
  if (Array.isArray(members)) {
    members.forEach(member => {
      const user = member.user || member;
      const userId = (user && (user._id || user)) ? (user._id || user).toString() : 'unknown';
      if (!seenIds.has(userId) && userId !== 'unknown') {
        seenIds.add(userId);
        uniqueMembers.push(member);
      }
    });
  }

  const handleRemove = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member? This will block their access to the group.')) return;
    
    setIsRemoving(true);
    try {
      await groupService.removeMember(groupId, userId);
      toast.success('Member removed successfully');
      setSelectedMember(null);
      if (onMemberRemoved) onMemberRemoved();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setIsRemoving(false);
    }
  };

  const getMemberBalance = (userId) => {
    const userIdStr = (userId && (userId._id || userId)) ? (userId._id || userId).toString() : userId?.toString();
    const balEntry = balances.find(b => {
      const balUserId = (b.user?._id || b.user)?.toString();
      return balUserId === userIdStr;
    });
    return balEntry?.balance || 0;
  };

  return (
    <div className="flex flex-col gap-2">
      {uniqueMembers.map((member) => {
        const user = member.user || member;
        const userId = user._id || user;
        const userIdStr = userId?.toString();
        const isAdmin = userIdStr === adminId?.toString();
        const balance = getMemberBalance(userId);

        return (
          <button
            key={`member-${userIdStr}`}
            onClick={() => setSelectedMember({ ...user, balance })}
            className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all group text-left w-full"
          >
            <div className="flex items-center gap-4">
              <Avatar name={user.name} src={user.avatar} size="md" className="border border-white/10" />
              <div>
                <p className="text-sm font-bold text-on-surface font-inter group-hover:text-primary transition-colors">
                  {user.name}
                  {userIdStr === currentUserId?.toString() && (
                    <span className="ml-2 text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase font-bold">You</span>
                  )}
                </p>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest opacity-60 mt-0.5 font-medium">
                  {isAdmin ? 'Group Admin' : 'Member'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className={`text-xs font-bold font-manrope ${balance > 0 ? 'text-green-400' : balance < 0 ? 'text-red-400' : 'text-on-surface-variant opacity-40'}`}>
                {balance !== 0 && (balance > 0 ? '+' : '')}
                {balance !== 0 ? formatCurrency(balance) : 'Settled'}
              </p>
              {ChevronRight && <ChevronRight size={14} className="text-on-surface-variant opacity-20 group-hover:opacity-100 transition-opacity" />}
            </div>
          </button>
        );
      })}

      {/* Member Details Overlay */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-[60] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMember(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative h-full w-full max-w-sm bg-surface-container-lowest border-l border-white/5 shadow-2xl p-8 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold font-manrope text-primary tracking-tight">Member Details</h2>
                <button 
                  onClick={() => setSelectedMember(null)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors text-on-surface-variant"
                >
                  {X && <X size={20} />}
                </button>
              </div>

              <div className="text-center mb-10">
                <Avatar name={selectedMember.name} src={selectedMember.avatar} size="xl" className="mx-auto mb-4 border-2 border-primary/20 p-1" />
                <h3 className="text-2xl font-bold font-manrope text-on-surface">{selectedMember.name}</h3>
                <p className="text-sm text-on-surface-variant font-inter opacity-60 mt-1 uppercase tracking-widest font-bold">
                  {selectedMember._id?.toString() === adminId?.toString() ? 'Group Admin' : 'Member'}
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    {Mail && <Mail size={20} />}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant opacity-40">Email Address</span>
                    <span className="text-sm text-on-surface truncate font-medium">{selectedMember.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                    {Clock && <Clock size={20} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant opacity-40">Last Active</span>
                    <span className="text-sm text-on-surface font-medium">
                      {selectedMember.updatedAt ? formatDistanceToNow(new Date(selectedMember.updatedAt), { addSuffix: true }) : 'Recently'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    {CreditCard && <CreditCard size={20} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant opacity-40">Net Position</span>
                    <span className={`text-sm font-bold ${selectedMember.balance > 0 ? 'text-green-400' : selectedMember.balance < 0 ? 'text-red-400' : 'text-on-surface'}`}>
                      {selectedMember.balance !== 0 ? formatCurrency(selectedMember.balance) : 'Fully Settled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Admin Actions */}
              {adminId?.toString() === currentUserId?.toString() && selectedMember._id?.toString() !== adminId?.toString() && (
                <div className="mt-12 pt-8 border-t border-white/5">
                  <Button
                    variant="danger"
                    className="w-full h-12 gap-2 text-sm font-bold"
                    onClick={() => handleRemove(selectedMember._id)}
                    loading={isRemoving}
                  >
                    {UserMinus && <UserMinus size={18} />}
                    Remove from Group
                  </Button>
                  <p className="mt-3 text-[10px] text-center text-on-surface-variant/40 italic px-4 font-inter">
                    Members can only be removed if their balance is fully settled.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MemberList;
