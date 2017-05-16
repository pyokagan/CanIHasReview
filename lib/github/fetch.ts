/**
 * @module
 * Interface definitions and helper functions for the Fetch API.
 */
import parseUrl from 'url-parse';

/**
 * Represents a headers list.
 */
export interface Headers {
    get(name: string): string | null;
    has(name: string): boolean;
    /**
     * Returns an iterator allowing to go through all key/value pairs contained in this object.
     */
    entries(): IterableIterator<[string, string]>;
}

/**
 * Represents the result of a fetch.
 */
export interface Response {
    readonly headers: Headers;
    readonly status: number;
    json(): Promise<any>;
}

/**
 * Describes how to initialize a Request.
 */
export interface RequestInit {
    /**
     * The request method, e.g. `GET`, `POST`, ...
     */
    method?: string;

    /**
     * Headers to be added to the request.
     */
    headers?: { [key: string]: string };

    /**
     * A body to be added to the request.
     * Note that a request using the `GET` or `HEAD` method cannot have a body.
     */
    body?: string;
}

/**
 * Merges two {@link RequestInit} together.
 *
 * @param dst Destination object which will be merged (mutated) with the contents of `src`.
 * @param src Source object whose contents will be used to modify `dst`.
 */
export function mergeRequestInit(dst: RequestInit, src: Readonly<RequestInit>): void {
    if (src.method) {
        dst.method = src.method;
    }

    if (src.headers) {
        dst.headers = Object.assign(dst.headers || {}, src.headers);
    }

    if (src.body) {
        dst.body = src.body;
    }
}

/**
 * Deep copies a {@link RequestInit} object.
 */
export function copyRequestInit(src: Readonly<RequestInit>): RequestInit {
    const dst: RequestInit = {};
    mergeRequestInit(dst, src);
    return dst;
}

/**
 * The fetch function.
 */
export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Adapt a {@link Fetch} to use a specific base URL.
 */
export function adaptFetchBaseUrl(fetch: Fetch, baseUrl: string): Fetch {
    return async (url: string, init?: RequestInit): Promise<Response> => {
        return (await fetch(parseUrl(url, baseUrl).toString(), init));
    };
}

/**
 * Adapt a {@link Fetch} to use a base {@link RequestInit} object.
 */
export function adaptFetchBaseRequestInit(fetch: Fetch, baseInit: Readonly<RequestInit>): Fetch {
    return async (url: string, init?: RequestInit): Promise<Response> => {
        const myInit = copyRequestInit(baseInit);
        if (init) {
            mergeRequestInit(myInit, init);
        }
        return (await fetch(url, myInit));
    };
}
