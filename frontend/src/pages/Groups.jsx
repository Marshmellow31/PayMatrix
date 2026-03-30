import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
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
  const location = useLocation();
  const navigate = useNavigate();
  const { openAddExpense } = useOutletContext();
  const { groups, loading } = useSelector((state) => state.groups);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'Other' });

  useEffect(() => { 
    dispatch(fetchGroups()); 
    
    // Check if we should open the modal (from nav links)
    const params = new URLSearchParams(location.search);
    if (params.get('add') === 'true') {
      setShowModal(true);
    }
  }, [dispatch, location.search]);

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
    <div className="max-w-3xl mx-auto animate-fade-in pb-32 px-6">
      <div className="mb-10 pt-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-headline text-3xl font-bold text-white tracking-tight">
            Groups
          </h1>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all"
          >
            <LucideIcons.Plus size={16} />
            <span className="text-[10px] uppercase tracking-widest font-bold">New Cohort</span>
          </button>
        </div>
        <p className="text-on-surface-variant text-sm tracking-wide font-inter opacity-70">
          Manage shared expenses and collective balances
        </p>
      </div>

      {loading ? (
        <Loader className="py-20" />
      ) : groups.length === 0 ? (
        <div className="submerged text-center py-20 px-8 border-none rounded-3xl">
          <div className="w-16 h-16 bg-surface-container-high rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Plus size={32} className="text-on-surface-variant opacity-50" />
          </div>
          <h3 className="text-2xl font-bold font-manrope text-white mb-3 tracking-tight">Your Network is Empty</h3>
          <p className="text-base text-on-surface-variant mb-10 max-w-xs mx-auto font-inter leading-relaxed opacity-70">
            Create your first group to establish a shared expense ledger and start managing finances with clarity.
          </p>
          <Button onClick={() => setShowModal(true)} className="h-12 px-8 rounded-xl bg-primary text-on-primary font-bold">
            Establish Group
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <GroupCard key={group._id} group={group} />
          ))}
        </div>
      )}

      {/* Floating Action Button - Now for Add Expense */}
      <div className="fixed bottom-28 right-6 z-40 lg:right-[calc(50%-22rem)]">
        <button 
          onClick={() => openAddExpense()}
          className="h-14 w-14 rounded-full bg-primary text-on-primary shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-200"
        >
          <LucideIcons.Plus size={24} />
        </button>
      </div>


      {/* Create Group Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Establish Group">
        <form onSubmit={handleCreate} className="flex flex-col gap-10">
          <div className="text-center py-4">
            <p className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-4 opacity-60">Cohort Identity</p>
            <input 
              className="bg-transparent border-none text-center font-headline text-3xl font-bold text-white focus:ring-0 placeholder:text-neutral-700 w-full tracking-tighter sm:text-4xl" 
              placeholder="Name your group" 
              value={form.title} 
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-6 font-label text-center opacity-60">Category focus</label>
            <div className="flex gap-3 overflow-x-auto no-scrollbar justify-start sm:justify-center px-2">
              {GROUP_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat.value })}
                  className={`flex-shrink-0 px-6 py-3 rounded-full border transition-all text-[11px] font-bold flex items-center gap-2.5 ${
                    form.category === cat.value 
                      ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                      : 'bg-neutral-800/50 border-white/5 text-neutral-400 hover:bg-neutral-700/50 hover:text-white'
                  }`}
                >
                  {(() => {
                    const IconComp = LucideIcons[cat.icon] || LucideIcons.Hash;
                    return <IconComp size={14} />;
                  })()}
                  <span className="uppercase tracking-wider">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-16 rounded-full font-headline font-bold text-lg bg-white text-black hover:bg-neutral-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl"
          >
            <LucideIcons.PlusCircle size={20} />
            Initialize Cohort
          </Button>
        </form>
      </Modal>
    </div>
  );
};

export default Groups;
