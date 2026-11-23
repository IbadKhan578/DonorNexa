import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import AppLayout from '../../components/layout/AppLayout';
import StatusBadge from '../../components/common/StatusBadge';

export default function DonationHistoryPage() {
  const [donations, setDonations] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const [donRes, badgeRes] = await Promise.all([
        api.get('/donor/donations'),
        api.get('/donor/badges'),
      ]);
      setDonations(donRes.data || []);
      setBadges(badgeRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Donation History & Badges">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-sand-900">Your Donation Journey</h2>
          <p className="text-xs text-sand-600 mt-1">
            Every donation is recorded and verified by hospital staff to protect both donor recovery cycles and patient health.
          </p>
        </div>

        {/* Milestones & Badges */}
        <div className="card bg-white">
          <h3 className="text-base font-serif font-bold text-sand-900 mb-4">Milestones & Achievements</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className={`p-4 rounded-lg border text-center ${donations.length >= 1 ? 'bg-amber-50 border-amber-200' : 'bg-sand-50 border-sand-200 opacity-50'}`}>
              <div className="text-2xl mb-1">🩸</div>
              <div className="font-serif font-bold text-sm text-sand-900">First Step</div>
              <div className="text-[11px] text-sand-600 mt-0.5">Completed 1st donation</div>
              <span className="inline-block mt-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white border border-sand-200">
                {donations.length >= 1 ? 'Unlocked' : 'Locked'}
              </span>
            </div>

            <div className={`p-4 rounded-lg border text-center ${donations.length >= 3 ? 'bg-amber-50 border-amber-200' : 'bg-sand-50 border-sand-200 opacity-50'}`}>
              <div className="text-2xl mb-1">🛡️</div>
              <div className="font-serif font-bold text-sm text-sand-900">Life Guardian</div>
              <div className="text-[11px] text-sand-600 mt-0.5">Completed 3 donations</div>
              <span className="inline-block mt-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white border border-sand-200">
                {donations.length >= 3 ? 'Unlocked' : 'Locked'}
              </span>
            </div>

            <div className={`p-4 rounded-lg border text-center ${donations.length >= 5 ? 'bg-amber-50 border-amber-200' : 'bg-sand-50 border-sand-200 opacity-50'}`}>
              <div className="text-2xl mb-1">⭐</div>
              <div className="font-serif font-bold text-sm text-sand-900">Elite Saver</div>
              <div className="text-[11px] text-sand-600 mt-0.5">Completed 5 donations</div>
              <span className="inline-block mt-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white border border-sand-200">
                {donations.length >= 5 ? 'Unlocked' : 'Locked'}
              </span>
            </div>

            <div className="p-4 rounded-lg border text-center bg-teal-50 border-teal-200">
              <div className="text-2xl mb-1">🇵🇰</div>
              <div className="font-serif font-bold text-sm text-teal-900">Verified Citizen</div>
              <div className="text-[11px] text-teal-700 mt-0.5">CNIC Verified Identity</div>
              <span className="inline-block mt-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white border border-teal-200 text-teal-800">
                Verified
              </span>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="card bg-white p-0 overflow-hidden">
          <div className="p-4 border-b border-sand-200 flex items-center justify-between">
            <h3 className="text-base font-serif font-bold text-sand-900">Verified Donation Records</h3>
            <span className="text-xs font-mono text-sand-500">Total: {donations.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-sand-100 border-b border-sand-200 text-sand-600 font-mono uppercase text-[11px]">
                  <th className="py-3 px-4">Donation Date</th>
                  <th className="py-3 px-4">Hospital & Location</th>
                  <th className="py-3 px-4">Blood Units</th>
                  <th className="py-3 px-4">Verified By</th>
                  <th className="py-3 px-4">Notes / Remarks</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {donations.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-sand-500">
                      No past donations recorded on this account yet.
                    </td>
                  </tr>
                ) : (
                  donations.map((d) => (
                    <tr key={d.id} className="hover:bg-sand-50">
                      <td className="py-3 px-4 font-mono font-medium text-sand-900">{d.donation_date}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-sand-900">{d.hospital_name}</div>
                        <div className="text-[11px] text-sand-500">{d.hospital_city || 'Karachi'}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-primary-700">{d.units} Unit(s)</td>
                      <td className="py-3 px-4 text-sand-600">{d.verified_by || 'Hospital Staff'}</td>
                      <td className="py-3 px-4 text-sand-500 text-[11px]">{d.notes || 'Routine emergency response'}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status="completed" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
