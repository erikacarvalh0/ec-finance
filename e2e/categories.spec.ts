import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { expect, test } from '@playwright/test';

test('category changes reach financial forms and dashboard', async ({ page, context }, testInfo) => {
    test.setTimeout(90000);
    const db = new PrismaClient({ datasourceUrl: 'postgresql://postgres:postgres@127.0.0.1:5432/ec_finance_test?schema=public' });
    const userId = randomUUID();
    const sessionToken = randomUUID();
    try {
        await db.user.create({ data: { id: userId, name: 'E2E Categories' } });
        await db.session.create({ data: { userId, sessionToken, expires: new Date(Date.now() + 3600000) } });
        await context.addCookies([{ name: 'authjs.session-token', value: sessionToken, url: 'http://127.0.0.1:3100', httpOnly: true, sameSite: 'Lax' }]);
        const response = await page.request.post('/api/settings/categories', { data: {
            action: 'create', type: 'INCOME', category: { name: 'E2E Income', color: '#16C6A2', iconBackground: '#D4F7EE', icon: 'wallet' },
        } });
        expect(response.ok()).toBeTruthy();
        const incomeCategory = await db.category.findFirstOrThrow({ where: { userId, name: 'E2E Income' } });
        const expenseCategory = await db.category.findFirstOrThrow({ where: { userId, type: 'EXPENSE', name: 'Moradia' } });
        await page.goto('/incomes');
        await expect(page.locator('select[name="categoryId"] option', { hasText: 'E2E Income' })).toHaveCount(1);
        const created = await page.request.post('/api/incomes', { data: { type: 'SALARY', amountInCents: '10000', categoryId: incomeCategory.id } });
        expect(created.status()).toBe(201);
        const rejected = await page.request.post('/api/incomes', { data: { type: 'SALARY', amountInCents: '10000', categoryId: expenseCategory.id } });
        expect(rejected.status()).toBe(404);
        await page.reload();
        await expect(page.locator('.record-list small').filter({ hasText: 'E2E Income' }).first()).toBeVisible();
        await db.expense.create({ data: { userId, description: 'E2E Housing', amountInCents: BigInt(10000), type: 'VARIABLE', paymentMethod: 'PIX', categoryId: expenseCategory.id, date: new Date('2020-01-10T00:00:00Z') } });
        await page.goto('/?month=2020-01');
        await expect(page.getByText(/Moradia: R\$/).first()).toBeVisible();
        await page.goto('/settings');
        await expect(page.getByRole('heading', { name: 'Categorias', exact: true })).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        for (const width of [1440, 390]) {
            await page.setViewportSize({ width, height: 900 });
            const main = page.locator('main');
            await expect(main).toBeVisible();
            await testInfo.attach(`settings-${width}`, { body: await main.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
        }
    } finally {
        await db.income.deleteMany({ where: { userId } });
        await db.expense.deleteMany({ where: { userId } });
        await db.user.deleteMany({ where: { id: userId } });
        await db.$disconnect();
    }
});
