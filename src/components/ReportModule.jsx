import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase/supabase';
import {
  FiBarChart2, FiCalendar, FiUsers, FiPhone, FiRepeat,
  FiActivity, FiTag, FiList, FiAlertCircle, FiDownload,
  FiFilter, FiClock, FiCheckCircle, FiXCircle, FiZap
} from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const STAFF = ['RHEA', 'MEL', 'PRINCESS', 'ARSLAN'];

const DATE_PRESETS = [
  { label: 'Today', getValue: () => { const d = new Date(); d.setHours(0,0,0,0); return { from: d, to: new Date() }; }},
  { label: 'Yesterday', getValue: () => { const d = new Date(); d.setDate(d.getDate()-1); d.setHours(0,0,0,0); const e = new Date(d); e.setHours(23,59,59,999); return { from: d, to: e }; }},
  { label: 'This Week', getValue: () => { const d = new Date(); d.setDate(d.getDate()-d.getDay()); d.setHours(0,0,0,0); return { from: d, to: new Date() }; }},
  { label: 'This Month', getValue: () => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return { from: d, to: new Date() }; }},
];

function inRange(dateStr, from, to) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= from && d <= to;
}

const Stat = ({ label, value, color = 'blue', icon }) => (
  <div className={`bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm`}>
    <div className="flex items-center gap-3 mb-2">
      <div className={`p-2 rounded-xl ${color === 'blue' ? 'bg-blue-50 text-blue-600' : color === 'green' ? 'bg-green-50 text-green-600' : color === 'red' ? 'bg-red-50 text-red-600' : color === 'orange' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
        <SafeIcon icon={icon} className="text-base" />
      </div>
      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
    </div>
    <p className="text-2xl font-black text-gray-900">{value}</p>
  </div>
);

const Section = ({ title, icon, children }) => (
  <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden mb-6">
    <div className="px-6 py-4 border-b bg-gray-50/50 flex items-center gap-3">
      <SafeIcon icon={icon} className="text-blue-600" />
      <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-800">{title}</h3>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const Table = ({ headers, rows }) => (
  <div className="overflow-x-auto -mx-2">
    <table className="w-full text-[10px]">
      <thead>
        <tr className="border-b border-gray-100">
          {headers.map(h => <th key={h} className="text-left py-2 px-3 font-black text-gray-400 uppercase tracking-widest">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
            {row.map((cell, j) => <td key={j} className="py-2.5 px-3 font-bold text-gray-700">{cell}</td>)}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan={headers.length} className="py-8 text-center text-gray-300 font-black uppercase text-[9px]">No data for selected period</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

export default function ReportModule() {
  const [preset, setPreset] = useState('Today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [staffFilter, setStaffFilter] = useState('ALL');
  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Data
  const [calls, setCalls] = useState([]);
  const [follows, setFollows] = useState([]);
  const [crm, setCrm] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [prices, setPrices] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [applicants, setApplicants] = useState([]);

  const dateRange = useMemo(() => {
    if (preset === 'Custom' && customFrom && customTo) {
      return { from: new Date(customFrom), to: new Date(customTo + 'T23:59:59') };
    }
    const p = DATE_PRESETS.find(d => d.label === preset);
    return p ? p.getValue() : DATE_PRESETS[0].getValue();
  }, [preset, customFrom, customTo]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [c, f, cr, q, p, a, ap] = await Promise.all([
        supabase.from('daily_call_logs_2024').select('*').order('created_at', { ascending: false }),
        supabase.from('follow_ups_2024').select('*').order('last_contacted_at', { ascending: false }),
        supabase.from('visit_schedules_2024').select('*').order('created_at', { ascending: false }),
        supabase.from('quotations_20240522').select('*').order('created_at', { ascending: false }),
        supabase.from('price_list_2024').select('*').order('created_at', { ascending: false }),
        supabase.from('activity_log').select('*').order('timestamp', { ascending: false }),
        supabase.from('applicants').select('*').order('date_applied', { ascending: false }),
      ]);
      setCalls(c.data || []);
      setFollows(f.data || []);
      setCrm(cr.data || []);
      setQuotes(q.data || []);
      setPrices(p.data || []);
      setActivityLogs(a.data || []);
      setApplicants(ap.data || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Filtered by date range
  const fCalls  = calls.filter(r => inRange(r.updated_at || r.created_at, dateRange.from, dateRange.to));
  const fFollows = follows.filter(r => inRange(r.last_contacted_at || r.created_at, dateRange.from, dateRange.to));
  const fCrm    = crm.filter(r => inRange(r.created_at, dateRange.from, dateRange.to));
  const fQuotes = quotes.filter(r => inRange(r.created_at, dateRange.from, dateRange.to));
  const fPrices = prices.filter(r => inRange(r.created_at, dateRange.from, dateRange.to));
  const fLogs   = activityLogs.filter(r => inRange(r.timestamp, dateRange.from, dateRange.to));

  // Staff performance
  const staffStats = STAFF.map(name => {
    const staffCalls   = fCalls.filter(r => r.staff_name === name);
    const staffFollows = fFollows.filter(r => {
      const h = r.history || [];
      return h.some(e => e.staff === name && inRange(e.date, dateRange.from, dateRange.to));
    });
    const staffCrm    = fCrm.filter(r => r.logged_by === name);
    const staffQuotes = fQuotes.filter(r => r.logged_by === name);
    const staffPrices = fPrices.filter(r => r.logged_by === name);
    const staffLogs   = fLogs.filter(r => r.staff === name);
    const total = staffCalls.length + staffFollows.length + staffCrm.length + staffQuotes.length + staffPrices.length + staffLogs.length;
    return { name, calls: staffCalls.length, follows: staffFollows.length, crm: staffCrm.length, quotes: staffQuotes.length, prices: staffPrices.length, logs: staffLogs.length, total };
  }).sort((a, b) => b.total - a.total);

  // Overdue follows
  const today = new Date().toISOString().split('T')[0];
  const overdue = follows.filter(f => f.next_follow_up && f.next_follow_up <= today && f.status !== 'Closed');

  // Call stats
  const answeredCalls    = fCalls.filter(r => r.status === 'Answered').length;
  const notAnsweredCalls = fCalls.filter(r => r.status === 'Not Answered').length;
  const queueCalls       = fCalls.filter(r => r.status === 'To Call').length;

  // Follow stats
  const hotLeads    = follows.filter(f => f.temperature === 'Hot' && f.status !== 'Closed').length;
  const closedLeads = follows.filter(f => f.status === 'Closed').length;

  // History entries in range
  const followHistoryInRange = follows.reduce((acc, f) => {
    const entries = (f.history || []).filter(e => inRange(e.date, dateRange.from, dateRange.to));
    return acc + entries.length;
  }, 0);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: FiBarChart2 },
    { id: 'staff', label: 'Staff Performance', icon: FiUsers },
    { id: 'calls', label: 'Call Logs', icon: FiPhone },
    { id: 'follows', label: 'Follow-Ups', icon: FiRepeat },
    { id: 'crm', label: 'CRM Activity', icon: FiCalendar },
    { id: 'quotes', label: 'Quotes', icon: FiList },
    { id: 'prices', label: 'Price List', icon: FiTag },
    { id: 'overdue', label: 'Attention Required', icon: FiAlertCircle },
    { id: 'hiring', label: 'Hiring', icon: FiUsers },
  ];

  return (
    <div className="flex flex-col xl:flex-row gap-4 pb-20 xl:pb-0">
      {/* Sidebar */}
      <div className="w-full xl:w-64 shrink-0 space-y-2">
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-4 mb-4">
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3">Date Range</p>
          <div className="grid grid-cols-2 gap-1 mb-3">
            {DATE_PRESETS.map(p => (
              <button key={p.label} onClick={() => setPreset(p.label)}
                className={`py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${preset === p.label ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                {p.label}
              </button>
            ))}
            <button onClick={() => setPreset('Custom')}
              className={`col-span-2 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${preset === 'Custom' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
              Custom Range
            </button>
          </div>
          {preset === 'Custom' && (
            <div className="space-y-2">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[9px] font-black" />
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[9px] font-black" />
            </div>
          )}
          <button onClick={fetchAll} className="w-full mt-3 py-2 bg-indigo-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all">
            Refresh Data
          </button>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-1 gap-1 xl:gap-0 xl:space-y-2">{navItems.map(item => (
          <button key={item.id} onClick={() => setActiveSection(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all text-left ${activeSection === item.id ? 'bg-blue-700 text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}>
            <SafeIcon icon={item.icon} className="text-sm" />
            {item.label}
          </button>
        ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
        {loading && <div className="flex items-center justify-center h-64 text-[10px] font-black uppercase text-gray-400 tracking-widest">Loading report data...</div>}

        {!loading && activeSection === 'overview' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Stat label="Total Calls" value={fCalls.length} icon={FiPhone} color="blue" />
              <Stat label="Follow-Up Actions" value={followHistoryInRange} icon={FiRepeat} color="indigo" />
              <Stat label="New CRM Entries" value={fCrm.length} icon={FiCalendar} color="green" />
              <Stat label="New Quotes" value={fQuotes.length} icon={FiList} color="orange" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Stat label="Answered Calls" value={answeredCalls} icon={FiCheckCircle} color="green" />
              <Stat label="Not Answered" value={notAnsweredCalls} icon={FiXCircle} color="red" />
              <Stat label="Hot Leads" value={hotLeads} icon={FiZap} color="orange" />
              <Stat label="Overdue Follow-Ups" value={overdue.length} icon={FiAlertCircle} color="red" />
            </div>

            <Section title="Staff Activity Summary" icon={FiUsers}>
              <Table
                headers={['Staff', 'Calls', 'Follow-Up Actions', 'CRM Entries', 'Quotes', 'Price Updates', 'Total']}
                rows={staffStats.map(s => [s.name, s.calls, s.follows, s.crm, s.quotes, s.prices, <strong>{s.total}</strong>])}
              />
            </Section>

            <Section title="Recent Activity Log" icon={FiActivity}>
              <Table
                headers={['Time', 'Staff', 'Module', 'Action', 'Details']}
                rows={fLogs.slice(0, 20).map(l => [
                  new Date(l.timestamp).toLocaleString('en-PH', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}),
                  l.staff, l.module, l.action,
                  typeof l.details === 'object' ? JSON.stringify(l.details).slice(0, 60) : String(l.details || '').slice(0, 60)
                ])}
              />
            </Section>
          </>
        )}

        {!loading && activeSection === 'staff' && (
          <Section title="Staff Performance Scorecard" icon={FiUsers}>
            {staffStats.map(s => (
              <div key={s.name} className="mb-6 p-5 bg-gray-50 rounded-[24px]">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-black text-sm uppercase text-gray-900">{s.name}</h4>
                  <span className="text-[9px] font-black bg-blue-600 text-white px-3 py-1 rounded-full">{s.total} Total Actions</span>
                </div>
                <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                  {[['Calls', s.calls, 'blue'], ['Follow-Ups', s.follows, 'indigo'], ['CRM', s.crm, 'green'], ['Quotes', s.quotes, 'orange'], ['Price Updates', s.prices, 'red'], ['Activity Logs', s.logs, 'gray']].map(([label, val, color]) => (
                    <div key={label} className="bg-white rounded-2xl p-3 text-center border border-gray-100">
                      <p className="text-xl font-black text-gray-900">{val}</p>
                      <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Section>
        )}

        {!loading && activeSection === 'calls' && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Stat label="Answered" value={answeredCalls} icon={FiCheckCircle} color="green" />
              <Stat label="Not Answered" value={notAnsweredCalls} icon={FiXCircle} color="red" />
              <Stat label="In Queue" value={queueCalls} icon={FiClock} color="indigo" />
            </div>
            <Section title="Call Log Details" icon={FiPhone}>
              <Table
                headers={['Date/Time', 'Staff', 'Customer', 'Phone', 'Status', 'Comment']}
                rows={fCalls.map(r => [
                  new Date(r.updated_at || r.created_at).toLocaleString('en-PH', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}),
                  r.staff_name, r.customer_name, r.phone_number,
                  <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase ${r.status === 'Answered' ? 'bg-green-100 text-green-700' : r.status === 'To Call' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{r.status}</span>,
                  (r.comment || '').slice(0, 40)
                ])}
              />
            </Section>
          </>
        )}

        {!loading && activeSection === 'follows' && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Stat label="Follow-Up Actions" value={followHistoryInRange} icon={FiRepeat} color="indigo" />
              <Stat label="Hot Leads" value={hotLeads} icon={FiZap} color="orange" />
              <Stat label="Closed Leads" value={closedLeads} icon={FiCheckCircle} color="green" />
            </div>
            <Section title="Follow-Up Activity Details" icon={FiRepeat}>
              <Table
                headers={['Date/Time', 'Staff', 'Customer', 'Action', 'Comment', 'Status']}
                rows={follows.flatMap(f =>
                  (f.history || [])
                    .filter(e => inRange(e.date, dateRange.from, dateRange.to))
                    .map(e => [
                      e.date,
                      e.staff,
                      f.customer_name,
                      e.action || 'Note',
                      (e.comment || '').slice(0, 50),
                      f.status
                    ])
                ).sort((a,b) => new Date(b[0]) - new Date(a[0])).slice(0, 100)}
              />
            </Section>
          </>
        )}

        {!loading && activeSection === 'crm' && (
          <Section title="CRM Activity" icon={FiCalendar}>
            <Table
              headers={['Date', 'Staff', 'Client', 'Unit', 'Status', 'Scheduled']}
              rows={fCrm.map(r => [
                new Date(r.created_at).toLocaleDateString('en-PH', {month:'short', day:'numeric', year:'numeric'}),
                r.logged_by || '—',
                r.client_name,
                `${r.make || ''} ${r.model || ''}`.trim() || r.unit_name || '—',
                r.status || '—',
                r.scheduled_date || '—'
              ])}
            />
          </Section>
        )}

        {!loading && activeSection === 'quotes' && (
          <Section title="Quote Activity" icon={FiList}>
            <Table
              headers={['Date', 'Staff', 'Customer', 'Unit', 'Amount', 'Status']}
              rows={fQuotes.map(r => [
                new Date(r.created_at).toLocaleDateString('en-PH', {month:'short', day:'numeric', year:'numeric'}),
                r.logged_by || '—',
                r.customer_name,
                r.unit_details || '—',
                '₱' + new Intl.NumberFormat().format(r.equipment_price || 0),
                r.status || 'New'
              ])}
            />
          </Section>
        )}

        {!loading && activeSection === 'prices' && (
          <Section title="Price List Changes" icon={FiTag}>
            <Table
              headers={['Date', 'Staff', 'Key No', 'Make', 'Model', 'Price', 'Sale Price']}
              rows={fPrices.map(r => [
                new Date(r.created_at).toLocaleDateString('en-PH', {month:'short', day:'numeric', year:'numeric'}),
                r.logged_by || '—',
                r.key_no || '—',
                r.make,
                r.model_engine,
                '₱' + new Intl.NumberFormat().format(r.price || 0),
                '₱' + new Intl.NumberFormat().format(r.sale_price || 0),
              ])}
            />
          </Section>
        )}

        {!loading && activeSection === 'hiring' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Stat label="Total Applicants" value={applicants.length} icon={FiUsers} color="indigo" />
              <Stat label="For Interview" value={applicants.filter(a=>a.status==='For Interview').length} icon={FiCalendar} color="blue" />
              <Stat label="Hired" value={applicants.filter(a=>a.status==='Hired').length} icon={FiCheckCircle} color="green" />
              <Stat label="Rejected" value={applicants.filter(a=>a.status==='Rejected').length} icon={FiXCircle} color="red" />
            </div>
            <Section title="Applicants Registry" icon={FiUsers}>
              <Table
                headers={['Date Applied', 'Staff', 'Name', 'Role', 'City', 'Status', 'Interview', 'Asking', 'Offered']}
                rows={applicants.map(a => [
                  a.date_applied || '—',
                  a.handled_by || '—',
                  a.full_name,
                  a.job_role || '—',
                  a.city || '—',
                  <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase ${a.status==='Hired'?'bg-green-100 text-green-700':a.status==='Rejected'?'bg-red-100 text-red-600':'bg-blue-100 text-blue-700'}`}>{a.status}</span>,
                  a.interview_response || '—',
                  a.asking_salary ? '₱'+new Intl.NumberFormat().format(a.asking_salary) : '—',
                  a.offered_salary ? '₱'+new Intl.NumberFormat().format(a.offered_salary) : '—',
                ])}
              />
            </Section>
            <Section title="Hiring Activity Log" icon={FiActivity}>
              <Table
                headers={['Time', 'Staff', 'Action', 'Details']}
                rows={fLogs.filter(l => l.module === 'Hiring').map(l => [
                  new Date(l.timestamp).toLocaleString('en-PH', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}),
                  l.staff, l.action,
                  typeof l.details === 'object' ? Object.entries(l.details).map(([k,v]) => `${k}: ${v}`).join(' | ') : String(l.details || '')
                ])}
              />
            </Section>
          </>
        )}

        {!loading && activeSection === 'overdue' && (
          <Section title="Attention Required — Overdue Follow-Ups" icon={FiAlertCircle}>
            <Table
              headers={['Customer', 'Phone', 'Due Date', 'Days Overdue', 'Temperature', 'Last Contact']}
              rows={overdue.sort((a,b) => new Date(a.next_follow_up) - new Date(b.next_follow_up)).map(r => {
                const daysOverdue = Math.floor((new Date() - new Date(r.next_follow_up)) / 86400000);
                return [
                  r.customer_name,
                  r.phone_number,
                  r.next_follow_up,
                  <span className="text-red-600 font-black">{daysOverdue}d overdue</span>,
                  <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase ${r.temperature === 'Hot' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{r.temperature || 'Warm'}</span>,
                  r.last_contacted_at ? new Date(r.last_contacted_at).toLocaleDateString('en-PH', {month:'short', day:'numeric'}) : 'Never'
                ];
              })}
            />
          </Section>
        )}
      </div>
    </div>
  );
}
