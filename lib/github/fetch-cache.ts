import has from 'lodash/has';
import {
    Fetch,
    Headers,
    RequestInit,
    Response,
} from './fetch';

class CachedHeaders implements Headers {
    private headers: Map<string, string>;

    constructor(headers: Headers) {
        this.headers = new Map<string, string>();
        // ugly workaround for node-fetch 1.6.0
        if (typeof (headers as any).raw === 'function') {
            const raw: {[key: string]: string[]} = (headers as any).raw();
            for (const prop in raw) {
                if (!has(raw, prop)) {
                    continue;
                }
                this.headers.set(prop, raw[prop].join(','));
            }
        } else {
            for (const [key, value] of headers.entries()) {
                this.headers.set(key, value);
            }
        }
    }

    get(key: string): string | null {
        const val = this.headers.get(key);
        return typeof val === 'undefined' ? null : val;
    }

    has(key: string): boolean {
        return this.headers.has(key);
    }

    entries(): IterableIterator<[string, string]> {
        return this.headers.entries();
    }
}

class CachedResponse implements Response {
    status: number;
    headers: CachedHeaders;
    private _json: Promise<any>;

    constructor(response: Response) {
        this.headers = new CachedHeaders(response.headers);
        this.status = response.status;
        this._json = response.json();
    }

    json(): Promise<any> {
        return this._json;
    }
}

function isCacheable(url: string, init?: RequestInit): boolean {
    if (init && init.method !== 'GET') {
        return false;
    }
    if (init && typeof init.body !== 'undefined') {
        return false;
    }
    return true;
}

function getCacheKey(url: string, init?: RequestInit): string {
    const out: string[] = [];
    out.push(JSON.stringify(url));

    if (init && init.headers) {
        const headerKeys = Object.keys(init.headers);
        headerKeys.sort();
        for (const key of headerKeys) {
            out.push(JSON.stringify([key, init.headers[key]]));
        }
    }

    return out.join('\n');
}

/**
 * Adapt a {@link Fetch} to use a cache with unbounded size.
 * Only successful responses (i.e. status code 200 - 299) to GET will be cached.
 */
export function adaptFetchCache(fetch: Fetch): Fetch {
    const cache = new Map<string, CachedResponse>();

    return async (url: string, init?: RequestInit): Promise<Response> => {
        if (!isCacheable(url, init)) {
            return (await fetch(url, init));
        }

        const cacheKey = getCacheKey(url, init);
        const cacheValue = cache.get(cacheKey);
        if (cacheValue) {
            return cacheValue; // cache hit
        }

        const resp = await fetch(url, init);
        if (resp.status < 200 || resp.status >= 300) {
            return resp; // unsuccessful response -- don't cache
        }

        const cachedResp = new CachedResponse(resp);
        cache.set(cacheKey, cachedResp);
        return cachedResp;
    };
}
