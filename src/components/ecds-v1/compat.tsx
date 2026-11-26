import type { ComponentPropsWithoutRef } from 'react';
export { Input, Select } from './native-fields';
export { Button } from './button';
export function Card({padding = 'lg', className, ...props}: ComponentPropsWithoutRef<'article'> & {padding?: 'sm' | 'md' | 'lg'}) {
 return <article {...props} className={['finance-ds-card', 'finance-ds-card-'+padding, className].filter(Boolean).join(' ')} />;
}
