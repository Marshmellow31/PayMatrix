import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { EXPENSE_CATEGORIES } from '../../utils/constants.js';
import Button from '../common/Button.jsx';
import Avatar from '../common/Avatar.jsx';
import { getShortName, getInitials } from '../../utils/nameUtils.js';

const ExpenseForm = ({ 
  groups = [], 
  initialGroupId = '', 
  initialData = null,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [participants, setParticipants] = useState([]); // Array of user IDs
  const [splitType, setSplitType] = useState('equal');
  const [splitData, setSplitData] = useState({
    percentages: {},
    exactAmounts: {},
    shares: {},
  });

  // Initialization and Sync Logic
  useEffect(() => {
    // 1. Initial Data Loading (Edit Mode)
    if (initialData) {
      // Safely parse date
      let dateStr = new Date().toISOString().split('T')[0];
      try {
        const parsed = new Date(initialData.date);
        if (!isNaN(parsed.getTime())) {
          dateStr = parsed.toISOString().split('T')[0];
        }
      } catch (_) {}

      setForm(prev => ({
        ...prev,
        title: initialData.title || prev.title,
        amount: (initialData.amount || '').toString(),
        groupId: initialData.group?._id || initialData.group || initialData.groupId || prev.groupId,
        category: initialData.category || prev.category,
        date: dateStr,
        paidBy: (initialData.paidBy?._id || initialData.paidBy || prev.paidBy).toString(),
        notes: initialData.notes || prev.notes,
      }));
      setSplitType(initialData.splitType || 'equal');

      // Hydrate participants from splits ONLY if they aren't already set or if it's the first run
      const splits = initialData.splits || [];
      const participantIdsFromSplits = splits.map(s => (s.user?._id || s.user).toString()).filter(Boolean);
      
      if (participantIdsFromSplits.length > 0) {
        setParticipants(participantIdsFromSplits);

        // Reconstruct split data
        const newPercentages = {};
        const newExact = {};
        const newShares = {};
        splits.forEach(s => {
          const uid = (s.user?._id || s.user).toString();
          if (initialData.splitType === 'percentage') newPercentages[uid] = s.percent?.toString() || '';
          if (initialData.splitType === 'exact') newExact[uid] = (s.amount || 0).toString();
          if (initialData.splitType === 'shares') newShares[uid] = s.shares?.toString() || '1';
        });

        setSplitData({
          percentages: newPercentages,
          exactAmounts: newExact,
          shares: newShares,
        });
      }
    } else if (initialGroupId) {
      setForm(prev => ({ ...prev, groupId: initialGroupId }));
    }
  }, [initialData, initialGroupId]);

  // Group Member Sync Logic
  useEffect(() => {
    if (!form.groupId) {
      setSelectedGroup(null);
      setParticipants([]);
      return;
    }

    const group = groups.find(g => g._id === form.groupId);
    setSelectedGroup(group);
    if (onGroupChange) onGroupChange(group);

    if (group && !initialData) {
      // For NEW expenses: Default to all members if none selected yet
      if (participants.length === 0) {
        const allMemberIds = group.members.map(m => (m.user?._id || m.user).toString());
        const uniqueMemberIds = Array.from(new Set(allMemberIds));
        setParticipants(uniqueMemberIds);

        // Default PaidBy to current user if in group
        const currentUserId = user?._id?.toString();
        if (uniqueMemberIds.includes(currentUserId)) {
          setForm(prev => ({ ...prev, paidBy: currentUserId }));
        } else if (uniqueMemberIds.length > 0) {
          setForm(prev => ({ ...prev, paidBy: uniqueMemberIds[0] }));
        }
      }
    }
  }, [form.groupId, groups, initialData]); // Note: participants is omitted from deps to prevent re-runs when toggling members



  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSplitDataChange = (userId, value, field) => {
    setSplitData(prev => ({
      ...prev,
      [field]: { ...prev[field], [userId]: value }
    }));
  };

  const handleCategorySelect = (cat) => {
    setForm({ ...form, category: cat });
  };

  const handleGroupSelect = (id) => {
    setForm({ ...form, groupId: id });
    localStorage.setItem('lastGroupId', id);
  };

  const handleSplitTypeChange = (newType) => {
    // Smart pre-fill: If target split data is mostly empty, seed it with current calculated values
    const currentAmount = parseFloat(form.amount || 0);

    if (newType === 'exact') {
      const existingCount = Object.keys(splitData.exactAmounts).length;
      if (existingCount === 0 || existingCount < participants.length) {
        const perPerson = currentAmount / participants.length;
        const newExact = {};
        participants.forEach(pid => {
          newExact[pid] = perPerson.toFixed(2);
        });
        setSplitData(prev => ({ ...prev, exactAmounts: newExact }));
      }
    } else if (newType === 'percentage') {
      const existingCount = Object.keys(splitData.percentages).length;
      if (existingCount === 0 || existingCount < participants.length) {
        const perPerson = (100 / participants.length).toFixed(2);
        const newPct = {};
        participants.forEach(pid => {
          newPct[pid] = perPerson;
        });
        setSplitData(prev => ({ ...prev, percentages: newPct }));
      }
    }

    setSplitType(newType);
  };

  const toggleParticipant = (userId) => {
    setParticipants(prev => {
      const isSelected = prev.includes(userId);
      let next;
      if (isSelected) {
        if (prev.length === 1) return prev; 
        next = prev.filter(id => id !== userId);
      } else {
        next = [...prev, userId];
      }

      // If switching from equal to something else later, we want to ensure 
      // the splitData for this user is at least initialized
      if (!isSelected) {
        const currentAmount = parseFloat(form.amount || 0);
        const perPerson = (currentAmount / next.length).toFixed(2);
        setSplitData(s => ({
          ...s,
          exactAmounts: { ...s.exactAmounts, [userId]: perPerson },
          percentages: { ...s.percentages, [userId]: (100 / next.length).toFixed(2) },
          shares: { ...s.shares, [userId]: '1' }
        }));
      }

      return next;
    });
  };

  const handleNext = () => {
    if (!form.amount || !form.title || !form.groupId) return;
    setStep(2);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.groupId || participants.length === 0) return;
    if (loading || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let resolvedName = 'Member';
      if (selectedGroup?.members) {
        const member = selectedGroup.members.find(m => (m.user?._id || m.user || '').toString() === form.paidBy);
        if (member && member.user?.name) {
          resolvedName = member.user.name;
        }
      }

      await onSubmit({
        ...form,
        amount: parseFloat(form.amount || 0),
        participants: participants,
        paidBy: form.paidBy,
        paidByName: resolvedName,
        splitType,
        splitData: {
          percentages: splitType === 'percentage' ? splitData.percentages : undefined,
          exactAmounts: splitType === 'exact' ? splitData.exactAmounts : undefined,
          shares: splitType === 'shares' ? splitData.shares : undefined,
        }
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get unique members for the split list
  const uniqueMembers = Array.from(new Map(
    (selectedGroup?.members || []).map(m => {
      const id = (m.user?._id || m.user || '').toString();
      return [id, m];
    })
  ).values());

  const calculatePreviewAmount = (userId) => {
    const total = parseFloat(form.amount || 0);
    if (!participants.includes(userId)) return 0;

    switch (splitType) {
      case 'equal':
        return total / participants.length;
      case 'percentage':
        const pct = parseFloat(splitData.percentages[userId] || 0);
        return (total * pct) / 100;
      case 'exact':
        return parseFloat(splitData.exactAmounts[userId] || 0);
      case 'shares':
        const userShares = parseInt(splitData.shares[userId] || 0);
        const totalShares = participants.reduce((sum, id) => sum + parseInt(splitData.shares[id] || 0), 0);
        return totalShares > 0 ? (total * userShares) / totalShares : 0;
      default:
        return 0;
    }
  };

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
        <div className="flex items-center gap-2 text-on-surface-variant">
          <LucideIcons.Calendar size={16} />
          <span className="text-[10px] font-bold uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}</span>
        </div>
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

  const renderStep2 = () => {
    const totalAmountValue = parseFloat(form.amount || 0);
    const totalDistributedValue = splitType === 'exact' 
      ? participants.reduce((sum, id) => sum + parseFloat(splitData.exactAmounts[id] || 0), 0)
      : 0;
    const leftValue = totalAmountValue - totalDistributedValue;
    const isSplitValid = splitType === 'exact' ? Math.abs(leftValue) < 0.01 : true;

    return (
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
                    {(() => {
                      const allMemberNames = uniqueMembers.map(m => m.user?.name).filter(Boolean);
                      return uniqueMembers.map(member => {
                        const userId = (member.user?._id || member.user || '').toString();
                        const isSelected = form.paidBy === userId;
                        const u = member.user || member;
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
                            <Avatar
                              name={u?.name}
                              src={u?.avatar}
                              size="sm"
                              className={`w-6 h-6 ${isSelected ? 'border border-black/10' : 'border border-white/5'}`}
                            />
                            <span className="font-manrope font-bold text-xs whitespace-nowrap">{getShortName(u?.name, allMemberNames)}</span>
                            {isSelected && <LucideIcons.Check size={14} />}
                          </button>
                        );
                      });
                    })()}
        </div>
      </div>

      {/* Split Type Selector */}
      <div className="space-y-4">
        <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-inter opacity-60 px-1">Split Method</label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'equal', icon: 'Divide' },
            { id: 'exact', icon: 'Target' },
            { id: 'percentage', icon: 'Percent' },
            { id: 'shares', icon: 'Users' },
          ].map(type => {
            const Icon = LucideIcons[type.icon];
            const isSelected = splitType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => handleSplitTypeChange(type.id)}
                className={`flex flex-col items-center justify-center py-5 rounded-2xl border transition-all ${
                  isSelected 
                    ? 'bg-white text-black border-white shadow-xl scale-[1.02]' 
                    : 'bg-surface-container-low/30 border-white/5 text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <Icon size={22} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-inter opacity-60">Distribution Preview</label>
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{participants.length} Active</span>
        </div>
        
        <div className="grid grid-cols-1 gap-2 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
          {uniqueMembers.map(member => {
            const u = member.user || (typeof member === 'string' ? null : member);
            const userId = (u?._id || u?.uid || member._id || member).toString();
            const isSelected = participants.includes(userId);
            const previewAmt = calculatePreviewAmount(userId);
            
            return (
              <div
                key={userId}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  isSelected 
                    ? 'bg-white/5 border-white/10' 
                    : 'bg-transparent border-transparent opacity-30'
                }`}
              >
                  <button
                    type="button"
                    onClick={() => toggleParticipant(userId)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <Avatar
                      name={u?.name}
                      src={u?.avatar}
                      size="sm"
                      className="border border-white/10"
                    />
                    <div>
                      <p className="font-manrope font-bold text-xs text-white">{u?.name}</p>
                      <p className="text-[10px] text-on-surface-variant font-inter">₹{previewAmt.toFixed(2)}</p>
                    </div>
                  </button>

                {isSelected && (
                  <div className="flex items-center gap-2">
                    {splitType === 'percentage' && (
                      <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                        <input 
                          type="number"
                          className="w-10 bg-transparent border-none outline-none text-right font-manrope font-bold text-xs p-0 focus:ring-0"
                          value={splitData.percentages[userId] || ''}
                          onChange={(e) => handleSplitDataChange(userId, e.target.value, 'percentages')}
                        />
                        <span className="text-[10px] opacity-40 font-bold">%</span>
                      </div>
                    )}
                    {splitType === 'exact' && (
                      <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                        <span className="text-[10px] opacity-40 font-bold">₹</span>
                        <input 
                          type="number"
                          className="w-16 bg-transparent border-none outline-none text-right font-manrope font-bold text-xs p-0 focus:ring-0"
                          value={splitData.exactAmounts[userId] || ''}
                          placeholder="0.00"
                          onChange={(e) => handleSplitDataChange(userId, e.target.value, 'exactAmounts')}
                        />
                      </div>
                    )}
                    {splitType === 'shares' && (
                      <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-lg">
                         <input 
                          type="number"
                          className="w-8 bg-transparent border-none outline-none text-center font-manrope font-bold text-xs p-0 focus:ring-0"
                          value={splitData.shares[userId] || '1'}
                          onChange={(e) => handleSplitDataChange(userId, e.target.value, 'shares')}
                        />
                         <span className="text-[10px] opacity-40 font-bold">PTS</span>
                      </div>
                    )}
                    <LucideIcons.CheckCircle2 size={16} className="text-primary" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-time Amount Indicator for Exact Split */}
      {splitType === 'exact' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${
            isSplitValid 
              ? 'bg-primary/10 border-primary/20' 
              : leftValue > 0 
                ? 'bg-white/5 border-white/10' 
                : 'bg-red-500/10 border-red-500/20'
          }`}
        >
          <div className="flex items-center gap-2">
            <LucideIcons.Info size={14} className={isSplitValid ? 'text-primary' : leftValue > 0 ? 'text-on-surface-variant' : 'text-red-400'} />
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-inter opacity-60">
              {isSplitValid ? 'Split Balanced' : leftValue > 0 ? 'Remaining' : 'Over Limit'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`font-manrope font-black text-sm ${isSplitValid ? 'text-primary' : leftValue > 0 ? 'text-white' : 'text-red-400'}`}>
              ₹{Math.abs(leftValue).toFixed(2)}
            </span>
            {isSplitValid && <LucideIcons.CheckCircle2 size={14} className="text-primary" />}
          </div>
        </motion.div>
      )}

      <div className="flex gap-4 mt-2">
        <Button 
          variant="outline"
          onClick={() => setStep(1)}
          className="flex-1 h-14 rounded-3xl font-manrope font-bold text-white border-white/20 bg-transparent hover:bg-white/5 transition-all"
        >
          Back
        </Button>
        <Button 
          type="button"
          onClick={handleSubmit}
          loading={loading || isSubmitting}
          disabled={!isSplitValid}
          className="flex-[2] h-14 rounded-3xl font-manrope font-black text-base bg-white text-black hover:bg-neutral-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-2xl disabled:opacity-50 disabled:bg-white/10 disabled:text-white/20"
        >
          <LucideIcons.CircleCheck size={20} />
          {initialData ? 'Update Transaction' : 'Commit Transaction'}
        </Button>
      </div>
    </motion.div>
    );
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="popLayout" initial={false}>
        {step === 1 ? renderStep1() : renderStep2()}
      </AnimatePresence>
    </div>
  );
};

export default ExpenseForm;
