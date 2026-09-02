import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import Avatar from '../common/Avatar.jsx';
import Loader from '../common/Loader.jsx';
import { GROUP_CATEGORIES } from '../../utils/constants.js';
import { getLucideIcon } from '../../utils/iconMap.js';
import { AlertCircle, Trash2 } from 'lucide-react';

export const AddMemberModal = ({
  isOpen,
  onClose,
  memberEmail,
  setMemberEmail,
  friends,
  loadingFriends,
  selectedFriend,
  setSelectedFriend,
  onAddMemberByEmail,
  onAddSelectedFriend,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Member to Group">
      <div className="space-y-6">
        {/* Email Invite Form */}
        <form onSubmit={onAddMemberByEmail} className="space-y-4">
          <Input
            label="Invite by Email"
            type="email"
            placeholder="friend@example.com"
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
          />
          <Button
            type="submit"
            disabled={!memberEmail.trim()}
            className="w-full text-xs uppercase font-bold tracking-wider"
          >
            Send Invite Email
          </Button>
        </form>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-surface px-3 text-[10px] font-black tracking-widest text-white/30 uppercase font-inter">
            Or Choose Friend
          </span>
        </div>

        {/* Friends List */}
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {loadingFriends ? (
            <Loader className="py-6" />
          ) : friends.length === 0 ? (
            <p className="text-xs text-white/40 text-center py-4 font-inter">
              No available friends to add. Add friends first on the Friends page.
            </p>
          ) : (
            friends.map((friend) => {
              const isSelected = selectedFriend?._id === friend._id;
              return (
                <div
                  key={friend._id}
                  onClick={() => setSelectedFriend(isSelected ? null : friend)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-primary/40'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar user={friend} size={36} />
                    <div>
                      <p className="text-sm font-bold text-white">{friend.name}</p>
                      <p className="text-xs text-white/40">{friend.email}</p>
                    </div>
                  </div>
                  {isSelected && <span className="text-xs font-bold text-primary">Selected</span>}
                </div>
              );
            })
          )}
        </div>

        {selectedFriend && (
          <Button
            onClick={onAddSelectedFriend}
            className="w-full text-xs uppercase font-bold tracking-wider bg-primary text-black"
          >
            Add {selectedFriend.name} to Group
          </Button>
        )}
      </div>
    </Modal>
  );
};

export const EditGroupModal = ({
  isOpen,
  onClose,
  editName,
  setEditName,
  editCategory,
  setEditCategory,
  onUpdateGroup,
  updatingGroup,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Group Details">
      <form onSubmit={onUpdateGroup} className="space-y-5">
        <Input
          label="Group Name"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="e.g. Trip to Goa"
          required
        />

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/40 font-inter">
            Category
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
            {GROUP_CATEGORIES.map((cat) => {
              const isSelected = editCategory === cat.value;
              const IconComp = getLucideIcon(cat.icon);
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setEditCategory(cat.value)}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                    isSelected
                      ? 'bg-white text-black border-white shadow-lg'
                      : 'bg-white/[0.02] border-white/5 text-white/50 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: isSelected ? '#00000015' : `${cat.color}15`,
                      color: isSelected ? '#000000' : cat.color,
                    }}
                  >
                    {IconComp && <IconComp size={16} />}
                  </div>
                  <span className="text-[10px] font-bold tracking-tight truncate w-full">
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1 border border-white/5">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={updatingGroup || !editName.trim()}
            className="flex-1 bg-white text-black font-bold"
          >
            {updatingGroup ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export const ConfirmLeaveGroupModal = ({ isOpen, onClose, onLeave, leaving, myBalance }) => {
  const hasOutstandingBalance = Math.abs(myBalance) > 0.01;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Leave Group">
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs text-red-300 font-inter leading-relaxed">
            {hasOutstandingBalance ? (
              <p>
                You have an unsettled balance of ₹{Math.abs(myBalance).toFixed(2)}. You must settle
                up with group members before exiting.
              </p>
            ) : (
              <p>
                Are you sure you want to exit this group? You will lose access to shared expenses
                and settlements.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1 border border-white/5">
            Cancel
          </Button>
          <Button
            onClick={onLeave}
            disabled={leaving || hasOutstandingBalance}
            className="flex-1 bg-red-500 text-white font-bold hover:bg-red-600"
          >
            {leaving ? 'Leaving...' : 'Confirm Exit'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export const ConfirmDeleteGroupModal = ({ isOpen, onClose, onDelete, deleting, hasPending }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Group">
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
          <Trash2 size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs text-red-300 font-inter leading-relaxed">
            {hasPending ? (
              <p>
                This group has unsettled debts. All members must settle up before the group can be
                permanently deleted.
              </p>
            ) : (
              <p>
                Are you sure you want to delete this group? All recorded expenses and settlement
                histories will be permanently removed.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1 border border-white/5">
            Cancel
          </Button>
          <Button
            onClick={onDelete}
            disabled={deleting || hasPending}
            className="flex-1 bg-red-500 text-white font-bold hover:bg-red-600"
          >
            {deleting ? 'Deleting...' : 'Delete Group'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
