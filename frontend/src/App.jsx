import React, { useState } from 'react';
import axios from 'axios';
import { Shield, AlertTriangle, Activity, Search, FileText, Network, RefreshCcw, Zap, Monitor, BarChart3, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';



function App() {

  const [loading, setLoading] = useState(false);

  const [discoveryLoading, setDiscoveryLoading] = useState(false);

  const [results, setResults] = useState({

    host: '127.0.0.1',

    violations: [],

    risk_distribution: { Critical: 0, High: 0, Low: 0 },

    assets: [],

    ai_analysis: "System ready...",

    compliance_score: 100

  });

  const [form, setForm] = useState({ host: '127.0.0.1' });

  const [networkRange, setNetworkRange] = useState("192.168.1.1/24");

  const [lastNotification, setLastNotification] = useState("");



  const handleScan = async (e) => {

    if (e) e.preventDefault();

    setLoading(true);

    setLastNotification("Audit Initiated...");

    try {

      await axios.post('http://127.0.0.1:8000/scan', form);

      const update = await axios.get('http://127.0.0.1:8000/latest-audit');

      setResults(prev => ({

        ...update.data,

        assets: prev.assets || [],

        violations: Array.isArray(update.data.violations) ? update.data.violations : []

      }));

    } catch (err) { setLastNotification("Scan Error"); }

    setLoading(false);

  };



  const handleDiscovery = async () => {

    setDiscoveryLoading(true);

    setLastNotification("Scanning Network...");

    try {

      const res = await axios.post('http://127.0.0.1:8000/discover', { range: networkRange });

      const incomingDevices = res.data?.devices || [];

      setResults(prev => ({ ...prev, assets: incomingDevices }));

      setLastNotification(`Found ${incomingDevices.length} Devices`);

    } catch (err) { setLastNotification("Discovery Failed"); }

    setDiscoveryLoading(false);

  };



  const handleRemediate = async (vText) => {

    setLastNotification("Applying Fix...");

    try {

      const res = await axios.post('http://127.0.0.1:8000/remediate', { violation: vText, host: results.host });

      alert(res.data.message);

      const update = await axios.get('http://127.0.0.1:8000/latest-audit');

      setResults(prev => ({ ...update.data, assets: prev.assets || [] }));

    } catch (err) { alert("Fix Failed"); }

  };



  // --- DATA LOGIC: Score aur Graph Sync ---

  const getChartData = () => {

    const counts = { Critical: 0, High: 0, Low: 0 };

    results.violations.forEach(v => {

      const text = v.toUpperCase();

      if (text.includes("CRITICAL") || text.includes("445")) counts.Critical++;

      else if (text.includes("HIGH") || text.includes("DISK")) counts.High++;

      else counts.Low++;

    });

    return [

      { name: 'Critical', count: counts.Critical, color: '#ef4444' },

      { name: 'High', count: counts.High, color: '#f97316' },

      { name: 'Low', count: counts.Low, color: '#06b6d4' }

    ];

  };



  const chartData = getChartData();



  const getSeverityStyle = (text) => {

    const val = String(text || "").toUpperCase();

    if (val.includes("CRITICAL") || val.includes("445")) return "text-red-500 border-red-900/50 bg-red-950/20";

    if (val.includes("HIGH") || val.includes("DISK")) return "text-cyan-400 border-cyan-900/50 bg-cyan-950/20";

    return "text-blue-400 border-blue-900/50 bg-blue-950/20";

  };



  return (

    <div className="min-h-screen bg-[#030712] text-slate-100 p-4 md:p-8 font-sans">

      <div className="max-w-6xl mx-auto flex justify-between items-center mb-10 border-b border-slate-800 pb-6">

        <div className="flex items-center gap-3">

          <div className="bg-cyan-500 p-2 rounded-lg"><Shield size={32} className="text-black" /></div>

          <div>

            <h1 className="text-2xl font-black uppercase tracking-tighter">TECHIFY <span className="text-cyan-500">SOLUTIONS</span></h1>

            <p className="text-[10px] font-bold text-slate-500 tracking-[0.3em]">INFRASTRUCTURE V2.0</p>

          </div>

        </div>

        {lastNotification && <div className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-6 py-2 rounded-full text-[10px] font-bold animate-pulse">{lastNotification}</div>}

      </div>



      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Side: Controls */}

        <div className="space-y-6">

          <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-2xl">

            <h2 className="text-sm font-black mb-6 flex items-center gap-2 text-cyan-500 uppercase tracking-widest"><Zap size={18} /> Audit Engine</h2>

            <form onSubmit={handleScan} className="space-y-4">

              <input type="text" value={form.host} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none text-sm font-mono text-cyan-400" onChange={e => setForm({ ...form, host: e.target.value })} />

              <button disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-500 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all uppercase text-xs text-black">

                {loading ? <RefreshCcw className="animate-spin" size={18} /> : <Search size={18} />} RUN AUDIT

              </button>

            </form>

          </div>



          <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-2xl">

            <h2 className="text-sm font-black mb-6 flex items-center gap-2 text-purple-500 uppercase tracking-widest"><Network size={18} /> Discovery</h2>

            <input type="text" value={networkRange} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none text-sm font-mono text-purple-400 mb-4" onChange={e => setNetworkRange(e.target.value)} />

            <button onClick={handleDiscovery} disabled={discoveryLoading} className="w-full bg-purple-600 hover:bg-purple-700 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 uppercase text-xs text-white">

              {discoveryLoading ? <RefreshCcw className="animate-spin" size={18} /> : <Activity size={18} />} DISCOVER

            </button>

          </div>



          {results.assets.length > 0 && (

            <div className="bg-slate-900/30 p-5 rounded-3xl border border-slate-800">

              <h3 className="text-[10px] font-black text-slate-500 uppercase mb-4 flex items-center gap-2 tracking-widest"><Monitor size={14} /> Online Devices</h3>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-2 font-mono">

                {results.assets.map((asset, idx) => (

                  <div key={idx} className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-[11px] text-cyan-500/80 flex justify-between font-bold cursor-pointer hover:bg-slate-800 transition-all" onClick={() => setForm({ host: asset })}>

                    <span>{typeof asset === 'string' ? asset : JSON.stringify(asset)}</span>

                    <span className="text-[9px] text-emerald-500 animate-pulse">ONLINE</span>

                  </div>

                ))}

              </div>

            </div>

          )}

        </div>



        {/* Right Side: Score & Chart */}

        <div className="lg:col-span-2 space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

            {/* SCORE CARD */}

            <div className="md:col-span-1 bg-slate-900/80 p-6 rounded-3xl border border-slate-800 flex flex-col items-center justify-center shadow-xl">

              <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Health Score</p>

              <h2 className={`text-4xl font-black ${results.compliance_score > 70 ? 'text-emerald-500' : 'text-red-500'}`}>

                {results.compliance_score}%

              </h2>

              <div className="mt-2 text-[8px] font-bold text-slate-400 flex items-center gap-1 uppercase">

                <CheckCircle size={10} className="text-emerald-500" /> Secure Path

              </div>

            </div>



            {/* CHART CARD */}

            <div className="md:col-span-3 bg-slate-900/80 p-6 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-xl">

              <div className="flex justify-between items-center mb-4">

                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><BarChart3 size={16} /> Threat Analysis</h3>

                <span className="text-[10px] text-slate-400 font-mono">Host: {results.host}</span>

              </div>

              <div className="h-48 w-full">

                <ResponsiveContainer width="100%" height="100%">

                  <BarChart data={chartData}>

                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.3} />

                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />

                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} />

                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '10px' }} />

                    <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>

                      {chartData.map((entry, index) => (

                        <Cell key={index} fill={entry.color} />

                      ))}

                    </Bar>

                  </BarChart>

                </ResponsiveContainer>

              </div>

            </div>

          </div>



          <div className="bg-gradient-to-br from-cyan-900/20 to-slate-900/50 p-6 rounded-3xl border border-cyan-500/30">

            <h3 className="flex items-center gap-2 font-black text-cyan-400 mb-2 uppercase text-[10px] tracking-widest"><FileText size={14} /> AI Insight</h3>

            <div className="text-slate-300 text-sm italic">

              "{results.ai_analysis}"

            </div>

          </div>



          <div className="space-y-3">

            {results.violations.map((v, i) => (

              <div key={i} className={`p-4 rounded-2xl border flex justify-between items-center transition-all hover:scale-[1.01] shadow-md ${getSeverityStyle(v)}`}>

                <div className="flex gap-4 items-center">

                  <AlertTriangle size={20} />

                  <span className="text-sm font-bold">{v}</span>

                </div>

                <button onClick={() => handleRemediate(v)} className="bg-white/10 hover:bg-white/20 text-[10px] font-black px-5 py-2.5 rounded-xl border border-white/10 uppercase tracking-widest transition-all">Fix</button>

              </div>

            ))}

          </div>

        </div>

      </div>

    </div>

  );

}



export default App;

