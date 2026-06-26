import React, { useState, useEffect } from 'react';
import {
  FiPlus, FiX, FiCheck, FiClock, FiCircle, FiUsers, FiTrash2,
  FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import pb from '../supabase/supabase';
import SafeIcon from '../common/SafeIcon';

const STATUS_CYCLE = ['Not Started', 'In Progress', 'Done'];

const STATUS_STYLES = {
  'Not Started': { bg: 'bg-gray-100', text: 'text-gray-500', icon: FiCircle, ring: 'ring-gray-200' },
  'In Progress': { bg: 'bg-amber-100', text: 'text-amber-700', icon: FiClock, ring: 'ring-amber-200' },
  'Done': { bg: 'bg-green-100', text: 'text-green-700', icon: FiCheck, ring: 'ring-green-200' },
};

async function fetchOrSeedChecklist(job) {
  const existing = await pb.collection('job_checklist_items').getFullList({
    filter: `job="${job.id}"`,
    sort: 'order,created',
  });
  if (existing.length > 0) return existing;

  const templates = await pb.collection('job_checklist_templates').getFullList({
    filter: `job_type="${job.job_type}"`,
    sort: 'order',
  });
  if (templates.length === 0) return [];

  const created = await Promise.all(
    templates.map(t =>
      pb.collection('job_checklist_items').create({
        job: job.id,
        title: t.title,
        status: 'Not Started',
        order: t.order || 0,
      })
    )
  );
  return created.sort((a, b) => (a.order || 0) - (b.order || 0));
}

const JobChecklist = ({ job, employees }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const result = await fetchOrSeedChecklist(job);
      setItems(result);
    } catch (err) {
      console.error('Failed to load checklist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [job.id]);

  const cycleStatus = async (item) => {
    const currentIdx = STATUS_CYCLE.indexOf(item.status);
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
    try {
      await pb.collection('job_checklist_items').update(item.id, { status: nextStatus });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: nextStatus } : i));
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleAddItem = async () => {
    if (!newItemTitle.trim()) return;
    setIsAdding(true);
    try {
      const maxOrder = items.reduce((max, i) => Math.max(max, i.order || 0), 0);
      const created = await pb.collection('job_checklist_items').create({
        job: job.id,
        title: newItemTitle.trim(),
        status: 'Not Started',
        order: maxOrder + 1,
      });
      setItems(prev => [...prev, created]);
      setNewItemTitle('');
      setShowAddInput(false);
    } catch (err) {
      alert('Failed to add item: ' + err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try {
      await pb.collection('job_checklist_items').delete(item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch (err) {
      alert('Failed to delete item: ' + err.message);
    }
  };

  const toggleWorkerOnItem = async (item, workerId) => {
    const current = item.assigned_workers || [];
    const updated = current.includes(workerId)
      ? current.filter(w => w !== workerId)
      : [...current, workerId];
    try {
      await pb.collection('job_checklist_items').update(item.id, { assigned_workers: updated });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, assigned_workers: updated } : i));
    } catch (err) {
      alert('Failed to update assignment: ' + err.message);
    }
  };

  const doneCount = items.filter(i => i.status === 'Done').length;
  const totalCount = items.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const jobWorkers = (job.assigned_workers || []).map(id => employees[id]).filter(Boolean);

  if (loading) {
    return (
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="text-center py-8 text-[10px] font-black uppercase tracking-widest text-gray-400">
          Loading checklist...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Checklist</h2>
        {totalCount > 0 && (
          <span className="text-[9px] font-black text-gray-500 uppercase">{doneCount}/{totalCount} done</span>
        )}
      </div>

      {totalCount > 0 && (
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center py-4">
          No checklist items yet
        </p>
      ) : (
        <div className="space-y-2 mb-3">
          {items.map(item => {
            const style = STATUS_STYLES[item.status] || STATUS_STYLES['Not Started'];
            const assignedWorkers = (item.assigned_workers || []).map(id => employees[id]).filter(Boolean);
            const isExpanded = expandedItemId === item.id;

            return (
              <div key={item.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 p-2.5">
                  <button
                    onClick={() => cycleStatus(item)}
                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${style.bg} ${style.text} ring-2 ${style.ring} transition-all`}
                    title={`Status: ${item.status} (tap to change)`}
                  >
                    <SafeIcon icon={style.icon} className="text-xs" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${item.status === 'Done' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {item.title}
                    </p>
                    {assignedWorkers.length > 0 && (
                      <p className="text-[8px] font-bold text-gray-400 uppercase truncate">
                        {assignedWorkers.map(w => w.name.split(' ')[0]).join(', ')}
                      </p>
                    )}
                  </div>

                  {jobWorkers.length > 0 && (
                    <button
                      onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                      className="flex-shrink-0 p-1.5 text-gray-300 hover:text-blue-500 transition-colors"
                      title="Assign workers"
                    >
                      <SafeIcon icon={FiUsers} className="text-sm" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteItem(item)}
                    className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <SafeIcon icon={FiTrash2} className="text-sm" />
                  </button>
                </div>

                {isExpanded && jobWorkers.length > 0 && (
                  <div className="px-2.5 pb-2.5 flex flex-wrap gap-1.5 bg-gray-50/50">
                    {jobWorkers.map(worker => {
                      const isAssigned = (item.assigned_workers || []).includes(worker.id);
                      return (
                        <button
                          key={worker.id}
                          onClick={() => toggleWorkerOnItem(item, worker.id)}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${isAssigned ? 'bg-blue-600 text-white' : 'bg-white text-gray-400 border border-gray-200'}`}
                        >
                          {worker.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAddInput ? (
        <div className="flex gap-2">
          <input
            type="text"
            autoFocus
            value={newItemTitle}
            onChange={e => setNewItemTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddItem(); if (e.key === 'Escape') setShowAddInput(false); }}
            placeholder="e.g. Buff and polish"
            className="flex-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
          />
          <button
            onClick={handleAddItem}
            disabled={isAdding || !newItemTitle.trim()}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
          >
            Add
          </button>
          <button
            onClick={() => { setShowAddInput(false); setNewItemTitle(''); }}
            className="px-3 py-2.5 bg-gray-100 text-gray-500 rounded-xl"
          >
            <SafeIcon icon={FiX} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAddInput(true)}
          className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
        >
          <SafeIcon icon={FiPlus} /> Add Checklist Item
        </button>
      )}
    </div>
  );
};

export default JobChecklist;
