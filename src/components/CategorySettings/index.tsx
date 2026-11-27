'use client';
import { useRef, useState } from 'react';
import { Button } from '@erikacarvalho/react/Button';
import { Dialog } from '@erikacarvalho/react/Dialog';
import { CategoryForm } from '@/components/CategoryForm';
import { CategoryTable } from '@/components/CategoryTable';
import type { ManagedCategory } from '@/modules/categories/management';
import styles from './index.module.css';

export function CategorySettings({ initialCategories }: {initialCategories: ManagedCategory[]}) {
    const [categories,setCategories] = useState(initialCategories);
    const [type,setType] = useState<'EXPENSE'|'INCOME'>('EXPENSE');
    const [dialog,setDialog] = useState<{action:'create'|'edit'|'delete'; row?:ManagedCategory}|null>(null);
    const [busy,setBusy] = useState(false);
    const [message,setMessage] = useState('');
    const pending = useRef(false);
    const rows = categories.filter(row=>row.type===type);
    function close() { if (!pending.current) {setDialog(null);setMessage('');} }
    async function submit(command: unknown) {
        if (pending.current) return;
        pending.current=true;setBusy(true);setMessage('');
        try {
            const response=await fetch('/api/settings/categories',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)});
            const result=await response.json();
            if (!response.ok) throw new Error(result.error || 'Não foi possível salvar.');
            setCategories(result.categories);setDialog(null);setMessage('Categorias atualizadas.');
        } catch(error) {setMessage(error instanceof Error?error.message:'Não foi possível salvar.');}
        finally {pending.current=false;setBusy(false);}
    }
    function move(index:number,offset:number) {
        const ids=rows.map(row=>row.id);
        const target=index+offset;
        if(target<0||target>=ids.length)return;
        [ids[index],ids[target]]=[ids[target],ids[index]];
        void submit({action:'reorder',type,ids});
    }
    return <div className={styles['category-settings']}>
        <div className={styles['category-settings__toolbar']}>
            <div role="group" aria-label="Tipo de categoria">
                <Button rounded type="button" theme={type==='EXPENSE'?'cta':'neutral'} isDisabled={busy} action={()=>setType('EXPENSE')}>Despesas</Button>
                <Button rounded type="button" theme={type==='INCOME'?'cta':'neutral'} isDisabled={busy} action={()=>setType('INCOME')}>Entradas</Button>
            </div>
            <Button rounded type="button" theme="cta" outline customClass={styles['category-settings__create']} isDisabled={busy} action={()=>{setMessage('');setDialog({action:'create'});}}>Nova categoria</Button>
        </div>
        <CategoryTable rows={rows} busy={busy} move={move} edit={row=>{setMessage('');setDialog({action:'edit',row});}} remove={row=>{setMessage('');setDialog({action:'delete',row});}} />
        <p role="status">{dialog?'':message}</p>
        {dialog && <Dialog isOpen toggleDialog={close} title={dialog.action==='delete'?'Excluir categoria':dialog.action==='edit'?'Editar categoria':'Nova categoria'}>
            {dialog.action==='delete'?<div className={styles['category-settings__delete']}><p>Excluir {dialog.row?.name}? Categorias em uso não podem ser excluídas.</p><div className={styles['category-settings__delete-actions']}><Button rounded type="button" theme="cancel" isDisabled={busy} action={()=>void submit({action:'delete',id:dialog.row?.id})}>Excluir</Button></div></div>:<CategoryForm row={dialog.row} busy={busy} save={category=>void submit(dialog.action==='create'?{action:'create',type,category}:{action:'edit',id:dialog.row?.id,category})}/>}
            <p role="status">{message}</p>

        </Dialog>}
    </div>;
}
