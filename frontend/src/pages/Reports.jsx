import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import {
  Download, Calendar, TrendingUp, RefreshCw, AlertTriangle,
  Shield, AlertCircle, CheckCircle, FileText, Layers
} from 'lucide-react';
import { getLatestAudit, discoverDevices, downloadReport } from '@/services/api';

const BASE_URL = 'http://localhost:8000';

// Download cumulative report — calls backend for all discovered hosts
const downloadCumulativeReport = async (reports) => {
  // We'll build and download a rich HTML report as PDF via print
  const now = new Date().toLocaleString();

  const severityColor = (s) => ({
    Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#3b82f6'
  }[s] || '#64748b');

  const severityBg = (s) => ({
    Critical: '#450a0a', High: '#431407', Medium: '#422006', Low: '#172554'
  }[s] || '#1e293b');

  const rows = reports.map(r => `
    <tr style="border-bottom:1px solid #334155">
      <td style="padding:10px;color:#f1f5f9;font-weight:600">${r.host}</td>
      <td style="padding:10px;color:${r.score >= 70 ? '#4ade80' : r.score >= 40 ? '#facc15' : '#f87171'};font-weight:700">${r.score}%</td>
      <td style="padding:10px;color:${r.violations > 0 ? '#f87171' : '#4ade80'};font-weight:700">${r.violations}</td>
      <td style="padding:10px;color:#94a3b8">${r.aiAnalysis || 'N/A'}</td>
    </tr>
  `).join('');

  const allViolationRows = reports.flatMap(r =>
    (r.violationList || []).map(v => `
      <tr style="border-bottom:1px solid #1e293b">
        <td style="padding:8px;color:#94a3b8;font-size:12px">${r.host}</td>
        <td style="padding:8px">
          <span style="background:${severityBg(v.severity)};color:${severityColor(v.severity)};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">
            ${v.severity}
          </span>
        </td>
        <td style="padding:8px;color:#f1f5f9;font-size:12px">${v.title}</td>
        <td style="padding:8px;color:#94a3b8;font-size:11px">${v.description || ''}</td>
        <td style="padding:8px;color:#34d399;font-size:11px">${v.fix || ''}</td>
      </tr>
    `)
  ).join('');

  const avgScore = reports.length > 0
    ? Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length)
    : 0;
  const totalViol = reports.reduce((s, r) => s + r.violations, 0);
  const critTotal = reports.flatMap(r => r.violationList || []).filter(v => v.severity === 'Critical').length;
  const highTotal = reports.flatMap(r => r.violationList || []).filter(v => v.severity === 'High').length;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>TECHIFY Cumulative Security Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Fira+Mono&display=swap');
    * { margin:0;padding:0;box-sizing:border-box; }
    body { background:#0f172a;color:#f1f5f9;font-family:'Inter',sans-serif;padding:40px; }
    .header { display:flex;justify-content:space-between;align-items:center;margin-bottom:40px;padding-bottom:24px;border-bottom:1px solid #334155 }
    .logo { font-size:28px;font-weight:700;background:linear-gradient(135deg,#06b6d4,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent }
    .subtitle { color:#64748b;font-size:13px;margin-top:4px }
    .badge { background:linear-gradient(135deg,#0891b2,#1d4ed8);padding:6px 16px;border-radius:20px;font-size:12px;font-weight:600;color:#fff }
    .section { margin-bottom:36px }
    .section-title { font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#64748b;font-weight:600;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #1e293b }
    .kpi-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:36px }
    .kpi { background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid #334155;border-radius:12px;padding:20px }
    .kpi-label { font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin-bottom:8px }
    .kpi-value { font-size:36px;font-weight:700 }
    table { width:100%;border-collapse:collapse;font-size:13px }
    thead tr { background:#1e293b }
    thead th { padding:12px;text-align:left;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;font-weight:600 }
    .footer { margin-top:48px;padding-top:24px;border-top:1px solid #334155;display:flex;justify-content:space-between;color:#475569;font-size:11px }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">TECHIFY</div>
      <div class="subtitle">Smart Infrastructure Audit Platform</div>
    </div>
    <div>
      <div class="badge">CUMULATIVE SECURITY REPORT</div>
      <p style="color:#64748b;font-size:11px;margin-top:6px;text-align:right">Generated: ${now}</p>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-label">Devices Scanned</div>
      <div class="kpi-value" style="color:#06b6d4">${reports.length}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Avg Compliance Score</div>
      <div class="kpi-value" style="color:${avgScore >= 70 ? '#4ade80' : avgScore >= 40 ? '#facc15' : '#f87171'}">${avgScore}%</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Total Violations</div>
      <div class="kpi-value" style="color:#f87171">${totalViol}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Critical Issues</div>
      <div class="kpi-value" style="color:#ef4444">${critTotal}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Device Summary</div>
    <table>
      <thead>
        <tr>
          <th>Host / IP</th>
          <th>Compliance Score</th>
          <th>Violations</th>
          <th>AI Insight</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">All Violations Detail</div>
    ${allViolationRows ? `
    <table>
      <thead>
        <tr>
          <th>Host</th>
          <th>Severity</th>
          <th>Title</th>
          <th>Description</th>
          <th>Fix</th>
        </tr>
      </thead>
      <tbody>${allViolationRows}</tbody>
    </table>
    ` : '<p style="color:#64748b;font-size:13px">No violations found across all devices.</p>'}
  </div>

  <div class="footer">
    <span>TECHIFY Smart Audit Platform</span>
    <span>Confidential — Internal Use Only</span>
    <span>Report ID: TECH-${Date.now().toString(36).toUpperCase()}</span>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => {
      setTimeout(() => win.print(), 500);
    };
  }
};

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [downloadingCumulative, setDownloadingCumulative] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLatestAudit();
      if (data && data.host) {
        const report = {
          id: 1,
          host: data.host,
          date: data.timestamp || new Date().toLocaleString(),
          violations: data.violations?.length || 0,
          violationList: data.violations || [],
          score: data.compliance_score || 100,
          status: 'completed',
          aiAnalysis: data.ai_analysis,
        };
        setReports([report]);
      }
    } catch (err) {
      setError('Failed to load reports. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (host) => {
    setDownloading(host);
    window.open(`${BASE_URL}/download-report?host=${encodeURIComponent(host)}`, '_blank');
    setTimeout(() => setDownloading(null), 2000);
  };

  const handleCumulativeDownload = async () => {
    setDownloadingCumulative(true);
    try {
      await downloadCumulativeReport(reports);
    } finally {
      setTimeout(() => setDownloadingCumulative(false), 2000);
    }
  };

  const totalViolations = reports.reduce((sum, r) => sum + r.violations, 0);
  const avgScore = reports.length > 0
    ? Math.round(reports.reduce((sum, r) => sum + r.score, 0) / reports.length)
    : 0;
  const criticalCount = reports.flatMap(r => r.violationList || []).filter(v => v.severity === 'Critical').length;
  const highCount = reports.flatMap(r => r.violationList || []).filter(v => v.severity === 'High').length;

  const getSeverityColor = (s) => ({
    Critical: 'text-red-400 bg-red-900/30 border-red-700/50',
    High: 'text-orange-400 bg-orange-900/30 border-orange-700/50',
    Medium: 'text-yellow-400 bg-yellow-900/30 border-yellow-700/50',
    Low: 'text-blue-400 bg-blue-900/30 border-blue-700/50',
  }[s] || 'text-slate-400 bg-slate-800 border-slate-700');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Audit Reports</h2>
            <p className="text-xs text-slate-400">View, analyze and download security audit reports</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchReports}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg hover:border-slate-600 transition-all text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleCumulativeDownload}
              disabled={downloadingCumulative || reports.length === 0}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-indigo-500/40 transition-all text-sm disabled:opacity-50"
            >
              {downloadingCumulative
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating...</>
                : <><Layers className="w-4 h-4" /> Download All Reports</>
              }
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-900/30 border border-red-700/50 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'TOTAL REPORTS', value: reports.length, icon: FileText, color: 'from-cyan-500 to-blue-500', bg: 'from-cyan-900/30 to-blue-900/30' },
            { label: 'AVG COMPLIANCE', value: `${avgScore}%`, icon: Shield, color: avgScore >= 70 ? 'from-green-500 to-emerald-400' : avgScore >= 40 ? 'from-yellow-500 to-yellow-400' : 'from-red-500 to-red-400', bg: 'from-slate-800/80 to-slate-900/80' },
            { label: 'TOTAL VIOLATIONS', value: totalViolations, icon: AlertCircle, color: 'from-red-500 to-red-400', bg: 'from-red-900/20 to-slate-900/80' },
            { label: 'CRITICAL ISSUES', value: criticalCount, icon: AlertTriangle, color: 'from-rose-600 to-red-500', bg: 'from-rose-900/20 to-slate-900/80' },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div key={i} className={`bg-gradient-to-br ${kpi.bg} border border-slate-700/50 rounded-xl p-6 backdrop-blur`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">{kpi.label}</p>
                    <p className={`text-4xl font-bold bg-gradient-to-r ${kpi.color} bg-clip-text text-transparent`}>
                      {loading ? '...' : kpi.value}
                    </p>
                  </div>
                  <div className={`bg-gradient-to-br ${kpi.color} p-2.5 rounded-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-xl p-10 text-center">
            <RefreshCw className="w-8 h-8 text-cyan-400 mx-auto mb-3 animate-spin" />
            <p className="text-slate-400">Loading reports from backend...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {reports.map((report) => {
              const violations = report.violationList || [];
              const bySeverity = ['Critical', 'High', 'Medium', 'Low'].map(s => ({
                name: s,
                count: violations.filter(v => v.severity === s).length,
              }));

              return (
                <div key={report.id} className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden backdrop-blur">
                  {/* Report Header */}
                  <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-lg">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">{report.host}</h3>
                        <div className="flex items-center gap-2 text-slate-500 text-xs mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{report.date}</span>
                          <span className="px-2 py-0.5 bg-green-900/30 text-green-400 border border-green-700/30 rounded text-xs font-semibold ml-1">
                            Completed
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(report.host)}
                      disabled={downloading === report.host}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/40 transition-all text-sm disabled:opacity-50"
                    >
                      {downloading === report.host
                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating...</>
                        : <><Download className="w-4 h-4" /> Download PDF</>
                      }
                    </button>
                  </div>

                  {/* Report Body */}
                  <div className="p-6">
                    {/* Score + Severity breakdown */}
                    <div className="grid grid-cols-5 gap-4 mb-6">
                      {/* Score circle */}
                      <div className="col-span-1 flex flex-col items-center justify-center bg-slate-800/50 border border-slate-700/30 rounded-xl p-4">
                        <p className="text-slate-500 text-xs font-semibold uppercase mb-2">Score</p>
                        <p className={`text-4xl font-bold ${report.score >= 70 ? 'text-green-400' : report.score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {report.score}%
                        </p>
                        <p className="text-slate-500 text-xs mt-1">
                          {report.score >= 80 ? 'Excellent' : report.score >= 60 ? 'Good' : report.score >= 40 ? 'Fair' : 'Critical'}
                        </p>
                      </div>

                      {/* Severity breakdown */}
                      {bySeverity.map(s => (
                        <div key={s.name} className="flex flex-col items-center justify-center bg-slate-800/50 border border-slate-700/30 rounded-xl p-4">
                          <p className="text-slate-500 text-xs font-semibold uppercase mb-2">{s.name}</p>
                          <p className={`text-3xl font-bold bg-gradient-to-r ${
                            s.name === 'Critical' ? 'from-red-500 to-red-400' :
                            s.name === 'High' ? 'from-orange-500 to-orange-400' :
                            s.name === 'Medium' ? 'from-yellow-500 to-yellow-400' :
                            'from-blue-500 to-blue-400'
                          } bg-clip-text text-transparent`}>{s.count}</p>
                        </div>
                      ))}
                    </div>

                    {/* AI Insight */}
                    {report.aiAnalysis && (
                      <div className="mb-6 p-4 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-700/30 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                          <p className="text-cyan-400 text-xs font-bold uppercase tracking-wide">AI Security Insight</p>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">{report.aiAnalysis}</p>
                      </div>
                    )}

                    {/* Violations table */}
                    {violations.length > 0 && (
                      <div>
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">
                          Violations Detail ({violations.length})
                        </p>
                        <div className="space-y-2">
                          {violations.map((v, i) => (
                            <div key={i} className="flex items-center justify-between bg-slate-800/40 border border-slate-700/30 rounded-lg px-4 py-3">
                              <div className="flex items-center gap-3 flex-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getSeverityColor(v.severity)}`}>
                                  {v.severity}
                                </span>
                                <div>
                                  <p className="text-white text-sm font-semibold">{v.title}</p>
                                  <p className="text-slate-500 text-xs">{v.description}</p>
                                </div>
                              </div>
                              {v.port && (
                                <span className="text-slate-500 text-xs font-mono ml-4">Port: {v.port}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {violations.length === 0 && (
                      <div className="flex items-center gap-3 p-4 bg-green-900/20 border border-green-700/30 rounded-xl">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <p className="text-green-300 text-sm font-semibold">No violations found — System is fully secure!</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && reports.length === 0 && (
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-xl p-14 backdrop-blur text-center">
            <TrendingUp className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400 mb-2 font-semibold">No reports available</p>
            <p className="text-slate-500 text-sm">Run scans on devices to generate reports</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;