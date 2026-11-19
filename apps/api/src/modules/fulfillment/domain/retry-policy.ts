export const MAX_ATTEMPTS = 5;
export function retryDelay(attempt: number, random = Math.random) {
    const base = [1000, 2000, 8000, 15000][attempt - 1];
    if (!base) throw new Error('Retry budget exhausted');
    return Math.round(base * (1 + random() * 0.2));
}
