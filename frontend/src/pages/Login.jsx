import React, { useState } from 'react';
import { Shield, Eye, EyeOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

const Login = () => {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username aur password daalen');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(username.trim(), password);
      // No need to navigate — AuthContext + ProtectedRoute auto handle karega
    } catch (err) {
      setError(err.message || 'Login fail — credentials check karen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050b18] flex items-center justify-center p-4">
      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-3 rounded-xl shadow-lg shadow-cyan-500/30">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent tracking-tight">
                TECHIFY
              </h1>
              <p className="text-slate-500 text-xs font-mono">Smart Audit Platform</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm">Sign in to continue</p>
        </div>

        <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-slate-700/50 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <h2 className="text-white font-bold text-xl mb-6">Welcome back</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-700/40 rounded-lg p-3 mb-5">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wide">
                Username or Email
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin / analyst / viewer"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-all placeholder-slate-600"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-all placeholder-slate-600 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-bold py-3 rounded-xl hover:shadow-lg hover:shadow-cyan-500/40 transition-all mt-2 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-slate-400 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-cyan-400 hover:underline">
              Register
            </Link>
          </div>

          <div className="mt-8 pt-5 border-t border-slate-700/50 text-xs text-slate-500 text-center">
            Default: admin / Admin@123
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;