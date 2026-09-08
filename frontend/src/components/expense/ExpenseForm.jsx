import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Divide,
  FileText,
  Hash,
  Info,
  PenTool,
  Percent,
  PieChart,
  Receipt,
  ReceiptText,
  Target,
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
  const [selectedPayers, setSelectedPayers] = useState([]); // Array of payer user IDs
  const [payerDivisionMode, setPayerDivisionMode] = useState('equal'); // 'equal' | 'exact' | 'percentage'
  const [payerValues, setPayerValues] = useState({}); // { [uid]: string }
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

      if (initialData.payers && initialData.payers.length > 0) {
        setSelectedPayers(initialData.payers.map((p) => (p.user?._id || p.user || '').toString()));
        if (initialData.payers.some((p) => p.percent != null)) {
          setPayerDivisionMode('percentage');
        } else {
          const firstAmt = initialData.payers[0].amountPaise;
          const allEq = initialData.payers.every((p) => p.amountPaise === firstAmt);
          setPayerDivisionMode(allEq ? 'equal' : 'exact');
        }
        const pVals = {};
        initialData.payers.forEach((p) => {
          const uid = (p.user?._id || p.user || '').toString();
          pVals[uid] =
            p.percent != null
              ? p.percent.toString()
              : p.amount != null
                ? p.amount.toString()
                : (p.amountPaise / 100).toFixed(2);
        });
        setPayerValues(pVals);
      } else if (initialData.paidBy) {
        setSelectedPayers([(initialData.paidBy?._id || initialData.paidBy).toString()]);
      }

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
      const allMemberIds = group.members.map((m) => (m.user?._id || m.user).toString());
      const uniqueMemberIds = Array.from(new Set(allMemberIds));
      // For NEW expenses: Default to all members if none selected yet
      if (participants.length === 0) {
        setParticipants(uniqueMemberIds);
      }

      // Default PaidBy to current user if in group
      const currentUserId = user?._id?.toString();
      if (selectedPayers.length === 0) {
        if (uniqueMemberIds.includes(currentUserId)) {
          setForm((prev) => ({ ...prev, paidBy: currentUserId }));
          setSelectedPayers([currentUserId]);
        } else if (uniqueMemberIds.length > 0) {
          setForm((prev) => ({ ...prev, paidBy: uniqueMemberIds[0] }));
          setSelectedPayers([uniqueMemberIds[0]]);
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
      const totalAmountVal = parseFloat(form.amount || 0);
      const totalPaiseVal = Math.round(totalAmountVal * 100);
      const activePayers = selectedPayers.filter(Boolean);
      let calculatedPayers = [];
      if (activePayers.length <= 1) {
        const singleUid = activePayers[0] || form.paidBy || user?._id || '';
        calculatedPayers = [
          {
            user: singleUid,
            amount: totalAmountVal,
            amountPaise: totalPaiseVal,
            percent: 100,
          },
        ];
      } else if (payerDivisionMode === 'equal') {
        const perPerson = Math.floor(totalPaiseVal / activePayers.length);
        const rem = totalPaiseVal % activePayers.length;
        calculatedPayers = activePayers.map((uid, idx) => {
          const amtPaise = perPerson + (idx < rem ? 1 : 0);
          return {
            user: uid,
            amount: amtPaise / 100,
            amountPaise: amtPaise,
            percent: 100 / activePayers.length,
          };
        });
      } else if (payerDivisionMode === 'exact') {
        calculatedPayers = activePayers.map((uid) => {
          const amt = parseFloat(payerValues[uid] || 0);
          return {
            user: uid,
            amount: amt,
            amountPaise: Math.round(amt * 100),
          };
        });
      } else if (payerDivisionMode === 'percentage') {
        calculatedPayers = activePayers.map((uid) => {
          const pct = parseFloat(payerValues[uid] || 0);
          const amtPaise = Math.round((pct / 100) * totalPaiseVal);
          return {
            user: uid,
            amount: amtPaise / 100,
            amountPaise: amtPaise,
            percent: pct,
          };
        });
      }

      let resolvedName = 'Member';
      if (calculatedPayers.length > 1) {
        resolvedName = `${calculatedPayers.length} members`;
      } else if (selectedGroup?.members) {
        const primaryPayer = calculatedPayers[0]?.user || form.paidBy;
        const member = selectedGroup.members.find(
          (m) => (m.user?._id || m.user || '').toString() === primaryPayer
        );
        if (member && member.user?.name) {
          resolvedName = member.user.name;
        }
      }

      await onSubmit({
        ...form,
        amount: totalAmountVal,
        participants: participants,
        paidBy: calculatedPayers[0]?.user || form.paidBy,
        paidByName: resolvedName,
        payers: calculatedPayers,
        splitType,
        initialVersion: initialData?.version || 1,
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

  const totalAmountValue = parseFloat(form.amount || 0);
  const totalPaiseVal = Math.round(totalAmountValue * 100);

  // Multi-payer calculation and validation
  const activePayersList = selectedPayers.filter(Boolean);

  const calculatedPayerAmounts = {};
  if (activePayersList.length === 1) {
    calculatedPayerAmounts[activePayersList[0]] = totalAmountValue;
  } else if (payerDivisionMode === 'equal') {
    const perPerson = Math.floor(totalPaiseVal / (activePayersList.length || 1));
    const rem = totalPaiseVal % (activePayersList.length || 1);
    activePayersList.forEach((uid, idx) => {
      calculatedPayerAmounts[uid] = (perPerson + (idx < rem ? 1 : 0)) / 100;
    });
  } else if (payerDivisionMode === 'exact') {
    activePayersList.forEach((uid) => {
      calculatedPayerAmounts[uid] = parseFloat(payerValues[uid] || 0);
    });
  } else if (payerDivisionMode === 'percentage') {
    activePayersList.forEach((uid) => {
      const pct = parseFloat(payerValues[uid] || 0);
      calculatedPayerAmounts[uid] = Math.round((pct / 100) * totalPaiseVal) / 100;
    });
  }

  const payerTotalPaid = Object.values(calculatedPayerAmounts).reduce((a, b) => a + b, 0);
  const isPayerPercentageValid =
    payerDivisionMode === 'percentage'
      ? Math.abs(
          activePayersList.reduce((s, uid) => s + (parseFloat(payerValues[uid]) || 0), 0) - 100
        ) < 0.01
      : true;
  const isPayerBalanced =
    activePayersList.length > 0 &&
    (activePayersList.length === 1 ||
      (payerDivisionMode === 'percentage'
        ? isPayerPercentageValid && Math.abs(payerTotalPaid - totalAmountValue) < 0.02
        : Math.abs(payerTotalPaid - totalAmountValue) < 0.01));

  const effectivePaidByName = (() => {
    if (activePayersList.length === 0) return 'No one';
    if (activePayersList.length > 1) return `${activePayersList.length} members`;
    const singleUid = activePayersList[0];
    if (singleUid === (user?._id?.toString() || user?.uid)) return 'You';
    const member = uniqueMembers.find(
      (m) => (m.user?._id || m.user || '').toString() === singleUid
    );
    return member?.user?.name || 'Member';
  })();

  const totalDistributedValue =
    splitType === 'exact'
      ? participants.reduce((sum, id) => sum + parseFloat(splitData.exactAmounts[id] || 0), 0)
      : 0;
  const leftValue = totalAmountValue - totalDistributedValue;

  // Percentage split validation
  const totalPercentage =
    splitType === 'percentage'
      ? participants.reduce((sum, id) => sum + (parseFloat(splitData.percentages[id]) || 0), 0)
      : 0;
  const leftPercentage = 100 - totalPercentage;
  const isPercentageValid = Math.abs(leftPercentage) < 0.01;

  // Shares split validation
  const totalShares =
    splitType === 'shares'
      ? participants.reduce((sum, id) => sum + (parseInt(splitData.shares[id]) || 0), 0)
      : 0;
  const isSharesValid = totalShares > 0;

  // Itemized (restaurant/GST) split
  const itemizedSubtotal = participants.reduce(
    (sum, id) => sum + (parseFloat(splitData.dishAmounts[id]) || 0),
    0
  );
  const itemizedGst = totalAmountValue - itemizedSubtotal;
  const itemizedGstPct = itemizedSubtotal > 0 ? (itemizedGst / itemizedSubtotal) * 100 : 0;
  const isItemizedValid = itemizedSubtotal > 0 && totalAmountValue > 0;

  const isSplitValid =
    isPayerBalanced &&
    (splitType === 'exact'
      ? Math.abs(leftValue) < 0.01
      : splitType === 'percentage'
        ? isPercentageValid
        : splitType === 'shares'
          ? isSharesValid
          : splitType === 'itemized'
            ? isItemizedValid
            : true);

  // Scanned-bill dish assignment state
  const hasScannedItems = scannedItems.length > 0;
  const unassignedCount = hasScannedItems
    ? scannedItems.filter(
        (_, idx) =>
          (itemAssignments[idx] || []).filter((uid) => participants.includes(uid)).length === 0
      ).length
    : 0;

  const calculatePreviewAmount = (userId) => {
    const total = totalAmountValue;
    if (!participants.includes(userId)) return 0;

    switch (splitType) {
      case 'equal':
        return participants.length > 0 ? total / participants.length : 0;
      case 'percentage': {
        const pct = parseFloat(splitData.percentages[userId] || 0);
        return (total * pct) / 100;
      }
      case 'exact':
        return parseFloat(splitData.exactAmounts[userId] || 0);
      case 'shares': {
        const userShares = parseInt(splitData.shares[userId] || 0);
        return totalShares > 0 ? (total * userShares) / totalShares : 0;
      }
      case 'itemized': {
        if (itemizedSubtotal <= 0) return participants.length > 0 ? total / participants.length : 0;
        const dish = parseFloat(splitData.dishAmounts[userId]) || 0;
        return (total * dish) / itemizedSubtotal;
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
          {/* Amount Section (Boxed Card) */}
          <div className="bg-surface-container-low/40 border border-white/10 rounded-3xl p-6 text-center transition-all focus-within:border-white/20 focus-within:bg-surface-container-low/60 shadow-lg">
            <p className="font-inter text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-2 opacity-60 font-bold">
              Total Amount
            </p>
            <div className="flex items-center justify-center gap-2 relative">
              <span className="font-manrope text-3xl sm:text-4xl font-bold text-primary">₹</span>
              <input
                type="number"
                step="0.01"
                className="bg-transparent !border-none !outline-none font-manrope text-5xl sm:text-6xl font-black text-white focus:!ring-0 !ring-offset-0 placeholder:text-white/20 tracking-tighter [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none !shadow-none text-center"
                placeholder="0.00"
                value={form.amount}
                name="amount"
                onChange={handleChange}
                autoFocus
                required
                style={{
                  width: form.amount ? `${Math.max(2, form.amount.length) * 0.65}em` : '1.8em',
                }}
              />
            </div>
          </div>

          {/* Group Selector */}
          {!initialGroupId && (
            <div className="space-y-4">
              <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-inter px-1 opacity-60">
                Select Group
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
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-3 overflow-x-auto no-scrollbar pb-2">
              {EXPENSE_CATEGORIES.map((cat) => {
                const IconComp = getLucideIcon(cat.icon) || Hash;
                const isSelected = form.category === cat.value;
                const catColor = cat.color || '#94a3b8';
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategorySelect(cat.value)}
                    className="flex flex-col items-center gap-2 p-2 rounded-2xl transition-all group"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md"
                      style={{
                        backgroundColor: isSelected ? `${catColor}33` : `${catColor}15`,
                        border: `2px solid ${isSelected ? catColor : 'rgba(255,255,255,0.08)'}`,
                        color: catColor,
                      }}
                    >
                      <IconComp size={20} />
                    </div>
                    <span
                      className={`text-[11px] font-bold transition-colors uppercase tracking-wider ${
                        isSelected ? 'text-white' : 'text-on-surface-variant opacity-70'
                      }`}
                    >
                      {cat.label}
                    </span>
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
          disabled={
            !form.groupId ||
            !form.amount ||
            parseFloat(form.amount || 0) <= 0 ||
            !form.title?.trim()
          }
          className="w-full h-16 rounded-3xl font-manrope font-black text-lg bg-white text-black hover:bg-neutral-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-2xl disabled:opacity-50 disabled:bg-white/10 disabled:text-white/20"
        >
          Next: Who Paid
          <ChevronRight size={22} />
        </Button>
      </div>
    </motion.div>
  );

  const renderStep2 = () => {
    return (
      <motion.div
        key="step-2"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex flex-col gap-6 w-full"
      >
        {/* Step 2 Context Summary Banner */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-surface-container-low/60 border border-white/5">
          <div className="flex flex-col min-w-0 pr-3">
            <span className="font-manrope font-black text-white text-base truncate">
              {form.title || 'Untitled Expense'}
            </span>
            <span className="font-manrope font-bold text-xs text-primary">
              {form.category} · ₹
              {totalAmountValue.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-all text-xs font-bold shrink-0 border border-white/5"
          >
            <PenTool size={13} />
            Edit
          </button>
        </div>

        {/* Who Paid Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="font-manrope font-bold text-white text-base sm:text-lg">Who paid?</h3>
              <p className="text-xs text-on-surface-variant font-inter opacity-60">
                Select the person or people who paid for this expense.
              </p>
            </div>
            <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full shrink-0">
              {activePayersList.length} Selected
            </span>
          </div>

          {/* Members Selection Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
            {uniqueMembers.map((member) => {
              const userId = (member.user?._id || member.user || '').toString();
              const isSelected = selectedPayers.includes(userId);
              const u = member.user || member;
              const isCurrentUser = userId === (user?._id?.toString() || user?.uid);
              return (
                <button
                  key={`payer-btn-${userId}`}
                  type="button"
                  onClick={() => {
                    setSelectedPayers((prev) => {
                      if (prev.includes(userId)) {
                        if (prev.length <= 1) return prev; // Keep at least one
                        return prev.filter((id) => id !== userId);
                      }
                      return [...prev, userId];
                    });
                  }}
                  className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl border transition-all text-left group ${
                    isSelected
                      ? 'bg-white text-black border-white shadow-lg'
                      : 'bg-surface-container-low/40 border-white/5 text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar
                      name={u?.name}
                      src={u?.avatar}
                      size="sm"
                      className={isSelected ? 'border border-black/10' : 'border border-white/10'}
                    />
                    {isSelected && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-black shadow-sm">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-manrope font-bold text-xs truncate ${isSelected ? 'text-black' : 'text-white'}`}
                    >
                      {u?.name || 'Member'}
                    </p>
                    <p
                      className={`text-[10px] font-inter truncate ${isSelected ? 'text-neutral-600' : 'text-on-surface-variant opacity-60'}`}
                    >
                      {isCurrentUser ? 'You' : 'Member'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Multi-Payer Breakdown if 2+ Selected */}
        {activePayersList.length >= 2 && (
          <div className="flex flex-col gap-3 p-4 rounded-2xl bg-surface-container-low/40 border border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-inter opacity-60">
                Paid Split Method
              </label>
              <span className="text-[10px] font-bold text-on-surface-variant opacity-40">
                Split how ₹{totalAmountValue.toFixed(2)} was paid
              </span>
            </div>

            <div className="flex gap-2">
              {[
                { id: 'equal', label: 'Equally' },
                { id: 'exact', label: 'Unequally (₹)' },
                { id: 'percentage', label: 'Unequally (%)' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    setPayerDivisionMode(mode.id);
                    if (mode.id === 'exact') {
                      const pVals = {};
                      activePayersList.forEach((uid) => {
                        pVals[uid] = (calculatedPayerAmounts[uid] || 0).toFixed(2);
                      });
                      setPayerValues(pVals);
                    } else if (mode.id === 'percentage') {
                      const pVals = {};
                      const equalPct = (100 / activePayersList.length).toFixed(1);
                      activePayersList.forEach((uid) => {
                        pVals[uid] = equalPct;
                      });
                      setPayerValues(pVals);
                    }
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    payerDivisionMode === mode.id
                      ? 'bg-primary/20 text-primary border-primary/40 shadow-sm'
                      : 'bg-white/5 text-on-surface-variant border-white/5 hover:bg-white/10'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {/* List of Payers with Inputs */}
            <div className="space-y-2 pt-1">
              {activePayersList.map((uid) => {
                const member = uniqueMembers.find(
                  (m) => (m.user?._id || m.user || '').toString() === uid
                );
                const u = member?.user || member;
                const isCurrentUser = uid === (user?._id?.toString() || user?.uid);
                return (
                  <div
                    key={`payer-row-${uid}`}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-surface-container-low/70 border border-white/5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={u?.name} src={u?.avatar} size="xs" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-white truncate">
                          {u?.name || 'Member'}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[10px] text-primary font-medium">You</span>
                        )}
                      </div>
                    </div>

                    {payerDivisionMode === 'equal' ? (
                      <span className="text-sm font-bold font-manrope text-primary tabular-nums">
                        ₹{(calculatedPayerAmounts[uid] || 0).toFixed(2)}
                      </span>
                    ) : payerDivisionMode === 'exact' ? (
                      <div className="flex items-center gap-1.5 w-32 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10 focus-within:border-primary transition-all">
                        <span className="text-xs text-on-surface-variant font-bold">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full bg-transparent border-none outline-none text-xs text-right font-bold text-white focus:ring-0 p-0"
                          value={payerValues[uid] ?? ''}
                          onChange={(e) =>
                            setPayerValues((prev) => ({ ...prev, [uid]: e.target.value }))
                          }
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 w-28 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10 focus-within:border-primary transition-all">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          className="w-full bg-transparent border-none outline-none text-xs text-right font-bold text-white focus:ring-0 p-0"
                          value={payerValues[uid] ?? ''}
                          onChange={(e) =>
                            setPayerValues((prev) => ({ ...prev, [uid]: e.target.value }))
                          }
                        />
                        <span className="text-xs text-on-surface-variant font-bold">%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Paid Balanced Badge */}
            <div
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                isPayerBalanced
                  ? 'bg-primary/10 border-primary/20 text-primary'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              <div className="flex items-center gap-2">
                {isPayerBalanced ? <CheckCircle2 size={16} /> : <Info size={16} />}
                <span>
                  {isPayerBalanced
                    ? 'Paid Balanced'
                    : payerDivisionMode === 'percentage'
                      ? `Total: ${activePayersList.reduce((s, uid) => s + (parseFloat(payerValues[uid]) || 0), 0).toFixed(1)}% · ${
                          payerTotalPaid < totalAmountValue ? 'Remaining' : 'Over'
                        }`
                      : payerTotalPaid < totalAmountValue
                        ? `Remaining: ₹${(totalAmountValue - payerTotalPaid).toFixed(2)}`
                        : `Over by: ₹${(payerTotalPaid - totalAmountValue).toFixed(2)}`}
                </span>
              </div>
              <span className="font-manrope font-black tabular-nums">
                Total: ₹{payerTotalPaid.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Step 2 Actions */}
        <div className="flex gap-4 mt-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => setStep(1)}
            className="flex-1 h-14 rounded-3xl font-manrope font-bold text-white border-white/20 bg-transparent hover:bg-white/5 transition-all flex items-center justify-center gap-2"
          >
            <ChevronLeft size={20} />
            Back
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (isPayerBalanced && activePayersList.length > 0) setStep(3);
            }}
            disabled={!isPayerBalanced || activePayersList.length === 0}
            className="flex-[2] h-14 rounded-3xl font-manrope font-black text-base bg-white text-black hover:bg-neutral-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-2xl disabled:opacity-50 disabled:bg-white/10 disabled:text-white/20"
          >
            Next: Split Details
            <ChevronRight size={20} />
          </Button>
        </div>
      </motion.div>
    );
  };

  const renderStep3 = () => {
    const allSelected = uniqueMembers.length > 0 && participants.length === uniqueMembers.length;

    return (
      <motion.div
        key="step-3"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex flex-col gap-6 w-full"
      >
        {/* Step 3 Context Summary Banner */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-surface-container-low/60 border border-white/5">
          <div className="flex flex-col min-w-0 pr-3">
            <span className="font-manrope font-black text-white text-base truncate">
              {form.title || 'Untitled Expense'}
            </span>
            <span className="font-manrope font-bold text-xs text-primary">
              {form.category} · ₹
              {totalAmountValue.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              · Paid by {effectivePaidByName}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-all text-xs font-bold shrink-0 border border-white/5"
          >
            <PenTool size={13} />
            Edit
          </button>
        </div>

        {/* Split With Participants Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="font-manrope font-bold text-white text-base sm:text-lg">Split with</h3>
              <p className="text-xs text-on-surface-variant font-inter opacity-60">
                Select who shares in this expense.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (allSelected) {
                    const fallback = user?._id
                      ? [user._id.toString()]
                      : [uniqueMembers[0]?._id?.toString() || ''];
                    setParticipants(fallback.filter(Boolean));
                  } else {
                    setParticipants(
                      uniqueMembers.map((m) => (m.user?._id || m.user || m._id).toString())
                    );
                  }
                }}
                className="text-[10px] font-black text-primary hover:text-primary/80 uppercase tracking-widest transition-colors py-1 px-2 rounded-lg hover:bg-primary/10"
              >
                {allSelected ? 'DESELECT ALL' : 'SELECT ALL'}
              </button>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full shrink-0">
                {participants.length} Active
              </span>
            </div>
          </div>

          {/* Members Selection Grid for Split */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
            {uniqueMembers.map((member) => {
              const u = member.user || (typeof member === 'string' ? null : member);
              const userId = (u?._id || u?.uid || member._id || member).toString();
              const isSelected = participants.includes(userId);
              const isCurrentUser = userId === (user?._id?.toString() || user?.uid);
              return (
                <button
                  key={`split-member-${userId}`}
                  type="button"
                  onClick={() => toggleParticipant(userId)}
                  className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl border transition-all text-left group ${
                    isSelected
                      ? 'bg-white text-black border-white shadow-lg'
                      : 'bg-surface-container-low/40 border-white/5 text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar
                      name={u?.name}
                      src={u?.avatar}
                      size="sm"
                      className={isSelected ? 'border border-black/10' : 'border border-white/10'}
                    />
                    {isSelected && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-black shadow-sm">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-manrope font-bold text-xs truncate ${isSelected ? 'text-black' : 'text-white'}`}
                    >
                      {u?.name || 'Member'}
                    </p>
                    <p
                      className={`text-[10px] font-inter truncate ${isSelected ? 'text-neutral-600' : 'text-on-surface-variant opacity-60'}`}
                    >
                      {isCurrentUser ? 'You' : 'Member'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Split Method Selector */}
        <div className="space-y-3 pt-2">
          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-inter opacity-60 px-1">
            Split Method
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[
              { id: 'equal', icon: Divide, label: 'Equal' },
              { id: 'percentage', icon: Percent, label: 'Percent' },
              { id: 'exact', icon: Target, label: 'Exact' },
              { id: 'shares', icon: PieChart, label: 'Shares' },
              { id: 'itemized', icon: Receipt, label: 'GST' },
            ].map((type) => {
              const Icon = type.icon;
              const isSelected = splitType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleSplitTypeChange(type.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-white text-black border-white shadow-xl scale-[1.02]'
                      : 'bg-surface-container-low/40 border-white/5 text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider leading-none">
                    {type.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Status Indicator for Split Method */}
          <div className="relative pt-1">
            <AnimatePresence mode="wait">
              {splitType === 'percentage' && (
                <motion.div
                  key="percentage-indicator"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${
                    isSplitValid
                      ? 'bg-primary/10 border-primary/20'
                      : leftPercentage > 0
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
                          : leftPercentage > 0
                            ? 'text-on-surface-variant'
                            : 'text-red-400'
                      }
                    />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-inter opacity-60">
                      {isSplitValid
                        ? '100% Balanced'
                        : leftPercentage > 0
                          ? 'Remaining'
                          : 'Over 100%'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-manrope font-black text-sm ${isSplitValid ? 'text-primary' : leftPercentage > 0 ? 'text-white' : 'text-red-400'}`}
                    >
                      {Math.abs(leftPercentage).toFixed(1)}%
                    </span>
                    {isSplitValid && <CheckCircle2 size={14} className="text-primary" />}
                  </div>
                </motion.div>
              )}

              {splitType === 'shares' && (
                <motion.div
                  key="shares-indicator"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl border bg-primary/10 border-primary/20 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <PieChart size={14} className="text-primary" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-inter opacity-60">
                      Total Shares
                    </span>
                  </div>
                  <span className="font-manrope font-black text-sm text-primary">
                    {totalShares} {totalShares === 1 ? 'Share' : 'Shares'}
                  </span>
                </motion.div>
              )}

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
                      {isSplitValid ? 'Split Balanced' : leftValue > 0 ? 'Remaining' : 'Over Limit'}
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
                        Dishes Subtotal
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Member Input Rows when Not Equal Split */}
        {splitType !== 'equal' && (
          <div className="space-y-2 pt-1">
            <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-inter opacity-60 px-1">
              {splitType === 'exact' && 'Exact Amounts per Person'}
              {splitType === 'percentage' && 'Percentage Share per Person'}
              {splitType === 'shares' && 'Share Multipliers per Person'}
              {splitType === 'itemized' && 'Dish Subtotal per Person'}
            </label>
            <div className="space-y-2">
              {participants.map((userId) => {
                const member = uniqueMembers.find(
                  (m) => (m.user?._id || m.user || m._id || '').toString() === userId
                );
                const u = member?.user || member;
                return (
                  <div
                    key={`split-row-${userId}`}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-surface-container-low/70 border border-white/5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={u?.name} src={u?.avatar} size="xs" />
                      <span className="text-xs font-bold text-white truncate">
                        {u?.name || 'Member'}
                      </span>
                    </div>

                    {splitType === 'percentage' && (
                      <div className="flex items-center gap-1.5 w-28 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10 focus-within:border-primary transition-all">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          className="w-full bg-transparent border-none outline-none text-xs text-right font-bold text-white focus:ring-0 p-0"
                          value={splitData.percentages[userId] || ''}
                          onChange={(e) =>
                            handleSplitDataChange(userId, e.target.value, 'percentages')
                          }
                        />
                        <span className="text-xs text-on-surface-variant font-bold">%</span>
                      </div>
                    )}

                    {splitType === 'shares' && (
                      <div className="flex items-center gap-1.5 w-24 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10 focus-within:border-primary transition-all">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="1"
                          className="w-full bg-transparent border-none outline-none text-xs text-right font-bold text-white focus:ring-0 p-0"
                          value={splitData.shares[userId] || '1'}
                          onChange={(e) => handleSplitDataChange(userId, e.target.value, 'shares')}
                        />
                        <span className="text-xs text-on-surface-variant font-bold">×</span>
                      </div>
                    )}

                    {splitType === 'exact' && (
                      <div className="flex items-center gap-1.5 w-32 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10 focus-within:border-primary transition-all">
                        <span className="text-xs text-on-surface-variant font-bold">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full bg-transparent border-none outline-none text-xs text-right font-bold text-white focus:ring-0 p-0"
                          value={splitData.exactAmounts[userId] || ''}
                          onChange={(e) =>
                            handleSplitDataChange(userId, e.target.value, 'exactAmounts')
                          }
                        />
                      </div>
                    )}

                    {splitType === 'itemized' && (
                      <div className="flex items-center gap-1.5 w-32 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10 focus-within:border-primary transition-all">
                        <span className="text-xs text-on-surface-variant font-bold">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full bg-transparent border-none outline-none text-xs text-right font-bold text-white focus:ring-0 p-0"
                          value={splitData.dishAmounts[userId] || ''}
                          onChange={(e) =>
                            handleSplitDataChange(userId, e.target.value, 'dishAmounts')
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
              const dishesSubtotal = scannedItems.reduce(
                (sum, it) => sum + (parseFloat(it.price) || 0),
                0
              );
              const scanGap = totalAmountValue - dishesSubtotal;
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
          </motion.div>
        )}

        {/* Live Distribution Preview */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-inter opacity-60">
              Distribution Preview
            </label>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
              {participants.length} Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {uniqueMembers
              .filter((m) => {
                const uid = (m.user?._id || m.user || m._id || '').toString();
                return participants.includes(uid);
              })
              .map((member) => {
                const u = member.user || member;
                const userId = (u?._id || u?.uid || member._id || member).toString();
                const previewAmt = calculatePreviewAmount(userId);
                return (
                  <div
                    key={`preview-${userId}`}
                    className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low/50 border border-white/5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={u?.name} src={u?.avatar} size="xs" />
                      <span className="font-manrope font-bold text-xs text-white truncate">
                        {u?.name}
                      </span>
                    </div>
                    <span className="font-manrope font-black text-xs text-primary tabular-nums">
                      ₹{previewAmt.toFixed(2)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Step 3 Actions */}
        <div className="flex gap-4 mt-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => setStep(2)}
            className="flex-1 h-14 rounded-3xl font-manrope font-bold text-white border-white/20 bg-transparent hover:bg-white/5 transition-all flex items-center justify-center gap-2"
          >
            <ChevronLeft size={20} />
            Back
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            loading={loading || isSubmitting}
            disabled={!isSplitValid || participants.length === 0}
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
    <div className="w-full flex flex-col">
      {/* 3-Step Stepper Progress Bar */}
      <div className="flex flex-col gap-2 mb-6 w-full shrink-0">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">
            {step === 1 && 'STEP 1 OF 3 · ESSENTIALS'}
            {step === 2 && 'STEP 2 OF 3 · WHO PAID?'}
            {step === 3 && 'STEP 3 OF 3 · SPLIT WITH'}
          </span>
          <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider">
            {step === 1 && 'Amount & Details'}
            {step === 2 &&
              `${activePayersList.length} Payer${activePayersList.length === 1 ? '' : 's'}`}
            {step === 3 && `${participants.length} Split with`}
          </span>
        </div>
        <div className="flex gap-2 w-full">
          <div
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              step >= 1 ? 'bg-primary shadow-[0_0_8px_rgba(20,241,149,0.3)]' : 'bg-white/10'
            }`}
          />
          <div
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              step >= 2 ? 'bg-primary shadow-[0_0_8px_rgba(20,241,149,0.3)]' : 'bg-white/10'
            }`}
          />
          <div
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              step >= 3 ? 'bg-primary shadow-[0_0_8px_rgba(20,241,149,0.3)]' : 'bg-white/10'
            }`}
          />
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </AnimatePresence>
    </div>
  );
};

export default ExpenseForm;
