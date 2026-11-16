# Copy category budgets from the previous month

The budget page supports copying category limits from the preceding calendar month to the currently selected month, including across year boundaries. It only copies a limit for a category if no budget is already configured for the target month. Existing target budgets always win, and repeated requests do not create duplicate limits.

The server derives the authenticated user ID from the session, searches only that user's previous-month limits, and uses a PostgreSQL `createMany({ skipDuplicates: true })` with the existing unique `userId/categoryId/period` constraint. No migration is required.

This copies budget **limits**, not actual spending, balances or transactions. It does not automatically schedule repeated budgets; users opt in by clicking the button. There are no recurring tasks or automatic actions.
