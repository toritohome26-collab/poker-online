import React from 'react';
import { Card, CardBack, Chip } from './Card';

const AVATARS = ['🦁','🐯','🦊','🐺','🦝','🐻','🐼','🦄','🐸','🦋','🦅','🐉'];

function getAvatar(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return AVATARS[Math.abs(hash) % AVATARS.length];
}

export default function PlayerSeat({ player, isMe, isCurrent, isDealer, cards, showCards }) {
  if (!player) {
    return (
      <div className="flex flex-col items-center gap-1 opacity-20 pointer-events-none">
        <div className="w-10 h-10 rounded-full border border-dashed border-gray-600 flex items-center justify-center text-gray-600 text-lg">+</div>
      </div>
    );
  }

  const isFolded = player.status === 'folded';
  const isAllIn  = player.status === 'all-in';
  const avatar   = getAvatar(player.username);

  return (
    <div className={`flex flex-col items-center gap-0.5 transition-all duration-200 ${isFolded ? 'opacity-30' : ''}`}>
      {/* Cards */}
      <div className="flex gap-0.5 mb-0.5">
        {showCards && cards?.length > 0
          ? cards.map((c, i) => <Card key={i} card={c} small />)
          : cards?.length > 0 && !isFolded
            ? [0,1].map(i => <CardBack key={i} small />)
            : null}
      </div>

      {/* Avatar circle */}
      <div className="relative">
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-xl transition-all duration-200
          ${isCurrent ? 'turn-glow' : ''}
          ${isMe ? 'ring-2 ring-blue-400' : ''}`}
          style={{
            background: isFolded
              ? '#374151'
              : `radial-gradient(circle at 35% 35%, ${isMe ? '#3b82f6' : '#6b7280'}, ${isMe ? '#1d4ed8' : '#374151'})`,
            boxShadow: isCurrent ? undefined : '0 2px 8px rgba(0,0,0,0.5)',
          }}>
          <span style={{ filter: isFolded ? 'grayscale(1)' : 'none' }}>{avatar}</span>
        </div>

        {/* Dealer button */}
        {isDealer && (
          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center font-bold text-gray-900 text-xs"
            style={{ background: 'linear-gradient(135deg, #f5e06e, #d4af37)', border: '1px solid #b8860b', boxShadow: '0 1px 4px rgba(0,0,0,0.5)', fontSize: 9 }}>
            D
          </div>
        )}

        {/* All-in badge */}
        {isAllIn && (
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ fontSize: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
            ALL IN
          </div>
        )}
      </div>

      {/* Name */}
      <div className={`text-xs font-semibold max-w-[64px] truncate text-center ${isMe ? 'text-blue-300' : 'text-gray-200'}`}
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
        {player.username}
      </div>

      {/* Chips */}
      <div className="flex items-center gap-1">
        <Chip amount={player.chips} size={18} />
        <span className="text-xs font-bold text-yellow-300" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)', fontSize: 10 }}>
          {player.chips?.toLocaleString()}
        </span>
      </div>

      {/* Current bet */}
      {player.bet > 0 && (
        <div className="flex items-center gap-0.5 bg-black/60 px-1.5 py-0.5 rounded-full">
          <Chip amount={player.bet} size={14} />
          <span className="text-yellow-400 font-bold" style={{ fontSize: 9 }}>{player.bet.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
