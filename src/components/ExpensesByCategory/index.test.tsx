// @vitest-environment jsdom
import {render,screen,cleanup} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import type {ReactNode} from 'react';
import {ExpensesByCategory} from './index';
vi.mock('@erikacarvalho/react/Card',()=>({Card:({children}: {children:ReactNode})=><article>{children}</article>}));
vi.mock('@erikacarvalho/react/Chart',()=>({Chart:({data}: {data:unknown})=><div data-testid="chart">{JSON.stringify(data)}</div>}));
afterEach(cleanup);
it('calculates shares from actual amounts',()=>{
 render(<ExpensesByCategory categories={[{name:'Moradia',cents:7500},{name:'Saúde',cents:2500}]}/>);
 expect(screen.getByTestId('chart').textContent).toContain('"percentage":75');
 expect(screen.getByTestId('chart').textContent).toContain('"percentage":25');
});
it('handles no spending',()=>{
 render(<ExpensesByCategory categories={[]}/>);
 expect(screen.queryByTestId('chart')).toBeNull();
});
