import React from 'react';
import { Shield, Home, Zap, Network, AlertCircle, Download, Settings, X, Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', icon: Home, path: '/dashboard', color: 'text-cyan-400' },
    { name: 'Scan Engine', icon: Zap, path: '/scan-engine', color: 'text-cyan-400' },
    { name: 'Devices', icon: Network, path: '/devices', color: 'text-cyan-400' },
    { name: 'Vulnerabilities', icon: AlertCircle, path: '/vulnerabilities', color: 'text-cyan-400' },
    { name: 'Reports', icon: Download, path: '/reports', color: 'text-cyan-400' },
    { name: 'Settings', icon: Settings, path: '/settings', color: 'text-cyan-400' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm md:hidden z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:relative w-64 h-screen bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-800/50 transition-all duration-300 z-50 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-lg">
              <img src="/logo.jpeg" alt="Logo" className="h-9 w-auto" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">TECHIFY</p>
              <p className="text-xs text-cyan-400">INFRASTRUCTURE</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  active
                    ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* System Status */}
        <div className="p-4 border-t border-slate-800/50">
          <p className="text-xs text-slate-400 mb-3 font-semibold uppercase">System Status</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">API</span>
              <span className="text-green-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Online
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Database</span>
              <span className="text-green-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Online
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
