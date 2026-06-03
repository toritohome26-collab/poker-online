import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Las contraseñas no coinciden');
    setLoading(true);
    try {
      const data = await register(form.username, form.email, form.password);
      if (data?.pending) { setPending(true); return; }
      navigate('/lobby');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrarse');
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
          <p className="text-gray-400 mt-1">Empezás con 5.000 fichas gratis</p>
        </div>
        {pending ? (
          <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-yellow-600 text-center">
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold mb-3 text-yellow-400">Registro recibido</h2>
            <p className="text-gray-300">Tu cuenta está pendiente de aprobación por el administrador. Una vez aprobada podrás iniciar sesión.</p>
            <Link to="/login" className="btn-ghost inline-block mt-6">Ir al login</Link>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700">
          <h2 className="text-2xl font-bold mb-6">Crear Cuenta</h2>
          {error && <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Usuario</label>
              <input className="input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="tu_usuario" required autoFocus minLength={3} maxLength={20} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@ejemplo.com" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Contraseña</label>
              <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" required minLength={6} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Confirmar Contraseña</label>
              <input className="input" type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Repetir contraseña" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-lg">
              {loading ? 'Creando cuenta...' : 'Crear cuenta y jugar'}
            </button>
          </div>
          <p className="text-center text-gray-400 mt-6 text-sm">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="text-gold hover:underline">Iniciar sesión</Link>
          </p>
        </form>
        )}
      </div>
    </div>
  );
}
