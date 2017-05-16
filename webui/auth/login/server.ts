import simpleOauth2 from 'simple-oauth2';
import { MountCtx, RedirectCtx, UrlCtx } from '../../../lib/koa-ctx';
import { getLoginCallbackUrl } from '../paths';
import { loginRoute } from '../routes';

export interface Ctx extends
    UrlCtx,
    RedirectCtx,
    Partial<MountCtx> {}

export interface Options {
    oauth2: simpleOauth2.OAuthClient;
    scope: string;
}

type Middleware = (ctx: Ctx, next?: () => Promise<void>) => Promise<void>;

export function createMiddleware(opts: Options): Middleware {
    const { oauth2, scope } = opts;

    return async (ctx, next) => {
        if (!loginRoute.match(ctx, 'GET')) {
            if (next) {
                await next();
            }
            return;
        }

        const queryRedirect = ctx.query.redirect;
        const redirect = (queryRedirect && !Array.isArray(queryRedirect)) ? queryRedirect : undefined;
        const authorizationUrl = oauth2.authorizationCode.authorizeURL({
            redirect_uri: getLoginCallbackUrl({
                host: ctx.host,
                mountPath: ctx.mountPath || '/',
                protocol: ctx.protocol,
                redirect,
            }),
            scope,
        });
        ctx.redirect(authorizationUrl);
    };
}
