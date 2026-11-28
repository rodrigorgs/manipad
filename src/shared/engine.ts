import type { BoardCommand, BoardObject, CardObject, DeckObject, RegionObject } from './types.js';
import { handCount, handOf, isPrivatizable, regionAt, regionBounds } from './regions.js';
import { cardFromCode, codeOfCard, isCustomCode } from './cards.js';
import { dieSides, rollFace } from './dice.js';

/** Fields a generic `update` may change on cards, decks and hands. Faces, deck contents and owners only change through dedicated commands. */
const GEOMETRY_KEYS = new Set(['x', 'y', 'rotation', 'scaleX', 'scaleY', 'width', 'height', 'locked']);
/** Only the server decides what a die shows: a generic `update` cannot set these (faces change through `editDie`). */
const DIE_KEYS = ['value', 'rollNonce', 'sides', 'faces'];

export interface BoardState { objects: BoardObject[]; revision: number; }
const clone = <T>(value: T): T => structuredClone(value);

export function applyCommand(state: BoardState, command: BoardCommand, actor: string): BoardState {
  const next = clone(state); next.revision += 1;
  if (command.type === 'create') {
    if (next.objects.length >= 500 || next.objects.some((item) => item.id === command.object.id)) return state;
    const created = { ...command.object, creator: actor, revision: next.revision, z: next.objects.length } as BoardObject;
    if (created.type === 'card') delete created.peek;
    if (created.type === 'card' || created.type === 'deck') delete created.handId;
    if (created.type === 'region') created.rotation = 0;
    if (created.type === 'die') created.value = rollFace(created); // a new (or duplicated) die never shows a value the client chose
    next.objects.push(created);
  } else if (command.type === 'update') {
    const safePatch = { ...command.patch } as Record<string, unknown>;
    for (const key of ['id','type','creator','revision']) delete safePatch[key];
    const restricted = (item: BoardObject) => isPrivatizable(item) || item.type === 'region';
    const patchFor = (item: BoardObject) => restricted(item) ? Object.fromEntries(Object.entries(safePatch).filter(([key]) => GEOMETRY_KEYS.has(key) && (item.type === 'region' ? key !== 'rotation' : key !== 'width' && key !== 'height')))
      : item.type === 'die' ? Object.fromEntries(Object.entries(safePatch).filter(([key]) => !DIE_KEYS.includes(key))) : safePatch;
    // Moving a hand carries the cards in it (the ones not being moved explicitly by this same command).
    const carried = new Map<string, { dx: number; dy: number }>();
    for (const region of next.objects) {
      if (region.type !== 'region' || !command.ids.includes(region.id) || region.locked) continue;
      const patch = patchFor(region); const dx = typeof patch.x === 'number' ? patch.x - region.x : 0, dy = typeof patch.y === 'number' ? patch.y - region.y : 0;
      if (dx || dy) for (const o of next.objects) if (!command.ids.includes(o.id) && !o.locked && handOf(next.objects, o)?.id === region.id) carried.set(o.id, { dx, dy });
    }
    next.objects = next.objects.map((item) => {
      if (command.ids.includes(item.id) && !item.locked) return { ...item, ...patchFor(item), revision: next.revision } as BoardObject;
      const shift = carried.get(item.id); return shift ? { ...item, x: item.x + shift.dx, y: item.y + shift.dy, revision: next.revision } : item;
    });
  } else if (command.type === 'delete') {
    const imageIds = new Set(next.objects.filter((item) => command.ids.includes(item.id) && item.type === 'image' && !item.locked).map((item) => item.id));
    next.objects = next.objects.filter((item) => (!command.ids.includes(item.id) || item.locked) && !(item.type === 'stroke' && item.parentImageId && imageIds.has(item.parentImageId)));
  }
  else if (command.type === 'clear') next.objects = [];
  else if (command.type === 'reorder') {
    const picked = next.objects.filter((o) => command.ids.includes(o.id));
    const rest = next.objects.filter((o) => !command.ids.includes(o.id));
    next.objects = (command.direction === 'front' ? [...rest, ...picked] : [...picked, ...rest]).map((o, z) => ({ ...o, z, revision: next.revision }));
  } else if (command.type === 'rollDie' || command.type === 'rollDice') {
    const ids = command.type === 'rollDie' ? [command.id] : command.ids;
    next.objects = next.objects.map((o) => ids.includes(o.id) && o.type === 'die' ? { ...o, value: rollFace(o), rollNonce: o.rollNonce + 1, revision: next.revision } : o);
  } else if (command.type === 'editDie') next.objects = next.objects.map((o) => {
    if (o.id !== command.id || o.type !== 'die' || o.locked) return o;
    const edited = { ...o, sides: command.sides, color: command.color, revision: next.revision };
    if (command.faces?.length) edited.faces = command.faces; else delete edited.faces;
    // Keep the face showing when it still exists; otherwise the server picks one.
    if (edited.value > dieSides(edited)) edited.value = rollFace(edited);
    return edited;
  });
  else if (command.type === 'flipCard') next.objects = next.objects.map((o) => o.id === command.id && o.type === 'card' ? { ...o, faceUp: !o.faceUp, revision: next.revision } : o);
  else if (command.type === 'flipDeck') next.objects = next.objects.map((o) => o.id === command.id && o.type === 'deck' ? { ...o, cards: [...o.cards].reverse(), faceUp: !o.faceUp, revision: next.revision } : o);
  else if (command.type === 'assignRegion') next.objects = next.objects.map((o) => o.id === command.id && o.type === 'region' ? { ...o, ownerId: command.ownerId, ownerName: command.ownerName ?? o.ownerName, color: command.color ?? o.color, revision: next.revision } : o);
  else if (command.type === 'flipChip') next.objects = next.objects.map((o) => o.id === command.id && o.type === 'chip' ? { ...o, side: o.side === 'front' ? 'back' : 'front', revision: next.revision } : o);
  else if (command.type === 'shuffleDeck') next.objects = next.objects.map((o) => {
    if (o.id !== command.id || o.type !== 'deck') return o;
    const cards = [...o.cards]; for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
    return { ...o, cards, shuffleNonce: (o.shuffleNonce ?? 0) + 1, revision: next.revision };
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
  else if (command.type === 'dealCards') {
    const deck = next.objects.find((o): o is DeckObject => o.id === command.id && o.type === 'deck' && !o.locked);
    const hands = next.objects.filter((o): o is RegionObject => o.type === 'region');
    if (deck && hands.length) {
      // One card to each hand, in the order the hands were added, then the next round, until each has `count` or the deck runs out.
      const cards = [...deck.cards], placed = new Map(hands.map((hand) => [hand.id, handCount(next.objects, hand)]));
      for (let round = 0; round < command.count && cards.length; round++) for (const hand of hands) {
        const code = cards.pop(); if (!code) break;
        const slot = placed.get(hand.id)!; placed.set(hand.id, slot + 1);
        next.objects.push({ id: `card-${crypto.randomUUID()}`, type: 'card', ...dealtPosition(hand, slot, isCustomCode(code)), rotation: 0, scaleX: 1, scaleY: 1, z: next.objects.length, locked: false, creator: `deck:${deck.id}`, revision: next.revision, ...cardFromCode(code), faceUp: false });
      }
      next.objects = next.objects.map((o) => (o.id === deck.id ? { ...deck, cards, revision: next.revision } : o));
    }
  }
  else if (command.type === 'drawCard' || command.type === 'drawAndFlip') {
    const deck = next.objects.find((o) => o.id === command.id && o.type === 'deck');
    if (deck?.type === 'deck' && deck.cards.length) {
      const code = deck.cards[deck.cards.length - 1];
      const drawnCount = next.objects.filter((o) => o.type === 'card' && o.creator === `deck:${deck.id}`).length;
      // Imported cards are bigger than playing cards (see cardSize in cards.ts), so they are dealt further apart.
      const step = isCustomCode(code) ? { x: 124, y: 162 } : { x: 82, y: 106 };
      const landing = command.type === 'drawCard' && command.position ? command.position : { x: deck.x + step.x + 4 + (drawnCount % 4) * step.x, y: deck.y + Math.floor(drawnCount / 4) * step.y };
      next.objects = next.objects.map((o) => {
        if (o.id === deck.id && o.type === 'deck') return { ...o, cards: o.cards.slice(0, -1), revision: next.revision };
        return o;
      });
      next.objects.push({ id: `card-${crypto.randomUUID()}`, type: 'card', x: landing.x, y: landing.y, rotation: 0, scaleX: 1, scaleY: 1, z: next.objects.length, locked: false, creator: `deck:${deck.id}`, revision: next.revision, ...cardFromCode(code), faceUp: command.type === 'drawAndFlip' ? true : deck.faceUp });
    }
  }
  next.objects = normalizeHands(state.objects, normalizeDecks(next.objects, next.revision), next.revision);
  return next;
}

/** Dealt cards fan out from the left of the hand, overlapping, and pile up at its right edge when the row is full. */
function dealtPosition(hand: RegionObject, slot: number, custom: boolean) {
  const bounds = regionBounds(hand), half = custom ? 54 : 34, step = custom ? 44 : 30;
  const x = Math.min(bounds.left + 16 + half + slot * step, bounds.right - 16 - half);
  return { x: Math.max(bounds.left + 1, x), y: (bounds.top + bounds.bottom) / 2 };
}

function isCardOrDeck(object: BoardObject): object is CardObject | DeckObject { return object.type === 'card' || object.type === 'deck'; }
const cardCode = codeOfCard;
function normalizeDecks(objects: BoardObject[], revision: number): BoardObject[] {
  return objects.flatMap((object): BoardObject[] => {
    if (object.type !== 'deck') return [object];
    if (object.cards.length === 0) return [];
    if (object.cards.length > 1) return [object];
    const code = object.cards[0];
    return [{ id: object.id, type: 'card', x: object.x, y: object.y, rotation: object.rotation, scaleX: object.scaleX, scaleY: object.scaleY, z: object.z, locked: object.locked, creator: object.creator, revision, ...cardFromCode(code), faceUp: object.faceUp, ...(object.handId ? { handId: object.handId } : {}) }];
  });
}

/**
 * Keeps hand membership and the face-down invariant:
 * - a card/deck whose position changed (or that was just created) joins the region it now lies in, or leaves its hand;
 * - a member that no longer lies inside its region (the region was resized or deleted) leaves the hand;
 * - every member is stored face-down, so nothing is revealed when it leaves the hand, the hand is deleted or an action is undone.
 */
export function normalizeHands(previous: BoardObject[], objects: BoardObject[], revision: number): BoardObject[] {
  const before = new Map(previous.map((o) => [o.id, o]));
  return objects.map((o) => {
    if (!isPrivatizable(o)) return o;
    const old = before.get(o.id);
    const moved = !old || old.x !== o.x || old.y !== o.y || old.type !== o.type;
    const handId = moved ? regionAt(objects, o)?.id : handOf(objects, o)?.id;
    if (handId === o.handId && !(handId && o.faceUp)) return o;
    const next = { ...o, revision } as typeof o;
    if (handId) { next.handId = handId; next.faceUp = false; } else delete next.handId;
    return next;
  });
}
