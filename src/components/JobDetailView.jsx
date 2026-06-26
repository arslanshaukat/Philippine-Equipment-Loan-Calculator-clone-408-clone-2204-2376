import React, { useState, useEffect } from 'react';
import {
  FiArrowLeft, FiPlus, FiCalendar, FiUser, FiClock, FiCheckCircle,
  FiPlayCircle, FiPauseCircle, FiImage, FiVideo, FiX, FiDownload,
  FiEdit, FiDollarSign, FiTrash2, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import pb from '../supabase/supabase';
import SafeIcon from '../common/SafeIcon';
import AddProgressModal from './AddProgressModal';
import JobReportGenerator from './JobReportGenerator';
import JobChecklist from './JobChecklist';
import JobOrderGenerator from './JobOrderGenerator';

const STATUSES = ['Not Started', 'In Progress', 'On Hold', 'Completed'];

const STATUS_STYLES = {
  'Not Started': { bg: 'bg-gray-100', text: 'text-gray-600', icon: FiClock },
  'In Progress': { bg: 'bg-blue-100', text: 'text-blue-700', icon: FiPlayCircle },
  'On Hold': { bg: 'bg-amber-100', text: 'text-amber-700', icon: FiPauseCircle },
  'Completed': { bg: 'bg-green-100', text: 'text-green-700', icon: FiCheckCircle },
};

const LOG_TYPE_STYLES = {
  'Before': { bg: 'bg-purple-50', text: 'text-purple-600', label: 'Before' },
  'Daily Progress': { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Progress' },
  'Issue/Delay': { bg: 'bg-red-50', text: 'text-red-600', label: 'Issue / Delay' },
  'Completed': { bg: 'bg-green-50', text: 'text-green-600', label: 'Completed' },
};

const fileUrl = (collectionId, recordId, filename, thumb) =>
  `https://finance.gtintl.com.ph/api/files/${collectionId}/${recordId}/${filename}${thumb ? `?thumb=${thumb}` : ''}`;

const JobDetailView = ({ jobId, onBack, units, employees }) => {
  const [job, setJob] = useState(null);
  const [progressEntries, setProgressEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [lightboxVideo, setLightboxVideo] = useState(null);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingCost, setEditingCost] = useState(false);
  const [editingWorkers, setEditingWorkers] = useState(false);
  const [workerEditSelection, setWorkerEditSelection] = useState([]);
  const [costForm, setCostForm] = useState({ materials_cost: '', cost_notes: '' });

  const fetchJob = async () => {
    setLoading(true);
    try {
      const jobRecord = await pb.collection('jobs').getOne(jobId);
      setJob(jobRecord);

      const progress = await pb.collection('job_progress').getFullList({
        filter: `job="${jobId}"`,
        sort: 'log_date,created',
      });
      setProgressEntries(progress);
    } catch (err) {
      console.error('Failed to fetch job:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [jobId]);

  useEffect(() => {
    if (job) {
      setCostForm({
        materials_cost: job.materials_cost > 0 ? String(job.materials_cost) : '',
        cost_notes: job.cost_notes || '',
      });
      setWorkerEditSelection(job.assigned_workers || []);
    }
  }, [job?.id]);

  const handleSaveCost = async () => {
    try {
      const updates = {
        materials_cost: parseFloat(costForm.materials_cost) || 0,
        cost_notes: costForm.cost_notes,
      };
      await pb.collection('jobs').update(jobId, updates);
      setJob({ ...job, ...updates });
      setEditingCost(false);
    } catch (err) {
      alert('Failed to save cost: ' + err.message);
    }
  };

  const handleSaveWorkers = async () => {
    try {
      await pb.collection('jobs').update(jobId, { assigned_workers: workerEditSelection });
      setJob({ ...job, assigned_workers: workerEditSelection });
      setEditingWorkers(false);
    } catch (err) {
      alert('Failed to save workers: ' + err.message);
    }
  };

  // Deletes a single photo or video from a job_progress entry. PocketBase
  // file fields are arrays of filenames — to remove one item, we PATCH the
  // field using the "fieldname-" subtraction syntax with the exact filename.
  // If the entry has no photos, videos, or caption left afterward, we
  // delete the whole timeline entry so it doesn't linger as an empty stub.
  const handleDeleteMedia = async (entry, field, filename) => {
    const mediaType = field === 'photos' ? 'photo' : 'video';
    if (!window.confirm(`Delete this ${mediaType}? This cannot be undone.`)) return;

    try {
      await pb.collection('job_progress').update(entry.id, {
        [`${field}-`]: [filename],
      });

      const remainingPhotos = (field === 'photos' ? entry.photos : entry.photos || []).filter(p => field === 'photos' ? p !== filename : true);
      const remainingVideos = (field === 'videos' ? entry.videos : entry.videos || []).filter(v => field === 'videos' ? v !== filename : true);
      const isNowEmpty = remainingPhotos.length === 0 && remainingVideos.length === 0 && !entry.caption;

      if (isNowEmpty) {
        await pb.collection('job_progress').delete(entry.id);
      }

      await fetchJob();
    } catch (err) {
      alert(`Failed to delete ${mediaType}: ` + err.message);
    }
  };

  // Deletes an entire progress update entry (all its photos, videos, and
  // notes at once), not just a single piece of media within it.
  const handleDeleteEntry = async (entry) => {
    if (!window.confirm('Delete this entire progress update? This will remove all its photos, videos, and notes. This cannot be undone.')) return;

    try {
      await pb.collection('job_progress').delete(entry.id);
      await fetchJob();
    } catch (err) {
      alert('Failed to delete progress update: ' + err.message);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const updates = { status: newStatus };
      if (newStatus === 'Completed' && !job.completed_date) {
        updates.completed_date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      }
      await pb.collection('jobs').update(jobId, updates);
      setJob({ ...job, ...updates });
      setEditingStatus(false);

      // Mirror the job's status onto the unit's price_list_2024 record so it's
      // visible directly in the Price List view without needing a join.
      if (job.unit) {
        try {
          const unitStatusLabel =
            newStatus === 'Completed' ? 'Ready for Sale' :
            newStatus === 'In Progress' ? `${job.job_type} In Progress` :
            newStatus === 'On Hold' ? `${job.job_type} On Hold` :
            '';
          await pb.collection('price_list_2024').update(job.unit, { current_job_status: unitStatusLabel });
        } catch (unitErr) {
          console.error('Failed to update unit current_job_status:', unitErr);
        }
      }
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  // Keyboard navigation for the photo lightbox. Must stay above the
  // early `loading || !job` return below — React requires every hook to
  // run in the same order on every render, and an early return before a
  // useEffect call causes a "rendered fewer hooks than expected" crash
  // once data finishes loading and the component re-renders past this
  // point. allPhotos is computed inline here (rather than reusing the
  // version further down) so this effect works correctly even while
  // progressEntries is still empty during the initial loading state.
  useEffect(() => {
    if (lightboxIndex === null) return;

    const flatPhotos = progressEntries.flatMap(entry =>
      (entry.photos || []).map(photo => ({
        url: fileUrl(entry.collectionId, entry.id, photo),
      }))
    );

    const handleKeyDown = (e) => {
      if (flatPhotos.length === 0) return;
      if (e.key === 'ArrowLeft') {
        setLightboxIndex(prev => (prev === null ? null : (prev - 1 + flatPhotos.length) % flatPhotos.length));
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex(prev => (prev === null ? null : (prev + 1) % flatPhotos.length));
      } else if (e.key === 'Escape') {
        setLightboxIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, progressEntries]);

  if (loading || !job) {
    return (
      <div className="bg-white rounded-[32px] p-20 text-center text-[10px] font-black uppercase tracking-widest text-gray-400 border border-gray-100">
        Loading job...
      </div>
    );
  }

  const unit = units[job.unit];
  const workers = (job.assigned_workers || []).map(id => employees[id]).filter(Boolean);
  const statusStyle = STATUS_STYLES[job.status] || STATUS_STYLES['Not Started'];

  const beforeEntries = progressEntries.filter(p => p.log_type === 'Before');
  const latestEntry = progressEntries[progressEntries.length - 1];
  const firstBeforePhoto = beforeEntries[0]?.photos?.[0];
  const latestPhoto = latestEntry?.photos?.[latestEntry.photos.length - 1];

  // Flat list of every photo across the whole timeline (oldest first, same
  // order as progressEntries), so the lightbox can navigate prev/next
  // across the entire job's gallery rather than being stuck on one entry.
  const allPhotos = progressEntries.flatMap(entry =>
    (entry.photos || []).map(photo => ({
      url: fileUrl(entry.collectionId, entry.id, photo),
      entryId: entry.id,
      filename: photo,
    }))
  );

  const openLightboxByUrl = (url) => {
    const idx = allPhotos.findIndex(p => p.url === url);
    setLightboxIndex(idx >= 0 ? idx : null);
  };

  const showPrevPhoto = () => {
    setLightboxIndex(prev => (prev === null ? null : (prev - 1 + allPhotos.length) % allPhotos.length));
  };

  const showNextPhoto = () => {
    setLightboxIndex(prev => (prev === null ? null : (prev + 1) % allPhotos.length));
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="bg-white p-4 sm:p-6 rounded-[24px] shadow-sm border border-gray-100">
        <button onClick={onBack} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 mb-4">
          <SafeIcon icon={FiArrowLeft} /> Back to Jobs
        </button>

        {job.is_job_order && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SafeIcon icon={FiDollarSign} className="text-amber-600 text-lg" />
              <div>
                <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Job Order — Down Payment Received</p>
                <p className="text-xs font-bold text-amber-900">
                  {job.customer_name || 'Customer'} {job.down_payment > 0 && `— ₱${new Intl.NumberFormat().format(job.down_payment)}`}
                </p>
              </div>
            </div>
            {job.pull_out_date && (
              <div className="text-left sm:text-right">
                <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Pull Out Date</p>
                <p className="text-sm font-black text-amber-900">{formatDate(job.pull_out_date)}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {editingStatus ? (
                <select
                  autoFocus
                  value={job.status}
                  onChange={e => handleStatusChange(e.target.value)}
                  onBlur={() => setEditingStatus(false)}
                  className="text-[9px] font-black uppercase border border-blue-200 rounded-full px-2 py-1 outline-none"
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <button
                  onClick={() => setEditingStatus(true)}
                  className={`text-[9px] px-3 py-1 rounded-full font-black uppercase ${statusStyle.bg} ${statusStyle.text} flex items-center gap-1.5`}
                >
                  <SafeIcon icon={statusStyle.icon} /> {job.status} <SafeIcon icon={FiEdit} className="text-[8px] opacity-50" />
                </button>
              )}
              <span className="text-[9px] font-bold text-gray-400 uppercase">{job.job_type}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-tight mb-1">
              {job.title || job.job_type}
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase">
              {unit ? `${unit.make} ${unit.model_engine} — Key No. ${unit.key_no}` : 'Unit not found'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {job.is_job_order && <JobOrderGenerator job={job} unit={unit} />}
            <JobReportGenerator job={job} unit={unit} workers={workers} progressEntries={progressEntries} />
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2 whitespace-nowrap"
            >
              <SafeIcon icon={FiPlus} /> Add Progress Update
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-50">
          <MetaItem icon={FiCalendar} label="Started" value={formatDate(job.start_date)} />
          <MetaItem icon={FiCalendar} label="Target" value={formatDate(job.target_date) || '—'} />
          <button onClick={() => setEditingWorkers(true)} className="text-left group">
            <div className="flex items-center gap-1 text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
              <SafeIcon icon={FiUser} /> Workers <SafeIcon icon={FiEdit} className="text-[7px] opacity-0 group-hover:opacity-50 transition-opacity" />
            </div>
            <p className="text-[11px] font-black text-gray-900 uppercase truncate">
              {workers.map(w => w.name).join(', ') || 'Unassigned'}
            </p>
          </button>
        </div>

        {/* Edit workers */}
        {editingWorkers && (
          <div className="mt-3 bg-gray-50 rounded-2xl p-4">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Assign Workers</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.values(employees).sort((a, b) => a.name.localeCompare(b.name)).map(emp => {
                const isAssigned = workerEditSelection.includes(emp.id);
                return (
                  <button
                    key={emp.id}
                    onClick={() => setWorkerEditSelection(prev =>
                      isAssigned ? prev.filter(id => id !== emp.id) : [...prev, emp.id]
                    )}
                    className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${isAssigned ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
                  >
                    {emp.name}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveWorkers} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-700 transition-all">
                Save Workers
              </button>
              <button onClick={() => setEditingWorkers(false)} className="px-4 py-2.5 bg-gray-100 text-gray-500 rounded-xl font-black text-[9px] uppercase tracking-widest">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Cost tagging */}
        <div className="mt-3 pt-3 border-t border-gray-50">
          {editingCost ? (
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Materials Cost (₱)</label>
                  <input
                    type="number" value={costForm.materials_cost}
                    onChange={e => setCostForm({ ...costForm, materials_cost: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Cost Notes</label>
                  <input
                    type="text" value={costForm.cost_notes}
                    onChange={e => setCostForm({ ...costForm, cost_notes: e.target.value })}
                    placeholder="e.g. Paint, primer, materials"
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveCost} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-700 transition-all">
                  Save Cost
                </button>
                <button onClick={() => setEditingCost(false)} className="px-4 py-2.5 bg-gray-100 text-gray-500 rounded-xl font-black text-[9px] uppercase tracking-widest">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditingCost(true)}
              className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-2xl p-4 transition-all"
            >
              <div className="flex items-center gap-2">
                <SafeIcon icon={FiDollarSign} className="text-gray-400" />
                <div className="text-left">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Materials Cost</p>
                  <p className="text-xs font-black text-gray-900">
                    {job.materials_cost > 0 ? `₱${new Intl.NumberFormat().format(job.materials_cost)}` : 'Not set'}
                    {job.cost_notes && <span className="text-gray-400 font-medium ml-1">— {job.cost_notes}</span>}
                  </p>
                </div>
              </div>
              <SafeIcon icon={FiEdit} className="text-gray-300 text-xs" />
            </button>
          )}
        </div>
      </div>

      <JobChecklist job={job} employees={employees} />

      {/* BEFORE / LATEST COMPARISON */}
      {firstBeforePhoto && latestPhoto && firstBeforePhoto !== latestPhoto && (
        <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Before &amp; Latest</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div
                className="aspect-square bg-gray-100 rounded-2xl overflow-hidden cursor-pointer"
                onClick={() => openLightboxByUrl(fileUrl(beforeEntries[0].collectionId, beforeEntries[0].id, firstBeforePhoto))}
              >
                <img src={fileUrl(beforeEntries[0].collectionId, beforeEntries[0].id, firstBeforePhoto, '600x600')} alt="Before" className="w-full h-full object-cover" />
              </div>
              <p className="text-[8px] font-black text-purple-600 uppercase tracking-widest mt-2 text-center">Before — {formatDate(beforeEntries[0].log_date)}</p>
            </div>
            <div>
              <div
                className="aspect-square bg-gray-100 rounded-2xl overflow-hidden cursor-pointer"
                onClick={() => openLightboxByUrl(fileUrl(latestEntry.collectionId, latestEntry.id, latestPhoto))}
              >
                <img src={fileUrl(latestEntry.collectionId, latestEntry.id, latestPhoto, '600x600')} alt="Latest" className="w-full h-full object-cover" />
              </div>
              <p className="text-[8px] font-black text-green-600 uppercase tracking-widest mt-2 text-center">Latest — {formatDate(latestEntry.log_date)}</p>
            </div>
          </div>
        </div>
      )}

      {/* TIMELINE */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-4 sm:p-6">
        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Progress Timeline</h2>

        {progressEntries.filter(e => (e.photos?.length > 0) || (e.videos?.length > 0) || e.caption).length === 0 ? (
          <div className="text-center py-16">
            <SafeIcon icon={FiImage} className="text-3xl text-gray-200 mb-2 mx-auto block" />
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">No progress updates yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {[...progressEntries]
              .filter(e => (e.photos?.length > 0) || (e.videos?.length > 0) || e.caption)
              .reverse()
              .map(entry => (
                <TimelineEntry
                  key={entry.id}
                  entry={entry}
                  onImageClick={openLightboxByUrl}
                  onVideoClick={setLightboxVideo}
                  onDeletePhoto={(photoFilename) => handleDeleteMedia(entry, 'photos', photoFilename)}
                  onDeleteVideo={(videoFilename) => handleDeleteMedia(entry, 'videos', videoFilename)}
                  onDeleteEntry={handleDeleteEntry}
                />
              ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddProgressModal
          job={job}
          onClose={() => setShowAddModal(false)}
          onAdded={() => { setShowAddModal(false); fetchJob(); }}
        />
      )}

      {lightboxVideo && (
        <div
          className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4"
          onClick={() => setLightboxVideo(null)}
        >
          <button className="absolute top-6 right-6 text-white p-2"><SafeIcon icon={FiX} className="text-2xl" /></button>
          <video
            src={lightboxVideo} controls autoPlay
            className="max-w-full max-h-full rounded-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {lightboxIndex !== null && allPhotos[lightboxIndex] && (
        <div
          className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-6 right-6 text-white p-2 z-10"
          >
            <SafeIcon icon={FiX} className="text-2xl" />
          </button>

          {allPhotos.length > 1 && (
            <div className="absolute top-6 left-6 text-white text-xs font-black uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-full">
              {lightboxIndex + 1} / {allPhotos.length}
            </div>
          )}

          {allPhotos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); showPrevPhoto(); }}
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 text-white p-3 bg-black/30 hover:bg-black/50 rounded-full transition-all z-10"
            >
              <SafeIcon icon={FiChevronLeft} className="text-2xl" />
            </button>
          )}

          <img
            src={allPhotos[lightboxIndex].url}
            alt=""
            className="max-w-full max-h-full rounded-2xl select-none"
            onClick={e => e.stopPropagation()}
          />

          {allPhotos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); showNextPhoto(); }}
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 text-white p-3 bg-black/30 hover:bg-black/50 rounded-full transition-all z-10"
            >
              <SafeIcon icon={FiChevronRight} className="text-2xl" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const MetaItem = ({ icon, label, value }) => (
  <div>
    <div className="flex items-center gap-1 text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
      <SafeIcon icon={icon} /> {label}
    </div>
    <p className="text-[11px] font-black text-gray-900 uppercase truncate">{value}</p>
  </div>
);

const TimelineEntry = ({ entry, onImageClick, onVideoClick, onDeletePhoto, onDeleteVideo, onDeleteEntry }) => {
  const style = LOG_TYPE_STYLES[entry.log_type] || LOG_TYPE_STYLES['Daily Progress'];
  const photos = entry.photos || [];
  const videos = entry.videos || [];

  return (
    <div className="flex gap-3 group/entry">
      <div className="flex flex-col items-center pt-1">
        <div className={`w-2.5 h-2.5 rounded-full ${style.bg.replace('50', '500')}`} />
        <div className="w-px flex-1 bg-gray-100 mt-1" />
      </div>
      <div className="flex-1 pb-2">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${style.bg} ${style.text}`}>{style.label}</span>
          <span className="text-[9px] font-bold text-gray-400">{formatDate(entry.log_date)}</span>
          {entry.created && <span className="text-[9px] font-bold text-gray-300">{formatTime(entry.created)}</span>}
          {entry.logged_by && <span className="text-[9px] font-bold text-gray-300">• {entry.logged_by}</span>}
          {onDeleteEntry && (
            <button
              onClick={() => onDeleteEntry(entry)}
              className="ml-auto text-gray-300 hover:text-red-500 opacity-0 group-hover/entry:opacity-100 sm:opacity-60 transition-opacity p-1"
              title="Delete this update"
            >
              <SafeIcon icon={FiTrash2} className="text-xs" />
            </button>
          )}
        </div>

        {entry.caption && <p className="text-xs font-medium text-gray-700 mb-2">{entry.caption}</p>}

        {(photos.length > 0 || videos.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {photos.map((photo, i) => (
              <div key={i} className="relative w-20 h-20 group">
                <div
                  className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => onImageClick(fileUrl(entry.collectionId, entry.id, photo))}
                >
                  <img src={fileUrl(entry.collectionId, entry.id, photo, '200x200')} alt="" className="w-full h-full object-cover" />
                </div>
                {onDeletePhoto && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeletePhoto(photo); }}
                    className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity"
                  >
                    <SafeIcon icon={FiX} className="text-[10px]" />
                  </button>
                )}
              </div>
            ))}
            {videos.map((video, i) => (
              <div key={i} className="relative w-20 h-20 group">
                <button
                  onClick={() => onVideoClick(fileUrl(entry.collectionId, entry.id, video))}
                  className="w-20 h-20 rounded-xl bg-gray-900 overflow-hidden flex items-center justify-center text-white hover:opacity-80 transition-opacity relative"
                >
                  <SafeIcon icon={FiVideo} className="text-lg" />
                </button>
                {onDeleteVideo && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteVideo(video); }}
                    className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity"
                  >
                    <SafeIcon icon={FiX} className="text-[10px]" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });
}

function formatTime(dateStr) {
  if (!dateStr) return null;
  // PocketBase stores UTC timestamps like "2026-06-21 13:57:14.098Z" — the
  // space instead of "T" can trip up some date parsers, so normalize it.
  const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  return new Date(normalized).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' });
}

export default JobDetailView;
