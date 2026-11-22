// Ember Pact — pure game state: decks, turns, summoning, combat, winning.
// No DOM here, so the rules can be read (and tested) on their own.

import { CARD_POOL, MAX_BOARD, STARTING_LIFE, MAX_MANA, OPENING_HAND, elementEdge } from './cards.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(deck, rng) {
  const out = deck.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

let nextUid = 1;

export function buildDeck(rng) {
  const cards = [];
  for (const base of CARD_POOL) {
    for (let copy = 0; copy < 3; copy++) {
      cards.push({ ...base, uid: nextUid++, maxHealth: base.health, canAttack: false, justSummoned: false });
    }
  }
  return shuffle(cards, rng);
}

function makeSide(rng) {
  const deck = buildDeck(rng);
  const hand = deck.splice(0, OPENING_HAND);
  // Opening hand must always hold a 1-cost card, so turn 1 is never a pass:
  // swap a random hand card with a 1-cost card from the deck when needed.
  if (!hand.some((c) => c.cost === 1)) {
    const cheap = deck.findIndex((c) => c.cost === 1);
    if (cheap >= 0) {
      const swapAt = Math.floor(rng() * hand.length);
      const [oneCost] = deck.splice(cheap, 1);
      deck.push(hand[swapAt]);
      hand[swapAt] = oneCost;
    }
  }
  return { life: STARTING_LIFE, mana: 1, maxMana: 1, deck, hand, board: [], fatigue: 0 };
}

export function newGame(seed) {
  const rng = mulberry32(seed);
  nextUid = 1;
  const state = {
    seed,
    turn: 1,
    active: 'player', // whose turn it is
    phase: 'title', // title | play | over
    winner: null, // 'player' | 'enemy'
    player: makeSide(rng),
    enemy: makeSide(rng),
    log: ['The Ember Court convenes. The pact is sealed — first to burn the other to ash wins.'],
    selected: null, // uid of the player's guardian chosen to attack
    selectedHand: null, // uid of the hand card chosen to summon
    lastEvent: '',
  };
  return state;
}

export function startGame(state) {
  state.phase = 'play';
  state.log.push('Your move, Herald. Draw, summon, strike.');
}

export function drawCard(state, side) {
  const who = state[side];
  if (who.deck.length === 0) {
    who.fatigue += 1;
    who.life -= who.fatigue;
    state.log.push(`${side === 'player' ? 'You' : 'Cinder'} draw from an empty deck and take ${who.fatigue} fatigue damage.`);
    checkEnd(state);
    return null;
  }
  const card = who.deck.shift();
  who.hand.push(card);
  return card;
}

export function beginTurn(state, side) {
  const who = state[side];
  who.maxMana = Math.min(MAX_MANA, who.maxMana + (side === 'player' && state.turn > 1 ? 1 : 0));
  if (side === 'enemy') who.maxMana = Math.min(MAX_MANA, who.maxMana + 1);
  who.mana = who.maxMana;
  for (const g of who.board) { g.canAttack = true; g.justSummoned = false; }
  drawCard(state, side);
}

// Can this hand card be summoned right now?
export function canPlay(state, side, card) {
  const who = state[side];
  if (state.phase !== 'play' || state.active !== side) return { ok: false, why: 'Not your turn.' };
  if (who.mana < card.cost) return { ok: false, why: `Needs ${card.cost} ember, you have ${who.mana}.` };
  if (who.board.length >= MAX_BOARD) return { ok: false, why: 'Your side of the table is full.' };
  return { ok: true };
}

export function playCard(state, side, uid) {
  const who = state[side];
  const idx = who.hand.findIndex((c) => c.uid === uid);
  if (idx < 0) return false;
  const card = who.hand[idx];
  const check = canPlay(state, side, card);
  if (!check.ok) { state.lastEvent = check.why; return false; }
  who.hand.splice(idx, 1);
  who.mana -= card.cost;
  who.board.push({ ...card, canAttack: false, justSummoned: true });
  state.log.push(`${side === 'player' ? 'You summon' : 'Cinder summons'} ${card.name} (${card.attack}/${card.health}).`);
  return true;
}

// Resolve one guardian striking a target: a guardian or the hero ('hero').
export function attack(state, side, attackerUid, target) {
  const who = state[side];
  const foe = state[side === 'player' ? 'enemy' : 'player'];
  const attacker = who.board.find((g) => g.uid === attackerUid);
  if (!attacker || !attacker.canAttack) return false;
  if (state.phase !== 'play' || state.active !== side) return false;

  let damage = attacker.attack;
  let edge = 0;
  let targetName = 'Cinder';
  let targetGuardian = null;
  if (target === 'hero') {
    targetName = side === 'player' ? 'Cinder' : 'you';
    foe.life -= damage;
    state.log.push(`${attacker.name} strikes ${targetName} for ${damage}.`);
  } else {
    targetGuardian = foe.board.find((g) => g.uid === target);
    if (!targetGuardian) return false;
    edge = elementEdge(attacker.element, targetGuardian.element);
    damage += edge;
    targetName = targetGuardian.name;
    targetGuardian.health -= damage;
    // A guardian fights back with its own attack.
    attacker.health -= targetGuardian.attack;
    state.log.push(
      `${attacker.name} hits ${targetName} for ${damage}${edge ? ' — elemental edge!' : ''}, and takes ${targetGuardian.attack} back.`,
    );
  }
  attacker.canAttack = false;
  who.board = who.board.filter((g) => g.health > 0);
  foe.board = foe.board.filter((g) => g.health > 0);
  checkEnd(state);
  return true;
}

export function checkEnd(state) {
  if (state.phase === 'over') return;
  if (state.enemy.life <= 0 && state.player.life <= 0) {
    state.phase = 'over'; state.winner = 'player';
    state.log.push('Both wardens fall — but your ember burns last. Victory!');
  } else if (state.enemy.life <= 0) {
    state.phase = 'over'; state.winner = 'player';
    state.log.push('Cinder is ash. The Ember Court is yours!');
  } else if (state.player.life <= 0) {
    state.phase = 'over'; state.winner = 'enemy';
    state.log.push('Your ember gutters out. Cinder keeps the court.');
  }
}

export function endPlayerTurn(state) {
  if (state.phase !== 'play' || state.active !== 'player') return false;
  state.active = 'enemy';
  state.selected = null;
  state.selectedHand = null;
  return true;
}

export function startPlayerTurn(state) {
  state.turn += 1;
  state.active = 'player';
  beginTurn(state, 'player');
  state.log.push(`— Turn ${state.turn}: your move. —`);
}
