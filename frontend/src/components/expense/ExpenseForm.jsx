import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
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
  const { user } = useSelector((state) => state.auth);

  const [form, setForm] = useState({
    title: '',
    amount: '',
    groupId: initialGroupId,
    category: 'Other',
    date: new Date().toISOString().split('T')[0],
    paidBy: user?._id || '',
    notes: '',
  });

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [step, setStep] = useState(1);
  const [participants, setParticipants] = useState([]); // Array of user IDs

  useEffect(() => {
    if (initialGroupId) {
      setForm(prev => ({ ...prev, groupId: initialGroupId }));
    }
  }, [initialGroupId]);

  useEffect(() => {
    if (form.groupId) {
      const group = groups.find(g => g._id === form.groupId);
      setSelectedGroup(group);
      if (group) {
        // Initialize unique participants
        const allMemberIds = group.members.map(m => (m.user?._id || m.user).toString());
        const uniqueMemberIds = Array.from(new Set(allMemberIds));
        
        setParticipants(uniqueMemberIds);

        // Ensure paidBy is valid and defaults to unique user
        if (!form.paidBy || !uniqueMemberIds.includes(form.paidBy)) {
          const currentUserId = user?._id?.toString();
          if (uniqueMemberIds.includes(currentUserId)) {
            setForm(prev => ({ ...prev, paidBy: currentUserId }));
          } else if (uniqueMemberIds.length > 0) {
            setForm(prev => ({ ...prev, paidBy: uniqueMemberIds[0] }));
          }
        }
      }
      if (onGroupChange) onGroupChange(group);
    } else {
      setSelectedGroup(null);
      setParticipants([]);
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

  const toggleParticipant = (userId) => {
    setParticipants(prev => {
      if (prev.includes(userId)) {
        if (prev.length === 1) return prev; // Don't allow 0 participants
        return prev.filter(id => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const handleNext = () => {
    if (!form.amount || !form.title || !form.groupId) return;
    setStep(2);
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!form.groupId || participants.length === 0) return;
    onSubmit({
      ...form,
      amount: parseFloat(form.amount || 0),
      participants: participants,
      paidBy: form.paidBy,
    });
  };

  // Get unique members for the split list
  const uniqueMembers = Array.from(new Map(
    (selectedGroup?.members || []).map(m => {
      const id = (m.user?._id || m.user || '').toString();
      return [id, m];
    })
  ).values());

  const renderStep1 = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col gap-8 w-full"
    >
      {/* Amount Section */}
      <div className="text-center">
        <p className="font-inter text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-3 opacity-60">Total Amount</p>
        <div className="flex items-center justify-center gap-1 relative">
          <span className="font-manrope text-3xl sm:text-4xl font-bold text-on-surface-variant opacity-40 absolute left-0 sm:static">₹</span>
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

      {/* Group Selector */}
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
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40 group-focus-within:opacity-100 transition-opacity">
          <LucideIcons.PenTool size={18} />
        </div>
        <input 
          className="w-full bg-surface-container-low/50 border border-white/5 rounded-2xl py-4 sm:py-5 pl-12 pr-6 text-white font-manrope font-bold text-base sm:text-lg focus:bg-surface-container-high focus:ring-1 focus:ring-white/10 transition-all placeholder:text-on-surface-variant/30" 
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
        <div className="w-full flex gap-2.5 overflow-x-auto no-scrollbar justify-start sm:justify-center">
          {EXPENSE_CATEGORIES.map((cat) => {
            const IconComp = LucideIcons[cat.icon] || LucideIcons.Hash;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => handleCategorySelect(cat.value)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-full border transition-all text-xs font-bold flex items-center gap-2 ${
                  form.category === cat.value 
                    ? 'bg-white text-black border-white shadow-lg' 
                    : 'bg-surface-container-low/30 border-white/5 text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <IconComp size={12} />
                <span className="uppercase tracking-wider">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

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

      <div className="mt-4">
        <Button 
          type="button"
          onClick={handleNext}
          disabled={!form.groupId || !form.amount || !form.title}
          className="w-full h-16 rounded-3xl font-manrope font-black text-lg bg-white text-black hover:bg-neutral-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-2xl"
        >
          Next
          <LucideIcons.ChevronRight size={24} />
        </Button>
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col gap-6 w-full"
    >
      {/* Paid By Selection */}
      <div className="space-y-4">
        <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-inter opacity-60 px-1">Paid By</label>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {uniqueMembers.map(member => {
            const userId = (member.user?._id || member.user || '').toString();
            const isSelected = form.paidBy === userId;
            return (
              <button
                key={`payer-${userId}`}
                type="button"
                onClick={() => setForm({ ...form, paidBy: userId })}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all ${
                  isSelected 
                    ? 'bg-white text-black border-white shadow-lg' 
                    : 'bg-surface-container-low/30 border-white/5 text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${isSelected ? 'bg-black text-white' : 'bg-white/10 text-white'}`}>
                  {member.user?.name?.[0] || '?'}
                </div>
                <span className="font-manrope font-bold text-xs whitespace-nowrap">{member.user?.name?.split(' ')[0]}</span>
                {isSelected && <LucideIcons.Check size={14} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-inter opacity-60">Split with</label>
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{participants.length} Selected</span>
        </div>
        
        <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {uniqueMembers.map(member => {
            const user = member.user?._id || member.user;
            const userId = user.toString();
            const isSelected = participants.includes(userId);
            
            return (
              <button
                key={userId}
                type="button"
                onClick={() => toggleParticipant(userId)}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  isSelected 
                    ? 'bg-surface-container-high border-white/20' 
                    : 'bg-surface-container-low/30 border-transparent opacity-40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-surface-container-highest text-white border border-white/10`}>
                    {member.user?.name?.[0] || '?'}
                  </div>
                  <div className="text-left">
                    <p className="font-manrope font-bold text-sm text-white">{member.user?.name}</p>
                    <p className="text-[10px] text-on-surface-variant font-inter">{member.user?.email}</p>
                  </div>
                </div>
                {isSelected ? (
                  <LucideIcons.CheckCircle2 size={20} className="text-primary" />
                ) : (
                  <LucideIcons.Circle size={20} className="text-on-surface-variant" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Split Preview */}
      <div className="glass-card p-6 rounded-3xl border border-white/5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-50 mb-0.5">Equal Share</p>
          <div className="flex items-baseline gap-1">
            <span className="text-xs text-on-surface-variant">₹</span>
            <span className="font-manrope font-black text-2xl text-white">
              {(parseFloat(form.amount || 0) / participants.length).toFixed(2)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-50 mb-0.5">Total Participants</p>
          <p className="font-manrope font-bold text-lg text-white">{participants.length}</p>
        </div>
      </div>

      <div className="flex gap-4 mt-4">
        <Button 
          type="button" 
          onClick={() => setStep(1)}
          className="flex-1 h-16 rounded-3xl font-manrope font-bold text-white bg-surface-container-high hover:bg-surface-container-highest transition-all"
        >
          Back
        </Button>
        <Button 
          type="button"
          onClick={handleSubmit}
          loading={loading}
          className="flex-[2] h-16 rounded-3xl font-manrope font-black text-lg bg-white text-black hover:bg-neutral-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-2xl"
        >
          <LucideIcons.CircleCheck size={24} />
          Record Transaction
        </Button>
      </div>
    </motion.div>
  );

  return (
    <div className="w-full">
      <AnimatePresence mode="popLayout" initial={false}>
        {step === 1 ? renderStep1() : renderStep2()}
      </AnimatePresence>
    </div>
  );
};

export default ExpenseForm;
