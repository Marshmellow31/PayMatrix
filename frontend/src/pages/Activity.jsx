import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNotifications, markAsRead, markAllRead } from '../redux/notificationSlice.js';
import Loader from '../components/common/Loader.jsx';
import Button from '../components/common/Button.jsx';

const Activity = () => {
  const dispatch = useDispatch();
  const { notifications, unreadCount, loading } = useSelector((state) => state.notifications);

  useEffect(() => { dispatch(fetchNotifications()); }, [dispatch]);

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-manrope text-primary">Activity</h1>
          {unreadCount > 0 && <p className="text-sm text-on-surface-variant mt-1">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" onClick={() => dispatch(markAllRead())}>Mark all read</Button>
        )}
      </div>

      {loading ? <Loader className="py-20" /> : notifications.length === 0 ? (
        <div className="elevated-card text-center py-16">
          <p className="text-5xl mb-4">🔔</p>
          <h3 className="text-lg font-semibold font-manrope text-on-surface mb-2">No activity yet</h3>
          <p className="text-sm text-on-surface-variant">Notifications will appear here</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((notif) => (
            <div
              key={notif._id}
              className={`elevated-card cursor-pointer transition-colors hover:bg-surface-container-highest ${!notif.read ? 'border-l-2 border-primary' : ''}`}
              onClick={() => !notif.read && dispatch(markAsRead(notif._id))}
            >
              <p className="text-sm text-on-surface">{notif.message}</p>
              <p className="text-xs text-on-surface-variant mt-1.5">
                {new Date(notif.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Activity;
