const HttpMethod_obj = {
    CONNECT: 0,
    DELETE: 0,
    GET: 0,
    HEAD: 0,
    OPTIONS: 0,
    POST: 0,
    PUT: 0,
};
export type HttpMethod = keyof typeof HttpMethod_obj;
export const HttpMethod = Object.keys(HttpMethod_obj) as HttpMethod[];

/**
 * Returns true if `x` is a HttpMethod.
 */
export function isHttpMethod(x: any): x is HttpMethod {
    return typeof x === 'string' &&
        HttpMethod.indexOf(x as HttpMethod) >= 0;
}
