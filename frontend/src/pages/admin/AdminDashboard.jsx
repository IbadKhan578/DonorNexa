import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import AppLayout from '../../components/layout/AppLayout';
import StatCard from '../../components/common/StatCard';
import BloodChip from '../../components/common/BloodChip';
import StatusBadge from '../../components/common/StatusBadge';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/analytics');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Admin Analytics">
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sand-600 text-sm font-mono">Aggregating national platform statistics...</p>
        </div>
      </AppLayout>
    );
  }

  const { stats = {}, demand_supply = [], recent_logs = [] } = data || {};

  return (
    <AppLayout title="System Administration & Analytics">
      <div className="space-y-6">
        {/* Banner with Quick Shortcuts */}
        <div className="card bg-white border-l-4 border-l-primary-600 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase text-primary-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded font-semibold">
              Pakistan National Operations Center
            </span>
            <h2 className="text-2xl font-serif font-bold text-sand-900 mt-1">Platform Health & Governance</h2>
            <p className="text-xs text-sand-600">
              Coordinating emergency blood requests across registered facilities in Pakistan. Timezone: PKT (UTC+5).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link to="/admin/verification" className="btn-secondary text-xs py-2 px-3">
              Hospital Verifications ({stats.pending_hospitals || 0})
            </Link>
            <Link to="/admin/settings" className="btn-secondary text-xs py-2 px-3">
              System Tuning ⚙️
            </Link>
            <Link to="/admin/audit" className="btn-primary text-xs py-2 px-3">
              Audit Logs & CSV
            </Link>
          </div>
        </div>

        {/* 5 KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            label="Total Donors"
            value={stats.total_donors || 0}
            subtext={`${stats.eligible_donors || 0} currently eligible`}
            badgeText="Volunteers"
            badgeVariant="teal"
          />
          <StatCard
            label="Verified Hospitals"
            value={stats.verified_hospitals || 0}
            subtext={`${stats.pending_hospitals || 0} pending review`}
            badgeText={stats.pending_hospitals > 0 ? 'Pending' : 'Verified'}
            badgeVariant={stats.pending_hospitals > 0 ? 'urgent' : 'success'}
          />
          <StatCard
            label="Active Requests"
            value={stats.active_requests || 0}
            subtext="Live coordination"
            badgeText="In Progress"
            badgeVariant="critical"
          />
          <StatCard
            label="Fulfilled Units"
            value={stats.fulfilled_units || 0}
            subtext="Total transfusions"
            badgeText="Lives Saved"
            badgeVariant="success"
          />
          <StatCard
            label="Total Bank Units"
            value={stats.total_inventory_units || 0}
            subtext="Across all facilities"
            badgeText="Stock Level"
            badgeVariant="normal"
          />
        </div>

        {/* Demand vs Supply Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card bg-white">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-sand-200">
              <div>
                <h3 className="text-base font-serif font-bold text-sand-900">
                  Blood Demand vs Active Supply
                </h3>
                <p className="text-xs text-sand-600">Breakdown of requests vs available donors by group</p>
              </div>
              <span className="text-xs font-mono text-sand-500">Live Breakdown</span>
            </div>

            <div className="space-y-3">
              {demand_supply.map((item) => (
                <div key={item.blood_group} className="flex items-center justify-between p-2 rounded bg-sand-50 border border-sand-200 text-xs">
                  <div className="flex items-center gap-3">
                    <BloodChip group={item.blood_group} size="sm" />
                    <div>
                      <span className="font-semibold text-sand-900">{item.blood_group}</span>
                      <span className="text-[11px] text-sand-500 block font-mono">
                        {item.eligible_donors} Eligible Donors
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 font-mono">
                    <div className="text-right">
                      <span className="text-[10px] text-sand-500 uppercase block">Demand</span>
                      <span className="font-bold text-primary-700">{item.demand_units} Units</span>
                    </div>
                    <div className="text-right border-l border-sand-200 pl-3">
                      <span className="text-[10px] text-sand-500 uppercase block">Bank Stock</span>
                      <span className="font-bold text-teal-800">{item.inventory_units} Units</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Security & Operations Audit Trail */}
          <div className="card bg-white">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-sand-200">
              <div>
                <h3 className="text-base font-serif font-bold text-sand-900">
                  Recent Audit Trail
                </h3>
                <p className="text-xs text-sand-600">Tamper-evident logs of system actions</p>
              </div>
              <Link to="/admin/audit" className="text-xs font-mono text-primary-700 hover:underline">
                Full Log →
              </Link>
            </div>

            <div className="divide-y divide-sand-100">
              {recent_logs.length === 0 ? (
                <p className="text-xs text-sand-500 py-6 text-center">No recent audit logs.</p>
              ) : (
                recent_logs.slice(0, 6).map((log) => (
                  <div key={log.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-sand-900">{log.action}</span>
                        <span className="text-[11px] text-sand-500 font-mono">({log.entity_type})</span>
                      </div>
                      <p className="text-sand-600 text-[11px] mt-0.5 line-clamp-1">{log.details}</p>
                    </div>
                    <span className="text-[10px] font-mono text-sand-400 shrink-0">
                      {log.created_at_pkt || 'Just now'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
