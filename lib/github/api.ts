import {
    adaptFetchBaseRequestInit,
    adaptFetchBaseUrl,
    Fetch,
} from './fetch';

export { Fetch } from './fetch';

/**
 * Base GitHub API endpoint.
 */
export const BASE_URL = 'https://api.github.com/';

interface GhApiOptions {
    fetch: Fetch;
    userAgent: string;
    token?: string;
}

export function makeGhApi(options: GhApiOptions): Fetch {
    const headers: { [k: string]: string } = { 'User-Agent': options.userAgent };
    if (options.token) {
        headers['Authorization'] = `token ${options.token}`;
    }

    let fetch = options.fetch;
    fetch = adaptFetchBaseUrl(fetch, BASE_URL);
    fetch = adaptFetchBaseRequestInit(fetch, { headers });
    return fetch;
}
