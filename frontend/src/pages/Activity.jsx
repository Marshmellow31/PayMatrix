import { motion } from "framer-motion";
import { Layout } from "../components/layout/Layout";
import { Card } from "../components/common";
import { 
  Users, 
  ArrowUpRight, 
  ArrowDownLeft, 
  UserPlus, 
  MoreHorizontal,
  CircleDollarSign,
  Briefcase
} from "lucide-react";

export const Activity = () => {
  const activities = [
    { type: "expense", title: "Yash S added 'Dinner at Bistro'", group: "Apartment 4B", date: "2 hours ago", amount: "-₹850", icon: <ArrowDownLeft className="text-error" size={18} /> },
    { type: "settlement", title: "You settled with Aman R", group: "Europe Trip 2024", date: "Yesterday, 11:20 PM", amount: "₹4,500", icon: <CircleDollarSign className="text-primary" size={18} /> },
    { type: "member", title: "Priya K joined 'Weekend Trip'", group: "Shared Expenses", date: "Mar 27, 2:15 PM", icon: <UserPlus className="text-secondary" size={18} /> },
    { type: "expense", title: "You added 'Mountain Villa Airbnb'", group: "Europe Trip 2024", date: "Mar 26, 8:30 PM", amount: "+₹45,000", icon: <ArrowUpRight className="text-primary" size={18} /> },
  ];

  return (
    <Layout>
      <div className="space-y-12">
        {/* Header (Asymmetric) */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-12">
          <div className="space-y-2">
            <span className="text-[10px] text-on-surface-variant uppercase tracking-[0.4em] font-medium opacity-50 block">
              Obsidian Ledger
            </span>
            <h1 className="text-5xl font-manrope font-extrabold text-primary tracking-tighter">
                Global Activity
            </h1>
          </div>
          <div className="flex gap-2">
            <button className="px-5 py-2 glass-panel rounded-full text-[10px] uppercase font-bold tracking-widest text-primary border border-on-surface-variant/10">
                Filter
            </button>
            <button className="p-2 glass-panel rounded-full text-on-surface-variant border border-on-surface-variant/5">
                <MoreHorizontal size={18} />
            </button>
          </div>
        </header>

        {/* Timeline View */}
        <section className="relative space-y-6">
            {/* Timeline Vertical Line (Minimalist) */}
            <div className="absolute left-6 top-0 bottom-0 w-[0.5px] bg-gradient-to-b from-primary/20 via-primary/5 to-transparent hidden md:block" />

            {activities.map((activity, i) => (
                <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="relative md:pl-16 group"
                >
                    {/* Timeline Node */}
                    <div className="absolute left-[22px] top-6 w-1 h-1 bg-primary rounded-full hidden md:block ring-4 ring-background group-hover:scale-150 transition-transform" />

                    <Card className="bg-surface-container-low/40 border-none transition-all group-hover:bg-surface-container-high/60" hover>
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-surface-container-lowest rounded-xl flex items-center justify-center">
                                {activity.icon}
                            </div>
                            
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-primary">
                                    {activity.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest italic">
                                        {activity.group}
                                    </span>
                                    <span className="text-[10px] text-on-surface-variant/20">•</span>
                                    <span className="text-[10px] text-on-surface-variant/60 font-medium">
                                        {activity.date}
                                    </span>
                                </div>
                            </div>

                            {activity.amount && (
                                <div className="text-right">
                                    <p className={`text-sm font-bold ${activity.amount.startsWith('+') ? "text-primary" : "text-error"}`}>
                                        {activity.amount}
                                    </p>
                                    <p className="text-[10px] uppercase font-bold text-on-surface-variant/30 tracking-widest leading-none">
                                        Impact
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>
                </motion.div>
            ))}

            {/* End of Stream Placeholder */}
            <div className="pt-8 text-center">
                <span className="text-[10px] text-on-surface-variant/20 uppercase tracking-[0.4em] font-medium leading-loose font-mono">
                    End of Ledger // Total Synced 
                </span>
            </div>
        </section>
      </div>
    </Layout>
  );
};
