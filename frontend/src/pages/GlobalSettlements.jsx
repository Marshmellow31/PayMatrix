import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Wallet, ChevronRight } from 'lucide-react';
import { fetchGroups } from '../redux/groupSlice.js';
import expenseService from '../services/expenseService.js';
import Loader from '../components/common/Loader.jsx';
import { formatCurrency } from '../utils/formatCurrency.js';

const GlobalSettlements = () => {
  const dispatch = useDispatch();
  const { groups, loading: groupsLoading } = useSelector((state) => state.groups);
  const { user } = useSelector((state) => state.auth);

  const [groupBalances, setGroupBalances] = useState([]);
  const [loadingBalances, setLoadingBalances] = useState(true);

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch]);

  useEffect(() => {
    const loadGroupBalances = async () => {
      if (!groups || groups.length === 0) {
        setLoadingBalances(false);
        return;
      }
      try {
        const promises = groups.map(g => expenseService.getBalances(g._id).then(res => ({
          ...g,
          balancesData: res.data.data.balances
        })));
        
        const results = await Promise.all(promises);
        
        const withMyBalances = results.map(g => {
          const balances = g.balancesData || {};
          const myUserIdInGroup = user?._id || user?.uid;
          const myBal = balances[myUserIdInGroup] || 0;
          return { ...g, myBalance: myBal };
        }).filter(g => g.myBalance !== 0);
        
        setGroupBalances(withMyBalances);
      } catch (err) {
        console.error('Failed to load group balances:', err);
      } finally {
        setLoadingBalances(false);
      }
    };

    if (groups.length > 0) {
      loadGroupBalances();
    } else if (!groupsLoading) {
      setLoadingBalances(false);
    }
  }, [groups, user]);

  if (groupsLoading || loadingBalances) return <Loader className="py-20" />;

  const groupsWithBalances = groupBalances;

  const totalOwedUrl = groupsWithBalances.reduce((acc, g) => g.myBalance > 0 ? acc + g.myBalance : acc, 0);
  const totalOweUrl = groupsWithBalances.reduce((acc, g) => g.myBalance < 0 ? acc + Math.abs(g.myBalance) : acc, 0);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto px-4 py-6 pb-28 space-y-6"
    >
      {/* High-Contrast Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between px-1 gap-6 sm:gap-0">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl sm:text-4xl font-black font-manrope text-white tracking-tighter leading-tight italic">
            Settlements
          </h1>
          <p className="text-[10px] sm:text-[12px] text-white/40 font-black uppercase tracking-[0.3em]">
            Global Portfolio Position
          </p>
        </div>
        
        {/* Large Visible Metrics Row */}
        <div className="flex gap-8 sm:gap-6 border-t sm:border-t-0 sm:border-l border-white/5 pt-4 sm:pt-0 sm:pl-6">
          <div className="flex flex-col items-start sm:items-end group">
            <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] group-hover:text-white/40 transition-colors">Net Positive</span>
            <span className="text-2xl font-black font-manrope text-white tracking-tight">
              {formatCurrency(totalOwedUrl)}
            </span>
          </div>
          <div className="flex flex-col items-start sm:items-end border-l sm:border-l-0 border-white/5 pl-8 sm:pl-0">
            <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Net Payable</span>
            <span className="text-2xl font-black font-manrope text-white/40 tracking-tight">
              {formatCurrency(totalOweUrl)}
            </span>
          </div>
        </div>
      </div>

      <div className="h-px bg-white/10 w-full" />

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[11px] font-black font-manrope text-white/30 uppercase tracking-[0.4em]">
            Active Groups
          </h3>
        </div>

        <div className="space-y-2">
          {groupsWithBalances.length === 0 ? (
            <div className="py-20 flex items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
              <p className="text-sm text-white/20 font-medium">No active debts</p>
            </div>
          ) : (
            groupsWithBalances.map((group, idx) => {
              const isPositive = group.myBalance > 0;
              return (
                <motion.div
                  key={group._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Link 
                    to={`/groups/${group._id}`}
                    className="group px-5 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/20 flex items-center justify-between transition-all duration-300 shadow-xl"
                  >
                    <div className="flex items-center gap-5">
                      {/* Logo container - higher contrast icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black font-manrope text-base border
                        ${isPositive 
                          ? 'bg-white text-black border-white' 
                          : 'bg-white/10 text-white/60 border-white/10'
                        }`}
                      >
                        {group.title.substring(0, 1).toUpperCase()}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-base font-black text-white font-manrope truncate max-w-[160px] sm:max-w-none group-hover:text-white">
                          {group.title}
                        </p>
                        <p className={`text-[10px] font-black tracking-[0.2em] ${isPositive ? 'text-white/40' : 'text-white/20'}`}>
                          {isPositive ? 'RECEIVABLE' : 'PAYABLE'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <p className={`text-xl font-black font-manrope ${isPositive ? 'text-white' : 'text-white/60'}`}>
                        {isPositive ? '+' : '-'}{formatCurrency(Math.abs(group.myBalance))}
                      </p>
                      <ChevronRight size={18} className="text-white/10 group-hover:text-white/50 transition-colors" />
                    </div>
                  </Link>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default GlobalSettlements;
