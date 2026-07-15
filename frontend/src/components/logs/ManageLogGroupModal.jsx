import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal.jsx';
import Input from '../common/Input.jsx';
import Button from '../common/Button.jsx';
import Avatar from '../common/Avatar.jsx';
import friendService from '../../services/friendService.js';
import logService from '../../services/logService.js';

const ManageLogGroupModal = ({ isOpen, onClose, group, currentUid, onChanged }) => {
  const navigate = useNavigate();
  const isOwner = group?.ownerId === currentUid;

  const [name, setName] = useState('');
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [friends, setFriends] = useState([]);
  const [addSelection, setAddSelection] = useState(new Set());
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen || !group) return;
    setName(group.name || '');
    setShowAddMembers(false);
    setAddSelection(new Set());
    setShowDeleteConfirm(false);
    setLoadingMembers(true);

    const memberIds = group.members || [];
    friendService
      .getFriends()
      .then((res) => {
        const friendDocs = res.data.data.friends || [];
        setFriends(friendDocs);
        const friendMap = new Map(friendDocs.map((f) => [f._id, f]));
        const resolved = memberIds.map((uid) => {
          if (uid === currentUid) return { _id: uid, name: 'You', isSelf: true };
          return friendMap.get(uid) || { _id: uid, name: 'Member' };
        });
        setMembers(resolved);
      })
      .catch(() => setMembers(memberIds.map((uid) => ({ _id: uid, name: 'Member' }))))
      .finally(() => setLoadingMembers(false));
  }, [isOpen, group, currentUid]);

  const handleRename = async () => {
    if (!name.trim() || name.trim() === group.name) return;
    setSaving(true);
    try {
      await logService.renameLogGroup(group._id, name);
      toast.success('Group renamed');
      onChanged?.();
    } catch (err) {
      toast.error(err.message || 'Failed to rename group');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (uid) => {
    setSaving(true);
    try {
      await logService.removeMember(group._id, uid);
      toast.success('Member removed');
      setMembers((prev) => prev.filter((m) => m._id !== uid));
      onChanged?.();
    } catch (err) {
      toast.error(err.message || 'Failed to remove member');
    } finally {
      setSaving(false);
    }
  };

  const toggleAddSelection = (friendId) => {
    setAddSelection((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  };

  const handleAddMembers = async () => {
    if (addSelection.size === 0) return;
    setSaving(true);
    try {
      await logService.addMembers(group._id, Array.from(addSelection));
      toast.success('Members added');
      setShowAddMembers(false);
      setAddSelection(new Set());
      onChanged?.();
    } catch (err) {
      toast.error(err.message || 'Failed to add members');
    } finally {
      setSaving(false);
    }
  };

  const handleLeave = async () => {
    setSaving(true);
    try {
      await logService.leaveLogGroup(group._id);
      toast.success('Left group');
      onClose();
      navigate('/logs');
    } catch (err) {
      toast.error(err.message || 'Failed to leave group');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await logService.deleteLogGroup(group._id);
      toast.success('Group deleted');
      onClose();
      navigate('/logs');
    } catch (err) {
      toast.error(err.message || 'Failed to delete group');
    } finally {
      setSaving(false);
    }
  };

  if (!group) return null;

  const memberIds = new Set((group.members || []));
  const addableFriends = friends.filter((f) => !memberIds.has(f._id));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Group">
      <div className="space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-on-surface-variant font-inter">
            Group Name
          </label>
          {isOwner ? (
            <div className="flex gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
              <Button
                variant="secondary"
                onClick={handleRename}
                disabled={saving || !name.trim() || name.trim() === group.name}
                className="shrink-0"
              >
                Save
              </Button>
            </div>
          ) : (
            <p className="text-base font-bold text-white font-manrope">{group.name}</p>
          )}
        </div>

        {/* Members */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-on-surface-variant font-inter">
              Members ({members.length})
            </label>
            {isOwner && addableFriends.length > 0 && (
              <button
                onClick={() => setShowAddMembers((v) => !v)}
                className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1"
              >
                <Plus size={12} /> Add
              </button>
            )}
          </div>

          {loadingMembers ? (
            <div className="py-6 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={member.name} src={member.avatar} size="sm" />
                    <span className="text-sm font-bold text-white font-manrope truncate">
                      {member.name}
                      {member._id === group.ownerId && (
                        <span className="ml-2 text-[8px] font-black text-primary/70 uppercase tracking-widest">
                          Owner
                        </span>
                      )}
                    </span>
                  </div>
                  {isOwner && member._id !== currentUid && (
                    <button
                      onClick={() => handleRemoveMember(member._id)}
                      disabled={saving}
                      className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-red-400 transition-colors shrink-0"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {isOwner && showAddMembers && (
            <div className="pt-2 space-y-2">
              {addableFriends.map((friend) => {
                const isSelected = addSelection.has(friend._id);
                return (
                  <button
                    key={friend._id}
                    type="button"
                    onClick={() => toggleAddSelection(friend._id)}
                    className={`w-full flex items-center justify-between gap-4 p-3 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-white/[0.06] border-white/20'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={friend.name} src={friend.avatar} size="sm" />
                      <span className="text-sm font-bold text-white font-manrope truncate">
                        {friend.name}
                      </span>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 ${
                        isSelected
                          ? 'bg-white text-black border-white'
                          : 'bg-transparent border-white/15 text-transparent'
                      }`}
                    >
                      <Check size={13} strokeWidth={3} />
                    </div>
                  </button>
                );
              })}
              <Button
                onClick={handleAddMembers}
                disabled={saving || addSelection.size === 0}
                className="w-full"
              >
                Add Selected
              </Button>
            </div>
          )}
        </div>

        <div className="h-px bg-white/5" />

        {/* Danger zone */}
        {isOwner ? (
          <div className="space-y-3">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full h-12 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 text-[10px] font-black uppercase tracking-widest text-red-500 transition-all active:scale-95"
              >
                Delete Group
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-white/50 font-inter">
                    This deletes the group and its entries for everyone. This can&apos;t be undone.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={handleDelete}
                    disabled={saving}
                    className="flex-1 bg-red-500 text-white hover:bg-red-600"
                  >
                    Confirm Delete
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={saving}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            <p className="text-[9px] text-white/20 font-inter text-center">
              As owner, you can&apos;t leave — delete the group instead.
            </p>
          </div>
        ) : (
          <button
            onClick={handleLeave}
            disabled={saving}
            className="w-full h-12 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 text-[10px] font-black uppercase tracking-widest text-red-500 transition-all active:scale-95"
          >
            Leave Group
          </button>
        )}
      </div>
    </Modal>
  );
};

export default ManageLogGroupModal;
