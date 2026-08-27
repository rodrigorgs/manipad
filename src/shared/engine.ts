import type { BoardCommand, BoardObject, CardObject, DeckObject } from './types.js';

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
  else if (command.type === 'flipDeck') next.objects = next.objects.map((o) => o.id === command.id && o.type === 'deck' ? { ...o, cards: [...o.cards].reverse(), faceUp: !o.faceUp, revision: next.revision } : o);
  else if (command.type === 'flipChip') next.objects = next.objects.map((o) => o.id === command.id && o.type === 'chip' ? { ...o, side: o.side === 'front' ? 'back' : 'front', revision: next.revision } : o);
  else if (command.type === 'shuffleDeck') next.objects = next.objects.map((o) => {
    if (o.id !== command.id || o.type !== 'deck') return o;
    const cards = [...o.cards]; for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
    return { ...o, cards, revision: next.revision };
  });
  else if (command.type === 'resetDeck') next.objects = next.objects.filter((o) => o.type !== 'card' || o.creator !== `deck:${command.id}`).map((o) => o.id === command.id && o.type === 'deck' ? { ...o, cards: [...o.initialCards], faceUp: false, revision: next.revision } : o);
  else if (command.type === 'mergeIntoDeck') {
    const source = next.objects.find((o) => o.id === command.sourceId);
    const target = next.objects.find((o) => o.id === command.targetId);
    if (!source || !target || source.id === target.id || source.locked || target.locked || !isCardOrDeck(source) || !isCardOrDeck(target)) return state;
    if (source.type === 'card' && target.type === 'card') {
      const cards = [cardCode(target), cardCode(source)];
      const deck: DeckObject = { id: `deck-${crypto.randomUUID()}`, type: 'deck', x: target.x, y: target.y, rotation: 0, scaleX: 1, scaleY: 1, z: Math.max(0, ...next.objects.map((o) => o.z)) + 1, locked: false, creator: actor, revision: next.revision, cards, initialCards: [...cards], faceUp: source.faceUp };
      next.objects = next.objects.filter((o) => o.id !== source.id && o.id !== target.id);
      next.objects.push(deck);
    } else if (target.type === 'deck') {
      const cards = source.type === 'card' ? [cardCode(source)] : source.cards;
      const returning = source.type === 'card' && source.creator === `deck:${target.id}`;
      const initialCards = returning ? target.initialCards : [...target.initialCards, ...(source.type === 'card' ? cards : source.initialCards)];
      next.objects = next.objects.filter((o) => o.id !== source.id).map((o) => o.id === target.id && o.type === 'deck' ? { ...o, cards: [...o.cards, ...cards], initialCards, revision: next.revision } : o);
    } else if (source.type === 'deck' && target.type === 'card') {
      const code = cardCode(target); const returning = target.creator === `deck:${source.id}`;
      next.objects = next.objects.filter((o) => o.id !== target.id).map((o) => o.id === source.id && o.type === 'deck' ? { ...o, x: target.x, y: target.y, cards: [...o.cards, code], initialCards: returning ? o.initialCards : [...o.initialCards, code], revision: next.revision } : o);
    }
  }
  else if (command.type === 'drawCard') {
    const deck = next.objects.find((o) => o.id === command.id && o.type === 'deck');
    if (deck?.type === 'deck' && deck.cards.length) {
      const code = deck.cards[deck.cards.length - 1]; const suits = ['♠','♥','♦','♣'] as const;
      const drawnCount = next.objects.filter((o) => o.type === 'card' && o.creator === `deck:${deck.id}`).length;
      const landing = { x: deck.x + 86 + (drawnCount % 4) * 82, y: deck.y + Math.floor(drawnCount / 4) * 106 };
      next.objects = next.objects.map((o) => {
        if (o.id === deck.id && o.type === 'deck') return { ...o, cards: o.cards.slice(0, -1), revision: next.revision };
        return o;
      });
      next.objects.push({ id: `card-${crypto.randomUUID()}`, type: 'card', x: landing.x, y: landing.y, rotation: 0, scaleX: 1, scaleY: 1, z: next.objects.length, locked: false, creator: `deck:${deck.id}`, revision: next.revision, rank: code.slice(0,-1), suit: suits[Number(code.slice(-1))] ?? '♠', faceUp: deck.faceUp });
    }
  }
  next.objects = normalizeDecks(next.objects, next.revision);
  return next;
}

function isCardOrDeck(object: BoardObject): object is CardObject | DeckObject { return object.type === 'card' || object.type === 'deck'; }
function cardCode(card: CardObject) { const suits = ['♠','♥','♦','♣'] as const; return `${card.rank}${suits.indexOf(card.suit)}`; }
function normalizeDecks(objects: BoardObject[], revision: number): BoardObject[] {
  const suits = ['♠','♥','♦','♣'] as const;
  return objects.flatMap((object): BoardObject[] => {
    if (object.type !== 'deck') return [object];
    if (object.cards.length === 0) return [];
    if (object.cards.length > 1) return [object];
    const code = object.cards[0];
    return [{ id: object.id, type: 'card', x: object.x, y: object.y, rotation: object.rotation, scaleX: object.scaleX, scaleY: object.scaleY, z: object.z, locked: object.locked, creator: object.creator, revision, rank: code.slice(0, -1), suit: suits[Number(code.slice(-1))] ?? '♠', faceUp: object.faceUp }];
  });
}
