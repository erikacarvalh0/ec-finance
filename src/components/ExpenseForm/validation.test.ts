import { expect, it } from 'vitest';
import { validateAmount, validateDescription, validateInstallments } from './validation';

it.each(['0', '-1', 'abc', '1,234'])('rejects invalid amount %s', value => {
    expect(validateAmount(value)).toBeTruthy();
});
it('accepts decimal amounts and valid descriptions and installments', () => {
    expect(validateAmount('150,25')).toBeUndefined();
    expect(validateDescription('Mercado')).toBeUndefined();
    expect(validateInstallments('120')).toBeUndefined();
    expect(validateInstallments('121')).toBeTruthy();
    expect(validateDescription(' ')).toBeTruthy();
});
