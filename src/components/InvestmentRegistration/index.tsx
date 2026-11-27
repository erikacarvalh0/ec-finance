'use client';
import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ecds-v1/compat';
import styles from './index.module.css';

export function InvestmentRegistration({ institutions }: { institutions: string[] }) {
    const router = useRouter();
    const pending = useRef(false);
    const [saving, setSaving] = useState(false);
    const [amount, setAmount] = useState('');
    const [errors, setErrors] = useState<Record<string,string>>({});
    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (pending.current) return;
        const form = event.currentTarget;
        const data = Object.fromEntries(new FormData(form));
        const cents = amount.replace(/\D/g, '').replace(/^0+/, '');
        const next: Record<string,string> = {};
        if (!cents) next.amount = 'Informe um valor maior que zero.';
        if (!data.type) next.type = 'Selecione o tipo.';
        if (!String(data.name ?? '').trim()) next.name = 'Informe a descrição.';
        if (!data.appliedAt) next.appliedAt = 'Informe a data de aplicação.';
        if (data.maturityAt && String(data.maturityAt) < String(data.appliedAt)) next.maturityAt = 'Vencimento anterior à aplicação.';
        setErrors(next);
        if (Object.keys(next).length) { form.querySelector<HTMLElement>('[name="' + Object.keys(next)[0] + '"]')?.focus(); return; }
        pending.current = true; setSaving(true);
        try {
            const payload = Object.fromEntries(Object.entries(data).filter(([key,value]) => key !== 'amount' && value !== ''));
            const response = await fetch('/api/investments', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...payload, amountInCents:cents}) });
            if (!response.ok) throw new Error('Não foi possível salvar o investimento.');
            form.reset(); setAmount(''); router.refresh();
        } catch (error) { setErrors({ form: error instanceof Error ? error.message : 'Falha ao salvar.' }); }
        finally { pending.current = false; setSaving(false); }
    }
    const fields = [
        ['name','Descrição','text',true], ['institution','Instituição','text',false], ['product','Ativo / produto','text',false],
        ['appliedAt','Data de aplicação','date',true], ['maturityAt','Vencimento','date',false], ['contractedRate','Taxa / rentabilidade','text',false],
    ] as const;
    function attrs(name:string, required:boolean) { return {name, required, 'aria-invalid':!!errors[name], 'aria-describedby': 'investment-error-'+name}; }
    function message(name:string) { return <small id={'investment-error-'+name}>{errors[name] ?? ''}</small>; }
    return <form className={styles.form} onSubmit={save} noValidate>
        <label className={styles.amount}><span>Valor <b aria-hidden="true">*</b></span><div className={styles.money}><span>R$</span><input {...attrs('amount',true)} aria-label="Valor" inputMode="numeric" placeholder="0,00" value={amount} onChange={e=>{const digits=e.target.value.replace(/\D/g,'').slice(0,15);setAmount(digits ? (Number(digits)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : '');}}/></div>{message('amount')}</label>
        <label className={styles.type}><span>Tipo <b aria-hidden="true">*</b></span><select {...attrs('type',true)} aria-label="Tipo" defaultValue=""><option value="" disabled>Selecione</option>{['Renda Fixa','Tesouro Direto','Renda Variável','Outros'].map(t=><option key={t}>{t}</option>)}</select>{message('type')}</label>
        {fields.map(([name,label,type,required])=><label key={name} className={name==='name'?styles.description:styles.field}><span>{label}{required&&<b aria-hidden="true"> *</b>}</span><input {...attrs(name,required)} aria-label={label} type={type} placeholder={type==='text'?' ':undefined} maxLength={120} list={name==='institution'?'investment-institutions':undefined}/>{message(name)}</label>)}
        <datalist id="investment-institutions">{institutions.map(name=><option key={name} value={name}/>)}</datalist>
        <p role="alert" className={styles.error}>{errors.form}</p><Button type="submit" disabled={saving}>{saving?'Salvando…':'Salvar'}</Button>
    </form>;
}
