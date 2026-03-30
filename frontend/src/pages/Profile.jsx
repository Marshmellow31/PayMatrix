import { useState } from 'react';
import { useSelector } from 'react-redux';
import useAuth from '../hooks/useAuth.js';
import Avatar from '../components/common/Avatar.jsx';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import { HiLogout } from 'react-icons/hi';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');

  const handleSave = () => {
    // Would dispatch updateProfile here
    toast.success('Profile updated');
    setEditing(false);
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in pb-24">
      <div className="mb-12 text-center md:text-left">
        <h1 className="text-4xl lg:text-5xl font-bold font-manrope text-primary tracking-[-0.01em]">Settings & Profile</h1>
        <p className="text-lg text-on-surface-variant mt-2 font-inter">Manage your account preferences and network identity.</p>
      </div>

      <div className="submerged p-8 lg:p-12 text-center mb-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
        <Avatar name={user?.name} src={user?.avatar} size="xl" className="mx-auto mb-6 w-24 h-24 text-3xl" />
        {editing ? (
          <div className="flex flex-col sm:flex-row gap-4 mb-6 max-w-sm mx-auto">
            <Input value={name} onChange={(e) => setName(e.target.value)} id="profile-name" className="flex-1" />
            <Button onClick={handleSave} className="h-[52px] px-8">Save</Button>
          </div>
        ) : (
          <h2 className="text-3xl font-bold font-manrope text-primary mb-2 tracking-tight">{user?.name}</h2>
        )}
        <p className="text-base text-on-surface-variant font-inter mb-6">{user?.email}</p>
        {!editing && (
          <Button variant="ghost" className="mt-2 h-12 px-6 rounded-full" onClick={() => setEditing(true)}>
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

      <Button variant="danger" className="w-full h-14 text-base font-bold shadow-lg shadow-error/20 transition-all hover:shadow-error/40" onClick={logout}>
        <HiLogout size={22} className="mr-2" /> Terminate Session
      </Button>
    </div>
  );
};

export default Profile;
