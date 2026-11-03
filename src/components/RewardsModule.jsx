import React, { useState, useEffect, useMemo } from 'react';
import {
  FiAward, FiTool, FiUsers, FiDollarSign, FiCheck, FiX, FiPlus,
  FiTrendingUp, FiCalendar, FiClock
} from 'react-icons/fi';
import pb from '../supabase/supabase';
import SafeIcon from '../common/SafeIcon';

const FIXED_NAMES = ['RHEA', 'MEL', 'CESS'];

const formatPHP = (val) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(val || 0);

const getManilaMonthKey = (dateStr) => {
  const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  return new Date(normalized).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }).slice(0, 7);
};

const RewardsModule = () => {
  const currentStaffName = (pb.authStore.model?.name || pb.authStore.model?.email || 'STAFF').toUpperCase();

  // Form state
  const [saleType, setSaleType] = useState('Standard'); // 'Standard' | 'Agent-Assisted'
  const [handler, setHandler] = useState('');
  const [handlerOther, setHandlerOther] = useState('');
  const [unitCount, setUnitCount] = useState(1);
  const [includeRaymond, setIncludeRaymond] = useState(true);
  const [helpers, setHelpers] = useState([]);
  const [helperOther, setHelperOther] = useState('');
  const [clientNote, setClientNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState('');

  // Log state
  const [entries, setEntries] = useState([]);
  const [loadingLog, setLoadingLog] = useState(true);

  const fetchLog = async () => {
    setLoadingLog(true);
    try {
      const records = await pb.collection('incentive_log').getFullList({ sort: '-created' });
      setEntries(records);
    } catch (err) {
      console.error('Failed to fetch incentive log:', err);
    } finally {
      setLoadingLog(false);
    }
  };

  useEffect(() => { fetchLog(); }, []);

  const resolvedHandler = handler === 'OTHER' ? handlerOther.trim().toUpperCase() : handler;
  const units = Math.max(1, parseInt(unitCount, 10) || 1);

  // Live breakdown per the locked November 2026 policy
  const breakdown = useMemo(() => {
    const isAgent = saleType === 'Agent-Assisted';
    const handlerAmount = isAgent ? 1000 : 2000 + 1000 * (units - 1);
    const raymondAmount = includeRaymond ? 1000 * units : 0;
    const helperAmountEach = 1000;
    const helperTotal = helperAmountEach * helpers.length;
    const total = handlerAmount + raymondAmount + helperTotal;
    return { handlerAmount, raymondAmount, helperAmountEach, helperTotal, total };
  }, [saleType, units, includeRaymond, helpers]);

  const toggleHelper = (name) => {
    setHelpers(prev => prev.includes(name) ? prev.filter(h => h !== name) : [...prev, name]);
  };

  const addOtherHelper = () => {
    const name = helperOther.trim().toUpperCase();
    if (!name || helpers.includes(name)) return;
    setHelpers(prev => [...prev, name]);
    setHelperOther('');
  };

  const canLog = resolvedHandler.length > 0 && units > 0;

  const resetForm = () => {
    setSaleType('Standard');
    setHandler('');
    setHandlerOther('');
    setUnitCount(1);
    setIncludeRaymond(true);
    setHelpers([]);
    setHelperOther('');
    setClientNote('');
  };

  const handleConfirmLog = async () => {
    if (!canLog) {
      setError('Select a handler before logging this sale.');
      return;
    }
    setError('');
    setIsSaving(true);
    try {
      await pb.collection('incentive_log').create({
        sale_type: saleType,
        handler_name: resolvedHandler,
        unit_count: units,
        include_raymond: includeRaymond,
        helpers,
        handler_amount: breakdown.handlerAmount,
        raymond_amount: breakdown.raymondAmount,
        helper_amount_each: breakdown.helperAmountEach,
        helper_total: breakdown.helperTotal,
        total_amount: breakdown.total,
        client_note: clientNote,
        logged_by: currentStaffName,
        sale_date: new Date().toISOString(),
      });
      setJustSaved(true);
      resetForm();
      fetchLog();
      setTimeout(() => setJustSaved(false), 3000);
    } catch (err) {
      setError(err?.data?.message || err.message || 'Failed to log this sale.');
    } finally {
      setIsSaving(false);
    }
  };

  // Monthly summary by person — mirrors the old Excel payout breakdown
  const monthlySummary = useMemo(() => {
    const nowKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }).slice(0, 7);
    const totals = {};
    const bump = (name, amt) => {
      if (!name || !amt) return;
      totals[name] = (totals[name] || 0) + amt;
    };
    entries
      .filter(e => getManilaMonthKey(e.created) === nowKey)
      .forEach(e => {
        bump(e.handler_name, e.handler_amount);
        if (e.include_raymond) bump('RAYMOND', e.raymond_amount);
        (e.helpers || []).forEach(h => bump(h, e.helper_amount_each));
      });
    return { monthKey: nowKey, totals };
  }, [entries]);

  const monthLabel = (() => {
    const [y, m] = monthlySummary.monthKey.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  })();

  const formatLogDate = (dateStr) => {
    const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
    return new Date(normalized).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="bg-white p-4 sm:p-6 rounded-[24px] shadow-sm border border-gray-100">
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2 uppercase tracking-tighter mb-1">
          <SafeIcon icon={FiAward} className="text-amber-600" /> Incentive Calculator
        </h2>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          Sales incentive splits — effective November 2026 policy
        </p>
      </div>

      {/* CALCULATOR */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-4 sm:p-6 space-y-5">
        {/* Sale type */}
        <div>
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Sale Type</label>
          <div className="flex gap-2">
            {['Standard', 'Agent-Assisted'].map(t => (
              <button
                key={t}
                onClick={() => setSaleType(t)}
                className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                  saleType === t ? 'bg-amber-600 text-white shadow-lg shadow-amber-100' : 'bg-gray-50 text-gray-500 border border-gray-200'
                }`}
              >
                {t === 'Standard' ? 'Standard Sale' : 'Agent-Assisted Sale'}
              </button>
            ))}
          </div>
        </div>

        {/* Handler */}
        <div>
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Main Handler</label>
          <div className="flex flex-wrap gap-2">
            {FIXED_NAMES.map(name => (
              <button
                key={name}
                onClick={() => setHandler(name)}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                  handler === name ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-500 border border-gray-200'
                }`}
              >
                {name}
              </button>
            ))}
            <button
              onClick={() => setHandler('OTHER')}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                handler === 'OTHER' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-500 border border-gray-200'
              }`}
            >
              Other
            </button>
          </div>
          {handler === 'OTHER' && (
            <input
              type="text"
              value={handlerOther}
              onChange={e => setHandlerOther(e.target.value)}
              placeholder="Enter handler name"
              className="mt-2 w-full sm:w-64 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none"
            />
          )}
        </div>

        {/* Unit count + Raymond */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Units Sold</label>
            <input
              type="number" min="1" value={unitCount}
              onChange={e => setUnitCount(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-black outline-none"
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Raymond (Mechanic)</label>
            <button
              onClick={() => setIncludeRaymond(v => !v)}
              className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                includeRaymond ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-50 text-gray-400 border border-gray-200'
              }`}
            >
              <SafeIcon icon={FiTool} /> {includeRaymond ? 'Included — Paid Per Unit' : 'Excluded for this sale'}
            </button>
          </div>
        </div>

        {/* Helpers */}
        <div>
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Helpers</label>
          <p className="text-[9px] font-bold text-gray-400 mb-2">Only select helpers who were actually present on the day of this sale.</p>
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              onClick={() => setHelpers([])}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                helpers.length === 0 ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-400 border border-gray-200'
              }`}
            >
              No Helpers
            </button>
            {FIXED_NAMES.filter(n => n !== resolvedHandler).map(name => (
              <button
                key={name}
                onClick={() => toggleHelper(name)}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                  helpers.includes(name) ? 'bg-green-600 text-white' : 'bg-gray-50 text-gray-500 border border-gray-200'
                }`}
              >
                {helpers.includes(name) ? <SafeIcon icon={FiCheck} className="inline mr-1" /> : null}{name}
              </button>
            ))}
            {helpers.filter(h => !FIXED_NAMES.includes(h)).map(name => (
              <button
                key={name}
                onClick={() => toggleHelper(name)}
                className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase bg-green-600 text-white flex items-center gap-1.5"
              >
                <SafeIcon icon={FiCheck} /> {name} <SafeIcon icon={FiX} className="text-[9px]" />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text" value={helperOther}
              onChange={e => setHelperOther(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOtherHelper(); } }}
              placeholder="Add another helper by name"
              className="flex-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none"
            />
            <button onClick={addOtherHelper} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5">
              <SafeIcon icon={FiPlus} /> Add
            </button>
          </div>
        </div>

        {/* Client note */}
        <div>
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Client / Unit Note (optional)</label>
          <input
            type="text" value={clientNote}
            onChange={e => setClientNote(e.target.value)}
            placeholder="e.g. Walk-in — Isuzu Elf, Key No. 12"
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
          />
        </div>

        {/* Breakdown */}
        <div className="bg-gray-900 rounded-[20px] p-5 text-white">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Calculated Breakdown</p>
          <div className="space-y-2">
            <BreakdownRow label={`Main Handler${resolvedHandler ? ` (${resolvedHandler})` : ''}`} value={breakdown.handlerAmount} />
            {includeRaymond && <BreakdownRow label="Raymond (Mechanic)" value={breakdown.raymondAmount} />}
            {helpers.map(h => <BreakdownRow key={h} label={`Helper — ${h}`} value={breakdown.helperAmountEach} />)}
          </div>
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Total Payout</span>
            <span className="text-xl font-black text-amber-400">{formatPHP(breakdown.total)}</span>
          </div>
        </div>

        {error && <div className="text-[10px] font-black text-red-600 uppercase bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}

        <button
          onClick={handleConfirmLog}
          disabled={isSaving || !canLog}
          className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all disabled:opacity-40 flex items-center justify-center gap-2 ${
            justSaved ? 'bg-green-600 text-white' : 'bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-100'
          }`}
        >
          <SafeIcon icon={justSaved ? FiCheck : FiDollarSign} />
          {isSaving ? 'Logging...' : justSaved ? 'Logged!' : 'Confirm & Log This Sale'}
        </button>
      </div>

      {/* MONTHLY SUMMARY */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-4 sm:p-6">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <SafeIcon icon={FiTrendingUp} className="text-amber-600" /> {monthLabel} — Payout Totals by Person
        </h3>
        {Object.keys(monthlySummary.totals).length === 0 ? (
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center py-6">No sales logged this month yet</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(monthlySummary.totals)
              .sort((a, b) => b[1] - a[1])
              .map(([name, amt]) => (
                <div key={name} className="bg-gray-50 rounded-2xl p-4 text-center">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{name}</p>
                  <p className="text-base font-black text-gray-900 mt-1">{formatPHP(amt)}</p>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* LOG HISTORY */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-50">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <SafeIcon icon={FiClock} className="text-amber-600" /> Logged Sales
          </h3>
        </div>
        {loadingLog ? (
          <div className="p-10 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">No sales logged yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[10px]">
              <thead className="bg-gray-50 text-[9px] font-black text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Handler</th>
                  <th className="px-4 py-3">Units</th>
                  <th className="px-4 py-3">Helpers</th>
                  <th className="px-4 py-3">Note</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map(e => (
                  <tr key={e.id} className="hover:bg-amber-50/30">
                    <td className="px-4 py-3 font-bold text-gray-500 whitespace-nowrap">{formatLogDate(e.created)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full font-black uppercase text-[8px] ${e.sale_type === 'Agent-Assisted' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                        {e.sale_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-black text-gray-900 uppercase">{e.handler_name}</td>
                    <td className="px-4 py-3 font-bold text-gray-700">{e.unit_count}</td>
                    <td className="px-4 py-3 text-gray-500 font-bold uppercase">
                      {(e.helpers || []).join(', ') || '—'}{e.include_raymond ? (e.helpers?.length ? ', RAYMOND' : 'RAYMOND') : ''}
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-medium max-w-[160px] truncate">{e.client_note || '—'}</td>
                    <td className="px-4 py-3 text-right font-black text-gray-900 whitespace-nowrap">{formatPHP(e.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const BreakdownRow = ({ label, value }) => (
  <div className="flex justify-between items-center text-xs">
    <span className="font-bold text-gray-300 uppercase">{label}</span>
    <span className="font-black text-white">{formatPHP(value)}</span>
  </div>
);

export default RewardsModule;
