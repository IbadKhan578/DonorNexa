import React, { useState, useEffect } from 'react';
import api, { getAssetUrl } from '../../api/client';
import AppLayout from '../../components/layout/AppLayout';

export default function HospitalProfilePage() {
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/hospital/dashboard')
      .then((res) => {
        setHospital(res.data?.hospital);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppLayout title="Hospital Profile">
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sand-600 text-sm font-mono">Loading hospital profile...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Hospital Profile & Verification">
      <div className="max-w-3xl space-y-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-sand-900">Hospital Facility Details</h2>
          <p className="text-xs text-sand-600 mt-1">
            Official registration, medical licence credentials, and focal person coordination details.
          </p>
        </div>

        <div className="card bg-white shadow-card space-y-6">
          <div className="flex items-center justify-between pb-6 border-b border-sand-200">
            <div>
              <span className={`text-xs font-mono font-semibold uppercase px-2 py-0.5 rounded border inline-block mb-1 ${
                hospital?.status === 'verified'
                  ? 'bg-teal-50 text-teal-800 border-teal-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {hospital?.status === 'verified' ? '✓ Verified Healthcare Facility' : 'Verification In Review'}
              </span>
              <h3 className="text-xl font-serif font-bold text-sand-900">{hospital?.name}</h3>
              <p className="text-xs text-sand-600 font-mono mt-0.5">Registration: {hospital?.registration_number}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-serif font-bold text-lg">
              🏥
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
            <div className="p-3 bg-sand-50 rounded border border-sand-200">
              <span className="text-sand-500 font-mono uppercase block text-[10px]">Focal Person Coordinator</span>
              <span className="font-bold text-sand-900 text-sm">{hospital?.focal_person_name}</span>
            </div>

            <div className="p-3 bg-sand-50 rounded border border-sand-200">
              <span className="text-sand-500 font-mono uppercase block text-[10px]">Coordination Mobile</span>
              <span className="font-mono font-bold text-sand-900 text-sm">{hospital?.focal_person_phone}</span>
            </div>

            <div className="p-3 bg-sand-50 rounded border border-sand-200">
              <span className="text-sand-500 font-mono uppercase block text-[10px]">City & Province</span>
              <span className="font-bold text-sand-900 text-sm">{hospital?.city_name}</span>
            </div>

            <div className="p-3 bg-sand-50 rounded border border-sand-200">
              <span className="text-sand-500 font-mono uppercase block text-[10px]">Street Address & Location</span>
              <span className="font-bold text-sand-900 text-sm">{hospital?.address}</span>
            </div>
          </div>

          <div className="p-4 bg-sand-50 border border-sand-200 rounded text-xs">
            <span className="font-mono uppercase text-sand-600 font-semibold block mb-1">
              Official Medical Licence Document
            </span>
            <p className="text-sand-600 text-xs mb-3">
              Uploaded during registration. Evaluated by administrative auditors to confirm government health commission accreditation.
            </p>
            {hospital?.licence_file_path || hospital?.license_doc_path ? (
              <a
                href={getAssetUrl(hospital?.licence_file_path || hospital?.license_doc_path)}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary text-xs inline-flex items-center gap-1.5"
              >
                📄 View Uploaded Licence Document
              </a>
            ) : (
              <span className="text-sand-500 font-mono text-[11px]">No document on file</span>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
