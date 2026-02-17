import React, { useState } from 'react';
import axios from 'axios';
import { Shield, AlertTriangle, Activity, Search, FileText, Network, RefreshCcw, Zap, Monitor, BarChart3, CheckCircle, XCircle, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function App() {
  const [loading, setLoading] = useState(false);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const [results, setResults] = useState({
    host: '127.0.0.1',
    violations: [],
    ai_analysis: "System ready...",
    assets: [],
    compliance_score: 100
  });

  const [form, setForm] = useState({ host: '127.0.0.1' });
  const [networkRange, setNetworkRange] = useState("192.168.1.1/24");
  const [lastNotification, setLastNotification] = useState("");

  const handleScan = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setLastNotification("Deep Audit Started...");

    try {
      await axios.post('http://127.0.0.1:8000/scan', form);
      const update = await axios.get('http://127.0.0.1:8000/latest-audit');
      setResults(update.data);
    } catch (err) {
      setLastNotification("Scan Failed");
    }
    setLoading(false);
  };

  const handleDiscovery = async () => {
    setDiscoveryLoading(true);
    setLastNotification("Network Discovery...");

    try {
      const res = await axios.post('http://127.0.0.1:8000/discover', { range: networkRange });
      setResults(prev => ({ ...prev, assets: res.data.devices || [] }));
      setLastNotification(`Found ${res.data.devices?.length || 0} Devices`);
    } catch (err) {
      setLastNotification("Discovery Failed");
    }
    setDiscoveryLoading(false);
  };

  const handleRemediate = async (violation) => {
    setLastNotification("Applying Fix...");
    try {
      const res = await axios.post('http://127.0.0.1:8000/remediate', {
        violation: violation,
        host: results.host
      });
      alert(res.data.message);
      const update = await axios.get('http://127.0.0.1:8000/latest-audit');
      setResults(update.data);
    } catch (err) {
      alert("Fix Failed");
    }
  };

  // Download Report Button
  const handleDownloadReport = async () => {
    setReportLoading(true);
    try {
      const response = await axios.get('http://127.0.0.1:8000/download-report', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'TECHIFY_Compliance_Report.pdf');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setLastNotification("Report Downloaded");
    } catch (err) {
      alert("Report Generation Failed");
    }
    setReportLoading(false);
  };

  // Chart Data (direct severity use)
  const getChartData = () => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };

    results.violations.forEach(v => {
      const sev = (v.severity || "Low").toUpperCase();
      if (sev === "CRITICAL") counts.Critical++;
      else if (sev === "HIGH") counts.High++;
      else if (sev === "MEDIUM") counts.Medium++;
      else counts.Low++;
    });

    return [
      { name: 'Critical', count: counts.Critical, color: '#ef4444' },
      { name: 'High',     count: counts.High,     color: '#f97316' },
      { name: 'Medium',   count: counts.Medium,   color: '#eab308' },
      { name: 'Low',      count: counts.Low,      color: '#22c55e' }
    ];
  };

  const chartData = getChartData();

  const getSeverityStyle = (severity) => {
    const s = (severity || "Low").toUpperCase();
    if (s === "CRITICAL") return "text-red-500 border-red-900/50 bg-red-950/30";
    if (s === "HIGH")     return "text-orange-500 border-orange-900/50 bg-orange-950/30";
    if (s === "MEDIUM")   return "text-yellow-500 border-yellow-900/50 bg-yellow-950/30";
    return "text-emerald-500 border-emerald-900/50 bg-emerald-950/30";
  };

  const getSeverityIcon = (severity) => {
    if ((severity || "").toUpperCase() === "CRITICAL") return <XCircle size={22} className="text-red-500" />;
    return <AlertTriangle size={22} className="text-orange-500" />;
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 p-4 md:p-8 font-sans">
      {/* Header */}
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500 p-2 rounded-lg"><Shield size={32} className="text-black" /></div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter">TECHIFY <span className="text-cyan-500">SOLUTIONS</span></h1>
            <p className="text-[10px] font-bold text-slate-500 tracking-[0.3em]">INFRASTRUCTURE V2.0</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {lastNotification && (
            <div className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-6 py-2 rounded-full text-xs font-bold animate-pulse">
              {lastNotification}
            </div>
          )}
          <button
            onClick={handleDownloadReport}
            disabled={reportLoading}
            className="bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-xl font-bold flex items-center gap-2 uppercase text-xs tracking-widest transition-all"
          >
            {reportLoading ? <RefreshCcw className="animate-spin" size={18} /> : <Download size={18} />}
            DOWNLOAD REPORT
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Controls */}
        <div className="space-y-6">
          {/* Audit Engine */}
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
            <h2 className="text-sm font-black mb-6 flex items-center gap-2 text-cyan-500 uppercase tracking-widest">
              <Zap size={18} /> Audit Engine
            </h2>
            <form onSubmit={handleScan} className="space-y-4">
              <input
                type="text"
                value={form.host}
                onChange={e => setForm({ ...form, host: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none text-sm font-mono text-cyan-400"
                placeholder="Enter IP Address (e.g., 192.168.1.50)"
              />
              <button
                disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-500 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all uppercase text-xs tracking-widest"
              >
                {loading ? <RefreshCcw className="animate-spin" size={18} /> : <Search size={18} />}
                RUN DEEP AUDIT
              </button>
            </form>
          </div>

          {/* Discovery */}
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
            <h2 className="text-sm font-black mb-6 flex items-center gap-2 text-purple-500 uppercase tracking-widest">
              <Network size={18} /> Network Discovery
            </h2>
            <input
              type="text"
              value={networkRange}
              onChange={e => setNetworkRange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none text-sm font-mono text-purple-400 mb-4"
            />
            <button
              onClick={handleDiscovery}
              disabled={discoveryLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
            >
              {discoveryLoading ? <RefreshCcw className="animate-spin" size={18} /> : <Activity size={18} />}
              DISCOVER DEVICES
            </button>
          </div>

          {/* Online Devices */}
          {results.assets.length > 0 && (
            <div className="bg-slate-900/30 p-5 rounded-3xl border border-slate-800">
              <h3 className="text-[10px] font-black text-slate-500 uppercase mb-4 flex items-center gap-2 tracking-widest">
                <Monitor size={14} /> Online Devices
              </h3>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2 font-mono">
                {results.assets.map((asset, idx) => (
                  <div
                    key={idx}
                    onClick={() => setForm({ host: asset.ip || asset })}
                    className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-sm cursor-pointer hover:bg-slate-800 transition-all flex justify-between items-center"
                  >
                    <span className="font-bold text-cyan-400">{asset.ip || asset}</span>
                    <span className="text-emerald-500 text-xs">ONLINE</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Score + Chart */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1 bg-slate-900/80 p-6 rounded-3xl border border-slate-800 flex flex-col items-center justify-center">
              <p className="text-[10px] font-black text-slate-500 uppercase">Health Score</p>
              <h2 className={`text-5xl font-black mt-2 ${results.compliance_score > 70 ? 'text-emerald-500' : 'text-red-500'}`}>
                {results.compliance_score}%
              </h2>
              <div className="mt-3 text-xs font-bold text-slate-400 flex items-center gap-1">
                <CheckCircle size={14} className="text-emerald-500" /> Secure
              </div>
            </div>

            <div className="md:col-span-3 bg-slate-900/80 p-6 rounded-3xl border border-slate-800">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <BarChart3 size={16} /> Risk Distribution
              </h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8' }} />
                    <YAxis tick={{ fill: '#64748b' }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* AI Insight */}
          <div className="bg-gradient-to-br from-cyan-900/20 to-slate-900/50 p-6 rounded-3xl border border-cyan-500/30">
            <h3 className="flex items-center gap-2 font-black text-cyan-400 mb-3 uppercase text-xs tracking-widest">
              <FileText size={16} /> AI Security Insight
            </h3>
            <p className="text-slate-300 italic leading-relaxed">"{results.ai_analysis}"</p>
          </div>

          {/* Violations List */}
          <div className="space-y-4">
            {results.violations.length === 0 ? (
              <div className="bg-emerald-900/20 border border-emerald-500/30 p-8 rounded-3xl text-center">
                <CheckCircle size={48} className="mx-auto text-emerald-500 mb-4" />
                <p className="text-emerald-400 font-bold text-lg">No violations found</p>
                <p className="text-slate-500 mt-1">System is clean and compliant</p>
              </div>
            ) : (
              results.violations.map((v, i) => (
                <div
                  key={i}
                  className={`p-5 rounded-2xl border flex flex-col md:flex-row justify-between gap-4 transition-all hover:scale-[1.01] ${getSeverityStyle(v.severity)}`}
                >
                  <div className="flex gap-4">
                    {getSeverityIcon(v.severity)}
                    <div>
                      <div className="font-bold text-lg">{v.title}</div>
                      <div className="text-sm opacity-90 mt-1">{v.description}</div>
                      {v.port && <div className="text-xs mt-2 opacity-75">Port: {v.port} • Service: {v.service}</div>}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemediate(v)}
                    className="bg-white/10 hover:bg-white/20 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 transition-all whitespace-nowrap"
                  >
                    FIX NOW
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;