// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { SettingsCard } from './index';

afterEach(cleanup);

it('labels the section with its heading and renders content', () => {
    render(<SettingsCard id="profile" title="Perfil" description="Dados pessoais" icon={<svg />}><p>Conteúdo</p></SettingsCard>);
    const region = screen.getByRole('region', { name: 'Perfil' });
    expect(within(region).getByRole('heading', { name: 'Perfil' })).toBeTruthy();
    expect(within(region).getByText('Dados pessoais')).toBeTruthy();
    expect(within(region).getByText('Conteúdo')).toBeTruthy();
});
