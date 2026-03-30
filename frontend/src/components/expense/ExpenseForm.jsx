import { useState } from 'react';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import { EXPENSE_CATEGORIES } from '../../utils/constants.js';
import { HiCurrencyRupee, HiPencil, HiCalendar } from 'react-icons/hi';

const ExpenseForm = ({ members = [], onSubmit, loading = false }) => {
  const [form, setForm] = useState({
    title: '',
    amount: '',
    paidBy: '',
    category: 'Other',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      amount: parseFloat(form.amount),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 lg:gap-8">
      <Input
        label="Expense Title"
        name="title"
        value={form.title}
        onChange={handleChange}
        placeholder="e.g., Dinner at restaurant"
        icon={HiPencil}
        required
      />

      <Input
        label="Amount"
        name="amount"
        type="number"
        step="0.01"
        min="0.01"
        value={form.amount}
        onChange={handleChange}
        placeholder="0.00"
        icon={HiCurrencyRupee}
        required
      />

      <div className="w-full">
        <label className="block text-sm font-medium text-on-surface-variant mb-2 font-inter mt-2">
          Paid By
        </label>
        <select
          name="paidBy"
          value={form.paidBy}
          onChange={handleChange}
          className="input-field appearance-none cursor-pointer h-[52px]"
          required
        >
          <option value="">Select payer</option>
          {members.map((member) => (
            <option key={member.user?._id || member._id} value={member.user?._id || member._id}>
              {member.user?.name || member.name}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full">
        <label className="block text-sm font-medium text-on-surface-variant mb-2 font-inter mt-2">
          Category
        </label>
        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          className="input-field appearance-none cursor-pointer h-[52px]"
        >
          {EXPENSE_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="Date"
        name="date"
        type="date"
        value={form.date}
        onChange={handleChange}
        icon={HiCalendar}
      />

      <div className="w-full mt-2">
        <label className="block text-sm font-medium text-on-surface-variant mb-2 font-inter">
          Notes (optional)
        </label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Add a note..."
          rows={3}
          className="input-field resize-none py-3"
        />
      </div>

      {/* Split preview */}
      {form.amount && members.length > 0 && (
        <div className="elevated-card mt-2">
          <p className="text-xs font-semibold text-on-surface-variant mb-2 uppercase tracking-widest font-inter">
            Equal Split Preview
          </p>
          <div className="flex items-end gap-2">
            <p className="text-sm text-on-surface font-inter mb-1">Each person pays</p>
            <span className="text-3xl font-bold text-primary font-manrope tracking-tight leading-none">
              ₹{(parseFloat(form.amount) / members.length).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      <Button type="submit" loading={loading} className="w-full mt-6 h-14 text-base">
        Add Expense
      </Button>
    </form>
  );
};

export default ExpenseForm;
