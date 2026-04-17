import React, { useState, useEffect } from 'react';
import { 
  FiSettings, FiSave, FiRefreshCw, FiHome, FiDollarSign, 
  FiFileText, FiPlus, FiTrash2, FiEye, FiEyeOff 
} from 'react-icons/fi';
import { supabase } from '../supabase/supabase';
import SafeIcon from '../common/SafeIcon';

const SettingsModule = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('app_settings_2024')
      .select('*')
      .eq('id', 'global_config')
      .single();
    
    if (data) {
      // Ensure banking_details is an array
      const banking = Array.isArray(data.banking_details) ? data.banking_details : [];
      setSettings({ ...data, banking_details: banking });
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('app_settings_2024')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', 'global_config');
      
      if (error) throw error;
      alert("Settings synchronized! All documents will reflect these changes.");
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const addBank = () => {
    const newBank = {
      id: `bank_${Date.now()}`,
      bank_name: 'NEW BANK',
      account_no: '',
      account_name: 'GT INTERNATIONAL INC.',
      address: '',
      is_visible: true
    };
    setSettings({
      ...settings,
      banking_details: [...settings.banking_details, newBank]
    });
  };

  const removeBank = (id) => {
    if (confirm("Remove this bank account?")) {
      setSettings({
        ...settings,
        banking_details: settings.banking_details.filter(b => b.id !== id)
      });
    }
  };

  const updateBank = (id, field, value) => {
    const updated = settings.banking_details.map(b => 
      b.id === id ? { ...b, [field]: value } : b
    );
    setSettings({ ...settings, banking_details: updated });
  };

  if (loading) return <div className="p-20 text-center"><FiRefreshCw className="animate-spin text-4xl text-blue-600 mx-auto" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32">
      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-100">
              <SafeIcon icon={FiSettings} />
            </div>
            Global Branding & Banking
          </h2>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1.5 ml-1">GT Systems Management Core</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full md:w-auto bg-blue-700 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-800 transition-all flex items-center justify-center gap-2"
        >
          <SafeIcon icon={FiSave} /> {isSaving ? 'Saving...' : 'Commit Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* LEFT: IDENTITY */}
        <div className="xl:col-span-1 space-y-8">
          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
            <SectionLabel icon={FiHome} text="Company Identity" />
            <SettingsInput label="Company Name" value={settings.header_config.title} onChange={v => setSettings({...settings, header_config: {...settings.header_config, title: v.toUpperCase()}})} />
            <SettingsInput label="Document Subtitle" value={settings.header_config.subtitle} onChange={v => setSettings({...settings, header_config: {...settings.header_config, subtitle: v}})} />
            <SettingsInput label="Business Address" value={settings.header_config.address} onChange={v => setSettings({...settings, header_config: {...settings.header_config, address: v.toUpperCase()}})} />
            <SettingsInput label="Contact Numbers" value={settings.header_config.contact} onChange={v => setSettings({...settings, header_config: {...settings.header_config, contact: v}})} />
          </div>

          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
            <SectionLabel icon={FiFileText} text="Document Disclaimer" />
            <p className="text-[9px] text-gray-400 font-bold uppercase mt-2 mb-4">Visible at the bottom of all PDFs</p>
            <textarea 
              value={settings.footer_text}
              onChange={e => setSettings({...settings, footer_text: e.target.value})}
              className="w-full p-6 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold text-gray-700 outline-none focus:ring-4 focus:ring-blue-50"
              rows={4}
            />
          </div>
        </div>

        {/* RIGHT: DYNAMIC BANKING */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center border-b border-gray-50 pb-6 mb-8">
              <SectionLabel icon={FiDollarSign} text="Banking Credentials" />
              <button 
                onClick={addBank}
                className="bg-indigo-50 text-indigo-600 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2"
              >
                <FiPlus /> Add Bank
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {settings.banking_details.map((bank, index) => (
                <div key={bank.id} className={`p-8 rounded-[32px] border-2 transition-all relative group ${bank.is_visible ? 'border-indigo-100 bg-white' : 'border-gray-50 bg-gray-50/30'}`}>
                  <div className="absolute top-6 right-6 flex gap-2">
                    <button 
                      onClick={() => updateBank(bank.id, 'is_visible', !bank.is_visible)}
                      className={`p-2.5 rounded-xl border transition-all ${bank.is_visible ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-400 border-gray-200'}`}
                      title={bank.is_visible ? "Visible on PDF" : "Hidden on PDF"}
                    >
                      <SafeIcon icon={bank.is_visible ? FiEye : FiEyeOff} />
                    </button>
                    <button 
                      onClick={() => removeBank(bank.id)}
                      className="p-2.5 bg-white text-red-400 rounded-xl border border-gray-200 hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                      <SafeIcon icon={FiTrash2} />
                    </button>
                  </div>

                  <div className="space-y-5">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xs">
                      {index + 1}
                    </div>
                    
                    <SettingsInput 
                      label="Bank Name (e.g. BDO / RCBC)" 
                      value={bank.bank_name} 
                      onChange={v => updateBank(bank.id, 'bank_name', v.toUpperCase())} 
                    />
                    <SettingsInput 
                      label="Account Name" 
                      value={bank.account_name} 
                      onChange={v => updateBank(bank.id, 'account_name', v.toUpperCase())} 
                    />
                    <SettingsInput 
                      label="Account Number" 
                      value={bank.account_no} 
                      onChange={v => updateBank(bank.id, 'account_no', v)} 
                    />
                    <SettingsInput 
                      label="Branch Address" 
                      value={bank.address} 
                      onChange={v => updateBank(bank.id, 'address', v.toUpperCase())} 
                    />
                  </div>
                </div>
              ))}
              
              {settings.banking_details.length === 0 && (
                <div className="col-span-2 py-20 text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-100">
                  <FiDollarSign className="text-4xl text-gray-200 mx-auto mb-4" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No Bank Accounts Listed</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SectionLabel = ({ icon, text }) => (
  <div className="flex items-center gap-3">
    <SafeIcon icon={icon} className="text-blue-600" />
    <span className="text-[11px] font-black uppercase tracking-widest text-gray-800">{text}</span>
  </div>
);

const SettingsInput = ({ label, value, onChange }) => (
  <div>
    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1.5 ml-1">{label}</label>
    <input 
      type="text" 
      value={value} 
      onChange={e => onChange(e.target.value)}
      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
    />
  </div>
);

export default SettingsModule;