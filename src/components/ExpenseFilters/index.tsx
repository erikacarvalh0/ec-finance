import { Button, Input, Select } from '@/components/ecds-v1/compat';
import styles from './index.module.css';

export function ExpenseFilters({
    archived,
    search,
    type,
    paymentMethod,
    month,
    categoryId,
    categories = [],
    status,
}: {
    archived: boolean;
    search: string;
    type?: string;
    paymentMethod?: string;
    month?: string;
    categoryId?: string;
    categories?: Array<{ id: string; name: string }>;
    status?: string;
}) {
    return (
        <form action="/expenses" className={styles['expense-filters']}>
            {archived && <input type="hidden" name="view" value="archived" />}
            <label>Mês
                <Input name="month" type="month" defaultValue={month ?? ''} />
            </label>
            <label>Categoria
                <Select name="categoryId" defaultValue={categoryId ?? ''}>
                    <option value="">Todas</option>
                    {categories.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                </Select>
            </label>
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
            <label>Status
                <Select name="status" defaultValue={status ?? ''}>
                    <option value="">Todos</option>
                    <option value="PENDING">Pendente</option>
                    <option value="SETTLED">Paga</option>
                    <option value="CANCELED">Cancelada</option>
                </Select>
            </label>
            <Button type="submit">Aplicar filtros</Button>
        </form>
    );
}
