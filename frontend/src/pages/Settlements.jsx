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
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold font-manrope text-primary">Settlements</h1>
        <Button onClick={() => setShowModal(true)}>Record Payment</Button>
      </div>

      {settlements.length === 0 ? (
        <div className="elevated-card text-center py-12">
          <p className="text-on-surface-variant">No settlements yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {settlements.map((s) => (
            <div key={s._id} className="elevated-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={s.payer?.name} src={s.payer?.avatar} size="sm" />
                <div>
                  <p className="text-sm text-on-surface">
                    <span className="font-medium">{s.payer?.name}</span> paid <span className="font-medium">{s.payee?.name}</span>
                  </p>
                  <p className="text-xs text-on-surface-variant">{new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <p className="text-sm font-bold font-manrope text-green-400">{formatCurrency(s.amount)}</p>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Settlement" size="sm">
        <form onSubmit={handleSettle} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2">Paid To</label>
            <select value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} className="input-field appearance-none cursor-pointer" required>
              <option value="">Select person</option>
              {balances.filter((b) => b.user?._id !== user?._id).map((b) => (
                <option key={b.user?._id} value={b.user?._id}>{b.user?.name}</option>
              ))}
            </select>
          </div>
          <Input label="Amount" type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required id="settlement-amount" />
          <Button type="submit" className="w-full">Record Payment</Button>
        </form>
      </Modal>
    </div>
  );
};

export default Settlements;
