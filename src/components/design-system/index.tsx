import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';
// Temporary adapter layer for erikacarvalho-ds; NOT an upstream package import.
export function DSButton({children,...props}:ButtonHTMLAttributes<HTMLButtonElement>){return <button style={{border:0,borderRadius:8,padding:'12px 16px',background:'#7656d6',color:'white'}} {...props}>{children}</button>}
export function DSCard({children,...props}:HTMLAttributes<HTMLElement>){return <section style={{background:'white',borderRadius:14,border:'1px solid #eceaf3',padding:24}} {...props}>{children}</section>}
