import { MountCtx, RedirectCtx, SessionCtx, UrlCtx } from '../../../lib/koa-ctx';
import { homeRoute } from '../../routes';
import { logoutRoute } from '../routes';

export interface Ctx extends
    UrlCtx,
    RedirectCtx,
    Partial<SessionCtx>,
    Partial<MountCtx> {}

type Middleware = (ctx: Ctx, next?: () => Promise<void>) => Promise<void>;

export function createMiddleware(): Middleware {
    return async (ctx, next) => {
        if (!ctx.session) {
            throw new TypeError('ctx.session not provided');
        }

        if (!logoutRoute.match(ctx, 'GET')) {
            if (next) {
                await next();
            }
            return;
        }

        ctx.session = null;

        ctx.redirect(homeRoute.toPath({}, ctx.mountPath || '/'));
    };
}
