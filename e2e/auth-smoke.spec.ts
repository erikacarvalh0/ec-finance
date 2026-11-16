import { expect, test } from '@playwright/test';

test.describe('anonymous authentication boundary', () => {
    test('shows the sign-in page without exposing financial records', async ({ page }) => {
        await page.goto('/sign-in');
        await expect(page.getByRole('heading', { name: 'Access your account' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
        await expect(page.getByText('Your bank accounts are not connected yet.')).toBeVisible();
    });

    test('redirects unauthenticated users away from private expenses', async ({ page }) => {
        await page.goto('/expenses');
        await expect(page).toHaveURL(/\/sign-in(?:\?|$)/);
        await expect(page.getByRole('heading', { name: 'Access your account' })).toBeVisible();
    });

    test('redirects unauthenticated users away from the dashboard', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveURL(/\/sign-in(?:\?|$)/);
        await expect(page.getByRole('heading', { name: 'Access your account' })).toBeVisible();
    });
});
