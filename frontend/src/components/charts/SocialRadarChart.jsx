import React from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const SocialRadarChart = ({ networkData }) => {
  // Take top 3-4 most active friends for the radar
  const topFriends = networkData.slice(0, 3);
  
  // Need to normalize data for the radar to look good
  const maxTurnover = Math.max(...networkData.map(d => d.totalTurnover), 1000);
  const maxBalance = Math.max(...networkData.map(d => Math.abs(d.netBalance)), 500);
  const maxGroups = Math.max(...networkData.map(d => d.mutualGroupsCount), 5);

  const colors = [
    { border: '#f97316', bg: 'rgba(249, 115, 22, 0.2)' }, // Orange
    { border: '#00B341', bg: 'rgba(0, 179, 65, 0.2)' },   // Emerald
    { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)' },  // Blue
  ];

  const chartData = {
    labels: ['Turnover', 'Balance', 'Mutual Groups', 'Activity Frequency', 'Social Weight'],
    datasets: topFriends.map((f, i) => ({
      label: f.friend.name,
      data: [
        (f.totalTurnover / maxTurnover) * 100,
        (Math.abs(f.netBalance) / maxBalance) * 100,
        (f.mutualGroupsCount / maxGroups) * 100,
        75 + (i * 5), // Mocking some frequency for visual balance
        60 + (i * 10), // Mocking social weight
      ],
      backgroundColor: colors[i % colors.length].bg,
      borderColor: colors[i % colors.length].border,
      borderWidth: 2,
      pointBackgroundColor: colors[i % colors.length].border,
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: colors[i % colors.length].border,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#e5e2e1',
          font: { family: 'Inter', size: 10 },
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: '#1a1c1c',
        titleFont: { family: 'Inter', size: 12, weight: 'bold' },
        bodyFont: { family: 'Inter', size: 11 },
        padding: 10,
        boxPadding: 4,
      }
    },
    scales: {
      r: {
        angleLines: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        pointLabels: {
          color: 'rgba(255, 255, 255, 0.4)',
          font: {
            family: 'Inter',
            size: 9,
            weight: 'bold',
          },
        },
        ticks: {
          display: false,
          maxTicksLimit: 5,
        },
        suggestedMin: 0,
        suggestedMax: 100,
      },
    },
  };

  return (
    <div className="h-72 sm:h-96 w-full flex items-center justify-center p-4">
      <Radar data={chartData} options={options} />
    </div>
  );
};

export default SocialRadarChart;
