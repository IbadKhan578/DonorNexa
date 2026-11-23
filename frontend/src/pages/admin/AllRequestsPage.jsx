import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import AppLayout from '../../components/layout/AppLayout';
import BloodChip from '../../components/common/BloodChip';
import StatusBadge from '../../components/common/StatusBadge';
import CountdownTimer from '../../components/common/CountdownTimer';

export default function AllRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/admin/requests', { params });
      setRequests(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="All Blood Requests">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-serif font-bold text-sand-900">National Blood Coordination Requests</h2>
            <p className="text-xs text-sand-600 mt-1">
              Complete oversight of all open, fulfilled, and expired emergency requests across Pakistan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-sand-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field text-xs py-1.5 px-3 max-w-xs bg-white"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="card bg-white p-0 overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-sand-100 border-b border-sand-200 text-sand-600 font-mono uppercase text-[11px]">
                  <th className="py-3 px-4">Req #</th>
                  <th className="py-3 px-4">Hospital & City</th>
                  <th className="py-3 px-4">Group</th>
                  <th className="py-3 px-4">Urgency</th>
                  <th className="py-3 px-4">Units (Rec / Need)</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-sand-500 font-mono">
                      Querying requests across facilities...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-sand-500">
                      No requests match the selected status.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="hover:bg-sand-50">
                      <td className="py-3 px-4 font-mono font-bold text-sand-700">#{r.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-sand-900">{r.hospital_name}</div>
                        <div className="text-[11px] text-sand-500">{r.city_name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <BloodChip group={r.blood_group} size="sm" />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={r.urgency} />
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <strong className="text-sand-900">{r.units_fulfilled || 0}</strong> / {r.units_needed}
                      </td>
                      <td className="py-3 px-4">
                        <CountdownTimer deadlineUtc={r.required_by} />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={r.status} />
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
