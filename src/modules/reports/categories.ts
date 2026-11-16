interface CategorySpending {
    categoryId: string;
    name: string;
    spentInCents: bigint;
}

export function summarizeCategorySpending(rows: CategorySpending[]) {
    const categories = rows
        .filter((row) => row.spentInCents > BigInt(0))
        .sort((a, b) => a.spentInCents === b.spentInCents
            ? a.name.localeCompare(b.name)
            : a.spentInCents > b.spentInCents ? -1 : 1);
    const totalInCents = categories.reduce(
        (sum, row) => sum + row.spentInCents, BigInt(0),
    );
    return {
        totalInCents,
        categories: categories.map((row) => ({
            ...row,
            percentage: Number(
                (row.spentInCents * BigInt(100) + totalInCents / BigInt(2))
                / totalInCents,
            ),
        })),
    };
}
