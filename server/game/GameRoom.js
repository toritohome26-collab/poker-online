const { v4: uuidv4 } = require('uuid');
const Deck = require('./Deck');
const { bestHand, compareHands } = require('./HandEvaluator');
const db = require('../db/database');

const PHASES = { WAITING: 'waiting', PRE_FLOP: 'pre_flop', FLOP: 'flop', TURN: 'turn', RIVER: 'river', SHOWDOWN: 'showdown' };
const ACTION_TIMEOUT = 30000;

class GameRoom {
  constructor(tableConfig, io) {
    this.id = tableConfig.id;
    this.name = tableConfig.name;
    this.smallBlind = tableConfig.small_blind;
    this.bigBlind = tableConfig.big_blind;
    this.maxPlayers = tableConfig.max_players;
    this.minBuyIn = tableConfig.min_buy_in;
    this.maxBuyIn = tableConfig.max_buy_in;
    this.io = io;

    this.players = [];
    this.phase = PHASES.WAITING;
    this.deck = null;
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.dealerIndex = 0;
    this.currentPlayerIndex = -1;
    this.actionTimeout = null;
    this.actedPlayers = new Set();
    this.chat = [];
    this._handStartTimer = null;
  }

  getPlayerCount() { return this.players.length; }
  getStatus() { return this.phase; }

  async addPlayer(user, socketId, buyIn) {
    if (this.players.length >= this.maxPlayers) return { error: 'Mesa llena' };
    if (this.players.find(p => p.id === user.id)) return { error: 'Ya estás en esta mesa' };
    if (buyIn < this.minBuyIn || buyIn > this.maxBuyIn) return { error: `Buy-in debe ser entre ${this.minBuyIn} y ${this.maxBuyIn}` };

    const dbUser = await db.users.findOne({ id: user.id });
    if (!dbUser || dbUser.chips < buyIn) return { error: 'Fichas insuficientes' };

    await db.users.update({ id: user.id }, { $inc: { chips: -buyIn } });

    const seatIndex = this._nextSeat();
    const player = { id: user.id, username: user.username, socketId, chips: buyIn, holeCards: [], bet: 0, totalBet: 0, status: 'waiting', seatIndex };
    this.players.push(player);
    this._broadcast('player_joined', { player: this._publicPlayer(player), tableId: this.id });

    if (this.players.length >= 2 && this.phase === PHASES.WAITING && !this._handStartTimer) {
      this._handStartTimer = setTimeout(() => { this._handStartTimer = null; this._startHand(); }, 2000);
    }
    return { ok: true, player };
  }

  async removePlayer(socketId) {
    const idx = this.players.findIndex(p => p.socketId === socketId);
    if (idx === -1) return;
    const player = this.players[idx];

    if (player.chips > 0) {
      await db.users.update({ id: player.id }, { $inc: { chips: player.chips } });
    }

    if (this.phase !== PHASES.WAITING && player.status === 'active') {
      player.status = 'folded';
      if (this._getActivePlayers().length <= 1) { this._endRound(); return; }
      if (this.players[this.currentPlayerIndex]?.id === player.id) this._nextTurn();
    }

    this.players.splice(idx, 1);
    this._broadcast('player_left', { playerId: player.id, tableId: this.id });

    if (this.players.length < 2 && this.phase !== PHASES.WAITING) this._resetRound();
  }

  updateSocket(userId, socketId) {
    const player = this.players.find(p => p.id === userId);
    if (player) player.socketId = socketId;
  }

  _startHand() {
    if (this.players.length < 2 || this.phase !== PHASES.WAITING) return;

    this.players = this.players.filter(p => p.chips > 0);
    if (this.players.length < 2) return;

    this.deck = new Deck();
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.players.forEach(p => { p.holeCards = []; p.bet = 0; p.totalBet = 0; p.status = 'active'; });

    this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
    const sbIdx = (this.dealerIndex + 1) % this.players.length;
    const bbIdx = (this.dealerIndex + 2) % this.players.length;

    for (const player of this.players) player.holeCards = this.deck.deal(2);

    this._postBlind(sbIdx, this.smallBlind);
    this._postBlind(bbIdx, this.bigBlind);
    this.currentBet = this.bigBlind;

    this.phase = PHASES.PRE_FLOP;
    this.currentPlayerIndex = (bbIdx + 1) % this.players.length;
    this.actedPlayers = new Set(); // track who acted this betting round

    this._broadcastGameState();
    this._scheduleActionTimeout();
  }

  _postBlind(playerIdx, amount) {
    const player = this.players[playerIdx];
    const actual = Math.min(amount, player.chips);
    player.chips -= actual;
    player.bet = actual;
    player.totalBet = actual;
    this.pot += actual;
    if (player.chips === 0) player.status = 'all-in';
  }

  handleAction(socketId, action, amount) {
    const playerIdx = this.players.findIndex(p => p.socketId === socketId);
    if (playerIdx === -1 || playerIdx !== this.currentPlayerIndex) return { error: 'No es tu turno' };
    const player = this.players[playerIdx];
    if (player.status !== 'active') return { error: 'No puedes actuar' };

    clearTimeout(this.actionTimeout);
    const toCall = this.currentBet - player.bet;

    switch (action) {
      case 'fold':
        player.status = 'folded';
        break;
      case 'check':
        if (toCall > 0) return { error: 'Debes igualar o subir' };
        break;
      case 'call':
        if (toCall <= 0) return { error: 'No hay nada que igualar' };
        this._placeBet(player, toCall);
        break;
      case 'raise': {
        const raiseAmount = parseInt(amount);
        const minRaise = this.currentBet + this.bigBlind;
        if (isNaN(raiseAmount) || raiseAmount < minRaise) return { error: `La subida mínima es ${minRaise}` };
        const diff = raiseAmount - player.bet;
        if (diff > player.chips) return { error: 'Fichas insuficientes' };
        this._placeBet(player, diff);
        this.currentBet = raiseAmount;
        break;
      }
      case 'all-in': {
        const allin = player.chips;
        this._placeBet(player, allin);
        if (player.bet > this.currentBet) this.currentBet = player.bet;
        player.status = 'all-in';
        break;
      }
      default:
        return { error: 'Acción inválida' };
    }

    this.actedPlayers.add(player.id);
    this._broadcast('action', { playerId: player.id, action, amount: player.bet, tableId: this.id });
    this._nextTurn();
    return { ok: true };
  }

  _placeBet(player, amount) {
    const actual = Math.min(amount, player.chips);
    player.chips -= actual;
    player.bet += actual;
    player.totalBet += actual;
    this.pot += actual;
    if (player.chips === 0) player.status = 'all-in';
  }

  _nextTurn() {
    const activePlayers = this._getActivePlayers();
    if (activePlayers.length === 0) return this._runOutBoard();
    if (activePlayers.length === 1 && this._getAllInPlayers().length === 0) return this._endRound();

    // Round ends when all active players have acted AND bets are equal
    const allActed = activePlayers.every(p => this.actedPlayers.has(p.id));
    const allEqual = activePlayers.every(p => p.bet === this.currentBet);
    if (allActed && allEqual) return this._advancePhase();

    let next = (this.currentPlayerIndex + 1) % this.players.length;
    let tries = 0;
    while (this.players[next].status !== 'active' && tries < this.players.length) {
      next = (next + 1) % this.players.length;
      tries++;
    }
    if (tries >= this.players.length) return this._advancePhase();

    this.currentPlayerIndex = next;
    this._broadcastGameState();
    this._scheduleActionTimeout();
  }

  _advancePhase() {
    this.players.forEach(p => { p.bet = 0; });
    this.currentBet = 0;
    this.actedPlayers = new Set(); // reset for new betting round

    const stillIn = this.players.filter(p => p.status !== 'folded');
    if (stillIn.length <= 1) return this._endRound();

    switch (this.phase) {
      case PHASES.PRE_FLOP:
        this.communityCards = this.deck.deal(3);
        this.phase = PHASES.FLOP;
        break;
      case PHASES.FLOP:
        this.communityCards.push(...this.deck.deal(1));
        this.phase = PHASES.TURN;
        break;
      case PHASES.TURN:
        this.communityCards.push(...this.deck.deal(1));
        this.phase = PHASES.RIVER;
        break;
      case PHASES.RIVER:
        return this._showdown();
    }

    const activePlayers = this._getActivePlayers();
    if (activePlayers.length === 0) return this._runOutBoard();

    let firstToAct = (this.dealerIndex + 1) % this.players.length;
    let tries = 0;
    while (this.players[firstToAct].status !== 'active' && tries < this.players.length) {
      firstToAct = (firstToAct + 1) % this.players.length;
      tries++;
    }
    this.currentPlayerIndex = firstToAct;
    this._broadcastGameState();
    this._scheduleActionTimeout();
  }

  _runOutBoard() {
    while (this.communityCards.length < 5) this.communityCards.push(...this.deck.deal(1));
    this._showdown();
  }

  async _showdown() {
    this.phase = PHASES.SHOWDOWN;
    const contenders = this.players.filter(p => p.status !== 'folded');

    const evaluated = contenders.map(p => ({
      player: p,
      hand: bestHand([...p.holeCards, ...this.communityCards])
    })).sort((a, b) => compareHands(b.hand, a.hand));

    const topScore = evaluated[0].hand.score;
    const winners = evaluated.filter(e => e.hand.score === topScore);
    const share = Math.floor(this.pot / winners.length);

    for (const e of winners) {
      e.player.chips += share;
      await db.users.update({ id: e.player.id }, { $inc: { chips: share, totalWins: 1 } });
    }
    for (const p of this.players) {
      await db.users.update({ id: p.id }, { $inc: { totalHands: 1 } });
    }

    const handId = uuidv4();
    await db.hands.insert({ _id: handId, tableId: this.id, winnerId: evaluated[0].player.id, pot: this.pot, hand: evaluated[0].hand?.description, playedAt: Date.now() });

    this._broadcast('showdown', {
      tableId: this.id,
      results: evaluated.map(e => ({ playerId: e.player.id, holeCards: e.player.holeCards, hand: e.hand?.description, score: e.hand?.score })),
      winners: winners.map(e => ({ playerId: e.player.id, winAmount: share, hand: e.hand?.description })),
      communityCards: this.communityCards,
      pot: this.pot
    });

    setTimeout(() => this._resetRound(), 5000);
  }

  async _endRound() {
    const activePlayers = this._getActivePlayers();
    if (activePlayers.length === 1) {
      const winner = activePlayers[0];
      winner.chips += this.pot;
      await db.users.update({ id: winner.id }, { $inc: { chips: this.pot, totalWins: 1 } });
      this._broadcast('winner', { tableId: this.id, winnerId: winner.id, winAmount: this.pot, reason: 'others_folded' });
    }
    setTimeout(() => this._resetRound(), 3000);
  }

  _resetRound() {
    clearTimeout(this.actionTimeout);
    this.players.forEach(p => { p.holeCards = []; p.bet = 0; p.totalBet = 0; p.status = 'waiting'; });
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.currentPlayerIndex = -1;
    this.phase = PHASES.WAITING;

    const broke = this.players.filter(p => p.chips <= 0);
    for (const p of broke) this._broadcast('player_bust', { tableId: this.id, playerId: p.id });
    this.players = this.players.filter(p => p.chips > 0);

    this._broadcastGameState();

    if (this.players.length >= 2) {
      this._handStartTimer = setTimeout(() => { this._handStartTimer = null; this._startHand(); }, 3000);
    }
  }

  _getActivePlayers() { return this.players.filter(p => p.status === 'active'); }
  _getAllInPlayers() { return this.players.filter(p => p.status === 'all-in'); }

  _nextSeat() {
    const taken = new Set(this.players.map(p => p.seatIndex));
    for (let i = 0; i < this.maxPlayers; i++) { if (!taken.has(i)) return i; }
    return this.players.length;
  }

  _scheduleActionTimeout() {
    clearTimeout(this.actionTimeout);
    this.actionTimeout = setTimeout(() => {
      const player = this.players[this.currentPlayerIndex];
      if (player?.status === 'active') {
        player.status = 'folded';
        this._broadcast('action', { playerId: player.id, action: 'fold', tableId: this.id, timeout: true });
        this._nextTurn();
      }
    }, ACTION_TIMEOUT);
  }

  _publicPlayer(p) {
    return { id: p.id, username: p.username, chips: p.chips, bet: p.bet, status: p.status, seatIndex: p.seatIndex };
  }

  _broadcast(event, data) { this.io.to(this.id).emit(event, data); }

  _broadcastGameState() {
    const state = this._getPublicState();
    for (const player of this.players) {
      const socket = this.io.sockets.sockets.get(player.socketId);
      if (socket) socket.emit('game_state', { ...state, myCards: player.holeCards });
    }
    this._broadcast('game_state', state);
  }

  _getPublicState() {
    return {
      tableId: this.id,
      phase: this.phase,
      communityCards: this.communityCards,
      pot: this.pot,
      currentBet: this.currentBet,
      currentPlayerId: this.players[this.currentPlayerIndex]?.id || null,
      dealerIndex: this.dealerIndex,
      players: this.players.map(p => this._publicPlayer(p)),
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
    };
  }

  sendMessage(userId, username, text) {
    const msg = { userId, username, text, time: Date.now() };
    this.chat.push(msg);
    if (this.chat.length > 100) this.chat.shift();
    this._broadcast('chat_message', { tableId: this.id, ...msg });
  }

  getFullState(userId) {
    const state = this._getPublicState();
    const player = this.players.find(p => p.id === userId);
    return { ...state, myCards: player?.holeCards || [], chat: this.chat.slice(-50) };
  }
}

module.exports = { GameRoom, PHASES };
