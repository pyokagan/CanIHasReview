/**
 * @module
 * HTML user interface.
 */
import Koa from 'koa';
import compose from 'koa-compose';
import notFound from '../lib/koa-notfound';
import * as ErrorPage from './error/server';
import * as Home from './home/server';
import { RenderCtx } from './RenderCtx';
import * as RenderServer from './renderServer';

interface Options {
}

type Middleware = (ctx: Koa.Context, next?: () => Promise<void>) => Promise<void>;

export function middleware(opts: Options): Middleware {
    return compose<Koa.Context & Partial<RenderCtx>>([
        RenderServer.middleware,
        ErrorPage.middleware,
        Home.middleware,
        notFound(),
    ]);
}

export default middleware;
