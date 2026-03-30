import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
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
          const myBal = g.balancesData.find(b => b.user?._id === user?._id)?.balance || 0;
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
    <div className="max-w-3xl mx-auto animate-fade-in pb-24">
      <div className="flex flex-col mb-12 gap-2">
        <h1 className="text-4xl lg:text-5xl font-bold font-manrope text-primary tracking-[-0.01em]">
          Settlements
        </h1>
        <p className="text-lg text-on-surface-variant font-inter">Manage your balances across all your groups.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="glass-card p-6 border-b-4 border-green-500/50">
          <p className="text-sm font-semibold text-on-surface-variant uppercase tracking-widest mb-2">You are owed</p>
          <p className="text-3xl font-black font-manrope text-green-400 tracking-tight">{formatCurrency(totalOwedUrl)}</p>
        </div>
        <div className="glass-card p-6 border-b-4 border-red-500/50">
          <p className="text-sm font-semibold text-on-surface-variant uppercase tracking-widest mb-2">You owe</p>
          <p className="text-3xl font-black font-manrope text-red-400 tracking-tight">{formatCurrency(totalOweUrl)}</p>
        </div>
      </div>

      <h3 className="text-lg font-bold font-manrope text-primary tracking-tight mb-4">Groups with outstanding balances</h3>

      {groupsWithBalances.length === 0 ? (
        <div className="submerged text-center py-20 px-6 border-none">
          <h3 className="text-2xl font-bold font-manrope text-primary mb-3">All Settled Up!</h3>
          <p className="text-base text-on-surface-variant max-w-sm mx-auto font-inter">You have no outstanding balances in any of your groups.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groupsWithBalances.map(group => (
            <Link 
              key={group._id} 
              to={`/groups/${group._id}`}
              className="p-5 rounded-3xl bg-surface-container hover:bg-surface-container-high transition-all duration-300 flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center font-bold text-primary font-manrope text-lg">
                  {group.title.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-lg font-bold text-on-surface font-manrope">{group.title}</p>
                  <p className="text-sm text-on-surface-variant mt-1 font-inter">
                    {group.myBalance > 0 ? 'They owe you' : 'You owe them'}
                  </p>
                </div>
              </div>
              <p className={`text-xl font-bold font-manrope ${group.myBalance > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {group.myBalance > 0 ? '+' : '-'}{formatCurrency(Math.abs(group.myBalance))}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlobalSettlements;
