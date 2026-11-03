import React, { useEffect, useState } from 'react';
import pb from '../supabase/supabase';
import { FiAward, FiX } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const peso = (n) => '₱' + new Intl.NumberFormat().format(n || 0);

const MyRewardsWidget = () => {
  const [balance, setBalance] = useState(0);
  const [pesoPerPoint, setPesoPerPoint] = useState(5000);
  const [entries, setEntries] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showRedeemForm, setShowRedeemForm] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState('');
  const [redeemType, setRedeemType] = useState('cash');
  const [redeemNotes, setRedeemNotes] = useState('');
  const [redeemError, setRedeemError] = useState('');
  const [redeemSubmitting, setRedeemSubmitting] = useState(false);
  const userId = pb.authStore.model?.id;

  const load = async () => {
    if (!userId) return;
    try {
      const [ledger, settings, redemptionsList] = await Promise.all([
        pb.collection('reward_points').getFullList({
          filter: `staff = "${userId}"`,
          sort: '-created',
          expand: 'rule',
        }),
        pb.collection('reward_settings').getFullList({ filter: 'active = true' }),
        pb.collection('reward_redemptions').getFullList({
          filter: `staff = "${userId}"`,
          sort: '-created',
        }),
      ]);
      const active = ledger.filter((e) => e.status !== 'reversed');
      const pointsEarned = active.reduce((sum, e) => sum + e.points, 0);
      const pointsPending = redemptionsList
        .filter((r) => r.status === 'pending' || r.status === 'approved')
        .reduce((sum, r) => sum + r.points_used, 0);
      const pointsPaid = redemptionsList
        .filter((r) => r.status === 'paid')
        .reduce((sum, r) => sum + r.points_used, 0);
      setBalance(pointsEarned - pointsPending - pointsPaid);
      setEntries(ledger);
      setRedemptions(redemptionsList);
      setPesoPerPoint(settings[0]?.peso_per_point || 5000);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => { load(); }, [userId]);

  const handleRedeemSubmit = async (e) => {
    e.preventDefault();
    setRedeemError('');
    const pts = Number(redeemPoints);
    if (!pts || pts <= 0) {
      setRedeemError('Enter a valid point amount.');
      return;
    }
    if (pts > balance) {
      setRedeemError(`You only have ${balance} pts available.`);
      return;
    }
    setRedeemSubmitting(true);
    try {
      await pb.collection('reward_redemptions').create({
        staff: userId,
        points_used: pts,
        peso_value: pts * pesoPerPoint,
        redemption_type: redeemType,
        status: 'pending',
        notes: redeemNotes,
      });
      setShowRedeemForm(false);
      setRedeemPoints(''); setRedeemNotes(''); setRedeemType('cash');
      load();
    } catch (err) {
      setRedeemError(err?.data?.message || err.message || 'Request failed.');
    } finally {
      setRedeemSubmitting(false);
    }
  };

  if (!userId || !loaded) return null;

  const statusColor = (status) => ({
    pending: 'bg-amber-50 text-amber-600 border-amber-200',
    approved: 'bg-blue-50 text-blue-600 border-blue-200',
    paid: 'bg-green-50 text-green-600 border-green-200',
    rejected: 'bg-red-50 text-red-600 border-red-200',
  }[status] || 'bg-gray-50 text-gray-500 border-gray-200');

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all"
      >
        <SafeIcon icon={FiAward} />
        {balance} pts
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md p-6 relative max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpen(false)} className="absolute top-5 right-5 w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
              <SafeIcon icon={FiX} />
            </button>

            <div className="mb-4">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">My Rewards</p>
              <h2 className="text-2xl font-black text-gray-900 mt-1">{balance} pts</h2>
              <p className="text-[11px] text-gray-400 font-bold">≈ {peso(balance * pesoPerPoint)} available</p>
            </div>

            {!showRedeemForm ? (
              <button
                onClick={() => setShowRedeemForm(true)}
                disabled={balance <= 0}
                className="w-full bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-xl mb-6 disabled:opacity-40"
              >
                Request Redemption
              </button>
            ) : (
              <form onSubmit={handleRedeemSubmit} className="bg-gray-50 rounded-2xl p-4 mb-6 space-y-3">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Points to redeem (max {balance})</label>
                  <input required type="number" step="0.5" max={balance} value={redeemPoints} onChange={(e) => setRedeemPoints(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none" />
                  {redeemPoints && <p className="text-[10px] font-bold text-blue-600 mt-1">≈ {peso(Number(redeemPoints) * pesoPerPoint)}</p>}
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Type</label>
                  <select value={redeemType} onChange={(e) => setRedeemType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none">
                    <option value="cash">Cash</option>
                    <option value="payroll_bonus">Payroll Bonus</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Notes (optional)</label>
                  <textarea value={redeemNotes} onChange={(e) => setRedeemNotes(e.target.value)} rows={2}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none resize-none" />
                </div>
                {redeemError && <div className="text-[10px] font-black text-red-600 uppercase bg-red-50 border border-red-100 rounded-xl px-3 py-2">{redeemError}</div>}
                <div className="flex gap-2">
                  <button type="submit" disabled={redeemSubmitting} className="flex-1 bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest py-2.5 rounded-xl disabled:opacity-60">
                    {redeemSubmitting ? 'Submitting…' : 'Submit Request'}
                  </button>
                  <button type="button" onClick={() => setShowRedeemForm(false)} className="flex-1 bg-gray-100 text-gray-600 font-black text-[10px] uppercase tracking-widest py-2.5 rounded-xl">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {redemptions.length > 0 && (
              <div className="mb-6">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Redemption Requests</p>
                <div className="space-y-2">
                  {redemptions.map((r) => (
                    <div key={r.id} className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-3">
                      <div>
                        <div className="text-[10px] font-black text-gray-800 uppercase">{r.points_used} pts · {r.redemption_type.replace('_', ' ')}</div>
                        <div className="text-[9px] text-gray-400 font-bold">
                          {r.status === 'paid' && r.paid_date
                            ? <>Paid {new Date(r.paid_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}{r.payment_reference && ` · ${r.payment_reference}`}</>
                            : <>Requested {new Date(r.created).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</>}
                        </div>
                      </div>
                      <span className={`text-[8px] px-2 py-1 rounded-full font-black uppercase border ${statusColor(r.status)}`}>{r.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Points History</p>
              <div className="space-y-2">
                {entries.length === 0 ? (
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center py-6">No points yet.</p>
                ) : entries.map((e) => (
                  <div key={e.id} className={`flex justify-between items-center bg-gray-50 rounded-xl px-4 py-3 ${e.status === 'reversed' ? 'opacity-40' : ''}`}>
                    <div>
                      <div className="text-[10px] font-black text-gray-800 uppercase">
                        {e.reason || e.expand?.rule?.event_type || 'Points'}
                      </div>
                      <div className="text-[9px] text-gray-400 font-bold">
                        {new Date(e.created).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <span className={`text-[11px] font-black ${e.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {e.points >= 0 ? '+' : ''}{e.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MyRewardsWidget;
