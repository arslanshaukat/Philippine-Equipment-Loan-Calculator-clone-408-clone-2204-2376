import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabase/supabase';
import { FiLock, FiUser, FiArrowRight, FiInfo, FiAlertCircle } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const AdminLogin = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message === 'Invalid login credentials') {
          setError('Invalid email or password. Please verify your credentials or check if the account is registered in the Supabase Dashboard.');
        } else {
          setError(authError.message);
        }
      } else {
        onLogin(data.user);
      }
    } catch (err) {
      setError('A connection error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-gray-100"
      >
        <div className="text-center mb-10">
          <div className="bg-blue-600 w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-100">
            <SafeIcon icon={FiLock} className="text-4xl text-white" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Admin Portal</h2>
          <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mt-2 text-wrap">GT International Dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Admin Email</label>
            <div className="relative">
              <SafeIcon icon={FiUser} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="email" 
                required 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all font-bold text-sm"
                placeholder="info@gtintl.com.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Access Password</label>
            <div className="relative">
              <SafeIcon icon={FiLock} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="password" 
                required 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all font-bold text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 p-4 rounded-xl flex items-start gap-3 border border-red-100 animate-in fade-in slide-in-from-top-2">
              <SafeIcon icon={FiAlertCircle} className="text-red-600 mt-0.5 shrink-0" />
              <p className="text-red-600 text-[10px] font-black uppercase leading-tight">{error}</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-100 uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Authenticating...' : 'Establish Secure Connection'}
            <SafeIcon icon={FiArrowRight} />
          </button>
        </form>

        <div className="mt-8 text-center space-y-2">
          <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">
            Authorized Personnel Only
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;