export async function checkReadiness(probe: () => Promise<unknown>) {
    try {
        await probe();
        return { status: 200, ready: true };
    } catch {
        return { status: 503, ready: false };
    }
}
