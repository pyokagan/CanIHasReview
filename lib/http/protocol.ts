const HttpProtocol_obj = {
    http: 0,
    https: 0,
};
export type HttpProtocol = keyof typeof HttpProtocol_obj;
export const HttpProtocol = Object.keys(HttpProtocol_obj) as HttpProtocol[];

/**
 * Returns true if `x` is a HttpProtocol.
 */
export function isHttpProtocol(x: any): x is HttpProtocol {
    return typeof x === 'string' &&
        HttpProtocol.indexOf(x as HttpProtocol) >= 0;
}
