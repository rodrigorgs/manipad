export const PROTOCOL_VERSION = 1 as const;

export type ObjectType = 'stroke' | 'text' | 'shape' | 'counter' | 'numberTile' | 'fractionBar' | 'card' | 'deck' | 'die' | 'pawn';
export type Tool = 'select' | 'hand' | 'pencil' | 'highlighter' | 'eraser' | 'text' | 'rectangle' | 'ellipse' | 'line' | 'arrow';

export interface BaseObject {
  id: string; type: ObjectType; x: number; y: number; rotation: number;
  scaleX: number; scaleY: number; z: number; locked: boolean;
  creator: string; revision: number; stackId?: string; stackOrder?: number;
}
export interface StrokeObject extends BaseObject { type: 'stroke'; points: number[]; color: string; width: number; opacity: number; }
export interface TextObject extends BaseObject { type: 'text'; text: string; color: string; fontSize: number; width: number; }
export interface ShapeObject extends BaseObject { type: 'shape'; shapeType: 'rectangle' | 'ellipse' | 'line' | 'arrow'; width: number; height: number; fill: string; stroke: string; strokeWidth: number; }
export interface CounterObject extends BaseObject { type: 'counter'; color: string; size: number; }
export interface NumberTileObject extends BaseObject { type: 'numberTile'; value: number; color: string; }
export interface FractionBarObject extends BaseObject { type: 'fractionBar'; parts: number; shaded: number; color: string; width: number; height: number; }
export interface CardObject extends BaseObject { type: 'card'; rank: string; suit: '♠' | '♥' | '♦' | '♣'; faceUp: boolean; }
export interface DeckObject extends BaseObject { type: 'deck'; cards: string[]; initialCards: string[]; }
export interface DieObject extends BaseObject { type: 'die'; value: number; color: string; rollNonce: number; }
export interface PawnObject extends BaseObject { type: 'pawn'; color: string; label?: string; }
export type BoardObject = StrokeObject | TextObject | ShapeObject | CounterObject | NumberTileObject | FractionBarObject | CardObject | DeckObject | DieObject | PawnObject;

export interface Participant { id: string; name: string; color: string; isTutor: boolean; cursor?: { x: number; y: number }; selection: string[]; }
export interface RoomSnapshot { version: 1; roomId: string; objects: BoardObject[]; participants: Participant[]; locked: boolean; revision: number; }

export type BoardCommand =
  | { type: 'create'; object: BoardObject }
  | { type: 'update'; ids: string[]; patch: Partial<BoardObject> }
  | { type: 'delete'; ids: string[] }
  | { type: 'reorder'; ids: string[]; direction: 'front' | 'back' }
  | { type: 'clear' }
  | { type: 'undo' | 'redo' }
  | { type: 'rollDie'; id: string }
  | { type: 'shuffleDeck' | 'drawCard' | 'resetDeck'; id: string }
  | { type: 'flipCard'; id: string };

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
