import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Zap, Play, Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import { VulnerabilityCard } from '@/components/VulnerabilityCard';
import { startScan, getLatestAudit } from '@/services/api';

const ScanEngine = () => {
  const [selectedDevice, setSelectedDevice] = useState('127.0.0.1');
  const [customHost, setCustomHost] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);

  const presetDevices = ['127.0.0.1', '192.168.1.1', '192.168.1.5'];

  const handleScan = async () => {
    const target = customHost.trim() || selectedDevice;
    setIsScanning(true);
    setError(null);
    setScanResult(null);

    try {
      // Trigger the scan
      await startScan(target);

      // Poll for result - backend scans in background so wait a bit
      await new Promise(res => setTimeout(res, 4000));
      const result = await getLatestAudit();
      setScanResult(result);
    } catch (err) {
      setError('Scan failed. Make sure the backend is running on port 8000.');
    } finally {
      setIsScanning(false);
    }
  };

  const violations = scanResult?.violations || [];
  const aiAnalysis = scanResult?.ai_analysis;
  const score = scanResult?.compliance_score;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold text-white">Scan Engine</h2>
          <p className="text-xs text-slate-400">
            Run detailed security scans on your infrastructure
          </p>
        </div>

        {/* Device Selector */}
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-lg p-6 backdrop-blur">
          <h3 className="text-cyan-400 font-semibold text-sm mb-4 uppercase tracking-wide">
            Select Target Device
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {presetDevices.map((ip) => (
              <button
                key={ip}
                onClick={() => { setSelectedDevice(ip); setCustomHost(''); }}
                className={`p-4 rounded-lg font-semibold transition-all ${
                  selectedDevice === ip && !customHost
                    ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black'
                    : 'bg-slate-800/50 text-white border border-slate-700 hover:border-slate-600'
                }`}
              >
                {ip}
              </button>
            ))}
          </div>
          <div>
            <label className="text-slate-400 text-xs font-semibold block mb-2">Or enter custom IP:</label>
            <input
              type="text"
              placeholder="e.g. 192.168.1.100"
              value={customHost}
              onChange={(e) => setCustomHost(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500 text-sm"
            />
          </div>
        </div>

        {/* Scan Controls */}
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-lg p-6 backdrop-blur">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-semibold text-lg">Current Target</h3>
              <p className="text-cyan-400 text-2xl font-bold mt-2">
                {customHost.trim() || selectedDevice}
              </p>
              {scanResult && (
                <p className="text-slate-400 text-sm mt-1">
                  Compliance Score: <span className={`font-bold ${score >= 70 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{score}%</span>
                </p>
              )}
            </div>
            <button
              onClick={handleScan}
              disabled={isScanning}
              className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-bold rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 ${
                isScanning ? 'animate-pulse' : ''
              }`}
            >
              {isScanning
                ? <><RefreshCw className="w-5 h-5 animate-spin" /> Scanning...</>
                : <><Play className="w-5 h-5" /> Run Scan</>
              }
            </button>
          </div>

          {isScanning && (
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <p className="text-cyan-400 text-sm animate-pulse">🔍 Running Nmap port scan + security checks...</p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-900/30 border border-red-700/50 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Scan Results */}
        {scanResult && (
          <>
            {/* AI Analysis */}
            {aiAnalysis && (
              <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-700/30 rounded-lg p-6 backdrop-blur">
                <h3 className="text-cyan-400 font-semibold text-sm mb-3 uppercase tracking-wide">
                  🤖 AI Analysis
                </h3>
                <p className="text-slate-300 leading-relaxed text-sm">{aiAnalysis}</p>
              </div>
            )}

            {/* Vulnerabilities List */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Detected Violations ({violations.length})
              </h3>
              {violations.length === 0 ? (
                <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-green-700/30 rounded-lg p-8 text-center">
                  <Shield className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-green-400 font-semibold">✅ No violations found. System is secure!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {violations.map((v, i) => (
                    <VulnerabilityCard
                      key={v.id || i}
                      vulnerability={v}
                      index={i}
                      host={customHost.trim() || selectedDevice}
                      onRemediated={handleScan}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ScanEngine;