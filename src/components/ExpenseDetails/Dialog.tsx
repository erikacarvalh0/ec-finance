'use client';

import { useState } from 'react';
import { Dialog } from '@erikacarvalho/react/Dialog';
import { Button } from '@/components/ecds-v1/compat';
import { ExpenseArchiveButton } from '@/components/finance/expense-archive-button';
import { ExpenseDetails, type ExpenseDetailsData } from './index';

export function ExpenseDetailsDialog({ id, expense, archived }: {
    id: string;
    expense: ExpenseDetailsData;
    archived: boolean;
}) {
    const [open, setOpen] = useState(false);

    function openDialog() {
        setOpen(true);
    }

    function closeDialog() {
        setOpen(false);
    }

    return (
        <>
            <Button type="button" onClick={openDialog}>Ver detalhes</Button>
            <Dialog
                isOpen={open}
                toggleDialog={closeDialog}
                title="Detalhes da despesa"
                headerActions={<ExpenseArchiveButton id={id} archived={archived} />}
            >
                <ExpenseDetails expense={expense} />
            </Dialog>
        </>
    );
}
