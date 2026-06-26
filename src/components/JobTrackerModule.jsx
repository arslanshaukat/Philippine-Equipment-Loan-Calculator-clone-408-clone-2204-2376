import React, { useState, useEffect, useMemo } from 'react';
import {
  FiTool, FiPlus, FiSearch, FiX, FiClock, FiUsers, FiAlertTriangle,
  FiCheckCircle, FiPauseCircle, FiPlayCircle, FiCalendar, FiChevronRight,
  FiFilter, FiBarChart2, FiTrash2, FiDollarSign, FiGrid, FiList
} from 'react-icons/fi';
import pb from '../supabase/supabase';
import SafeIcon from '../common/SafeIcon';
import JobDetailView from './JobDetailView';
import WorkerPerformanceView from './WorkerPerformanceView';
import RoundsTracker from './RoundsTracker';

const JOB_TYPES = ['Painting', 'Mechanical', 'Detailing', 'Electrical', 'Bodywork', 'Other'];

// See AddProgressModal.jsx for why this is needed instead of
// new Date().toISOString() — avoids a day being off during early
// Manila-morning hours due to the UTC offset.
const getManilaToday = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
};
const STATUSES = ['Not Started', 'In Progress', 'On Hold', 'Completed'];
const STUCK_THRESHOLD_DAYS = 2;

const STATUS_STYLES = {
  'Not Started': { bg: 'bg-gray-100', text: 'text-gray-600', icon: FiClock },
  'In Progress': { bg: 'bg-blue-100', text: 'text-blue-700', icon: FiPlayCircle },
  'On Hold': { bg: 'bg-amber-100', text: 'text-amber-700', icon: FiPauseCircle },
  'Completed': { bg: 'bg-green-100', text: 'text-green-700', icon: FiCheckCircle },
};

const JobTrackerModule = ({ initialJobId, onConsumeInitialJobId, initialUnitIdForNewJob, onConsumeInitialUnitId }) => {
  const [jobs, setJobs] = useState([]);
  const [units, setUnits] = useState({});
  const [employees, setEmployees] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [workerFilter, setWorkerFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [prefillUnitId, setPrefillUnitId] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [showPerformanceView, setShowPerformanceView] = useState(false);
  const [showRoundsView, setShowRoundsView] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('gt_jobtracker_view_mode') || 'cards');

  useEffect(() => {
    localStorage.setItem('gt_jobtracker_view_mode', viewMode);
  }, [viewMode]);
  const [lastProgressByJob, setLastProgressByJob] = useState({});
  const [checklistStatsByJob, setChecklistStatsByJob] = useState({});

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [jobRecords, unitRecords, employeeRecords] = await Promise.all([
        pb.collection('jobs').getFullList({ sort: '-created', expand: 'unit,assigned_workers' }),
        pb.collection('price_list_2024').getFullList(),
        pb.collection('employees').getFullList({ filter: 'is_active=true' }),
      ]);

      const unitMap = {};
      unitRecords.forEach(u => { unitMap[u.id] = u; });
      setUnits(unitMap);

      const empMap = {};
      employeeRecords.forEach(e => { empMap[e.id] = e; });
      setEmployees(empMap);

      setJobs(jobRecords);

      // Fetch the most recent progress entry per job, to compute "stuck" status
      const progressMap = {};
      await Promise.all(
        jobRecords
          .filter(j => j.status === 'In Progress')
          .map(async (j) => {
            try {
              const latest = await pb.collection('job_progress').getList(1, 1, {
                filter: `job="${j.id}"`,
                sort: '-created',
              });
              if (latest.items.length > 0) {
                progressMap[j.id] = latest.items[0];
              }
            } catch (e) { /* no progress yet */ }
          })
      );
      setLastProgressByJob(progressMap);

      // Fetch all checklist items in one call and group by job, so each
      // job card can show a "3/5 tasks done" progress bar without an
      // extra request per job.
      try {
        const allChecklistItems = await pb.collection('job_checklist_items').getFullList();
        const checklistMap = {};
        allChecklistItems.forEach(item => {
          if (!checklistMap[item.job]) checklistMap[item.job] = { done: 0, total: 0 };
          checklistMap[item.job].total += 1;
          if (item.status === 'Done') checklistMap[item.job].done += 1;
        });
        setChecklistStatsByJob(checklistMap);
      } catch (e) {
        console.error('Failed to fetch checklist stats:', e);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async (job) => {
    const password = prompt('⚠️ SECURITY CLEARANCE REQUIRED\nEnter Admin Password to delete:');
    if (password === 'Subic@123') {
      try {
        await pb.collection('jobs').delete(job.id);
        setJobs(prev => prev.filter(j => j.id !== job.id));
      } catch (err) {
        alert('Failed to delete job: ' + err.message);
      }
    } else if (password !== null) {
      alert('❌ INCORRECT PASSWORD');
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // If a job id was passed in from another module (e.g. Price List's Unit
  // Detail modal), jump straight into that job's detail view once.
  useEffect(() => {
    if (initialJobId) {
      setSelectedJobId(initialJobId);
      if (onConsumeInitialJobId) onConsumeInitialJobId();
    }
  }, [initialJobId]);

  useEffect(() => {
    if (initialUnitIdForNewJob) {
      setPrefillUnitId(initialUnitIdForNewJob);
      setShowNewJobModal(true);
      if (onConsumeInitialUnitId) onConsumeInitialUnitId();
    }
  }, [initialUnitIdForNewJob]);

  const isStuck = (job) => {
    if (job.status !== 'In Progress') return false;
    const lastUpdate = lastProgressByJob[job.id]?.created || job.created;
    const daysSince = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= STUCK_THRESHOLD_DAYS;
  };

  const stuckCount = useMemo(() => jobs.filter(isStuck).length, [jobs, lastProgressByJob]);

  const filteredJobs = useMemo(() => {
    const filtered = jobs.filter(job => {
      const unit = units[job.unit];
      const matchesSearch = !searchTerm || [
        job.title, unit?.make, unit?.model_engine, unit?.key_no, job.job_type
      ].some(v => v?.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'All' || job.status === statusFilter;
      const matchesType = typeFilter === 'All' || job.job_type === typeFilter;
      const matchesWorker = workerFilter === 'All' ||
        (job.assigned_workers || []).includes(workerFilter);

      return matchesSearch && matchesStatus && matchesType && matchesWorker;
    });

    // Job Order units (customer has paid a down payment) jump to the top,
    // sorted by soonest pull-out date first, since those are the most
    // time-sensitive. Everything else keeps its original order after that.
    return [...filtered].sort((a, b) => {
      if (a.is_job_order && !b.is_job_order) return -1;
      if (!a.is_job_order && b.is_job_order) return 1;
      if (a.is_job_order && b.is_job_order) {
        const aDate = a.pull_out_date ? new Date(a.pull_out_date).getTime() : Infinity;
        const bDate = b.pull_out_date ? new Date(b.pull_out_date).getTime() : Infinity;
        return aDate - bDate;
      }
      return 0;
    });
  }, [jobs, units, searchTerm, statusFilter, typeFilter, workerFilter]);

  const daysActive = (job) => {
    if (!job.start_date) return null;
    const end = job.status === 'Completed' && job.completed_date ? new Date(job.completed_date) : new Date();
    const days = Math.floor((end - new Date(job.start_date)) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (showPerformanceView) {
    return (
      <WorkerPerformanceView
        onBack={() => setShowPerformanceView(false)}
        onOpenJob={(jobId) => { setShowPerformanceView(false); setSelectedJobId(jobId); }}
      />
    );
  }

  if (showRoundsView) {
    return (
      <RoundsTracker
        onBack={() => setShowRoundsView(false)}
        onOpenJob={(jobId) => { setShowRoundsView(false); setSelectedJobId(jobId); }}
      />
    );
  }

  if (selectedJobId) {
    return (
      <JobDetailView
        jobId={selectedJobId}
        onBack={() => { setSelectedJobId(null); fetchAll(); }}
        units={units}
        employees={employees}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="bg-white p-4 rounded-[24px] shadow-sm border border-gray-100 flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2 uppercase tracking-tighter">
            <SafeIcon icon={FiTool} className="text-blue-600" /> Job Tracker
          </h2>
          {!loading && stuckCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-red-100 whitespace-nowrap">
              <SafeIcon icon={FiAlertTriangle} />
              {stuckCount} {stuckCount === 1 ? 'Job' : 'Jobs'} Need Attention
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-0.5 bg-gray-50 rounded-xl p-1 border border-gray-100">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              title="Card view"
            >
              <SafeIcon icon={FiGrid} className="text-sm" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              title="List view"
            >
              <SafeIcon icon={FiList} className="text-sm" />
            </button>
          </div>
          <button
            onClick={() => setShowRoundsView(true)}
            className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all whitespace-nowrap"
          >
            <SafeIcon icon={FiClock} className="text-sm" /> Rounds
          </button>
          <button
            onClick={() => setShowPerformanceView(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all whitespace-nowrap"
          >
            <SafeIcon icon={FiBarChart2} className="text-sm" /> Performance
          </button>
        </div>
        <div className="flex gap-2 w-full">
          <div className="relative flex-1">
            <SafeIcon icon={FiSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Search jobs, units, workers..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-xl border transition-all ${showFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-100'}`}
          >
            <SafeIcon icon={FiFilter} />
          </button>
          <button
            onClick={() => setShowNewJobModal(true)}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2 whitespace-nowrap"
          >
            <SafeIcon icon={FiPlus} /> New Job
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-gray-50">
            <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={['All', ...STATUSES]} />
            <FilterSelect label="Job Type" value={typeFilter} onChange={setTypeFilter} options={['All', ...JOB_TYPES]} />
            <FilterSelect
              label="Worker"
              value={workerFilter}
              onChange={setWorkerFilter}
              options={['All', ...Object.values(employees).map(e => e.id)]}
              optionLabels={{ All: 'All', ...Object.fromEntries(Object.values(employees).map(e => [e.id, e.name])) }}
            />
          </div>
        )}
      </div>

      {/* JOB LIST */}
      {loading ? (
        <div className="bg-white rounded-[32px] p-20 text-center text-[10px] font-black uppercase tracking-widest text-gray-400 border border-gray-100">
          Loading jobs...
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-[32px] p-20 text-center border border-gray-100">
          <SafeIcon icon={FiTool} className="text-4xl text-gray-200 mb-3 mx-auto block" />
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">No jobs found</p>
        </div>
      ) : viewMode === 'list' ? (
        <JobListView
          jobs={filteredJobs}
          units={units}
          employees={employees}
          checklistStatsByJob={checklistStatsByJob}
          isStuck={isStuck}
          daysActive={daysActive}
          onSelectJob={setSelectedJobId}
          onDeleteJob={handleDeleteJob}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map(job => {
            const unit = units[job.unit];
            const statusStyle = STATUS_STYLES[job.status] || STATUS_STYLES['Not Started'];
            const stuck = isStuck(job);
            const workers = (job.assigned_workers || []).map(id => employees[id]).filter(Boolean);
            const lastProgress = lastProgressByJob[job.id];
            const lastPhoto = lastProgress?.photos?.[0];
            const checklistStats = checklistStatsByJob[job.id];

            return (
              <button
                key={job.id}
                onClick={() => setSelectedJobId(job.id)}
                className="bg-white rounded-[24px] border border-gray-100 shadow-sm hover:shadow-lg transition-all text-left overflow-hidden group"
              >
                {/* Thumbnail */}
                <div className="h-32 bg-gray-100 relative overflow-hidden">
                  {lastPhoto && lastProgress ? (
                    <img
                      src={`https://finance.gtintl.com.ph/api/files/${lastProgress.collectionId}/${lastProgress.id}/${lastPhoto}?thumb=400x200`}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <SafeIcon icon={FiTool} className="text-3xl" />
                    </div>
                  )}
                  {stuck && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white text-[8px] font-black uppercase px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                      <SafeIcon icon={FiAlertTriangle} /> Stuck
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteJob(job); }}
                    className="absolute top-2 left-2 bg-black/50 hover:bg-red-600 text-white p-1.5 rounded-full transition-all"
                    title="Delete job"
                  >
                    <SafeIcon icon={FiTrash2} className="text-xs" />
                  </button>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${statusStyle.bg} ${statusStyle.text} flex items-center gap-1`}>
                      <SafeIcon icon={statusStyle.icon} /> {job.status}
                    </span>
                    <span className="text-[8px] font-bold text-gray-400 uppercase">{job.job_type}</span>
                  </div>

                  {job.is_job_order && (
                    <div className="mb-2 flex items-center gap-1.5 bg-amber-500 text-white text-[8px] font-black uppercase px-2.5 py-1.5 rounded-lg w-fit shadow-sm">
                      <SafeIcon icon={FiDollarSign} /> Down Payment{job.down_payment > 0 ? ` — ₱${new Intl.NumberFormat().format(job.down_payment)}` : ''}
                    </div>
                  )}

                  <h3 className="text-sm font-black text-gray-900 uppercase mb-0.5 truncate">
                    {job.title || job.job_type}
                  </h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase mb-3 truncate">
                    {unit ? `${unit.make} ${unit.model_engine} (${unit.key_no})` : 'Unit not found'}
                  </p>

                  {checklistStats && checklistStats.total > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Checklist</span>
                        <span className="text-[8px] font-black text-gray-500 uppercase">{checklistStats.done}/{checklistStats.total}</span>
                      </div>
                      <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${Math.round((checklistStats.done / checklistStats.total) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5 text-[9px] font-bold text-gray-500">
                    <div className="flex items-start gap-1">
                      <SafeIcon icon={FiUsers} className="text-gray-300 mt-0.5 flex-shrink-0" />
                      {workers.length > 0 ? (
                        <span className="leading-tight">{workers.map(w => w.name).join(', ')}</span>
                      ) : (
                        <span className="text-gray-300">Unassigned</span>
                      )}
                    </div>
                    {daysActive(job) !== null && (
                      <div className="flex items-center gap-1">
                        <SafeIcon icon={FiCalendar} className="text-gray-300" />
                        {daysActive(job)}d active
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showNewJobModal && (
        <NewJobModal
          units={units}
          employees={employees}
          prefillUnitId={prefillUnitId}
          onClose={() => { setShowNewJobModal(false); setPrefillUnitId(null); }}
          onCreated={() => { setShowNewJobModal(false); setPrefillUnitId(null); fetchAll(); }}
        />
      )}
    </div>
  );
};

const JobListView = ({ jobs, units, employees, checklistStatsByJob, isStuck, daysActive, onSelectJob, onDeleteJob }) => {
  return (
    <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
      {/* Mobile: stacked rows */}
      <div className="sm:hidden divide-y divide-gray-50">
        {jobs.map(job => {
          const unit = units[job.unit];
          const statusStyle = STATUS_STYLES[job.status] || STATUS_STYLES['Not Started'];
          const stuck = isStuck(job);
          const workers = (job.assigned_workers || []).map(id => employees[id]).filter(Boolean);
          const checklistStats = checklistStatsByJob[job.id];

          return (
            <button
              key={job.id}
              onClick={() => onSelectJob(job.id)}
              className="w-full text-left p-4 hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${statusStyle.bg} ${statusStyle.text} flex items-center gap-1`}>
                    <SafeIcon icon={statusStyle.icon} /> {job.status}
                  </span>
                  {stuck && (
                    <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase bg-red-600 text-white flex items-center gap-1">
                      <SafeIcon icon={FiAlertTriangle} /> Stuck
                    </span>
                  )}
                  {job.is_job_order && (
                    <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase bg-amber-500 text-white flex items-center gap-1">
                      <SafeIcon icon={FiDollarSign} /> DP
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteJob(job); }}
                  className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <SafeIcon icon={FiTrash2} className="text-xs" />
                </button>
              </div>
              <h3 className="text-xs font-black text-gray-900 uppercase truncate">{job.title || job.job_type}</h3>
              <p className="text-[9px] font-bold text-gray-400 uppercase truncate mb-1.5">
                {unit ? `${unit.make} ${unit.model_engine} (${unit.key_no})` : 'Unit not found'}
              </p>
              <div className="flex items-center justify-between text-[9px] font-bold text-gray-500">
                <span className="truncate">{workers.map(w => w.name).join(', ') || 'Unassigned'}</span>
                {checklistStats && checklistStats.total > 0 && (
                  <span className="flex-shrink-0">{checklistStats.done}/{checklistStats.total}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-[9px] font-black text-gray-500 uppercase tracking-wider border-b border-gray-100">
            <tr>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3">Workers</th>
              <th className="px-4 py-3">Checklist</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {jobs.map(job => {
              const unit = units[job.unit];
              const statusStyle = STATUS_STYLES[job.status] || STATUS_STYLES['Not Started'];
              const stuck = isStuck(job);
              const workers = (job.assigned_workers || []).map(id => employees[id]).filter(Boolean);
              const checklistStats = checklistStatsByJob[job.id];
              const days = daysActive(job);

              return (
                <tr
                  key={job.id}
                  onClick={() => onSelectJob(job.id)}
                  className="hover:bg-gray-50/70 transition-all cursor-pointer group"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${statusStyle.bg} ${statusStyle.text} flex items-center gap-1 whitespace-nowrap`}>
                        <SafeIcon icon={statusStyle.icon} /> {job.status}
                      </span>
                      {stuck && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase bg-red-600 text-white whitespace-nowrap">Stuck</span>
                      )}
                      {job.is_job_order && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase bg-amber-500 text-white whitespace-nowrap">DP</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[10px] font-black text-gray-900 uppercase whitespace-nowrap">
                      {unit ? `#${unit.key_no} ${unit.make}` : 'Unknown'}
                    </div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase">{unit?.model_engine}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[10px] font-bold text-gray-700 uppercase truncate max-w-[180px]">{job.title || job.job_type}</div>
                    <div className="text-[8px] font-bold text-gray-400 uppercase">{job.job_type}</div>
                  </td>
                  <td className="px-4 py-3 text-[9px] font-bold text-gray-500 max-w-[160px]">
                    {workers.length > 0 ? workers.map(w => w.name).join(', ') : <span className="text-gray-300">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    {checklistStats && checklistStats.total > 0 ? (
                      <div className="flex items-center gap-2 w-24">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500" style={{ width: `${Math.round((checklistStats.done / checklistStats.total) * 100)}%` }} />
                        </div>
                        <span className="text-[9px] font-black text-gray-500 whitespace-nowrap">{checklistStats.done}/{checklistStats.total}</span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[9px] font-bold text-gray-500 whitespace-nowrap">
                    {days !== null ? `${days}d` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onDeleteJob(job)}
                      className="p-2 text-gray-300 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <SafeIcon icon={FiTrash2} className="text-sm" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const FilterSelect = ({ label, value, onChange, options, optionLabels }) => (
  <div>
    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 block">{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black uppercase outline-none"
    >
      {options.map(opt => (
        <option key={opt} value={opt}>{optionLabels ? optionLabels[opt] : opt}</option>
      ))}
    </select>
  </div>
);

const NewJobModal = ({ units, employees, prefillUnitId, onClose, onCreated }) => {
  const [unitSearch, setUnitSearch] = useState('');
  const [formData, setFormData] = useState({
    unit: prefillUnitId || '',
    job_type: 'Painting',
    title: '',
    assigned_workers: [],
    status: 'Not Started',
    start_date: getManilaToday(),
    target_date: '',
    notes: '',
    is_job_order: false,
    customer_name: '',
    down_payment: '',
    pull_out_date: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [createdBy, setCreatedBy] = useState('');
  const staffMembers = ['RHEA', 'MEL', 'PRINCESS', 'ARSLAN'];

  const unitList = Object.values(units).sort((a, b) => {
    const aNum = parseInt(a.key_no?.replace(/\D/g, '')) || 0;
    const bNum = parseInt(b.key_no?.replace(/\D/g, '')) || 0;
    return aNum - bNum;
  });

  const filteredUnits = unitList.filter(u =>
    !unitSearch || [u.key_no, u.make, u.model_engine, u.type].some(v => v?.toLowerCase().includes(unitSearch.toLowerCase()))
  );

  const employeeList = Object.values(employees).sort((a, b) => a.name.localeCompare(b.name));

  const toggleWorker = (id) => {
    setFormData(prev => ({
      ...prev,
      assigned_workers: prev.assigned_workers.includes(id)
        ? prev.assigned_workers.filter(w => w !== id)
        : [...prev.assigned_workers, id]
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.unit) { alert('Please select a unit'); return; }
    if (formData.assigned_workers.length === 0) { alert('Please assign at least one worker'); return; }
    if (!createdBy) { alert('Please select your name'); return; }

    setIsSaving(true);
    try {
      await pb.collection('jobs').create({
        ...formData,
        down_payment: formData.is_job_order ? (parseFloat(formData.down_payment) || 0) : 0,
        pull_out_date: formData.is_job_order && formData.pull_out_date ? formData.pull_out_date : null,
        customer_name: formData.is_job_order ? formData.customer_name : '',
        created_by: createdBy,
      });
      onCreated();
    } catch (err) {
      alert('Error creating job: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-t-[24px] sm:rounded-[24px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
          <h3 className="text-xl font-black uppercase tracking-tight">New Job</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><SafeIcon icon={FiX} /></button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Select Unit</label>
            <input
              type="text" placeholder="Search by key no, make, model..."
              value={unitSearch} onChange={e => setUnitSearch(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none mb-2"
            />
            <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
              {filteredUnits.slice(0, 50).map(u => (
                <button
                  type="button" key={u.id}
                  onClick={() => setFormData({ ...formData, unit: u.id })}
                  className={`w-full text-left px-3 py-2 text-[10px] font-bold uppercase flex items-center justify-between ${formData.unit === u.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  <span>{u.key_no} — {u.make} {u.model_engine}</span>
                  {formData.unit === u.id && <SafeIcon icon={FiCheckCircle} />}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Job Type</label>
              <select
                value={formData.job_type}
                onChange={e => setFormData({ ...formData, job_type: e.target.value })}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none"
              >
                {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Job Title</label>
            <input
              type="text" placeholder="e.g. Full repaint - white"
              value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setFormData({ ...formData, is_job_order: !formData.is_job_order })}
            className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${formData.is_job_order ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200'}`}
          >
            <span className={`text-[10px] font-black uppercase tracking-widest ${formData.is_job_order ? 'text-amber-700' : 'text-gray-500'}`}>
              This is a Job Order (customer down payment / pull-out)
            </span>
            <div className={`w-10 h-6 rounded-full p-0.5 transition-all ${formData.is_job_order ? 'bg-amber-500' : 'bg-gray-300'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.is_job_order ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </button>

          {formData.is_job_order && (
            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3.5 space-y-3">
              <div>
                <label className="text-[9px] font-black text-amber-700 uppercase mb-1 block">Customer Name</label>
                <input
                  type="text" placeholder="Juan Dela Cruz"
                  value={formData.customer_name} onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full p-3 bg-white border border-amber-200 rounded-xl text-xs font-bold outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black text-amber-700 uppercase mb-1 block">Down Payment (₱)</label>
                  <input
                    type="number" placeholder="50000"
                    value={formData.down_payment} onChange={e => setFormData({ ...formData, down_payment: e.target.value })}
                    className="w-full p-3 bg-white border border-amber-200 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-amber-700 uppercase mb-1 block">Pull Out Date</label>
                  <input
                    type="date"
                    value={formData.pull_out_date} onChange={e => setFormData({ ...formData, pull_out_date: e.target.value })}
                    className="w-full p-3 bg-white border border-amber-200 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Assign Workers</label>
            <div className="flex flex-wrap gap-2">
              {employeeList.map(emp => (
                <button
                  type="button" key={emp.id}
                  onClick={() => toggleWorker(emp.id)}
                  className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${formData.assigned_workers.includes(emp.id) ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}
                >
                  {emp.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Start Date</label>
              <input
                type="date" value={formData.start_date}
                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Target Date</label>
              <input
                type="date" value={formData.target_date}
                onChange={e => setFormData({ ...formData, target_date: e.target.value })}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Notes</label>
            <textarea
              value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none" rows={2}
            />
          </div>

          <div>
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 block">
              {!createdBy ? '⚠ Select Your Name' : 'Created By'}
            </label>
            <select
              value={createdBy} onChange={e => setCreatedBy(e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl text-[10px] font-black uppercase outline-none ${!createdBy ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-200 bg-gray-50'}`}
            >
              <option value="">— Select —</option>
              {staffMembers.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <button
            type="submit" disabled={isSaving}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            {isSaving ? 'Creating...' : 'Create Job'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default JobTrackerModule;
