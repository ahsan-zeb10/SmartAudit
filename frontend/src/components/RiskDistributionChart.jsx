import React from 'react';

export const RiskDistributionChart = ({ data }) => {
  const chartData = data || [
    { name: 'Critical', value: 0, color: '#ff4757' },
    { name: 'High', value: 0, color: '#ff6348' },
    { name: 'Medium', value: 0, color: '#ffa502' },
    { name: 'Low', value: 0, color: '#ffb547' },
  ];

  const maxValue = Math.max(...chartData.map(d => d.value), 1);

  return (
    <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-lg p-6 backdrop-blur h-full">
      <h3 className="text-slate-400 font-semibold text-sm mb-6 uppercase tracking-wide">
        Risk Distribution
      </h3>

      <div className="flex items-end justify-around h-48">
        {chartData.map((item, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2">
            <div className="flex items-end justify-center h-40 gap-2">
              <div
                className="rounded-t-lg transition-all hover:opacity-80"
                style={{
                  backgroundColor: item.color,
                  height: `${(item.value / maxValue) * 100}%`,
                  minHeight: item.value > 0 ? '8px' : '2px',
                  width: '24px',
                  opacity: item.value === 0 ? 0.3 : 1,
                }}
              />
            </div>
            <p className="text-white font-bold text-lg">{item.value}</p>
            <p className="text-slate-500 text-xs uppercase font-semibold">{item.name}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-700/30">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {chartData.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-slate-400">{item.name}: {item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RiskDistributionChart;