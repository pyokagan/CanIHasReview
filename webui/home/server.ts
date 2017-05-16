/**
 * @module
 * Home page.
 */
import assert from 'assert';
import { isUrlCtx, MountCtx, UrlCtx } from '../../lib/koa-ctx';
import AuthCtx from '../AuthCtx';
import { RenderCtx } from '../RenderCtx';
import { homeRoute } from '../routes';
import Home from './entry';

export interface Ctx extends
    UrlCtx,
    Partial<Readonly<AuthCtx>>,
    Partial<Readonly<RenderCtx>>,
    Partial<Readonly<MountCtx>> {}

export function isCtx(ctx: any): ctx is Ctx {
    return typeof ctx === 'object' &&
        isUrlCtx(ctx);
}

export async function middleware(ctx: Ctx, next?: () => Promise<void>): Promise<void> {
    assert(isCtx(ctx));
    if (!ctx.render) {
        throw new TypeError('ctx.render not provided');
    }

    if (typeof ctx.auth === 'undefined') {
        throw new TypeError('ctx.auth not provided');
    }

    if (!homeRoute.match(ctx, 'GET')) {
        if (next) {
            await next();
        }
        return;
    }

    ctx.render(__dirname, 'CanIHasReview', Home, {
        ghUserInfo: ctx.auth ? ctx.auth.ghUserInfo : null,
        mountPath: ctx.mountPath || '/',
        path: ctx.path,
        search: ctx.search,
    });
}

export default middleware;
