// Evaluates the best 5-card hand from up to 7 cards
// Returns { rank, score, description, bestCards }
// rank: 1 (high card) ... 10 (royal flush)

const HAND_NAMES = ['', 'High Card', 'One Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush'];

function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function evaluate5(cards) {
  const values = cards.map(c => c.value).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const valueCounts = {};
  for (const v of values) valueCounts[v] = (valueCounts[v] || 0) + 1;

  const counts = Object.values(valueCounts).sort((a, b) => b - a);
  const uniqueValues = Object.keys(valueCounts).map(Number).sort((a, b) => b - a);
  const isFlush = new Set(suits).size === 1;

  // Check straight
  let isStraight = false;
  let straightHigh = 0;
  // Normal straight
  if (uniqueValues.length === 5 && uniqueValues[0] - uniqueValues[4] === 4) {
    isStraight = true;
    straightHigh = uniqueValues[0];
  }
  // Wheel: A-2-3-4-5
  if (!isStraight && uniqueValues.join(',') === '14,5,4,3,2') {
    isStraight = true;
    straightHigh = 5;
  }

  // Score encodes rank + tiebreakers as a single comparable number
  // Format: rank * 10^10 + tiebreaker values packed in descending positions

  const pack = (arr) => arr.reduce((acc, v, i) => acc + v * Math.pow(15, 4 - i), 0);

  if (isFlush && isStraight) {
    const rank = straightHigh === 14 ? 10 : 9;
    return { rank, score: rank * 1e10 + straightHigh, description: HAND_NAMES[rank] };
  }
  if (counts[0] === 4) {
    const quad = uniqueValues.find(v => valueCounts[v] === 4);
    const kicker = uniqueValues.find(v => valueCounts[v] !== 4);
    return { rank: 8, score: 8e10 + quad * 15 + kicker, description: HAND_NAMES[8] };
  }
  if (counts[0] === 3 && counts[1] === 2) {
    const trip = uniqueValues.find(v => valueCounts[v] === 3);
    const pair = uniqueValues.find(v => valueCounts[v] === 2);
    return { rank: 7, score: 7e10 + trip * 15 + pair, description: HAND_NAMES[7] };
  }
  if (isFlush) {
    return { rank: 6, score: 6e10 + pack(values), description: HAND_NAMES[6] };
  }
  if (isStraight) {
    return { rank: 5, score: 5e10 + straightHigh, description: HAND_NAMES[5] };
  }
  if (counts[0] === 3) {
    const trip = uniqueValues.find(v => valueCounts[v] === 3);
    const kickers = uniqueValues.filter(v => valueCounts[v] !== 3);
    return { rank: 4, score: 4e10 + trip * 225 + pack(kickers), description: HAND_NAMES[4] };
  }
  if (counts[0] === 2 && counts[1] === 2) {
    const pairs = uniqueValues.filter(v => valueCounts[v] === 2).sort((a, b) => b - a);
    const kicker = uniqueValues.find(v => valueCounts[v] === 1);
    return { rank: 3, score: 3e10 + pairs[0] * 225 + pairs[1] * 15 + kicker, description: HAND_NAMES[3] };
  }
  if (counts[0] === 2) {
    const pair = uniqueValues.find(v => valueCounts[v] === 2);
    const kickers = uniqueValues.filter(v => valueCounts[v] !== 2);
    return { rank: 2, score: 2e10 + pair * 3375 + pack(kickers), description: HAND_NAMES[2] };
  }
  return { rank: 1, score: 1e10 + pack(values), description: HAND_NAMES[1] };
}

function bestHand(cards) {
  if (cards.length < 5) return null;
  const combos = cards.length === 5 ? [cards] : combinations(cards, 5);
  let best = null;
  let bestCards = null;
  for (const combo of combos) {
    const result = evaluate5(combo);
    if (!best || result.score > best.score) {
      best = result;
      bestCards = combo;
    }
  }
  return { ...best, bestCards };
}

function compareHands(handA, handB) {
  return handA.score - handB.score;
}

module.exports = { bestHand, compareHands, HAND_NAMES };
