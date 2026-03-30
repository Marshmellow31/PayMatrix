import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import expenseService from '../services/expenseService.js';
import Loader from '../components/common/Loader.jsx';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import Modal from '../components/common/Modal.jsx';
import Avatar from '../components/common/Avatar.jsx';
import { formatCurrency } from '../utils/formatCurrency.js';
import toast from 'react-hot-toast';

const Settlements = () => {
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ payee: '', amount: '', notes: '' });
  const [balances, setBalances] = useState([]);

  const loadData = async () => {
    try {
      const [setRes, balRes] = await Promise.all([
        expenseService.getSettlements(id),
        expenseService.getBalances(id),
      ]);
      setSettlements(setRes.data.data.settlements);
      setBalances(balRes.data.data.balances);
    } catch (err) { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  const handleSettle = async (e) => {
    e.preventDefault();
    try {
      await expenseService.createSettlement(id, { ...form, amount: parseFloat(form.amount) });
      toast.success('Settlement recorded!');
      setShowModal(false);
      setForm({ payee: '', amount: '', notes: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  if (loading) return <Loader className="py-20" />;

  const debtors = balances.filter((b) => b.balance < 0);

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl lg:text-5xl font-bold font-manrope text-primary tracking-[-0.01em]">Settlements</h1>
        </div>
        <Button onClick={() => setShowModal(true)} className="h-12 px-6">Record Payment</Button>
      </div>

      {settlements.length === 0 ? (
        <div className="submerged text-center py-24 px-6 border-none">
          <h3 className="text-3xl font-bold font-manrope text-primary mb-4 tracking-tight">Ledger Clear</h3>
          <p className="text-lg text-on-surface-variant max-w-sm mx-auto font-inter leading-relaxed">Recorded payments between members will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {settlements.map((s) => (
            <div key={s._id} className="p-4 pr-6 rounded-full bg-surface-container-lowest hover:bg-surface-container-low transition-all duration-300 flex items-center justify-between group shadow-sm hover:shadow-md border border-outline-variant/5">
              <div className="flex items-center gap-4">
                <Avatar name={s.payer?.name} src={s.payer?.avatar} size="md" className="border-2 border-surface shadow-inner ml-2" />
                <div>
                  <p className="text-base text-on-surface font-inter">
                    <span className="font-semibold text-primary">{s.payer?.name}</span> paid <span className="font-semibold text-primary">{s.payee?.name}</span>
                  </p>
                  <p className="text-xs text-on-surface-variant font-inter uppercase tracking-widest mt-1 opacity-70">{new Date(s.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                </div>
              </div>
              <p className="text-xl font-bold font-manrope text-green-400 tracking-tight">{formatCurrency(s.amount)}</p>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Settlement" size="md">
        <form onSubmit={handleSettle} className="flex flex-col gap-6 mt-4">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2 font-inter">Payee (Paid To)</label>
            <select value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} className="input-field appearance-none cursor-pointer h-[52px]" required>
              <option value="">Select person</option>
              {balances.filter((b) => b.user?._id !== user?._id).map((b) => (
                <option key={b.user?._id} value={b.user?._id}>{b.user?.name}</option>
              ))}
            </select>
          </div>
          <Input label="Amount Confirmed" type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required id="settlement-amount" />
          <Button type="submit" className="w-full h-14 mt-4 text-base">Register Payment</Button>
        </form>
      </Modal>
    </div>
  );
};

export default Settlements;
