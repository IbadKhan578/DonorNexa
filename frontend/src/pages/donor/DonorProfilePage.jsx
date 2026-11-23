import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import AppLayout from '../../components/layout/AppLayout';
import BloodChip from '../../components/common/BloodChip';

export default function DonorProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [weight, setWeight] = useState(55);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/donor/profile');
      setProfile(res.data);
      setWeight(res.data.weight);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (weight < 50) {
      alert('Weight must be at least 50 kg for blood donation eligibility.');
      return;
    }
    try {
      setUpdating(true);
      const res = await api.patch('/donor/profile', { weight: parseFloat(weight) });
      setProfile(res.data);
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to update profile.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Donor Profile">
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sand-600 text-sm font-mono">Loading profile details...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Donor Profile & Privacy Settings">
      <div className="max-w-3xl space-y-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-sand-900">Your Volunteer Donor Profile</h2>
          <p className="text-xs text-sand-600 mt-1">
            Review your verified identity, physical metrics, and privacy settings.
          </p>
        </div>

        {message && (
          <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded text-xs">
            ✓ {message}
          </div>
        )}

        <div className="card bg-white space-y-6">
          {/* Header Info */}
          <div className="flex items-center gap-4 pb-6 border-b border-sand-200">
            <div className="w-16 h-16 rounded-full bg-sand-100 border border-sand-300 flex items-center justify-center text-xl font-serif font-bold text-sand-800">
              {profile?.name?.charAt(0) || 'D'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-serif font-bold text-sand-900">{profile?.name}</h3>
                <BloodChip group={profile?.blood_group} size="sm" />
              </div>
              <p className="text-xs text-sand-600 mt-0.5">{profile?.email}</p>
              <span className="text-[11px] font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 mt-1 inline-block">
                CNIC Verified Identity
              </span>
            </div>
          </div>

          {/* Read-Only Verified Attributes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-sand-50 rounded border border-sand-200">
              <span className="text-sand-500 font-mono uppercase block text-[10px]">CNIC (Identity)</span>
              <span className="font-mono font-bold text-sand-900 text-sm">{profile?.cnic}</span>
            </div>

            <div className="p-3 bg-sand-50 rounded border border-sand-200">
              <span className="text-sand-500 font-mono uppercase block text-[10px]">Mobile Number</span>
              <span className="font-mono font-bold text-sand-900 text-sm">{profile?.phone}</span>
              <span className="text-[10px] text-sand-500 block mt-0.5">(Masked on hospital boards until accepted)</span>
            </div>

            <div className="p-3 bg-sand-50 rounded border border-sand-200">
              <span className="text-sand-500 font-mono uppercase block text-[10px]">City & Province</span>
              <span className="font-sans font-bold text-sand-900 text-sm">{profile?.city_name}</span>
            </div>

            <div className="p-3 bg-sand-50 rounded border border-sand-200">
              <span className="text-sand-500 font-mono uppercase block text-[10px]">Calculated Age (PKT)</span>
              <span className="font-mono font-bold text-sand-900 text-sm">{profile?.age} Years</span>
            </div>

            <div className="p-3 bg-sand-50 rounded border border-sand-200">
              <span className="text-sand-500 font-mono uppercase block text-[10px]">Last Donation Date</span>
              <span className="font-mono font-bold text-sand-900 text-sm">{profile?.last_donation_date || 'Never donated'}</span>
            </div>

            <div className="p-3 bg-sand-50 rounded border border-sand-200">
              <span className="text-sand-500 font-mono uppercase block text-[10px]">Cooldown Status</span>
              <span className={`font-mono font-bold text-sm ${profile?.is_eligible ? 'text-emerald-700' : 'text-amber-700'}`}>
                {profile?.is_eligible ? 'Ready to Donate (Eligible)' : `${profile?.cooldown_days_remaining} Days Remaining`}
              </span>
            </div>
          </div>

          {/* Editable Form */}
          <form onSubmit={handleUpdate} className="pt-6 border-t border-sand-200 space-y-4">
            <h4 className="text-sm font-serif font-bold text-sand-900">Update Health Metrics</h4>
            <div>
              <label className="block text-xs font-mono uppercase text-sand-700 mb-1">
                Current Weight (kg)
              </label>
              <div className="flex items-center gap-3 max-w-xs">
                <input
                  type="number"
                  step="0.5"
                  min="45"
                  max="200"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="input-field text-sm font-mono"
                />
                <button
                  type="submit"
                  disabled={updating}
                  className="btn-primary text-xs shrink-0 py-2 px-4"
                >
                  {updating ? 'Saving...' : 'Save'}
                </button>
              </div>
              <span className="text-[11px] text-sand-500 font-mono mt-1 block">
                Safety standard requires at least 50 kg to maintain donor eligibility.
              </span>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
