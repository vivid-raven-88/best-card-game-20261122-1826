// Ember Pact — boot and input: clicks, keys, the enemy turn driver, shots.
// The rules live in state.js, the opponent's brain in ai.js, the DOM in render.js.

import { newGame, startGame, playCard, attack, endPlayerTurn, beginTurn, startPlayerTurn, checkEnd } from './state.js';
import { planEnemyTurn } from './ai.js';
import { renderTable, renderTitle } from './render.js';
import { buildShotState } from './shots.js';
import { sfx, ensureAudio } from './audio.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || '20261123');

let state = shot ? buildShotState(shot, seed) : newGame(seed);
let aiBusy = false;

function draw() {
  if (state.phase === 'title') renderTitle();
  else renderTable(state, {});
  wireButtons();
}

function wireButtons() {
  const play = document.getElementById('play');
  if (play) play.onclick = () => { ensureAudio(); sfx.turn(); startGame(state); draw(); };
  const endTurn = document.getElementById('end-turn');
  if (endTurn) endTurn.onclick = () => { if (!aiBusy) runEnemyTurn(); };
  const again = document.getElementById('again');
  if (again) again.onclick = () => restart();
  const toTitle = document.getElementById('totitle');
  if (toTitle) toTitle.onclick = () => { state = newGame(seed); draw(); };
}

function restart() {
  state = newGame(Date.now() % 100000);
  startGame(state);
  draw();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runEnemyTurn() {
  if (state.phase !== 'play' || aiBusy) return;
  aiBusy = true;
  endPlayerTurn(state);
  state.log.push('Cinder takes the table…');
  draw();
  await sleep(650);
  beginTurn(state, 'enemy');
  draw();
  await sleep(500);
  const steps = planEnemyTurn(state);
  for (const step of steps) {
    if (state.phase !== 'play') break;
    if (step.type === 'play') {
      playCard(state, 'enemy', step.uid);
      sfx.summon();
    } else {
      attack(state, 'enemy', step.uid, step.target);
      sfx.hit();
    }
    draw();
    await sleep(750);
  }
  if (state.phase === 'play') {
    startPlayerTurn(state);
    sfx.turn();
    state.lastEvent = '';
  }
  if (state.phase === 'over') {
    if (state.winner === 'player') sfx.win(); else sfx.lose();
  }
  aiBusy = false;
  draw();
}

function onCardClick(event) {
  const el = event.target.closest('.card');
  if (!el || state.phase !== 'play' || state.active !== 'player' || aiBusy) return;
  ensureAudio();
  const uid = Number(el.dataset.uid);
  const kind = el.dataset.kind;

  if (kind === 'hand') {
    const card = state.player.hand.find((c) => c.uid === uid);
    if (!card) return;
    if (state.player.mana < card.cost || state.player.board.length >= 5) {
      state.lastEvent = state.player.mana < card.cost
        ? `Needs ${card.cost} ember, you have ${state.player.mana}.`
        : 'Your side of the table is full.';
      draw();
      return;
    }
    if (playCard(state, 'player', uid)) sfx.summon();
    state.selected = null;
    state.selectedHand = null;
    state.lastEvent = '';
    draw();
    return;
  }

  if (kind === 'player-board') {
    const g = state.player.board.find((x) => x.uid === uid);
    if (!g) return;
    if (!g.canAttack) {
      state.lastEvent = g.justSummoned ? `${g.name} was just summoned — it rests this turn.` : `${g.name} already struck this turn.`;
      draw();
      return;
    }
    state.selected = state.selected === uid ? null : uid;
    state.selectedHand = null;
    sfx.select();
    draw();
    return;
  }

  if (kind === 'enemy-board' && state.selected) {
    if (attack(state, 'player', state.selected, uid)) {
      sfx.hit();
      state.selected = null;
      state.lastEvent = '';
      if (state.phase === 'over') { if (state.winner === 'player') sfx.win(); else sfx.lose(); }
      draw();
    }
    return;
  }
}

function onHeroClick(event) {
  const hero = event.target.closest('.enemy-hero');
  if (!hero || !state.selected || state.phase !== 'play' || aiBusy) return;
  ensureAudio();
  if (attack(state, 'player', state.selected, 'hero')) {
    sfx.hit();
    state.selected = null;
    state.lastEvent = '';
    if (state.phase === 'over') { if (state.winner === 'player') sfx.win(); else sfx.lose(); }
    draw();
  }
}

document.addEventListener('click', (event) => {
  if (event.target.closest('.card')) onCardClick(event);
  else if (event.target.closest('.enemy-hero')) onHeroClick(event);
  else if (event.target.closest('#player-board .card, #enemy-board .card')) onCardClick(event);
});

document.addEventListener('keydown', (event) => {
  if (state.phase === 'over' && (event.key === 'r' || event.key === 'R')) { restart(); return; }
  if (state.phase !== 'play' || state.active !== 'player' || aiBusy) return;
  if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); runEnemyTurn(); return; }
  if (event.key === 'Escape') { state.selected = null; state.selectedHand = null; draw(); return; }
  const n = Number(event.key);
  if (n >= 1 && n <= 7) {
    const card = state.player.hand[n - 1];
    if (card && playCard(state, 'player', card.uid)) { sfx.summon(); state.lastEvent = ''; }
    draw();
  }
});

checkEnd(state);
draw();
