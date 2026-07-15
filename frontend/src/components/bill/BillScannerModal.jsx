import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  ScanLine,
  Camera,
  IndianRupee,
  Store,
  Calendar,
  Tag,
  ChevronRight,
  RefreshCw,
  X,
  Trash2,
  Check,
  Plus,
  FilePlus,
  Images,
} from 'lucide-react';
import { HiX } from 'react-icons/hi';
import { useBillScanner } from '../../hooks/useBillScanner.js';
import { EXPENSE_CATEGORIES } from '../../utils/constants.js';

const STAGE = { CAPTURE: 'capture', SCANNING: 'scanning', REVIEW: 'review' };

// Progress label text keyed on progress %
const progressLabel = (p) => {
  if (p < 25) return 'Uploading bill...';
  if (p < 55) return 'Reading with AI...';
  if (p < 80) return 'Extracting items...';
  return 'Almost done...';
};

// ─── Editable field row ───────────────────────────────────────────────────────
const FieldRow = ({ icon, label, value, onChange, type = 'text', placeholder }) => (
  <div className="flex items-center gap-3 bg-white/[0.03] rounded-2xl px-4 py-3 border border-white/[0.06]">
    <div className="text-primary/60 shrink-0">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1 font-inter">
        {label}
      </p>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border-none outline-none text-white font-manrope font-bold text-sm focus:ring-0 p-0 placeholder:text-white/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </div>
  </div>
);

// ─── Main modal ───────────────────────────────────────────────────────────────
const BillScannerModal = ({ isOpen, onClose, onFill }) => {
  const [stage, setStage] = useState(STAGE.CAPTURE);
  const [scanResult, setScanResult] = useState(null);
  // Accumulates all selected files to send in a single batch
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [editableData, setEditableData] = useState({
    amount: '',
    title: '',
    date: '',
    category: 'Other',
  });
  const [reviewItems, setReviewItems] = useState([]);
  const [fakeProgress, setFakeProgress] = useState(0);
  const [scanFailed, setScanFailed] = useState(false);

  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const { scanBill } = useBillScanner();

  // Reset every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setStage(STAGE.CAPTURE);
      setScanResult(null);
      setSelectedFiles([]);
      setReviewItems([]);
      setFakeProgress(0);
      setScanFailed(false);
    }
  }, [isOpen]);

  // Animate a fake progress bar while OCR runs
  useEffect(() => {
    if (stage !== STAGE.SCANNING) return;
    setFakeProgress(8);
    const steps = [
      [400, 22],
      [900, 42],
      [1800, 60],
      [3000, 74],
      [4500, 86],
      [6000, 93],
    ];
    const timers = steps.map(([delay, val]) => setTimeout(() => setFakeProgress(val), delay));
    return () => timers.forEach(clearTimeout);
  }, [stage]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setScanFailed(false);
    setStage(STAGE.SCANNING);

    const newSelectedFiles = [...selectedFiles, ...files];
    setSelectedFiles(newSelectedFiles);

    // Scan all files in a single request to Gemini
    const result = await scanBill(newSelectedFiles);

    setFakeProgress(100);
    setTimeout(() => {
      if (result) {
        setScanResult(result);
        setReviewItems((result.items || []).map((it) => ({ ...it })));
        setEditableData({
          amount: result.amount != null ? result.amount.toFixed(2) : '',
          title: result.title || '',
          date: result.date || new Date().toISOString().split('T')[0],
          category: result.category || 'Other',
        });
        setStage(STAGE.REVIEW);
      } else {
        setScanFailed(true);
        setStage(newSelectedFiles.length > 0 ? STAGE.REVIEW : STAGE.CAPTURE);
      }
    }, 350);

    // Clear so the same file can be re-selected
    e.target.value = '';
  };

  const updateItem = (idx, key, val) => {
    setReviewItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: val } : it)));
  };
  const deleteItem = (idx) => {
    setReviewItems((prev) => prev.filter((_, i) => i !== idx));
  };
  const addItem = () => {
    setReviewItems((prev) => [...prev, { name: '', price: 0 }]);
  };

  const handleFillForm = () => {
    const items = reviewItems
      .map((it) => ({ name: (it.name || '').trim() || 'Item', price: parseFloat(it.price) || 0 }))
      .filter((it) => it.price > 0);
    onFill({
      amount: editableData.amount,
      title: editableData.title,
      date: editableData.date,
      category: editableData.category,
      items,
    });
    onClose();
  };

  const itemsTotal = reviewItems.reduce((s, it) => s + (parseFloat(it.price) || 0), 0);
  const billTotal = parseFloat(editableData.amount) || 0;
  const taxGap = billTotal - itemsTotal;

  const stageTitle = {
    [STAGE.CAPTURE]: selectedFiles.length > 0 ? 'Add More Photos' : 'Scan Receipt',
    [STAGE.SCANNING]: 'Analysing...',
    [STAGE.REVIEW]: 'Review & Fill',
  };

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet / Modal */}
          <motion.div
            className="relative w-full sm:max-w-md"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          >
            <motion.div
              layout
              className="bg-[#141414] rounded-t-[2rem] sm:rounded-[2.5rem] shadow-[0_-20px_80px_-10px_rgba(0,0,0,0.9)] border border-white/[0.07] border-b-0 sm:border-b flex flex-col overflow-hidden max-h-[92vh]"
              transition={{ layout: { type: 'spring', damping: 26, stiffness: 220 } }}
            >
              {/* Drag handle (mobile) */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
                <div className="w-10 h-1 rounded-full bg-white/15" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-4 sm:pt-7 pb-3 shrink-0">
                <div>
                  <p className="text-[9px] font-black text-white/25 uppercase tracking-[0.3em] font-inter mb-0.5">
                    PayMatrix
                  </p>
                  <h2 className="text-lg font-black font-manrope text-white tracking-tight uppercase">
                    {stageTitle[stage]}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.06] transition-all text-white/40 hover:text-white active:scale-95"
                >
                  <HiX size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 pb-8 sm:pb-10 pt-1 overflow-y-auto flex-1">
                <AnimatePresence mode="wait">
                  {/* ── CAPTURE ─────────────────────────────────── */}
                  {stage === STAGE.CAPTURE && (
                    <motion.div
                      key="capture"
                      initial={{ opacity: 0, x: -24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 24 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="flex flex-col items-center gap-7 pt-3"
                    >
                      {/* Icon */}
                      <div className="relative">
                        <div className="w-24 h-24 rounded-3xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                          <ScanLine size={42} className="text-primary" />
                        </div>
                        {/* Animated corner brackets */}
                        <span className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-primary/60 rounded-tl-lg" />
                        <span className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-primary/60 rounded-tr-lg" />
                        <span className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-primary/60 rounded-bl-lg" />
                        <span className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-primary/60 rounded-br-lg" />
                      </div>

                      <div className="text-center space-y-2">
                        <h3 className="font-manrope font-black text-xl text-white">
                          {selectedFiles.length > 0 ? 'Add Another Photo' : 'Point at a Bill'}
                        </h3>
                        <p className="text-sm text-white/40 font-inter leading-relaxed max-w-xs mx-auto">
                          {selectedFiles.length > 0
                            ? `${selectedFiles.length} photo${selectedFiles.length > 1 ? 's' : ''} scanned. Add the next section of the bill — duplicate items are removed automatically.`
                            : 'Amount, merchant, date and items are detected automatically. Long bill? Scan multiple photos — duplicates are merged.'}
                        </p>
                        <p className="text-[11px] text-primary/70 font-bold font-inter tracking-wide">
                          Powered by Gemini AI · your bill isn&apos;t saved
                        </p>
                      </div>

                      {scanFailed && (
                        <div className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/[0.08] border border-red-500/20">
                          <X size={14} className="text-red-400 shrink-0" />
                          <p className="text-xs font-bold text-red-400 font-inter">
                            Couldn&apos;t read the bill. Try a clearer, well-lit photo.
                          </p>
                        </div>
                      )}

                      <div className="flex flex-col w-full gap-3">
                        <button
                          onClick={() => cameraRef.current?.click()}
                          className="w-full h-14 rounded-2xl bg-white text-black font-manrope font-black text-sm flex items-center justify-center gap-3 hover:bg-white/90 active:scale-[0.97] transition-all shadow-xl shadow-white/5"
                        >
                          <Camera size={18} strokeWidth={2.5} />
                          Take Photo
                        </button>
                        <button
                          onClick={() => galleryRef.current?.click()}
                          className="w-full h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white font-manrope font-bold text-sm flex items-center justify-center gap-3 hover:bg-white/[0.08] active:scale-[0.97] transition-all"
                        >
                          <Images size={18} strokeWidth={2} />
                          Choose Photos (1 or more)
                        </button>
                        {selectedFiles.length > 0 && (
                          <button
                            onClick={() => setStage(STAGE.REVIEW)}
                            className="w-full h-11 rounded-2xl text-primary/70 hover:text-primary font-manrope font-bold text-sm flex items-center justify-center gap-2 transition-all border border-primary/20 hover:border-primary/40"
                          >
                            <ChevronRight size={15} />
                            Back to Review ({selectedFiles.length} photo
                            {selectedFiles.length > 1 ? 's' : ''} scanned)
                          </button>
                        )}
                      </div>

                      <input
                        ref={cameraRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      <input
                        ref={galleryRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </motion.div>
                  )}

                  {/* ── SCANNING ─────────────────────────────────── */}
                  {stage === STAGE.SCANNING && (
                    <motion.div
                      key="scanning"
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="flex flex-col gap-6 pt-3"
                    >
                      {/* Beautiful radar/scanner screen with sweeping scan-line */}
                      <div
                        className="relative w-full rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0c0c0c] flex items-center justify-center animate-pulse-slow"
                        style={{ height: 180 }}
                      >
                        {/* Radial glow */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--color-primary),0.08),transparent_70%)] pointer-events-none" />
                        {/* Dot pattern */}
                        <div
                          className="absolute inset-0 opacity-[0.03] pointer-events-none"
                          style={{
                            backgroundImage:
                              'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                            backgroundSize: '16px 16px',
                          }}
                        />

                        <div className="flex flex-col items-center gap-3 relative z-10">
                          <ScanLine size={32} className="text-primary animate-pulse" />
                          <span className="text-[10px] text-white/40 uppercase font-black tracking-[0.25em] font-manrope">
                            Scanning Document
                          </span>
                        </div>

                        {/* Sweeping scan line */}
                        <motion.div
                          className="absolute left-0 right-0 h-[2px] bg-primary shadow-[0_0_12px_3px] shadow-primary/50"
                          animate={{ top: ['8%', '88%', '8%'] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        {/* Corner brackets */}
                        <span className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-primary/80 rounded-tl-lg" />
                        <span className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-primary/80 rounded-tr-lg" />
                        <span className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-primary/80 rounded-bl-lg" />
                        <span className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-primary/80 rounded-br-lg" />
                      </div>

                      {/* Progress */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.18em] font-inter">
                            {progressLabel(fakeProgress)}
                          </span>
                          <span className="text-[11px] font-black text-primary tabular-nums font-manrope">
                            {fakeProgress}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-primary rounded-full"
                            animate={{ width: `${fakeProgress}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                          />
                        </div>
                      </div>

                      {/* Tip */}
                      <p className="text-[10px] text-white/20 font-inter text-center">
                        Powered by Gemini Vision — usually takes a few seconds.
                      </p>
                    </motion.div>
                  )}

                  {/* ── REVIEW ───────────────────────────────────── */}
                  {stage === STAGE.REVIEW && scanResult && (
                    <motion.div
                      key="review"
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="flex flex-col gap-4 pt-2"
                    >
                      {/* Receipt thumbnail + headline */}
                      <div className="flex items-center gap-4 p-3 bg-white/[0.03] rounded-2xl border border-white/[0.06]">
                        <div className="w-14 h-14 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-primary shrink-0">
                          <ScanLine size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-black text-white/25 uppercase tracking-[0.2em] font-inter">
                            Detected
                          </p>
                          <p className="font-manrope font-black text-2xl text-white leading-tight">
                            {editableData.amount ? (
                              `₹${editableData.amount}`
                            ) : (
                              <span className="text-white/30">No amount</span>
                            )}
                          </p>
                          {editableData.title && (
                            <p className="text-xs text-white/40 font-inter truncate mt-0.5">
                              {editableData.title}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Editable fields */}
                      <div className="flex flex-col gap-2.5">
                        <FieldRow
                          icon={<IndianRupee size={14} />}
                          label="Total Amount"
                          value={editableData.amount}
                          onChange={(v) => setEditableData((p) => ({ ...p, amount: v }))}
                          type="number"
                          placeholder="0.00"
                        />

                        {/* Alternative detected amounts — bills vary, let the user override the pick */}
                        {scanResult.candidates?.length > 1 && (
                          <div className="flex items-center gap-2 flex-wrap px-1">
                            <span className="text-[9px] font-black text-white/25 uppercase tracking-[0.15em] font-inter">
                              Also found
                            </span>
                            {scanResult.candidates.map((c) => {
                              const cStr = c.toFixed(2);
                              const active = cStr === editableData.amount;
                              return (
                                <button
                                  key={cStr}
                                  type="button"
                                  onClick={() => setEditableData((p) => ({ ...p, amount: cStr }))}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-manrope tabular-nums transition-all ${
                                    active
                                      ? 'bg-primary text-black'
                                      : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.1] hover:text-white'
                                  }`}
                                >
                                  ₹{cStr}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <FieldRow
                          icon={<Store size={14} />}
                          label="Merchant / Title"
                          value={editableData.title}
                          onChange={(v) => setEditableData((p) => ({ ...p, title: v }))}
                          placeholder="e.g. Pizza Hut"
                        />
                        <FieldRow
                          icon={<Calendar size={14} />}
                          label="Date"
                          value={editableData.date}
                          onChange={(v) => setEditableData((p) => ({ ...p, date: v }))}
                          type="date"
                        />
                        {/* Category selector */}
                        <div className="flex items-center gap-3 bg-white/[0.03] rounded-2xl px-4 py-3 border border-white/[0.06] relative">
                          <Tag size={14} className="text-primary/60 shrink-0" />
                          <div className="flex-1 min-w-0 pr-6">
                            <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1 font-inter">
                              Category
                            </p>
                            <select
                              value={editableData.category}
                              onChange={(e) =>
                                setEditableData((p) => ({ ...p, category: e.target.value }))
                              }
                              className="w-full bg-transparent border-none outline-none text-white font-manrope font-bold text-sm focus:ring-0 py-0.5 cursor-pointer appearance-none"
                            >
                              {EXPENSE_CATEGORIES.map((c) => (
                                <option
                                  key={c.value}
                                  value={c.value}
                                  className="bg-[#141414] text-white py-2"
                                >
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                            <ChevronRight size={14} className="rotate-90" />
                          </div>
                        </div>
                      </div>

                      {/* Detected items — editable, these get assigned to people later */}
                      <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03]">
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/50 font-inter">
                              Detected Items
                            </span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-black">
                              {reviewItems.length}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={addItem}
                            className="flex items-center gap-1 text-[10px] font-bold text-white/40 hover:text-white transition-all uppercase tracking-wide"
                          >
                            <Plus size={12} /> Add
                          </button>
                        </div>

                        <div className="px-2 py-1.5 flex flex-col max-h-52 overflow-y-auto custom-scrollbar">
                          {reviewItems.length === 0 && (
                            <p className="text-[11px] text-white/25 font-inter text-center py-3">
                              No items detected — add them manually or just use the total.
                            </p>
                          )}
                          {reviewItems.map((item, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 py-1.5 border-b border-white/[0.04] last:border-none"
                            >
                              <input
                                value={item.name}
                                onChange={(e) => updateItem(i, 'name', e.target.value)}
                                placeholder="Item"
                                className="flex-1 min-w-0 bg-transparent border-none outline-none text-xs text-white/80 font-inter focus:ring-0 p-0 placeholder:text-white/20"
                              />
                              <div className="flex items-center gap-0.5 shrink-0">
                                <span className="text-[10px] text-white/30 font-bold">₹</span>
                                <input
                                  type="number"
                                  value={item.price}
                                  onChange={(e) => updateItem(i, 'price', e.target.value)}
                                  placeholder="0"
                                  className="w-16 bg-transparent border-none outline-none text-right text-xs font-bold text-white font-manrope focus:ring-0 p-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => deleteItem(i)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Items total vs bill total → the gap is tax/charges */}
                        {reviewItems.length > 0 && (
                          <div className="px-4 py-2.5 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-between text-[11px] font-manrope">
                            <span className="text-white/40 font-bold">
                              Items ₹{itemsTotal.toFixed(2)}
                            </span>
                            <span
                              className={`font-bold flex items-center gap-1 ${taxGap < -0.5 ? 'text-emerald-400' : 'text-white/40'}`}
                            >
                              <Check size={11} className="text-primary" />
                              {taxGap < -0.5
                                ? `Discount ₹${Math.abs(taxGap).toFixed(2)}`
                                : `Tax / charges ₹${Math.max(0, taxGap).toFixed(2)}`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* CTAs */}
                      <div className="flex flex-col gap-2.5 pt-2">
                        {/* Photo count badge */}
                        {selectedFiles.length > 0 && (
                          <div className="flex items-center justify-center gap-2 py-1">
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                              <Images size={12} className="text-primary/70" />
                              <span className="text-[10px] font-black text-primary/70 uppercase tracking-widest">
                                {selectedFiles.length} photo{selectedFiles.length > 1 ? 's' : ''}{' '}
                                merged
                              </span>
                            </div>
                          </div>
                        )}

                        <button
                          onClick={handleFillForm}
                          disabled={!editableData.amount}
                          className="w-full h-14 rounded-2xl bg-white text-black font-manrope font-black text-sm flex items-center justify-center gap-2.5 hover:bg-white/90 active:scale-[0.97] transition-all shadow-2xl shadow-white/10 disabled:opacity-25 disabled:cursor-not-allowed"
                        >
                          Fill Expense Form
                          <ChevronRight size={18} strokeWidth={3} />
                        </button>
                        <button
                          onClick={() => {
                            setFakeProgress(0);
                            setScanFailed(false);
                            setStage(STAGE.CAPTURE);
                          }}
                          className="w-full h-11 rounded-2xl text-white/50 hover:text-white/80 font-manrope font-bold text-sm flex items-center justify-center gap-2 transition-all border border-white/[0.06] hover:border-white/[0.12]"
                        >
                          <FilePlus size={14} />
                          Add Another Photo of This Bill
                        </button>
                        <button
                          onClick={() => {
                            setStage(STAGE.CAPTURE);
                            setScanResult(null);
                            setSelectedFiles([]);
                            setReviewItems([]);
                            setFakeProgress(0);
                            setScanFailed(false);
                          }}
                          className="w-full h-10 rounded-2xl text-white/25 hover:text-white/50 font-manrope font-bold text-sm flex items-center justify-center gap-2 transition-all"
                        >
                          <RefreshCw size={12} />
                          Start Over
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default BillScannerModal;
