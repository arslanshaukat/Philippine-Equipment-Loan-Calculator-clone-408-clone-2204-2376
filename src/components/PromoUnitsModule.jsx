import React, { useState, useEffect, useMemo } from 'react';
import {
  FiTag, FiPlus, FiSearch, FiEdit, FiX, FiRefreshCw, FiCalendar, FiImage, FiTrash2, FiGrid, FiList
} from 'react-icons/fi';
import pb from '../supabase/supabase';
import SafeIcon from '../common/SafeIcon';

const emptyForm = {
  make: '', model: '', engine_no: '', chassis_no: '',
  campaign_price: '', actual_price: '', campaign_from: '', campaign_to: '',
};

const InputField = ({ label, value, onChange, type = 'text', required, placeholder }) => (
  <div className="space-y-1">
    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}{required && ' *'}</label>
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder || label}
      required={required}
      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-amber-100 uppercase"
    />
  </div>
);

function peso(n) {
  return '₱' + new Intl.NumberFormat().format(Number(n) || 0);
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getCampaignStatus(fromStr, toStr) {
  if (!fromStr || !toStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = new Date(fromStr);
  from.setHours(0, 0, 0, 0);
  const to = new Date(toStr);
  to.setHours(0, 0, 0, 0);
  if (today < from) return 'upcoming';
  if (today > to) return 'expired';
  return 'active';
}

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-700 border-green-200',
  expired: 'bg-gray-100 text-gray-500 border-gray-200',
  upcoming: 'bg-blue-100 text-blue-700 border-blue-200',
};

const StatusBadge = ({ status }) => {
  if (!status) return null;
  return (
    <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
};

export default function PromoUnitsModule() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('gt_promo_units_view') || 'grid');
  const [lightbox, setLightbox] = useState({ open: false, url: '', label: '' });
  const currentStaffName = (pb.authStore.model?.name || pb.authStore.model?.email || 'STAFF').toUpperCase();

  const changeViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('gt_promo_units_view', mode);
  };

  const openLightbox = (url, label) => setLightbox({ open: true, url, label });
  const closeLightbox = () => setLightbox({ open: false, url: '', label: '' });

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const records = await pb.collection('promo_units').getFullList({
        filter: 'active = true',
        sort: '-created',
      });
      setUnits(records);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUnits(); }, []);

  const filtered = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return units.filter(u =>
      u.make?.toLowerCase().includes(s) ||
      u.model?.toLowerCase().includes(s) ||
      u.engine_no?.toLowerCase().includes(s) ||
      u.chassis_no?.toLowerCase().includes(s)
    );
  }, [units, searchTerm]);

  const openAdd = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setImageFile(null);
    setImagePreview(null);
    setError('');
    setShowForm(true);
  };

  const openEdit = (unit) => {
    setFormData({
      make: unit.make || '', model: unit.model || '',
      engine_no: unit.engine_no || '', chassis_no: unit.chassis_no || '',
      campaign_price: unit.campaign_price ?? '', actual_price: unit.actual_price ?? '',
      campaign_from: unit.campaign_from ? unit.campaign_from.slice(0, 10) : '',
      campaign_to: unit.campaign_to ? unit.campaign_to.slice(0, 10) : '',
    });
    setEditingId(unit.id);
    setImageFile(null);
    setImagePreview(unit.image ? pb.getFileUrl(unit, unit.image, { thumb: '300x300' }) : null);
    setError('');
    setShowForm(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.make || !formData.model || !formData.campaign_price || !formData.actual_price || !formData.campaign_from || !formData.campaign_to) {
      setError('Please fill in all required fields.');
      return;
    }
    if (new Date(formData.campaign_to) < new Date(formData.campaign_from)) {
      setError('Campaign "To" date cannot be before "From" date.');
      return;
    }
    setIsSaving(true);
    try {
      const fd = new FormData();
      fd.append('make', formData.make.toUpperCase());
      fd.append('model', formData.model.toUpperCase());
      fd.append('engine_no', (formData.engine_no || '').toUpperCase());
      fd.append('chassis_no', (formData.chassis_no || '').toUpperCase());
      fd.append('campaign_price', parseFloat(formData.campaign_price) || 0);
      fd.append('actual_price', parseFloat(formData.actual_price) || 0);
      fd.append('campaign_from', formData.campaign_from);
      fd.append('campaign_to', formData.campaign_to);
      if (imageFile) fd.append('image', imageFile);

      if (editingId) {
        await pb.collection('promo_units').update(editingId, fd);
      } else {
        fd.append('active', 'true');
        fd.append('created_by', pb.authStore.model?.id || '');
        await pb.collection('promo_units').create(fd);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm);
      fetchUnits();
    } catch (e) {
      console.error(e);
      setError('Save failed: ' + (e.message || 'please check the fields.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (unit) => {
    if (!window.confirm(`Remove ${unit.make} ${unit.model}?`)) return;
    try {
      await pb.collection('promo_units').update(unit.id, { active: false });
      fetchUnits();
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="pb-20 xl:pb-0">
      {/* Header */}
      <div className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm mb-4">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
              <div className="bg-amber-500 p-2 rounded-xl text-white"><SafeIcon icon={FiTag} /></div>
              Promo Units
            </h2>
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">
              {units.filter(u => getCampaignStatus(u.campaign_from, u.campaign_to) === 'active').length} Active • {units.length} Total
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex bg-gray-50 rounded-xl border border-gray-100 p-1">
              <button onClick={() => changeViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-amber-500 text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                <SafeIcon icon={FiGrid} />
              </button>
              <button onClick={() => changeViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-amber-500 text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                <SafeIcon icon={FiList} />
              </button>
            </div>
            <button onClick={fetchUnits} className="p-3 bg-gray-50 text-gray-400 rounded-xl border border-gray-100 hover:text-amber-600 transition-all">
              <SafeIcon icon={FiRefreshCw} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={openAdd}
              className="px-4 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center gap-2">
              <SafeIcon icon={FiPlus} /> Add Unit
            </button>
          </div>
        </div>
        <div className="relative">
          <SafeIcon icon={FiSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search make, model, engine #, chassis #..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-amber-100" />
        </div>
      </div>

      {/* Grid / List */}
      {loading ? (
        <div className="bg-white rounded-[24px] p-12 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest border border-gray-100">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-[24px] p-12 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest border border-gray-100">No promo units found</div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(unit => {
            const fullImageUrl = unit.image ? pb.getFileUrl(unit, unit.image) : null;
            return (
              <div key={unit.id} className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg hover:border-amber-200 transition-all">
                <div
                  className={`relative aspect-video bg-gray-50 flex items-center justify-center overflow-hidden ${unit.image ? 'cursor-zoom-in' : ''}`}
                  onClick={() => unit.image && openLightbox(fullImageUrl, `${unit.make} ${unit.model}`)}
                >
                  <div className="absolute top-2 right-2 z-10">
                    <StatusBadge status={getCampaignStatus(unit.campaign_from, unit.campaign_to)} />
                  </div>
                  {unit.image ? (
                    <img src={pb.getFileUrl(unit, unit.image, { thumb: '300x300' })} alt={`${unit.make} ${unit.model}`} className="w-full h-full object-cover" />
                  ) : (
                    <SafeIcon icon={FiImage} className="text-gray-300 text-2xl" />
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <h4 className="font-black text-gray-900 uppercase text-sm">{unit.make} {unit.model}</h4>
                  <div className="text-[8px] font-bold text-gray-400 uppercase space-y-0.5">
                    {unit.engine_no && <div>Engine: {unit.engine_no}</div>}
                    {unit.chassis_no && <div>Chassis: {unit.chassis_no}</div>}
                    <div className="flex items-center gap-1"><SafeIcon icon={FiCalendar} />{fmtDate(unit.campaign_from)} – {fmtDate(unit.campaign_to)}</div>
                  </div>
                  <div className="flex justify-between items-end pt-2 border-t border-gray-50">
                    <div>
                      <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Campaign</p>
                      <p className="text-[11px] font-black text-amber-600">{peso(unit.campaign_price)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Actual</p>
                      <p className="text-[10px] font-bold text-gray-400 line-through">{peso(unit.actual_price)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => openEdit(unit)} className="flex-1 text-[9px] font-black uppercase bg-gray-50 hover:bg-gray-100 rounded-lg py-2 flex items-center justify-center gap-1 transition-all">
                      <SafeIcon icon={FiEdit} /> Edit
                    </button>
                    <button onClick={() => handleDelete(unit)} className="flex-1 text-[9px] font-black uppercase bg-gray-50 hover:bg-red-50 hover:text-red-500 rounded-lg py-2 flex items-center justify-center gap-1 transition-all">
                      <SafeIcon icon={FiTrash2} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(unit => {
            const fullImageUrl = unit.image ? pb.getFileUrl(unit, unit.image) : null;
            return (
              <div key={unit.id} className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-3 flex items-center gap-4 hover:border-amber-200 transition-all">
                <div
                  className={`w-20 h-20 shrink-0 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center ${unit.image ? 'cursor-zoom-in' : ''}`}
                  onClick={() => unit.image && openLightbox(fullImageUrl, `${unit.make} ${unit.model}`)}
                >
                  {unit.image ? (
                    <img src={pb.getFileUrl(unit, unit.image, { thumb: '100x100' })} alt={`${unit.make} ${unit.model}`} className="w-full h-full object-cover" />
                  ) : (
                    <SafeIcon icon={FiImage} className="text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-gray-900 uppercase text-sm truncate">{unit.make} {unit.model}</h4>
                    <StatusBadge status={getCampaignStatus(unit.campaign_from, unit.campaign_to)} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[8px] font-bold text-gray-400 uppercase mt-1">
                    {unit.engine_no && <span>Engine: {unit.engine_no}</span>}
                    {unit.chassis_no && <span>Chassis: {unit.chassis_no}</span>}
                    <span className="flex items-center gap-1"><SafeIcon icon={FiCalendar} />{fmtDate(unit.campaign_from)} – {fmtDate(unit.campaign_to)}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Campaign</p>
                  <p className="text-[12px] font-black text-amber-600">{peso(unit.campaign_price)}</p>
                  <p className="text-[9px] font-bold text-gray-400 line-through">{peso(unit.actual_price)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(unit)} className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all">
                    <SafeIcon icon={FiEdit} className="text-gray-500" />
                  </button>
                  <button onClick={() => handleDelete(unit)} className="p-2.5 bg-gray-50 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all">
                    <SafeIcon icon={FiTrash2} className="text-gray-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Lightbox */}
      {lightbox.open && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-6" onClick={closeLightbox}>
          <button onClick={closeLightbox} className="absolute top-6 right-6 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all text-white">
            <SafeIcon icon={FiX} />
          </button>
          <img
            src={lightbox.url}
            alt={lightbox.label}
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-[32px] w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">{editingId ? 'Edit Promo Unit' : 'Add Promo Unit'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100">
                <SafeIcon icon={FiX} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold uppercase rounded-xl p-3">{error}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Make" required value={formData.make} onChange={e => setFormData({ ...formData, make: e.target.value })} />
                <InputField label="Model" required value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Engine #" value={formData.engine_no} onChange={e => setFormData({ ...formData, engine_no: e.target.value })} />
                <InputField label="Chassis #" value={formData.chassis_no} onChange={e => setFormData({ ...formData, chassis_no: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Campaign Price" required type="number" value={formData.campaign_price} onChange={e => setFormData({ ...formData, campaign_price: e.target.value })} />
                <InputField label="Actual Price" required type="number" value={formData.actual_price} onChange={e => setFormData({ ...formData, actual_price: e.target.value })} />
              </div>
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Campaign Period *</label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <InputField label="From" required type="date" value={formData.campaign_from} onChange={e => setFormData({ ...formData, campaign_from: e.target.value })} />
                  <InputField label="To" required type="date" value={formData.campaign_to} onChange={e => setFormData({ ...formData, campaign_to: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Image</label>
                <div className="mt-1 flex items-center gap-3">
                  <div
                    className={`w-16 h-16 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center border border-gray-100 shrink-0 ${imagePreview ? 'cursor-zoom-in' : ''}`}
                    onClick={() => imagePreview && openLightbox(imagePreview, `${formData.make} ${formData.model}`)}
                  >
                    {imagePreview ? <img src={imagePreview} alt="preview" className="w-full h-full object-cover" /> : <SafeIcon icon={FiImage} className="text-gray-300" />}
                  </div>
                  <input type="file" accept="image/*" onChange={handleImageChange}
                    className="text-[10px] font-bold text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-gray-50 file:text-amber-600 file:text-[10px] file:font-black file:uppercase hover:file:bg-gray-100" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-50 hover:bg-gray-100 rounded-xl py-3 text-[10px] font-black uppercase transition-all">Cancel</button>
                <button type="submit" disabled={isSaving} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase text-[10px] rounded-xl py-3 transition-all disabled:opacity-50">
                  {isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
