import styles from './index.module.css';

export function SettingsHeader() {
    return (
        <header className={styles.header}>
            <h1>Configurações</h1>
            <p>Gerencie seus dados, preferências e a personalização do sistema.</p>
        </header>
    );
}
