# Finance tracking modules

EC Finance provides account-scoped records and separate pages for expenses, income, and investments.

## Expenses

Use `/expenses` to add an expense with a description, amount, payment method (PIX, credit, debit, automatic debit or other), fixed/variable type, optional date and 1–120 installments (default 1).

Amounts are persisted as integer cents. The installment count is currently **metadata only**: it does not create projected payment schedules or separate invoice entries. Expenses without a date are counted in the month of registration for the dashboard.

## Income

Use `/incomes` to record salary, recurring or other income. Recurring income additionally requires a responsible party, description and date. The income type describes the entry; automatic creation of next month's income is not implemented.

## Investments

Use `/investments` to create a named investment (for example, “Caixinha”). Each time the user updates its value, an immutable valuation snapshot is saved with its date. A chronological line graph and dated list show the balances and the change between consecutive records. A valuation can increase, decrease or remain unchanged. These snapshots represent **total portfolio value**, not money deposited or withdrawn.

## Fixed credit-card expenses

On the dashboard, existing credit-card transactions can be marked as fixed. The application creates a normalized merchant rule scoped to the authenticated user **and the specific card**. Future manually entered card transactions in the transactions API are automatically classified as fixed when their normalized merchant matches a saved rule.

The classification helper is also ready for a future Open Finance ingestion adapter, but bank synchronization is not yet active. Normalization is conservative and based on the complete merchant description; different textual variants can require an additional manual classification. The application does not automatically flag recurring payments merely because two descriptions look alike.

The dashboard shows only fixed charges actually recorded in the selected month, not speculative future charges. Card installments are not inferred to be recurring fixed expenses based solely on a purchase with several installments.

## Security

All endpoints resolve the current user server-side and scope queries by `userId`. Investment snapshots have a composite foreign key associating the investment and its owner. Fixed rules refer to cards using the same owner/card composite relationship. Cross-tenant data is not shared.

## Deployment and testing

Apply migrations with `npm run db:deploy` after backup and review. CI validates the migration against disposable PostgreSQL 16, runs unit and interaction tests, verifies TypeScript and builds the Next.js app. Live Google OAuth and bank integrations remain separately provisioned.
