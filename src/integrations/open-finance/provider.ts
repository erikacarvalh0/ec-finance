// Provider-agnostic API contract. No real bank integration in scaffold.
export interface BankTransaction { id: string; description: string; amountInCents: bigint; occurredAt: Date }
export interface OpenFinanceProvider { listTransactions(connectionId: string): Promise<BankTransaction[]> }
