import { redirect } from 'next/navigation';
import { Button, Card } from '@/components/ecds-v1/compat';
import { auth, signIn } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function SignInPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string | string[] }>;
}) {
    const session = await auth();

    if (session?.user?.id) {
        redirect('/');
    }

    const { error } = await searchParams;
    const errorMessage = error === 'OAuthAccountNotLinked'
        ? 'Please sign in with the same account you used originally.'
        : error ? 'Unable to sign in. Please try again.' : null;

    return (
        <main className="auth-page">
            <Card className="auth-card" padding="lg">
                <p className="eyebrow">WELCOME TO EC FINANCE</p>
                <h1>Access your account</h1>
                <p>
                    Sign in securely to manage your finances.
                    Your bank accounts are not connected yet.
                </p>

                {errorMessage && <p role="alert">{errorMessage}</p>}

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
