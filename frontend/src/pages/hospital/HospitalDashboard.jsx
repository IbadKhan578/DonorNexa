import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import AppLayout from '../../components/layout/AppLayout';
import BloodChip from '../../components/common/BloodChip';
import StatusBadge from '../../components/common/StatusBadge';
import CountdownTimer from '../../components/common/CountdownTimer';
import StatCard from '../../components/common/StatCard';

export default function HospitalDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/hospital/dashboard');
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load hospital dashboard.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Hospital Portal">
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sand-600 text-sm font-mono">Loading hospital operations...</p>
        </div>
      </AppLayout>
    );
  }

  const { hospital, active_requests = [], stats = {} } = data || {};

  return (
    <AppLayout title="Hospital Coordination Dashboard">
      <div className="space-y-6">
        {/* Hospital Header Banner */}
        <div className="card bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-l-teal-600">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-semibold uppercase text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {hospital?.status === 'verified' ? '✓ Verified Healthcare Facility' : 'Verification Under Review'}
              </span>
              <span className="text-xs font-mono text-sand-500">Reg: {hospital?.registration_number}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-sand-900">{hospital?.name}</h2>
            <p className="text-xs text-sand-600 mt-1 font-sans">
              📍 {hospital?.address}, {hospital?.city_name} • Focal: <strong className="font-semibold text-sand-800">{hospital?.focal_person_name}</strong> ({hospital?.focal_person_phone})
            </p>
          </div>

          <Link to="/hospital/requests/new" className="btn-primary text-xs shrink-0 py-2.5 px-4 shadow-sm">
            + Create Blood Request
          </Link>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Active Requests"
            value={stats.active_requests_count || 0}
            subtext="Open emergency needs"
            badgeText={stats.active_requests_count > 0 ? 'Live Needs' : 'None'}
            badgeVariant={stats.active_requests_count > 0 ? 'critical' : 'normal'}
          />
          <StatCard
            label="Accepted Donors"
            value={stats.accepted_donors_count || 0}
            subtext="In-transit or committed"
            badgeText="Coordinating"
            badgeVariant="teal"
          />
          <StatCard
            label="Fulfilled Units"
            value={stats.fulfilled_units_total || 0}
            subtext="Transfusions secured"
            badgeText="Success"
            badgeVariant="success"
          />
          <StatCard
            label="Inventory Units"
            value={stats.total_inventory_units || 0}
            subtext="Across 8 blood groups"
            badgeText="Stock Level"
            badgeVariant="normal"
          />
        </div>

        {/* Active Emergency Requests Table */}
        <div className="card bg-white p-0 overflow-hidden">
          <div className="p-4 border-b border-sand-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-serif font-bold text-sand-900">Active Emergency Blood Requests</h3>
              <p className="text-xs text-sand-600">Monitor live donor response rates and allocate arrivals safely</p>
            </div>
            <Link to="/hospital/inventory" className="text-xs font-mono text-teal-800 hover:underline">
              View Bank Inventory →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-sand-100 border-b border-sand-200 text-sand-600 font-mono uppercase text-[11px]">
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Blood Group</th>
                  <th className="py-3 px-4">Urgency</th>
                  <th className="py-3 px-4">Units Needed</th>
                  <th className="py-3 px-4">Accepted Donors</th>
                  <th className="py-3 px-4">Deadline Left</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {active_requests.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-sand-500">
                      No active emergency requests open. Create a request to initiate automated donor ranking.
                    </td>
                  </tr>
                ) : (
                  active_requests.map((r) => (
                    <tr key={r.id} className="hover:bg-sand-50">
                      <td className="py-3 px-4 font-mono font-semibold text-sand-900">#{r.id}</td>
                      <td className="py-3 px-4">
                        <BloodChip group={r.blood_group} size="sm" />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={r.urgency} />
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold text-sand-900">{r.units_fulfilled || 0}</span> / {r.units_needed}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-mono font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {r.accepted_count || 0} Accepted
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <CountdownTimer deadlineUtc={r.required_by} />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/hospital/requests/${r.id}`}
                          className="btn-secondary text-[11px] py-1 px-3 inline-block"
                        >
                          View Ranked Donors →
                        </Link>
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
