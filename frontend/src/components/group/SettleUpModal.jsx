import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import toast from 'react-hot-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import Loader from '../common/Loader.jsx';
import Input from '../common/Input.jsx';
import expenseService from '../../services/expenseService.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { handlePayment, hasPaymentMethod } from '../../utils/upiUtils.js';

const SettleUpModal = ({ isOpen, onClose, groupId, userId, onSettled, forcedPayeeId = null }) => {
  const dispatch = useDispatch();
  const { currentGroup } = useSelector((state) => state.groups);
  const [loading, setLoading] = useState(true);
  const [totalOwe, setTotalOwe] = useState(0);
  const [settlements, setSettlements] = useState([]);

  // State for partial payment processing
  const [partialPayment, setPartialPayment] = useState(null);

  // Processing state
  const [processing, setProcessing] = useState(false);

  // UPI: Payment details for each member keyed by uid
  const [memberPaymentDetails, setMemberPaymentDetails] = useState({});
  const [fetchingPayments, setFetchingPayments] = useState(false);

  // UPI: Confirmation state — which debt is being confirmed for UPI pay
  const [upiConfirm, setUpiConfirm] = useState(null); // { debt, receiver }

  const loadSettlementPlan = async () => {
    setLoading(true);
    try {
      const res = await expenseService.getUserSettlementPlan(groupId, userId);
      let plan = res.data.data.settlements || [];

      if (forcedPayeeId) {
        plan = plan.filter(p => p.to === forcedPayeeId);
      }

      setTotalOwe(plan.reduce((sum, p) => sum + p.amount, 0));
      setSettlements(plan);
    } catch (err) {
      toast.error('Failed to load settlement plan');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch Firestore payment details for all members who are receivers in the plan.
   * Uses a single parallel Promise.all for efficiency.
   */
  const loadMemberPaymentDetails = async (plan) => {
    const receiverIds = [...new Set(plan.map(p => p.to))];
    if (receiverIds.length === 0) return;

    setFetchingPayments(true);
    try {
      const fetches = receiverIds.map(uid =>
        getDoc(doc(db, 'users', uid)).then(snap => ({
          uid,
          data: snap.exists() ? snap.data() : null,
        }))
      );
      const results = await Promise.all(fetches);
      const details = {};
      results.forEach(({ uid, data }) => {
        details[uid] = data ? { upiId: data.upiId || '', name: data.name || '' } : null;
      });
      setMemberPaymentDetails(details);
    } catch (err) {
      console.warn('Failed to fetch member payment details:', err);
    } finally {
      setFetchingPayments(false);
    }
  };

  useEffect(() => {
    if (isOpen && groupId && userId) {
      setPartialPayment(null);
      setUpiConfirm(null);
      setMemberPaymentDetails({});

      loadSettlementPlan().then(() => {
        // After plan loaded, load payment details for those members
      });
    }
  }, [isOpen, groupId, userId, forcedPayeeId]);

  // Load payment details whenever settlements change
  useEffect(() => {
    if (isOpen && settlements.length > 0) {
      loadMemberPaymentDetails(settlements);
    }
  }, [settlements, isOpen]);

  const handleSettle = async (payeeId, amount, notes = 'Settled up') => {
    setProcessing(true);

    if (onSettled) onSettled();
    toast.success('Payment recorded successfully');

    setProcessing(false);
    setPartialPayment(null);
    onClose();

    try {
      expenseService.createSettlement(groupId, {
        payee: payeeId,
        amount: parseFloat(amount),
        notes,
      }, userId).catch(err => {
        console.warn("Settlement delayed or failed:", err);
      });
    } catch (err) {
      toast.error('Failed to record payment');
    }
  };

  const handleSettleAll = async () => {
    if (settlements.length === 0) return;

    setProcessing(true);

    if (onSettled) onSettled();
    toast.success('All debts settled successfully!');
    setProcessing(false);
    onClose();

    try {
      settlements.forEach(debt => {
        if (debt.amount > 0) {
          expenseService.createSettlement(groupId, {
            payee: debt.to,
            amount: debt.amount,
            notes: 'Settled all debts',
          }, userId).catch(err => console.warn(err));
        }
      });
    } catch (err) {
      toast.error('Partially settled, please try again to clear remaining debts');
    }
  };

  const handleUPIPay = (debt, receiverDetails) => {
    const receiver = {
      name: receiverDetails?.name || getMemberName(debt.to),
      upiId: receiverDetails?.upiId || '',
    };
    setUpiConfirm({ debt, receiver });
  };

  const confirmUPIPay = () => {
    if (!upiConfirm) return;
    const { debt, receiver } = upiConfirm;

    toast.success('Opening payment app…', {
      icon: '📲',
      duration: 3000,
    });

    const result = handlePayment(receiver, debt.amount, `PayMatrix – pay ${receiver.name}`);

    if (!result.success) {
      toast.error(result.error || 'Failed to open payment app');
    }

    setUpiConfirm(null);
  };

  const getMemberName = (uid) => {
    const member = currentGroup?.members?.find(m => {
      const mId = (m?.user?._id || m?.user?.uid || m?.uid || m?._id || m || '').toString();
      return mId === uid;
    });
    return member?.user?.name || member?.name || 'Group Member';
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Settle Up" size="md">
        <div className="py-4">
          {loading ? (
            <Loader className="py-12" />
          ) : settlements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
                <LucideIcons.CheckCircle size={32} className="text-primary" />
              </div>
              <h3 className="text-xl font-bold font-manrope text-white mb-2 tracking-tight">You are all settled up</h3>
              <p className="text-sm text-on-surface-variant font-inter">
                {forcedPayeeId ? "You have no outstanding dues with this member." : "You have no outstanding dues in this group."}
              </p>
              <Button onClick={onClose} className="mt-8 px-8">Close</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                <div>
                  <p className="text-xs text-primary font-bold uppercase tracking-widest mb-1">Total You Owe</p>
                  <p className="text-3xl font-manrope font-black text-white">{formatCurrency(totalOwe)}</p>
                </div>
                <Button onClick={handleSettleAll} disabled={processing} className="h-10 px-4 text-xs tracking-wider">
                  {processing ? 'Processing...' : 'Settle All'}
                </Button>
              </div>

              <h4 className="text-sm font-semibold text-on-surface-variant font-inter mt-2 mb-1">
                {forcedPayeeId ? "Specific Debt for Reconciliation" : "Recommended Payments"}
              </h4>

              <div className="space-y-3">
                <AnimatePresence>
                  {settlements.map((debt, index) => {
                    const receiverDetails = memberPaymentDetails[debt.to];
                    const receiverHasPayment = hasPaymentMethod(receiverDetails);
                    const memberName = getMemberName(debt.to);

                    return (
                      <motion.div
                        key={debt.to}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 rounded-xl bg-surface-container-highest/30 border border-white/5 flex flex-col gap-3"
                      >
                        {/* Debt Info Row */}
                        <div className="relative flex items-center gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
                          {/* Payment Method Badge - Moved to absolute corner to prevent overlap */}
                          {!fetchingPayments && (
                            <div className="absolute top-3 right-3">
                              {receiverHasPayment ? (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/10 text-emerald-400/80 text-[8px] font-black uppercase tracking-widest shadow-lg backdrop-blur-sm">
                                  <LucideIcons.CheckCircle2 size={9} />
                                  Ready
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/10 text-amber-400/60 text-[8px] font-black uppercase tracking-widest shadow-lg backdrop-blur-sm">
                                  <LucideIcons.AlertCircle size={9} />
                                  No ID
                                </span>
                              )}
                            </div>
                          )}

                          <div className="w-12 h-12 rounded-2xl bg-surface-highest flex items-center justify-center border border-white/5 shadow-inner shrink-0">
                            <LucideIcons.ArrowUpRight size={20} className="text-red-400" />
                          </div>
                          
                          <div className="flex-1 min-w-0 pr-12"> {/* Added right padding to protect badge space */}
                            <p className="text-[10px] text-white/30 font-black uppercase tracking-widest leading-none mb-2">You should pay</p>
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-xl font-bold text-red-300 leading-none">{formatCurrency(debt.amount)}</span>
                              <span className="text-white/20 font-light tracking-tighter">→</span>
                              <span className="text-sm font-semibold text-white/90 truncate max-w-[120px]">{memberName}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {partialPayment?.to === debt.to ? (
                          <div className="flex items-end gap-2 mt-2 p-3 bg-surface-lowest rounded-lg border border-white/5">
                            <div className="flex-1">
                              <Input
                                label="Amount to Pay"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={debt.amount}
                                value={partialPayment.amount}
                                onChange={(e) => setPartialPayment({ ...partialPayment, amount: e.target.value })}
                                autoFocus
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                className="h-[52px] px-3 border border-white/5"
                                onClick={() => setPartialPayment(null)}
                                disabled={processing}
                              >
                                Cancel
                              </Button>
                              <Button
                                className="h-[52px] px-5 bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                disabled={processing || !partialPayment.amount || parseFloat(partialPayment.amount) <= 0}
                                onClick={() => handleSettle(debt.to, partialPayment.amount)}
                              >
                                {processing ? '...' : 'Confirm'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 mt-1">
                            <div className="flex gap-2">
                              {/* Partial Payment */}
                              <Button
                                variant="ghost"
                                disabled={processing}
                                className="flex-1 h-9 text-xs border border-white/5"
                                onClick={() => setPartialPayment({ to: debt.to, originalAmount: debt.amount, amount: debt.amount })}
                              >
                                Partial
                              </Button>

                              {/* Mark as Paid */}
                              <Button
                                disabled={processing}
                                className="flex-1 h-9 text-xs bg-white text-black hover:bg-white/90 font-bold"
                                onClick={() => handleSettle(debt.to, debt.amount)}
                              >
                                Mark Paid
                              </Button>
                            </div>

                            {/* Pay via UPI - Primary Action below */}
                            <button
                              disabled={processing || !receiverHasPayment || fetchingPayments}
                              onClick={() => handleUPIPay(debt, receiverDetails)}
                              title={receiverHasPayment ? `Pay ${memberName} via UPI` : `${memberName} has not added a UPI ID`}
                              className={`
                                w-full h-11 rounded-xl text-[11px] font-black uppercase tracking-widest
                                flex items-center justify-center gap-2 transition-all border
                                ${receiverHasPayment && !fetchingPayments
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 active:scale-95'
                                  : 'bg-white/[0.03] border-white/5 text-white/20 opacity-40 cursor-not-allowed grayscale'}
                              `}
                            >
                              <LucideIcons.Smartphone size={14} />
                              Pay via UPI
                            </button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              <p className="text-[10px] text-on-surface-variant font-inter italic opacity-60 text-center mt-2 px-4">
                These suggestions use a min-flow algorithm to prevent redundant transfers between group members.
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* UPI Confirmation Modal */}
      <AnimatePresence>
        {upiConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setUpiConfirm(null)}
            />
            <motion.div
              className="relative w-full max-w-sm bg-[#1a1a1a] rounded-[2rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] border border-white/10 z-10 overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            >
              {/* Accent line */}
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />

              <div className="p-8">
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
                  <LucideIcons.Smartphone size={28} className="text-emerald-400" />
                </div>

                {/* Text */}
                <h3 className="text-xl font-black font-manrope text-white tracking-tight mb-1">
                  Open Payment App
                </h3>
                <p className="text-sm text-white/50 font-inter leading-relaxed mb-6">
                  This will open your UPI app to pay{' '}
                  <span className="text-white font-semibold">{upiConfirm.receiver.name}</span>
                  {' '}
                  <span className="text-emerald-400 font-bold">{formatCurrency(upiConfirm.debt.amount)}</span>
                  . Your OS will let you choose between GPay, PhonePe, Paytm, etc.
                </p>

                {/* UPI ID preview (if available) */}
                {upiConfirm.receiver.upiId && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/5 mb-6">
                    <LucideIcons.AtSign size={14} className="text-white/40 shrink-0" />
                    <span className="text-xs font-mono text-white/60 truncate">{upiConfirm.receiver.upiId}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setUpiConfirm(null)}
                    className="flex-1 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-black tracking-widest uppercase transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmUPIPay}
                    className="flex-1 py-3.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-xs font-black tracking-widest uppercase transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <LucideIcons.ExternalLink size={14} />
                    Pay Now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SettleUpModal;
