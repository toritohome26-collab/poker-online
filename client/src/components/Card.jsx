import React from 'react';

const SUITS = { h: '♥', d: '♦', c: '♣', s: '♠' };
const VALUES = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const RED = new Set(['h', 'd']);

function val(v) { return VALUES[v] || String(v); }

export function Card({ card, hidden = false, small = false }) {
  const w = small ? 'w-9 h-13' : 'w-14 h-20';
  const textSize = small ? 'text-xs' : 'text-sm';
  const suitSize = small ? 'text-lg' : 'text-3xl';

  if (hidden || !card) {
    return (
      <div className={`${w} rounded-lg card-enter flex-shrink-0`}
        style={{ background: 'linear-gradient(135deg, #1e3a6e 0%, #0f2040 50%, #1e3a6e 100%)', border: '1.5px solid #2a4a8a', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
        <div className="w-full h-full rounded-lg flex items-center justify-center"
          style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 6px)' }}>
          <span style={{ fontSize: small ? 16 : 22, color: '#2a4a8a' }}>♠</span>
        </div>
      </div>
    );
  }

  const isRed = RED.has(card.suit);
  const color = isRed ? '#cc0000' : '#111111';

  return (
    <div className={`${w} rounded-lg card-enter flex-shrink-0 select-none`}
      style={{ background: 'linear-gradient(160deg, #ffffff 0%, #f8f8f8 100%)', border: '1px solid #ddd', boxShadow: '0 3px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.8)' }}>
      <div className="w-full h-full flex flex-col justify-between p-0.5 rounded-lg" style={{ color }}>
        {/* Top-left */}
        <div className={`${textSize} font-black leading-none`} style={{ lineHeight: 1 }}>
          <div>{val(card.value)}</div>
          <div>{SUITS[card.suit]}</div>
        </div>
        {/* Center suit */}
        {!small && (
          <div className={`${suitSize} text-center leading-none`} style={{ color, textShadow: isRed ? '0 1px 2px rgba(200,0,0,0.3)' : 'none' }}>
            {SUITS[card.suit]}
          </div>
        )}
        {/* Bottom-right (rotated) */}
        <div className={`${textSize} font-black leading-none self-end rotate-180`} style={{ lineHeight: 1 }}>
          <div>{val(card.value)}</div>
          <div>{SUITS[card.suit]}</div>
        </div>
      </div>
    </div>
  );
}

export function CardBack({ small = false }) {
  return <Card hidden small={small} />;
}

// Chip component
const CHIP_STYLES = [
  { max: 10,    bg: '#e8e8e8', text: '#333', border: '#bbb', label: '' },
  { max: 50,    bg: '#cc2222', text: '#fff', border: '#ff4444', label: '' },
  { max: 100,   bg: '#1a7a1a', text: '#fff', border: '#2ecc2e', label: '' },
  { max: 500,   bg: '#1a1a1a', text: '#fff', border: '#555', label: '' },
  { max: 2000,  bg: '#6b21a8', text: '#fff', border: '#a855f7', label: '' },
  { max: Infinity, bg: '#b8860b', text: '#fff', border: '#f0b429', label: '' },
];

export function Chip({ amount, size = 28 }) {
  const style = CHIP_STYLES.find(s => amount <= s.max) || CHIP_STYLES[CHIP_STYLES.length - 1];
  return (
    <div className="inline-flex items-center justify-center rounded-full font-bold select-none"
      style={{ width: size, height: size, fontSize: size * 0.28, backgroundColor: style.bg, color: style.text, border: `${size * 0.1}px solid ${style.border}`, boxShadow: `0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)` }}>
      {amount >= 1000 ? `${(amount/1000).toFixed(amount%1000===0?0:1)}k` : amount}
    </div>
  );
}
