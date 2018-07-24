import {
    adaptFetchBaseRequestInit,
    adaptFetchBaseUrl,
    Fetch,
} from '@lib/fetch';
import jwt from 'jsonwebtoken';

/**
 * Base GitHub API endpoint.
 */
export const baseUrl = 'https://api.github.com/';

/**
 * Accept header sent to the GitHub API.
 */
export const acceptHeader = [
        'application/json',
        'application/vnd.github.machine-man-preview+json',
    ].join(' ');

/**
 * Options to pass to {@link createApi}.
 */
interface CreateApiOptions {
    fetch: Fetch;
    userAgent: string;
    authorization?: string;
}

/**
 * Creates a {@link Fetch} that accesses the GitHub API.
 */
export function createApi(options: CreateApiOptions): Fetch {
    const headers: { [k: string]: string } = {
        Accept: acceptHeader,
        'User-Agent': options.userAgent,
    };
    if (options.authorization) {
        headers['Authorization'] = options.authorization;
    }

    let fetch = options.fetch;
    fetch = adaptFetchBaseUrl(fetch, baseUrl);
    fetch = adaptFetchBaseRequestInit(fetch, { headers });
    return fetch;
}

interface CreateAppApiOptions {
    fetch: Fetch;
    userAgent: string;

    /**
     * PEM-encoded RSA private key.
     */
    privateKey: string;

    /**
     * Application ID.
     */
    appId: number;

    /**
     * Lifetime of the authorization token, in seconds. (10 minute maximum)
     */
    expiresIn: number;
}

/**
 * Creates a {@link Fetch} that authorizes as a GitHub App.
 */
export function createAppApi(options: CreateAppApiOptions): Fetch {
    const payload = {
        iss: options.appId,
    };
    const token = jwt.sign(payload, options.privateKey, {
        algorithm: 'RS256',
        expiresIn: options.expiresIn,
    });
    return createApi({
        authorization: `Bearer ${token}`,
        fetch: options.fetch,
        userAgent: options.userAgent,
    });
}

interface CreateAccessTokenApiOptions {
    fetch: Fetch;
    userAgent: string;
    token: string;
}

/**
 * Creates a {@link Fetch} that authorizes as a GitHub user or installation using an access token.
 */
export function createAccessTokenApi(options: CreateAccessTokenApiOptions): Fetch {
    return createApi({
        authorization: `token ${options.token}`,
        fetch: options.fetch,
        userAgent: options.userAgent,
    });
}
