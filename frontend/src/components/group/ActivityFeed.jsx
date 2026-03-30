import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { Clock, Plus, Receipt, UserPlus, UserMinus, Edit, Trash2, RotateCcw } from 'lucide-react';
import expenseService from '../../services/expenseService';
import { restoreExpense } from '../../redux/expenseSlice';
import { format } from 'date-fns';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const ActivityFeed = ({ groupId }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  const fetchActivity = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await expenseService.getActivity(groupId);
      setActivities(res.data.data.activity);
    } catch (err) {
      console.error('Error fetching group activity:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchActivity();

    // Socket listener for real-time updates
    const socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');
    socket.emit('join:group', groupId);
    
    socket.on('activity:new', () => {
      fetchActivity(true);
    });

    return () => {
      socket.disconnect();
    };
  }, [groupId, fetchActivity]);

  const handleRestore = async (expenseId) => {
    try {
      const result = await dispatch(restoreExpense(expenseId)).unwrap();
      toast.success('Expense restored successfully');
      fetchActivity(true);
    } catch (err) {
      toast.error(err || 'Failed to restore expense');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'expense_added': return <Plus size={16} className="text-primary" />;
      case 'expense_updated': return <Edit size={16} className="text-error" />;
      case 'expense_deleted': return <Trash2 size={16} className="text-error" />;
      case 'member_added': return <UserPlus size={16} className="text-emerald-500" />;
      case 'member_removed': return <UserMinus size={16} className="text-error" />;
      case 'settlement_added': return <Receipt size={16} className="text-primary" />;
      case 'expense_restored': return <RotateCcw size={16} className="text-emerald-500" />;
      case 'group_created': return <Clock size={16} className="text-indigo-400" />;
      default: return <Clock size={16} className="text-on-surface-variant" />;
    }
  };

  if (loading) return <div className="py-12 animate-pulse text-center text-on-surface-variant font-medium">Gathering history...</div>;

  if (activities.length === 0) {
    return (
      <div className="py-16 text-center text-on-surface-variant/40 italic font-inter">
        The history book is empty. Start splitting!
      </div>
    );
  }

  return (
    <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[1px] before:bg-outline-variant/10">
      {activities.map((activity, index) => {
        const isUpdate = activity.type === 'expense_updated';
        return (
          <motion.div 
            key={activity._id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex gap-4 relative z-10"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border transition-all ${
              isUpdate 
                ? 'bg-error/10 border-error/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                : 'bg-surface-container-high border-outline-variant/10'
            }`}>
              {getIcon(activity.type)}
            </div>
            <div className="flex flex-col gap-1 pt-1 flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <p className={`text-sm font-inter leading-relaxed ${isUpdate ? 'text-error font-medium' : 'text-on-surface-variant'}`}>
                  <span className={`font-semibold ${isUpdate ? 'text-error' : 'text-on-surface'}`}>
                    {activity.user?.name || 'Someone'}
                  </span>{' '}
                  {activity.message.includes(activity.user?.name) 
                    ? activity.message.replace(activity.user?.name, '').trim()
                    : activity.message}
                </p>
                
                {activity.type === 'expense_deleted' && (
                  <button
                    onClick={() => handleRestore(activity.relatedId)}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-[10px] font-bold text-primary transition-all border border-white/5 hover:border-primary/20 shrink-0"
                  >
                    <RotateCcw size={12} />
                    UNDO
                  </button>
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">
                {format(new Date(activity.createdAt), 'MMM dd, HH:mm')}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default ActivityFeed;
