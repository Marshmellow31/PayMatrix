import { getLucideIcon } from '../../utils/iconMap.js';
import { useState, useEffect } from 'react';

import { Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal.jsx';
import Input from '../common/Input.jsx';
import Button from '../common/Button.jsx';
import { EXPENSE_CATEGORIES } from '../../utils/constants.js';
import logService from '../../services/logService.js';

const todayStr = () => new Date().toISOString().split('T')[0];

const LogEntryModal = ({ isOpen, onClose, onSaved, entry, groupId }) => {
  const isEdit = !!entry;
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [category, setCategory] = useState('Other');
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount(entry?.amount ? String(entry.amount) : '');
      setTitle(entry?.title || '');
      setPlace(entry?.place || '');
      setCategory(entry?.category || 'Other');
      setDate(entry?.date ? entry.date.split('T')[0] : todayStr());
      setNote(entry?.note || '');
      setError('');
    }
  }, [isOpen, entry]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (!title.trim()) {
      setError('Please enter what this was for.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        amount: parsedAmount,
        category,
        place: place.trim(),
        date: new Date(date).toISOString(),
        note: note.trim(),
      };

      if (isEdit) {
        await logService.updateManualEntry(groupId, entry._id, payload);
        toast.success('Entry updated');
      } else {
        await logService.addManualEntry(groupId, payload);
        toast.success('Entry added');
      }

      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Entry' : 'Add Entry'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Amount"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          autoFocus
        />

        <Input
          label="What"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Groceries"
        />

        <Input
          label="Where (optional)"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="e.g. Big Bazaar"
        />

        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-2 font-inter">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {EXPENSE_CATEGORIES.map((cat) => {
              const IconComp = cat.icon ? getLucideIcon(cat.icon) || Hash : Hash;
              const active = category === cat.value;
              return (
                <button
                  type="button"
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all border ${
                    active
                      ? 'bg-white text-black border-white'
                      : 'bg-white/[0.03] text-white/50 border-white/10 hover:bg-white/[0.06]'
                  }`}
                >
                  <IconComp size={13} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <div className="w-full">
          <label className="block text-sm font-medium text-on-surface-variant mb-2 font-inter">
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="input-field w-full resize-none"
            placeholder="Any extra details"
          />
        </div>

        {error && <p className="text-xs text-error font-inter">{error}</p>}

        <Button type="submit" className="w-full" loading={saving} disabled={saving}>
          {isEdit ? 'Save Changes' : 'Add Entry'}
        </Button>
      </form>
    </Modal>
  );
};

export default LogEntryModal;
