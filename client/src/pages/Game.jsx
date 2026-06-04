import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../context/AuthContext';
import { getSocket } from '../socket';
import { Card, Chip } from '../components/Card';
import PlayerSeat from '../components/PlayerSeat';
import BettingControls from '../components/BettingControls';
import Chat from '../components/Chat';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/sounds';

const SEAT_POSITIONS = [
  { bottom: '2%',  left: '50%',  transform: 'translateX(-50%)' },
  { bottom: '12%', left: '8%' },
  { top: '50%',    left: '1%',   transform: 'translateY(-50%)' },
  { top: '10%',    left: '10%' },
  { top: '2%',     left: '50%',  transform: 'translateX(-50%)' },
  { top: '10%',    right: '10%' },
  { top: '50%',    right: '1%',  transform: 'translateY(-50%)' },
  { bottom: '12%', right: '8%' },
  { bottom: '2%',  right: '18%' },
];

const PHASE_LABELS = {
  waiting:  'Esperando jugadores',
  pre_flop: 'Pre-Flop',
  flop:     'Flop',
  turn:     'Turn',
  river:    'River',
  showdown: 'Showdown',
};

const PHASE_COLORS = {
  waiting:  '#6b7280',
  pre_flop: '#f0b429',
  flop:     '#22c55e',
  turn:     '#3b82f6',
  river:    '#a855f7',
  showdown: '#ef4444',
};

export default function Game() {
  const { tableId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [gameState, setGameState]         = useState(null);
  const [myCards, setMyCards]             = useState([]);
  const [chat, setChat]                   = useState([]);
  const [tableInfo, setTableInfo]         = useState(null);
  const [showdown, setShowdown]           = useState(null);
  const [winnerOverlay, setWinnerOverlay] = useState(null);
  const [buyIn, setBuyIn]                 = useState(null);
  const [showBuyIn, setShowBuyIn]         = useState(false);
  const [showChat, setShowChat]           = useState(false);
  const [unread, setUnread]               = useState(0);
  const socketRef = useRef(null);

  const fireConfetti = useCallback(() => {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ['#f0b429','#ffd060','#ffffff','#22c55e'] });
    setTimeout(() => confetti({ particleCount: 60, spread: 60, origin: { x: 0.1, y: 0.6 } }), 300);
    setTimeout(() => confetti({ particleCount: 60, spread: 60, origin: { x: 0.9, y: 0.6 } }), 500);
  }, []);

  useEffect(() => {
    API.get('/lobby/tables').then(({ data }) => {
      const table = data.find(t => t.id === tableId);
      if (table) { setTableInfo(table); setBuyIn(table.min_buy_in); setShowBuyIn(true); }
    }).catch(() => {});
  }, [tableId]);

  const joinTable = useCallback((amount) => {
    const token = localStorage.getItem('token');
    const socket = getSocket(token);
    socketRef.current = socket;
    socket.emit('join_table', { tableId, buyIn: amount });

    socket.on('game_state', (state) => {
      if (state.tableId !== tableId) return;
      const prev = gameState;
      if (prev?.phase === 'waiting' && state.phase === 'pre_flop') sounds.newHand();
      setGameState(state);
      if (state.myCards) setMyCards(state.myCards);
      if (state.chat) setChat(state.chat);
      setShowdown(null);
    });

    socket.on('joined_table', ({ state }) => {
      if (state.myCards) setMyCards(state.myCards);
      if (state.chat) setChat(state.chat);
      setGameState(state);
    });

    socket.on('action', ({ action }) => {
      if (action === 'fold') sounds.fold();
      else if (action === 'all-in') sounds.allin();
      else sounds.chip();
    });

    socket.on('showdown', (data) => {
      if (data.tableId !== tableId) return;
      setShowdown(data);
      setGameState(g => g ? { ...g, communityCards: data.communityCards, phase: 'showdown' } : g);
      const myResult = data.results.find(r => r.playerId === user.id);
      if (myResult) setMyCards(myResult.holeCards || []);
      const iWon = data.winners.some(w => w.playerId === user.id);
      setWinnerOverlay({ winners: data.winners, results: data.results, pot: data.pot, iWon });
      if (iWon) { fireConfetti(); sounds.win(); } else sounds.lose();
      setTimeout(() => setWinnerOverlay(null), 5000);
    });

    socket.on('winner', (data) => {
      if (data.tableId !== tableId) return;
      const iWon = data.winnerId === user.id;
      setWinnerOverlay({ winners: [{ playerId: data.winnerId, winAmount: data.winAmount, hand: 'Todos foldaron' }], results: [], pot: data.winAmount, iWon });
      if (iWon) { fireConfetti(); sounds.win(); } else sounds.lose();
      setTimeout(() => setWinnerOverlay(null), 4000);
    });

    socket.on('chat_message', (msg) => {
      if (msg.tableId !== tableId) return;
      setChat(prev => [...prev, msg].slice(-100));
      if (!showChat) setUnread(n => n + 1);
    });

    socket.on('error', ({ message }) => {
      // show inline
    });
    socket.on('left_table', () => navigate('/lobby'));

    return () => {
      ['game_state','joined_table','action','showdown','winner','chat_message','error','left_table'].forEach(e => socket.off(e));
    };
  }, [tableId, user.id, navigate, fireConfetti]);

  const handleJoin   = (amount) => { setShowBuyIn(false); joinTable(amount); };
  const handleAction = useCallback((action, amount) => { socketRef.current?.emit('action', { tableId, action, amount }); }, [tableId]);
  const handleChat   = useCallback((text) => { socketRef.current?.emit('chat', { tableId, text }); }, [tableId]);
  const handleLeave  = () => { socketRef.current?.emit('leave_table', { tableId }); navigate('/lobby'); };

  const myPlayer    = gameState?.players?.find(p => p.id === user.id);
  const isMyTurn    = gameState?.currentPlayerId === user.id;
  const community   = gameState?.communityCards || [];
  const phase       = gameState?.phase || 'waiting';
  const dealerPlayer = gameState?.players?.[gameState?.dealerIndex];

  const getDisplayPlayers = () => {
    if (!gameState?.players) return Array(9).fill(null);
    const result = Array(9).fill(null);
    const myIdx = gameState.players.findIndex(p => p.id === user.id);
    gameState.players.forEach((p, i) => {
      const pos = myIdx >= 0 ? (i - myIdx + gameState.players.length) % gameState.players.length : i;
      result[pos] = p;
    });
    return result;
  };

  // ── Buy-in screen ──────────────────────────────────────────────────────────
  if (showBuyIn && tableInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a0e1a' }}>
        <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(180deg, #1a1f2e, #111827)', border: '1px solid #2a3040', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
          {/* Header */}
          <div className="px-6 py-4 text-center" style={{ background: 'linear-gradient(180deg, #1e3a6e22, transparent)' }}>
            <div className="text-3xl mb-1">♠</div>
            <h2 className="text-xl font-bold">{tableInfo.name}</h2>
          </div>
          <div className="px-6 pb-6">
            <div className="rounded-xl p-4 mb-4 space-y-2 text-sm" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #2a3040' }}>
              <div className="flex justify-between"><span className="text-gray-400">Blinds</span><span className="text-white font-semibold">{tableInfo.small_blind}/{tableInfo.big_blind}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Buy-in mín.</span><span className="text-yellow-400 font-semibold">{tableInfo.min_buy_in?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Buy-in máx.</span><span className="text-yellow-400 font-semibold">{tableInfo.max_buy_in?.toLocaleString()}</span></div>
            </div>
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1">Tu buy-in</label>
              <input className="input text-center text-xl font-bold" type="number" value={buyIn || ''} onChange={e => setBuyIn(+e.target.value)} min={tableInfo.min_buy_in} max={tableInfo.max_buy_in} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => navigate('/lobby')} className="btn-ghost flex-1">← Volver</button>
              <button onClick={() => handleJoin(buyIn || tableInfo.min_buy_in)} className="btn-primary flex-1 py-3">Sentarse</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Game screen ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ height: '100dvh', background: 'linear-gradient(180deg, #0a0e1a 0%, #0d1220 100%)' }}>

      {/* ── Header ── */}
      <header className="flex-shrink-0 px-3 py-2 flex items-center justify-between"
        style={{ background: 'linear-gradient(180deg, #111827, #0f172a)', borderBottom: '1px solid #1e2a40' }}>
        <div className="flex items-center gap-2">
          <span className="text-xl text-yellow-400">♠</span>
          <span className="font-bold text-yellow-400 text-sm">{tableInfo?.name || 'Mesa'}</span>
          {phase !== 'waiting' && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: `${PHASE_COLORS[phase]}22`, color: PHASE_COLORS[phase], border: `1px solid ${PHASE_COLORS[phase]}44` }}>
              {PHASE_LABELS[phase]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {myPlayer && (
            <div className="flex items-center gap-1">
              <Chip amount={myPlayer.chips} size={18} />
              <span className="text-xs text-yellow-300 font-bold">{myPlayer.chips?.toLocaleString()}</span>
            </div>
          )}
          <button onClick={() => { setShowChat(v => !v); setUnread(0); }}
            className="relative text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg"
            style={{ background: showChat ? '#1e3a6e44' : 'transparent' }}>
            💬
            {unread > 0 && <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center" style={{ fontSize: 9 }}>{unread}</span>}
          </button>
          <button onClick={handleLeave} className="text-gray-500 hover:text-red-400 transition-colors text-xs px-2 py-1 rounded">Salir</button>
        </div>
      </header>

      {/* ── Table area ── */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden relative py-2">

        {/* Winner overlay */}
        {winnerOverlay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="winner-banner rounded-2xl px-8 py-5 text-center mx-4 max-w-xs"
              style={{ background: 'linear-gradient(180deg, #1a1f2e, #0f172a)', border: `2px solid ${winnerOverlay.iWon ? '#f0b429' : '#6b7280'}`, boxShadow: `0 20px 60px rgba(0,0,0,0.9), 0 0 40px ${winnerOverlay.iWon ? 'rgba(240,180,41,0.3)' : 'rgba(0,0,0,0.5)'}` }}>
              <div className="text-4xl mb-2">{winnerOverlay.iWon ? '🏆' : '😔'}</div>
              {winnerOverlay.winners.map((w, i) => {
                const p = gameState?.players?.find(p => p.id === w.playerId);
                const isMe = w.playerId === user.id;
                const result = winnerOverlay.results.find(r => r.playerId === w.playerId);
                return (
                  <div key={i}>
                    <div className="text-xl font-bold mb-1" style={{ color: isMe ? '#f0b429' : '#e5e7eb' }}>
                      {isMe ? '¡GANASTE!' : `Ganó ${p?.username || 'Jugador'}`}
                    </div>
                    {result?.hand && <div className="text-green-400 text-sm font-semibold mb-1">{result.hand}</div>}
                    <div className="text-yellow-400 text-2xl font-black">+{w.winAmount?.toLocaleString()} 🪙</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* My turn indicator */}
        {isMyTurn && !winnerOverlay && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-4 py-1 rounded-full text-sm font-bold"
            style={{ background: 'linear-gradient(90deg, #f0b429, #ffd060)', color: '#1a1a1a', boxShadow: '0 4px 20px rgba(240,180,41,0.6)', animation: 'turnPulse 1.2s infinite' }}>
            ⚡ ¡Tu turno!
          </div>
        )}

        {/* Table oval */}
        <div className="relative w-full" style={{ maxWidth: 600, aspectRatio: '3/2' }}>
          {/* Gold border */}
          <div className="absolute felt-border rounded-[50%]" style={{ inset: '5%', padding: 4 }}>
            <div className="w-full h-full rounded-[50%] felt flex flex-col items-center justify-center"
              style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.4)' }}>

              {/* Community cards */}
              <div className="flex gap-1 mb-1.5">
                {[0,1,2,3,4].map(i => (
                  community[i]
                    ? <Card key={i} card={community[i]} small />
                    : <div key={i} className="w-9 h-13 rounded-lg opacity-20"
                        style={{ border: '1px dashed rgba(255,255,255,0.3)', width: 36, height: 52 }} />
                ))}
              </div>

              {/* Pot */}
              {gameState?.pot > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(240,180,41,0.3)' }}>
                  <Chip amount={gameState.pot} size={20} />
                  <span className="text-yellow-300 font-bold text-xs">{gameState.pot.toLocaleString()}</span>
                </div>
              )}

              {/* Phase / waiting message */}
              {phase === 'waiting' && (
                <div className="text-green-300 text-xs mt-1 animate-pulse">
                  {(gameState?.players?.length || 0) < 2 ? 'Esperando jugadores...' : 'Comenzando mano...'}
                </div>
              )}
            </div>
          </div>

          {/* Player seats */}
          {getDisplayPlayers().slice(0, 9).map((player, i) => {
            const isDealer = player && dealerPlayer && player.id === dealerPlayer.id;
            const isMePlayer = player?.id === user.id;
            const showdownResult = showdown?.results?.find(r => r.playerId === player?.id);
            const cards = isMePlayer ? myCards : (showdownResult ? showdownResult.holeCards : (player ? [null, null] : []));

            return (
              <div key={i} className="absolute" style={SEAT_POSITIONS[i]}>
                <PlayerSeat
                  player={player}
                  isMe={isMePlayer}
                  isCurrent={gameState?.currentPlayerId === player?.id}
                  isDealer={isDealer}
                  cards={cards}
                  showCards={isMePlayer || !!showdownResult}
                />
                {showdownResult?.hand && (
                  <div className="text-center mt-0.5">
                    <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                      style={{ background: 'rgba(0,0,0,0.8)', color: '#fbbf24', fontSize: 9 }}>
                      {showdownResult.hand}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* My hole cards */}
        {myCards.length > 0 && phase !== 'waiting' && (
          <div className="flex gap-2 mt-2">
            {myCards.map((c, i) => <Card key={i} card={c} />)}
          </div>
        )}

        {/* Betting controls */}
        <div className="w-full mt-2">
          <BettingControls gameState={gameState} myPlayer={myPlayer} onAction={handleAction} disabled={!isMyTurn} />
        </div>
      </div>

      {/* ── Chat drawer ── */}
      {showChat && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowChat(false)}>
          <div className="rounded-t-2xl flex flex-col" style={{ height: '60%', background: '#111827', border: '1px solid #1e2a40' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e2a40' }}>
              <span className="font-semibold text-sm">Chat de mesa</span>
              <button onClick={() => setShowChat(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="flex-1 min-h-0">
              <Chat messages={chat} onSend={handleChat} username={user.username} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
