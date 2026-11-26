import { Button, Input, Select } from '@/components/ecds-v1/compat';
import styles from './index.module.css';

export function ExpenseFilters({
    archived,
    search,
    type,
    paymentMethod,
}: {
    archived: boolean;
    search: string;
    type?: string;
    paymentMethod?: string;
}) {
    return (
        <form action="/expenses" className={styles.filters}>
            {archived && <input type="hidden" name="view" value="archived" />}
            <label>Pesquisar descrição
                <Input name="search" type="search" maxLength={100} defaultValue={search} />
            </label>
            <label>Tipo
                <Select name="type" defaultValue={type ?? ''}>
                    <option value="">Todos</option>
                    <option value="FIXED">Fixa</option>
                    <option value="VARIABLE">Variável</option>
                </Select>
            </label>
            <label>Forma de pagamento
                <Select name="paymentMethod" defaultValue={paymentMethod ?? ''}>
                    <option value="">Todas</option>
                    <option value="PIX">Pix</option>
                    <option value="CREDIT">Crédito</option>
                    <option value="DEBIT">Débito</option>
                    <option value="AUTOMATIC_DEBIT">Débito automático</option>
                    <option value="OTHER">Outros</option>
                </Select>
            </label>
            <Button type="submit">Aplicar filtros</Button>
        </form>
    );
}
