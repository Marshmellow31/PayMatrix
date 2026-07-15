import { useState, useEffect } from 'react';
import { Pencil, Receipt } from 'lucide-react';
import Modal from '../common/Modal.jsx';
import LogEntryModal from './LogEntryModal.jsx';
import PickTransactionModal from './PickTransactionModal.jsx';

const RecordEntryModal = ({ isOpen, onClose, onSaved, groupId, existingEntries = [] }) => {
  const [mode, setMode] = useState('choose');

  useEffect(() => {
    if (isOpen) setMode('choose');
  }, [isOpen]);

  const handleClose = () => {
    setMode('choose');
    onClose();
  };

  const handleSaved = () => {
    onSaved?.();
    handleClose();
  };

  if (mode === 'manual') {
    return (
      <LogEntryModal
        isOpen={isOpen}
        onClose={handleClose}
        onSaved={handleSaved}
        groupId={groupId}
        entry={null}
      />
    );
  }

  if (mode === 'transaction') {
    return (
      <PickTransactionModal
        isOpen={isOpen}
        onClose={handleClose}
        onSaved={handleSaved}
        groupId={groupId}
        existingEntries={existingEntries}
      />
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Record">
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setMode('manual')}
          className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-white/20 transition-all active:scale-95"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/70">
            <Pencil size={20} />
          </div>
          <div className="text-center">
            <p className="text-xs font-black text-white font-manrope uppercase tracking-wide">
              New Entry
            </p>
            <p className="text-[9px] text-white/30 font-inter mt-1">Type it in manually</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMode('transaction')}
          className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-white/20 transition-all active:scale-95"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/70">
            <Receipt size={20} />
          </div>
          <div className="text-center">
            <p className="text-xs font-black text-white font-manrope uppercase tracking-wide">
              From Transaction
            </p>
            <p className="text-[9px] text-white/30 font-inter mt-1">Pick an existing expense</p>
          </div>
        </button>
      </div>
    </Modal>
  );
};

export default RecordEntryModal;
