import React, { useState } from 'react';
import { Search, RefreshCw, Bell, Menu } from 'lucide-react';

const TopBar = ({ onMenuClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="bg-gradient-to-r from-slate-900/50 to-slate-800/30 border-b border-slate-800/50 px-8 py-4 backdrop-blur-sm flex items-center justify-between">
      {/* Search Section */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <Search className="w-5 h-5 text-slate-500" />
        <input
          type="text"
          placeholder="Search devices, vulnerabilities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-800/30 border border-slate-700/50 rounded-lg px-4 py-2 text-white placeholder-slate-500 flex-1 focus:outline-none focus:border-cyan-500/50 transition-all text-sm"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 ml-8">
        {/* Notifications */}
        <button className="relative p-2 text-slate-400 hover:text-white transition-all">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all ${
            isRefreshing ? 'animate-spin' : ''
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>

        {/* Menu Button (Mobile) */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 text-slate-400 hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default TopBar;
