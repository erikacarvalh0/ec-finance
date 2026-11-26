// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SettingsFormActions } from './index';

afterEach(cleanup);

it('calls cancel and save handlers', () => {
    const onCancel = vi.fn();
    const onSave = vi.fn();
    render(<SettingsFormActions onCancel={onCancel} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
});
