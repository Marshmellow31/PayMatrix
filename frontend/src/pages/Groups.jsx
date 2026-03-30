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
    <div className="max-w-6xl mx-auto animate-fade-in pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl lg:text-5xl font-bold font-manrope text-primary tracking-[-0.01em]">
            Active Cohorts
          </h1>
          <p className="text-lg text-on-surface-variant mt-2 font-inter">
            {groups.length} active group{groups.length !== 1 ? 's' : ''} in your network
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="h-12 px-6">
          <HiPlus size={20} className="mr-1" /> Establish Group
        </Button>
      </div>

      {loading ? (
        <Loader className="py-20" />
      ) : groups.length === 0 ? (
        <div className="submerged text-center py-24 px-6 border-none">
          <h3 className="text-3xl font-bold font-manrope text-primary mb-4 tracking-tight">Your Network is Empty</h3>
          <p className="text-lg text-on-surface-variant mb-8 max-w-md mx-auto font-inter leading-relaxed">
            Create your first group to establish a shared expense ledger and start managing finances with clarity.
          </p>
          <Button onClick={() => setShowModal(true)} className="h-14 px-8 text-base">
            Establish Group
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {groups.map((group) => (
            <GroupCard key={group._id} group={group} />
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Establish Group">
        <form onSubmit={handleCreate} className="flex flex-col gap-6 lg:gap-8 mt-4">
          <Input label="Cohort Name" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Goa Trip 2026" required id="group-title" />
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2 font-inter mt-2">Category focus</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field appearance-none cursor-pointer h-[52px]">
              {GROUP_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <Button type="submit" className="w-full h-14 mt-4 text-base">Initialize Cohort</Button>
        </form>
      </Modal>
    </div>
  );
};

export default Groups;
