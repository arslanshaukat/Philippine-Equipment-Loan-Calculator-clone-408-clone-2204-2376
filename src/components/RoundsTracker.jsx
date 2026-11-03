import React, { useState, useEffect, useMemo } from 'react';
import {
  FiClock, FiArrowLeft, FiChevronLeft, FiChevronRight, FiCheckCircle,
  FiAlertTriangle, FiXCircle, FiUser, FiTool
} from 'react-icons/fi';
import pb from '../supabase/supabase';
import SafeIcon from '../common/SafeIcon';

// 8 rounds/day: 9, 10, 11am then 2, 3, 4, 5pm.
// 12pm is the lunch break — no round.
// Each round window is that exact hour: e.g. 9am = 09:00-09:59 Manila time.
const ROUND_HOURS = [9, 10, 11, 14, 15, 16, 17];

const formatRoundLabel = (hour) => {
  const h12 = hour > 12 ? hour - 12 : hour;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${h12}:00 ${ampm}`;
};

// Returns the Manila-local hour (0-23) for a PocketBase UTC timestamp.
const getManilaHour = (utcDateStr) => {
  const normalized = utcDateStr.includes('T') ? utcDateStr : utcDateStr.replace(' ', 'T');
  const hourStr = new Date(normalized).toLocaleString('en-US', {
    hour: 'numeric', hour12: false, timeZone: 'Asia/Manila',
  });
  return parseInt(hourStr, 10) % 24;
};

// Returns YYYY-MM-DD in Manila local time.
const getManilaDateKey = (utcDateStr) => {
  const normalized = utcDateStr.includes('T') ? utcDateStr : utcDateStr.replace(' ', 'T');
  return new Date(normalized).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
};

const getTodayManila = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

const formatDisplayDate = (dateKey) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
};

const RoundsTracker = ({ onBack, onOpenJob }) => {
  const [selectedDate, setSelectedDate] = useState(getTodayManila());
  const [jobs, setJobs] = useState([]);
  const [units, setUnits] = useState({});
  const [progressEntries, setProgressEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const isToday = selectedDate === getTodayManila();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [inProgressJobs, unitRecords] = await Promise.all([
        pb.collection('jobs').getFullList({ filter: 'status="In Progress"' }),
        pb.collection('price_list_2024').getFullList(),
      ]);

      const unitMap = {};
      unitRecords.forEach(u => { unitMap[u.id] = u; });
      setUnits(unitMap);
      setJobs(inProgressJobs);

      if (inProgressJobs.length > 0) {
        const jobIds = inProgressJobs.map(j => `job="${j.id}"`).join(' || ');
        const entries = await pb.collection('job_progress').getFullList({
          filter: `(${jobIds})`,
        });
        setProgressEntries(entries);
      } else {
        setProgressEntries([]);
      }
    } catch (err) {
      console.error('Failed to fetch rounds data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Entries that fall on the currently selected Manila calendar date.
  const entriesForSelectedDay = useMemo(() => {
    return progressEntries.filter(e => getManilaDateKey(e.created) === selectedDate);
  }, [progressEntries, selectedDate]);

  // For a given round hour on the selected date, a job should only be
  // considered "should have been covered" if it existed (was created) before
  // that round's hour ended. A job created at 1:30pm should not show as
  // missed in the 9am, 10am, or 11am rounds — it didn't exist then.
  const jobExistedByRound = (job, roundHour) => {
    const jobCreatedDateKey = getManilaDateKey(job.created);
    // Job was created on a different (earlier) day — always existed for all rounds
    if (jobCreatedDateKey < selectedDate) return true;
    // Job was created on a later day — shouldn't exist at all on this day
    if (jobCreatedDateKey > selectedDate) return false;
    // Job was created on the same day — only counts from the round after creation
    const jobCreatedHour = getManilaHour(job.created);
    // The job must have been created before the end of this round's window
    // (i.e. before roundHour + 1:00) to be "expected" in this round.
    return jobCreatedHour < roundHour + 1;
  };

  const rounds = useMemo(() => {
    return ROUND_HOURS.map(hour => {
      // Only consider jobs that existed by the time this round happened.
      const relevantJobs = jobs.filter(j => jobExistedByRound(j, hour));

      const entriesThisHour = entriesForSelectedDay.filter(
        e => getManilaHour(e.created) === hour
      );

      const coveredJobIds = new Set(entriesThisHour.map(e => e.job));
      const contributors = [...new Set(
        entriesThisHour.map(e => e.logged_by).filter(Boolean)
      )];

      const coveredJobs = relevantJobs.filter(j => coveredJobIds.has(j.id));
      const missedJobs = relevantJobs.filter(j => !coveredJobIds.has(j.id));

      let status;
      if (relevantJobs.length === 0) status = 'none';
      else if (coveredJobs.length === 0) status = 'missed';
      else if (missedJobs.length === 0) status = 'complete';
      else status = 'partial';

      return { hour, entriesThisHour, coveredJobs, missedJobs, contributors, status, relevantJobs };
    });
  }, [entriesForSelectedDay, jobs, selectedDate]);

  const changeDate = (deltaDays) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + deltaDays);
    setSelectedDate(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    );
  };

  const STATUS_CONFIG = {
    complete: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: FiCheckCircle, label: 'Complete' },
    partial: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: FiAlertTriangle, label: 'Partial' },
    missed: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: FiXCircle, label: 'Missed' },
    none: { bg: 'bg-gray-50', border: 'border-gray-100', text: 'text-gray-400', icon: FiClock, label: 'No Jobs Yet' },
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-[24px] shadow-sm border border-gray-100">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 mb-3"
        >
          <SafeIcon icon={FiArrowLeft} /> Back to Jobs
        </button>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2 uppercase tracking-tighter">
            <SafeIcon icon={FiClock} className="text-blue-600" /> Rounds Tracker
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-500 transition-all"
            >
              <SafeIcon icon={FiChevronLeft} />
            </button>
            <div className="text-center px-2 min-w-[150px]">
              <p className="text-[10px] font-black text-gray-900 uppercase">
                {isToday ? 'Today' : formatDisplayDate(selectedDate).split(',')[0]}
              </p>
              <p className="text-[8px] font-bold text-gray-400 uppercase">
                {formatDisplayDate(selectedDate).split(',').slice(1).join(',')}
              </p>
            </div>
            <button
              onClick={() => changeDate(1)}
              disabled={isToday}
              className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <SafeIcon icon={FiChevronRight} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-[32px] p-20 text-center text-[10px] font-black uppercase tracking-widest text-gray-400 border border-gray-100">
          Loading rounds...
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-[32px] p-20 text-center border border-gray-100">
          <SafeIcon icon={FiTool} className="text-4xl text-gray-200 mb-3 mx-auto block" />
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">No jobs currently In Progress</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rounds.map(round => {
            const config = STATUS_CONFIG[round.status];
            return (
              <div key={round.hour} className={`bg-white rounded-[24px] shadow-sm border ${config.border} overflow-hidden`}>
                <div className={`p-4 flex items-center justify-between ${config.bg}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bg} ${config.text} border ${config.border}`}>
                      <SafeIcon icon={FiClock} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900">{formatRoundLabel(round.hour)} Round</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">
                        {round.status === 'none'
                          ? 'No jobs existed yet'
                          : `${round.coveredJobs.length}/${round.relevantJobs.length} jobs updated`}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[9px] px-3 py-1.5 rounded-full font-black uppercase flex items-center gap-1.5 ${config.bg} ${config.text} border ${config.border}`}>
                    <SafeIcon icon={config.icon} /> {config.label}
                  </span>
                </div>

                {round.contributors.length > 0 && (
                  <div className="px-4 pt-3 flex items-center gap-1.5 flex-wrap">
                    <SafeIcon icon={FiUser} className="text-gray-300 text-xs" />
                    {round.contributors.map(name => (
                      <span key={name} className="text-[8px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-black uppercase">
                        {name}
                      </span>
                    ))}
                  </div>
                )}

                {round.missedJobs.length > 0 && (
                  <div className="p-4 pt-3">
                    <p className="text-[8px] font-black text-red-500 uppercase tracking-widest mb-2">
                      Missed Jobs
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {round.missedJobs.map(job => {
                        const unit = units[job.unit];
                        return (
                          <button
                            key={job.id}
                            onClick={() => onOpenJob && onOpenJob(job.id)}
                            className="text-[9px] px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg font-bold uppercase hover:bg-red-100 transition-all"
                          >
                            {unit ? `#${unit.key_no} ${unit.make}` : job.title || job.job_type}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RoundsTracker;
