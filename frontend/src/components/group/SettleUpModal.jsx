import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import Loader from '../common/Loader.jsx';
import Input from '../common/Input.jsx';
import expenseService from '../../services/expenseService.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { fetchExpenses } from '../../redux/expenseSlice.js';

const SettleUpModal = ({ isOpen, onClose, groupId, userId, onSettled, forcedPayeeId = null }) => {
  const dispatch = useDispatch();
  const { currentGroup } = useSelector((state) => state.groups);
  const [loading, setLoading] = useState(true);
  const [totalOwe, setTotalOwe] = useState(0);
  const [settlements, setSettlements] = useState([]);
  
  // State for partial payment processing
  const [partialPayment, setPartialPayment] = useState(null); // { to: userId, originalAmount: float, amount: float }
  
  // Processing state
  const [processing, setProcessing] = useState(false);

  const loadSettlementPlan = async () => {
    setLoading(true);
    try {
      const res = await expenseService.getUserSettlementPlan(groupId, userId);
      let plan = res.data.data.settlements || [];
      
      // If forcedPayeeId is provided, filter the plan to only show that person
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

  useEffect(() => {
    if (isOpen && groupId && userId) {
      setPartialPayment(null);
      loadSettlementPlan();
    }
  }, [isOpen, groupId, userId, forcedPayeeId]);

  const handleSettle = async (payeeId, amount, notes = 'Settled up') => {
    setProcessing(true);
    try {
      await expenseService.createSettlement(groupId, {
        payee: payeeId,
        amount: parseFloat(amount),
        notes,
      }, userId);
      toast.success('Payment recorded successfully');
      
      // Update local state without waiting for full reload to keep UI snappy
      setProcessing(false);
      setPartialPayment(null);
      
      // trigger parent update
      if (onSettled) onSettled();
      dispatch(fetchExpenses({ groupId }));

      // Reload plan in background
      loadSettlementPlan();
      
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
      setProcessing(false);
    }
  };

  const handleSettleAll = async () => {
    if (settlements.length === 0) return;
    
    setProcessing(true);
    try {
      // We can execute these in parallel for speed if desired, 
      // but sequential is safer for logs.
      for (const debt of settlements) {
        if (debt.amount > 0) {
          await expenseService.createSettlement(groupId, {
            payee: debt.to,
            amount: debt.amount,
            notes: 'Settled all debts',
          }, userId);
        }
      }
      toast.success('All debts settled successfully!');
      
      setProcessing(false);
      if (onSettled) onSettled();
      dispatch(fetchExpenses({ groupId }));

      loadSettlementPlan();
      
    } catch (err) {
      toast.error('Partially settled, please try again to clear remaining debts');
      setProcessing(false);
      loadSettlementPlan();
    }
  };

  if (!isOpen) return null;

  return (
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
                {settlements.map((debt, index) => (
                  <motion.div 
                    key={debt.to}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-xl bg-surface-container-highest/30 border border-white/5 flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="w-10 h-10 rounded-full bg-surface-highest flex items-center justify-center border border-white/5 shadow-inner">
                        <LucideIcons.ArrowUpRight size={18} className="text-red-400" />
                      </div>
                      <div>
                        <p className="text-sm text-on-surface-variant font-inter">You should pay:</p>
                        <p className="text-base text-white font-inter">
                          <span className="font-bold text-red-300">{formatCurrency(debt.amount)}</span>
                          <span className="mx-2 opacity-50">→</span>
                          <span className="font-semibold">
                            {(() => {
                              const member = currentGroup?.members?.find(m => {
                                const mId = (m?.user?._id || m?.user?.uid || m?.uid || m?._id || m || '').toString();
                                return mId === debt.to;
                              });
                              // If it's an expanded member object, use the user name. 
                              // Otherwise, we might only have the ID or the raw string.
                              return member?.user?.name || member?.name || 'Group Member';
                            })()}
                          </span>
                        </p>
                      </div>
                    </div>
                    
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
                      <div className="flex gap-2 mt-2">
                        <Button 
                          variant="ghost" 
                          disabled={processing}
                          className="flex-1 h-9 text-xs border border-white/5"
                          onClick={() => setPartialPayment({ to: debt.to, originalAmount: debt.amount, amount: debt.amount })}
                        >
                          Partial Payment
                        </Button>
                        <Button 
                          disabled={processing}
                          className="flex-1 h-9 text-xs bg-white text-black hover:bg-white/90 font-bold"
                          onClick={() => handleSettle(debt.to, debt.amount)}
                        >
                          Mark as Paid
                        </Button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            <p className="text-[10px] text-on-surface-variant font-inter italic opacity-60 text-center mt-2 px-4">
              These suggestions use a min-flow algorithm to prevent redundant transfers between group members.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SettleUpModal;
