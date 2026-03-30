import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, Plus, Receipt, UserPlus, UserMinus, Edit, Trash2 } from 'lucide-react';
import expenseService from '../../services/expenseService';
import { format } from 'date-fns';
import { io } from 'socket.io-client';

const ActivityFeed = ({ groupId }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const getIcon = (type) => {
    switch (type) {
      case 'expense_added': return <Plus size={16} className="text-primary" />;
      case 'expense_updated': return <Edit size={16} className="text-amber-500" />;
      case 'expense_deleted': return <Trash2 size={16} className="text-error" />;
      case 'member_added': return <UserPlus size={16} className="text-emerald-500" />;
      case 'member_removed': return <UserMinus size={16} className="text-error" />;
      case 'settlement_added': return <Receipt size={16} className="text-primary" />;
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
      {activities.map((activity, index) => (
        <motion.div 
          key={activity._id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex gap-4 relative z-10"
        >
          <div className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/10 flex items-center justify-center shrink-0">
            {getIcon(activity.type)}
          </div>
          <div className="flex flex-col gap-1 pt-1">
            <p className="text-sm font-inter text-on-surface-variant leading-relaxed">
              <span className="font-semibold text-on-surface">{activity.user?.name || 'Someone'}</span>{' '}
              {activity.message.includes(activity.user?.name) 
                ? activity.message.replace(activity.user?.name, '').trim()
                : activity.message}
            </p>
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">
              {format(new Date(activity.createdAt), 'MMM dd, HH:mm')}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ActivityFeed;
