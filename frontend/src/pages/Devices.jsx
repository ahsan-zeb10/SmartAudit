import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Network, Play, Trash2, Plus, Search, AlertTriangle, RefreshCw } from 'lucide-react';
import { discoverDevices, startScan } from '@/services/api';

const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [networkRange, setNetworkRange] = useState('192.168.1.0/24');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [scanningDevice, setScanningDevice] = useState(null);
  const [error, setError] = useState(null);
  const [newDevices, setNewDevices] = useState([]);

  const toggleDeviceSelection = (id) => {
    setSelectedDevices((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleDiscover = async () => {
    setIsDiscovering(true);
    setError(null);
    try {
      const result = await discoverDevices(networkRange);
      // Backend returns: { devices, all_results, new_devices }
      const discovered = result.devices || [];
      const allResults = result.all_results || {};
      const newFound = result.new_devices || [];

      // Map devices with their audit results
      const mappedDevices = discovered.map((d, i) => {
        const auditResult = allResults[d.ip];
        return {
          id: i + 1,
          ip: d.ip,
          mac: d.mac || 'N/A',
          hostname: d.hostname || d.ip,
          vendor: d.vendor || 'Unknown',
          status: d.status === 'Online' ? 'online' : 'offline',
          violations: auditResult?.violations?.length || 0,
          score: auditResult?.compliance_score || 100,
          lastSeen: 'Just now',
        };
      });

      setDevices(mappedDevices);
      setNewDevices(newFound.map(d => d.ip));
    } catch (err) {
      setError('Discovery failed. Make sure the backend is running and Nmap is installed.');
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleScan = async (deviceIp) => {
    setScanningDevice(deviceIp);
    try {
      await startScan(deviceIp);
      // Refresh discovery after scan
      await new Promise(res => setTimeout(res, 3000));
      await handleDiscover();
    } catch (err) {
      setError(`Scan failed for ${deviceIp}`);
    } finally {
      setScanningDevice(null);
    }
  };

  const handleDelete = (id) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    setSelectedDevices((prev) => prev.filter((d) => d !== id));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Discovered Devices</h2>
            <p className="text-xs text-slate-400">
              Manage and monitor all devices on your network
            </p>
          </div>
        </div>

        {/* Discovery Panel */}
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-lg p-6 backdrop-blur">
          <h3 className="text-cyan-400 font-semibold text-sm mb-4 uppercase tracking-wide flex items-center gap-2">
            <Search className="w-4 h-4" /> Network Discovery
          </h3>
          <div className="flex gap-4">
            <input
              type="text"
              value={networkRange}
              onChange={(e) => setNetworkRange(e.target.value)}
              placeholder="192.168.1.0/24"
              className="flex-1 bg-slate-800/50 border border-slate-700 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500 text-sm"
            />
            <button
              onClick={handleDiscover}
              disabled={isDiscovering}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50"
            >
              {isDiscovering
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Discovering...</>
                : <><Plus className="w-4 h-4" /> Discover Network</>
              }
            </button>
          </div>
          {isDiscovering && (
            <p className="text-slate-400 text-xs mt-3 animate-pulse">
              🔍 Scanning {networkRange} with Nmap... This may take a minute.
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-900/30 border border-red-700/50 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* New Devices Alert */}
        {newDevices.length > 0 && (
          <div className="flex items-center gap-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <p className="text-yellow-300 text-sm">
              ⚠️ {newDevices.length} new/unapproved device(s) found: {newDevices.join(', ')}
            </p>
          </div>
        )}

        {/* Devices List */}
        <div className="space-y-4">
          {devices.map((device) => (
            <div
              key={device.id}
              className={`bg-gradient-to-br from-slate-900/80 to-slate-800/40 border rounded-lg p-6 backdrop-blur hover:border-slate-600/50 transition-all ${
                newDevices.includes(device.ip) ? 'border-yellow-700/50' : 'border-slate-700/50'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedDevices.includes(device.id)}
                  onChange={() => toggleDeviceSelection(device.id)}
                  className="w-5 h-5 rounded border-slate-600 text-cyan-500 cursor-pointer"
                />

                {/* Device Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-white font-bold text-lg">{device.hostname}</h3>
                    {newDevices.includes(device.ip) && (
                      <span className="px-2 py-0.5 bg-yellow-900/50 text-yellow-400 border border-yellow-700/50 rounded text-xs font-bold">NEW</span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-4 mt-2">
                    <div>
                      <p className="text-slate-500 text-xs">IP Address</p>
                      <p className="text-white font-mono text-sm">{device.ip}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">MAC Address</p>
                      <p className="text-white font-mono text-sm">{device.mac}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Vendor</p>
                      <p className="text-white text-sm">{device.vendor}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Status</p>
                      <p className={`text-sm font-semibold ${device.status === 'online' ? 'text-green-400' : 'text-slate-500'}`}>
                        {device.status === 'online' ? '🟢 Online' : '🔴 Offline'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="text-slate-500 text-xs">Violations</p>
                      <p className={`font-bold ${device.violations > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {device.violations}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Health Score</p>
                      <p className={`font-bold ${
                        device.score >= 70 ? 'text-green-400' :
                        device.score >= 50 ? 'text-yellow-400' : 'text-red-400'
                      }`}>{device.score}%</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleScan(device.ip)}
                    disabled={scanningDevice === device.ip}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50"
                  >
                    {scanningDevice === device.ip
                      ? <RefreshCw className="w-4 h-4 animate-spin" />
                      : <Play className="w-4 h-4" />
                    }
                    {scanningDevice === device.ip ? 'Scanning...' : 'Scan'}
                  </button>
                  <button
                    onClick={() => handleDelete(device.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-red-500/50 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {devices.length === 0 && !isDiscovering && (
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-lg p-12 backdrop-blur text-center">
            <Network className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">No devices discovered yet</p>
            <p className="text-slate-500 text-sm">Enter a network range above and click "Discover Network"</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Devices;