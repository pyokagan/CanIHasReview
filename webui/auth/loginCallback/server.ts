import createError from 'http-errors';
import { posix as posixPath } from 'path';
import simpleOauth2 from 'simple-oauth2';
import url from 'url';
import { MountCtx, RedirectCtx, SessionCtx, UrlCtx } from '../../../lib/koa-ctx';
import { homeRoute } from '../../routes';
import AuthSession from '../AuthSession';
import { getLoginCallbackUrl } from '../paths';
import { loginCallbackRoute } from '../routes';

export interface Ctx extends
    UrlCtx,
    RedirectCtx,
    Partial<SessionCtx>,
    Partial<MountCtx> {}

export interface Options {
    oauth2: simpleOauth2.OAuthClient;
}

type Middleware = (ctx: Ctx, next?: () => Promise<void>) => Promise<void>;

export function createMiddleware(opts: Options): Middleware {
    const { oauth2 } = opts;

    return async (ctx, next) => {
        const session: AuthSession | undefined | null = ctx.session;
        if (!session) {
            throw new TypeError('ctx.session not provided');
        }

        if (!loginCallbackRoute.match(ctx, 'GET')) {
            if (next) {
                await next();
            }
            return;
        }

        const code = ctx.query.code;
        if (!code || Array.isArray(code)) {
            throw createError(400, 'code not provided');
        }

        const queryRedirect = ctx.query.redirect;
        const redirect = (queryRedirect && !Array.isArray(queryRedirect)) ? queryRedirect : undefined;

        const token = await oauth2.authorizationCode.getToken({
            code,
            redirect_uri: getLoginCallbackUrl({
                host: ctx.host,
                mountPath: ctx.mountPath || '/',
                protocol: ctx.protocol,
                redirect,
            }),
        });

        if (!token.access_token) {
            throw createError(400, token.error_description || 'Unknown Error');
        }

        session.ghToken = token.access_token;

        ctx.redirect(getFinalRedirect(ctx.mountPath || '/', redirect));
    };
}

function getFinalRedirect(mountPath: string, redirect?: string): string {
    if (!redirect) {
        return homeRoute.toPath({}, mountPath);
    }
    const comp = url.parse(redirect);
    if (comp.protocol || comp.host || !comp.path || !comp.path.startsWith('/')) {
        return homeRoute.toPath({}, mountPath);
    }
    return posixPath.join(mountPath, comp.path);
}

export default createMiddleware;
