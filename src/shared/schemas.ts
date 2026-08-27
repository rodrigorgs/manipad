import { z } from 'zod';

const finite = z.number().finite();
const base = z.object({
  id: z.string().min(1).max(80), type: z.string(), x: finite, y: finite,
  rotation: finite, scaleX: finite, scaleY: finite, z: finite,
  locked: z.boolean(), creator: z.string().max(80), revision: z.number().int().nonnegative(),
}).passthrough();

export const boardObjectSchema = base.superRefine((value, ctx) => {
  if (!['stroke','text','shape','counter','numberTile','fractionBar','card','deck','die','pawn','chip','image'].includes(value.type)) {
    ctx.addIssue({ code: 'custom', message: 'Unknown object type' });
  }
});

export const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create'), object: boardObjectSchema }),
  z.object({ type: z.literal('update'), ids: z.array(z.string()).max(100), patch: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal('delete'), ids: z.array(z.string()).max(100) }),
  z.object({ type: z.literal('reorder'), ids: z.array(z.string()).max(100), direction: z.enum(['front','back']) }),
  z.object({ type: z.literal('clear') }), z.object({ type: z.literal('undo') }), z.object({ type: z.literal('redo') }),
  z.object({ type: z.literal('rollDie'), id: z.string() }), z.object({ type: z.literal('shuffleDeck'), id: z.string() }),
  z.object({ type: z.literal('drawCard'), id: z.string() }), z.object({ type: z.literal('resetDeck'), id: z.string() }),
  z.object({ type: z.literal('flipDeck'), id: z.string() }),
  z.object({ type: z.literal('mergeIntoDeck'), sourceId: z.string(), targetId: z.string() }),
  z.object({ type: z.literal('flipCard'), id: z.string() }), z.object({ type: z.literal('flipChip'), id: z.string() }),
]);

export const joinSchema = z.object({
  roomId: z.string().regex(/^[a-z0-9-]{4,32}$/), participantId: z.string().min(4).max(80),
  name: z.string().trim().min(1).max(28), color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  tutorToken: z.string().max(100).optional(), version: z.literal(1),
});
