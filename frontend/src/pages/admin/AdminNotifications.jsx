import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Send, Users, User, CheckCircle, XCircle, History } from 'lucide-react';
import adminService from '../../services/adminService.js';
import Loader from '../../components/common/Loader.jsx';
import toast from 'react-hot-toast';

const HistoryItem = ({ item }) => (
  <motion.div
    whileHover={{ scale: 0.99 }}
    className="rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 bg-surface-container-low border border-white/5 shadow-sm transition-all"
  >
    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-white/5 border border-white/10">
      {item.targetUid ? <User size={14} className="text-on-surface-variant" /> : <Users size={14} className="text-on-surface-variant" />}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <p className="text-sm font-bold text-white truncate">{item.title}</p>
        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/10">
          {item.targetUid ? 'Targeted' : 'Broadcast'}
        </span>
      </div>
      <p className="text-xs text-white/50 leading-relaxed mb-2 break-words">{item.body}</p>
      <div className="flex items-center gap-3 border-t border-white/[0.03] pt-2.5 flex-wrap">
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/15">
          <CheckCircle size={10} /> {item.successCount} sent
        </span>
        {item.failureCount > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/15">
            <XCircle size={10} /> {item.failureCount} failed
          </span>
        )}
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/20 ml-auto">
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
        </span>
      </div>
    </div>
  </motion.div>
);

const AdminNotifications = () => {
  const [history, setHistory]       = useState([]);
  const [histLoading, setHistLoading] = useState(true);
  const [sending, setSending]       = useState(false);
  const [mode, setMode]             = useState('broadcast'); // 'broadcast' | 'targeted'
  const [form, setForm]             = useState({ title: '', body: '', url: '', targetUid: '' });

  const loadHistory = async () => {
    try {
      const res = await adminService.getNotificationHistory(20);
      setHistory(res.notifications);
    } catch {
      // silent
    } finally {
      setHistLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and body are required');
      return;
    }
    if (mode === 'targeted' && !form.targetUid.trim()) {
      toast.error('Target UID is required for targeted notifications');
      return;
    }

    setSending(true);
    try {
      const payload = {
        title: form.title.trim(),
        body:  form.body.trim(),
        url:   form.url.trim() || undefined,
        targetUid: mode === 'targeted' ? form.targetUid.trim() : undefined,
      };
      const res = await adminService.broadcastNotification(payload);
      const { sent, failed, recipientCount } = res.data;
      toast.success(`Sent to ${sent}/${recipientCount} recipients${failed > 0 ? `, ${failed} failed` : ''}`);
      setForm({ title: '', body: '', url: '', targetUid: '' });
      loadHistory();
    } catch (e) {
      toast.error(e.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const inp = (field) => ({
    value:    form[field],
    onChange: (e) => setForm((prev) => ({ ...prev, [field]: e.target.value })),
    disabled: sending,
    className: 'w-full px-4 py-3 rounded-2xl text-sm bg-white/[0.03] border border-white/[0.08] text-white placeholder-white/20 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-colors disabled:opacity-50 font-inter',
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black font-manrope text-white tracking-tight">Notifications</h1>
        <p className="text-sm text-white/40 mt-0.5">Send push notifications to users</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose form */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-surface-container-low border border-white/5 shadow-xl h-fit"
        >
          <div className="flex items-center gap-2 mb-5">
            <Bell size={15} className="text-white/60" />
            <h2 className="font-bold text-white font-manrope text-sm">Compose Notification</h2>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-2xl p-1 mb-5 bg-white/[0.03] border border-white/[0.05]">
            {[
              { id: 'broadcast', label: 'Broadcast', icon: Users },
              { id: 'targeted',  label: 'Targeted',  icon: User },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  mode === id
                    ? 'bg-white text-black shadow-lg shadow-white/5'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSend} className="space-y-3.5">
            <input {...inp('title')} placeholder="Notification title *" />
            <textarea
              {...inp('body')}
              placeholder="Notification body *"
              rows={3}
              className="w-full px-4 py-3 rounded-2xl text-sm bg-white/[0.03] border border-white/[0.08] text-white placeholder-white/20 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-colors resize-none disabled:opacity-50 font-inter"
            />
            <input {...inp('url')} placeholder="Action URL (optional, e.g. /dashboard)" />
            {mode === 'targeted' && (
              <input {...inp('targetUid')} placeholder="Target user UID *" className={`${inp('targetUid').className} font-mono`} />
            )}
            <button
              type="submit"
              disabled={sending}
              className="w-full h-12 rounded-2xl bg-white text-black font-manrope font-bold text-sm tracking-widest flex items-center justify-center gap-2 hover:bg-white/90 transition-all active:scale-95 shadow-md disabled:opacity-50 mt-2"
            >
              {sending ? <Loader size="sm" className="w-5 h-5 text-black" /> : <Send size={14} />}
              {sending ? 'SENDING…' : (mode === 'broadcast' ? 'BROADCAST TO ALL' : 'SEND TO USER')}
            </button>
          </form>
        </motion.div>

        {/* History */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col h-full"
        >
          <div className="flex items-center gap-2 mb-3">
            <History size={14} className="text-white/30" />
            <h2 className="font-bold text-white/60 text-sm">Send History</h2>
          </div>

          {histLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader size="md" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-white/25 text-sm">No notifications sent yet</div>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {history.map((item) => <HistoryItem key={item._id} item={item} />)}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminNotifications;
