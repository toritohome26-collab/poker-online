import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '../context/AuthContext';

const STATUS_LABELS = { pending: 'Pendiente', active: 'Activo', banned: 'Baneado', rejected: 'Rechazado' };
const STATUS_COLORS = { pending: 'text-yellow-400 bg-yellow-400/10', active: 'text-green-400 bg-green-400/10', banned: 'text-red-400 bg-red-400/10', rejected: 'text-gray-400 bg-gray-400/10' };

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
  const [chipsModal, setChipsModal] = useState(null);
  const [chipsAmount, setChipsAmount] = useState('');
  const [newTable, setNewTable] = useState({ name: '', smallBlind: 10, bigBlind: 20, maxPlayers: 6, minBuyIn: 200, maxBuyIn: 2000, isTournament: false, buyIn: 500, prizePool: 0 });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user?.isAdmin) { navigate('/lobby'); return; }
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes, tablesRes] = await Promise.all([
        API.get('/admin/users'),
        API.get('/admin/stats'),
        API.get('/lobby/tables')
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
      setTables(tablesRes.data);
    } catch {}
    setLoading(false);
  };

  const notify = (msg) => { setNotification(msg); setTimeout(() => setNotification(''), 3000); };

  const approveUser = async (id, chips) => {
    await API.post(`/admin/users/${id}/approve`, { chips });
    setUsers(u => u.map(x => x.id === id ? { ...x, status: 'active', chips } : x));
    notify('✅ Usuario aprobado');
  };

  const rejectUser = async (id) => {
    await API.post(`/admin/users/${id}/reject`);
    setUsers(u => u.map(x => x.id === id ? { ...x, status: 'rejected' } : x));
    notify('Usuario rechazado');
  };

  const banUser = async (id) => {
    await API.post(`/admin/users/${id}/ban`);
    setUsers(u => u.map(x => x.id === id ? { ...x, status: 'banned' } : x));
    notify('Usuario baneado');
  };

  const unbanUser = async (id) => {
    await API.post(`/admin/users/${id}/unban`);
    setUsers(u => u.map(x => x.id === id ? { ...x, status: 'active' } : x));
    notify('✅ Usuario desbaneado');
  };

  const giveChips = async () => {
    const amount = parseInt(chipsAmount);
    if (!amount) return;
    const res = await API.post(`/admin/users/${chipsModal.id}/chips`, { amount });
    setUsers(u => u.map(x => x.id === chipsModal.id ? { ...x, chips: res.data.chips } : x));
    setChipsModal(null);
    setChipsAmount('');
    notify(`✅ ${amount > 0 ? '+' : ''}${amount} fichas enviadas`);
  };

  const setChips = async (id, amount) => {
    await API.post(`/admin/users/${id}/set-chips`, { amount });
    setUsers(u => u.map(x => x.id === id ? { ...x, chips: amount } : x));
    notify('✅ Fichas actualizadas');
  };

  const createTable = async (e) => {
    e.preventDefault();
    const res = await API.post('/admin/tables', newTable);
    setTables(t => [res.data, ...t]);
    setNewTable({ name: '', smallBlind: 10, bigBlind: 20, maxPlayers: 6, minBuyIn: 200, maxBuyIn: 2000, isTournament: false, buyIn: 500, prizePool: 0 });
    notify('✅ Mesa creada');
  };

  const deleteTable = async (id) => {
    await API.delete(`/admin/tables/${id}`);
    setTables(t => t.filter(x => x.id !== id));
    notify('Mesa eliminada');
  };

  const filteredUsers = users.filter(u => filter === 'all' ? true : u.status === filter);
  const pendingCount = users.filter(u => u.status === 'pending').length;

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-gold text-xl animate-pulse">Cargando panel...</div></div>;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">♠</span>
          <span className="text-xl font-bold text-gold">Panel Admin</span>
        </div>
        <button onClick={() => navigate('/lobby')} className="btn-ghost text-sm">← Volver al lobby</button>
      </header>

      {/* Notification */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gold text-gold px-6 py-3 rounded-xl font-semibold shadow-2xl">
          {notification}
        </div>
      )}

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6 pb-0">
          {[
            { label: 'Total usuarios', value: stats.totalUsers },
            { label: 'Pendientes', value: stats.pendingUsers, highlight: stats.pendingUsers > 0 },
            { label: 'Activos', value: stats.activeUsers },
            { label: 'Mesas', value: stats.totalTables },
            { label: 'Manos jugadas', value: stats.totalHands },
          ].map(s => (
            <div key={s.label} className={`bg-gray-800 rounded-xl p-4 border ${s.highlight ? 'border-yellow-500' : 'border-gray-700'}`}>
              <div className={`text-2xl font-bold ${s.highlight ? 'text-yellow-400' : 'text-white'}`}>{s.value}</div>
              <div className="text-sm text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 px-6 pt-6">
        {[
          { id: 'users', label: `Usuarios${pendingCount > 0 ? ` (${pendingCount} pendientes)` : ''}` },
          { id: 'tables', label: 'Mesas y Torneos' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-lg font-semibold transition-colors ${tab === t.id ? 'bg-gold text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <main className="p-6">
        {/* USERS TAB */}
        {tab === 'users' && (
          <div>
            {/* Filter */}
            <div className="flex gap-2 mb-4">
              {['all', 'pending', 'active', 'banned', 'rejected'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${filter === f ? 'bg-gold text-gray-900 font-semibold' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                  {f === 'all' ? 'Todos' : STATUS_LABELS[f]}
                  {f === 'pending' && pendingCount > 0 && <span className="ml-1 bg-yellow-500 text-gray-900 rounded-full px-1.5 text-xs">{pendingCount}</span>}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredUsers.length === 0 && <div className="text-center text-gray-500 py-10">No hay usuarios en este filtro</div>}
              {filteredUsers.map(u => (
                <div key={u.id} className={`bg-gray-800 rounded-xl p-4 border ${u.status === 'pending' ? 'border-yellow-500/50' : 'border-gray-700'}`}>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center font-bold text-lg">
                        {u.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{u.username}</span>
                          {u.isAdmin && <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded">Admin</span>}
                          <span className={`text-xs px-2 py-0.5 rounded font-semibold ${STATUS_COLORS[u.status]}`}>
                            {STATUS_LABELS[u.status]}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400">{u.email}</div>
                        <div className="text-xs text-gray-500">
                          🪙 {u.chips?.toLocaleString()} fichas · {u.totalWins} victorias · {u.totalHands} manos
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {u.status === 'pending' && (
                        <>
                          <button onClick={() => approveUser(u.id, 1000)} className="btn text-sm py-1 bg-green-700 hover:bg-green-600 text-white">
                            ✓ Aprobar (1000 fichas)
                          </button>
                          <button onClick={() => rejectUser(u.id)} className="btn-danger text-sm py-1">
                            ✗ Rechazar
                          </button>
                        </>
                      )}
                      {u.status === 'active' && !u.isAdmin && (
                        <button onClick={() => banUser(u.id)} className="btn-ghost text-sm py-1 text-red-400 border-red-800">
                          Banear
                        </button>
                      )}
                      {u.status === 'banned' && (
                        <button onClick={() => unbanUser(u.id)} className="btn-ghost text-sm py-1 text-green-400 border-green-800">
                          Desbanear
                        </button>
                      )}
                      <button onClick={() => { setChipsModal(u); setChipsAmount(''); }} className="btn-ghost text-sm py-1">
                        🪙 Dar fichas
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TABLES TAB */}
        {tab === 'tables' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create table form */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h3 className="text-lg font-bold mb-4">Crear Mesa / Torneo</h3>
              <form onSubmit={createTable} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nombre</label>
                  <input className="input" value={newTable.name} onChange={e => setNewTable(f => ({ ...f, name: e.target.value }))} placeholder="Mesa VIP / Torneo Semanal" required />
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newTable.isTournament} onChange={e => setNewTable(f => ({ ...f, isTournament: e.target.checked }))} className="w-4 h-4 accent-yellow-400" />
                    <span className="text-sm">Es torneo</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Small Blind</label>
                    <input className="input" type="number" value={newTable.smallBlind} onChange={e => setNewTable(f => ({ ...f, smallBlind: +e.target.value }))} min={1} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Big Blind</label>
                    <input className="input" type="number" value={newTable.bigBlind} onChange={e => setNewTable(f => ({ ...f, bigBlind: +e.target.value }))} min={2} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Buy-in mín</label>
                    <input className="input" type="number" value={newTable.minBuyIn} onChange={e => setNewTable(f => ({ ...f, minBuyIn: +e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Buy-in máx</label>
                    <input className="input" type="number" value={newTable.maxBuyIn} onChange={e => setNewTable(f => ({ ...f, maxBuyIn: +e.target.value }))} />
                  </div>
                </div>
                {newTable.isTournament && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Buy-in torneo</label>
                      <input className="input" type="number" value={newTable.buyIn} onChange={e => setNewTable(f => ({ ...f, buyIn: +e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Premio total</label>
                      <input className="input" type="number" value={newTable.prizePool} onChange={e => setNewTable(f => ({ ...f, prizePool: +e.target.value }))} />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Máx jugadores: {newTable.maxPlayers}</label>
                  <input type="range" min={2} max={9} value={newTable.maxPlayers} onChange={e => setNewTable(f => ({ ...f, maxPlayers: +e.target.value }))} className="w-full accent-yellow-400" />
                </div>
                <button type="submit" className="btn-primary w-full">Crear mesa</button>
              </form>
            </div>

            {/* Tables list */}
            <div>
              <h3 className="text-lg font-bold mb-4">Mesas activas ({tables.length})</h3>
              <div className="space-y-3">
                {tables.length === 0 && <div className="text-gray-500 text-center py-8">No hay mesas</div>}
                {tables.map(t => (
                  <div key={t.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{t.name}</span>
                        {t.isTournament && <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded">Torneo</span>}
                      </div>
                      <div className="text-sm text-gray-400">
                        Blinds {t.small_blind}/{t.big_blind} · {t.playerCount || 0}/{t.max_players} jugadores
                      </div>
                      {t.isTournament && <div className="text-xs text-gold">Buy-in: {t.buyIn} · Premio: {t.prizePool}</div>}
                    </div>
                    <button onClick={() => deleteTable(t.id)} className="btn-danger text-sm py-1 px-3">Eliminar</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Give chips modal */}
      {chipsModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-sm border border-gray-600">
            <h3 className="text-xl font-bold mb-2">Dar fichas</h3>
            <p className="text-gray-400 mb-4">Jugador: <span className="text-white font-semibold">{chipsModal.username}</span> · Tiene: <span className="text-gold">{chipsModal.chips?.toLocaleString()}</span></p>
            <div className="space-y-3 mb-4">
              <div className="flex gap-2 flex-wrap">
                {[500, 1000, 2000, 5000, -500, -1000].map(amt => (
                  <button key={amt} onClick={() => setChipsAmount(String(amt))} className={`btn text-sm py-1 px-3 ${amt > 0 ? 'bg-green-800 text-green-300' : 'bg-red-900 text-red-300'}`}>
                    {amt > 0 ? '+' : ''}{amt}
                  </button>
                ))}
              </div>
              <input className="input text-center text-xl font-bold" type="number" value={chipsAmount} onChange={e => setChipsAmount(e.target.value)} placeholder="Ej: 1000 o -500" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setChipsModal(null)} className="btn-ghost flex-1">Cancelar</button>
              <button onClick={giveChips} disabled={!chipsAmount} className="btn-primary flex-1">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
