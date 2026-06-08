import React, { useState, useEffect, useMemo } from 'react';
import {
  FiUsers, FiPlus, FiSearch, FiEdit, FiX, FiSave,
  FiPhone, FiMessageSquare, FiCalendar, FiDollarSign,
  FiMapPin, FiFileText, FiCheckCircle, FiXCircle,
  FiClock, FiRefreshCw, FiExternalLink, FiDownload
} from 'react-icons/fi';
import { supabase } from '../supabase/supabase';
import pb from '../supabase/supabase';
import SafeIcon from '../common/SafeIcon';

const STAFF = ['RHEA', 'MEL', 'PRINCESS', 'ARSLAN'];
const STATUSES = ['New', 'Screening', 'For Interview', 'Hired', 'Rejected', 'On Hold'];
const INTERVIEW_RESPONSES = ['Pending', 'Confirmed', 'No Response', 'Declined', 'Rescheduled'];
const CITIES = ['Subic', 'Olongapo', 'Zambales', 'Manila', 'Other'];

const emptyForm = {
  full_name: '', phone: '', messenger_link: '', job_role: '',
  city: '', date_applied: new Date().toISOString().split('T')[0],
  available_date: '', asking_salary: '', offered_salary: '',
  interview_response: 'Pending', status: 'New', notes: '', handled_by: '', follow_up_date: '',
};

const Field = ({ label, children }) => (
  <div className="space-y-1">
    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
    {children}
  </div>
);

const Input = ({ value, onChange, placeholder, type = 'text', required }) => (
  <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-purple-100 uppercase" />
);

const statusColor = (s) => {
  switch(s) {
    case 'Hired': return 'bg-green-100 text-green-700';
    case 'Rejected': return 'bg-red-100 text-red-600';
    case 'For Interview': return 'bg-blue-100 text-blue-700';
    case 'Screening': return 'bg-yellow-100 text-yellow-700';
    case 'On Hold': return 'bg-gray-100 text-gray-600';
    default: return 'bg-purple-100 text-purple-700';
  }
};

export default function ApplicantsModule() {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [resumeFile, setResumeFile] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState('');

  const logActivity = async (action, details, recordId = '') => {
    try {
      await supabase.from('activity_log').insert([{
        staff: selectedStaff || 'SYSTEM',
        action,
        module: 'Hiring',
        record_id: recordId,
        details,
        timestamp: new Date().toISOString(),
      }]);
    } catch(e) { console.error('Activity log failed:', e); }
  };

  const handleDeleteResume = async () => {
    if (!window.confirm('Delete this resume?')) return;
    try {
      const pbToken = pb.authStore.isValid ? pb.authStore.token : null;
      const headers = { 'Content-Type': 'application/json' };
      if (pbToken) headers['Authorization'] = `Bearer ${pbToken}`;
      const fd = new FormData();
      fd.append('resume', '');  // empty string clears the file in PocketBase
      const res = await fetch(`/api/collections/applicants/records/${selectedApplicant.id}`, {
        method: 'PATCH',
        headers: pbToken ? { Authorization: `Bearer ${pbToken}` } : {},
        body: fd,
      });
      if (res.ok) {
        fetchApplicants();
        setSelectedApplicant(prev => ({ ...prev, resume: null }));
      }
    } catch(e) { alert('Delete failed: ' + e.message); }
  };

  const fetchApplicants = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('applicants').select('*').order('date_applied', { ascending: false });
      setApplicants(data || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchApplicants(); }, []);

  const filtered = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return applicants.filter(a => {
      const matchSearch = !s || a.full_name?.toLowerCase().includes(s) ||
        a.job_role?.toLowerCase().includes(s) || a.phone?.includes(s) || a.city?.toLowerCase().includes(s);
      const matchStatus = statusFilter === 'All' || a.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [applicants, searchTerm, statusFilter]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedStaff) { alert('⚠ Please select a staff member'); return; }
    setIsSaving(true);
    try {
      const fd = new FormData();
      const fields = { ...formData, full_name: (formData.full_name||'').toUpperCase(), job_role: (formData.job_role||'').toUpperCase(), city: (formData.city||'').toUpperCase(), handled_by: selectedStaff, asking_salary: parseFloat(formData.asking_salary)||0, offered_salary: parseFloat(formData.offered_salary)||0 };
      for (const [k,v] of Object.entries(fields)) {
        if (v !== null && v !== undefined && v !== '') fd.append(k, String(v));
      }
      if (resumeFile) fd.append('resume', resumeFile);

      const pbToken = pb.authStore.isValid ? pb.authStore.token : null;
      const headers = pbToken ? { Authorization: `Bearer ${pbToken}` } : {};

      if (editingId) {
        const res = await fetch(`/api/collections/applicants/records/${editingId}`, {
          method: 'PATCH', headers, body: fd
        });
        if (!res.ok) throw new Error(await res.text());
        await logActivity('Updated Applicant', { name: fields.full_name, job_role: fields.job_role, status: fields.status }, editingId);
      } else {
        const res = await fetch('/api/collections/applicants/records', {
          method: 'POST', headers, body: fd
        });
        if (!res.ok) throw new Error(await res.text());
        const saved = await res.clone().json().catch(() => ({}));
        await logActivity('New Applicant', { name: fields.full_name, job_role: fields.job_role, city: fields.city }, saved.id || '');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm);
      setResumeFile(null);
      fetchApplicants();
    } catch(e) { alert('Save error: ' + e.message); }
    finally { setIsSaving(false); }
  };

  const handleEdit = (a) => {
    setFormData({ ...emptyForm, ...a });
    setSelectedStaff(a.handled_by || '');
    setEditingId(a.id);
    setShowForm(true);
    setSelectedApplicant(null);
  };

  const updateStatus = async (id, status) => {
    const prev_status = selectedApplicant?.status || '';
    await supabase.from('applicants').update({ status }).eq('id', id);
    await logActivity('Status Changed', { name: selectedApplicant?.full_name, from: prev_status, to: status }, id);
    fetchApplicants();
    if (selectedApplicant?.id === id) setSelectedApplicant(prev => ({ ...prev, status }));
  };

  const updateInterviewResponse = async (id, interview_response) => {
    await supabase.from('applicants').update({ interview_response }).eq('id', id);
    await logActivity('Interview Response', { name: selectedApplicant?.full_name, response: interview_response }, id);
    fetchApplicants();
    if (selectedApplicant?.id === id) setSelectedApplicant(prev => ({ ...prev, interview_response }));
  };

  const counts = useMemo(() => {
    const c = {};
    STATUSES.forEach(s => c[s] = applicants.filter(a => a.status === s).length);
    return c;
  }, [applicants]);

  return (
    <div className="flex flex-col xl:flex-row gap-4 pb-20 xl:pb-0">
      {/* LEFT: List */}
      <div className={`${selectedApplicant ? 'hidden xl:flex' : 'flex'} flex-col w-full xl:w-[420px] shrink-0 gap-3`}>
        {/* Header */}
        <div className="bg-white p-4 rounded-[24px] border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="text-base font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                <div className="bg-purple-600 p-2 rounded-xl text-white shadow-lg"><SafeIcon icon={FiUsers} className="text-sm" /></div>
                Applicants
              </h2>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">{applicants.length} Total</p>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchApplicants} className="p-2.5 bg-gray-50 text-gray-400 rounded-xl border border-gray-100 hover:text-purple-600 transition-all">
                <SafeIcon icon={FiRefreshCw} className={loading ? 'animate-spin' : ''} />
              </button>
              <button onClick={() => { setFormData(emptyForm); setEditingId(null); setSelectedStaff(''); setResumeFile(null); setShowForm(true); }}
                className="px-4 py-2.5 bg-purple-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-700 transition-all flex items-center gap-2">
                <SafeIcon icon={FiPlus} /> Add
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input type="text" placeholder="Search name, role, city..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-purple-100" />
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {['All', ...STATUSES].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-purple-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                {s} {s !== 'All' && counts[s] > 0 ? `(${counts[s]})` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="space-y-2 overflow-y-auto no-scrollbar max-h-[calc(100vh-280px)]">
          {loading ? (
            <div className="bg-white rounded-[20px] p-10 text-center text-[10px] font-black text-gray-300 uppercase border border-gray-100">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-[20px] p-10 text-center text-[10px] font-black text-gray-300 uppercase border border-gray-100">No applicants found</div>
          ) : filtered.map(a => (
            <div key={a.id} onClick={() => setSelectedApplicant(a)}
              className={`bg-white p-4 rounded-[20px] border cursor-pointer transition-all hover:shadow-md hover:border-purple-200 ${selectedApplicant?.id === a.id ? 'border-purple-500 shadow-md' : 'border-gray-100'}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="min-w-0">
                  <h4 className="font-black text-gray-900 uppercase text-[12px] truncate">{a.full_name}</h4>
                  <p className="text-[9px] font-bold text-purple-600 uppercase">{a.job_role || '—'}</p>
                </div>
                <span className={`text-[7px] font-black px-2 py-0.5 rounded-full uppercase shrink-0 ml-2 ${statusColor(a.status)}`}>{a.status}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {a.city && <span className="text-[7px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg uppercase flex items-center gap-1"><SafeIcon icon={FiMapPin} className="text-[7px]" />{a.city}</span>}
                {a.phone && <span className="text-[7px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">{a.phone}</span>}
                {a.date_applied && <span className="text-[7px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">{a.date_applied}</span>}
              </div>
              {a.interview_response && a.interview_response !== 'Pending' && (
                <div className="mt-2 pt-2 border-t border-gray-50">
                  <span className={`text-[7px] font-black px-2 py-0.5 rounded uppercase ${a.interview_response === 'Confirmed' ? 'bg-green-50 text-green-600' : a.interview_response === 'Declined' || a.interview_response === 'No Response' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'}`}>
                    Interview: {a.interview_response}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Detail */}
      {selectedApplicant && (
        <div className="flex-1">
          <div className="bg-white rounded-[24px] xl:rounded-[40px] shadow-xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] xl:max-h-[calc(100vh-120px)] sticky top-4">
            {/* Header */}
            <div className="bg-gray-900 px-6 py-6 text-white shrink-0">
              <div className="flex justify-between items-start mb-3">
                <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${statusColor(selectedApplicant.status)}`}>{selectedApplicant.status}</span>
                <button onClick={() => setSelectedApplicant(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><SafeIcon icon={FiX} /></button>
              </div>
              <h3 className="text-xl font-black uppercase">{selectedApplicant.full_name}</h3>
              <p className="text-purple-300 font-bold text-[11px] uppercase mt-1">{selectedApplicant.job_role}</p>
              <div className="flex flex-wrap gap-3 mt-3 text-[9px] text-white/50 font-bold">
                {selectedApplicant.phone && <span className="flex items-center gap-1"><SafeIcon icon={FiPhone} />{selectedApplicant.phone}</span>}
                {selectedApplicant.city && <span className="flex items-center gap-1"><SafeIcon icon={FiMapPin} />{selectedApplicant.city}</span>}
                {selectedApplicant.date_applied && <span className="flex items-center gap-1"><SafeIcon icon={FiCalendar} />Applied: {selectedApplicant.date_applied}</span>}
              </div>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto p-5 no-scrollbar space-y-4 bg-gray-50/30">
              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-[18px] border border-gray-100 p-3">
                  <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-2">Update Status</p>
                  <select value={selectedApplicant.status} onChange={e => updateStatus(selectedApplicant.id, e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black uppercase outline-none">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="bg-white rounded-[18px] border border-gray-100 p-3">
                  <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-2">Interview Response</p>
                  <select value={selectedApplicant.interview_response || 'Pending'} onChange={e => updateInterviewResponse(selectedApplicant.id, e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black uppercase outline-none">
                    {INTERVIEW_RESPONSES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* Details */}
              <div className="bg-white rounded-[18px] border border-gray-100 p-4">
                <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-3">Application Details</p>
                <div className="grid grid-cols-2 gap-2 text-[9px]">
                  {[
                    ['Available From', selectedApplicant.available_date],
                    ['Follow-Up Date', selectedApplicant.follow_up_date],
                    ['Asking Salary', selectedApplicant.asking_salary ? '₱'+new Intl.NumberFormat().format(selectedApplicant.asking_salary) : '—'],
                    ['Offered Salary', selectedApplicant.offered_salary ? '₱'+new Intl.NumberFormat().format(selectedApplicant.offered_salary) : '—'],
                    ['Handled By', selectedApplicant.handled_by],
                  ].map(([l,v]) => v ? (
                    <div key={l} className="bg-gray-50 rounded-xl p-2.5">
                      <p className="text-[6px] font-black text-gray-400 uppercase">{l}</p>
                      <p className="font-black text-gray-900 uppercase mt-0.5">{v}</p>
                    </div>
                  ) : null)}
                </div>
              </div>

              {/* Follow-up date quick set */}
              <div className="bg-white rounded-[18px] border border-purple-100 p-4">
                <p className="text-[7px] font-black text-purple-400 uppercase tracking-widest mb-2">📅 Follow-Up Date</p>
                <input type="date"
                  key={selectedApplicant.id}
                  defaultValue={selectedApplicant.follow_up_date || ''}
                  onBlur={async e => {
                    const val = e.target.value;
                    await supabase.from('applicants').update({ follow_up_date: val }).eq('id', selectedApplicant.id);
                    fetchApplicants();
                    setSelectedApplicant(prev => ({ ...prev, follow_up_date: val }));
                  }}
                  className="w-full px-4 py-2.5 bg-purple-50 border border-purple-100 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-purple-100" />
                {selectedApplicant.follow_up_date && (
                  <p className={`text-[8px] font-black uppercase mt-1.5 ${selectedApplicant.follow_up_date <= new Date().toISOString().split('T')[0] ? 'text-red-500' : 'text-purple-500'}`}>
                    {selectedApplicant.follow_up_date <= new Date().toISOString().split('T')[0] ? '⚠ Due Now' : '📅 Scheduled'}
                  </p>
                )}
              </div>

              {/* Messenger link */}
              {selectedApplicant.messenger_link && (
                <a href={selectedApplicant.messenger_link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-[18px] p-4 hover:bg-blue-100 transition-all">
                  <SafeIcon icon={FiMessageSquare} className="text-blue-600 text-lg" />
                  <div>
                    <p className="text-[8px] font-black text-blue-400 uppercase">Messenger</p>
                    <p className="text-[10px] font-bold text-blue-700 truncate">{selectedApplicant.messenger_link}</p>
                  </div>
                  <SafeIcon icon={FiExternalLink} className="text-blue-400 ml-auto" />
                </a>
              )}

              {/* Resume */}
              {selectedApplicant.resume && (
                <div className="flex items-center gap-2">
                  <a href={`/api/files/${selectedApplicant.collectionId}/${selectedApplicant.id}/${selectedApplicant.resume}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-[18px] p-4 hover:bg-purple-100 transition-all">
                    <SafeIcon icon={FiFileText} className="text-purple-600 text-lg" />
                    <div className="min-w-0">
                      <p className="text-[8px] font-black text-purple-400 uppercase">Resume</p>
                      <p className="text-[10px] font-bold text-purple-700 truncate">{selectedApplicant.resume}</p>
                    </div>
                    <SafeIcon icon={FiDownload} className="text-purple-400 ml-auto shrink-0" />
                  </a>
                  <button onClick={handleDeleteResume}
                    className="p-3 bg-red-50 border border-red-100 rounded-[18px] text-red-400 hover:bg-red-100 hover:text-red-600 transition-all shrink-0">
                    <SafeIcon icon={FiX} />
                  </button>
                </div>
              )}

              {/* Notes */}
              {selectedApplicant.notes && (
                <div className="bg-white rounded-[18px] border border-gray-100 p-4">
                  <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-2">Notes</p>
                  <p className="text-[11px] font-bold text-gray-700 uppercase">{selectedApplicant.notes}</p>
                </div>
              )}

              {/* Edit button */}
              <button onClick={() => handleEdit(selectedApplicant)}
                className="w-full py-3 bg-purple-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-700 transition-all flex items-center justify-center gap-2">
                <SafeIcon icon={FiEdit} /> Edit Applicant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white w-full max-w-2xl rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
            <div className="bg-purple-600 px-6 py-5 text-white flex justify-between items-center shrink-0">
              <h3 className="font-black text-base uppercase">{editingId ? 'Edit Applicant' : 'New Applicant'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><SafeIcon icon={FiX} /></button>
            </div>

            <form onSubmit={handleSave} className="p-5 overflow-y-auto no-scrollbar space-y-4 flex-1">
              {/* Personal Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Full Name *">
                  <Input value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} placeholder="Full Name" required />
                </Field>
                <Field label="Phone">
                  <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="09XX..." type="tel" />
                </Field>
                <Field label="Messenger Link">
                  <input type="url" value={formData.messenger_link} onChange={e => setFormData({...formData, messenger_link: e.target.value})}
                    placeholder="https://m.me/..."
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-purple-100" />
                </Field>
                <Field label="City">
                  <select value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold uppercase outline-none focus:ring-2 focus:ring-purple-100">
                    <option value="">— Select City —</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              </div>

              {/* Job Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Job Role / Position">
                  <Input value={formData.job_role} onChange={e => setFormData({...formData, job_role: e.target.value})} placeholder="e.g. SALES EXECUTIVE" />
                </Field>
                <Field label="Status">
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold uppercase outline-none focus:ring-2 focus:ring-purple-100">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Date Applied">
                  <Input type="date" value={formData.date_applied} onChange={e => setFormData({...formData, date_applied: e.target.value})} />
                </Field>
                <Field label="Available to Join">
                  <Input type="date" value={formData.available_date} onChange={e => setFormData({...formData, available_date: e.target.value})} />
                </Field>
                <Field label="Follow-Up Date">
                  <Input type="date" value={formData.follow_up_date} onChange={e => setFormData({...formData, follow_up_date: e.target.value})} />
                </Field>
              </div>

              {/* Salary */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Asking Salary (₱)">
                  <Input type="number" value={formData.asking_salary} onChange={e => setFormData({...formData, asking_salary: e.target.value})} placeholder="0" />
                </Field>
                <Field label="Offered Salary (₱)">
                  <Input type="number" value={formData.offered_salary} onChange={e => setFormData({...formData, offered_salary: e.target.value})} placeholder="0" />
                </Field>
              </div>

              {/* Interview */}
              <Field label="Interview Response">
                <select value={formData.interview_response} onChange={e => setFormData({...formData, interview_response: e.target.value})}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold uppercase outline-none focus:ring-2 focus:ring-purple-100">
                  {INTERVIEW_RESPONSES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>

              {/* Notes */}
              <Field label="Notes">
                <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes..." rows={2}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-purple-100" />
              </Field>

              {/* Resume upload */}
              <Field label="Resume (PDF / Image)">
                <input type="file" accept=".pdf,image/*"
                  onChange={e => setResumeFile(e.target.files[0] || null)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold outline-none" />
                {editingId && selectedApplicant?.resume && !resumeFile && (
                  <p className="text-[8px] text-purple-600 font-bold mt-1">Current: {selectedApplicant.resume}</p>
                )}
              </Field>

              {/* Staff selector */}
              <div className={`p-3 rounded-2xl border ${!selectedStaff ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                <p className={`text-[7px] font-black uppercase tracking-widest mb-2 ${!selectedStaff ? 'text-red-500' : 'text-gray-400'}`}>
                  {!selectedStaff ? '⚠ Select Staff Before Saving' : 'Handled By'}
                </p>
                <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-xl text-[10px] font-black uppercase outline-none ${!selectedStaff ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-200 bg-white'}`}>
                  <option value="">— Select Staff —</option>
                  {STAFF.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <button type="submit" disabled={isSaving || !selectedStaff}
                className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                <SafeIcon icon={FiSave} /> {isSaving ? 'Saving...' : editingId ? 'Update Applicant' : 'Save Applicant'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
