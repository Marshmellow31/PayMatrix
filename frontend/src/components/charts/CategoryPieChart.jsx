import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const CategoryPieChart = ({ data }) => {
  const chartData = {
    labels: data.map((item) => item.name),
    datasets: [
      {
        data: data.map((item) => item.value),
        backgroundColor: [
          '#f97316', // Orange (Fire Theme)
          '#00B341', // Emerald
          '#3b82f6', // Bright Blue
          '#a855f7', // Purple
          '#FFFFFF', // White
          '#ec4899', // Pink
          '#eab308', // Yellow
          '#6366f1', // Indigo
          '#14b8a6', // Teal
        ],
        borderColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 2,
        hoverOffset: 15,
      },
    ],
  };

  const options = {
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#e5e2e1',
          font: {
            family: 'Inter',
            size: 12,
          },
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: '#1a1c1c',
        titleColor: '#ffffff',
        bodyColor: '#e5e2e1',
        borderColor: '#333333',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
      },
    },
    cutout: '70%',
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div className="h-64 sm:h-80 w-full flex items-center justify-center">
      <Doughnut data={chartData} options={options} />
    </div>
  );
};

export default CategoryPieChart;
