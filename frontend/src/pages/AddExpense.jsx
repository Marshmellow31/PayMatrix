import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { addExpense, reset } from "../redux/slices/expenseSlice";
import { getGroups } from "../redux/slices/groupSlice";
import { Layout } from "../components/layout/Layout";
import { Card, Button, Input } from "../components/common";
import { 
  X, 
  Calendar
} from "lucide-react";

export const AddExpense = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    group: "",
    category: "Other",
  });

  const { groups } = useSelector((state) => state.groups);
  const { isSuccess, isLoading } = useSelector((state) => state.expenses);

  useEffect(() => {
    dispatch(getGroups());
  }, [dispatch]);

  useEffect(() => {
    if (isSuccess) {
      dispatch(reset());
      navigate("/dashboard");
    }
  }, [isSuccess, navigate, dispatch]);

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = (e) => {
    e.preventDefault();
    
    const selectedGroup = groups.find(g => g._id === formData.group);
    if (!selectedGroup) return alert("Please select a group");

    // Default equal split
    const splitAmount = parseFloat(formData.amount) / selectedGroup.members.length;
    const split = selectedGroup.members.map(member => ({
      user: member._id || member,
      amount: splitAmount
    }));

    dispatch(addExpense({
      ...formData,
      amount: parseFloat(formData.amount),
      split
    }));
  };

  return (
    <Layout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl mx-auto space-y-12 pb-24"
      >
        <form onSubmit={onSubmit} className="space-y-12">
            {/* Header */}
            <div className="flex justify-between items-center bg-surface-container-low/40 p-4 rounded-full border border-on-surface-variant/5">
                <h1 className="text-sm font-bold uppercase tracking-[0.2em] text-on-surface-variant ml-4">
                    New Transaction
                </h1>
                <button 
                    type="button"
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 bg-surface-container-high rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-all"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Amount Input */}
            <section className="text-center space-y-6">
                <div className="inline-flex items-center gap-3">
                    <span className="text-4xl text-on-surface-variant/20 font-manrope font-extrabold italic">₹</span>
                    <input 
                        autoFocus
                        name="amount"
                        value={formData.amount}
                        onChange={onChange}
                        placeholder="0.00"
                        required
                        className="bg-transparent border-none text-7xl font-manrope font-extrabold text-primary w-full max-w-[300px] text-center outline-none placeholder:text-surface-container-highest/20"
                    />
                </div>
                <div className="mx-auto w-4/5">
                    <input 
                        name="title"
                        value={formData.title}
                        onChange={onChange}
                        placeholder="What was this for?"
                        required
                        className="bg-transparent border-none text-xl text-on-surface-variant/60 font-medium text-center w-full outline-none placeholder:text-on-surface-variant/20"
                    />
                </div>
            </section>

            {/* Config Card */}
            <Card className="glass-panel space-y-10 p-8 shadow-2xl">
                {/* Group Selector */}
                <div className="space-y-3">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant/40 ml-1">Asset Allocation (Group)</label>
                    <select 
                        name="group"
                        value={formData.group}
                        onChange={onChange}
                        required
                        className="w-full bg-surface-container-lowest border-none rounded-lg px-4 py-4 text-on-background outline-none appearance-none cursor-pointer focus:ring-1 focus:ring-primary/20 transition-all font-medium"
                    >
                        <option value="">Select Target Group...</option>
                        {groups.map(g => (
                            <option key={g._id} value={g._id}>{g.name}</option>
                        ))}
                    </select>
                </div>

                {/* Categorization */}
                <div className="space-y-3">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant/40 ml-1">Spending Cluster</label>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                        {["Stay", "Travel", "Food", "Leisure", "Other"].map((cat) => (
                            <button 
                                key={cat}
                                type="button"
                                onClick={() => setFormData({ ...formData, category: cat })}
                                className={`px-5 py-2 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                                    formData.category === cat 
                                    ? "bg-primary text-background border-primary" 
                                    : "bg-transparent border-on-surface-variant/10 text-on-surface-variant/60 hover:text-primary hover:border-primary/20"
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-6 border-t border-on-surface-variant/5">
                    <Button type="submit" className="w-full text-lg h-16 rounded-2xl shadow-xl" disabled={isLoading}>
                        {isLoading ? "Synchronizing..." : "Commit Transaction"}
                    </Button>
                    <p className="text-[10px] text-center mt-6 text-on-surface-variant/30 uppercase tracking-[0.3em] font-medium font-mono">
                        Pipeline Security Integrity: High
                    </p>
                </div>
            </Card>
        </form>
      </motion.div>
    </Layout>
  );
};
