import React, { useState, useRef } from 'react';
import { FiX, FiCamera, FiVideo, FiImage, FiTrash2, FiUpload } from 'react-icons/fi';
import pb from '../supabase/supabase';
import SafeIcon from '../common/SafeIcon';

const LOG_TYPES = ['Before', 'Daily Progress', 'Issue/Delay', 'Completed'];
const UPLOAD_ENDPOINT = 'https://finance.gtintl.com.ph/api/job-media/upload';
const staffMembers = ['RHEA', 'MEL', 'PRINCESS', 'ARSLAN'];

// new Date().toISOString() always returns the UTC date, which can be a day
// behind the real Manila date during early-morning hours (e.g. 1am Manila
// is still the previous day in UTC). This returns today's date as it
// actually is in Asia/Manila, formatted as YYYY-MM-DD for date inputs.
const getManilaToday = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
};

// iPhones (and some Android phones) capture photos as HEIC by default.
// Browsers cannot natively display or decode HEIC — not in <img> tags, not
// via canvas — so an unconverted HEIC file uploaded as-is shows as a blank/
// broken image forever afterward, with no error visible to the person who
// uploaded it. To prevent that, conversion failure now throws instead of
// silently falling back to the original file, so the caller can stop the
// upload and tell the user clearly rather than storing something broken.
const isHeicFile = (file) => {
  return file.type === 'image/heic' || file.type === 'image/heif' ||
    /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name);
};

const convertHeicIfNeeded = async (file) => {
  if (!isHeicFile(file)) return file;

  const heic2any = (await import('heic2any')).default;
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
  const blob = Array.isArray(result) ? result[0] : result;
  const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
  return new File([blob], newName, { type: 'image/jpeg' });
};

// Compresses a photo client-side before upload: downscales to a sensible
// max dimension and re-encodes as JPEG at a reasonable quality. Job Tracker
// can accumulate a lot of photos per job (multiple workers, daily updates),
// so this keeps storage and timeline-loading fast without needing a
// server-side compression step (unlike videos, which use the dedicated
// ffmpeg service since browser video compression isn't practical).
const MAX_PHOTO_DIMENSION = 1600; // px, long edge
const PHOTO_JPEG_QUALITY = 0.8;

const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    // Defensive guard: compressImage runs after HEIC conversion should
    // already have happened. If a HEIC file reaches here anyway, fail
    // loudly rather than letting the browser's inability to decode it
    // silently fall through as a broken upload.
    if (isHeicFile(file)) {
      reject(new Error(`"${file.name}" is still in HEIC format and could not be converted. Please try a different photo or take a new one.`));
      return;
    }

    // Skip re-encoding for already-small files — not worth the CPU cost,
    // and avoids any quality loss on images that don't need it.
    if (file.size < 300 * 1024) {
      resolve(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > MAX_PHOTO_DIMENSION || height > MAX_PHOTO_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_PHOTO_DIMENSION) / width);
          width = MAX_PHOTO_DIMENSION;
        } else {
          width = Math.round((width * MAX_PHOTO_DIMENSION) / height);
          height = MAX_PHOTO_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            // Compression failed for some reason — fall back to the
            // original file rather than losing the upload entirely.
            // Safe to fall back here since we already confirmed above
            // that this isn't a HEIC file the browser can't read at all.
            resolve(file);
            return;
          }
          const newName = file.name.replace(/\.[^/.]+$/, '.jpg');
          resolve(new File([blob], newName, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        PHOTO_JPEG_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // The browser couldn't decode this image at all (corrupt file, or an
      // unsupported format we didn't already catch above). Fail loudly
      // rather than uploading something that won't display.
      reject(new Error(`"${file.name}" could not be read as an image and was not uploaded.`));
    };

    img.src = objectUrl;
  });
};

const AddProgressModal = ({ job, onClose, onAdded }) => {
  const [logType, setLogType] = useState('Daily Progress');
  const [logDate, setLogDate] = useState(getManilaToday());
  const [caption, setCaption] = useState('');
  const [loggedBy, setLoggedBy] = useState('');
  const [photoFiles, setPhotoFiles] = useState([]);
  const [videoFiles, setVideoFiles] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompressingPhotos, setIsCompressingPhotos] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const handlePhotoSelect = async (e) => {
    const rawFiles = Array.from(e.target.files || []);
    e.target.value = ''; // allow selecting the same file again later

    setIsCompressingPhotos(true);
    const succeeded = [];
    const failedNames = [];

    for (const rawFile of rawFiles) {
      try {
        const heicConverted = await convertHeicIfNeeded(rawFile);
        const compressed = await compressImage(heicConverted);
        succeeded.push(compressed);
      } catch (err) {
        console.error(`Failed to process photo "${rawFile.name}":`, err);
        failedNames.push(rawFile.name);
      }
    }

    setIsCompressingPhotos(false);
    setPhotoFiles(prev => [...prev, ...succeeded]);

    if (failedNames.length > 0) {
      alert(
        `${failedNames.length} photo${failedNames.length > 1 ? 's' : ''} could not be processed and ` +
        `${failedNames.length > 1 ? 'were' : 'was'} not added:\n\n${failedNames.join('\n')}\n\n` +
        `This usually means the photo is in a format the browser can't read (e.g. HEIC that failed to convert). ` +
        `Try taking a new photo or selecting a different one.`
      );
    }
  };

  const handleVideoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setVideoFiles(prev => [...prev, ...files]);
  };

  const removePhoto = (idx) => setPhotoFiles(prev => prev.filter((_, i) => i !== idx));
  const removeVideo = (idx) => setVideoFiles(prev => prev.filter((_, i) => i !== idx));

  const uploadVideo = async (file) => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('job_id', job.id);
    formData.append('log_date', logDate);
    formData.append('log_type', logType);
    formData.append('caption', caption);
    formData.append('logged_by', loggedBy);

    const res = await fetch(UPLOAD_ENDPOINT, { method: 'POST', body: formData });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Video upload failed: ${text}`);
    }
    return res.json();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!loggedBy) { alert('Please select your name'); return; }
    if (photoFiles.length === 0 && videoFiles.length === 0 && !caption) {
      alert('Please add at least a photo, video, or note');
      return;
    }

    setIsSaving(true);
    try {
      // Only create a job_progress record here if there are photos or a
      // caption to save. Videos always create their own record (see
      // uploadVideo / server-side note on why appending is unreliable).
      if (photoFiles.length > 0 || caption) {
        setUploadStatus('saving-record');

        const formData = new FormData();
        formData.append('job', job.id);
        formData.append('log_date', logDate);
        formData.append('log_type', logType);
        formData.append('caption', caption);
        formData.append('logged_by', loggedBy);
        photoFiles.forEach(file => formData.append('photos', file));

        setUploadStatus('uploading-photos');
        try {
          await pb.collection('job_progress').create(formData);
        } catch (createErr) {
          if (createErr?.response) {
            console.error('Raw PocketBase error response:', JSON.stringify(createErr.response));
          }
          throw createErr;
        }
      }

      if (videoFiles.length > 0) {
        setUploadStatus('uploading-videos');
        for (const video of videoFiles) {
          await uploadVideo(video);
        }
      }

      setUploadStatus('done');
      onAdded();
    } catch (err) {
      // Log the full error object structure to the console for diagnosis —
      // PocketBase SDK versions vary in how they attach validation details.
      console.error('Progress update save failed. Full error object:', err);
      try {
        console.error('Error JSON:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
      } catch (jsonErr) {
        console.error('Could not stringify error:', jsonErr);
      }

      let detailMessage = err?.message || 'Unknown error';
      // Try every known shape PocketBase's SDK has used across versions for
      // field-level validation errors.
      const candidateData = err?.data?.data || err?.response?.data || err?.data || null;
      if (candidateData && typeof candidateData === 'object') {
        const fieldErrors = Object.entries(candidateData)
          .map(([field, info]) => `${field}: ${info?.message || info?.code || JSON.stringify(info)}`)
          .join('\n');
        if (fieldErrors) detailMessage = fieldErrors;
      }

      alert(
        'Failed to save progress update:\n\n' + detailMessage +
        '\n\n(Full details logged to browser console — please screenshot the console if this persists.)'
      );
      setUploadStatus('');
    } finally {
      setIsSaving(false);
    }
  };

  const statusLabel = {
    'saving-record': 'Saving update...',
    'uploading-photos': 'Uploading photos...',
    'uploading-videos': 'Uploading & compressing videos — this may take a minute...',
    'done': 'Done!',
  }[uploadStatus];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center sm:p-4">
      <div
        className="bg-white w-full max-w-2xl rounded-t-[24px] sm:rounded-[24px] shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: 'calc(92vh - env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
          <h3 className="text-xl font-black uppercase tracking-tight">Add Progress Update</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><SafeIcon icon={FiX} /></button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto overflow-x-hidden flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Update Type</label>
              <select
                value={logType} onChange={e => setLogType(e.target.value)}
                className="w-full max-w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none box-border"
              >
                {LOG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="min-w-0">
              <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Date</label>
              <input
                type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
                className="w-full max-w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none box-border"
                style={{ minWidth: 0 }}
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Photos</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {photoFiles.map((file, i) => (
                <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100">
                  <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button" onClick={() => removePhoto(i)}
                    className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"
                  >
                    <SafeIcon icon={FiX} className="text-[10px]" />
                  </button>
                </div>
              ))}
              <button
                type="button" onClick={() => photoInputRef.current?.click()}
                disabled={isCompressingPhotos}
                className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-all disabled:opacity-50"
              >
                <SafeIcon icon={isCompressingPhotos ? FiUpload : FiCamera} className={`text-lg ${isCompressingPhotos ? 'animate-pulse' : ''}`} />
              </button>
            </div>
            {isCompressingPhotos && (
              <p className="text-[8px] text-blue-500 font-bold uppercase tracking-widest">Compressing photos...</p>
            )}
            <input
              ref={photoInputRef} type="file" accept="image/*" multiple
              onChange={handlePhotoSelect}
              style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}
            />
          </div>

          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Videos</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {videoFiles.map((file, i) => (
                <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-900 flex items-center justify-center text-white">
                  <SafeIcon icon={FiVideo} className="text-lg" />
                  <button
                    type="button" onClick={() => removeVideo(i)}
                    className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"
                  >
                    <SafeIcon icon={FiX} className="text-[10px]" />
                  </button>
                </div>
              ))}
              <button
                type="button" onClick={() => videoInputRef.current?.click()}
                className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-all"
              >
                <SafeIcon icon={FiVideo} className="text-lg" />
              </button>
            </div>
            <input
              ref={videoInputRef} type="file" accept="video/*" multiple
              onChange={handleVideoSelect}
              style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}
            />
            <p className="text-[8px] text-gray-400 font-medium">Videos are compressed automatically after upload.</p>
          </div>

          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Notes</label>
            <textarea
              value={caption} onChange={e => setCaption(e.target.value)}
              placeholder="What's happening with the job today?"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none" rows={2}
            />
          </div>

          <div>
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 block">
              {!loggedBy ? '⚠ Select Your Name' : 'Logged By'}
            </label>
            <select
              value={loggedBy} onChange={e => setLoggedBy(e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl text-[10px] font-black uppercase outline-none ${!loggedBy ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-200 bg-gray-50'}`}
            >
              <option value="">— Select —</option>
              {staffMembers.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {uploadStatus && (
            <div className="bg-blue-50 text-blue-700 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2">
              <SafeIcon icon={FiUpload} className="animate-pulse" /> {statusLabel}
            </div>
          )}

          <button
            type="submit" disabled={isSaving}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
            style={{ marginBottom: 'env(safe-area-inset-bottom, 16px)' }}
          >
            {isSaving ? 'Saving...' : 'Save Update'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddProgressModal;
