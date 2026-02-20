import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, AlertTriangle, Activity, Search, FileText, Network, RefreshCcw, Zap, Monitor, BarChart3, CheckCircle, XCircle, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function App() {
  const [loading, setLoading] = useState(false);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [allDevicesResults, setAllDevicesResults] = useState({});
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [newDevices, setNewDevices] = useState([]);
  const [liveStats, setLiveStats] = useState(null);

  const [form, setForm] = useState({ host: '127.0.0.1' });
  const [networkRange, setNetworkRange] = useState("192.168.1.1/24");
  const [lastNotification, setLastNotification] = useState("");

  const handleScan = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setLastNotification("Deep Audit Triggered...");

    try {
      await axios.post('http://127.0.0.1:8000/scan', form);
      const update = await axios.get('http://127.0.0.1:8000/latest-audit');
      setAllDevicesResults(prev => ({ ...prev, [form.host]: update.data }));
      setSelectedDevice(form.host);
    } catch (err) {
      setLastNotification("Scan Failed");
    }
    setLoading(false);
  };

  const handleDiscovery = async () => {
    setDiscoveryLoading(true);
    setLastNotification("Analyzing Network Infrastructure...");

    try {
      const res = await axios.post('http://127.0.0.1:8000/discover', { range: networkRange });
      setAllDevicesResults(res.data.all_results || {});
      setNewDevices(res.data.new_devices || []);

      if (res.data.new_devices?.length > 0) {
        setLastNotification(`⚠️ ALERT: ${res.data.new_devices.length} Rogue Devices!`);
      } else {
        setLastNotification(`Audited ${Object.keys(res.data.all_results || {}).length} Devices`);
      }

      const first = Object.keys(res.data.all_results || {})[0];
      if (first) setSelectedDevice(first);
    } catch (err) {
      setLastNotification("Discovery Failed");
    }
    setDiscoveryLoading(false);
  };

  const handleRemediate = async (violation) => {
    setLastNotification("Executing Remediation Policy...");
    try {
      const res = await axios.post('http://127.0.0.1:8000/remediate', { violation, host: selectedDevice });
      alert(res.data.message);
      const update = await axios.get('http://127.0.0.1:8000/latest-audit');
      setAllDevicesResults(prev => ({ ...prev, [selectedDevice]: update.data }));
    } catch (err) {
      alert("Remediation Failed");
    }
  };

  // PDF Download - Yeh sahi PDF download karega (report_gen.py se)
  const handleDownloadReport = async () => {
    if (!selectedDevice) {
      alert("Please select a device first");
      return;
    }
    setReportLoading(true);
    try {
      // Important: host parameter bhej rahe hain taake backend sahi report generate kare
      const response = await axios.get('http://127.0.0.1:8000/download-report', {
        params: { host: selectedDevice },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `TECHIFY_Smart_Audit_${selectedDevice}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setLastNotification("TECHIFY Smart Audit Report Downloaded");
    } catch (err) {
      console.error("Report download failed:", err);
      alert("Report Generation Failed - Check if device is audited");
    }
    setReportLoading(false);
  };

  useEffect(() => {
    if (selectedDevice !== "127.0.0.1") {
      setLiveStats(null);
      return;
    }
    const fetchStats = async () => {
      try {
        const res = await axios.get(`http://127.0.0.1:8000/live-stats/${selectedDevice}`);
        setLiveStats(res.data);
      } catch (e) {
        console.log("Live stats fetch failed");
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [selectedDevice]);

  const getChartData = (violations = []) => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    violations.forEach(v => {
      const sev = v.severity || "Low";
      counts[sev] = (counts[sev] || 0) + 1;
    });
    return [
      { name: 'Critical', count: counts.Critical, color: '#ef4444' },
      { name: 'High', count: counts.High, color: '#f97316' },
      { name: 'Medium', count: counts.Medium, color: '#eab308' },
      { name: 'Low', count: counts.Low, color: '#22c55e' }
    ];
  };

  const selectedReport = allDevicesResults[selectedDevice];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-6 md:p-10 font-sans">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-10 border-b border-slate-800 pb-8">
        <div className="flex items-center gap-4">
          <div className="bg-cyan-500 p-3 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.5)]">
            <Shield size={32} className="text-black" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter italic">
              TECHIFY <span className="text-cyan-500">SMART AUDIT</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-500 tracking-[0.4em] uppercase">
              Security Operations Center
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {lastNotification && (
            <div className="text-cyan-400 text-xs font-black animate-pulse px-4 py-2 bg-cyan-500/10 rounded-full border border-cyan-500/20">
              {lastNotification}
            </div>
          )}
          {/* Yeh button ab PDF download karega */}
          <button
            onClick={handleDownloadReport}
            disabled={reportLoading || !selectedDevice}
            className={`bg-purple-600 hover:bg-purple-700 p-3 rounded-xl transition-all flex items-center gap-2 text-white font-black text-sm ${
              reportLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {reportLoading ? (
              <RefreshCcw className="animate-spin" size={20} />
            ) : (
              <Download size={20} />
            )}
            GENERATE REPORT
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Control Column */}
        <div className="space-y-6">
          <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800">
            <h3 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Zap size={14} /> Engine Control
            </h3>
            <input
              type="text"
              value={form.host}
              onChange={e => setForm({...form, host: e.target.value})}
              className="w-full bg-black/50 border border-slate-700 p-3 rounded-xl mb-4 text-sm font-mono focus:border-cyan-500 outline-none transition-all"
            />
            <button
              onClick={handleScan}
              className="w-full bg-cyan-600 hover:bg-cyan-500 py-4 rounded-xl font-black text-[10px] tracking-[0.2em] flex justify-center items-center gap-2 transition-all shadow-lg shadow-cyan-900/20"
            >
              {loading ? <RefreshCcw className="animate-spin" size={16}/> : <Search size={16}/>} START AUDIT
            </button>
          </div>

          <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800">
            <h3 className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Network size={14}/> Discovery Range
            </h3>
            <input
              type="text"
              value={networkRange}
              onChange={e => setNetworkRange(e.target.value)}
              className="w-full bg-black/50 border border-slate-700 p-3 rounded-xl mb-4 text-sm font-mono focus:border-purple-500 outline-none transition-all"
            />
            <button
              onClick={handleDiscovery}
              className="w-full bg-purple-600 hover:bg-purple-500 py-4 rounded-xl font-black text-[10px] tracking-[0.2em] flex justify-center items-center gap-2 transition-all shadow-lg shadow-purple-900/20"
            >
              {discoveryLoading ? <RefreshCcw className="animate-spin" size={16}/> : <Activity size={16}/>} SCAN NETWORK
            </button>
          </div>

          <div className="bg-slate-900/20 p-6 rounded-[2rem] border border-slate-800">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Monitor size={14}/> Network Nodes
            </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {Object.keys(allDevicesResults).map(ip => (
                <div
                  key={ip}
                  onClick={() => setSelectedDevice(ip)}
                  className={`p-4 rounded-2xl cursor-pointer border transition-all ${
                    selectedDevice === ip
                      ? 'bg-cyan-500/10 border-cyan-500 shadow-inner shadow-cyan-500/10'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold">{ip}</span>
                    <span className={`text-[10px] font-black ${allDevicesResults[ip].compliance_score > 70 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {allDevicesResults[ip].compliance_score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Content Column */}
        <div className="lg:col-span-3 space-y-8">
          {selectedReport ? (
            <>
              {/* Top Stats Bar */}
              {liveStats && (
                <div className="grid grid-cols-3 gap-6">
                  {['CPU', 'RAM', 'DISK'].map((label) => (
                    <div key={label} className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
                      <div className="flex justify-between text-[10px] font-black text-slate-500 mb-2 uppercase">
                        <span>{label} Usage</span>
                        <span>{liveStats[label.toLowerCase() + '_percent']}%</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 ${
                            liveStats[label.toLowerCase() + '_percent'] > 80 ? 'bg-red-500' : 'bg-cyan-500'
                          }`}
                          style={{ width: `${liveStats[label.toLowerCase() + '_percent']}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Main Score & Chart */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Compliance Score</p>
                  <h2 className={`text-7xl font-black ${selectedReport.compliance_score > 70 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {selectedReport.compliance_score}%
                  </h2>
                </div>

                <div className="md:col-span-2 bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData(selectedReport.violations)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#64748b'}} />
                      <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '12px'}} />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {getChartData(selectedReport.violations).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* AI Analysis */}
              <div className="bg-gradient-to-r from-cyan-950/40 to-transparent p-8 rounded-[2rem] border-l-4 border-cyan-500">
                <h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <FileText size={14}/> Neural Analysis
                </h4>
                <p className="text-sm text-slate-300 italic leading-relaxed">"{selectedReport.ai_analysis}"</p>
              </div>

              {/* Violations List */}
              <div className="space-y-4">
                {selectedReport.violations.map((v, i) => (
                  <div
                    key={i}
                    className="bg-slate-900/60 p-6 rounded-[1.5rem] border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 group hover:bg-slate-800/60 transition-all"
                  >
                    <div className="flex items-center gap-6">
                      <div className={`p-3 rounded-xl ${v.severity === 'Critical' ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-500'}`}>
                        {v.severity === 'Critical' ? <XCircle size={24}/> : <AlertTriangle size={24}/>}
                      </div>
                      <div>
                        <h5 className="font-black text-sm text-slate-100">{v.title}</h5>
                        <p className="text-xs text-slate-500 font-medium">{v.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemediate(v)}
                      className="bg-white/5 hover:bg-cyan-500 hover:text-black px-6 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all"
                    >
                      FIX NOW
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-[3rem]">
              <Shield size={64} className="text-slate-800 mb-4 animate-pulse" />
              <p className="text-xs font-black text-slate-600 uppercase tracking-[0.3em]">System Standby - Select Node</p>
            </div>
          )}
        </div>
      </div>

      {/* Unauthorized Device Alert Panel */}
      {newDevices.length > 0 && (
        <div className="fixed bottom-8 right-8 bg-red-950 border border-red-500 p-8 rounded-[2.5rem] shadow-2xl shadow-red-900/40 max-w-sm z-50 animate-bounce-subtle">
          <div className="flex items-center gap-3 mb-6 text-red-500">
            <AlertTriangle size={28} className="animate-pulse" />
            <h3 className="font-black text-sm uppercase tracking-widest">Intrusion Alert</h3>
          </div>
          <div className="space-y-4">
            {newDevices.map((d, i) => (
              <div key={i} className="bg-black/40 p-5 rounded-2xl border border-red-900/30">
                <div className="text-xs font-mono text-red-400 font-bold mb-1">{d.ip}</div>
                <div className="text-[10px] text-slate-500 font-mono">{d.mac || 'MAC unknown'}</div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      // Block logic (tum yahan actual block API call daal sakte ho)
                      alert(`Blocked: ${d.ip}`);
                      setNewDevices(prev => prev.filter(item => item.ip !== d.ip));
                    }}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-[9px] font-black py-2 rounded-lg transition-all"
                  >
                    ISOLATE
                  </button>
                  <button
                    onClick={() => {
                      // Approve / Add to baseline
                      alert(`Approved: ${d.ip}`);
                      setNewDevices(prev => prev.filter(item => item.ip !== d.ip));
                    }}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-[9px] font-black py-2 rounded-lg transition-all"
                  >
                    APPROVE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;