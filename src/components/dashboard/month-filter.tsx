import { Button, Input } from '@/components/ecds-v1/compat';

export function MonthFilter({ month }: { month: string }) {
    return (
        <form method="get" action="/" aria-label="Filtrar período">
            <label htmlFor="dashboard-month">Mês</label>
            <Input id="dashboard-month" name="month" type="month" defaultValue={month} required />
            <Button type="submit">Filtrar</Button>
        </form>
    );
}
