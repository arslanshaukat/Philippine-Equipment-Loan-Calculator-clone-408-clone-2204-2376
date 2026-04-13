import React, { useState, useEffect } from 'react';
import { 
  FiPhoneCall, FiUser, FiMessageSquare, FiCheckCircle, FiXCircle, FiSave, 
  FiList, FiTrendingUp, FiTrash2, FiClock, FiSearch, FiActivity, 
  FiUserCheck, FiCalendar, FiEye, FiX, FiLock, FiEdit, FiRotateCcw, 
  FiRepeat, FiTarget, FiChevronDown, FiAlertCircle, FiArrowRight 
} from 'react-icons/fi';
import { supabase } from '../supabase/supabase';
import SafeIcon from '../common/SafeIcon';

const CallLogModule = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [isMoving, setIsMoving] = useState(false);

  const [formData, setFormData] = useState({
    staff_name: 'RHEA',
    customer_name: '',
    phone_number: '',
    reason: '',
    status: 'Answered',
    comment: ''
  });

  const staffMembers = [
    { id: 1, name: 'RHEA', goal: 30 },
    { id: 2, name: 'MEL', goal: 30 }, 
    { id: 3, name: 'CARMELITA', goal: 30 },
    { id: 4, name: 'ARSLAN', goal: 30 }
  ];

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

  const handleSaveCall = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        customer_name: formData.customer_name.toUpperCase(),
        reason: formData.reason.toUpperCase(),
        is_answered: formData.status === 'Answered'
      };

      if (editingId) {
        const { error } = await supabase
          .from('daily_call_logs_2024')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('daily_call_logs_2024')
          .insert([payload]);
        if (error) throw error;
      }
      resetForm();
      fetchLogs();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveToHistory = async (log) => {
    try {
      const { error } = await supabase
        .from('daily_call_logs_2024')
        .update({ status: 'Answered', is_answered: true })
        .eq('id', log.id);
      if (error) throw error;
      fetchLogs();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleMoveToFollowUp = async (log) => {
    if (!confirm(`Promote "${log.customer_name}" to Follow-Ups?`)) return;
    setIsMoving(true);
    try {
      const historyEntry = {
        date: new Date().toLocaleString(),
        comment: `PRIORITY CALL LOG: ${log.comment || 'NO COMMENT'}`,
        staff: log.staff_name
      };

      const { error: insertError } = await supabase
        .from('follow_ups_2024')
        .insert([{
          customer_name: log.customer_name,
          phone_number: log.phone_number,
          original_reason: log.reason,
          status: 'Active',
          history: [historyEntry]
        }]);

      if (insertError) throw insertError;

      const { error: deleteError } = await supabase
        .from('daily_call_logs_2024')
        .delete()
        .eq('id', log.id);
      
      if (deleteError) throw deleteError;
      
      alert("✅ Successfully promoted to Follow-Ups!");
      setSelectedLog(null);
      fetchLogs();
    } catch (err) {
      alert("Error moving record: " + err.message);
    } finally {
      setIsMoving(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      staff_name: formData.staff_name,
      customer_name: '',
      phone_number: '',
      reason: '',
      status: 'Answered',
      comment: ''
    });
  };

  const priorityList = logs.filter(l => l.status === 'To Call');
  const historyList = logs.filter(l => l.status !== 'To Call');
  const filteredHistory = historyList.filter(log => 
    Object.values(log).some(val => val?.toString().toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupLogsByDate = (data) => {
    return data.reduce((groups, log) => {
      const date = new Date(log.created_at).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(log);
      return groups;
    }, {});
  };

  const groupedHistory = groupLogsByDate(filteredHistory);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LOGGING FORM */}
        <div className="lg:col-span-1">
          <div className={`bg-white rounded-[40px] shadow-xl border overflow-hidden sticky top-8 transition-all ${editingId ? 'ring-4 ring-orange-400 border-orange-200' : 'border-gray-100'}`}>
            <div className={`${editingId ? 'bg-orange-600' : 'bg-blue-700'} p-8 text-white transition-colors`}>
              <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                <SafeIcon icon={editingId ? FiEdit : FiPhoneCall} />
                {editingId ? 'Edit Call' : 'New Call Log'}
              </h3>
            </div>
            
            <form onSubmit={handleSaveCall} className="p-8 space-y-5">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Staff Member</label>
              <select 
                value={formData.staff_name} 
                onChange={e => setFormData({...formData, staff_name: e.target.value})}
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-blue-100 transition-all"
              >
                {staffMembers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>

              <LogInput label="Customer Name" value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} placeholder="NAME" required />
              <LogInput label="Phone Number" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} placeholder="09XX..." required />
              <LogInput label="Reason / Inquiry" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} placeholder="E.G. UNIT PRICE INQUIRY" required />
              
              <div className="pt-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1">Process Result</label>
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setFormData({...formData, status: 'Answered'})} className={`py-3 rounded-xl font-black text-[9px] uppercase border flex items-center justify-center gap-2 transition-all ${formData.status === 'Answered' ? 'bg-green-600 text-white border-green-600 shadow-lg' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                      <SafeIcon icon={FiCheckCircle} /> Answered
                    </button>
                    <button type="button" onClick={() => setFormData({...formData, status: 'Not Answered'})} className={`py-3 rounded-xl font-black text-[9px] uppercase border flex items-center justify-center gap-2 transition-all ${formData.status === 'Not Answered' ? 'bg-red-600 text-white border-red-600 shadow-lg' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                      <SafeIcon icon={FiXCircle} /> Not Answered
                    </button>
                  </div>
                  {(formData.staff_name === 'CARMELITA' || formData.staff_name === 'ARSLAN') && (
                    <button type="button" onClick={() => setFormData({...formData, status: 'To Call'})} className={`w-full py-4 rounded-xl font-black text-[10px] uppercase border flex items-center justify-center gap-2 transition-all ${formData.status === 'To Call' ? 'bg-orange-500 text-white border-orange-500 shadow-lg animate-pulse' : 'bg-orange-50 text-orange-400 border-orange-100'}`}>
                      <SafeIcon icon={FiTarget} /> Queue to Call
                    </button>
                  )}
                </div>
              </div>

              <textarea value={formData.comment} onChange={e => setFormData({...formData, comment: e.target.value})} placeholder="Details..." rows={3} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-100" />
              <button type="submit" disabled={isSaving} className={`w-full py-5 ${editingId ? 'bg-orange-600' : 'bg-blue-700'} text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl transition-all`}>
                {isSaving ? 'Saving...' : 'Save Entry'}
              </button>
              {editingId && <button type="button" onClick={resetForm} className="w-full text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600">Cancel Edit</button>}
            </form>
          </div>
        </div>

        {/* LIST SECTION */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* PRIORITY QUEUE SECTION - COMPACT LIST VIEW */}
          <div className="bg-white rounded-[40px] shadow-sm border-2 border-orange-100 overflow-hidden">
            <div className="p-6 border-b border-orange-50 bg-orange-50/30 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-orange-500 p-2 rounded-xl text-white shadow-lg animate-bounce">
                  <SafeIcon icon={FiTarget} />
                </div>
                <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">Priority: To Call List</h3>
              </div>
              <span className="text-[10px] font-black text-orange-600 bg-white border border-orange-200 px-4 py-1.5 rounded-full uppercase">
                {priorityList.length} Pending
              </span>
            </div>
            
            <div className="divide-y divide-orange-50">
              {priorityList.length > 0 ? (
                priorityList.map(item => (
                  <div key={item.id} className="px-8 py-5 hover:bg-orange-50/40 transition-all group flex items-center justify-between">
                    <div className="flex items-center gap-6 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 border border-orange-200">
                        <SafeIcon icon={FiPhoneCall} className="text-xl" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="font-black text-gray-900 uppercase text-[11px] truncate">{item.customer_name}</span>
                          <span className="text-[8px] font-black text-orange-600 bg-white border border-orange-100 px-2 py-0.5 rounded-md uppercase tracking-tighter">By {item.staff_name}</span>
                        </div>
                        <div className="text-[9px] font-bold text-orange-600 uppercase mt-1 truncate">NEEDS: {item.reason}</div>
                        <div className="text-[10px] font-black text-gray-400 mt-0.5">{item.phone_number}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => handleMoveToHistory(item)} 
                        title="Move to Call History"
                        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-600 border border-orange-100 rounded-xl font-black text-[9px] uppercase hover:bg-green-600 hover:text-white hover:border-green-600 transition-all shadow-sm"
                      >
                        <SafeIcon icon={FiCheckCircle} /> History
                      </button>
                      <button 
                        onClick={() => handleMoveToFollowUp(item)} 
                        title="Move to Follow Up"
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl font-black text-[9px] uppercase hover:bg-orange-700 transition-all shadow-lg shadow-orange-100"
                      >
                        <SafeIcon icon={FiRepeat} /> Follow Up
                      </button>
                      <button 
                        onClick={() => { setEditingId(item.id); setFormData(item); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                        className="p-2.5 bg-white text-gray-300 border border-orange-50 rounded-xl hover:text-blue-600 transition-all"
                      >
                        <SafeIcon icon={FiEdit} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest">
                  No priority calls encoded.
                </div>
              )}
            </div>
          </div>

          {/* CALL HISTORY SECTION */}
          <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                <SafeIcon icon={FiCalendar} /> Call History
              </h3>
              <div className="relative">
                <SafeIcon icon={FiSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Filter History..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>

            <div className="p-0">
              {loading ? (
                <div className="p-20 text-center text-gray-300 font-black uppercase text-[10px]">Loading...</div>
              ) : Object.keys(groupedHistory).length > 0 ? (
                Object.entries(groupedHistory).map(([date, items]) => (
                  <div key={date} className="border-b border-gray-100 last:border-0">
                    <div className="bg-gray-50/80 px-8 py-3 flex items-center gap-3 border-y border-gray-100">
                      <div className="w-1 h-3 bg-blue-600 rounded-full" />
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">{date}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {items.map(log => (
                        <div key={log.id} onClick={() => setSelectedLog(log)} className="px-8 py-5 hover:bg-blue-50/40 transition-all cursor-pointer group flex items-center justify-between">
                          <div className="flex items-center gap-6 flex-1">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${log.status === 'Answered' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                              <SafeIcon icon={log.status === 'Answered' ? FiUserCheck : FiXCircle} className="text-xl" />
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <span className="font-black text-gray-900 uppercase text-[11px]">{log.customer_name}</span>
                                <span className="text-[9px] text-blue-600 font-black uppercase tracking-tighter bg-blue-50 px-2 py-0.5 rounded-md">{log.staff_name}</span>
                              </div>
                              <div className="text-[9px] font-bold text-gray-400 uppercase mt-1">REASON: {log.reason}</div>
                            </div>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={(e) => { e.stopPropagation(); handleMoveToFollowUp(log); }} className="p-3 bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-100 hover:scale-110 transition-all"><SafeIcon icon={FiRepeat} /></button>
                            <button onClick={(e) => { e.stopPropagation(); setEditingId(log.id); setFormData(log); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-3 bg-white text-gray-400 border rounded-xl hover:text-blue-600"><SafeIcon icon={FiEdit} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-32 text-center text-gray-300 font-black uppercase text-[10px]">No history available.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-blue-700 p-8 text-white flex justify-between items-center">
              <h3 className="text-xl font-black uppercase">Log Analysis</h3>
              <button onClick={() => setSelectedLog(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"><SafeIcon icon={FiX} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <DetailBox label="Customer" val={selectedLog.customer_name} />
                <DetailBox label="Status" val={selectedLog.status} color={selectedLog.status === 'To Call' ? 'text-orange-500' : selectedLog.status === 'Not Answered' ? 'text-red-600' : 'text-gray-900'} />
              </div>
              <div className="pt-4 border-t border-gray-100">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Remarks / Details</label>
                <div className="bg-gray-50 p-5 rounded-2xl text-xs font-bold text-gray-700 uppercase italic">
                  "{selectedLog.comment || 'No comments recorded.'}"
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => handleMoveToFollowUp(selectedLog)} className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2">
                  <SafeIcon icon={FiRepeat} /> Promote to Follow-Up
                </button>
                <button onClick={() => setSelectedLog(null)} className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LogInput = ({ label, ...props }) => (
  <div>
    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">{label}</label>
    <input {...props} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm font-bold text-gray-800" />
  </div>
);

const DetailBox = ({ label, val, color = 'text-gray-900' }) => (
  <div>
    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">{label}</label>
    <p className={`text-sm font-black uppercase ${color}`}>{val}</p>
  </div>
);

export default CallLogModule;