import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const SpendingTrendChart = ({ data = [] }) => {
  const chartData = {
    labels: (data || []).map((item) => new Date(item._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        fill: true,
        label: 'Spending',
        data: (data || []).map((item) => item.amount),
        borderColor: '#00B31E', // Emerald
        backgroundColor: (context) => {
          const bg = context.chart.ctx.createLinearGradient(0, 0, 0, 400);
          bg.addColorStop(0, 'rgba(0, 179, 30, 0.2)');
          bg.addColorStop(1, 'rgba(0, 179, 30, 0)');
          return bg;
        },
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#00B31E',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#1a1c1c',
        titleColor: '#ffffff',
        bodyColor: '#e5e2e1',
        borderColor: '#333333',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context) => ` ₹${context.parsed.y.toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#e5e2e1',
          autoSkip: true,
          maxTicksLimit: 7,
          font: {
            size: 10,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(229, 226, 225, 0.05)',
        },
        ticks: {
          color: '#e5e2e1',
          font: {
            size: 10,
          },
          callback: (value) => `₹${value.toLocaleString()}`,
        },
      },
    },
  };

  return (
    <div className="h-64 sm:h-80 w-full">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default SpendingTrendChart;
