import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

const TrendAreaChart = ({ data }) => {
  const chartData = {
    labels: data.map((item) => {
      try {
        const date = new Date(item.date);
        if (isNaN(date)) return item.date;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } catch (e) {
        return 'Date';
      }
    }),
    datasets: [
      {
        fill: true,
        label: 'Spending',
        data: data.map((item) => item.amount),
        borderColor: '#f97316',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(249, 115, 22, 0)');
          gradient.addColorStop(1, 'rgba(249, 115, 22, 0.3)');
          return gradient;
        },
        borderWidth: 3,
        pointRadius: data.length === 1 ? 6 : 0, // Show point if it's the only one
        pointHoverRadius: 6,
        pointBackgroundColor: '#f97316',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        tension: 0.4,
        spanGaps: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        bottom: 20, // Give space for X-axis labels to breathe
        left: 10,
        right: 20,
        top: 10
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1c1c',
        titleColor: '#ffffff',
        bodyColor: '#e5e2e1',
        borderColor: '#333333',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context) => `₹${Number(context.raw).toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: 'rgba(255, 255, 255, 0.2)',
          font: { family: 'Inter', size: 10, weight: 'bold' },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 7,
          padding: 10, // Push labels away from the line
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.2)',
          font: { family: 'Inter', size: 10 },
          callback: (value) => `₹${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`,
          padding: 8,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  return (
    <div className="h-64 sm:h-80 w-full mt-4">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default TrendAreaChart;
