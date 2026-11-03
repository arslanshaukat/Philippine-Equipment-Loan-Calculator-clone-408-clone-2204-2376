import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      // AuthContext + ProtectedRoute handle the redirect once currentUser updates
    } catch (err) {
      setError(
        err?.status === 400
          ? 'Invalid email or password.'
          : err?.message || 'Login failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D] px-4">
      <div className="w-full max-w-sm bg-[#161616] border border-[#2A2A2A] rounded-xl p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="text-2xl font-bold tracking-tight text-white">
            GT <span className="text-[#F5A623]">International</span>
          </div>
          <p className="text-sm text-gray-400 mt-1">Finance App — Staff Login</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Email</label>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-[#0D0D0D] border border-[#2A2A2A] text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
              placeholder="you@gtintl.com.ph"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-[#0D0D0D] border border-[#2A2A2A] text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#F5A623] text-[#0D0D0D] font-semibold rounded-lg py-2.5 hover:bg-[#e0961a] transition disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-6">
          Need an account? Ask Arslan to add you from Settings → Staff.
        </p>
      </div>
    </div>
  );
}
