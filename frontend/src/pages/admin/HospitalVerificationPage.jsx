import React, { useState, useEffect } from 'react';
import api, { getAssetUrl } from '../../api/client';
import AppLayout from '../../components/layout/AppLayout';
import Modal from '../../components/common/Modal';

export default function HospitalVerificationPage() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectItem, setRejectItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('Invalid or unverified medical licence document');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/hospitals');
      setHospitals(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (hospitalId, name) => {
    if (!window.confirm(`Verify and approve ${name} for emergency blood requests?`)) return;
    try {
      await api.patch(`/admin/hospitals/${hospitalId}/verify`, { action: 'verify' });
      setMessage(`Hospital "${name}" has been verified successfully!`);
      fetchHospitals();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to verify hospital.');
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectItem) return;
    try {
      setSubmitting(true);
      await api.patch(`/admin/hospitals/${rejectItem.id}/verify`, {
        action: 'reject',
        reason: rejectReason,
      });
      setMessage(`Hospital "${rejectItem.name}" registration was rejected.`);
      setRejectItem(null);
      fetchHospitals();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to reject hospital.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout title="Hospital Verification Portal">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-sand-900">Hospital Medical Licence Verification</h2>
          <p className="text-xs text-sand-600 mt-1">
            Review submitted government health commission licences and approve hospitals for emergency blood request coordination.
          </p>
        </div>

        {message && (
          <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded text-xs">
            ✓ {message}
          </div>
        )}

        <div className="card bg-white p-0 overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-sand-100 border-b border-sand-200 text-sand-600 font-mono uppercase text-[11px]">
                  <th className="py-3 px-4">Hospital Name</th>
                  <th className="py-3 px-4">Registration #</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">Focal Person</th>
                  <th className="py-3 px-4">Licence Document</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-sand-500 font-mono">
                      Loading registered facilities...
                    </td>
                  </tr>
                ) : hospitals.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-sand-500">
                      No hospital registration records found.
                    </td>
                  </tr>
                ) : (
                  hospitals.map((h) => (
                    <tr key={h.id} className="hover:bg-sand-50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-sand-900">{h.name}</div>
                        <div className="text-[11px] text-sand-500">{h.address}</div>
                      </td>
                      <td className="py-3 px-4 font-mono">{h.registration_number}</td>
                      <td className="py-3 px-4">{h.city_name}</td>
                      <td className="py-3 px-4">
                        <div>{h.focal_person_name}</div>
                        <div className="text-[11px] font-mono text-sand-500">{h.focal_person_phone}</div>
                      </td>
                      <td className="py-3 px-4">
                        {h.licence_file_path || h.license_doc_path ? (
                          <a
                            href={getAssetUrl(h.licence_file_path || h.license_doc_path)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary-700 hover:underline font-mono text-[11px]"
                          >
                            📄 View Licence
                          </a>
                        ) : (
                          <span className="text-sand-400 font-mono text-[11px]">Not uploaded</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${
                          h.status === 'verified'
                            ? 'bg-teal-50 text-teal-800 border-teal-200'
                            : h.status === 'rejected'
                            ? 'bg-red-50 text-red-800 border-red-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {h.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {h.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleVerify(h.id, h.name)}
                              className="btn-primary text-[11px] py-1 px-3"
                            >
                              Approve ✓
                            </button>
                            <button
                              onClick={() => setRejectItem(h)}
                              className="btn-secondary text-[11px] py-1 px-2.5 text-red-700 hover:bg-red-50"
                            >
                              Reject ✕
                            </button>
                          </div>
                        ) : (
                          <span className="text-sand-400 text-[11px] font-mono">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reject Modal */}
        <Modal
          isOpen={!!rejectItem}
          onClose={() => setRejectItem(null)}
          title={`Reject Hospital Registration — ${rejectItem?.name}`}
        >
          <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs font-sans">
            <p className="text-sand-600">
              Please enter the official rejection reason for <strong>{rejectItem?.name}</strong>.
            </p>

            <div>
              <label className="block text-xs font-mono uppercase text-sand-700 mb-1">
                Rejection Reason:
              </label>
              <textarea
                rows="3"
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="input-field text-xs"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-sand-200">
              <button
                type="button"
                onClick={() => setRejectItem(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-danger text-xs px-4 py-2"
              >
                {submitting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
