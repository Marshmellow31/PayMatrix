import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import useAuth from '../hooks/useAuth.js';
import Avatar from '../components/common/Avatar.jsx';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import { LogOut, Download, Mail, User, Settings, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import groupService from '../services/groupService.js';
import expenseService from '../services/expenseService.js';
import { computeGroupBalances } from '../utils/balanceEngine.js';
import { exportToPDF } from '../utils/exportUtils.js';

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
    <div className="max-w-4xl mx-auto animate-fade-in pb-24 px-4 sm:px-6">
      <div className="mb-8 pt-6">
        <h1 className="text-4xl lg:text-5xl font-black font-manrope text-white tracking-[-0.04em] mb-2">
          Security & Identity
        </h1>
        <p className="text-sm md:text-base text-on-surface-variant font-inter opacity-60">
          Manage your network presence and archived data exports.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Identity Card */}
        <div className="lg:col-span-12 xl:col-span-12">
          <div className="glass-card overflow-hidden border border-white/5 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50 opacity-20" />
            
            <div className="p-6 lg:p-10">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                  <Avatar 
                    name={user?.name} 
                    src={user?.avatar} 
                    size="xl" 
                    className="relative w-28 h-28 text-3xl border-4 border-white/5 shadow-2xl" 
                  />
                </div>

                <div className="flex-1 text-center md:text-left space-y-4">
                  {editing ? (
                    <div className="space-y-4 max-w-md mx-auto md:mx-0">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Identity Name</label>
                        <Input 
                          value={name} 
                          onChange={(e) => setName(e.target.value)} 
                          id="profile-name" 
                          className="h-14 bg-white/[0.03] text-lg font-bold" 
                          disabled={!isOnline} 
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button onClick={handleSave} className="h-12 px-8 font-black uppercase text-[10px] tracking-widest" disabled={!isOnline || !name.trim()}>
                          {isOnline ? 'Save Changes' : 'Offline'}
                        </Button>
                        <Button variant="ghost" onClick={() => setEditing(false)} className="h-12 px-6 font-black uppercase text-[10px] tracking-widest bg-white/5">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h2 className="text-4xl font-extrabold font-manrope text-white tracking-tight">{user?.name}</h2>
                      <div className="flex items-center justify-center md:justify-start gap-2 text-on-surface-variant opacity-60">
                        <Mail size={14} />
                        <span className="text-sm font-medium font-inter">{user?.email}</span>
                      </div>
                    </div>
                  )}

                  {!editing && (
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2">
                      <Button 
                        variant="ghost" 
                        className={`h-11 px-8 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-white/5 hover:bg-white/10 border border-white/5 active:scale-95 ${!isOnline ? 'opacity-30 grayscale cursor-not-allowed' : ''}`} 
                        onClick={() => isOnline && setEditing(true)}
                        disabled={!isOnline}
                      >
                        <User size={14} className="mr-2 opacity-50" />
                        {isOnline ? 'Edit Identity' : 'Updates Blocked'}
                      </Button>
                      
                      <Button 
                        variant="danger" 
                        className="h-11 px-8 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center" 
                        onClick={logout}
                      >
                        <LogOut size={14} className="mr-2 opacity-70" /> Terminate
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Settings & Assets */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-card p-10 border border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Settings size={18} />
              </div>
              <h3 className="text-sm font-black text-white/40 uppercase tracking-[0.2em] font-manrope">System</h3>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <span className="text-sm font-bold text-white/60 font-inter">Currency</span>
                <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase">{user?.preferences?.currency || 'INR'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white/60 font-inter">Interface</span>
                <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase">{user?.preferences?.theme || 'dark'}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
             <PastGroups userId={user?._id} />
          </div>
        </div>
      </div>
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
      const [expRes, stlRes, logRes] = await Promise.all([
        expenseService.getExpenses(group._id),
        expenseService.getSettlements(group._id),
        expenseService.getActivity(group._id)
      ]);
      
      const expenses = expRes.data.data.expenses;
      const settlements = stlRes.data.data.settlements;
      const logs = logRes.data.data.activity;

      // Compute balances dynamically for the report
      const calculatedBalances = computeGroupBalances(expenses, settlements, group.members);
      
      // Map to the format exportToPDF expects
      const formattedBalances = Object.keys(calculatedBalances).map(uid => {
        const member = group.members.find(m => {
          const mid = (m.user?._id || m.user?.uid || m.user || '').toString();
          return mid === uid;
        });
        return {
          user: member?.user || { name: 'Member', email: 'N/A' },
          balance: calculatedBalances[uid]
        };
      });

      exportToPDF(group, expenses, formattedBalances, logs);
      toast.success(`PDF Security Report exported for ${group.title}`);
    } catch (err) {
      console.error(err);
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  if (loading) return null;

  return (
    <div className="glass-card p-10 border-primary/10 bg-primary/[0.01]">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <Archive size={18} />
        </div>
        <h3 className="text-sm font-black text-white/40 uppercase tracking-[0.2em] font-manrope text-primary/60">Archived Cohorts</h3>
      </div>

      <div className="flex flex-col gap-5">
        {groups.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">No Archived Sessions Found</p>
          </div>
        ) : (
          groups.map(group => (
          <div key={group._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-lg font-black text-white group-hover:text-primary transition-colors tracking-tight">{group.title}</span>
              <div className="flex items-center gap-3">
                <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded-full ${group.status === 'deleted' ? 'bg-red-500/10 text-red-400 border border-red-500/10' : 'bg-white/5 text-white/40 border border-white/5'}`}>
                  {group.status === 'deleted' ? 'Deleted' : 'Former Member'}
                </span>
                <span className="text-[10px] text-white/20 font-inter font-bold">• {new Date(group.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}</span>
              </div>
            </div>
            <button 
              onClick={() => handleExport(group)}
              disabled={exporting === group._id}
              className="h-12 px-6 rounded-2xl bg-white/5 hover:bg-white/10 text-[10px] font-black text-white uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 border border-white/5"
            >
              {exporting === group._id ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <Download size={16} className="opacity-60" />
                  <span>Generate Report</span>
                </>
              )}
            </button>
          </div>
        ))
        )}
      </div>
    </div>
  );
};

export default Profile;
