/**
 * @module
 * (Node-only) Utilities for environment variables.
 */

/**
 * Extracts environment variable from process.env.
 * @throws {Error} Environment variable not defined and defaultValue not provided.
 */
export function extractEnvVar(key: string, defaultValue?: string): string {
    if (process.env[key]) {
        return process.env[key];
    } else if (typeof defaultValue !== 'undefined') {
        return defaultValue;
    } else {
        throw new Error(`$${key} not defined`);
    }
}
