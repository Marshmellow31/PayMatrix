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
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold font-manrope text-primary mb-2">
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-on-surface-variant">
          Here's your expense overview
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="elevated-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-surface-variant/50 flex items-center justify-center">
              <HiUserGroup size={20} className="text-on-surface-variant" />
            </div>
          </div>
          <p className="text-2xl font-bold font-manrope text-primary">
            {groups.length}
          </p>
          <p className="text-xs text-on-surface-variant mt-1 uppercase tracking-wider">
            Active Groups
          </p>
        </div>

        <div className="elevated-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-surface-variant/50 flex items-center justify-center">
              <HiCurrencyRupee size={20} className="text-on-surface-variant" />
            </div>
          </div>
          <p className="text-2xl font-bold font-manrope text-primary">
            {groups.reduce((acc, g) => acc + (g.members?.length || 0), 0)}
          </p>
          <p className="text-xs text-on-surface-variant mt-1 uppercase tracking-wider">
            Total Members
          </p>
        </div>

        <Link
          to="/groups"
          className="elevated-card flex flex-col items-center justify-center gap-2 hover:bg-surface-container-highest transition-colors col-span-2 lg:col-span-1"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <HiPlus size={24} className="text-primary" />
          </div>
          <p className="text-sm font-medium text-on-surface-variant">
            Create Group
          </p>
        </Link>
      </div>

      {/* Recent Groups */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold font-manrope text-on-surface">
            Your Groups
          </h2>
          <Link to="/groups" className="text-sm text-on-surface-variant hover:text-primary transition-colors">
            View all →
          </Link>
        </div>

        {loading ? (
          <Loader className="py-12" />
        ) : groups.length === 0 ? (
          <div className="elevated-card text-center py-12">
            <p className="text-on-surface-variant mb-4">No groups yet</p>
            <Link to="/groups">
              <motion.button className="btn-primary" whileTap={{ scale: 0.96 }}>
                Create Your First Group
              </motion.button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.slice(0, 6).map((group) => (
              <GroupCard key={group._id} group={group} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold font-manrope text-on-surface mb-4">
            Recent Activity
          </h2>
          <div className="flex flex-col gap-3">
            {recentActivity.map((notif) => (
              <div
                key={notif._id}
                className={`elevated-card ${!notif.read ? 'border-l-2 border-primary' : ''}`}
              >
                <p className="text-sm text-on-surface">{notif.message}</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {new Date(notif.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
