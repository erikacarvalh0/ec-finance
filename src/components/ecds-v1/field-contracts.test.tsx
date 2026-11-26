// @vitest-environment jsdom
import {useState} from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,it,expect} from 'vitest';
import {Input,Select,Card,Button} from './compat';
afterEach(cleanup);
function Form(){
 const [method,setMethod]=useState('pix');
 return <Card padding="lg"><form data-testid="form"><label htmlFor="amount">Amount</label><Input id="amount" name="amount" required defaultValue="150,00"/><label htmlFor="method">Method</label><Select id="method" name="method" value={method} onChange={e=>setMethod(e.target.value)}><option value="pix">Pix</option><option value="credit">Credit</option></Select>{method==='credit'&&<Input name="installments" type="number" min={1} max={24} defaultValue={3}/>}<Button type="reset">Reset</Button></form></Card>;
}
it('preserves controlled payment method, installments and decimal text',()=>{
 render(<Form/>);
 const form=screen.getByTestId('form') as HTMLFormElement;
 expect(new FormData(form).has('installments')).toBe(false);
 fireEvent.change(screen.getByLabelText('Method'),{target:{value:'credit'}});
 const data=new FormData(form);
 expect(data.get('method')).toBe('credit');
 expect(data.get('installments')).toBe('3');
 expect(data.get('amount')).toBe('150,00');
 fireEvent.change(screen.getByLabelText('Amount'),{target:{value:''}});
 expect(form.checkValidity()).toBe(false);
});
