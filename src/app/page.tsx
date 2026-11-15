import { redirect } from 'next/navigation';
import { Button, Card } from '@erikacarvalho/react';
import { auth, signOut } from '@/lib/auth';

const formatter = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const items=[['Supermercado','Alimentação',328.90],['Uber','Transporte',42.50],['Streaming','Assinaturas',44.90],['Loja online','Compras',199.90]] as const;
export const dynamic = 'force-dynamic';

export default async function Home() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    return <div className="layout"><aside><strong>ec finance.</strong><p>Visão geral</p><p>Transações</p><p>Faturas</p><p>Orçamentos</p></aside><main><small>DEMONSTRAÇÃO · DADOS FICTÍCIOS</small><h1>Visão geral</h1><p>Seu dinheiro, com clareza.</p><Button disabled>Conectar banco (em breve)</Button><div className="grid"><Card><p>Fatura atual</p><h2>{formatter.format(5840)}</h2></Card><Card><p>Gastos do mês</p><h2>{formatter.format(4380)}</h2></Card><Card><p>Próximas parcelas</p><h2>{formatter.format(2350)}</h2></Card></div><Card><h2>Transações recentes</h2><table><thead><tr><th>Estabelecimento</th><th>Categoria</th><th>Valor</th></tr></thead><tbody>{items.map(([name,category,amount])=><tr key={name}><td>{name}</td><td>{category}</td><td>{formatter.format(amount)}</td></tr>)}</tbody></table></Card><p>Nenhum banco está conectado. Os valores são exclusivamente ilustrativos.</p></main></div>}
