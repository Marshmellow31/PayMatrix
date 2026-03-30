import { useState } from 'react';
import { useSelector } from 'react-redux';
import useAuth from '../hooks/useAuth.js';
import Avatar from '../components/common/Avatar.jsx';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import { LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, logout, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');

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
            <Input value={name} onChange={(e) => setName(e.target.value)} id="profile-name" className="flex-1" />
            <Button onClick={handleSave} className="h-11 px-6">Save</Button>
          </div>
        ) : (
          <h2 className="text-2xl font-bold font-manrope text-primary mb-1 tracking-tight">{user?.name}</h2>
        )}
        <p className="text-sm text-on-surface-variant font-inter mb-4">{user?.email}</p>
        {!editing && (
          <Button variant="ghost" className="mt-1 h-10 px-5 rounded-full text-xs" onClick={() => setEditing(true)}>
            Edit Identity
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

      <Button variant="danger" className="w-full h-12 text-sm font-bold shadow-sm transition-all" onClick={logout}>
        <LogOut size={18} className="mr-2" /> Terminate Session
      </Button>
    </div>
  );
};

export default Profile;
