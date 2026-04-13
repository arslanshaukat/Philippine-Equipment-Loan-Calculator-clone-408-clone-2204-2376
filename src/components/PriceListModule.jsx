import React, { useState, useEffect } from 'react';
import { 
  FiTag, FiPlus, FiSearch, FiEdit, FiTrash2, FiSave, 
  FiX, FiPrinter
} from 'react-icons/fi';
import { supabase } from '../supabase/supabase';
import SafeIcon from '../common/SafeIcon';

const PriceListModule = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    key_no: '',
    type: '',
    make: '',
    model_engine: '',
    colour: '',
    body: '',
    price: '',
    sale_price: '',
    remarks: ''
  });

  const fetchPriceList = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('price_list_2024').select('*');
      if (error) throw error;
      if (data) {
        // Natural Numeric Sort for Key No (1, 2, 10 instead of 1, 10, 2)
        const sortedData = [...data].sort((a, b) => {
          const aNum = parseInt(a.key_no.replace(/\D/g, '')) || 0;
          const bNum = parseInt(b.key_no.replace(/\D/g, '')) || 0;
          return aNum - bNum;
        });
        setItems(sortedData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriceList();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        sale_price: formData.sale_price === '' ? 0 : parseFloat(formData.sale_price)
      };

      if (editingId) {
        const { error } = await supabase.from('price_list_2024').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('price_list_2024').insert([payload]);
        if (error) throw error;
      }

      setShowModal(false);
      resetForm();
      fetchPriceList();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      key_no: item.key_no,
      type: item.type,
      make: item.make,
      model_engine: item.model_engine,
      colour: item.colour,
      body: item.body,
      price: item.price.toString(),
      sale_price: item.sale_price > 0 ? item.sale_price.toString() : '',
      remarks: item.remarks || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const password = prompt("⚠️ SECURITY CLEARANCE REQUIRED\nEnter Admin Password to delete:");
    if (password === 'Subic@123') {
      try {
        const { error } = await supabase.from('price_list_2024').delete().eq('id', id);
        if (error) throw error;
        fetchPriceList();
      } catch (err) {
        alert(err.message);
      }
    } else if (password !== null) {
      alert("❌ INCORRECT PASSWORD");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      key_no: '', type: '', make: '', model_engine: '',
      colour: '', body: '', price: '', sale_price: '', remarks: ''
    });
  };

  const filteredItems = items.filter(item => 
    Object.values(item).some(val => val?.toString().toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatPHP = (val) => {
    if (!val || val <= 0) return "-";
    return new Intl.NumberFormat('en-PH', {
      style: 'currency', currency: 'PHP', minimumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-4 print:space-y-0 print:p-0">
      {/* UI HEADER - Hidden on Print */}
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2 uppercase tracking-tighter">
            <SafeIcon icon={FiTag} className="text-orange-600" /> Inventory Price List
          </h2>
          {/* Sorting label removed as requested */}
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <SafeIcon icon={FiSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" placeholder="Search..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <button onClick={() => window.print()} className="p-3 bg-white text-gray-600 border border-gray-100 rounded-xl hover:text-orange-600 transition-all"><SafeIcon icon={FiPrinter} /></button>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-orange-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 flex items-center gap-2 underline-offset-4"><SafeIcon icon={FiPlus} /> Add</button>
        </div>
      </div>

      {/* PRINT HEADER - Optimized for A4 */}
      <div className="hidden print:block text-center border-b-2 border-black pb-4 mb-4">
        <h1 className="text-2xl font-black text-black uppercase">GT INTERNATIONAL INC.</h1>
        <div className="flex justify-between items-center mt-1">
          <span className="text-[9px] font-black uppercase">Official Inventory Pricing</span>
          <span className="text-[9px] font-black uppercase">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {/* TABLE SECTION - Compact Styles */}
      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden print:border-none print:shadow-none print:rounded-none">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 print:bg-gray-100 text-[9px] font-black text-gray-500 print:text-black uppercase tracking-wider border-b border-gray-100 print:border-black">
            <tr>
              <th className="px-4 py-3 print:px-2 print:py-1.5 w-12 text-center">Key</th>
              <th className="px-4 py-3 print:px-2 print:py-1.5">Unit Description</th>
              <th className="px-4 py-3 print:px-2 print:py-1.5">Specifications</th>
              <th className="px-4 py-3 print:px-2 print:py-1.5">Price</th>
              <th className="px-4 py-3 print:px-2 print:py-1.5">Sale</th>
              <th className="px-4 py-3 print:px-2 print:py-1.5">Remarks</th>
              <th className="px-4 py-3 print:hidden text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 print:divide-black/10">
            {filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-orange-50/30 transition-all group print:break-inside-avoid">
                <td className="px-4 py-3 print:px-2 print:py-1 font-black text-[11px] text-gray-900 text-center">{item.key_no}</td>
                <td className="px-4 py-3 print:px-2 print:py-1">
                  <div className="text-[10px] font-black text-gray-900 uppercase">{item.make}</div>
                  <div className="text-[8px] font-bold text-orange-600 uppercase print:text-black mt-0.5">{item.type}</div>
                </td>
                <td className="px-4 py-3 print:px-2 print:py-1">
                  <div className="text-[10px] font-bold text-gray-800 uppercase leading-none">{item.model_engine}</div>
                  <div className="text-[8px] text-gray-400 uppercase mt-1 print:text-gray-600">{item.colour} • {item.body}</div>
                </td>
                <td className="px-4 py-3 print:px-2 print:py-1 text-[10px] font-black text-gray-900 whitespace-nowrap">{formatPHP(item.price)}</td>
                <td className="px-4 py-3 print:px-2 print:py-1 whitespace-nowrap">
                  <span className={`text-[10px] font-black ${item.sale_price > 0 ? 'text-green-600 print:text-black print:underline' : 'text-gray-300'}`}>
                    {formatPHP(item.sale_price)}
                  </span>
                </td>
                <td className="px-4 py-3 print:px-2 print:py-1 text-[8px] font-medium text-gray-500 print:text-black leading-tight max-w-[140px]">
                  {item.remarks || '--'}
                </td>
                <td className="px-4 py-3 text-right print:hidden">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-orange-600"><SafeIcon icon={FiEdit} /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-300 hover:text-red-600"><SafeIcon icon={FiTrash2} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER - Only visible on print */}
      <div className="hidden print:flex justify-between items-center mt-4 pt-4 border-t border-black/10 text-[8px] font-bold uppercase text-gray-400">
        <span>GT Admin Portal | Confidential Pricing Document</span>
        <span>Page 1 of 1</span>
      </div>

      {/* FORM MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-orange-600 p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-tight">{editingId ? 'Edit Item' : 'Add to Inventory'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full"><SafeIcon icon={FiX} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 grid grid-cols-1 md:grid-cols-4 gap-4">
              <InputBox label="Key No." value={formData.key_no} onChange={e => setFormData({...formData, key_no: e.target.value.toUpperCase()})} required />
              <InputBox label="Make (Brand)" value={formData.make} onChange={e => setFormData({...formData, make: e.target.value.toUpperCase()})} required />
              <InputBox label="Type (Unit Type)" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value.toUpperCase()})} required />
              <InputBox label="Model/Eng" value={formData.model_engine} onChange={e => setFormData({...formData, model_engine: e.target.value.toUpperCase()})} required />
              <InputBox label="Colour" value={formData.colour} onChange={e => setFormData({...formData, colour: e.target.value.toUpperCase()})} />
              <InputBox label="Body" value={formData.body} onChange={e => setFormData({...formData, body: e.target.value.toUpperCase()})} />
              <InputBox label="Price" type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
              <InputBox label="Sale Price" type="number" value={formData.sale_price} onChange={e => setFormData({...formData, sale_price: e.target.value})} />
              <div className="md:col-span-4">
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Remarks</label>
                <textarea value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value.toUpperCase()})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none" rows={2} />
              </div>
              <button type="submit" disabled={isSaving} className="md:col-span-4 py-4 bg-orange-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-orange-700 transition-all">
                {isSaving ? 'Saving...' : 'Save Record'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page { size: portrait; margin: 8mm; }
          body { background: white !important; font-family: sans-serif; }
          .admin-sidebar, .mobile-nav, nav, header, .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
          table { width: 100% !important; border-collapse: collapse !important; table-layout: fixed; }
          th, td { border: 0.1pt solid #eee !important; word-wrap: break-word; }
        }
      `}</style>
    </div>
  );
};

const InputBox = ({ label, ...props }) => (
  <div>
    <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block ml-1">{label}</label>
    <input {...props} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100" />
  </div>
);

export default PriceListModule;