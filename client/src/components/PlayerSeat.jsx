import React from 'react';
import { Card, CardBack } from './Card';

const STATUS_LABELS = {
  active: null,
  folded: 'FOLD',
  'all-in': 'ALL IN',
  waiting: null,
};

export default function PlayerSeat({ player, isMe, isCurrent, isDealer, cards, showCards }) {
  if (!player) {
    return (
      <div className="flex flex-col items-center gap-1 opacity-30">
        <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center">
          <span className="text-gray-600 text-2xl">+</span>
        </div>
        <span className="text-xs text-gray-600">Libre</span>
      </div>
    );
  }

  const isFolded = player.status === 'folded';
  const isAllIn = player.status === 'all-in';

  return (
    <div className={`flex flex-col items-center gap-1 transition-all ${isFolded ? 'opacity-40' : ''}`}>
      {/* Cards above player */}
      <div className="flex gap-1 mb-1">
        {showCards && cards?.length > 0 ? (
          cards.map((c, i) => <Card key={i} card={c} small />)
        ) : (
          cards?.length > 0 && !isFolded ? (
            [0, 1].map(i => <CardBack key={i} small />)
          ) : null
        )}
      </div>

      {/* Avatar */}
      <div className={`relative w-14 h-14 rounded-full border-4 flex items-center justify-center text-xl font-bold transition-all
        ${isCurrent ? 'border-gold shadow-[0_0_15px_rgba(240,180,41,0.8)] animate-pulse' : isMe ? 'border-blue-500' : 'border-gray-600'}
        ${isFolded ? 'bg-gray-700' : 'bg-gray-600'}`}>
        {player.username[0].toUpperCase()}
        {isDealer && (
          <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white text-gray-900 text-xs flex items-center justify-center font-bold border border-gray-400">D</div>
        )}
      </div>

      {/* Name & chips */}
      <div className="text-center">
        <div className={`text-sm font-semibold ${isMe ? 'text-blue-400' : 'text-white'} max-w-[80px] truncate`}>
          {player.username}
          {isMe && ' (vos)'}
        </div>
        <div className="text-xs text-gold">{player.chips?.toLocaleString()} 🪙</div>
      </div>

      {/* Status badge */}
      {(isFolded || isAllIn) && (
        <div className={`text-xs font-bold px-2 py-0.5 rounded ${isAllIn ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
          {STATUS_LABELS[player.status]}
        </div>
      )}

      {/* Current bet */}
      {player.bet > 0 && (
        <div className="text-xs text-yellow-400 bg-gray-900/80 px-2 py-0.5 rounded-full">
          {player.bet.toLocaleString()}
        </div>
      )}
    </div>
  );
}
