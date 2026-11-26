// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PreferencesSettings } from './index';

const initial = { currency: 'BRL', theme: 'LIGHT', billReminders: true, monthlySummary: true } as const;
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('PreferencesSettings', () => {
    it('restores saved switches on cancel', () => {
        render(<PreferencesSettings initialPreferences={initial} />);
        const toggle = screen.getByRole('switch', { name: 'Resumo mensal' });
        fireEvent.click(toggle);
        expect(toggle.getAttribute('aria-checked')).toBe('false');
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
        expect(screen.getByRole('switch', { name: 'Resumo mensal' }).getAttribute('aria-checked')).toBe('true');
    });
    it('persists false values and reports success', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ preferences: { ...initial, monthlySummary: false } }) });
        vi.stubGlobal('fetch', fetchMock);
        render(<PreferencesSettings initialPreferences={initial} />);
        fireEvent.click(screen.getByRole('switch', { name: 'Resumo mensal' }));
        fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
        await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Preferências atualizadas.'));
        expect(fetchMock).toHaveBeenCalledWith('/api/settings/preferences', expect.objectContaining({
            method: 'PUT', body: JSON.stringify({ ...initial, monthlySummary: false }),
        }));
    });
    it('keeps unsaved changes when the API fails', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
        render(<PreferencesSettings initialPreferences={initial} />);
        fireEvent.click(screen.getByRole('switch', { name: 'Resumo mensal' }));
        fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
        await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Não foi possível'));
        expect(screen.getByRole('switch', { name: 'Resumo mensal' }).getAttribute('aria-checked')).toBe('false');
    });
});
