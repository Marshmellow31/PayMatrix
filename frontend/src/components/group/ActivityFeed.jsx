import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { Clock, Plus, Receipt, UserPlus, UserMinus, Edit, Trash2, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { db } from '../../config/firebase.js';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';
import expenseService from '../../services/expenseService';

const ActivityFeed = ({ groupId }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!groupId) return;

    setLoading(true);
    
    // Set up real-time listener for logs (Activity Feed)
    const q = query(
      collection(db, 'groups', groupId, 'logs'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveActivities = snapshot.docs.map(docSnap => ({
        _id: docSnap.id,
        ...docSnap.data()
      }));
      setActivities(liveActivities);
      setLoading(false);
    }, (err) => {
      console.error('Error listening to activities:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [groupId]);

  const handleRestore = async (expenseId) => {
    toast.error('Undo is not supported in this architecture yet.');
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
                  {typeof activity.message === 'string' 
                    ? activity.message 
                    : (activity.message?.message || `${activity.actorName || 'Someone'} performed an action`)}
                  {parseFloat(activity.amount || 0) > 10000 && (
                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-tighter border border-amber-500/20 animate-pulse">
                      SENSITIVE AMOUNT
                    </span>
                  )}
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
                {activity.createdAt ? format(new Date(activity.createdAt), 'MMM dd, HH:mm') : ''}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default ActivityFeed;
