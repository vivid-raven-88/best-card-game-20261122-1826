// Ember Pact — the card pool and the elemental wheel.
// Every card is an original guardian of the Ember Court. Four elements form a
// wheel: Flame burns Thorn, Thorn strangles Tide, Tide drowns Flame. Stone
// stands outside the wheel: no edge, but sturdier stats for its cost.

export const ELEMENTS = {
  flame: { name: 'Flame', glyph: '🔥', color: '#ff6b35', dark: '#7a2410', beats: 'thorn' },
  tide: { name: 'Tide', glyph: '💧', color: '#38b6ff', dark: '#0b3d5c', beats: 'flame' },
  thorn: { name: 'Thorn', glyph: '🌿', color: '#7dd069', dark: '#1e4d1a', beats: 'tide' },
  stone: { name: 'Stone', glyph: '🪨', color: '#d8b45a', dark: '#5c4a12', beats: null },
};

// Bonus attack when the attacker's element beats the defender's.
export function elementEdge(attackerElement, defenderElement) {
  const el = ELEMENTS[attackerElement];
  return el && el.beats === defenderElement ? 2 : 0;
}

export function elementBeats(a, b) {
  return ELEMENTS[a] && ELEMENTS[a].beats === b;
}

// Eight unique guardians. A deck holds three copies of each: 24 cards.
export const CARD_POOL = [
  { id: 'spark-imp', name: 'Spark Imp', element: 'flame', cost: 1, attack: 2, health: 2, text: 'A mischievous ember that bites.' },
  { id: 'cinder-wolf', name: 'Cinder Wolf', element: 'flame', cost: 2, attack: 3, health: 3, text: 'Howls in smoke, hunts in ash.' },
  { id: 'phoenix-herald', name: 'Phoenix Herald', element: 'flame', cost: 4, attack: 6, health: 5, text: 'Reborn from every defeat.' },
  { id: 'brook-sprite', name: 'Brook Sprite', element: 'tide', cost: 1, attack: 1, health: 3, text: 'Quick as a riffle, cold as rain.' },
  { id: 'tidecaller', name: 'Tidecaller', element: 'tide', cost: 2, attack: 2, health: 4, text: 'Calls the river to its side.' },
  { id: 'deep-leviathan', name: 'Deep Leviathan', element: 'tide', cost: 4, attack: 5, health: 7, text: 'The lake remembers everything.' },
  { id: 'briar-stalker', name: 'Briar Stalker', element: 'thorn', cost: 2, attack: 3, health: 2, text: 'It was a hedge. Now it hunts.' },
  { id: 'granite-golem', name: 'Granite Golem', element: 'stone', cost: 3, attack: 4, health: 5, text: 'Slow, patient, unmoved.' },
];

export const MAX_BOARD = 5;
export const STARTING_LIFE = 30;
export const MAX_MANA = 8;
export const OPENING_HAND = 3;
