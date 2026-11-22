// Ember Pact — Cinder, the Ash Warden: a readable, beatable opponent.
// It summons its best-value guardians, then attacks: lethal first, then a
// kill it can make, then a trade that favours it, then straight at your life.

import { elementEdge, MAX_BOARD } from './cards.js';

function cardValue(card) {
  return card.attack + card.health - card.cost;
}

// Decide the whole enemy turn as a list of steps main.js plays out slowly.
export function planEnemyTurn(state) {
  const steps = [];
  const me = state.enemy;
  const you = state.player;

  // Summon: biggest value first while mana and table space allow.
  // Track the spend in a local counter: playCard deducts for real later.
  let manaLeft = me.mana;
  let boardRoom = MAX_BOARD - me.board.length;
  const playable = me.hand
    .filter((c) => c.cost <= me.mana)
    .sort((a, b) => cardValue(b) - cardValue(a));
  for (const card of playable) {
    if (boardRoom <= 0) break;
    if (card.cost > manaLeft) continue;
    steps.push({ type: 'play', uid: card.uid });
    manaLeft -= card.cost;
    boardRoom -= 1;
  }

  // Attack with every ready guardian.
  const attackers = me.board.filter((g) => g.canAttack);
  for (const attacker of attackers) {
    // Lethal: burn the hero if it ends the game.
    if (attacker.attack >= you.life) {
      steps.push({ type: 'attack', uid: attacker.uid, target: 'hero' });
      continue;
    }
    // A kill: pick the enemy guardian it can finish, weakest first.
    const kills = you.board
      .filter((g) => attacker.attack + elementEdge(attacker.element, g.element) >= g.health)
      .sort((a, b) => a.health - b.health);
    if (kills.length > 0) {
      steps.push({ type: 'attack', uid: attacker.uid, target: kills[0].uid });
      continue;
    }
    // A good trade: hit a guardian whose attack is lower than ours.
    const trades = you.board
      .filter((g) => g.attack < attacker.attack && attacker.health > g.attack)
      .sort((a, b) => b.attack - a.attack);
    if (trades.length > 0) {
      steps.push({ type: 'attack', uid: attacker.uid, target: trades[0].uid });
      continue;
    }
    // Otherwise go for the hero.
    steps.push({ type: 'attack', uid: attacker.uid, target: 'hero' });
  }
  return steps;
}
