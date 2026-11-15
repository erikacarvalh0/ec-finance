import { redirect } from 'next/navigation';
import { Button, Card } from '@erikacarvalho/react';
import { auth, signIn } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function SignInPage() {
    const session = await auth();

    if (session?.user?.id) {
        redirect('/');
    }

    return (
        <main className="auth-page">
            <Card className="auth-card" padding="lg">
                <p className="eyebrow">WELCOME TO EC FINANCE</p>
                <h1>Access your account</h1>
                <p>
                    Sign in securely to manage your finances.
                    Your bank accounts are not connected yet.
                </p>

                <form
                    action={async () => {
                        'use server';

                        await signIn('google', {
                            redirectTo: '/',
                        });
                    }}
                >
                    <Button type="submit">
                        Continue with Google
                    </Button>
                </form>
            </Card>
        </main>
    );
}
