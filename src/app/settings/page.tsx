import { redirect } from 'next/navigation';
import { User, Target, Wallet, Info } from '@erikacarvalho/react/Icons';
import { SecuritySettings } from '@/components/SecuritySettings';
import { getSecuritySettings } from '@/modules/settings/security';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { SettingsLayout, SettingsGrid } from '@/components/SettingsLayout';
import { SettingsHeader } from '@/components/SettingsHeader';
import { ProfileSettings } from '@/components/ProfileSettings';
import { SettingsCard } from '@/components/SettingsCard';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/sign-in');

    const security = await getSecuritySettings(prisma, session.user.id);

    return (
        <SettingsLayout>
            <SettingsHeader />
            <SettingsGrid>
                <SettingsCard id="profile-title" title="Perfil" description="Atualize suas informações pessoais." icon={<User />}>
                    <ProfileSettings name={session.user.name ?? null} email={session.user.email ?? null} />
                </SettingsCard>
                <SettingsCard id="preferences-title" title="Preferências" description="Personalize a experiência do Finanças." icon={<Target />}>
                    <p>As preferências de moeda, tema e notificações estarão disponíveis em uma próxima atualização.</p>
                </SettingsCard>
                <SettingsCard id="categories-title" title="Categorias" description="Gerencie as categorias de receitas e despesas." icon={<Wallet />}>
                    <p>O gerenciamento de categorias será disponibilizado em uma próxima atualização.</p>
                </SettingsCard>
                <SettingsCard id="security-title" title="Segurança" description="Gerencie o acesso à sua conta." icon={<Info />}>
                    <SecuritySettings googleConnected={security.googleConnected} />
                </SettingsCard>
            </SettingsGrid>
        </SettingsLayout>
    );
}
