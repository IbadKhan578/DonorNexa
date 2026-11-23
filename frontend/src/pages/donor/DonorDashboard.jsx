import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import AppLayout from '../../components/layout/AppLayout';
import BloodChip from '../../components/common/BloodChip';
import StatusBadge from '../../components/common/StatusBadge';
import CountdownTimer from '../../components/common/CountdownTimer';
import StatCard from '../../components/common/StatCard';
import { useAuth } from '../../context/AuthContext';

export default function DonorDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [profRes, matchRes, donRes] = await Promise.allSettled([
        api.get('/donor/profile'),
        api.get('/donor/matches'),
        api.get('/donor/donations'),
      ]);

      if (profRes.status === 'fulfilled') {
        setProfile(profRes.value.data);
      } else {
        console.error('Profile load error:', profRes.reason);
      }

      if (matchRes.status === 'fulfilled') {
        setMatches(matchRes.value.data || []);
      }

      if (donRes.status === 'fulfilled') {
        setDonations(donRes.value.data || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async () => {
    try {
      setToggleLoading(true);
      const newStatus = !profile.is_available;
      const res = await api.patch('/donor/availability', { is_available: newStatus });
      setProfile((prev) => ({ ...prev, is_available: res.data.is_available }));
    } catch (err) {
      console.error(err);
      alert('Could not update availability.');
    } finally {
      setToggleLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Donor Dashboard">
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sand-600 text-sm font-mono">Loading donor profile...</p>
        </div>
      </AppLayout>
    );
  }

  const activeMatches = matches.filter((m) => m.status === 'notified' || m.status === 'accepted');

  return (
    <AppLayout title="Donor Dashboard">
      <div className="space-y-6">
        {/* Top Status & Eligibility Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Eligibility Card */}
          <div className="md:col-span-2 card bg-white flex flex-col sm:flex-row items-center justify-between gap-6 border-l-4 border-l-primary-600">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-sand-100 border border-sand-200 flex items-center justify-center shrink-0">
                <BloodChip group={profile?.blood_group || 'O-'} size="lg" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-serif font-bold text-sand-900">{profile?.name}</h2>
                  <span className="text-xs font-mono text-sand-500 bg-sand-100 px-2 py-0.5 rounded">
                    {profile?.city_name}
                  </span>
                </div>
                <p className="text-xs text-sand-600 mt-1">
                  Registered CNIC: <strong className="font-mono text-sand-800">{profile?.cnic}</strong> • Weight: <strong className="font-mono text-sand-800">{profile?.weight} kg</strong>
                </p>
                <div className="mt-2 flex items-center gap-2">
                  {profile?.is_eligible ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Currently Eligible to Donate
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      In Recovery Cooldown ({profile?.cooldown_days_remaining} days left)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Availability Toggle */}
            <div className="flex flex-col items-center sm:items-end gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-sand-200 pt-4 sm:pt-0 sm:pl-6 w-full sm:w-auto">
              <span className="text-xs font-mono uppercase text-sand-500 font-medium">Availability Status</span>
              <button
                onClick={handleToggleAvailability}
                disabled={toggleLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded font-sans text-xs font-semibold transition-all shadow-sm ${
                  profile?.is_available
                    ? 'bg-teal-700 text-white hover:bg-teal-800'
                    : 'bg-sand-200 text-sand-700 hover:bg-sand-300'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${profile?.is_available ? 'bg-emerald-300' : 'bg-sand-400'}`}></span>
                {profile?.is_available ? 'Active & Available' : 'Paused / Unavailable'}
              </button>
              <span className="text-[11px] text-sand-500 font-mono">
                {profile?.is_available ? 'Matching active requests' : 'Hospitals will not match you'}
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="space-y-3">
            <StatCard
              label="Completed Donations"
              value={donations.length}
              subtext="Verified at licensed hospitals"
              badgeText="Active Donor"
              badgeVariant="success"
            />
            <StatCard
              label="Pending Matched Requests"
              value={activeMatches.length}
              subtext="Requires immediate response"
              badgeText={activeMatches.length > 0 ? 'Action Needed' : 'All Clear'}
              badgeVariant={activeMatches.length > 0 ? 'critical' : 'normal'}
            />
          </div>
        </div>

        {/* Matched Requests Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-serif font-bold text-sand-900">Active Emergency Matches</h3>
              <p className="text-xs text-sand-600">Blood requests tailored to your blood group and city</p>
            </div>
            <Link to="/donor/matches" className="text-xs font-mono text-primary-700 hover:underline">
              View All Matches →
            </Link>
          </div>

          {activeMatches.length === 0 ? (
            <div className="card text-center py-12 bg-white">
              <div className="w-10 h-10 rounded-full bg-sand-100 text-sand-500 flex items-center justify-center mx-auto mb-2 text-sm font-mono">
                ✓
              </div>
              <p className="text-sm font-medium text-sand-800">No pending emergency matches</p>
              <p className="text-xs text-sand-500 mt-1 max-w-sm mx-auto">
                You will be notified immediately when a verified hospital in your city requires {profile?.blood_group} blood.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeMatches.map((m) => (
                <div key={m.id} className="card border-l-4 border-l-primary-600 bg-white shadow-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={m.urgency} />
                        <span className="text-xs font-mono text-sand-500">Match #{m.id}</span>
                      </div>
                      <h4 className="text-base font-serif font-bold text-sand-900">{m.hospital_name}</h4>
                      <p className="text-xs text-sand-600 mt-0.5">📍 {m.city_name} • Required Units: <strong className="font-mono">{m.units_needed}</strong></p>
                    </div>
                    <BloodChip group={m.blood_group} size="md" />
                  </div>

                  <div className="mt-4 pt-3 border-t border-sand-100 flex items-center justify-between text-xs">
                    <span className="text-sand-500 font-mono">Response Deadline:</span>
                    <CountdownTimer deadlineUtc={m.deadline} />
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link
                      to="/donor/matches"
                      className="btn-primary text-xs w-full text-center py-2"
                    >
                      Review & Accept Match
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Donation History */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-serif font-bold text-sand-900">Recent Donation History</h3>
              <p className="text-xs text-sand-600">Track your past contributions and recovery periods</p>
            </div>
            <Link to="/donor/history" className="text-xs font-mono text-primary-700 hover:underline">
              View History & Badges →
            </Link>
          </div>

          <div className="card overflow-x-auto p-0 bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-sand-100 border-b border-sand-200 text-sand-600 font-mono uppercase text-[11px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Hospital</th>
                  <th className="py-3 px-4">Units Donated</th>
                  <th className="py-3 px-4">Verified By</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100 font-sans">
                {donations.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-sand-500">
                      No recorded donations yet.
                    </td>
                  </tr>
                ) : (
                  donations.slice(0, 5).map((d) => (
                    <tr key={d.id} className="hover:bg-sand-50">
                      <td className="py-3 px-4 font-mono font-medium text-sand-900">{d.donation_date}</td>
                      <td className="py-3 px-4 font-medium text-sand-900">{d.hospital_name}</td>
                      <td className="py-3 px-4 font-mono">{d.units} Unit(s)</td>
                      <td className="py-3 px-4 text-sand-600">{d.verified_by || 'Hospital Staff'}</td>
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
