import React, { useState, useEffect, useMemo } from 'react';
import {
  FiCalendar, FiPlus, FiX, FiUsers, FiTool, FiTrash2, FiEdit,
  FiDownload, FiCheckCircle, FiChevronDown
} from 'react-icons/fi';
import pb from '../supabase/supabase';
import SafeIcon from '../common/SafeIcon';

const staffMembers = ['RHEA', 'MEL', 'PRINCESS', 'ARSLAN'];

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' });
};

const formatRange = (start, end) => {
  if (!start) return '';
  if (!end || end === start) return formatDate(start);
  return `${formatDate(start)} - ${formatDate(end)}`;
};

const WeeklyTasksModule = () => {
  const [entries, setEntries] = useState([]);
  const [units, setUnits] = useState({});
  const [employees, setEmployees] = useState({});
  const [jobs, setJobs] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [entryRecords, unitRecords, employeeRecords, jobRecords] = await Promise.all([
        pb.collection('weekly_schedule_entries').getFullList({ sort: '-start_date' }),
        pb.collection('price_list_2024').getFullList(),
        pb.collection('employees').getFullList({ filter: 'is_active=true' }),
        pb.collection('jobs').getFullList(),
      ]);

      const unitMap = {};
      unitRecords.forEach(u => { unitMap[u.id] = u; });
      setUnits(unitMap);

      const empMap = {};
      employeeRecords.forEach(e => { empMap[e.id] = e; });
      setEmployees(empMap);

      const jobMap = {};
      jobRecords.forEach(j => { jobMap[j.id] = j; });
      setJobs(jobMap);

      setEntries(entryRecords);
    } catch (err) {
      console.error('Failed to fetch weekly tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const groupedByRole = useMemo(() => {
    const groups = {};
    entries.forEach(entry => {
      const workers = (entry.assigned_workers || []).map(id => employees[id]).filter(Boolean);
      if (workers.length === 0) {
        if (!groups['Unassigned']) groups['Unassigned'] = [];
        groups['Unassigned'].push({ entry, workers: [] });
        return;
      }
      const positions = [...new Set(workers.map(w => w.position || 'Unassigned'))];
      positions.forEach(pos => {
        if (!groups[pos]) groups[pos] = [];
        groups[pos].push({ entry, workers: workers.filter(w => (w.position || 'Unassigned') === pos) });
      });
    });
    return groups;
  }, [entries, employees]);

  const handleDeleteEntry = async (entry) => {
    if (!window.confirm('Delete this scheduled task?')) return;
    try {
      await pb.collection('weekly_schedule_entries').delete(entry.id);
      setEntries(prev => prev.filter(e => e.id !== entry.id));
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let y = 25;

      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(20, 20, 20);
      pdf.text('Weekly Task Schedule', pageWidth / 2, y, { align: 'center' });
      y += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(120, 120, 120);
      const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' });
      pdf.text(`Generated on ${todayStr}`, pageWidth / 2, y, { align: 'center' });
      y += 15;

      const roleNames = Object.keys(groupedByRole).sort((a, b) => {
        if (a === 'Unassigned') return 1;
        if (b === 'Unassigned') return -1;
        return a.localeCompare(b);
      });

      for (const role of roleNames) {
        const items = groupedByRole[role];
        if (items.length === 0) continue;

        if (y > pageHeight - 40) {
          pdf.addPage();
          y = 25;
        }

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(20, 20, 20);
        pdf.text(role, margin, y);
        y += 3;
        pdf.setDrawColor(20, 20, 20);
        pdf.setLineWidth(0.4);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 8;

        for (const { entry } of items) {
          if (y > pageHeight - 25) {
            pdf.addPage();
            y = 25;
          }
          const unit = units[entry.unit];
          const unitLabel = unit ? `#${unit.key_no} : ${unit.make}/${unit.model_engine}${unit.colour ? ` (${unit.colour})` : ''}` : 'Unknown unit';
          const dateLabel = `(${formatRange(entry.start_date, entry.end_date)})`;

          pdf.setFontSize(10.5);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(30, 30, 30);
          pdf.circle(margin + 1.5, y - 1.2, 0.8, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.text(unitLabel, margin + 6, y);
          const labelWidth = pdf.getTextWidth(unitLabel);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(130, 130, 130);
          pdf.text(`  ${dateLabel}`, margin + 6 + labelWidth, y);
          y += 7;
        }
        y += 6;
      }

      pdf.save(`Weekly_Task_Schedule_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const roleNamesForDisplay = Object.keys(groupedByRole).sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-[24px] shadow-sm border border-gray-100 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2 uppercase tracking-tighter">
            <SafeIcon icon={FiCalendar} className="text-blue-600" /> Weekly Tasks
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf || entries.length === 0}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg disabled:opacity-40 hover:bg-gray-800 transition-all"
            >
              <SafeIcon icon={FiDownload} /> {isGeneratingPdf ? 'Generating...' : 'Export PDF'}
            </button>
            <button
              onClick={() => { setEditingEntry(null); setShowAddModal(true); }}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2 whitespace-nowrap"
            >
              <SafeIcon icon={FiPlus} /> Add Task
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-[32px] p-20 text-center text-[10px] font-black uppercase tracking-widest text-gray-400 border border-gray-100">
          Loading schedule...
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-[32px] p-20 text-center border border-gray-100">
          <SafeIcon icon={FiCalendar} className="text-4xl text-gray-200 mb-3 mx-auto block" />
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">No tasks scheduled yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {roleNamesForDisplay.map(role => (
            <div key={role} className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-4 sm:p-6">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight mb-3 pb-3 border-b border-gray-100">
                {role}
              </h3>
              <div className="space-y-2">
                {groupedByRole[role].map(({ entry, workers }, idx) => {
                  const unit = units[entry.unit];
                  const job = entry.job ? jobs[entry.job] : null;
                  return (
                    <div
                      key={`${entry.id}-${idx}`}
                      className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-gray-900 uppercase">
                            {unit ? `#${unit.key_no} ${unit.make} ${unit.model_engine}` : 'Unknown unit'}
                          </span>
                          <span className="text-[9px] font-bold text-gray-400">
                            ({formatRange(entry.start_date, entry.end_date)})
                          </span>
                          {job && (
                            <span className="text-[8px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full font-black uppercase flex items-center gap-1">
                              <SafeIcon icon={FiTool} /> Linked Job
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 truncate">
                          {workers.map(w => w.name).join(', ')}
                        </p>
                        {entry.notes && (
                          <p className="text-[10px] text-gray-500 mt-1">{entry.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 sm:opacity-60 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => { setEditingEntry(entry); setShowAddModal(true); }}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <SafeIcon icon={FiEdit} className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <SafeIcon icon={FiTrash2} className="text-sm" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <TaskEntryModal
          units={units}
          employees={employees}
          jobs={jobs}
          editingEntry={editingEntry}
          onClose={() => { setShowAddModal(false); setEditingEntry(null); }}
          onSaved={() => { setShowAddModal(false); setEditingEntry(null); fetchAll(); }}
        />
      )}
    </div>
  );
};

const TaskEntryModal = ({ units, employees, jobs, editingEntry, onClose, onSaved }) => {
  const [unitSearch, setUnitSearch] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState(editingEntry?.unit || '');
  const [selectedJobId, setSelectedJobId] = useState(editingEntry?.job || '');
  const [selectedWorkers, setSelectedWorkers] = useState(editingEntry?.assigned_workers || []);
  const [startDate, setStartDate] = useState(editingEntry?.start_date?.split(' ')[0] || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }));
  const [endDate, setEndDate] = useState(editingEntry?.end_date?.split(' ')[0] || '');
  const [notes, setNotes] = useState(editingEntry?.notes || '');
  const [createdBy, setCreatedBy] = useState(editingEntry?.created_by || '');
  const [isSaving, setIsSaving] = useState(false);

  const unitList = Object.values(units).sort((a, b) => {
    const aNum = parseInt(a.key_no?.replace(/\D/g, '')) || 0;
    const bNum = parseInt(b.key_no?.replace(/\D/g, '')) || 0;
    return aNum - bNum;
  });

  const filteredUnits = unitList.filter(u =>
    !unitSearch || [u.key_no, u.make, u.model_engine, u.type].some(v => v?.toLowerCase().includes(unitSearch.toLowerCase()))
  );

  const jobsForUnit = Object.values(jobs).filter(j => j.unit === selectedUnitId);

  const employeeList = Object.values(employees).sort((a, b) => a.name.localeCompare(b.name));

  const toggleWorker = (id) => {
    setSelectedWorkers(prev =>
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedUnitId) { alert('Please select a unit'); return; }
    if (selectedWorkers.length === 0) { alert('Please assign at least one worker'); return; }
    if (!createdBy) { alert('Please select your name'); return; }

    setIsSaving(true);
    try {
      const payload = {
        unit: selectedUnitId,
        job: selectedJobId || null,
        assigned_workers: selectedWorkers,
        start_date: startDate,
        end_date: endDate || null,
        notes,
        created_by: createdBy,
      };

      if (editingEntry) {
        await pb.collection('weekly_schedule_entries').update(editingEntry.id, payload);
      } else {
        await pb.collection('weekly_schedule_entries').create(payload);
      }
      onSaved();
    } catch (err) {
      alert('Error saving task: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-t-[24px] sm:rounded-[24px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
          <h3 className="text-xl font-black uppercase tracking-tight">{editingEntry ? 'Edit Task' : 'Add Task'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><SafeIcon icon={FiX} /></button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Select Unit</label>
            <input
              type="text" placeholder="Search by key no, make, model..."
              value={unitSearch} onChange={e => setUnitSearch(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none mb-2"
            />
            <div className="max-h-36 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
              {filteredUnits.slice(0, 50).map(u => (
                <button
                  type="button" key={u.id}
                  onClick={() => { setSelectedUnitId(u.id); setSelectedJobId(''); }}
                  className={`w-full text-left px-3 py-2 text-[10px] font-bold uppercase flex items-center justify-between ${selectedUnitId === u.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  <span>{u.key_no} — {u.make} {u.model_engine}</span>
                  {selectedUnitId === u.id && <SafeIcon icon={FiCheckCircle} />}
                </button>
              ))}
            </div>
          </div>

          {selectedUnitId && jobsForUnit.length > 0 && (
            <div>
              <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Link to Existing Job (optional)</label>
              <select
                value={selectedJobId}
                onChange={e => setSelectedJobId(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none"
              >
                <option value="">— No linked job —</option>
                {jobsForUnit.map(j => (
                  <option key={j.id} value={j.id}>{j.title || j.job_type} ({j.status})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Assign Workers</label>
            <div className="flex flex-wrap gap-2">
              {employeeList.map(emp => (
                <button
                  type="button" key={emp.id}
                  onClick={() => toggleWorker(emp.id)}
                  className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${selectedWorkers.includes(emp.id) ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}
                >
                  {emp.name} {emp.position ? `· ${emp.position}` : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Start Date</label>
              <input
                type="date" value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">End Date (optional)</label>
              <input
                type="date" value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Notes</label>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none" rows={2}
            />
          </div>

          <div>
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 block">
              {!createdBy ? '⚠ Select Your Name' : 'Created By'}
            </label>
            <select
              value={createdBy} onChange={e => setCreatedBy(e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl text-[10px] font-black uppercase outline-none ${!createdBy ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-200 bg-gray-50'}`}
            >
              <option value="">— Select —</option>
              {staffMembers.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <button
            type="submit" disabled={isSaving}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : editingEntry ? 'Save Changes' : 'Add Task'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WeeklyTasksModule;
