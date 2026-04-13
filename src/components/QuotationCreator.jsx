import React, { useState, useEffect } from 'react';
import { 
  FiArrowLeft, FiUser, FiMapPin, FiPhone, FiTruck, 
  FiCpu, FiTag, FiDollarSign, FiDownload, FiCheckCircle, 
  FiSave, FiEye, FiMinusCircle, FiFileText, FiClipboard 
} from 'react-icons/fi';
import { supabase } from '../supabase/supabase';
import SafeIcon from '../common/SafeIcon';

const QuotationCreator = ({ onBack, editData = null, readOnly = false, initialMode = 'quotation' }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [docMode, setDocMode] = useState(initialMode); // 'quotation', 'payment', 'delivery'
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    controlNumber: '',
    name: '',
    address: '',
    contact: '',
    maker: '',
    bodyType: '',
    engineModel: '',
    remarks: '',
    price: '',
    downPayment: '',
    plateNo: '',
    termsConditions: '',
    officerName: 'MS. RHEA',
    officerDesignation: 'Sales Manager'
  });

  useEffect(() => {
    if (editData) {
      setFormData({
        date: editData.date || new Date().toISOString().split('T')[0],
        controlNumber: editData.id ? `GT-${editData.id.substr(0, 6).toUpperCase()}` : '',
        name: editData.customer_name || '',
        address: editData.address || '',
        contact: editData.contact_number || '',
        maker: editData.maker || '',
        bodyType: editData.body_type || '',
        engineModel: editData.engine_model || '',
        remarks: editData.remarks || '',
        price: editData.price || '',
        downPayment: editData.down_payment || '',
        plateNo: editData.plate_no || '',
        termsConditions: editData.terms_conditions || '',
        officerName: editData.officer_name || 'MS. RHEA',
        officerDesignation: editData.officer_designation || 'Sales Manager'
      });
    }
  }, [editData]);

  const handleInputChange = (e) => {
    if (readOnly && (e.target.name !== 'plateNo' && e.target.name !== 'termsConditions')) return;
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateBalance = () => {
    const price = parseFloat(formData.price) || 0;
    const dp = parseFloat(formData.downPayment) || 0;
    return price - dp;
  };

  const generatePDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const GT_ORANGE = [247, 148, 29];
      const WHITE = [255, 255, 255];
      const RED = [220, 38, 38];
      const GRAY = [100, 100, 100];
      const leftMargin = 25;
      const valueX = 80;
      let y = 20;

      // Header
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(36);
      pdf.setTextColor(...GT_ORANGE);
      pdf.text('GT', pageWidth / 2, y, { align: 'center' });
      y += 8;
      pdf.setFontSize(14);
      pdf.setTextColor(60, 60, 60);
      pdf.text('INTERNATIONAL', pageWidth / 2, y, { align: 'center' });
      y += 5;
      pdf.setFontSize(10);
      pdf.setTextColor(150, 150, 150);
      pdf.setFont('helvetica', 'normal');
      pdf.text("INCORPORATION", pageWidth / 2, y, { align: 'center' });
      y += 10;
      pdf.setFontSize(8);
      pdf.setTextColor(0, 0, 0);
      pdf.text('D2A Industrial Lot 37B, 4th St Extension, Industrial District, THEP, SBFZ Tipo, Subic Bay Freeport Zone, 2200 Zambales', pageWidth / 2, y, { align: 'center' });
      y += 6;
      pdf.setFont('helvetica', 'bold');
      pdf.text('+63 927 073 3100   info@gtintl.com.ph   +63 960 072 8684', pageWidth / 2, y, { align: 'center' });
      y += 15;

      // DYNAMIC TITLE
      let docTitle = 'QUOTATION';
      if (docMode === 'payment') docTitle = 'FULL PAYMENT RECEIPT';
      if (docMode === 'delivery') docTitle = 'DELIVERY RECEIPT';
      if (docMode === 'quotation' && (parseFloat(formData.downPayment) || 0) > 0) docTitle = 'DOWNPAYMENT RECEIPT';
      
      pdf.setFontSize(22);
      pdf.setTextColor(...GT_ORANGE);
      pdf.text(docTitle, pageWidth / 2, y, { align: 'center' });
      y += 10;

      const drawLabel = (label, yPos) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(...GT_ORANGE);
        pdf.text(label, leftMargin, yPos);
      };

      const drawValue = (value, yPos, isBold = false) => {
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
        pdf.text(value || '', valueX, yPos);
      };

      drawLabel('DATE:', y);
      drawValue(new Date(formData.date).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }), y);
      y += 8;
      drawLabel('NAME:', y);
      drawValue((formData.name || '').toUpperCase(), y, true);
      y += 8;
      drawLabel('CONTACT:', y);
      drawValue(formData.contact || 'N/A', y);
      y += 8;
      drawLabel('ADDRESS:', y);
      const addressLines = pdf.splitTextToSize((formData.address || '').toUpperCase(), pageWidth - valueX - leftMargin);
      pdf.text(addressLines, valueX, y);
      y += Math.max(10, addressLines.length * 5);

      pdf.setDrawColor(200, 200, 200);
      pdf.line(leftMargin, y, pageWidth - leftMargin, y);
      y += 10;

      const drawRow = (label, value, isHighlight = false, isRemarks = false) => {
        const rowHeight = 9;
        const col1Width = 50;
        pdf.setFillColor(...GT_ORANGE);
        pdf.rect(leftMargin, y, col1Width, rowHeight, 'F');
        pdf.setTextColor(...WHITE);
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, leftMargin + 5, y + 6);
        
        pdf.setDrawColor(200, 200, 200);
        pdf.line(leftMargin + col1Width, y + rowHeight, pageWidth - leftMargin, y + rowHeight);
        
        pdf.setTextColor(isRemarks ? RED[0] : 0, isRemarks ? RED[1] : 0, isRemarks ? RED[2] : 0);
        pdf.setFont('helvetica', isHighlight || isRemarks ? 'bold' : 'normal');
        
        if (isHighlight) {
          pdf.text(value, pageWidth - leftMargin - 5, y + 6, { align: 'right' });
        } else {
          pdf.text(value, leftMargin + col1Width + 5, y + 6);
        }
        y += rowHeight;
      };

      drawRow('MAKER', formData.maker);
      drawRow('BODY TYPE', formData.bodyType);
      drawRow('ENGINE / SERIAL', formData.engineModel);
      if (docMode === 'delivery' && formData.plateNo) {
        drawRow('PLATE NO', formData.plateNo.toUpperCase());
      }
      drawRow('REMARKS', formData.remarks, false, true);

      if (docMode !== 'delivery') {
        const dp = parseFloat(formData.downPayment) || 0;
        if (dp > 0 || docMode === 'payment') {
          drawRow('TOTAL PRICE', `PHP ${new Intl.NumberFormat('en-PH').format(formData.price || 0)}`);
          drawRow('LESS PAYMENT', `- PHP ${new Intl.NumberFormat('en-PH').format(dp)}`);
          drawRow('BALANCE', `PHP ${new Intl.NumberFormat('en-PH').format(calculateBalance())}`, true);
        } else {
          drawRow('UNIT PRICE', `PHP ${new Intl.NumberFormat('en-PH').format(formData.price || 0)}`, true);
        }
      }

      // BANKING DETAILS SECTION
      y = pageHeight - 110;
      pdf.setTextColor(...GT_ORANGE);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('BANKING DETAILS', leftMargin, y);
      y += 4;
      pdf.setDrawColor(...GT_ORANGE);
      pdf.setLineWidth(0.2);
      pdf.line(leftMargin, y, pageWidth - leftMargin, y);
      y += 8;

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(8);
      const verticalLineX = pageWidth / 2;
      const startBankY = y;

      // RCBC
      pdf.setFont('helvetica', 'bold');
      pdf.text('RCBC', leftMargin, y);
      pdf.setFont('helvetica', 'normal');
      y += 4;
      pdf.text('Account No: 0000009045644249', leftMargin, y);
      y += 4;
      pdf.text('Account Name: GT INTERNATIONAL INC.', leftMargin, y);
      y += 4;
      const addr1 = pdf.splitTextToSize('Precision Tek Bldg. Lot B, Rizal Highway, Subic Bay Freeport Zone', (pageWidth / 2) - 30);
      pdf.text(addr1, leftMargin, y);

      // BDO
      const rightCol = verticalLineX + 5;
      let yOpt2 = startBankY;
      pdf.setFont('helvetica', 'bold');
      pdf.text('BDO', rightCol, yOpt2);
      pdf.setFont('helvetica', 'normal');
      yOpt2 += 4;
      pdf.text('Account No: 010028005592', rightCol, yOpt2);
      yOpt2 += 4;
      pdf.text('Account Name: GT INTERNATIONAL INC.', rightCol, yOpt2);
      yOpt2 += 4;
      const addr2 = pdf.splitTextToSize('G/F Commercial Units 1-3, Puregold Duty Free Subic, Argonaut Highway, Subic Bay Freeport Zone', (pageWidth / 2) - 30);
      pdf.text(addr2, rightCol, yOpt2);

      // Vertical Divider
      const endBankY = Math.max(y + (addr1.length * 4), yOpt2 + (addr2.length * 4));
      pdf.setDrawColor(220, 220, 220);
      pdf.line(verticalLineX, startBankY, verticalLineX, endBankY);

      // SIGNATURE SECTION
      y = pageHeight - 65;
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.3);
      
      // Left: Customer
      pdf.line(leftMargin, y, leftMargin + 60, y);
      pdf.setFont('helvetica', 'bold');
      pdf.text((formData.name || 'CUSTOMER NAME').toUpperCase(), leftMargin + 30, y + 5, { align: 'center' });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text('Signature over Printed Name', leftMargin + 30, y + 9, { align: 'center' });
      pdf.text('Customer / Recipient', leftMargin + 30, y + 13, { align: 'center' });

      // Right: Company Officer
      const rightX = pageWidth - leftMargin - 60;
      pdf.line(rightX, y, pageWidth - leftMargin, y);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text(formData.officerName.toUpperCase(), rightX + 30, y + 5, { align: 'center' });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(formData.officerDesignation, rightX + 30, y + 9, { align: 'center' });
      pdf.text('GT International Inc.', rightX + 30, y + 13, { align: 'center' });

      y = pageHeight - 20;
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(7);
      pdf.setTextColor(...GRAY);
      pdf.text("This document serves as an official record of the transaction between GT International Inc. and the customer mentioned above.", pageWidth / 2, y, { align: 'center' });

      pdf.save(`${docTitle.replace(/\s/g, '_')}_${formData.name.replace(/\s/g, '_')}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Error generating PDF");
    }
  };

  const handleSave = async (andDownload = false) => {
    setIsSaving(true);
    try {
      const payload = {
        date: formData.date,
        customer_name: formData.name,
        address: formData.address,
        contact_number: formData.contact,
        maker: formData.maker,
        body_type: formData.bodyType,
        engine_model: formData.engineModel,
        remarks: formData.remarks,
        price: Number(formData.price),
        down_payment: Number(formData.downPayment || 0),
        plate_no: formData.plateNo,
        terms_conditions: formData.termsConditions,
        officer_name: formData.officerName,
        officer_designation: formData.officerDesignation
      };

      if (editData?.id) {
        await supabase.from('formal_quotations_2024').update(payload).eq('id', editData.id);
      } else {
        await supabase.from('formal_quotations_2024').insert([payload]);
      }

      if (andDownload) await generatePDF();
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onBack();
      }, 1500);
    } catch (error) {
      alert("Error saving: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 pb-24">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-orange-600 font-bold mb-6 transition-colors">
        <SafeIcon icon={FiArrowLeft} /> Back to Registry
      </button>

      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        <div className={`bg-gradient-to-r ${docMode === 'delivery' ? 'from-emerald-600 to-teal-600' : docMode === 'payment' ? 'from-blue-600 to-indigo-600' : 'from-orange-500 to-amber-500'} p-8 text-white relative overflow-hidden`}>
          <div className="relative z-10">
            <h1 className="text-3xl font-black tracking-tight uppercase">
              {docMode === 'delivery' ? 'Delivery Receipt' : docMode === 'payment' ? 'Full Payment Receipt' : 'Official Quotation'}
            </h1>
            <p className="text-white/80 font-medium opacity-90">Document Generator & Records Management</p>
          </div>
          <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-20">
            <SafeIcon icon={docMode === 'delivery' ? FiClipboard : docMode === 'payment' ? FiCheckCircle : FiFileText} className="text-8xl" />
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div className="space-y-6">
              <SectionHeader icon={FiUser} title="Customer Information" />
              <InputField label="Date" name="date" type="date" value={formData.date} onChange={handleInputChange} />
              <InputField label="Customer / Company Name" name="name" placeholder="Full legal name" value={formData.name} onChange={handleInputChange} />
              <InputField label="Address" name="address" icon={FiMapPin} placeholder="Complete Address" value={formData.address} onChange={handleInputChange} />
              <InputField label="Contact #" name="contact" icon={FiPhone} placeholder="+63 ..." value={formData.contact} onChange={handleInputChange} />
              
              <SectionHeader icon={FiUser} title="Signing Authority" />
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Officer Name" name="officerName" value={formData.officerName} onChange={handleInputChange} />
                <InputField label="Designation" name="officerDesignation" value={formData.officerDesignation} onChange={handleInputChange} />
              </div>
            </div>

            <div className="space-y-6">
              <SectionHeader icon={FiTruck} title="Unit & Pricing" />
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Maker" name="maker" icon={FiTag} value={formData.maker} onChange={handleInputChange} />
                <InputField label="Body Type" name="bodyType" icon={FiTruck} value={formData.bodyType} onChange={handleInputChange} />
              </div>
              <InputField label="Engine / Serial No." name="engineModel" icon={FiCpu} value={formData.engineModel} onChange={handleInputChange} />
              
              {docMode === 'delivery' && (
                <InputField label="Plate No. (Optional)" name="plateNo" icon={FiTag} placeholder="e.g. ABC 1234" value={formData.plateNo} onChange={handleInputChange} />
              )}

              <div className="pt-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 ml-1">Remarks (Urgent/Red)</label>
                <textarea name="remarks" rows={2} value={formData.remarks} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-100 outline-none text-red-600 font-bold" />
              </div>

              {docMode !== 'delivery' && (
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 space-y-4">
                  <InputField label="Unit Price (PHP)" name="price" type="number" icon={FiDollarSign} value={formData.price} onChange={handleInputChange} className="bg-white font-bold" />
                  <InputField label="Down Payment / Payment Made (PHP)" name="downPayment" type="number" icon={FiMinusCircle} value={formData.downPayment} onChange={handleInputChange} className="bg-white font-bold text-blue-600" />
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Balance Due</p>
                    <p className="text-2xl font-black text-gray-900">PHP {new Intl.NumberFormat('en-PH').format(calculateBalance())}</p>
                  </div>
                </div>
              )}

              {docMode === 'delivery' && (
                <div className="pt-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 ml-1">Terms & Conditions</label>
                  <textarea name="termsConditions" rows={4} value={formData.termsConditions} onChange={handleInputChange} placeholder="Enter delivery terms..." className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-100 outline-none text-sm" />
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row gap-4 justify-center">
            <button onClick={() => handleSave(false)} disabled={isSaving} className="px-8 py-4 bg-gray-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg">
              <SafeIcon icon={isSuccess ? FiCheckCircle : FiSave} /> Save Record
            </button>
            <button onClick={() => handleSave(true)} disabled={isSaving} className={`px-10 py-4 ${docMode === 'delivery' ? 'bg-emerald-600' : docMode === 'payment' ? 'bg-blue-600' : 'bg-orange-600'} text-white rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-xl transition-all`}>
              <SafeIcon icon={FiDownload} /> Generate {docMode === 'delivery' ? 'Delivery' : docMode === 'payment' ? 'Payment' : 'Quotation'} PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SectionHeader = ({ icon, title }) => (
  <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-4">
    <SafeIcon icon={icon} className="text-orange-500 text-xl" />
    <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">{title}</h3>
  </div>
);

const InputField = ({ label, icon, className = '', ...props }) => (
  <div>
    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">{label}</label>
    <div className="relative">
      {icon && <SafeIcon icon={icon} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />}
      <input {...props} className={`w-full ${icon ? 'pl-11' : 'px-4'} py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-100 transition-all outline-none text-gray-800 font-medium ${className}`} />
    </div>
  </div>
);

export default QuotationCreator;