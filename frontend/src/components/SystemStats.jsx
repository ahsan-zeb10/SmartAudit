import React from 'react';
import { Activity } from 'lucide-react';

export const SystemStatsPanel = ({ stats = [] }) => {
  const defaultStats = [
    { label: 'CPU', value: 6, color: 'from-emerald-500 to-teal-400' },
    { label: 'RAM', value: 51, color: 'from-lime-500 to-green-400' },
    { label: 'DISK', value: 96, color: 'from-orange-600 to-orange-400' },
  ];

  const displayStats = stats.length > 0 ? stats : defaultStats;

  return (
    <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-lg p-6 backdrop-blur">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-5 h-5 text-cyan-400" />
        <h3 className="text-cyan-400 font-semibold text-sm uppercase tracking-wide">
          Live System Stats
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {displayStats.map((stat, idx) => (
          <div key={idx}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-xs font-semibold uppercase">{stat.label}</span>
              <span className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                {stat.value}%
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="h-3 bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/30">
              <div
                className={`h-full bg-gradient-to-r ${stat.color} transition-all duration-500`}
                style={{ width: `${stat.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemStatsPanel;