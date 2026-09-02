import { useState } from 'react';
import { CreditCard, CheckCircle2, AlertTriangle, Smartphone } from 'lucide-react';
import Input from '../common/Input.jsx';
import Button from '../common/Button.jsx';
import { validateUPIId, hasPaymentMethod } from '../../utils/upiUtils.js';
import toast from 'react-hot-toast';

const PaymentSettingsCard = ({ isOwnProfile, currentUser, targetUser, isOnline, onUpdateUPI }) => {
  const displayUser = isOwnProfile ? currentUser : targetUser;
  const [upiId, setUpiId] = useState(currentUser?.upiId || '');
  const [paymentError, setPaymentError] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  const handleSave = async (e) => {
    e?.preventDefault();
    setPaymentError('');
    const trimmed = upiId.trim();

    if (!trimmed) {
      setPaymentError('Please enter a valid UPI ID (e.g. name@okhdfc).');
      return;
    }

    if (!validateUPIId(trimmed)) {
      setPaymentError('Invalid UPI ID format. Standard IDs include "@" (e.g., name@okhdfc).');
      return;
    }

    setSavingPayment(true);
    try {
      await onUpdateUPI(trimmed);
      toast.success('UPI ID updated successfully!');
    } catch {
      toast.error('Failed to update UPI ID');
    } finally {
      setSavingPayment(false);
    }
  };

  const userHasPayment = hasPaymentMethod(displayUser);

  return (
    <div className="glass-card p-6 sm:p-8 border border-white/5 bg-white/[0.01] space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <CreditCard size={18} />
          </div>
          <div>
            <h3 className="text-xs font-black text-white/50 uppercase tracking-[0.2em] font-manrope">
              UPI Payment Details
            </h3>
            <p className="text-[11px] text-white/30 font-inter mt-0.5">
              {isOwnProfile
                ? 'Your friends will use this UPI ID to pay you via QR.'
                : 'Direct UPI address configured by this member.'}
            </p>
          </div>
        </div>

        {userHasPayment ? (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
            <CheckCircle2 size={12} /> Configured
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest">
            <AlertTriangle size={12} /> Missing
          </span>
        )}
      </div>

      {isOwnProfile ? (
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="UPI ID / VPA"
            value={upiId}
            onChange={(e) => {
              setUpiId(e.target.value);
              setPaymentError('');
            }}
            placeholder="e.g. username@okhdfcbank"
            disabled={!isOnline || savingPayment}
            error={paymentError}
          />

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-white/40 text-xs">
              <Smartphone size={14} />
              <span>GPay, PhonePe, Paytm, BHIM compatible</span>
            </div>
            <Button
              type="submit"
              disabled={!isOnline || savingPayment || !upiId.trim()}
              className="h-10 px-6 text-xs uppercase font-bold tracking-widest bg-white text-black hover:bg-neutral-200"
            >
              {savingPayment ? 'Saving...' : 'Save UPI ID'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
              Configured UPI ID
            </p>
            <p className="text-sm font-mono font-bold text-white mt-1">
              {displayUser?.upiId || 'No UPI ID provided'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentSettingsCard;
