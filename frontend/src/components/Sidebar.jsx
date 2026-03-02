// src/components/Sidebar.jsx
import React from 'react';
import { Shield, Home, Zap, Network, AlertCircle, Download, Settings, LogOut, X, Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Menu items with role-based visibility
  const navItems = [
    {
      name: 'Dashboard',
      icon: Home,
      path: '/dashboard',
      color: 'text-cyan-400',
      allowedRoles: ['admin', 'analyst', 'viewer'],
    },
    {
      name: 'Scan Engine',
      icon: Zap,
      path: '/scan-engine',
      color: 'text-cyan-400',
      allowedRoles: ['admin', 'analyst'],
    },
    {
      name: 'Devices',
      icon: Network,
      path: '/devices',
      color: 'text-cyan-400',
      allowedRoles: ['admin', 'analyst'],
    },
    {
      name: 'Vulnerabilities',
      icon: AlertCircle,
      path: '/vulnerabilities',
      color: 'text-cyan-400',
      allowedRoles: ['admin', 'analyst', 'viewer'],
    },
    {
      name: 'Reports',
      icon: Download,
      path: '/reports',
      color: 'text-cyan-400',
      allowedRoles: ['admin', 'analyst'],
    },
    {
      name: 'Settings',
      icon: Settings,
      path: '/settings',
      color: 'text-cyan-400',
      allowedRoles: ['admin'],
    },
  ];

  // Filter items based on user's role
  const visibleItems = navItems.filter(
    item => !item.allowedRoles || item.allowedRoles.includes(user?.role)
  );

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile overlay */}
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
        {/* Header / Logo */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-lg">
              <img src="/logo.jpeg" alt="Techify Logo" className="h-9 w-auto" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">TECHIFY</p>
              <p className="text-xs text-cyan-400">Smart Audit</p>
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
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  active
                    ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-semibold shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
                onClick={() => setIsOpen(false)} // Mobile pe close kar den
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-800/50">
          {/* Current User */}
          {user && (
            <div className="mb-4 px-4 py-3 bg-slate-800/50 rounded-lg">
              <p className="text-white text-sm font-semibold truncate">
                {user.full_name || user.username}
              </p>
              <p className="text-xs text-slate-400 capitalize mt-0.5">
                {user.role}
              </p>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-red-600/80 to-red-500/80 text-white font-semibold hover:from-red-700 hover:to-red-600 transition-all shadow-sm hover:shadow-red-500/30"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;