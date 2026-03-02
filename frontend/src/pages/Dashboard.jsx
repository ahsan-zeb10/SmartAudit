import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ComplianceScore } from '@/components/ComplianceScore';
import { SystemStatsPanel } from '@/components/SystemStats';
import { VulnerabilityCard } from '@/components/VulnerabilityCard';
import { RiskDistributionChart } from '@/components/RiskDistributionChart';
import { ScanPanel } from '@/components/ScanPanel';
import { SummaryCards } from '@/components/SummaryCards';
import { getLatestAudit, getLiveStats, startScan } from '@/services/api';
import {
  AlertTriangle, RefreshCw, Monitor, Wifi, ChevronRight,
  Shield, Network, Cpu, HardDrive, MemoryStick, Laptop,
  Smartphone, Router, Server, Printer, Camera, HelpCircle
} from 'lucide-react';

// ─── Device type icon mapping ────────────────────────────────────────
const DeviceIcon = ({ type = '', className = 'w-4 h-4' }) => {
  const t = type.toLowerCase();
  if (t.includes('android') || t.includes('ios') || t.includes('mobile') || t.includes('phone'))
    return <Smartphone className={className} />;
  if (t.includes('router') || t.includes('switch'))
    return <Router className={className} />;
  if (t.includes('server') || t.includes('linux'))
    return <Server className={className} />;
  if (t.includes('printer'))
    return <Printer className={className} />;
  if (t.includes('camera'))
    return <Camera className={className} />;
  if (t.includes('windows') || t.includes('mac') || t.includes('laptop') || t.includes('pc'))
    return <Laptop className={className} />;
  return <Monitor className={className} />;
};

// ─── OS badge color ───────────────────────────────────────────────────
const osBadgeColor = (osName = '') => {
  const o = osName.toLowerCase();
  if (o.includes('windows')) return 'bg-blue-900/40 text-blue-300 border-blue-700/40';
  if (o.includes('linux') || o.includes('ubuntu') || o.includes('debian'))
    return 'bg-yellow-900/40 text-yellow-300 border-yellow-700/40';
  if (o.includes('android')) return 'bg-green-900/40 text-green-300 border-green-700/40';
  if (o.includes('ios') || o.includes('mac')) return 'bg-slate-700/40 text-slate-300 border-slate-600/40';
  return 'bg-slate-800/40 text-slate-400 border-slate-700/40';
};

const Dashboard = () => {
  const [activeHost, setActiveHost] = useState('127.0.0.1');

  // Per-device cached data: { "ip": { auditData, liveStats, device } }
  const [deviceCache, setDeviceCache] = useState({});

  // Discovered devices list (from /discover or manual scans)
  const [discoveredDevices, setDiscoveredDevices] = useState([
    { ip: '127.0.0.1', hostname: 'localhost', status: 'Online', mac: '00:00:00:00:00:00', vendor: 'Local', os_name: '', device_type: 'Windows PC', device_icon: '🖥️', open_ports: [] }
  ]);

  const [loadingHost, setLoadingHost] = useState(null);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  // ── Fetch and cache data for ONE host ──────────────────────────────
  const fetchDeviceData = useCallback(async (host, silent = false) => {
    if (!silent) setLoadingHost(host);
    setError(null);
    try {
      const [audit, stats] = await Promise.all([
        getLatestAudit(host),
        getLiveStats(host).catch(() => null), // live stats only works for localhost
      ]);
      setDeviceCache(prev => ({
        ...prev,
        [host]: { auditData: audit, liveStats: stats, lastUpdated: new Date() }
      }));
    } catch (err) {
      if (!silent) setError(`Failed to fetch data for ${host}. Make sure backend is running.`);
    } finally {
      if (!silent) setLoadingHost(null);
    }
  }, []);

  // ── Initial load + auto-refresh every 30s for active host ─────────
  useEffect(() => {
    fetchDeviceData(activeHost);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => fetchDeviceData(activeHost, true), 30000);
    return () => clearInterval(intervalRef.current);
  }, [activeHost, fetchDeviceData]);

  // ── Switch to device + fetch its data ─────────────────────────────
  const handleDeviceClick = async (device) => {
    if (device.ip === activeHost) return;
    setActiveHost(device.ip);
    // If not in cache, fetch now (will show loading)
    if (!deviceCache[device.ip]) {
      await fetchDeviceData(device.ip);
    }
  };

  // ── After a scan completes ─────────────────────────────────────────
  const handleScanComplete = async (target) => {
    // Add device to list if missing
    setDiscoveredDevices(prev => {
      if (prev.find(d => d.ip === target)) return prev;
      return [...prev, { ip: target, hostname: target, status: 'Online', mac: 'N/A', vendor: 'N/A', os_name: '', device_type: 'Scanned Device', device_icon: '🖥️', open_ports: [] }];
    });
    setActiveHost(target);
    await fetchDeviceData(target);
  };

  // ── After network discovery ────────────────────────────────────────
  const handleDevicesDiscovered = (result) => {
    const devices = result.devices || [];
    const allResults = result.all_results || {};

    const mapped = devices.map(d => ({
      ip: d.ip,
      hostname: d.hostname || d.ip,
      status: d.status || 'Online',
      mac: d.mac || 'N/A',
      vendor: d.vendor || 'Unknown',
      os_name: d.os_name || '',
      os_accuracy: d.os_accuracy || 0,
      device_type: d.device_type || 'Network Device',
      device_icon: d.device_icon || '❓',
      open_ports: d.open_ports || [],
    }));

    // Merge with existing, keep localhost
    setDiscoveredDevices(prev => {
      const merged = [...prev];
      mapped.forEach(d => {
        const idx = merged.findIndex(x => x.ip === d.ip);
        if (idx >= 0) merged[idx] = { ...merged[idx], ...d };
        else merged.push(d);
      });
      return merged;
    });

    // Cache audit results from discovery
    Object.entries(allResults).forEach(([host, data]) => {
      setDeviceCache(prev => ({
        ...prev,
        [host]: { auditData: data, liveStats: prev[host]?.liveStats || null, lastUpdated: new Date() }
      }));
    });
  };

  // ── Current active device data ──────────────────────────────────────
  const currentCache = deviceCache[activeHost] || {};
  const auditData = currentCache.auditData;
  const liveStats = currentCache.liveStats;
  const isLoading = loadingHost === activeHost;

  const violations = auditData?.violations || [];
  const criticalCount = violations.filter(v => v.severity === 'Critical').length;
  const score = auditData?.compliance_score ?? 100;
  const timestamp = auditData?.timestamp || '';
  const aiAnalysis = auditData?.ai_analysis || '';

  const systemStats = liveStats ? [
    { label: 'CPU', value: Math.round(liveStats.cpu_percent), color: liveStats.cpu_percent > 85 ? 'from-red-500 to-red-400' : 'from-emerald-500 to-teal-400' },
    { label: 'RAM', value: Math.round(liveStats.ram_percent), color: liveStats.ram_percent > 90 ? 'from-red-500 to-red-400' : 'from-lime-500 to-green-400' },
    { label: 'DISK', value: Math.round(liveStats.disk_percent), color: liveStats.disk_percent > 80 ? 'from-orange-600 to-orange-400' : 'from-blue-500 to-blue-400' },
  ] : [];

  const riskData = [
    { name: 'Critical', value: violations.filter(v => v.severity === 'Critical').length, color: '#ff4757' },
    { name: 'High', value: violations.filter(v => v.severity === 'High').length, color: '#ff6348' },
    { name: 'Medium', value: violations.filter(v => v.severity === 'Medium').length, color: '#ffa502' },
    { name: 'Low', value: violations.filter(v => v.severity === 'Low').length, color: '#ffb547' },
  ];

  const activeDeviceInfo = discoveredDevices.find(d => d.ip === activeHost);

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Infrastructure Overview</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                <span className="text-cyan-400 font-semibold">{activeHost}</span>
                {activeDeviceInfo?.hostname && activeDeviceInfo.hostname !== activeHost && (
                  <span className="text-slate-500">({activeDeviceInfo.hostname})</span>
                )}
                {activeDeviceInfo?.os_name && (
                  <span className={`ml-2 px-2 py-0.5 rounded border text-xs ${osBadgeColor(activeDeviceInfo.os_name)}`}>
                    {activeDeviceInfo.device_icon} {activeDeviceInfo.os_name.length > 30 ? activeDeviceInfo.os_name.substring(0, 30) + '...' : activeDeviceInfo.os_name}
                  </span>
                )}
              </div>
              {timestamp && <span className="text-slate-500 text-xs">• Scanned: {timestamp}</span>}
            </div>
          </div>
          <button
            onClick={() => fetchDeviceData(activeHost)}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg hover:border-cyan-700 transition-all text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh
          </button>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-3 bg-red-900/30 border border-red-700/50 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
            <button onClick={() => fetchDeviceData(activeHost)} className="ml-auto text-red-400 text-xs underline">Retry</button>
          </div>
        )}

        {/* ── Summary Cards ── */}
        <SummaryCards totalFindings={violations.length} critical={criticalCount} openIssues={violations.length} resolved={0} />

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-12 gap-6">

          {/* Left Column */}
          <div className="col-span-3 space-y-4">
            <ScanPanel onScanComplete={handleScanComplete} onDevicesDiscovered={handleDevicesDiscovered} />

            {/* Devices List */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-lg p-4 backdrop-blur">
              <div className="flex items-center gap-2 mb-4">
                <Network className="w-4 h-4 text-cyan-400" />
                <h3 className="text-cyan-400 font-semibold text-xs uppercase tracking-wide">
                  Devices ({discoveredDevices.length})
                </h3>
              </div>

              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {discoveredDevices.map((device) => {
                  const isActive = activeHost === device.ip;
                  const cached = deviceCache[device.ip];
                  const devScore = cached?.auditData?.compliance_score;
                  const devViolations = cached?.auditData?.violations?.length ?? 0;
                  const isLoadingThis = loadingHost === device.ip;

                  return (
                    <button
                      key={device.ip}
                      onClick={() => handleDeviceClick(device)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isActive
                          ? 'bg-cyan-500/10 border-cyan-500/40'
                          : 'bg-slate-800/50 border-slate-700/30 hover:border-slate-600/50 hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {/* Device type icon */}
                          <div className={`mt-0.5 p-1 rounded ${isActive ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700/50 text-slate-400'}`}>
                            <DeviceIcon type={device.device_type} className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-semibold truncate">{device.hostname}</p>
                            <p className="text-slate-500 text-xs font-mono">{device.ip}</p>
                            {/* OS name */}
                            {device.os_name && device.os_name && device.os_name !== 'Unknown' && device.os_name !== '' && (
                              <p className={`text-xs mt-0.5 px-1.5 py-0.5 rounded border inline-block ${osBadgeColor(device.os_name)}`}>
                                {device.device_icon} {device.os_name.split(' ').slice(0, 3).join(' ')}
                              </p>
                            )}
                            {/* Vendor */}
                            {device.vendor && device.vendor !== 'N/A' && device.vendor !== 'Local' && (
                              <p className="text-slate-600 text-xs mt-0.5 truncate">{device.vendor}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {isLoadingThis ? (
                            <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
                          ) : devViolations > 0 ? (
                            <span className="text-xs text-red-400 font-bold bg-red-900/30 px-1.5 py-0.5 rounded">
                              {devViolations}
                            </span>
                          ) : cached ? (
                            <span className="text-xs text-green-400">✓</span>
                          ) : null}
                          <span className={`w-1.5 h-1.5 rounded-full ${device.status === 'Online' || device.status === 'online' ? 'bg-green-400' : 'bg-slate-600'}`} />
                        </div>
                      </div>

                      {/* Score bar */}
                      {devScore !== undefined && (
                        <div className="mt-2">
                          <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${devScore >= 70 ? 'bg-green-500' : devScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${devScore}%` }}
                            />
                          </div>
                          <p className={`text-xs mt-1 ${devScore >= 70 ? 'text-green-400' : devScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                            Score: {devScore}%
                          </p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-9 space-y-6">

            {/* Loading skeleton */}
            {isLoading && (
              <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-lg p-6 flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
                <p className="text-slate-400 text-sm">Fetching data for <span className="text-cyan-400 font-mono">{activeHost}</span>...</p>
              </div>
            )}

            {/* Device Info Card */}
            {activeDeviceInfo && (
              <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-slate-700/50 rounded-xl p-5 backdrop-blur">
                <div className="flex items-start gap-5 flex-wrap">
                  {/* Icon */}
                  <div className="bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 p-4 rounded-xl flex-shrink-0">
                    <DeviceIcon type={activeDeviceInfo.device_type} className="w-8 h-8 text-cyan-400" />
                  </div>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <h3 className="text-white font-bold text-xl">{activeDeviceInfo.hostname}</h3>
                      <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${osBadgeColor(activeDeviceInfo.os_name)}`}>
                        {activeDeviceInfo.device_icon} {activeDeviceInfo.device_type}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                        Online
                      </span>
                    </div>

                    {/* Grid of details */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 mt-3">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs w-14 flex-shrink-0">IP</span>
                        <span className="text-white font-mono text-sm">{activeDeviceInfo.ip}</span>
                      </div>
                      {activeDeviceInfo.mac && activeDeviceInfo.mac !== 'N/A' && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-xs w-14 flex-shrink-0">MAC</span>
                          <span className="text-white font-mono text-sm">{activeDeviceInfo.mac}</span>
                        </div>
                      )}
                      {activeDeviceInfo.vendor && activeDeviceInfo.vendor !== 'N/A' && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-xs w-14 flex-shrink-0">Vendor</span>
                          <span className="text-white text-sm">{activeDeviceInfo.vendor}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs w-14 flex-shrink-0">OS</span>
                        <span className="text-white text-sm flex items-center gap-1.5 flex-wrap">
                          {activeDeviceInfo.os_name && activeDeviceInfo.os_name !== 'Unknown'
                            ? activeDeviceInfo.os_name.replace(' (vendor-based)', '')
                            : <span className="text-slate-500 italic">Not detected (needs admin privileges)</span>
                          }
                          {activeDeviceInfo.os_accuracy > 0 && (
                            <span className="text-slate-500 text-xs">({activeDeviceInfo.os_accuracy}% confidence)</span>
                          )}
                          {activeDeviceInfo.detection_src && activeDeviceInfo.detection_src !== 'unknown' && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 border border-slate-600/30">
                              via {activeDeviceInfo.detection_src}
                            </span>
                          )}
                        </span>
                      </div>
                      {activeDeviceInfo.hostname && activeDeviceInfo.hostname !== activeDeviceInfo.ip && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-xs w-14 flex-shrink-0">Name</span>
                          <span className="text-white text-sm">{activeDeviceInfo.hostname}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Open Ports */}
                  {activeDeviceInfo.open_ports?.length > 0 && (
                    <div className="flex-shrink-0">
                      <p className="text-slate-500 text-xs font-semibold uppercase mb-2">Open Ports</p>
                      <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                        {activeDeviceInfo.open_ports.slice(0, 10).map(p => (
                          <span key={p.port} className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded font-mono hover:border-cyan-700 transition-all" title={p.product ? `${p.product} ${p.version}` : p.service}>
                            {p.port}<span className="text-slate-500">/{p.service || '?'}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Live Stats — only show for localhost (psutil only works locally) */}
            {activeHost === '127.0.0.1' || activeHost === 'localhost' ? (
              systemStats.length > 0 && <SystemStatsPanel stats={systemStats} />
            ) : (
              <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-lg p-5 backdrop-blur">
                <div className="flex items-center gap-3 mb-3">
                  <Cpu className="w-4 h-4 text-slate-500" />
                  <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wide">Live System Stats</h3>
                </div>
                <p className="text-slate-600 text-sm">Live stats (CPU/RAM/Disk) are only available for the local machine (127.0.0.1). Remote device stats require an agent.</p>
              </div>
            )}

            {/* Health Score & Risk Distribution — always per active device */}
            {!isLoading && auditData && (
              <div className="grid grid-cols-3 gap-4">
                <ComplianceScore score={score} />
                <div className="col-span-2">
                  <RiskDistributionChart data={riskData} />
                </div>
              </div>
            )}

            {/* AI Analysis */}
            {!isLoading && aiAnalysis && (
              <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-700/30 rounded-lg p-6 backdrop-blur">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                  <h3 className="text-cyan-400 font-semibold text-sm uppercase tracking-wide">
                    AI Analysis — {activeHost}
                  </h3>
                </div>
                <p className="text-slate-300 leading-relaxed text-sm">{aiAnalysis}</p>
              </div>
            )}

            {/* Vulnerabilities */}
            {!isLoading && (
              <div>
                <h3 className="text-xs uppercase tracking-[0.15em] text-slate-400 font-semibold mb-4">
                  Vulnerability Findings — <span className="text-cyan-400 font-mono">{activeHost}</span> ({violations.length})
                </h3>
                {violations.length === 0 && auditData ? (
                  <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-green-700/30 rounded-lg p-8 text-center">
                    <Shield className="w-10 h-10 text-green-400 mx-auto mb-3" />
                    <p className="text-green-400 font-semibold">No violations found. System is secure!</p>
                  </div>
                ) : !auditData ? (
                  <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-lg p-8 text-center">
                    <p className="text-slate-500 text-sm">No scan data. Click the device or run a scan.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {violations.map((v, i) => (
                      <VulnerabilityCard
                        key={v.id || i}
                        vulnerability={v}
                        index={i}
                        host={activeHost}
                        onRemediated={() => fetchDeviceData(activeHost)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;