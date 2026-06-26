import React, { useState, useEffect, useMemo } from 'react';
import { FiArrowLeft, FiTrendingUp, FiCheckCircle, FiClock, FiBarChart2 } from 'react-icons/fi';
import pb from '../supabase/supabase';
import SafeIcon from '../common/SafeIcon';

const WorkerPerformanceView = ({ onBack, onOpenJob }) => {
  const [jobs, setJobs] = useState([]);
  const [employees, setEmployees] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [jobRecords, employeeRecords] = await Promise.all([
          pb.collection('jobs').getFullList({ sort: '-created' }),
          pb.collection('employees').getFullList({ filter: 'is_active=true' }),
        ]);
        setJobs(jobRecords);
        const empMap = {};
        employeeRecords.forEach(e => { empMap[e.id] = e; });
        setEmployees(empMap);
      } catch (err) {
        console.error('Failed to fetch performance data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const workerStats = useMemo(() => {
    const stats = {};
    Object.values(employees).forEach(emp => {
      stats[emp.id] = {
        employee: emp,
        totalJobs: 0,
        completedJobs: 0,
        inProgressJobs: 0,
        totalCompletedDays: 0,
        jobs: [],
      };
    });

    jobs.forEach(job => {
      (job.assigned_workers || []).forEach(workerId => {
        if (!stats[workerId]) return;
        stats[workerId].totalJobs += 1;
        stats[workerId].jobs.push(job);

        if (job.status === 'Completed') {
          stats[workerId].completedJobs += 1;
          if (job.start_date && job.completed_date) {
            const days = Math.floor(
              (new Date(job.completed_date) - new Date(job.start_date)) / (1000 * 60 * 60 * 24)
            );
            if (days >= 0) stats[workerId].totalCompletedDays += days;
          }
        }
        if (job.status === 'In Progress') {
          stats[workerId].inProgressJobs += 1;
        }
      });
    });

    return Object.values(stats)
      .filter(s => s.totalJobs > 0)
      .map(s => ({
        ...s,
        completionRate: s.totalJobs > 0 ? Math.round((s.completedJobs / s.totalJobs) * 100) : 0,
        avgDuration: s.completedJobs > 0 ? Math.round(s.totalCompletedDays / s.completedJobs) : null,
      }))
      .sort((a, b) => b.totalJobs - a.totalJobs);
  }, [jobs, employees]);

  const selectedWorker = workerStats.find(s => s.employee.id === selectedWorkerId);

  if (loading) {
    return (
      <div className="bg-white rounded-[32px] p-20 text-center text-[10px] font-black uppercase tracking-widest text-gray-400 border border-gray-100">
        Loading worker performance...
      </div>
    );
  }

  if (selectedWorker) {
    return (
      <div className="space-y-4">
        <div className="bg-white p-4 sm:p-6 rounded-[24px] shadow-sm border border-gray-100">
          <button onClick={() => setSelectedWorkerId(null)} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 mb-4">
            <SafeIcon icon={FiArrowLeft} /> Back to All Workers
          </button>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-tight mb-1">{selectedWorker.employee.name}</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase">{selectedWorker.employee.position} — {selectedWorker.employee.department}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-gray-50">
            <StatBlock label="Total Jobs" value={selectedWorker.totalJobs} />
            <StatBlock label="Completed" value={selectedWorker.completedJobs} />
            <StatBlock label="Completion Rate" value={`${selectedWorker.completionRate}%`} />
            <StatBlock label="Avg Duration" value={selectedWorker.avgDuration !== null ? `${selectedWorker.avgDuration}d` : '—'} />
          </div>
        </div>

        <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Job History</h2>
          <div className="space-y-2">
            {selectedWorker.jobs.map(job => (
              <button
                key={job.id}
                onClick={() => onOpenJob && onOpenJob(job.id)}
                className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-xl p-4 transition-all flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-black text-gray-900 uppercase">{job.title || job.job_type}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">{job.status} • {job.job_type}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-[24px] shadow-sm border border-gray-100">
        <button onClick={onBack} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 mb-3">
          <SafeIcon icon={FiArrowLeft} /> Back to Jobs
        </button>
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2 uppercase tracking-tighter">
          <SafeIcon icon={FiBarChart2} className="text-blue-600" /> Worker Performance
        </h2>
      </div>

      {workerStats.length === 0 ? (
        <div className="bg-white rounded-[32px] p-20 text-center border border-gray-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">No worker activity yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workerStats.map(stat => (
            <button
              key={stat.employee.id}
              onClick={() => setSelectedWorkerId(stat.employee.id)}
              className="bg-white rounded-[24px] border border-gray-100 shadow-sm hover:shadow-lg transition-all text-left p-5"
            >
              <h3 className="text-sm font-black text-gray-900 uppercase mb-0.5">{stat.employee.name}</h3>
              <p className="text-[9px] font-bold text-gray-400 uppercase mb-4">{stat.employee.position}</p>

              <div className="grid grid-cols-2 gap-2">
                <MiniStat icon={FiTrendingUp} label="Jobs" value={stat.totalJobs} />
                <MiniStat icon={FiCheckCircle} label="Completed" value={stat.completedJobs} />
                <MiniStat icon={FiClock} label="Active" value={stat.inProgressJobs} />
                <MiniStat icon={FiBarChart2} label="Rate" value={`${stat.completionRate}%`} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const StatBlock = ({ label, value }) => (
  <div>
    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
    <p className="text-lg font-black text-gray-900">{value}</p>
  </div>
);

const MiniStat = ({ icon, label, value }) => (
  <div className="bg-gray-50 rounded-xl p-2.5">
    <div className="flex items-center gap-1 text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
      <SafeIcon icon={icon} /> {label}
    </div>
    <p className="text-sm font-black text-gray-900">{value}</p>
  </div>
);

export default WorkerPerformanceView;
