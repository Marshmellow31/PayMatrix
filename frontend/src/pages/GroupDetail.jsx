import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, Link } from "react-router-dom";
import { getGroupExpenses, reset as resetExpenses } from "../redux/slices/expenseSlice";
import { getGroups, setActiveGroup } from "../redux/slices/groupSlice";
import { Layout } from "../components/layout/Layout";
import { Card, Button } from "../components/common";
import { 
  ArrowLeft, 
  Users, 
  Plus, 
  MoreHorizontal,
  ChevronRight,
  Receipt
} from "lucide-react";

export const GroupDetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  
  const { groups, activeGroup } = useSelector((state) => state.groups);
  const { groupExpenses } = useSelector((state) => state.expenses);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (groups.length === 0) {
      dispatch(getGroups());
    }
    dispatch(getGroupExpenses(id));
    
    const foundGroup = groups.find(g => g._id === id);
    if (foundGroup) {
      dispatch(setActiveGroup(foundGroup));
    }

    return () => {
      dispatch(resetExpenses());
    };
  }, [id, dispatch, groups]);

  if (!activeGroup) return <div className="text-center p-20 uppercase tracking-widest text-on-surface-variant opacity-20">Initializing Pipeline...</div>;

  return (
    <Layout>
      <div className="space-y-10">
        {/* Back Button and Actions */}
        <div className="flex justify-between items-center bg-surface-container-low/40 p-2 rounded-full border border-on-surface-variant/5">
          <Link to="/groups" className="p-3 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2 px-6">
              <span className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant/40">Invite:</span>
              <span className="text-xs font-mono font-bold text-primary">{activeGroup.inviteCode}</span>
          </div>
          <button className="p-3 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant">
            <MoreHorizontal size={20} />
          </button>
        </div>

        {/* Group Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 pt-6">
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-primary/10 rounded-full text-[10px] uppercase font-bold tracking-widest text-primary">
                        {activeGroup.category} pipeline
                    </span>
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold opacity-30">
                        {activeGroup.members?.length} Active Nodes
                    </span>
                </div>
                <h1 className="text-5xl md:text-7xl font-manrope font-extrabold text-primary max-w-2xl leading-tight tracking-tighter">
                    {activeGroup.name}
                </h1>
            </div>

            <Card className="glass-panel ghost-border p-8 min-w-[280px] text-right shadow-2xl">
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold opacity-40">
                    Net Exposure
                </p>
                <form className="mt-2 text-3xl font-manrope font-bold text-primary">
                    ₹0.00
                </form>
                <div className="mt-6">
                    <Button variant="secondary" className="px-6 py-2 text-[10px] uppercase tracking-widest leading-none bg-primary text-background border-none hover:bg-primary/80">
                        Settle All
                    </Button>
                </div>
            </Card>
        </header>

        {/* Expenses List */}
        <section className="space-y-6">
            <div className="flex justify-between items-center px-1">
                <h3 className="text-sm tracking-[0.2em] font-medium uppercase text-on-surface-variant flex items-center gap-2">
                    <Receipt size={16} className="opacity-40" /> Ledger Stream
                </h3>
            </div>

            <div className="space-y-4">
                {groupExpenses.length > 0 ? (
                    groupExpenses.map((expense, i) => (
                        <Card key={expense._id} className="group transition-all hover:bg-surface-container-high/80" hover>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 bg-surface-container-highest rounded-xl flex items-center justify-center text-primary/40 group-hover:text-primary transition-colors shadow-lg">
                                        <Receipt size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-primary group-hover:translate-x-1 transition-transform inline-block">
                                            {expense.title}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] uppercase font-bold text-on-surface-variant/40 tracking-widest">
                                                {expense.category}
                                            </span>
                                            <span className="text-[10px] text-on-surface-variant opacity-20">•</span>
                                            <span className="text-[10px] text-on-surface-variant/60">
                                                Paid by {expense.paidBy?.name || "Member"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-primary">₹{expense.amount.toFixed(2)}</p>
                                        <p className="text-[10px] text-on-surface-variant opacity-40 uppercase tracking-widest font-mono">
                                            {new Date(expense.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <ChevronRight className="text-on-surface-variant/20 group-hover:text-primary transition-colors" size={20} />
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-20 opacity-20 uppercase tracking-widest text-[10px] bg-surface-container-low/20 rounded-2xl border border-dashed border-on-surface-variant/10">
                        No transactions recorded in this pipe.
                    </div>
                )}
            </div>
        </section>

        {/* Member Balances */}
        <section className="space-y-6">
            <h3 className="text-sm tracking-[0.2em] font-medium uppercase text-on-surface-variant">
                Node Network
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                 {activeGroup.members?.map((m, idx) => (
                    <Card key={idx} className="bg-surface-container-lowest border-none text-center p-6 group" hover>
                        <div className="w-12 h-12 bg-surface-container-highest rounded-full mx-auto mb-4 border border-on-surface-variant/5 shadow-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-background transition-all">
                            {m.name?.charAt(0)}
                        </div>
                        <p className="text-[11px] font-bold text-primary uppercase tracking-widest">{m.name}</p>
                        <p className="text-[10px] text-on-surface-variant/40 mt-1 uppercase tracking-tighter">Status: Passive</p>
                    </Card>
                 ))}
                 <button className="flex flex-col items-center justify-center border border-dashed border-on-surface-variant/20 rounded-lg p-6 group hover:border-primary/20 transition-all bg-surface-container-low/20">
                    <Plus className="text-on-surface-variant/40 group-hover:text-primary transition-colors" size={20} />
                    <span className="text-[10px] font-bold text-on-surface-variant/40 group-hover:text-primary mt-3 uppercase tracking-widest">Link Node</span>
                 </button>
            </div>
        </section>
      </div>
    </Layout>
  );
};
