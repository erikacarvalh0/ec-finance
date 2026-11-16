# Investment deposits and withdrawals

An investment has two distinct historical records:

1. **Valuations:** snapshots of the investment's total value on a selected date.
2. **Cash flows:** cash deposited into or withdrawn from the investment.

The user can record deposits and withdrawals at any time, independently of their latest valuation snapshot. Neither action transfers funds or updates bank accounts.

## Estimated change in value

The application reports the change in value between the **first and latest valuation snapshots**, adjusted for deposits and withdrawals dated inside that interval:

`Estimated gain = latest valuation - first valuation - deposits + withdrawals`.

This is an *absolute-money* estimate, not a time-weighted or money-weighted percentage return. Transactions before the first snapshot or after the latest snapshot do not enter the estimate. Deposits and withdrawals are shown in a separate history regardless of whether they fall inside the valuation interval.

Cash flows dated on the same day as a snapshot can be ambiguous if the valuation timing is unknown; users should use consistent end-of-day snapshots. For a reliable percentage return or benchmark comparison, future work must support accurate cash-flow timing and the relevant return methodology.

## Security and persistence

All writes use the authenticated server user ID and verify that the investment belongs to that user. The `InvestmentCashflow` table uses a composite investment/user foreign key and PostgreSQL check constraint requiring positive values. The SQL migration is versioned and must be deployed with `prisma migrate deploy` after backup.

## Limitations

No automatic bank transfers, tax calculations, income recognition, fees, benchmark comparison or synchronization are included.
