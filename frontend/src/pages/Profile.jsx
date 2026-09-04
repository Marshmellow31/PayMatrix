import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase.js';
import useAuth from '../hooks/useAuth.js';
import Avatar from '../components/common/Avatar.jsx';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import Modal from '../components/common/Modal.jsx';
import PaymentSettingsCard from '../components/profile/PaymentSettingsCard.jsx';
import SystemSettingsCard from '../components/profile/SystemSettingsCard.jsx';
import ChangelogModal from '../components/profile/ChangelogModal.jsx';
import { Mail, CheckCircle2, X, AlertTriangle, UserX, LockKeyhole } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import { exportToPDF } from '../utils/exportUtils.js';
import { hasPaymentMethod } from '../utils/upiUtils.js';
import friendService from '../services/friendService.js';
import groupService from '../services/groupService.js';
import Loader from '../components/common/Loader.jsx';
import authService from '../services/authService.js';

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, logout, updateProfile } = useAuth();
  const [targetUser, setTargetUser] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const isOnline = useOnlineStatus();

  const [showPaymentWarningBanner, setShowPaymentWarningBanner] = useState(true);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const isOwnProfile = !id || id === currentUser?._id || id === currentUser?.uid;

  useEffect(() => {
    const fetchTargetUser = async () => {
      if (isOwnProfile) {
        setTargetUser(currentUser);
        setName(currentUser?.name || '');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const docRef = doc(db, 'publicProfiles', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTargetUser({ _id: docSnap.id, ...docSnap.data() });
        } else {
          toast.error('User not found');
          navigate('/friends');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchTargetUser();
  }, [id, currentUser, isOwnProfile, navigate]);

  const handleSaveName = async () => {
    if (!name.trim()) return;
    try {
      const result = await updateProfile({ name: name.trim() });
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('Profile name updated');
        setEditing(false);
      } else {
        toast.error(result.payload || 'Update failed');
      }
    } catch {
      toast.error('An unexpected error occurred');
    }
  };

  const handleUpdateUPI = async (newUpiId) => {
    const result = await updateProfile({ upiId: newUpiId });
    if (result.meta.requestStatus !== 'fulfilled') {
      throw new Error(result.payload || 'Update failed');
    }
  };

  const handleRemoveFriend = async () => {
    if (!id) return;
    setIsRemoving(true);
    try {
      await friendService.removeFriend(id);
      toast.success('Connection removed');
      navigate('/friends');
    } catch (err) {
      console.error('Removal failed:', err);
      toast.error('Failed to remove friend');
    } finally {
      setIsRemoving(false);
      setShowRemoveConfirm(false);
    }
  };

  const handleExportData = async () => {
    toast.loading('Generating ledger export...', { id: 'export' });
    try {
      const groupsRes = await groupService.getGroups();
      const groups = groupsRes.data.data.groups || [];
      exportToPDF({ groups, user: currentUser });
      toast.success('Export downloaded!', { id: 'export' });
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to generate export', { id: 'export' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  const displayUser = isOwnProfile ? currentUser : targetUser;
  const userHasPayment = hasPaymentMethod(displayUser);
  const canAddPassword =
    isOwnProfile &&
    auth.currentUser?.email &&
    !auth.currentUser.providerData.some((provider) => provider.providerId === 'password');

  const handleAddPassword = async () => {
    if (newPassword.length < 8) {
      toast.error('Use at least 8 characters.');
      return;
    }
    try {
      await authService.linkEmailPassword(newPassword);
      setNewPassword('');
      setShowAddPassword(false);
      toast.success('Email password added without changing your account or data.');
    } catch (error) {
      toast.error(error.message || 'Could not add email password.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black font-manrope text-white tracking-tight">
          {isOwnProfile ? 'Account & Profile' : 'Member Profile'}
        </h1>
        <p className="text-xs text-white/40 font-inter mt-1">
          {isOwnProfile
            ? 'Manage your personal identity, payment methods, and system preferences.'
            : 'Public ledger details for this connected member.'}
        </p>
      </div>

      {/* Payment Missing Warning (if own profile) */}
      {isOwnProfile && !userHasPayment && showPaymentWarningBanner && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-300 font-inter">
                Missing UPI Payment Method
              </p>
              <p className="text-[11px] text-amber-200/60 font-inter mt-0.5">
                Add your UPI ID below to enable one-tap QR settlements from friends.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPaymentWarningBanner(false)}
            className="text-white/40 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Profile Card */}
      <div className="glass-card p-6 sm:p-8 border border-white/5 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar user={displayUser} size={64} className="border-2 border-white/10" />
            <div className="space-y-1 min-w-0">
              {editing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your display name"
                    className="h-10 text-sm font-bold bg-white/[0.04]"
                    autoFocus
                  />
                  <Button
                    onClick={handleSaveName}
                    disabled={!name.trim()}
                    className="h-10 px-4 text-xs font-bold bg-white text-black"
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setEditing(false)}
                    className="h-10 px-3 text-xs border border-white/10"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-black font-manrope text-white">
                      {displayUser?.name || 'Member'}
                    </h2>
                    {userHasPayment && (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                        <CheckCircle2 size={10} /> UPI Ready
                      </span>
                    )}
                  </div>
                  {displayUser?.email && (
                    <div className="flex items-center gap-2 text-xs text-white/40 font-inter">
                      <Mail size={13} />
                      <span>{displayUser.email}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {isOwnProfile && !editing && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => setEditing(true)}
                className="h-9 px-4 text-xs font-bold border border-white/10"
              >
                Edit Name
              </Button>
              <Button
                variant="ghost"
                onClick={logout}
                className="h-9 px-4 text-xs font-bold text-red-400 border border-red-500/20 hover:bg-red-500/10"
              >
                Logout
              </Button>
            </div>
          )}

          {!isOwnProfile && (
            <Button
              variant="ghost"
              onClick={() => setShowRemoveConfirm(true)}
              className="h-9 px-4 text-xs font-bold text-red-400 border border-red-500/20 hover:bg-red-500/10 flex items-center gap-1.5"
            >
              <UserX size={14} />
              <span>Remove Friend</span>
            </Button>
          )}
        </div>
      </div>

      {canAddPassword && (
        <div className="glass-card border border-white/5 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-300/10 p-2.5 text-emerald-300">
              <LockKeyhole size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-white">Add email sign-in</p>
              <p className="mt-0.5 text-[11px] leading-4 text-white/35">
                Add a password to this same account. Your UID, groups, and balances stay unchanged.
              </p>
            </div>
            {!showAddPassword && (
              <Button
                variant="ghost"
                onClick={() => setShowAddPassword(true)}
                className="h-9 border border-white/10 px-4 text-xs font-bold"
              >
                Add
              </Button>
            )}
          </div>
          {showAddPassword && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="New password · 8+ characters"
                className="h-11 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none focus:border-white/25"
              />
              <Button
                onClick={handleAddPassword}
                className="h-11 bg-white px-5 text-xs font-black text-black"
              >
                Save password
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAddPassword(false);
                  setNewPassword('');
                }}
                className="h-11 border border-white/10 px-4 text-xs"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Payment Settings */}
      <PaymentSettingsCard
        isOwnProfile={isOwnProfile}
        currentUser={currentUser}
        targetUser={targetUser}
        isOnline={isOnline}
        onUpdateUPI={handleUpdateUPI}
      />

      {/* System Preferences */}
      <SystemSettingsCard
        isOwnProfile={isOwnProfile}
        currentUser={currentUser}
        onOpenChangelog={() => setShowChangelog(true)}
        onExportData={handleExportData}
        onDeleteAccount={() => navigate('/delete-account')}
      />

      {/* Changelog Modal */}
      <ChangelogModal isOpen={showChangelog} onClose={() => setShowChangelog(false)} />

      {/* Remove Friend Confirmation Modal */}
      <Modal
        isOpen={showRemoveConfirm}
        onClose={() => setShowRemoveConfirm(false)}
        title="Remove Friend"
      >
        <div className="space-y-4">
          <p className="text-sm text-white/70 font-inter">
            Are you sure you want to remove{' '}
            <strong className="text-white">{targetUser?.name}</strong> from your friends list?
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowRemoveConfirm(false)}
              className="flex-1 border border-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRemoveFriend}
              disabled={isRemoving}
              className="flex-1 bg-red-500 text-white font-bold hover:bg-red-600"
            >
              {isRemoving ? 'Removing...' : 'Confirm Remove'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Profile;
