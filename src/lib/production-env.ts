export function validateProductionEnv(env: Record<string, string | undefined>) {
    const required = ['DATABASE_URL', 'AUTH_SECRET', 'AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET'];
    const missing = required.filter(key => !env[key]?.trim());
    if (missing.length) throw new Error('Missing production configuration: ' + missing.join(', '));
    if ((env.AUTH_SECRET ?? '').length < 32) throw new Error('AUTH_SECRET must contain at least 32 characters');
    if (!/^postgres(?:ql)?:\/\//.test(env.DATABASE_URL ?? '')) {
        throw new Error('DATABASE_URL must be a PostgreSQL connection URL');
    }
}
