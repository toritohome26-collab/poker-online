import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '../context/AuthContext';
import { Chip } from '../components/Card';

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
    const iv = setInterval(fetchTables, 5000);
    return () => clearInterval(iv);
  }, [fetchTables]);

  const fetchLeaderboard = async () => {
    const { data } = await API.get('/lobby/leaderboard');
    setLeaderboard(data);
    setShowLeaderboard(true);
  };

  const createTable = async (e) => {
    e.preventDefault();
    setCreating(true); setError('');
    try {
      const { data } = await API.post('/lobby/tables', newTable);
      setTables(t => [data, ...t]);
      setShowCreate(false);
      navigate(`/game/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear mesa');
    } finally { setCreating(false); }
  };

  const statusInfo = (status, count) => {
    if (status === 'waiting') return { label: count < 2 ? 'Esperando' : 'Lista', color: '#22c55e' };
    if (['pre_flop','flop','turn','river'].includes(status)) return { label: 'En juego', color: '#f0b429' };
    return { label: 'Finalizada', color: '#6b7280' };
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0a0e1a 0%, #0d1220 100%)' }}>

      {/* ── Header ── */}
      <header style={{ background: 'linear-gradient(180deg, #111827, #0f172a)', borderBottom: '1px solid #1e2a40' }}>
        {/* Top bar */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl text-yellow-400">♠</span>
            <div>
              <div className="text-base font-black text-yellow-400 leading-none">PokerOnline</div>
              <div className="text-xs text-gray-500 leading-none">Texas Hold'em</div>
            </div>
          </div>
          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-bold">{user?.username}</div>
              <div className="flex items-center gap-1 justify-end">
                <Chip amount={user?.chips || 0} size={16} />
                <span className="text-xs text-yellow-300 font-semibold">{user?.chips?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Nav buttons */}
        <div className="px-4 pb-2 flex gap-2">
          <button onClick={fetchLeaderboard}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-gray-300 transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #2a3040' }}>
            🏆 Ranking
          </button>
          {user?.isAdmin && (
            <button onClick={() => navigate('/admin')}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
              style={{ background: 'linear-gradient(180deg, #f0b429, #d4991a)', color: '#1a1a1a' }}>
              ⚙ Admin
            </button>
          )}
          <button onClick={logout}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-gray-400 transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #2a3040' }}>
            Salir
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="px-4 py-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white">Mesas disponibles</h2>
            <p className="text-xs text-gray-500">{tables.length} mesas activas</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="py-2 px-5 rounded-xl text-sm font-bold active:scale-95 transition-all"
            style={{ background: 'linear-gradient(180deg, #f0b429, #d4991a)', color: '#1a1a1a', boxShadow: '0 4px 16px rgba(240,180,41,0.4)' }}>
            + Crear
          </button>
        </div>

        {tables.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4 opacity-30">🃏</div>
            <p className="text-gray-500">No hay mesas activas</p>
            <p className="text-gray-600 text-sm mt-1">Creá la primera mesa y empezá a jugar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tables.map(table => {
              const si = statusInfo(table.status, table.playerCount);
              const pct = (table.playerCount / table.max_players) * 100;
              return (
                <div key={table.id} className="table-card rounded-2xl overflow-hidden"
                  style={{ background: 'linear-gradient(180deg, #1a1f2e, #111827)', border: '1px solid #2a3040' }}>
                  {/* Top stripe */}
                  <div className="h-1" style={{ background: `linear-gradient(90deg, ${si.color}88, ${si.color}22)` }} />
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1 mr-3">
                        <h3 className="font-bold text-white truncate">{table.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-semibold" style={{ color: si.color }}>{si.label}</span>
                          {table.isTournament && (
                            <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                              style={{ background: '#6b21a822', color: '#a855f7', border: '1px solid #6b21a844' }}>
                              Torneo
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Player count */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-xl font-black text-white">{table.playerCount}<span className="text-sm text-gray-500 font-normal">/{table.max_players}</span></div>
                        <div className="w-16 h-1.5 bg-gray-700 rounded-full mt-1">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: si.color }} />
                        </div>
                      </div>
                    </div>
                    {/* Info row */}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span>Blinds <span className="text-gray-300 font-semibold">{table.small_blind}/{table.big_blind}</span></span>
                        <span>Buy-in <span className="text-gray-300 font-semibold">{table.min_buy_in}-{table.max_buy_in}</span></span>
                      </div>
                      <button onClick={() => navigate(`/game/${table.id}`)}
                        disabled={table.playerCount >= table.max_players}
                        className="py-2 px-5 rounded-xl text-sm font-bold active:scale-95 transition-all disabled:opacity-40"
                        style={{ background: table.playerCount >= table.max_players ? '#374151' : 'linear-gradient(180deg, #f0b429, #d4991a)', color: table.playerCount >= table.max_players ? '#9ca3af' : '#1a1a1a' }}>
                        {table.playerCount >= table.max_players ? 'Llena' : 'Entrar →'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Create Table Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-md rounded-t-2xl overflow-y-auto" style={{ maxHeight: '90dvh', background: '#111827', border: '1px solid #2a3040', borderBottom: 'none' }}>
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #1e2a40' }}>
              <h3 className="font-bold">Nueva Mesa</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800">✕</button>
            </div>
            <div className="p-4">
              {error && <div className="bg-red-900/30 border border-red-700/50 text-red-300 px-3 py-2 rounded-lg mb-3 text-sm">{error}</div>}
              <form onSubmit={createTable} className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nombre</label>
                  <input className="input" value={newTable.name} onChange={e => setNewTable(f => ({ ...f, name: e.target.value }))} placeholder="Mesa VIP" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[['Small Blind','smallBlind',1],['Big Blind','bigBlind',2],['Buy-in mín','minBuyIn',20],['Buy-in máx','maxBuyIn',1]].map(([label,key,min]) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-400 mb-1">{label}</label>
                      <input className="input" type="number" value={newTable[key]} min={min}
                        onChange={e => setNewTable(f => ({ ...f, [key]: +e.target.value }))} />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Jugadores: <span className="text-white font-bold">{newTable.maxPlayers}</span></label>
                  <input type="range" min={2} max={9} value={newTable.maxPlayers}
                    onChange={e => setNewTable(f => ({ ...f, maxPlayers: +e.target.value }))}
                    className="w-full accent-yellow-400" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Cancelar</button>
                  <button type="submit" disabled={creating} className="btn-primary flex-1 py-3">
                    {creating ? 'Creando...' : 'Crear y entrar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Leaderboard Modal ── */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-md rounded-t-2xl overflow-hidden" style={{ maxHeight: '80dvh', background: '#111827', border: '1px solid #2a3040', borderBottom: 'none' }}>
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #1e2a40' }}>
              <h3 className="font-bold">🏆 Ranking de Jugadores</h3>
              <button onClick={() => setShowLeaderboard(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="overflow-y-auto p-3 space-y-2" style={{ maxHeight: 'calc(80dvh - 60px)' }}>
              {leaderboard.map((u, i) => (
                <div key={u.username}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: u.username === user?.username ? 'rgba(240,180,41,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${u.username === user?.username ? 'rgba(240,180,41,0.3)' : '#2a3040'}` }}>
                  <div className="flex items-center gap-3">
                    <span className="font-black w-6 text-center" style={{ color: i === 0 ? '#f0b429' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7c2f' : '#4b5563', fontSize: i < 3 ? 16 : 13 }}>
                      {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                    </span>
                    <span className={`font-semibold text-sm ${u.username === user?.username ? 'text-yellow-300' : 'text-white'}`}>{u.username}</span>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Chip amount={u.chips} size={18} />
                      <span className="text-yellow-400 font-bold text-sm">{u.chips?.toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-gray-500">{u.total_wins} victorias</div>
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
