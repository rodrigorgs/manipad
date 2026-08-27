import { describe, expect, it } from 'vitest';
import { RoomStore } from './room-store';
import type { CounterObject } from '../src/shared/types';

const object:CounterObject={id:'c',type:'counter',x:0,y:0,rotation:0,scaleX:1,scaleY:1,z:0,locked:false,creator:'x',revision:0,color:'#3974e8',size:54};
describe('room store',()=>{
  it('creates readable unique rooms and recognizes only the tutor token',()=>{const s=new RoomStore(),a=s.create(),b=s.create();expect(a.id).toMatch(/^[a-z]+-[a-z]+-\d{2}$/);expect(a.id).not.toBe(b.id);expect(s.isTutor(a,a.tutorToken)).toBe(true);expect(s.isTutor(a,'wrong')).toBe(false);});
  it('enforces locking, tutor clear, and synchronized undo/redo',()=>{const s=new RoomStore(),room=s.create();expect(s.command(room,{type:'create',object},'student',false)).toBe(true);room.locked=true;expect(s.command(room,{type:'delete',ids:['c']},'student',false)).toBe(false);expect(s.command(room,{type:'clear'},'tutor',true)).toBe(true);expect(room.objects).toHaveLength(0);expect(s.command(room,{type:'undo'},'tutor',true)).toBe(true);expect(room.objects).toHaveLength(1);expect(s.command(room,{type:'redo'},'tutor',true)).toBe(true);expect(room.objects).toHaveLength(0);});
  it('expires only inactive empty rooms',()=>{const s=new RoomStore(),room=s.create();room.emptySince=100;s.cleanup(1000,100);expect(s.get(room.id)).toBeUndefined();});
  it('does not add streamed stroke points to history',()=>{const s=new RoomStore(),room=s.create();const stroke={...object,id:'s',type:'stroke' as const,points:[0,0],width:3,opacity:1};s.command(room,{type:'create',object:stroke},'a',false);const history=room.history.length;s.command(room,{type:'update',ids:['s'],patch:{points:[0,0,3,3]}},'a',false);expect(room.history.length).toBe(history);});
});
