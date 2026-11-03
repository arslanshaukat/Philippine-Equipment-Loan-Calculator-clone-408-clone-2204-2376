import { useEffect, useState, useCallback } from 'react';
import { pb } from '../../lib/pocketbase';
import { useAuth } from '../../context/AuthContext';
import StaffForm from './StaffForm';

export default function StaffList() {
  const { currentUser } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const records = await pb.collection('staff').getFullList({ sort: 'name' });
      setStaff(records);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const toggleActive = async (member) => {
    await pb.collection('staff').update(member.id, { active: !member.active });
    loadStaff();
  };

  const handleDelete = async (id) => {
    // Hard delete. Note: any reward_points / job records linked to this
    // staff member will lose their relation. Deactivating (above) is the
    // safer default — this is here because it was explicitly requested.
    await pb.collection('staff').delete(id);
    setConfirmDeleteId(null);
    loadStaff();
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingStaff(null);
    loadStaff();
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Staff Management</h2>
          <p className="text-sm text-gray-400">Add, edit, or remove staff accounts.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-[#F5A623] text-[#0D0D0D] font-semibold rounded-lg px-4 py-2 text-sm"
          >
            + Add Staff
          </button>
        )}
      </div>

      {showForm && (
        <StaffForm
          existingStaff={editingStaff}
          onSaved={() => {
            if (editingStaff) closeForm();
            // for new staff, StaffForm shows the temp password screen first;
            // it calls onCancel (below) when the admin clicks "Done"
          }}
          onCancel={closeForm}
        />
      )}

      {loading ? (
        <p className="text-gray-400">Loading staff…</p>
      ) : (
        <div className="bg-[#161616] border border-[#2A2A2A] rounded-xl divide-y divide-[#2A2A2A]">
          {staff.map((member) => (
            <div key={member.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{member.name}</span>
                  {member.role === 'admin' && (
                    <span className="text-xs bg-[#F5A623]/20 text-[#F5A623] px-2 py-0.5 rounded-full">
                      Admin
                    </span>
                  )}
                  {!member.active && (
                    <span className="text-xs bg-red-950 text-red-400 px-2 py-0.5 rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  {member.email} {member.position && `· ${member.position}`}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingStaff(member);
                    setShowForm(true);
                  }}
                  className="text-sm text-gray-300 hover:text-white px-3 py-1.5 rounded-lg bg-[#2A2A2A]"
                >
                  Edit
                </button>
                <button
                  onClick={() => toggleActive(member)}
                  disabled={member.id === currentUser?.id}
                  className="text-sm text-gray-300 hover:text-white px-3 py-1.5 rounded-lg bg-[#2A2A2A] disabled:opacity-40"
                >
                  {member.active ? 'Deactivate' : 'Reactivate'}
                </button>

                {confirmDeleteId === member.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(member.id)}
                      className="text-sm bg-red-900 text-red-200 px-3 py-1.5 rounded-lg"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-sm bg-[#2A2A2A] text-gray-300 px-3 py-1.5 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(member.id)}
                    disabled={member.id === currentUser?.id}
                    className="text-sm text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg bg-red-950/40 disabled:opacity-40"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
          {staff.length === 0 && (
            <div className="px-5 py-8 text-center text-gray-500">No staff added yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
