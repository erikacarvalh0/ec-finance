export interface FixedExpenseMatch {
    userId: string;
    cardId: string;
    description: string;
}

export interface FixedExpenseRuleMatch {
    userId: string;
    cardId: string;
    merchantKey: string;
}

export function normalizeMerchant(description: string): string {
    return description
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

export function classifyFixedExpense(
    transaction: FixedExpenseMatch,
    rules: FixedExpenseRuleMatch[],
): boolean {
    const merchantKey = normalizeMerchant(transaction.description);

    if (!merchantKey) {
        return false;
    }

    return rules.some((rule) => (
        rule.userId === transaction.userId
        && rule.cardId === transaction.cardId
        && rule.merchantKey === merchantKey
    ));
}
