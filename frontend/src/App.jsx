import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, AlertTriangle, Activity, Search, FileText, Network, RefreshCcw, Download, Zap, CheckCircle } from 'lucide-react';

function App() {
  const [loading, setLoading] = useState(false);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [form, setForm] = useState({ host: '127.0.0.1' });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [networkRange, setNetworkRange] = useState("192.168.1.1/24");
  const [lastNotification, setLastNotification] = useState(""); 

  const handleScan = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setLastNotification("Initiating Compliance Audit...");
    try {
      await axios.post('http://127.0.0.1:8000/scan', form);
      const res = await axios.get('http://127.0.0.1:8000/latest-audit');
      setResults(res.data);
      setAutoRefresh(true);
    } catch (err) { setLastNotification("Connection Error"); }
    setLoading(false);
  };

  const handleRemediate = async (vText) => {
    setLastNotification(`Fixing: ${vText.substring(0,20)}...`);
    try {
      const res = await axios.post('http://127.0.0.1:8000/remediate', {
        violation: vText,
        host: results.host
      });
      alert(res.data.message);
      // Data will auto-refresh due to the loop
    } catch (err) { alert("Remediation Failed"); }
  };

  const handleDiscovery = async () => {
    setDiscoveryLoading(true);
    try {
      const res = await axios.post('http://127.0.0.1:8000/discover', { range: networkRange });
      setResults(prev => ({ ...prev, assets: res.data.devices }));
    } catch (err) { setLastNotification("Discovery Failed"); }
    setDiscoveryLoading(false);
  };

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get('http://127.0.0.1:8000/latest-audit');
          setResults(prev => ({ ...res.data, assets: res.data.assets?.length > 0 ? res.data.assets : prev?.assets }));
        } catch (e) { console.log("Refresh Error"); }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getSeverityStyle = (text) => {
    const val = text.toUpperCase();
    if (val.includes("CRITICAL") || val.includes("445")) return "text-red-500 border-red-900/50 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]";
    if (val.includes("HIGH") || val.includes("LOW DISK")) return "text-orange-400 border-orange-900/50 bg-orange-950/20";
    return "text-blue-400 border-blue-900/50 bg-blue-950/20";
  };

  const getScoreColor = (score) => {
    const s = score ?? 100;
    if (s >= 80) return "text-green-500 border-green-500/30 bg-green-500/5";
    if (s >= 50) return "text-yellow-500 border-yellow-500/30 bg-yellow-500/5";
    return "text-red-500 border-red-500/40 bg-red-500/10 shadow-[inset_0_0_20px_rgba(239,68,68,0.1)]";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <Shield size={42} className="text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">PREMISE <span className="text-blue-600">v2.0</span></h1>
        </div>
        {lastNotification && <div className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-6 py-2 rounded-full text-[10px] font-bold uppercase animate-pulse">{lastNotification}</div>}
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl">
            <h2 className="text-sm font-black mb-6 flex items-center gap-2 text-blue-500 uppercase tracking-widest"><Zap size={18}/> Audit Control</h2>
            <form onSubmit={handleScan} className="space-y-4">
              <input type="text" value={form.host} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" onChange={e => setForm({...form, host: e.target.value})} />
              <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all uppercase text-xs tracking-wider">
                {loading ? <RefreshCcw className="animate-spin" size={18}/> : <Search size={18}/>} RUN AUDIT
              </button>
            </form>
          </div>

          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl">
            <h2 className="text-sm font-black mb-6 flex items-center gap-2 text-purple-500 uppercase tracking-widest"><Network size={18}/> Discovery</h2>
            <input type="text" value={networkRange} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none text-sm font-mono text-purple-400 mb-4" onChange={e => setNetworkRange(e.target.value)} />
            <button onClick={handleDiscovery} disabled={discoveryLoading} className="w-full bg-purple-600 hover:bg-purple-700 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 uppercase text-xs tracking-wider">
              {discoveryLoading ? <RefreshCcw className="animate-spin" size={18}/> : <Activity size={18}/>} DISCOVER
            </button>
          </div>

          <button onClick={() => window.open('http://127.0.0.1:8000/download-report')} className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700 py-4 rounded-3xl font-bold flex items-center justify-center gap-2 text-slate-300 transition-all uppercase text-xs">
            <Download size={18} className="text-green-500" /> DOWNLOAD PDF REPORT
          </button>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {!results ? (
            <div className="h-full min-h-[400px] border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-600">
              <Shield size={64} className="opacity-10 mb-4" />
              <p className="font-bold tracking-widest text-[10px] uppercase">Initialize Audit to Begin</p>
            </div>
          ) : (
            <>
              <div className={`p-10 rounded-3xl border-2 flex flex-col items-center justify-center transition-all duration-500 ${getScoreColor(results?.compliance_score)}`}>
                  <p className="text-[10px] font-black tracking-[0.4em] uppercase mb-4 opacity-60">Compliance Score</p>
                  <h2 className="text-8xl font-black tracking-tighter tabular-nums">{results?.compliance_score}%</h2>
              </div>

              <div className="bg-gradient-to-br from-blue-900/20 to-slate-900/50 p-6 rounded-3xl border border-blue-500/30">
                <h3 className="flex items-center gap-2 font-black text-blue-400 mb-4 uppercase text-[10px] tracking-[0.2em]"><FileText size={14}/> AI Remediation Guide</h3>
                <div className="text-slate-300 text-sm leading-relaxed italic bg-slate-950/60 p-5 rounded-2xl border border-slate-800/50 font-medium">"{results?.ai_analysis}"</div>
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-2">Risks & Violations</h3>
                {results.violations.map((v, i) => (
                  <div key={i} className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:bg-slate-800/40 ${getSeverityStyle(v)}`}>
                    <div className="flex gap-4 items-start flex-1">
                      <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                      <span className="text-sm font-bold">{v}</span>
                    </div>
                    <button onClick={() => handleRemediate(v)} className="shrink-0 bg-white/10 hover:bg-white/20 text-[10px] font-black px-4 py-2 rounded-xl border border-white/10 uppercase tracking-widest transition-all active:scale-95">
                      Fix Now
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;