/**
 * Simple query string parser.
 *
 * @param query The query string that needs to be parsed.
 */
export declare function parse(query: string): {[key: string]: string};

/**
 * Transforms a given object into a query string.
 *
 * @param obj Object that should be transformed.
 * @param prefix Optional prefix. (Default is an empty string)
 */
export declare function stringify(obj: object, prefix?: string): string;
