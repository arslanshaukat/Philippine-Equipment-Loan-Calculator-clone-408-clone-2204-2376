import { useState } from 'react';
import { pb } from '../../lib/pocketbase';

// Generates a temp password to show the admin once, so they can share it
// with the new staff member (who should change it on first login).
function generateTempPassword() {
  return Math.random().toString(36).slice(-6) + Math.random().toString(36).slice(-4).toUpperCase();
}

export default function StaffForm({ existingStaff, onSaved, onCancel }) {
  const isEdit = !!existingStaff;
  const [name, setName] = useState(existingStaff?.name || '');
  const [email, setEmail] = useState(existingStaff?.email || '');
  const [role, setRole] = useState(existingStaff?.role || 'staff');
  const [position, setPosition] = useState(existingStaff?.position || '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tempPassword, setTempPassword] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isEdit) {
        await pb.collection('staff').update(existingStaff.id, {
          name,
          email,
          role,
          position,
        });
        onSaved?.();
      } else {
        const password = generateTempPassword();
        const created = await pb.collection('staff').create({
          name,
          email,
          role,
          position,
          active: true,
          password,
          passwordConfirm: password,
          emailVisibility: true,
          verified: true,
        });
        setTempPassword(password);
        onSaved?.(created);
      }
    } catch (err) {
      setError(err?.data?.data ? summarizeFieldErrors(err.data.data) : err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Shown once right after creating a new staff account
  if (tempPassword) {
    return (
      <div className="bg-[#161616] border border-[#2A2A2A] rounded-xl p-6 space-y-4">
        <h3 className="text-white font-semibold">Staff account created</h3>
        <p className="text-sm text-gray-400">
          Share this temporary password with <strong>{name}</strong>. It will not be shown again —
          they should change it after logging in.
        </p>
        <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-4 py-3 font-mono text-[#F5A623] text-lg text-center">
          {tempPassword}
        </div>
        <button
          onClick={onCancel}
          className="w-full bg-[#F5A623] text-[#0D0D0D] font-semibold rounded-lg py-2.5"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#161616] border border-[#2A2A2A] rounded-xl p-6 space-y-4">
      <h3 className="text-white font-semibold">{isEdit ? 'Edit Staff' : 'Add Staff'}</h3>

      <div>
        <label className="block text-sm text-gray-300 mb-1">Full Name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg bg-[#0D0D0D] border border-[#2A2A2A] text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">Email</label>
        <input
          type="email"
          required
          disabled={isEdit}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg bg-[#0D0D0D] border border-[#2A2A2A] text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A623] disabled:opacity-50"
        />
        {isEdit && <p className="text-xs text-gray-500 mt-1">Email can't be changed here (it's the login ID).</p>}
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">Position</label>
        <input
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="e.g. Sales, Finance"
          className="w-full rounded-lg bg-[#0D0D0D] border border-[#2A2A2A] text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full rounded-lg bg-[#0D0D0D] border border-[#2A2A2A] text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
        >
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-[#F5A623] text-[#0D0D0D] font-semibold rounded-lg py-2.5 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Staff'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-[#2A2A2A] text-gray-200 rounded-lg py-2.5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function summarizeFieldErrors(fieldErrors) {
  return Object.entries(fieldErrors)
    .map(([field, e]) => `${field}: ${e.message}`)
    .join(' | ');
}
