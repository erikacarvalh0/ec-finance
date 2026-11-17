import { describe, expect, it } from 'vitest';
import { validateProductionEnv } from './production-env';

describe('production configuration', () => {
    it('reports missing keys without exposing values', () => {
        expect(() => validateProductionEnv({ DATABASE_URL: 'secret' })).toThrow('AUTH_SECRET');
    });
    it('accepts required configuration', () => {
        expect(() => validateProductionEnv({
            DATABASE_URL: 'postgresql://db.example/finance',
            AUTH_SECRET: 'x'.repeat(32),
            AUTH_GOOGLE_ID: 'client', AUTH_GOOGLE_SECRET: 'secret',
        })).not.toThrow();
    });
});
