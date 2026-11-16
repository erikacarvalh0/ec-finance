import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { expect, test as base } from '@playwright/test';

// Keep fixture writes on the same disposable database as playwright.config.ts.
const databaseUrl = 'postgresql://postgres:postgres@127.0.0.1:5432/ec_finance_test?schema=public';

const test = base.extend<{
    invoice: { cardId: string; expenseId: string; transactionId: string };
}>({
    invoice: async ({ context }, use) => {
        const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
        const userId = randomUUID();
        const sessionToken = randomUUID();

        try {
            await prisma.user.create({ data: { id: userId } });
            await prisma.session.create({
                data: {
                    userId,
                    sessionToken,
                    expires: new Date(Date.now() + 3600000),
                },
            });
            await context.addCookies([{
                name: 'authjs.session-token',
                value: sessionToken,
                url: 'http://127.0.0.1:3100',
                httpOnly: true,
                sameSite: 'Lax',
            }]);
            const connection = await prisma.bankConnection.create({
                data: { userId, provider: 'MANUAL', externalItemId: userId },
            });
            const card = await prisma.creditCard.create({
                data: {
                    userId,
                    connectionId: connection.id,
                    externalAccountId: userId,
                    name: 'E2E reconciliation card',
                    closingDay: 10,
                    dueDay: 20,
                    creditLimitInCents: BigInt(20000),
                },
            });
            const transaction = await prisma.transaction.create({
                data: {
                    userId, cardId: card.id,
                    providerTransactionId: 'purchase',
                    description: 'Imported purchase on closing day',
                    amountInCents: BigInt(10000),
                    occurredAt: new Date('2020-01-10T12:00:00Z'),
                },
            });
            await prisma.transaction.createMany({
                data: [
                    {
                        userId, cardId: card.id,
                        providerTransactionId: 'refund',
                        description: 'Imported refund',
                        amountInCents: BigInt(-2000),
                        occurredAt: new Date('2020-01-10T13:00:00Z'),
                    },
                    {
                        userId, cardId: card.id,
                        providerTransactionId: 'next-cycle',
                        description: 'Purchase after closing day',
                        amountInCents: BigInt(3000),
                        occurredAt: new Date('2020-01-11T12:00:00Z'),
                    },
                ],
            });
            const expense = await prisma.expense.create({
                data: {
                    userId, cardId: card.id,
                    description: 'Manual copy of imported purchase',
                    amountInCents: BigInt(10000),
                    paymentMethod: 'CREDIT',
                    type: 'VARIABLE',
                    date: new Date('2020-01-10T00:00:00Z'),
                },
            });
            await use({ cardId: card.id, expenseId: expense.id, transactionId: transaction.id });
        } finally {
            // These relations restrict card deletion; remove only this test's records.
            await prisma.invoicePayment.deleteMany({ where: { userId } });
            await prisma.expense.deleteMany({ where: { userId } });
            await prisma.user.deleteMany({ where: { id: userId } });
            await prisma.$disconnect();
        }
    },
});

test('reconciles an imported invoice and restores the limit after partial and full payments', async ({ page, invoice }) => {
    test.setTimeout(60000);
    const invoiceUrl = `/cards/${invoice.cardId}/invoices/2020-01`;
    const balance = (amount: string) => page.getByText(`Saldo devedor: R$ ${amount}`, { exact: true });

    // A future cycle stays open; historical cycles are closed regardless of the run date.
    await page.goto(`/cards/${invoice.cardId}/invoices/2099-01`);
    await expect(page.getByText('Status: Aberta', { exact: true })).toBeVisible();
    await page.goto(invoiceUrl);
    await expect(page.getByText('Status: Fechada', { exact: true })).toBeVisible();
    await expect(balance('180,00')).toBeVisible();

    // Explicit reconciliation, rather than description/amount heuristics, removes the duplicate.
    const link = await page.request.patch(`/api/expenses/${invoice.expenseId}/card-link`, {
        data: { transactionId: invoice.transactionId },
    });
    expect(link.status()).toBe(200);
    await page.reload();
    await expect(balance('80,00')).toBeVisible();
    await expect(page.getByText('Compras e parcelas: R$ 100,00', { exact: true })).toBeVisible();
    await expect(page.getByText('Créditos e estornos importados: R$ 20,00', { exact: true })).toBeVisible();
    await expect(page.getByText('Imported purchase on closing day', { exact: true })).toBeVisible();
    await expect(page.getByText('Manual copy of imported purchase', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Purchase after closing day', { exact: true })).toHaveCount(0);

    await page.goto(`/cards/${invoice.cardId}/invoices/2020-02`);
    await expect(balance('30,00')).toBeVisible();
    await expect(page.getByText('Purchase after closing day', { exact: true })).toBeVisible();

    await page.goto('/cards');
    await expect(page.getByText('Uso estimado: R$ 110.00', { exact: true })).toBeVisible();
    await expect(page.getByText('Disponível estimado: R$ 90.00', { exact: true })).toBeVisible();
    await page.goto(invoiceUrl);

    for (const [amount, status, remaining, paid] of [
        ['30,00', 'Parcialmente paga', '50,00', '30,00'],
        ['50,00', 'Quitada', '0,00', '80,00'],
    ]) {
        await page.getByLabel('Valor pago (R$)').fill(amount);
        await page.getByLabel('Data do pagamento').fill('2020-01-20');
        const response = page.waitForResponse(response =>
            response.url().endsWith('/2020-01/payments') && response.request().method() === 'POST',
        );
        await page.getByRole('button', { name: 'Registrar pagamento' }).click();
        expect((await response).status()).toBe(201);
        await expect(page.getByText(`Status: ${status}`, { exact: true })).toBeVisible();
        await expect(balance(remaining)).toBeVisible();
        await expect(page.getByText(`Total pago: R$ ${paid}`, { exact: true })).toBeVisible();
        if (status === 'Parcialmente paga') {
            const excess = await page.request.post(`/api/cards/${invoice.cardId}/invoices/2020-01/payments`, {
                data: {
                    amountInCents: '5001',
                    paidAt: '2020-01-20',
                    idempotencyKey: randomUUID(),
                },
            });
            expect(excess.status()).toBe(409);
            await page.goto('/cards');
            await expect(page.getByText('Uso estimado: R$ 80.00', { exact: true })).toBeVisible();
            await expect(page.getByText('Disponível estimado: R$ 120.00', { exact: true })).toBeVisible();
            await page.goto(invoiceUrl);
        }
    }
    await expect(page.getByRole('button', { name: 'Registrar pagamento' })).toHaveCount(0);
    await page.reload();
    await expect(page.getByText('Status: Quitada', { exact: true })).toBeVisible();
    await expect(page.locator('.valuation-history li')).toHaveCount(2);

    await page.goto('/cards');
    await expect(page.getByText('Uso estimado: R$ 30.00', { exact: true })).toBeVisible();
    await expect(page.getByText('Disponível estimado: R$ 170.00', { exact: true })).toBeVisible();
});
