import React, { useState } from 'react';
import pb from '../supabase/supabase';
import { FiKey, FiX } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const ChangePasswordWidget = () => {
  const [open, setOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => {
    setOldPassword(''); setNewPassword(''); setConfirmPassword(''); setError(''); setDone(false);
  };

  const close = () => { setOpen(false); reset(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const userId = pb.authStore.model?.id;
      await pb.collection('users').update(userId, {
        oldPassword,
        password: newPassword,
        passwordConfirm: confirmPassword,
      });
      setDone(true);
      setTimeout(() => {
        pb.authStore.clear();
      }, 1800);
    } catch (err) {
      setError(err?.data?.data?.oldPassword?.message || err?.data?.message || err.message || 'Password change failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 bg-white text-gray-500 rounded-xl border shadow-sm hover:text-blue-600 transition-all"
        title="Change my password"
      >
        <SafeIcon icon={FiKey} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={close}>
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={close} className="absolute top-5 right-5 w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
              <SafeIcon icon={FiX} />
            </button>

            <h2 className="text-lg font-black text-gray-900 uppercase mb-1">Change Password</h2>

            {done ? (
              <div className="mt-4 text-[11px] font-bold text-green-600 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                Password changed. Logging you out — please sign back in with your new password.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Password</label>
                  <input
                    required type="password" value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">New Password</label>
                  <input
                    required type="password" value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Confirm New Password</label>
                  <input
                    required type="password" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <p className="text-[9px] text-gray-400 font-bold">Minimum 8 characters.</p>

                {error && <div className="text-[10px] font-black text-red-600 uppercase bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}

                <button
                  type="submit" disabled={submitting}
                  className="w-full bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-xl disabled:opacity-60"
                >
                  {submitting ? 'Changing…' : 'Change Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ChangePasswordWidget;
