import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import AppLayout from '../../components/layout/AppLayout';
import BloodChip from '../../components/common/BloodChip';
import StatusBadge from '../../components/common/StatusBadge';
import CountdownTimer from '../../components/common/CountdownTimer';
import Modal from '../../components/common/Modal';

export default function MatchedRequestsPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [modalType, setModalType] = useState(null); // 'accept' | 'decline'
  const [declineReason, setDeclineReason] = useState('Feeling unwell');
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const res = await api.get('/donor/matches');
      setMatches(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAccept = (match) => {
    setSelectedMatch(match);
    setModalType('accept');
  };

  const handleOpenDecline = (match) => {
    setSelectedMatch(match);
    setModalType('decline');
  };

  const handleAcceptConfirm = async () => {
    if (!selectedMatch) return;
    try {
      setSubmitting(true);
      await api.post(`/donor/matches/${selectedMatch.id}/respond`, {
        action: 'accept',
      });
      setActionMessage('You have accepted the match. Please proceed to the hospital as coordinated.');
      setModalType(null);
      fetchMatches();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to accept match.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeclineConfirm = async () => {
    if (!selectedMatch) return;
    try {
      setSubmitting(true);
      await api.post(`/donor/matches/${selectedMatch.id}/respond`, {
        action: 'decline',
        decline_reason: declineReason,
      });
      setActionMessage('You have declined this match. Another eligible donor will be rotated.');
      setModalType(null);
      fetchMatches();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to decline match.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout title="Matched Emergency Requests">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-sand-900">Your Emergency Blood Matches</h2>
          <p className="text-xs text-sand-600 mt-1">
            Emergency requests matched with your blood group and location. Only accept if you can physically attend the hospital within the deadline.
          </p>
        </div>

        {actionMessage && (
          <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded text-xs flex justify-between items-center">
            <span>✓ {actionMessage}</span>
            <button onClick={() => setActionMessage('')} className="text-teal-900 font-bold ml-4">✕</button>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sand-600 text-sm font-mono">Loading matches...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="card text-center py-16 bg-white">
            <div className="w-12 h-12 rounded-full bg-sand-100 text-sand-500 flex items-center justify-center mx-auto mb-3 font-mono text-lg">
              ✓
            </div>
            <h3 className="text-base font-serif font-bold text-sand-900">No Matched Requests Currently</h3>
            <p className="text-xs text-sand-600 mt-1 max-w-sm mx-auto">
              You do not have any pending emergency match invitations right now. We will notify you when an emergency blood request arises.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((m) => (
              <div
                key={m.id}
                className={`card bg-white border-l-4 ${
                  m.status === 'accepted'
                    ? 'border-l-teal-600'
                    : m.status === 'declined'
                    ? 'border-l-sand-300 opacity-75'
                    : 'border-l-primary-600'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <BloodChip group={m.blood_group} size="lg" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={m.urgency} />
                        <StatusBadge status={m.status} />
                        <span className="text-xs font-mono text-sand-400">Match ID: #{m.id}</span>
                      </div>
                      <h3 className="text-base font-serif font-bold text-sand-900">{m.hospital_name}</h3>
                      <p className="text-xs text-sand-600 mt-0.5">
                        📍 {m.city_name} • Units Needed: <strong className="font-mono text-sand-800">{m.units_needed}</strong>
                      </p>
                      {m.notes && (
                        <p className="text-xs text-sand-600 mt-2 bg-sand-50 p-2 rounded border border-sand-100 max-w-xl">
                          <span className="font-semibold text-sand-800">Hospital Note:</span> {m.notes}
                        </p>
                      )}

                      {/* Revealed info if accepted */}
                      {m.status === 'accepted' && (
                        <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded text-xs">
                          <div className="font-semibold text-teal-900 mb-1">🏥 Hospital Instructions for Donor:</div>
                          <div className="text-teal-800 space-y-0.5 font-sans">
                            <div>• Location: <strong>{m.hospital_address || 'Blood Bank Dept, Main Building'}</strong></div>
                            <div>• Hospital Contact: <strong>{m.hospital_phone || '0300-1112233'}</strong></div>
                            <div>• Please present your CNIC at the reception blood bank counter.</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & Timers */}
                  <div className="flex flex-col items-end justify-between gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[11px] font-mono text-sand-500 block mb-1">Time Remaining:</span>
                      <CountdownTimer deadlineUtc={m.deadline} />
                    </div>

                    {m.status === 'notified' && (
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <button
                          onClick={() => handleOpenDecline(m)}
                          className="btn-secondary text-xs px-3 py-1.5"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleOpenAccept(m)}
                          className="btn-primary text-xs px-4 py-1.5"
                        >
                          Accept Match
                        </button>
                      </div>
                    )}

                    {m.status === 'accepted' && (
                      <div className="text-xs font-mono font-semibold text-teal-700 bg-teal-50 px-3 py-1.5 rounded border border-teal-200">
                        ✓ Accepted • Please attend hospital
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Accept Modal */}
        <Modal
          isOpen={modalType === 'accept'}
          onClose={() => setModalType(null)}
          title="Confirm Emergency Blood Donation Commitment"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900">
              <strong className="block mb-1">⚠️ Crucial Commitment Notice</strong>
              By clicking "Confirm Acceptance", you confirm that you will travel to <strong>{selectedMatch?.hospital_name}</strong> to donate blood before the deadline.
              Your contact number will be securely revealed to the hospital coordinator to facilitate direct arrival.
            </div>

            <div className="border border-sand-200 rounded p-3 bg-sand-50 space-y-1 font-mono text-[11px]">
              <div>• Hospital: <strong>{selectedMatch?.hospital_name}</strong></div>
              <div>• City: <strong>{selectedMatch?.city_name}</strong></div>
              <div>• Blood Group: <strong>{selectedMatch?.blood_group}</strong></div>
              <div>• Urgency: <strong>{selectedMatch?.urgency?.toUpperCase()}</strong></div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-sand-200">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleAcceptConfirm}
                className="btn-primary text-xs px-4 py-2"
              >
                {submitting ? 'Confirming...' : 'Yes, I Will Donate'}
              </button>
            </div>
          </div>
        </Modal>

        {/* Decline Modal */}
        <Modal
          isOpen={modalType === 'decline'}
          onClose={() => setModalType(null)}
          title="Decline Emergency Match"
        >
          <div className="space-y-4 text-xs font-sans">
            <p className="text-sand-600">
              If you are unable to donate at this time, declining immediately allows the system to rotate and notify the next ranked eligible donor without delay.
            </p>

            <div>
              <label className="block text-xs font-mono uppercase text-sand-700 mb-1">
                Reason for declining (optional):
              </label>
              <select
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="input-field text-xs"
              >
                <option value="Feeling unwell">Feeling unwell / mild illness</option>
                <option value="Traveling / out of city">Traveling / out of city</option>
                <option value="Work / personal emergency">Work / personal emergency</option>
                <option value="Distance too far">Hospital is too far away</option>
                <option value="Other">Other reason</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-sand-200">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeclineConfirm}
                className="btn-danger text-xs px-4 py-2"
              >
                {submitting ? 'Declining...' : 'Decline Match'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
