import { describe, expect, it } from 'vitest';
import { resolveExpenseHistoryView } from './history-visibility';

describe('resolveExpenseHistoryView', () => {
    it.each([
        [2, 3, false, true, false],
        [2, 0, false, true, false],
        [0, 3, false, true, true],
        [0, 0, false, false, false],
        [2, 3, true, true, true],
        [2, 0, true, true, false],
    ] as const)('resolves active=%s archived=%s requested=%s', (active, archived, requested, visible, archiveView) => {
        expect(resolveExpenseHistoryView(active, archived, requested)).toEqual({
            visible,
            archived: archiveView,
        });
    });
});
