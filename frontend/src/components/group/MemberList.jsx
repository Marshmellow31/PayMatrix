import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import Avatar from '../common/Avatar.jsx';
import Button from '../common/Button.jsx';
import Modal from '../common/Modal.jsx';
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
        const user = member.user || member || {};
        const userId = user._id || user.uid || (typeof user === 'string' ? user : null);
        const userIdStr = userId?.toString();
        const isAdmin = userIdStr && adminId && userIdStr === adminId.toString();
        const balance = getMemberBalance(userId);

        const userName = user.name || (userIdStr === currentUserId?.toString() ? 'You' : 'Member');

        return (
          <button
            key={`member-${userIdStr}`}
            onClick={() => setSelectedMember({ ...user, balance, isMe: userIdStr === currentUserId?.toString() })}
            className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all group text-left w-full"
          >
            <div className="flex items-center gap-4">
              <Avatar name={user.name} src={user.avatar} size="md" className="border border-white/10" />
              <div>
                <p className="text-sm font-bold text-on-surface font-inter group-hover:text-primary transition-colors">
                  {userName}
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

      {/* Member Details Modal */}
      <Modal
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        title="Member Details"
        size="sm"
      >
        {selectedMember && (
          <div className="flex flex-col">
            <div className="text-center mb-10 pt-2">
              <div className="relative inline-block mx-auto mb-5">
                <Avatar
                  name={selectedMember.name}
                  src={selectedMember.avatar}
                  size="xl"
                  className="w-24 h-24 border border-white/10 p-1"
                />
                {selectedMember.isMe && (
                  <div className="absolute -bottom-1 -right-1 bg-[#d4d4d4] text-[#131313] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter">
                    You
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-bold font-manrope text-[#e5e2e1] tracking-tight italic-none">{selectedMember.name}</h3>
              <p className="text-[10px] text-[#919191] font-bold uppercase tracking-[0.2em] mt-1.5 font-inter">
                {selectedMember._id?.toString() === adminId?.toString() ? 'Group Admin' : 'Member'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#242424] border border-white/[0.03] transition-colors hover:border-white/5 group">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-[#919191] group-hover:text-white transition-colors">
                  {Mail && <Mail size={18} />}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] uppercase tracking-widest font-black text-[#666666] mb-0.5 font-manrope">Entity Identifier</span>
                  <span className="text-sm text-[#e3e2e2] truncate font-medium font-inter">{selectedMember.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#242424] border border-white/[0.03] transition-colors hover:border-white/5 group">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-[#919191] group-hover:text-white transition-colors">
                  {Clock && <Clock size={18} />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-widest font-black text-[#666666] mb-0.5 font-manrope">Activity Sync</span>
                  <span className="text-sm text-[#e3e2e2] font-medium font-inter">
                    {selectedMember.updatedAt ? formatDistanceToNow(new Date(selectedMember.updatedAt), { addSuffix: true }) : 'Live Action'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#242424] border border-white/[0.03] transition-colors hover:border-white/5 group">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-[#919191] group-hover:text-white transition-colors">
                  {CreditCard && <CreditCard size={18} />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-widest font-black text-[#666666] mb-0.5 font-manrope">Net Position</span>
                  <span className={`text-base font-bold font-manrope ${selectedMember.balance > 0 ? 'text-green-400' : selectedMember.balance < 0 ? 'text-red-400' : 'text-[#e5e2e1]'}`}>
                    {selectedMember.balance !== 0 ? formatCurrency(selectedMember.balance) : 'Neutral Delta'}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Actions: Blocked for Admin themself OR for the current user's own card in this view */}
            {adminId?.toString() === currentUserId?.toString() && !selectedMember.isMe && (
              <div className="mt-10 pt-8 border-t border-white/[0.02]">
                <div className="flex flex-col gap-4">
                  <Button
                    variant="danger"
                    className="w-full h-12 rounded-xl gap-2 text-[10px] font-black uppercase tracking-[0.2em] disabled:opacity-20 disabled:grayscale transition-all active:scale-95 shadow-lg border border-red-500/20"
                    onClick={() => handleRemove(selectedMember._id)}
                    loading={isRemoving}
                    disabled={Math.abs(selectedMember.balance || 0) > 0.01}
                  >
                    {Math.abs(selectedMember.balance || 0) > 0.01 ? <Lucide.Lock size={14} /> : (UserMinus && <UserMinus size={16} />)}
                    {Math.abs(selectedMember.balance || 0) > 0.01 ? 'Removal Locked' : 'Dissolve Access'}
                  </Button>

                  {Math.abs(selectedMember.balance || 0) > 0.01 && (
                    <div className="flex items-center justify-center gap-2 text-[9px] text-red-400 font-bold uppercase tracking-widest opacity-80 font-manrope">
                      <Lucide.AlertCircle size={12} />
                      <span>Settle {formatCurrency(selectedMember.balance)} for removal</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MemberList;
