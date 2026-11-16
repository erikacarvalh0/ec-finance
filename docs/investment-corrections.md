# Investment valuation corrections

Users can correct the monetary amount and calendar date of an investment valuation snapshot, or delete an erroneous snapshot from the investment history. The chart is rebuilt from remaining snapshots after the page refreshes.

Each mutation requires a verified server session and checks investment ownership and that the snapshot belongs to the selected investment and user. Amounts are stored as integer cents, and malformed dates and values are rejected.

Deletion is permanent and requires an explicit browser confirmation. These corrections do not move money, create aportes or resgates, or change any banking positions. A future audit-log phase can retain prior values for compliance-sensitive use cases.
