import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import AppLayout from '../../components/layout/AppLayout';
import BloodChip from '../../components/common/BloodChip';

export default function CreateRequestPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    patient_id: 'PT-2026-904',
    blood_group: 'O-',
    units_needed: 2,
    urgency: 'critical',
    hours_valid: 4,
    notes: 'Emergency Trauma & ICU resuscitation. Urgent donor matching requested.',
  });

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const compatibilityMap = {
    'O-': ['O-'],
    'O+': ['O+', 'O-'],
    'A-': ['A-', 'O-'],
    'A+': ['A+', 'A-', 'O+', 'O-'],
    'B-': ['B-', 'O-'],
    'B+': ['B+', 'B-', 'O+', 'O-'],
    'AB-': ['AB-', 'A-', 'B-', 'O-'],
    'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      const res = await api.post('/hospital/requests', {
        patient_id: form.patient_id,
        blood_group: form.blood_group,
        units_needed: parseInt(form.units_needed, 10),
        urgency: form.urgency,
        hours_valid: parseInt(form.hours_valid, 10),
        notes: form.notes,
      });

      // Redirect to the newly created request's detail page to view ranked donors
      navigate(`/hospital/requests/${res.data.id}`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to create blood request. Please check your active limits.');
    } finally {
      setLoading(false);
    }
  };

  const compatibleDonors = compatibilityMap[form.blood_group] || [];

  return (
    <AppLayout title="Create Emergency Blood Request">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Link to="/hospital/dashboard" className="text-xs font-mono text-sand-600 hover:text-sand-900 mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-sand-900">
            Publish Emergency Blood Request
          </h2>
          <p className="text-xs text-sand-600 mt-1">
            Initiates real-time donor matching algorithm across eligible, verified volunteer donors in your city.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-xs font-mono">
            ⚠️ {error}
          </div>
        )}

        <div className="card bg-white shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                  Required Blood Group *
                </label>
                <select
                  name="blood_group"
                  value={form.blood_group}
                  onChange={handleChange}
                  className="input-field text-sm font-mono font-bold"
                >
                  {bloodGroups.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                  Units Needed (Bags) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="10"
                  name="units_needed"
                  value={form.units_needed}
                  onChange={handleChange}
                  className="input-field text-sm font-mono"
                />
              </div>
            </div>

            {/* Compatibility Assistant Box */}
            <div className="p-3 bg-sand-50 border border-sand-200 rounded text-xs">
              <span className="font-mono uppercase text-sand-500 block text-[10px] mb-1">
                ABO/Rh Compatibility Engine:
              </span>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="text-sand-700 text-xs mr-1">A patient with <strong>{form.blood_group}</strong> can receive from:</span>
                {compatibleDonors.map((bg) => (
                  <BloodChip key={bg} group={bg} size="sm" />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                  Urgency Level *
                </label>
                <select
                  name="urgency"
                  value={form.urgency}
                  onChange={handleChange}
                  className="input-field text-sm font-mono"
                >
                  <option value="critical">Critical (Immediate Life-Threatening)</option>
                  <option value="urgent">Urgent (Within 4-8 Hours)</option>
                  <option value="normal">Normal / Scheduled Surgery</option>
                </select>
                <span className="text-[10px] text-sand-500 font-mono mt-0.5 block">
                  Max 3 active critical requests allowed per facility.
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                  Required Within (Hours) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="72"
                  name="hours_valid"
                  value={form.hours_valid}
                  onChange={handleChange}
                  className="input-field text-sm font-mono"
                />
                <span className="text-[10px] text-sand-500 font-mono mt-0.5 block">
                  Automatic countdown timer starts on creation
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                Internal Patient Reference ID / Case No *
              </label>
              <input
                type="text"
                required
                name="patient_id"
                value={form.patient_id}
                onChange={handleChange}
                placeholder="e.g. ICU-09 or PT-2026-904"
                className="input-field text-sm font-mono"
              />
              <span className="text-[10px] text-sand-500 font-mono mt-0.5 block">
                🔒 Privacy Protected: Never shown to donors or public. Kept for internal hospital matching audit.
              </span>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                Clinical Notes / Ward Instructions
              </label>
              <textarea
                rows="3"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Mention specific ward, surgeon contact, or special donor instructions..."
                className="input-field text-sm"
              ></textarea>
            </div>

            <div className="pt-4 border-t border-sand-200 flex justify-end gap-3">
              <Link to="/hospital/dashboard" className="btn-secondary text-xs">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary text-xs px-5 py-2.5"
              >
                {loading ? 'Matching Donors...' : 'Publish Emergency Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
