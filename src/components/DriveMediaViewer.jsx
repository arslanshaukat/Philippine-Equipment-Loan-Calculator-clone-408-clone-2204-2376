import React, { useState, useEffect, useCallback } from 'react';
import { FiX, FiDownload, FiChevronLeft, FiChevronRight, FiImage, FiVideo, FiLoader, FiPackage, FiAlertCircle } from 'react-icons/fi';

const VDRIVE = 'https://drive.gtintl.com.ph';

function fileUrl(file) {
  return `${VDRIVE}/pb-api/files/vdrive_files/${file.id}/${file.file}`;
}

function isVideo(mime) {
  return mime && mime.startsWith('video/');
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Safely render an icon - handles cases where icon might be undefined
function Icon({ icon: IconComponent, className = '' }) {
  if (!IconComponent) return null;
  return <IconComponent className={className} />;
}

export default function DriveMediaViewer({ folderId, unitLabel, onClose }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightbox, setLightbox] = useState(null); // index into files[]
  const [downloading, setDownloading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    if (!folderId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const url = `${VDRIVE}/pb-api/collections/vdrive_files/records?filter=folder_id%3D'${folderId}'&perPage=200&sort=order,name`;
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => setFiles(d.items || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [folderId]);

  const downloadFile = useCallback(async (file) => {
    setDownloadingId(file.id);
    try {
      const res = await fetch(fileUrl(file));
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert('Download failed: ' + e.message);
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const downloadAll = useCallback(async () => {
    if (!files.length) return;
    setDownloading(true);
    try {
      // Dynamically import JSZip (must be installed: npm i jszip)
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      await Promise.all(files.map(async (file) => {
        const res = await fetch(fileUrl(file));
        const blob = await res.blob();
        zip.file(file.name, blob);
      }));
      const content = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = `${(unitLabel || 'media').replace(/[^a-z0-9]/gi, '_')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (e) {
      // Fallback: open each file in a new tab if JSZip unavailable
      if (e.message && e.message.includes('Cannot find module')) {
        alert('Zip not available. Opening files individually...');
        files.forEach(f => window.open(fileUrl(f), '_blank'));
      } else {
        alert('Download all failed: ' + e.message);
      }
    } finally {
      setDownloading(false);
    }
  }, [files, unitLabel]);

  const prev = useCallback(() => setLightbox(l => (l > 0 ? l - 1 : files.length - 1)), [files.length]);
  const next = useCallback(() => setLightbox(l => (l < files.length - 1 ? l + 1 : 0)), [files.length]);

  useEffect(() => {
    const handler = (e) => {
      if (lightbox === null) return;
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') { e.stopPropagation(); setLightbox(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, prev, next]);

  const images = files.filter(f => !isVideo(f.mime_type));
  const videos = files.filter(f => isVideo(f.mime_type));

  return (
    <>
      {/* Modal backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-[24px] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <div className="min-w-0">
              <h3 className="font-black text-gray-900 uppercase text-sm tracking-tight truncate">
                {unitLabel || 'Media'}
              </h3>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                {loading
                  ? 'Loading...'
                  : error
                  ? 'Error loading files'
                  : `${files.length} file${files.length !== 1 ? 's' : ''} · ${images.length} photo${images.length !== 1 ? 's' : ''} · ${videos.length} video${videos.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-3 shrink-0">
              {files.length > 0 && (
                <button
                  onClick={downloadAll}
                  disabled={downloading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  <FiPackage className="text-xs" />
                  {downloading ? 'Zipping...' : 'Download All'}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all"
              >
                <FiX />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto p-5 flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <FiLoader className="text-3xl text-indigo-400 animate-spin" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-red-400">
                <FiAlertCircle className="text-4xl mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest">Failed to load media</p>
                <p className="text-[9px] text-gray-400 mt-1">{error}</p>
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                <FiImage className="text-5xl mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest">No media in this folder</p>
              </div>
            ) : (
              <>
                {/* Photos grid */}
                {images.length > 0 && (
                  <div className="mb-6">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <FiImage /> Photos ({images.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      {images.map((file) => {
                        const allIdx = files.indexOf(file);
                        return (
                          <div
                            key={file.id}
                            className="group relative rounded-[14px] overflow-hidden bg-gray-100 aspect-square cursor-pointer"
                            onClick={() => setLightbox(allIdx)}
                          >
                            <img
                              src={fileUrl(file)}
                              alt={file.name}
                              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                              loading="lazy"
                            />
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-end justify-between p-2 opacity-0 group-hover:opacity-100">
                              <span className="text-[7px] font-bold text-white truncate max-w-[70%]">{file.name}</span>
                              <button
                                onClick={e => { e.stopPropagation(); downloadFile(file); }}
                                disabled={downloadingId === file.id}
                                className="p-1.5 bg-white/20 rounded-lg hover:bg-white/40 transition-all shrink-0"
                              >
                                {downloadingId === file.id
                                  ? <FiLoader className="text-white text-xs animate-spin" />
                                  : <FiDownload className="text-white text-xs" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Videos */}
                {videos.length > 0 && (
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <FiVideo /> Videos ({videos.length})
                    </p>
                    <div className="space-y-3">
                      {videos.map(file => (
                        <div key={file.id} className="rounded-[14px] overflow-hidden bg-black">
                          <video controls className="w-full max-h-72" preload="metadata">
                            <source src={fileUrl(file)} type={file.mime_type} />
                          </video>
                          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-white truncate">{file.name}</p>
                              <p className="text-[8px] text-gray-400">{formatSize(file.size)}</p>
                            </div>
                            <button
                              onClick={() => downloadFile(file)}
                              disabled={downloadingId === file.id}
                              className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all ml-3 shrink-0"
                            >
                              {downloadingId === file.id
                                ? <FiLoader className="text-white text-sm animate-spin" />
                                : <FiDownload className="text-white text-sm" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox !== null && files[lightbox] && (
        <div
          className="fixed inset-0 z-[90] bg-black/95 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          {/* Nav buttons */}
          {files.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); prev(); }}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-3 bg-white/10 rounded-full hover:bg-white/25 transition-all z-10"
              >
                <FiChevronLeft className="text-white text-xl" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); next(); }}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-3 bg-white/10 rounded-full hover:bg-white/25 transition-all z-10"
              >
                <FiChevronRight className="text-white text-xl" />
              </button>
            </>
          )}

          {/* Media */}
          <div
            className="max-w-5xl w-full max-h-[90vh] flex flex-col items-center px-14"
            onClick={e => e.stopPropagation()}
          >
            {isVideo(files[lightbox].mime_type) ? (
              <video controls autoPlay className="max-h-[78vh] max-w-full rounded-xl">
                <source src={fileUrl(files[lightbox])} type={files[lightbox].mime_type} />
              </video>
            ) : (
              <img
                src={fileUrl(files[lightbox])}
                alt={files[lightbox].name}
                className="max-h-[78vh] max-w-full rounded-xl object-contain"
              />
            )}
            <div className="flex items-center gap-4 mt-4">
              <p className="text-white text-sm font-bold truncate max-w-xs">{files[lightbox].name}</p>
              <p className="text-gray-400 text-xs shrink-0">{lightbox + 1} / {files.length}</p>
              <button
                onClick={() => downloadFile(files[lightbox])}
                disabled={downloadingId === files[lightbox].id}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg text-white text-xs hover:bg-white/20 transition-all shrink-0"
              >
                <FiDownload /> Download
              </button>
            </div>
          </div>

          {/* Close */}
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/25 transition-all"
          >
            <FiX className="text-white" />
          </button>
        </div>
      )}
    </>
  );
}
