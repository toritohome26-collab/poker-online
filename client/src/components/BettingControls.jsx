import React, { useState } from 'react';
import { Chip } from './Card';
import { sounds } from '../utils/sounds';

export default function BettingControls({ gameState, myPlayer, onAction, disabled }) {
  const [raiseAmount, setRaiseAmount] = useState('');

  if (!myPlayer || myPlayer.status !== 'active' || disabled) return null;

  const { currentBet, bigBlind } = gameState;
  const toCall   = Math.max(0, currentBet - (myPlayer.bet || 0));
  const canCheck = toCall === 0;
  const minRaise = currentBet + bigBlind;

  const act = (action, amount) => {
    if (action === 'fold')   sounds.fold();
    if (action === 'call' || action === 'all-in') sounds.chip();
    if (action === 'raise')  sounds.chip();
    onAction(action, amount);
    setRaiseAmount('');
  };

  const setQuick = (mult) => {
    const amount = Math.min(Math.max(minRaise, currentBet * mult + currentBet), myPlayer.chips + (myPlayer.bet || 0));
    setRaiseAmount(String(Math.floor(amount)));
  };

  return (
    <div className="w-full max-w-lg mx-auto px-2">
      {/* Info bar */}
      <div className="text-center text-xs text-gray-400 mb-2">
        {toCall > 0
          ? <span>Para igualar: <span className="text-yellow-300 font-bold">{toCall.toLocaleString()}</span> fichas</span>
          : <span className="text-green-400">Podés hacer check</span>}
      </div>

      {/* Main buttons */}
      <div className="flex gap-2 mb-2">
        <button onClick={() => act('fold')}
          className="flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
          style={{ background: 'linear-gradient(180deg, #ef4444, #b91c1c)', boxShadow: '0 4px 12px rgba(239,68,68,0.3)', border: '1px solid #dc2626' }}>
          Fold
        </button>

        {canCheck ? (
          <button onClick={() => act('check')}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
            style={{ background: 'linear-gradient(180deg, #374151, #1f2937)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', border: '1px solid #4b5563' }}>
            Check
          </button>
        ) : toCall >= myPlayer.chips ? (
          <button onClick={() => act('all-in')}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
            style={{ background: 'linear-gradient(180deg, #22c55e, #15803d)', boxShadow: '0 4px 12px rgba(34,197,94,0.3)', border: '1px solid #16a34a' }}>
            Call All-In<br/>
            <span className="text-xs opacity-80">{myPlayer.chips.toLocaleString()}</span>
          </button>
        ) : (
          <button onClick={() => act('call')}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
            style={{ background: 'linear-gradient(180deg, #22c55e, #15803d)', boxShadow: '0 4px 12px rgba(34,197,94,0.3)', border: '1px solid #16a34a' }}>
            Call<br/>
            <span className="text-xs opacity-80">{toCall.toLocaleString()}</span>
          </button>
        )}

        {(!canCheck ? toCall < myPlayer.chips : true) && (
          <button onClick={() => act('all-in')}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
            style={{ background: 'linear-gradient(180deg, #a855f7, #7e22ce)', boxShadow: '0 4px 12px rgba(168,85,247,0.3)', border: '1px solid #9333ea' }}>
            All-In<br/>
            <span className="text-xs opacity-80">{myPlayer.chips.toLocaleString()}</span>
          </button>
        )}
      </div>

      {/* Raise section */}
      {myPlayer.chips > toCall && (
        <div className="bg-black/40 rounded-xl p-2 border border-gray-700/50">
          <div className="flex gap-1 mb-2">
            {[['½', 0.5], ['¾', 0.75], ['1x', 1], ['2x', 2]].map(([label, mult]) => (
              <button key={label} onClick={() => setQuick(mult)}
                className="flex-1 py-1 rounded-lg text-xs font-semibold text-gray-300 transition-all active:scale-95"
                style={{ background: 'linear-gradient(180deg, #374151, #1f2937)', border: '1px solid #4b5563' }}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="number" className="input flex-1 text-center text-sm py-2" value={raiseAmount}
              onChange={e => setRaiseAmount(e.target.value)} placeholder={`Mín ${minRaise}`} min={minRaise} />
            <button onClick={() => raiseAmount && parseInt(raiseAmount) >= minRaise && act('raise', parseInt(raiseAmount))}
              disabled={!raiseAmount || parseInt(raiseAmount) < minRaise}
              className="px-5 py-2 rounded-xl font-bold text-sm active:scale-95"
              style={{ background: 'linear-gradient(180deg, #f0b429, #d4991a)', color: '#1a1a1a', boxShadow: '0 4px 12px rgba(240,180,41,0.3)' }}>
              Subir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
