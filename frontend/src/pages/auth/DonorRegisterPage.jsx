import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Logo from '../../components/common/Logo';
import { useAuth } from '../../context/AuthContext';

export default function DonorRegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
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

  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    cnic: '',
    phone: '',
    blood_group: 'B+',
    date_of_birth: '1998-05-15',
    gender: 'female',
    weight_kg: 58,
    city_id: 11,
    address: 'Gulshan-e-Iqbal, Block 4',
  });

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  useEffect(() => {
    api.get('/public/cities')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
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

  const handleCnicChange = (e) => {
    // Digits only, max 13 digits (format: XXXXX-XXXXXXX-X, length 15)
    const raw = e.target.value.replace(/\D/g, '').slice(0, 13);
    let formatted = raw;
    if (raw.length > 5 && raw.length <= 12) {
      formatted = `${raw.slice(0, 5)}-${raw.slice(5)}`;
    } else if (raw.length > 12) {
      formatted = `${raw.slice(0, 5)}-${raw.slice(5, 12)}-${raw.slice(12, 13)}`;
    }
    setForm((prev) => ({ ...prev, cnic: formatted }));
  };

  const handlePhoneChange = (e) => {
    // Digits only, max 11 digits (format: 03XX-XXXXXXX, length 12)
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 4) {
      formatted = `${raw.slice(0, 4)}-${raw.slice(4, 11)}`;
    }
    setForm((prev) => ({ ...prev, phone: formatted }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Frontend regex validation
    const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
    if (!cnicRegex.test(form.cnic)) {
      setError('CNIC must follow format: 42101-1234567-1');
      return;
    }

    const phoneRegex = /^03\d{2}-\d{7}$/;
    if (!phoneRegex.test(form.phone)) {
      setError('Phone number must follow Pakistan format: 0300-1234567');
      return;
    }

    if (Number(form.weight_kg) < 50) {
      setError('Donor weight must be at least 50 kg for safe blood donation.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/register/donor', {
        name: form.full_name,
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        cnic: form.cnic,
        phone: form.phone,
        blood_group: form.blood_group,
        dob: form.date_of_birth,
        date_of_birth: form.date_of_birth,
        weight: parseFloat(form.weight_kg),
        weight_kg: parseFloat(form.weight_kg),
        city_id: parseInt(form.city_id, 10),
      });

      // Automatically sign in upon registration
      await login(form.email, form.password);
      navigate('/donor/dashboard');
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d) => d.msg || `${d.loc?.[1] || 'Field'} is invalid`).join('. ')
        : (typeof detail === 'string' ? detail : 'Registration failed. Please check your information.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-sand-900">
            Register as a Volunteer Blood Donor
          </h1>
          <p className="text-xs text-sand-600 mt-1">
            Join Pakistan's coordinated emergency blood network. Your identity & contact details remain strictly private until you accept an emergency match.
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
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="e.g. Fatima Zahra"
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="donor@example.pk"
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
                  CNIC Number (Numbers Only: 13 digits) *
                </label>
                <input
                  type="text"
                  required
                  name="cnic"
                  inputMode="numeric"
                  maxLength={15}
                  value={form.cnic}
                  onChange={handleCnicChange}
                  placeholder="42101-1234567-1"
                  className="input-field text-sm font-mono"
                />
                <span className="text-[10px] text-sand-500 font-mono mt-0.5 block">
                  Auto-formats as #####-#######-#
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                  Mobile Number (Numbers Only: 11 digits) *
                </label>
                <input
                  type="text"
                  required
                  name="phone"
                  inputMode="numeric"
                  maxLength={12}
                  value={form.phone}
                  onChange={handlePhoneChange}
                  placeholder="0300-1234567"
                  className="input-field text-sm font-mono"
                />
                <span className="text-[10px] text-sand-500 font-mono mt-0.5 block">
                  Auto-formats as 03XX-XXXXXXX (Masked until accepted)
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                  Blood Group *
                </label>
                <select
                  name="blood_group"
                  value={form.blood_group}
                  onChange={handleChange}
                  className="input-field text-sm font-mono font-semibold"
                >
                  {bloodGroups.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  required
                  name="date_of_birth"
                  value={form.date_of_birth}
                  onChange={handleChange}
                  className="input-field text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                  Gender *
                </label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className="input-field text-sm"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                  Weight (kg) *
                </label>
                <input
                  type="number"
                  required
                  min="45"
                  max="200"
                  name="weight_kg"
                  value={form.weight_kg}
                  onChange={handleChange}
                  className="input-field text-sm font-mono"
                />
                <span className="text-[10px] text-sand-500 font-mono mt-0.5 block">Minimum 50 kg</span>
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
                  {(Array.isArray(cities) ? cities : DEFAULT_CITIES).map((c) => (
                    <option key={c.id} value={c.id}>{c.name || c.city_name} ({c.province})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                  Address / Area
                </label>
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="e.g. F-8/2, Islamabad"
                  className="input-field text-sm"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-sand-200">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full text-center text-sm py-2.5"
              >
                {loading ? 'Registering...' : 'Register as Volunteer Donor'}
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
