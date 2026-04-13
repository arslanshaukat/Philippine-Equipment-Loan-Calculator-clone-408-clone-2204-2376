import React, { useState, useEffect } from 'react';
import { 
  FiTruck, FiPlus, FiSearch, FiEdit, FiTrash2, FiSave, FiX, 
  FiAnchor, FiDollarSign, FiCalendar, FiCheckCircle, FiAlertCircle, 
  FiLayers, FiMinusCircle 
} from 'react-icons/fi';
import { supabase } from '../supabase/supabase';
import SafeIcon from '../common/SafeIcon';

const ShipmentModule = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [headerData, setHeaderData] = useState({
    soa_date: new Date().toISOString().split('T')[0],
    bl_no: '', vessel_name: '', voyage_no: '', kgs: '', cbm: '',
    amount_php: '', is_paid: false, payment_date: ''
  });
  const [units, setUnits] = useState([{ chassis_no: '', description: '', duties_taxes: '' }]);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shipment_headers_20240218')
        .select(`*, shipment_units_20240218 (*)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setShipments(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const handleDelete = async (id) => {
    const password = prompt("⚠️ SECURITY CLEARANCE REQUIRED\nEnter Admin Password to delete:");
    if (password === 'Subic@123') {
      try {
        const { error } = await supabase.from('shipment_headers_20240218').delete().eq('id', id);
        if (error) throw error;
        fetchShipments();
      } catch (err) {
        alert(err.message);
      }
    } else if (password !== null) {
      alert("❌ INCORRECT PASSWORD");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const headerPayload = {
        ...headerData,
        kgs: parseFloat(headerData.kgs) || 0,
        cbm: parseFloat(headerData.cbm) || 0,
        amount_php: parseFloat(headerData.amount_php) || 0,
        payment_date: headerData.is_paid ? (headerData.payment_date || new Date().toISOString().split('T')[0]) : null
      };
      let shipmentId = editingId;
      if (editingId) {
        await supabase.from('shipment_headers_20240218').update(headerPayload).eq('id', editingId);
        await supabase.from('shipment_units_20240218').delete().eq('shipment_id', editingId);
      } else {
        const { data } = await supabase.from('shipment_headers_20240218').insert([headerPayload]).select();
        shipmentId = data[0].id;
      }
      const unitsPayload = units.map(u => ({
        shipment_id: shipmentId,
        chassis_no: u.chassis_no.toUpperCase(),
        description: u.description.toUpperCase(),
        duties_taxes: parseFloat(u.duties_taxes) || 0
      }));
      await supabase.from('shipment_units_20240218').insert(unitsPayload);
      setShowModal(false);
      resetForm();
      fetchShipments();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setHeaderData({ soa_date: new Date().toISOString().split('T')[0], bl_no: '', vessel_name: '', voyage_no: '', kgs: '', cbm: '', amount_php: '', is_paid: false, payment_date: '' });
    setUnits([{ chassis_no: '', description: '', duties_taxes: '' }]);
  };

  const formatPHP = (val) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val || 0);

  const filteredShipments = shipments.filter(s => 
    s.bl_no.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.vessel_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 uppercase tracking-tighter">
            <div className="bg-indigo-600 p-2 rounded-2xl text-white shadow-lg shadow-indigo-100"><SafeIcon icon={FiAnchor} /></div>
            Shipment Manifest
          </h2>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <input 
            type="text" placeholder="Search B/L, Vessel..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
            className="w-full md:w-80 pl-6 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none" 
          />
          <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">New Shipment</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="p-20 text-center text-gray-400 font-black uppercase tracking-widest text-[10px]">Loading Manifests...</div>
        ) : filteredShipments.map((shipment) => (
          <div key={shipment.id} className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden hover:border-indigo-200 transition-all group">
            <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between gap-6 bg-gray-50/30">
              <div className="flex flex-wrap gap-8">
                <HeaderStat label="SOA DATE" val={shipment.soa_date} icon={FiCalendar} />
                <HeaderStat label="B/L NO" val={shipment.bl_no} icon={FiLayers} />
                <HeaderStat label="TOTAL PHP" val={formatPHP(shipment.amount_php)} icon={FiDollarSign} className="text-indigo-600" />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <button onClick={() => { setEditingId(shipment.id); setHeaderData({ ...shipment }); setUnits(shipment.shipment_units_20240218); setShowModal(true); }} className="p-3 bg-white text-gray-400 rounded-xl border border-gray-100 hover:text-indigo-600 transition-all"><SafeIcon icon={FiEdit} /></button>
                  <button onClick={() => handleDelete(shipment.id)} className="p-3 bg-white text-red-300 rounded-xl border border-gray-100 hover:text-red-600 transition-all"><SafeIcon icon={FiTrash2} /></button>
                </div>
              </div>
            </div>
            {/* Table detail logic remains same... */}
          </div>
        ))}
      </div>

      {/* Modal logic remains same... */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in duration-200 max-h-[90vh] flex flex-col p-10">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-2xl font-black uppercase">{editingId ? 'Edit' : 'New'} Shipment</h3>
               <button onClick={() => setShowModal(false)} className="p-2 bg-gray-100 rounded-full"><SafeIcon icon={FiX} /></button>
             </div>
             <form onSubmit={handleSave} className="space-y-6 overflow-y-auto pr-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputBox label="B/L No" value={headerData.bl_no} onChange={e => setHeaderData({...headerData, bl_no: e.target.value.toUpperCase()})} />
                  <InputBox label="Vessel" value={headerData.vessel_name} onChange={e => setHeaderData({...headerData, vessel_name: e.target.value.toUpperCase()})} />
                </div>
                <button type="submit" disabled={isSaving} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest">{isSaving ? 'Processing...' : 'Save Record'}</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

const HeaderStat = ({ label, val, icon, className = "" }) => (
  <div className="flex flex-col">
    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><SafeIcon icon={icon} /> {label}</span>
    <span className={`text-[11px] font-black uppercase ${className || 'text-gray-900'}`}>{val}</span>
  </div>
);

const InputBox = ({ label, ...props }) => (
  <div>
    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block ml-1">{label}</label>
    <input {...props} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none" />
  </div>
);

export default ShipmentModule;