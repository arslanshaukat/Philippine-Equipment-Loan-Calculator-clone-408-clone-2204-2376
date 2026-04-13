import React, { useState, useEffect, useMemo } from 'react';
import { 
  FiRepeat, FiSearch, FiMessageSquare, FiClock, FiX, 
  FiSave, FiUser, FiPhone, FiTrash2, FiCalendar, 
  FiTrendingUp, FiMapPin, FiAward, FiZap, 
  FiActivity, FiFlag, FiChevronRight, FiAlertCircle,
  FiCheckCircle, FiPhoneCall, FiUserPlus
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
  const [isSaving, setIsSaving] = useState(false);

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

  const handleDelete = async (id) => {
    const password = prompt("⚠️ SECURITY CLEARANCE REQUIRED\nEnter Admin Password to delete:");
    if (password === 'Subic@123') {
      try {
        const { error } = await supabase.from('follow_ups_2024').delete().eq('id', id);
        if (error) throw error;
        fetchFollowUps();
        setSelectedItem(null);
      } catch (err) {
        alert(err.message);
      }
    } else if (password !== null) {
      alert("❌ INCORRECT PASSWORD");
    }
  };

  const filteredData = useMemo(() => {
    return followUps.filter(item => {
      const nameMatch = (item.customer_name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      const phoneMatch = (item.phone_number || '').includes(searchTerm);
      if (!nameMatch && !phoneMatch) return false;
      
      switch (activeTab) {
        case 'Due': return item.next_follow_up && item.next_follow_up <= today && item.status !== 'Closed';
        case 'Upcoming': return item.next_follow_up && item.next_follow_up > today;
        case 'Hot': return item.temperature === 'Hot';
        case 'Clients': return item.lead_type === 'Client';
        default: return true;
      }
    });
  }, [followUps, searchTerm, activeTab, today]);

  const handleUpdateLead = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('follow_ups_2024')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq(id.includes('-') ? 'id' : 'id', id); // Robust check
      if (error) throw error;
      fetchFollowUps();
      if (selectedItem?.id === id) setSelectedItem(prev => ({ ...prev, ...updates }));
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
      staff: 'RHEA',
      action: actionType,
      reminder: reminderDate || null
    };

    const updatedHistory = [logEntry, ...(selectedItem.history || [])];

    try {
      const { error } = await supabase
        .from('follow_ups_2024')
        .update({ 
          history: updatedHistory, 
          next_follow_up: reminderDate || selectedItem.next_follow_up,
          next_action_type: actionType,
          status: 'Active',
          last_contacted_at: new Date().toISOString()
        })
        .eq('id', selectedItem.id);

      if (error) throw error;
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

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-180px)]">
      {/* NAVIGATION PANEL */}
      <div className="w-full xl:w-80 shrink-0 space-y-4">
        <div className="bg-white p-6 rounded-[32px] border shadow-sm border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg"><SafeIcon icon={FiRepeat} /></div>
            <div>
              <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest leading-none">Command Center</h3>
              <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-1">Registry v2.1</p>
            </div>
          </div>
          <div className="space-y-1">
            <SidebarNavBtn active={activeTab === 'Due'} onClick={() => setActiveTab('Due')} icon={FiAlertCircle} label="Due Actions" count={followUps.filter(f => f.next_follow_up && f.next_follow_up <= today && f.status !== 'Closed').length} color="text-red-500" />
            <SidebarNavBtn active={activeTab === 'Upcoming'} onClick={() => setActiveTab('Upcoming')} icon={FiCalendar} label="Future Tasks" count={followUps.filter(f => f.next_follow_up && f.next_follow_up > today).length} color="text-blue-500" />
            <SidebarNavBtn active={activeTab === 'Hot'} onClick={() => setActiveTab('Hot')} icon={FiZap} label="Hot Prospects" count={followUps.filter(f => f.temperature === 'Hot').length} color="text-orange-500" />
            <SidebarNavBtn active={activeTab === 'All'} onClick={() => setActiveTab('All')} icon={FiActivity} label="Full Registry" count={followUps.length} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-[24px] border shadow-sm border-gray-100 relative">
          <SafeIcon icon={FiSearch} className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search Database..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl text-[10px] font-black uppercase focus:ring-4 focus:ring-indigo-50 outline-none" />
        </div>
      </div>

      {/* CENTER LIST VIEW */}
      <div className="flex-1 bg-white rounded-[40px] border shadow-sm border-gray-100 overflow-hidden flex flex-col">
        <div className="px-8 py-6 border-b bg-gray-50/30 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-1">Current Section</span>
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">{activeTab} List</h2>
          </div>
          <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full uppercase">{filteredData.length} Profiles Found</span>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-gray-50/20">
          {filteredData.map(item => (
            <LeadCard key={item.id} item={item} active={selectedItem?.id === item.id} onClick={() => setSelectedItem(item)} today={today} />
          ))}
          {filteredData.length === 0 && !loading && (
            <div className="py-24 text-center">
              <SafeIcon icon={FiFlag} className="text-3xl text-gray-200 mx-auto mb-4" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No matching records found</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT ACTION & HISTORY PANEL */}
      <div className="w-full xl:w-[500px] shrink-0">
        {selectedItem ? (
          <div className="bg-white h-full rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in slide-in-from-right-8 duration-300">
            {/* Lead Header */}
            <div className="bg-gray-900 px-8 py-10 text-white shrink-0 relative">
              <div className="absolute top-8 right-8 flex gap-2">
                <button onClick={() => setSelectedItem(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"><SafeIcon icon={FiX} /></button>
              </div>
              <div className="flex gap-2 mb-4">
                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${selectedItem.temperature === 'Hot' ? 'bg-orange-500' : 'bg-blue-500'}`}>{selectedItem.temperature || 'Warm'}</span>
                <span className="px-2 py-0.5 bg-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest border border-white/10">{selectedItem.lead_type || 'Inquiry'}</span>
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight leading-tight">{selectedItem.customer_name}</h3>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/50 uppercase"><SafeIcon icon={FiPhone} /> {selectedItem.phone_number}</div>
                {selectedItem.next_follow_up && (
                  <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${selectedItem.next_follow_up <= today ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white'}`}>
                    <SafeIcon icon={FiClock} /> {selectedItem.next_follow_up}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex divide-x divide-gray-100 border-b border-gray-100 shrink-0 bg-white">
              <QuickActionBtn label="CONVERTED" icon={FiAward} onClick={() => handleUpdateLead(selectedItem.id, { lead_type: 'Client' })} active={selectedItem.lead_type === 'Client'} color="text-green-600" />
              <QuickActionBtn label="HOT LEAD" icon={FiZap} onClick={() => handleUpdateLead(selectedItem.id, { temperature: 'Hot' })} active={selectedItem.temperature === 'Hot'} color="text-orange-500" />
              <QuickActionBtn label="REMOVE" icon={FiTrash2} onClick={() => handleDelete(selectedItem.id)} color="text-red-400" />
            </div>

            {/* Scrollable Interaction Area */}
            <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-gray-50/30">
              {/* Add New Interaction Form */}
              <div className="mb-12">
                <SectionLabel icon={FiMessageSquare} text="Update Interaction" />
                <form onSubmit={handleAddRemark} className="space-y-4">
                  <div className="bg-white p-6 rounded-[32px] border border-gray-200 shadow-sm transition-all hover:border-indigo-100">
                    <div className="flex gap-2 mb-4">
                      {['Call', 'Visit', 'Payment', 'Document'].map(t => (
                        <button key={t} type="button" onClick={() => setActionType(t)} className={`flex-1 py-2 rounded-xl text-[8px] font-black border uppercase tracking-widest transition-all ${actionType === t ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>{t}</button>
                      ))}
                    </div>
                    <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Type interaction details here..." rows={2} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-[11px] font-bold outline-none placeholder:text-gray-300 focus:ring-4 focus:ring-indigo-100 transition-all" />
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="relative">
                        <SafeIcon icon={FiCalendar} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-600" />
                        <input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl text-[9px] font-black outline-none focus:ring-4 focus:ring-indigo-100" />
                      </div>
                      <button type="submit" disabled={isSaving || !newComment.trim()} className="bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100">Save Remark</button>
                    </div>
                  </div>
                </form>
              </div>

              {/* RESTORED: INTERACTION HISTORY TIMELINE */}
              <div className="space-y-6">
                <SectionLabel icon={FiClock} text="Activity History" />
                {selectedItem.history && selectedItem.history.length > 0 ? (
                  selectedItem.history.map((log, i) => (
                    <div key={i} className="border-l-2 border-indigo-100 pl-6 py-2 relative">
                      <div className="absolute -left-[5px] top-4 w-2 h-2 rounded-full bg-indigo-600" />
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">{log.action || 'Note'}</span>
                          <span className="text-[8px] font-black text-gray-400 uppercase">{log.date}</span>
                        </div>
                        <span className="text-[7px] font-black text-gray-400 uppercase">By {log.staff || 'Staff'}</span>
                      </div>
                      <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm group hover:border-indigo-100 transition-all">
                        <p className="text-[11px] font-bold text-gray-700 uppercase leading-relaxed">{log.comment}</p>
                        {log.reminder && (
                          <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2 text-[7px] font-black text-orange-600 uppercase">
                            <SafeIcon icon={FiCalendar} /> Scheduled for: {log.reminder}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-white rounded-[32px] border border-dashed border-gray-100">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No history recorded for this profile</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-white rounded-[40px] border-2 border-dashed border-gray-100 p-12 text-center">
            <SafeIcon icon={FiTrendingUp} className="text-3xl text-gray-200 mb-6" />
            <h3 className="text-lg font-black text-gray-900 uppercase">Lead Intelligence</h3>
            <p className="text-[10px] text-gray-400 font-black uppercase mt-2">Select a profile to view interaction history.</p>
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

const LeadCard = ({ item, active, onClick, today }) => {
  const isOverdue = item.next_follow_up && item.next_follow_up < today;
  const isDueToday = item.next_follow_up === today;

  return (
    <div onClick={onClick} className={`p-6 rounded-[32px] border transition-all cursor-pointer group relative overflow-hidden ${active ? 'bg-indigo-600 text-white shadow-2xl border-indigo-600' : 'bg-white border-gray-100 hover:border-indigo-200 shadow-sm hover:shadow-md'}`}>
      <div className="flex justify-between items-start mb-4">
        <span className={`px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest ${active ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>{item.lead_type || 'Inquiry'}</span>
        {item.next_follow_up && (
          <span className={`px-2.5 py-1 rounded-xl text-[7px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
            active ? 'bg-black/20 text-white' : isOverdue ? 'bg-red-50 text-red-600 animate-pulse' : isDueToday ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
          }`}>
            <SafeIcon icon={FiClock} /> {isOverdue ? 'OVERDUE' : isDueToday ? 'DUE TODAY' : item.next_follow_up}
          </span>
        )}
      </div>
      <h4 className="font-black uppercase text-xs truncate mb-1">{item.customer_name}</h4>
      <div className="flex items-center gap-2">
        <p className={`text-[10px] font-bold ${active ? 'text-white/70' : 'text-gray-400'}`}>{item.phone_number}</p>
        <span className={`text-[8px] font-black uppercase ${active ? 'text-white/50' : 'text-indigo-300'}`}>{item.next_action_type ? `• ${item.next_action_type}` : ''}</span>
      </div>
    </div>
  );
};

const QuickActionBtn = ({ label, icon, onClick, active, color }) => (
  <button onClick={onClick} className={`flex-1 py-5 flex flex-col items-center gap-2 transition-all hover:bg-gray-50 ${active ? 'bg-indigo-50/50' : ''}`}>
    <SafeIcon icon={icon} className={`text-xl ${active ? 'text-indigo-600' : color}`} />
    <span className={`text-[7px] font-black uppercase tracking-widest ${active ? 'text-indigo-700' : 'text-gray-400'}`}>{label}</span>
  </button>
);

const SectionLabel = ({ icon, text }) => (
  <div className="flex items-center gap-2 mb-4">
    <SafeIcon icon={icon} className="text-indigo-600 text-sm" />
    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{text}</span>
  </div>
);

export default FollowUpModule;