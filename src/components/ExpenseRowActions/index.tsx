'use client';

import { useState, type ReactNode } from 'react';
import { Dialog } from '@erikacarvalho/react/Dialog';
import { ExpenseActions, type ExpenseAction } from '@/components/ExpenseActions';
import { ExpenseDetails } from '@/components/ExpenseDetails';
import { ExpenseDelete } from '@/components/ExpenseDelete';
import { ExpenseInstallments } from '@/components/ExpenseInstallments';
import type { InstallmentOccurrence } from '@/components/ExpenseInstallments/utils';
import { ExpensePayment } from '@/components/ExpensePayment';
import { ExpenseArchiveButton } from '@/components/finance/expense-archive-button';
import { RecordEditForm } from '@/components/finance/record-edit-form';
import type { ExpenseTableRow } from '@/components/ExpenseTable';

type RecordData = { id: string; description: string; amountInCents: string; type: 'FIXED' | 'VARIABLE'; paymentMethod: string; date: string; firstDueDate: string; installments: number; endsOn: string; categoryId: string };

export function ExpenseRowActions({ row, expense, archived, categories, occurrences, additionalActions }: {
    row: Omit<ExpenseTableRow, 'actions'> & { month: string; state: string };
    expense: RecordData;
    archived: boolean;
    categories: Array<{ id: string; name: string }>;
    occurrences: InstallmentOccurrence[];
    additionalActions?: ReactNode;
}) {
    const [action, setAction] = useState<ExpenseAction | null>(null);
    function closeDialog() { setAction(null); }
    const handlers: Partial<Record<ExpenseAction, () => void>> = {
        details: () => setAction('details'),
        installments: () => setAction('installments'),
        ...(archived ? { restore: () => setAction('restore'), delete: () => setAction('delete') } : {
            edit: () => setAction('edit'),
            archive: () => setAction('archive'),
            ...(row.state === 'PENDING' ? { pay: () => setAction('pay') } : {}),
            ...(row.state === 'SETTLED' ? { reopen: () => setAction('reopen') } : {}),
        }),
    };
    return <>
        <ExpenseActions description={expense.description} archived={archived} paid={row.state === 'SETTLED'} installments={expense.installments} handlers={handlers} />
        {action && <Dialog isOpen toggleDialog={closeDialog} title={action === 'details' ? 'Detalhes da despesa' : action === 'edit' ? 'Editar despesa' : expense.description}>
            {action === 'details' && <>
                <ExpenseDetails
                    expense={{ ...row, type: expense.type === 'FIXED' ? 'Fixa' : 'Variável' }}
                    footer={<ExpenseArchiveButton id={expense.id} archived={archived} onSuccess={closeDialog} />}
                >
                    {additionalActions}
                </ExpenseDetails>
            </>}
            {action === 'delete' && archived && <ExpenseDelete id={expense.id} description={expense.description} onClose={closeDialog} />}
            {action === 'edit' && <RecordEditForm record={{ ...expense, kind: 'expense' }} categories={categories} inline onSuccess={closeDialog} />}
            {(action === 'pay' || action === 'reopen') && <ExpensePayment id={expense.id} month={row.month} paid={row.state === 'SETTLED'} />}
            {action === 'installments' && <ExpenseInstallments expense={expense} occurrences={occurrences} />}
            {(action === 'archive' || action === 'restore') && <ExpenseArchiveButton id={expense.id} archived={archived} onSuccess={closeDialog} />}
        </Dialog>}
    </>;
}
