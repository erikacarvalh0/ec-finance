import { MonthSelector } from '../MonthSelector';
import styles from './index.module.css';
export function DashboardHeader({name,month}: {name:string;month:string}) {
 return <header className={styles.header}><div><h1>Visão geral</h1><p>Olá, {name}.</p><p>Acompanhe suas finanças.</p></div><MonthSelector month={month}/></header>;
}
