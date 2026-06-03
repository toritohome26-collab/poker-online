import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../context/AuthContext';
import { getSocket } from '../socket';
import { Card } from '../components/Card';
import PlayerSeat from '../components/PlayerSeat';
import BettingControls from '../components/BettingControls';
import Chat from '../components/Chat';

// Seat positions around an oval table (CSS %)
const SEAT_POSITIONS = [
  { bottom: '2%', left: '50%', transform: 'translateX(-50%)' },       // 0 - bottom center (me)
  { bottom: '10%', left: '15%' },                                       // 1 - bottom left
  { top: '50%', left: '2%', transform: 'translateY(-50%)' },           // 2 - mid left
  { top: '15%', left: '12%' },                                          // 3 - top left
  { top: '5%', left: '50%', transform: 'translateX(-50%)' },           // 4 - top center
  { top: '15%', right: '12%' },                                         // 5 - top right
  { top: '50%', right: '2%', transform: 'translateY(-50%)' },          // 6 - mid right
  { bottom: '10%', right: '15%' },                                      // 7 - bottom right
  { bottom: '2%', right: '20%' },                                       // 8 - extra
];

const PHASE_LABELS = {
  waiting: '⏳ Esperando jugadores',
  pre_flop: '🃏 Pre-Flop',
  flop: '🃏 Flop',
  turn: '🃏 Turn',
  river: '🃏 River',
  showdown: '🎭 Showdown',
};

export default function Game() {
  const { tableId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState(null);
  const [myCards, setMyCards] = useState([]);
  const [chat, setChat] = useState([]);
  const [tableInfo, setTableInfo] = useState(null);
  const [showdown, setShowdown] = useState(null);
  const [winner, setWinner] = useState(null);
  const [notification, setNotification] = useState('');
  const [buyIn, setBuyIn] = useState(null);
  const [showBuyIn, setShowBuyIn] = useState(false);
  const socketRef = useRef(null);

  const notify = useCallback((msg, duration = 3000) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), duration);
  }, []);

  useEffect(() => {
    API.get('/lobby/tables').then(({ data }) => {
      const table = data.find(t => t.id === tableId);
      if (table) {
        setTableInfo(table);
        setBuyIn(table.min_buy_in);
        setShowBuyIn(true);
      }
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
      setWinner(null);
    });

    socket.on('joined_table', ({ state }) => {
      if (state.myCards) setMyCards(state.myCards);
      if (state.chat) setChat(state.chat);
      setGameState(state);
    });

    socket.on('action', ({ playerId, action, tableId: tid, timeout }) => {
      if (tid !== tableId) return;
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
      setWinner(data);
      notify(`🏆 ${data.winnerId === user.id ? '¡Ganaste!' : 'El jugador ganó'} ${data.winAmount.toLocaleString()} fichas`, 4000);
    });

    socket.on('player_bust', ({ playerId }) => {
      if (playerId === user.id) notify('Te quedaste sin fichas. Volvé al lobby para recargar.', 6000);
    });

    socket.on('chat_message', (msg) => {
      if (msg.tableId !== tableId) return;
      setChat(prev => [...prev, msg].slice(-100));
    });

    socket.on('error', ({ message }) => notify(`⚠️ ${message}`, 4000));

    socket.on('left_table', () => navigate('/lobby'));

    return () => {
      socket.off('game_state');
      socket.off('joined_table');
      socket.off('action');
      socket.off('showdown');
      socket.off('winner');
      socket.off('player_bust');
      socket.off('chat_message');
      socket.off('error');
      socket.off('left_table');
    };
  }, [tableId, user.id, navigate, notify]);

  const handleJoin = (amount) => {
    setShowBuyIn(false);
    joinTable(amount);
  };

  const handleAction = useCallback((action, amount) => {
    socketRef.current?.emit('action', { tableId, action, amount });
  }, [tableId]);

  const handleChat = useCallback((text) => {
    socketRef.current?.emit('chat', { tableId, text });
  }, [tableId]);

  const handleLeave = () => {
    socketRef.current?.emit('leave_table', { tableId });
    navigate('/lobby');
  };

  const myPlayer = gameState?.players?.find(p => p.id === user.id);
  const isMyTurn = gameState?.currentPlayerId === user.id;
  const communityCards = gameState?.communityCards || [];

  // Arrange players with me at seat 0
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
  const dealerPlayer = gameState?.players?.[gameState?.dealerIndex];

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

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col" style={{ height: '100vh' }}>
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">♠</span>
          <span className="font-bold text-gold">{tableInfo?.name || 'Mesa'}</span>
          {gameState && <span className="text-sm text-gray-400">{PHASE_LABELS[gameState.phase]}</span>}
        </div>
        <div className="flex items-center gap-3">
          {myPlayer && <span className="text-sm text-gold">🪙 {myPlayer.chips?.toLocaleString()}</span>}
          <button onClick={handleLeave} className="btn-ghost text-sm py-1">Salir</button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Poker Table */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative">

          {/* Notification */}
          {notification && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 border border-gold text-gold px-6 py-3 rounded-xl font-semibold text-sm shadow-2xl animate-bounce">
              {notification}
            </div>
          )}

          {/* Table oval */}
          <div className="relative w-full max-w-3xl" style={{ height: '420px' }}>
            {/* Felt surface */}
            <div className="absolute inset-8 rounded-[50%] bg-felt border-8 border-felt-dark shadow-2xl" style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4), 0 0 40px rgba(0,0,0,0.6)' }}>
              {/* Center info */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {/* Community cards */}
                <div className="flex gap-2 mb-3">
                  {[0,1,2,3,4].map(i => (
                    communityCards[i]
                      ? <Card key={i} card={communityCards[i]} />
                      : <div key={i} className="w-16 h-24 rounded-lg border-2 border-dashed border-green-800 opacity-30" />
                  ))}
                </div>
                {/* Pot */}
                {gameState?.pot > 0 && (
                  <div className="bg-gray-900/60 px-4 py-1 rounded-full text-gold font-bold text-sm">
                    Pot: {gameState.pot.toLocaleString()} 🪙
                  </div>
                )}
                {/* Phase */}
                {gameState?.phase === 'waiting' && (
                  <div className="text-green-300 text-sm mt-2 animate-pulse">
                    {gameState.players?.length < 2 ? 'Esperando más jugadores...' : 'Iniciando mano...'}
                  </div>
                )}
              </div>
            </div>

            {/* Players around the table */}
            {displayPlayers.slice(0, 9).map((player, i) => {
              const pos = SEAT_POSITIONS[i];
              const isDealer = player && dealerPlayer && player.id === dealerPlayer.id;
              const showCards = player?.id === user.id;
              const cards = showCards ? myCards : (player ? [null, null] : []);
              const showdownResult = showdown?.results?.find(r => r.playerId === player?.id);

              return (
                <div key={i} className="absolute" style={pos}>
                  <PlayerSeat
                    player={player}
                    isMe={player?.id === user.id}
                    isCurrent={gameState?.currentPlayerId === player?.id}
                    isDealer={isDealer}
                    cards={showCards ? myCards : (showdownResult ? showdownResult.holeCards : (player ? [null, null] : []))}
                    showCards={showCards || !!showdownResult}
                  />
                  {showdownResult && (
                    <div className="text-center mt-1">
                      <span className="text-xs bg-gray-900/90 text-yellow-300 px-2 py-0.5 rounded">{showdownResult.hand}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* My hole cards (large display below table) */}
          {myCards.length > 0 && gameState?.phase !== 'waiting' && (
            <div className="flex gap-3 mt-4">
              {myCards.map((c, i) => <Card key={i} card={c} />)}
            </div>
          )}

          {/* Betting controls */}
          <div className="mt-4 w-full max-w-lg px-4">
            <BettingControls
              gameState={gameState}
              myPlayer={myPlayer}
              onAction={handleAction}
              disabled={!isMyTurn}
            />
            {isMyTurn && (
              <div className="text-center text-gold text-sm mt-2 animate-pulse font-semibold">
                ⚡ ¡Es tu turno!
              </div>
            )}
          </div>
        </div>

        {/* Chat sidebar */}
        <div className="w-64 flex-shrink-0 p-4 flex flex-col">
          <Chat messages={chat} onSend={handleChat} username={user.username} />
        </div>
      </div>
    </div>
  );
}
