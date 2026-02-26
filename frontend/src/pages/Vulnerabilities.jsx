import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AlertCircle, Filter, RefreshCw, AlertTriangle } from 'lucide-react';
import { VulnerabilityCard } from '@/components/VulnerabilityCard';
import { useAuditData } from '@/hooks/useAuditData';

const Vulnerabilities = () => {
  const [severityFilter, setSeverityFilter] = useState('All');
  const { auditData, loading, error, refetch } = useAuditData('127.0.0.1');

  const violations = auditData?.violations || [];
  const host = auditData?.host || '127.0.0.1';

  const severities = ['All', 'Critical', 'High', 'Medium', 'Low'];

  const severityStats = [
    { name: 'Critical', count: violations.filter(v => v.severity === 'Critical').length, color: 'from-red-600 to-red-400' },
    { name: 'High', count: violations.filter(v => v.severity === 'High').length, color: 'from-orange-600 to-orange-400' },
    { name: 'Medium', count: violations.filter(v => v.severity === 'Medium').length, color: 'from-yellow-600 to-yellow-400' },
    { name: 'Low', count: violations.filter(v => v.severity === 'Low').length, color: 'from-blue-600 to-blue-400' },
  ];

  const filteredVulnerabilities =
    severityFilter === 'All'
      ? violations
      : violations.filter((v) => v.severity === severityFilter);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Vulnerabilities</h2>
            <p className="text-xs text-slate-400">
              Comprehensive vulnerability assessment and tracking
            </p>
          </div>
          <button
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg hover:border-slate-600 transition-all text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-900/30 border border-red-700/50 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Severity Stats */}
        <div className="grid grid-cols-4 gap-4">
          {severityStats.map((stat) => (
            <div
              key={stat.name}
              className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-lg p-6 backdrop-blur"
            >
              <p className="text-slate-400 text-xs font-semibold mb-2 uppercase">{stat.name}</p>
              <p className={`text-4xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                {loading ? '...' : stat.count}
              </p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-lg p-6 backdrop-blur">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-cyan-400" />
            <p className="text-slate-400 text-sm font-semibold">Filter by Severity:</p>
            <div className="flex gap-2">
              {severities.map((severity) => (
                <button
                  key={severity}
                  onClick={() => setSeverityFilter(severity)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    severityFilter === severity
                      ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black'
                      : 'bg-slate-800/50 text-white border border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {severity}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Vulnerabilities List */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            {severityFilter === 'All' ? 'All Vulnerabilities' : `${severityFilter} Severity`}{' '}
            ({filteredVulnerabilities.length})
          </h3>

          {loading ? (
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-lg p-8 text-center">
              <RefreshCw className="w-8 h-8 text-cyan-400 mx-auto mb-3 animate-spin" />
              <p className="text-slate-400">Loading vulnerabilities from backend...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVulnerabilities.map((v, i) => (
                <VulnerabilityCard
                  key={v.id || i}
                  vulnerability={v}
                  index={i}
                  host={host}
                  onRemediated={refetch}
                />
              ))}
            </div>
          )}
        </div>

        {!loading && filteredVulnerabilities.length === 0 && (
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-lg p-12 backdrop-blur text-center">
            <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">No vulnerabilities found</p>
            <p className="text-slate-500 text-sm">
              {severityFilter !== 'All' ? `No ${severityFilter} severity issues` : 'Run a scan to detect vulnerabilities'}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Vulnerabilities;