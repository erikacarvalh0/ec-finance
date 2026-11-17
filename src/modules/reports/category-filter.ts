type CategorizedEntry = { categoryId: string | null };

/**
 * Pure category selection for report rows. The special uncategorized
 * value matches entries without an assigned category.
 */
export function filterReportEntriesByCategory<T extends CategorizedEntry>(
    entries: T[],
    categoryId?: string,
): T[] {
    if (categoryId === undefined) {
        return entries;
    }
    if (!categoryId.trim()) {
        throw new Error('Invalid report category');
    }
    return entries.filter(entry => categoryId === 'uncategorized'
        ? entry.categoryId === null
        : entry.categoryId === categoryId);
}
