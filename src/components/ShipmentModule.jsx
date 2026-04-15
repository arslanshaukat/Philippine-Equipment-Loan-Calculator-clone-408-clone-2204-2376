import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiAnchor, FiPlus, FiSearch, FiEdit, FiTrash2, FiSave, FiX, 
  FiTruck, FiDollarSign, FiCalendar, FiCheckCircle, FiAlertCircle, 
  FiBox, FiList, FiFileText, FiRefreshCw, FiClock, FiChevronRight,
  FiActivity
} from 'react-icons/fi';
import { supabase } from '../supabase/supabase';
import SafeIcon from '../common/SafeIcon';

const ShipmentModule = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    soa_date: new Date().toISOString().split('T')[0],
    bl_no: '',
    vessel_name: '',
    voyage_no: '',
    kgs: '',
    cbm: '',
    amount_php: '',
    is_paid: false,
    payment_date: '',
    units: []
  });

  const fetchShipments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shipment_headers_20240218')
        .select(`
          *,
          units:shipment_units_20240218(*)
        `)
        .order('soa_date', { ascending: false });

      if (error) throw error;
      setShipments(data || []);
      
      if (selectedShipment) {
        const updated = data.find(s => s.id === selectedShipment.id);
        if (updated) setSelectedShipment(updated);
      }
    } catch (err) {
      console.error("Fetch Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedShipment]);

  useEffect(() => {
    fetchShipments();
  }, []);

  const handleSelectShipment = (s) => {
    setListLoading(true);
    setSelectedShipment(s);
    // Visual feedback delay as requested
    setTimeout(() => setListLoading(false), 500);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const headerPayload = {
        soa_date: formData.soa_date,
        bl_no: formData.bl_no.toUpperCase(),
        vessel_name: formData.vessel_name.toUpperCase(),
        voyage_no: formData.voyage_no.toUpperCase(),
        kgs: parseFloat(formData.kgs) || 0,
        cbm: parseFloat(formData.cbm) || 0,
        amount_php: parseFloat(formData.amount_php) || 0,
        is_paid: formData.is_paid,
        payment_date: formData.is_paid ? (formData.payment_date || new Date().toISOString().split('T')[0]) : null
      };

      let shipmentId = editingId;

      if (editingId) {
        await supabase.from('shipment_headers_20240218').update(headerPayload).eq('id', editingId);
        await supabase.from('shipment_units_20240218').delete().eq('shipment_id', editingId);
      } else {
        const { data, error: insErr } = await supabase.from('shipment_headers_20240218').insert([headerPayload]).select();
        if (insErr) throw insErr;
        shipmentId = data[0].id;
      }

      if (formData.units.length > 0) {
        const unitsPayload = formData.units.map(u => ({
          shipment_id: shipmentId,
          chassis_no: (u.chassis_no || '').toUpperCase(),
          description: (u.description || '').toUpperCase(),
          amount_php: parseFloat(u.amount_php) || 0,
          duties_taxes: parseFloat(u.duties_taxes) || 0
        }));
        await supabase.from('shipment_units_20240218').insert(unitsPayload);
      }

      setShowModal(false);
      resetForm();
      fetchShipments(true);
    } catch (err) {
      alert("Save failed: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const password = prompt("⚠️ ADMIN CLEARANCE\nEnter Password to delete:");
    if (password === 'Subic@123') {
      await supabase.from('shipment_headers_20240218').delete().eq('id', id);
      fetchShipments(true);
      if (selectedShipment?.id === id) setSelectedShipment(null);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      soa_date: new Date().toISOString().split('T')[0],
      bl_no: '',
      vessel_name: '',
      voyage_no: '',
      kgs: '',
      cbm: '',
      amount_php: '',
      is_paid: false,
      payment_date: '',
      units: []
    });
  };

  const addUnitField = () => {
    setFormData({
      ...formData,
      units: [...formData.units, { chassis_no: '', description: '', amount_php: '', duties_taxes: '' }]
    });
  };

  const removeUnitField = (index) => {
    const newUnits = [...formData.units];
    newUnits.splice(index, 1);
    setFormData({ ...formData, units: newUnits });
  };

  const updateUnitField = (index, field, value) => {
    const newUnits = [...formData.units];
    newUnits[index][field] = value;
    setFormData({ ...formData, units: newUnits });
  };

  const filteredShipments = shipments.filter(s => 
    s.bl_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.vessel_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[600px]">
      <div className="flex-1 space-y-6 relative">
        {/* HEADER SECTION */}
        <div className="bg-white p-6 lg:p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h2 className="text-xl lg:text-3xl font-black text-gray-900 flex items-center gap-3 uppercase tracking-tighter">
              <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-100">
                <SafeIcon icon={FiAnchor} />
              </div>
              Manifest
            </h2>
            <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1.5 ml-1">GT International Logistics</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <SafeIcon icon={FiSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search BL..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-50"
              />
            </div>
            <button 
              onClick={() => { resetForm(); setShowModal(true); }}
              className="bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-800 shadow-xl shadow-indigo-100 transition-all flex items-center gap-2"
            >
              <SafeIcon icon={FiPlus} /> New Entry
            </button>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden relative min-h-[400px]">
          {listLoading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center animate-in fade-in duration-200">
              <FiRefreshCw className="animate-spin text-4xl text-indigo-600 mb-2" />
              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Updating View...</span>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead className="bg-gray-50 border-b text-[9px] font-black text-gray-400 uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-6">Status & B/L</th>
                  <th className="px-8 py-6">Vessel Data</th>
                  <th className="px-8 py-6">Load Profile</th>
                  <th className="px-8 py-6 text-right">Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="p-32 text-center">
                      <FiRefreshCw className="animate-spin text-4xl text-indigo-400 mx-auto mb-4" />
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Accessing Registry...</span>
                    </td>
                  </tr>
                ) : filteredShipments.length > 0 ? (
                  filteredShipments.map(s => (
                    <tr 
                      key={s.id} 
                      onClick={() => handleSelectShipment(s)}
                      className={`hover:bg-indigo-50/50 transition-all cursor-pointer group ${selectedShipment?.id === s.id ? 'bg-indigo-50/80 border-l-4 border-indigo-600' : ''}`}
                    >
                      <td className="px-8 py-7">
                        <div className="text-[12px] font-black text-gray-900 uppercase tracking-tight">{s.bl_no}</div>
                        <div className={`mt-2 flex items-center gap-2`}>
                          <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${s.is_paid ? 'bg-green-100 text-green-600 border border-green-200' : 'bg-red-100 text-red-600 border border-red-200'}`}>
                            {s.is_paid ? 'PAID' : 'UNPAID'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <div className="text-[11px] font-black text-indigo-700 uppercase tracking-wider">{s.vessel_name}</div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase mt-1">Voyage {s.voyage_no} • {s.soa_date}</div>
                      </td>
                      <td className="px-8 py-7">
                        <div className="text-[10px] font-black text-gray-600 uppercase mb-1">{s.units?.length || 0} Chassis</div>
                        <div className="text-[8px] font-bold text-gray-400 uppercase">{s.kgs.toLocaleString()} KG / {s.cbm.toLocaleString()} CBM</div>
                      </td>
                      <td className="px-8 py-7 text-right font-black text-[15px] text-gray-900">
                        ₱{new Intl.NumberFormat().format(s.amount_php)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-32 text-center">
                      <SafeIcon icon={FiFileText} className="text-5xl text-gray-100 mx-auto mb-4" />
                      <p className="text-[10px] font-black uppercase text-gray-300 tracking-[0.2em]">Registry is Empty</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DETAIL SIDEBAR */}
      <div className="w-full lg:w-[480px] shrink-0">
        {selectedShipment ? (
          <div className="bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden sticky top-8 animate-in slide-in-from-right-8 duration-500">
            <div className={`p-10 text-white ${selectedShipment.is_paid ? 'bg-green-600' : 'bg-gray-900'}`}>
              <div className="flex justify-between items-start mb-8">
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md shadow-lg">
                  <SafeIcon icon={FiBox} className="text-3xl" />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setEditingId(selectedShipment.id);
                      setFormData({ ...selectedShipment, units: selectedShipment.units || [] });
                      setShowModal(true);
                    }}
                    className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all"
                  ><SafeIcon icon={FiEdit} title="Edit" /></button>
                  <button 
                    onClick={() => handleDelete(selectedShipment.id)}
                    className="p-3 bg-red-500/20 text-red-100 rounded-xl hover:bg-red-500/30 transition-all"
                  ><SafeIcon icon={FiTrash2} title="Delete" /></button>
                </div>
              </div>
              <h3 className="text-3xl font-black uppercase tracking-tight mb-2 leading-none">{selectedShipment.bl_no}</h3>
              <div className="flex items-center gap-3 mt-4">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-lg">
                  {selectedShipment.is_paid ? 'SETTLED' : 'OUTSTANDING'}
                </span>
              </div>
            </div>

            <div className="p-8 space-y-6 max-h-[50vh] overflow-y-auto no-scrollbar bg-gray-50/20">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Inventory Details</span>
                <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full uppercase">{selectedShipment.units?.length || 0} Units</span>
              </div>
              {selectedShipment.units?.map((unit) => (
                <div key={unit.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:border-indigo-200 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[13px] font-black text-gray-900 uppercase tracking-tighter">{unit.chassis_no}</span>
                    <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-lg">₱{new Intl.NumberFormat().format(unit.duties_taxes)}</span>
                  </div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase leading-relaxed">{unit.description}</p>
                </div>
              ))}
            </div>

            <div className="p-10 bg-indigo-700 text-white">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block mb-2">Total Valuation</span>
                  <p className="text-4xl font-black tracking-tighter">₱{new Intl.NumberFormat().format(selectedShipment.amount_php)}</p>
                </div>
                <button 
                  onClick={() => setSelectedShipment(null)}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
                >
                  <SafeIcon icon={FiX} /> Close Window
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[600px] flex flex-col items-center justify-center bg-white rounded-[40px] border-2 border-dashed border-gray-100 p-12 text-center">
            <SafeIcon icon={FiAnchor} className="text-6xl text-gray-200 mb-6" />
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Registry Clean</h3>
            <p className="text-[10px] text-gray-400 font-black uppercase mt-3 leading-relaxed max-w-[200px]">Select a manifest record to view detailed chassis breakdown and payment history.</p>
          </div>
        )}
      </div>

      {/* FORM MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[90] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[95vh]">
            <div className="bg-indigo-700 p-8 text-white flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-black uppercase tracking-tight">{editingId ? 'Modify Manifest' : 'New Shipment Entry'}</h3>
              <button onClick={() => setShowModal(false)} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all"><SafeIcon icon={FiX} /></button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 lg:p-14 no-scrollbar bg-gray-50/30">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                <div className="space-y-8">
                  <div className="flex items-center gap-3 border-b pb-4">
                    <SafeIcon icon={FiFileText} className="text-indigo-600" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-gray-800">B/L Logistics Data</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <FormInput label="SOA Date" type="date" value={formData.soa_date} onChange={e => setFormData({...formData, soa_date: e.target.value})} required />
                    <FormInput label="B/L Number" value={formData.bl_no} onChange={e => setFormData({...formData, bl_no: e.target.value.toUpperCase()})} required />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <FormInput label="Vessel Name" value={formData.vessel_name} onChange={e => setFormData({...formData, vessel_name: e.target.value.toUpperCase()})} required />
                    <FormInput label="Voyage #" value={formData.voyage_no} onChange={e => setFormData({...formData, voyage_no: e.target.value.toUpperCase()})} required />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <FormInput label="Weight (KGS)" type="number" value={formData.kgs} onChange={e => setFormData({...formData, kgs: e.target.value})} required />
                    <FormInput label="Volume (CBM)" type="number" value={formData.cbm} onChange={e => setFormData({...formData, cbm: e.target.value})} required />
                  </div>

                  <FormInput label="Total Amount (PHP)" type="number" value={formData.amount_php} onChange={e => setFormData({...formData, amount_php: e.target.value})} required />

                  <div className="bg-white p-8 rounded-[32px] border border-gray-200 shadow-sm transition-all">
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 ml-1">Payment Status</label>
                    <div className="flex gap-2 mb-6">
                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, is_paid: true})}
                        className={`flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${formData.is_paid ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400'}`}
                      >
                        <SafeIcon icon={FiCheckCircle} className="inline mr-2" /> PAID
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, is_paid: false})}
                        className={`flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${!formData.is_paid ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400'}`}
                      >
                        <SafeIcon icon={FiAlertCircle} className="inline mr-2" /> UNPAID
                      </button>
                    </div>

                    {formData.is_paid && (
                      <div className="animate-in slide-in-from-top-4">
                        <FormInput label="Payment Date" type="date" value={formData.payment_date} onChange={e => setFormData({...formData, payment_date: e.target.value})} required />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                      <SafeIcon icon={FiTruck} className="text-indigo-600" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-gray-800">Unit Breakdown</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={addUnitField}
                      className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 uppercase"
                    >+ Add Chassis</button>
                  </div>

                  <div className="space-y-6">
                    {formData.units.map((unit, idx) => (
                      <div key={idx} className="p-8 bg-white rounded-[32px] border border-gray-200 relative group shadow-sm hover:border-indigo-100 transition-all">
                        <button 
                          type="button" 
                          onClick={() => removeUnitField(idx)}
                          className="absolute -top-3 -right-3 bg-red-500 text-white p-2.5 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                        >
                          <FiTrash2 className="text-xs" />
                        </button>
                        <div className="grid grid-cols-2 gap-6 mb-6">
                          <FormInput label="Chassis #" value={unit.chassis_no} onChange={e => updateUnitField(idx, 'chassis_no', e.target.value.toUpperCase())} required />
                          <FormInput label="Duties/Taxes" type="number" value={unit.duties_taxes} onChange={e => updateUnitField(idx, 'duties_taxes', e.target.value)} />
                        </div>
                        <FormInput label="Model Code & Details" value={unit.description} onChange={e => updateUnitField(idx, 'description', e.target.value.toUpperCase())} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-16 pt-10 border-t border-gray-100 flex justify-center pb-8">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full lg:w-96 py-6 bg-indigo-700 text-white rounded-[28px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-800 transition-all text-[12px] flex items-center justify-center gap-4"
                >
                  <SafeIcon icon={FiSave} />
                  {isSaving ? 'Processing...' : 'Save to Registry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const FormInput = ({ label, ...props }) => (
  <div>
    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">{label}</label>
    <input 
      {...props} 
      className="w-full px-6 py-4 bg-white border border-gray-200 rounded-[22px] text-[13px] font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all text-gray-800 shadow-sm" 
    />
  </div>
);

export default ShipmentModule;