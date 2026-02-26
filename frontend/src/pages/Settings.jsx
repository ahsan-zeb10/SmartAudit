import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Settings as SettingsIcon, Save } from 'lucide-react';

const Settings = () => {
  const [settings, setSettings] = useState({
    scanInterval: 60,
    networkRange: '192.168.1.0/24',
    autoRemediate: true,
    criticalAlerts: true,
    highAlerts: true,
    dailyReports: false,
  });

  const handleChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    console.log('Settings saved:', settings);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold text-white">Settings</h2>
          <p className="text-xs text-slate-400">
            Configure your audit preferences and system settings
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Scan Settings */}
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-lg p-6 backdrop-blur">
            <div className="flex items-center gap-3 mb-6">
              <SettingsIcon className="w-5 h-5 text-cyan-400" />
              <h3 className="text-white font-bold text-lg">Scan Settings</h3>
            </div>

            <div className="space-y-4">
              {/* Scan Interval */}
              <div>
                <label className="block text-slate-400 text-sm font-semibold mb-2">
                  Default Scan Interval (minutes)
                </label>
                <input
                  type="number"
                  value={settings.scanInterval}
                  onChange={(e) =>
                    handleChange('scanInterval', parseInt(e.target.value))
                  }
                  className="w-full bg-slate-800/50 border border-slate-700 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  How often to run automatic scans
                </p>
              </div>

              {/* Network Range */}
              <div>
                <label className="block text-slate-400 text-sm font-semibold mb-2">
                  Network Range
                </label>
                <input
                  type="text"
                  value={settings.networkRange}
                  onChange={(e) => handleChange('networkRange', e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                  placeholder="192.168.1.0/24"
                />
                <p className="text-xs text-slate-500 mt-1">
                  CIDR notation for network discovery
                </p>
              </div>

              {/* Auto Remediate */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoRemediate"
                  checked={settings.autoRemediate}
                  onChange={(e) =>
                    handleChange('autoRemediate', e.target.checked)
                  }
                  className="w-4 h-4 rounded border-slate-600 text-cyan-500 cursor-pointer"
                />
                <label htmlFor="autoRemediate" className="text-white font-semibold text-sm cursor-pointer">
                  Enable Auto-Remediation
                </label>
              </div>
              <p className="text-xs text-slate-500">
                Automatically fix critical vulnerabilities
              </p>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-lg p-6 backdrop-blur">
            <div className="flex items-center gap-3 mb-6">
              <SettingsIcon className="w-5 h-5 text-cyan-400" />
              <h3 className="text-white font-bold text-lg">Notifications</h3>
            </div>

            <div className="space-y-4">
              {/* Critical Alerts */}
              <div className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                <div>
                  <p className="text-white font-semibold">Critical Alerts</p>
                  <p className="text-xs text-slate-500">Get notified of critical vulnerabilities</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.criticalAlerts}
                  onChange={(e) =>
                    handleChange('criticalAlerts', e.target.checked)
                  }
                  className="w-4 h-4 rounded border-slate-600 text-cyan-500 cursor-pointer"
                />
              </div>

              {/* High Risk Alerts */}
              <div className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                <div>
                  <p className="text-white font-semibold">High Risk Alerts</p>
                  <p className="text-xs text-slate-500">Get notified of high-risk issues</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.highAlerts}
                  onChange={(e) =>
                    handleChange('highAlerts', e.target.checked)
                  }
                  className="w-4 h-4 rounded border-slate-600 text-cyan-500 cursor-pointer"
                />
              </div>

              {/* Daily Reports */}
              <div className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                <div>
                  <p className="text-white font-semibold">Daily Reports</p>
                  <p className="text-xs text-slate-500">Receive daily summary reports</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.dailyReports}
                  onChange={(e) =>
                    handleChange('dailyReports', e.target.checked)
                  }
                  className="w-4 h-4 rounded border-slate-600 text-cyan-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-bold rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
          >
            <Save className="w-5 h-5" />
            Save Settings
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;