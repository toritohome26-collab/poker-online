import React from 'react';

const SUIT_SYMBOLS = { h: '♥', d: '♦', c: '♣', s: '♠' };
const VALUE_LABELS = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const RED_SUITS = new Set(['h', 'd']);

function valueLabel(v) {
  return VALUE_LABELS[v] || String(v);
}

export function Card({ card, hidden = false, small = false }) {
  const sizeClass = small ? 'w-10 h-14 text-xs' : 'w-16 h-24 text-base';

  if (hidden || !card) {
    return (
      <div className={`${sizeClass} rounded-lg bg-blue-900 border-2 border-blue-700 flex items-center justify-center shadow-lg card-enter`}>
        <span className="text-blue-500 text-xl">?</span>
      </div>
    );
  }

  const isRed = RED_SUITS.has(card.suit);
  const colorClass = isRed ? 'text-red-600' : 'text-gray-900';

  return (
    <div className={`${sizeClass} rounded-lg bg-white border-2 border-gray-200 flex flex-col justify-between p-1 shadow-lg card-enter select-none`}>
      <div className={`font-bold leading-none ${colorClass}`}>
        <div>{valueLabel(card.value)}</div>
        <div>{SUIT_SYMBOLS[card.suit]}</div>
      </div>
      <div className={`font-bold leading-none self-end rotate-180 ${colorClass}`}>
        <div>{valueLabel(card.value)}</div>
        <div>{SUIT_SYMBOLS[card.suit]}</div>
      </div>
    </div>
  );
}

export function CardBack({ small = false }) {
  return <Card hidden small={small} />;
}
