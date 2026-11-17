import { validateProductionEnv } from '../src/lib/production-env.ts';

try {
    validateProductionEnv(process.env);
    console.log('Production configuration validated');
} catch (error) {
    console.error(error instanceof Error ? error.message : 'Configuration invalid');
    process.exitCode = 1;
}
