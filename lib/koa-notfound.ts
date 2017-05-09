import createError from 'http-errors';

type Middleware = (ctx: {}) => Promise<void>;

/**
 * Returns a middleware which always throws an 404 exception.
 */
export function createMiddleware(): Middleware {
    return async ctx => {
        throw createError(404);
    };
}

export default createMiddleware;
