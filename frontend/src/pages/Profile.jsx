import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import useAuth from '../hooks/useAuth.js';
import Avatar from '../components/common/Avatar.jsx';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import { LogOut, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import groupService from '../services/groupService.js';
import expenseService from '../services/expenseService.js';

const Profile = () => {
  const { user, logout, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const isOnline = useOnlineStatus();

  const handleSave = async () => {
    try {
      const result = await updateProfile({ name });
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('Profile updated');
        setEditing(false);
      } else {
        toast.error(result.payload || 'Update failed');
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in pb-24">
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-3xl lg:text-4xl font-bold font-manrope text-primary tracking-[-0.02em]">Settings & Profile</h1>
        <p className="text-base text-on-surface-variant mt-2 font-inter opacity-70">Manage your account preferences and network identity.</p>
      </div>

      <div className="submerged p-6 lg:p-10 text-center mb-8 shadow-sm">
        <Avatar name={user?.name} src={user?.avatar} size="lg" className="mx-auto mb-4 w-18 h-18 text-2xl" />
        {editing ? (
          <div className="flex flex-col sm:flex-row gap-4 mb-4 max-w-sm mx-auto">
            <Input value={name} onChange={(e) => setName(e.target.value)} id="profile-name" className="flex-1" disabled={!isOnline} />
            <Button onClick={handleSave} className="h-11 px-6" disabled={!isOnline || !name.trim()}>
              {isOnline ? 'Save' : 'Offline'}
            </Button>
          </div>
        ) : (
          <h2 className="text-2xl font-bold font-manrope text-primary mb-1 tracking-tight">{user?.name}</h2>
        )}
        <p className="text-sm text-on-surface-variant font-inter mb-4">{user?.email}</p>
        {!editing && (
          <Button 
            variant="ghost" 
            className={`mt-1 h-10 px-5 rounded-full text-xs transition-all ${!isOnline ? 'opacity-30 grayscale cursor-not-allowed' : ''}`} 
            onClick={() => isOnline && setEditing(true)}
            disabled={!isOnline}
          >
            {isOnline ? 'Edit Identity' : 'Updates Blocked (Offline)'}
          </Button>
        )}
      </div>

      <div className="glass-card p-8 lg:p-10 mb-10">
        <h3 className="text-sm font-semibold text-on-surface-variant mb-6 uppercase tracking-widest font-inter">System Preferences</h3>
        <div className="flex items-center justify-between py-4 border-b border-outline-variant/10">
          <span className="text-base font-medium font-inter text-on-surface">Default Currency</span>
          <span className="chip bg-surface-lowest text-primary font-bold">{user?.preferences?.currency || 'INR'}</span>
        </div>
        <div className="flex items-center justify-between py-4 border-b border-outline-variant/10">
          <span className="text-base font-medium font-inter text-on-surface">Interface Theme</span>
          <span className="chip bg-surface-lowest text-primary font-bold capitalize">{user?.preferences?.theme || 'dark'}</span>
        </div>
      </div>

      <PastGroups userId={user?._id} />

      <Button variant="danger" className="w-full h-12 text-sm font-bold shadow-sm transition-all" onClick={logout}>
        <LogOut size={18} className="mr-2" /> Terminate Session
      </Button>
    </div>
  );
};

const PastGroups = ({ userId }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    if (userId) {
      groupService.getPastGroups(userId)
        .then(res => setGroups(res.data.data.groups))
        .catch(err => console.error("Failed to fetch past groups:", err))
        .finally(() => setLoading(false));
    }
  }, [userId]);

  const handleExport = async (group) => {
    setExporting(group._id);
    try {
      const [expRes, stlRes] = await Promise.all([
        expenseService.getExpenses(group._id),
        expenseService.getSettlements(group._id)
      ]);
      const { exportToJSON } = await import('../utils/exportUtils.js');
      exportToJSON(group, expRes.data.data.expenses, stlRes.data.data.settlements);
      toast.success(`Data exported for ${group.title}`);
    } catch (err) {
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  if (loading) return null;
  if (groups.length === 0) return null;

  return (
    <div className="glass-card p-8 lg:p-10 mb-10 border-primary/10 bg-primary/[0.01]">
      <h3 className="text-sm font-semibold text-primary/60 mb-6 uppercase tracking-widest font-inter">Archived & Past Groups</h3>
      <div className="flex flex-col gap-4">
        {groups.map(group => (
          <div key={group._id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all group">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{group.title}</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${group.status === 'deleted' ? 'bg-red-500/10 text-red-400' : 'bg-white/10 text-white/40'}`}>
                  {group.status === 'deleted' ? 'Deleted' : 'Former Member'}
                </span>
                <span className="text-[10px] text-white/20 font-inter">• {new Date(group.createdAt).getFullYear()}</span>
              </div>
            </div>
            <button 
              onClick={() => handleExport(group)}
              disabled={exporting === group._id}
              className="h-10 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-black text-white uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {exporting === group._id ? (
                <>
                  <div className="w-3 h-3 border border-white/20 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download size={14} className="opacity-60" />
                  Export Data
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Profile;
