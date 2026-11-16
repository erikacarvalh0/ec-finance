import { z } from 'zod';
import { previousBudgetPeriod } from './carryover';
import { getCategoryBudgetReport, type BudgetDatabase } from './service';

const schema = z.object({
    categoryId: z.string().trim().min(1),
    period: z.string(),
    capInCents: z.string().regex(/^[1-9][0-9]*$/).max(18),
});

export async function applyBudgetRollover(
    database: BudgetDatabase,
    userId: string,
    input: z.input<typeof schema>,
) {
    if (!userId.trim()) throw new Error('Authenticated user is required');
    const parsed = schema.parse(input);
    const sourcePeriod = previousBudgetPeriod(parsed.period);
    const where = { userId, categoryId: parsed.categoryId, period: parsed.period };
    const target = await database.categoryBudget.findFirst({ where, select: { id: true } });
    if (!target) throw new Error('Budget not found');

    const report = await getCategoryBudgetReport(database, userId, sourcePeriod);
    const source = report.categories.find(row => row.categoryId === parsed.categoryId);
    const remaining = source?.remainingInCents ?? BigInt(0);
    const cap = BigInt(parsed.capInCents);
    const rolloverInCents = remaining < BigInt(0) ? BigInt(0) : remaining > cap ? cap : remaining;
    // A conditional write makes the first application win, including a zero balance.
    const result = await database.categoryBudget.updateMany({
        where: { ...where, rolloverAppliedAt: null },
        data: { rolloverInCents, rolloverCapInCents: cap, rolloverAppliedAt: new Date() },
    });
    return { applied: result.count === 1, sourcePeriod, targetPeriod: parsed.period };
}
