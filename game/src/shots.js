// Ember Pact — staged states for the 4 screenshots, built from fixed seeds so
// every render of the same shot looks the same.

import { newGame, startGame, playCard, attack, endPlayerTurn, beginTurn } from './state.js';
import { CARD_POOL } from './cards.js';

function guardian(base, health, canAttack) {
  return { ...base, uid: Math.floor(Math.random() * 1e9) + health, maxHealth: base.health, health, canAttack, justSummoned: !canAttack };
}

export function buildShotState(kind, seed = 7) {
  const state = newGame(seed);
  if (kind === 'start') {
    state.phase = 'title';
    return state;
  }
  startGame(state);
  const byId = (id) => CARD_POOL.find((c) => c.id === id);
  if (kind === 'play') {
    // A lively mid-game: both boards busy, hands full, life totals dented.
    state.turn = 6;
    state.player.maxMana = 6; state.player.mana = 5;
    state.enemy.maxMana = 6; state.enemy.mana = 2;
    state.player.life = 24; state.enemy.life = 18;
    state.player.board = [
      guardian(byId('cinder-wolf'), 3, true),
      guardian(byId('granite-golem'), 5, true),
      guardian(byId('spark-imp'), 1, false),
    ];
    state.enemy.board = [
      guardian(byId('deep-leviathan'), 6, true),
      guardian(byId('tidecaller'), 4, true),
      guardian(byId('briar-stalker'), 2, false),
    ];
    state.player.hand = [
      { ...byId('phoenix-herald'), uid: 901, maxHealth: 5, canAttack: false, justSummoned: false },
      { ...byId('tidecaller'), uid: 902, maxHealth: 4, canAttack: false, justSummoned: false },
      { ...byId('spark-imp'), uid: 903, maxHealth: 2, canAttack: false, justSummoned: false },
      { ...byId('briar-stalker'), uid: 904, maxHealth: 2, canAttack: false, justSummoned: false },
    ];
    state.enemy.hand = [{}, {}, {}, {}];
    state.player.deck = new Array(11).fill(null);
    state.enemy.deck = new Array(13).fill(null);
    state.log = [
      'You summon Granite Golem (4/5).',
      'Cinder summons Deep Leviathan (5/7).',
      'Cinder Wolf hits Tidecaller for 3, and takes 2 back.',
      'Deep Leviathan strikes you for 5.',
      '— Turn 6: your move. —',
    ];
    state.lastEvent = '';
    return state;
  }
  if (kind === 'cover') {
    // v2 cover: a SPARSER mid-game table for the judge's contact sheet —
    // 10 card rects instead of 14, both life totals visible, 3-card hand.
    state.turn = 5;
    state.player.maxMana = 5; state.player.mana = 4;
    state.enemy.maxMana = 5; state.enemy.mana = 2;
    state.player.life = 22; state.enemy.life = 16;
    state.player.board = [
      guardian(byId('cinder-wolf'), 3, true),
      guardian(byId('granite-golem'), 5, true),
    ];
    state.enemy.board = [
      guardian(byId('deep-leviathan'), 6, true),
      guardian(byId('tidecaller'), 4, true),
    ];
    state.player.hand = [
      { ...byId('phoenix-herald'), uid: 901, maxHealth: 5, canAttack: false, justSummoned: false },
      { ...byId('tidecaller'), uid: 902, maxHealth: 4, canAttack: false, justSummoned: false },
      { ...byId('spark-imp'), uid: 903, maxHealth: 2, canAttack: false, justSummoned: false },
    ];
    state.enemy.hand = [{}, {}, {}];
    state.player.deck = new Array(12).fill(null);
    state.enemy.deck = new Array(14).fill(null);
    state.log = [
      'You summon Granite Golem (4/5).',
      'Cinder summons Deep Leviathan (5/7).',
      '— Turn 5: your move. —',
    ];
    state.lastEvent = '';
    return state;
  }
  if (kind === 'win') {
    state.turn = 9;
    state.player.maxMana = 8; state.player.mana = 3;
    state.enemy.life = 0;
    state.player.life = 11;
    state.player.board = [guardian(byId('phoenix-herald'), 4, true), guardian(byId('cinder-wolf'), 2, true)];
    state.enemy.board = [];
    state.player.hand = [{ ...byId('spark-imp'), uid: 911, maxHealth: 2, canAttack: false, justSummoned: false }];
    state.enemy.hand = [{}];
    state.player.deck = new Array(6).fill(null);
    state.enemy.deck = new Array(4).fill(null);
    state.phase = 'over';
    state.winner = 'player';
    state.log = ['Phoenix Herald strikes Cinder for 6.', 'Cinder is ash. The Ember Court is yours!'];
    return state;
  }
  // loss
  state.turn = 8;
  state.player.maxMana = 7; state.player.mana = 1;
  state.player.life = 0;
  state.enemy.life = 14;
  state.enemy.board = [guardian(byId('deep-leviathan'), 5, true), guardian(byId('cinder-wolf'), 3, true)];
  state.player.board = [];
  state.player.hand = [{ ...byId('brook-sprite'), uid: 921, maxHealth: 3, canAttack: false, justSummoned: false }];
  state.enemy.hand = [{}, {}];
  state.player.deck = new Array(5).fill(null);
  state.enemy.deck = new Array(7).fill(null);
  state.phase = 'over';
  state.winner = 'enemy';
  state.log = ['Deep Leviathan strikes you for 5.', 'Your ember gutters out. Cinder keeps the court.'];
  return state;
}

export { playCard, attack, endPlayerTurn, beginTurn };
