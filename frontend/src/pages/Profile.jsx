import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import useAuth from '../hooks/useAuth.js';
import Avatar from '../components/common/Avatar.jsx';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import { LogOut, Download, Mail, User, Settings, Archive, Flame, CreditCard, AtSign, Link2, AlertTriangle, CheckCircle2, X, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import groupService from '../services/groupService.js';
import expenseService from '../services/expenseService.js';
import { computeGroupBalances } from '../utils/balanceEngine.js';
import { exportToPDF } from '../utils/exportUtils.js';
import { validateUPIId, hasPaymentMethod, UPI_APPS } from '../utils/upiUtils.js';

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, logout, updateProfile } = useAuth();
  const [targetUser, setTargetUser] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const isOnline = useOnlineStatus();

  // Payment details state
  const [upiId, setUpiId] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [showPaymentWarningBanner, setShowPaymentWarningBanner] = useState(true);

  // Preferred app state
  const [preferredApp, setPreferredApp] = useState('default');
  const [savingPreferredApp, setSavingPreferredApp] = useState(false);

  const isOwnProfile = !id || id === currentUser?._id || id === currentUser?.uid;

  useEffect(() => {
    const fetchTargetUser = async () => {
      if (isOwnProfile) {
        setTargetUser(currentUser);
        setName(currentUser?.name || '');
        setUpiId(currentUser?.upiId || '');
        setPreferredApp(currentUser?.preferredApp || 'default');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const docRef = doc(db, 'users', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTargetUser({ _id: docSnap.id, ...docSnap.data() });
        } else {
          toast.error("User not found");
          navigate('/friends');
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchTargetUser();
  }, [id, currentUser, isOwnProfile, navigate]);

  const handleSave = async () => {
    try {
      const result = await updateProfile({ name });
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('Profile updated');
        setEditing(false);
      } else {
        toast.error(result.payload || 'Update failed');
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
    }
  };

  const handleSavePaymentDetails = async () => {
    setPaymentError('');

    const trimmedUpi = upiId.trim();

    // Validate: must not be empty
    if (!trimmedUpi) {
      setPaymentError('Please enter a valid UPI ID (example@bank).');
      return;
    }

    // Validate UPI ID format
    if (!validateUPIId(trimmedUpi)) {
      setPaymentError('Invalid UPI ID format. Standard IDs include "@" (e.g., name@okhdfc).');
      return;
    }

    setSavingPayment(true);
    try {
      const result = await updateProfile({
        upiId: trimmedUpi,
      });
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('UPI ID updated!');
      } else {
        toast.error(result.payload || 'Failed to update UPI ID');
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleSavePreferredApp = async () => {
    setSavingPreferredApp(true);
    try {
      const result = await updateProfile({ preferredApp });
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('Payment app preference saved!');
      } else {
        toast.error(result.payload || 'Failed to save preference');
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setSavingPreferredApp(false);
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const displayUser = isOwnProfile ? currentUser : targetUser;

  const userHasPayment = hasPaymentMethod(currentUser);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-24 px-4 sm:px-6">
      <div className="mb-6 pt-6">
        <h1 className="text-2xl lg:text-3xl font-black font-manrope text-white tracking-[-0.04em] mb-1">
          {isOwnProfile ? 'Security & Identity' : 'Network Node'}
        </h1>
        <p className="text-[11px] md:text-sm text-on-surface-variant font-inter opacity-60">
          {isOwnProfile
            ? 'Manage your network presence and archived data exports.'
            : 'Operational details and connection status for this node.'}
        </p>
      </div>

      {/* ── Payment Warning Banner (own profile, no UPI ID) ── */}
      {isOwnProfile && !userHasPayment && showPaymentWarningBanner && (
        <div className="mb-6 flex items-center gap-4 p-4 rounded-2xl bg-amber-500/8 border border-amber-500/20">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-400 leading-snug">
              Add your UPI ID to receive payments
            </p>
            <p className="text-[11px] text-amber-400/60 font-inter mt-0.5">
              Without a valid UPI ID (e.g., name@bank), friends won't be able to pay you directly from the Settle Up screen.
            </p>
          </div>
          <button
            onClick={() => setShowPaymentWarningBanner(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/30 hover:text-white/60 transition-all shrink-0"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Identity Card */}
        <div className="lg:col-span-12 xl:col-span-12">
          <div className="glass-card overflow-hidden border border-white/5 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50 opacity-20" />

            <div className="p-4 sm:p-6">
                <div className="space-y-6 w-full">
                  <div className="flex items-center gap-4">
                    <div className="relative group shrink-0">
                      <div className="absolute -inset-1 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                      <Avatar
                        name={displayUser?.name}
                        src={displayUser?.avatar}
                        size="xl"
                        className="relative w-16 h-16 sm:w-20 sm:h-20 text-xl border-4 border-white/5 shadow-2xl"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      {editing ? (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Identity Name</label>
                          <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            id="profile-name"
                            className="h-12 bg-white/[0.03] text-lg font-bold"
                            disabled={!isOnline}
                          />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <h2 className="text-2xl sm:text-3xl font-black font-manrope text-white tracking-tight truncate">{displayUser?.name}</h2>
                          <div className="flex items-center justify-start gap-2 text-on-surface-variant opacity-60">
                            <Mail size={14} className="shrink-0" />
                            <span className="text-xs sm:text-sm font-medium font-inter truncate">{displayUser?.email}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {editing && isOwnProfile ? (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <Button onClick={handleSave} className="h-11 font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2" disabled={!isOnline || !name.trim()}>
                        {isOnline ? (
                          <>
                            <CheckCircle2 size={14} />
                            <span>Apply Changes</span>
                          </>
                        ) : (
                          'Connection Lost'
                        )}
                      </Button>
                      <Button variant="ghost" onClick={() => setEditing(false)} className="h-11 font-black uppercase text-[10px] tracking-widest bg-white/5 flex items-center justify-center gap-2">
                        <X size={14} />
                        <span>Discard</span>
                      </Button>
                    </div>
                  ) : isOwnProfile ? (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <Button
                        variant="ghost"
                        className={`h-11 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all bg-white/[0.03] hover:bg-white/10 border border-white/5 active:scale-95 flex items-center justify-center gap-2 ${!isOnline ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                        onClick={() => isOnline && setEditing(true)}
                        disabled={!isOnline}
                      >
                        <User size={14} className="opacity-50" />
                        <span>{isOnline ? 'Edit' : 'Offline'}</span>
                      </Button>

                      <Button
                        variant="ghost"
                        className="h-11 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/10"
                        onClick={logout}
                      >
                        <LogOut size={14} className="opacity-70" />
                        <span>Logout</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <span className="px-5 p-2 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/40">Verified Connection</span>
                      {hasPaymentMethod(targetUser) ? (
                        <span className="flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest">
                          <CheckCircle2 size={12} /> UPI Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400/80 text-[9px] font-black uppercase tracking-widest">
                          <AlertTriangle size={12} /> Pending UPI Config
                        </span>
                      )}
                    </div>
                  )}
                </div>
            </div>
          </div>
        </div>

        {/* ── Payment Details Card (own profile only) ── */}
        {isOwnProfile && (
          <div className="lg:col-span-12">
            <div className="glass-card p-6 sm:p-8 border border-white/5 bg-white/[0.01] relative overflow-hidden">
              {/* Subtle accent line */}
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-[0_0_20px_-5px_rgba(16,185,129,0.1)]">
                  <CreditCard size={20} className="text-emerald-400" />
                </div>
                <div className="flex-1 space-y-1 mt-1">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-white/60 uppercase tracking-[0.2em] font-manrope">Payment Details</h3>
                    {userHasPayment ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 text-[9px] font-black uppercase tracking-wider shrink-0 shadow-sm">
                        <CheckCircle2 size={10} /> UPI ACTIVE
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/15 text-amber-400/80 text-[9px] font-black uppercase tracking-wider shrink-0 shadow-sm">
                        <AlertTriangle size={10} /> NO UPI ID
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/30 font-inter leading-relaxed">Connect your UPI ID to receive payments directly with real-time verification.</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* UPI ID */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-2 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                      <AtSign size={11} />
                      UPI ID
                    </label>
                  </div>
                  <div className="relative group">
                    <Input
                      id="upi-id"
                      value={upiId}
                      onChange={(e) => { setUpiId(e.target.value); setPaymentError(''); }}
                      placeholder="example@okhdfc"
                      className="h-14 bg-white/[0.03] font-manrope text-base text-white focus:bg-white/[0.05] transition-all"
                      disabled={!isOnline || savingPayment}
                    />
                  </div>
                </div>

                {/* Error */}
                {paymentError && (
                  <p className="text-xs text-red-500 font-inter flex items-center gap-2 animate-shake">
                    <AlertTriangle size={13} /> {paymentError}
                  </p>
                )}

                {/* Save Section */}
                <div className="pt-2 flex flex-col gap-4">
                  <Button
                    onClick={handleSavePaymentDetails}
                    disabled={!isOnline || savingPayment}
                    className={`h-14 w-full md:w-auto md:px-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl
                      ${!isOnline ? 'opacity-20 cursor-not-allowed bg-white/5 border-white/5 text-white/40' : savingPayment ? 'opacity-60 cursor-wait bg-white text-black/50' : 'bg-white text-black hover:bg-white/90'}`
                    }
                  >
                    {savingPayment ? (
                      <span className="flex items-center gap-3">
                        <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                        UPDATING…
                      </span>
                    ) : isOnline ? 'SAVE UPI ID' : 'OFFLINE'}
                  </Button>

                  {!userHasPayment && isOnline && !savingPayment && (
                    <p className="text-[10px] text-amber-400/50 font-bold uppercase tracking-widest">
                      Mandatory for settlement receiving
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Preferred Payment App Card (own profile only) ── */}
        {isOwnProfile && (
          <div className="lg:col-span-12">
            <div className="glass-card p-6 sm:p-8 border border-white/5 bg-white/[0.01] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-violet-500/20 shadow-[0_0_20px_-5px_rgba(139,92,246,0.1)]">
                  <Smartphone size={20} className="text-violet-400" />
                </div>
                <div className="flex-1 space-y-1 mt-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-sm font-black text-white/60 uppercase tracking-[0.2em] font-manrope">Preferred App</h3>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[9px] font-black uppercase tracking-wider shrink-0 shadow-sm">
                      {(() => {
                        const currentApp = UPI_APPS.find(a => a.id === preferredApp);
                        if (currentApp?.id === 'default') return <Smartphone size={10} />;
                        return (
                          <img
                            src={currentApp?.icon}
                            alt={currentApp?.label}
                            className="w-3 h-3 object-contain"
                          />
                        );
                      })()}
                      &nbsp;
                      {UPI_APPS.find(a => a.id === preferredApp)?.shortLabel || 'Default'}
                    </span>
                  </div>
                  <p className="text-xs text-white/30 font-inter leading-relaxed">Choose which UPI application should trigger for instant settlements.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-8">
                {UPI_APPS.map((app) => {
                  const isSelected = preferredApp === app.id;
                  return (
                    <button
                      key={app.id}
                      onClick={() => setPreferredApp(app.id)}
                      disabled={!isOnline || savingPreferredApp}
                      style={isSelected ? { borderColor: `${app.color}40`, boxShadow: `0 0 0 1px ${app.color}30, 0 4px 20px ${app.color}15` } : {}}
                      className={`
                        relative text-left p-4 rounded-2xl border transition-all duration-200
                        flex items-center gap-4 group
                        ${isSelected
                          ? 'bg-white/[0.05] border-white/20'
                          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'}
                        ${(!isOnline || savingPreferredApp) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}
                      `}
                    >
                      {/* App icon/logo */}
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 overflow-hidden ${isSelected ? 'bg-white/10' : 'bg-white/5'
                          }`}
                        style={isSelected ? { backgroundColor: `${app.color}18` } : {}}
                      >
                        {app.id === 'default' ? (
                          <Smartphone size={24} className={isSelected ? 'text-violet-400' : 'text-white/40'} />
                        ) : (
                          <img
                            src={app.icon}
                            alt={app.label}
                            className="w-7 h-7 object-contain transition-all duration-300"
                          />
                        )}
                      </div>

                      {/* Label */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate transition-colors duration-200 ${isSelected ? 'text-white' : 'text-white/60 group-hover:text-white/80'
                          }`}>{app.label}</p>
                        <p className="text-[10px] text-white/25 font-inter mt-0.5 truncate">{app.description}</p>
                      </div>

                      {/* Check badge */}
                      {isSelected && (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${app.color}30`, border: `1.5px solid ${app.color}60` }}
                        >
                          <CheckCircle2 size={11} style={{ color: app.color }} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* iOS note */}
              <div className="mb-6 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                <AlertTriangle size={13} className="text-amber-400/60 mt-0.5 shrink-0" />
                <p className="text-[10px] text-amber-400/50 font-inter leading-relaxed">
                  <span className="font-bold text-amber-400/70">iOS note:</span> If set to "Default", you'll see a chooser prompt when paying — iOS doesn't support automatic UPI app detection.
                  Selecting a specific app skips this step.
                </p>
              </div>

              <Button
                onClick={handleSavePreferredApp}
                disabled={!isOnline || savingPreferredApp}
                className={`h-14 w-full md:w-auto md:px-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl
                  ${!isOnline ? 'opacity-20 cursor-not-allowed bg-white/5 border-white/5 text-white/40' : savingPreferredApp ? 'opacity-60 cursor-wait bg-white text-black/50' : 'bg-white text-black hover:bg-white/90'}`
                }
              >
                {savingPreferredApp ? (
                  <span className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    SAVING…
                  </span>
                ) : isOnline ? 'SAVE PREFERENCE' : 'OFFLINE'}
              </Button>
            </div>
          </div>
        )}

        {/* System Settings & Assets */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-card p-6 sm:p-8 border border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <div className="w-7 h-7 flex items-center justify-center">
                  <Settings size={16} />
                </div>
              </div>
              <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] font-manrope">System</h3>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white/60 font-inter">Currency</span>
                  <span className="text-[10px] text-white/20 font-black uppercase tracking-widest">(coming soon)</span>
                </div>
                <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase">{currentUser?.preferences?.currency || 'INR'}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white/60 font-inter">Interface</span>
                  <span className="text-[10px] text-white/20 font-black uppercase tracking-widest">(coming soon)</span>
                </div>
                <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase">{currentUser?.preferences?.theme || 'dark'}</span>
              </div>
            </div>
          </div>

          {isOwnProfile ? (
            <div className="lg:col-span-1">
              <CohortHistory userId={currentUser?._id} />
            </div>
          ) : (
            <div className="lg:col-span-1">
              <CohortHistory userId={id} myId={currentUser?._id} isFriendView={true} />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 pb-8 flex flex-col items-center justify-center gap-3">
        <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">
            Engineered by <span className="text-white/40">Harshil</span>
          </p>
          <a
            href="https://github.com/Marshmellow31/PayMatrix"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-primary transition-all duration-300"
          >
            Github
          </a>
        </div>
      </div>
    </div>
  );
};

const CohortHistory = ({ userId, myId, isFriendView = false }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);
  const [expandedGroupId, setExpandedGroupId] = useState(null);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    const fetchAction = isFriendView
      ? groupService.getMutualGroups(myId, userId)
      : groupService.getPastGroups(userId);

    fetchAction
      .then(res => setGroups(res.data.data.groups))
      .catch(err => console.error("Failed to fetch cohorts:", err))
      .finally(() => setLoading(false));
  }, [userId, myId, isFriendView]);

  const handleExport = async (group) => {
    setExporting(group._id);
    try {
      const [expRes, stlRes, logRes] = await Promise.all([
        expenseService.getExpenses(group._id),
        expenseService.getSettlements(group._id),
        expenseService.getActivity(group._id)
      ]);

      const expenses = expRes.data.data.expenses;
      const settlements = stlRes.data.data.settlements;
      const logs = logRes.data.data.activity;

      // Compute balances dynamically for the report
      const calculatedBalances = computeGroupBalances(expenses, settlements, group.members);

      // Map to the format exportToPDF expects
      const formattedBalances = Object.keys(calculatedBalances).map(uid => {
        const member = group.members.find(m => {
          const mid = (m.user?._id || m.user?.uid || m.user || '').toString();
          return mid === uid;
        });
        return {
          user: member?.user || { name: 'Member', email: 'N/A' },
          balance: calculatedBalances[uid]
        };
      });

      exportToPDF(group, expenses, formattedBalances, logs);
      toast.success(`PDF Security Report exported for ${group.title}`);
    } catch (err) {
      console.error(err);
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  if (loading) return null;

  return (
    <div className="glass-card p-6 sm:p-8 border-primary/10 bg-primary/[0.01]">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          {isFriendView ? <Flame size={16} /> : <Archive size={16} />}
        </div>
        <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] font-manrope text-primary/60">
          {isFriendView ? 'Mutual Cohorts' : 'Archived Cohorts'}
        </h3>
      </div>

      <div className="flex flex-col gap-5">
        {groups.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
              {isFriendView ? 'No Active Shared Cohorts Identified' : 'No Archived Sessions Found'}
            </p>
          </div>
        ) : (
          groups.map(group => {
            const isExpanded = expandedGroupId === group._id;

            return (
              <div 
                key={group._id} 
                className={`flex flex-col rounded-3xl bg-white/[0.02] border transition-all duration-300 overflow-hidden ${
                  isExpanded ? 'border-primary/30 bg-primary/[0.03]' : 'border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                }`}
              >
                {/* Header Row (Click to toggle) */}
                <div 
                  onClick={() => setExpandedGroupId(isExpanded ? null : group._id)}
                  className="flex items-center justify-between p-5 cursor-pointer select-none group"
                >
                  <div className="flex flex-col gap-1">
                    <span className={`text-md font-black transition-colors ${isExpanded ? 'text-primary' : 'text-white'}`}>
                      {group.title}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className={`text-[8px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full ${
                        group.status === 'deleted' ? 'bg-red-500/10 text-red-400 border border-red-500/10' : 'bg-white/5 text-white/40 border border-white/5'
                      }`}>
                        {group.status === 'deleted' ? 'Deleted' : 'Former Member'}
                      </span>
                      <span className="text-[9px] text-white/20 font-inter font-bold">
                        • {new Date(group.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                  
                  {/* Indicator Icon */}
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                      isExpanded ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-white/30 group-hover:text-white/60'
                    }`}
                  >
                    <Smartphone size={14} className={isExpanded ? 'rotate-180' : ''} />
                  </motion.div>
                </div>

                {/* Expanded Drawer */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="px-5 pb-5 pt-1 border-t border-white/5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExport(group);
                          }}
                          disabled={exporting === group._id}
                          className="h-11 w-full rounded-2xl bg-white/5 hover:bg-white/10 text-[10px] font-black text-white uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 border border-white/5 shadow-inner"
                        >
                          {exporting === group._id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                              <span>Preparing...</span>
                            </>
                          ) : (
                            <>
                              <Download size={16} className="opacity-60 text-primary" />
                              <span>Generate Report</span>
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Profile;
