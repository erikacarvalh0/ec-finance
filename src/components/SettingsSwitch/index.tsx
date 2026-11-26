import styles from './index.module.css';

export function SettingsSwitch({ label, checked, disabled, onChange }: {
    label: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <button type="button" role="switch" aria-checked={checked} disabled={disabled}
            className={styles.row} onClick={() => onChange(!checked)}>
            <span>{label}</span>
            <span className={styles.track} aria-hidden="true"><span className={styles.thumb} /></span>
        </button>
    );
}
