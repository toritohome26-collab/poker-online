import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getSocket, disconnectSocket } from '../socket';

const AuthContext = createContext(null);

const API = axios.create({ baseURL: '/api' });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      API.get('/auth/me')
        .then(r => setUser(r.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username, password) => {
    const { data } = await API.post('/auth/login', { username, password });
    localStorage.setItem('token', data.token);
    API.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setUser(data.user);
    getSocket(data.token);
    return data;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const { data } = await API.post('/auth/register', { username, email, password });
    if (data.pending) return data; // awaiting admin approval
    localStorage.setItem('token', data.token);
    API.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setUser(data.user);
    getSocket(data.token);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    delete API.defaults.headers.common['Authorization'];
    disconnectSocket();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await API.get('/auth/me');
    setUser(data);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, API }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export { API };
