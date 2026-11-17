export function reportCategoryWhere(userId: string, categoryId?: string) {
    if (!userId.trim()) {
        throw new Error('Authenticated user is required');
    }
    if (categoryId === undefined) {
        return { userId };
    }
    if (!categoryId.trim()) {
        throw new Error('Invalid report category');
    }
    return { userId, categoryId: categoryId === 'uncategorized' ? null : categoryId };
}
