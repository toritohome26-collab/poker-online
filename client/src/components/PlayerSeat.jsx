import React from 'react';
import { Card, CardBack } from './Card';

export default function PlayerSeat({ player, isMe, isCurrent, isDealer, cards, showCards }) {
  if (!player) {
    return (
      <div className="flex flex-col items-center gap-0.5 opacity-20">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-dashed border-gray-600 flex items-center justify-center">
          <span className="text-gray-600 text-sm">+</span>
        </div>
      </div>
    );
  }

  const isFolded = player.status === 'folded';
  const isAllIn  = player.status === 'all-in';

  return (
    <div className={`flex flex-col items-center gap-0.5 transition-all ${isFolded ? 'opacity-40' : ''}`}>
      {/* Cards above */}
      <div className="flex gap-0.5 mb-0.5">
        {showCards && cards?.length > 0
          ? cards.map((c, i) => <Card key={i} card={c} small />)
          : cards?.length > 0 && !isFolded
            ? [0,1].map(i => <CardBack key={i} small />)
            : null}
      </div>

      {/* Avatar */}
      <div className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center text-xs sm:text-sm font-bold transition-all
        ${isCurrent ? 'border-gold shadow-[0_0_10px_rgba(240,180,41,0.8)] animate-pulse' : isMe ? 'border-blue-500' : 'border-gray-600'}
        ${isFolded ? 'bg-gray-700' : 'bg-gray-600'}`}>
        {player.username[0].toUpperCase()}
        {isDealer && (
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-gray-900 text-xs flex items-center justify-center font-bold border border-gray-400" style={{fontSize: 9}}>D</div>
        )}
      </div>

      {/* Name */}
      <div className={`text-xs font-semibold ${isMe ? 'text-blue-400' : 'text-white'} max-w-[60px] truncate text-center leading-none`}>
        {player.username}
      </div>

      {/* Chips */}
      <div className="text-xs text-gold leading-none">{player.chips?.toLocaleString()}</div>

      {/* Status */}
      {(isFolded || isAllIn) && (
        <div className={`text-xs font-bold px-1 py-0.5 rounded leading-none ${isAllIn ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400'}`} style={{fontSize: 9}}>
          {isAllIn ? 'ALL IN' : 'FOLD'}
        </div>
      )}

      {/* Bet */}
      {player.bet > 0 && (
        <div className="text-xs text-yellow-400 bg-gray-900/80 px-1 rounded-full leading-none">{player.bet.toLocaleString()}</div>
      )}
    </div>
  );
}
