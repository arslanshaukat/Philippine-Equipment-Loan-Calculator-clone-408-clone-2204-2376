import React, { useState, useEffect, useMemo } from 'react';
import { 
  FiRepeat, FiSearch, FiMessageSquare, FiClock, FiX, FiSave, 
  FiTrash2, FiCalendar, FiZap, FiActivity, FiFlag, FiAlertCircle, 
  FiCheckCircle, FiCheckSquare, FiArchive, FiUserCheck, FiPhone,
  FiUser, FiTruck
} from 'react-icons/fi';
import { supabase } from '../supabase/supabase';
import SafeIcon from '../common/SafeIcon';

const FollowUpModule = () => {
  const [followUps, setFollowUps] = useState([]);
  const [soldUnits, setSoldUnits] = useState([]);
  const [selectedSoldUnit, setSelectedSoldUnit] = useState(null);
  const [soldNote, setSoldNote] = useState('');
  const [isSavingSoldNote, setIsSavingSoldNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Due');
  const [selectedItem, setSelectedItem] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [actionType, setActionType] = useState('Call');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingLog, setEditingLog] = useState(null); // {index, comment}
  const [includeClosedInSearch, setIncludeClosedInSearch] = useState(false);

  const staffMembers = ["RHEA", "MEL", "PRINCESS", "ARSLAN"];

  const handleSoldUnitNote = async (actionType = 'Note') => {
    if (!soldNote.trim() && actionType === 'Note') return;
    if (!selectedStaff) { alert('⚠ Please select a staff member first'); return; }
    setIsSavingSoldNote(true);
    try {
      const entry = {
        date: new Date().toLocaleString(),
        note: soldNote.toUpperCase() || actionType.toUpperCase(),
        staff: selectedStaff,
        action: actionType,
      };
      const updatedHistory = [entry, ...(selectedSoldUnit.history || [])];
      await supabase.from('sold_units').update({
        history: updatedHistory,
        last_contacted_at: new Date().toISOString(),
      }).eq('id', selectedSoldUnit.id);
      fetchSoldUnits();
      setSelectedSoldUnit(prev => ({ ...prev, history: updatedHistory }));
      setSoldNote('');
    } catch(e) { alert(e.message); }
    finally { setIsSavingSoldNote(false); }
  };

  const fetchSoldUnits = async () => {
    try {
      const { data } = await supabase.from('sold_units').select('*');
      console.log('[SoldUnits] fetched:', data?.length, data?.map(u => u.buyer_name + ':' + u.next_follow_up));
      setSoldUnits(data || []);
    } catch(e) { console.error('[SoldUnits] error:', e); }
  };

  const fetchFollowUps = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('follow_ups_2024')
        .select('*')
        .order('last_contacted_at', { ascending: false });
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
    fetchSoldUnits();
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const filteredData = useMemo(() => {
    return followUps.filter(item => {
      const nameMatch = (item.customer_name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      const phoneMatch = (item.phone_number || '').includes(searchTerm);
      const hasMatch = nameMatch || phoneMatch;

      if (searchTerm.trim()) {
        if (!hasMatch) return false;
        if (!includeClosedInSearch && item.status === 'Closed') return false;
        return true;
      }

      if (!hasMatch) return false;
      switch (activeTab) {
        case 'Due': return item.next_follow_up && item.next_follow_up <= today && item.status !== 'Closed';
        case 'Upcoming': return item.next_follow_up && item.next_follow_up > today && item.status !== 'Closed';
        case 'Hot': return item.temperature === 'Hot' && item.status !== 'Closed';
        case 'Closed': return item.status === 'Closed';
        case 'All': return item.status !== 'Closed';
        default: return item.status !== 'Closed';
      }
    });
  }, [followUps, searchTerm, activeTab, today, includeClosedInSearch]);

  const filteredSoldUnits = useMemo(() => {
    if (activeTab !== 'Due' && activeTab !== 'Upcoming' && activeTab !== 'All') return [];
    const s = searchTerm.toLowerCase();
    return soldUnits.filter(u => {
      if (!u.next_follow_up) return false;
      const matchSearch = !s || u.buyer_name?.toLowerCase().includes(s) || u.phone?.includes(s);
      if (!matchSearch) return false;
      if (activeTab === 'Due') return u.next_follow_up <= today;
      if (activeTab === 'Upcoming') return u.next_follow_up > today;
      return true; // All
    });
  }, [soldUnits, searchTerm, activeTab, today]);

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


  const handleQuickCall = async (attempts) => {
    if (!selectedItem) return;
    const now = new Date();
    const timestamp = now.toLocaleString();
    const logEntry = {
      date: timestamp,
      comment: `CALLED ${attempts}X — ${now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`,
      staff: selectedStaff,
      action: 'Call',
      attempts,
      reminder: null
    };
    const updatedHistory = [logEntry, ...(selectedItem.history || [])];
    try {
      await supabase.from('follow_ups_2024').update({
        history: updatedHistory,
        last_contacted_at: now.toISOString()
      }).eq('id', selectedItem.id);
      fetchFollowUps();
      setSelectedItem(prev => ({ ...prev, history: updatedHistory }));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteHistoryEntry = async (idx) => {
    if (!window.confirm('Delete this activity entry?')) return;
    const updatedHistory = (selectedItem.history || []).filter((_, i) => i !== idx);
    await supabase.from('follow_ups_2024').update({ history: updatedHistory }).eq('id', selectedItem.id);
    fetchFollowUps();
    setSelectedItem(prev => ({ ...prev, history: updatedHistory }));
  };

  const handleEditHistoryEntry = async (idx, newComment) => {
    const updatedHistory = (selectedItem.history || []).map((log, i) =>
      i === idx ? { ...log, comment: newComment.toUpperCase(), edited: true } : log
    );
    await supabase.from('follow_ups_2024').update({ history: updatedHistory }).eq('id', selectedItem.id);
    fetchFollowUps();
    setSelectedItem(prev => ({ ...prev, history: updatedHistory }));
    setEditingLog(null);
  };

  const handleSendToCallLog = async (log) => {
    try {
      await supabase.from('daily_call_logs_2024').insert([{
        staff_name: log.staff || selectedStaff,
        customer_name: selectedItem.customer_name,
        phone_number: selectedItem.phone_number,
        reason: log.comment || 'FROM FOLLOW-UP',
        status: 'To Call',
        comment: 'SENT FROM FOLLOW-UP @ ' + log.date,
        is_answered: false,
      }]);
      alert('Sent to Call Log ✓');
    } catch (e) {
      alert('Failed: ' + e.message);
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
    <div className="flex flex-col xl:flex-row gap-3">
      <div className="w-full xl:w-80 shrink-0 space-y-4">
        <div className="bg-white p-6 rounded-[32px] border shadow-sm border-gray-100">
          {/* Search — above Lead Hub */}
          <div className="mb-4 space-y-2">
            <div className="relative">
              <SafeIcon icon={FiSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                placeholder="Search all records..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); if (e.target.value.trim()) setActiveTab('All'); }}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            {searchTerm.trim() && (
              <label className="flex items-center gap-2 px-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeClosedInSearch}
                  onChange={e => setIncludeClosedInSearch(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-indigo-600"
                />
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Include Closed Registry</span>
              </label>
            )}
          </div>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg"><SafeIcon icon={FiRepeat} /></div>
            <div>
              <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest leading-none">Lead Hub</h3>
              <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-1">Registry v2.5</p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex xl:flex-col gap-1 overflow-x-auto no-scrollbar pb-1 xl:pb-0">
            <SidebarNavBtn active={activeTab==='Due'} onClick={()=>{setActiveTab('Due');setSelectedSoldUnit(null);}} icon={FiAlertCircle} label="Due Today" count={followUps.filter(f => f.next_follow_up && f.next_follow_up <= today && f.status !== 'Closed').length} color="text-red-500" />
            <SidebarNavBtn active={activeTab==='Upcoming'} onClick={()=>{setActiveTab('Upcoming');setSelectedSoldUnit(null);}} icon={FiCalendar} label="Future Tasks" count={followUps.filter(f => f.next_follow_up && f.next_follow_up > today && f.status !== 'Closed').length} color="text-blue-500" />
            <SidebarNavBtn active={activeTab==='Hot'} onClick={()=>{setActiveTab('Hot');setSelectedSoldUnit(null);}} icon={FiZap} label="Hot Prospects" count={followUps.filter(f => f.temperature === 'Hot' && f.status !== 'Closed').length} color="text-orange-500" />
            <SidebarNavBtn active={activeTab==='Closed'} onClick={()=>{setActiveTab('Closed');setSelectedSoldUnit(null);}} icon={FiArchive} label="Closed Registry" count={followUps.filter(f => f.status === 'Closed').length} color="text-gray-400" />
            <SidebarNavBtn active={activeTab==='All'} onClick={()=>{setActiveTab('All');setSelectedSoldUnit(null);}} icon={FiActivity} label="Full Registry" count={followUps.length} />
            </div>
          </div>


        </div>


      </div>

      <div className={`${(selectedItem || selectedSoldUnit) ? "hidden xl:flex" : "flex"} flex-1 bg-white rounded-[32px] xl:rounded-[40px] border shadow-sm border-gray-100 overflow-hidden flex-col`}>
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
                onClick={() => { setSelectedItem(item); setSelectedSoldUnit(null); }}
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
                <div className="flex items-center justify-between gap-1 mb-1"><h4 className="font-black uppercase text-xs truncate">{item.customer_name}</h4>{item.last_contacted_at && <span className={`text-[7px] font-black px-1.5 py-0.5 rounded shrink-0 ${selectedItem?.id === item.id ? "bg-white/20 text-white/80" : "bg-gray-100 text-gray-500"}`}>{(() => { const h = (item.history || [])[0]; if (h && h.date) { const parts = h.date.split(", "); return parts.length > 1 ? parts[0] + " " + parts[1] : h.date; } return ""; })()}</span>}</div>
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

          {/* Sold Units Follow-Up Section */}
          {filteredSoldUnits.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-green-100" />
                <span className="text-[8px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-3 py-1 rounded-full border border-green-100">
                  Sold Units Follow-Up — {filteredSoldUnits.length}
                </span>
                <div className="h-px flex-1 bg-green-100" />
              </div>
              {filteredSoldUnits.map(unit => (
                <div key={unit.id} onClick={() => { setSelectedSoldUnit(unit); setSelectedItem(null); }} className="p-4 mb-3 bg-white rounded-[24px] border border-green-100 shadow-sm hover:border-green-300 transition-all cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-black text-gray-900 uppercase text-[11px]">{unit.buyer_name}</h4>
                      {unit.company && <p className="text-[8px] font-bold text-gray-400 uppercase">{unit.company}</p>}
                    </div>
                    <span className={`text-[7px] font-black px-2 py-0.5 rounded-full uppercase ${unit.next_follow_up <= today ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-green-50 text-green-600'}`}>
                      {unit.next_follow_up <= today ? 'DUE NOW' : unit.next_follow_up}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {unit.make && <span className="text-[7px] font-black bg-green-50 text-green-700 px-2 py-0.5 rounded-lg uppercase">{unit.make} {unit.model}</span>}
                    {unit.engine_no && <span className="text-[7px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg uppercase">{unit.engine_no}</span>}
                    {unit.payment_type && <span className="text-[7px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg uppercase">{unit.payment_type}</span>}
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[8px] font-bold text-gray-400">{unit.phone}</p>
                    <p className="text-[8px] font-black text-green-600">Sold: {unit.sale_date || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`${(selectedItem || selectedSoldUnit) ? "block" : "hidden xl:block"} w-full xl:w-[500px] shrink-0`}>
        {selectedSoldUnit ? (
          <div className="bg-white h-full rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in slide-in-from-right-8 duration-300">
            {/* Header */}
            <div className="bg-gray-900 px-8 py-8 text-white shrink-0">
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-2">
                  <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase bg-green-500">SOLD</span>
                  {selectedSoldUnit.payment_type && <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border border-white/20 bg-white/10">{selectedSoldUnit.payment_type}</span>}
                </div>
                <button onClick={() => setSelectedSoldUnit(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><SafeIcon icon={FiX} /></button>
              </div>
              <h3 className="text-2xl font-black uppercase">{selectedSoldUnit.buyer_name}</h3>
              {selectedSoldUnit.company && <p className="text-white/60 text-[10px] font-bold uppercase mt-1">{selectedSoldUnit.company}</p>}
              <div className="flex flex-wrap gap-3 mt-3 text-[9px] text-white/50 font-bold">
                {selectedSoldUnit.phone && <span className="flex items-center gap-1"><SafeIcon icon={FiPhone} />{selectedSoldUnit.phone}</span>}
                {selectedSoldUnit.sale_date && <span className="flex items-center gap-1"><SafeIcon icon={FiCalendar} />Sold: {selectedSoldUnit.sale_date}</span>}
                {selectedSoldUnit.make && <span className="flex items-center gap-1"><SafeIcon icon={FiTruck} />{selectedSoldUnit.make} {selectedSoldUnit.model}</span>}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex divide-x divide-gray-100 border-b border-gray-100 shrink-0 bg-white">
              <QuickActionBtn label="CALLED" icon={FiPhone}
                onClick={() => { if (!selectedStaff) { alert('⚠ Select staff first'); return; } setSoldNote('CALLED'); setTimeout(() => handleSoldUnitNote('Call'), 100); }}
                color="text-blue-500" />
              <QuickActionBtn label="VISITED" icon={FiCalendar}
                onClick={() => { if (!selectedStaff) { alert('⚠ Select staff first'); return; } setSoldNote('VISITED'); setTimeout(() => handleSoldUnitNote('Visit'), 100); }}
                color="text-green-500" />
            </div>

            <div className="flex-1 overflow-y-auto p-6 no-scrollbar bg-gray-50/30 space-y-4">
              {/* Unit info */}
              <div className="bg-white rounded-[20px] border border-gray-100 p-4">
                <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-3">Unit Details</p>
                <div className="grid grid-cols-2 gap-2 text-[9px]">
                  {[['Make', selectedSoldUnit.make], ['Model', selectedSoldUnit.model], ['Year', selectedSoldUnit.year], ['Chassis', selectedSoldUnit.chassis_no], ['Engine', selectedSoldUnit.engine_no], ['Color', selectedSoldUnit.color], ['Sale Price', selectedSoldUnit.sale_price ? '₱'+new Intl.NumberFormat().format(selectedSoldUnit.sale_price) : '']].map(([l,v]) => v ? (
                    <div key={l} className="bg-gray-50 rounded-xl p-2">
                      <p className="text-[6px] font-black text-gray-400 uppercase">{l}</p>
                      <p className="font-black text-gray-900 uppercase">{v}</p>
                    </div>
                  ) : null)}
                </div>
              </div>

              {/* Staff + note */}
              <div className={`p-4 rounded-[20px] border ${!selectedStaff ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
                <p className={`text-[7px] font-black uppercase tracking-widest mb-2 ${!selectedStaff ? 'text-red-500' : 'text-gray-400'}`}>
                  {!selectedStaff ? '⚠ Select Staff Before Activity' : 'Authorized Staff'}
                </p>
                <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl text-[10px] font-black uppercase outline-none mb-3 ${!selectedStaff ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-200 bg-gray-50'}`}>
                  <option value="">— Select Staff —</option>
                  {staffMembers.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <textarea value={soldNote} onChange={e => setSoldNote(e.target.value)}
                  placeholder="Add follow-up note..."
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-green-100 mb-2" />
                {/* Next follow-up date */}
                <div className="mb-3">
                  <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Next Follow-Up Date</label>
                  <input type="date" defaultValue={selectedSoldUnit.next_follow_up || ''}
                    onBlur={async e => {
                      await supabase.from('sold_units').update({ next_follow_up: e.target.value }).eq('id', selectedSoldUnit.id);
                      fetchSoldUnits();
                      setSelectedSoldUnit(prev => ({ ...prev, next_follow_up: e.target.value }));
                    }}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black outline-none" />
                </div>
                <button onClick={() => handleSoldUnitNote('Note')} disabled={isSavingSoldNote || !soldNote.trim() || !selectedStaff}
                  className="w-full py-3 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 hover:bg-green-700 transition-all">
                  {isSavingSoldNote ? 'Saving...' : 'Save Note'}
                </button>
              </div>

              {/* History */}
              {(selectedSoldUnit.history || []).length > 0 && (
                <div className="space-y-3">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><SafeIcon icon={FiClock} /> Contact History</p>
                  {(selectedSoldUnit.history || []).map((entry, i) => (
                    <div key={i} className="border-l-2 border-green-100 pl-4 py-1 relative">
                      <div className="absolute -left-[5px] top-3 w-2 h-2 rounded-full bg-green-500" />
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[7px] font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase">{entry.staff} • {entry.action || 'Note'}</span>
                        <span className="text-[7px] font-black text-gray-400">{entry.date}</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-700 uppercase">{entry.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : selectedItem ? (
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
                onClick={() => { if (!selectedStaff) { alert('⚠ Please select a staff member first'); return; } handleUpdateLead(selectedItem.id, { status: selectedItem.status === 'Closed' ? 'Active' : 'Closed' }); }}
                color={selectedItem.status === 'Closed' ? 'text-green-600' : 'text-red-500'}
              />
              <QuickActionBtn 
                label="HOT LEAD" 
                icon={FiZap} 
                onClick={() => { if (!selectedStaff) { alert('⚠ Please select a staff member first'); return; } handleUpdateLead(selectedItem.id, { temperature: 'Hot' }); }}
                active={selectedItem.temperature === 'Hot'}
                color="text-orange-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-gray-50/30">
              {/* Staff Selector — always visible, required before any activity */}
              <div className={`p-4 rounded-[24px] border shadow-sm mb-4 ${!selectedStaff ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white'}`}>
                <p className={`text-[8px] font-black uppercase tracking-widest mb-2 ${!selectedStaff ? 'text-red-500' : 'text-gray-400'}`}>
                  {!selectedStaff ? '⚠ Select Staff Before Activity' : 'Authorized Staff'}
                </p>
                <select
                  value={selectedStaff}
                  onChange={e => setSelectedStaff(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 ${!selectedStaff ? 'border-red-300 bg-red-50 text-red-600 focus:ring-red-100' : 'border-gray-100 bg-gray-50 focus:ring-indigo-100'}`}
                >
                  <option value="">— Select Staff —</option>
                  {staffMembers.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>

              {selectedItem.status !== 'Closed' && (
                <div className="mb-12">
                  <SectionLabel icon={FiMessageSquare} text="Update Interaction" />
                  {/* Staff Selector placeholder — now above */}
                  <div className="hidden">
                    <select
                      value={selectedStaff}
                      onChange={e => setSelectedStaff(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 ${!selectedStaff ? 'border-red-300 bg-red-50 text-red-600 focus:ring-red-100' : 'border-gray-100 bg-gray-50 focus:ring-indigo-100'}`}
                    >
                      <option value="">— Select Staff —</option>
                      {staffMembers.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </div>

                  {/* Quick Call Buttons */}
                  <div className="bg-white p-4 rounded-[24px] border border-gray-100 shadow-sm mb-3">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3">Quick Call Log</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map(n => (
                        <button key={n} type="button" onClick={() => { if (!selectedStaff) { alert('Please select a staff member first'); return; } handleQuickCall(n); }}
                          className="py-3 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-blue-100 hover:border-blue-600 flex flex-col items-center gap-1">
                          <span className="text-lg font-black">{n}x</span>
                          <span className="text-[7px]">Called</span>
                        </button>
                      ))}
                    </div>
                  </div>

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
                        disabled={isSaving || !newComment.trim() || !selectedStaff}
                        onClick={() => { if (!selectedStaff) { alert('Please select a staff member first'); } }}
                        className="w-full mt-4 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl disabled:opacity-50"
                      >Save Remark</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-4">
                <SectionLabel icon={FiClock} text="Activity History" />
                {selectedItem.history?.map((log, i) => (
                  <div key={i} className="border-l-2 border-indigo-100 pl-6 py-2 relative group">
                    <div className="absolute -left-[5px] top-4 w-2 h-2 rounded-full bg-indigo-600" />
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-[7px] font-black px-2 py-0.5 rounded uppercase ${log.action === 'Closed' ? 'bg-red-50 text-red-600' : log.action === 'Hot Prospect' ? 'bg-orange-50 text-orange-600' : log.action === 'Call' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>{log.action || 'Note'}</span>
                        {log.attempts && <span className="text-[7px] font-black px-2 py-0.5 rounded uppercase bg-yellow-50 text-yellow-700 border border-yellow-100">{log.attempts}x Called</span>}
                        {log.edited && <span className="text-[7px] font-black px-1.5 py-0.5 rounded uppercase bg-gray-100 text-gray-400">edited</span>}
                        <span className="text-[7px] font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                          <SafeIcon icon={FiUserCheck} className="text-[7px]" /> {log.staff}
                        </span>
                      </div>
                      <span className="text-[7px] font-black text-gray-400 uppercase shrink-0">{log.date}</span>
                    </div>

                    {editingLog?.index === i ? (
                      <div className="bg-white p-3 rounded-[16px] border border-indigo-200 shadow-sm">
                        <textarea
                          defaultValue={log.comment}
                          rows={2}
                          id={`edit-log-${i}`}
                          className="w-full text-[11px] font-bold text-gray-700 uppercase outline-none bg-transparent resize-none"
                          autoFocus
                        />
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => handleEditHistoryEntry(i, document.getElementById('edit-log-'+i).value)}
                            className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase">Save</button>
                          <button onClick={() => setEditingLog(null)}
                            className="flex-1 py-2 bg-gray-100 text-gray-500 rounded-xl text-[9px] font-black uppercase">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white p-4 rounded-[20px] border border-gray-100 shadow-sm">
                        <p className="text-[11px] font-bold text-gray-700 uppercase leading-relaxed">{log.comment}</p>
                      </div>
                    )}

                    {/* Action buttons — show on hover */}
                    <div className="flex gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => setEditingLog({ index: i, comment: log.comment })}
                        className="text-[7px] font-black px-2 py-1 bg-gray-50 text-gray-500 rounded-lg border border-gray-100 hover:bg-blue-50 hover:text-blue-600 uppercase flex items-center gap-1 transition-all">
                        <SafeIcon icon={FiSave} className="text-[7px]" /> Edit
                      </button>
                      <button onClick={() => handleSendToCallLog(log)}
                        className="text-[7px] font-black px-2 py-1 bg-gray-50 text-gray-500 rounded-lg border border-gray-100 hover:bg-green-50 hover:text-green-600 uppercase flex items-center gap-1 transition-all">
                        <SafeIcon icon={FiPhone} className="text-[7px]" /> Send to Calls
                      </button>
                      <button onClick={() => handleDeleteHistoryEntry(i)}
                        className="text-[7px] font-black px-2 py-1 bg-gray-50 text-red-300 rounded-lg border border-gray-100 hover:bg-red-50 hover:text-red-500 uppercase flex items-center gap-1 transition-all">
                        <SafeIcon icon={FiX} className="text-[7px]" /> Delete
                      </button>
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
  <button onClick={onClick} className={`shrink-0 xl:w-full flex flex-col xl:flex-row items-center xl:justify-between p-2 xl:p-4 rounded-2xl transition-all ${active ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'hover:bg-gray-50 text-gray-500 border border-transparent'}`}>
    <div className="flex flex-col xl:flex-row items-center gap-1 xl:gap-3">
      <SafeIcon icon={icon} className={`text-lg ${active ? 'text-indigo-600' : color}`} />
      <span className="text-[7px] xl:text-[10px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <span className={`text-[7px] xl:text-[9px] font-black px-1.5 xl:px-2.5 py-0.5 xl:py-1 rounded-lg mt-1 xl:mt-0 ${active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{count}</span>
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