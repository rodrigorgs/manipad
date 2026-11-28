export const PROTOCOL_VERSION = 1 as const;

export type ObjectType = 'stroke' | 'text' | 'shape' | 'counter' | 'numberTile' | 'fractionBar' | 'card' | 'deck' | 'die' | 'pawn' | 'chip' | 'image' | 'region';
export type Tool = 'select' | 'hand' | 'pencil' | 'highlighter' | 'eraser' | 'text' | 'rectangle' | 'ellipse' | 'line' | 'arrow';

export interface BaseObject {
  id: string; type: ObjectType; x: number; y: number; rotation: number;
  scaleX: number; scaleY: number; z: number; locked: boolean;
  creator: string; revision: number;
}
export interface StrokeObject extends BaseObject { type: 'stroke'; points: number[]; color: string; width: number; opacity: number; parentImageId?: string; }
export interface TextObject extends BaseObject { type: 'text'; text: string; color: string; fontSize: number; width: number; }
export interface ShapeObject extends BaseObject { type: 'shape'; shapeType: 'rectangle' | 'ellipse' | 'line' | 'arrow'; width: number; height: number; fill: string; stroke: string; strokeWidth: number; }
export interface CounterObject extends BaseObject { type: 'counter'; color: string; size: number; }
export interface NumberTileObject extends BaseObject { type: 'numberTile'; value: number; color: string; }
export interface FractionBarObject extends BaseObject { type: 'fractionBar'; parts: number; shaded: number; color: string; width: number; height: number; }
/**
 * `handId`: the hand (region) the card was placed in; set only by the server when the card is moved/drawn into a region.
 * `peek`: never stored; the server sets it only in the snapshot sent to the owner of that hand.
 * `face`: set for cards from an imported set (see `shared/cards.ts`): `${setId}:${index}`, or just `${setId}:` when hidden. `rank` is then empty.
 */
export interface CardObject extends BaseObject { type: 'card'; rank: string; suit: '♠' | '♥' | '♦' | '♣'; faceUp: boolean; face?: string; handId?: string; peek?: boolean; }
/** `shuffleNonce` grows on every shuffle, so players (who never see the order) can tell a shuffle happened and animate it. */
export interface DeckObject extends BaseObject { type: 'deck'; cards: string[]; initialCards: string[]; faceUp: boolean; handId?: string; shuffleNonce?: number; }
/**
 * `value` is the face showing (1..sides), always rolled by the server; `rollNonce` grows on every roll so clients can animate it.
 * `sides` defaults to 6. `faces`, when set, has one entry per side; an `image` is a URL served by the room (see D-010).
 */
export interface DieFace { text?: string; image?: string; }
export interface DieObject extends BaseObject { type: 'die'; value: number; color: string; rollNonce: number; sides?: number; faces?: DieFace[]; }
export interface PawnObject extends BaseObject { type: 'pawn'; color: string; label?: string; }
export interface ChipObject extends BaseObject { type: 'chip'; side: 'front' | 'back'; frontText: string; backText: string; frontColor: string; backColor: string; size: number; }
export interface ImageObject extends BaseObject { type: 'image'; src: string; width: number; height: number; alt: string; }
/** A private hand: cards and decks whose center lies inside it are face-down and only the owner sees their faces. x/y is the top-left corner. */
export interface RegionObject extends BaseObject { type: 'region'; width: number; height: number; ownerId: string; ownerName: string; color: string; }
export type BoardObject = StrokeObject | TextObject | ShapeObject | CounterObject | NumberTileObject | FractionBarObject | CardObject | DeckObject | DieObject | PawnObject | ChipObject | ImageObject | RegionObject;

/** One field of an imported card face, in the order the source defines them. */
export interface CardField { name: string; kind: 'text' | 'icon' | 'image'; text: string; }
/**
 * `image`: a picture covering the whole face (decks made from image files). Clients send it as a data URL in `importDeck`;
 * the server keeps the bytes and replaces it with a URL it serves (see `cardImageUrl` in room-store.ts), so snapshots stay small.
 */
export interface CardFace { fields: CardField[]; image?: string; }
/** An imported collection of card faces (from Naipe or from image files). Room-wide and append-only; cards and decks refer to faces by code. */
export interface CardSet { id: string; name: string; widthMm: number; heightMm: number; faces: CardFace[]; }

export interface Participant { id: string; name: string; color: string; isTutor: boolean; cursor?: { x: number; y: number }; selection: string[]; }
export interface RoomSnapshot { version: 1; roomId: string; objects: BoardObject[]; participants: Participant[]; locked: boolean; revision: number; cardSets: CardSet[]; }

export type BoardCommand =
  | { type: 'create'; object: BoardObject }
  | { type: 'update'; ids: string[]; patch: Partial<BoardObject> }
  | { type: 'delete'; ids: string[] }
  | { type: 'reorder'; ids: string[]; direction: 'front' | 'back' }
  | { type: 'clear' }
  | { type: 'undo' | 'redo' }
  | { type: 'rollDie'; id: string }
  /** Rolls several dice in one step (one undo). */
  | { type: 'rollDice'; ids: string[] }
  /** Changes a die's faces and color; face pictures may be data URLs (stored by the server) or URLs the room already serves. */
  | { type: 'editDie'; id: string; sides: number; faces?: DieFace[]; color: string }
  | { type: 'shuffleDeck' | 'drawAndFlip' | 'resetDeck'; id: string }
  | { type: 'drawCard'; id: string; position?: { x: number; y: number } }
  /** Deals `count` cards from a deck to every hand on the board, one round at a time (one undo). */
  | { type: 'dealCards'; id: string; count: number }
  | { type: 'flipDeck'; id: string }
  | { type: 'mergeIntoDeck'; sourceId: string; targetId: string }
  | { type: 'flipCard'; id: string }
  | { type: 'flipChip'; id: string }
  | { type: 'assignRegion'; id: string; ownerId: string; ownerName?: string; color?: string }
  /** Registers a card set in the room and places a face-down deck with all its cards (handled by the room store). */
  | { type: 'importDeck'; id: string; position: { x: number; y: number }; set: Omit<CardSet, 'id'> };

export interface ServerToClientEvents {
  snapshot: (snapshot: RoomSnapshot) => void;
  presence: (participants: Participant[]) => void;
  cursor: (payload: { participantId: string; cursor: { x: number; y: number }; selection: string[] }) => void;
  reaction: (payload: { participantId: string; emoji: string; nonce: number }) => void;
  'view:reset': () => void;
  error: (payload: { code: string; message: string }) => void;
}
export interface ClientToServerEvents {
  command: (command: BoardCommand, ack?: (result: { ok: boolean; message?: string }) => void) => void;
  cursor: (payload: { cursor: { x: number; y: number }; selection: string[] }) => void;
  reaction: (emoji: string) => void;
  control: (payload: { action: 'lock' | 'unlock' | 'reset-view' }, ack?: (result: { ok: boolean }) => void) => void;
}
