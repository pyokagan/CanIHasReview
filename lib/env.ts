/**
 * @module
 * (Node-only) Utilities for environment variables.
 */

/**
 * Extracts environment variable from process.env.
 * @throws {Error} Environment variable not defined and defaultValue not provided.
 */
export function extractEnvVar(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (typeof value === 'string') {
        return value;
    } else if (typeof defaultValue !== 'undefined') {
        return defaultValue;
    } else {
        throw new Error(`$${key} not defined`);
    }
}
