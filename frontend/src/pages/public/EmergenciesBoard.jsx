import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Logo from '../../components/common/Logo';
import BloodChip from '../../components/common/BloodChip';
import StatusBadge from '../../components/common/StatusBadge';
import CountdownTimer from '../../components/common/CountdownTimer';
import { useAuth } from '../../context/AuthContext';

export default function EmergenciesBoard() {
  const { user } = useAuth();
  const [emergencies, setEmergencies] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedUrgency, setSelectedUrgency] = useState('ALL');

  const bloodGroups = ['ALL', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  useEffect(() => {
    fetchEmergencies();
    fetchCities();
  }, [selectedGroup, selectedCity, selectedUrgency]);

  const fetchCities = async () => {
    try {
      const res = await api.get('/public/cities');
      setCities(res.data || []);
    } catch (err) {
      console.error('Failed to load cities:', err);
    }
  };

  const fetchEmergencies = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedGroup !== 'ALL') params.blood_group = selectedGroup;
      if (selectedCity !== 'ALL') params.city_id = selectedCity;
      if (selectedUrgency !== 'ALL') params.urgency = selectedUrgency.toLowerCase();

      const res = await api.get('/public/emergencies', { params });
      setEmergencies(res.data || []);
    } catch (err) {
      console.error('Failed to fetch emergencies:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col font-sans">
      {/* Navigation */}
      <header className="bg-white border-b border-sand-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sand-600 hover:text-sand-900 text-sm font-medium px-3 py-1.5">Home</Link>
            {user ? (
              <Link
                to={user.role === 'donor' ? '/donor/dashboard' : user.role === 'hospital' ? '/hospital/dashboard' : '/admin/dashboard'}
                className="btn-primary text-xs"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-xs">Sign In</Link>
                <Link to="/register/donor" className="btn-primary text-xs">Become a Donor</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-sand-100 border-b border-sand-200 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-600 animate-pulse"></span>
                <span className="text-xs font-mono font-medium uppercase tracking-wider text-primary-700">Live Coordination Board</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-sand-900">Active Emergency Blood Requests</h1>
              <p className="text-sand-600 text-sm mt-1 max-w-2xl font-sans">
                Real-time emergency requests verified by licensed hospitals across Pakistan. Donor privacy and hospital accountability protected.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-sand-600 bg-white border border-sand-200 px-3 py-2 rounded">
              <span>Timezone: <strong className="text-sand-900">PKT (UTC+5)</strong></span>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap items-center gap-3 pt-4 border-t border-sand-200">
            {/* Blood Groups */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <span className="text-xs text-sand-500 font-mono uppercase mr-1">Group:</span>
              {bloodGroups.map((bg) => (
                <button
                  key={bg}
                  onClick={() => setSelectedGroup(bg)}
                  className={`px-2.5 py-1 text-xs rounded font-mono font-semibold transition-colors ${
                    selectedGroup === bg
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-sand-700 border border-sand-200 hover:border-sand-400'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>

            {/* City Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-sand-500 font-mono uppercase">City:</span>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="input-field text-xs py-1 px-2.5 bg-white max-w-[150px]"
              >
                <option value="ALL">All Cities</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Urgency Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-sand-500 font-mono uppercase">Urgency:</span>
              <select
                value={selectedUrgency}
                onChange={(e) => setSelectedUrgency(e.target.value)}
                className="input-field text-xs py-1 px-2.5 bg-white max-w-[130px]"
              >
                <option value="ALL">All Levels</option>
                <option value="critical">Critical</option>
                <option value="urgent">Urgent</option>
                <option value="normal">Normal</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sand-600 text-sm font-mono">Loading active emergencies...</p>
          </div>
        ) : emergencies.length === 0 ? (
          <div className="card text-center py-16">
            <div className="w-12 h-12 rounded-full bg-sand-100 text-sand-500 flex items-center justify-center mx-auto mb-3 font-mono text-lg">
              ✓
            </div>
            <h3 className="text-base font-serif font-bold text-sand-900">No Active Emergencies Matching Criteria</h3>
            <p className="text-xs text-sand-600 mt-1 max-w-sm mx-auto">
              There are currently no unfilled emergency requests for the selected filters. Check back soon or register as a donor to be notified instantly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {emergencies.map((req) => (
              <div
                key={req.id}
                className={`card flex flex-col justify-between transition-shadow hover:shadow-card-hover ${
                  req.urgency === 'critical' ? 'border-primary-300 ring-1 ring-primary-100' : ''
                }`}
              >
                <div>
                  {/* Top Bar: Group + Urgency */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <BloodChip group={req.blood_group} size="lg" />
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={req.urgency} />
                      <span className="text-[11px] font-mono text-sand-500">
                        Units: <strong className="text-sand-900">{req.fulfilled_units || 0}/{req.units_needed}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Hospital & Location */}
                  <h3 className="text-base font-serif font-bold text-sand-900 line-clamp-1">
                    {req.hospital_name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-sand-600 font-sans mt-0.5">
                    <span>📍 {req.city_name || 'Pakistan'}</span>
                    <span>•</span>
                    <span className="font-mono text-[11px] text-teal-700 bg-teal-50 px-1 rounded">Verified Hospital</span>
                  </div>

                  {/* Privacy protected note */}
                  <p className="text-xs text-sand-500 mt-3 bg-sand-50 p-2 rounded border border-sand-200">
                    <span className="font-semibold text-sand-700">Patient & Ward Details:</span> Protected. Disclosed directly to confirmed, verified donors only.
                  </p>

                  {/* Deadline & Expiry */}
                  <div className="mt-4 pt-3 border-t border-sand-100 flex items-center justify-between text-xs">
                    <span className="text-sand-500 font-mono">Time Left:</span>
                    <CountdownTimer deadlineUtc={req.deadline} />
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-5 pt-3 border-t border-sand-200">
                  {user && user.role === 'donor' ? (
                    <Link
                      to="/donor/matches"
                      className="btn-primary w-full text-center text-xs py-2"
                    >
                      View & Accept Match
                    </Link>
                  ) : (
                    <Link
                      to="/login"
                      state={{ from: '/emergencies' }}
                      className="btn-primary w-full text-center text-xs py-2"
                    >
                      Sign In to Respond
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-sand-100 border-t border-sand-200 py-6 text-center text-xs text-sand-500 font-mono">
        DonorNexa Pakistan • Emergency Blood Donor Coordination Portal • Asia/Karachi Timezone
      </footer>
    </div>
  );
}
