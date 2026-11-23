import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Logo from '../../components/common/Logo';

export default function HospitalRegisterPage() {
  const navigate = useNavigate();
  const DEFAULT_CITIES = [
    { id: 11, name: "Karachi", province: "Sindh" },
    { id: 12, name: "Lahore", province: "Punjab" },
    { id: 13, name: "Islamabad", province: "ICT" },
    { id: 14, name: "Rawalpindi", province: "Punjab" },
    { id: 15, name: "Peshawar", province: "KPK" },
    { id: 16, name: "Quetta", province: "Balochistan" },
    { id: 17, name: "Multan", province: "Punjab" },
    { id: 18, name: "Faisalabad", province: "Punjab" },
    { id: 19, name: "Hyderabad", province: "Sindh" },
    { id: 20, name: "Gujranwala", province: "Punjab" }
  ];

  const [cities, setCities] = useState(DEFAULT_CITIES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    email: '',
    password: '',
    hospital_name: '',
    registration_number: '',
    focal_person_name: '',
    focal_person_phone: '',
    city_id: 11,
    address: '',
  });
  const [licenseFile, setLicenseFile] = useState(null);

  useEffect(() => {
    api.get('/public/cities')
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setCities(res.data);
          setForm((prev) => ({ ...prev, city_id: prev.city_id || res.data[0].id }));
        }
      })
      .catch((err) => {
        console.warn('Using default Pakistani cities list:', err);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 4) {
      formatted = `${raw.slice(0, 4)}-${raw.slice(4, 11)}`;
    }
    setForm((prev) => ({ ...prev, focal_person_phone: formatted }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError('License file size must be less than 5 MB.');
        return;
      }
      setLicenseFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const phoneRegex = /^03\d{2}-\d{7}$/;
    if (!phoneRegex.test(form.focal_person_phone)) {
      setError('Focal person phone number must follow Pakistan format: 0300-1234567');
      return;
    }

    if (!licenseFile) {
      setError('Please upload your official medical licence document (PDF or image).');
      return;
    }

    try {
      setLoading(true);
      const data = new FormData();
      data.append('email', form.email);
      data.append('password', form.password);
      data.append('hospital_name', form.hospital_name);
      data.append('registration_number', form.registration_number);
      data.append('focal_person_name', form.focal_person_name);
      data.append('focal_person_phone', form.focal_person_phone);
      data.append('city_id', form.city_id);
      data.append('address', form.address);
      data.append('license_doc', licenseFile);

      await api.post('/auth/register/hospital', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Hospital registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-sand-50 py-16 px-4 flex items-center justify-center font-sans">
        <div className="bg-white border border-sand-200 rounded-lg shadow-card p-8 max-w-lg w-full text-center">
          <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-4 font-mono font-bold text-2xl">
            ✓
          </div>
          <h2 className="text-2xl font-serif font-bold text-sand-900 mb-2">Registration Submitted!</h2>
          <p className="text-sand-600 text-sm mb-6">
            Thank you for registering <strong>{form.hospital_name}</strong>. Your medical licence document has been queued for verification by the DonorNexa administrative team.
          </p>
          <div className="bg-sand-50 border border-sand-200 p-4 rounded text-left text-xs text-sand-700 mb-6 font-mono space-y-1">
            <div>• Verification Status: <strong>PENDING REVIEW</strong></div>
            <div>• Registered Email: <strong>{form.email}</strong></div>
            <div>• Focal Person: <strong>{form.focal_person_name}</strong></div>
          </div>
          <Link to="/login" className="btn-primary w-full text-center text-sm py-2.5">
            Proceed to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Link to="/"><Logo size="lg" /></Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-sand-900">
            Register a Hospital or Healthcare Facility
          </h1>
          <p className="text-xs text-sand-600 mt-1">
            Licensed hospitals can request emergency blood donations, view ranked donors, and maintain blood bank inventory.
          </p>
        </div>

        <div className="bg-white border border-sand-200 rounded-lg shadow-card p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-3 rounded bg-red-50 border border-red-200 text-xs text-red-800 font-mono">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                  Hospital / Facility Name *
                </label>
                <input
                  type="text"
                  required
                  name="hospital_name"
                  value={form.hospital_name}
                  onChange={handleChange}
                  placeholder="e.g. Civil Hospital Karachi"
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                  Official Email Address *
                </label>
                <input
                  type="email"
                  required
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="bloodbank@hospital.pk"
                  className="input-field text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimum 8 characters"
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                  Medical Registration / Licence Number *
                </label>
                <input
                  type="text"
                  required
                  name="registration_number"
                  value={form.registration_number}
                  onChange={handleChange}
                  placeholder="e.g. SHCC-KHI-2024-991"
                  className="input-field text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                  Focal Person Name *
                </label>
                <input
                  type="text"
                  required
                  name="focal_person_name"
                  value={form.focal_person_name}
                  onChange={handleChange}
                  placeholder="Dr. Tariq Mahmood"
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                  Focal Person Mobile *
                </label>
                <input
                  type="text"
                  required
                  name="focal_person_phone"
                  inputMode="numeric"
                  maxLength={12}
                  value={form.focal_person_phone}
                  onChange={handlePhoneChange}
                  placeholder="0300-1234567"
                  className="input-field text-sm font-mono"
                />
                <span className="text-[10px] text-sand-500 font-mono mt-0.5 block">
                  Auto-formats as 03XX-XXXXXXX
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                  City *
                </label>
                <select
                  name="city_id"
                  value={form.city_id}
                  onChange={handleChange}
                  className="input-field text-sm"
                >
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.province})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                  Street Address & Ward/Wing *
                </label>
                <input
                  type="text"
                  required
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="e.g. Baba-e-Urdu Road, Saddar"
                  className="input-field text-sm"
                />
              </div>
            </div>

            <div className="p-4 bg-sand-50 border border-sand-200 rounded">
              <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                Upload Medical Licence / Accreditation Document *
              </label>
              <input
                type="file"
                required
                accept=".pdf,image/png,image/jpeg"
                onChange={handleFileChange}
                className="block w-full text-xs text-sand-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-sand-200 file:text-sand-800 hover:file:bg-sand-300 cursor-pointer"
              />
              <span className="text-[11px] text-sand-500 font-mono mt-1 block">
                Accepted formats: PDF, PNG, JPEG (Max 5 MB). Reviewed by Admin before activation.
              </span>
            </div>

            <div className="pt-4 border-t border-sand-200">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full text-center text-sm py-2.5"
              >
                {loading ? 'Submitting Registration...' : 'Submit Hospital Registration'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-sand-600">
            Already registered?{' '}
            <Link to="/login" className="text-primary-700 font-semibold underline">
              Sign In here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
