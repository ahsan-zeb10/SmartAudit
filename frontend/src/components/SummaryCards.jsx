import React from 'react';
import { Shield, AlertCircle, CheckCircle } from 'lucide-react';

export const SummaryCards = ({ totalFindings = 0, critical = 0, openIssues = 0, resolved = 0 }) => {
  const stats = [
    {
      label: 'TOTAL FINDINGS',
      value: totalFindings,
      icon: Shield,
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'from-cyan-900/30 to-blue-900/30',
    },
    {
      label: 'CRITICAL',
      value: critical,
      icon: AlertCircle,
      color: 'from-red-500 to-red-400',
      bgColor: 'from-red-900/30 to-red-800/30',
    },
    {
      label: 'OPEN ISSUES',
      value: openIssues,
      icon: AlertCircle,
      color: 'from-yellow-500 to-yellow-400',
      bgColor: 'from-yellow-900/30 to-yellow-800/30',
    },
    {
      label: 'RESOLVED',
      value: resolved,
      icon: CheckCircle,
      color: 'from-green-500 to-emerald-400',
      bgColor: 'from-green-900/30 to-emerald-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className={`bg-gradient-to-br ${stat.bgColor} border border-slate-700/30 rounded-lg p-6 backdrop-blur hover:border-slate-600/50 transition-all`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className={`text-4xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                  {stat.value}
                </p>
              </div>
              <div className={`bg-gradient-to-br ${stat.color} p-3 rounded-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SummaryCards;