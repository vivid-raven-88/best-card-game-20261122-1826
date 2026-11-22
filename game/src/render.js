// Ember Pact — DOM rendering: the felt table, the cards, the life totals.
// Everything is plain DOM + CSS so a card stays readable at thumbnail size:
// big numerals, a coloured element band and a glyph, never text alone.

import { ELEMENTS } from './cards.js';

function esc(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function lifeBar(life, max = 30) {
  const pct = Math.max(0, Math.min(100, (life / max) * 100));
  const cls = life <= 10 ? 'low' : life <= 18 ? 'mid' : '';
  return `<div class="lifebar"><div class="lifefill ${cls}" style="width:${pct}%"></div><span>${life} / ${max}</span></div>`;
}

function manaRow(mana, maxMana) {
  let gems = '';
  for (let i = 0; i < 8; i++) {
    gems += `<span class="gem ${i < mana ? 'lit' : ''} ${i >= maxMana ? 'locked' : ''}">◆</span>`;
  }
  return `<div class="manarow" title="Ember mana">${gems}<b>${mana}/${maxMana} ember</b></div>`;
}

function cardBack() {
  return `<div class="card back"><div class="backsigil">🔥</div><div class="backname">EMBER PACT</div></div>`;
}

// One guardian card. opts: inHand, onBoard, selected, playable, targetable.
export function cardHTML(card, opts = {}) {
  const el = ELEMENTS[card.element];
  const classes = ['card', `el-${card.element}`];
  if (opts.selected) classes.push('selected');
  if (opts.playable) classes.push('playable');
  if (opts.targetable) classes.push('targetable');
  if (opts.justSummoned) classes.push('sleeping');
  if (opts.canAttack) classes.push('ready');
  const badge = opts.justSummoned
    ? '<div class="sleeptag">RESTING</div>'
    : opts.canAttack ? '<div class="readytag">READY</div>' : '';
  return `<div class="${classes.join(' ')}" data-uid="${card.uid}" data-kind="${opts.kind || 'board'}" role="button" tabindex="0" aria-label="${esc(card.name)}, cost ${card.cost}, attack ${card.attack}, health ${card.health}">
    <div class="cardcost">${card.cost}</div>
    <div class="cardglyph" style="background:${el.color}">${el.glyph}</div>
    <div class="cardname">${esc(card.name)}</div>
    <div class="cardel" style="color:${el.color}">${el.glyph} ${el.name.toUpperCase()}</div>
    <div class="cardtext">${esc(card.text)}</div>
    <div class="cardstats"><span class="atk">ATK ${card.attack}</span><span class="hp">♥ ${card.health}</span></div>
    ${badge}
  </div>`;
}

export function renderTable(state, ui) {
  const app = document.getElementById('app');
  const p = state.player;
  const e = state.enemy;
  const yourTurn = state.active === 'player' && state.phase === 'play';
  const banner = state.phase === 'over'
    ? (state.winner === 'player' ? '🔥 VICTORY — the court is yours!' : '🌫️ DEFEAT — your ember gutters out.')
    : yourTurn ? `Your turn — Turn ${state.turn}` : 'Cinder is thinking…';

  let enemyHand = '';
  for (let i = 0; i < e.hand.length; i++) enemyHand += cardBack();
  if (e.hand.length === 0) enemyHand = '<div class="emptyhand">no cards in hand</div>';

  const enemyBoard = e.board.length
    ? e.board.map((g) => cardHTML(g, { kind: 'enemy-board', targetable: !!state.selected })).join('')
    : '<div class="emptyboard">Cinder has no guardians out.</div>';
  const playerBoard = p.board.length
    ? p.board.map((g) => cardHTML(g, {
        kind: 'player-board',
        selected: state.selected === g.uid,
        canAttack: yourTurn && g.canAttack,
        justSummoned: g.justSummoned,
      })).join('')
    : '<div class="emptyboard">Your side is empty — summon a guardian.</div>';
  const playerHand = p.hand.length
    ? p.hand.map((c) => {
        const affordable = yourTurn && p.mana >= c.cost && p.board.length < 5;
        return cardHTML(c, {
          kind: 'hand',
          selected: state.selectedHand === c.uid,
          playable: affordable,
        });
      }).join('')
    : '<div class="emptyboard">Your hand is empty — draw next turn.</div>';

  const logLines = state.log.slice(-5).map((l) => `<div>${esc(l)}</div>`).join('');

  app.innerHTML = `
  <div id="table">
    <div class="topbar">
      <div class="hero enemy-hero" data-target="hero">
        <div class="portrait">🧙‍♀️</div>
        <div class="heroinfo"><b>Cinder, Ash Warden</b>${lifeBar(e.life)}</div>
        <div class="deckcount">🂠 deck ${e.deck.length} · hand ${e.hand.length}</div>
      </div>
      <div class="banner ${state.phase === 'over' ? (state.winner === 'player' ? 'win' : 'lose') : ''}">${esc(banner)}</div>
      <button id="end-turn" ${yourTurn ? '' : 'disabled'}>End Turn ⏎</button>
    </div>
    <div class="handrow enemy-hand">${enemyHand}</div>
    <div class="boardrow" id="enemy-board">${enemyBoard}</div>
    <div class="midrow">
      <div class="vs">⚔️</div>
      <div id="gamelog">${logLines}</div>
      <div class="hint">${state.lastEvent ? esc(state.lastEvent) : 'Click a card to summon it. Click a glowing guardian, then an enemy, to attack. Keys: 1–7 summon, Space ends turn.'}</div>
    </div>
    <div class="boardrow" id="player-board">${playerBoard}</div>
    <div class="handrow" id="player-hand">${playerHand}</div>
    <div class="bottombar">
      <div class="hero player-hero">
        <div class="portrait">🔥</div>
        <div class="heroinfo"><b>You, Ember Herald</b>${lifeBar(p.life)}</div>
        <div class="deckcount">🂠 deck ${p.deck.length} · hand ${p.hand.length}</div>
      </div>
      ${manaRow(p.mana, p.maxMana)}
    </div>
  </div>
  ${state.phase === 'over' ? `
  <div id="endscreen" class="${state.winner === 'player' ? 'win' : 'lose'}">
    <div class="endcard">
      <div class="endtitle">${state.winner === 'player' ? '🏆 VICTORY' : '🌫️ DEFEAT'}</div>
      <p>${state.winner === 'player'
        ? 'Cinder is ash on the wind. The Ember Court kneels to its new Herald — 30 life to none, the pact is yours.'
        : 'Your last ember gutters out in the dark. Cinder keeps the court… this time. The pact can be sworn again.'}</p>
      <div class="endscore">Turns played: ${state.turn} · Your life: ${Math.max(0, p.life)} · Cinder's life: ${Math.max(0, e.life)}</div>
      <button id="again">Play again (R)</button>
      <button id="totitle" class="ghost">Title screen</button>
    </div>
  </div>` : ''}`;
  void ui;
}

export function renderTitle() {
  const app = document.getElementById('app');
  app.innerHTML = `
  <div id="title">
    <div class="titlecard">
      <div class="titleflame">🔥</div>
      <h1>EMBER PACT</h1>
      <div class="subtitle">— Duel of the Ember Court —</div>
      <p class="tagline">Summon guardians. Spend ember. Burn the rival warden's 30 life to ash before yours is spent.</p>
      <div class="rules">
        <div><b>🔥 Flame</b> beats <b>🌿 Thorn</b></div>
        <div><b>🌿 Thorn</b> beats <b>💧 Tide</b></div>
        <div><b>💧 Tide</b> beats <b>🔥 Flame</b></div>
        <div><b>🪨 Stone</b> stands alone — sturdy, no edge</div>
        <div class="ruleline">Elemental edge: +2 attack. Guardians fight back when struck.</div>
        <div class="ruleline">Mana grows each turn, to 8. Empty deck? Fatigue burns you.</div>
      </div>
      <button id="play">▶ &nbsp;Swear the Pact — Play</button>
      <div class="keys">Mouse to play · keys 1–7 summon · Space ends turn · R restarts</div>
    </div>
  </div>`;
}
