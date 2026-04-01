import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNotifications, markAsRead, markAllRead } from '../redux/notificationSlice.js';
import Loader from '../components/common/Loader.jsx';
import Button from '../components/common/Button.jsx';

const Activity = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { notifications, unreadCount, loading } = useSelector((state) => state.notifications);

  useEffect(() => { 
    if (user?.uid) dispatch(fetchNotifications(user?.uid)); 
  }, [dispatch, user?.uid]);

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl lg:text-5xl font-bold font-manrope text-primary tracking-[-0.01em]">
            Activity Log
          </h1>
          {unreadCount > 0 && <p className="text-lg text-on-surface-variant mt-2 font-inter">{unreadCount} unread events</p>}
        </div>
        {unreadCount > 0 && (
          <Button 
            variant="ghost" 
            className="h-12 px-6" 
            onClick={() => user?.uid && dispatch(markAllRead(user.uid))}
          >
            Acknowledge All
          </Button>
        )}
      </div>

      {loading ? <Loader className="py-20" /> : notifications.length === 0 ? (
        <div className="submerged text-center py-24 px-6 border-none">
          <h3 className="text-3xl font-bold font-manrope text-primary mb-4 tracking-tight">System is Quiet</h3>
          <p className="text-lg text-on-surface-variant max-w-sm mx-auto font-inter leading-relaxed">
            Your network activity and settlement notifications will be logged here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 relative before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-outline-variant/10">
          {notifications.map((notif) => (
            <div
              key={notif._id}
              className={`relative pl-8 cursor-pointer group`}
              onClick={() => !notif.read && dispatch(markAsRead(notif._id))}
            >
              <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-[4px] border-surface flex items-center justify-center transition-colors ${!notif.read ? 'bg-primary' : 'bg-surface-container-high'}`} />
              <div className="glass-card hover:bg-surface-container-lowest transition-all duration-300 p-6">
                <p className={`text-base font-inter ${!notif.read ? 'text-primary font-semibold' : 'text-on-surface'}`}>
                  {notif.message}
                </p>
                <p className="text-xs font-semibold text-on-surface-variant mt-3 uppercase tracking-widest font-inter opacity-70">
                  {new Date(notif.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Activity;
