import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabase/supabase';
import { FiDownload, FiFileText, FiCheckCircle } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const PDFGenerator = ({ formData, customerData, calculations, formatCurrency }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const pdfFormatCurrency = (amount) => {
    return 'PHP ' + new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const saveToDatabase = async () => {
    try {
      const { data, error } = await supabase
        .from('quotations_20240522')
        .insert([
          {
            customer_name: customerData.name,
            contact_number: customerData.contact,
            unit_details: customerData.unitDetails,
            equipment_price: Number(formData.equipmentPrice),
            down_payment: Number(formData.downPayment),
            interest_rate: Number(formData.interestRate),
            lease_term: Number(formData.leaseTerm),
            monthly_payment: Number(calculations.monthlyPayment),
            total_investment: Number(calculations.totalInvestment),
            is_read: false
          }
        ])
        .select();

      if (error) throw error;
      return data[0];
    } catch (e) {
      console.error('Database Error:', e);
      return null;
    }
  };

  const generatePDF = async () => {
    setIsSaving(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      await saveToDatabase();
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      const THEME_BLUE = [30, 58, 138];

      // Header
      pdf.setFillColor(...THEME_BLUE);
      pdf.rect(0, 0, pageWidth, 45, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('GT INTERNATIONAL INC', pageWidth / 2, 20, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.text('Heavy Equipment & Truck Payment Quotation', pageWidth / 2, 28, { align: 'center' });
      
      pdf.setFontSize(8);
      pdf.text('D2A Industrial Lot 37B, 4th St Extension, Subic Bay Freeport Zone, Zambales', pageWidth / 2, 34, { align: 'center' });
      pdf.text('Contact: +63 927 073 3100 | +63 960 072 8684', pageWidth / 2, 38, { align: 'center' });

      let y = 60;

      // Customer Details Section
      pdf.setTextColor(...THEME_BLUE);
      pdf.setFontSize(12);
      pdf.text('CUSTOMER DETAILS', margin, y);
      y += 10;
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Customer:', margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(customerData.name || 'N/A', margin + 30, y);
      
      y += 6;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Contact:', margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(customerData.contact || 'N/A', margin + 30, y);
      
      y += 6;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Unit:', margin, y);
      pdf.setFont('helvetica', 'normal');
      const splitUnit = pdf.splitTextToSize(customerData.unitDetails || 'N/A', contentWidth - 30);
      pdf.text(splitUnit, margin + 30, y);
      y += (splitUnit.length * 5) + 10;

      // Table Header
      pdf.setFillColor(243, 244, 246);
      pdf.rect(margin, y, contentWidth, 10, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.text('FINANCING DESCRIPTION', margin + 5, y + 7);
      pdf.text('AMOUNT/VALUE', pageWidth - margin - 5, y + 7, { align: 'right' });

      y += 18;
      const data = [
        ['Equipment Price', pdfFormatCurrency(formData.equipmentPrice)],
        ['Down Payment', pdfFormatCurrency(formData.downPayment)],
        ['Amount to Finance', pdfFormatCurrency(calculations.totalPrincipal)],
        ['Interest Rate', `${formData.interestRate}% Monthly`],
        ['Financing Term', `${formData.leaseTerm} Months`]
      ];

      data.forEach(row => {
        pdf.setFont('helvetica', 'normal');
        pdf.text(row[0], margin + 5, y);
        pdf.setFont('helvetica', 'bold');
        pdf.text(row[1], pageWidth - margin - 5, y, { align: 'right' });
        y += 8;
      });

      y += 5;
      pdf.setFillColor(...THEME_BLUE);
      pdf.rect(margin, y, contentWidth, 15, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      pdf.text('MONTHLY PAYMENT:', margin + 5, y + 10);
      pdf.setFontSize(14);
      pdf.text(pdfFormatCurrency(calculations.monthlyPayment), pageWidth - margin - 5, y + 10, { align: 'right' });

      // Banking Details Section
      y += 25;
      pdf.setTextColor(...THEME_BLUE);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('BANKING DETAILS', margin, y);
      
      y += 4;
      pdf.setDrawColor(...THEME_BLUE);
      pdf.line(margin, y, pageWidth - margin, y);
      
      y += 8;
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(8);
      const verticalLineX = margin + (contentWidth / 2);
      const startBankY = y;
      
      // RCBC
      pdf.setFont('helvetica', 'bold');
      pdf.text('RCBC', margin, y);
      pdf.setFont('helvetica', 'normal');
      y += 4;
      pdf.text('Account No: 0000009045644249', margin, y);
      y += 4;
      pdf.text('Account Name: GT INTERNATIONAL INC.', margin, y);
      y += 4;
      const addr1 = pdf.splitTextToSize('Precision Tek Bldg. Lot B, Rizal Highway, Subic bay Freeport Zone', (contentWidth / 2) - 10);
      pdf.text(addr1, margin, y);

      // BDO
      const rightCol = margin + (contentWidth / 2) + 5;
      let yOpt2 = startBankY;
      pdf.setFont('helvetica', 'bold');
      pdf.text('BDO', rightCol, yOpt2);
      pdf.setFont('helvetica', 'normal');
      yOpt2 += 4;
      pdf.text('Account No: 010028005592', rightCol, yOpt2);
      yOpt2 += 4;
      pdf.text('Account Name: GT INTERNATIONAL INC.', rightCol, yOpt2);
      yOpt2 += 4;
      const addr2 = pdf.splitTextToSize('G/F Commercial Units 1-3, Puregold Duty Free Subic, Argonaut Highway, Subic Port District, Brgy. Asinan, Subic Bay Freeport Zone', (contentWidth / 2) - 10);
      pdf.text(addr2, rightCol, yOpt2);

      // Vertical Divider Line
      const endBankY = Math.max(y + (addr1.length * 4), yOpt2 + (addr2.length * 4));
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.2);
      pdf.line(verticalLineX, startBankY, verticalLineX, endBankY);

      // Footer
      pdf.setTextColor(107, 114, 128);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Disclaimer: This is an estimated quotation and subject to credit approval.', pageWidth / 2, pageHeight - 20, { align: 'center' });

      pdf.save(`GT_Quote_${(customerData.name || 'Client').replace(/\s/g, '_')}.pdf`);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error("PDF Error:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-700">
      <div className="flex items-center gap-2 mb-6">
        <SafeIcon icon={FiFileText} className="text-2xl text-blue-700" />
        <h3 className="font-bold text-gray-800">Finalize Quotation</h3>
      </div>

      <div className="w-full">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={generatePDF}
          disabled={isSaving}
          className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-bold shadow-md transition-all ${
            isSaved ? 'bg-green-600 text-white' : 'bg-blue-700 hover:bg-blue-800 text-white'
          }`}
        >
          <SafeIcon icon={isSaved ? FiCheckCircle : FiDownload} className="text-xl" />
          {isSaving ? 'Generating PDF...' : isSaved ? 'Quotation Saved & Downloaded' : 'Download Official Quotation'}
        </motion.button>
      </div>

      {isSaved && (
        <motion.p 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-green-600 text-xs mt-3 font-medium"
        >
          Your quotation has been successfully generated and saved to our records.
        </motion.p>
      )}
    </motion.div>
  );
};

export default PDFGenerator;