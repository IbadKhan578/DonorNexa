import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import AppLayout from '../../components/layout/AppLayout';
import BloodChip from '../../components/common/BloodChip';
import StatusBadge from '../../components/common/StatusBadge';
import CountdownTimer from '../../components/common/CountdownTimer';
import MaskedPhone from '../../components/common/MaskedPhone';
import Modal from '../../components/common/Modal';

export default function RequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [completeMatch, setCompleteMatch] = useState(null);
  const [unitsToCredit, setUnitsToCredit] = useState(1);
  const [donationNotes, setDonationNotes] = useState('');
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Patient stabilized / alternative source found');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRequestDetail();
  }, [id]);

  const fetchRequestDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/hospital/requests/${id}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load blood request details.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteDonation = async () => {
    if (!completeMatch) return;
    try {
      setSubmitting(true);
      await api.post(`/hospital/requests/${id}/complete-donation`, {
        match_id: completeMatch.id,
        units: parseInt(unitsToCredit, 10),
        notes: donationNotes,
      });
      setCompleteMatch(null);
      setDonationNotes('');
      fetchRequestDetail();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to record completed donation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    try {
      setSubmitting(true);
      await api.post(`/hospital/requests/${id}/cancel`, {
        reason: cancelReason,
      });
      setCancelModal(false);
      fetchRequestDetail();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to cancel request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Request Details">
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sand-600 text-sm font-mono">Loading ranked donor matches...</p>
        </div>
      </AppLayout>
    );
  }

  const { request, matches = [] } = data || {};

  return (
    <AppLayout title={`Emergency Request #${id}`}>
      <div className="space-y-6">
        <div>
          <Link to="/hospital/dashboard" className="text-xs font-mono text-sand-600 hover:text-sand-900 mb-2 inline-block">
            ← Back to Hospital Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={request?.urgency} />
                <StatusBadge status={request?.status} />
                <span className="text-xs font-mono text-sand-500">Created: {request?.created_at_pkt || 'Just now'}</span>
              </div>
              <h2 className="text-2xl font-serif font-bold text-sand-900">
                Blood Coordination Request #{request?.id}
              </h2>
            </div>

            {request?.status === 'open' && (
              <button
                onClick={() => setCancelModal(true)}
                className="btn-danger text-xs py-2 px-3 self-start sm:self-auto"
              >
                Cancel Request
              </button>
            )}
          </div>
        </div>

        {/* Top Summary Card */}
        <div className="card bg-white shadow-card grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          <div className="flex items-center gap-4">
            <BloodChip group={request?.blood_group} size="lg" />
            <div>
              <span className="text-xs font-mono text-sand-500 uppercase block">Required Group</span>
              <span className="text-lg font-serif font-bold text-sand-900">{request?.blood_group} Blood</span>
              <span className="text-xs text-sand-600 block mt-0.5 font-mono">Patient: {request?.patient_id}</span>
            </div>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-sand-200 pt-3 md:pt-0 md:pl-6">
            <span className="text-xs font-mono text-sand-500 uppercase block mb-1">Fulfillment Progress</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-serif font-bold text-sand-900">
                {request?.units_fulfilled || 0} / {request?.units_needed}
              </span>
              <span className="text-xs text-sand-600 font-sans">Units Received</span>
            </div>
            <div className="w-full bg-sand-200 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-primary-600 h-full transition-all duration-500"
                style={{ width: `${Math.min(100, ((request?.units_fulfilled || 0) / request?.units_needed) * 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-sand-200 pt-3 md:pt-0 md:pl-6">
            <span className="text-xs font-mono text-sand-500 uppercase block mb-1">Time Left (Deadline)</span>
            <CountdownTimer deadlineUtc={request?.required_by} />
            <span className="text-[11px] text-sand-500 font-mono block mt-1">
              Expires automatically if unfulfilled
            </span>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-sand-200 pt-3 md:pt-0 md:pl-6">
            <span className="text-xs font-mono text-sand-500 uppercase block mb-1">Matched Donors</span>
            <div className="text-2xl font-serif font-bold text-teal-800">
              {matches.filter((m) => m.status === 'accepted').length}
              <span className="text-xs font-sans text-sand-600 font-normal ml-1.5">
                Confirmed / {matches.length} Total
              </span>
            </div>
            <span className="text-[11px] text-sand-500 font-mono block mt-1">
              Top-N ranked volunteer donors
            </span>
          </div>
        </div>

        {/* Ranked Donors Table */}
        <div className="card bg-white p-0 overflow-hidden shadow-card">
          <div className="p-4 border-b border-sand-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-serif font-bold text-sand-900">
                Ranked Eligible Donors (Top-N Algorithm)
              </h3>
              <p className="text-xs text-sand-600">
                Ranked by ABO/Rh exact match, local city proximity, recovery cooldown, and response history. Phone numbers are unlocked upon donor acceptance.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-sand-600">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              <span>Accepted = Unlocked Contact</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-sand-100 border-b border-sand-200 text-sand-600 font-mono uppercase text-[11px]">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Donor Name</th>
                  <th className="py-3 px-4">Group</th>
                  <th className="py-3 px-4">Match Score</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Match Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {matches.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-sand-500">
                      No eligible donors currently match this blood request in the system.
                    </td>
                  </tr>
                ) : (
                  matches.map((m, idx) => (
                    <tr key={m.id} className={m.status === 'accepted' ? 'bg-teal-50/40 hover:bg-teal-50' : 'hover:bg-sand-50'}>
                      <td className="py-3 px-4 font-mono font-bold text-sand-700">
                        #{idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-sand-900">{m.donor_name}</div>
                        <div className="text-[11px] text-sand-500 font-mono">Weight: {m.donor_weight} kg • Age: {m.donor_age}</div>
                      </td>
                      <td className="py-3 px-4">
                        <BloodChip group={m.donor_blood_group} size="sm" />
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-primary-700">{m.score.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sand-700">{m.donor_city}</td>
                      <td className="py-3 px-4">
                        {m.status === 'accepted' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-xs">
                              📞 {m.donor_phone}
                            </span>
                          </div>
                        ) : (
                          <MaskedPhone maskedNumber={m.donor_phone_masked} isMasked={true} />
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        {m.status === 'accepted' && request?.status === 'open' && (
                          <button
                            onClick={() => setCompleteMatch(m)}
                            className="btn-primary text-[11px] py-1 px-3 inline-block"
                          >
                            Mark Donated ✓
                          </button>
                        )}
                        {m.status === 'completed' && (
                          <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                            ✓ Donation Verified
                          </span>
                        )}
                        {m.status === 'notified' && (
                          <span className="text-[11px] font-mono text-sand-500">
                            Awaiting response
                          </span>
                        )}
                        {m.status === 'declined' && (
                          <span className="text-[11px] font-mono text-sand-400">
                            Rotated to next
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mark Donation Completed Modal */}
        <Modal
          isOpen={!!completeMatch}
          onClose={() => setCompleteMatch(null)}
          title="Verify & Record Blood Donation"
        >
          <div className="space-y-4 text-xs font-sans">
            <p className="text-sand-600">
              Confirm that donor <strong>{completeMatch?.donor_name}</strong> has arrived and completed the blood donation transfusion.
            </p>

            <div className="p-3 bg-teal-50 border border-teal-200 rounded font-mono text-[11px] space-y-1">
              <div>• Donor: <strong>{completeMatch?.donor_name}</strong> ({completeMatch?.donor_blood_group})</div>
              <div>• Request ID: <strong>#{request?.id}</strong></div>
              <div>• System Action: Increases hospital blood bank stock and starts donor's 90-day cooldown.</div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-sand-700 mb-1">
                Units Collected:
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={unitsToCredit}
                onChange={(e) => setUnitsToCredit(e.target.value)}
                className="input-field text-xs font-mono max-w-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-sand-700 mb-1">
                Clinical Remarks (Optional):
              </label>
              <input
                type="text"
                value={donationNotes}
                onChange={(e) => setDonationNotes(e.target.value)}
                placeholder="Transfusion successful, donor rested 15 mins."
                className="input-field text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-sand-200">
              <button
                type="button"
                onClick={() => setCompleteMatch(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleCompleteDonation}
                className="btn-primary text-xs px-4 py-2"
              >
                {submitting ? 'Recording...' : 'Confirm & Credit Inventory'}
              </button>
            </div>
          </div>
        </Modal>

        {/* Cancel Request Modal */}
        <Modal
          isOpen={cancelModal}
          onClose={() => setCancelModal(false)}
          title="Cancel Emergency Blood Request"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded">
              <strong>⚠️ Caution:</strong> Cancelling an active request with accepted donors in-transit impacts your hospital trust rating. Please provide an explicit clinical reason.
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-sand-700 mb-1">
                Cancellation Reason *
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="input-field text-xs"
              >
                <option value="Patient stabilized / alternative source found">Patient stabilized / alternative source found</option>
                <option value="Duplicate request entered by mistake">Duplicate request entered by mistake</option>
                <option value="Transferred to another facility">Patient transferred to another facility</option>
                <option value="Other clinical emergency resolved">Other clinical emergency resolved</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-sand-200">
              <button
                type="button"
                onClick={() => setCancelModal(false)}
                className="btn-secondary text-xs"
              >
                Keep Request Open
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleCancelRequest}
                className="btn-danger text-xs px-4 py-2"
              >
                {submitting ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
