import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiPlus, HiUserGroup, HiCurrencyRupee } from 'react-icons/hi';
import { fetchGroups } from '../redux/groupSlice.js';
import { fetchNotifications } from '../redux/notificationSlice.js';
import Loader from '../components/common/Loader.jsx';
import GroupCard from '../components/group/GroupCard.jsx';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { groups, loading } = useSelector((state) => state.groups);
  const { notifications } = useSelector((state) => state.notifications);

  useEffect(() => {
    dispatch(fetchGroups());
    dispatch(fetchNotifications());
  }, [dispatch]);

  const recentActivity = notifications.slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pb-24">
      {/* Welcome Header */}
      <div className="mb-12 relative rounded-3xl p-8 lg:p-14 overflow-hidden bg-surface-container-lowest border-none noise">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl lg:text-6xl font-bold font-manrope text-primary mb-4 tracking-[-0.02em] leading-tight flex items-center gap-3">
             Welcome back,<br />{user?.name?.split(' ')[0]}
          </h1>
          <p className="text-on-surface-variant font-inter text-lg lg:text-xl">
             Here is your financial overview for the day.
          </p>
        </div>
        {/* Decorative Element */}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary opacity-[0.03] rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <div className="elevated-card flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-surface-variant/30 flex items-center justify-center">
              <HiUserGroup size={20} className="text-on-surface" />
            </div>
            <p className="text-xs text-on-surface-variant uppercase tracking-widest font-semibold font-inter">
              Active Groups
            </p>
          </div>
          <p className="text-5xl lg:text-6xl font-bold font-manrope text-primary tracking-tighter">
            {groups.length}
          </p>
        </div>

        <div className="elevated-card flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-surface-variant/30 flex items-center justify-center">
              <HiCurrencyRupee size={20} className="text-on-surface" />
            </div>
            <p className="text-xs text-on-surface-variant uppercase tracking-widest font-semibold font-inter">
              Network Size
            </p>
          </div>
          <p className="text-5xl lg:text-6xl font-bold font-manrope text-primary tracking-tighter">
            {groups.reduce((acc, g) => acc + (g.members?.length || 0), 0)}
          </p>
        </div>

        <Link
          to="/groups"
          className="elevated-card flex flex-col justify-center gap-4 hover:bg-surface-container-highest transition-colors min-h-[160px] group relative overflow-hidden"
        >
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors z-10">
            <HiPlus size={28} className="text-primary group-hover:text-on-primary transition-colors" />
          </div>
          <p className="text-lg font-bold font-manrope text-primary z-10">
            Establish new group
          </p>
          <div className="absolute right-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 translate-y-4">
             <HiPlus size={120} className="text-surface-variant/20" />
          </div>
        </Link>
      </div>

      {/* Recent Groups */}
      <div className="mb-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold font-manrope text-primary tracking-tight">
              Active Cohorts
            </h2>
            <p className="text-on-surface-variant font-inter mt-1 opacity-80">
              Your recent shared expense groups
            </p>
          </div>
          <Link to="/groups" className="text-sm font-semibold text-primary hover:text-secondary transition-colors uppercase tracking-wider font-inter">
            View all
          </Link>
        </div>

        {loading ? (
          <Loader className="py-12" />
        ) : groups.length === 0 ? (
          <div className="submerged text-center py-20 px-6">
            <p className="text-on-surface-variant mb-6 text-lg font-inter">Your network is currently empty.</p>
            <Link to="/groups">
              <motion.button className="btn-primary" whileTap={{ scale: 0.96 }}>
                Create Your First Group
              </motion.button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.slice(0, 6).map((group) => (
              <GroupCard key={group._id} group={group} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="submerged p-8 lg:p-12">
          <h2 className="text-2xl font-bold font-manrope text-primary mb-8 tracking-tight">
            Recent Timeline
          </h2>
          <div className="flex flex-col gap-6">
            {recentActivity.map((notif, index) => (
              <div
                key={notif._id}
                className={`flex items-start gap-4 ${index !== recentActivity.length - 1 ? 'border-b border-outline-variant/10 pb-6' : ''}`}
              >
                <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${!notif.read ? 'bg-primary shadow-[0_0_12px_rgba(255,255,255,0.8)]' : 'bg-surface-variant'}`} />
                <div>
                  <p className={`text-base font-inter ${!notif.read ? 'text-on-surface font-medium' : 'text-on-surface-variant text-sm'}`}>{notif.message}</p>
                  <p className="text-xs text-outline mt-2 font-inter uppercase tracking-widest">
                    {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
