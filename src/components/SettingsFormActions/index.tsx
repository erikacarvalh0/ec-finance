'use client';

import { Button } from '@erikacarvalho/react/Button';
import styles from './index.module.css';

export function SettingsFormActions({ onCancel, onSave, disabled = false, saving = false }: {
    onCancel: () => void;
    onSave: () => void;
    disabled?: boolean;
    saving?: boolean;
}) {
    return (
        <div className={styles.actions}>
            <Button rounded type="button" theme="neutral" outline action={onCancel} isDisabled={saving}>Cancelar</Button>
            <Button rounded type="button" theme="cta" action={onSave} isDisabled={disabled || saving}>
                {saving ? 'Salvando…' : 'Salvar alterações'}
            </Button>
        </div>
    );
}
