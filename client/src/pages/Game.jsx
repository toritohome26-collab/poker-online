import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../context/AuthContext';
import { getSocket } from '../socket';
import { Card } from '../components/Card';
import PlayerSeat from '../components/PlayerSeat';
import BettingControls from '../components/BettingControls';
import Chat from '../components/Chat';

// Positions as % of table container (top, left) for up to 9 seats
// Adjusted for mobile-first oval layout
const SEAT_POSITIONS = [
  { bottom: '2%',  left: '50%',  transform: 'translateX(-50%)' },   // 0 bottom center (me)
  { bottom: '12%', left: '10%' },                                     // 1 bottom left
  { top: '50%',    left: '2%',   transform: 'translateY(-50%)' },    // 2 mid left
  { top: '12%',    left: '10%' },                                     // 3 top left
  { top: '2%',     left: '50%',  transform: 'translateX(-50%)' },    // 4 top center
  { top: '12%',    right: '10%' },                                    // 5 top right
  { top: '50%',    right: '2%',  transform: 'translateY(-50%)' },    // 6 mid right
  { bottom: '12%', right: '10%' },                                    // 7 bottom right
  { bottom: '2%',  right: '18%' },                                    // 8 extra
];

const PHASE_LABELS = {
  waiting:  '⏳ Esperando jugadores',
  pre_flop: '🃏 Pre-Flop',
  flop:     '🃏 Flop',
  turn:     '🃏 Turn',
  river:    '🃏 River',
  showdown: '🎭 Showdown',
};

export default function Game() {
  const { tableId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [gameState, setGameState]   = useState(null);
  const [myCards, setMyCards]       = useState([]);
  const [chat, setChat]             = useState([]);
  const [tableInfo, setTableInfo]   = useState(null);
  const [showdown, setShowdown]     = useState(null);
  const [notification, setNotification] = useState('');
  const [buyIn, setBuyIn]           = useState(null);
  const [showBuyIn, setShowBuyIn]   = useState(false);
  const [showChat, setShowChat]     = useState(false);
  const [unread, setUnread]         = useState(0);
  const socketRef = useRef(null);

  const notify = useCallback((msg, duration = 3500) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), duration);
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
    socket.on('showdown', (data) => {
      if (data.tableId !== tableId) return;
      setShowdown(data);
      setGameState(g => g ? { ...g, communityCards: data.communityCards, phase: 'showdown' } : g);
      const myResult = data.results.find(r => r.playerId === user.id);
      if (myResult) setMyCards(myResult.holeCards || []);
    });
    socket.on('winner', (data) => {
      if (data.tableId !== tableId) return;
      notify(data.winnerId === user.id ? `🏆 ¡Ganaste ${data.winAmount.toLocaleString()} fichas!` : `El jugador ganó ${data.winAmount.toLocaleString()} fichas`, 4000);
    });
    socket.on('player_bust', ({ playerId }) => {
      if (playerId === user.id) notify('Te quedaste sin fichas. Volvé al lobby.', 6000);
    });
    socket.on('chat_message', (msg) => {
      if (msg.tableId !== tableId) return;
      setChat(prev => [...prev, msg].slice(-100));
      setUnread(n => n + 1);
    });
    socket.on('error', ({ message }) => notify(`⚠️ ${message}`, 4000));
    socket.on('left_table', () => navigate('/lobby'));

    return () => {
      ['game_state','joined_table','showdown','winner','player_bust','chat_message','error','left_table']
        .forEach(e => socket.off(e));
    };
  }, [tableId, user.id, navigate, notify]);

  const handleJoin    = (amount) => { setShowBuyIn(false); joinTable(amount); };
  const handleAction  = useCallback((action, amount) => { socketRef.current?.emit('action', { tableId, action, amount }); }, [tableId]);
  const handleChat    = useCallback((text) => { socketRef.current?.emit('chat', { tableId, text }); }, [tableId]);
  const handleLeave   = () => { socketRef.current?.emit('leave_table', { tableId }); navigate('/lobby'); };

  const myPlayer   = gameState?.players?.find(p => p.id === user.id);
  const isMyTurn   = gameState?.currentPlayerId === user.id;
  const community  = gameState?.communityCards || [];

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

  const displayPlayers = getDisplayPlayers();
  const dealerPlayer   = gameState?.players?.[gameState?.dealerIndex];

  // ── Buy-in screen ──────────────────────────────────────────────
  if (showBuyIn && tableInfo) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-sm border border-gray-700">
          <h2 className="text-2xl font-bold mb-2 text-center">Entrar a la mesa</h2>
          <p className="text-gray-400 text-center mb-6">{tableInfo.name}</p>
          <div className="bg-gray-700 rounded-xl p-4 mb-6 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-gray-400">Blinds</span><span>{tableInfo.small_blind}/{tableInfo.big_blind}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Buy-in mín.</span><span className="text-gold">{tableInfo.min_buy_in?.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Buy-in máx.</span><span className="text-gold">{tableInfo.max_buy_in?.toLocaleString()}</span></div>
          </div>
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Tu buy-in</label>
            <input className="input text-center text-xl font-bold" type="number" value={buyIn || ''} onChange={e => setBuyIn(+e.target.value)} min={tableInfo.min_buy_in} max={tableInfo.max_buy_in} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/lobby')} className="btn-ghost flex-1">Volver</button>
            <button onClick={() => handleJoin(buyIn || tableInfo.min_buy_in)} className="btn-primary flex-1">Entrar</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Game screen ────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-gray-900" style={{ height: '100dvh' }}>

      {/* ── Header ── */}
      <header className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">♠</span>
          <span className="font-bold text-gold text-sm truncate">{tableInfo?.name || 'Mesa'}</span>
          {gameState && <span className="text-xs text-gray-400 hidden sm:inline">{PHASE_LABELS[gameState.phase]}</span>}
        </div>
        <div className="flex items-center gap-2">
          {myPlayer && <span className="text-xs text-gold">🪙 {myPlayer.chips?.toLocaleString()}</span>}
          {/* Chat toggle (mobile) */}
          <button
            onClick={() => { setShowChat(v => !v); setUnread(0); }}
            className="relative btn-ghost text-xs py-1 px-2"
          >
            💬
            {unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{unread}</span>}
          </button>
          <button onClick={handleLeave} className="btn-ghost text-xs py-1 px-2">Salir</button>
        </div>
      </header>

      {/* ── Notification ── */}
      {notification && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 border border-gold text-gold px-4 py-2 rounded-xl font-semibold text-sm shadow-2xl text-center max-w-xs">
          {notification}
        </div>
      )}

      {/* ── Table area ── */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden px-2 py-2 relative">

        {/* Table oval — responsive square container */}
        <div className="relative w-full" style={{ maxWidth: 600, aspectRatio: '3/2' }}>
          {/* Felt */}
          <div
            className="absolute rounded-[50%] bg-felt border-[6px] border-felt-dark shadow-2xl"
            style={{ inset: '8%', boxShadow: 'inset 0 0 50px rgba(0,0,0,0.5), 0 0 30px rgba(0,0,0,0.7)' }}
          >
            {/* Center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-4">
              {/* Community cards */}
              <div className="flex gap-1">
                {[0,1,2,3,4].map(i => (
                  community[i]
                    ? <Card key={i} card={community[i]} small />
                    : <div key={i} className="w-8 h-11 sm:w-10 sm:h-14 rounded border border-dashed border-green-800 opacity-30" />
                ))}
              </div>
              {/* Pot */}
              {gameState?.pot > 0 && (
                <div className="bg-gray-900/70 px-3 py-0.5 rounded-full text-gold font-bold text-xs">
                  Pot: {gameState.pot.toLocaleString()} 🪙
                </div>
              )}
              {gameState?.phase === 'waiting' && (
                <div className="text-green-300 text-xs animate-pulse text-center">
                  {(gameState.players?.length || 0) < 2 ? 'Esperando jugadores...' : 'Iniciando mano...'}
                </div>
              )}
              {gameState?.phase && gameState.phase !== 'waiting' && (
                <div className="text-xs text-green-200 opacity-70">{PHASE_LABELS[gameState.phase]}</div>
              )}
            </div>
          </div>

          {/* Player seats */}
          {displayPlayers.slice(0, 9).map((player, i) => {
            const pos = SEAT_POSITIONS[i];
            const isDealer = player && dealerPlayer && player.id === dealerPlayer.id;
            const isMePlayer = player?.id === user.id;
            const showdownResult = showdown?.results?.find(r => r.playerId === player?.id);
            const cards = isMePlayer ? myCards : (showdownResult ? showdownResult.holeCards : (player ? [null, null] : []));
            const showCards = isMePlayer || !!showdownResult;

            return (
              <div key={i} className="absolute" style={pos}>
                <PlayerSeat
                  player={player}
                  isMe={isMePlayer}
                  isCurrent={gameState?.currentPlayerId === player?.id}
                  isDealer={isDealer}
                  cards={cards}
                  showCards={showCards}
                />
                {showdownResult && (
                  <div className="text-center mt-0.5">
                    <span className="text-xs bg-gray-900/90 text-yellow-300 px-1 py-0.5 rounded">{showdownResult.hand}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* My hole cards */}
        {myCards.length > 0 && gameState?.phase !== 'waiting' && (
          <div className="flex gap-2 mt-2">
            {myCards.map((c, i) => <Card key={i} card={c} small />)}
          </div>
        )}

        {/* Betting controls */}
        <div className="w-full max-w-lg px-2 mt-2">
          <BettingControls gameState={gameState} myPlayer={myPlayer} onAction={handleAction} disabled={!isMyTurn} />
          {isMyTurn && (
            <div className="text-center text-gold text-xs mt-1 animate-pulse font-semibold">⚡ ¡Es tu turno!</div>
          )}
        </div>
      </div>

      {/* ── Chat drawer (slides up on mobile) ── */}
      {showChat && (
        <div className="fixed inset-0 z-40 bg-black/60 flex flex-col justify-end" onClick={() => setShowChat(false)}>
          <div className="bg-gray-900 rounded-t-2xl h-2/3 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <span className="font-semibold">Chat</span>
              <button onClick={() => setShowChat(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="flex-1 min-h-0">
              <Chat messages={chat} onSend={(t) => { handleChat(t); }} username={user.username} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
