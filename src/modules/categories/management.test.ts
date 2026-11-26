import { describe,it,expect } from 'vitest';
import { command,validateOrder } from './management';
describe('category management validation',()=>{
    it('accepts only a complete unique ordering',()=>{
        expect(()=>validateOrder(['a','b'],['b','a'])).not.toThrow();
        for(const ids of [['a'],['a','a'],['a','foreign']]) expect(()=>validateOrder(['a','b'],ids)).toThrow();
    });
    it('rejects injected ownership and invalid colors',()=>{
        const category={name:'Food',color:'#123456',iconBackground:'#abcdef',icon:'heart'};
        expect(command.safeParse({action:'create',type:'EXPENSE',category}).success).toBe(true);
        expect(command.safeParse({action:'create',type:'EXPENSE',category,userId:'foreign'}).success).toBe(false);
        expect(command.safeParse({action:'create',type:'EXPENSE',category:{...category,color:'red'}}).success).toBe(false);
    });
});
