import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleCheck,
  FileText,
  Hash,
  Info,
  PenTool,
  Receipt,
  ReceiptText,
  Users,
} from 'lucide-react';
import { getLucideIcon } from '../../utils/iconMap.js';
import { EXPENSE_CATEGORIES } from '../../utils/constants.js';
import Button from '../common/Button.jsx';
import Avatar from '../common/Avatar.jsx';
import { getShortName } from '../../utils/nameUtils.js';

const ExpenseForm = ({
  groups = [],
  initialGroupId = '',
  initialData = null,
  prefillData = null,
  onSubmit,
  loading = false,
  onGroupChange,
  onStepChange,
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
    dishAmounts: {}, // per-person pre-GST dish cost (itemized split)
  });

  // Scanned-bill dish assignment (itemized split driven by detected items)
  const [scannedItems, setScannedItems] = useState([]); // [{ name, price }]
  const [itemAssignments, setItemAssignments] = useState({}); // { itemIndex: [userId, ...] }

  const [isNotesExpanded, setIsNotesExpanded] = useState(false);

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
      } catch (_) {
        // ignore Date parsing failures
      }

      setForm((prev) => ({
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
      const participantIdsFromSplits = splits
        .map((s) => (s.user?._id || s.user).toString())
        .filter(Boolean);

      if (participantIdsFromSplits.length > 0) {
        setParticipants(participantIdsFromSplits);

        // Reconstruct split data
        const newPercentages = {};
        const newExact = {};
        const newShares = {};
        const newDishes = {};
        splits.forEach((s) => {
          const uid = (s.user?._id || s.user).toString();
          if (initialData.splitType === 'percentage')
            newPercentages[uid] = s.percent?.toString() || '';
          if (initialData.splitType === 'exact') newExact[uid] = (s.amount || 0).toString();
          if (initialData.splitType === 'shares') newShares[uid] = s.shares?.toString() || '1';
          if (initialData.splitType === 'itemized')
            newDishes[uid] = (s.dish ?? s.amount ?? 0).toString();
        });

        setSplitData({
          percentages: newPercentages,
          exactAmounts: newExact,
          shares: newShares,
          dishAmounts: newDishes,
        });
      }
    } else {
      // New expense — apply groupId and/or scan prefill
      const updates = {};
      if (initialGroupId) updates.groupId = initialGroupId;
      if (prefillData) {
        if (prefillData.amount != null) updates.amount = prefillData.amount.toString();
        if (prefillData.title) updates.title = prefillData.title;
        if (prefillData.date) updates.date = prefillData.date;
        if (prefillData.category) updates.category = prefillData.category;
      }
      if (Object.keys(updates).length > 0) {
        setForm((prev) => ({ ...prev, ...updates }));
      }

      // Scanned dishes → switch to itemized split and load items for assignment
      if (prefillData?.items?.length > 0) {
        setScannedItems(
          prefillData.items.map((it) => ({ name: it.name, price: parseFloat(it.price) || 0 }))
        );
        setItemAssignments({});
        setSplitType('itemized');
      }
    }
  }, [initialData, initialGroupId, prefillData]);

  // Group Member Sync Logic
  useEffect(() => {
    if (!form.groupId) {
      setSelectedGroup(null);
      setParticipants([]);
      return;
    }

    const group = groups.find((g) => g._id === form.groupId);
    setSelectedGroup(group);
    if (onGroupChange) onGroupChange(group);

    if (group && !initialData) {
      // For NEW expenses: Default to all members if none selected yet
      if (participants.length === 0) {
        const allMemberIds = group.members.map((m) => (m.user?._id || m.user).toString());
        const uniqueMemberIds = Array.from(new Set(allMemberIds));
        setParticipants(uniqueMemberIds);

        // Default PaidBy to current user if in group
        const currentUserId = user?._id?.toString();
        if (uniqueMemberIds.includes(currentUserId)) {
          setForm((prev) => ({ ...prev, paidBy: currentUserId }));
        } else if (uniqueMemberIds.length > 0) {
          setForm((prev) => ({ ...prev, paidBy: uniqueMemberIds[0] }));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.groupId, groups, initialData]); // Note: participants is omitted from deps to prevent re-runs when toggling members
  useEffect(() => {
    if (onStepChange) {
      onStepChange(step);
    }
  }, [step, onStepChange]);

  // Derive each person's dish total from item assignments (shared dishes split equally).
  // This feeds the existing itemized engine, which distributes tax/charges by dish ratio.
  useEffect(() => {
    if (scannedItems.length === 0) return;
    const dish = {};
    participants.forEach((pid) => {
      dish[pid] = 0;
    });
    scannedItems.forEach((item, idx) => {
      const assignees = (itemAssignments[idx] || []).filter((uid) => participants.includes(uid));
      if (assignees.length === 0) return;
      const share = (parseFloat(item.price) || 0) / assignees.length;
      assignees.forEach((uid) => {
        dish[uid] = (dish[uid] || 0) + share;
      });
    });
    const dishStr = {};
    Object.keys(dish).forEach((uid) => {
      dishStr[uid] = dish[uid] ? dish[uid].toFixed(2) : '0';
    });
    setSplitData((prev) => ({ ...prev, dishAmounts: dishStr }));
  }, [scannedItems, itemAssignments, participants]);

  const toggleItemAssignment = (idx, userId) => {
    setItemAssignments((prev) => {
      const cur = prev[idx] || [];
      const next = cur.includes(userId) ? cur.filter((u) => u !== userId) : [...cur, userId];
      return { ...prev, [idx]: next };
    });
  };

  // Assign every still-unassigned dish to all current participants
  const assignRemainingToEveryone = () => {
    setItemAssignments((prev) => {
      const next = { ...prev };
      scannedItems.forEach((_, idx) => {
        const cur = (next[idx] || []).filter((uid) => participants.includes(uid));
        if (cur.length === 0) next[idx] = [...participants];
      });
      return next;
    });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSplitDataChange = (userId, value, field) => {
    setSplitData((prev) => ({
      ...prev,
      [field]: { ...prev[field], [userId]: value },
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
        participants.forEach((pid) => {
          newExact[pid] = perPerson.toFixed(2);
        });
        setSplitData((prev) => ({ ...prev, exactAmounts: newExact }));
      }
    } else if (newType === 'percentage') {
      const existingCount = Object.keys(splitData.percentages).length;
      if (existingCount === 0 || existingCount < participants.length) {
        const perPerson = (100 / participants.length).toFixed(2);
        const newPct = {};
        participants.forEach((pid) => {
          newPct[pid] = perPerson;
        });
        setSplitData((prev) => ({ ...prev, percentages: newPct }));
      }
    } else if (newType === 'itemized' && scannedItems.length === 0) {
      // Seed each dish with an equal slice of the total so GST starts at ₹0;
      // as the user types real dish prices, the leftover becomes GST.
      // (Skipped when dishes came from a scanned bill — assignments drive the amounts.)
      const existingCount = Object.keys(splitData.dishAmounts).length;
      if (existingCount === 0 || existingCount < participants.length) {
        const perPerson = (currentAmount / participants.length).toFixed(2);
        const newDishes = {};
        participants.forEach((pid) => {
          newDishes[pid] = perPerson;
        });
        setSplitData((prev) => ({ ...prev, dishAmounts: newDishes }));
      }
    }

    setSplitType(newType);
  };

  const toggleParticipant = (userId) => {
    setParticipants((prev) => {
      const isSelected = prev.includes(userId);
      let next;
      if (isSelected) {
        if (prev.length === 1) return prev;
        next = prev.filter((id) => id !== userId);
      } else {
        next = [...prev, userId];
      }

      // If switching from equal to something else later, we want to ensure
      // the splitData for this user is at least initialized
      if (!isSelected) {
        const currentAmount = parseFloat(form.amount || 0);
        const perPerson = (currentAmount / next.length).toFixed(2);
        setSplitData((s) => ({
          ...s,
          exactAmounts: { ...s.exactAmounts, [userId]: perPerson },
          percentages: { ...s.percentages, [userId]: (100 / next.length).toFixed(2) },
          shares: { ...s.shares, [userId]: '1' },
          dishAmounts: { ...s.dishAmounts, [userId]: perPerson },
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
        const member = selectedGroup.members.find(
          (m) => (m.user?._id || m.user || '').toString() === form.paidBy
        );
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
          dishAmounts: splitType === 'itemized' ? splitData.dishAmounts : undefined,
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get unique members for the split list
  const uniqueMembers = Array.from(
    new Map(
      (selectedGroup?.members || []).map((m) => {
        const id = (m.user?._id || m.user || '').toString();
        return [id, m];
      })
    ).values()
  );

  const calculatePreviewAmount = (userId) => {
    const total = parseFloat(form.amount || 0);
    if (!participants.includes(userId)) return 0;

    switch (splitType) {
      case 'equal':
        return total / participants.length;
      case 'percentage': {
        const pct = parseFloat(splitData.percentages[userId] || 0);
        return (total * pct) / 100;
      }
      case 'exact':
        return parseFloat(splitData.exactAmounts[userId] || 0);
      case 'shares': {
        const userShares = parseInt(splitData.shares[userId] || 0);
        const totalShares = participants.reduce(
          (sum, id) => sum + parseInt(splitData.shares[id] || 0),
          0
        );
        return totalShares > 0 ? (total * userShares) / totalShares : 0;
      }
      case 'itemized': {
        const subtotal = participants.reduce(
          (sum, id) => sum + (parseFloat(splitData.dishAmounts[id]) || 0),
          0
        );
        if (subtotal <= 0) return total / participants.length;
        const dish = parseFloat(splitData.dishAmounts[userId]) || 0;
        return (total * dish) / subtotal;
      }
      default:
        return 0;
    }
  };

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex flex-col gap-8 w-full"
    >
      {/* Desktop: two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start">
        {/* LEFT: Amount + Description */}
        <div className="flex flex-col gap-6">
          {/* Amount Section */}
          <div className="text-center">
            <p className="font-inter text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-3 opacity-60">
              Total Amount
            </p>
            <div className="flex items-center justify-center gap-1 relative">
              <span className="font-manrope text-3xl sm:text-4xl font-bold text-on-surface-variant opacity-40">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                className="bg-transparent !border-none !outline-none font-manrope text-6xl lg:text-7xl font-black text-white focus:!ring-0 !ring-offset-0 placeholder:text-surface-container-highest tracking-tighter [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none !shadow-none text-center"
                placeholder="0"
                value={form.amount}
                name="amount"
                onChange={handleChange}
                autoFocus
                required
                style={{
                  width: form.amount ? `${Math.max(1, form.amount.length) * 0.65}em` : '1.2em',
                }}
              />
            </div>
          </div>

          {/* Group Selector */}
          {!initialGroupId && (
            <div className="space-y-4">
              <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-inter px-1 opacity-60">
                Pick a Cohort
              </label>
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
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${form.groupId === group._id ? 'bg-black text-white' : 'bg-white/10 text-white'}`}
                    >
                      {(group.name || group.title)?.[0] || '?'}
                    </div>
                    <span className="font-manrope font-bold text-sm whitespace-nowrap">
                      {group.name || group.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40 group-focus-within:opacity-100 transition-opacity">
              <PenTool size={18} />
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

          {/* Date Picker */}
          <div className="relative flex items-center gap-2 text-on-surface-variant hover:text-white transition-colors cursor-pointer w-fit">
            <Calendar size={16} className="pointer-events-none" />
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
            />
            <span className="text-[10px] font-bold uppercase tracking-widest pointer-events-none">
              {form.date
                ? new Date(form.date + 'T00:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Notes */}
          <div className="relative group">
            <div
              className={`absolute left-4 text-on-surface-variant opacity-40 group-focus-within:opacity-80 transition-all pointer-events-none ${
                isNotesExpanded || !!form.notes.trim() ? 'top-4' : 'top-1/2 -translate-y-1/2'
              }`}
            >
              <FileText size={16} />
            </div>
            <textarea
              className={`w-full bg-surface-container-low/50 border border-white/5 rounded-2xl pl-12 pr-6 text-white font-manrope font-medium text-sm focus:bg-surface-container-high focus:ring-1 focus:ring-white/10 transition-all placeholder:text-on-surface-variant/30 resize-none leading-relaxed ${
                isNotesExpanded || !!form.notes.trim()
                  ? 'py-3.5 pb-7'
                  : 'py-3.5 h-12 overflow-hidden'
              }`}
              placeholder="Add a note (optional)"
              name="notes"
              rows={isNotesExpanded || !!form.notes.trim() ? 3 : 1}
              value={form.notes}
              onFocus={() => setIsNotesExpanded(true)}
              onBlur={() => setIsNotesExpanded(false)}
              onChange={(e) => {
                const text = e.target.value;
                const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
                if (wordCount <= 300) setForm((prev) => ({ ...prev, notes: text }));
              }}
            />
            {(isNotesExpanded || !!form.notes.trim()) &&
              (() => {
                const wc = form.notes.trim() === '' ? 0 : form.notes.trim().split(/\s+/).length;
                return (
                  <span
                    className={`absolute bottom-2.5 right-4 text-[9px] font-bold tabular-nums pointer-events-none transition-colors ${
                      wc >= 300
                        ? 'text-red-400'
                        : wc >= 270
                          ? 'text-orange-400'
                          : 'text-on-surface-variant/30'
                    }`}
                  >
                    {wc}/300 words
                  </span>
                );
              })()}
          </div>
        </div>

        {/* RIGHT: Category */}
        <div className="flex flex-col gap-6">
          <div className="space-y-4">
            <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-inter px-1 opacity-60">
              Category Focus
            </label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:grid md:grid-cols-3 md:gap-2">
              {EXPENSE_CATEGORIES.map((cat) => {
                const IconComp = getLucideIcon(cat.icon) || Hash;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategorySelect(cat.value)}
                    className={`flex-shrink-0 md:w-full px-4 py-2.5 rounded-full border transition-all text-[10px] font-bold flex items-center justify-center gap-1.5 ${
                      form.category === cat.value
                        ? 'bg-white text-black border-white shadow-lg'
                        : 'bg-surface-container-low/30 border-white/5 text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <IconComp size={11} className="shrink-0" />
                    <span className="uppercase tracking-wider truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {/* end desktop grid */}

      <div className="mt-2">
        <Button
          type="button"
          onClick={handleNext}
          disabled={!form.groupId || !form.amount || !form.title}
          className="w-full h-16 rounded-3xl font-manrope font-black text-lg bg-white text-black hover:bg-neutral-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-2xl"
        >
          Next
          <ChevronRight size={24} />
        </Button>
      </div>
    </motion.div>
  );

  const renderStep2 = () => {
    const totalAmountValue = parseFloat(form.amount || 0);
    const totalDistributedValue =
      splitType === 'exact'
        ? participants.reduce((sum, id) => sum + parseFloat(splitData.exactAmounts[id] || 0), 0)
        : 0;
    const leftValue = totalAmountValue - totalDistributedValue;

    // Itemized (restaurant/GST) split: dishes are pre-tax, the leftover up to the
    // bill total is GST/charges distributed by dish ratio.
    const itemizedSubtotal = participants.reduce(
      (sum, id) => sum + (parseFloat(splitData.dishAmounts[id]) || 0),
      0
    );
    // Gap between bill total and dish subtotal. Positive = GST/charges added on
    // top; negative = a net discount (dishes cost more than the final payable).
    const itemizedGst = totalAmountValue - itemizedSubtotal;
    const itemizedGstPct = itemizedSubtotal > 0 ? (itemizedGst / itemizedSubtotal) * 100 : 0;
    // Discounts are legitimate: the split engine scales each dish by total/subtotal,
    // so a net discount is shared in the same ratio as dishes (and as GST). Only an
    // empty subtotal or a discount that wipes out the whole bill is invalid.
    const isItemizedValid = itemizedSubtotal > 0 && totalAmountValue > 0;

    const isSplitValid =
      splitType === 'exact'
        ? Math.abs(leftValue) < 0.01
        : splitType === 'itemized'
          ? isItemizedValid
          : true;

    // Scanned-bill dish assignment state
    const hasScannedItems = scannedItems.length > 0;
    const unassignedCount = hasScannedItems
      ? scannedItems.filter(
          (_, idx) =>
            (itemAssignments[idx] || []).filter((uid) => participants.includes(uid)).length === 0
        ).length
      : 0;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex flex-col gap-6 w-full"
      >
        {/* Desktop: 3-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
          {/* Column 1: Split Method */}
          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-inter opacity-60 px-1">
                Split Method
              </label>
              <div className="grid grid-cols-3 md:flex md:flex-col gap-2.5">
                {[
                  { id: 'equal', icon: 'Divide', label: 'Equal' },
                  { id: 'exact', icon: 'Target', label: 'Exact' },
                  { id: 'itemized', icon: 'Receipt', label: 'GST' },
                ].map((type) => {
                  const Icon = getLucideIcon(type.icon);
                  const isSelected = splitType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleSplitTypeChange(type.id)}
                      className={`flex flex-col md:flex-row items-center md:justify-start justify-center gap-1 md:gap-3 py-1.5 md:py-3.5 md:px-4 rounded-xl md:rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-white text-black border-white shadow-xl scale-[1.02]'
                          : 'bg-surface-container-low/30 border-white/5 text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      <Icon size={18} className="shrink-0" />
                      <span className="text-[9px] md:text-xs font-bold uppercase tracking-wider leading-none">
                        {type.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Indicators container for split methods */}
            <div className="relative">
              <AnimatePresence mode="wait">
                {splitType === 'exact' && (
                  <motion.div
                    key="exact-indicator"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${
                      isSplitValid
                        ? 'bg-primary/10 border-primary/20'
                        : leftValue > 0
                          ? 'bg-white/5 border-white/10'
                          : 'bg-red-500/10 border-red-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Info
                        size={14}
                        className={
                          isSplitValid
                            ? 'text-primary'
                            : leftValue > 0
                              ? 'text-on-surface-variant'
                              : 'text-red-400'
                        }
                      />
                      <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-inter opacity-60">
                        {isSplitValid
                          ? 'Split Balanced'
                          : leftValue > 0
                            ? 'Remaining'
                            : 'Over Limit'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-manrope font-black text-sm ${isSplitValid ? 'text-primary' : leftValue > 0 ? 'text-white' : 'text-red-400'}`}
                      >
                        ₹{Math.abs(leftValue).toFixed(2)}
                      </span>
                      {isSplitValid && <CheckCircle2 size={14} className="text-primary" />}
                    </div>
                  </motion.div>
                )}

                {splitType === 'itemized' && (
                  <motion.div
                    key="itemized-indicator"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className={`rounded-2xl border px-4 py-3 transition-all ${
                      !isItemizedValid && itemizedGst < 0
                        ? 'bg-red-500/10 border-red-500/20'
                        : 'bg-primary/[0.07] border-primary/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt
                          size={14}
                          className={itemizedGst < -0.01 ? 'text-red-400' : 'text-primary'}
                        />
                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-inter opacity-60">
                          Dishes
                        </span>
                      </div>
                      <span className="font-manrope font-black text-sm text-white">
                        ₹{itemizedSubtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-inter opacity-60">
                          {itemizedGst < -0.01 ? 'Discount' : 'GST / Charges'}
                        </span>
                        {itemizedSubtotal > 0 && (
                          <span className="text-[9px] font-bold text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded-md">
                            {Math.abs(itemizedGstPct).toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <span
                        className={`font-manrope font-black text-sm ${itemizedGst < -0.01 ? 'text-emerald-400' : 'text-primary'}`}
                      >
                        {itemizedGst < -0.01 ? '−' : '+'}₹{Math.abs(itemizedGst).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[9px] text-on-surface-variant font-inter opacity-40 mt-2 leading-snug">
                      {itemizedSubtotal <= 0
                        ? "Enter what each person's dish cost \u2014 the leftover up to the bill total becomes shared GST."
                        : itemizedGst < -0.01
                          ? 'A bill discount is shared by dish price — pricier dishes get a bigger discount.'
                          : 'GST is shared by dish price \u2014 pricier dishes pay proportionally more.'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Column 2: Paid By */}
          <div className="flex flex-col gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-inter opacity-60">
                  Paid By
                </label>
                {uniqueMembers.length > 3 && (
                  <div className="flex items-center gap-0.5 text-[9px] text-primary/80 font-black uppercase tracking-widest animate-pulse">
                    <span>Swipe</span>
                    <ChevronRight size={11} className="shrink-0" />
                  </div>
                )}
              </div>
              <div className="relative w-full">
                <div className="flex gap-2.5 pt-1 overflow-x-auto no-scrollbar pb-2 w-full">
                  {(() => {
                    const allMemberNames = uniqueMembers.map((m) => m.user?.name).filter(Boolean);
                    return uniqueMembers.map((member) => {
                      const userId = (member.user?._id || member.user || '').toString();
                      const isSelected = form.paidBy === userId;
                      const u = member.user || member;
                      return (
                        <button
                          key={`payer-${userId}`}
                          type="button"
                          onClick={() => setForm({ ...form, paidBy: userId })}
                          className={`flex-shrink-0 flex items-center gap-2 md:gap-3 px-3 py-1.5 md:px-4 md:py-3 rounded-xl md:rounded-2xl border transition-all ${
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
                          <span className="font-manrope font-bold text-xs whitespace-nowrap">
                            {getShortName(u?.name, allMemberNames)}
                          </span>
                          {isSelected && <Check size={14} className="shrink-0" />}
                        </button>
                      );
                    });
                  })()}
                </div>
                {uniqueMembers.length > 3 && (
                  <div className="absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l from-[#1a1a1a] to-transparent pointer-events-none z-10" />
                )}
              </div>
            </div>
          </div>

          {/* Column 3: Distribution Preview */}
          <div className="flex flex-col gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-inter opacity-60">
                  Distribution Preview
                </label>
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                  {participants.length} Active
                </span>
              </div>
              <div className="flex flex-col gap-2 max-h-none md:max-h-[450px] md:overflow-y-auto pr-1 custom-scrollbar">
                {uniqueMembers.map((member) => {
                  const u = member.user || (typeof member === 'string' ? null : member);
                  const userId = (u?._id || u?.uid || member._id || member).toString();
                  const isSelected = participants.includes(userId);
                  const previewAmt = calculatePreviewAmount(userId);
                  return (
                    <motion.div
                      layout="position"
                      key={userId}
                      className={`flex flex-col gap-2 p-3 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-white/5 border-white/10'
                          : 'bg-transparent border-transparent opacity-30'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
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
                            <p className="text-[10px] text-on-surface-variant font-inter">
                              ₹{previewAmt.toFixed(2)}
                            </p>
                          </div>
                        </button>
                        <CheckCircle2
                          size={16}
                          className={`transition-colors shrink-0 ${isSelected ? 'text-primary' : 'text-white/20'}`}
                        />
                      </div>
                      <AnimatePresence mode="wait">
                        {isSelected &&
                          (splitType === 'exact' ||
                            (splitType === 'itemized' && scannedItems.length === 0)) && (
                            <motion.div
                              key={`split-input-${userId}-${splitType}`}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.2, ease: 'easeOut' }}
                              className="w-full pt-1"
                            >
                              {splitType === 'exact' && (
                                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 w-full">
                                  <span className="text-[10px] opacity-40 font-bold">Amount</span>
                                  <span className="text-[10px] opacity-40 font-bold">₹</span>
                                  <input
                                    type="number"
                                    className="flex-1 bg-transparent border-none outline-none text-right font-manrope font-bold text-xs p-0 focus:ring-0"
                                    value={splitData.exactAmounts[userId] || ''}
                                    placeholder="0.00"
                                    onChange={(e) =>
                                      handleSplitDataChange(userId, e.target.value, 'exactAmounts')
                                    }
                                  />
                                </div>
                              )}
                              {splitType === 'itemized' && (
                                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 w-full">
                                  <span className="text-[9px] opacity-40 font-bold uppercase tracking-wider">
                                    Dish Cost
                                  </span>
                                  <span className="text-[10px] opacity-40 font-bold">₹</span>
                                  <input
                                    type="number"
                                    className="flex-1 bg-transparent border-none outline-none text-right font-manrope font-bold text-xs p-0 focus:ring-0"
                                    value={splitData.dishAmounts[userId] || ''}
                                    placeholder="0.00"
                                    onChange={(e) =>
                                      handleSplitDataChange(userId, e.target.value, 'dishAmounts')
                                    }
                                  />
                                </div>
                              )}
                            </motion.div>
                          )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        {/* end desktop grid */}

        {/* Dish assignment — appears when the bill was scanned (itemized split) */}
        {hasScannedItems && splitType === 'itemized' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3 rounded-3xl border border-white/[0.07] bg-surface-container-low/40 p-4 sm:p-5"
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <ReceiptText size={15} className="text-primary" />
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-inter opacity-70">
                  Assign Dishes
                </span>
              </div>
              {unassignedCount > 0 && (
                <button
                  type="button"
                  onClick={assignRemainingToEveryone}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all"
                >
                  <Users size={11} />
                  {unassignedCount} left · share all
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              {scannedItems.map((item, idx) => {
                const assignees = (itemAssignments[idx] || []).filter((uid) =>
                  participants.includes(uid)
                );
                const isUnassigned = assignees.length === 0;
                const perHead =
                  assignees.length > 0 ? (parseFloat(item.price) || 0) / assignees.length : 0;
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border p-3 transition-all ${
                      isUnassigned
                        ? 'border-orange-400/20 bg-orange-400/[0.04]'
                        : 'border-white/5 bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <p className="font-manrope font-bold text-sm text-white truncate">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        {assignees.length > 1 && (
                          <span className="text-[9px] text-on-surface-variant font-inter">
                            ₹{perHead.toFixed(2)} ea
                          </span>
                        )}
                        <span className="font-manrope font-black text-sm text-white tabular-nums">
                          ₹{(parseFloat(item.price) || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {uniqueMembers.map((member) => {
                        const u = member.user || member;
                        const uid = (u?._id || u?.uid || member._id || member).toString();
                        if (!participants.includes(uid)) return null;
                        const on = assignees.includes(uid);
                        return (
                          <button
                            key={uid}
                            type="button"
                            onClick={() => toggleItemAssignment(idx, uid)}
                            className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border transition-all ${
                              on
                                ? 'bg-white text-black border-white shadow-md'
                                : 'bg-transparent border-white/10 text-on-surface-variant hover:border-white/25'
                            }`}
                          >
                            <Avatar
                              name={u?.name}
                              src={u?.avatar}
                              size="sm"
                              className="w-5 h-5 border-0"
                            />
                            <span className="text-[10px] font-bold whitespace-nowrap">
                              {getShortName(u?.name, [])}
                            </span>
                            {on && <Check size={11} strokeWidth={3} className="shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {(() => {
              // Dishes are shown at their printed price; the bill total may differ
              // because of GST/charges (added on) or a bill discount (taken off).
              // Either way the gap is shared by dish ratio, so a bigger eater gets
              // a bigger slice of the discount (or pays more tax).
              const dishesSubtotal = scannedItems.reduce(
                (sum, it) => sum + (parseFloat(it.price) || 0),
                0
              );
              const scanGap = totalAmountValue - dishesSubtotal; // negative ⇒ discount
              const hasDiscount = scanGap < -0.01;
              const hasCharge = scanGap > 0.01;
              return (
                <div className="flex flex-col gap-1.5 px-1 pt-3 mt-1 border-t border-white/[0.06] text-[11px] font-manrope">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant font-bold opacity-60">Dishes</span>
                    <span className="font-bold text-white tabular-nums">
                      ₹{dishesSubtotal.toFixed(2)}
                    </span>
                  </div>
                  {(hasDiscount || hasCharge) && (
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-bold ${hasDiscount ? 'text-emerald-400' : 'text-on-surface-variant opacity-60'}`}
                      >
                        {hasDiscount ? 'Discount' : 'Tax / charges'}
                      </span>
                      <span
                        className={`font-bold tabular-nums ${hasDiscount ? 'text-emerald-400' : 'text-white'}`}
                      >
                        {hasDiscount ? '−' : '+'}₹{Math.abs(scanGap).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.06]">
                    <span className="text-[9px] uppercase tracking-[0.15em] font-bold text-on-surface-variant opacity-40">
                      Bill total
                    </span>
                    <span className="font-manrope font-black text-sm text-white tabular-nums">
                      ₹{totalAmountValue.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })()}

            <p className="text-[9px] text-on-surface-variant font-inter opacity-40 px-1 leading-snug">
              Tap who shared each dish — split equally between them. Tax &amp; charges (or a bill
              discount) are shared by what each person ate.
            </p>
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
            <CircleCheck size={20} />
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
