import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { expect, test } from '@playwright/test';

test('income actions confirm archive and restore without deleting records', async ({ page, context }) => {
    const db = new PrismaClient({ datasourceUrl: 'postgresql://postgres:postgres@127.0.0.1:5432/ec_finance_test?schema=public' });
    const userId = randomUUID();
    const sessionToken = randomUUID();
    try {
        await db.user.create({ data: { id: userId, name: 'Income actions' } });
        await db.session.create({ data: { userId, sessionToken, expires: new Date(Date.now() + 3600000) } });
        await context.addCookies([{ name: 'authjs.session-token', value: sessionToken, url: 'http://127.0.0.1:3100', httpOnly: true, sameSite: 'Lax' }]);
        const income = await db.income.create({ data: { userId, type: 'OTHER', amountInCents: BigInt(250000), description: 'Projeto teste', date: new Date('2026-11-01T00:00:00Z') } });
        await page.goto('/incomes');
        const row = page.getByRole('row').filter({ hasText: 'Projeto teste' });
        await row.getByRole('button', { name: 'Editar Projeto teste' }).click();
        await expect(page.getByRole('dialog', { name: 'Editar entrada' })).toBeVisible();
        await page.keyboard.press('Escape');
        await row.getByRole('button', { name: 'Arquivar Projeto teste' }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
        await expect(row).toBeVisible();
        await row.getByRole('button', { name: 'Arquivar Projeto teste' }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
        await expect(row).toHaveCount(0);
        await page.getByRole('link', { name: 'Ver entradas arquivadas' }).click();
        await row.getByRole('button', { name: 'Restaurar Projeto teste' }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
        await expect(row).toHaveCount(0);
        expect((await db.income.findUniqueOrThrow({ where: { id: income.id } })).archivedAt).toBeNull();
    } finally {
        await db.income.deleteMany({ where: { userId } });
        await db.user.deleteMany({ where: { id: userId } });
        await db.$disconnect();
    }
});
