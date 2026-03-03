import React, { useState, useEffect, useRef } from 'react';
import { Zap, Play, RefreshCw, Target, Shield, Activity } from 'lucide-react';
import { startScan, discoverDevices, getScanProgress, getOpenvasStatus } from '@/services/api';

export const ScanPanel = ({ onScanComplete, onDevicesDiscovered }) => {
  const [targetIP, setTargetIP]       = useState('127.0.0.1');
  const [networkRange, setNetworkRange] = useState('192.168.1.0/24');
  const [isScanning, setIsScanning]   = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [status, setStatus]           = useState('');
  const [statusType, setStatusType]   = useState('info');
  const [progress, setProgress]       = useState(0);
  const [scanEngine, setScanEngine]   = useState('Nmap');
  const [openvasOn, setOpenvasOn]     = useState(false);
  const pollRef = useRef(null);

  // Check OpenVAS status on mount
  useEffect(() => {
    getOpenvasStatus()
      .then(d => {
        setOpenvasOn(d.config?.enabled || false);
        setScanEngine(d.config?.enabled ? `${d.config.scan_mode === 'combined' ? 'Nmap+OpenVAS' : 'OpenVAS'}` : 'Nmap');
      })
      .catch(() => {});
  }, []);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const startProgressPolling = (host, onDone) => {
    stopPolling();
    setProgress(5);
    pollRef.current = setInterval(async () => {
      try {
        const info = await getScanProgress(host);
        setProgress(info.progress || 0);
        setStatus(`${info.engine || 'Scanning'}: ${info.status} ${info.progress ? `(${info.progress}%)` : ''}...`);
        if (info.status === 'Done' || info.status === 'Error') {
          stopPolling();
          setProgress(100);
          if (onDone) onDone(info);
        }
      } catch {}
    }, 5000);
  };

  const handleScan = async () => {
    const target = targetIP.trim() || '127.0.0.1';
    setIsScanning(true);
    setProgress(0);
    setStatus(`Starting ${scanEngine} scan for ${target}...`);
    setStatusType('info');
    try {
      const res = await startScan(target);
      const isOpenVAS = openvasOn;
      if (isOpenVAS) {
        // OpenVAS takes minutes — poll progress
        setStatus(`${res.engine || 'OpenVAS'} scan running... (may take 5-30 min)`);
        startProgressPolling(target, async () => {
          setStatus(`✅ Scan complete for ${target}`);
          setStatusType('success');
          setIsScanning(false);
          setProgress(0);
          if (onScanComplete) onScanComplete(target);
        });
      } else {
        // Nmap is fast — wait 4s then refresh
        await new Promise(r => setTimeout(r, 4000));
        setStatus(`✅ Nmap scan complete for ${target}`);
        setStatusType('success');
        setIsScanning(false);
        setProgress(0);
        if (onScanComplete) onScanComplete(target);
      }
    } catch {
      setStatus('❌ Scan failed. Check backend.');
      setStatusType('error');
      setIsScanning(false);
      stopPolling();
    }
  };

const handleDiscovery = async () => {
  console.log("DISCOVER BUTTON CLICKED! Range:", networkRange);
  console.log("Sending POST to /discover...")
  const trimmedRange = networkRange.trim();
  console.log("[FRONTEND] Discover clicked with range:", trimmedRange);
  
  if (!trimmedRange) {
    setStatus("Please enter a valid network range");
    setStatusType("error");
    return;
  }

  setIsDiscovering(true);
  setStatus(`Discovering ${trimmedRange}...`);
  setStatusType("info");

  try {
    const result = await discoverDevices(trimmedRange);
    console.log("[FRONTEND] Discovery response:", result);
    
    setStatus(`Found ${result.devices?.length || 0} devices`);
    setStatusType("success");
    
    if (onDevicesDiscovered) onDevicesDiscovered(result);
  } catch (err) {
    console.error("[FRONTEND ERROR]", err);
    setStatus("Discovery failed. Check console and backend logs.");
    setStatusType("error");
  } finally {
    setIsDiscovering(false);
  }
};

  useEffect(() => () => stopPolling(), []);

  const statusColor = { info: 'text-cyan-400', success: 'text-green-400', error: 'text-red-400' }[statusType];

  return (
    <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-lg p-5 backdrop-blur">

      {/* Engine Badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <h3 className="text-cyan-400 font-semibold text-xs uppercase tracking-wide">Scan Engine</h3>
        </div>
        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold border ${
          openvasOn
            ? 'bg-green-900/30 border-green-700/40 text-green-400'
            : 'bg-blue-900/30 border-blue-700/40 text-blue-400'
        }`}>
          {openvasOn ? <><Shield className="w-3 h-3" /> {scanEngine}</> : <><Activity className="w-3 h-3" /> Nmap</>}
        </span>
      </div>

      {/* Target IP */}
      <div className="flex items-center gap-2 mb-3 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2">
        <Target className="w-4 h-4 text-cyan-400 flex-shrink-0" />
        <input
          type="text"
          value={targetIP}
          onChange={e => setTargetIP(e.target.value)}
          placeholder="Enter IP (e.g. 127.0.0.1)"
          className="bg-transparent text-white text-sm flex-1 focus:outline-none placeholder-slate-500"
          onKeyDown={e => e.key === 'Enter' && !isScanning && handleScan()}
        />
      </div>

      {/* Progress Bar — only when scanning */}
      {isScanning && progress > 0 && (
        <div className="mb-3">
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-green-400 rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-slate-500 text-xs mt-1 text-right">{progress}%</p>
        </div>
      )}

      {/* Run Scan Button */}
      <button
        onClick={handleScan}
        disabled={isScanning || isDiscovering}
        className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-bold py-3 rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 mb-4 ${isScanning ? 'animate-pulse' : ''}`}
      >
        {isScanning
          ? <><RefreshCw className="w-4 h-4 animate-spin" /> {openvasOn ? 'OpenVAS Scanning...' : 'Scanning...'}</>
          : <><Play className="w-4 h-4" /> Run Audit</>}
      </button>

      <div className="border-t border-slate-700/50 mb-4" />

      {/* Network Discovery */}
      <h4 className="text-slate-400 text-xs font-semibold mb-3 uppercase tracking-wider">Network Discovery</h4>
      <input
        type="text"
        value={networkRange}
        onChange={e => setNetworkRange(e.target.value)}
        className="w-full bg-slate-800/50 border border-slate-700/50 rounded px-3 py-2 text-white text-xs mb-3 focus:outline-none focus:border-cyan-500/50"
        placeholder="192.168.1.0/24"
      />
      <button
        onClick={handleDiscovery}
        disabled={isScanning || isDiscovering}
        className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold py-2 rounded-lg text-xs hover:shadow-lg hover:shadow-purple-500/50 transition-all uppercase tracking-wider disabled:opacity-50"
      >
        {isDiscovering ? 'Discovering...' : 'Discover & Audit All'}
      </button>

      {/* Status */}
      {status && (
        <p className={`text-xs mt-3 text-center ${statusColor} ${statusType === 'info' ? 'animate-pulse' : ''}`}>
          {status}
        </p>
      )}

      {/* OpenVAS settings link hint */}
      {!openvasOn && (
        <p className="text-xs text-slate-600 text-center mt-3">
          💡 <span className="underline cursor-pointer" onClick={() => window.location.hash = '#settings'}>Enable OpenVAS</span> for deep CVE scanning
        </p>
      )}
    </div>
  );
};

export default ScanPanel;