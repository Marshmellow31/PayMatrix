import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ToggleLeft, ToggleRight, RefreshCw, Info, Loader2 } from 'lucide-react';
import adminService from '../../services/adminService.js';
import Loader from '../../components/common/Loader.jsx';
import toast from 'react-hot-toast';

const FLAGS = [
  {
    key: 'billScanning',
    label: 'Bill Scanning (AI)',
    desc: 'Gemini-powered receipt scanner on the Add Expense screen. Disabling this hides the scan button for all users.',
    default: true,
  },
  {
    key: 'friendRequests',
    label: 'Friend Requests',
    desc: 'Allow users to send and accept friend requests. Disabling hides the Add Friend option.',
    default: true,
  },
  {
    key: 'groupCreation',
    label: 'Group Creation',
    desc: 'Allow users to create new groups. Existing groups are unaffected.',
    default: true,
  },
  {
    key: 'upiDeepLinks',
    label: 'UPI Deep Links',
    desc: 'Show UPI payment deep-link buttons (GPay, PhonePe, etc.) in settlement flows.',
    default: true,
  },
  {
    key: 'maintenanceMode',
    label: 'Maintenance Mode',
    desc: 'Show a maintenance banner across the top of the app for all users.',
    default: false,
  },
  {
    key: 'analyticsPage',
    label: 'Analytics Page',
    desc: 'Show the personal analytics page in the sidebar and navigation.',
    default: true,
  },
];

const FlagCard = ({ flag, value, onToggle, saving }) => {
  const enabled = value ?? flag.default;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!saving) onToggle(flag.key, !enabled);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 0.99 }}
      onClick={() => !saving && onToggle(flag.key, !enabled)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Toggle ${flag.label}`}
      className="rounded-2xl p-4 sm:p-5 flex items-start gap-4 bg-surface-container-low border border-white/5 shadow-md hover:border-white/10 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary/50"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <p className="text-sm font-bold text-white font-manrope">{flag.label}</p>
          <span
            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border transition-colors ${
              enabled
                ? 'bg-white/10 text-white border-white/20'
                : 'bg-white/[0.02] text-white/30 border-white/[0.04]'
            }`}
          >
            {enabled ? 'ON' : 'OFF'}
          </span>
        </div>
        <p className="text-xs text-white/40 leading-relaxed">{flag.desc}</p>
      </div>
      <div className="shrink-0 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 mt-0.5 text-white">
        {saving ? (
          <Loader2 size={24} className="animate-spin text-white/30" />
        ) : enabled ? (
          <ToggleRight
            size={30}
            className="text-white opacity-90 group-hover:opacity-100 transition-opacity"
          />
        ) : (
          <ToggleLeft
            size={30}
            className="text-white/20 group-hover:text-white/30 transition-opacity"
          />
        )}
      </div>
    </motion.div>
  );
};

const AdminFeatureFlags = () => {
  const [flags, setFlags] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  const loadFlags = async () => {
    setLoading(true);
    try {
      const data = await adminService.getFeatureFlags();
      setFlags(data);
    } catch {
      toast.error('Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlags();
  }, []);

  const handleToggle = async (key, newValue) => {
    setSaving((prev) => ({ ...prev, [key]: true }));
    const previous = flags[key];
    setFlags((prev) => ({ ...prev, [key]: newValue })); // optimistic
    try {
      await adminService.setFeatureFlag(key, newValue);
      toast.success(`${key} ${newValue ? 'enabled' : 'disabled'}`);
    } catch (e) {
      setFlags((prev) => ({ ...prev, [key]: previous })); // rollback
      toast.error(e.message || 'Failed to update flag');
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black font-manrope text-white tracking-tight">
            Feature Flags
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            Toggle platform features in real-time — changes apply instantly for all users
          </p>
        </div>
        <button
          onClick={loadFlags}
          className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5 mb-6 bg-white/[0.02] border border-white/5 shadow-sm">
        <Info size={15} className="text-white/40 shrink-0 mt-0.5" />
        <p className="text-xs text-white/50 leading-relaxed font-inter">
          Flags are stored in Firestore and read by the app on load. Changes take effect within
          seconds for all connected users — no deployment needed.
        </p>
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FLAGS.map((flag, i) => (
            <motion.div
              key={flag.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
            >
              <FlagCard
                flag={flag}
                value={flags[flag.key]}
                onToggle={handleToggle}
                saving={saving[flag.key]}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminFeatureFlags;
