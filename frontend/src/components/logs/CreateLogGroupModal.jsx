import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal.jsx';
import Input from '../common/Input.jsx';
import Button from '../common/Button.jsx';
import Avatar from '../common/Avatar.jsx';
import friendService from '../../services/friendService.js';
import logService from '../../services/logService.js';

const CreateLogGroupModal = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setSelected(new Set());
    setError('');
    setLoadingFriends(true);
    friendService
      .getFriends()
      .then((res) => setFriends(res.data.data.friends || []))
      .catch(() => setFriends([]))
      .finally(() => setLoadingFriends(false));
  }, [isOpen]);

  const toggle = (friendId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Please enter a group name.');
      return;
    }

    setSaving(true);
    try {
      const res = await logService.createLogGroup(name, Array.from(selected));
      toast.success('Log group created');
      onCreated?.(res.data.data.group);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create group');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Log Group">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Group Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Parents"
          autoFocus
        />

        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-2 font-inter">
            Add Members (optional)
          </label>

          {loadingFriends ? (
            <div className="py-8 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : friends.length === 0 ? (
            <div className="py-6 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
              <p className="text-xs text-white/30 font-inter">
                You have no friends yet — you can add members later.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {friends.map((friend) => {
                const isSelected = selected.has(friend._id);
                return (
                  <button
                    key={friend._id}
                    type="button"
                    onClick={() => toggle(friend._id)}
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
            </div>
          )}
        </div>

        {error && <p className="text-xs text-error font-inter">{error}</p>}

        <Button type="submit" className="w-full" loading={saving} disabled={saving}>
          Create Group
        </Button>
      </form>
    </Modal>
  );
};

export default CreateLogGroupModal;
