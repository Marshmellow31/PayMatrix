import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, Brain, Bell, Shield, RefreshCw } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import adminService from '../../services/adminService.js';
import Loader from '../../components/common/Loader.jsx';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
);

const ACCENT_COLORS = [
  '#f97316',
  '#3b82f6',
  '#a855f7',
  '#22c55e',
  '#eab308',
  '#14b8a6',
  '#ec4899',
  '#6366f1',
];

const Section = ({ title, icon: Icon, children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.35 }}
    className="rounded-2xl p-5 bg-surface-container-low border border-white/5 shadow-xl"
  >
    <div className="flex items-center gap-2 mb-4">
      <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
        <Icon size={12} className="text-on-surface-variant" />
      </div>
      <h3 className="font-bold text-white/80 font-manrope text-xs uppercase tracking-wider">
        {title}
      </h3>
    </div>
    {children}
  </motion.div>
);

const tooltipDefaults = {
  backgroundColor: '#1a1a1a',
  titleColor: '#ffffff',
  bodyColor: '#e5e2e1',
  borderColor: 'rgba(255,255,255,0.08)',
  borderWidth: 1,
  padding: 12,
};

const AdminAnalytics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminService.getStats();
      setStats(res.data);
    } catch (e) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  // Signup trend bar chart
  const signupBarData = stats?.signupTrend
    ? {
        labels: stats.signupTrend.map((d) =>
          new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
        ),
        datasets: [
          {
            label: 'New signups',
            data: stats.signupTrend.map((d) => d.count),
            backgroundColor: 'rgba(249,115,22,0.7)',
            borderColor: '#f97316',
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      }
    : null;

  // Platform overview donut
  const platformDonutData = {
    labels: ['Total Users', 'Active Groups', 'AI Scans', 'Security Events'],
    datasets: [
      {
        data: [
          stats?.totalUsers || 0,
          stats?.activeGroups || 0,
          stats?.totalAiRequests || 0,
          stats?.totalSecurityEvents || 0,
        ],
        backgroundColor: ACCENT_COLORS.slice(0, 4).map((c) => `${c}70`),
        borderColor: ACCENT_COLORS.slice(0, 4).map((c) => `${c}90`),
        borderWidth: 1.5,
        hoverOffset: 8,
      },
    ],
  };

  // Activity ratio bar
  const activityData = {
    labels: ['New Users (7d)', 'New Users (30d)', 'Recent Notifs', 'Security Events (7d)'],
    datasets: [
      {
        label: 'Count',
        data: [
          stats?.newUsersLast7Days || 0,
          stats?.newUsersLast30Days || 0,
          stats?.recentNotifications || 0,
          stats?.recentSecurityEvents || 0,
        ],
        backgroundColor: [
          'rgba(34,197,94,0.7)',
          'rgba(34,197,94,0.4)',
          'rgba(168,85,247,0.7)',
          'rgba(239,68,68,0.7)',
        ],
        borderRadius: 6,
        borderWidth: 0,
      },
    ],
  };

  const barOptions = (_yLabel) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { ...tooltipDefaults },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10, weight: 'bold' } },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } },
        beginAtZero: true,
        title: { display: false },
      },
    },
  });

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: 'rgba(255,255,255,0.5)',
          font: { size: 10 },
          padding: 16,
          usePointStyle: true,
        },
      },
      tooltip: { ...tooltipDefaults },
    },
  };

  const statRows = [
    { label: 'Total Users', value: stats?.totalUsers, color: '#f97316', icon: Users },
    { label: 'Total Groups', value: stats?.totalGroups, color: '#3b82f6', icon: BarChart3 },
    { label: 'Active Groups', value: stats?.activeGroups, color: '#22c55e', icon: TrendingUp },
    {
      label: 'Total Notifications',
      value: stats?.totalNotifications,
      color: '#a855f7',
      icon: Bell,
    },
    { label: 'Total AI Requests', value: stats?.totalAiRequests, color: '#14b8a6', icon: Brain },
    {
      label: 'Total Security Events',
      value: stats?.totalSecurityEvents,
      color: '#ef4444',
      icon: Shield,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black font-manrope text-white tracking-tight">
            Platform Analytics
          </h1>
          <p className="text-sm text-white/40 mt-0.5">Aggregated platform-wide metrics</p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Stat rows */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 rounded-2xl p-5 bg-surface-container-low border border-white/5 shadow-xl space-y-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
              <BarChart3 size={12} className="text-on-surface-variant" />
            </div>
            <h3 className="font-bold text-white/80 font-manrope text-xs uppercase tracking-wider">
              All-time Totals
            </h3>
          </div>
          <div className="space-y-1">
            {statRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0"
              >
                <div className="flex items-center gap-2">
                  <row.icon size={12} style={{ color: row.color }} />
                  <span className="text-xs text-white/50">{row.label}</span>
                </div>
                <span className="text-sm font-bold font-manrope" style={{ color: row.color }}>
                  {row.value ?? '—'}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Platform donut */}
        <Section title="Platform Breakdown" icon={BarChart3} delay={0.1}>
          <div className="h-56">
            <Doughnut data={platformDonutData} options={donutOptions} />
          </div>
        </Section>

        {/* Activity summary */}
        <Section title="Recent Activity" icon={TrendingUp} delay={0.15}>
          <div className="h-56">
            <Bar data={activityData} options={barOptions()} />
          </div>
        </Section>
      </div>

      {/* Signup trend */}
      {signupBarData && (
        <Section title="Daily Signups — Last 7 Days" icon={Users} delay={0.2}>
          <div className="h-52">
            <Bar data={signupBarData} options={barOptions('Signups')} />
          </div>
        </Section>
      )}
    </div>
  );
};

export default AdminAnalytics;
