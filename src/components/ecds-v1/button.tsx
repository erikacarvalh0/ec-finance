'use client';
import type { ComponentPropsWithoutRef } from 'react';
import { Button as EcdsButton } from '@erikacarvalho/react/Button';
type Props = ComponentPropsWithoutRef<'button'> & {size?: 'sm' | 'md' | 'lg'; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'};
export function Button({type='button',disabled,children,onClick,className,size='md',variant='primary',...rest}: Props) {
 const classes = ['finance-ds-button', 'finance-ds-button-'+size, 'finance-ds-button-'+variant, className].filter(Boolean).join(' ');
 // Native fallback preserves attributes not exposed by the upstream component.
 if(Object.keys(rest).length) return <button {...rest} type={type} disabled={disabled} onClick={onClick} className={classes}>{children}</button>;
 return <EcdsButton type={type} isDisabled={disabled} action={onClick ?? (()=>{})} customClass={classes} theme={variant==='danger'?'cancel':variant==='primary'?'cta':'neutral'}>{children}</EcdsButton>;
}
