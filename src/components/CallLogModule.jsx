import React, { useState, useEffect, useMemo } from 'react';
import { 
  FiPhoneCall, FiUser, FiMessageSquare, FiCheckCircle, FiXCircle, FiSave, 
  FiTrash2, FiSearch, FiActivity, FiCalendar, FiEdit, FiRepeat, 
  FiTarget, FiZap, FiCheckSquare, FiClock, FiX, FiUserCheck, FiPlus,
  FiPhoneForwarded, FiList, FiArrowRight, FiRefreshCw, FiUserPlus
} from 'react-icons/fi';
import { supabase } from '../supabase/supabase';
import SafeIcon from '../common/SafeIcon';

const CallLogModule = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [phoneMatches, setPhoneMatches] = useState([]);
  const [lookingUp, setLookingUp] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  const [showDatePicker, setShowDatePicker] = useState(null);
  const [futureDate, setFutureDate] = useState('');

  const [formData, setFormData] = useState({
    staff_name: 'RHEA',
    customer_name: '',
    phone_number: '',
    reason: '',
    status: 'Answered',
    comment: ''
  });

  const staffMembers = ["RHEA", "MEL", "PRINCESS", "ARSLAN"];

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_call_logs_2024')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Fetch Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const lookupPhone = async (phone) => {
    if (!phone || phone.length < 7) { setPhoneMatches([]); return; }
    setLookingUp(true);
    try {
      const [callRes, followRes] = await Promise.all([
        supabase.from('daily_call_logs_2024').select('id,customer_name,phone_number,status,created_at').eq('phone_number', phone),
        supabase.from('follow_ups_2024').select('id,customer_name,phone_number,status,last_contacted_at')
          .eq('phone_number', phone),
      ]);
      const calls = (callRes.data || []).map(r => ({ ...r, _source: 'Calls' }));
      const follows = (followRes.data || []).map(r => ({ ...r, _source: 'Follows' }));
      setPhoneMatches([...follows, ...calls]);
    } catch(e) { console.error(e); }
    finally { setLookingUp(false); }
  };

  const handleSaveCall = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        ...formData,
        customer_name: formData.customer_name.toUpperCase(),
        reason: formData.reason.toUpperCase(),
        is_answered: formData.status === 'Answered',
        updated_at: now,
      };

      if (editingId) {
        await supabase.from('daily_call_logs_2024').update(payload).eq('id', editingId);
      } else {
        await supabase.from('daily_call_logs_2024').insert([payload]);
      }
      resetForm();
      fetchLogs();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQueueToCall = (log) => {
    setFormData({
      staff_name: formData.staff_name,
      customer_name: log.customer_name,
      phone_number: log.phone_number,
      reason: log.reason,
      status: 'Answered',
      comment: log.comment || ''
    });
    setEditingId(log.id);
  };

  const promoteToFollowUp = async (log, updates = {}) => {
    try {
      const historyEntry = {
        date: new Date().toLocaleString(),
        comment: `PROMOTED FROM CALL LOG [${new Date().toLocaleString()}]: ${log.comment || 'NO COMMENT'}`,
        staff: log.staff_name || 'SYSTEM',
        action: updates.temperature === 'Hot' ? 'Hot Prospect' : 'Moved to CRM'
      };

      const { error: insertError } = await supabase
        .from('follow_ups_2024')
        .insert([{
          customer_name: log.customer_name,
          phone_number: log.phone_number,
          original_reason: log.reason,
          status: updates.status || 'Active',
          temperature: updates.temperature || 'Warm',
          next_follow_up: updates.next_follow_up || null,
          history: [historyEntry]
        }]);

      if (insertError) throw insertError;
      
      // Delete from call logs after successful promotion
      await supabase.from('daily_call_logs_2024').delete().eq('id', log.id);
      
      alert(`✅ ${log.customer_name} moved to Follow-Ups Registry`);
      fetchLogs();
      setShowDatePicker(null);
    } catch (err) {
      alert("Promotion failed: " + err.message);
    }
  };

  const closeLog = async (log) => {
    if (!confirm("Are you sure you want to CLOSE this log and move to Closed Registry?")) return;
    try {
      const historyEntry = {
        date: new Date().toLocaleString(),
        comment: `CLOSED FROM CALL LOG: ${log.comment || 'N/A'}`,
        staff: log.staff_name,
        action: 'Closed'
      };

      await supabase.from('follow_ups_2024').insert([{
        customer_name: log.customer_name,
        phone_number: log.phone_number,
        original_reason: log.reason,
        status: 'Closed',
        history: [historyEntry]
      }]);

      await supabase.from('daily_call_logs_2024').delete().eq('id', log.id);
      fetchLogs();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ staff_name: formData.staff_name, customer_name: '', phone_number: '', reason: '', status: 'Answered', comment: '' });
  };

  const { queueItems, historyGroups } = useMemo(() => {
    const search = searchTerm.toLowerCase();
    const filtered = logs.filter(log => 
      (log.customer_name || '').toLowerCase().includes(search) ||
      (log.phone_number || '').includes(search) ||
      (log.reason || '').toLowerCase().includes(search)
    );

    const queue = [];
    const history = {};

    filtered.forEach(log => {
      if (log.status === 'To Call') {
        queue.push(log);
      } else {
        const displayDate = log.updated_at || log.created_at;
        const date = new Date(displayDate).toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        if (!history[date]) history[date] = [];
        history[date].push(log);
      }
    });

    return { queueItems: queue, historyGroups: history };
  }, [logs, searchTerm]);

  return (
    <div className="flex flex-col xl:flex-row gap-3">
      
      {/* COLUMN 1: FORM */}
      <div className="w-full xl:w-[360px] shrink-0 flex flex-col">
        <div className="bg-white rounded-[32px] shadow-xl border border-gray-100 flex flex-col h-full overflow-hidden">
          <div className={`${editingId ? 'bg-orange-600' : 'bg-blue-700'} p-6 text-white shrink-0`}>
            <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-3">
              <SafeIcon icon={editingId ? FiEdit : FiPhoneCall} />
              {editingId ? 'Process Call' : 'New Call Log'}
            </h3>
          </div>
          <form onSubmit={handleSaveCall} className="p-6 space-y-4 overflow-y-auto no-scrollbar max-h-[70vh] xl:max-h-none xl:flex-1">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-gray-400 uppercase ml-1 tracking-widest">Encoded By</label>
              <select value={formData.staff_name} onChange={e => setFormData({...formData, staff_name: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-blue-100 uppercase">
                {staffMembers.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <FormInput label="Customer Name" value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} placeholder="NAME" required />
            <div className="space-y-1">
              <label className="text-[8px] font-black text-gray-400 uppercase ml-1 tracking-widest">Phone Number</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.phone_number}
                  onChange={e => { setFormData({...formData, phone_number: e.target.value}); setPhoneMatches([]); }}
                  placeholder="09XX..."
                  required
                  className="flex-1 min-w-0 px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-blue-100"
                />
                <button type="button" onClick={() => lookupPhone(formData.phone_number)}
                  className="shrink-0 px-3 py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase hover:bg-indigo-700 transition-all">
                  {lookingUp ? '...' : 'Check'}
                </button>
              </div>

              {/* Phone match results */}
              {phoneMatches.length > 0 && (
                <div className="mt-2 space-y-2">
                  <p className="text-[8px] font-black text-orange-600 uppercase tracking-widest">⚠ {phoneMatches.length} existing record(s) found:</p>
                  {phoneMatches.map((m, i) => (
                    <div key={i} className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black text-gray-900 uppercase">{m.customer_name}</p>
                          <p className="text-[8px] font-black text-orange-600 uppercase">{m._source} • {m.status}</p>
                          {m.last_contacted_at && <p className="text-[7px] text-gray-400 font-bold">Last: {new Date(m.last_contacted_at).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}</p>}
                          {m.created_at && !m.last_contacted_at && <p className="text-[7px] text-gray-400 font-bold">Added: {new Date(m.created_at).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}</p>}
                        </div>
                        <button type="button"
                          onClick={() => { setFormData({...formData, customer_name: m.customer_name, phone_number: m.phone_number, status: 'To Call'}); setPhoneMatches([]); }}
                          className="text-[7px] font-black px-2 py-1 bg-indigo-600 text-white rounded-lg uppercase">
                          Use
                        </button>
                      </div>
                    </div>
                  ))}
                  <p className="text-[7px] font-black text-gray-400 uppercase">You can still proceed — this is just a warning.</p>
                </div>
              )}
              {phoneMatches.length === 0 && formData.phone_number.length >= 7 && !lookingUp && (
                <p className="text-[7px] font-black text-green-600 uppercase mt-1">✓ No existing records found</p>
              )}
            </div>
            <FormInput label="Reason" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} placeholder="INQUIRY REASON" required />
            
            <div className="space-y-1">
              <label className="text-[8px] font-black text-gray-400 uppercase ml-1 tracking-widest">Update status</label>
              <div className="grid grid-cols-3 gap-1">
                <StatusToggle active={formData.status === 'Answered'} onClick={() => setFormData({...formData, status: 'Answered'})} label="Answer" color="bg-green-600" />
                <StatusToggle active={formData.status === 'Not Answered'} onClick={() => setFormData({...formData, status: 'Not Answered'})} label="No Ans" color="bg-red-600" />
                <StatusToggle active={formData.status === 'To Call'} onClick={() => setFormData({...formData, status: 'To Call'})} label="Queue" color="bg-indigo-600" />
              </div>
            </div>

            {/* Quick Call Attempt Buttons */}
            <div className="space-y-1">
              <label className="text-[8px] font-black text-gray-400 uppercase ml-1 tracking-widest">Call Attempts</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(n => (
                  <button key={n} type="button"
                    onClick={() => {
                      const t = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                      setFormData(prev => ({
                        ...prev,
                        comment: `CALLED ${n}X @ ${t}`,
                        status: 'Not Answered'
                      }));
                    }}
                    className="py-3 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-blue-100 hover:border-blue-600 flex flex-col items-center gap-1">
                    <span className="text-base font-black">{n}x</span>
                    <span className="text-[7px]">Attempted</span>
                  </button>
                ))}
              </div>
            </div>

            <textarea value={formData.comment} onChange={e => setFormData({...formData, comment: e.target.value})} placeholder="Interaction remarks..." rows={3} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none" />
            
            {/* Processing staff dropdown — only shown when processing a To Call item */}
            {editingId && (
              <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-400 uppercase ml-1 tracking-widest">Processed By</label>
                <select value={formData.staff_name} onChange={e => setFormData({...formData, staff_name: e.target.value})}
                  className="w-full px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-orange-100 uppercase">
                  {staffMembers.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            )}

            <button type="submit" disabled={isSaving} className={`w-full py-4 ${editingId ? 'bg-orange-600' : 'bg-blue-700'} text-white rounded-2xl font-black uppercase tracking-widest shadow-lg text-[10px]`}>
              {isSaving ? 'Saving...' : editingId ? 'Update Record' : 'Save Entry'}
            </button>

            {/* Extra actions when processing */}
            {editingId && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button type="button" disabled={isSaving}
                  onClick={async () => {
                    const log = { ...formData, id: editingId, staff_name: formData.staff_name };
                    await promoteToFollowUp(log);
                    resetForm();
                  }}
                  className="py-3 bg-green-50 hover:bg-green-600 text-green-600 hover:text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all border border-green-100 flex items-center justify-center gap-1">
                  <SafeIcon icon={FiUserPlus} className="text-xs" /> Promote
                </button>
                <button type="button" disabled={isSaving}
                  onClick={async () => {
                    const now = new Date().toISOString();
                    await supabase.from('daily_call_logs_2024').update({
                      status: 'Not Answered',
                      comment: (formData.comment || '') + ' [CLOSED]',
                      staff_name: formData.staff_name,
                      updated_at: now,
                    }).eq('id', editingId);
                    resetForm();
                    fetchLogs();
                  }}
                  className="py-3 bg-red-50 hover:bg-red-600 text-red-500 hover:text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all border border-red-100 flex items-center justify-center gap-1">
                  <SafeIcon icon={FiXCircle} className="text-xs" /> Close Lead
                </button>
              </div>
            )}

            {editingId && <button type="button" onClick={resetForm} className="w-full text-[9px] font-black text-gray-400 uppercase text-center mt-1">Cancel / Clear</button>}
          </form>
        </div>
      </div>

      {/* COLUMN 2: PRIORITY LIST */}
      <div className="flex-1 min-w-0 flex flex-col h-full">
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
          <div className="px-6 py-5 border-b flex justify-between items-center bg-indigo-50/50">
            <h3 className="text-[10px] font-black text-indigo-700 uppercase tracking-[0.2em] flex items-center gap-2">
              <SafeIcon icon={FiPhoneForwarded} /> Priority: To Call List
            </h3>
            <span className="text-[9px] font-black bg-indigo-600 text-white px-3 py-1 rounded-full">{queueItems.length} PENDING</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar bg-gray-50/20">
            {loading ? (
              <div className="py-20 text-center"><FiRefreshCw className="animate-spin text-indigo-200 text-3xl mx-auto" /></div>
            ) : queueItems.length > 0 ? (
              queueItems.map(item => (
                <div key={item.id} className="p-5 bg-white border border-indigo-100 rounded-[24px] group shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-[12px] font-black text-gray-900 uppercase tracking-tight">{item.customer_name || 'UNNAMED LEAD'}</h4>
                      <p className="text-[10px] font-bold text-indigo-600">{item.phone_number}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[8px] font-black text-gray-400 uppercase">By {item.staff_name}</span>
                        <span className="text-[8px] font-black text-indigo-400 uppercase">{item.reason}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleQueueToCall(item)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all"
                    >
                      Process <SafeIcon icon={FiArrowRight} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 py-20">
                <SafeIcon icon={FiCheckCircle} className="text-4xl mb-3 opacity-20" />
                <p className="text-[9px] font-black uppercase tracking-widest">No Priority Calls</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* COLUMN 3: CALL HISTORY */}
      <div className="w-full xl:w-[420px] shrink-0 flex flex-col">
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
          <div className="px-6 py-5 border-b space-y-4 bg-gray-50">
            <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] flex items-center gap-2">
              <SafeIcon icon={FiList} /> Call History
            </h3>
            <div className="relative">
              <SafeIcon icon={FiSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search history..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
          <div className="overflow-y-auto p-4 space-y-8 no-scrollbar max-h-[60vh] xl:max-h-[calc(100vh-220px)]">
            {Object.keys(historyGroups).length > 0 ? (
              Object.entries(historyGroups).map(([date, items]) => (
                <div key={date} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest whitespace-nowrap bg-blue-50 px-3 py-1 rounded-full">{date}</span>
                    <div className="h-px w-full bg-gray-100"></div>
                  </div>
                  {items.map(log => (
                    <div key={log.id} className="p-5 bg-white border border-gray-100 rounded-[24px] hover:shadow-xl hover:border-blue-100 transition-all group relative">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-[11px] font-black text-gray-900 uppercase">{log.customer_name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[7px] font-black px-2 py-0.5 rounded-md uppercase ${log.status === 'Answered' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{log.status}</span>
                            <span className="text-[8px] font-bold text-gray-400">{log.phone_number}</span>
                          </div>
                        </div>
                        <div className="text-right space-y-0.5">
                          <div className="text-[9px] font-black text-indigo-600 uppercase">{new Date(log.updated_at || log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          <div className="text-[7px] font-black text-gray-400 uppercase">{new Date(log.updated_at || log.created_at).toLocaleDateString('en-PH', {month:'short', day:'numeric', year:'numeric'})}</div>
                          <div className="text-[7px] font-black text-blue-500 uppercase">BY {log.staff_name}</div>
                        </div>
                      </div>
                      <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">{log.reason}</div>
                      {log.comment && (
                        <p className="text-[9px] font-bold text-gray-500 uppercase italic bg-gray-50 p-3 rounded-xl border border-gray-100">"{log.comment}"</p>
                      )}
                      
                      {/* ACTIONS */}
                      <div className="absolute right-3 bottom-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <ActionBtn 
                          icon={FiUserPlus} 
                          title="Promote to Follow-Up"
                          onClick={() => promoteToFollowUp(log)} 
                          color="text-green-600" 
                        />
                        <ActionBtn icon={FiZap} title="Tag as Hot" onClick={() => promoteToFollowUp(log, { temperature: 'Hot' })} color="text-orange-500" />
                        <ActionBtn icon={FiCalendar} title="Schedule" onClick={() => setShowDatePicker(log)} color="text-blue-600" />
                        <ActionBtn icon={FiCheckSquare} title="Close Lead" onClick={() => closeLog(log)} color="text-gray-900" />
                        <ActionBtn icon={FiEdit} title="Edit" onClick={() => {setEditingId(log.id); setFormData(log);}} color="text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="py-20 text-center text-gray-300 font-black uppercase text-[10px]">No history found</div>
            )}
          </div>
        </div>
      </div>

      {showDatePicker && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="bg-blue-700 p-6 text-white flex justify-between items-center">
              <h4 className="font-black uppercase text-xs tracking-widest">Schedule Follow-up</h4>
              <button onClick={() => setShowDatePicker(null)}><SafeIcon icon={FiX} /></button>
            </div>
            <div className="p-8 space-y-6">
              <input type="date" value={futureDate} onChange={e => setFutureDate(e.target.value)} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-sm" />
              <button onClick={() => promoteToFollowUp(showDatePicker, { next_follow_up: futureDate })} disabled={!futureDate} className="w-full py-4 bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl disabled:opacity-50">Set Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FormInput = ({ label, ...props }) => (
  <div className="space-y-1">
    <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
    <input {...props} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 transition-all text-xs font-bold text-gray-800" />
  </div>
);

const StatusToggle = ({ active, onClick, label, color }) => (
  <button 
    type="button" 
    onClick={onClick} 
    className={`py-2 rounded-lg font-black text-[8px] uppercase border transition-all ${active ? `${color} text-white shadow-md` : 'bg-gray-50 text-gray-400 border-gray-100'}`}
  >
    {label}
  </button>
);

const ActionBtn = ({ icon, onClick, color, title }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onClick(); }} 
    title={title}
    className={`p-2 bg-white rounded-xl shadow-md border hover:scale-110 transition-all ${color}`}
  >
    <SafeIcon icon={icon} className="text-sm" />
  </button>
);

export default CallLogModule;