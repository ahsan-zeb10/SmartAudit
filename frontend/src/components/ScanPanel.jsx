import React, { useState } from 'react';
import { Zap, Play, RefreshCw, Target } from 'lucide-react';
import { startScan, discoverDevices } from '@/services/api';

export const ScanPanel = ({ onScanComplete, onDevicesDiscovered }) => {
  const [targetIP, setTargetIP] = useState('127.0.0.1');
  const [isScanning, setIsScanning] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [networkRange, setNetworkRange] = useState('192.168.1.0/24');
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('info');

  const handleScan = async () => {
    const target = targetIP.trim() || '127.0.0.1';
    setIsScanning(true);
    setStatus(`Scanning ${target}...`);
    setStatusType('info');
    try {
      await startScan(target);
      await new Promise(res => setTimeout(res, 4000));
      setStatus(`Scan complete for ${target}`);
      setStatusType('success');
      if (onScanComplete) onScanComplete(target);
    } catch (err) {
      setStatus('Scan failed. Check backend.');
      setStatusType('error');
    } finally {
      setIsScanning(false);
      setTimeout(() => setStatus(''), 4000);
    }
  };

  const handleDiscovery = async () => {
    setIsDiscovering(true);
    setStatus(`Discovering ${networkRange}...`);
    setStatusType('info');
    try {
      const result = await discoverDevices(networkRange);
      setStatus(`Found ${result.devices?.length || 0} devices`);
      setStatusType('success');
      if (onDevicesDiscovered) onDevicesDiscovered(result);
    } catch (err) {
      setStatus('Discovery failed. Check backend.');
      setStatusType('error');
    } finally {
      setIsDiscovering(false);
      setTimeout(() => setStatus(''), 4000);
    }
  };

  const statusColors = { info: 'text-cyan-400', success: 'text-green-400', error: 'text-red-400' };

  return (
    <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-lg p-6 backdrop-blur">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-5 h-5 text-cyan-400" />
          <h3 className="text-cyan-400 font-semibold text-sm uppercase tracking-wide">Audit Engine</h3>
        </div>

        {/* Custom IP Input */}
        <div className="flex items-center gap-2 mb-3 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2">
          <Target className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <input
            type="text"
            value={targetIP}
            onChange={(e) => setTargetIP(e.target.value)}
            placeholder="Enter IP (e.g. 127.0.0.1)"
            className="bg-transparent text-white text-sm flex-1 focus:outline-none placeholder-slate-500"
            onKeyDown={(e) => e.key === 'Enter' && !isScanning && handleScan()}
          />
        </div>

        <button
          onClick={handleScan}
          disabled={isScanning || isDiscovering}
          className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-bold py-3 rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 ${isScanning ? 'animate-pulse' : ''}`}
        >
          {isScanning
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Scanning...</>
            : <><Play className="w-4 h-4" /> Run Audit</>}
        </button>
      </div>

      <div className="border-t border-slate-700/50 my-6"></div>

      <div>
        <h4 className="text-slate-400 text-xs font-semibold mb-4 uppercase tracking-wider">Network Discovery</h4>
        <input
          type="text"
          value={networkRange}
          onChange={(e) => setNetworkRange(e.target.value)}
          className="w-full bg-slate-800/50 border border-slate-700/50 rounded px-3 py-2 text-white text-xs mb-4 focus:outline-none focus:border-cyan-500/50"
          placeholder="192.168.1.0/24"
        />
        <button
          onClick={handleDiscovery}
          disabled={isScanning || isDiscovering}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold py-2 rounded-lg text-xs hover:shadow-lg hover:shadow-purple-500/50 transition-all uppercase tracking-wider disabled:opacity-50"
        >
          {isDiscovering ? 'Discovering...' : 'Discover & Audit All'}
        </button>
      </div>

      {status && (
        <p className={`text-xs mt-4 text-center ${statusColors[statusType]} ${statusType === 'info' ? 'animate-pulse' : ''}`}>
          {status}
        </p>
      )}
    </div>
  );
};

export default ScanPanel;