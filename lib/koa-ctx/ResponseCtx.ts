/**
 * Context object with response fields.
 * (Part of `Koa.Context`)
 */
export interface ResponseCtx {
    /**
     * Status code.
     */
    status: number;

    /**
     * Response body.
     */
    body: any;

    /**
     * Response mime type.
     */
    type: string;
}

/**
 * Returns true if `ctx` implements {@link ResponseCtx}, false otherwise.
 */
export function isResponseCtx(ctx: any): ctx is Response {
    return typeof ctx === 'object' &&
        typeof ctx.status === 'number' &&
        typeof ctx.type === 'string';
}
