    // src/pages/Register.jsx
import React, { useState } from 'react';
import { Shield, Eye, EyeOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { authFetch } from '@/services/auth';

const Register = () => {
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    full_name: '',
    role: 'viewer',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.username || !form.password) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      alert('User registered successfully! Now login.');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Registration failed. Username/email may already exist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050b18] flex items-center justify-center p-4">
      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-white" />
            <h1 className="text-3xl font-black text-cyan-400">Register</h1>
          </div>
          <p className="text-slate-400 text-sm">Create a new user (Admin only)</p>
        </div>

        <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-slate-700/50 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          {error && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-700/40 rounded-lg p-3 mb-5">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1.5">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="user@techify.local"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1.5">Username</label>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="username"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1.5">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1.5">Full Name (optional)</label>
              <input
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1.5">Role</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="viewer">Viewer</option>
                <option value="analyst">Analyst</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-bold py-3 rounded-xl hover:shadow-lg hover:shadow-cyan-500/40 transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Registering...</> : 'Register User'}
            </button>
          </form>

          <div className="mt-6 text-center text-slate-400 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-400 hover:underline">
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;