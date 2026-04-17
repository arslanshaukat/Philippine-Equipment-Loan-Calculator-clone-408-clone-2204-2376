import React, { useState, useEffect, useMemo } from 'react';
import { 
  FiRepeat, FiSearch, FiMessageSquare, FiClock, FiX, FiSave, 
  FiTrash2, FiCalendar, FiZap, FiActivity, FiFlag, FiAlertCircle, 
  FiCheckCircle, FiCheckSquare, FiArchive, FiUserCheck, FiPhone,
  FiUser
} from 'react-icons/fi';
import { supabase } from '../supabase/supabase';
import SafeIcon from '../common/SafeIcon';

const FollowUpModule = () => {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Due');
  const [selectedItem, setSelectedItem] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [actionType, setActionType] = useState('Call');
  const [selectedStaff, setSelectedStaff] = useState('RHEA');
  const [isSaving, setIsSaving] = useState(false);

  const staffMembers = ["RHEA", "MEL", "CARMELITA", "ARSLAN"];

  const fetchFollowUps = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('follow_ups_2024')
        .select('*')
        .order('next_follow_up', { ascending: true, nullsFirst: false });
      if (error) throw error;
      setFollowUps(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const filteredData = useMemo(() => {
    return followUps.filter(item => {
      const nameMatch = (item.customer_name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      const phoneMatch = (item.phone_number || '').includes(searchTerm);
      if (!nameMatch && !phoneMatch) return false;

      switch (activeTab) {
        case 'Due': return item.next_follow_up && item.next_follow_up <= today && item.status !== 'Closed';
        case 'Upcoming': return item.next_follow_up && item.next_follow_up > today && item.status !== 'Closed';
        case 'Hot': return item.temperature === 'Hot' && item.status !== 'Closed';
        case 'Closed': return item.status === 'Closed';
        default: return item.status !== 'Closed';
      }
    });
  }, [followUps, searchTerm, activeTab, today]);

  const handleUpdateLead = async (id, updates) => {
    try {
      // Create a system log for major status changes
      let systemLog = null;
      const timestamp = new Date().toLocaleString();
      
      if (updates.status === 'Closed') {
        systemLog = { 
          date: timestamp, 
          comment: `REGISTRY CLOSED`, 
          staff: selectedStaff, 
          action: 'Closed' 
        };
      } else if (updates.temperature === 'Hot') {
        systemLog = { 
          date: timestamp, 
          comment: `PROMOTED TO HOT PROSPECT`, 
          staff: selectedStaff, 
          action: 'Hot Prospect' 
        };
      }

      const existingHistory = followUps.find(f => f.id === id)?.history || [];
      const updatedHistory = systemLog ? [systemLog, ...existingHistory] : existingHistory;

      await supabase.from('follow_ups_2024').update({
        ...updates,
        history: updatedHistory,
        updated_at: new Date().toISOString()
      }).eq('id', id);

      fetchFollowUps();
      if (selectedItem?.id === id) setSelectedItem(prev => ({ ...prev, ...updates, history: updatedHistory }));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddRemark = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSaving(true);
    
    const logEntry = {
      date: new Date().toLocaleString(),
      comment: newComment.toUpperCase(),
      staff: selectedStaff,
      action: actionType,
      reminder: reminderDate || null
    };

    const updatedHistory = [logEntry, ...(selectedItem.history || [])];

    try {
      await supabase.from('follow_ups_2024').update({
        history: updatedHistory,
        next_follow_up: reminderDate || selectedItem.next_follow_up,
        next_action_type: actionType,
        status: 'Active',
        last_contacted_at: new Date().toISOString()
      }).eq('id', selectedItem.id);

      setNewComment('');
      setReminderDate('');
      fetchFollowUps();
      setSelectedItem(prev => ({ 
        ...prev, 
        history: updatedHistory, 
        next_follow_up: reminderDate || prev.next_follow_up,
        next_action_type: actionType
      }));
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const password = prompt("⚠️ ADMIN CLEARANCE\nEnter Password to delete:");
    if (password === 'Subic@123') {
      await supabase.from('follow_ups_2024').delete().eq('id', id);
      fetchFollowUps();
      setSelectedItem(null);
    }
  };

  // Helper to find specific milestone logs
  const getMilestoneLog = (history, actionType) => {
    return (history || []).find(log => log.action === actionType);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-180px)]">
      <div className="w-full xl:w-80 shrink-0 space-y-4">
        <div className="bg-white p-6 rounded-[32px] border shadow-sm border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg"><SafeIcon icon={FiRepeat} /></div>
            <div>
              <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest leading-none">Lead Hub</h3>
              <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-1">Registry v2.5</p>
            </div>
          </div>

          <div className="space-y-1">
            <SidebarNavBtn active={activeTab==='Due'} onClick={()=>setActiveTab('Due')} icon={FiAlertCircle} label="Due Today" count={followUps.filter(f => f.next_follow_up && f.next_follow_up <= today && f.status !== 'Closed').length} color="text-red-500" />
            <SidebarNavBtn active={activeTab==='Upcoming'} onClick={()=>setActiveTab('Upcoming')} icon={FiCalendar} label="Future Tasks" count={followUps.filter(f => f.next_follow_up && f.next_follow_up > today && f.status !== 'Closed').length} color="text-blue-500" />
            <SidebarNavBtn active={activeTab==='Hot'} onClick={()=>setActiveTab('Hot')} icon={FiZap} label="Hot Prospects" count={followUps.filter(f => f.temperature === 'Hot' && f.status !== 'Closed').length} color="text-orange-500" />
            <SidebarNavBtn active={activeTab==='Closed'} onClick={()=>setActiveTab('Closed')} icon={FiArchive} label="Closed Registry" count={followUps.filter(f => f.status === 'Closed').length} color="text-gray-400" />
            <SidebarNavBtn active={activeTab==='All'} onClick={()=>setActiveTab('All')} icon={FiActivity} label="Full Registry" count={followUps.length} />
          </div>

          <div className="mt-6 pt-6 border-t border-gray-50">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Authorized Staff</label>
            <select 
              value={selectedStaff} 
              onChange={e => setSelectedStaff(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-100"
            >
              {staffMembers.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white p-4 rounded-[24px] border shadow-sm border-gray-100 relative">
          <SafeIcon icon={FiSearch} className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search Database..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl text-[10px] font-black uppercase outline-none" 
          />
        </div>
      </div>

      <div className="flex-1 bg-white rounded-[40px] border shadow-sm border-gray-100 overflow-hidden flex flex-col">
        <div className="px-8 py-6 border-b bg-gray-50/30 flex justify-between items-center">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">{activeTab} Registry</h2>
          <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full uppercase">{filteredData.length} Records</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-gray-50/20">
          {filteredData.map(item => {
            const hotLog = getMilestoneLog(item.history, 'Hot Prospect');
            const closedLog = getMilestoneLog(item.history, 'Closed');

            return (
              <div 
                key={item.id} 
                onClick={() => setSelectedItem(item)}
                className={`p-6 rounded-[32px] border transition-all cursor-pointer relative overflow-hidden ${selectedItem?.id === item.id ? 'bg-indigo-600 text-white shadow-2xl border-indigo-600' : 'bg-white border-gray-100 hover:border-indigo-200'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest ${selectedItem?.id === item.id ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>{item.lead_type || 'Inquiry'}</span>
                    {item.temperature === 'Hot' && (
                      <span className="bg-orange-500 text-white px-2 py-0.5 rounded-lg text-[7px] font-black uppercase">Hot</span>
                    )}
                  </div>
                  {item.next_follow_up && item.status !== 'Closed' && (
                    <span className={`px-2.5 py-1 rounded-xl text-[7px] font-black uppercase tracking-widest flex items-center gap-1.5 ${selectedItem?.id === item.id ? 'bg-black/20 text-white' : item.next_follow_up <= today ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-blue-50 text-blue-600'}`}>
                      <SafeIcon icon={FiClock} /> {item.next_follow_up <= today ? 'DUE NOW' : item.next_follow_up}
                    </span>
                  )}
                </div>
                <h4 className="font-black uppercase text-xs truncate mb-1">{item.customer_name}</h4>
                <div className="flex flex-col gap-1">
                  <p className={`text-[10px] font-bold ${selectedItem?.id === item.id ? 'text-white/70' : 'text-gray-400'}`}>{item.phone_number}</p>
                  
                  {/* Milestone display in list */}
                  {activeTab === 'Hot' && hotLog && (
                    <div className={`mt-2 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${selectedItem?.id === item.id ? 'text-white/60' : 'text-orange-600'}`}>
                      <FiZap /> Marked Hot on {hotLog.date} by {hotLog.staff}
                    </div>
                  )}
                  {activeTab === 'Closed' && closedLog && (
                    <div className={`mt-2 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${selectedItem?.id === item.id ? 'text-white/60' : 'text-gray-500'}`}>
                      <FiCheckCircle /> Closed on {closedLog.date} by {closedLog.staff}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="w-full xl:w-[500px] shrink-0">
        {selectedItem ? (
          <div className="bg-white h-full rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in slide-in-from-right-8 duration-300">
            <div className={`px-8 py-10 text-white shrink-0 relative ${selectedItem.status === 'Closed' ? 'bg-gray-700' : 'bg-gray-900'}`}>
              <div className="absolute top-8 right-8 flex gap-2">
                <button onClick={() => setSelectedItem(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"><SafeIcon icon={FiX} /></button>
              </div>
              <div className="flex gap-2 mb-4">
                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${selectedItem.temperature === 'Hot' ? 'bg-orange-500' : 'bg-blue-500'}`}>{selectedItem.temperature || 'Warm'}</span>
                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-white/20 ${selectedItem.status === 'Closed' ? 'bg-red-500' : 'bg-green-500'}`}>{selectedItem.status}</span>
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight leading-tight">{selectedItem.customer_name}</h3>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/50 uppercase"><SafeIcon icon={FiPhone} /> {selectedItem.phone_number}</div>
              </div>
            </div>

            <div className="flex divide-x divide-gray-100 border-b border-gray-100 shrink-0 bg-white">
              <QuickActionBtn 
                label={selectedItem.status === 'Closed' ? "RE-OPEN" : "CLOSE LOG"} 
                icon={selectedItem.status === 'Closed' ? FiActivity : FiCheckSquare} 
                onClick={() => handleUpdateLead(selectedItem.id, { status: selectedItem.status === 'Closed' ? 'Active' : 'Closed' })}
                color={selectedItem.status === 'Closed' ? 'text-green-600' : 'text-red-500'}
              />
              <QuickActionBtn 
                label="HOT LEAD" 
                icon={FiZap} 
                onClick={() => handleUpdateLead(selectedItem.id, { temperature: 'Hot' })}
                active={selectedItem.temperature === 'Hot'}
                color="text-orange-500"
              />
              <QuickActionBtn 
                label="DELETE" 
                icon={FiTrash2} 
                onClick={() => handleDelete(selectedItem.id)}
                color="text-red-400"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-gray-50/30">
              {selectedItem.status !== 'Closed' && (
                <div className="mb-12">
                  <SectionLabel icon={FiMessageSquare} text="Update Interaction" />
                  <form onSubmit={handleAddRemark} className="space-y-4">
                    <div className="bg-white p-6 rounded-[32px] border border-gray-200 shadow-sm transition-all hover:border-indigo-100">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-1">Interaction Type</label>
                          <select 
                            value={actionType} 
                            onChange={e => setActionType(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-100"
                          >
                            {['Call', 'Visit', 'Payment', 'Document'].map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-1">Reminder Date</label>
                          <input 
                            type="date" 
                            value={reminderDate} 
                            onChange={e => setReminderDate(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black outline-none" 
                          />
                        </div>
                      </div>
                      <textarea 
                        value={newComment} 
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Interaction details..."
                        rows={2}
                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-[11px] font-bold outline-none placeholder:text-gray-300 focus:ring-4 focus:ring-indigo-100"
                      />
                      <button 
                        type="submit" 
                        disabled={isSaving || !newComment.trim()}
                        className="w-full mt-4 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl disabled:opacity-50"
                      >Save Remark</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-6">
                <SectionLabel icon={FiClock} text="Activity History" />
                {selectedItem.history?.map((log, i) => (
                  <div key={i} className="border-l-2 border-indigo-100 pl-6 py-2 relative">
                    <div className="absolute -left-[5px] top-4 w-2 h-2 rounded-full bg-indigo-600" />
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${log.action === 'Closed' ? 'bg-red-50 text-red-600' : log.action === 'Hot Prospect' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>{log.action || 'Note'}</span>
                        <span className="text-[8px] font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                          <SafeIcon icon={FiUserCheck} className="text-[7px]" /> {log.staff}
                        </span>
                      </div>
                      <span className="text-[8px] font-black text-gray-400 uppercase">{log.date}</span>
                    </div>
                    <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm">
                      <p className="text-[11px] font-bold text-gray-700 uppercase leading-relaxed">{log.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-white rounded-[40px] border-2 border-dashed border-gray-100 p-12 text-center text-gray-300">
            <SafeIcon icon={FiRepeat} className="text-4xl mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">Select profile for lead intelligence</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SidebarNavBtn = ({ active, onClick, icon, label, count, color = "text-gray-500" }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${active ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'hover:bg-gray-50 text-gray-500 border border-transparent'}`}>
    <div className="flex items-center gap-3">
      <SafeIcon icon={icon} className={`text-lg ${active ? 'text-indigo-600' : color}`} />
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg ${active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{count}</span>
  </button>
);

const QuickActionBtn = ({ label, icon, onClick, active, color }) => (
  <button onClick={onClick} className={`flex-1 py-5 flex flex-col items-center gap-2 transition-all hover:bg-gray-50 ${active ? 'bg-indigo-50/50' : ''}`}>
    <SafeIcon icon={icon} className={`text-xl ${active ? 'text-indigo-600' : color}`} />
    <span className="text-[7px] font-black uppercase tracking-widest text-gray-400">{label}</span>
  </button>
);

const SectionLabel = ({ icon, text }) => (
  <div className="flex items-center gap-2 mb-4">
    <SafeIcon icon={icon} className="text-indigo-600 text-sm" />
    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{text}</span>
  </div>
);

export default FollowUpModule;