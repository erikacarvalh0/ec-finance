'use client';

import { useRef, useState } from 'react';
import { Select } from '@erikacarvalho/react/Select';
import { SettingsFormActions } from '@/components/SettingsFormActions';
import { SettingsSwitch } from '@/components/SettingsSwitch';
import type { Preferences } from '@/modules/settings/preferences';
import styles from './index.module.css';

const currencies = [{value:'BRL',label:'Real brasileiro (BRL)'},{value:'USD',label:'Dólar americano (USD)'},{value:'EUR',label:'Euro (EUR)'}];
const themes = [{value:'LIGHT',label:'Claro'},{value:'DARK',label:'Escuro'},{value:'SYSTEM',label:'Sistema'}];

export function PreferencesSettings({ initialPreferences }: { initialPreferences: Preferences }) {
    const [saved, setSaved] = useState(initialPreferences);
    const [draft, setDraft] = useState(initialPreferences);
    const [revision, setRevision] = useState(0);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const pending = useRef(false);
    const changed = draft.currency !== saved.currency || draft.theme !== saved.theme ||
        draft.billReminders !== saved.billReminders || draft.monthlySummary !== saved.monthlySummary;

    function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
        if (!pending.current) setDraft(previous => ({ ...previous, [key]: value }));
    }

    function cancel() {
        if (pending.current) return;
        setDraft(saved);
        setRevision(value => value + 1);
        setMessage('');
    }

    async function save() {
        if (pending.current || !changed) return;
        pending.current = true;
        setSaving(true);
        setMessage('');
        try {
            const response = await fetch('/api/settings/preferences', {
                method: 'PUT',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(draft),
            });
            if (!response.ok) throw new Error('Save failed');
            const { preferences } = await response.json() as { preferences: Preferences };
            setSaved(preferences);
            setDraft(preferences);
            setRevision(value => value + 1);
            setMessage('Preferências atualizadas.');
        } catch {
            setMessage('Não foi possível salvar as preferências. Tente novamente.');
        } finally {
            pending.current = false;
            setSaving(false);
        }
    }

    return (
        <div className={styles['preferences-settings']} aria-busy={saving}>
            <fieldset key={revision} disabled={saving} className={styles['preferences-settings__fields']}>
                <Select customClass={styles['preferences-settings__select']} name="currency" label="Moeda padrão" options={currencies} defaultValue={saved.currency}
                    onValueChange={value => { if (value === 'BRL' || value === 'USD' || value === 'EUR') update('currency', value); }} />
                <Select customClass={styles['preferences-settings__select']} name="theme" label="Tema" options={themes} defaultValue={saved.theme}
                    onValueChange={value => { if (value === 'LIGHT' || value === 'DARK' || value === 'SYSTEM') update('theme', value); }} />
                <div className={styles['preferences-settings__switches']}>
                <SettingsSwitch label="Lembretes de vencimento" checked={draft.billReminders} disabled={saving}
                    onChange={value => update('billReminders', value)} />
                <SettingsSwitch label="Resumo mensal" checked={draft.monthlySummary} disabled={saving}
                    onChange={value => update('monthlySummary', value)} />
                </div>
            </fieldset>
            <small>As escolhas são salvas na sua conta. A aplicação de temas, conversão de moedas e envio de notificações serão disponibilizados separadamente.</small>
            <p role="status">{message}</p>
            <SettingsFormActions onCancel={cancel} onSave={() => void save()} disabled={!changed} saving={saving} />
        </div>
    );
}
