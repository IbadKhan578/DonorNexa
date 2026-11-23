import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'hospital') {
        navigate('/hospital/dashboard');
      } else {
        navigate('/donor/dashboard');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-2">
          <Link to="/">
            <Logo size="lg" />
          </Link>
        </div>
        <h2 className="mt-4 text-center text-2xl font-serif font-bold text-sand-900">
          Sign In to DonorNexa
        </h2>
        <p className="mt-1 text-center text-xs text-sand-600 font-sans">
          Connecting Donors. Bridging Lives. Saving Hope.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-card border border-sand-200 rounded-lg sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded bg-red-50 border border-red-200 text-xs text-red-800 font-mono">
              ⚠️ {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-mono font-medium text-sand-700 uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="input-field text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-mono font-medium text-sand-700 uppercase">
                  Password
                </label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-center text-sm py-2.5 mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-sand-200 text-center text-xs text-sand-600">
            <span>Don't have an account? </span>
            <div className="mt-2 flex justify-center gap-3">
              <Link to="/register/donor" className="text-primary-700 hover:text-primary-900 font-semibold underline">
                Register as Donor
              </Link>
              <span>•</span>
              <Link to="/register/hospital" className="text-teal-700 hover:text-teal-900 font-semibold underline">
                Register as Hospital
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
