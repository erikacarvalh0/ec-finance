export function canJoinBeta(allowlist: string | undefined, email: unknown, verified: unknown) {
    if (allowlist === undefined) return true;
    if (typeof email !== 'string' || verified !== true) return false;
    const allowed = allowlist.split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
    return allowed.includes(email.trim().toLowerCase());
}
