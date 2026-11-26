export function resolveExpenseHistoryView(activeCount: number, archivedCount: number, requestedArchived: boolean) {
    return {
        visible: activeCount + archivedCount > 0,
        archived: archivedCount > 0 && (requestedArchived || activeCount === 0),
    };
}
