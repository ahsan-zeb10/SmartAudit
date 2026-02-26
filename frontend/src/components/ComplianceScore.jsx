import React from 'react';

export const ComplianceScore = ({ score = 21 }) => {
  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#f59e0b'; // Amber
    if (score >= 40) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-lg p-6 backdrop-blur">
      <h3 className="text-slate-400 font-semibold text-sm mb-6 uppercase tracking-wide">
        Health Score
      </h3>
      
      <div className="flex flex-col items-center justify-center">
        <div className="relative w-40 h-40 mb-4">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r="45"
              fill="none"
              stroke="#334155"
              strokeWidth="8"
            />
            
            {/* Progress circle */}
            <circle
              cx="60"
              cy="60"
              r="45"
              fill="none"
              stroke={getScoreColor(score)}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 0.5s ease-in-out',
              }}
            />
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl font-bold text-orange-500">{score}%</p>
            </div>
          </div>
        </div>

        {/* Status text */}
        <p className="text-xs text-slate-500 text-center mt-2">
          {score >= 80 && 'Excellent'}
          {score >= 60 && score < 80 && 'Good'}
          {score >= 40 && score < 60 && 'Fair'}
          {score < 40 && 'Critical'}
        </p>
      </div>
    </div>
  );
};

export default ComplianceScore;
