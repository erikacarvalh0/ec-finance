import type { Metadata } from 'next';
import './globals.css';
import '@erikacarvalho/react/styles.css';
export const metadata: Metadata = { title: 'EC Finance', description: 'Gestão de finanças' };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="pt-BR"><body>{children}</body></html>; }
