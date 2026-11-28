import { beforeEach, describe, expect, it } from 'vitest';
import { RoomStore, type Room } from './room-store';
import { commandSchema } from '../src/shared/schemas';
import { handOf, regionContains } from '../src/shared/regions';
import type { BoardCommand, CardObject, DeckObject, RegionObject } from '../src/shared/types';

const leo = 'leo-participant', maya = 'maya-participant', ana = 'ana-participant';
const base = (id: string, x = 0, y = 0) => ({ id, x, y, rotation: 0, scaleX: 1, scaleY: 1, z: 0, locked: false, creator: maya, revision: 0 });
const hand = (id: string, ownerId: string, y: number): RegionObject => ({ ...base(id, 0, y), type: 'region', width: 440, height: 180, ownerId, ownerName: '', color: '#e85c62' });
const deckOf = (cards: string[], x = 600, y = 100): DeckObject => ({ ...base('deck', x, y), type: 'deck', cards, initialCards: [...cards], faceUp: false });
let store: RoomStore; let room: Room;
const run = (command: BoardCommand, actor = maya, isTutor = false) => store.command(room, command, actor, isTutor);
const cardsIn = (handId: string) => room.objects.filter((o): o is CardObject => o.type === 'card' && handOf(room.objects, o)?.id === handId);

beforeEach(() => {
  store = new RoomStore(); room = store.create();
  for (const [id, name] of [[leo, 'Leo'], [maya, 'Maya'], [ana, 'Ana']]) room.participants.set(id, { id, name, color: '#e85c62', isTutor: false, selection: [] });
});

describe('dealing cards to every hand', () => {
  it('deals one card to each hand per round, face down, from the top of the deck', () => {
    run({ type: 'create', object: hand('leo-hand', leo, 300) }, leo); run({ type: 'create', object: hand('maya-hand', maya, 600) }, maya);
    run({ type: 'create', object: deckOf(['A0', '20', '30', '40', '50', '60', '70']) });
    expect(run({ type: 'dealCards', id: 'deck', count: 3 })).toEqual({ ok: true });
    // The top of the deck is the end of the list: 7, 6, 5, 4, 3, 2 go to Leo, Maya, Leo, Maya, Leo, Maya.
    expect(cardsIn('leo-hand').map((c) => c.rank)).toEqual(['7', '5', '3']);
    expect(cardsIn('maya-hand').map((c) => c.rank)).toEqual(['6', '4', '2']);
    expect([...cardsIn('leo-hand'), ...cardsIn('maya-hand')].every((c) => !c.faceUp && c.creator === 'deck:deck')).toBe(true);
    // The last card stays on the board on its own.
    expect(room.objects.find((o) => o.id === 'deck')).toMatchObject({ type: 'card', rank: 'A' });
    // Each card lies inside its hand, fanned out from the left.
    for (const id of ['leo-hand', 'maya-hand']) {
      const region = room.objects.find((o): o is RegionObject => o.id === id)!, xs = cardsIn(id).map((c) => c.x);
      expect(cardsIn(id).every((c) => regionContains(region, c))).toBe(true); expect(xs).toEqual([...xs].sort((a, b) => a - b));
    }
  });

  it('keeps the hands private: each owner sees their own cards, nobody sees anyone else’s', () => {
    run({ type: 'create', object: hand('leo-hand', leo, 300) }, leo); run({ type: 'create', object: hand('ana-hand', ana, 600) }, ana);
    run({ type: 'create', object: deckOf(['A0', 'K1', 'Q2', 'J3']) });
    run({ type: 'dealCards', id: 'deck', count: 2 });
    const seen = (viewer: string, handId: string) => store.snapshotFor(room, viewer).objects.filter((o): o is CardObject => o.type === 'card' && o.handId === handId);
    expect(seen(leo, 'leo-hand').map((c) => c.rank).sort()).toEqual(['J', 'K']); // J and K: the 1st and 3rd card from the top
    expect(seen(leo, 'ana-hand').map((c) => c.rank)).toEqual(['', '']);
    expect(seen(maya, 'leo-hand').map((c) => c.rank)).toEqual(['', '']);
  });

  it('continues after the cards already in a hand, deals what is left when the deck runs out, and undoes in one step', () => {
    run({ type: 'create', object: hand('leo-hand', leo, 300) }, leo); run({ type: 'create', object: hand('maya-hand', maya, 600) }, maya);
    run({ type: 'create', object: deckOf(['A0', '20', '30', '40', '50']) });
    run({ type: 'drawCard', id: 'deck', position: { x: 60, y: 390 } }, leo); // Leo already holds one card
    const before = structuredClone(room.objects);
    expect(run({ type: 'dealCards', id: 'deck', count: 3 })).toEqual({ ok: true });
    expect(cardsIn('leo-hand')).toHaveLength(3); expect(cardsIn('maya-hand')).toHaveLength(2);
    expect(room.objects.some((o) => o.id === 'deck')).toBe(false);
    const xs = cardsIn('leo-hand').map((c) => c.x); expect(new Set(xs).size).toBe(3); // the new cards do not cover the one Leo had
    run({ type: 'undo' }, ana);
    expect(room.objects).toEqual(before);
  });

  it('refuses without hands, for a deck in someone else’s hand, and on a locked board', () => {
    run({ type: 'create', object: deckOf(['A0', '20', '30']) });
    expect(run({ type: 'dealCards', id: 'deck', count: 1 })).toEqual({ ok: false, message: expect.stringMatching(/no hands to deal to/) });
    run({ type: 'create', object: hand('leo-hand', leo, 300) }, leo);
    run({ type: 'update', ids: ['deck'], patch: { x: 200, y: 390 } }, leo); // Leo takes the deck into his hand
    expect(run({ type: 'dealCards', id: 'deck', count: 1 }, maya)).toMatchObject({ ok: false, message: expect.stringMatching(/Leo's hand/) });
    expect(run({ type: 'dealCards', id: 'deck', count: 1 }, leo)).toEqual({ ok: true });
    room.locked = true;
    expect(run({ type: 'dealCards', id: 'deck', count: 1 }, leo)).toMatchObject({ ok: false });
    expect(commandSchema.safeParse({ type: 'dealCards', id: 'deck', count: 0 }).success).toBe(false);
    expect(commandSchema.safeParse({ type: 'dealCards', id: 'deck', count: 21 }).success).toBe(false);
  });
});
