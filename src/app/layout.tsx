import type { Metadata } from 'next';
import '@erikacarvalho/react/tokens.css';
import './globals.css';

export const metadata: Metadata = {
    title: 'EC Finance',
    description: 'Gestão de finanças',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-BR">
            <body>{children}</body>
        </html>
    );
}
