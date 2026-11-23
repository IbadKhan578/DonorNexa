import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAccessToken } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [donorProfile, setDonorProfile] = useState(null);
  const [hospitalProfile, setHospitalProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Attempt to restore session on page reload via refresh endpoint
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await api.post('/auth/refresh');
        if (res.data?.access_token) {
          setAccessToken(res.data.access_token);
          setUser(res.data.user);
          setDonorProfile(res.data.donor_profile || null);
          setHospitalProfile(res.data.hospital_profile || null);
        }
      } catch (err) {
        // No active session or refresh cookie expired
        setUser(null);
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, user: userData, donor_profile, hospital_profile } = res.data;
    setAccessToken(access_token);
    setUser(userData);
    setDonorProfile(donor_profile || null);
    setHospitalProfile(hospital_profile || null);
    return userData;
  };

  const registerDonor = async (payload) => {
    const res = await api.post('/auth/register/donor', payload);
    const { access_token, user: userData, donor_profile } = res.data;
    setAccessToken(access_token);
    setUser(userData);
    setDonorProfile(donor_profile || null);
    return userData;
  };

  const registerHospital = async (formData) => {
    const res = await api.post('/auth/register/hospital', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setUser(null);
      setDonorProfile(null);
      setHospitalProfile(null);
      setAccessToken(null);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      if (user.role === 'donor') {
        const res = await api.get('/donors/me');
        setDonorProfile(res.data);
      } else if (user.role === 'hospital') {
        const res = await api.get('/hospital/me');
        setHospitalProfile(res.data);
      }
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        donorProfile,
        hospitalProfile,
        loading,
        login,
        registerDonor,
        registerHospital,
        logout,
        refreshProfile,
        isAuthenticated: !!user,
        role: user?.role || 'guest',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
