# Read-only forecast scenario simulator

The forecast page provides an interactive scenario simulator. It starts with the same owner-scoped, reconciled monthly forecast used elsewhere in the application, and lets users change projected income and expense totals independently by integer percentages from -100% to +1000%.

The simulator recalculates adjusted income, expenses, monthly net balance and cumulative deviation from the baseline using integer cents. Half-cent results round to the nearest cent. Simulation controls are purely client-side: no writes, no change to recorded settlements, and no scheduled tasks or reminders.

These are uniform percentage adjustments to each month's totals, not edits to specific transactions or new bank balances. The baseline already incorporates settled and canceled occurrences, so simulation is for exploration rather than an authoritative budget or prediction.
