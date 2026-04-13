import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabase';
import { FiSearch, FiEdit, FiTrash2, FiPlus, FiEye, FiDownload, FiCheckCircle, FiClipboard, FiFileText } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const QuotationRegistry = ({ onCreate, onEdit }) => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRegistry = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('formal_quotations_2024').select('*').order('date', { ascending: false });
      if (data) setQuotes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistry();
  }, []);

  const handleDelete = async (id) => {
    const password = prompt("⚠️ SECURITY CLEARANCE REQUIRED\nEnter Admin Password to delete:");
    if (password === 'Subic@123') {
      try {
        const { error } = await supabase.from('formal_quotations_2024').delete().eq('id', id);
        if (error) throw error;
        fetchRegistry();
      } catch (err) {
        alert(err.message);
      }
    } else if (password !== null) {
      alert("❌ INCORRECT PASSWORD");
    }
  };

  const filteredQuotes = quotes.filter(q => 
    (q.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (q.maker || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-6">
        <div className="relative flex-1">
          <SafeIcon icon={FiSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search customer or unit..." 
            className="w-full pl-11 pr-4 py-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-orange-100 shadow-sm font-medium transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <DocTypeBtn onClick={() => onCreate('quotation')} icon={FiFileText} label="New Quote" color="orange" />
          <DocTypeBtn onClick={() => onCreate('payment')} icon={FiCheckCircle} label="Full Payment Receipt" color="blue" />
          <DocTypeBtn onClick={() => onCreate('delivery')} icon={FiClipboard} label="Delivery Receipt" color="emerald" />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <tr>
              <th className="px-6 py-5">Date</th>
              <th className="px-6 py-5">Customer</th>
              <th className="px-6 py-5">Unit Detail</th>
              <th className="px-6 py-5">Pricing</th>
              <th className="px-6 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredQuotes.map((quote) => (
              <tr key={quote.id} className="hover:bg-gray-50/80 transition-colors group">
                <td className="px-6 py-5 text-sm font-bold text-gray-500">{new Date(quote.date).toLocaleDateString()}</td>
                <td className="px-6 py-5">
                  <div className="font-black text-gray-900 uppercase">{quote.customer_name}</div>
                  <div className="text-[10px] text-gray-400">{quote.address.substr(0, 30)}...</div>
                </td>
                <td className="px-6 py-5">
                  <div className="text-sm font-black text-gray-700">{quote.maker}</div>
                  <div className="text-xs text-gray-500">{quote.body_type}</div>
                </td>
                <td className="px-6 py-5">
                  <div className="text-sm font-black text-gray-900">₱{new Intl.NumberFormat().format(quote.price)}</div>
                  {quote.down_payment > 0 && (
                    <div className="text-[10px] text-blue-600 font-bold">Paid: ₱{new Intl.NumberFormat().format(quote.down_payment)}</div>
                  )}
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end gap-2">
                    <ActionBtn onClick={() => onEdit(quote, 'quotation')} icon={FiFileText} title="Quotation" color="orange" />
                    <ActionBtn onClick={() => onEdit(quote, 'payment')} icon={FiCheckCircle} title="Payment" color="blue" />
                    <ActionBtn onClick={() => onEdit(quote, 'delivery')} icon={FiClipboard} title="Delivery" color="emerald" />
                    <ActionBtn onClick={() => handleDelete(quote.id)} icon={FiTrash2} color="red" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DocTypeBtn = ({ onClick, icon, label, color }) => {
  const variants = {
    orange: 'bg-orange-600 hover:bg-orange-700 shadow-orange-100',
    blue: 'bg-blue-600 hover:bg-blue-700 shadow-blue-100',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
  };
  return (
    <button onClick={onClick} className={`${variants[color]} text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg`}>
      <SafeIcon icon={icon} /> {label}
    </button>
  );
};

const ActionBtn = ({ onClick, icon, color, title }) => {
  const variants = {
    orange: 'text-orange-600 hover:bg-orange-50',
    blue: 'text-blue-600 hover:bg-blue-50',
    emerald: 'text-emerald-600 hover:bg-emerald-50',
    red: 'text-red-500 hover:bg-red-50'
  };
  return (
    <button onClick={onClick} title={title} className={`p-2.5 rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:scale-110 ${variants[color]}`}>
      <SafeIcon icon={icon} />
    </button>
  );
};

export default QuotationRegistry;