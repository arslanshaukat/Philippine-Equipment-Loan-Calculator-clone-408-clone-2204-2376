import React, { useState, useEffect, useMemo } from 'react';
import {
  FiTruck, FiPlus, FiSearch, FiEdit, FiX, FiSave,
  FiUser, FiPhone, FiMail, FiMapPin, FiCalendar,
  FiDollarSign, FiClock, FiMessageSquare, FiChevronLeft,
  FiChevronRight, FiUserCheck, FiRefreshCw
} from 'react-icons/fi';
import { supabase } from '../supabase/supabase';
import pb from '../supabase/supabase';
import SafeIcon from '../common/SafeIcon';

const STAFF = ['RHEA', 'MEL', 'PRINCESS', 'ARSLAN'];
const PAYMENT_TYPES = ['Cash', 'Financing', 'Bank Loan', 'In-House'];

const emptyForm = {
  buyer_name: '', company: '', phone: '', email: '', address: '',
  make: '', model: '', year: '', chassis_no: '', engine_no: '',
  body_type: '', color: '', sale_price: '', sale_date: '',
  payment_type: 'Cash', handled_by: '', remarks: '',
};

const InputField = ({ label, value, onChange, type = 'text', required, placeholder }) => (
  <div className="space-y-1">
    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}{required && ' *'}</label>
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder || label}
      required={required}
      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-100 uppercase"
    />
  </div>
);

export default function SoldUnitsModule() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [lightbox, setLightbox] = useState({ open: false, urls: [], idx: 0 });

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('sold_units').select('*').order('sale_date', { ascending: false });
      setUnits(data || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUnits(); }, []);

  const filtered = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return units.filter(u =>
      u.buyer_name?.toLowerCase().includes(s) ||
      u.company?.toLowerCase().includes(s) ||
      u.phone?.includes(s) ||
      u.make?.toLowerCase().includes(s) ||
      u.model?.toLowerCase().includes(s) ||
      u.chassis_no?.toLowerCase().includes(s) ||
      u.engine_no?.toLowerCase().includes(s)
    );
  }, [units, searchTerm]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedStaff) { alert('⚠ Please select a staff member before saving'); return; }
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        buyer_name: (formData.buyer_name || '').toUpperCase(),
        company: (formData.company || '').toUpperCase(),
        make: (formData.make || '').toUpperCase(),
        model: (formData.model || '').toUpperCase(),
        body_type: (formData.body_type || '').toUpperCase(),
        color: (formData.color || '').toUpperCase(),
        chassis_no: (formData.chassis_no || '').toUpperCase(),
        engine_no: (formData.engine_no || '').toUpperCase(),
        sale_price: parseFloat(formData.sale_price) || 0,
        year: parseInt(formData.year) || 0,
        handled_by: selectedStaff,
      };

      if (editingId) {
        await supabase.from('sold_units').update(payload).eq('id', editingId);
      } else {
        await supabase.from('sold_units').insert([payload]);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm);
      fetchUnits();
    } catch(e) { alert('Save error: ' + e.message); }
    finally { setIsSaving(false); }
  };

  const handleEdit = (unit) => {
    setFormData({ ...emptyForm, ...unit });
    setSelectedStaff(unit.handled_by || '');
    setEditingId(unit.id);
    setShowForm(true);
    setSelectedUnit(null);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    if (!selectedStaff) { alert('⚠ Please select a staff member first'); return; }
    setIsAddingNote(true);
    try {
      const entry = {
        date: new Date().toLocaleString(),
        note: newNote.toUpperCase(),
        staff: selectedStaff,
      };
      const updatedHistory = [entry, ...(selectedUnit.history || [])];
      await supabase.from('sold_units').update({
        history: updatedHistory,
        last_contacted_at: new Date().toISOString(),
      }).eq('id', selectedUnit.id);
      fetchUnits();
      setSelectedUnit(prev => ({ ...prev, history: updatedHistory, last_contacted_at: new Date().toISOString() }));
      setNewNote('');
    } catch(e) { alert(e.message); }
    finally { setIsAddingNote(false); }
  };

  const today = new Date().toISOString().split('T')[0];
  const dueFollowUps = units.filter(u => u.next_follow_up && u.next_follow_up <= today);

  return (
    <div className="flex flex-col xl:flex-row gap-4 pb-20 xl:pb-0">
      {/* LEFT: List */}
      <div className="flex flex-col w-full xl:w-[420px] shrink-0 gap-4">
        {/* Header */}
        <div className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                <div className="bg-green-600 p-2 rounded-xl text-white"><SafeIcon icon={FiTruck} /></div>
                Sold Units
              </h2>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">{units.length} Total • {dueFollowUps.length} Follow-ups Due</p>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchUnits} className="p-3 bg-gray-50 text-gray-400 rounded-xl border border-gray-100 hover:text-green-600 transition-all">
                <SafeIcon icon={FiRefreshCw} className={loading ? 'animate-spin' : ''} />
              </button>
              <button onClick={() => { setFormData(emptyForm); setEditingId(null); setSelectedStaff(''); setShowForm(true); }}
                className="px-4 py-3 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all flex items-center gap-2">
                <SafeIcon icon={FiPlus} /> Add Sale
              </button>
            </div>
          </div>
          <div className="relative">
            <SafeIcon icon={FiSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search buyer, unit, chassis..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-green-100" />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar pb-8 max-h-[calc(100vh-280px)]">
          {loading ? (
            <div className="bg-white rounded-[24px] p-12 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest border border-gray-100">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-[24px] p-12 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest border border-gray-100">No records found</div>
          ) : filtered.map(unit => {
            const isDue = unit.next_follow_up && unit.next_follow_up <= today;
            return (
              <div key={unit.id} onClick={() => setSelectedUnit(unit)}
                className={`bg-white p-5 rounded-[24px] border cursor-pointer transition-all hover:shadow-lg hover:border-green-200 ${selectedUnit?.id === unit.id ? 'border-green-500 shadow-lg' : 'border-gray-100'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-black text-gray-900 uppercase text-sm">{unit.buyer_name}</h4>
                    {unit.company && <p className="text-[9px] font-bold text-gray-400 uppercase">{unit.company}</p>}
                  </div>
                  <div className="text-right">
                    {isDue && <span className="text-[7px] font-black bg-red-50 text-red-600 px-2 py-0.5 rounded-full uppercase animate-pulse">Follow-up Due</span>}
                    {unit.last_contacted_at && (
                      <p className="text-[7px] font-black text-gray-400 mt-1">
                        {new Date(unit.last_contacted_at).toLocaleDateString('en-PH', {month:'short', day:'numeric'})}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-[8px] font-black bg-green-50 text-green-700 px-2 py-0.5 rounded-lg uppercase">{unit.make} {unit.model}</span>
                  {unit.year > 0 && <span className="text-[8px] font-black bg-gray-50 text-gray-500 px-2 py-0.5 rounded-lg">{unit.year}</span>}
                  <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg">{unit.payment_type}</span>
                </div>
                {unit.engine_no && (
                  <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Engine: {unit.engine_no}</p>
                )}
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[9px] font-bold text-gray-400 uppercase">{unit.phone}</p>
                  <p className="text-[10px] font-black text-green-700">₱{new Intl.NumberFormat().format(unit.sale_price || 0)}</p>
                </div>
                {unit.sale_date && (
                  <div className="mt-2 pt-2 border-t border-gray-50 flex items-center gap-1">
                    <SafeIcon icon={FiCalendar} className="text-[9px] text-gray-400" />
                    <span className="text-[8px] font-black text-gray-400 uppercase">Sold: {unit.sale_date}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Detail Panel */}
      {selectedUnit && (
        <div className="flex-1 bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gray-900 px-8 py-8 text-white shrink-0">
            <div className="flex justify-between items-start mb-4">
              <button onClick={() => setSelectedUnit(null)} className="xl:hidden p-2 bg-white/10 rounded-full hover:bg-white/20">
                <SafeIcon icon={FiChevronLeft} />
              </button>
              <div className="flex gap-2 ml-auto">
                <button onClick={() => handleEdit(selectedUnit)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all text-[9px] font-black uppercase flex items-center gap-1">
                  <SafeIcon icon={FiEdit} /> Edit
                </button>
                <button onClick={() => setSelectedUnit(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
                  <SafeIcon icon={FiX} />
                </button>
              </div>
            </div>
            <h3 className="text-2xl font-black uppercase">{selectedUnit.buyer_name}</h3>
            {selectedUnit.company && <p className="text-white/60 text-[11px] font-bold uppercase mt-1">{selectedUnit.company}</p>}
            <div className="flex flex-wrap gap-4 mt-4 text-[10px] text-white/60 font-bold">
              {selectedUnit.phone && <span className="flex items-center gap-1"><SafeIcon icon={FiPhone} />{selectedUnit.phone}</span>}
              {selectedUnit.email && <span className="flex items-center gap-1"><SafeIcon icon={FiMail} />{selectedUnit.email}</span>}
              {selectedUnit.sale_date && <span className="flex items-center gap-1"><SafeIcon icon={FiCalendar} />Sold: {selectedUnit.sale_date}</span>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-6 bg-gray-50/30">
            {/* Unit Info */}
            <div className="bg-white rounded-[24px] border border-gray-100 p-5">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-4">Unit Information</p>
              <div className="grid grid-cols-2 gap-3 text-[10px]">
                {[
                  ['Make', selectedUnit.make], ['Model', selectedUnit.model],
                  ['Year', selectedUnit.year], ['Body Type', selectedUnit.body_type],
                  ['Color', selectedUnit.color], ['Chassis No', selectedUnit.chassis_no],
                  ['Engine No', selectedUnit.engine_no], ['Payment', selectedUnit.payment_type],
                  ['Sale Price', '₱' + new Intl.NumberFormat().format(selectedUnit.sale_price || 0)],
                  ['Handled By', selectedUnit.handled_by],
                ].map(([label, val]) => val ? (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
                    <p className="font-black text-gray-900 uppercase">{val}</p>
                  </div>
                ) : null)}
              </div>
              {selectedUnit.address && (
                <div className="mt-3 bg-gray-50 rounded-xl p-3">
                  <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Address</p>
                  <p className="font-bold text-gray-700 text-[10px] uppercase">{selectedUnit.address}</p>
                </div>
              )}
              {selectedUnit.remarks && (
                <div className="mt-3 bg-blue-50 rounded-xl p-3">
                  <p className="text-[7px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Remarks</p>
                  <p className="font-bold text-blue-700 text-[10px] uppercase">{selectedUnit.remarks}</p>
                </div>
              )}
            </div>

            {/* Follow-up */}
            <div className="bg-white rounded-[24px] border border-gray-100 p-5">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-4">Follow-Up</p>
              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Next Follow-Up Date</label>
                  <input type="date" defaultValue={selectedUnit.next_follow_up || ''}
                    onBlur={async e => {
                      await supabase.from('sold_units').update({ next_follow_up: e.target.value }).eq('id', selectedUnit.id);
                      fetchUnits();
                      setSelectedUnit(prev => ({ ...prev, next_follow_up: e.target.value }));
                    }}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black outline-none" />
                </div>
              </div>

              {/* Staff selector */}
              <div className={`p-3 rounded-2xl border mb-3 ${!selectedStaff ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                <p className={`text-[7px] font-black uppercase tracking-widest mb-1 ${!selectedStaff ? 'text-red-500' : 'text-gray-400'}`}>
                  {!selectedStaff ? '⚠ Select Staff Before Adding Note' : 'Staff'}
                </p>
                <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl text-[10px] font-black uppercase outline-none ${!selectedStaff ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-200 bg-white'}`}>
                  <option value="">— Select Staff —</option>
                  {STAFF.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <textarea value={newNote} onChange={e => setNewNote(e.target.value)}
                placeholder="Add follow-up note..."
                rows={2}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-green-100 mb-2" />
              <button onClick={handleAddNote} disabled={isAddingNote || !newNote.trim() || !selectedStaff}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 hover:bg-green-700 transition-all">
                {isAddingNote ? 'Saving...' : 'Save Note'}
              </button>
            </div>

            {/* History */}
            {(selectedUnit.history || []).length > 0 && (
              <div className="space-y-3">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><SafeIcon icon={FiClock} /> Contact History</p>
                {(selectedUnit.history || []).map((entry, i) => (
                  <div key={i} className="border-l-2 border-green-100 pl-4 py-1 relative">
                    <div className="absolute -left-[5px] top-3 w-2 h-2 rounded-full bg-green-500" />
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[7px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                        <SafeIcon icon={FiUserCheck} className="text-[7px]" /> {entry.staff}
                      </span>
                      <span className="text-[7px] font-black text-gray-400 uppercase">{entry.date}</span>
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
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-green-600 px-8 py-6 text-white flex justify-between items-center shrink-0">
              <h3 className="font-black text-lg uppercase tracking-tight">{editingId ? 'Edit Sale Record' : 'New Sale Record'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><SafeIcon icon={FiX} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 overflow-y-auto no-scrollbar space-y-6">
              {/* Buyer Info */}
              <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><SafeIcon icon={FiUser} /> Buyer Information</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Buyer Name" value={formData.buyer_name} onChange={e => setFormData({...formData, buyer_name: e.target.value})} required />
                  <InputField label="Company" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
                  <InputField label="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} type="tel" />
                  <InputField label="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} type="email" />
                  <div className="md:col-span-2">
                    <InputField label="Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* Unit Info */}
              <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><SafeIcon icon={FiTruck} /> Unit Information</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <InputField label="Make" value={formData.make} onChange={e => setFormData({...formData, make: e.target.value})} />
                  <InputField label="Model" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
                  <InputField label="Year" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} type="number" />
                  <InputField label="Chassis No" value={formData.chassis_no} onChange={e => setFormData({...formData, chassis_no: e.target.value})} />
                  <InputField label="Engine No" value={formData.engine_no} onChange={e => setFormData({...formData, engine_no: e.target.value})} />
                  <InputField label="Body Type" value={formData.body_type} onChange={e => setFormData({...formData, body_type: e.target.value})} />
                  <InputField label="Color" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />
                </div>
              </div>

              {/* Sale Info */}
              <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><SafeIcon icon={FiDollarSign} /> Sale Information</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <InputField label="Sale Price" value={formData.sale_price} onChange={e => setFormData({...formData, sale_price: e.target.value})} type="number" />
                  <InputField label="Sale Date" value={formData.sale_date} onChange={e => setFormData({...formData, sale_date: e.target.value})} type="date" />
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Type</label>
                    <select value={formData.payment_type} onChange={e => setFormData({...formData, payment_type: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none uppercase">
                      {PAYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Remarks</label>
                    <textarea value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})}
                      rows={2} placeholder="Any additional notes..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none" />
                  </div>
                </div>
              </div>

              {/* Staff */}
              <div className={`p-4 rounded-2xl border ${!selectedStaff ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                <p className={`text-[8px] font-black uppercase tracking-widest mb-2 ${!selectedStaff ? 'text-red-500' : 'text-gray-400'}`}>
                  {!selectedStaff ? '⚠ Select Staff Before Saving' : 'Handled By'}
                </p>
                <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl text-[10px] font-black uppercase outline-none ${!selectedStaff ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-200 bg-white'}`}>
                  <option value="">— Select Staff —</option>
                  {STAFF.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <button type="submit" disabled={isSaving || !selectedStaff}
                className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                <SafeIcon icon={FiSave} /> {isSaving ? 'Saving...' : editingId ? 'Update Record' : 'Save Sale Record'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
