import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Copy,
  Check,
  QrCode,
  Pencil,
  X,
  Download,
  AtSign,
  Sparkles,
} from 'lucide-react';
import Input from '../common/Input.jsx';
import Button from '../common/Button.jsx';
import { validateUPIId, hasPaymentMethod, getUPIQRValue } from '../../utils/upiUtils.js';
import toast from 'react-hot-toast';

const POPULAR_UPI_HANDLES = [
  '@okaxis',
  '@okhdfcbank',
  '@oksbi',
  '@paytm',
  '@ybl',
  '@ibl',
  '@icici',
];

const PaymentSettingsCard = ({ isOwnProfile, currentUser, targetUser, isOnline, onUpdateUPI }) => {
  const displayUser = isOwnProfile ? currentUser : targetUser;
  const userHasPayment = hasPaymentMethod(displayUser);
  const displayUpiId = displayUser?.upiId || '';

  const [upiId, setUpiId] = useState(currentUser?.upiId || '');
  const [isEditing, setIsEditing] = useState(!currentUser?.upiId);
  const [paymentError, setPaymentError] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const qrCanvasRef = useRef(null);

  const handleSave = async (e) => {
    e?.preventDefault();
    setPaymentError('');
    const trimmed = upiId.trim();

    if (!trimmed) {
      setPaymentError('Please enter a valid UPI ID (e.g. name@okhdfcbank).');
      return;
    }

    if (!validateUPIId(trimmed)) {
      setPaymentError('Invalid format. Standard UPI IDs include "@" (e.g., name@okhdfcbank).');
      return;
    }

    setSavingPayment(true);
    try {
      await onUpdateUPI(trimmed);
      toast.success('UPI ID updated successfully!');
      setIsEditing(false);
    } catch {
      toast.error('Failed to update UPI ID');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleCopyUPI = (idToCopy) => {
    const text = idToCopy || displayUpiId;
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        toast.success('UPI ID copied to clipboard!', { icon: '📋' });
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error('Could not copy UPI ID'));
  };

  const handleSelectHandle = (suffix) => {
    setPaymentError('');
    const current = upiId.trim();
    if (!current) {
      setUpiId(suffix);
      return;
    }
    if (current.includes('@')) {
      const prefix = current.split('@')[0];
      setUpiId(`${prefix}${suffix}`);
    } else {
      setUpiId(`${current}${suffix}`);
    }
  };

  const handleCancelEdit = () => {
    setUpiId(currentUser?.upiId || '');
    setPaymentError('');
    setIsEditing(false);
  };

  const handleDownloadQR = async () => {
    const canvas = qrCanvasRef.current?.querySelector('canvas');
    if (!canvas) {
      toast.error('QR code not ready yet');
      return;
    }

    const safeName = (displayUser?.name || 'UPI_Payment').replace(/[^a-z0-9]/gi, '_');
    const fileName = `PayMatrix_UPI_${safeName}.png`;

    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        toast.error('Could not generate QR image');
        return;
      }

      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${displayUser?.name || 'PayMatrix'} UPI QR`,
          text: `Scan to pay ${displayUser?.name || ''} via UPI (${displayUpiId})`.trim(),
        });
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('QR saved to your device', { icon: '⬇️' });
    } catch (err) {
      if (err?.name === 'AbortError') return;
      toast.error('Could not save QR');
    }
  };

  return (
    <>
      <div className="glass-card p-5 sm:p-7 border border-white/5 bg-white/[0.01] space-y-5">
        {/* Header Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
              <CreditCard size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-black text-white/70 uppercase tracking-[0.18em] font-manrope truncate">
                UPI Payment Details
              </h3>
              <p className="text-[11px] text-white/40 font-inter mt-0.5 truncate">
                {isOwnProfile
                  ? 'Your friends will use this UPI ID to pay you via QR.'
                  : 'Direct UPI address configured by this member.'}
              </p>
            </div>
          </div>

          {userHasPayment ? (
            <span className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
              <CheckCircle2 size={11} /> Configured
            </span>
          ) : (
            <span className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider">
              <AlertTriangle size={11} /> Missing
            </span>
          )}
        </div>

        {/* Card Body */}
        {isOwnProfile ? (
          <div>
            {!isEditing && userHasPayment ? (
              /* Configured State — Sleek Mobile-Friendly Virtual Card */
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent p-4 sm:p-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  {/* Subtle top accent bar */}
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-400/40 via-primary/30 to-transparent" />

                  {/* Card Sub-Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/90 font-manrope">
                        Active Receive VPA
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUpiId(currentUser?.upiId || '');
                        setIsEditing(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 text-[11px] font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <Pencil size={11} />
                      <span>Edit</span>
                    </button>
                  </div>

                  {/* VPA Display */}
                  <div className="py-1">
                    <p className="font-mono text-base sm:text-lg font-bold text-white tracking-wide break-all select-all selection:bg-emerald-500/30">
                      {displayUpiId}
                    </p>
                  </div>

                  {/* Action Buttons: Copy & Show QR */}
                  <div className="grid grid-cols-2 gap-2.5 pt-4 mt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => handleCopyUPI(displayUpiId)}
                      className="h-10 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 text-xs font-bold font-inter flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      {copied ? (
                        <>
                          <Check size={14} className="text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} className="text-white/60" />
                          <span>Copy ID</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowQrModal(true)}
                      className="h-10 px-3 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold font-inter flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
                    >
                      <QrCode size={14} />
                      <span>Show QR</span>
                    </button>
                  </div>
                </div>

                {/* Compatible Apps Footer Row */}
                <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 px-1 pt-1 text-[11px] text-white/40">
                  <div className="flex items-center gap-1.5">
                    <Smartphone size={13} className="text-white/30 shrink-0" />
                    <span>Works with all UPI apps</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-[10px] font-medium text-white/60">
                      GPay
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-[10px] font-medium text-white/60">
                      PhonePe
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-[10px] font-medium text-white/60">
                      Paytm
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-[10px] font-medium text-white/60">
                      BHIM
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Edit / Setup Form */
              <form onSubmit={handleSave} className="space-y-4">
                <div>
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
                    icon={AtSign}
                    autoFocus={isEditing && userHasPayment}
                  />

                  {/* Quick Handle Selection Chips for Mobile */}
                  <div className="mt-2.5">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-white/40 mb-1.5 flex items-center gap-1">
                      <Sparkles size={10} className="text-primary/70" /> Quick select handle:
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {POPULAR_UPI_HANDLES.map((suffix) => (
                        <button
                          key={suffix}
                          type="button"
                          onClick={() => handleSelectHandle(suffix)}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/10 active:bg-white/15 border border-white/5 hover:border-white/15 text-[11px] font-mono text-white/70 hover:text-white transition-all"
                        >
                          {suffix}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col-reverse xs:flex-row items-center gap-2.5">
                  {userHasPayment && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      disabled={savingPayment}
                      className="w-full xs:w-auto flex-1 h-11 text-xs uppercase font-bold tracking-wider border border-white/10 text-white/70 hover:text-white"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={!isOnline || savingPayment || !upiId.trim()}
                    className="w-full xs:w-auto flex-1 h-11 text-xs uppercase font-bold tracking-wider bg-white text-black hover:bg-neutral-200"
                  >
                    {savingPayment ? 'Saving...' : userHasPayment ? 'Update UPI ID' : 'Save UPI ID'}
                  </Button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/30 pt-1">
                  <Smartphone size={12} />
                  <span>Compatible with Google Pay, PhonePe, Paytm, BHIM & all banks</span>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* Member View (!isOwnProfile) */
          <div>
            {userHasPayment ? (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent p-4 sm:p-5 backdrop-blur-md shadow-lg">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40 font-manrope">
                      Member UPI Address
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                      <CheckCircle2 size={11} /> Verified VPA
                    </span>
                  </div>

                  <p className="font-mono text-base sm:text-lg font-bold text-white tracking-wide break-all py-1 select-all">
                    {displayUpiId}
                  </p>

                  <div className="grid grid-cols-2 gap-2.5 pt-4 mt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => handleCopyUPI(displayUpiId)}
                      className="h-10 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 text-xs font-bold font-inter flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      {copied ? (
                        <>
                          <Check size={14} className="text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} className="text-white/60" />
                          <span>Copy ID</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowQrModal(true)}
                      className="h-10 px-3 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold font-inter flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
                    >
                      <QrCode size={14} />
                      <span>View QR</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-2">
                <AlertTriangle size={20} className="text-amber-400/60 mx-auto" />
                <p className="text-xs font-bold text-white/80">No UPI Address Configured</p>
                <p className="text-[11px] text-white/40 max-w-xs mx-auto">
                  This member hasn&apos;t added a UPI ID yet. Direct QR settle-ups are unavailable.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Personal UPI QR Modal */}
      {createPortal(
        <AnimatePresence>
          {showQrModal && displayUpiId && (
            <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-4">
              <motion.div
                key="qr-backdrop"
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowQrModal(false)}
              />
              <motion.div
                key="qr-card"
                className="relative w-full max-w-sm bg-[#1a1a1a] rounded-[2rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] border border-white/10 z-[151] overflow-hidden"
                initial={{ opacity: 0, scale: 0.9, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              >
                {/* Emerald glow top line */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />

                {/* Close X button on top right */}
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all z-10"
                >
                  <X size={16} />
                </button>

                <div className="p-6 sm:p-7">
                  <div className="text-center mb-1">
                    <h3 className="text-xl font-black font-manrope text-white tracking-tight">
                      {isOwnProfile ? 'Your Receive QR' : `${displayUser?.name || 'Member'}'s QR`}
                    </h3>
                    <p className="text-xs text-white/50 font-inter mt-1">
                      Scan with Google Pay, PhonePe, Paytm, or BHIM
                    </p>
                  </div>

                  {/* QR code canvas container */}
                  <div className="flex justify-center my-5">
                    <div
                      ref={qrCanvasRef}
                      className="p-4 bg-white rounded-2xl shadow-xl flex items-center justify-center"
                    >
                      <QRCodeCanvas
                        value={getUPIQRValue(displayUpiId, displayUser?.name || 'User', 0)}
                        size={190}
                        level="M"
                        marginSize={2}
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    </div>
                  </div>

                  {/* VPA Copy Bar */}
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.04] border border-white/5 mb-5">
                    <AtSign size={14} className="text-white/40 shrink-0" />
                    <span className="text-xs font-mono text-white/70 truncate flex-1 select-all">
                      {displayUpiId}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyUPI(displayUpiId)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all shrink-0"
                    >
                      {copied ? (
                        <>
                          <Check size={10} className="text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={10} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setShowQrModal(false)}
                      className="py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/80 text-xs font-black tracking-wider uppercase transition-all"
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadQR}
                      className="py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-xs font-black tracking-wider uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Download size={14} />
                      <span>Save QR</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default PaymentSettingsCard;
