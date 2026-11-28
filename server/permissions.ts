import type { BoardCommand, BoardObject, Participant, RegionObject } from '../src/shared/types.js';
import { handCount, handOf, regionAt, regionsOverlap } from '../src/shared/regions.js';

export interface Actor { id: string; isTutor: boolean; }

const handName = (region: RegionObject) => `${region.ownerName}'s hand`;

/**
 * Per-object rules for private hands. Returns an error message for the user, or undefined when the command is allowed.
 * Room-wide rules (board lock, tutor-only clear) stay in RoomStore.command.
 */
export function authorize(objects: BoardObject[], command: BoardCommand, actor: Actor, participants: Map<string, Participant>): string | undefined {
  const find = (id: string) => objects.find((o) => o.id === id);
  // A card/deck in someone else's hand can only be touched by that person or the tutor.
  const guarded = (o: BoardObject | undefined) => {
    const hand = o && handOf(objects, o);
    return hand && hand.ownerId !== actor.id && !actor.isTutor ? `That is in ${handName(hand)}` : undefined;
  };
  const ownsRegion = (o: BoardObject | undefined) => o?.type === 'region' && o.ownerId !== actor.id && !actor.isTutor ? `Only ${o.ownerName} or the tutor can change ${handName(o)}` : undefined;

  switch (command.type) {
    case 'create': {
      const o = command.object; if (o.type !== 'region') return undefined;
      if (o.ownerId !== actor.id && !actor.isTutor) return 'You can only create your own hand';
      if (!participants.has(o.ownerId)) return 'That player is not in the room';
      if (objects.some((x) => x.type === 'region' && x.ownerId === o.ownerId)) return `${participants.get(o.ownerId)!.name} already has a hand`;
      return overlaps(objects, o as RegionObject);
    }
    case 'update': case 'delete':
      for (const id of command.ids) {
        const o = find(id); const error = ownsRegion(o) ?? guarded(o); if (error) return error;
        if (command.type === 'update' && o?.type === 'region') { const moved = overlaps(objects, { ...o, ...pickGeometry(command.patch) }); if (moved) return moved; }
      }
      return undefined;
    case 'assignRegion': {
      if (!actor.isTutor) return 'Only the tutor can give a hand to someone else';
      if (!participants.has(command.ownerId)) return 'That player is not in the room';
      if (objects.some((x) => x.type === 'region' && x.ownerId === command.ownerId && x.id !== command.id)) return 'That player already has a hand';
      const region = find(command.id);
      // Otherwise the new owner would see the previous owner's cards.
      if (region?.type === 'region' && handCount(objects, region) > 0) return 'Empty the hand before giving it to someone else';
      return undefined;
    }
    case 'flipCard': case 'flipDeck': {
      const o = find(command.id); const hand = o && handOf(objects, o);
      return hand ? 'Cards in a hand stay face down. Drag the card out to play it.' : undefined;
    }
    case 'shuffleDeck': case 'drawCard': case 'drawAndFlip':
      return guarded(find(command.id));
    case 'dealCards':
      if (!objects.some((o) => o.type === 'region')) return 'There are no hands to deal to. Each player can add one from Things → My hand.';
      return guarded(find(command.id));
    case 'mergeIntoDeck': {
      const source = find(command.sourceId), target = find(command.targetId);
      if (target && regionAt(objects, target)) return 'Cards in a hand do not stack';
      return guarded(source);
    }
    default:
      return undefined;
  }
}

/** Hands may not overlap: otherwise a card could lie in two hands and the wrong person might see it. */
function overlaps(objects: BoardObject[], region: RegionObject): string | undefined {
  const other = objects.find((o): o is RegionObject => o.type === 'region' && o.id !== region.id && regionsOverlap(o, region));
  return other ? `Hands cannot overlap (${handName(other)} is there)` : undefined;
}

function pickGeometry(patch: Record<string, unknown>) {
  const out: Partial<RegionObject> = {};
  for (const key of ['x', 'y', 'width', 'height', 'scaleX', 'scaleY'] as const) if (typeof patch[key] === 'number' && Number.isFinite(patch[key])) out[key] = patch[key] as number;
  return out;
}
