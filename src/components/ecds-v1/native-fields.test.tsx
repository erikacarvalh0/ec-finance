// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Input, Select, Button } from './native-fields';
afterEach(cleanup);
it('preserves native form data and button types', () => {
 const submit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());
 render(<form onSubmit={submit} data-testid="form"><Input name="amount" defaultValue="150,00" required/><Select name="method" defaultValue="PIX"><option value="PIX">Pix</option></Select><Button>Cancel</Button><Button type="submit">Save</Button></form>);
 const data = new FormData(screen.getByTestId('form') as HTMLFormElement);
 expect(data.get('amount')).toBe('150,00');
 expect(data.get('method')).toBe('PIX');
 fireEvent.click(screen.getByText('Cancel'));
 expect(submit).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('Save'));
 expect(submit).toHaveBeenCalledTimes(1);
});
