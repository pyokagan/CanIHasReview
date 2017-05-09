/**
 * Context object with `mountPath` info.
 * (added by `koa-mount` middleware)
 */
export interface MountCtx {
    mountPath: string;
}

/**
 * Returns true if `ctx` implements {@link MountCtx}, false otherwise.
 */
export function isMountCtx(ctx: any): ctx is MountCtx {
    return typeof ctx === 'object' &&
        typeof ctx.mountPath === 'string';
}
