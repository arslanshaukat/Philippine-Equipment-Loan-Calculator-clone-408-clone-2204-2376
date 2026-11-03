import React, { useEffect, useState } from 'react';
import pb from '../supabase/supabase';
import { FiAward, FiStar } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const TIER_STYLES = {
  gold: { label: 'Gold', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', bar: 'bg-amber-400' },
  silver: { label: 'Silver', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300', bar: 'bg-gray-400' },
  bronze: { label: 'Bronze', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', bar: 'bg-orange-400' },
  none: { label: 'Unranked', bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-200', bar: 'bg-gray-200' },
};

function getTier(score, settings) {
  const gold = settings?.gold_threshold ?? 30;
  const silver = settings?.silver_threshold ?? 15;
  const bronze = settings?.bronze_threshold ?? 5;
  if (score >= gold) return 'gold';
  if (score >= silver) return 'silver';
  if (score >= bronze) return 'bronze';
  return 'none';
}

const LeaderboardModule = () => {
  const [rows, setRows] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentUserId = pb.authStore.model?.id;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [ledger, staffList, settingsRes] = await Promise.all([
          pb.collection('reward_points').getFullList({
            filter: 'status = "active"',
            expand: 'staff,rule',
          }),
          pb.collection('users').getFullList({ filter: 'active = true' }),
          pb.collection('reward_settings').getFullList({ filter: 'active = true' }),
        ]);
        const settingsRecord = settingsRes[0] || null;
        setSettings(settingsRecord);
        const soldWeight = settingsRecord?.units_sold_weight ?? 5;

        const byStaff = {};
        for (const staff of staffList) {
          byStaff[staff.id] = { staff, points: 0, unitsSold: 0 };
        }
        for (const entry of ledger) {
          const staffId = entry.staff;
          if (!byStaff[staffId]) continue; // skip inactive/deleted staff
          byStaff[staffId].points += entry.points;
          if (entry.expand?.rule?.event_type === 'Unit Sold') {
            byStaff[staffId].unitsSold += 1;
          }
        }

        const computed = Object.values(byStaff)
          .map((row) => {
            const weightedScore = row.points + row.unitsSold * soldWeight;
            return { ...row, weightedScore, tier: getTier(weightedScore, settingsRecord) };
          })
          .filter((row) => row.points !== 0 || row.unitsSold !== 0)
          .sort((a, b) => b.weightedScore - a.weightedScore);

        setRows(computed);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="p-10 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">Loading…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-4 bg-blue-600 rounded-full" />
        <h2 className="font-black text-gray-800 uppercase text-xs tracking-widest">Leaderboard</h2>
        <span className="text-[9px] font-bold text-gray-400 uppercase">All-time</span>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">No rankings yet.</div>
        ) : rows.map((row, i) => {
          const tier = TIER_STYLES[row.tier];
          const isMe = row.staff.id === currentUserId;
          return (
            <div key={row.staff.id} className={`p-5 flex items-center justify-between gap-4 flex-wrap ${isMe ? 'bg-blue-50/40' : ''}`}>
              <div className="flex items-center gap-4">
                <div className="w-8 text-center font-black text-gray-300 text-lg">{i + 1}</div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-gray-900 uppercase text-sm">
                      {row.staff.name || row.staff.email}
                    </span>
                    {isMe && <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase bg-blue-100 text-blue-700">You</span>}
                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase border flex items-center gap-1 ${tier.bg} ${tier.text} ${tier.border}`}>
                      <SafeIcon icon={row.tier === 'gold' ? FiAward : FiStar} className="text-[9px]" /> {tier.label}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 font-bold mt-0.5">
                    {row.points} pts earned · {row.unitsSold} unit{row.unitsSold === 1 ? '' : 's'} sold
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-gray-900 text-lg">{row.weightedScore}</div>
                <div className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">score</div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-400 font-bold mt-4 text-center">
        Score = points earned + (units sold × {settings?.units_sold_weight ?? 5}). Tiers: Bronze {settings?.bronze_threshold ?? 5}+ · Silver {settings?.silver_threshold ?? 15}+ · Gold {settings?.gold_threshold ?? 30}+
      </p>
    </div>
  );
};

export default LeaderboardModule;
