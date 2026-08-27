import { randomBytes } from 'node:crypto';
import type { BoardCommand, BoardObject, Participant, RoomSnapshot } from '../src/shared/types.js';
import { applyCommand } from '../src/shared/engine.js';

export interface Room {
  id: string; tutorToken: string; objects: BoardObject[]; participants: Map<string, Participant>;
  locked: boolean; revision: number; history: BoardObject[][]; future: BoardObject[][];
  emptySince?: number;
}

const wordsA = ['bright','calm','clever','happy','kind','swift','tiny','wise'];
const wordsB = ['badger','comet','dolphin','fox','koala','otter','panda','tiger'];

export class RoomStore {
  readonly rooms = new Map<string, Room>();
  create(): Room {
    let id = '';
    do id = `${wordsA[Math.floor(Math.random()*wordsA.length)]}-${wordsB[Math.floor(Math.random()*wordsB.length)]}-${Math.floor(10+Math.random()*90)}`; while (this.rooms.has(id));
    const room: Room = { id, tutorToken: randomBytes(24).toString('base64url'), objects: [], participants: new Map(), locked: false, revision: 0, history: [], future: [] };
    this.rooms.set(id, room); return room;
  }
  get(id: string) { return this.rooms.get(id); }
  isTutor(room: Room, token?: string) { return Boolean(token && token === room.tutorToken); }
  snapshot(room: Room): RoomSnapshot { return { version: 1, roomId: room.id, objects: structuredClone(room.objects), participants: [...room.participants.values()], locked: room.locked, revision: room.revision }; }
  command(room: Room, command: BoardCommand, actor: string, isTutor: boolean): boolean {
    if (room.locked && !isTutor) return false;
    if (command.type === 'clear' && !isTutor) return false;
    if (command.type === 'undo') {
      const previous = room.history.pop(); if (!previous) return false;
      room.future.push(structuredClone(room.objects)); room.objects = previous; room.revision++; return true;
    }
    if (command.type === 'redo') {
      const future = room.future.pop(); if (!future) return false;
      room.history.push(structuredClone(room.objects)); room.objects = future; room.revision++; return true;
    }
    const streamingStroke = command.type === 'update' && 'points' in command.patch;
    if (!streamingStroke) { room.history.push(structuredClone(room.objects)); if (room.history.length > 60) room.history.shift(); room.future = []; }
    const next = applyCommand({ objects: room.objects, revision: room.revision }, command, actor);
    if (next === room) { if (!streamingStroke) room.history.pop(); return false; }
    room.objects = next.objects; room.revision = next.revision; return true;
  }
  cleanup(now = Date.now(), ttl = 30 * 60_000) {
    for (const [id, room] of this.rooms) if (room.participants.size === 0 && room.emptySince && now - room.emptySince > ttl) this.rooms.delete(id);
  }
}
