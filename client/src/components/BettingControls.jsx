import React, { useState } from 'react';

export default function BettingControls({ gameState, myPlayer, onAction, disabled }) {
  const [raiseAmount, setRaiseAmount] = useState('');

  if (!myPlayer || myPlayer.status !== 'active' || disabled) return null;

  const { currentBet, bigBlind } = gameState;
  const toCall = Math.max(0, currentBet - (myPlayer.bet || 0));
  const canCheck = toCall === 0;
  const minRaise = currentBet + bigBlind;
  const maxRaise = myPlayer.chips;

  const handleRaise = () => {
    const amount = parseInt(raiseAmount);
    if (!amount || amount < minRaise) return;
    onAction('raise', amount);
    setRaiseAmount('');
  };

  const setQuickRaise = (multiplier) => {
    const amount = Math.min(Math.max(minRaise, currentBet * multiplier + currentBet), myPlayer.chips + (myPlayer.bet || 0));
    setRaiseAmount(String(Math.floor(amount)));
  };

  return (
    <div className="bg-gray-900/90 backdrop-blur rounded-2xl p-4 border border-gray-700 w-full max-w-lg mx-auto">
      <div className="text-center text-sm text-gray-400 mb-3">
        {toCall > 0 ? `Para igualar: ${toCall.toLocaleString()} fichas` : 'Tu turno — podés hacer check'}
      </div>

      {/* Main action buttons */}
      <div className="flex gap-2 mb-3">
        <button onClick={() => onAction('fold')} className="btn-danger flex-1">
          Fold
        </button>
        {canCheck ? (
          <button onClick={() => onAction('check')} className="btn flex-1 bg-gray-600 hover:bg-gray-500 text-white">
            Check
          </button>
        ) : toCall >= myPlayer.chips ? (
          // Can't afford full call — go all-in for remaining chips
          <button onClick={() => onAction('all-in')} className="btn flex-1 bg-green-700 hover:bg-green-600 text-white font-bold">
            Call All-In ({myPlayer.chips.toLocaleString()})
          </button>
        ) : (
          <button onClick={() => onAction('call')} className="btn flex-1 bg-green-700 hover:bg-green-600 text-white">
            Call {toCall.toLocaleString()}
          </button>
        )}
        {/* Show All-In separately only when player has more chips than needed to call */}
        {!canCheck && toCall < myPlayer.chips && (
          <button onClick={() => onAction('all-in')} className="btn flex-1 bg-purple-700 hover:bg-purple-600 text-white font-bold">
            All-In
          </button>
        )}
      </div>

      {/* Raise controls */}
      {myPlayer.chips > toCall && (
        <div className="space-y-2">
          <div className="flex gap-1">
            {[2, 3, 4].map(m => (
              <button key={m} onClick={() => setQuickRaise(m)} className="btn-ghost text-xs flex-1 py-1">
                x{m}
              </button>
            ))}
            <button onClick={() => setRaiseAmount(String(myPlayer.chips + (myPlayer.bet || 0)))} className="btn-ghost text-xs flex-1 py-1">
              Pot
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              className="input flex-1 text-center"
              value={raiseAmount}
              onChange={e => setRaiseAmount(e.target.value)}
              placeholder={`Min ${minRaise}`}
              min={minRaise}
              max={maxRaise + (myPlayer.bet || 0)}
            />
            <button onClick={handleRaise} disabled={!raiseAmount || parseInt(raiseAmount) < minRaise} className="btn-primary px-6">
              Subir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
