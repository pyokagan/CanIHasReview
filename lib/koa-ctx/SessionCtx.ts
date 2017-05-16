/**
 * Context object with `session` info.
 * (Added by `koa-session` middleware)
 */
export interface SessionCtx {
    session: { [key: string]: any } | null;
}

/**
 * Returns true if `ctx` implements {@link SessionCtx}, false otherwise.
 */
export function isSessionCtx(ctx: any): ctx is SessionCtx {
    return typeof ctx === 'object' &&
        typeof ctx.session === 'object';
}
