import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Plus, Settings, ChevronLeft, History, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import logService from '../services/logService.js';
import Button from '../components/common/Button.jsx';
import Loader from '../components/common/Loader.jsx';
import Avatar from '../components/common/Avatar.jsx';
import LogTimeline from '../components/logs/LogTimeline.jsx';
import RecordEntryModal from '../components/logs/RecordEntryModal.jsx';
import ManageLogGroupModal from '../components/logs/ManageLogGroupModal.jsx';
import LogEntryModal from '../components/logs/LogEntryModal.jsx';
import { formatCurrency } from '../utils/formatCurrency.js';

const LogGroupDetail = () => {
  const { groupId } = useParams();
  const { user } = useSelector((state) => state.auth);
  const currentUid = user?._id || user?.uid;

  const [group, setGroup] = useState(null);
  const [entries, setEntries] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const load = useCallback(async () => {
    try {
      const [groupRes, entriesRes, activityRes] = await Promise.all([
        logService.getLogGroup(groupId),
        logService.getEntries(groupId),
        logService.getActivity(groupId),
      ]);
      setGroup(groupRes.data.data.group);
      setEntries(entriesRes.data.data.entries || []);
      setActivity(activityRes.data.data.activity || []);
    } catch (err) {
      console.error('Failed to load log group:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (entry) => {
    try {
      await logService.deleteEntry(groupId, entry._id);
      toast.success('Entry deleted');
      setEntries((prev) => prev.filter((e) => e._id !== entry._id));
      const activityRes = await logService.getActivity(groupId);
      setActivity(activityRes.data.data.activity || []);
    } catch (err) {
      toast.error(err.message || 'Failed to delete entry');
    }
  };

  const isOwner = group?.ownerId === currentUid;
  const thisMonthTotal = entries
    .filter((e) => {
      const d = new Date(e.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  if (loading) return <Loader className="py-20" />;

  if (notFound || !group) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 pb-32 text-center">
        <p className="text-sm text-white/30 font-inter mb-4">
          This group doesn&apos;t exist or you&apos;re no longer a member.
        </p>
        <Link
          to="/logs"
          className="inline-flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest hover:underline"
        >
          <ChevronLeft size={14} /> Back to Logs
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto px-4 py-6 pb-28 space-y-6"
    >
      <Link
        to="/logs"
        className="flex items-center gap-1.5 text-[10px] font-black text-white/30 uppercase tracking-widest hover:text-white transition-colors w-fit"
      >
        <ChevronLeft size={12} /> Back
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between px-1 gap-6 sm:gap-0">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl sm:text-4xl font-black font-manrope text-white tracking-tighter leading-tight italic">
            {group.name}
          </h1>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {(group.members || []).slice(0, 5).map((uid) => (
                <Avatar
                  key={uid}
                  name={uid === currentUid ? 'You' : 'M'}
                  size="sm"
                  className="border-2 border-[#131313]"
                />
              ))}
            </div>
            <p className="text-[10px] sm:text-[12px] text-white/40 font-black uppercase tracking-[0.3em]">
              {(group.members || []).length} member{(group.members || []).length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-start sm:items-end gap-1">
            <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">
              This Month
            </span>
            <span className="text-xl sm:text-2xl font-black font-manrope text-white tracking-tight">
              {formatCurrency(thisMonthTotal)}
            </span>
          </div>
          <button
            onClick={() => setManageModalOpen(true)}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors shrink-0"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      <Button variant="primary" className="rounded-2xl" onClick={() => setRecordModalOpen(true)}>
        <Plus size={16} strokeWidth={3} /> Record
      </Button>

      <div className="h-px bg-white/10 w-full" />

      <LogTimeline
        entries={entries}
        currentUid={currentUid}
        isOwner={isOwner}
        showAuthor={(group.members || []).length > 1}
        onEdit={(entry) => setEditingEntry(entry)}
        onDelete={handleDelete}
      />

      {activity.length > 0 && (
        <section className="space-y-3 pt-2" aria-labelledby="log-activity-title">
          <div>
            <h2 id="log-activity-title" className="text-base font-black text-white">
              Activity
            </h2>
            <p className="text-xs text-white/35">Immutable changes in this log</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] divide-y divide-white/[0.07]">
            {activity.map((event) => {
              const rawDate = event.createdAt?.toDate?.() || new Date(event.createdAt || 0);
              return (
                <div key={event._id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                    {event.type === 'entry_deleted' ? (
                      <Trash2 size={15} className="text-red-300/80" />
                    ) : (
                      <History size={15} className="text-white/45" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white/80 break-words">
                      {event.message}
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {Number.isNaN(rawDate.getTime())
                        ? 'Pending sync'
                        : rawDate.toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <RecordEntryModal
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        onSaved={load}
        groupId={groupId}
        existingEntries={entries}
      />

      <LogEntryModal
        isOpen={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        onSaved={load}
        groupId={groupId}
        entry={editingEntry}
      />

      <ManageLogGroupModal
        isOpen={manageModalOpen}
        onClose={() => setManageModalOpen(false)}
        group={group}
        currentUid={currentUid}
        onChanged={() => {
          load();
        }}
      />
    </motion.div>
  );
};

export default LogGroupDetail;
