export type AppRole = 'worker' | 'hidden' | 'integrations';
export interface RuntimeConfig {
    role: AppRole;
    port: number;
}
export function runtimeConfig(env: NodeJS.ProcessEnv): RuntimeConfig {
    const role = env.APP_ROLE || 'worker';
    if (!['worker', 'hidden', 'integrations'].includes(role))
        throw new Error('APP_ROLE must be worker, hidden or integrations');
    const port = Number(env.PORT || (role === 'worker' ? 4000 : role === 'hidden' ? 4001 : 4100));
    if (!Number.isInteger(port) || port < 1 || port > 65535)
        throw new Error('PORT must be an integer between 1 and 65535');
    return { role: role as AppRole, port };
}
