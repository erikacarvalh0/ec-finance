import { redirect } from 'next/navigation';
import { User, Target, Wallet, Info } from '@erikacarvalho/react/Icons';
import { PreferencesSettings } from '@/components/PreferencesSettings';
import { getPreferences } from '@/modules/settings/preferences';
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

    const preferences = await getPreferences(prisma, session.user.id);

    return (
        <SettingsLayout>
            <SettingsHeader />
            <SettingsGrid>
                <SettingsCard id="profile-title" title="Perfil" description="Atualize suas informações pessoais." icon={<User />}>
                    <ProfileSettings name={session.user.name ?? null} email={session.user.email ?? null} />
                </SettingsCard>
                <SettingsCard id="preferences-title" title="Preferências" description="Personalize a experiência do Finanças." icon={<Target />}>
                    <PreferencesSettings initialPreferences={preferences} />
                </SettingsCard>
                <SettingsCard id="categories-title" title="Categorias" description="Gerencie as categorias de receitas e despesas." icon={<Wallet />}>
                    <p>O gerenciamento de categorias será disponibilizado em uma próxima atualização.</p>
                </SettingsCard>
                <SettingsCard id="security-title" title="Segurança" description="Gerencie o acesso à sua conta." icon={<Info />}>
                    <p>O acesso ao EC Finance utiliza sua conta Google.</p>
                    <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer">Gerenciar conta Google</a>
                </SettingsCard>
            </SettingsGrid>
        </SettingsLayout>
    );
}
