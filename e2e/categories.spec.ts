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
        const trigger = page.getByRole('button', { name: 'Nova entrada' });
        await trigger.click();
        const dialog = page.getByRole('dialog', { name: 'Nova entrada' });
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole('textbox', { name: 'Descrição' })).toBeFocused();
        await dialog.getByRole('button', { name: 'Salvar entrada' }).click();
        await expect(dialog.getByText('Informe uma descrição.')).toBeVisible();
        await expect(dialog.getByRole('textbox', { name: 'Descrição' })).toBeFocused();
        await dialog.getByRole('button', { name: 'Salvar entrada' }).focus();
        await page.keyboard.press('Tab');
        await expect(dialog.getByRole('button', { name: 'Fechar' })).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
        await expect(trigger).toBeFocused();
        await trigger.click();
        await dialog.getByRole('textbox', { name: 'Descrição' }).fill('Teste descarte');
        page.once('dialog', confirmation => confirmation.dismiss());
        await page.keyboard.press('Escape');
        await expect(dialog).toBeVisible();
        page.once('dialog', confirmation => confirmation.accept());
        await dialog.getByRole('button', { name: 'Cancelar' }).click();
        await expect(dialog).not.toBeVisible();
        await expect(trigger).toBeFocused();
        await trigger.click();
        await expect(page.locator('select[name="categoryId"] option', { hasText: 'E2E Income' })).toHaveCount(1);
        const created = await page.request.post('/api/incomes', { data: { type: 'SALARY', amountInCents: '10000', categoryId: incomeCategory.id } });
        expect(created.status()).toBe(201);
        const rejected = await page.request.post('/api/incomes', { data: { type: 'SALARY', amountInCents: '10000', categoryId: expenseCategory.id } });
        expect(rejected.status()).toBe(404);
        await page.reload();
        await expect(page.getByRole('cell', { name: 'E2E Income', exact: true }).first()).toBeVisible();
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
