import { Button } from '@erikacarvalho/react/Button';
import type { ManagedCategory } from '@/modules/categories/management';
import styles from './index.module.css';

const symbols:Record<string,string>={'shopping-cart':'🛒',house:'⌂','car-front':'🚗',heart:'♥',ellipsis:'…',wallet:'▣',briefcase:'▰','trending-up':'↗','arrow-left-right':'↔'};
export function CategoryTable({rows,busy,move,edit,remove}:{rows:ManagedCategory[];busy:boolean;move:(index:number,offset:number)=>void;edit:(row:ManagedCategory)=>void;remove:(row:ManagedCategory)=>void}) {
    return <div className={styles.scroll}><table className={styles.table}>
        <thead><tr><th scope="col">Ordem</th><th scope="col">Categoria</th><th scope="col">Cor</th><th scope="col">Ações</th></tr></thead>
        <tbody>{rows.map((row,index)=><tr key={row.id}>
            <td><div className={styles.actions}><Button type="button" theme="neutral" isDisabled={busy||index===0} action={()=>move(index,-1)}>↑ <span className={styles.sr}>Subir {row.name}</span></Button><Button type="button" theme="neutral" isDisabled={busy||index===rows.length-1} action={()=>move(index,1)}>↓ <span className={styles.sr}>Descer {row.name}</span></Button></div></td>
            <td><span className={styles.symbol} style={{backgroundColor:row.iconBackground,color:row.color}} aria-hidden="true">{symbols[row.icon]??'…'}</span> {row.name}</td>
            <td><span className={styles.dot} style={{backgroundColor:row.color}} aria-hidden="true"/> <span className={styles.sr}>{row.color}</span></td>
            <td><div className={styles.actions}><Button type="button" theme="neutral" isDisabled={busy} action={()=>edit(row)}>Editar <span className={styles.sr}>{row.name}</span></Button><Button type="button" theme="cancel" isDisabled={busy} action={()=>remove(row)}>Excluir <span className={styles.sr}>{row.name}</span></Button></div></td>
        </tr>)}</tbody>
    </table>{rows.length===0&&<p>Nenhuma categoria cadastrada.</p>}</div>;
}
