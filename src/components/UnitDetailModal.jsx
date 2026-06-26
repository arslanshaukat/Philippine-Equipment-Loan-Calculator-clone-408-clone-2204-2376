import React, { useState, useEffect } from 'react';
import {
  FiX, FiTool, FiPlus, FiClock, FiCheckCircle, FiPauseCircle, FiPlayCircle,
  FiUsers, FiCalendar, FiChevronRight, FiImage, FiVideo, FiEdit, FiExternalLink,
  FiChevronLeft, FiSearch
} from 'react-icons/fi';
import pb from '../supabase/supabase';
import SafeIcon from '../common/SafeIcon';

const VDRIVE_URL = 'https://drive.gtintl.com.ph';
const VDRIVE_PB_API = `${VDRIVE_URL}/pb-api`; // PocketBase's REST API, exposed
// via a dedicated Nginx route (see /etc/nginx/sites-available/vdrive). The
// plain /api/ path on this domain proxies to VDrive's own Express server
// instead, which doesn't expose PocketBase's collection endpoints.

const STATUS_STYLES = {
  'Not Started': { bg: 'bg-gray-100', text: 'text-gray-600', icon: FiClock },
  'In Progress': { bg: 'bg-blue-100', text: 'text-blue-700', icon: FiPlayCircle },
  'On Hold': { bg: 'bg-amber-100', text: 'text-amber-700', icon: FiPauseCircle },
  'Completed': { bg: 'bg-green-100', text: 'text-green-700', icon: FiCheckCircle },
};

const formatPHP = (val) => {
  if (!val || val <= 0) return '-';
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(val);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });
};

const vdriveFileUrl = (collectionId, recordId, filename, thumb) =>
  `${VDRIVE_PB_API}/files/${collectionId}/${recordId}/${filename}${thumb ? `?thumb=${thumb}` : ''}`;

// onOpenJob: optional callback(jobId) — if the parent app wants to navigate
// straight into Job Tracker's detail view. If not provided, this modal just
// shows a read-only summary of jobs for the unit.
const UnitDetailModal = ({ unit, onClose, onOpenJob, onCreateJob }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [jobs, setJobs] = useState([]);
  const [employees, setEmployees] = useState({});
  const [loading, setLoading] = useState(true);
  const [vdriveFiles, setVdriveFiles] = useState([]);
  const [vdriveLoading, setVdriveLoading] = useState(false);
  const [vdriveError, setVdriveError] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [showFolderPicker, setShowFolderPicker] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const [jobRecords, employeeRecords] = await Promise.all([
          pb.collection('jobs').getFullList({ filter: `unit="${unit.id}"`, sort: '-created' }),
          pb.collection('employees').getFullList(),
        ]);
        setJobs(jobRecords);
        const empMap = {};
        employeeRecords.forEach(e => { empMap[e.id] = e; });
        setEmployees(empMap);
      } catch (err) {
        console.error('Failed to fetch jobs for unit:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [unit.id]);

  useEffect(() => {
    if (activeTab !== 'photos') return;
    fetchVdriveFiles();
  }, [activeTab, unit.vdrive_folder_id]);

  const fetchVdriveFiles = async () => {
    if (!unit.vdrive_folder_id) {
      setVdriveFiles([]);
      return;
    }
    setVdriveLoading(true);
    setVdriveError(null);
    try {
      const params = new URLSearchParams({
        perPage: '200',
        filter: `folder_id="${unit.vdrive_folder_id}"`,
        sort: 'name',
      });
      const res = await fetch(`${VDRIVE_PB_API}/collections/vdrive_files/records?${params.toString()}`);
      if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        throw new Error(`VDrive returned ${res.status}${bodyText ? `: ${bodyText.slice(0, 200)}` : ''}`);
      }
      const data = await res.json();
      setVdriveFiles(data.items || []);
    } catch (err) {
      console.error('Failed to fetch VDrive files:', err);
      setVdriveError('Could not load photos from VDrive. It may be temporarily unavailable.');
    } finally {
      setVdriveLoading(false);
    }
  };

  const photos = vdriveFiles.filter(f => f.mime_type?.startsWith('image/'));
  const videos = vdriveFiles.filter(f => f.mime_type?.startsWith('video/'));

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-t-[24px] sm:rounded-[24px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-orange-600 p-6 text-white flex justify-between items-start">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">{unit.key_no}</p>
            <h3 className="text-xl font-black uppercase tracking-tight">{unit.make} {unit.model_engine}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><SafeIcon icon={FiX} /></button>
        </div>

        <div className="flex border-b border-gray-100 px-2 overflow-x-auto">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Overview" />
          <TabButton active={activeTab === 'jobs'} onClick={() => setActiveTab('jobs')} label={`Jobs ${jobs.length > 0 ? `(${jobs.length})` : ''}`} />
          <TabButton active={activeTab === 'photos'} onClick={() => setActiveTab('photos')} label="Photos & Videos" />
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {activeTab === 'overview' && (
            <div className="space-y-3">
              <DetailRow label="Type" value={unit.type} />
              <DetailRow label="Colour" value={unit.colour} />
              <DetailRow label="Body" value={unit.body} />
              <DetailRow label="Price" value={formatPHP(unit.price)} />
              <DetailRow label="Sale Price" value={formatPHP(unit.sale_price)} />
              {unit.current_job_status && (
                <DetailRow label="Current Job Status" value={unit.current_job_status} highlight />
              )}
              {unit.remarks && <DetailRow label="Remarks" value={unit.remarks} />}
            </div>
          )}

          {activeTab === 'jobs' && (
            <div className="space-y-3">
              <button
                onClick={() => onCreateJob && onCreateJob(unit)}
                className="w-full py-3 bg-blue-50 text-blue-700 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-100 transition-all"
              >
                <SafeIcon icon={FiPlus} /> Start New Job For This Unit
              </button>

              {loading ? (
                <div className="text-center py-10 text-[10px] font-black uppercase tracking-widest text-gray-400">Loading...</div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-10">
                  <SafeIcon icon={FiTool} className="text-3xl text-gray-200 mb-2 mx-auto block" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">No jobs for this unit yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {jobs.map(job => {
                    const style = STATUS_STYLES[job.status] || STATUS_STYLES['Not Started'];
                    const workers = (job.assigned_workers || []).map(id => employees[id]).filter(Boolean);
                    return (
                      <button
                        key={job.id}
                        onClick={() => onOpenJob && onOpenJob(job.id)}
                        className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-xl p-4 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${style.bg} ${style.text} flex items-center gap-1`}>
                              <SafeIcon icon={style.icon} /> {job.status}
                            </span>
                            <span className="text-[8px] font-bold text-gray-400 uppercase">{job.job_type}</span>
                          </div>
                          <p className="text-xs font-black text-gray-900 uppercase truncate">{job.title || job.job_type}</p>
                          <div className="flex items-center gap-3 text-[9px] font-bold text-gray-400 mt-1">
                            <span className="flex items-center gap-1"><SafeIcon icon={FiCalendar} />{formatDate(job.start_date)}</span>
                            {workers.length > 0 && (
                              <span className="flex items-center gap-1"><SafeIcon icon={FiUsers} />{workers.map(w => w.name.split(' ')[0]).join(', ')}</span>
                            )}
                          </div>
                        </div>
                        {onOpenJob && <SafeIcon icon={FiChevronRight} className="text-gray-300 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <a
                  href={unit.vdrive_folder_id ? `${VDRIVE_URL}/?folder=${unit.vdrive_folder_id}` : VDRIVE_URL}
                  target="_blank" rel="noreferrer"
                  className="text-[9px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-1.5 hover:text-orange-700"
                >
                  <SafeIcon icon={FiExternalLink} /> Open in VDrive
                </a>
                <button
                  onClick={() => setShowFolderPicker(true)}
                  className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 hover:text-blue-600"
                >
                  <SafeIcon icon={FiEdit} /> {unit.vdrive_folder_id ? 'Change Folder' : 'Link Folder'}
                </button>
              </div>

              {!unit.vdrive_folder_id ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl">
                  <SafeIcon icon={FiImage} className="text-3xl text-gray-200 mb-2 mx-auto block" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">No VDrive folder linked yet</p>
                  <p className="text-[9px] text-gray-400">Tap "Link Folder" above to connect one</p>
                </div>
              ) : vdriveLoading ? (
                <div className="text-center py-10 text-[10px] font-black uppercase tracking-widest text-gray-400">Loading from VDrive...</div>
              ) : vdriveError ? (
                <div className="text-center py-10 bg-red-50 rounded-2xl">
                  <p className="text-[10px] font-bold text-red-500">{vdriveError}</p>
                </div>
              ) : photos.length === 0 && videos.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl">
                  <SafeIcon icon={FiImage} className="text-3xl text-gray-200 mb-2 mx-auto block" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">No files in this folder yet</p>
                </div>
              ) : (
                <>
                  {photos.length > 0 && (
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Photos ({photos.length})</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {photos.map((file, i) => (
                          <button
                            key={file.id}
                            onClick={() => setLightboxIndex(i)}
                            className="aspect-square bg-gray-100 rounded-xl overflow-hidden hover:opacity-80 transition-opacity"
                          >
                            <img
                              src={vdriveFileUrl(file.collectionId, file.id, file.file, '200x200')}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {videos.length > 0 && (
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Videos ({videos.length})</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {videos.map((file) => (
                          <a
                            key={file.id}
                            href={vdriveFileUrl(file.collectionId, file.id, file.file)}
                            target="_blank" rel="noreferrer"
                            className="aspect-square bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center text-white hover:opacity-80 transition-opacity"
                          >
                            <SafeIcon icon={FiVideo} className="text-xl" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div
          className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button onClick={() => setLightboxIndex(null)} className="absolute top-6 right-6 text-white p-2 z-10">
            <SafeIcon icon={FiX} className="text-2xl" />
          </button>
          {photos.length > 1 && (
            <div className="absolute top-6 left-6 text-white text-xs font-black uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-full">
              {lightboxIndex + 1} / {photos.length}
            </div>
          )}
          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => (prev - 1 + photos.length) % photos.length); }}
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 text-white p-3 bg-black/30 hover:bg-black/50 rounded-full transition-all z-10"
            >
              <SafeIcon icon={FiChevronLeft} className="text-2xl" />
            </button>
          )}
          <img
            src={vdriveFileUrl(photos[lightboxIndex].collectionId, photos[lightboxIndex].id, photos[lightboxIndex].file)}
            alt=""
            className="max-w-full max-h-full rounded-2xl select-none"
            onClick={e => e.stopPropagation()}
          />
          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => (prev + 1) % photos.length); }}
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 text-white p-3 bg-black/30 hover:bg-black/50 rounded-full transition-all z-10"
            >
              <SafeIcon icon={FiChevronRight} className="text-2xl" />
            </button>
          )}
        </div>
      )}

      {showFolderPicker && (
        <FolderPickerModal
          unit={unit}
          onClose={() => setShowFolderPicker(false)}
          onLinked={(folderId) => {
            unit.vdrive_folder_id = folderId; // reflect immediately without a full refetch
            setShowFolderPicker(false);
            fetchVdriveFiles();
          }}
        />
      )}
    </div>
  );
};

const FolderPickerModal = ({ unit, onClose, onLinked }) => {
  const [folders, setFolders] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const res = await fetch(`${VDRIVE_PB_API}/collections/vdrive_folders/records?perPage=200&sort=name`);
        const data = await res.json();
        setFolders(data.items || []);
      } catch (err) {
        console.error('Failed to fetch VDrive folders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFolders();
  }, []);

  const filteredFolders = folders.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (folder) => {
    setSaving(true);
    try {
      await pb.collection('price_list_2024').update(unit.id, { vdrive_folder_id: folder.id });
      onLinked(folder.id);
    } catch (err) {
      alert('Failed to link folder: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-[24px] sm:rounded-[24px] shadow-2xl overflow-hidden max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100">
          <h4 className="text-sm font-black text-gray-900 uppercase mb-3">Link VDrive Folder</h4>
          <div className="relative">
            <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text" placeholder="Search folders..."
              value={search} onChange={e => setSearch(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <p className="text-center py-10 text-[10px] font-black uppercase tracking-widest text-gray-400">Loading folders...</p>
          ) : filteredFolders.length === 0 ? (
            <p className="text-center py-10 text-[10px] font-black uppercase tracking-widest text-gray-400">No folders found</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredFolders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => handleSelect(folder)}
                  disabled={saving}
                  className={`w-full text-left px-5 py-3 text-xs font-bold uppercase hover:bg-gray-50 transition-all disabled:opacity-50 ${unit.vdrive_folder_id === folder.id ? 'bg-orange-50 text-orange-700' : 'text-gray-700'}`}
                >
                  {folder.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${active ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-400'}`}
  >
    {label}
  </button>
);

const DetailRow = ({ label, value, highlight }) => (
  <div className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
    <span className={`text-[11px] font-black uppercase ${highlight ? 'text-blue-600' : 'text-gray-900'}`}>{value || '—'}</span>
  </div>
);

export default UnitDetailModal;
