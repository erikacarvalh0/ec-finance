import { z } from 'zod';

export const profileNameSchema = z.string().trim().min(2, 'Informe pelo menos 2 caracteres.').max(100, 'Informe até 100 caracteres.');

export const profileUpdateSchema = z.object({ name: profileNameSchema }).strict();

export function validateProfileName(value: string): string | undefined {
    const result = profileNameSchema.safeParse(value);
    return result.success ? undefined : result.error.issues[0]?.message;
}
