import { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { Hash, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal.jsx';
import { EXPENSE_CATEGORIES } from '../../utils/constants.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import logService from '../../services/logService.js';
import { auth } from '../../config/firebase.js';

const PickTransactionModal = ({ isOpen, onClose, onSaved, groupId, existingEntries = [] }) => {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    logService
      .getMyExpenseShares()
      .then((res) => setShares(res.data.data.shares || []))
      .catch(() => setShares([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const addedIds = new Set(existingEntries.filter((e) => e.type === 'expense').map((e) => e._id));

  const handleAdd = async (share) => {
    const uid = auth.currentUser?.uid;
    const entryId = `exp_${uid}_${share.sourceGroupId}_${share.sourceExpenseId}`;
    setAddingId(entryId);
    try {
      await logService.addExpenseEntry(groupId, share);
      toast.success('Entry added');
      onSaved?.();
    } catch (err) {
      toast.error(err.message || 'Failed to add entry');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="From Transaction">
      <div className="space-y-2">
        {loading ? (
          <div className="py-10 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : shares.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
            <p className="text-sm text-white/30 font-inter">No expenses found in your groups.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {shares.map((share) => {
              const uid = auth.currentUser?.uid;
              const entryId = `exp_${uid}_${share.sourceGroupId}_${share.sourceExpenseId}`;
              const isAdded = addedIds.has(entryId);
              const cat = EXPENSE_CATEGORIES.find((c) => c.value === share.category);
              const IconComp = cat?.icon ? LucideIcons[cat.icon] || Hash : Hash;

              return (
                <div
                  key={entryId}
                  className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10 bg-white/5"
                      style={{ color: cat?.color || '#919191' }}
                    >
                      <IconComp size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white font-manrope truncate">
                        {share.title}
                      </p>
                      <p className="text-[9px] text-white/30 font-black uppercase tracking-widest truncate">
                        {share.sourceGroupName} · {formatCurrency(share.amount)}
                      </p>
                    </div>
                  </div>

                  {isAdded ? (
                    <span className="flex items-center gap-1.5 text-[9px] font-black text-emerald-400/80 uppercase tracking-widest shrink-0">
                      <Check size={12} strokeWidth={3} /> Added
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAdd(share)}
                      disabled={addingId === entryId}
                      className="h-9 px-4 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-white/90 active:scale-95 transition-all shrink-0 disabled:opacity-50"
                    >
                      {addingId === entryId ? 'Adding…' : 'Add'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PickTransactionModal;
