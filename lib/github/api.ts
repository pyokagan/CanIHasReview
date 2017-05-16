import {
    adaptFetchBaseRequestInit,
    adaptFetchBaseUrl,
    Fetch,
} from './fetch';

export { Fetch } from './fetch';

/**
 * Base GitHub API endpoint.
 */
export const baseUrl = 'https://api.github.com/';

/**
 * Accept header sent to the GitHub API.
 */
export const acceptHeader = [
        'application/json',
    ].join(' ');

/**
 * Options to pass to {@link createApi}.
 */
interface CreateApiOptions {
    fetch: Fetch;
    userAgent: string;
    token?: string;
}

/**
 * Creates a {@link Fetch} that accesses the GitHub API.
 */
export function createApi(options: CreateApiOptions): Fetch {
    const headers: { [k: string]: string } = {
        Accept: acceptHeader,
        'User-Agent': options.userAgent,
    };
    if (options.token) {
        headers['Authorization'] = `token ${options.token}`;
    }

    let fetch = options.fetch;
    fetch = adaptFetchBaseUrl(fetch, baseUrl);
    fetch = adaptFetchBaseRequestInit(fetch, { headers });
    return fetch;
}
