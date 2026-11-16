# Record editing, recurrence end dates and overdue payments

## Editing finance records

Users can edit expense and income details through the existing expense and income pages. Every PATCH request resolves the current user on the server and restricts the record lookup and update to that owner. Amounts are stored as integer cents and dates are validated.

If a record has already been reconciled as paid or received, editing its original values or schedule is blocked with HTTP 409, to prevent rewriting financial history. Users can still edit the individual reconciled amount through the forecast page.

## Ending recurring items

Fixed monthly expenses and recurring income support an optional end date. A separate end-recurrence action updates **only the end date**, and remains available even if earlier occurrences have already been reconciled. Historical payments are preserved.

An end date is inclusive by calendar month. Future months after the selected end month are omitted from the forecast. Other kinds of expenses and income cannot be ended as recurring entries.

## Overdue payments

A scheduled expense becomes overdue only if it is pending and its scheduled calendar date precedes today's UTC calendar date. Settled and canceled occurrences are never marked overdue. The forecast page highlights overdue expenses. The dashboard displays an overdue count and total for the previous six calendar months plus the current month; this is a bounded lookback, not an all-time debt balance.

Overdue indicators are based on user-entered reconciliation status, not banking confirmation. They do not automatically change payments to settled.

## Operational boundaries

Source record editing with pending or canceled individual occurrences can change future projections. Before editing a series, users should review any previously canceled months that may no longer be part of the revised schedule.

Apply the reviewed migration with `prisma migrate deploy`. No bank synchronization, credit card invoice reconciliation or external payment verification is included.
