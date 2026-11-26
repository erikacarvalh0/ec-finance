import type { ComponentPropsWithoutRef } from 'react';

// Preserve native form semantics until ECDS controlled-field contracts are equivalent.
export function Input(props: ComponentPropsWithoutRef<'input'>) {
    return <input {...props} />;
}
export function Select(props: ComponentPropsWithoutRef<'select'>) {
    return <select {...props} />;
}
export function Button({type = 'button', ...props}: ComponentPropsWithoutRef<'button'>) {
    return <button type={type} {...props} />;
}
