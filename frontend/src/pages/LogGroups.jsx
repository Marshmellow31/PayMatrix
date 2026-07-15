import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, ChevronRight, ScrollText } from 'lucide-react';
import logService from '../services/logService.js';
import Button from '../components/common/Button.jsx';
import Loader from '../components/common/Loader.jsx';
import CreateLogGroupModal from '../components/logs/CreateLogGroupModal.jsx';

const LogGroups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      const res = await logService.getMyLogGroups();
      setGroups(res.data.data.groups || []);
    } catch (err) {
      console.error('Failed to load log groups:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  if (loading) return <Loader className="py-20" />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto px-4 py-6 pb-28 space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between px-1 gap-6 sm:gap-0">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl sm:text-4xl font-black font-manrope text-white tracking-tighter leading-tight italic">
            Logs
          </h1>
          <p className="text-[10px] sm:text-[12px] text-white/40 font-black uppercase tracking-[0.3em]">
            Shared Spending Timelines
          </p>
        </div>

        <Button variant="primary" className="rounded-2xl" onClick={() => setCreateModalOpen(true)}>
          <Plus size={16} strokeWidth={3} /> Create Group
        </Button>
      </div>

      <div className="h-px bg-white/10 w-full" />

      {groups.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center gap-4 border border-dashed border-white/10 rounded-2xl bg-white/[0.01] text-center px-6">
          <ScrollText size={36} className="text-white/10" />
          <div className="space-y-1">
            <p className="text-sm text-white/40 font-inter">No log groups yet</p>
            <p className="text-xs text-white/20 font-inter max-w-xs">
              Create one for your parents or family so they can see where your money goes — no
              explaining needed.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group, idx) => (
            <motion.div
              key={group._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <Link
                to={`/logs/${group._id}`}
                className="group px-5 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/20 flex items-center justify-between transition-all duration-300 shadow-xl"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black font-manrope text-sm border shrink-0 bg-white/10 text-white/60 border-white/10">
                    {(group.name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <p className="text-base font-black text-white font-manrope truncate group-hover:text-white">
                      {group.name}
                    </p>
                    <p className="text-[9px] font-black tracking-[0.2em] truncate text-white/20">
                      {(group.members || []).length} MEMBER{(group.members || []).length !== 1 ? 'S' : ''}
                    </p>
                  </div>
                </div>

                <ChevronRight
                  size={16}
                  className="text-white/10 group-hover:text-white/50 transition-colors shrink-0 ml-4"
                />
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <CreateLogGroupModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={loadGroups}
      />
    </motion.div>
  );
};

export default LogGroups;
