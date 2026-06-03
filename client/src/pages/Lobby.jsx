import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '../context/AuthContext';

export default function Lobby() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [newTable, setNewTable] = useState({ name: '', smallBlind: 10, bigBlind: 20, maxPlayers: 6, minBuyIn: 200, maxBuyIn: 2000 });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchTables = useCallback(async () => {
    try {
      const { data } = await API.get('/lobby/tables');
      setTables(data);
    } catch {}
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
    if (status === 'pre_flop' || status === 'flop' || status === 'turn' || status === 'river') return 'text-yellow-400';
    return 'text-gray-400';
  };

  const statusLabel = (status, count, max) => {
    if (status === 'waiting') return count < 2 ? 'Esperando jugadores' : 'Lista para jugar';
    return 'En juego';
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">♠</span>
          <span className="text-2xl font-bold text-gold">PokerOnline</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-semibold">{user?.username}</div>
            <div className="text-sm text-gold flex items-center gap-1">
              <span>🪙</span> {user?.chips?.toLocaleString()} fichas
            </div>
          </div>
          <button onClick={fetchLeaderboard} className="btn-ghost text-sm">Ranking</button>
          <button onClick={logout} className="btn-ghost text-sm">Salir</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Mesas disponibles</h2>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <span>+</span> Crear mesa
          </button>
        </div>

        {/* Tables grid */}
        {tables.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-5xl mb-4">🃏</div>
            <p className="text-xl">No hay mesas activas</p>
            <p className="mt-2">¡Creá la primera mesa!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map(table => (
              <div key={table.id} className="bg-gray-800 rounded-xl border border-gray-700 p-5 hover:border-gold transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{table.name}</h3>
                    <div className={`text-sm ${statusColor(table.status)}`}>
                      {statusLabel(table.status, table.playerCount, table.max_players)}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-400">
                    <div>{table.playerCount}/{table.max_players}</div>
                    <div>jugadores</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-400 mb-4">
                  <div>Blinds: <span className="text-white">{table.small_blind}/{table.big_blind}</span></div>
                  <div>Buy-in: <span className="text-white">{table.min_buy_in}-{table.max_buy_in}</span></div>
                </div>
                <button
                  onClick={() => navigate(`/game/${table.id}`)}
                  disabled={table.playerCount >= table.max_players}
                  className="btn-primary w-full"
                >
                  {table.playerCount >= table.max_players ? 'Mesa llena' : 'Entrar'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Table Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md border border-gray-600">
            <h3 className="text-xl font-bold mb-6">Nueva Mesa</h3>
            {error && <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
            <form onSubmit={createTable} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre de la mesa</label>
                <input className="input" value={newTable.name} onChange={e => setNewTable(f => ({ ...f, name: e.target.value }))} placeholder="Mi mesa de poker" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Small Blind</label>
                  <input className="input" type="number" value={newTable.smallBlind} onChange={e => setNewTable(f => ({ ...f, smallBlind: +e.target.value, bigBlind: +e.target.value * 2 }))} min={1} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Big Blind</label>
                  <input className="input" type="number" value={newTable.bigBlind} onChange={e => setNewTable(f => ({ ...f, bigBlind: +e.target.value }))} min={2} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Buy-in mínimo</label>
                  <input className="input" type="number" value={newTable.minBuyIn} onChange={e => setNewTable(f => ({ ...f, minBuyIn: +e.target.value }))} min={20} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Buy-in máximo</label>
                  <input className="input" type="number" value={newTable.maxBuyIn} onChange={e => setNewTable(f => ({ ...f, maxBuyIn: +e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Máximo de jugadores: {newTable.maxPlayers}</label>
                <input type="range" min={2} max={9} value={newTable.maxPlayers} onChange={e => setNewTable(f => ({ ...f, maxPlayers: +e.target.value }))} className="w-full accent-yellow-400" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Cancelar</button>
                <button type="submit" disabled={creating} className="btn-primary flex-1">{creating ? 'Creando...' : 'Crear y entrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md border border-gray-600">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">🏆 Ranking</h3>
              <button onClick={() => setShowLeaderboard(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="space-y-2">
              {leaderboard.map((u, i) => (
                <div key={u.username} className={`flex items-center justify-between p-3 rounded-lg ${u.username === user?.username ? 'bg-gold/20 border border-gold/50' : 'bg-gray-700'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold w-6 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-500'}`}>
                      {i + 1}
                    </span>
                    <span className="font-medium">{u.username}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-gold font-semibold">{u.chips?.toLocaleString()} 🪙</div>
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
