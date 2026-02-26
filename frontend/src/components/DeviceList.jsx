import React, { useState, useEffect } from 'react';
import { Network, Wifi, Check, X, RefreshCw } from 'lucide-react';
import { getLiveStats } from '@/services/api';

export const DeviceList = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const data = await getLiveStats('127.0.0.1');
      setStats(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  // Always show localhost as main device
  const localDevice = {
    id: 1,
    ip: '127.0.0.1',
    mac: '00:00:00:00:00:00',
    status: 'online',
    lastSeen: 'Now',
    cpu: stats ? Math.round(stats.cpu_percent) : null,
    ram: stats ? Math.round(stats.ram_percent) : null,
    disk: stats ? Math.round(stats.disk_percent) : null,
  };

  return (
    <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-lg p-6 backdrop-blur">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Network className="w-5 h-5 text-cyan-400" />
          <h3 className="text-cyan-400 font-semibold text-sm uppercase tracking-wide">
            Local Device
          </h3>
        </div>
        {loading && <RefreshCw className="w-3 h-3 text-slate-500 animate-spin" />}
      </div>

      <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-green-400" />
            <span className="text-white font-semibold text-sm">{localDevice.ip}</span>
          </div>
          <Check className="w-4 h-4 text-green-400" />
        </div>

        <div className="text-xs text-slate-400 space-y-1">
          <p className="font-mono">{localDevice.mac}</p>
          <p>Last seen: {localDevice.lastSeen}</p>
        </div>

        {/* Live Stats Mini */}
        {stats && (
          <div className="mt-3 pt-3 border-t border-slate-700/30 grid grid-cols-3 gap-2 text-xs">
            {[
              { label: 'CPU', value: localDevice.cpu, danger: localDevice.cpu > 85 },
              { label: 'RAM', value: localDevice.ram, danger: localDevice.ram > 90 },
              { label: 'DISK', value: localDevice.disk, danger: localDevice.disk > 80 },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-slate-500 text-xs">{s.label}</p>
                <p className={`font-bold text-sm ${s.danger ? 'text-red-400' : 'text-green-400'}`}>
                  {s.value}%
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceList;