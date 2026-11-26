// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SecuritySettings } from './index';

afterEach(cleanup);
describe('SecuritySettings', () => {
    it('directs Google users to the official security page without collecting passwords', () => {
        const { container } = render(<SecuritySettings googleConnected />);
        const link = screen.getByRole('link', { name: /Gerenciar segurança no Google/ });
        expect(link.getAttribute('href')).toBe('https://myaccount.google.com/security');
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
        expect(link.getAttribute('target')).toBe('_blank');
        expect(container.querySelector('input')).toBeNull();
    });
    it('does not show a Google management action for an unidentified account', () => {
        render(<SecuritySettings googleConnected={false} />);
        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.getByText('Método de acesso não identificado')).toBeTruthy();
    });
});
