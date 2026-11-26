import { Info } from '@erikacarvalho/react/Icons';
import styles from './index.module.css';

export function SecuritySettings({ googleConnected }: { googleConnected: boolean }) {
    return (
        <div className={styles.root}>
            <div className={styles.account}>
                <span>Conta Google</span>
                <span className={styles.status}>{googleConnected ? 'Conectada' : 'Não identificada'}</span>
            </div>
            <div className={styles.notice}>
                <span aria-hidden="true"><Info /></span>
                <div>
                    <h3>{googleConnected ? 'Sua senha é gerenciada pelo Google' : 'Método de acesso não identificado'}</h3>
                    <p>{googleConnected
                        ? 'O EC Finance não armazena sua senha do Google. Para alterá-la, revisar dispositivos ou configurar a verificação em duas etapas, acesse as configurações de segurança da sua conta Google.'
                        : 'Não encontramos uma conta Google vinculada a este perfil. A alteração de senha local não está disponível. Entre em contato com o suporte se precisar de ajuda com o acesso.'}</p>
                </div>
            </div>
            {googleConnected && (
                <div className={styles.actions}>
                    <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer">
                        Gerenciar segurança no Google <span className={styles.external}>(abre em nova aba)</span>
                    </a>
                </div>
            )}
        </div>
    );
}
