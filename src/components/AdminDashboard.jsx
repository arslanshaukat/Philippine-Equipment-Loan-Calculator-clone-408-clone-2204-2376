import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/supabase';
import { 
  FiUsers, FiDollarSign, FiLogOut, FiTruck, FiBell, FiTrash2, 
  FiList, FiActivity, FiCalendar, FiEye, FiX, FiPhoneCall, 
  FiSave, FiClock, FiTag, FiRepeat, FiAnchor, FiShield 
} from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import QuotationCreator from './QuotationCreator';
import QuotationRegistry from './QuotationRegistry';
import CalendarModule from './CalendarModule';
import CallLogModule from './CallLogModule';
import PriceListModule from './PriceListModule';
import FollowUpModule from './FollowUpModule';
import ShipmentModule from './ShipmentModule';

const AdminDashboard = ({ user, onLogout }) => {
  const ADMIN_EMAIL = 'info@gtintl.com.ph';
  const isSuperAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const [view, setView] = useState(() => {
    const savedView = localStorage.getItem('gt_admin_active_view');
    if (savedView === 'shipments' && !isSuperAdmin) return 'leads';
    return savedView || 'leads';
  });

  const [editingQuote, setEditingQuote] = useState(null);
  const [docMode, setDocMode] = useState('quotation');
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalQuotes: 0, totalVolume: 0, unreadCount: 0 });

  useEffect(() => {
    localStorage.setItem('gt_admin_active_view', view);
  }, [view]);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quotations_20240522')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        setQuotes(data);
        const volume = data.reduce((acc, curr) => acc + Number(curr.equipment_price || 0), 0);
        const unread = data.filter(q => !q.is_read).length;
        setStats({ totalQuotes: data.length, totalVolume: volume, unreadCount: unread });
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleUpdateLead = async (id, updates) => {
    try {
      const { error } = await supabase.from('quotations_20240522').update(updates).eq('id', id);
      if (error) throw error;
      fetchQuotes();
    } catch (err) {
      alert("Update failed: " + err.message);
    }
  };

  const handleDeleteLead = async (id) => {
    const password = prompt("⚠️ SECURITY CLEARANCE REQUIRED\nEnter Admin Password to delete:");
    if (password === 'Subic@123') {
      try {
        const { error } = await supabase.from('quotations_20240522').delete().eq('id', id);
        if (error) throw error;
        fetchQuotes();
      } catch (err) {
        alert(err.message);
      }
    } else if (password !== null) {
      alert("❌ INCORRECT PASSWORD");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Interested': return 'bg-green-100 text-green-700 border-green-200';
      case 'Pending': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Not Interested': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  if (view === 'create') {
    return <QuotationCreator editData={editingQuote} initialMode={docMode} onBack={() => setView('registry')} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8 lg:p-8">
      <div className="max-w-[1400px] mx-auto px-4 pt-6 lg:px-0">
        <header className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-10">
          <div className="flex items-center justify-between w-full lg:w-auto">
            <div className="flex items-center gap-4">
              <div className="bg-blue-700 p-2.5 lg:p-3 rounded-[20px] text-white shadow-xl shadow-blue-100">
                <SafeIcon icon={FiTruck} className="text-xl lg:text-2xl" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-black text-gray-900 tracking-tight leading-none">GT Admin</h1>
                <div className="flex items-center gap-2 mt-1.5 text-[8px] font-black uppercase text-gray-400 tracking-widest">
                  PORTAL {isSuperAdmin && <span className="text-indigo-600 ml-2">● SUPER ADMIN</span>}
                </div>
              </div>
            </div>
            <button onClick={onLogout} className="lg:hidden p-3 bg-red-50 text-red-600 rounded-xl"><SafeIcon icon={FiLogOut} /></button>
          </div>

          <div className="hidden md:flex flex-wrap items-center justify-center gap-1 bg-white p-1.5 rounded-[24px] shadow-sm border border-gray-100">
            <NavButton active={view === 'leads'} onClick={() => setView('leads')} icon={FiActivity} label="Leads" />
            <NavButton active={view === 'registry'} onClick={() => setView('registry')} icon={FiList} label="Quotes" />
            <NavButton active={view === 'calendar'} onClick={() => setView('calendar')} icon={FiCalendar} label="CRM" />
            <NavButton active={view === 'call-log'} onClick={() => setView('call-log')} icon={FiPhoneCall} label="Calls" />
            <NavButton active={view === 'follow-ups'} onClick={() => setView('follow-ups')} icon={FiRepeat} label="Follows" />
            <NavButton active={view === 'price-list'} onClick={() => setView('price-list')} icon={FiTag} label="Price" />
            {isSuperAdmin && <NavButton active={view === 'shipments'} onClick={() => setView('shipments')} icon={FiAnchor} label="Shipments" className="bg-indigo-50 text-indigo-700" />}
          </div>

          <button onClick={onLogout} className="hidden lg:flex bg-white text-gray-700 px-6 py-3.5 rounded-2xl items-center gap-2 border shadow-sm font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-700 transition-all">
            <SafeIcon icon={FiLogOut} /> Logout
          </button>
        </header>

        <main className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {view === 'leads' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 mb-10">
                <StatCard title="Total Leads" value={stats.totalQuotes} icon={FiUsers} color="blue" />
                <StatCard title="Active Volume" value={new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(stats.totalVolume)} icon={FiDollarSign} color="green" />
                <StatCard title="New Leads" value={stats.unreadCount} icon={FiBell} color="red" />
              </div>
              <div className="bg-white rounded-[40px] shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-6 lg:p-8 border-b bg-gray-50/50">
                  <h2 className="font-black text-gray-800 flex items-center gap-3 uppercase text-xs tracking-widest">
                    <div className="w-1 h-4 bg-blue-600 rounded-full" /> Calculator Leads
                  </h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {loading ? <div className="p-20 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">Syncing...</div> : quotes.map(quote => (
                    <div key={quote.id} className={`p-6 flex flex-col md:flex-row justify-between items-center gap-6 ${!quote.is_read ? 'bg-blue-50/30' : ''}`}>
                      <div className="flex items-center gap-6 w-full md:w-auto">
                        <div className={`w-1.5 h-12 rounded-full hidden md:block ${!quote.is_read ? 'bg-blue-600' : 'bg-gray-200'}`} />
                        <div>
                          <div className="flex flex-wrap items-center gap-3 mb-1">
                            <span className="font-black text-gray-900 uppercase text-sm">{quote.customer_name}</span>
                            <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase border ${getStatusColor(quote.status)}`}>{quote.status || 'New'}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase">{quote.unit_details} • {quote.contact_number}</div>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                        <button onClick={() => handleUpdateLead(quote.id, { is_read: true })} className="flex-1 md:flex-none p-3.5 bg-blue-600 text-white rounded-xl shadow-lg flex justify-center"><SafeIcon icon={FiEye} /></button>
                        <button onClick={() => handleDeleteLead(quote.id)} className="flex-1 md:flex-none p-3.5 bg-white text-red-400 rounded-xl border flex justify-center"><SafeIcon icon={FiTrash2} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {view === 'registry' && <QuotationRegistry onCreate={(m) => { setEditingQuote(null); setDocMode(m); setView('create'); }} onEdit={(q, m) => { setEditingQuote(q); setDocMode(m); setView('create'); }} />}
          {view === 'calendar' && <CalendarModule />}
          {view === 'call-log' && <CallLogModule />}
          {view === 'follow-ups' && <FollowUpModule />}
          {view === 'price-list' && <PriceListModule />}
          {view === 'shipments' && isSuperAdmin && <ShipmentModule />}
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t p-3 flex justify-around items-center z-[60] shadow-2xl">
        <MobileNavBtn active={view === 'leads'} onClick={() => setView('leads')} icon={FiActivity} label="Leads" />
        <MobileNavBtn active={view === 'registry'} onClick={() => setView('registry')} icon={FiList} label="Quotes" />
        <MobileNavBtn active={view === 'calendar'} onClick={() => setView('calendar')} icon={FiCalendar} label="CRM" />
        <MobileNavBtn active={view === 'follow-ups'} onClick={() => setView('follow-ups')} icon={FiRepeat} label="Follows" />
        <button onClick={() => setView('price-list')} className={`flex flex-col items-center gap-1 flex-1 ${view === 'price-list' ? 'text-blue-700' : 'text-gray-400'}`}>
          <div className={`p-1.5 rounded-xl ${view === 'price-list' ? 'bg-blue-50' : ''}`}><SafeIcon icon={FiTag} className="text-lg" /></div>
          <span className="text-[8px] font-black uppercase tracking-tighter">Price</span>
        </button>
      </nav>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label, className = "" }) => (
  <button onClick={onClick} className={`text-[9px] font-black flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all uppercase tracking-widest ${active ? 'bg-blue-700 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-50'} ${className}`}>
    <SafeIcon icon={icon} className="text-base" /> <span>{label}</span>
  </button>
);

const MobileNavBtn = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 flex-1 ${active ? 'text-blue-700' : 'text-gray-400'}`}>
    <div className={`p-1.5 rounded-xl ${active ? 'bg-blue-50' : ''}`}><SafeIcon icon={icon} className="text-lg" /></div>
    <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

const StatCard = ({ title, value, icon, color }) => (
  <div className="p-6 lg:p-8 bg-white rounded-[32px] border border-gray-100 shadow-sm">
    <div className="flex items-center gap-4 mb-4">
      <div className={`p-2.5 lg:p-3 rounded-xl ${color === 'blue' ? 'bg-blue-50 text-blue-600' : color === 'green' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
        <SafeIcon icon={icon} className="text-lg lg:text-xl" />
      </div>
      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{title}</p>
    </div>
    <h3 className="text-xl lg:text-2xl font-black text-gray-900 leading-none">{value}</h3>
  </div>
);

export default AdminDashboard;