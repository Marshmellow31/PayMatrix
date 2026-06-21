import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, LayoutGrid, Bell, Shield, Brain,
  TrendingUp, Activity, AlertTriangle,
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import adminService from '../../services/adminService.js';
import Loader from '../../components/common/Loader.jsx';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const fmt = (n) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
};

const StatCard = ({ label, value, icon: Icon, sub, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 0.98 }}
    transition={{ delay, duration: 0.35, ease: 'easeOut' }}
    className="relative overflow-hidden rounded-2xl p-4 sm:p-6 bg-surface-container-low border border-white/5 shadow-xl group cursor-pointer"
  >
    <div className="flex justify-between items-start mb-4">
      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
        <Icon size={14} className="text-on-surface-variant" />
      </div>
      <span className="font-inter text-[8px] sm:text-[10px] font-bold tracking-widest uppercase text-on-surface-variant opacity-60">{label}</span>
    </div>
    <h3 className="font-manrope font-bold text-xl sm:text-2xl font-black text-white leading-none mb-1">
      {value === null ? '—' : fmt(value)}
    </h3>
    {sub && (
      <p className="text-[10px] mt-2 text-on-surface-variant opacity-50 font-inter leading-none">{sub}</p>
    )}
    <div className="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity text-white">
      <Icon size={56} />
    </div>
  </motion.div>
);

const AdminDashboard = () => {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    adminService.getStats()
      .then((res) => setStats(res.data))
      .catch((e) => setError(e.message || 'Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  const signupChartData = stats?.signupTrend ? {
    labels: stats.signupTrend.map((d) => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    }),
    datasets: [{
      data:            stats.signupTrend.map((d) => d.count),
      borderColor:     '#f97316',
      backgroundColor: 'rgba(249,115,22,0.1)',
      fill:            true,
      tension:         0.4,
      pointRadius:     4,
      pointBackgroundColor: '#f97316',
      borderWidth:     2,
    }],
  } : null;

  const chartOptions = {
    responsive:          true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: {
      backgroundColor: '#1a1a1a',
      titleColor:      '#f97316',
      bodyColor:       '#e5e2e1',
      borderColor:     'rgba(249,115,22,0.2)',
      borderWidth:     1,
      padding:         10,
    }},
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 } } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 } }, beginAtZero: true },
    },
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle size={32} className="text-red-400" />
        <p className="text-white/50 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-black font-manrope text-white tracking-tight">Overview</h1>
        <p className="text-sm text-white/40 mt-1">Platform health at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users"  value={stats?.totalUsers}  icon={Users}      sub={`+${stats?.newUsersLast7Days ?? 0} this week`} delay={0} />
        <StatCard label="Total Groups" value={stats?.totalGroups} icon={LayoutGrid}  sub={`${stats?.activeGroups ?? 0} active`}          delay={0.05} />
        <StatCard label="Notifications" value={stats?.recentNotifications} icon={Bell} sub="last 30 days" delay={0.1} />
        <StatCard label="AI Scans"     value={stats?.totalAiRequests} icon={Brain}   sub="total bill scans"                              delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <StatCard label="New Users (7d)"   value={stats?.newUsersLast7Days}    icon={TrendingUp}  delay={0.2} />
        <StatCard label="Security Events"  value={stats?.recentSecurityEvents} icon={Shield}      sub="last 7 days" delay={0.25} />
        <StatCard label="Active Groups"    value={stats?.activeGroups}         icon={Activity}    delay={0.3} />
      </div>

      {/* Signup trend chart */}
      {signupChartData && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="mt-6 rounded-2xl p-5 bg-surface-container-low border border-white/5 shadow-xl"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} style={{ color: '#f97316' }} />
            <p className="text-sm font-bold text-white/80 font-manrope">New Signups — Last 7 Days</p>
          </div>
          <div className="h-52">
            <Line data={signupChartData} options={chartOptions} />
          </div>
        </motion.div>
      )}

      {/* Quick stats row */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Notifications', value: stats?.totalNotifications },
          { label: 'Total Security Logs', value: stats?.totalSecurityEvents },
          { label: 'New Users (30d)',      value: stats?.newUsersLast30Days  },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 + i * 0.05 }}
            className="rounded-xl px-4 py-3 flex items-center justify-between bg-surface-container-low border border-white/5 shadow-sm"
          >
            <span className="text-xs text-white/40">{item.label}</span>
            <span className="text-sm font-bold font-manrope text-white/80">
              {item.value ?? '—'}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
