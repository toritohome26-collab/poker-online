import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '../context/AuthContext';

export default function Lobby() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [newTable, setNewTable] = useState({ name: '', smallBlind: 10, bigBlind: 20, maxPlayers: 6, minBuyIn: 200, maxBuyIn: 2000 });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchTables = useCallback(async () => {
    try { const { data } = await API.get('/lobby/tables'); setTables(data); } catch {}
  }, []);

  useEffect(() => {
    fetchTables();
    const interval = setInterval(fetchTables, 5000);
    return () => clearInterval(interval);
  }, [fetchTables]);

  const fetchLeaderboard = async () => {
    const { data } = await API.get('/lobby/leaderboard');
    setLeaderboard(data);
    setShowLeaderboard(true);
  };

  const createTable = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const { data } = await API.post('/lobby/tables', newTable);
      setTables(t => [data, ...t]);
      setShowCreate(false);
      navigate(`/game/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear mesa');
    } finally {
      setCreating(false);
    }
  };

  const statusColor = (status) => {
    if (status === 'waiting') return 'text-green-400';
    if (['pre_flop','flop','turn','river'].includes(status)) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const statusLabel = (status, count) => {
    if (status === 'waiting') return count < 2 ? 'Esperando jugadores' : 'Lista';
    return 'En juego';
  };

  return (
    <div className="min-h-screen bg-gray-900">

      {/* ── Header ── */}
      <header className="bg-gray-800 border-b border-gray-700 px-3 py-2">
        {/* Top row: logo + username + chips */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">♠</span>
            <span className="text-lg font-bold text-gold">PokerOnline</span>
          </div>
          <div className="text-right">
            <div className="font-semibold text-sm">{user?.username}</div>
            <div className="text-xs text-gold">🪙 {user?.chips?.toLocaleString()}</div>
          </div>
        </div>
        {/* Bottom row: action buttons */}
        <div className="flex gap-2">
          <button onClick={fetchLeaderboard} className="btn-ghost text-xs py-1 px-3 flex-1">🏆 Ranking</button>
          {user?.isAdmin && (
            <button onClick={() => navigate('/admin')} className="text-xs py-1 px-3 flex-1 rounded-lg bg-gold text-gray-900 font-bold">⚙ Admin</button>
          )}
          <button onClick={logout} className="btn-ghost text-xs py-1 px-3 flex-1">Salir</button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="px-3 py-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Mesas disponibles</h2>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm py-2 px-4">+ Crear</button>
        </div>

        {tables.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="text-5xl mb-4">🃏</div>
            <p className="text-lg">No hay mesas activas</p>
            <p className="mt-1 text-sm">¡Creá la primera mesa!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tables.map(table => (
              <div key={table.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-gold transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="min-w-0 flex-1 mr-3">
                    <h3 className="font-bold truncate">{table.name}</h3>
                    <div className={`text-xs ${statusColor(table.status)}`}>
                      {statusLabel(table.status, table.playerCount)}
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-400 flex-shrink-0">
                    <div className="text-base font-bold text-white">{table.playerCount}/{table.max_players}</div>
                    <div>jugadores</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    Blinds <span className="text-white">{table.small_blind}/{table.big_blind}</span>
                    <span className="mx-2">·</span>
                    Buy-in <span className="text-white">{table.min_buy_in}-{table.max_buy_in}</span>
                  </div>
                  <button
                    onClick={() => navigate(`/game/${table.id}`)}
                    disabled={table.playerCount >= table.max_players}
                    className="btn-primary text-sm py-1.5 px-5 ml-2 flex-shrink-0"
                  >
                    {table.playerCount >= table.max_players ? 'Llena' : 'Entrar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Create Table Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50">
          <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md border border-gray-600 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Nueva Mesa</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            {error && <div className="bg-red-900/50 border border-red-700 text-red-300 px-3 py-2 rounded-lg mb-4 text-sm">{error}</div>}
            <form onSubmit={createTable} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre de la mesa</label>
                <input className="input" value={newTable.name} onChange={e => setNewTable(f => ({ ...f, name: e.target.value }))} placeholder="Mi mesa de poker" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Small Blind</label>
                  <input className="input" type="number" value={newTable.smallBlind} onChange={e => setNewTable(f => ({ ...f, smallBlind: +e.target.value, bigBlind: +e.target.value * 2 }))} min={1} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Big Blind</label>
                  <input className="input" type="number" value={newTable.bigBlind} onChange={e => setNewTable(f => ({ ...f, bigBlind: +e.target.value }))} min={2} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Buy-in mín</label>
                  <input className="input" type="number" value={newTable.minBuyIn} onChange={e => setNewTable(f => ({ ...f, minBuyIn: +e.target.value }))} min={20} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Buy-in máx</label>
                  <input className="input" type="number" value={newTable.maxBuyIn} onChange={e => setNewTable(f => ({ ...f, maxBuyIn: +e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Jugadores: {newTable.maxPlayers}</label>
                <input type="range" min={2} max={9} value={newTable.maxPlayers} onChange={e => setNewTable(f => ({ ...f, maxPlayers: +e.target.value }))} className="w-full accent-yellow-400" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Cancelar</button>
                <button type="submit" disabled={creating} className="btn-primary flex-1">{creating ? 'Creando...' : 'Crear y entrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Leaderboard Modal ── */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50">
          <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md border border-gray-600 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">🏆 Ranking</h3>
              <button onClick={() => setShowLeaderboard(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="space-y-2">
              {leaderboard.map((u, i) => (
                <div key={u.username} className={`flex items-center justify-between p-3 rounded-lg ${u.username === user?.username ? 'bg-gold/20 border border-gold/50' : 'bg-gray-700'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold w-5 text-sm ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-500'}`}>{i + 1}</span>
                    <span className="font-medium text-sm">{u.username}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-gold font-semibold text-sm">{u.chips?.toLocaleString()} 🪙</div>
                    <div className="text-xs text-gray-400">{u.total_wins} victorias</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
