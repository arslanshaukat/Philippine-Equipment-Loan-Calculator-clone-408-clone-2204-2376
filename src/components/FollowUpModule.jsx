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
  const [applicants, setApplicants] = useState([]);
  const [selectedSoldUnit, setSelectedSoldUnit] = useState(null);
  const [selectedHiringApplicant, setSelectedHiringApplicant] = useState(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertForm, setConvertForm] = useState({ chassis_no: '', engine_no: '', make: '', model: '', year: '', color: '', sale_price: '', payment_type: 'Cash', sale_date: new Date().toISOString().split('T')[0] });
  const [isConverting, setIsConverting] = useState(false);
  const [hiringNote, setHiringNote] = useState('');
  const [isSavingHiringNote, setIsSavingHiringNote] = useState(false);
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
  const [activityDate, setActivityDate] = useState(new Date().toISOString().split('T')[0]);
  const [managerNotes, setManagerNotes] = useState({}); // { item_id: note }
  const [managerDates, setManagerDates] = useState({}); // { item_id: date }
  const [savingNote, setSavingNote] = useState(null);

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

  const handleConvertToSold = async () => {
    if (!selectedItem) { alert('No lead selected'); return; }
    setIsConverting(true);
    try {
      const staff = selectedStaff || 'STAFF';
      const soldRecord = {
        buyer_name: selectedItem.customer_name,
        phone: selectedItem.phone_number,
        make: (convertForm.make || selectedItem.unit_interest || '').toUpperCase(),
        model: (convertForm.model || '').toUpperCase(),
        year: convertForm.year || '',
        chassis_no: (convertForm.chassis_no || '').toUpperCase(),
        engine_no: (convertForm.engine_no || '').toUpperCase(),
        color: (convertForm.color || '').toUpperCase(),
        sale_price: parseFloat(convertForm.sale_price) || 0,
        payment_type: convertForm.payment_type || 'Cash',
        sale_date: convertForm.sale_date || new Date().toISOString().split('T')[0],
        handled_by: staff,
        notes: 'Converted from Follow-Up by ' + staff,
        next_follow_up: '',
        follow_up_notes: '',
      };
      // Use PocketBase directly
      const res = await fetch('/api/collections/sold_units/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(soldRecord)
      });
      if (!res.ok) throw new Error(await res.text());
      // Close the lead
      await supabase.from('follow_ups_2024').update({ status: 'Closed' }).eq('id', selectedItem.id);
      const entry = { date: new Date().toLocaleString(), comment: 'CONVERTED TO SOLD — ' + soldRecord.make + ' ' + soldRecord.model, staff, action: 'Converted to Sold' };
      const updatedHistory = [entry, ...(selectedItem.history || [])];
      await supabase.from('follow_ups_2024').update({ history: updatedHistory }).eq('id', selectedItem.id);
      setShowConvertModal(false);
      setSelectedItem(null);
      fetchFollowUps();
      alert('✅ Lead converted to Sold Unit successfully!');
    } catch(e) { alert('Error: ' + e.message); }
    finally { setIsConverting(false); }
  };

  const handleManagerNote = async (itemId, note) => {
    if (!note.trim()) return;
    setSavingNote(itemId);
    try {
      const item = followUps.find(f => f.id === itemId);
      if (!item) return;
      const assignedDate = managerDates[itemId] || '';
      const entry = {
        date: new Date().toLocaleString(),
        comment: '📌 MANAGER NOTE: ' + note.toUpperCase() + (assignedDate ? ' — CALL BY: ' + assignedDate : ''),
        staff: 'ARSLAN',
        action: 'Manager Note',
      };
      const updatedHistory = [entry, ...(item.history || [])];
      const updatePayload = {
        history: updatedHistory,
        last_contacted_at: new Date().toISOString(),
      };
      if (assignedDate) updatePayload.next_follow_up = assignedDate;
      await supabase.from('follow_ups_2024').update(updatePayload).eq('id', itemId);
      fetchFollowUps();
      setManagerNotes(prev => ({ ...prev, [itemId]: '' }));
      setManagerDates(prev => ({ ...prev, [itemId]: '' }));
    } catch(e) { alert(e.message); }
    finally { setSavingNote(null); }
  };

  const handleHiringNote = async (action) => {
    if (!hiringNote.trim() || !selectedStaff) return;
    setIsSavingHiringNote(true);
    try {
      const entry = {
        date: new Date().toLocaleString(),
        comment: hiringNote.toUpperCase(),
        staff: selectedStaff,
        action: action || 'Note',
      };
      const updatedHistory = [entry, ...(selectedHiringApplicant.history || [])];
      await supabase.from('applicants').update({ history: updatedHistory }).eq('id', selectedHiringApplicant.id);
      setSelectedHiringApplicant(prev => ({ ...prev, history: updatedHistory }));
      fetchApplicants();
      setHiringNote('');
    } catch(e) { alert(e.message); }
    finally { setIsSavingHiringNote(false); }
  };

  const updateHiringStatus = async (id, field, value) => {
    await supabase.from('applicants').update({ [field]: value }).eq('id', id);
    setSelectedHiringApplicant(prev => ({ ...prev, [field]: value }));
    fetchApplicants();
  };

  const fetchApplicants = async () => {
    try {
      const res = await fetch('/api/collections/applicants/records?perPage=500');
      const d = await res.json();
      console.log('[App] items:', d.items?.length, 'today:', new Date().toLocaleDateString('en-CA', {timeZone:'Asia/Manila'}), 'sample:', d.items?.filter(a=>a.follow_up_date).map(a=>a.full_name+':'+a.follow_up_date));
      setApplicants(d.items || []);
    } catch(e) { console.error(e); }
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
    fetchApplicants();
  }, []);

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

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

  // Activity log - grouped by customer for a given date
  const activityLog = useMemo(() => {
    const grouped = {};
    followUps.forEach(item => {
      const dayEntries = (item.history || []).filter(log => {
        if (!log.date) return false;
        try {
          const logDate = new Date(log.date).toISOString().split('T')[0];
          return logDate === activityDate;
        } catch { return false; }
      });
      if (dayEntries.length === 0) return;
      const key = item.id;
      if (!grouped[key]) {
        grouped[key] = {
          customer_name: item.customer_name,
          phone_number: item.phone_number,
          item_id: item.id,
          temperature: item.temperature,
          status: item.status,
          entries: [],
        };
      }
      grouped[key].entries.push(...dayEntries);
    });
    // Sort each customer's entries newest first, then sort customers by latest action
    return Object.values(grouped).map(g => ({
      ...g,
      entries: g.entries.sort((a, b) => new Date(b.date) - new Date(a.date)),
    })).sort((a, b) => new Date(b.entries[0]?.date) - new Date(a.entries[0]?.date));
  }, [followUps, activityDate]);

  const filteredApplicants = useMemo(() => {
    const s = searchTerm.toLowerCase();
    if (activeTab === 'Hiring') {
      return applicants.filter(a => {
        if (!a.follow_up_date) return false;
        if (a.status === 'Hired' || a.status === 'Rejected') return false;
        return !s || a.full_name?.toLowerCase().includes(s) || a.phone?.includes(s) || a.job_role?.toLowerCase().includes(s);
      });
    }
    if (activeTab !== 'Due' && activeTab !== 'Upcoming' && activeTab !== 'All') return [];
    return applicants.filter(a => {
      if (!a.follow_up_date) return false;
      if (a.status === 'Hired' || a.status === 'Rejected') return false;
      const matchSearch = !s || a.full_name?.toLowerCase().includes(s) || a.phone?.includes(s);
      if (!matchSearch) return false;
      if (activeTab === 'Due') return a.follow_up_date <= today;
      if (activeTab === 'Upcoming') return a.follow_up_date > today;
      if (activeTab === 'All') return true;
      return false;
    });
  }, [applicants, searchTerm, activeTab, today]);

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
            <SidebarNavBtn active={activeTab==='Activity'} onClick={()=>{setActiveTab('Activity');setSelectedSoldUnit(null);setSelectedItem(null);}} icon={FiClock} label="Activity Log" count={activityLog.length} color="text-purple-500" />
            <SidebarNavBtn active={activeTab==='Hiring'} onClick={()=>{setActiveTab('Hiring');setSelectedSoldUnit(null);setSelectedItem(null);}} icon={FiUser} label="Hiring" count={applicants.filter(a=>a.follow_up_date && a.status !== 'Hired' && a.status !== 'Rejected').length} color="text-purple-600" />
            </div>
          </div>


        </div>


      </div>

      <div className={`${(selectedItem || selectedSoldUnit || selectedHiringApplicant) ? "hidden xl:flex" : "flex"} flex-1 bg-white rounded-[32px] xl:rounded-[40px] border shadow-sm border-gray-100 overflow-hidden flex-col`}>
        <div className="px-8 py-6 border-b bg-gray-50/30 flex justify-between items-center">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">
            {activeTab === 'Activity' ? 'Activity Log' : activeTab === 'Hiring' ? 'Hiring Follow-Up' : activeTab + ' Registry'}
          </h2>
          <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">
            {activeTab === 'Activity' ? activityLog.length + ' Actions' : activeTab === 'Hiring' ? filteredApplicants.length + ' Applicants' : filteredData.length + ' Records'}
          </span>
        </div>

        {activeTab === 'Hiring' ? (
          <div className="overflow-y-auto p-4 no-scrollbar bg-gray-50/20 h-[calc(100vh-320px)] xl:h-[calc(100vh-280px)]">
            {filteredApplicants.length === 0 ? (
              <div className="text-center text-gray-300 font-black uppercase text-[10px] py-12 tracking-widest">No active applicants</div>
            ) : (
              <div className="space-y-3">
                {filteredApplicants.map((a, i) => (
                  <div key={i} onClick={() => { setSelectedHiringApplicant(a); setSelectedItem(null); setSelectedSoldUnit(null); }}
                    className={`bg-white rounded-[20px] border p-4 shadow-sm cursor-pointer transition-all hover:border-purple-300 hover:shadow-md ${selectedHiringApplicant?.id === a.id ? 'border-purple-500 bg-purple-50/30' : 'border-purple-100'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0">
                        <p className="font-black text-gray-900 uppercase text-[11px] truncate">{a.full_name}</p>
                        <p className="text-[8px] font-bold text-purple-600 uppercase">{a.job_role || '—'}</p>
                        {a.phone && <p className="text-[8px] text-gray-400 font-bold">{a.phone}</p>}
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className={`text-[7px] font-black px-2 py-0.5 rounded-full uppercase block mb-1 ${a.status==='For Interview'?'bg-blue-100 text-blue-700':a.status==='Screening'?'bg-yellow-100 text-yellow-700':'bg-purple-100 text-purple-700'}`}>{a.status}</span>
                        {a.follow_up_date && (
                          <span className={`text-[7px] font-black px-2 py-0.5 rounded-full uppercase ${a.follow_up_date <= today ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-purple-50 text-purple-600'}`}>
                            {a.follow_up_date <= today ? '⚠ DUE' : a.follow_up_date}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {a.city && <span className="text-[7px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg uppercase font-bold">{a.city}</span>}
                      <span className={`text-[7px] font-black px-2 py-0.5 rounded-lg uppercase ${a.interview_response==='Confirmed'?'bg-green-50 text-green-600':a.interview_response==='No Response'?'bg-red-50 text-red-600':'bg-yellow-50 text-yellow-600'}`}>
                        Interview: {a.interview_response || 'Pending'}
                      </span>
                      {a.asking_salary > 0 && <span className="text-[7px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg font-bold">₱{new Intl.NumberFormat().format(a.asking_salary)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'Activity' ? (
          <div className="overflow-y-auto p-4 no-scrollbar bg-gray-50/20 h-[calc(100vh-320px)] xl:h-[calc(100vh-280px)]">
            <div className="flex items-center gap-2 mb-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
              <SafeIcon icon={FiCalendar} className="text-indigo-500 shrink-0" />
              <input type="date" value={activityDate} onChange={e => setActivityDate(e.target.value)}
                className="flex-1 text-[11px] font-black outline-none bg-transparent" />
              <button onClick={() => setActivityDate(new Date().toISOString().split('T')[0])}
                className="text-[8px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-lg">Today</button>
              <span className="text-[8px] font-black bg-indigo-600 text-white px-2 py-1 rounded-lg shrink-0">{activityLog.length}</span>
            </div>
            {activityLog.length === 0 ? (
              <div className="text-center text-gray-300 font-black uppercase text-[10px] py-12 tracking-widest">No activity on this date</div>
            ) : (
              <div className="space-y-3">
                {activityLog.map((group, i) => (
                  <div key={i} className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:border-indigo-200 transition-all"
                    onClick={() => {
                      const item = followUps.find(f => f.id === group.item_id);
                      if (item) { setSelectedItem(item); setSelectedSoldUnit(null); }
                    }}>
                    {/* Customer header */}
                    <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <div className="min-w-0">
                        <p className="font-black text-gray-900 uppercase text-[11px] truncate">{group.customer_name}</p>
                        <p className="text-[8px] text-gray-400 font-bold">{group.phone_number}</p>
                        {group.unit_interest && <p className="text-[8px] font-black text-blue-600 uppercase mt-0.5">🚛 {group.unit_interest}</p>}
                      </div>
                      <span className="text-[8px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-lg shrink-0 ml-2">{group.entries.length} action{group.entries.length > 1 ? 's' : ''}</span>
                    </div>
                    {/* Entries */}
                    <div className="divide-y divide-gray-50">
                      {group.entries.map((log, j) => (
                        <div key={j} className={`px-4 py-2.5 ${log.staff === 'ARSLAN' ? 'bg-amber-50/50' : ''}`}>
                          <div className="flex justify-between items-start">
                            <div className="flex gap-1.5 flex-wrap items-center">
                              {log.staff === 'ARSLAN' && <span className="text-[7px] font-black px-1.5 py-0.5 rounded-full bg-amber-500 text-white uppercase">👑 MGR</span>}
                              {log.module && <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 uppercase">{log.module}</span>}
                              <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase ${log.action === 'Manager Note' ? 'bg-amber-100 text-amber-700' : log.action === 'Closed' ? 'bg-red-50 text-red-600' : log.action === 'Hot Prospect' ? 'bg-orange-50 text-orange-600' : log.action === 'Call Logged' || log.action === 'Call' ? 'bg-blue-50 text-blue-600' : log.action === 'Promoted to Follow-Up' ? 'bg-green-50 text-green-600' : 'bg-indigo-50 text-indigo-600'}`}>{log.action || 'Note'}</span>
                              {log.attempts && <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-700">{log.attempts}x</span>}
                              <span className={`text-[7px] font-black uppercase ${log.staff === 'ARSLAN' ? 'text-amber-600' : 'text-indigo-500'}`}>{log.staff}</span>
                            </div>
                            <span className="text-[7px] text-gray-400 font-bold shrink-0 ml-2">{log.date?.split(',')[1]?.trim() || log.date}</span>
                          </div>
                          {log.comment && <p className={`text-[9px] font-bold uppercase mt-1 line-clamp-2 ${log.staff === 'ARSLAN' ? 'text-amber-800' : 'text-gray-600'}`}>{log.comment}</p>}
                        </div>
                      ))}
                    </div>
                    {/* Manager note input - only for ARSLAN */}
                    {selectedStaff === 'ARSLAN' && (
                      <div className="px-4 py-3 bg-amber-50 border-t border-amber-100" onClick={e => e.stopPropagation()}>
                        <p className="text-[7px] font-black text-amber-600 uppercase tracking-widest mb-2">👑 Leave Manager Instruction</p>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Add instruction for staff..."
                              value={managerNotes[group.item_id] || ''}
                              onChange={e => setManagerNotes(prev => ({ ...prev, [group.item_id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') handleManagerNote(group.item_id, managerNotes[group.item_id] || ''); }}
                              className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-amber-100 uppercase"
                            />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white border border-amber-200 rounded-xl">
                              <SafeIcon icon={FiCalendar} className="text-amber-500 text-xs shrink-0" />
                              <input
                                type="date"
                                value={managerDates[group.item_id] || ''}
                                onChange={e => setManagerDates(prev => ({ ...prev, [group.item_id]: e.target.value }))}
                                className="flex-1 text-[10px] font-bold outline-none bg-transparent text-amber-700"
                              />
                            </div>
                            <button
                              onClick={() => handleManagerNote(group.item_id, managerNotes[group.item_id] || '')}
                              disabled={savingNote === group.item_id || !managerNotes[group.item_id]?.trim()}
                              className="px-3 py-2 bg-amber-500 text-white rounded-xl text-[9px] font-black uppercase disabled:opacity-50 hover:bg-amber-600 transition-all shrink-0">
                              {savingNote === group.item_id ? '...' : 'Send'}
                            </button>
                          </div>
                          {managerDates[group.item_id] && (
                            <p className="text-[7px] font-black text-amber-600 uppercase">📅 Will set Due Date to: {managerDates[group.item_id]}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
        <div className="overflow-y-auto p-6 space-y-4 no-scrollbar bg-gray-50/20 max-h-[calc(100vh-220px)]">
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
                  {item.unit_interest && (
                    <p className={`text-[8px] font-black uppercase truncate mt-0.5 ${selectedItem?.id === item.id ? 'text-yellow-300' : 'text-blue-500'}`}>
                      🚛 {item.unit_interest}
                    </p>
                  )}
                  
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

          {/* Hiring Follow-Up Section */}
          {filteredApplicants.length > 0 && activeTab !== 'Hiring' && activeTab !== 'Activity' && (
            <div className="mt-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-purple-100" />
                <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                  Hiring Follow-Up — {filteredApplicants.length}
                </span>
                <div className="h-px flex-1 bg-purple-100" />
              </div>
              {filteredApplicants.map((a, i) => (
                <div key={i} onClick={() => { setSelectedHiringApplicant(a); setSelectedItem(null); setSelectedSoldUnit(null); }}
                  className={`p-4 mb-3 bg-white rounded-[24px] border cursor-pointer transition-all hover:border-purple-300 hover:shadow-md ${selectedHiringApplicant?.id === a.id ? 'border-purple-500 bg-purple-50/30' : 'border-purple-100'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-black text-gray-900 uppercase text-[11px]">{a.full_name}</h4>
                      <p className="text-[8px] font-bold text-purple-600 uppercase">{a.job_role || '—'}</p>
                    </div>
                    <span className={`text-[7px] font-black px-2 py-0.5 rounded-full uppercase ${a.follow_up_date <= today ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-purple-50 text-purple-600'}`}>
                      {a.follow_up_date <= today ? '⚠ DUE' : a.follow_up_date}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {a.city && <span className="text-[7px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg uppercase font-bold">{a.city}</span>}
                    {a.phone && <span className="text-[7px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg font-bold">{a.phone}</span>}
                    <span className={`text-[7px] font-black px-2 py-0.5 rounded-lg uppercase ${a.interview_response === 'Confirmed' ? 'bg-green-50 text-green-600' : a.interview_response === 'No Response' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'}`}>
                      {a.interview_response || 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}
      </div>

      <div className={`${(selectedItem || selectedSoldUnit || selectedHiringApplicant) ? "block" : "hidden xl:block"} w-full xl:w-[500px] shrink-0`}>
        {selectedHiringApplicant && !selectedItem && !selectedSoldUnit ? (
          <div className="bg-white rounded-[32px] xl:rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] xl:max-h-[calc(100vh-120px)] sticky top-4">
            {/* Header */}
            <div className="bg-purple-700 px-6 py-6 text-white shrink-0">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[8px] font-black bg-white/20 px-2 py-1 rounded-lg uppercase">{selectedHiringApplicant.status}</span>
                <button onClick={() => setSelectedHiringApplicant(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><SafeIcon icon={FiX} /></button>
              </div>
              <h3 className="text-xl font-black uppercase">{selectedHiringApplicant.full_name}</h3>
              <p className="text-purple-200 text-[10px] font-bold uppercase mt-1">{selectedHiringApplicant.job_role}</p>
              <div className="flex flex-wrap gap-3 mt-2 text-[8px] text-white/50 font-bold">
                {selectedHiringApplicant.phone && <span>{selectedHiringApplicant.phone}</span>}
                {selectedHiringApplicant.city && <span>{selectedHiringApplicant.city}</span>}
                {selectedHiringApplicant.follow_up_date && <span>Follow-up: {selectedHiringApplicant.follow_up_date}</span>}
              </div>
            </div>

            {/* Quick updates */}
            <div className="flex divide-x divide-gray-100 border-b shrink-0">
              <div className="flex-1 p-3">
                <p className="text-[7px] font-black text-gray-400 uppercase mb-1">Status</p>
                <select value={selectedHiringApplicant.status}
                  onChange={e => updateHiringStatus(selectedHiringApplicant.id, 'status', e.target.value)}
                  className="w-full px-2 py-1.5 bg-gray-50 border border-gray-100 rounded-xl text-[9px] font-black uppercase outline-none">
                  {['New','Screening','For Interview','Hired','Rejected','On Hold'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex-1 p-3">
                <p className="text-[7px] font-black text-gray-400 uppercase mb-1">Interview</p>
                <select value={selectedHiringApplicant.interview_response || 'Pending'}
                  onChange={e => updateHiringStatus(selectedHiringApplicant.id, 'interview_response', e.target.value)}
                  className="w-full px-2 py-1.5 bg-gray-50 border border-gray-100 rounded-xl text-[9px] font-black uppercase outline-none">
                  {['Pending','Confirmed','No Response','Declined','Rescheduled'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            {/* Follow-up date */}
            <div className="px-5 py-3 border-b shrink-0 flex items-center gap-3">
              <SafeIcon icon={FiCalendar} className="text-purple-500 shrink-0" />
              <div className="flex-1">
                <p className="text-[7px] font-black text-gray-400 uppercase mb-1">Follow-Up Date</p>
                <input type="date" key={selectedHiringApplicant.id}
                  defaultValue={selectedHiringApplicant.follow_up_date || ''}
                  onBlur={async e => { await updateHiringStatus(selectedHiringApplicant.id, 'follow_up_date', e.target.value); }}
                  className="w-full text-[11px] font-bold outline-none bg-transparent" />
              </div>
            </div>

            {/* Staff selector */}
            <div className="px-5 py-3 border-b shrink-0">
              <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl text-[10px] font-black uppercase outline-none ${!selectedStaff ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-200 bg-gray-50'}`}>
                <option value="">— Select Staff —</option>
                {['RHEA','MEL','PRINCESS','ARSLAN'].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            {/* Add note */}
            <div className="px-5 py-3 border-b shrink-0 space-y-2">
              <textarea value={hiringNote} onChange={e => setHiringNote(e.target.value)}
                placeholder="Add follow-up note..."
                rows={2}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold uppercase outline-none resize-none" />
              <div className="flex gap-2">
                {['Called','Messaged','Interviewed','On Hold','Note'].map(action => (
                  <button key={action} onClick={() => handleHiringNote(action)}
                    disabled={!hiringNote.trim() || !selectedStaff || isSavingHiringNote}
                    className="flex-1 py-2 bg-purple-600 text-white rounded-xl text-[8px] font-black uppercase disabled:opacity-40 hover:bg-purple-700 transition-all">
                    {action}
                  </button>
                ))}
              </div>
            </div>

            {/* History */}
            <div className="overflow-y-auto p-4 no-scrollbar space-y-2 bg-gray-50/30">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Activity History</p>
              {(selectedHiringApplicant.history || []).length === 0 ? (
                <p className="text-center text-gray-300 text-[9px] font-black uppercase py-6">No activity yet</p>
              ) : (selectedHiringApplicant.history || []).map((log, i) => (
                <div key={i} className="bg-white rounded-[16px] border border-gray-100 p-3">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 uppercase">{log.action || 'Note'}</span>
                      <span className="text-[7px] font-black text-purple-500 uppercase">{log.staff}</span>
                    </div>
                    <span className="text-[7px] text-gray-400 font-bold shrink-0 ml-2">{log.date}</span>
                  </div>
                  <p className="text-[9px] font-bold text-gray-700 uppercase">{log.comment}</p>
                </div>
              ))}
            </div>
          </div>
        ) : selectedSoldUnit ? (
          <div className="bg-white rounded-[32px] xl:rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in slide-in-from-right-8 duration-300 max-h-[90vh] xl:max-h-[calc(100vh-120px)] sticky top-4">
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

            <div className="flex-1 overflow-y-auto p-4 no-scrollbar bg-gray-50/30 space-y-4 max-h-[calc(100vh-280px)]">
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
          <div className="bg-white rounded-[32px] xl:rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in slide-in-from-right-8 duration-300 max-h-[90vh] xl:max-h-[calc(100vh-120px)] sticky top-4">
            <div className={`px-8 py-10 text-white shrink-0 relative ${selectedItem.status === 'Closed' ? 'bg-gray-700' : 'bg-gray-900'}`}>
              <div className="absolute top-8 right-8 flex gap-2">
                <button onClick={() => setSelectedItem(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"><SafeIcon icon={FiX} /></button>
              </div>
              <div className="flex gap-2 mb-4">
                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${selectedItem.temperature === 'Hot' ? 'bg-orange-500' : 'bg-blue-500'}`}>{selectedItem.temperature || 'Warm'}</span>
                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-white/20 ${selectedItem.status === 'Closed' ? 'bg-red-500' : 'bg-green-500'}`}>{selectedItem.status}</span>
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight leading-tight">{selectedItem.customer_name}</h3>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[7px] font-black text-white/40 uppercase tracking-widest shrink-0">Interested In:</span>
                <input
                  key={selectedItem.id}
                  type="text"
                  placeholder="Enter unit of interest..."
                  defaultValue={selectedItem.unit_interest || ''}
                  onBlur={async e => {
                    const val = e.target.value.toUpperCase();
                    await supabase.from('follow_ups_2024').update({ unit_interest: val }).eq('id', selectedItem.id);
                    fetchFollowUps();
                    setSelectedItem(prev => ({ ...prev, unit_interest: val }));
                  }}
                  className="flex-1 bg-white/10 text-white placeholder:text-white/30 text-[10px] font-bold px-3 py-1.5 rounded-xl outline-none focus:bg-white/20 uppercase border border-white/10 focus:border-white/30 transition-all"
                />
              </div>
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
              <button
                onClick={() => { setConvertForm({ chassis_no: '', engine_no: '', make: selectedItem?.unit_interest || '', model: '', year: '', color: '', sale_price: '', payment_type: 'Cash', sale_date: new Date().toISOString().split('T')[0] }); setShowConvertModal(true); }}
                className="flex-1 py-5 flex flex-col items-center gap-2 transition-all hover:bg-green-50 bg-green-50/30">
                <SafeIcon icon={FiCheckCircle} className="text-xl text-green-600" />
                <span className="text-[7px] font-black uppercase tracking-widest text-green-600">SOLD</span>
              </button>
            </div>

            <div className="overflow-y-auto p-6 no-scrollbar bg-gray-50/30 max-h-[60vh] xl:max-h-[calc(100vh-320px)]">
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
      {showConvertModal && selectedItem && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={() => setShowConvertModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
            <div className="bg-green-600 px-6 py-5 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-base uppercase">Convert to Sold</h3>
                <p className="text-green-200 text-[9px] uppercase mt-0.5">{selectedItem.customer_name}</p>
              </div>
              <button onClick={() => setShowConvertModal(false)} className="p-2 bg-white/10 rounded-full"><SafeIcon icon={FiX} /></button>
            </div>
            <div className="p-5 overflow-y-auto no-scrollbar space-y-3 flex-1">
              {/* Staff selector */}
              <div className={`p-3 rounded-2xl border ${!selectedStaff ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                <p className={`text-[7px] font-black uppercase tracking-widest mb-2 ${!selectedStaff ? 'text-red-500' : 'text-gray-400'}`}>
                  {!selectedStaff ? '⚠ Select Staff Before Confirming' : '✅ Handled By: ' + selectedStaff}
                </p>
                <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl text-[10px] font-black uppercase outline-none ${!selectedStaff ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-200 bg-white'}`}>
                  <option value="">— Select Staff —</option>
                  {staffMembers.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[['Make / Brand','make','ISUZU'],['Model','model','6WF1'],['Year','year','2020'],['Color','color','WHITE'],['Chassis No','chassis_no',''],['Engine No','engine_no','']].map(([label,key,ph]) => (
                  <div key={key}>
                    <label className="text-[8px] font-black text-gray-400 uppercase mb-1 block">{label}</label>
                    <input type="text" value={convertForm[key]} onChange={e => setConvertForm({...convertForm, [key]: e.target.value.toUpperCase()})} placeholder={ph}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold uppercase outline-none focus:ring-2 focus:ring-green-100" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase mb-1 block">Sale Price (₱)</label>
                  <input type="number" value={convertForm.sale_price} onChange={e => setConvertForm({...convertForm, sale_price: e.target.value})}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold uppercase outline-none focus:ring-2 focus:ring-green-100" />
                </div>
                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase mb-1 block">Payment Type</label>
                  <select value={convertForm.payment_type} onChange={e => setConvertForm({...convertForm, payment_type: e.target.value})}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold uppercase outline-none">
                    {['Cash','Financing','Installment'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase mb-1 block">Sale Date</label>
                <input type="date" value={convertForm.sale_date} onChange={e => setConvertForm({...convertForm, sale_date: e.target.value})}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold uppercase outline-none focus:ring-2 focus:ring-green-100" />
              </div>
              <button onClick={handleConvertToSold} disabled={isConverting || !selectedStaff}
                className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                <SafeIcon icon={FiCheckCircle} /> {isConverting ? 'Converting...' : 'Confirm Sale & Close Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
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