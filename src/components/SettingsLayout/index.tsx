import type { ReactNode } from 'react';
import { Page } from '../Page';
import styles from './index.module.css';

export function SettingsLayout({ children }: { children: ReactNode }) {
    return <Page mainClassName={styles.main}>{children}</Page>;
}

export function SettingsGrid({ children }: { children: ReactNode }) {
    return <div className={styles.grid}>{children}</div>;
}
