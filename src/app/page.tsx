import { redirect } from 'next/navigation';
import { Button, Card } from '@erikacarvalho/react';
import { auth, signOut } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

const demoTransactions = [
    {
        description: 'Supermercado',
        category: 'Alimentação',
        amount: 328.9,
    },
    {
        description: 'Uber',
        category: 'Transporte',
        amount: 42.5,
    },
    {
        description: 'Streaming',
        category: 'Assinaturas',
        amount: 44.9,
    },
    {
        description: 'Loja online',
        category: 'Compras',
        amount: 199.9,
    },
];

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    return (
        <div className="layout">
            <aside>
                <strong>ec finance.</strong>
                <p>Visão geral</p>
                <p>Transações</p>
                <p>Faturas</p>
                <p>Orçamentos</p>
                <form
                    action={async () => {
                        'use server';

                        await signOut({
                            redirectTo: '/sign-in',
                        });
                    }}
                >
                    <Button type="submit" variant="ghost">
                        Sign out
                    </Button>
                </form>
            </aside>

            <main>
                <small>DEMONSTRAÇÃO · DADOS FICTÍCIOS</small>
                <h1>Visão geral</h1>
                <p>Seu dinheiro, com clareza.</p>
                <p>Signed in as {session.user.email ?? 'GitHub user'}</p>

                <Button disabled>
                    Conectar banco (em breve)
                </Button>

                <div className="grid">
                    <Card>
                        <p>Fatura atual</p>
                        <h2>{currencyFormatter.format(5840)}</h2>
                    </Card>
                    <Card>
                        <p>Gastos do mês</p>
                        <h2>{currencyFormatter.format(4380)}</h2>
                    </Card>
                    <Card>
                        <p>Próximas parcelas</p>
                        <h2>{currencyFormatter.format(2350)}</h2>
                    </Card>
                </div>

                <Card>
                    <h2>Transações recentes</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Estabelecimento</th>
                                <th>Categoria</th>
                                <th>Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {demoTransactions.map((transaction) => (
                                <tr key={transaction.description}>
                                    <td>{transaction.description}</td>
                                    <td>{transaction.category}</td>
                                    <td>
                                        {currencyFormatter.format(transaction.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>

                <p>
                    Nenhum banco está conectado.
                    Os valores são exclusivamente ilustrativos.
                </p>
            </main>
        </div>
    );
}
