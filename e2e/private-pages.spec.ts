import { expect, test } from '@playwright/test';

for (const path of ['/settings', '/budgets', '/cards', '/forecast', '/goals', '/incomes', '/investments', '/reports']) {
    test(`protects anonymous access to ${path}`, async ({ page }) => {
        await page.goto(path);
        await expect(page).toHaveURL(/\/sign-in(?:\?|$)/);
    });
}
