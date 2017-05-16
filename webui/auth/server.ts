/**
 * @module
 * GitHub authentication.
 */
import Koa from 'koa';
import compose from 'koa-compose';
import simpleOauth2 from 'simple-oauth2';
import * as AuthMixin from './authMixin/server';
import * as Login from './login/server';
import * as LoginCallback from './loginCallback/server';
import * as Logout from './logout/server';

export interface Options {
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
}

type Middleware = (ctx: Koa.Context) => Promise<void>;

export function middleware(opts: Options): Middleware {
    const oauth2 = simpleOauth2.create({
        auth: {
            authorizePath: '/login/oauth/authorize',
            tokenHost: 'https://github.com',
            tokenPath: '/login/oauth/access_token',
        },
        client: {
            id: opts.GITHUB_CLIENT_ID,
            secret: opts.GITHUB_CLIENT_SECRET,
        },
    });

    return compose([
        Login.createMiddleware({
            oauth2,
            scope: '',
        }),
        LoginCallback.createMiddleware({
            oauth2,
        }),
        Logout.createMiddleware(),
        AuthMixin.middleware,
    ]);
}
