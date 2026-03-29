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
    <div className="max-w-lg mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold font-manrope text-primary mb-8">Profile</h1>

      <div className="glass-card p-8 text-center mb-6">
        <Avatar name={user?.name} src={user?.avatar} size="xl" className="mx-auto mb-4" />
        {editing ? (
          <div className="flex gap-2 mb-4 max-w-xs mx-auto">
            <Input value={name} onChange={(e) => setName(e.target.value)} id="profile-name" />
            <Button onClick={handleSave}>Save</Button>
          </div>
        ) : (
          <h2 className="text-xl font-bold font-manrope text-primary mb-1">{user?.name}</h2>
        )}
        <p className="text-sm text-on-surface-variant">{user?.email}</p>
        {!editing && (
          <Button variant="ghost" className="mt-4" onClick={() => setEditing(true)}>
            Edit Name
          </Button>
        )}
      </div>

      <div className="elevated-card mb-6">
        <h3 className="text-sm font-medium text-on-surface-variant mb-3 uppercase tracking-wider">Preferences</h3>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-on-surface">Currency</span>
          <span className="chip">{user?.preferences?.currency || 'INR'}</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-on-surface">Theme</span>
          <span className="chip capitalize">{user?.preferences?.theme || 'dark'}</span>
        </div>
      </div>

      <Button variant="danger" className="w-full" onClick={logout}>
        <HiLogout size={18} /> Sign Out
      </Button>
    </div>
  );
};

export default Profile;
