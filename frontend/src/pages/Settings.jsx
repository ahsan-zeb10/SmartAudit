import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Settings as SettingsIcon, Save, Shield, Zap, CheckCircle, XCircle, RefreshCw, AlertTriangle, Info } from 'lucide-react';

const BASE_URL = 'http://localhost:8000';

const Settings = () => {
  const [settings, setSettings] = useState({
    scanInterval:  60,
    networkRange:  '192.168.1.0/24',
    autoRemediate: true,
    criticalAlerts:true,
    highAlerts:    true,
    dailyReports:  false,
  });

  const [openvasConfig, setOpenvasConfig] = useState({
    enabled:     false,
    host:        '127.0.0.1',
    port:        9390,
    username:    'admin',
    password:    'admin123',
    scan_config: 'Full and fast',
    scan_mode:   'combined',
  });

  const [openvasStatus, setOpenvasStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    checkOpenvasStatus();
  }, []);

  const checkOpenvasStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch(`${BASE_URL}/openvas/status`);
      const data = await res.json();
      setOpenvasStatus(data);
      if (data.config) {
        setOpenvasConfig(prev => ({ ...prev, ...data.config }));
      }
    } catch {
      setOpenvasStatus({ running: false, message: 'Backend not reachable' });
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleChange = (key, value) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  const handleOVChange = (key, value) =>
    setOpenvasConfig(prev => ({ ...prev, [key]: value }));

  const handleSaveOpenvas = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(`${BASE_URL}/openvas/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(openvasConfig),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMsg('✅ OpenVAS settings saved successfully!');
        await checkOpenvasStatus();
      } else {
        setSaveMsg(`❌ Error: ${data.error || 'Unknown error'}`);
        if (data.hint) setSaveMsg(prev => `${prev}\n💡 ${data.hint}`);
      }
    } catch (e) {
      setSaveMsg(`❌ ${e.message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 6000);
    }
  };

  const scanConfigs = [
    { value: 'Full and fast',          label: 'Full and Fast (Recommended)' },
    { value: 'Full and fast ultimate', label: 'Full and Fast Ultimate (Aggressive)' },
    { value: 'System Discovery',       label: 'System Discovery (Quick)' },
    { value: 'Empty',                  label: 'Empty (Custom)' },
  ];

  const scanModes = [
    { value: 'nmap_only',    label: '🔍 Nmap Only (Fast, seconds)' },
    { value: 'combined',     label: '🚀 Nmap + OpenVAS (Recommended)' },
    { value: 'openvas_only', label: '🛡️ OpenVAS Only (Deep, minutes)' },
  ];

  const inputClass = "w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 transition-all text-sm";
  const labelClass = "block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wide";

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">

        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold text-white">Settings</h2>
          <p className="text-xs text-slate-400 mt-1">Configure scan engine, OpenVAS, and notification preferences</p>
        </div>

        {/* ── OpenVAS Configuration ── */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-slate-700/50 rounded-xl p-6 backdrop-blur">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-green-600 to-emerald-600 p-2 rounded-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">OpenVAS / GVM Engine</h3>
                <p className="text-slate-500 text-xs">50,000+ CVE checks — deep vulnerability scanning</p>
              </div>
            </div>
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              {checkingStatus ? (
                <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
              ) : openvasStatus?.running ? (
                <span className="flex items-center gap-1.5 text-green-400 text-sm font-semibold">
                  <CheckCircle className="w-4 h-4" /> Running
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-red-400 text-sm font-semibold">
                  <XCircle className="w-4 h-4" /> Not Running
                </span>
              )}
              <button
                onClick={checkOpenvasStatus}
                className="text-slate-400 hover:text-white text-xs underline ml-2"
              >
                Check
              </button>
            </div>
          </div>

          {/* Install instructions if not running */}
          {openvasStatus && !openvasStatus.running && (
            <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-300 text-sm font-semibold mb-2">OpenVAS is not running</p>
                  <div className="space-y-2 text-xs text-slate-400">
                    <div className="bg-slate-900/50 rounded-lg p-3 font-mono">
                      <p className="text-green-400 mb-1"># Option 1: Docker (Easiest — Windows + Linux)</p>
                      <p className="text-white">docker run -d --name openvas -p 9390:9390 -p 9392:9392 -e PASSWORD="admin123" immauss/openvas:latest</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 font-mono">
                      <p className="text-green-400 mb-1"># Option 2: Linux (Ubuntu/Kali)</p>
                      <p className="text-white">sudo apt install openvas gvm && sudo gvm-setup && sudo gvm-start</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 font-mono">
                      <p className="text-green-400 mb-1"># Option 3: Already installed — just start</p>
                      <p className="text-white">sudo gvm-start</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700/30 rounded-xl mb-5">
            <div>
              <p className="text-white font-semibold text-sm">Enable OpenVAS Scanning</p>
              <p className="text-slate-500 text-xs mt-0.5">Use OpenVAS for vulnerability scanning instead of (or alongside) Nmap</p>
            </div>
            <button
              onClick={() => handleOVChange('enabled', !openvasConfig.enabled)}
              className={`relative w-12 h-6 rounded-full transition-all ${openvasConfig.enabled ? 'bg-green-500' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${openvasConfig.enabled ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          {/* Config Grid */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className={labelClass}>GVM Host</label>
              <input type="text" value={openvasConfig.host}
                onChange={e => handleOVChange('host', e.target.value)}
                className={inputClass} placeholder="127.0.0.1" />
              <p className="text-slate-600 text-xs mt-1">Usually 127.0.0.1 for local install</p>
            </div>
            <div>
              <label className={labelClass}>GVM Port</label>
              <input type="number" value={openvasConfig.port}
                onChange={e => handleOVChange('port', parseInt(e.target.value))}
                className={inputClass} placeholder="9390" />
              <p className="text-slate-600 text-xs mt-1">Default: 9390</p>
            </div>
            <div>
              <label className={labelClass}>Username</label>
              <input type="text" value={openvasConfig.username}
                onChange={e => handleOVChange('username', e.target.value)}
                className={inputClass} placeholder="admin" />
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <input type="password" value={openvasConfig.password}
                onChange={e => handleOVChange('password', e.target.value)}
                className={inputClass} placeholder="••••••••" />
            </div>
          </div>

          {/* Scan Config */}
          <div className="mb-4">
            <label className={labelClass}>Scan Configuration</label>
            <div className="grid grid-cols-2 gap-2">
              {scanConfigs.map(cfg => (
                <button key={cfg.value}
                  onClick={() => handleOVChange('scan_config', cfg.value)}
                  className={`p-3 rounded-lg border text-left text-sm transition-all ${
                    openvasConfig.scan_config === cfg.value
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-white'
                      : 'bg-slate-800/50 border-slate-700/30 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scan Mode */}
          <div className="mb-6">
            <label className={labelClass}>Scan Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {scanModes.map(mode => (
                <button key={mode.value}
                  onClick={() => handleOVChange('scan_mode', mode.value)}
                  className={`p-3 rounded-lg border text-left text-xs transition-all ${
                    openvasConfig.scan_mode === mode.value
                      ? 'bg-purple-500/10 border-purple-500/50 text-white'
                      : 'bg-slate-800/50 border-slate-700/30 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <div className="mt-2 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-blue-300 text-xs">
                  <strong>Nmap Only:</strong> Fast (seconds), port/service scan. &nbsp;
                  <strong>Combined:</strong> Nmap for discovery + OpenVAS for CVE checks (recommended). &nbsp;
                  <strong>OpenVAS Only:</strong> Deep scan, 5–30 min per host.
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {saveMsg && (
            <div className={`mb-4 p-3 rounded-lg text-sm whitespace-pre-line ${
              saveMsg.includes('✅') ? 'bg-green-900/30 border border-green-700/30 text-green-300'
              : 'bg-red-900/30 border border-red-700/30 text-red-300'
            }`}>
              {saveMsg}
            </div>
          )}

          <button
            onClick={handleSaveOpenvas}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-green-500/30 transition-all disabled:opacity-50"
          >
            {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
                    : <><Save className="w-4 h-4" /> Save OpenVAS Settings</>}
          </button>
        </div>

        {/* ── General Settings ── */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-xl p-6 backdrop-blur">
            <div className="flex items-center gap-3 mb-5">
              <SettingsIcon className="w-5 h-5 text-cyan-400" />
              <h3 className="text-white font-bold text-lg">Scan Settings</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Scan Interval (minutes)</label>
                <input type="number" value={settings.scanInterval}
                  onChange={e => handleChange('scanInterval', parseInt(e.target.value))}
                  className={inputClass} />
                <p className="text-slate-600 text-xs mt-1">Auto-scan frequency</p>
              </div>
              <div>
                <label className={labelClass}>Network Range</label>
                <input type="text" value={settings.networkRange}
                  onChange={e => handleChange('networkRange', e.target.value)}
                  className={inputClass} placeholder="192.168.1.0/24" />
                <p className="text-slate-600 text-xs mt-1">CIDR notation</p>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700/30 rounded-lg">
                <input type="checkbox" id="autoRemediate"
                  checked={settings.autoRemediate}
                  onChange={e => handleChange('autoRemediate', e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer" />
                <div>
                  <label htmlFor="autoRemediate" className="text-white text-sm font-semibold cursor-pointer">Enable Auto-Remediation</label>
                  <p className="text-slate-500 text-xs">Auto-fix critical vulnerabilities</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-xl p-6 backdrop-blur">
            <div className="flex items-center gap-3 mb-5">
              <Zap className="w-5 h-5 text-cyan-400" />
              <h3 className="text-white font-bold text-lg">Notifications</h3>
            </div>
            <div className="space-y-3">
              {[
                { key: 'criticalAlerts', label: 'Critical Alerts', desc: 'CVSS 9.0+' },
                { key: 'highAlerts',     label: 'High Risk Alerts', desc: 'CVSS 7.0+' },
                { key: 'dailyReports',   label: 'Daily Reports',    desc: 'Daily summary email' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700/30 rounded-lg">
                  <div>
                    <p className="text-white text-sm font-semibold">{item.label}</p>
                    <p className="text-slate-500 text-xs">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => handleChange(item.key, !settings[item.key])}
                    className={`relative w-10 h-5 rounded-full transition-all ${settings[item.key] ? 'bg-cyan-500' : 'bg-slate-700'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${settings[item.key] ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => { console.log('Settings saved:', settings); }}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-bold rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
          >
            <Save className="w-5 h-5" /> Save Settings
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;