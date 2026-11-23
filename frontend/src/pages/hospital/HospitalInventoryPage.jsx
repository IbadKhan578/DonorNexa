import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import AppLayout from '../../components/layout/AppLayout';
import BloodChip from '../../components/common/BloodChip';
import Modal from '../../components/common/Modal';

export default function HospitalInventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjustItem, setAdjustItem] = useState(null);
  const [delta, setDelta] = useState(1);
  const [reason, setReason] = useState('Routine blood bank audit / intake');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/hospital/inventory');
      setInventory(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustItem) return;
    try {
      setSubmitting(true);
      await api.patch('/hospital/inventory', {
        blood_group: adjustItem.blood_group,
        delta: parseInt(delta, 10),
        reason: reason,
      });
      setMessage(`Updated ${adjustItem.blood_group} stock successfully.`);
      setAdjustItem(null);
      fetchInventory();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to update inventory.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStockStatus = (units) => {
    if (units === 0) return { label: 'Depleted', color: 'bg-red-50 text-red-800 border-red-200' };
    if (units < 5) return { label: 'Critically Low', color: 'bg-amber-50 text-amber-800 border-amber-200' };
    if (units < 10) return { label: 'Low Stock', color: 'bg-yellow-50 text-yellow-800 border-yellow-200' };
    return { label: 'Adequate', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  };

  return (
    <AppLayout title="Hospital Blood Bank Inventory">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-sand-900">Blood Bank Inventory Management</h2>
          <p className="text-xs text-sand-600 mt-1">
            Real-time stock tracking across all 8 blood groups. Automatically credited upon donation verification.
          </p>
        </div>

        {message && (
          <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded text-xs">
            ✓ {message}
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sand-600 text-sm font-mono">Loading inventory counts...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {inventory.map((item) => {
              const status = getStockStatus(item.units_available);
              return (
                <div key={item.blood_group} className="card bg-white shadow-card flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <BloodChip group={item.blood_group} size="lg" />
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${status.color}`}>
                        {status.label}
                      </span>
                    </div>

                    <div className="mt-2">
                      <span className="text-3xl font-serif font-bold text-sand-900">
                        {item.units_available}
                      </span>
                      <span className="text-xs text-sand-500 font-sans ml-1.5">Units (Bags)</span>
                    </div>

                    <div className="text-[11px] font-mono text-sand-500 mt-2">
                      Last Updated: {item.updated_at_pkt || 'Today'}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-sand-100">
                    <button
                      onClick={() => {
                        setAdjustItem(item);
                        setDelta(1);
                      }}
                      className="btn-secondary w-full text-center text-xs py-1.5"
                    >
                      Adjust Stock ±
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Adjust Stock Modal */}
        <Modal
          isOpen={!!adjustItem}
          onClose={() => setAdjustItem(null)}
          title={`Adjust Inventory — ${adjustItem?.blood_group}`}
        >
          <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs font-sans">
            <p className="text-sand-600">
              Current Stock: <strong className="font-mono text-sand-900">{adjustItem?.units_available} Units</strong>.
              Enter positive value to add units (e.g. voluntary camp) or negative to deduct units (e.g. surgery use).
            </p>

            <div>
              <label className="block text-xs font-mono uppercase text-sand-700 mb-1">
                Adjustment Delta (+ / -) *
              </label>
              <input
                type="number"
                required
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                className="input-field text-xs font-mono max-w-xs"
              />
              <span className="text-[10px] text-sand-500 font-mono mt-0.5 block">
                Resulting stock will be: {Math.max(0, (adjustItem?.units_available || 0) + parseInt(delta || 0, 10))} units
              </span>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-sand-700 mb-1">
                Audit Reason *
              </label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Expired unit discard or emergency blood drive batch"
                className="input-field text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-sand-200">
              <button
                type="button"
                onClick={() => setAdjustItem(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary text-xs px-4 py-2"
              >
                {submitting ? 'Updating...' : 'Save Stock Adjustment'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
