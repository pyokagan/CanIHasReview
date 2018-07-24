/**
 * @module
 * https://developer.github.com/v3/apps/
 */
import {
    checkResponseOk,
} from './check';
import {
    JsonValidationError,
} from './errors';
import {
    Fetch,
} from './fetch';

export interface Installation {
    id: number;
}

export function isInstallation(value: any): value is Installation {
    if (value === null || typeof value !== 'object') {
        return false;
    }

    const obj: Partial<Installation> = value;
    return typeof obj.id === 'number';
}

export interface InstallationAccessToken {
    token: string;
}

export function isInstallationAccessToken(value: any): value is InstallationAccessToken {
    if (value === null || typeof value !== 'object') {
        return false;
    }

    const obj: Partial<InstallationAccessToken> = value;
    return typeof obj.token === 'string';
}

export async function getRepoInstallation(fetch: Fetch, owner: string, repo: string): Promise<Installation> {
    const q = encodeURIComponent;
    const resp = await fetch(`repos/${q(owner)}/${q(repo)}/installation`);
    await checkResponseOk(resp);
    const json = await resp.json();
    if (!isInstallation(json)) {
        throw new JsonValidationError(json);
    }
    return json;
}

export async function createInstallationAccessToken(fetch: Fetch,
        installationId: number | string): Promise<InstallationAccessToken> {
    const q = encodeURIComponent;
    const resp = await fetch(`installations/${q(String(installationId))}/access_tokens`, {
        method: 'POST',
    });
    await checkResponseOk(resp);
    const json = await resp.json();
    if (!isInstallationAccessToken(json)) {
        throw new JsonValidationError(json);
    }
    return json;
}
