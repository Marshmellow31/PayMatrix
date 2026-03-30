import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const CategoryPieChart = ({ data }) => {
  const chartData = {
    labels: data.map((item) => item._id),
    datasets: [
      {
        data: data.map((item) => item.amount),
        backgroundColor: [
          '#00B341', // Emerald
          '#FFFFFF', // White
          '#1A1C1C', // Dark
          '#333333', // Grey
          '#006C28', // Dark Green
          '#E5E2E1', // Light Grey
        ],
        borderWidth: 0,
        hoverOffset: 4,
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
