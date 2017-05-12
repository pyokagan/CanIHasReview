export = URL;

declare class URL {
    /**
     * @param url {String} A string representing an absolute or relative URL.
     * @param baseURL {Object|String} An object or string representing the base URL to use in case `url` is a relative URL.
     * @param parser {Boolean} Specifies how to parse the query string. Default to `false` so the query string is not parsed. If `true`, the query string is parsed using the embedded `querystringify` module.
     */
    constructor(url: string, baseURL?: string, parser?: boolean);

    static parse(url: string, parseQueryString?: boolean): URL;

    set(key: string, value: string): void;

    toString(): string;

    /**
     * The username and password portion of the URL.
     * This string subset follows the `protocol` and double slashes (if present) and precedes the `host` component,
     * delimited by an ASCII "at sign" (`@`).
     * The format of the string if `{username}[:{password}]`, with the `[:{password}]` portion being optional.
     * e.g. `user:pass`.
     */
    readonly auth: string;

    /**
     * `#` followed by the fragment identifier of the URL, if any.
     * Otherwise, an empty string.
     */
    readonly hash: string;

    /**
     * The full lower-cased host portion of the URL, including the `port` if specified.
     * e.g. `sub.host.com:8080`
     */
    readonly host: string;

    /**
     * The lower-cased host name portion of the `host` component *without* the `port` included.
     */
    readonly hostname: string;

    /**
     * The full URL string that was parsed with both the `protocol` and `host` components converted to lower-case.
     * e.g. `http://user:pass@some.host:8080/p/a/t/h?query=string#hash`
     */
    readonly href: string;

    /**
     * The path portion of the URL.
     * This is everything following the `host` (including the `port`) and before the start of the `query` or `hash` components,
     * delimited by either the ASCII question mark (`?`) or hash (`#`) characters.
     * No decoding is performed.
     * e.g. `/p/a/t/h`
     */
    readonly pathname: string;

    /**
     * The numeric port portion of the `host` component.
     */
    readonly port: string;

    /**
     * The URL's lower-cased protocol scheme.
     * e.g. `http:`
     */
    readonly protocol: string;

    /**
     * Either the query string without the leading ASCII question mark (`?`),
     * or an object returned by the `querystringify` module's `parse()` method.
     * e.g. `query=string` or `{'query': 'string'}`.
     *
     * If returned as a string, no decoding of the query string is performed.
     * If returned as an object, both keys and values are decoded.
     */
    readonly query: string | {[name: string]: undefined | string | string[]};

    /**
     * True if two ASCII forward-slash characters (`/`) are required following the colon in the `protocol`.
     */
    readonly slashes: boolean;

    /**
     * The username portion of the URL.
     */
    readonly username: string;

    /**
     * The password portion of the URL.
     */
    readonly password: string;

    /**
     * The origin of the represented URL, that is:
     *
     * - for URL using `http` or `https`, `{scheme}://{domain}:{port}` if the `port` is not the default port (`80` and `443` respectively).
     *   Otherwise, it is `{scheme}://{domain}`.
     * - for URL using `file` scheme, the value is browser dependant.
     * - for URL using the `blob` scheme, the origin of the URL following `blob:`. E.g.
     *   `blob: https://mozilla.org` will have `https://mozilla.org`.
     */
    readonly origin: string;
}
