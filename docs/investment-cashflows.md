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

## Percentage return

The investment page shows a **simple holding-period percentage return** only when two different valuation dates are available, the starting balance is positive and there are **no recorded deposits or withdrawals within the valuation interval**. The formula is `(last valuation - first valuation) / first valuation * 100`, rounded to two decimal places with ties away from zero for both gains and losses.

When external cash flows occur within that interval, the app intentionally shows **Unavailable**, because dividing the cashflow-adjusted absolute gain by the opening balance is not a defensible TWR or money-weighted rate. A future TWR/MWR implementation requires adequate dated valuations and/or a defined cash-flow convention. Percentage figures are not annualized, do not account for fees, taxes or inflation, and are not benchmark comparisons. Same-day cashflow/valuation ordering remains ambiguous, so boundary-dated cash flows suppress the simple return.
