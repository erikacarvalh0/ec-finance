'use client';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Button as EcdsButton } from '@erikacarvalho/react/Button';
type Props = ComponentPropsWithoutRef<'button'> & {size?: 'sm' | 'md' | 'lg'; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; outline?: boolean; icon?: ReactNode; iconPosition?: 'start' | 'end'};
export function Button({type='button',disabled,children,onClick,className,size='md',variant='primary',outline=variant==='secondary',icon,iconPosition='start','aria-label':ariaLabel,title,...rest}: Props) {
    const classes = ['finance-ds-button', 'finance-ds-button-'+size, 'finance-ds-button-'+variant, className].filter(Boolean).join(' ');
    // Keep native semantics for attributes not supported by ECDS yet.
    if(Object.keys(rest).length) return <button {...rest} type={type} disabled={disabled} onClick={onClick} className={classes} aria-label={ariaLabel} title={title}>{iconPosition==='start'&&icon}{children}{iconPosition==='end'&&icon}</button>;
    return <EcdsButton rounded outline={outline} icon={icon} iconPosition={iconPosition} ariaLabel={ariaLabel} title={title} type={type} isDisabled={disabled} action={onClick ?? (()=>{})} customClass={classes} theme={variant==='danger'?'cancel':variant==='primary'?'cta':'neutral'}>{children}</EcdsButton>;
}
