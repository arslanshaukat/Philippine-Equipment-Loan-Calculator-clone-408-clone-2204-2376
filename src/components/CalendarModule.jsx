import React, { useState, useEffect } from 'react';
import { 
  FiCalendar, FiPlus, FiUser, FiTruck, FiTag, FiX, FiSave, FiActivity, 
  FiRefreshCw, FiSearch, FiGrid, FiMenu, FiClock, FiEdit, FiTrash2, 
  FiCamera, FiFilter, FiUserCheck, FiExternalLink, FiImage, 
  FiChevronRight, FiChevronLeft, FiCpu, FiArchive, FiPhone, FiInfo,
  FiDollarSign
} from 'react-icons/fi';
import { supabase } from '../supabase/supabase';
import SafeIcon from '../common/SafeIcon';

const CalendarModule = () => {
  // Set default view to 'list'
  const [viewMode, setViewMode] = useState('list');
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  
  const staffMembers = ["RHEA", "MEL", "CARMELITA", "ARSLAN"];
  
  const [formData, setFormData] = useState({
    client_name: '',
    contact_number: '',
    address: '',
    make: '',
    model: '',
    body_type: '',
    unit_engine: '',
    offered_price: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    status: 'Pending',
    description: '',
    attachment_urls: [],
    logged_by: 'RHEA'
  });

  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('visit_schedules_2024')
        .select('*')
        .order('scheduled_date', { ascending: false });
      if (error) throw error;
      setSchedules(data || []);
    } catch (e) {
      console.error("CRM Sync Error:", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    const password = prompt("⚠️ SECURITY CLEARANCE REQUIRED\nEnter Admin Password to delete:");
    if (password === 'Subic@123') {
      try {
        const { error } = await supabase.from('visit_schedules_2024').delete().eq('id', id);
        if (error) throw error;
        fetchData();
        setSelectedDetail(null);
      } catch (err) {
        alert(err.message);
      }
    } else if (password !== null) {
      alert("❌ INCORRECT PASSWORD");
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const newUrls = [];
      for (const file of files) {
        const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
        const filePath = `crm_attachments/${fileName}`;
        const { error } = await supabase.storage.from('attachments').upload(filePath, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);
        newUrls.push(publicUrl);
      }
      setFormData(prev => ({ ...prev, attachment_urls: [...(prev.attachment_urls || []), ...newUrls] }));
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveLead = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        make: (formData.make || '').toUpperCase(),
        model: (formData.model || '').toUpperCase(),
        body_type: (formData.body_type || '').toUpperCase(),
        client_name: (formData.client_name || '').toUpperCase(),
        unit_engine: (formData.unit_engine || '').toUpperCase(),
        offered_price: parseFloat(formData.offered_price) || 0,
        unit_name: `${formData.make} ${formData.model}`.toUpperCase()
      };
      if (selectedLead?.id) {
        await supabase.from('visit_schedules_2024').update(payload).eq('id', selectedLead.id);
      } else {
        await supabase.from('visit_schedules_2024').insert([payload]);
      }
      setShowForm(false);
      fetchData();
    } catch (err) {
      alert("Save Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredLeads = schedules.filter(lead => {
    const matchesSearch = 
      lead.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      lead.make?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      lead.unit_engine?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = filterDate ? lead.scheduled_date === filterDate : true;
    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      {/* CRM HEADER */}
      <div className="bg-white p-5 lg:p-8 rounded-[32px] shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
          <div>
            <h2 className="text-xl lg:text-2xl font-black text-gray-900 flex items-center gap-3 uppercase tracking-tighter">
              <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-100">
                <SafeIcon icon={FiActivity} />
              </div> 
              CRM Hub
            </h2>
            <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1.5 ml-1">
              Command Center Registry v2.6
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={fetchData} className="p-3.5 bg-gray-50 text-gray-400 rounded-xl hover:text-blue-600 border border-gray-100 transition-all flex-1 md:flex-none">
              <SafeIcon icon={FiRefreshCw} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={() => {
                setSelectedLead(null);
                setFormData({ client_name: '', contact_number: '', address: '', make: '', model: '', body_type: '', unit_engine: '', offered_price: '', scheduled_date: new Date().toISOString().split('T')[0], status: 'Pending', description: '', attachment_urls: [], logged_by: 'RHEA' });
                setShowForm(true);
              }}
              className="bg-blue-700 text-white px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-800 shadow-xl shadow-blue-100 transition-all flex-[3] md:flex-none"
            >
              <SafeIcon icon={FiPlus} /> New Record
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-gray-50 p-2 rounded-[24px]">
          <div className="relative flex-1 w-full">
            <SafeIcon icon={FiSearch} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search Company, Maker, Engine #..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-[18px] text-[11px] font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all" 
            />
          </div>
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 md:w-48">
              <SafeIcon icon={FiFilter} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <input 
                type="date" 
                value={filterDate} 
                onChange={(e) => setFilterDate(e.target.value)} 
                className="w-full pl-10 pr-3 py-3.5 bg-white border border-gray-200 rounded-[18px] text-[10px] font-black uppercase outline-none focus:ring-4 focus:ring-blue-100" 
              />
            </div>
            <div className="flex items-center gap-1 bg-gray-200/50 p-1 rounded-[18px]">
              <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}><SafeIcon icon={FiGrid} /></button>
              <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}><SafeIcon icon={FiMenu} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* DATA DISPLAY */}
      <div className="space-y-6">
        {loading ? (
          <div className="p-20 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest bg-white rounded-[32px]">Accessing Database...</div>
        ) : filteredLeads.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLeads.map(item => (
                <InquiryCard 
                  key={item.id} 
                  item={item} 
                  onView={() => setSelectedDetail(item)}
                  onEdit={(e) => { e.stopPropagation(); setSelectedLead(item); setFormData({ ...item, attachment_urls: item.attachment_urls || [] }); setShowForm(true); }} 
                  onDelete={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
              <table className="w-full text-left min-w-[1000px]">
                <thead className="bg-gray-50 border-b text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4 w-16">Unit</th>
                    <th className="px-6 py-4">Date Entered</th>
                    <th className="px-6 py-4">Company / Agent</th>
                    <th className="px-6 py-4">Make & Model</th>
                    <th className="px-6 py-4">Body & Engine</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredLeads.map(item => (
                    <InquiryRow 
                      key={item.id} 
                      item={item} 
                      onView={() => setSelectedDetail(item)}
                      onEdit={(e) => { e.stopPropagation(); setSelectedLead(item); setFormData({ ...item, attachment_urls: item.attachment_urls || [] }); setShowForm(true); }} 
                      onDelete={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="p-24 text-center text-gray-200 font-black uppercase text-[10px] bg-white rounded-[32px] border-2 border-dashed border-gray-100">No matching records</div>
        )}
      </div>

      {/* DETAIL VIEW MODAL */}
      {selectedDetail && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[80] flex items-center justify-center p-0 lg:p-4">
          <div className="bg-white w-full max-w-5xl lg:rounded-[48px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500 flex flex-col h-full lg:h-auto max-h-screen lg:max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-6 lg:p-10 flex justify-between items-start border-b border-gray-100">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl shadow-sm">
                  <SafeIcon icon={FiUserCheck} />
                </div>
                <div>
                  <h3 className="text-xl lg:text-3xl font-black uppercase tracking-tight text-gray-900 leading-none mb-2">
                    {selectedDetail.client_name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg uppercase tracking-widest">Agent ID: {selectedDetail.logged_by}</span>
                    <span className="text-[10px] font-black text-gray-400 flex items-center gap-1.5 uppercase tracking-widest leading-none">
                      <SafeIcon icon={FiCalendar} /> {selectedDetail.scheduled_date}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDetail(null)}
                className="p-3 bg-gray-50 text-gray-400 rounded-full hover:bg-red-50 hover:text-red-500 transition-all shrink-0"
              >
                <SafeIcon icon={FiX} className="text-xl" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-10 no-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Left: Specs & Details */}
                <div className="space-y-10">
                  <section>
                    <DetailSectionLabel icon={FiTruck} text="Unit Performance Specs" />
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <SpecBox label="Make / Brand" val={selectedDetail.make} icon={FiTag} />
                      <SpecBox label="Model Code" val={selectedDetail.model} icon={FiArchive} />
                      <SpecBox label="Body Type" val={selectedDetail.body_type || 'STANDARD'} icon={FiArchive} />
                      <SpecBox label="Engine #" val={selectedDetail.unit_engine || 'N/A'} icon={FiCpu} />
                    </div>
                  </section>

                  <section>
                    <DetailSectionLabel icon={FiPhone} text="Contact Information" />
                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mt-6 space-y-4">
                      <div className="flex justify-between items-center group">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Line</span>
                        <span className="text-[14px] font-black text-blue-700 tracking-tight">{selectedDetail.contact_number}</span>
                      </div>
                      <div className="pt-4 border-t border-gray-200/50">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Location Address</span>
                        <span className="text-[11px] font-bold text-gray-700 uppercase leading-relaxed block">{selectedDetail.address || 'NO ADDRESS SPECIFIED'}</span>
                      </div>
                    </div>
                  </section>

                  <div className="bg-indigo-600 p-8 rounded-[32px] shadow-xl shadow-indigo-100 flex justify-between items-center text-white">
                    <div>
                      <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] mb-1">Market Evaluation Price</p>
                      <p className="text-3xl font-black">₱{new Intl.NumberFormat().format(selectedDetail.offered_price || 0)}</p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                      <SafeIcon icon={FiDollarSign} className="text-3xl" />
                    </div>
                  </div>
                </div>

                {/* Right: Vision Gallery */}
                <div className="space-y-6">
                  <DetailSectionLabel icon={FiCamera} text="Unit Visual Documentation" />
                  <div className="grid grid-cols-1 gap-4 mt-6">
                    {selectedDetail.attachment_urls && selectedDetail.attachment_urls.length > 0 ? (
                      selectedDetail.attachment_urls.map((url, idx) => (
                        <div key={idx} className="group relative rounded-3xl overflow-hidden border-2 border-gray-100 shadow-sm transition-all hover:border-blue-200">
                          <img src={url} className="w-full h-64 object-cover transition-transform duration-700 group-hover:scale-105" alt={`unit-${idx}`} />
                          <a 
                            href={url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="absolute bottom-4 right-4 p-3 bg-white/90 backdrop-blur-md text-blue-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110"
                          >
                            <SafeIcon icon={FiExternalLink} />
                          </a>
                        </div>
                      ))
                    ) : (
                      <div className="h-64 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 gap-3">
                        <SafeIcon icon={FiImage} className="text-5xl" />
                        <span className="text-[10px] font-black uppercase tracking-widest">No Visuals Attached</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-6 lg:p-10 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => { setSelectedLead(selectedDetail); setFormData({ ...selectedDetail, attachment_urls: selectedDetail.attachment_urls || [] }); setShowForm(true); setSelectedDetail(null); }}
                className="flex-1 py-4 bg-white text-blue-600 border-2 border-blue-100 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 hover:bg-blue-50 transition-all"
              >
                <SafeIcon icon={FiEdit} /> Update Lead Profile
              </button>
              <button 
                onClick={() => handleDelete(selectedDetail.id)}
                className="flex-1 py-4 bg-white text-red-400 border-2 border-red-50 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-500 transition-all"
              >
                <SafeIcon icon={FiTrash2} /> Terminate Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[90] flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[95vh]">
            <div className="bg-blue-700 p-6 text-white flex justify-between items-center shrink-0">
              <h3 className="text-sm lg:text-xl font-black uppercase tracking-tight flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-lg"><SafeIcon icon={selectedLead ? FiEdit : FiPlus} /></div>
                {selectedLead ? 'Update CRM Entry' : 'Manual Entry Register'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"><SafeIcon icon={FiX} /></button>
            </div>
            <form onSubmit={handleSaveLead} className="p-6 lg:p-10 flex-1 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <SectionLabel icon={FiUserCheck} text="Agent Identification" />
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-2 ml-1">Processed By</label>
                    <select value={formData.logged_by} onChange={e => setFormData({ ...formData, logged_by: e.target.value })} className="w-full px-5 py-4 bg-blue-50 border-2 border-blue-100 rounded-2xl text-[11px] font-black uppercase outline-none focus:ring-4 focus:ring-blue-100 text-blue-700">
                      {staffMembers.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </div>
                  <FormInput label="Agent / Company Name" value={formData.client_name} onChange={e => setFormData({ ...formData, client_name: e.target.value })} required />
                  <FormInput label="Contact Number" value={formData.contact_number} onChange={e => setFormData({ ...formData, contact_number: e.target.value })} required />
                  <FormInput label="Entry Date" type="date" value={formData.scheduled_date} onChange={e => setFormData({ ...formData, scheduled_date: e.target.value })} required />
                </div>
                <div className="space-y-6">
                  <SectionLabel icon={FiTruck} text="Technical Specifications" />
                  <div className="grid grid-cols-2 gap-4">
                    <FormInput label="Make (Brand)" value={formData.make} onChange={e => setFormData({ ...formData, make: e.target.value })} required />
                    <FormInput label="Model Code" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormInput label="Body Type" placeholder="E.G. DUMP/WINGVAN" value={formData.body_type} onChange={e => setFormData({ ...formData, body_type: e.target.value })} />
                    <FormInput label="Engine #" placeholder="E.G. 6WG1-..." value={formData.unit_engine} onChange={e => setFormData({ ...formData, unit_engine: e.target.value })} />
                  </div>
                  <FormInput label="Offered Price (PHP)" type="number" value={formData.offered_price} onChange={e => setFormData({ ...formData, offered_price: e.target.value })} required />
                  
                  <div className="pt-2">
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-3 ml-1">Unit Visuals (Max 5)</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(formData.attachment_urls || []).map((url, idx) => (
                        <div key={idx} className="relative group aspect-square">
                          <img src={url} className="w-full h-full rounded-2xl object-cover border-2 border-blue-100 shadow-sm" alt="unit" />
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, attachment_urls: prev.attachment_urls.filter((_, i) => i !== idx) }))} className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-all">
                            <SafeIcon icon={FiX} className="text-xs" />
                          </button>
                        </div>
                      ))}
                      {(!formData.attachment_urls || formData.attachment_urls.length < 5) && (
                        <label className="aspect-square flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all">
                          <SafeIcon icon={uploading ? FiRefreshCw : FiCamera} className={`text-2xl mb-1 ${uploading ? 'animate-spin text-blue-600' : 'text-gray-400'}`} />
                          <span className="text-[8px] font-black text-gray-400 uppercase">Upload</span>
                          <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-12 flex justify-center pt-8 border-t border-gray-100">
                <button type="submit" disabled={isSaving || uploading} className="w-full lg:w-72 py-5 bg-blue-700 text-white rounded-[24px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-blue-800 transition-all text-[11px]">
                  {isSaving ? 'Synchronizing...' : 'Commit to Registry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* COMPACT LIST ROW */
const InquiryRow = ({ item, onView, onEdit, onDelete }) => {
  const images = item.attachment_urls || (item.attachment_url ? [item.attachment_url] : []);
  return (
    <tr onClick={onView} className="hover:bg-blue-50 transition-all group cursor-pointer">
      <td className="px-6 py-4">
        {images.length > 0 ? (
          <div className="relative w-14 h-14">
            <img src={images[0]} className="w-full h-full rounded-xl object-cover border border-gray-200 shadow-sm" alt="thumb" />
            {images.length > 1 && <span className="absolute -bottom-1.5 -right-1.5 bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-lg border-2 border-white">+{images.length - 1}</span>}
          </div>
        ) : (
          <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-gray-300 border border-dashed border-gray-200"><SafeIcon icon={FiImage} className="text-xl" /></div>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="text-[10px] font-black text-gray-800 uppercase flex items-center gap-1.5"><SafeIcon icon={FiCalendar} className="text-blue-500" /> {item.scheduled_date}</div>
      </td>
      <td className="px-6 py-4">
        <div className="text-[11px] font-black text-gray-900 uppercase truncate max-w-[200px]">{item.client_name}</div>
        <div className="text-[9px] text-indigo-600 font-bold uppercase tracking-widest">{item.contact_number}</div>
      </td>
      <td className="px-6 py-4">
        <div className="text-[11px] font-black text-gray-900 uppercase">{item.make} {item.model}</div>
        <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest">STAFF: {item.logged_by}</div>
      </td>
      <td className="px-6 py-4">
        <div className="text-[9px] font-black text-gray-700 uppercase">{item.body_type || 'STANDARD'}</div>
        <div className="text-[9px] font-bold text-orange-600 uppercase">ENG: {item.unit_engine || 'N/A'}</div>
      </td>
      <td className="px-6 py-4 font-black text-[12px] text-blue-700">₱{new Intl.NumberFormat().format(item.offered_price || 0)}</td>
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
          <button onClick={onEdit} className="p-2.5 bg-white text-gray-400 rounded-xl border border-gray-100 hover:text-blue-600 shadow-sm transition-all"><SafeIcon icon={FiEdit} /></button>
          <button onClick={onDelete} className="p-2.5 bg-white text-red-300 rounded-xl border border-gray-100 hover:text-red-500 shadow-sm transition-all"><SafeIcon icon={FiTrash2} /></button>
        </div>
      </td>
    </tr>
  );
};

/* GRID CARD */
const InquiryCard = ({ item, onView, onEdit, onDelete }) => {
  const images = item.attachment_urls || (item.attachment_url ? [item.attachment_url] : []);

  return (
    <div onClick={onView} className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden hover:shadow-2xl hover:border-blue-100 transition-all group cursor-pointer">
      {images.length > 0 ? (
        <div className="h-48 w-full relative overflow-hidden bg-gray-100">
          <img src={images[0]} className="w-full h-full object-cover" alt="unit" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[8px] font-black text-white uppercase border border-white/20 tracking-widest">{images.length} Photos</span>
            <span className="px-2.5 py-1 bg-indigo-600 rounded-lg text-[8px] font-black text-white uppercase tracking-widest">By {item.logged_by}</span>
          </div>
          <div className="absolute bottom-4 left-4">
             <div className="text-[9px] font-black text-white/70 uppercase tracking-widest mb-1 flex items-center gap-1.5"><SafeIcon icon={FiCalendar} /> {item.scheduled_date}</div>
             <h4 className="font-black text-white uppercase text-[14px] leading-none mb-1">{item.client_name}</h4>
          </div>
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all">
            <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl text-white border border-white/10"><SafeIcon icon={FiInfo} /></div>
          </div>
        </div>
      ) : (
        <div className="h-48 w-full bg-gray-50 flex flex-col items-center justify-center text-gray-200 gap-2 border-b group-hover:bg-blue-50 transition-colors">
          <SafeIcon icon={FiImage} className="text-4xl" />
          <span className="text-[8px] font-black uppercase text-gray-400">{item.scheduled_date}</span>
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all">
            <div className="bg-blue-600/10 p-2 rounded-xl text-blue-600 border border-blue-100"><SafeIcon icon={FiInfo} /></div>
          </div>
        </div>
      )}
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="min-w-0">
            {!images.length && (
              <h4 className="font-black text-gray-900 uppercase text-[13px] mb-1 truncate">{item.client_name}</h4>
            )}
            <p className="text-[10px] text-blue-600 font-black tracking-widest uppercase truncate">{item.contact_number}</p>
          </div>
          <div className="flex gap-1.5 ml-auto">
            <button onClick={onEdit} className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:text-blue-600 transition-all shadow-sm"><SafeIcon icon={FiEdit} /></button>
            <button onClick={onDelete} className="p-2.5 bg-gray-50 text-red-300 rounded-xl hover:text-red-500 transition-all shadow-sm"><SafeIcon icon={FiTrash2} /></button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-6">
          <DetailMini icon={FiTruck} label="Brand" val={item.make} />
          <DetailMini icon={FiArchive} label="Body" val={item.body_type || 'STD'} />
          <DetailMini icon={FiArchive} label="Model" val={item.model} />
          <DetailMini icon={FiCpu} label="Engine #" val={item.unit_engine || 'STD'} />
        </div>

        <div className="bg-blue-600 p-4 rounded-2xl flex justify-between items-center shadow-lg shadow-blue-100">
          <div>
            <p className="text-[8px] font-black text-white/50 uppercase tracking-widest">Inquiry Price</p>
            <p className="text-[14px] font-black text-white">₱{new Intl.NumberFormat().format(item.offered_price || 0)}</p>
          </div>
          <div className="p-2.5 bg-white/10 text-white rounded-xl backdrop-blur-md">
            <SafeIcon icon={FiExternalLink} />
          </div>
        </div>
      </div>
    </div>
  );
};

/* SHARED ATOMS */
const DetailMini = ({ icon, label, val }) => (
  <div className="flex items-center gap-2.5 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
    <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-blue-600 text-xs shadow-sm border border-gray-100"><SafeIcon icon={icon} /></div>
    <div className="min-w-0">
      <p className="text-[7px] font-black text-gray-400 uppercase leading-none mb-0.5">{label}</p>
      <p className="text-[9px] font-black text-gray-800 uppercase truncate">{val}</p>
    </div>
  </div>
);

const SpecBox = ({ label, val, icon }) => (
  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-3">
    <div className="bg-blue-50 p-2 rounded-lg text-blue-600 text-sm"><SafeIcon icon={icon} /></div>
    <div>
      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-[11px] font-black text-gray-900 uppercase leading-none">{val || '--'}</p>
    </div>
  </div>
);

const SectionLabel = ({ icon, text }) => (
  <div className="flex items-center gap-3 border-b border-gray-100 pb-3 mb-4">
    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg text-lg"><SafeIcon icon={icon} /></div>
    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-800">{text}</span>
  </div>
);

const DetailSectionLabel = ({ icon, text }) => (
  <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
    <SafeIcon icon={icon} className="text-xl text-blue-600" />
    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">{text}</span>
  </div>
);

const FormInput = ({ label, ...props }) => (
  <div>
    <label className="block text-[9px] font-black text-gray-400 uppercase mb-2 ml-1">{label}</label>
    <input {...props} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-bold outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white transition-all text-gray-800" />
  </div>
);

export default CalendarModule;