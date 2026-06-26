import React, { useState } from 'react';
import { FiDownload, FiFileText, FiCheckCircle } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const THEME_BLUE = [30, 58, 138];

// Fetches a PocketBase file and returns it as a base64 data URL + its
// natural pixel dimensions, so jsPDF can size it correctly on the page.
const fetchImageAsDataUrl = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = url;
  });
};

const fileUrl = (collectionId, recordId, filename, thumb) =>
  `https://finance.gtintl.com.ph/api/files/${collectionId}/${recordId}/${filename}${thumb ? `?thumb=${thumb}` : ''}`;

const JobReportGenerator = ({ job, unit, workers, progressEntries }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });
  };

  const generatePDF = async () => {
    setIsSaving(true);
    try {
      const { default: jsPDF } = await import('jspdf');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      const addHeader = () => {
        pdf.setFillColor(...THEME_BLUE);
        pdf.rect(0, 0, pageWidth, 38, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('GT INTERNATIONAL INC', pageWidth / 2, 16, { align: 'center' });
        pdf.setFontSize(10);
        pdf.text('Job Progress Report', pageWidth / 2, 24, { align: 'center' });
        pdf.setFontSize(7);
        pdf.text('D2A Industrial Lot 37B, 4th St Extension, Subic Bay Freeport Zone, Zambales', pageWidth / 2, 31, { align: 'center' });
      };

      const addFooter = (pageNum, totalPages) => {
        pdf.setTextColor(107, 114, 128);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'italic');
        pdf.text(`Generated ${new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}`, margin, pageHeight - 10);
        pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      };

      addHeader();
      let y = 50;

      // Job & Unit details
      pdf.setTextColor(...THEME_BLUE);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(job.title || job.job_type, margin, y);
      y += 8;

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(9);
      const detailRows = [
        ['Unit', unit ? `${unit.make} ${unit.model_engine} (Key No. ${unit.key_no})` : 'N/A'],
        ['Job Type', job.job_type],
        ['Status', job.status],
        ['Workers', workers.length > 0 ? workers.map(w => w.name).join(', ') : 'Unassigned'],
        ['Started', formatDate(job.start_date)],
        ['Target Date', job.target_date ? formatDate(job.target_date) : 'N/A'],
        ['Completed', job.completed_date ? formatDate(job.completed_date) : 'N/A'],
      ];
      if (job.materials_cost > 0) {
        detailRows.push(['Materials Cost', `PHP ${new Intl.NumberFormat().format(job.materials_cost)}${job.cost_notes ? ` — ${job.cost_notes}` : ''}`]);
      }

      detailRows.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${label}:`, margin, y);
        pdf.setFont('helvetica', 'normal');
        const split = pdf.splitTextToSize(String(value), contentWidth - 40);
        pdf.text(split, margin + 38, y);
        y += Math.max(6, split.length * 5);
      });

      y += 6;
      pdf.setDrawColor(...THEME_BLUE);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 10;

      // Progress timeline with photos
      pdf.setTextColor(...THEME_BLUE);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PROGRESS TIMELINE', margin, y);
      y += 10;

      let pagesAdded = 1;

      for (const entry of progressEntries) {
        // Check if we need a new page before writing this entry's header
        if (y > pageHeight - 50) {
          addFooter(pagesAdded, '{{TOTAL}}');
          pdf.addPage();
          pagesAdded += 1;
          addHeader();
          y = 50;
        }

        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${entry.log_type} — ${formatDate(entry.log_date)}`, margin, y);
        if (entry.logged_by) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.text(`Logged by ${entry.logged_by}`, pageWidth - margin, y, { align: 'right' });
        }
        y += 6;

        if (entry.caption) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          const captionLines = pdf.splitTextToSize(entry.caption, contentWidth);
          pdf.text(captionLines, margin, y);
          y += captionLines.length * 4.5 + 2;
        }

        // Embed up to 4 photos per entry, 2 per row
        const photos = (entry.photos || []).slice(0, 4);
        if (photos.length > 0) {
          const imgSize = 38;
          const gap = 4;
          let col = 0;
          let rowStartY = y;

          for (const photo of photos) {
            if (rowStartY + imgSize > pageHeight - 25) {
              addFooter(pagesAdded, '{{TOTAL}}');
              pdf.addPage();
              pagesAdded += 1;
              addHeader();
              rowStartY = 50;
              col = 0;
            }

            try {
              const url = fileUrl(entry.collectionId, entry.id, photo, '500x500');
              const { dataUrl } = await fetchImageAsDataUrl(url);
              const x = margin + col * (imgSize + gap);
              pdf.addImage(dataUrl, 'JPEG', x, rowStartY, imgSize, imgSize);
            } catch (imgErr) {
              console.warn('Failed to embed image in PDF:', imgErr);
            }

            col += 1;
            if (col >= 2) {
              col = 0;
              rowStartY += imgSize + gap;
            }
          }
          y = rowStartY + (col > 0 ? imgSize + gap : 0) + 4;
        }

        y += 8;
      }

      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setTextColor(107, 114, 128);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'italic');
        pdf.text(`Generated ${new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}`, margin, pageHeight - 10);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }

      const safeTitle = (job.title || job.job_type || 'Job').replace(/[^a-z0-9]+/gi, '_');
      pdf.save(`GT_Job_Report_${safeTitle}.pdf`);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error('PDF Error:', error);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <button
      onClick={generatePDF}
      disabled={isSaving}
      className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg whitespace-nowrap ${
        isSaved ? 'bg-green-600 text-white shadow-green-100' : 'bg-gray-900 text-white shadow-gray-200 hover:bg-gray-800'
      }`}
    >
      <SafeIcon icon={isSaving ? FiFileText : isSaved ? FiCheckCircle : FiDownload} className={isSaving ? 'animate-pulse' : ''} />
      {isSaving ? 'Generating...' : isSaved ? 'Downloaded' : 'Download Report'}
    </button>
  );
};

export default JobReportGenerator;
