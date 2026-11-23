import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import AppLayout from '../../components/layout/AppLayout';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (actionFilter) params.action = actionFilter;
      const res = await api.get('/admin/audit', { params });
      setLogs(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const res = await api.get('/admin/export/audit-logs', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `donornexa_audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to export audit CSV.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppLayout title="Audit Trail & Security Logs">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-serif font-bold text-sand-900">Platform Security & Audit Trail</h2>
            <p className="text-xs text-sand-600 mt-1">
              Append-only, immutable transaction logs recording all state changes, match allocations, and privacy events.
            </p>
          </div>

          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="btn-secondary text-xs py-2 px-4 shrink-0 flex items-center gap-1.5"
          >
            <span>📥</span>
            <span>{exporting ? 'Generating CSV...' : 'Export Audit Log (CSV)'}</span>
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase text-sand-500">Filter Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="input-field text-xs py-1.5 px-3 max-w-xs bg-white"
          >
            <option value="">All Actions</option>
            <option value="REGISTER_DONOR">REGISTER_DONOR</option>
            <option value="REGISTER_HOSPITAL">REGISTER_HOSPITAL</option>
            <option value="VERIFY_HOSPITAL">VERIFY_HOSPITAL</option>
            <option value="CREATE_REQUEST">CREATE_REQUEST</option>
            <option value="ACCEPT_MATCH">ACCEPT_MATCH</option>
            <option value="DECLINE_MATCH">DECLINE_MATCH</option>
            <option value="COMPLETE_DONATION">COMPLETE_DONATION</option>
            <option value="CANCEL_REQUEST">CANCEL_REQUEST</option>
            <option value="ADJUST_INVENTORY">ADJUST_INVENTORY</option>
            <option value="UPDATE_SETTINGS">UPDATE_SETTINGS</option>
          </select>
        </div>

        {/* Audit Table */}
        <div className="card bg-white p-0 overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-sand-100 border-b border-sand-200 text-sand-600 font-mono uppercase text-[11px]">
                  <th className="py-3 px-4">Log ID</th>
                  <th className="py-3 px-4">Timestamp (PKT)</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Audit Details</th>
                  <th className="py-3 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-sand-500 font-mono">
                      Querying security audit records...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-sand-500">
                      No audit log records match the current filter.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-sand-50 font-mono">
                      <td className="py-3 px-4 font-bold text-sand-700">#{log.id}</td>
                      <td className="py-3 px-4 text-sand-600 whitespace-nowrap">{log.created_at_pkt || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-sand-100 text-sand-800 font-semibold text-[10px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sand-900 font-sans">
                        {log.actor_email || `User #${log.actor_id || 'System'}`}
                      </td>
                      <td className="py-3 px-4 text-sand-500 text-[11px]">
                        {log.entity_type} {log.entity_id ? `(#${log.entity_id})` : ''}
                      </td>
                      <td className="py-3 px-4 font-sans text-sand-700 text-[11px] max-w-xs truncate" title={log.details}>
                        {log.details}
                      </td>
                      <td className="py-3 px-4 text-sand-400 text-[11px]">{log.ip_address || '127.0.0.1'}</td>
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
