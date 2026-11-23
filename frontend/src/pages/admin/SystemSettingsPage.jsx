import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import AppLayout from '../../components/layout/AppLayout';

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState({
    cooldown_days: 90,
    top_n_matches: 5,
    max_critical_requests: 3,
    match_timeout_minutes: 30,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/settings');
      if (res.data) {
        setSettings(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.post('/admin/settings', {
        cooldown_days: parseInt(settings.cooldown_days, 10),
        top_n_matches: parseInt(settings.top_n_matches, 10),
        max_critical_requests: parseInt(settings.max_critical_requests, 10),
        match_timeout_minutes: parseInt(settings.match_timeout_minutes, 10),
      });
      setMessage('System operational parameters updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="System Configuration">
      <div className="max-w-2xl space-y-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-sand-900">Coordination & Matching Parameters</h2>
          <p className="text-xs text-sand-600 mt-1">
            Global business rules governing safety cooldown periods, match ranking limits, and hospital concurrency constraints.
          </p>
        </div>

        {message && (
          <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded text-xs">
            ✓ {message}
          </div>
        )}

        <div className="card bg-white shadow-card">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                  Donor Recovery Cooldown (Days) *
                </label>
                <input
                  type="number"
                  required
                  min="30"
                  max="180"
                  value={settings.cooldown_days}
                  onChange={(e) => setSettings({ ...settings, cooldown_days: e.target.value })}
                  className="input-field text-sm font-mono max-w-xs"
                />
                <span className="text-[11px] text-sand-500 font-sans mt-1 block">
                  Standard physiological recovery period between whole blood donations (WHO recommends 90 days).
                </span>
              </div>

              <div className="pt-4 border-t border-sand-100">
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                  Top-N Ranked Donors to Notify *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="20"
                  value={settings.top_n_matches}
                  onChange={(e) => setSettings({ ...settings, top_n_matches: e.target.value })}
                  className="input-field text-sm font-mono max-w-xs"
                />
                <span className="text-[11px] text-sand-500 font-sans mt-1 block">
                  Prevents notification fatigue by alerting only the top ranked candidates per emergency request.
                </span>
              </div>

              <div className="pt-4 border-t border-sand-100">
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                  Maximum Active Critical Requests per Hospital *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="10"
                  value={settings.max_critical_requests}
                  onChange={(e) => setSettings({ ...settings, max_critical_requests: e.target.value })}
                  className="input-field text-sm font-mono max-w-xs"
                />
                <span className="text-[11px] text-sand-500 font-sans mt-1 block">
                  Prevents emergency channel saturation. Hospitals must resolve or cancel existing critical requests before opening new ones.
                </span>
              </div>

              <div className="pt-4 border-t border-sand-100">
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                  Donor Response Timeout Window (Minutes) *
                </label>
                <input
                  type="number"
                  required
                  min="5"
                  max="120"
                  value={settings.match_timeout_minutes}
                  onChange={(e) => setSettings({ ...settings, match_timeout_minutes: e.target.value })}
                  className="input-field text-sm font-mono max-w-xs"
                />
                <span className="text-[11px] text-sand-500 font-sans mt-1 block">
                  If an alerted donor does not respond within this window, the system rotates to the next candidate automatically.
                </span>
              </div>
            </div>

            <div className="pt-6 border-t border-sand-200 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary text-xs px-5 py-2.5"
              >
                {saving ? 'Updating Parameters...' : 'Save Configuration Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
