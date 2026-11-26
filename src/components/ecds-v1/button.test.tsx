// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Button } from './button';
afterEach(cleanup);
it('submits once and preserves disabled state',()=>{
 const submit=vi.fn((e:React.FormEvent<HTMLFormElement>)=>e.preventDefault());
 const {rerender}=render(<form onSubmit={submit}><Button type="submit">Save</Button></form>);
 fireEvent.click(screen.getByRole('button',{name:'Save'}));
 expect(submit).toHaveBeenCalledTimes(1);
 rerender(<form onSubmit={submit}><Button type="submit" disabled>Save</Button></form>);
 fireEvent.click(screen.getByRole('button',{name:'Save'}));
 expect(submit).toHaveBeenCalledTimes(1);
});
it('preserves native attributes in fallback',()=>{
 const click=vi.fn();
 render(<Button aria-label="Cancel" onClick={click}>Cancel</Button>);
 const button=screen.getByRole('button',{name:'Cancel'});
 expect(button.getAttribute('type')).toBe('button');
 fireEvent.click(button);
 expect(click).toHaveBeenCalledTimes(1);
});
