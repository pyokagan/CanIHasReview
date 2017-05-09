import * as qs from 'querystringify';
import url from 'url';

/**
 * Context object with information on the request method and url.
 */
export interface UrlCtx {
    /**
     * Request method.
     */
    method: string;

    /**
     * Request Url.
     */
    url: string;

    /**
     * Returns the protocol string `http` or `https` when requested with TLS.
     * When the proxy setting is enabled the `X-Forwarded-Proto` header field will be trusted.
     */
    readonly protocol: string;

    /**
     * Origin of url. `${protocol}://${host}`
     */
    readonly origin: string;

    /**
     * Full request url, including the protocol and host.
     */
    readonly href: string;

    /**
     * Request pathname, including the leading /
     */
    path: string;

    /**
     * Parsed query string.
     * @see #querystring
     */
    query: { [key: string]: undefined | string | string[] };

    /**
     * Query string.
     * An empty string if there is no query string.
     * @see #search
     */
    querystring: string;

    /**
     * Search string.
     * Same as the querystring except it includes the leading ?
     * An empty string if there is no query string.
     * @see #querystring
     */
    readonly search: string;

    /**
     * `Host` (no proxy) or `X-Forwarded-Host` (proxy) header field.
     * An empty string if the host could not be determined.
     * @see #hostname
     */
    readonly host: string;

    /**
     * "Host" (no proxy) or "X-Forwarded-Host" (proxy) header field.
     * Strips off the `:port` if it was provided.
     * An empty string if the host could not be determined.
     * @see #host
     */
    readonly hostname: string;
}

/**
 * Returns true if `ctx` implements {@link UrlCtx}, false otherwise.
 */
export function isUrlCtx(ctx: any): ctx is UrlCtx {
    return typeof ctx === 'object' &&
        typeof ctx.method === 'string' &&
        typeof ctx.url === 'string' &&
        typeof ctx.protocol === 'string' &&
        typeof ctx.origin === 'string' &&
        typeof ctx.href === 'string' &&
        typeof ctx.path === 'string' &&
        typeof ctx.query === 'object' &&
        typeof ctx.querystring === 'string' &&
        typeof ctx.search === 'string' &&
        typeof ctx.host === 'string' &&
        typeof ctx.hostname === 'string';
}

/**
 * Create a stub {@link UrlCtx} object.
 *
 * @param method Request method
 * @param href Request href. The rest of the request url properties (`path`, `host`, etc.) will be derived from it.
 * @param _url Request url (default: derived from `href`'s path)
 */
export function createUrlCtx(method: string, href: string, _url?: string): UrlCtx {
    const comp = url.parse(href);
    if (!comp.path || !comp.protocol || !comp.host || !comp.pathname || !comp.hostname) {
        throw new Error(`invalid href ${href}`);
    }
    return {
        host: comp.host,
        hostname: comp.hostname,
        href,
        method,
        origin: `${comp.protocol}://${comp.host}`,
        path: comp.pathname,
        protocol: comp.protocol.replace(/:$/, ''),
        query: qs.parse(comp.query),
        querystring: comp.query || '',
        search: typeof comp.query === 'string' ? `?${comp.query}` : '',
        url: _url || comp.path,
    };
}
