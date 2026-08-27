import type { BoardCommand, BoardObject } from './types.js';

export interface BoardState { objects: BoardObject[]; revision: number; }
const clone = <T>(value: T): T => structuredClone(value);

export function applyCommand(state: BoardState, command: BoardCommand, actor: string): BoardState {
  const next = clone(state); next.revision += 1;
  if (command.type === 'create') {
    if (next.objects.length >= 500 || next.objects.some((item) => item.id === command.object.id)) return state;
    next.objects.push({ ...command.object, creator: actor, revision: next.revision, z: next.objects.length });
  } else if (command.type === 'update') {
    const safePatch = { ...command.patch } as Record<string, unknown>;
    for (const key of ['id','type','creator','revision']) delete safePatch[key];
    next.objects = next.objects.map((item) => command.ids.includes(item.id) && !item.locked ? { ...item, ...safePatch, revision: next.revision } as BoardObject : item);
  } else if (command.type === 'delete') next.objects = next.objects.filter((item) => !command.ids.includes(item.id) || item.locked);
  else if (command.type === 'clear') next.objects = [];
  else if (command.type === 'reorder') {
    const picked = next.objects.filter((o) => command.ids.includes(o.id));
    const rest = next.objects.filter((o) => !command.ids.includes(o.id));
    next.objects = (command.direction === 'front' ? [...rest, ...picked] : [...picked, ...rest]).map((o, z) => ({ ...o, z, revision: next.revision }));
  } else if (command.type === 'rollDie') next.objects = next.objects.map((o) => o.id === command.id && o.type === 'die' ? { ...o, value: 1 + Math.floor(Math.random() * 6), rollNonce: o.rollNonce + 1, revision: next.revision } : o);
  else if (command.type === 'flipCard') next.objects = next.objects.map((o) => o.id === command.id && o.type === 'card' ? { ...o, faceUp: !o.faceUp, revision: next.revision } : o);
  else if (command.type === 'flipChip') next.objects = next.objects.map((o) => o.id === command.id && o.type === 'chip' ? { ...o, side: o.side === 'front' ? 'back' : 'front', revision: next.revision } : o);
  else if (command.type === 'shuffleDeck') next.objects = next.objects.map((o) => {
    if (o.id !== command.id || o.type !== 'deck') return o;
    const cards = [...o.cards]; for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
    return { ...o, cards, revision: next.revision };
  });
  else if (command.type === 'resetDeck') next.objects = next.objects.filter((o) => o.type !== 'card' || o.creator !== `deck:${command.id}`).map((o) => o.id === command.id && o.type === 'deck' ? { ...o, cards: [...o.initialCards], revision: next.revision } : o);
  else if (command.type === 'drawCard') {
    const deck = next.objects.find((o) => o.id === command.id && o.type === 'deck');
    if (deck?.type === 'deck' && deck.cards.length) {
      const code = deck.cards[deck.cards.length - 1]; const suits = ['♠','♥','♦','♣'] as const;
      next.objects = next.objects.map((o) => o.id === deck.id && o.type === 'deck' ? { ...o, cards: o.cards.slice(0, -1), revision: next.revision } : o);
      next.objects.push({ id: `card-${crypto.randomUUID()}`, type: 'card', x: deck.x + 86, y: deck.y, rotation: 0, scaleX: 1, scaleY: 1, z: next.objects.length, locked: false, creator: `deck:${deck.id}`, revision: next.revision, rank: code.slice(0,-1), suit: suits[Number(code.slice(-1))] ?? '♠', faceUp: false });
    }
  }
  return next;
}
