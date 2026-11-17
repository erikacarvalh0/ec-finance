export function reportCardWhere(userId: string, cardId: string) {
    if (!userId.trim() || !cardId.trim()) throw new Error('Invalid report card');
    return { userId, cardId };
}
