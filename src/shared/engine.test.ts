import { describe, expect, it, vi } from 'vitest';
import { applyCommand, type BoardState } from './engine';
import type { BoardObject, DeckObject } from './types';

const counter = (id='one'): BoardObject => ({ id, type:'counter', x:10, y:20, rotation:0, scaleX:1, scaleY:1, z:0, locked:false, creator:'a', revision:0, color:'#3974e8', size:54 });
const state = (objects:BoardObject[]=[]):BoardState=>({objects,revision:0});

describe('board engine',()=>{
  it('creates canonical objects and ignores duplicate ids',()=>{const first=applyCommand(state(),{type:'create',object:counter()},'sam');expect(first.objects[0]).toMatchObject({creator:'sam',revision:1,z:0});expect(applyCommand(first,{type:'create',object:counter()},'sam')).toBe(first);});
  it('updates transforms without allowing identity replacement',()=>{const next=applyCommand(state([counter()]),{type:'update',ids:['one'],patch:{x:99,id:'hijack'} as never},'sam');expect(next.objects[0]).toMatchObject({id:'one',x:99,revision:1});});
  it('preserves locked objects during delete',()=>{const locked={...counter(),locked:true};expect(applyCommand(state([locked]),{type:'delete',ids:['one']},'sam').objects).toHaveLength(1);});
  it('reorders selected objects',()=>{const objects=[counter('a'),{...counter('b'),z:1},{...counter('c'),z:2}];const next=applyCommand(state(objects),{type:'reorder',ids:['a'],direction:'front'},'sam');expect(next.objects.map(o=>o.id)).toEqual(['b','c','a']);});
  it('rolls dice on the server path',()=>{vi.spyOn(Math,'random').mockReturnValue(.99);const die:BoardObject={...counter(),type:'die',value:1,color:'#fff',rollNonce:0};const next=applyCommand(state([die]),{type:'rollDie',id:'one'},'sam');expect(next.objects[0]).toMatchObject({value:6,rollNonce:1});vi.restoreAllMocks();});
  it('draws cards face-down and resets them into the deck',()=>{const deck:DeckObject={...counter('deck'),type:'deck',cards:['A0','K1'],initialCards:['A0','K1']};const drawn=applyCommand(state([deck]),{type:'drawCard',id:'deck'},'sam');expect((drawn.objects[0] as DeckObject).cards).toEqual(['A0']);expect(drawn.objects[1]).toMatchObject({type:'card',rank:'K',suit:'♥',faceUp:false});const reset=applyCommand(drawn,{type:'resetDeck',id:'deck'},'sam');expect(reset.objects).toHaveLength(1);expect((reset.objects[0] as DeckObject).cards).toHaveLength(2);});
  it('flips a two-sided chip while preserving both face designs',()=>{const chip:BoardObject={...counter('chip'),type:'chip',side:'front',frontText:'1',backText:'A',frontColor:'#3974e8',backColor:'#e85c62',size:64};const flipped=applyCommand(state([chip]),{type:'flipChip',id:'chip'},'sam');expect(flipped.objects[0]).toMatchObject({side:'back',frontText:'1',backText:'A',frontColor:'#3974e8',backColor:'#e85c62'});});
});
