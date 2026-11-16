# Financial goals

Financial goals are user-owned manual targets with a name, positive target in integer cents, reserved amount in integer cents, and an optional UTC deadline. Progress is calculated using exact bigint arithmetic and capped at 100%. The first version supports creating and viewing goals; editing, deleting, contributions, and automated account synchronization are future work.

Endpoints: authenticated `GET /api/goals` and `POST /api/goals`. Amounts are serialized as decimal strings to avoid JSON bigint precision loss. The page is at `/goals`.

Reserved amounts are user-provided snapshots, not verified bank balances. The interface currently accepts integer cent amounts to avoid ambiguous locale-specific currency parsing.
