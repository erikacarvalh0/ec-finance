'use client';

import { useId, useState, type FormEvent, type ChangeEvent, type ReactNode } from 'react';
import { Button } from '@/components/ecds-v1/compat';

export type ExpenseEditScope = 'CURRENT' | 'CURRENT_AND_PENDING' | 'ALL';

export function ExpenseEdit({ children, onSave, saving = false }: {
    children: ReactNode;
    onSave: (scope: ExpenseEditScope, values: FormData) => void | Promise<void>;
    saving?: boolean;
}) {
    const group = useId();
    const [scope, setScope] = useState<ExpenseEditScope>('CURRENT');

    function handleScopeChange(event: ChangeEvent<HTMLInputElement>) {
        setScope(event.target.value as ExpenseEditScope);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await onSave(scope, new FormData(event.currentTarget));
    }

    return (
        <form onSubmit={handleSubmit}>
            {children}
            <fieldset disabled={saving}>
                <legend>Aplicar alterações a</legend>
                <label>
                    <input type="radio" name={group} value="CURRENT" checked={scope === 'CURRENT'} onChange={handleScopeChange} />
                    Somente esta parcela
                </label>
                <label>
                    <input type="radio" name={group} value="CURRENT_AND_PENDING" checked={scope === 'CURRENT_AND_PENDING'} onChange={handleScopeChange} />
                    Esta parcela e as pendentes
                </label>
                <label>
                    <input type="radio" name={group} value="ALL" checked={scope === 'ALL'} onChange={handleScopeChange} />
                    Todas as parcelas
                </label>
                {scope === 'ALL' && <p>Esta opção pode afetar parcelas já pagas.</p>}
            </fieldset>
            <Button type="submit" disabled={saving}>Salvar alterações</Button>
        </form>
    );
}
