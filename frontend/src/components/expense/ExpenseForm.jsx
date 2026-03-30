import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { EXPENSE_CATEGORIES } from '../../utils/constants.js';
import Button from '../common/Button.jsx';

const ExpenseForm = ({ 
  groups = [], 
  initialGroupId = '', 
  onSubmit, 
  loading = false,
  onGroupChange
}) => {
  const [form, setForm] = useState({
    title: '',
    amount: '',
    groupId: initialGroupId,
    category: 'Other',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    if (form.groupId) {
      const group = groups.find(g => g._id === form.groupId);
      setSelectedGroup(group);
      if (onGroupChange) onGroupChange(group);
    }
  }, [form.groupId, groups]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCategorySelect = (cat) => {
    setForm({ ...form, category: cat });
  };

  const handleGroupSelect = (id) => {
    setForm({ ...form, groupId: id });
    localStorage.setItem('lastGroupId', id);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.groupId) return;
    onSubmit({
      ...form,
      amount: parseFloat(form.amount || 0),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10">
      
      {/* Amount Section */}
      <div className="text-center">
        <p className="font-inter text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-3 opacity-60">Total Amount</p>
        <div className="flex items-center justify-center gap-1 relative">
          <span className="font-manrope text-4xl font-bold text-on-surface-variant opacity-40 absolute left-0 sm:static">₹</span>
          <input 
            type="number"
            step="0.01"
            className="bg-transparent !border-none !outline-none text-center font-manrope text-6xl lg:text-7xl font-black text-white focus:!ring-0 !ring-offset-0 placeholder:text-surface-container-highest w-full max-w-[320px] tracking-tighter [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none !shadow-none" 
            placeholder="0"
            value={form.amount}
            name="amount"
            onChange={handleChange}
            autoFocus
            required
          />
        </div>
      </div>

      {/* Group Selector (Horizontal Scroll) */}
      {!initialGroupId && (
        <div className="space-y-4">
           <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-inter px-1 opacity-60">Pick a Cohort</label>
           <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {groups.map((group) => (
              <button
                key={group._id}
                type="button"
                onClick={() => handleGroupSelect(group._id)}
                className={`flex-shrink-0 px-5 py-3 rounded-2xl border transition-all flex items-center gap-3 ${
                  form.groupId === group._id 
                    ? 'bg-white text-black border-white shadow-xl scale-100' 
                    : 'bg-surface-container-high/50 border-white/5 text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${form.groupId === group._id ? 'bg-black text-white' : 'bg-white/10 text-white'}`}>
                  {group.title[0]}
                </div>
                <span className="font-manrope font-bold text-sm whitespace-nowrap">{group.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <div className="relative group">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40 group-focus-within:opacity-100 transition-opacity">
          <LucideIcons.PenTool size={20} />
        </div>
        <input 
          className="w-full bg-surface-container-low/50 border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white font-manrope font-bold text-lg focus:bg-surface-container-high focus:ring-1 focus:ring-white/10 transition-all placeholder:text-on-surface-variant/30" 
          placeholder="What was it for?" 
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          required
        />
      </div>

      {/* Category Selection */}
      <div className="space-y-4">
        <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-inter px-1 opacity-60 text-center">Category Focus</label>
        <div className="flex gap-3 overflow-x-auto no-scrollbar justify-start sm:justify-center px-1">
          {EXPENSE_CATEGORIES.map((cat) => {
            const IconComp = LucideIcons[cat.icon] || LucideIcons.Hash;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => handleCategorySelect(cat.value)}
                className={`flex-shrink-0 px-5 py-3 rounded-full border transition-all text-xs font-bold flex items-center gap-2.5 ${
                  form.category === cat.value 
                    ? 'bg-white text-black border-white shadow-lg' 
                    : 'bg-surface-container-low/30 border-white/5 text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <IconComp size={14} />
                <span className="uppercase tracking-wider">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Split Preview (If Group & Amount Exist) */}
      <AnimatePresence>
        {selectedGroup && form.amount && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card p-6 rounded-3xl border border-white/5 flex items-center justify-between"
          >
            <div className="flex -space-x-3 overflow-hidden">
              {selectedGroup.members.slice(0, 4).map((m, i) => (
                <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-background bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-white">
                  {m.user?.name[0] || '?'}
                </div>
              ))}
              {selectedGroup.members.length > 4 && (
                <div className="inline-block h-8 w-8 rounded-full ring-2 ring-background bg-surface-variant flex items-center justify-center text-[10px] font-bold text-white uppercase">
                  +{selectedGroup.members.length - 4}
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-50 mb-0.5">Equal Share</p>
              <p className="font-manrope font-black text-xl text-white">
                ₹{(parseFloat(form.amount) / selectedGroup.members.length).toFixed(2)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date & Note Buttons (Visual cues) */}
      <div className="flex items-center justify-center gap-8">
        <button type="button" className="flex items-center gap-2 text-on-surface-variant hover:text-white transition-colors">
          <LucideIcons.Calendar size={16} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Today</span>
        </button>
        <button type="button" className="flex items-center gap-2 text-on-surface-variant hover:text-white transition-colors">
          <LucideIcons.MessageSquare size={16} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Add Notes</span>
        </button>
      </div>

      {/* Submit */}
      <Button 
        type="submit" 
        loading={loading} 
        disabled={!form.groupId}
        className="w-full h-18 rounded-3xl font-manrope font-black text-lg bg-white text-black hover:bg-neutral-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-2xl mt-4"
      >
        <LucideIcons.CircleCheck size={24} />
        Record Transaction
      </Button>
    </form>
  );
};

export default ExpenseForm;
