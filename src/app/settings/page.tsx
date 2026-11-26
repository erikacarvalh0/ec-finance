import { redirect } from 'next/navigation';
import { User, Target, Wallet, Info } from '@erikacarvalho/react/Icons';
import { CategorySettings } from '@/components/CategorySettings';
import { listManagedCategories } from '@/modules/categories/management';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { SettingsLayout, SettingsGrid } from '@/components/SettingsLayout';
import { SettingsHeader } from '@/components/SettingsHeader';
import { SettingsCard } from '@/components/SettingsCard';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/sign-in');

    const categories = await listManagedCategories(prisma, session.user.id);

    return (
        <SettingsLayout>
            <SettingsHeader />
            <SettingsGrid>
                <SettingsCard id="profile-title" title="Perfil" description="Atualize suas informações pessoais." icon={<User />}>
                    <dl>
                        <dt>Nome</dt>
                        <dd>{session.user.name || 'Não informado'}</dd>
                        <dt>E-mail</dt>
                        <dd>{session.user.email || 'Não informado'}</dd>
                    </dl>
                    <p>A edição do perfil ainda não está disponível.</p>
                </SettingsCard>
                <SettingsCard id="preferences-title" title="Preferências" description="Personalize a experiência do Finanças." icon={<Target />}>
                    <p>As preferências de moeda, tema e notificações estarão disponíveis em uma próxima atualização.</p>
                </SettingsCard>
                <SettingsCard id="categories-title" title="Categorias" description="Gerencie as categorias de receitas e despesas." icon={<Wallet />}>
                    <CategorySettings initialCategories={categories} />
                </SettingsCard>
                <SettingsCard id="security-title" title="Segurança" description="Gerencie o acesso à sua conta." icon={<Info />}>
                    <p>O acesso ao EC Finance utiliza sua conta Google.</p>
                    <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer">Gerenciar conta Google</a>
                </SettingsCard>
            </SettingsGrid>
        </SettingsLayout>
    );
}
