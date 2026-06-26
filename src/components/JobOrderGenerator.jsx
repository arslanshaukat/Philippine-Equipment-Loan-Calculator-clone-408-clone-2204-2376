import React, { useState } from 'react';
import { FiDownload, FiFileText, FiCheckCircle } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import pb from '../supabase/supabase';

const STATUS_COLORS = {
  'Not Started': [107, 114, 128],
  'In Progress': [37, 99, 235],
  'On Hold': [217, 119, 6],
  'Completed': [5, 150, 105],
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });
};

const JobOrderGenerator = ({ job, unit }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const generatePdf = async () => {
    setIsGenerating(true);
    try {
      const checklistItems = await pb.collection('job_checklist_items').getFullList({
        filter: `job="${job.id}"`,
        sort: 'order,created',
      });

      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 18;
      const contentWidth = pageWidth - margin * 2;
      let y = 22;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(24);
      pdf.setTextColor(15, 15, 15);
      pdf.text('JOB ORDER', pageWidth / 2, y, { align: 'center' });
      y += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(90, 90, 90);
      pdf.text('Task List for Unit', pageWidth / 2, y, { align: 'center' });
      y += 6;

      pdf.setDrawColor(15, 15, 15);
      pdf.setLineWidth(0.6);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 10;

      const fieldRow = (label, value, valueColor) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10.5);
        pdf.setTextColor(20, 20, 20);
        pdf.text(label, margin, y);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(...(valueColor || [20, 20, 20]));
        pdf.text(value, margin + 38, y);
        y += 6;
        pdf.setDrawColor(230, 230, 230);
        pdf.setLineWidth(0.2);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 7;
      };

      const unitLabel = unit
        ? `#${unit.key_no} ${unit.make} / ${unit.model_engine}`
        : 'Unknown Unit';
      fieldRow('Unit Name:', unitLabel);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10.5);
      pdf.setTextColor(20, 20, 20);
      pdf.text('Job Order:', margin, y);
      pdf.text('Pull Out:', margin + contentWidth / 2 + 10, y);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(20, 20, 20);
      pdf.text(formatDate(job.start_date), margin + 30, y);
      pdf.text(formatDate(job.pull_out_date), margin + contentWidth / 2 + 32, y);
      y += 6;
      pdf.setDrawColor(230, 230, 230);
      pdf.setLineWidth(0.2);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 7;

      const statusColor = STATUS_COLORS[job.status] || [20, 20, 20];
      fieldRow('Status:', job.status.toUpperCase(), statusColor);

      y += 4;

      const boxTop = y;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(37, 99, 235);
      pdf.text('Task List:', margin + 6, y + 8);
      y += 16;

      const colWidth = (contentWidth - 12) / 2;
      const leftX = margin + 6;
      const rightX = margin + colWidth + 18;
      const rowHeight = 9;
      const half = Math.ceil(checklistItems.length / 2);
      const leftItems = checklistItems.slice(0, half);
      const rightItems = checklistItems.slice(half);
      const maxRows = Math.max(leftItems.length, rightItems.length);

      const drawItem = (item, x, rowY) => {
        if (!item) return;
        pdf.setDrawColor(37, 99, 235);
        pdf.setLineWidth(1.2);
        pdf.line(x - 4, rowY - 4, x - 4, rowY + 2.5);
        pdf.setDrawColor(60, 60, 60);
        pdf.setLineWidth(0.4);
        pdf.rect(x, rowY - 3.2, 3.2, 3.2);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10.5);
        pdf.setTextColor(30, 30, 30);
        const text = pdf.splitTextToSize(item.title, colWidth - 12);
        pdf.text(text, x + 6, rowY);
      };

      for (let i = 0; i < maxRows; i++) {
        if (y + rowHeight > pageHeight - 30) {
          pdf.addPage();
          y = 25;
        }
        drawItem(leftItems[i], leftX, y);
        drawItem(rightItems[i], rightX, y);
        y += rowHeight;
      }

      if (checklistItems.length === 0) {
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150);
        pdf.text('No checklist items added yet.', leftX, y);
        y += rowHeight;
      }

      y += 6;
      const boxBottom = y;
      pdf.setDrawColor(37, 99, 235);
      pdf.setLineWidth(0.5);
      pdf.rect(margin, boxTop, contentWidth, boxBottom - boxTop);

      const footerY = pageHeight - 20;
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.2);
      pdf.line(margin, footerY - 8, pageWidth - margin, footerY - 8);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(120, 120, 120);
      const printedStr = new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila'
      });
      pdf.text(`Printed: ${printedStr}`, pageWidth / 2, footerY, { align: 'center' });

      const safeUnit = (unit?.key_no || 'unit').replace(/[^a-z0-9]+/gi, '_');
      pdf.save(`Job_Order_${safeUnit}.pdf`);
      setIsDone(true);
      setTimeout(() => setIsDone(false), 2500);
    } catch (err) {
      console.error('Job order PDF generation failed:', err);
      alert('Failed to generate Job Order PDF: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={generatePdf}
      disabled={isGenerating}
      className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg whitespace-nowrap ${
        isDone ? 'bg-green-600 text-white shadow-green-100' : 'bg-amber-500 text-white shadow-amber-100 hover:bg-amber-600'
      }`}
    >
      <SafeIcon icon={isGenerating ? FiFileText : isDone ? FiCheckCircle : FiDownload} className={isGenerating ? 'animate-pulse' : ''} />
      {isGenerating ? 'Generating...' : isDone ? 'Downloaded' : 'Job Order PDF'}
    </button>
  );
};

export default JobOrderGenerator;
