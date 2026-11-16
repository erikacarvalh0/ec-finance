import { z } from 'zod';

const MAX_CENTS = BigInt('9223372036854775807');

const providerTransaction = z.object({
    externalId: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(255),
    amountInCents: z.string().regex(/^[1-9][0-9]*$/).max(19),
    occurredAt: z.iso.datetime({ offset: true }),
}).strict();

const providerBatch = z.object({
    cardExternalId: z.string().trim().min(1).max(200),
    transactions: z.array(providerTransaction).max(500),
}).strict();

export type ProviderCardBatch = z.input<typeof providerBatch>;
export type NormalizedCardTransaction = {
    externalId: string;
    description: string;
    amountInCents: bigint;
    occurredAt: Date;
};

export function normalizeCardImportBatch(input: ProviderCardBatch) {
    const parsed = providerBatch.parse(input);
    const unique = new Map<string, NormalizedCardTransaction>();
    const duplicateExternalIds: string[] = [];

    for (const item of parsed.transactions) {
        const amountInCents = BigInt(item.amountInCents);
        if (amountInCents > MAX_CENTS) {
            throw new Error('Provider transaction amount is out of range');
        }
        const occurredAt = new Date(item.occurredAt);
        const normalized = {
            externalId: item.externalId,
            description: item.description,
            amountInCents,
            occurredAt,
        };
        const existing = unique.get(item.externalId);
        if (existing) {
            if (existing.description !== normalized.description
                || existing.amountInCents !== normalized.amountInCents
                || existing.occurredAt.getTime() !== normalized.occurredAt.getTime()) {
                throw new Error('Conflicting provider transaction ID');
            }
            duplicateExternalIds.push(item.externalId);
        } else {
            unique.set(item.externalId, normalized);
        }
    }

    return {
        cardExternalId: parsed.cardExternalId,
        transactions: [...unique.values()],
        duplicateExternalIds,
    };
}
