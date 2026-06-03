import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/lobby');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-2">♠</div>
          <h1 className="text-4xl font-bold text-gold">PokerOnline</h1>
          <p className="text-gray-400 mt-1">Juega con fichas virtuales</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700">
          <h2 className="text-2xl font-bold mb-6">Iniciar Sesión</h2>
          {error && <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Usuario</label>
              <input className="input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="tu_usuario" required autoFocus />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Contraseña</label>
              <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-lg">
              {loading ? 'Ingresando...' : 'Entrar a la mesa'}
            </button>
          </div>
          <p className="text-center text-gray-400 mt-6 text-sm">
            ¿No tenés cuenta?{' '}
            <Link to="/register" className="text-gold hover:underline">Registrarse</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
