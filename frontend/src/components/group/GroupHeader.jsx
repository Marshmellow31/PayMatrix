import {
  Copy,
  Hash,
  Lock,
  Plus,
  ScanLine,
  Settings,
  Share2,
  Trash2,
  UserPlus,
  WalletCards,
} from 'lucide-react';
import { getGroupCategoryMeta } from '../../utils/iconMap.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import Button from '../common/Button.jsx';
import toast from 'react-hot-toast';

const GroupHeader = ({
  activeGroup,
  isAdmin,
  myBalance,
  onOpenAddExpense,
  onOpenScanBill,
  onOpenSettleUp,
  onOpenAddMember,
  onOpenEditGroup,
  onOpenLeaveGroup,
  onOpenDeleteGroup,
  billScanningEnabled,
}) => {
  const categoryMeta = getGroupCategoryMeta(
    activeGroup?.category,
    activeGroup?.name || activeGroup?.title
  );
  const IconComponent = categoryMeta.IconComponent || Hash;

  const copyInviteCode = () => {
    if (activeGroup?.inviteCode) {
      navigator.clipboard.writeText(activeGroup.inviteCode);
      toast.success('Invite code copied to clipboard!');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner / Info Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white/[0.03] border border-white/5 relative overflow-hidden backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-all shadow-lg"
            style={{
              backgroundColor: `${categoryMeta.color}18`,
              borderColor: `${categoryMeta.color}30`,
              color: categoryMeta.color,
            }}
          >
            <IconComponent size={28} />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black font-manrope text-white tracking-tight truncate">
                {activeGroup?.name || activeGroup?.title || 'Group'}
              </h1>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5"
                style={{
                  backgroundColor: `${categoryMeta.color}12`,
                  borderColor: `${categoryMeta.color}25`,
                  color: categoryMeta.color,
                }}
              >
                <IconComponent size={10} />
                <span>{categoryMeta.label}</span>
              </span>
            </div>
            <p className="text-xs text-white/40 font-inter mt-0.5">
              {activeGroup?.members?.length || 0} members · Created by {isAdmin ? 'You' : 'Admin'}
            </p>
          </div>
        </div>

        {/* Action buttons on top right */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {activeGroup?.inviteCode && (
            <button
              onClick={copyInviteCode}
              title="Copy Invite Code"
              className="h-10 px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 text-xs font-mono font-bold text-white/80 flex items-center gap-2 transition-all active:scale-95"
            >
              <Share2 size={13} className="text-primary" />
              <span>{activeGroup.inviteCode}</span>
              <Copy size={12} className="text-white/40" />
            </button>
          )}

          <Button
            variant="ghost"
            onClick={onOpenAddMember}
            className="h-10 px-3 text-xs border border-white/5 flex items-center gap-1.5"
          >
            <UserPlus size={14} />
            <span>Invite</span>
          </Button>

          {isAdmin ? (
            <>
              <button
                onClick={onOpenEditGroup}
                title="Edit Group"
                className="w-10 h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 text-white/60 hover:text-white flex items-center justify-center transition-all active:scale-95"
              >
                <Settings size={15} />
              </button>
              <button
                onClick={onOpenDeleteGroup}
                title="Delete Group"
                className="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 flex items-center justify-center transition-all active:scale-95"
              >
                <Trash2 size={15} />
              </button>
            </>
          ) : (
            <button
              onClick={onOpenLeaveGroup}
              title="Leave Group"
              className="h-10 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 text-xs text-white/60 hover:text-red-400 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Lock size={13} />
              <span>Leave</span>
            </button>
          )}
        </div>
      </div>

      {/* Balance Summary & Primary Actions Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Balance Status */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 font-inter">
            Your Group Balance
          </p>
          <div className="my-2">
            {myBalance > 0.01 ? (
              <div>
                <p className="text-2xl sm:text-3xl font-black font-manrope text-emerald-400">
                  +{formatCurrency(myBalance)}
                </p>
                <p className="text-xs text-emerald-400/70 font-inter mt-0.5">
                  You are owed in this group
                </p>
              </div>
            ) : myBalance < -0.01 ? (
              <div>
                <p className="text-2xl sm:text-3xl font-black font-manrope text-amber-400">
                  -{formatCurrency(Math.abs(myBalance))}
                </p>
                <p className="text-xs text-amber-400/70 font-inter mt-0.5">You owe in this group</p>
              </div>
            ) : (
              <div>
                <p className="text-2xl sm:text-3xl font-black font-manrope text-white/90">
                  {formatCurrency(0)}
                </p>
                <p className="text-xs text-white/40 font-inter mt-0.5">You are all settled up</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 justify-center">
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              onClick={onOpenAddExpense}
              className="h-12 text-xs font-bold font-manrope tracking-wider uppercase flex items-center justify-center gap-2 bg-white text-black hover:bg-white/90"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Add Expense</span>
            </Button>

            {billScanningEnabled && (
              <Button
                variant="ghost"
                onClick={onOpenScanBill}
                className="h-12 text-xs font-bold font-manrope tracking-wider uppercase flex items-center justify-center gap-2 border border-white/10 hover:bg-white/[0.05]"
              >
                <ScanLine size={16} className="text-primary" />
                <span>Scan Bill</span>
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            onClick={onOpenSettleUp}
            className="h-11 text-xs font-bold font-manrope tracking-wider uppercase flex items-center justify-center gap-2 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20"
          >
            <WalletCards size={16} />
            <span>Settle Up</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GroupHeader;
