import { useState } from 'react';
import { Bell, Copy, Download, Settings, Trash2, KeyRound } from 'lucide-react';
import fcmService from '../../services/fcmService.js';
import toast from 'react-hot-toast';

const SystemSettingsCard = ({
  isOwnProfile,
  currentUser,
  onOpenChangelog,
  onExportData,
  onDeleteAccount,
}) => {
  const [pushEnabled, setPushEnabled] = useState(fcmService.isExplicitlyEnabled());
  const [savingPush, setSavingPush] = useState(false);

  const handleTogglePush = async () => {
    const next = !pushEnabled;
    setSavingPush(true);
    try {
      const token = await fcmService.setExplicitlyEnabled(next);
      const enabled =
        next &&
        (token || (typeof Notification !== 'undefined' && Notification.permission === 'granted'));
      setPushEnabled(Boolean(enabled));
      if (next && !enabled) {
        toast.error('Notification permission was not granted.');
      } else if (next) {
        toast.success('Push notifications enabled!');
      }
    } finally {
      setSavingPush(false);
    }
  };

  const copyFriendCode = () => {
    if (currentUser?.friendCode) {
      navigator.clipboard.writeText(currentUser.friendCode);
      toast.success('Friend Code copied!');
    }
  };

  return (
    <div className="glass-card p-6 sm:p-8 border border-white/5 bg-white/[0.01] space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl text-primary">
          <Settings size={18} />
        </div>
        <div>
          <h3 className="text-xs font-black text-white/50 uppercase tracking-[0.2em] font-manrope">
            Preferences & System
          </h3>
          <p className="text-[11px] text-white/30 font-inter mt-0.5">
            Notifications, data portability, and device settings.
          </p>
        </div>
      </div>

      <div className="space-y-4 divide-y divide-white/5">
        {/* Push Notifications */}
        {isOwnProfile && (
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <Bell size={16} className="text-white/40" />
              <div>
                <p className="text-sm font-bold text-white/80">Push Notifications</p>
                <p className="text-[11px] text-white/30">
                  Instant alerts for expenses and settlements.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={savingPush}
              onClick={handleTogglePush}
              className={`h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                pushEnabled
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                  : 'bg-white/5 border border-white/5 text-white/40 hover:text-white'
              }`}
            >
              {savingPush ? 'Saving...' : pushEnabled ? 'Enabled' : 'Off'}
            </button>
          </div>
        )}

        {/* Friend Code */}
        {isOwnProfile && currentUser?.friendCode && (
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-3">
              <KeyRound size={16} className="text-white/40" />
              <div>
                <p className="text-sm font-bold text-white/80">Your Friend Code</p>
                <p className="text-xs font-mono text-primary font-bold">{currentUser.friendCode}</p>
              </div>
            </div>
            <button
              onClick={copyFriendCode}
              className="h-8 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-white/70 flex items-center gap-1.5 transition-all"
            >
              <Copy size={12} />
              <span>Copy</span>
            </button>
          </div>
        )}

        {/* Export Data */}
        {isOwnProfile && (
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-3">
              <Download size={16} className="text-white/40" />
              <div>
                <p className="text-sm font-bold text-white/80">Export Ledger Data</p>
                <p className="text-[11px] text-white/30">Download PDF or CSV financial history.</p>
              </div>
            </div>
            <button
              onClick={onExportData}
              className="h-8 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold text-white/80 transition-all"
            >
              Export
            </button>
          </div>
        )}

        {/* App Version & Changelog */}
        <div className="flex items-center justify-between pt-4">
          <div>
            <p className="text-sm font-bold text-white/80">PayMatrix Version</p>
            <p className="text-[11px] text-white/30 font-inter">v2.2.1 · Web & PWA Release</p>
          </div>
          <button
            onClick={onOpenChangelog}
            className="text-[11px] font-bold text-primary hover:underline uppercase tracking-wider"
          >
            Changelog
          </button>
        </div>

        {/* Danger Zone: Account Deletion */}
        {isOwnProfile && (
          <div className="flex items-center justify-between pt-4">
            <div>
              <p className="text-sm font-bold text-red-400">Delete Account</p>
              <p className="text-[11px] text-white/30 font-inter">
                Irreversibly anonymize your identity under DPDP guidelines.
              </p>
            </div>
            <button
              onClick={onDeleteAccount}
              className="h-8 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemSettingsCard;
