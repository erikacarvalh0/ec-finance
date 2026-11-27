'use client';

import { useRef, useState, type ComponentProps } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@erikacarvalho/react/Input';
import { Form } from '@erikacarvalho/react/Form';
import { Button } from '@erikacarvalho/react/Button';
import { validateProfileName } from '@/modules/settings/profile-validation';
import styles from './index.module.css';

export function ProfileSettings({ name, email }: { name: string | null; email: string | null }) {
    const router = useRouter();
    const [savedName, setSavedName] = useState(name ?? '');
    const [draft, setDraft] = useState(name ?? '');
    const [revision, setRevision] = useState(0);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const pending = useRef(false);
    const changed = draft.trim() !== savedName;

    function cancel() {
        if (pending.current) return;
        setDraft(savedName);
        setRevision(value => value + 1);
        setMessage('');
    }

    const save: NonNullable<ComponentProps<typeof Form>['handleSubmit']> = async values => {
        const nextName = String(values.name ?? '').trim();
        if (pending.current || nextName === savedName || validateProfileName(nextName)) return;
        pending.current = true;
        setSaving(true);
        setMessage('');
        try {
            const response = await fetch('/api/settings/profile', {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nextName }),
            });
            if (!response.ok) throw new Error('Não foi possível salvar o perfil.');
            const { profile } = await response.json();
            setSavedName(profile.name);
            setDraft(profile.name);
            setRevision(value => value + 1);
            setMessage('Perfil atualizado.');
            router.refresh();
        } catch {
            setMessage('Não foi possível salvar o perfil. Tente novamente.');
        } finally {
            pending.current = false;
            setSaving(false);
        }
    };

    return (
        <div className={styles['profile-settings']} aria-busy={saving}>
            <fieldset disabled={saving} className={styles['profile-settings__fields']}>
                <Form key={revision} customClass={styles['profile-settings__form']} handleSubmit={save} buttonText="Salvar alterações">
                    <Input name="name" label="Nome" defaultValue={savedName} isRequired validate={validateProfileName} onValueChange={setDraft} />
                    <div className={styles['profile-settings__email']}>
                        <span>E-mail</span>
                        <p>{email ?? 'Não informado'}</p>
                        <small>Gerenciado pela sua conta Google.</small>
                    </div>
                    <div className={styles['profile-settings__cancel']}>
                        <Button rounded type="button" theme="neutral" action={cancel} isDisabled={!changed || saving}>Cancelar</Button>
                    </div>
                </Form>
            </fieldset>
            <p className={styles['profile-settings__status']} role="status">{message}</p>
        </div>
    );
}
