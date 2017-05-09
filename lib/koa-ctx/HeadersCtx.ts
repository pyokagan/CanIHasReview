/**
 * Context object with request headers info.
 */
export interface HeadersCtx {
    /**
     * Key-value pairs of header names and values. Header names are lower-cased.
     *
     * Duplicates in raw headers are handled in the following ways:
     *
     * - Duplicates of `age`, `authorization`, `content-length`, `content-type`, `etag`, `expires`, `from`, `host`,
     *   `if-modified-since`, `if-unmodified-since`, `last-modified`, `location`, `max-forwards`, `proxy-authorization`,
     *   `referer`, `retry-after`, or `user-agent` are discarded.
     * - `set-cookie` is always an array. Duplicates are added to the array.
     * - For all other headers, the values are joined together with `,`.
     */
    headers: { [key: string]: undefined | string | string[] };
}

/**
 * Returns true if `ctx` implements {@link HeadersCtx}, false otherwise.
 */
export function isHeadersCtx(ctx: any): ctx is HeadersCtx {
    return typeof ctx === 'object' &&
        typeof ctx.headers === 'object';
}
