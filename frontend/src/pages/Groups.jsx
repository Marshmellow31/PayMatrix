import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { HiPlus } from 'react-icons/hi';
import { fetchGroups, createGroup } from '../redux/groupSlice.js';
import GroupCard from '../components/group/GroupCard.jsx';
import Modal from '../components/common/Modal.jsx';
import Input from '../components/common/Input.jsx';
import Button from '../components/common/Button.jsx';
import Loader from '../components/common/Loader.jsx';
import { GROUP_CATEGORIES } from '../utils/constants.js';
import toast from 'react-hot-toast';

const Groups = () => {
  const dispatch = useDispatch();
  const { groups, loading } = useSelector((state) => state.groups);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'Other' });

  useEffect(() => { dispatch(fetchGroups()); }, [dispatch]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const result = await dispatch(createGroup(form));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Group created!');
      setShowModal(false);
      setForm({ title: '', category: 'Other' });
    } else {
      toast.error(result.payload || 'Failed to create group');
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-manrope text-primary">Groups</h1>
          <p className="text-sm text-on-surface-variant mt-1">{groups.length} group{groups.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <HiPlus size={18} /> New Group
        </Button>
      </div>

      {loading ? (
        <Loader className="py-20" />
      ) : groups.length === 0 ? (
        <div className="elevated-card text-center py-16">
          <p className="text-5xl mb-4">👥</p>
          <h3 className="text-lg font-semibold font-manrope text-on-surface mb-2">No groups yet</h3>
          <p className="text-sm text-on-surface-variant mb-6">Create your first group to start splitting expenses</p>
          <Button onClick={() => setShowModal(true)}>Create Group</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <GroupCard key={group._id} group={group} />
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Group">
        <form onSubmit={handleCreate} className="flex flex-col gap-5">
          <Input label="Group Name" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Goa Trip 2026" required id="group-title" />
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field appearance-none cursor-pointer">
              {GROUP_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <Button type="submit" className="w-full">Create Group</Button>
        </form>
      </Modal>
    </div>
  );
};

export default Groups;
