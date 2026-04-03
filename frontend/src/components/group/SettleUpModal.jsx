import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { Smartphone } from 'lucide-react';
import expenseService from '../../services/expenseService.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { handleSmartPayment, hasPaymentMethod, IOS_CHOOSER_APPS, getAppDeepLink, UPI_APPS } from '../../utils/upiUtils.js';
import Avatar from '../common/Avatar.jsx';
import { getInitials } from '../../utils/nameUtils.js';

const SettleUpModal = ({ isOpen, onClose, groupId, userId, onSettled, forcedPayeeId = null }) => {
  const dispatch = useDispatch();
  const { currentGroup } = useSelector((state) => state.groups);
  const { user: currentUser } = useSelector((state) => state.auth);
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

  // iOS Chooser modal state  
  const [chooserState, setChooserState] = useState(null); // { debt, receiver }

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
        details[uid] = data
          ? { upiId: data.upiId || '', name: data.name || '', preferredApp: data.preferredApp || 'default' }
          : null;
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
      setChooserState(null);
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
    console.log('[UPI DEBUG] handleUPIPay called', { debt, receiverDetails });
    const member = getMemberName(debt.to);
    const receiver = {
      name: receiverDetails?.name || member?.name || (typeof member === 'string' ? member : 'Group Member'),
      upiId: receiverDetails?.upiId || '',
    };
    console.log('[UPI DEBUG] Setting upiConfirm:', { debt, receiver });
    setUpiConfirm({ debt, receiver });
  };

  const confirmUPIPay = (overrideAppId = null) => {
    if (!upiConfirm) return;
    const { debt, receiver } = upiConfirm;
    const payerApp = overrideAppId || currentUser?.preferredApp || 'default';

    const result = handleSmartPayment(
      receiver,
      debt.amount,
      `PayMatrix – pay ${receiver.name}`,
      payerApp,
    );

    if (result.needsChooser) {
      // iOS + default → open chooser instead
      setChooserState({ debt, receiver });
      setUpiConfirm(null);
      return;
    }

    if (!result.success) {
      toast.error(result.error || 'Failed to open payment app');
    } else {
      toast.success('Opening payment app…', { icon: '📲', duration: 3000 });
    }

    setUpiConfirm(null);
  };

  const handleChooserPay = (appId) => {
    if (!chooserState) return;
    const { debt, receiver } = chooserState;
    const url = getAppDeepLink(appId, receiver.upiId, receiver.name, debt.amount, `PayMatrix – pay ${receiver.name}`);
    toast.success('Opening payment app…', { icon: '📲', duration: 3000 });
    window.location.href = url;
    setChooserState(null);
  };

  const handleCopyUPI = (upiId) => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId).then(() => {
      toast.success('UPI ID copied!', { icon: '📋' });
    }).catch(() => {
      toast.error('Could not copy UPI ID');
    });
  };

  const getMemberName = (uid) => {
    const member = currentGroup?.members?.find(m => {
      const mId = (m?.user?._id || m?.user?.uid || m?.uid || m?._id || m || '').toString();
      return mId === uid;
    });
    return member?.user || member || { name: 'Group Member' };
  };

  if (!isOpen) return null;

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title="Settle Up" size="md">
      {/* Render logs to verify if state changes trigger portal renders */}
      {upiConfirm && console.log('[UPI DEBUG] Rendering upiConfirm portal')}
      {chooserState && console.log('[UPI DEBUG] Rendering chooserState portal')}

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
                    const receiverUser = getMemberName(debt.to);

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
                          {/* Payment Method Badge */}
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

                          <Avatar 
                            name={receiverUser.name} 
                            src={receiverUser.avatar} 
                            size="md" 
                            className="rounded-2xl border border-white/5 shadow-inner shrink-0" 
                          />
                          
                          <div className="flex-1 min-w-0 pr-12">
                            <p className="text-[10px] text-white/30 font-black uppercase tracking-widest leading-none mb-2">You should pay</p>
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-xl font-bold text-red-300 leading-none">{formatCurrency(debt.amount)}</span>
                              <span className="text-white/20 font-light tracking-tighter">→</span>
                              <span className="text-sm font-semibold text-white/90 truncate max-w-[120px]">{receiverUser.name}</span>
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
                              title={receiverHasPayment ? `Pay ${receiverUser.name} via UPI` : `${receiverUser.name} has not added a UPI ID`}
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

        {/* Always-mounted portals moved inside Modal children to share lifecycle */}
        {createPortal(
          <AnimatePresence>
            {upiConfirm && (
              <div key="upi-confirm-overlay" className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-4">
                <motion.div
                  key="upi-backdrop"
                  className="absolute inset-0 bg-black/80 backdrop-blur-md"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setUpiConfirm(null)}
                />
                <motion.div
                  key="upi-card"
                  className="relative w-full max-w-sm bg-[#1a1a1a] rounded-[2rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] border border-white/10 z-[151] overflow-hidden"
                  initial={{ opacity: 0, scale: 0.9, y: 40 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                >
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
                  <div className="p-7">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 overflow-hidden">
                      {(() => {
                        const payerApp = currentUser?.preferredApp || 'default';
                        const appMeta = UPI_APPS.find(a => a.id === payerApp);
                        if (payerApp === 'default') return <LucideIcons.Smartphone size={28} className="text-emerald-400" />;
                        return <img src={appMeta?.icon} alt={appMeta?.label} className="w-8 h-8 object-contain" />;
                      })()}
                    </div>
                    <h3 className="text-xl font-black font-manrope text-white tracking-tight mb-1">Open Payment App</h3>
                    {(() => {
                      const payerApp = currentUser?.preferredApp || 'default';
                      const appMeta = UPI_APPS.find(a => a.id === payerApp);
                      return (
                        <p className="text-sm text-white/50 font-inter leading-relaxed mb-5">
                          Pay <span className="text-white font-semibold">{upiConfirm.receiver.name}</span>{' '}
                          <span className="text-emerald-400 font-bold">{formatCurrency(upiConfirm.debt.amount)}</span>
                          {payerApp !== 'default' && appMeta ? (
                            <span className="text-white/40"> via <span className="text-white/70 font-semibold">{appMeta.label}</span></span>
                          ) : (
                            <span className="text-white/40"> via your preferred UPI app</span>
                          )}
                        </p>
                      );
                    })()}
                    <p className="text-[10px] text-white/25 font-inter mb-5">Opens in your selected payment app</p>
                    {upiConfirm.receiver.upiId && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/5 mb-5">
                        <LucideIcons.AtSign size={13} className="text-white/40 shrink-0" />
                        <span className="text-xs font-mono text-white/60 truncate flex-1">{upiConfirm.receiver.upiId}</span>
                        <button onClick={() => handleCopyUPI(upiConfirm.receiver.upiId)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 text-[9px] font-black uppercase tracking-wider transition-all">
                          <LucideIcons.Copy size={10} /> Copy
                        </button>
                      </div>
                    )}
                    <div className="flex gap-3 mb-3">
                      <button onClick={() => setUpiConfirm(null)} className="flex-1 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-black tracking-widest uppercase transition-all">Cancel</button>
                      <button onClick={() => confirmUPIPay()} className="flex-1 py-3.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-xs font-black tracking-widest uppercase transition-all active:scale-95 flex items-center justify-center gap-2">
                        <LucideIcons.ExternalLink size={14} /> Pay Now
                      </button>
                    </div>
                    <button onClick={() => { setChooserState({ debt: upiConfirm.debt, receiver: upiConfirm.receiver }); setUpiConfirm(null); }} className="w-full py-2.5 rounded-xl text-white/25 hover:text-white/50 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5">
                      <LucideIcons.LayoutGrid size={11} /> Choose app manually
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

        {createPortal(
          <AnimatePresence>
            {chooserState && (
              <div key="chooser-overlay" className="fixed inset-0 z-[160] flex items-end justify-center">
                <motion.div
                  key="chooser-backdrop"
                  className="absolute inset-0 bg-black/80 backdrop-blur-md"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setChooserState(null)}
                />
                <motion.div
                  key="chooser-card"
                  className="relative w-full max-w-lg bg-[#1c1c1e] rounded-t-[2rem] shadow-[0_-20px_60px_rgba(0,0,0,0.8)] border-t border-white/10 z-[161] overflow-hidden pb-safe"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                >
                  <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mt-3 mb-5" />
                  <div className="px-6 pb-8">
                    <div className="text-center mb-6">
                      <p className="text-xs text-white/30 font-bold uppercase tracking-widest mb-1">Pay via</p>
                      <h3 className="text-lg font-black font-manrope text-white tracking-tight">Choose payment app</h3>
                      <p className="text-sm text-white/40 font-inter mt-1">
                        <span className="text-emerald-400 font-bold">{formatCurrency(chooserState.debt.amount)}</span>
                        {' → '}
                        <span className="text-white/70">{chooserState.receiver.name}</span>
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      {IOS_CHOOSER_APPS.map((app) => (
                        <button key={app.id} onClick={() => handleChooserPay(app.id)} style={{ '--app-color': app.color }} className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 transition-all active:scale-95 group overflow-hidden">
                          {app.id === 'default' ? <LucideIcons.Smartphone size={28} className="text-white/40 group-hover:text-white/70" /> : <img src={app.icon} alt={app.label} className="w-10 h-10 object-contain" />}
                          <span className="text-[11px] font-bold text-white/60 group-hover:text-white/90 transition-colors text-center leading-tight">{app.shortLabel}</span>
                        </button>
                      ))}
                    </div>
                    {chooserState.receiver.upiId && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 mb-4">
                        <LucideIcons.AtSign size={13} className="text-white/30 shrink-0" />
                        <span className="text-xs font-mono text-white/40 truncate flex-1">{chooserState.receiver.upiId}</span>
                        <button onClick={() => handleCopyUPI(chooserState.receiver.upiId)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 text-[9px] font-black uppercase tracking-wider transition-all">
                          <LucideIcons.Copy size={10} /> Copy UPI ID
                        </button>
                      </div>
                    )}
                    <button onClick={() => setChooserState(null)} className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm font-bold transition-all">Cancel</button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
      </Modal>
  );
};

export default SettleUpModal;
