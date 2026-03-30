import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Users, ArrowUpRight, ArrowDownLeft, PieChart, ChevronRight, Filter } from 'lucide-react';
import { fetchGroups } from '../redux/groupSlice.js';
import { fetchNotifications } from '../redux/notificationSlice.js';
import expenseService from '../services/expenseService.js';
import Loader from '../components/common/Loader.jsx';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { groups, loading: groupsLoading } = useSelector((state) => state.groups);
  const { notifications } = useSelector((state) => state.notifications);
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    dispatch(fetchGroups());
    dispatch(fetchNotifications());
    
    const getSummary = async () => {
      try {
        const res = await expenseService.getSummary();
        setSummary(res.data.data);
      } catch (err) {
        console.error('Failed to fetch summary:', err);
      } finally {
        setLoadingSummary(false);
      }
    };
    getSummary();
  }, [dispatch]);

  const recentActivity = notifications.slice(0, 5);
  const topGroups = groups.slice(0, 3);

  if (groupsLoading && loadingSummary) return <Loader />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12 pb-32">
      
      {/* Hero Balance Section */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2 mt-8"
      >
        <p className="font-inter text-on-surface-variant text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">
          Total Liquidity
        </p>
        <h1 className="font-manrope font-extrabold text-[3rem] sm:text-[4rem] lg:text-[5rem] leading-[1.1] tracking-[-0.04em] text-white">
          <span className="opacity-40 tracking-normal mr-1">₹</span>
          {Math.abs(summary?.netBalance || 0).toLocaleString()}
          <span className="text-on-surface-variant opacity-30">.00</span>
        </h1>
      </motion.section>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* You Owe Card */}
        <motion.div 
          whileHover={{ scale: 0.98 }}
          className="glass-card p-6 rounded-2xl border border-white/5 cursor-pointer relative overflow-hidden group"
        >
          <div className="flex justify-between items-start mb-6">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
              <ArrowUpRight size={20} className="text-on-surface-variant" />
            </div>
            <span className="font-inter text-[10px] font-bold tracking-widest uppercase text-on-surface-variant opacity-60">Debt Status</span>
          </div>
          <h3 className="font-manrope font-bold text-lg text-white/60 mb-1">You Owe</h3>
          <p className="font-manrope text-2xl font-black text-white">₹{summary?.totalOwe?.toLocaleString() || '0'}</p>
          <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <ArrowUpRight size={120} />
          </div>
        </motion.div>

        {/* You Are Owed Card */}
        <motion.div 
          whileHover={{ scale: 0.98 }}
          className="glass-card p-6 rounded-2xl border border-white/5 cursor-pointer relative overflow-hidden group"
        >
          <div className="flex justify-between items-start mb-6">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
              <ArrowDownLeft size={20} className="text-on-surface-variant" />
            </div>
            <span className="font-inter text-[10px] font-bold tracking-widest uppercase text-on-surface-variant opacity-60">Pending Returns</span>
          </div>
          <h3 className="font-manrope font-bold text-lg text-white/60 mb-1">You Are Owed</h3>
          <p className="font-manrope text-2xl font-black text-white">₹{summary?.totalOwed?.toLocaleString() || '0'}</p>
          <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <ArrowDownLeft size={120} />
          </div>
        </motion.div>

        {/* Overview Card */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-manrope font-bold text-lg text-white">Overview</h3>
            <PieChart size={18} className="text-on-surface-variant opacity-50" />
          </div>
          <div className="flex items-center gap-5">
            <div className="relative w-16 h-16 flex-shrink-0">
               <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                <path className="text-white" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="65, 100" strokeLinecap="round" strokeWidth="3" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-white tracking-tight">
                {summary?.categories?.[0]?._id || 'General'}
              </p>
              <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter opacity-50">Primary Cost</p>
            </div>
          </div>
        </div>
      </div>

      {/* Asymmetric Layout: Groups and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 sm:gap-16">
        
        {/* Top Groups Column */}
        <div className="lg:col-span-4 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="font-manrope font-black text-xl text-white tracking-tight">Active Cohorts</h2>
            <div className="flex items-center gap-4">
              <Link to="/groups?add=true" className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-on-surface-variant hover:text-white transition-colors">
                <Plus size={16} />
              </Link>
              <Link to="/groups" className="text-[10px] font-bold tracking-[0.2em] uppercase text-on-surface-variant hover:text-white transition-colors">See All</Link>
            </div>
          </div>
          
          <div className="space-y-1">
            {topGroups.map((group, idx) => (
              <Link 
                to={`/groups/${group._id}`}
                key={group._id} 
                className={`flex items-center gap-5 group cursor-pointer py-5 transition-all ${idx !== topGroups.length - 1 ? 'border-b border-white/5' : ''}`}
              >
                <div className="w-12 h-12 rounded-xl bg-surface-container-high overflow-hidden flex-shrink-0 border border-white/5">
                  <div className="w-full h-full bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center font-manrope font-bold text-white text-lg">
                    {group.title[0]}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-manrope font-bold text-white text-base leading-none mb-1 group-hover:translate-x-1 transition-transform">{group.title}</p>
                  <p className="text-[10px] font-bold font-inter text-on-surface-variant uppercase tracking-widest opacity-50">
                    {group.members?.length || 0} Members
                  </p>
                </div>
                <ChevronRight size={18} className="text-on-surface-variant opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}

            {groups.length === 0 && (
               <div className="py-10 text-center glass-card rounded-2xl border border-dashed border-white/10">
                <p className="text-on-surface-variant text-sm font-inter">No active cohorts yet.</p>
               </div>
            )}
          </div>
        </div>

        {/* Recent Activity Column */}
        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="font-manrope font-black text-xl text-white tracking-tight">Recent Timeline</h2>
            <Filter size={18} className="text-on-surface-variant opacity-50 cursor-pointer hover:text-white transition-colors" />
          </div>

          <div className="glass-card rounded-3xl overflow-hidden border border-white/5">
            <div className="divide-y divide-white/5">
              {recentActivity.map((notif) => (
                <div key={notif._id} className="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer group">
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 group-hover:text-white transition-colors">
                      <Plus size={20} />
                    </div>
                    <div>
                      <p className="font-manrope font-bold text-white text-base leading-tight mb-0.5">{notif.message}</p>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-50">
                        {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}

              {recentActivity.length === 0 && (
                <div className="p-20 text-center">
                  <p className="text-on-surface-variant text-sm font-inter">Timeline is quiet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* High-Impact Add Expense FAB */}
      <Link 
        to="/add-expense"
        className="fixed bottom-28 right-8 sm:bottom-12 sm:right-12 w-16 h-16 bg-white text-black rounded-full shadow-[0_20px_50px_rgba(255,255,255,0.3)] flex items-center justify-center active:scale-90 transition-all z-40 hover:rotate-90 duration-500 border-4 border-black"
      >
        <Plus size={32} strokeWidth={3} />
      </Link>

    </div>
  );
};

export default Dashboard;
