import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getUserExpenses } from "../redux/slices/expenseSlice";
import { getGroups } from "../redux/slices/groupSlice";
import { Layout } from "../components/layout/Layout";
import { Card } from "../components/common";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  CircleDollarSign, 
  Receipt,
  Users
} from "lucide-react";

export const Dashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { expenses } = useSelector((state) => state.expenses);
  const { groups } = useSelector((state) => state.groups);

  useEffect(() => {
    dispatch(getUserExpenses());
    dispatch(getGroups());
  }, [dispatch]);

  // Derived metrics from real data
  const userOwed = expenses
    .filter(exp => String(exp.paidBy?._id || exp.paidBy) === user?.id)
    .reduce((acc, exp) => acc + (exp.amount - (exp.split?.find(s => String(s.user?._id || s.user) === user?.id)?.amount || 0)), 0);

  const userOwes = expenses
    .filter(exp => String(exp.paidBy?._id || exp.paidBy) !== user?.id)
    .reduce((acc, exp) => acc + (exp.split?.find(s => String(s.user?._id || s.user) === user?.id)?.amount || 0), 0);

  const netBalance = userOwed - userOwes;

  const accountMetrics = [
    { label: "You are owed", value: `₹${userOwed.toFixed(2)}`, icon: <ArrowUpRight className="text-primary bg-primary/10 rounded-full p-2" size={40} /> },
    { label: "You owe", value: `₹${userOwes.toFixed(2)}`, icon: <ArrowDownLeft className="text-secondary bg-secondary/10 rounded-full p-2" size={40} /> },
  ];

  return (
    <Layout>
      <div className="space-y-12">
        {/* Header Section */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-12">
          <div>
            <span className="text-[10px] text-on-surface-variant uppercase tracking-[0.4em] font-medium opacity-50 block mb-2">
              Net settlement pipeline
            </span>
            <h2 className={`text-5xl md:text-7xl tracking-tighter font-manrope font-extrabold flex items-center gap-4 ${netBalance >= 0 ? "text-primary" : "text-error"}`}>
              <span className="opacity-20">₹</span>{Math.abs(netBalance).toFixed(2)}
              {netBalance < 0 && <span className="text-xl -ml-2">(Pending)</span>}
            </h2>
          </div>
          <div className="text-right hidden md:block">
            <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold opacity-30 block">
              Session Active: {user?.name}
            </span>
            <span className="text-xs font-mono opacity-80">{user?.id?.substring(0, 10)}...</span>
          </div>
        </section>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {accountMetrics.map((metric, i) => (
            <Card key={i} className="glass-panel flex justify-between items-center group transition-all" hover>
              <div className="space-y-1">
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold opacity-60">
                   {metric.label}
                </p>
                <p className="text-2xl font-manrope font-bold text-primary">
                  {metric.value}
                </p>
              </div>
              {metric.icon}
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <section className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm tracking-[0.2em] font-medium uppercase text-on-surface-variant flex items-center gap-2">
              <Receipt size={16} /> Recent Expenses
            </h3>
          </div>

          <div className="space-y-3">
             {expenses.length > 0 ? (
                expenses.slice(0, 5).map((expense, i) => (
                    <Card key={i} className="bg-surface-container-low/40 border-none group transition-all" hover>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-surface-container-high rounded-lg flex items-center justify-center text-primary/40 group-hover:text-primary transition-colors">
                                <Users size={20} />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-primary group-hover:translate-x-1 transition-transform inline-block">
                                    {expense.title}
                                </h4>
                                <p className="text-xs text-on-surface-variant opacity-60">
                                    {new Date(expense.date).toLocaleDateString()} • {expense.group?.name || "Global"}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-primary">₹{expense.amount}</p>
                                <p className="text-[10px] uppercase font-bold text-secondary tracking-widest leading-none">
                                    Total
                                </p>
                            </div>
                        </div>
                    </Card>
                ))
             ) : (
                <Card className="bg-surface-container-lowest border border-dashed border-on-surface-variant/20 p-8 flex flex-col items-center text-center space-y-4">
                    <CircleDollarSign size={48} className="text-on-surface-variant opacity-10" />
                    <div className="max-w-xs space-y-2">
                        <h4 className="text-xs tracking-widest font-bold uppercase text-on-surface-variant opacity-40">
                            No active settlements
                        </h4>
                        <p className="text-[11px] text-on-surface-variant opacity-30 leading-relaxed font-inter">
                            The simplification algorithm is idle. Add expenses to begin minimizing transaction overhead.
                        </p>
                    </div>
                </Card>
             )}
          </div>
        </section>
      </div>
    </Layout>
  );
};
